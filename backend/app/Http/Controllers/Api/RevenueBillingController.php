<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RevenueBilling;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RevenueBillingController extends Controller
{

    /**
     * Get all Inflow records (Fee collections & plan subscriptions)
     */
    public function inflowIndex(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json([
                'success' => true,
                'data' => [],
                'total' => 0,
                'count' => 0,
            ]);
        }

        $query = RevenueBilling::with(['user.memberProfile', 'plan', 'creator'])->inflow()->forGym($gymId);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                  ->orWhere('member_name', 'like', "%{$search}%")
                  ->orWhere('plan_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('start_date')) {
            $query->whereDate('date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('date', '<=', $request->end_date);
        }

        $records = $query->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($item) {
                return $this->formatInflow($item);
            });

        return response()->json([
            'success' => true,
            'data' => $records,
            'total' => $records->sum('amount'),
            'count' => $records->count(),
        ]);
    }

    /**
     * Get all Outflow records (Operating expenses)
     */
    public function outflowIndex(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json([
                'success' => true,
                'data' => [],
                'total' => 0,
                'count' => 0,
            ]);
        }

        $query = RevenueBilling::outflow()->forGym($gymId);

        if ($request->filled('category') && $request->category !== 'All' && $request->category !== 'ALL') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('vendor', 'like', "%{$search}%")
                  ->orWhere('reference_no', 'like', "%{$search}%");
            });
        }

        if ($request->filled('start_date')) {
            $query->whereDate('date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('date', '<=', $request->end_date);
        }

        $records = $query->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($item) {
                return $this->formatOutflow($item);
            });

        return response()->json([
            'success' => true,
            'data' => $records,
            'total' => $records->sum('amount'),
            'count' => $records->count(),
        ]);
    }

    /**
     * Get comprehensive Cashflow Summary from revenue_and_billings
     */
    public function summary(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json([
                'success' => true,
                'summary' => [
                    'totalInflow' => 0,
                    'totalOutflow' => 0,
                    'netCashFlow' => 0,
                    'marginPercent' => 0,
                    'totalVolume' => 0,
                    'inflowRatio' => 100,
                    'outflowRatio' => 0,
                    'categories' => [],
                ]
            ]);
        }

        $inflowQuery = RevenueBilling::inflow()->forGym($gymId);
        $outflowQuery = RevenueBilling::outflow()->forGym($gymId);

        $totalInflow = (float)$inflowQuery->sum('amount');
        $totalOutflow = (float)$outflowQuery->sum('amount');

        $netCashFlow = max(0, $totalInflow - $totalOutflow);
        $marginPercent = $totalInflow > 0 ? round(($netCashFlow / $totalInflow) * 100) : 0;
        $totalVolume = $totalInflow + $totalOutflow;
        $inflowRatio = $totalVolume > 0 ? round(($totalInflow / $totalVolume) * 100, 1) : 100;
        $outflowRatio = round(100 - $inflowRatio, 1);

        // Outflow categories breakdown
        $categories = $outflowQuery->selectRaw('category, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(function ($cat) use ($totalOutflow) {
                $pct = $totalOutflow > 0 ? round(($cat->total / $totalOutflow) * 100, 1) : 0;
                return [
                    'category' => $cat->category,
                    'total' => (float)$cat->total,
                    'count' => (int)$cat->count,
                    'percentage' => $pct,
                ];
            });

        return response()->json([
            'success' => true,
            'summary' => [
                'totalInflow' => $totalInflow,
                'totalOutflow' => $totalOutflow,
                'netCashFlow' => $netCashFlow,
                'marginPercent' => $marginPercent,
                'totalVolume' => $totalVolume,
                'inflowRatio' => $inflowRatio,
                'outflowRatio' => $outflowRatio,
                'categories' => $categories,
            ]
        ]);
    }

    /**
     * Manually store an Inflow record (Fee payment)
     */
    public function storeInflow(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
            'member_name' => 'nullable|string',
            'memberName' => 'nullable|string',
            'user_id' => 'nullable',
            'memberId' => 'nullable',
            'plan_id' => 'nullable',
            'planId' => 'nullable',
            'plan_name' => 'nullable|string',
            'planName' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'paymentMethod' => 'nullable|string',
            'date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $rawUserId = $request->user_id ?? $request->memberId ?? $request->member_id;
        $userId = $rawUserId ? (int)str_replace('mem-', '', $rawUserId) : null;

        $gymId = $this->resolveGymId($request);
        if (!$gymId && $userId) {
            $user = User::find($userId);
            $gymId = $user?->gym_id;
        }
        if (!$gymId) {
            return response()->json(['success' => false, 'message' => 'Gym ID is required to record inflow.'], 422);
        }

        $rawPlanId = $request->plan_id ?? $request->planId;
        $planId = $rawPlanId ? (int)str_replace('plan-', '', $rawPlanId) : null;

        $memberName = $request->member_name ?? $request->memberName;
        if (!$memberName && $userId) {
            $user = User::find($userId);
            $memberName = $user?->name;
        }

        $planName = $request->plan_name ?? $request->planName;
        if (!$planName && $planId) {
            $plan = Plan::find($planId);
            $planName = $plan?->name;
        }

        $duesAmount = (float)($request->input('dues_amount', $request->input('duesAmount', $request->input('pending_amount', 0))));
        $dueDate = $request->input('due_date', $request->input('dueDate'));
        $refNo = 'INV-' . date('Y') . '-' . rand(1000, 9999);

        $authCreator = $request->user() ?: auth('sanctum')->user();
        $creatorId = $request->created_by ?? $request->createdBy ?? $authCreator?->id;
        $creatorName = $request->created_by_name ?? $request->createdByName ?? $request->executive ?? $request->staff_name ?? $request->staffName ?? $authCreator?->name;

        if (!$creatorName && $creatorId) {
            $creatorUser = User::find($creatorId);
            $creatorName = $creatorUser?->name;
        }
        if (!$creatorName) {
            $creatorName = $authCreator?->name ?: (User::where('gym_id', $gymId)->where('role', 'owner')->value('name') ?: 'Staff');
        }
        $cleanName = preg_replace('/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i', '', $creatorName);
        $creatorName = trim($cleanName) ?: ($authCreator?->name ?: 'Staff');

        $inflowDate = $request->date ?: now()->toDateString();
        $inflowAmount = (float)$request->amount;
        $inflowTotalAmount = (float)($request->total_amount ?? $request->totalAmount ?? ($inflowAmount + $duesAmount));

        // Duplicate Invoice Validation: Only applies to the active plans of the member
        // If invoice date is different -> allowed.
        // If invoice date is same, but other contents differ -> allowed.
        // If invoice date is same AND all contents/amounts are identical for the active plan -> blocked.
        if ($userId) {
            $userObj = User::with('memberProfile')->find($userId);
            $profile = $userObj?->memberProfile;
            $todayStr = now()->toDateString();
            $expiryStr = $profile?->expiry_date ? $profile->expiry_date->format('Y-m-d') : null;
            $isMemberActive = $profile && ($profile->status === 'Active' || ($expiryStr && $expiryStr >= $todayStr));
            $activePlanId = $profile?->plan_id;

            if ($isMemberActive && $activePlanId) {
                $targetPlanId = $planId ?: $activePlanId;

                if ((int)$targetPlanId === (int)$activePlanId) {
                    $dupQuery = RevenueBilling::where('gym_id', $gymId)
                        ->where('type', 'inflow')
                        ->where('user_id', $userId)
                        ->whereDate('date', $inflowDate)
                        ->where('amount', $inflowAmount)
                        ->where(function ($q) use ($activePlanId, $planName) {
                            $q->where('plan_id', $activePlanId)
                              ->orWhere('plan_name', $planName);
                        });

                    if ($dupQuery->exists()) {
                        return response()->json([
                            'success' => false,
                            'message' => "Duplicate Invoice Detected: An identical invoice of ₹" . number_format($inflowAmount, 2) . " for this active plan already exists on {$inflowDate}. If this is a separate transaction, please adjust the invoice date or invoice details.",
                        ], 422);
                    }
                }
            }
        }

        $record = RevenueBilling::create([
            'gym_id' => $gymId,
            'type' => 'inflow',
            'reference_no' => $refNo,
            'user_id' => $userId,
            'member_name' => $memberName ?: 'Member',
            'plan_id' => $planId,
            'plan_name' => $planName ?: 'Membership Fee',
            'title' => $request->title ?: (($planName ?: 'Membership Plan') . ' - Fee Collection'),
            'category' => $request->category ?: 'Membership Fee',
            'vendor' => null,
            'amount' => (float)$request->amount,
            'date' => $request->date ?: now()->toDateString(),
            'payment_method' => $request->payment_method ?? $request->paymentMethod ?? 'UPI',
            'status' => $duesAmount > 0 ? 'Pending' : ($request->status ?? 'Paid'),
            'notes' => $request->notes,
            'created_by' => $creatorId,
            'created_by_name' => $creatorName,
        ]);

        // Mirror to invoices for backward compatibility & sync member profile
        try {
            if ($userId && $userObj = User::find($userId)) {
                $invPayload = [
                    'gym_id' => $gymId,
                    'invoice_number' => $refNo,
                    'user_id' => $userId,
                    'plan_id' => $planId,
                    'amount' => (float)$request->amount,
                    'date' => $record->date,
                    'payment_method' => $record->payment_method,
                    'status' => $record->status,
                    'created_by' => $creatorId,
                    'created_by_name' => $creatorName,
                ];
                if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'pending_amount')) {
                    $invPayload['pending_amount'] = $duesAmount;
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'total_amount')) {
                    $invPayload['total_amount'] = (float)($request->total_amount ?? $request->totalAmount ?? ((float)$request->amount + $duesAmount));
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'due_date') && $dueDate) {
                    $invPayload['due_date'] = $dueDate;
                }
                Invoice::create($invPayload);

                if ($userObj->memberProfile) {
                    $profUpdates = [];
                    if ($request->has('dues_amount') || $request->has('duesAmount') || $request->has('pending_amount')) {
                        $profUpdates['dues_amount'] = $duesAmount;
                        if ($duesAmount > 0 && $dueDate) {
                            $profUpdates['due_date'] = $dueDate;
                        } elseif ($duesAmount <= 0) {
                            $profUpdates['due_date'] = null;
                        }
                    }
                    if (!empty($profUpdates)) {
                        $userObj->memberProfile->update($profUpdates);
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Invoice mirror note: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Revenue inflow recorded successfully.',
            'data' => $this->formatInflow($record),
        ], 201);
    }

    /**
     * Manually store an Outflow record (Operating expense)
     */
    public function storeOutflow(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date',
            'vendor' => 'nullable|string|max:255',
            'payment_mode' => 'nullable|string',
            'paymentMode' => 'nullable|string',
            'ref_no' => 'nullable|string|max:100',
            'refNo' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $gymId = $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json(['success' => false, 'message' => 'Gym ID is required to record expense outflow.'], 422);
        }
        $refNo = $request->ref_no ?? $request->refNo ?? ('EXP-' . strtoupper(substr(uniqid(), -6)));
        $paymentMode = $request->payment_mode ?? $request->paymentMode ?? 'UPI';

        $record = RevenueBilling::create([
            'gym_id' => $gymId,
            'type' => 'outflow',
            'reference_no' => $refNo,
            'user_id' => null,
            'member_name' => null,
            'plan_id' => null,
            'plan_name' => null,
            'title' => $request->title,
            'category' => $request->category,
            'vendor' => $request->vendor ?: 'General Expense',
            'amount' => (float)$request->amount,
            'date' => $request->date,
            'payment_method' => $paymentMode,
            'status' => 'Paid',
            'notes' => $request->notes,
            'created_by' => $request->user()?->id,
        ]);

        // Mirror to expenses for backward compatibility
        Expense::create([
            'gym_id' => $gymId,
            'title' => $request->title,
            'category' => $request->category,
            'vendor' => $request->vendor ?: 'General Expense',
            'amount' => (float)$request->amount,
            'date' => $request->date,
            'payment_mode' => $paymentMode,
            'ref_no' => $refNo,
            'notes' => $request->notes,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Expense outflow recorded successfully.',
            'data' => $this->formatOutflow($record),
        ], 201);
    }

    /**
     * Update an Inflow or Outflow record and synchronize matching Invoice/Expense
     */
    public function update(Request $request, $id)
    {
        $cleanId = (int)str_replace(['rev-in-', 'rev-out-', 'rev-', 'exp-', 'EXP-'], '', $id);
        $record = RevenueBilling::find($cleanId);
        if (!$record) {
            $record = RevenueBilling::where('reference_no', $id)->first();
        }

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Revenue / Billing record not found.',
            ], 404);
        }

        $amount = $request->has('amount') ? (float)$request->amount : (float)$record->amount;
        $updateData = [
            'amount' => $amount,
        ];

        if ($request->has('payment_method') || $request->has('paymentMethod')) {
            $updateData['payment_method'] = $request->payment_method ?? $request->paymentMethod;
        }
        if ($request->has('date')) {
            $updateData['date'] = $request->date;
        }
        if ($request->has('status')) {
            $updateData['status'] = $request->status;
        }
        if ($request->has('plan_name') || $request->has('planName')) {
            $updateData['plan_name'] = $request->plan_name ?? $request->planName;
        }
        if ($request->has('member_name') || $request->has('memberName')) {
            $updateData['member_name'] = $request->member_name ?? $request->memberName;
        }
        if ($request->has('notes')) {
            $updateData['notes'] = $request->notes;
        }
        if ($request->has('title')) {
            $updateData['title'] = $request->title;
        }

        $record->update($updateData);

        // If this record corresponds to an invoice, sync the invoice
        if ($record->reference_no) {
            $inv = Invoice::where('invoice_number', $record->reference_no)->first();
            if ($inv) {
                $invUpdate = ['amount' => $amount];
                if (isset($updateData['payment_method'])) {
                    $invUpdate['payment_method'] = $updateData['payment_method'];
                }
                if (isset($updateData['date'])) {
                    $invUpdate['date'] = $updateData['date'];
                }
                if (isset($updateData['status'])) {
                    $invUpdate['status'] = $updateData['status'];
                }
                $inv->update($invUpdate);
            }
        }

        try {
            \Illuminate\Support\Facades\Cache::flush();
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Billing entry updated successfully.',
            'data' => $record->type === 'inflow' ? $this->formatInflow($record) : $this->formatOutflow($record),
        ]);
    }

    /**
     * Delete an entry
     */
    public function destroy($id)
    {
        $cleanId = (int)str_replace(['rev-in-', 'rev-out-', 'rev-', 'exp-', 'EXP-'], '', $id);
        $record = RevenueBilling::find($cleanId);

        if ($record) {
            // If it has reference_no, clean up corresponding mirror if needed
            if ($record->type === 'outflow') {
                Expense::where('ref_no', $record->reference_no)->delete();
            }
            $record->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Entry deleted successfully from database.',
        ]);
    }

    /**
     * Formatters
     */
    protected function formatInflow(RevenueBilling $item): array
    {
        $userProfile = $item->user?->memberProfile;
        $matchingInvoice = \App\Models\Invoice::where('invoice_number', $item->reference_no)->first();
        $pendingAmount = (float)($matchingInvoice?->pending_amount ?? $userProfile?->dues_amount ?? 0);
        $status = $item->status;
        if ($pendingAmount > 0) {
            $status = 'Pending';
        } elseif (!$status) {
            $status = 'Paid';
        }

        $creatorUser = $item->creator ?: $matchingInvoice?->creator;
        $rawCreator = $item->created_by_name;
        if ($creatorUser && strtolower((string)$rawCreator) === 'prathamesh' && strtolower((string)$creatorUser->name) !== 'prathamesh') {
            $rawCreator = $creatorUser->name;
        }
        if (!$rawCreator) {
            $rawCreator = $creatorUser?->name ?: ($matchingInvoice?->created_by_name ?: null);
        }
        $creatorRole = $creatorUser?->role ?: ($matchingInvoice?->creator?->role ?: null);
        $owner = User::where('gym_id', $item->gym_id)->where('role', 'owner')->first();
        if (!$rawCreator) {
            $rawCreator = $owner ? $owner->name : 'Staff';
        }
        if (!$creatorRole) {
            $creatorRole = ($owner && strcasecmp($rawCreator, $owner->name) === 0) ? 'Owner' : 'Staff';
        }
        $cleanName = preg_replace('/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i', '', $rawCreator);
        $createdByName = trim($cleanName) ?: ($owner ? $owner->name : 'Staff');
        $creatorRole = ucfirst(strtolower($creatorRole ?: 'Staff'));

        return [
            'id' => $item->reference_no,
            'recordId' => 'rev-in-' . $item->id,
            'numericId' => $item->id,
            'gymId' => $item->gym_id,
            'invoiceNumber' => $item->reference_no,
            'memberId' => $item->user_id ? ('mem-' . $item->user_id) : null,
            'memberName' => $item->member_name ?: ($item->user?->name ?? 'Member'),
            'planId' => $item->plan_id ? ('plan-' . $item->plan_id) : null,
            'planName' => $item->plan_name ?: ($item->plan?->name ?? 'Membership Plan'),
            'title' => $item->title,
            'category' => $item->category ?: 'Membership Fee',
            'amount' => (float)$item->amount,
            'totalAmount' => (float)($matchingInvoice?->total_amount ?? ($item->amount + $pendingAmount)),
            'pendingAmount' => $pendingAmount,
            'duesAmount' => $pendingAmount,
            'date' => $item->date instanceof \DateTimeInterface ? $item->date->format('Y-m-d') : (string)$item->date,
            'paymentMethod' => $item->payment_method ?: 'UPI',
            'status' => $status,
            'notes' => $item->notes,
            'invoiceUrl' => '#',
            'createdBy' => $item->created_by ?: $matchingInvoice?->created_by,
            'createdByName' => $createdByName,
            'creatorRole' => $creatorRole,
            'createdAt' => $item->created_at?->toIso8601String(),
        ];
    }

    protected function formatOutflow(RevenueBilling $item): array
    {
        return [
            'id' => 'exp-' . $item->id,
            'recordId' => 'rev-out-' . $item->id,
            'numericId' => $item->id,
            'gymId' => $item->gym_id,
            'title' => $item->title,
            'category' => $item->category,
            'vendor' => $item->vendor ?: 'General Expense',
            'amount' => (float)$item->amount,
            'date' => $item->date instanceof \DateTimeInterface ? $item->date->format('Y-m-d') : (string)$item->date,
            'paymentMode' => $item->payment_method ?: 'UPI',
            'refNo' => $item->reference_no,
            'notes' => $item->notes,
            'createdAt' => $item->created_at?->toIso8601String(),
        ];
    }
}
