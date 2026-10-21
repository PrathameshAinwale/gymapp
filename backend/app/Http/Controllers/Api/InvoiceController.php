<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json([
                'success' => true,
                'data' => [],
                'totalRevenue' => 0,
            ]);
        }

        $query = Invoice::with(['user.memberProfile', 'plan', 'creator'])->where('gym_id', $gymId);

        $memberIdInput = $request->user_id ?? $request->userId ?? $request->member_id ?? $request->memberId;
        if ($memberIdInput) {
            $numericMemberId = (int)preg_replace('/[^0-9]/', '', (string)$memberIdInput);
            if ($numericMemberId > 0) {
                $query->where('user_id', $numericMemberId);
            }
        }

        $invoicesList = $query->orderByDesc('id')->get();

        // Batch pre-fetch matching RevenueBilling and gym owner to eliminate N+1 queries
        $invoiceNumbers = $invoicesList->pluck('invoice_number')->filter();
        $inflowMap = \App\Models\RevenueBilling::with('creator')
            ->whereIn('reference_no', $invoiceNumbers)
            ->get()
            ->keyBy('reference_no');

        $owner = User::where('gym_id', $gymId)->where('role', 'owner')->first();
        $defaultOwnerName = $owner ? $owner->name : 'Staff';

        $invoices = $invoicesList->map(function ($inv) use ($inflowMap, $owner, $defaultOwnerName) {
            $matchingInflow = $inflowMap->get($inv->invoice_number);
            return self::formatInvoiceRecord($inv, $defaultOwnerName, $matchingInflow);
        });

        return response()->json([
            'success' => true,
            'data' => $invoices,
            'totalRevenue' => (float)$invoices->where('status', 'Paid')->sum('amount'),
        ]);
    }

    /**
     * Get plan chaining metadata for member + package type (default start date, min date, status message).
     */
    public function chainingInfo(Request $request)
    {
        $userIdInput = $request->user_id ?? $request->member_id ?? $request->memberId ?? $request->userId;
        if (!$userIdInput) {
            return response()->json([
                'success' => false,
                'message' => 'Member ID is required.',
            ], 422);
        }

        $numericId = (int)preg_replace('/[^0-9]/', '', (string)$userIdInput);
        $user = User::find($numericId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found.',
            ], 404);
        }

        $packageType = $request->package_type ?? $request->packageType ?? $request->category ?? 'Gym-Cardio';
        $gymId = $this->resolveGymId($request) ?? $user->gym_id;

        $chainingData = \App\Services\PlanChainingService::calculatePlanDates($user->id, $packageType, $gymId);

        return response()->json([
            'success' => true,
            'data' => $chainingData,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'totalAmount' => 'nullable|numeric|min:0',
            'pending_amount' => 'nullable|numeric|min:0',
            'pendingAmount' => 'nullable|numeric|min:0',
            'dues_amount' => 'nullable|numeric|min:0',
            'duesAmount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
        ], [
            'amount.min' => 'Invoice amount cannot be negative.',
            'amount.numeric' => 'Invoice amount must be a valid number.',
            'total_amount.min' => 'Total amount cannot be negative.',
            'total_amount.numeric' => 'Total amount must be a valid number.',
            'totalAmount.min' => 'Total amount cannot be negative.',
            'totalAmount.numeric' => 'Total amount must be a valid number.',
            'pending_amount.min' => 'Pending amount cannot be negative.',
            'pendingAmount.min' => 'Pending amount cannot be negative.',
            'dues_amount.min' => 'Dues amount cannot be negative.',
            'duesAmount.min' => 'Dues amount cannot be negative.',
            'discount.min' => 'Discount cannot be negative.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $userIdInput = $request->user_id ?? $request->member_id ?? $request->memberId;
        $planIdInput = $request->plan_id ?? $request->planId;

        // Clean and resolve user
        $user = null;
        if ($userIdInput) {
            $numericId = (int)preg_replace('/[^0-9]/', '', (string)$userIdInput);
            if ($numericId > 0) {
                $user = User::find($numericId);
            }
        }
        if (!$user && ($request->member_name || $request->memberName)) {
            $name = $request->member_name ?? $request->memberName;
            $user = User::where('name', 'like', "%{$name}%")->first();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'The specified member could not be found.',
            ], 422);
        }

        // Enforce: Existing member outstanding dues must be paid and cleared before creating a new invoice
        $existingDue = (float)($user->memberProfile?->dues_amount ?? 0);
        if ($existingDue > 0) {
            return response()->json([
                'success' => false,
                'message' => "Member {$user->name} has an outstanding due balance of ₹" . number_format($existingDue) . ". Existing dues must be paid and cleared before a new invoice can be created.",
                'dues_amount' => $existingDue,
            ], 422);
        }

        // Clean and resolve plan
        $plan = null;
        if ($planIdInput) {
            $numericPlanId = (int)preg_replace('/[^0-9]/', '', (string)$planIdInput);
            if ($numericPlanId > 0) {
                $plan = Plan::find($numericPlanId);
            }
        }
        if (!$plan && ($request->plan_name || $request->planName)) {
            $planName = $request->plan_name ?? $request->planName;
            $plan = Plan::where('name', 'like', "%{$planName}%")->first();
        }

        $amount = (float)($request->amount ?? $plan?->price ?? 0);
        $duesAmount = (float)($request->dues_amount ?? $request->duesAmount ?? $request->pending_amount ?? $request->pendingAmount ?? $request->balance_due ?? $request->balanceDue ?? 0);
        $dueDate = $request->due_date ?? $request->dueDate ?? $request->balance_due_date ?? $request->balanceDueDate;
        $date = $request->payment_date ?? $request->paymentDate ?? $request->date ?? now()->toDateString();
        $method = $request->payment_method ?? $request->paymentMethod ?? 'UPI';
        $status = $request->status;
        if ($duesAmount > 0) {
            $status = 'Pending';
        } elseif (!$status) {
            $status = 'Paid';
        }

        $gymId = $this->resolveGymId($request) ?? $user->gym_id;
        if (!$gymId) {
            return response()->json(['success' => false, 'message' => 'Gym ID is required to create invoice.'], 422);
        }

        $authCreator = $request->user() ?: auth('sanctum')->user();
        $creatorId = $request->created_by ?? $request->createdBy ?? $authCreator?->id;
        $creatorName = $request->created_by_name ?? $request->createdByName ?? $request->executive ?? $request->staff_name ?? $request->staffName ?? $authCreator?->name;

        if (!$creatorName && $creatorId) {
            $creatorUser = User::find($creatorId);
            $creatorName = $creatorUser?->name;
        }
        if (!$creatorName) {
            $creatorName = User::where('gym_id', $gymId)->where('role', 'owner')->value('name') ?: 'Staff / Admin';
        }

        $packagesList = $request->input('packages');
        $hasPtPackage = false;
        $ptTrainerId = $request->trainer_id ?? $request->trainerId ?? null;

        if (is_array($packagesList) && count($packagesList) > 0) {
            foreach ($packagesList as $pkg) {
                $checkType = \App\Services\PlanChainingService::normalizePackageType($pkg['package_type'] ?? $pkg['packageType'] ?? 'Gym-Cardio');
                if ($checkType === 'Personal Training') {
                    $hasPtPackage = true;
                    if (!empty($pkg['trainer_id'] ?? $pkg['trainerId'] ?? null)) {
                        $ptTrainerId = $pkg['trainer_id'] ?? $pkg['trainerId'];
                    }
                }
            }
        } else {
            $rawPackageType = $request->package_type ?? $request->packageType ?? $request->category ?? $plan?->package_type ?? 'Gym-Cardio';
            if (\App\Services\PlanChainingService::normalizePackageType($rawPackageType) === 'Personal Training') {
                $hasPtPackage = true;
            }
        }

        if ($hasPtPackage && empty($ptTrainerId)) {
            return response()->json([
                'success' => false,
                'message' => 'Trainer selection is compulsory for Personal Training packages.',
                'errors' => [
                    'trainer_id' => ['Please select a trainer for the Personal Training package.'],
                    'trainerId' => ['Please select a trainer for the Personal Training package.']
                ]
            ], 422);
        }

        $items = [];
        $grossTotal = 0;
        $discountTotal = (float)($request->discount ?? $request->discount_amount ?? $request->discountAmount ?? 0);
        $startDate = $request->start_date ?? $request->startDate ?? $date;
        $endDate = $request->expiry_date ?? $request->expiryDate ?? $request->end_date ?? $request->endDate;
        if (!$endDate) {
            $endDate = \App\Services\PlanChainingService::computePlanEndDate($startDate, $plan);
        }

        if (is_array($packagesList) && count($packagesList) > 0) {
            $earliestStart = null;
            $furthestEnd = null;

            foreach ($packagesList as $pkg) {
                $pkgType = \App\Services\PlanChainingService::normalizePackageType($pkg['package_type'] ?? $pkg['packageType'] ?? 'Gym-Cardio');
                $rawPkgPlanId = $pkg['plan_id'] ?? $pkg['planId'] ?? null;
                $pkgPlanId = !empty($rawPkgPlanId) ? (int)preg_replace('/[^0-9]/', '', (string)$rawPkgPlanId) : null;
                $pkgPlan = $pkgPlanId ? Plan::find($pkgPlanId) : null;
                $pkgStart = !empty($pkg['start_date'] ?? $pkg['startDate'] ?? null) ? ($pkg['start_date'] ?? $pkg['startDate']) : $startDate;
                $rawPkgEnd = $pkg['end_date'] ?? $pkg['endDate'] ?? $pkg['expiry_date'] ?? $pkg['expiryDate'] ?? null;
                $pkgEnd = !empty($rawPkgEnd) ? $rawPkgEnd : \App\Services\PlanChainingService::computePlanEndDate($pkgStart, $pkgPlan);
                $pkgPrice = (float)($pkg['price'] ?? $pkg['amount'] ?? $pkgPlan?->price ?? 0);
                $pkgDisc = (float)($pkg['discount'] ?? 0);
                $pkgNet = max(0, $pkgPrice - $pkgDisc);

                $grossTotal += $pkgPrice;
                if ($pkgDisc > 0) {
                    $discountTotal += $pkgDisc;
                }

                if (!$earliestStart || $pkgStart < $earliestStart) {
                    $earliestStart = $pkgStart;
                }
                if (!$furthestEnd || $pkgEnd > $furthestEnd) {
                    $furthestEnd = $pkgEnd;
                }

                $items[] = [
                    'package_type' => $pkgType,
                    'packageType' => $pkgType,
                    'plan_id' => $pkgPlanId,
                    'name' => $pkg['name'] ?? ($pkgPlan?->name ?? ($pkgType . ' Package')),
                    'price' => $pkgPrice,
                    'discount' => $pkgDisc,
                    'net_amount' => $pkgNet,
                    'start_date' => $pkgStart,
                    'end_date' => $pkgEnd,
                    'trainer_id' => $pkg['trainer_id'] ?? $pkg['trainerId'] ?? ($pkgType === 'Personal Training' ? $ptTrainerId : null),
                    'pt_sessions' => (int)($pkg['pt_sessions'] ?? $pkg['ptSessions'] ?? 0),
                ];
            }

            $startDate = $earliestStart ?: $startDate;
            $endDate = $furthestEnd ?: $endDate;
            $packageType = $items[0]['package_type'] ?? 'Gym-Cardio';
            $planId = $items[0]['plan_id'] ?? $plan?->id;
        } else {
            $rawPackageType = $request->package_type ?? $request->packageType ?? $request->category ?? $plan?->package_type ?? 'Gym-Cardio';
            $packageType = \App\Services\PlanChainingService::normalizePackageType($rawPackageType);
            $planId = $plan?->id;
            $itemPrice = (float)($request->total_amount ?? $request->totalAmount ?? ($amount + $duesAmount));
            $itemDisc = $discountTotal;
            $grossTotal = $itemPrice;

            $items[] = [
                'package_type' => $packageType,
                'packageType' => $packageType,
                'plan_id' => $planId,
                'name' => $plan?->name ?? ($request->plan_name ?? $request->planName ?? ($packageType . ' Package')),
                'price' => $itemPrice,
                'discount' => $itemDisc,
                'net_amount' => max(0, $itemPrice - $itemDisc),
                'start_date' => $startDate,
                'end_date' => $endDate,
                'trainer_id' => $request->trainer_id ?? $request->trainerId ?? ($packageType === 'Personal Training' ? $ptTrainerId : null),
                'pt_sessions' => (int)($request->pt_sessions ?? $request->ptSessions ?? 0),
            ];
        }

        $computedTotal = $grossTotal > 0 ? max(0, $grossTotal - $discountTotal) : ($amount + $duesAmount);
        $totalAmount = (float)($request->total_amount ?? $request->totalAmount ?? $computedTotal);
        $paidAmount = $amount;
        if ($duesAmount <= 0 && $totalAmount > $paidAmount) {
            $duesAmount = max(0, $totalAmount - $paidAmount);
        }
        $status = $duesAmount > 0 ? 'Pending' : 'Paid';
        $invoiceNo = 'INV-' . date('Y') . '-' . rand(1000, 9999);
        $invoiceTitle = implode(' + ', array_column($items, 'name')) ?: ($plan?->name ?? 'Membership Package');

        if ($duesAmount > 0 && !empty($dueDate)) {
            $promiseError = MemberController::validatePromiseDate($dueDate, $startDate, $endDate, false);
            if ($promiseError) {
                return response()->json([
                    'success' => false,
                    'message' => $promiseError,
                    'errors' => [
                        'due_date' => [$promiseError],
                        'dueDate' => [$promiseError],
                        'balance_due_date' => [$promiseError],
                        'balanceDueDate' => [$promiseError],
                    ]
                ], 422);
            }
        }

        $invoice = DB::transaction(function () use (
            $gymId, $invoiceNo, $user, $planId, $packageType, $items, $paidAmount, $totalAmount,
            $duesAmount, $date, $startDate, $endDate, $dueDate, $method, $status,
            $creatorId, $creatorName, $invoiceTitle, $plan, $hasPtPackage, $ptTrainerId
        ) {
            // 1. Concurrency Safety: Lock user row
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

            // 2. Enforce start date business rules if single package
            if (count($items) === 1) {
                \App\Services\PlanChainingService::validateStartDate($user->id, $packageType, $startDate, $gymId);
            }

            // 3. Create ONE Invoice with all line items
            $invData = [
                'gym_id' => $gymId,
                'invoice_number' => $invoiceNo,
                'user_id' => $user->id,
                'plan_id' => $planId,
                'package_type' => $packageType,
                'amount' => $paidAmount,
                'date' => $date,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'due_date' => $duesAmount > 0 ? $dueDate : null,
                'payment_method' => $method,
                'status' => $status,
                'invoice_url' => '#',
                'created_by' => $creatorId,
                'created_by_name' => $creatorName,
            ];
            if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'items')) {
                $invData['items'] = $items;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'total_amount')) {
                $invData['total_amount'] = $totalAmount;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'pending_amount')) {
                $invData['pending_amount'] = $duesAmount;
            }

            $createdInvoice = Invoice::create($invData);

            // 4. Create matching RevenueBilling inflow record (one inflow per invoice submission)
            \App\Models\RevenueBilling::create([
                'gym_id' => $gymId,
                'type' => 'inflow',
                'reference_no' => $createdInvoice->invoice_number,
                'user_id' => $user->id,
                'member_name' => $user->name,
                'plan_id' => $planId,
                'plan_name' => $invoiceTitle,
                'title' => $invoiceTitle . ($duesAmount > 0 ? " (Pending Balance Due: ₹" . number_format($duesAmount) . ")" : ""),
                'category' => (count($items) === 1 && $packageType === 'Personal Training') ? 'Personal Training' : 'Membership Fee',
                'vendor' => null,
                'amount' => $paidAmount,
                'date' => $date,
                'payment_method' => $method,
                'status' => $status,
                'notes' => $duesAmount > 0 ? "Payment of ₹" . number_format($paidAmount) . " recorded. Balance due: ₹" . number_format($duesAmount) : "Full fee collected for {$invoiceTitle}",
                'created_by' => $creatorId,
                'created_by_name' => $creatorName,
            ]);

            // 5. Synchronize member profile status & master access expiry date
            if ($lockedUser && $lockedUser->memberProfile) {
                $updateData = [
                    'status' => 'Active',
                    'dues_amount' => $duesAmount,
                    'due_date' => $duesAmount > 0 ? $dueDate : null,
                ];
                if ($planId) {
                    $updateData['plan_id'] = $planId;
                }
                if ($hasPtPackage && $ptTrainerId) {
                    $numericTrainerId = (int)preg_replace('/[^0-9]/', '', (string)$ptTrainerId);
                    if ($numericTrainerId > 0) {
                        $updateData['trainer_id'] = $numericTrainerId;
                        if (\Illuminate\Support\Facades\Schema::hasColumn('member_profiles', 'training_type')) {
                            $updateData['training_type'] = 'pt';
                        }
                    }
                }
                $lockedUser->memberProfile->update($updateData);

                // Synchronize master facility access expiry date with furthest active plan
                \App\Services\PlanChainingService::syncMemberProfileExpiry($lockedUser->id);
            }

            return $createdInvoice;
        });

        $formatted = self::formatInvoiceRecord($invoice, $creatorName);

        return response()->json([
            'success' => true,
            'message' => 'Invoice issued successfully with all package line items',
            'data' => $formatted,
            'invoice' => $formatted,
        ], 201);
    }

    /**
     * Canonical single-source-of-truth formatter for invoice records
     */
    public static function formatInvoiceRecord(Invoice $inv, ?string $defaultOwner = 'Staff', $matchingInflow = null): array
    {
        $userProfile = $inv->user?->memberProfile;
        $pendingAmount = (float)($inv->pending_amount ?? $userProfile?->dues_amount ?? 0);
        $status = $inv->status;
        if ($pendingAmount > 0) {
            $status = 'Pending';
        } elseif (!$status) {
            $status = 'Paid';
        }

        $creatorUser = $inv->creator ?: $matchingInflow?->creator;
        $rawCreator = $inv->created_by_name;
        if ($creatorUser && strtolower((string)$rawCreator) === 'prathamesh' && strtolower((string)$creatorUser->name) !== 'prathamesh') {
            $rawCreator = $creatorUser->name;
        }
        if (!$rawCreator) {
            $rawCreator = $creatorUser?->name ?: ($matchingInflow?->created_by_name ?: $defaultOwner);
        }

        $creatorRole = $creatorUser?->role ?: ($matchingInflow?->creator?->role ?: null);
        $cleanName = preg_replace('/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i', '', (string)$rawCreator);
        $createdByName = trim($cleanName) ?: ($defaultOwner ?: 'Staff');
        $creatorRole = ucfirst(strtolower($creatorRole ?: 'Staff'));

        $items = is_array($inv->items) ? $inv->items : [];
        $planName = $matchingInflow?->plan_name ?: ($inv->plan?->name ?? (!empty($items) ? implode(' + ', array_column($items, 'name')) : ($inv->package_type . ' Package')));

        return [
            'id' => $inv->invoice_number,
            'numericId' => $inv->id,
            'gymId' => $inv->gym_id,
            'invoiceNumber' => $inv->invoice_number,
            'invoice_number' => $inv->invoice_number,
            'memberId' => 'mem-' . $inv->user_id,
            'userId' => $inv->user_id,
            'memberName' => $inv->user?->name ?? 'Unknown',
            'memberPhone' => $inv->user?->phone,
            'memberEmail' => $inv->user?->email,
            'planId' => $inv->plan_id ? ('plan-' . $inv->plan_id) : ($inv->plan?->id ? ('plan-' . $inv->plan->id) : null),
            'planName' => $planName,
            'items' => $items,
            'packages' => $items,
            'amount' => (float)$inv->amount,
            'paidAmount' => (float)$inv->amount,
            'totalAmount' => (float)($inv->total_amount ?? ($inv->amount + $pendingAmount)),
            'pendingAmount' => $pendingAmount,
            'duesAmount' => $pendingAmount,
            'date' => $inv->date instanceof \DateTimeInterface ? $inv->date->format('Y-m-d') : (string)$inv->date,
            'issueDate' => $inv->date instanceof \DateTimeInterface ? $inv->date->format('Y-m-d') : (string)$inv->date,
            'packageType' => $inv->package_type ?? ($inv->plan?->package_type ?? 'Gym-Cardio'),
            'startDate' => $inv->start_date instanceof \DateTimeInterface ? $inv->start_date->format('Y-m-d') : ($inv->start_date ? (string)$inv->start_date : null),
            'expiryDate' => $inv->end_date instanceof \DateTimeInterface ? $inv->end_date->format('Y-m-d') : ($inv->end_date ? (string)$inv->end_date : null),
            'endDate' => $inv->end_date instanceof \DateTimeInterface ? $inv->end_date->format('Y-m-d') : ($inv->end_date ? (string)$inv->end_date : null),
            'dueDate' => $inv->due_date instanceof \DateTimeInterface ? $inv->due_date->format('Y-m-d') : ($inv->due_date ? (string)$inv->due_date : ($userProfile?->due_date ? $userProfile->due_date->format('Y-m-d') : null)),
            'paymentMethod' => $inv->payment_method ?: 'UPI',
            'status' => $status,
            'invoiceUrl' => $inv->invoice_url ?? '#',
            'createdBy' => $inv->created_by ?: $matchingInflow?->created_by,
            'createdByName' => $createdByName,
            'creatorRole' => $creatorRole,
            'createdAt' => $inv->created_at?->toISOString() ?? ($inv->created_at ? (string)$inv->created_at : null),
            'created_at' => $inv->created_at?->toISOString() ?? ($inv->created_at ? (string)$inv->created_at : null),
            'updatedAt' => $inv->updated_at?->toISOString() ?? ($inv->updated_at ? (string)$inv->updated_at : null),
            'updated_at' => $inv->updated_at?->toISOString() ?? ($inv->updated_at ? (string)$inv->updated_at : null),
        ];
    }

    /**
     * Update an existing invoice and synchronize matching RevenueBilling inflow/outflow records
     */
    public function update(Request $request, $id)
    {
        $invoice = Invoice::where('invoice_number', $id)->first();
        if (!$invoice && is_numeric($id)) {
            $invoice = Invoice::find($id);
        }
        if (!$invoice) {
            $cleanId = (int)preg_replace('/[^0-9]/', '', (string)$id);
            if ($cleanId > 0) {
                $invoice = Invoice::find($cleanId);
            }
        }

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => "Invoice '{$id}' not found.",
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'totalAmount' => 'nullable|numeric|min:0',
            'pending_amount' => 'nullable|numeric|min:0',
            'pendingAmount' => 'nullable|numeric|min:0',
            'dues_amount' => 'nullable|numeric|min:0',
            'duesAmount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
        ], [
            'amount.min' => 'Invoice amount cannot be negative.',
            'amount.numeric' => 'Invoice amount must be a valid number.',
            'total_amount.min' => 'Total amount cannot be negative.',
            'total_amount.numeric' => 'Total amount must be a valid number.',
            'totalAmount.min' => 'Total amount cannot be negative.',
            'totalAmount.numeric' => 'Total amount must be a valid number.',
            'pending_amount.min' => 'Pending amount cannot be negative.',
            'pendingAmount.min' => 'Pending amount cannot be negative.',
            'dues_amount.min' => 'Dues amount cannot be negative.',
            'duesAmount.min' => 'Dues amount cannot be negative.',
            'discount.min' => 'Discount cannot be negative.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $amount = $request->has('amount') ? (float)$request->amount : (float)$invoice->amount;
        $duesAmount = $request->has('pending_amount') || $request->has('pendingAmount') || $request->has('dues_amount') || $request->has('duesAmount')
            ? (float)($request->pending_amount ?? $request->pendingAmount ?? $request->dues_amount ?? $request->duesAmount ?? 0)
            : (float)($invoice->pending_amount ?? 0);
        $totalAmount = $request->has('total_amount') || $request->has('totalAmount')
            ? (float)($request->total_amount ?? $request->totalAmount)
            : ($amount + $duesAmount);

        $startDateInput = $request->start_date ?? $request->startDate;
        $endDateInput = $request->expiry_date ?? $request->expiryDate ?? $request->end_date ?? $request->endDate;

        if ($startDateInput && $endDateInput) {
            $s = substr((string)$startDateInput, 0, 10);
            $e = substr((string)$endDateInput, 0, 10);
            if ($e < $s) {
                return response()->json([
                    'success' => false,
                    'message' => 'The expiry date cannot be earlier than the start date.',
                ], 422);
            }
        }

        $invoiceUpdate = [
            'amount' => $amount,
            'total_amount' => $totalAmount,
            'pending_amount' => $duesAmount,
        ];

        if ($request->has('start_date') || $request->has('startDate')) {
            $invoiceUpdate['start_date'] = $startDateInput;
        }
        if ($request->has('expiry_date') || $request->has('expiryDate') || $request->has('end_date') || $request->has('endDate')) {
            $invoiceUpdate['end_date'] = $endDateInput;
        }

        if ($request->has('date') || $request->has('payment_date') || $request->has('paymentDate')) {
            $invoiceUpdate['date'] = $request->date ?? $request->payment_date ?? $request->paymentDate;
        }
        if ($request->has('due_date') || $request->has('dueDate')) {
            $upDueDate = $request->due_date ?? $request->dueDate;
            if ($duesAmount > 0 && $upDueDate) {
                $checkStart = $invoice->start_date ? ($invoice->start_date instanceof \DateTimeInterface ? $invoice->start_date->format('Y-m-d') : substr((string)$invoice->start_date, 0, 10)) : null;
                $checkEnd = $invoice->end_date ? ($invoice->end_date instanceof \DateTimeInterface ? $invoice->end_date->format('Y-m-d') : substr((string)$invoice->end_date, 0, 10)) : null;
                $upPromiseError = MemberController::validatePromiseDate($upDueDate, $checkStart, $checkEnd);
                if ($upPromiseError) {
                    return response()->json([
                        'success' => false,
                        'message' => $upPromiseError,
                        'errors' => ['due_date' => [$upPromiseError]]
                    ], 422);
                }
            }
            $invoiceUpdate['due_date'] = $upDueDate;
        }
        if ($request->has('payment_method') || $request->has('paymentMethod')) {
            $invoiceUpdate['payment_method'] = $request->payment_method ?? $request->paymentMethod;
        }
        if ($request->has('status')) {
            $status = $request->status;
            if (strtolower((string)$status) === 'cancelled') {
                $cancelCheck = \App\Services\PlanChainingService::checkCanCancelOrDeleteInvoice($invoice);
                if (!$cancelCheck['can_cancel']) {
                    return response()->json([
                        'success' => false,
                        'message' => $cancelCheck['message'],
                    ], 422);
                }
            }
            if ($duesAmount > 0 && strtolower($status) === 'paid') {
                $status = 'Partial';
            }
            $invoiceUpdate['status'] = $status;
        } else {
            if ($duesAmount > 0) {
                $invoiceUpdate['status'] = $amount > 0 ? 'Partial' : 'Pending';
            } else {
                $invoiceUpdate['status'] = 'Paid';
            }
        }

        if ($request->filled('plan_id') || $request->filled('planId')) {
            $numericPlan = (int)preg_replace('/[^0-9]/', '', (string)($request->plan_id ?? $request->planId));
            if ($numericPlan > 0) {
                $invoiceUpdate['plan_id'] = $numericPlan;
            }
        }

        if ($request->filled('user_id') || $request->filled('userId')) {
            $numericUser = (int)preg_replace('/[^0-9]/', '', (string)($request->user_id ?? $request->userId));
            if ($numericUser > 0) {
                $invoiceUpdate['user_id'] = $numericUser;
            }
        }

        if ($request->has('packages') || $request->has('items')) {
            $invoiceUpdate['items'] = $request->packages ?? $request->items;
        }

        if ($request->filled('package_type') || $request->filled('packageType')) {
            $invoiceUpdate['package_type'] = $request->package_type ?? $request->packageType;
        }

        if ($request->filled('created_by_name') || $request->filled('createdByName')) {
            $invoiceUpdate['created_by_name'] = $request->created_by_name ?? $request->createdByName;
        }

        $planName = $request->plan_name ?? $request->planName ?? ($invoice->plan?->name ?? 'Membership Fee');
        $memberName = $request->member_name ?? $request->memberName ?? ($invoice->user?->name ?? 'Member');

        DB::transaction(function () use ($invoice, $invoiceUpdate, $amount, $request, $duesAmount, $planName, $memberName) {
            $invoice->update($invoiceUpdate);

            // ══════════════════════════════════════════════════════════════
            // SYNCHRONIZE WITH REVENUE & BILLING (INFLOW & OUTFLOW)
            // ══════════════════════════════════════════════════════════════
            $matchingInflow = \App\Models\RevenueBilling::where('reference_no', $invoice->invoice_number)->first();

            $inflowData = [
                'amount' => $amount,
                'payment_method' => $invoiceUpdate['payment_method'] ?? $invoice->payment_method,
                'date' => $invoiceUpdate['date'] ?? $invoice->date,
                'status' => $invoiceUpdate['status'] ?? $invoice->status,
                'plan_name' => $planName,
                'member_name' => $memberName,
                'title' => "{$memberName} - {$planName}",
            ];
            if (isset($invoiceUpdate['user_id'])) {
                $inflowData['user_id'] = $invoiceUpdate['user_id'];
            }
            if ($request->filled('notes')) {
                $inflowData['notes'] = $request->notes;
            }

            if ($matchingInflow) {
                $matchingInflow->update($inflowData);
            } else {
                \App\Models\RevenueBilling::create(array_merge($inflowData, [
                    'gym_id' => $invoice->gym_id,
                    'type' => 'inflow',
                    'reference_no' => $invoice->invoice_number,
                    'user_id' => $invoiceUpdate['user_id'] ?? $invoice->user_id,
                    'category' => $invoiceUpdate['package_type'] ?? 'Membership Fee',
                    'created_by' => $invoice->created_by,
                    'created_by_name' => $invoice->created_by_name,
                ]));
            }

            // Also check if any outflow record exists with this invoice reference
            $matchingOutflow = \App\Models\RevenueBilling::outflow()->where('reference_no', $invoice->invoice_number)->first();
            if ($matchingOutflow) {
                $matchingOutflow->update([
                    'amount' => $amount,
                    'payment_method' => $invoiceUpdate['payment_method'] ?? $matchingOutflow->payment_method,
                    'date' => $invoiceUpdate['date'] ?? $matchingOutflow->date,
                ]);
            }

            // Update member user name and member profile dues if applicable
            $targetUserId = $invoiceUpdate['user_id'] ?? $invoice->user_id;
            $user = $invoice->user ?: \App\Models\User::find($targetUserId);
            if ($user) {
                $userUpdates = [];
                if ($request->filled('member_name') || $request->filled('memberName')) {
                    $newName = trim((string)($request->member_name ?? $request->memberName));
                    if ($newName && $newName !== $user->name) {
                        $userUpdates['name'] = $newName;
                    }
                }
                if ($request->filled('member_phone') || $request->filled('memberPhone')) {
                    $newPhone = trim((string)($request->member_phone ?? $request->memberPhone));
                    if ($newPhone && $newPhone !== $user->phone) {
                        $userUpdates['phone'] = $newPhone;
                    }
                }
                if ($request->filled('member_email') || $request->filled('memberEmail')) {
                    $newEmail = trim((string)($request->member_email ?? $request->memberEmail));
                    if ($newEmail && $newEmail !== $user->email) {
                        $userUpdates['email'] = $newEmail;
                    }
                }
                if (!empty($userUpdates)) {
                    $user->update($userUpdates);
                }

                if ($user->memberProfile) {
                    $profileUpdate = [];
                    if ($request->has('pending_amount') || $request->has('dues_amount') || $request->has('pendingAmount') || $request->has('duesAmount')) {
                        $profileUpdate['dues_amount'] = $duesAmount;
                        if ($duesAmount > 0 && ($invoice->due_date || isset($invoiceUpdate['due_date']))) {
                            $profileUpdate['due_date'] = $invoiceUpdate['due_date'] ?? $invoice->due_date;
                        } elseif ($duesAmount == 0) {
                            $profileUpdate['due_date'] = null;
                        }
                    }
                    if (isset($invoiceUpdate['plan_id']) && $invoiceUpdate['plan_id'] > 0) {
                        $profileUpdate['plan_id'] = $invoiceUpdate['plan_id'];
                    }
                    if ($request->filled('start_date') || $request->filled('startDate')) {
                        $profileUpdate['join_date'] = $request->start_date ?? $request->startDate;
                    }
                    if (!empty($profileUpdate)) {
                        $user->memberProfile->update($profileUpdate);
                    }

                    // Protect member_profiles.expiry_date from moving backwards:
                    // Synchronize with the furthest end_date across all non-cancelled invoices
                    \App\Services\PlanChainingService::syncMemberProfileExpiry($user->id);
                }
            }
        });

        // Invalidate backend caches to reflect updated numbers in Dashboard & Financial summaries
        try {
            \Illuminate\Support\Facades\Cache::flush();
        } catch (\Throwable $e) {}

        $invoice->refresh();
        $invoice->load(['user.memberProfile', 'plan', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Invoice and revenue billing updated successfully.',
            'data' => [
                'id' => $invoice->invoice_number,
                'numericId' => $invoice->id,
                'memberId' => $invoice->user_id ? ('mem-' . $invoice->user_id) : null,
                'memberName' => $invoice->user?->name ?? $memberName,
                'memberPhone' => $invoice->user?->phone,
                'memberEmail' => $invoice->user?->email,
                'planId' => $invoice->plan_id ? ('plan-' . $invoice->plan_id) : ($invoice->plan?->id ? ('plan-' . $invoice->plan->id) : null),
                'planName' => $planName,
                'packageType' => $invoice->package_type,
                'startDate' => $invoice->start_date instanceof \DateTimeInterface ? $invoice->start_date->format('Y-m-d') : ($invoice->start_date ? (string)$invoice->start_date : null),
                'expiryDate' => $invoice->end_date instanceof \DateTimeInterface ? $invoice->end_date->format('Y-m-d') : ($invoice->end_date ? (string)$invoice->end_date : null),
                'endDate' => $invoice->end_date instanceof \DateTimeInterface ? $invoice->end_date->format('Y-m-d') : ($invoice->end_date ? (string)$invoice->end_date : null),
                'amount' => (float)$invoice->amount,
                'totalAmount' => (float)($invoice->total_amount ?? ($amount + $duesAmount)),
                'pendingAmount' => $duesAmount,
                'duesAmount' => $duesAmount,
                'date' => $invoice->date instanceof \DateTimeInterface ? $invoice->date->format('Y-m-d') : (string)$invoice->date,
                'dueDate' => $invoice->due_date instanceof \DateTimeInterface ? $invoice->due_date->format('Y-m-d') : ($invoice->due_date ? (string)$invoice->due_date : null),
                'paymentMethod' => $invoice->payment_method,
                'status' => $invoice->status,
                'invoiceUrl' => $invoice->invoice_url ?? '#',
                'createdBy' => $invoice->created_by,
                'createdByName' => $invoice->created_by_name ?: ($invoice->creator?->name ?? 'Staff'),
                'creatorRole' => $invoice->creator?->role ? ucfirst($invoice->creator->role) : 'Owner',
            ],
        ]);
    }

    /**
     * Upload an externally/client-generated PDF blob for an invoice.
     */
    public function uploadPdf(Request $request, $id)
    {
        $cleanId = str_replace('inv-', '', $id);
        $invoice = Invoice::where('id', $cleanId)
            ->orWhere('invoice_number', $id)
            ->orWhere('invoice_number', $cleanId)
            ->first();

        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found'], 404);
        }

        if ($request->hasFile('pdf')) {
            $url = \App\Services\InvoicePdfService::saveUploadedPdf($invoice, $request->file('pdf'));
            return response()->json([
                'success' => true,
                'message' => 'Invoice PDF uploaded successfully',
                'invoice_url' => $url,
            ]);
        }

        // If no file uploaded, generate and ensure backend PDF
        $url = \App\Services\InvoicePdfService::ensurePdf($invoice);
        return response()->json([
            'success' => true,
            'message' => 'Invoice PDF generated and stored',
            'invoice_url' => $url,
        ]);
    }

    /**
     * Download or view the official PDF receipt for an invoice.
     */
    public function downloadPdf($id)
    {
        $cleanId = str_replace('inv-', '', $id);
        $invoice = Invoice::where('id', $cleanId)
            ->orWhere('invoice_number', $id)
            ->orWhere('invoice_number', $cleanId)
            ->first();

        if (!$invoice) {
            abort(404, 'Invoice record not found.');
        }

        \App\Services\InvoicePdfService::ensurePdf($invoice);
        $cleanNo = preg_replace('/[^A-Za-z0-9_\-]/', '_', $invoice->invoice_number);
        $filePath = storage_path('app/public/invoices/' . $cleanNo . '.pdf');

        if (!file_exists($filePath)) {
            \App\Services\InvoicePdfService::saveToFile($invoice);
        }

        return response()->file($filePath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="Invoice_' . $cleanNo . '.pdf"',
        ]);
    }

    /**
     * Public endpoint to download or stream invoice PDF without login requirements.
     */
    public function publicDownloadPdf($invoice_number)
    {
        return $this->downloadPdf($invoice_number);
    }

    /**
     * Public responsive HTML receipt view for mobile/desktop.
     */
    public function publicView($invoice_number)
    {
        $cleanNo = str_replace('inv-', '', $invoice_number);
        $invoice = Invoice::with(['gym', 'user.memberProfile', 'plan'])
            ->where('invoice_number', $invoice_number)
            ->orWhere('invoice_number', $cleanNo)
            ->orWhere('id', $cleanNo)
            ->first();

        if (!$invoice) {
            abort(404, 'Official Invoice not found.');
        }

        $pdfUrl = \App\Services\InvoicePdfService::ensurePdf($invoice);
        $gym = $invoice->gym ?: \App\Models\Gym::first();
        $gymName = $gym ? $gym->name : 'Fitness Club';
        $gymAddress = $gym ? $gym->address : 'Main Facility Center';
        $user = $invoice->user;
        $status = strtolower($invoice->status ?? ($invoice->pending_amount > 0 ? 'pending' : 'paid'));

        // Return clean printable HTML view with auto-print & download button
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Official Invoice - ' . htmlspecialchars($invoice->invoice_number) . '</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
        .invoice-card { max-width: 650px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #064e3b; color: #fff; padding: 24px; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; }
        .header p { margin: 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 24px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .meta-label { color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; margin-bottom: 3px; }
        .meta-val { font-weight: bold; color: #1e293b; }
        .badge-paid { display: inline-block; padding: 4px 10px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-weight: bold; font-size: 12px; }
        .badge-pending { display: inline-block; padding: 4px 10px; background: #fee2e2; color: #b91c1c; border-radius: 9999px; font-weight: bold; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; }
        td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
        .totals { margin-left: auto; max-width: 280px; margin-bottom: 24px; font-size: 13px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .totals-row.bold { font-weight: bold; border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 8px; font-size: 15px; }
        .actions { display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .btn { flex: 1; text-align: center; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 13px; text-decoration: none; cursor: pointer; border: none; }
        .btn-primary { background: #059669; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #334155; }
        @media print { .actions { display: none; } body { background: #fff; padding: 0; } .invoice-card { box-shadow: none; border: none; } }
    </style>
</head>
<body>
    <div class="invoice-card">
        <div class="header">
            <h1>' . htmlspecialchars($gymName) . '</h1>
            <p>Official Membership Tax Invoice & Payment Receipt | ' . htmlspecialchars($gymAddress) . '</p>
        </div>
        <div class="content">
            <div class="meta-grid">
                <div>
                    <div class="meta-label">Invoice Number</div>
                    <div class="meta-val">#' . htmlspecialchars($invoice->invoice_number) . '</div>
                </div>
                <div>
                    <div class="meta-label">Status</div>
                    <div>' . ($status === 'paid' ? '<span class="badge-paid">PAID & VERIFIED</span>' : '<span class="badge-pending">PENDING DUES</span>') . '</div>
                </div>
                <div>
                    <div class="meta-label">Billed To Member</div>
                    <div class="meta-val">' . htmlspecialchars($user?->name ?: 'Member') . ' (' . htmlspecialchars($user?->phone ?: '') . ')</div>
                </div>
                <div>
                    <div class="meta-label">Date & Mode</div>
                    <div class="meta-val">' . htmlspecialchars($invoice->date ? $invoice->date->format('d M Y') : date('d M Y')) . ' | ' . htmlspecialchars($invoice->payment_method ?: 'UPI') . '</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th>Validity Period</th>
                        <th style="text-align: right;">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>' . htmlspecialchars($invoice->plan?->name ?: 'Gym Membership Plan') . '</strong></td>
                        <td>' . htmlspecialchars($invoice->start_date ? $invoice->start_date->format('d M Y') : 'Active') . ' to ' . htmlspecialchars($invoice->end_date ? $invoice->end_date->format('d M Y') : 'Active') . '</td>
                        <td style="text-align: right;">Rs. ' . number_format((float)($invoice->total_amount ?: $invoice->amount), 2) . '</td>
                    </tr>
                </tbody>
            </table>

            <div class="totals">
                <div class="totals-row">
                    <span>Total Package Bill:</span>
                    <span>Rs. ' . number_format((float)($invoice->total_amount ?: $invoice->amount), 2) . '</span>
                </div>
                <div class="totals-row">
                    <span>Amount Paid:</span>
                    <span style="color: #059669; font-weight: bold;">Rs. ' . number_format((float)$invoice->amount, 2) . '</span>
                </div>
                <div class="totals-row bold">
                    <span>Pending Dues:</span>
                    <span style="color: ' . ($invoice->pending_amount > 0 ? '#dc2626' : '#0f172a') . ';">Rs. ' . number_format((float)($invoice->pending_amount ?? 0), 2) . '</span>
                </div>
            </div>

            <div class="actions">
                <a href="' . htmlspecialchars(url('api/public/invoices/' . $invoice->invoice_number . '/download')) . '" class="btn btn-primary" download>📥 Download Official PDF</a>
                <button onclick="window.print()" class="btn btn-secondary">🖨️ Print Receipt</button>
            </div>
        </div>
    </div>
</body>
</html>';

        return response($html)->header('Content-Type', 'text/html');
    }

    /**
     * Delete an invoice, remove matching RevenueBilling records, and synchronize member profile dues and expiry.
     */
    public function destroy(Request $request, $id)
    {
        $invoice = Invoice::where('invoice_number', $id)->first();
        if (!$invoice && is_numeric($id)) {
            $invoice = Invoice::find($id);
        }
        if (!$invoice) {
            $cleanId = (int)preg_replace('/[^0-9]/', '', (string)$id);
            if ($cleanId > 0) {
                $invoice = Invoice::find($cleanId);
            }
        }

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => "Invoice '{$id}' not found.",
            ], 404);
        }

        // Safety Check: Check if later chained invoices depend on this invoice
        $cancelCheck = \App\Services\PlanChainingService::checkCanCancelOrDeleteInvoice($invoice);
        if (!$cancelCheck['can_cancel']) {
            return response()->json([
                'success' => false,
                'message' => $cancelCheck['message'],
            ], 422);
        }

        $userId = $invoice->user_id;
        $invoiceNumber = $invoice->invoice_number;

        DB::transaction(function () use ($invoice, $userId, $invoiceNumber) {
            // 1. Delete matching RevenueBilling inflow/outflow records
            if ($invoiceNumber) {
                \App\Models\RevenueBilling::where('reference_no', $invoiceNumber)->delete();
            }

            // 2. Remove stored PDF if exists
            if (!empty($invoice->pdf_path) && \Illuminate\Support\Facades\Storage::disk('public')->exists($invoice->pdf_path)) {
                try {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($invoice->pdf_path);
                } catch (\Throwable $e) {}
            }

            // 3. Delete the invoice
            $invoice->delete();

            // 4. Re-sync member profile dues and expiry if user exists
            if ($userId) {
                $user = User::find($userId);
                if ($user && $user->memberProfile) {
                    $remainingDues = (float)Invoice::where('user_id', $userId)
                        ->whereNotIn('status', ['Cancelled', 'Refunded', 'Transferred'])
                        ->sum('pending_amount');

                    $nextDueDate = Invoice::where('user_id', $userId)
                        ->whereNotIn('status', ['Cancelled', 'Refunded', 'Transferred'])
                        ->where('pending_amount', '>', 0)
                        ->whereNotNull('due_date')
                        ->orderBy('due_date', 'asc')
                        ->value('due_date');

                    $latestRemainingInvoice = Invoice::where('user_id', $userId)
                        ->whereNotIn('status', ['Cancelled', 'Refunded', 'Transferred'])
                        ->orderByDesc('end_date')
                        ->first();

                    $profileUpdate = [
                        'dues_amount' => $remainingDues,
                        'due_date' => $remainingDues > 0 ? $nextDueDate : null,
                    ];
                    if ($latestRemainingInvoice && $latestRemainingInvoice->plan_id) {
                        $profileUpdate['plan_id'] = $latestRemainingInvoice->plan_id;
                    }
                    $user->memberProfile->update($profileUpdate);

                    // Synchronize master facility access expiry date with rollback permitted
                    \App\Services\PlanChainingService::syncMemberProfileExpiry($userId, true);
                }
            }
        });

        // Invalidate backend caches
        try {
            \Illuminate\Support\Facades\Cache::flush();
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => "Invoice '{$invoiceNumber}' deleted successfully.",
        ]);
    }
}

