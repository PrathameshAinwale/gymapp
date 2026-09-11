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
        $query = Invoice::with(['user', 'plan'])->latest();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) {
                    $q->orWhereNull('gym_id');
                }
            });
        }

        $invoices = $query->get()->map(function ($inv) {
            return [
                'id' => $inv->invoice_number,
                'numericId' => $inv->id,
                'gymId' => $inv->gym_id,
                'memberId' => 'mem-' . $inv->user_id,
                'memberName' => $inv->user?->name ?? 'Unknown',
                'planName' => $inv->plan?->name ?? 'Fitness Package',
                'amount' => (float)$inv->amount,
                'date' => $inv->date->format('Y-m-d'),
                'paymentMethod' => $inv->payment_method,
                'status' => $inv->status,
                'invoiceUrl' => $inv->invoice_url ?? '#',
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
        $date = $request->payment_date ?? $request->paymentDate ?? $request->date ?? now()->toDateString();
        $method = $request->payment_method ?? $request->paymentMethod ?? 'UPI';
        $status = $request->status ?? 'Paid';

        $gymId = $this->resolveGymId($request) ?? $user->gym_id ?? 1;

        $invoice = Invoice::create([
            'gym_id' => $gymId,
            'invoice_number' => 'INV-' . date('Y') . '-' . rand(1000, 9999),
            'user_id' => $user->id,
            'plan_id' => $plan?->id,
            'amount' => $amount,
            'date' => $date,
            'payment_method' => $method,
            'status' => $status,
            'invoice_url' => '#',
        ]);

        // Automatically update member profile status & expiry date in database
        if ($user->memberProfile) {
            $updateData = [
                'status' => 'Active',
            ];
            if ($plan) {
                $updateData['plan_id'] = $plan->id;
            }
            if ($request->expiry_date || $request->expiryDate) {
                $updateData['expiry_date'] = $request->expiry_date ?? $request->expiryDate;
            } elseif ($plan) {
                $months = $plan->duration_months ?? 1;
                $updateData['expiry_date'] = now()->addMonths($months)->toDateString();
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
                'date' => is_string($invoice->date) ? $invoice->date : $invoice->date->format('Y-m-d'),
                'paymentMethod' => $invoice->payment_method,
                'status' => $invoice->status,
                'invoiceUrl' => '#',
            ],
        ], 201);
    }
}
