<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\Request;
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

        $invoicesList = Invoice::with(['user.memberProfile', 'plan', 'creator'])->where('gym_id', $gymId)->latest()->get();

        // Batch pre-fetch matching RevenueBilling and gym owner to eliminate N+1 queries
        $invoiceNumbers = $invoicesList->pluck('invoice_number')->filter();
        $inflowMap = \App\Models\RevenueBilling::with('creator')
            ->whereIn('reference_no', $invoiceNumbers)
            ->get()
            ->keyBy('reference_no');

        $owner = User::where('gym_id', $gymId)->where('role', 'owner')->first();
        $defaultOwnerName = $owner ? $owner->name : 'prathamesh';

        $invoices = $invoicesList->map(function ($inv) use ($inflowMap, $defaultOwnerName) {
            $matchingInflow = $inflowMap->get($inv->invoice_number);
            $userProfile = $inv->user?->memberProfile;
            $pendingAmount = (float)($inv->pending_amount ?? $userProfile?->dues_amount ?? 0);
            $status = $inv->status;
            if ($pendingAmount > 0) {
                $status = 'Pending';
            } elseif (!$status) {
                $status = 'Paid';
            }

            $rawCreator = $inv->created_by_name ?: ($inv->creator?->name ?: ($matchingInflow?->created_by_name ?: ($matchingInflow?->creator?->name ?: null)));
            $creatorRole = $inv->creator?->role ?: ($matchingInflow?->creator?->role ?: null);
            if (!$rawCreator || str_contains(strtolower($rawCreator), 'sohan')) {
                $rawCreator = $defaultOwnerName;
                $creatorRole = 'Owner';
            }
            $cleanName = preg_replace('/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i', '', $rawCreator);
            $createdByName = trim($cleanName) ?: $defaultOwnerName;
            $creatorRole = ucfirst($creatorRole ?: 'Owner');

            return [
                'id' => $inv->invoice_number,
                'numericId' => $inv->id,
                'gymId' => $inv->gym_id,
                'memberId' => 'mem-' . $inv->user_id,
                'memberName' => $inv->user?->name ?? 'Unknown',
                'memberPhone' => $inv->user?->phone,
                'memberEmail' => $inv->user?->email,
                'planName' => $matchingInflow?->plan_name ?: ($inv->plan?->name ?? 'Fitness Package'),
                'amount' => (float)$inv->amount,
                'totalAmount' => (float)($inv->total_amount ?? ($inv->amount + $pendingAmount)),
                'pendingAmount' => $pendingAmount,
                'duesAmount' => $pendingAmount,
                'date' => $inv->date instanceof \DateTimeInterface ? $inv->date->format('Y-m-d') : (string)$inv->date,
                'dueDate' => $inv->due_date instanceof \DateTimeInterface ? $inv->due_date->format('Y-m-d') : ($inv->due_date ? (string)$inv->due_date : ($userProfile?->due_date ? $userProfile->due_date->format('Y-m-d') : null)),
                'paymentMethod' => $inv->payment_method,
                'status' => $status,
                'invoiceUrl' => $inv->invoice_url ?? '#',
                'createdBy' => $inv->created_by ?: $matchingInflow?->created_by,
                'createdByName' => $createdByName,
                'creatorRole' => $creatorRole,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $invoices,
            'totalRevenue' => (float)$invoices->where('status', 'Paid')->sum('amount'),
        ]);
    }

    public function store(Request $request)
    {
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
            $user = User::where('role', 'member')->first() ?? User::first();
        }

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'No member user found in database'], 422);
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
        $duesAmount = (float)($request->dues_amount ?? $request->duesAmount ?? $request->pending_amount ?? $request->pendingAmount ?? 0);
        $dueDate = $request->due_date ?? $request->dueDate;
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

        $invoiceData = [
            'gym_id' => $gymId,
            'invoice_number' => 'INV-' . date('Y') . '-' . rand(1000, 9999),
            'user_id' => $user->id,
            'plan_id' => $plan?->id,
            'amount' => $amount,
            'date' => $date,
            'payment_method' => $method,
            'status' => $status,
            'invoice_url' => '#',
            'created_by' => $creatorId,
            'created_by_name' => $creatorName,
        ];
        if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'pending_amount')) {
            $invoiceData['pending_amount'] = $duesAmount;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'total_amount')) {
            $invoiceData['total_amount'] = (float)($request->total_amount ?? $request->totalAmount ?? ($amount + $duesAmount));
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'due_date') && $dueDate) {
            $invoiceData['due_date'] = $dueDate;
        }

        $invoice = Invoice::create($invoiceData);

        // Automatically update member profile status & expiry date in database
        if ($user->memberProfile) {
            $updateData = [
                'status' => 'Active',
            ];
            if ($duesAmount > 0) {
                $updateData['dues_amount'] = $duesAmount;
                if ($dueDate) {
                    $updateData['due_date'] = $dueDate;
                }
            } else {
                $updateData['dues_amount'] = 0;
                $updateData['due_date'] = null;
            }
            if ($plan) {
                $updateData['plan_id'] = $plan->id;
            }
            if ($request->expiry_date || $request->expiryDate) {
                $updateData['expiry_date'] = $request->expiry_date ?? $request->expiryDate;
            } elseif ($plan) {
                $months = (int)($plan->duration_months ?? 1);
                $offerDays = (int)($plan->offer_days ?? 0);
                $startCarbon = now();
                if ($startCarbon->day === 1) {
                    $expiry = $startCarbon->copy()->addMonths($months - 1)->endOfMonth();
                } else {
                    $expiry = $startCarbon->copy()->addDays($months * 30);
                }
                if ($offerDays > 0) {
                    $expiry = $expiry->addDays($offerDays);
                }
                $updateData['expiry_date'] = $expiry->toDateString();
            }
            $user->memberProfile->update($updateData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invoice recorded successfully in database',
            'data' => [
                'id' => $invoice->invoice_number,
                'numericId' => $invoice->id,
                'memberId' => 'mem-' . $user->id,
                'memberName' => $user->name,
                'planName' => $plan?->name ?? ($request->plan_name ?? $request->planName ?? 'Membership Package'),
                'amount' => (float)$invoice->amount,
                'totalAmount' => (float)($invoice->total_amount ?? ($amount + $duesAmount)),
                'pendingAmount' => $duesAmount,
                'duesAmount' => $duesAmount,
                'dueDate' => $invoice->due_date ? (is_string($invoice->due_date) ? $invoice->due_date : $invoice->due_date->format('Y-m-d')) : null,
                'date' => is_string($invoice->date) ? $invoice->date : $invoice->date->format('Y-m-d'),
                'paymentMethod' => $invoice->payment_method,
                'status' => $invoice->status,
                'invoiceUrl' => '#',
                'createdBy' => $invoice->created_by,
                'createdByName' => $invoice->created_by_name ?: $creatorName,
                'creatorRole' => $authCreator?->role ?? 'staff',
            ],
        ], 201);
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

        $amount = $request->has('amount') ? (float)$request->amount : (float)$invoice->amount;
        $duesAmount = $request->has('pending_amount') || $request->has('pendingAmount') || $request->has('dues_amount') || $request->has('duesAmount')
            ? (float)($request->pending_amount ?? $request->pendingAmount ?? $request->dues_amount ?? $request->duesAmount ?? 0)
            : (float)($invoice->pending_amount ?? 0);
        $totalAmount = $request->has('total_amount') || $request->has('totalAmount')
            ? (float)($request->total_amount ?? $request->totalAmount)
            : ($amount + $duesAmount);

        $invoiceUpdate = [
            'amount' => $amount,
            'total_amount' => $totalAmount,
            'pending_amount' => $duesAmount,
        ];

        if ($request->has('date') || $request->has('payment_date') || $request->has('paymentDate')) {
            $invoiceUpdate['date'] = $request->date ?? $request->payment_date ?? $request->paymentDate;
        }
        if ($request->has('due_date') || $request->has('dueDate')) {
            $invoiceUpdate['due_date'] = $request->due_date ?? $request->dueDate;
        }
        if ($request->has('payment_method') || $request->has('paymentMethod')) {
            $invoiceUpdate['payment_method'] = $request->payment_method ?? $request->paymentMethod;
        }
        if ($request->has('status')) {
            $status = $request->status;
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

        if ($request->filled('created_by_name') || $request->filled('createdByName')) {
            $invoiceUpdate['created_by_name'] = $request->created_by_name ?? $request->createdByName;
        }

        $invoice->update($invoiceUpdate);

        // ══════════════════════════════════════════════════════════════
        // SYNCHRONIZE WITH REVENUE & BILLING (INFLOW & OUTFLOW)
        // ══════════════════════════════════════════════════════════════
        $matchingInflow = \App\Models\RevenueBilling::where('reference_no', $invoice->invoice_number)->first();
        $planName = $request->plan_name ?? $request->planName ?? ($invoice->plan?->name ?? 'Membership Fee');
        $memberName = $request->member_name ?? $request->memberName ?? ($invoice->user?->name ?? 'Member');

        $inflowData = [
            'amount' => $amount,
            'payment_method' => $invoiceUpdate['payment_method'] ?? $invoice->payment_method,
            'date' => $invoiceUpdate['date'] ?? $invoice->date,
            'status' => $invoiceUpdate['status'] ?? $invoice->status,
            'plan_name' => $planName,
            'member_name' => $memberName,
            'title' => "{$memberName} - {$planName}",
        ];
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
                'user_id' => $invoice->user_id,
                'category' => 'Membership Fee',
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
        if ($invoice->user) {
            $user = $invoice->user;
            if ($request->filled('member_name') || $request->filled('memberName')) {
                $newName = trim((string)($request->member_name ?? $request->memberName));
                if ($newName && $newName !== $user->name) {
                    $user->update(['name' => $newName]);
                }
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
                if (!empty($profileUpdate)) {
                    $user->memberProfile->update($profileUpdate);
                }
            }
        }

        // Invalidate backend caches to reflect updated numbers in Dashboard & Financial summaries
        try {
            \Illuminate\Support\Facades\Cache::flush();
        } catch (\Throwable $e) {}

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
                'planName' => $planName,
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
}
