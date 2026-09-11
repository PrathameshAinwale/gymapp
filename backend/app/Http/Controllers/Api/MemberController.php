<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\Enquiry;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class MemberController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $query = User::where('role', 'member')->with(['memberProfile.plan', 'memberProfile.trainer']);

        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

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

        $gymId = $this->resolveGymId($request) ?? 1;

        $rawPlanId = $request->plan_id ?? $request->planId;
        $rawTrainerId = $request->trainer_id ?? $request->trainerId;
        $planId = ($rawPlanId && $rawPlanId !== 'none') ? (int)str_replace('plan-', '', $rawPlanId) : null;
        $trainerId = ($rawTrainerId && $rawTrainerId !== 'none') ? (int)str_replace('trn-', '', $rawTrainerId) : null;

        $plainPassword = $request->password ?? 'fit' . rand(1000, 9999);

        // Check if user already exists
        $user = User::where('email', $request->email)->first();
        if ($user) {
            if ($user->role !== 'member') {
                return response()->json([
                    'success' => false,
                    'message' => 'The email is already registered to an administrative or trainer account.',
                    'errors' => ['email' => ['The email has already been taken.']]
                ], 422);
            }
            $user->name = $request->name;
            $user->phone = $request->phone ?? $user->phone;
            $user->password = Hash::make($plainPassword);
            $user->initial_password = $plainPassword;
            $user->must_change_password = true;
            if ($request->filled('avatar')) {
                $user->avatar = $request->avatar;
            }
            $user->save();
        } else {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($plainPassword),
                'initial_password' => $plainPassword,
                'must_change_password' => true,
                'role' => 'member',
                'phone' => $request->phone,
                'gym_id' => $gymId,
                'avatar' => $request->avatar ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
            ]);
        }

        $expiryDate = now()->addMonths(1)->toDateString();
        $plan = null;
        if ($planId) {
            $plan = Plan::find($planId);
            if ($plan) {
                $expiryDate = now()->addMonths($plan->duration_months)->toDateString();
                $plan->increment('active_subscribers');
            }
        }

        $profile = MemberProfile::firstOrNew(['user_id' => $user->id]);
        $profile->fill([
            'plan_id' => $planId,
            'trainer_id' => $trainerId,
            'status' => 'Active',
            'join_date' => $profile->join_date ?? now()->toDateString(),
            'expiry_date' => $expiryDate,
            'gender' => $request->gender ?? $profile->gender ?? 'Male',
            'age' => $request->age ?? $profile->age ?? 25,
            'weight' => $request->weight ?? $profile->weight ?? 70,
            'target_weight' => $request->target_weight ?? $request->targetWeight ?? $profile->target_weight ?? 65,
            'height' => $request->height ?? $profile->height ?? 175,
            'goal' => $request->goal ?? $profile->goal ?? 'Fitness & Conditioning',
            'medical_notes' => $request->medical_notes ?? $request->medicalNotes ?? $profile->medical_notes ?? 'None',
            'emergency_contact' => $request->emergency_contact ?? $request->emergencyContact ?? $profile->emergency_contact ?? 'N/A',
            'qr_pass_code' => $profile->qr_pass_code ?? ('PF-M-' . $user->id . '-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $user->name), 0, 5))),
            'dues_amount' => 0,
        ]);
        $profile->save();

        // Create initial invoice if plan has a price
        if ($plan && $plan->price > 0) {
            Invoice::create([
                'gym_id' => $gymId,
                'invoice_number' => 'INV-' . strtoupper(substr(uniqid(), -6)),
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'amount' => $plan->price,
                'date' => now()->toDateString(),
                'payment_method' => 'Cash / Online UPI',
                'status' => 'Paid',
            ]);
        }

        // If an enquiry ID is linked, delete it so it is removed from the enquiries page and database
        $enquiryId = $request->input('enquiry_id', $request->input('enquiryId'));
        if ($enquiryId) {
            $cleanEnqId = (int)str_replace('enq-', '', $enquiryId);
            Enquiry::where('id', $cleanEnqId)->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Member registered successfully and removed from leads pipeline.',
            'data' => $this->show('mem-' . $user->id)->original['data'],
            'credentials' => [
                'id' => 'mem-' . $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'password' => $plainPassword,
                'planName' => $plan?->name ?? 'Standard',
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
        $user->save();

        if ($request->has('plan_id') || $request->has('planId')) {
            $rawP = $request->plan_id ?? $request->planId;
            $profile->plan_id = ($rawP && $rawP !== 'none') ? (int)str_replace('plan-', '', $rawP) : null;
        }
        if ($request->has('trainer_id') || $request->has('trainerId')) {
            $rawT = $request->trainer_id ?? $request->trainerId;
            $profile->trainer_id = ($rawT && $rawT !== 'none') ? (int)str_replace('trn-', '', $rawT) : null;
        }
        if ($request->has('status')) $profile->status = $request->status;
        if ($request->has('weight')) $profile->weight = $request->weight;
        if ($request->has('target_weight')) $profile->target_weight = $request->target_weight;
        if ($request->has('height')) $profile->height = $request->height;
        if ($request->has('goal')) $profile->goal = $request->goal;
        if ($request->has('medical_notes')) $profile->medical_notes = $request->medical_notes;
        if ($request->has('emergency_contact')) $profile->emergency_contact = $request->emergency_contact;
        if ($request->has('expiry_date')) $profile->expiry_date = $request->expiry_date;
        if ($request->has('dues_amount')) $profile->dues_amount = $request->dues_amount;
        $profile->save();

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
