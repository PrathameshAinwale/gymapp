<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class EnquiryController extends Controller
{
    /**
     * Display a listing of enquiries and leads.
     */
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Enquiry::query();

        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        // Priority filter
        if ($request->filled('priority') && $request->priority !== 'All') {
            $query->where('priority', $request->priority);
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        // Search query
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('interested_plan', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $enquiries = $query->orderByRaw("CASE priority WHEN 'Hot' THEN 1 WHEN 'Warm' THEN 2 WHEN 'Cold' THEN 3 ELSE 4 END")
            ->orderBy('follow_up_date', 'asc')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($enq) {
                return $this->formatEnquiry($enq);
            });

        return response()->json([
            'success' => true,
            'data' => $enquiries,
            'count' => $enquiries->count(),
            'hotCount' => $enquiries->where('priority', 'Hot')->count(),
            'warmCount' => $enquiries->where('priority', 'Warm')->count(),
            'coldCount' => $enquiries->where('priority', 'Cold')->count(),
        ]);
    }

    /**
     * Store a newly created enquiry / lead.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'source' => 'nullable|string|max:100',
            'interestedPlan' => 'nullable|string|max:255',
            'interested_plan' => 'nullable|string|max:255',
            'goal' => 'nullable|string|max:255',
            'fitness_goal' => 'nullable|string|max:255',
            'priority' => 'nullable|in:Hot,Warm,Cold',
            'status' => 'nullable|string|max:100',
            'followUpDate' => 'nullable|date',
            'follow_up_date' => 'nullable|date',
            'staffName' => 'nullable|string|max:255',
            'staff_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request);

        $comments = [];
        if ($request->filled('notes')) {
            $comments[] = [
                'id' => 1,
                'text' => $request->notes,
                'author' => $request->staffName ?? $request->staff_name ?? 'Staff Admin',
                'createdAt' => now()->format('Y-m-d H:i')
            ];
        }

        $enquiry = Enquiry::create([
            'gym_id' => $gymId,
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'source' => $request->source ?? 'Walk-in',
            'interested_plan' => $request->interestedPlan ?? $request->interested_plan,
            'fitness_goal' => $request->goal ?? $request->fitness_goal ?? 'General Fitness',
            'priority' => $request->priority ?? 'Warm',
            'status' => $request->status ?? 'New',
            'follow_up_date' => $request->followUpDate ?? $request->follow_up_date ?? now()->addDays(2)->toDateString(),
            'staff_name' => $request->staffName ?? $request->staff_name ?? 'Coach Rohan',
            'notes' => $request->notes,
            'comments' => $comments,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'New enquiry lead captured successfully in database.',
            'data' => $this->formatEnquiry($enquiry),
        ], 201);
    }

    /**
     * Display the specified lead.
     */
    public function show($id)
    {
        $numericId = (int)str_replace('enq-', '', $id);
        $enquiry = Enquiry::findOrFail($numericId);

        return response()->json([
            'success' => true,
            'data' => $this->formatEnquiry($enquiry),
        ]);
    }

    /**
     * Full update of lead details from edit modal.
     */
    public function update(Request $request, $id)
    {
        $numericId = (int)str_replace('enq-', '', $id);
        $enquiry = Enquiry::findOrFail($numericId);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|max:50',
            'email' => 'nullable|email|max:255',
            'source' => 'nullable|string|max:100',
            'interestedPlan' => 'nullable|string|max:255',
            'interested_plan' => 'nullable|string|max:255',
            'goal' => 'nullable|string|max:255',
            'fitness_goal' => 'nullable|string|max:255',
            'priority' => 'nullable|in:Hot,Warm,Cold',
            'status' => 'nullable|string|max:100',
            'followUpDate' => 'nullable|date',
            'follow_up_date' => 'nullable|date',
            'staffName' => 'nullable|string|max:255',
            'staff_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $comments = $enquiry->comments ?? [];
        if ($request->filled('notes') && $request->notes !== $enquiry->notes) {
            $comments[] = [
                'id' => count($comments) + 1,
                'text' => 'Updated notes: ' . $request->notes,
                'author' => $request->input('staffName', $request->input('staff_name', $enquiry->staff_name ?? 'Admin')),
                'createdAt' => now()->format('Y-m-d H:i')
            ];
        }

        $enquiry->update([
            'name' => $request->input('name', $enquiry->name),
            'phone' => $request->input('phone', $enquiry->phone),
            'email' => $request->has('email') ? $request->email : $enquiry->email,
            'source' => $request->input('source', $enquiry->source),
            'interested_plan' => $request->input('interestedPlan', $request->input('interested_plan', $enquiry->interested_plan)),
            'fitness_goal' => $request->input('goal', $request->input('fitness_goal', $enquiry->fitness_goal)),
            'priority' => $request->input('priority', $enquiry->priority),
            'status' => $request->input('status', $enquiry->status),
            'follow_up_date' => $request->input('followUpDate', $request->input('follow_up_date', $enquiry->follow_up_date)),
            'staff_name' => $request->input('staffName', $request->input('staff_name', $enquiry->staff_name)),
            'notes' => $request->input('notes', $enquiry->notes),
            'comments' => $comments,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lead details successfully updated in database.',
            'data' => $this->formatEnquiry($enquiry),
        ]);
    }

    /**
     * Inline priority update (Hot, Warm, Cold).
     */
    public function updatePriority(Request $request, $id)
    {
        $numericId = (int)str_replace('enq-', '', $id);
        $enquiry = Enquiry::findOrFail($numericId);

        $validator = Validator::make($request->all(), [
            'priority' => 'required|in:Hot,Warm,Cold',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $oldPriority = $enquiry->priority;
        $newPriority = $request->priority;

        $comments = $enquiry->comments ?? [];
        $comments[] = [
            'id' => count($comments) + 1,
            'text' => "Priority changed from {$oldPriority} to {$newPriority}",
            'author' => auth('sanctum')->user()?->name ?? 'Staff',
            'createdAt' => now()->format('Y-m-d H:i'),
        ];

        $enquiry->update([
            'priority' => $newPriority,
            'comments' => $comments,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Priority updated to {$newPriority} in database.",
            'data' => $this->formatEnquiry($enquiry),
        ]);
    }

    /**
     * Inline follow-up date update.
     */
    public function updateFollowUp(Request $request, $id)
    {
        $numericId = (int)str_replace('enq-', '', $id);
        $enquiry = Enquiry::findOrFail($numericId);

        $validator = Validator::make($request->all(), [
            'follow_up_date' => 'required_without:followUpDate|date',
            'followUpDate' => 'required_without:follow_up_date|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $newDate = $request->followUpDate ?? $request->follow_up_date;

        $comments = $enquiry->comments ?? [];
        $comments[] = [
            'id' => count($comments) + 1,
            'text' => "Follow-up schedule updated to {$newDate}",
            'author' => auth('sanctum')->user()?->name ?? 'Staff',
            'createdAt' => now()->format('Y-m-d H:i'),
        ];

        $enquiry->update([
            'follow_up_date' => $newDate,
            'comments' => $comments,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Follow-up date scheduled for {$newDate} in database.",
            'data' => $this->formatEnquiry($enquiry),
        ]);
    }

    /**
     * Add staff discussion note to lead's thread.
     */
    public function addComment(Request $request, $id)
    {
        $numericId = (int)str_replace('enq-', '', $id);
        $enquiry = Enquiry::findOrFail($numericId);

        $validator = Validator::make($request->all(), [
            'text' => 'required|string|max:1000',
            'author' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $comments = $enquiry->comments ?? [];
        $newComment = [
            'id' => count($comments) + 1,
            'text' => $request->text,
            'author' => $request->author ?? auth('sanctum')->user()?->name ?? 'Coach Staff',
            'createdAt' => now()->format('Y-m-d H:i'),
        ];

        $comments[] = $newComment;
        $enquiry->update(['comments' => $comments]);

        return response()->json([
            'success' => true,
            'message' => 'Discussion note appended to lead thread.',
            'comment' => $newComment,
            'data' => $this->formatEnquiry($enquiry),
        ]);
    }

    /**
     * Convert an enquiry / lead into an active gym member and remove lead from enquiries.
     */
    public function convertToMember(Request $request, $id)
    {
        $numericId = (int)str_replace('enq-', '', $id);
        $enquiry = Enquiry::find($numericId);

        if (!$enquiry) {
            return response()->json([
                'success' => false,
                'message' => 'Enquiry lead not found or already converted/removed.',
            ], 404);
        }

        $gymId = $this->resolveGymId($request) ?? $enquiry->gym_id;

        // Resolve plan
        $plan = null;
        $rawPlanId = $request->input('plan_id', $request->input('planId'));
        if ($rawPlanId && $rawPlanId !== 'none') {
            $plan = Plan::find((int)str_replace('plan-', '', $rawPlanId));
        }
        if (!$plan && $enquiry->interested_plan) {
            $plan = Plan::where('name', $enquiry->interested_plan)->first();
        }
        if (!$plan) {
            $plan = Plan::where('gym_id', $gymId)->first() ?? Plan::first();
        }

        // Resolve trainer
        $trainerId = null;
        $rawTrainerId = $request->input('trainer_id', $request->input('trainerId'));
        if ($rawTrainerId && $rawTrainerId !== 'none') {
            $trainerId = (int)str_replace('trn-', '', $rawTrainerId);
        }

        // Credentials & details
        $name = $request->input('name', $enquiry->name);
        $email = $request->input('email', $enquiry->email);
        if (!$email) {
            $cleanName = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));
            $email = "{$cleanName}." . rand(100, 999) . "@member.pulsefit.in";
        }
        $phone = $request->input('phone', $enquiry->phone);
        $plainPassword = $request->input('password', 'fit' . rand(1000, 9999));

        // Find or create User
        $user = User::where('email', $email)->first();
        if ($user) {
            $user->name = $name;
            $user->phone = $phone;
            $user->password = Hash::make($plainPassword);
            $user->initial_password = Hash::make($plainPassword);
            $user->must_change_password = true;
            if ($request->filled('avatar')) {
                $user->avatar = $request->avatar;
            }
            $user->save();
        } else {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => Hash::make($plainPassword),
                'initial_password' => Hash::make($plainPassword),
                'must_change_password' => true,
                'role' => 'member',
                'gym_id' => $gymId,
                'avatar' => $request->input('avatar', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'),
            ]);
        }

        // Expiry calculation
        $durationMonths = $plan?->duration_months ?? 1;
        $expiryDate = now()->addMonths($durationMonths)->toDateString();
        if ($plan) {
            $plan->increment('active_subscribers');
        }

        // Create or update MemberProfile
        $profile = MemberProfile::firstOrNew(['user_id' => $user->id]);
        $profile->fill([
            'plan_id' => $plan?->id,
            'trainer_id' => $trainerId,
            'status' => 'Active',
            'join_date' => $profile->join_date ?? now()->toDateString(),
            'expiry_date' => $expiryDate,
            'gender' => $request->input('gender', $profile->gender ?? 'Male'),
            'age' => $request->input('age', $profile->age ?? 25),
            'weight' => $request->input('weight', $profile->weight ?? 70),
            'target_weight' => $request->input('target_weight', $request->input('targetWeight', $profile->target_weight ?? 65)),
            'height' => $request->input('height', $profile->height ?? 175),
            'goal' => $request->input('goal', $request->input('fitness_goal', $enquiry->fitness_goal ?? 'Fitness & Conditioning')),
            'medical_notes' => $request->input('medical_notes', $request->input('medicalNotes', $profile->medical_notes ?? 'None')),
            'emergency_contact' => $request->input('emergency_contact', $request->input('emergencyContact', $phone)),
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

        // Delete enquiry lead from database so it is removed from enquiry page
        $enquiry->delete();

        // Load relations and format member matching MemberController output
        $user->load(['memberProfile.plan', 'memberProfile.trainer']);
        $p = $user->memberProfile;
        $formattedMember = [
            'id' => 'mem-' . $user->id,
            'userId' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'planId' => $p?->plan ? 'plan-' . $p->plan->id : null,
            'planName' => $p?->plan?->name ?? ($plan?->name ?? 'Unassigned'),
            'status' => $p?->status ?? 'Active',
            'joinDate' => $p?->join_date ? $p->join_date->format('Y-m-d') : now()->toDateString(),
            'expiryDate' => $p?->expiry_date ? $p->expiry_date->format('Y-m-d') : $expiryDate,
            'trainerId' => $p?->trainer_id ? 'trn-' . $p->trainer_id : null,
            'trainerName' => $p?->trainer?->name ?? 'None / Self Guided',
            'gender' => $p?->gender ?? 'Male',
            'age' => $p?->age ?? 25,
            'weight' => $p?->weight ?? 70,
            'targetWeight' => $p?->target_weight ?? 65,
            'height' => $p?->height ?? 175,
            'goal' => $p?->goal ?? 'Fitness & Conditioning',
            'medicalNotes' => $p?->medical_notes ?? 'None reported',
            'emergencyContact' => $p?->emergency_contact ?? $phone,
            'attendanceStreak' => $p?->attendance_streak ?? 0,
            'qrPassCode' => $p?->qr_pass_code ?? ('PF-M-' . $user->id),
            'duesAmount' => $p?->dues_amount ?? 0,
            'lastCheckIn' => 'Just Joined',
        ];

        return response()->json([
            'success' => true,
            'message' => "Congratulations! {$name} has been enrolled as an Active Member and lead removed from Enquiries.",
            'data' => $formattedMember,
            'credentials' => [
                'id' => 'mem-' . $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'password' => $plainPassword,
                'planName' => $plan?->name ?? 'Standard',
                'qrPassCode' => $formattedMember['qrPassCode'],
            ],
        ], 200);
    }

    /**
     * Remove / scrap the specified lead.
     */
    public function destroy($id)
    {
        $numericId = (int)str_replace('enq-', '', $id);
        $enquiry = Enquiry::find($numericId);
        if ($enquiry) {
            $enquiry->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Enquiry / Lead record removed from database.',
        ]);
    }

    /**
     * Pipeline statistics for dashboard & metrics cards.
     */
    public function pipelineStats(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Enquiry::query();

        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        $total = $query->count();
        $hot = (clone $query)->where('priority', 'Hot')->count();
        $warm = (clone $query)->where('priority', 'Warm')->count();
        $cold = (clone $query)->where('priority', 'Cold')->count();
        $new = (clone $query)->where('status', 'New')->count();
        $contacted = (clone $query)->where('status', 'Contacted')->count();
        $trials = (clone $query)->where('status', 'Trial Scheduled')->count();
        $joined = (clone $query)->where('status', 'Joined')->count();

        $conversionRate = $total > 0 ? round(($joined / $total) * 100, 1) : 0;

        return response()->json([
            'success' => true,
            'stats' => [
                'total' => $total,
                'hot' => $hot,
                'warm' => $warm,
                'cold' => $cold,
                'new' => $new,
                'contacted' => $contacted,
                'trials' => $trials,
                'joined' => $joined,
                'conversionRate' => $conversionRate,
            ]
        ]);
    }

    /**
     * Format enquiry object for frontend.
     */
    protected function formatEnquiry(Enquiry $enq): array
    {
        return [
            'id' => 'enq-' . $enq->id,
            'numericId' => $enq->id,
            'gymId' => $enq->gym_id,
            'name' => $enq->name,
            'phone' => $enq->phone,
            'email' => $enq->email,
            'source' => $enq->source,
            'interestedPlan' => $enq->interested_plan,
            'goal' => $enq->fitness_goal,
            'priority' => $enq->priority,
            'status' => $enq->status,
            'followUpDate' => $enq->follow_up_date instanceof \DateTimeInterface ? $enq->follow_up_date->format('Y-m-d') : (string)$enq->follow_up_date,
            'staffName' => $enq->staff_name,
            'notes' => $enq->notes,
            'comments' => $enq->comments ?? [],
            'convertedMemberId' => $enq->converted_member_id,
            'createdAt' => $enq->created_at?->toIso8601String(),
        ];
    }
}
