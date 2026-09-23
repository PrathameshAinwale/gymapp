<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\Enquiry;
use App\Models\Invoice;
use App\Models\RevenueBilling;
use App\Models\PtSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class MemberController extends Controller
{
    public static function computeMemberStatus($expiryDate, ?string $currentStatus = 'Active'): string
    {
        if ($currentStatus === 'Frozen' || $currentStatus === 'On Hold') {
            return $currentStatus;
        }
        if (!$expiryDate) {
            return $currentStatus ?: 'Active';
        }

        try {
            $expiry = ($expiryDate instanceof \Illuminate\Support\Carbon)
                ? $expiryDate->copy()->startOfDay()
                : \Illuminate\Support\Carbon::parse($expiryDate)->startOfDay();
            $today = now()->startOfDay();

            if ($expiry->lt($today)) {
                return 'Expired';
            }

            $diffDays = (int)$today->diffInDays($expiry, false);
            if ($diffDays >= 0 && $diffDays <= 10) {
                return 'Expiring Soon';
            }

            return 'Active';
        } catch (\Throwable $e) {
            return $currentStatus ?: 'Active';
        }
    }

    public static function syncAllMemberStatuses(): void
    {
        $today = now()->toDateString();
        $tenDaysLater = now()->addDays(10)->toDateString();

        // 1. Members whose expiry_date < today and not Frozen/On Hold -> Expired
        MemberProfile::whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<', $today)
            ->whereNotIn('status', ['Frozen', 'On Hold'])
            ->where('status', '!=', 'Expired')
            ->update(['status' => 'Expired']);

        // 2. Members whose expiry_date >= today and <= today + 10 days and not Frozen/On Hold -> Expiring Soon
        MemberProfile::whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', $today)
            ->whereDate('expiry_date', '<=', $tenDaysLater)
            ->whereNotIn('status', ['Frozen', 'On Hold'])
            ->where('status', '!=', 'Expiring Soon')
            ->update(['status' => 'Expiring Soon']);

        // 3. Members whose expiry_date > today + 10 days and not Frozen/On Hold -> Active
        MemberProfile::whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>', $tenDaysLater)
            ->whereNotIn('status', ['Frozen', 'On Hold'])
            ->where('status', '!=', 'Active')
            ->update(['status' => 'Active']);
    }

    public function index(Request $request)
    {
        self::syncAllMemberStatuses();

        $gymId = $this->resolveGymId($request) ?: (Gym::first()?->id ?: 1);

        $query = User::where('role', 'member');
        if ($gymId == 1) {
            $query->where(function ($q) {
                $q->where('gym_id', 1)
                  ->orWhereNull('gym_id');
            });
        } else {
            $query->where('gym_id', $gymId);
        }
        $query->with(['memberProfile.plan', 'memberProfile.trainer']);

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhereHas('memberProfile', function ($sub) use ($search) {
                      $sub->where('qr_pass_code', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'All') {
            $query->whereHas('memberProfile', function ($q) use ($request) {
                $q->where('status', $request->status);
            });
        }

        if ($request->has('trainer_id') && !empty($request->trainer_id)) {
            $query->whereHas('memberProfile', function ($q) use ($request) {
                $q->where('trainer_id', $request->trainer_id);
            });
        }

        $members = $query->latest()->get()->map(function ($user) {
            $profile = $user->memberProfile;
            return [
                'id' => 'mem-' . $user->id,
                'userId' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'planId' => $profile?->plan ? 'plan-' . $profile->plan->id : null,
                'planName' => $profile?->plan?->name ?? 'Unassigned',
                'status' => $profile?->status ?? 'Active',
                'joinDate' => $profile?->join_date?->format('Y-m-d'),
                'expiryDate' => $profile?->expiry_date?->format('Y-m-d'),
                'trainerId' => $profile?->trainer_id ? 'trn-' . $profile->trainer_id : null,
                'trainerName' => $profile?->trainer?->name ?? 'None / Self Guided',
                'gender' => $profile?->gender ?? 'Unspecified',
                'age' => $profile?->age,
                'dob' => $profile?->dob ? $profile->dob->format('Y-m-d') : null,
                'weight' => $profile?->weight,
                'targetWeight' => $profile?->target_weight,
                'height' => $profile?->height,
                'goal' => $profile?->goal,
                'medicalNotes' => $profile?->medical_notes ?? 'None reported',
                'emergencyContact' => $profile?->emergency_contact ?? 'N/A',
                'attendanceStreak' => $profile?->attendance_streak ?? 0,
                'qrPassCode' => $profile?->qr_pass_code ?? ('PF-M-' . $user->id),
                'duesAmount' => $profile?->dues_amount ?? 0,
                'lastCheckIn' => $profile?->last_check_in ? $profile->last_check_in->diffForHumans() : 'Never',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $members,
            'count' => $members->count(),
        ]);
    }

    public function show($id)
    {
        $numericId = str_replace('mem-', '', $id);
        $user = User::where('role', 'member')
            ->with(['memberProfile.plan', 'memberProfile.trainer', 'workoutPlans', 'dietPlans', 'bodyMetrics', 'attendances', 'invoices'])
            ->findOrFail($numericId);

        $profile = $user->memberProfile;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'mem-' . $user->id,
                'userId' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'planId' => $profile?->plan ? 'plan-' . $profile->plan->id : null,
                'planName' => $profile?->plan?->name ?? 'Unassigned',
                'status' => $profile?->status ?? 'Active',
                'joinDate' => $profile?->join_date?->format('Y-m-d'),
                'expiryDate' => $profile?->expiry_date?->format('Y-m-d'),
                'trainerId' => $profile?->trainer_id ? 'trn-' . $profile->trainer_id : null,
                'trainerName' => $profile?->trainer?->name ?? 'None / Self Guided',
                'gender' => $profile?->gender,
                'age' => $profile?->age,
                'dob' => $profile?->dob ? $profile->dob->format('Y-m-d') : null,
                'weight' => $profile?->weight,
                'targetWeight' => $profile?->target_weight,
                'height' => $profile?->height,
                'goal' => $profile?->goal,
                'medicalNotes' => $profile?->medical_notes,
                'emergencyContact' => $profile?->emergency_contact,
                'attendanceStreak' => $profile?->attendance_streak ?? 0,
                'qrPassCode' => $profile?->qr_pass_code,
                'duesAmount' => $profile?->dues_amount ?? 0,
                'workoutPlan' => $user->workoutPlans()->latest()->first(),
                'dietPlan' => $user->dietPlans()->latest()->first(),
                'bodyMetrics' => $user->bodyMetrics()->latest()->get(),
                'invoices' => $user->invoices()->latest()->get(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'plan_id' => 'nullable',
            'planId' => 'nullable',
            'trainer_id' => 'nullable',
            'trainerId' => 'nullable',
            'goal' => 'nullable|string',
            'gender' => 'nullable|string',
            'weight' => 'nullable|numeric',
            'target_weight' => 'nullable|numeric',
            'targetWeight' => 'nullable|numeric',
            'height' => 'nullable|numeric',
            'age' => 'nullable|integer',
            'dob' => 'nullable|date',
            'date_of_birth' => 'nullable|date',
            'birthdate' => 'nullable|date',
            'DOB' => 'nullable|date',
            'password' => 'nullable|string',
            'avatar' => 'nullable|string',
            'medical_notes' => 'nullable|string',
            'medicalNotes' => 'nullable|string',
            'emergency_contact' => 'nullable|string',
            'emergencyContact' => 'nullable|string',
            'enquiry_id' => 'nullable',
            'enquiryId' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request) ?: ($request->user()?->gym_id ?: (Gym::first()?->id ?: 1));

        $rawPlanId = $request->plan_id ?? $request->planId;
        $rawTrainerId = $request->trainer_id ?? $request->trainerId;
        $planId = ($rawPlanId && $rawPlanId !== 'none') ? (int)str_replace('plan-', '', $rawPlanId) : null;
        $trainerId = ($rawTrainerId && $rawTrainerId !== 'none') ? (int)str_replace('trn-', '', $rawTrainerId) : null;

        $plainPassword = $request->password ?? 'fit' . rand(1000, 9999);

        // Check if user already exists
        $user = User::where('email', $request->email)->first();
        if ($user) {
            $targetUserId = $request->user_id ?? $request->userId ?? $request->member_id;
            if (!$targetUserId || (int)str_replace('mem-', '', $targetUserId) !== $user->id) {
                // Prevent silent overwriting of existing members when adding new member with duplicate email
                $cleanEmail = $request->email;
                $atPos = strpos($cleanEmail, '@');
                $uniqueSuffix = rand(100, 999);
                $uniqueEmail = $atPos !== false
                    ? substr($cleanEmail, 0, $atPos) . '+' . $uniqueSuffix . substr($cleanEmail, $atPos)
                    : ($cleanEmail . $uniqueSuffix . '@pulsefit.local');

                $user = User::create([
                    'name' => $request->name,
                    'email' => $uniqueEmail,
                    'password' => Hash::make($plainPassword),
                    'initial_password' => Hash::make($plainPassword),
                    'must_change_password' => true,
                    'role' => 'member',
                    'phone' => $request->phone,
                    'gym_id' => $gymId,
                    'avatar' => $request->avatar ?? null,
                ]);
            } else {
                $user->name = $request->name;
                $user->phone = $request->phone ?? $user->phone;
                $user->password = Hash::make($plainPassword);
                $user->initial_password = Hash::make($plainPassword);
                $user->must_change_password = true;
                if ($request->filled('avatar')) {
                    $user->avatar = $request->avatar;
                }
                $user->save();
            }
        } else {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($plainPassword),
                'initial_password' => Hash::make($plainPassword),
                'must_change_password' => true,
                'role' => 'member',
                'phone' => $request->phone,
                'gym_id' => $gymId,
                'avatar' => $request->avatar ?? null,
            ]);
        }

        $rawJoin = $request->join_date ?? $request->joinDate ?? $request->start_date ?? $request->startDate;
        $joinDate = $rawJoin ? \Illuminate\Support\Carbon::parse($rawJoin)->toDateString() : now()->toDateString();

        $rawExpiry = $request->expiry_date ?? $request->expiryDate;
        $plan = null;
        if ($rawExpiry) {
            $expiryDate = \Illuminate\Support\Carbon::parse($rawExpiry)->toDateString();
            if ($planId) {
                $plan = Plan::find($planId);
                if ($plan) {
                    $plan->increment('active_subscribers');
                }
            }
        } else {
            $expiryDate = now()->addMonths(1)->toDateString();
            if ($planId) {
                $plan = Plan::find($planId);
                if ($plan) {
                    $durationMonths = (int)($plan->duration_months ?? 1);
                    $expiryDate = now()->addMonths($durationMonths)->toDateString();
                    $plan->increment('active_subscribers');
                }
            }
        }

        $computedStatus = self::computeMemberStatus($expiryDate, $request->status ?? 'Active');

        $profile = MemberProfile::firstOrCreate(['user_id' => $user->id]);

        $cleanName = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $user->name), 0, 5)) ?: 'MEMBER';
        $qrCode = $profile->qr_pass_code ?: ('PF-M-' . $user->id . '-' . $cleanName . '-' . strtoupper(substr(uniqid(), -4)));

        $duesAmount = (float)($request->input('dues_amount', $request->input('duesAmount', 0)));
        $totalBill = (float)($request->input('total_amount', $request->input('totalAmount', $plan?->price ?? 0)));
        $paidAmountInput = $request->input('paid_amount', $request->input('paidAmount'));
        $receivedAmount = $paidAmountInput !== null 
            ? (float)$paidAmountInput 
            : (float)($request->input('amount', $totalBill));

        $rawDob = $request->dob ?? $request->date_of_birth ?? $request->birthdate ?? $request->DOB;
        $dob = $rawDob ? \Illuminate\Support\Carbon::parse($rawDob)->toDateString() : ($profile->dob ?? null);
        $computedAge = $dob ? \Illuminate\Support\Carbon::parse($dob)->age : ($request->age ?? $profile->age ?? null);

        $profile->fill([
            'plan_id' => $planId,
            'trainer_id' => $trainerId,
            'status' => $computedStatus,
            'join_date' => $joinDate,
            'expiry_date' => $expiryDate,
            'gender' => $request->gender ?? $profile->gender ?? 'Male',
            'age' => $computedAge,
            'dob' => $dob,
            'weight' => $request->weight ?? $profile->weight ?? 70,
            'target_weight' => $request->target_weight ?? $request->targetWeight ?? $profile->target_weight ?? 65,
            'height' => $request->height ?? $profile->height ?? 175,
            'goal' => $request->goal ?? $profile->goal ?? 'Fitness & Conditioning',
            'medical_notes' => $request->medical_notes ?? $request->medicalNotes ?? $profile->medical_notes ?? 'None',
            'emergency_contact' => $request->emergency_contact ?? $request->emergencyContact ?? $profile->emergency_contact ?? 'N/A',
            'qr_pass_code' => $qrCode,
            'dues_amount' => $duesAmount,
        ]);
        $profile->save();

        // Create initial invoice and record inflow in revenue_and_billings if plan has a price or payment received
        if ($receivedAmount > 0 || ($plan && $plan->price > 0)) {
            $finalAmount = $receivedAmount;
            $paymentMethod = $request->input('payment_method', $request->input('paymentMethod', 'UPI'));
            $invoiceTitle = $request->input('invoice_title', $request->input('plan_name', $plan?->name ? ($plan->name . ' - New Member Registration') : 'New Member Registration'));
            if ($duesAmount > 0) {
                $invoiceTitle .= " (Partial - Balance Due: ₹" . number_format($duesAmount) . ")";
            }

            $invNo = 'INV-' . strtoupper(substr(uniqid(), -6));
            Invoice::create([
                'gym_id' => $gymId,
                'invoice_number' => $invNo,
                'user_id' => $user->id,
                'plan_id' => $plan?->id,
                'amount' => $finalAmount,
                'date' => now()->toDateString(),
                'payment_method' => $paymentMethod,
                'status' => $duesAmount > 0 ? 'Partial' : 'Paid',
            ]);

            RevenueBilling::create([
                'gym_id' => $gymId,
                'type' => 'inflow',
                'reference_no' => $invNo,
                'user_id' => $user->id,
                'member_name' => $user->name,
                'plan_id' => $plan?->id,
                'plan_name' => $plan?->name ?? 'Membership',
                'title' => $invoiceTitle,
                'category' => 'Membership Fee',
                'vendor' => null,
                'amount' => $finalAmount,
                'date' => now()->toDateString(),
                'payment_method' => $paymentMethod,
                'status' => 'Paid',
                'notes' => $duesAmount > 0 ? "Initial payment of ₹{$finalAmount} received. Balance due: ₹{$duesAmount}" : 'Full payment received upon registration',
                'created_by' => $request->user()?->id,
            ]);
        }

        // If member registered with PT, automatically allocate and store PT session in database
        $trainingType = $request->input('training_type', $request->input('trainingType'));
        $ptSessionsCount = (int)($request->input('pt_sessions', $request->input('ptSessions', $request->input('ptSessionsCount', 0))));
        if ($trainingType === 'pt' || $ptSessionsCount > 0) {
            $existingPt = PtSession::where('member_id', $user->id)->where('status', 'Active')->first();
            if (!$existingPt) {
                $sessions = $ptSessionsCount > 0 ? $ptSessionsCount : 12;
                $ptOtp = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
                $trainerUser = $trainerId ? User::find($trainerId) : null;
                $trainerName = $trainerUser?->name ?? $request->input('trainer_name', $request->input('trainerName', 'PT Coach'));

                PtSession::create([
                    'gym_id' => $gymId,
                    'member_id' => $user->id,
                    'member_name' => $user->name,
                    'member_avatar' => $user->avatar,
                    'trainer_id' => $trainerId,
                    'trainer_name' => $trainerName,
                    'plan_name' => $request->input('pt_plan_name', $request->input('ptPlanName', "{$sessions} 1-on-1 PT Sessions")),
                    'total_sessions' => $sessions,
                    'completed_sessions' => 0,
                    'remaining_sessions' => $sessions,
                    'client_otp' => $ptOtp,
                    'status' => 'Active',
                    'start_date' => now()->toDateString(),
                ]);
            }
        }

        // If an enquiry ID is linked, delete it so it is removed from the enquiries page and database
        $enquiryId = $request->input('enquiry_id', $request->input('enquiryId'));
        if ($enquiryId) {
            $cleanEnqId = (int)str_replace('enq-', '', $enquiryId);
            Enquiry::where('id', $cleanEnqId)->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Member registered successfully',
            'data' => [
                'id' => 'mem-' . $user->id,
                'userId' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'planId' => $plan ? 'plan-' . $plan->id : null,
                'planName' => $plan?->name ?? 'Unassigned',
                'status' => $computedStatus,
                'joinDate' => $profile->join_date ? \Illuminate\Support\Carbon::parse($profile->join_date)->toDateString() : null,
                'expiryDate' => $profile->expiry_date ? \Illuminate\Support\Carbon::parse($profile->expiry_date)->toDateString() : null,
                'dob' => $profile->dob ? \Illuminate\Support\Carbon::parse($profile->dob)->toDateString() : null,
                'age' => $profile->age,
                'gender' => $profile->gender,
                'weight' => $profile->weight,
                'targetWeight' => $profile->target_weight,
                'height' => $profile->height,
                'goal' => $profile->goal,
                'medicalNotes' => $profile->medical_notes,
                'emergencyContact' => $profile->emergency_contact,
                'trainerId' => $trainerId ? 'trn-' . $trainerId : null,
                'trainerName' => $profile->trainer?->name ?? 'None / Self Guided',
                'duesAmount' => (float)$duesAmount,
                'paidAmount' => (float)$receivedAmount,
                'totalAmount' => (float)$totalBill,
                'paymentMethod' => $request->input('payment_method', $request->input('paymentMethod', 'UPI')),
                'qrPassCode' => $qrCode,
                'avatar' => $user->avatar,
            ],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $numericId = str_replace('mem-', '', $id);
        $user = User::where('role', 'member')->findOrFail($numericId);
        $profile = MemberProfile::firstOrCreate(['user_id' => $user->id]);

        if ($request->has('name')) $user->name = $request->name;
        if ($request->has('email')) $user->email = $request->email;
        if ($request->has('phone')) $user->phone = $request->phone;
        if ($request->has('avatar')) $user->avatar = $request->avatar;
        if ($request->filled('password')) $user->password = Hash::make($request->password);
        $user->save();

        if ($request->has('plan_id') || $request->has('planId')) {
            $rawP = $request->plan_id ?? $request->planId;
            $profile->plan_id = ($rawP && $rawP !== 'none') ? (int)str_replace('plan-', '', $rawP) : null;
        }
        if ($request->has('trainer_id') || $request->has('trainerId')) {
            $rawT = $request->trainer_id ?? $request->trainerId;
            $profile->trainer_id = ($rawT && $rawT !== 'none') ? (int)str_replace('trn-', '', $rawT) : null;
        }
        if ($request->has('join_date') || $request->has('joinDate')) {
            $rawJ = $request->join_date ?? $request->joinDate;
            $profile->join_date = $rawJ ? \Illuminate\Support\Carbon::parse($rawJ)->toDateString() : null;
        }
        if ($request->has('expiry_date') || $request->has('expiryDate')) {
            $profile->expiry_date = $request->expiry_date ?? $request->expiryDate;
        }
        if ($request->has('status')) {
            $profile->status = $request->status;
        }
        // If status is not explicitly set to Frozen or On Hold, re-evaluate based on expiry_date
        if (!in_array($profile->status, ['Frozen', 'On Hold']) && $profile->expiry_date) {
            $profile->status = self::computeMemberStatus($profile->expiry_date, $profile->status);
        }
        $rawUpdateDob = $request->dob ?? $request->date_of_birth ?? $request->birthdate ?? $request->DOB;
        if ($rawUpdateDob !== null) {
            $parsedDob = $rawUpdateDob ? \Illuminate\Support\Carbon::parse($rawUpdateDob)->toDateString() : null;
            $profile->dob = $parsedDob;
            if ($parsedDob) {
                $profile->age = \Illuminate\Support\Carbon::parse($parsedDob)->age;
            }
        } elseif ($request->has('age')) {
            $profile->age = (int)$request->age;
        }
        if ($request->has('weight')) $profile->weight = (float)$request->weight;
        if ($request->has('target_weight') || $request->has('targetWeight')) {
            $profile->target_weight = (float)($request->target_weight ?? $request->targetWeight);
        }
        if ($request->has('height')) $profile->height = (float)$request->height;
        if ($request->has('goal')) $profile->goal = $request->goal;
        if ($request->has('medical_notes') || $request->has('medicalNotes')) {
            $profile->medical_notes = $request->medical_notes ?? $request->medicalNotes;
        }
        if ($request->has('emergency_contact') || $request->has('emergencyContact')) {
            $profile->emergency_contact = $request->emergency_contact ?? $request->emergencyContact;
        }
        if ($request->has('dues_amount') || $request->has('duesAmount')) {
            $profile->dues_amount = (float)($request->dues_amount ?? $request->duesAmount);
        }
        $profile->save();

        // If member was upgraded/updated with PT sessions, allocate or top-up PtSession record
        $newPtSessions = (int)($request->input('pt_sessions', $request->input('ptSessions', 0)));
        $upgTrainingType = $request->input('trainingType', $request->input('training_type'));
        if ($upgTrainingType === 'pt' && $newPtSessions > 0) {
            $existingPt = PtSession::where('member_id', $user->id)->where('status', 'Active')->first();
            if ($existingPt) {
                $existingPt->total_sessions += $newPtSessions;
                $existingPt->remaining_sessions += $newPtSessions;
                if ($profile->trainer_id) {
                    $existingPt->trainer_id = $profile->trainer_id;
                    $existingPt->trainer_name = $profile->trainer?->name ?? $existingPt->trainer_name;
                }
                $existingPt->save();
            } else {
                $ptOtp = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
                PtSession::create([
                    'gym_id' => $profile->gym_id ?? $this->resolveGymId($request),
                    'member_id' => $user->id,
                    'member_name' => $user->name,
                    'member_avatar' => $user->avatar,
                    'trainer_id' => $profile->trainer_id,
                    'trainer_name' => $profile->trainer?->name ?? $request->input('trainer_name', $request->input('trainerName', 'PT Coach')),
                    'plan_name' => "{$newPtSessions} 1-on-1 PT Sessions",
                    'total_sessions' => $newPtSessions,
                    'completed_sessions' => 0,
                    'remaining_sessions' => $newPtSessions,
                    'client_otp' => $ptOtp,
                    'status' => 'Active',
                    'start_date' => now()->toDateString(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Member updated successfully',
            'data' => $this->show('mem-' . $user->id)->original['data'],
        ]);
    }

    public function destroy($id)
    {
        $numericId = str_replace('mem-', '', $id);
        $user = User::where('role', 'member')->findOrFail($numericId);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Member removed successfully'
        ]);
    }
}
