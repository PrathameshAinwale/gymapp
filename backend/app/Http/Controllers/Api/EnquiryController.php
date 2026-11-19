<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                  ->orWhere('enquiry_number', 'like', "%{$search}%")
                  ->orWhere('legacy_id', 'like', "%{$search}%")
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
            'name' => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\'-]+$/u'],
            'phone' => [
                'required',
                'string',
                'regex:/^(\+?[0-9\s()-]{7,20})$/',
                function ($attribute, $value, $fail) {
                    $digits = preg_replace('/\D+/', '', $value);
                    if (str_starts_with(trim($value), '+')) {
                        if (strlen($digits) < 7 || strlen($digits) > 15) {
                            $fail('International phone numbers must contain between 7 and 15 digits.');
                        }
                    } else {
                        if (strlen($digits) !== 10) {
                            $fail('Mobile number must be a valid 10-digit number.');
                        }
                    }
                }
            ],
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
        ], [
            'name.required' => 'Prospect full name is required.',
            'name.min' => 'Name must be at least 2 characters.',
            'name.regex' => 'Name must only contain letters, spaces, hyphens, and apostrophes.',
            'phone.required' => 'Mobile number is required.',
            'phone.regex' => 'Please enter a valid mobile number with digits only.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first() ?: 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request);

        $name = \App\Services\TextSanitizerService::toTitleCase($request->name);
        $source = $request->source ? \App\Services\TextSanitizerService::toTitleCase($request->source) : 'Walk-in';
        $goal = \App\Services\TextSanitizerService::toTitleCase($request->goal ?? $request->fitness_goal ?? 'General Fitness');
        $staffName = \App\Services\TextSanitizerService::toTitleCase($request->staffName ?? $request->staff_name ?? 'Coach Rohan');
        $notes = $request->filled('notes') ? \App\Services\TextSanitizerService::toTitleCase($request->notes) : null;

        $comments = [];
        if ($notes) {
            $comments[] = [
                'id' => 1,
                'text' => $notes,
                'author' => $staffName,
                'createdAt' => now()->format('Y-m-d H:i')
            ];
        }

        $enquiry = DB::transaction(function () use ($gymId, $name, $request, $source, $goal, $staffName, $notes, $comments) {
            $enquiryNo = \App\Services\SequentialIdService::generateEnquiryNumber($gymId);
            return Enquiry::create([
                'gym_id' => $gymId,
                'enquiry_number' => $enquiryNo,
                'name' => $name,
                'phone' => $request->phone,
                'email' => $request->email,
                'source' => $source,
                'interested_plan' => $request->interestedPlan ?? $request->interested_plan,
                'fitness_goal' => $goal,
                'priority' => $request->priority ?? 'Warm',
                'status' => $request->status ?? 'New',
                'follow_up_date' => $request->followUpDate ?? $request->follow_up_date ?? now()->addDays(2)->toDateString(),
                'staff_name' => $staffName,
                'notes' => $notes,
                'comments' => $comments,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'New enquiry lead captured successfully in database.',
            'data' => $this->formatEnquiry($enquiry),
        ], 201);
    }

    /**
     * Resolve enquiry by enquiry_number or primary ID.
     */
    protected function findEnquiryById($id): Enquiry
    {
        $cleanId = preg_replace('/^enq-/i', '', (string)$id);
        $enquiry = Enquiry::where(function ($q) use ($id, $cleanId) {
            if (is_numeric($cleanId)) {
                $q->where('id', (int)$cleanId);
            }
            $q->orWhere('enquiry_number', $id)
              ->orWhere('enquiry_number', $cleanId)
              ->orWhere('legacy_id', $id)
              ->orWhere('legacy_id', $cleanId);
        })->first();

        if (!$enquiry) {
            abort(404, "Enquiry lead '{$id}' not found.");
        }

        return $enquiry;
    }

    /**
     * Display the specified lead.
     */
    public function show($id)
    {
        $enquiry = $this->findEnquiryById($id);

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
        $enquiry = $this->findEnquiryById($id);

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\'-]+$/u'],
            'phone' => [
                'sometimes',
                'required',
                'string',
                'regex:/^(\+?[0-9\s()-]{7,20})$/',
                function ($attribute, $value, $fail) {
                    $digits = preg_replace('/\D+/', '', $value);
                    if (str_starts_with(trim($value), '+')) {
                        if (strlen($digits) < 7 || strlen($digits) > 15) {
                            $fail('International phone numbers must contain between 7 and 15 digits.');
                        }
                    } else {
                        if (strlen($digits) !== 10) {
                            $fail('Mobile number must be a valid 10-digit number.');
                        }
                    }
                }
            ],
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
        ], [
            'name.min' => 'Name must be at least 2 characters.',
            'name.regex' => 'Name must only contain letters, spaces, hyphens, and apostrophes.',
            'phone.regex' => 'Please enter a valid mobile number with digits only.',
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
        $enquiry = $this->findEnquiryById($id);

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
        $enquiry = $this->findEnquiryById($id);

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
        $enquiry = $this->findEnquiryById($id);

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
     * Convert an enquiry / lead into an active gym member and link records.
     */
    public function convertToMember(Request $request, $id)
    {
        $enquiry = $this->findEnquiryById($id);

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
        $name = \App\Services\TextSanitizerService::toTitleCase($request->input('name', $enquiry->name));
        $email = $request->input('email', $enquiry->email);
        if (!$email) {
            $cleanName = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));
            $email = "{$cleanName}." . rand(100, 999) . "@member.pulsefit.in";
        }
        $phone = $request->input('phone', $enquiry->phone);
        if (!empty($phone)) {
            $rawPhone = trim($phone);
            $cleanDigits = preg_replace('/\D+/', '', $rawPhone);
            $last10 = strlen($cleanDigits) >= 10 ? substr($cleanDigits, -10) : $cleanDigits;

            $duplicatePhone = User::where('role', 'member')
                ->where(function ($q) use ($rawPhone, $last10, $cleanDigits) {
                    $q->where('phone', $rawPhone)
                      ->orWhere('phone', $cleanDigits);
                    if (strlen($last10) >= 7) {
                        $q->orWhere('phone', 'like', "%{$last10}");
                    }
                })->first();

            if ($duplicatePhone) {
                return response()->json([
                    'success' => false,
                    'message' => 'Member already exists with this mobile number.',
                    'errors' => ['phone' => ['Member already exists with this mobile number.']]
                ], 422);
            }
        }
        $plainPassword = $request->input('password', 'fit' . rand(1000, 9999));

        // Expiry calculation: 30 days per month, inclusive of start date
        $durationMonths = (int)($plan?->duration_months ?? 1);
        $offerDays = (int)($plan?->offer_days ?? 0);
        $totalDays = max(1, $durationMonths * 30);
        $expiry = now()->addDays($totalDays - 1);
        if ($offerDays > 0) {
            $expiry = $expiry->addDays($offerDays);
        }
        $expiryDate = $expiry->toDateString();
        if ($plan) {
            $plan->increment('active_subscribers');
        }

        $sanitizedGoal = \App\Services\TextSanitizerService::toTitleCase($request->input('goal', $request->input('fitness_goal', $enquiry->fitness_goal ?? 'Fitness & Conditioning')));
        $sanitizedMedicalNotes = \App\Services\TextSanitizerService::toTitleCase($request->input('medical_notes', $request->input('medicalNotes', null)));
        $sanitizedEmergencyContact = \App\Services\TextSanitizerService::toTitleCase($request->input('emergency_contact', $request->input('emergencyContact', null)));

        [$user, $profile, $createdInvoice] = DB::transaction(function () use (
            $gymId, $enquiry, $name, $email, $phone, $plainPassword, $plan, $trainerId,
            $expiryDate, $request, $sanitizedGoal, $sanitizedMedicalNotes, $sanitizedEmergencyContact
        ) {
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
                if (empty($user->member_number)) {
                    $user->member_number = \App\Services\SequentialIdService::generateMemberNumber($gymId, now());
                }
                $user->save();
            } else {
                $memberNo = \App\Services\SequentialIdService::generateMemberNumber($gymId, now());
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'password' => Hash::make($plainPassword),
                    'initial_password' => Hash::make($plainPassword),
                    'must_change_password' => true,
                    'role' => 'member',
                    'gym_id' => $gymId,
                    'avatar' => $request->input('avatar', null),
                    'member_number' => $memberNo,
                ]);
            }

            // Create or update MemberProfile
            $profile = MemberProfile::firstOrNew(['user_id' => $user->id]);
            $enqNo = $enquiry->enquiry_number ?: ('ENQ' . \App\Services\SequentialIdService::getFinancialYearCode($enquiry->created_at) . str_pad((string)$enquiry->id, 4, '0', STR_PAD_LEFT));

            $profile->fill([
                'member_number' => $user->member_number,
                'converted_from_enquiry_number' => $enqNo,
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
                'goal' => $sanitizedGoal,
                'medical_notes' => $sanitizedMedicalNotes ?? ($profile->medical_notes ?? null),
                'emergency_contact' => $sanitizedEmergencyContact ?? ($profile->emergency_contact ?? null),
                'qr_pass_code' => $profile->qr_pass_code ?? ('PF-M-' . $user->id . '-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $user->name), 0, 5))),
                'dues_amount' => 0,
            ]);
            $profile->save();

            $createdInvoice = null;
            if ($plan && $plan->price > 0) {
                $paymentMethod = $request->input('payment_method', $request->input('paymentMethod', 'UPI'));
                $authCreator = $request->user() ?: auth('sanctum')->user();
                $creatorId = $request->input('created_by', $request->input('createdBy', $authCreator?->id));
                $creatorName = $request->input('created_by_name', $request->input('createdByName', $request->input('staff_name', $request->input('executive', $authCreator?->name ?: $enquiry->staff_name))));
                $creatorName = \App\Services\TextSanitizerService::toTitleCase($creatorName ?: 'Staff / Admin');

                $invoiceNo = \App\Services\SequentialIdService::generateInvoiceNumber($gymId, now());
                $createdInvoice = Invoice::create([
                    'gym_id' => $gymId,
                    'invoice_number' => $invoiceNo,
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'amount' => $plan->price,
                    'date' => now()->toDateString(),
                    'payment_method' => $paymentMethod,
                    'status' => 'Paid',
                    'created_by' => $creatorId,
                    'created_by_name' => $creatorName,
                ]);
            }

            // Update enquiry status to Converted and link converted member ID
            $enquiry->update([
                'status' => 'Converted',
                'converted_member_id' => $user->id,
            ]);

            return [$user, $profile, $createdInvoice];
        });

        // Load relations and format member matching MemberController output
        $user->load(['memberProfile.plan', 'memberProfile.trainer']);
        $p = $user->memberProfile;
        $formattedMember = [
            'id' => $user->member_number ?: ('mem-' . $user->id),
            'memberNumber' => $user->member_number ?: ('mem-' . $user->id),
            'memberId' => $user->member_number ?: ('mem-' . $user->id),
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
            'medicalNotes' => $p?->medical_notes ?? '',
            'emergencyContact' => $p?->emergency_contact ?? '',
            'attendanceStreak' => $p?->attendance_streak ?? 0,
            'qrPassCode' => $p?->qr_pass_code ?? ('PF-M-' . $user->id),
            'duesAmount' => $p?->dues_amount ?? 0,
            'convertedFromEnquiryNumber' => $p?->converted_from_enquiry_number,
            'lastCheckIn' => 'Just Joined',
        ];

        return response()->json([
            'success' => true,
            'message' => "Congratulations! {$name} has been enrolled as an Active Member.",
            'data' => $formattedMember,
            'credentials' => [
                'id' => $user->member_number ?: ('mem-' . $user->id),
                'memberNumber' => $user->member_number ?: ('mem-' . $user->id),
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
        $cleanId = preg_replace('/^enq-/i', '', (string)$id);
        $enquiry = Enquiry::where(function ($q) use ($id, $cleanId) {
            if (is_numeric($cleanId)) {
                $q->where('id', (int)$cleanId);
            }
            $q->orWhere('enquiry_number', $id)
              ->orWhere('enquiry_number', $cleanId)
              ->orWhere('legacy_id', $id)
              ->orWhere('legacy_id', $cleanId);
        })->first();

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
            'id' => $enq->enquiry_number ?: ('enq-' . $enq->id),
            'enquiryNumber' => $enq->enquiry_number ?: ('enq-' . $enq->id),
            'legacyId' => $enq->legacy_id,
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
