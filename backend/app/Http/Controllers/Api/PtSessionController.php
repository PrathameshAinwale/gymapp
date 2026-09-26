<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PtSession;
use App\Models\PtSessionLog;
use App\Models\Gym;
use App\Models\User;
use App\Models\Invoice;
use App\Models\RevenueBilling;
use App\Models\Commission;
use App\Models\Payroll;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PtSessionController extends Controller
{
    /**
     * List all PT session packages, optionally filtered by trainer or member
     */
    public function index(Request $request)
    {
        $gymId     = $this->resolveGymId($request);
        $trainerId = $request->query('trainer_id');
        $memberId  = $request->query('member_id');

        $query = PtSession::with('logs');
        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        if ($trainerId) $query->where('trainer_id', $trainerId);
        if ($memberId)  $query->where('member_id', $memberId);

        $sessions = $query->orderBy('created_at', 'desc')->get();

        // Auto-cleanup any duplicate active sessions created for the same member with 0 completed sessions
        $seenMemberActive = [];
        $duplicatesToDelete = [];
        foreach ($sessions as $session) {
            if ($session->status === 'Active' && (int)$session->completed_sessions === 0 && !empty($session->member_id)) {
                $key = (string)$session->member_id;
                if (isset($seenMemberActive[$key])) {
                    $duplicatesToDelete[] = $session->id;
                } else {
                    $seenMemberActive[$key] = $session->id;
                }
            }
        }
        if (!empty($duplicatesToDelete)) {
            PtSessionLog::whereIn('pt_session_id', $duplicatesToDelete)->delete();
            PtSession::whereIn('id', $duplicatesToDelete)->delete();
            $sessions = $sessions->reject(fn($s) => in_array($s->id, $duplicatesToDelete))->values();
        }

        // Append progress percent to each session
        $sessions->each(function ($s) {
            $s->progress_percent = $s->getProgressPercent();
        });

        return response()->json(['success' => true, 'data' => $sessions]);
    }

    /**
     * Allocate a new PT sessions package for a member, record billing & inflow, and create trainer commission
     */
    public function store(Request $request)
    {
        $input = $request->all();

        // Normalize member ID
        if (isset($input['member_id']) && is_string($input['member_id'])) {
            $input['member_id'] = (int)str_replace(['mem-', 'usr-member-'], '', $input['member_id']);
        }
        if (isset($input['memberId'])) {
            $input['member_id'] = is_string($input['memberId']) ? (int)str_replace(['mem-', 'usr-member-'], '', $input['memberId']) : (int)$input['memberId'];
        }

        // Normalize trainer ID
        if (isset($input['trainer_id']) && is_string($input['trainer_id'])) {
            $input['trainer_id'] = (int)str_replace(['tr-', 'trn-', 'usr-trainer-'], '', $input['trainer_id']);
        }
        if (isset($input['trainerId'])) {
            $input['trainer_id'] = is_string($input['trainerId']) ? (int)str_replace(['tr-', 'trn-', 'usr-trainer-'], '', $input['trainerId']) : (int)$input['trainerId'];
        }

        // Normalize camelCase to snake_case aliases
        if (isset($input['memberName']) && !isset($input['member_name'])) $input['member_name'] = $input['memberName'];
        if (isset($input['trainerName']) && !isset($input['trainer_name'])) $input['trainer_name'] = $input['trainerName'];
        if (isset($input['packageTitle']) && !isset($input['plan_name'])) $input['plan_name'] = $input['packageTitle'];
        if (isset($input['planName']) && !isset($input['plan_name'])) $input['plan_name'] = $input['planName'];
        if (isset($input['totalSessions']) && !isset($input['total_sessions'])) $input['total_sessions'] = $input['totalSessions'];
        if (isset($input['packageAmount']) && !isset($input['package_amount'])) $input['package_amount'] = $input['packageAmount'];
        if (isset($input['paidAmount']) && !isset($input['paid_amount'])) $input['paid_amount'] = $input['paidAmount'];
        if (isset($input['paymentMethod']) && !isset($input['payment_method'])) $input['payment_method'] = $input['paymentMethod'];
        if (isset($input['commissionPct']) && !isset($input['commission_pct'])) $input['commission_pct'] = $input['commissionPct'];
        if (isset($input['commissionAmount']) && !isset($input['commission_amount'])) $input['commission_amount'] = $input['commissionAmount'];
        if (isset($input['startDate']) && !isset($input['start_date'])) $input['start_date'] = $input['startDate'];
        if (isset($input['endDate']) && !isset($input['end_date'])) $input['end_date'] = $input['endDate'];

        $request->merge($input);

        $validated = $request->validate([
            'gym_id'            => 'nullable|integer',
            'member_id'         => 'nullable|integer',
            'member_name'       => 'required|string|max:100',
            'member_avatar'     => 'nullable|string',
            'trainer_id'        => 'nullable|integer',
            'trainer_name'      => 'required|string|max:100',
            'plan_name'         => 'nullable|string|max:150',
            'total_sessions'    => 'required|integer|min:1|max:200',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date',
            'package_amount'    => 'nullable|numeric|min:0',
            'paid_amount'       => 'nullable|numeric|min:0',
            'payment_method'    => 'nullable|string|max:50',
            'commission_pct'    => 'nullable|numeric|min:0|max:100',
            'commission_amount' => 'nullable|numeric|min:0',
            'notes'             => 'nullable|string|max:500',
        ]);

        $gymId = $validated['gym_id'] ?? $this->resolveGymId($request);

        if (!empty($validated['member_id'])) {
            $memberUser = User::find($validated['member_id']);
            if ($memberUser) {
                if (empty($validated['member_avatar'])) {
                    $validated['member_avatar'] = $memberUser->avatar;
                }
                if (empty($validated['member_name'])) {
                    $validated['member_name'] = $memberUser->name;
                }
            }
        }
        if (!empty($validated['trainer_id'])) {
            $trainerUser = User::find($validated['trainer_id']);
            if ($trainerUser && empty($validated['trainer_name'])) {
                $validated['trainer_name'] = $trainerUser->name;
            }
        }

        // Guard against duplicate active package creation within 5 seconds for the same member
        if (!empty($validated['member_id'])) {
            $existingPt = PtSession::where('member_id', $validated['member_id'])
                ->where('status', 'Active')
                ->latest()
                ->first();
            if ($existingPt && $existingPt->created_at && $existingPt->created_at->diffInSeconds(now()) < 5) {
                return response()->json([
                    'success' => true,
                    'message' => "PT package already allocated. Client OTP: {$existingPt->client_otp}",
                    'data'    => $existingPt,
                ], 200);
            }
        }

        $otp = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $planTitle = $validated['plan_name'] ?? "{$validated['total_sessions']} 1-on-1 PT Sessions";
        $startDate = $validated['start_date'] ?? now()->toDateString();
        $endDate = $validated['end_date'] ?? null;
        $packageAmount = (float)($validated['package_amount'] ?? 0);
        $paidAmount = isset($validated['paid_amount']) ? (float)$validated['paid_amount'] : $packageAmount;
        $paymentMethod = $validated['payment_method'] ?? 'UPI';
        $commissionPct = (float)($validated['commission_pct'] ?? 20);
        $commissionAmount = isset($validated['commission_amount']) && (float)$validated['commission_amount'] > 0
            ? (float)$validated['commission_amount']
            : round(($packageAmount * $commissionPct) / 100, 2);

        // 1. Create PT Session
        $ptSession = PtSession::create([
            'gym_id'             => $gymId,
            'member_id'          => $validated['member_id'] ?? null,
            'member_name'        => $validated['member_name'],
            'member_avatar'      => $validated['member_avatar'] ?? null,
            'trainer_id'         => $validated['trainer_id'] ?? null,
            'trainer_name'       => $validated['trainer_name'],
            'plan_name'          => $planTitle,
            'total_sessions'     => $validated['total_sessions'],
            'completed_sessions' => 0,
            'remaining_sessions' => $validated['total_sessions'],
            'client_otp'         => $otp,
            'status'             => 'Active',
            'start_date'         => $startDate,
            'end_date'           => $endDate,
        ]);

        $createdInvoice = null;
        $createdInflow = null;
        $createdCommission = null;

        // 2. Billing & Inflow
        if ($paidAmount > 0 || $packageAmount > 0) {
            $billedAmount = $paidAmount > 0 ? $paidAmount : $packageAmount;
            $duesAmount = max(0, $packageAmount - $paidAmount);
            $invNo = 'INV-' . date('Y') . '-' . rand(1000, 9999);

            $invoiceUserId = null;
            if (!empty($validated['member_id']) && User::where('id', $validated['member_id'])->exists()) {
                $invoiceUserId = $validated['member_id'];
            } else {
                $invoiceUserId = User::where('gym_id', $gymId)->where('role', 'member')->value('id') ?? User::first()?->id;
            }

            try {
                if ($invoiceUserId) {
                    $createdInvoice = Invoice::create([
                        'gym_id'         => $gymId,
                        'invoice_number' => $invNo,
                        'user_id'        => $invoiceUserId,
                        'plan_id'        => null,
                        'amount'         => $billedAmount,
                        'date'           => $startDate,
                        'payment_method' => $paymentMethod,
                        'status'         => $duesAmount > 0 ? 'Partial' : 'Paid',
                    ]);
                }
            } catch (\Exception $e) {
                \Log::warning('PT Package Invoice creation note: ' . $e->getMessage());
            }

            try {
                $inflowTitle = "PT Package - {$planTitle}" . ($duesAmount > 0 ? " (Partial - Due: ₹" . number_format($duesAmount, 2) . ")" : "");
                $createdInflow = RevenueBilling::create([
                    'gym_id'         => $gymId,
                    'type'           => 'inflow',
                    'reference_no'   => $invNo,
                    'user_id'        => $invoiceUserId,
                    'member_name'    => $validated['member_name'],
                    'plan_id'        => null,
                    'plan_name'      => $planTitle,
                    'title'          => $inflowTitle,
                    'category'       => 'Personal Training (PT)',
                    'vendor'         => null,
                    'amount'         => $billedAmount,
                    'date'           => $startDate,
                    'payment_method' => $paymentMethod,
                    'status'         => 'Paid',
                    'notes'          => !empty($validated['notes'])
                        ? $validated['notes']
                        : ($duesAmount > 0
                            ? "Initial payment of ₹{$billedAmount} received for PT package. Balance due: ₹{$duesAmount}"
                            : "Full PT package fee received for {$validated['member_name']} ({$validated['total_sessions']} sessions with {$validated['trainer_name']})"),
                    'created_by'     => $request->user()?->id,
                ]);
            } catch (\Exception $e) {
                \Log::warning('PT Package Inflow creation note: ' . $e->getMessage());
            }
        }

        // 3. Trainer Commission & Pending Payroll Sync
        if (!empty($validated['trainer_id']) && ($commissionAmount > 0 || $packageAmount > 0)) {
            $trainerId = (int)$validated['trainer_id'];
            try {
                $createdCommission = Commission::create([
                    'gym_id'            => $gymId,
                    'trainer_id'        => $trainerId,
                    'trainer_name'      => $validated['trainer_name'],
                    'member_name'       => $validated['member_name'],
                    'plan_name'         => $planTitle,
                    'session_type'      => 'Personal Training (PT)',
                    'rate_percent'      => $commissionPct,
                    'package_amount'    => $packageAmount,
                    'commission_earned' => $commissionAmount,
                    'amount'            => $packageAmount,
                    'date'              => $startDate,
                    'status'            => 'Pending',
                ]);

                $trainerUser = User::find($trainerId);
                $trainerGymId = $trainerUser?->gym_id ?: $gymId;

                // Sync trainer's pending Payroll for the current month
                $currentMonth = now()->format('F Y');
                $totalTrainerCommission = (float)Commission::where(function ($q) use ($trainerGymId, $gymId) {
                        $q->where('gym_id', $trainerGymId)->orWhere('gym_id', $gymId);
                    })
                    ->where(function ($q) use ($trainerId, $validated) {
                        $q->where('trainer_id', $trainerId)
                          ->orWhere('trainer_name', $validated['trainer_name']);
                    })
                    ->sum('commission_earned');

                $trainerPayroll = Payroll::where(function ($q) use ($trainerGymId, $gymId) {
                        $q->where('gym_id', $trainerGymId)->orWhere('gym_id', $gymId);
                    })
                    ->where('employee_id', $trainerId)
                    ->where('month', $currentMonth)
                    ->first();

                if ($trainerPayroll && $trainerPayroll->status === 'Pending') {
                    $trainerPayroll->commission_earned = $totalTrainerCommission;
                    $trainerPayroll->net_pay = max(0, (float)$trainerPayroll->base_salary + $totalTrainerCommission + (float)$trainerPayroll->bonus - (float)$trainerPayroll->deductions);
                    $trainerPayroll->save();
                } else if (!$trainerPayroll && $trainerUser) {
                    $baseSalary = (float)($trainerUser->trainerProfile?->monthly_salary ?? $trainerUser->salary ?? 30000);
                    $deductions = (float)($trainerUser->deductions ?? 0);
                    $roleLabel = $trainerUser->trainerProfile?->specialty ? $trainerUser->trainerProfile->specialty . ' Coach' : 'Fitness Coach';
                    Payroll::create([
                        'gym_id'            => $trainerGymId,
                        'employee_id'       => $trainerUser->id,
                        'employee_name'     => $trainerUser->name,
                        'role'              => $roleLabel,
                        'month'             => $currentMonth,
                        'base_salary'       => $baseSalary,
                        'commission_earned' => $totalTrainerCommission,
                        'incentives'        => 0.0,
                        'bonus'             => 0.0,
                        'deductions'        => $deductions,
                        'net_pay'           => max(0, $baseSalary + $totalTrainerCommission - $deductions),
                        'status'            => 'Pending',
                    ]);
                }
            } catch (\Exception $e) {
                \Log::warning('PT Trainer Commission creation note: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success'    => true,
            'message'    => "PT package with {$validated['total_sessions']} sessions allocated. Client OTP: {$otp}",
            'data'       => $ptSession,
            'invoice'    => $createdInvoice,
            'inflow'     => $createdInflow,
            'commission' => $createdCommission,
        ], 201);
    }

    /**
     * Log a verified PT session using the client's OTP
     */
    public function logSession(Request $request, int $id)
    {
        $ptSession = PtSession::findOrFail($id);

        $validated = $request->validate([
            'otp_entered' => 'required|string|max:6',
            'notes'       => 'nullable|string|max:500',
        ]);

        // Validate OTP
        if ($ptSession->client_otp !== $validated['otp_entered']) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect OTP. Please ask the member for their 4-digit verification code.',
            ], 422);
        }

        // Check remaining sessions
        if ($ptSession->remaining_sessions <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'No remaining sessions in this PT package.',
            ], 422);
        }

        // Log the session
        $sessionNumber = $ptSession->completed_sessions + 1;

        $log = PtSessionLog::create([
            'pt_session_id' => $ptSession->id,
            'member_id'     => $ptSession->member_id,
            'trainer_id'    => $ptSession->trainer_id,
            'member_name'   => $ptSession->member_name,
            'trainer_name'  => $ptSession->trainer_name,
            'session_number' => $sessionNumber,
            'otp_entered'   => $validated['otp_entered'],
            'otp_verified'  => true,
            'notes'         => $validated['notes'] ?? null,
            'verified_at'   => now(),
        ]);

        // Update session counts
        $ptSession->completed_sessions += 1;
        $ptSession->remaining_sessions -= 1;
        if ($ptSession->remaining_sessions === 0) {
            $ptSession->status = 'Completed';
        }
        $ptSession->save();

        return response()->json([
            'success' => true,
            'message' => "Session #{$sessionNumber} logged successfully for {$ptSession->member_name}.",
            'data'    => [
                'log'        => $log,
                'pt_session' => $ptSession,
                'progress'   => $ptSession->getProgressPercent(),
            ],
        ]);
    }

    /**
     * Regenerate a new OTP for a member's PT package
     */
    public function regenerateOtp(int $id)
    {
        $ptSession = PtSession::findOrFail($id);
        $newOtp = $ptSession->generateOtp();

        return response()->json([
            'success' => true,
            'message' => "New OTP generated for {$ptSession->member_name}: {$newOtp}",
            'otp'     => $newOtp,
        ]);
    }

    /**
     * Get session logs for a specific PT package
     */
    public function getLogs(int $id)
    {
        $ptSession = PtSession::with('logs')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $ptSession->logs()->orderBy('created_at', 'desc')->get(),
        ]);
    }

    /**
     * Delete a PT session package and its logs
     */
    public function destroy(int $id)
    {
        $ptSession = PtSession::findOrFail($id);
        $ptSession->logs()->delete();
        $ptSession->delete();

        return response()->json([
            'success' => true,
            'message' => 'PT session package deleted successfully',
        ]);
    }
}
