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
use App\Models\Gym;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class MemberController extends Controller
{
    public static function validatePromiseDate(?string $promiseDate, ?string $startDate, ?string $expiryDate, bool $isRequired = false): ?string
    {
        if (empty($promiseDate)) {
            return $isRequired ? 'Promised due date is required when there is an outstanding balance.' : null;
        }
        $pDate = substr(trim($promiseDate), 0, 10);
        $sDate = $startDate ? substr(trim($startDate), 0, 10) : null;
        $eDate = $expiryDate ? substr(trim($expiryDate), 0, 10) : null;

        if ($sDate && $eDate && $sDate >= $eDate) {
            return 'Membership date range contains no permitted promise date (start date must be before expiry date).';
        }

        if ($sDate && $pDate < $sDate) {
            return "Promised due date ({$pDate}) cannot be earlier than membership start date ({$sDate}).";
        }

        if ($eDate && $pDate >= $eDate) {
            return "Promised due date ({$pDate}) must be strictly before membership expiry date ({$eDate}). The expiry date itself is not permitted.";
        }

        return null;
    }

    public static function computeMemberStatus($expiryDate, ?string $currentStatus = 'Active', $startDate = null): string
    {
        // Preserve legitimate administrative overriding states
        if (in_array($currentStatus, ['Frozen', 'Frozen (Paused)', 'On Hold', 'Suspended', 'Cancelled'])) {
            return $currentStatus;
        }

        try {
            $tz = \App\Services\PlanChainingService::TIMEZONE;
            $today = \Illuminate\Support\Carbon::now($tz)->startOfDay();

            // 1. If start date is in the future, membership is Upcoming
            if ($startDate) {
                $start = ($startDate instanceof \Illuminate\Support\Carbon)
                    ? $startDate->copy()->setTimezone($tz)->startOfDay()
                    : \Illuminate\Support\Carbon::parse($startDate, $tz)->startOfDay();

                if ($start->gt($today)) {
                    return 'Upcoming';
                }
            }

            if (!$expiryDate) {
                return ($currentStatus && $currentStatus !== 'Active') ? $currentStatus : 'Unassigned';
            }

            $expiry = ($expiryDate instanceof \Illuminate\Support\Carbon)
                ? $expiryDate->copy()->setTimezone($tz)->startOfDay()
                : \Illuminate\Support\Carbon::parse($expiryDate, $tz)->startOfDay();

            // Expiry date boundary:
            // A membership is valid through its expiry date.
            // It becomes Expired only after the expiry date has ended (expiry < today).
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

    public static function syncAllMemberStatuses(bool $force = false): void
    {
        $tz = \App\Services\PlanChainingService::TIMEZONE;
        $todayStr = \Illuminate\Support\Carbon::now($tz)->toDateString();
        $cacheKey = 'member_statuses_last_synced_' . $todayStr;
        if (!$force && Cache::has($cacheKey)) {
            return;
        }

        try {
            $today = \Illuminate\Support\Carbon::now($tz)->startOfDay();
            $tenDaysLater = $today->copy()->addDays(10)->toDateString();
            $todayDateStr = $today->toDateString();

            $excludedStatuses = ['Frozen', 'Frozen (Paused)', 'On Hold', 'Suspended', 'Cancelled'];

            // 1. Members whose join_date is in the future (> today) -> Upcoming
            MemberProfile::whereNotNull('join_date')
                ->whereDate('join_date', '>', $todayDateStr)
                ->whereNotIn('status', $excludedStatuses)
                ->where('status', '!=', 'Upcoming')
                ->update(['status' => 'Upcoming']);

            // 2. Members whose expiry_date < today and not in excluded statuses -> Expired
            MemberProfile::whereNotNull('expiry_date')
                ->whereDate('expiry_date', '<', $todayDateStr)
                ->whereNotIn('status', $excludedStatuses)
                ->where('status', '!=', 'Expired')
                ->update(['status' => 'Expired']);

            // 3. Members whose expiry_date >= today and <= today + 10 days, join_date <= today -> Expiring Soon
            MemberProfile::whereNotNull('expiry_date')
                ->whereDate('expiry_date', '>=', $todayDateStr)
                ->whereDate('expiry_date', '<=', $tenDaysLater)
                ->where(function ($q) use ($todayDateStr) {
                    $q->whereNull('join_date')->orWhereDate('join_date', '<=', $todayDateStr);
                })
                ->whereNotIn('status', $excludedStatuses)
                ->where('status', '!=', 'Expiring Soon')
                ->update(['status' => 'Expiring Soon']);

            // 4. Members whose expiry_date > today + 10 days, join_date <= today -> Active
            MemberProfile::whereNotNull('expiry_date')
                ->whereDate('expiry_date', '>', $tenDaysLater)
                ->where(function ($q) use ($todayDateStr) {
                    $q->whereNull('join_date')->orWhereDate('join_date', '<=', $todayDateStr);
                })
                ->whereNotIn('status', $excludedStatuses)
                ->where('status', '!=', 'Active')
                ->update(['status' => 'Active']);

            Cache::put($cacheKey, true, \Illuminate\Support\Carbon::now($tz)->endOfDay());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Member status sync failed: ' . $e->getMessage());
        }
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
        $query->with(['memberProfile.plan', 'memberProfile.trainer', 'invoices.plan']);

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

        if ($request->has('balance') && !empty($request->balance) && $request->balance !== 'All') {
            $balUpper = strtoupper(str_replace(' ', '_', trim($request->balance)));
            if (in_array($balUpper, ['DUE', 'PENDING', 'HAS_DUE', 'HASDUE'])) {
                $query->where(function ($q) {
                    $q->whereHas('memberProfile', function ($sub) {
                        $sub->where('dues_amount', '>', 0);
                    })->orWhereHas('invoices', function ($sub) {
                        $sub->where('status', 'Pending');
                        if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'pending_amount')) {
                            $sub->orWhere('pending_amount', '>', 0);
                        }
                    });
                });
            } elseif (in_array($balUpper, ['PAID', 'CLEAR'])) {
                $query->whereHas('memberProfile', function ($q) {
                    $q->where(function ($sub) {
                        $sub->whereNull('dues_amount')
                            ->orWhere('dues_amount', '<=', 0);
                    });
                })->whereDoesntHave('invoices', function ($sub) {
                    $sub->where('status', 'Pending');
                    if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'pending_amount')) {
                        $sub->orWhere('pending_amount', '>', 0);
                    }
                });
            }
        }

        if ($request->has('trainer_id') && !empty($request->trainer_id)) {
            $query->whereHas('memberProfile', function ($q) use ($request) {
                $q->where('trainer_id', $request->trainer_id);
            });
        }

        $members = $query->latest()->get()->map(function ($user) {
            $profile = $user->memberProfile;
            $breakdown = \App\Services\PlanChainingService::getMemberPlansBreakdown($user);
            return [
                'id' => 'mem-' . $user->id,
                'userId' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'planId' => $profile?->plan ? 'plan-' . $profile->plan->id : null,
                'planName' => $profile?->plan?->name ?? 'Unassigned',
                'planDurationMonths' => (int)($profile?->plan?->duration_months ?? 0),
                'durationMonths' => (int)($profile?->plan?->duration_months ?? 0),
                'status' => $profile ? self::computeMemberStatus($profile->expiry_date, $profile->status, $profile->join_date) : 'Active',
                'joinDate' => $profile?->join_date?->format('Y-m-d'),
                'expiryDate' => $profile?->expiry_date?->format('Y-m-d'),
                'trainerId' => $profile?->trainer_id ? 'trn-' . $profile->trainer_id : null,
                'trainerName' => $profile?->trainer?->name ?? 'None / Self Guided',
                'executive' => $profile?->executive ?? '',
                'trainingType' => $profile?->training_type ?? 'self',
                'gender' => $profile?->gender ?? null,
                'age' => $profile?->age,
                'dob' => $profile?->dob ? $profile->dob->format('Y-m-d') : null,
                'weight' => $profile?->weight,
                'targetWeight' => $profile?->target_weight,
                'height' => $profile?->height,
                'goal' => $profile?->goal,
                'medicalNotes' => $profile?->medical_notes ?? '',
                'emergencyContact' => $profile?->emergency_contact ?? null,
                'kycDocType' => $profile?->kyc_doc_type ?? 'Aadhaar Card',
                'kycDocNumber' => $profile?->kyc_doc_number ?? '',
                'kycStatus' => $profile?->kyc_status ?? 'Verified',
                'attendanceStreak' => $profile?->attendance_streak ?? 0,
                'qrPassCode' => $profile?->qr_pass_code ?? ('PF-M-' . $user->id),
                'duesAmount' => $profile?->dues_amount ?? 0,
                'dueDate' => $profile?->due_date ? $profile->due_date->format('Y-m-d') : null,
                'lastCheckIn' => $profile?->last_check_in ? $profile->last_check_in->diffForHumans() : 'Never',
                'activePlans' => $breakdown['activePlans'] ?? [],
                'upcomingPlans' => $breakdown['upcomingPlans'] ?? [],
                'expiredPlans' => $breakdown['expiredPlans'] ?? [],
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
        $plansBreakdown = \App\Services\PlanChainingService::getMemberPlansBreakdown($user);

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
                'planDurationMonths' => (int)($profile?->plan?->duration_months ?? 0),
                'durationMonths' => (int)($profile?->plan?->duration_months ?? 0),
                'status' => $profile ? self::computeMemberStatus($profile->expiry_date, $profile->status, $profile->join_date) : 'Active',
                'joinDate' => $profile?->join_date?->format('Y-m-d'),
                'expiryDate' => $profile?->expiry_date?->format('Y-m-d'),
                'trainerId' => $profile?->trainer_id ? 'trn-' . $profile->trainer_id : null,
                'trainerName' => $profile?->trainer?->name ?? 'None / Self Guided',
                'executive' => $profile?->executive ?? '',
                'trainingType' => $profile?->training_type ?? 'self',
                'gender' => $profile?->gender,
                'age' => $profile?->age,
                'dob' => $profile?->dob ? $profile->dob->format('Y-m-d') : null,
                'weight' => $profile?->weight,
                'targetWeight' => $profile?->target_weight,
                'height' => $profile?->height,
                'goal' => $profile?->goal,
                'medicalNotes' => $profile?->medical_notes,
                'emergencyContact' => $profile?->emergency_contact,
                'kycDocType' => $profile?->kyc_doc_type ?? 'Aadhaar Card',
                'kycDocNumber' => $profile?->kyc_doc_number ?? '',
                'kycStatus' => $profile?->kyc_status ?? 'Verified',
                'attendanceStreak' => $profile?->attendance_streak ?? 0,
                'qrPassCode' => $profile?->qr_pass_code,
                'duesAmount' => $profile?->dues_amount ?? 0,
                'dueDate' => $profile?->due_date ? $profile->due_date->format('Y-m-d') : null,
                'workoutPlan' => $user->workoutPlans->sortByDesc('created_at')->first(),
                'dietPlan' => $user->dietPlans->sortByDesc('created_at')->first(),
                'bodyMetrics' => $user->bodyMetrics->sortByDesc('created_at')->values(),
                'activePlans' => $plansBreakdown['activePlans'],
                'upcomingPlans' => $plansBreakdown['upcomingPlans'],
                'expiredPlans' => $plansBreakdown['expiredPlans'],
                'invoices' => $user->invoices->sortByDesc('created_at')->map(function ($inv) use ($user) {
                    $creatorName = $inv->created_by_name ?: ($inv->creator?->name ?: (\App\Models\User::where('gym_id', $user->gym_id)->where('role', 'owner')->value('name') ?: 'Staff'));
                    $arr = $inv->toArray();
                    $arr['createdByName'] = $creatorName;
                    $arr['created_by_name'] = $creatorName;
                    $arr['executive'] = $creatorName;
                    return $arr;
                })->values(),
            ]
        ]);
    }

      public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\'-]+$/u'],
            'email' => 'nullable|email',
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
            'biometric_user_id' => 'nullable|string|max:50',
            'biometricUserId' => 'nullable|string|max:50',
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
            'dob' => 'nullable|date|before_or_equal:today',
            'date_of_birth' => 'nullable|date|before_or_equal:today',
            'birthdate' => 'nullable|date|before_or_equal:today',
            'DOB' => 'nullable|date|before_or_equal:today',
            'password' => 'nullable|string',
            'avatar' => 'nullable|string',
            'medical_notes' => 'nullable|string',
            'medicalNotes' => 'nullable|string',
            'emergency_contact' => [
                'nullable',
                'string',
                'regex:/^(\+?[0-9\s()-]{7,20})$/',
                function ($attribute, $value, $fail) {
                    if (empty(trim($value))) return;
                    $digits = preg_replace('/\D+/', '', $value);
                    if (str_starts_with(trim($value), '+')) {
                        if (strlen($digits) < 7 || strlen($digits) > 15) {
                            $fail('Emergency contact must contain between 7 and 15 digits.');
                        }
                    } else {
                        if (strlen($digits) !== 10) {
                            $fail('Emergency contact must be a valid 10-digit mobile number.');
                        }
                    }
                }
            ],
            'emergencyContact' => [
                'nullable',
                'string',
                'regex:/^(\+?[0-9\s()-]{7,20})$/',
                function ($attribute, $value, $fail) {
                    if (empty(trim($value))) return;
                    $digits = preg_replace('/\D+/', '', $value);
                    if (str_starts_with(trim($value), '+')) {
                        if (strlen($digits) < 7 || strlen($digits) > 15) {
                            $fail('Emergency contact must contain between 7 and 15 digits.');
                        }
                    } else {
                        if (strlen($digits) !== 10) {
                            $fail('Emergency contact must be a valid 10-digit mobile number.');
                        }
                    }
                }
            ],
            'enquiry_id' => 'nullable',
            'enquiryId' => 'nullable',
            'amount' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'paidAmount' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'totalAmount' => 'nullable|numeric|min:0',
            'dues_amount' => 'nullable|numeric|min:0',
            'duesAmount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'discountAmount' => 'nullable|numeric|min:0',
            'packages' => 'nullable|array',
            'packages.*.package_type' => 'nullable|string',
            'packages.*.plan_id' => 'nullable',
            'packages.*.start_date' => 'nullable|date',
            'packages.*.end_date' => 'nullable|date',
            'packages.*.price' => 'nullable|numeric|min:0',
            'packages.*.discount' => 'nullable|numeric|min:0',
        ], [
            'name.required' => 'Member full name is required.',
            'name.min' => 'Name must be at least 2 characters.',
            'name.regex' => 'Name must only contain letters, spaces, hyphens, and apostrophes.',
            'phone.required' => 'Mobile number is mandatory to register a member.',
            'phone.min' => 'Please enter a valid mobile number.',
            'phone.regex' => 'Please enter a valid mobile number with digits only.',
            'emergency_contact.regex' => 'Emergency contact must be a valid phone number with digits only.',
            'emergencyContact.regex' => 'Emergency contact must be a valid phone number with digits only.',
            'dob.before_or_equal' => 'Date of birth cannot be in the future.',
            'date_of_birth.before_or_equal' => 'Date of birth cannot be in the future.',
            'birthdate.before_or_equal' => 'Date of birth cannot be in the future.',
            'DOB.before_or_equal' => 'Date of birth cannot be in the future.',
            'amount.min' => 'Payment amount cannot be negative.',
            'paid_amount.min' => 'Paid amount cannot be negative.',
            'paidAmount.min' => 'Paid amount cannot be negative.',
            'total_amount.min' => 'Total bill amount cannot be negative.',
            'totalAmount.min' => 'Total bill amount cannot be negative.',
            'dues_amount.min' => 'Dues amount cannot be negative.',
            'duesAmount.min' => 'Dues amount cannot be negative.',
            'discount.min' => 'Discount cannot be negative.',
            'discount_amount.min' => 'Discount cannot be negative.',
            'discountAmount.min' => 'Discount cannot be negative.',
            'packages.*.price.min' => 'Package price cannot be negative.',
            'packages.*.discount.min' => 'Package discount cannot be negative.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first() ?: 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request) ?: ($request->user()?->gym_id ?: (Gym::first()?->id ?: 1));

        $rawPlanId = $request->plan_id ?? $request->planId;
        $rawTrainerId = $request->trainer_id ?? $request->trainerId;
        $planId = ($rawPlanId && $rawPlanId !== 'none') ? (int)str_replace('plan-', '', $rawPlanId) : null;
        $trainerId = ($rawTrainerId && $rawTrainerId !== 'none') ? (int)str_replace('trn-', '', $rawTrainerId) : null;

        $plainPassword = $request->password ?? 'fit' . rand(1000, 9999);
        $targetUserId = $request->user_id ?? $request->userId ?? $request->member_id;
        $numTargetId = $targetUserId ? (int)str_replace('mem-', '', $targetUserId) : null;

        // 1. Check for duplicate mobile number
        $rawPhone = trim($request->phone ?? '');
        if (!empty($rawPhone)) {
            $cleanDigits = preg_replace('/\D+/', '', $rawPhone);
            $last10 = strlen($cleanDigits) >= 10 ? substr($cleanDigits, -10) : $cleanDigits;

            $duplicatePhoneQuery = User::where('role', 'member')
                ->where(function ($q) use ($rawPhone, $last10, $cleanDigits) {
                    $q->where('phone', $rawPhone)
                      ->orWhere('phone', $cleanDigits);
                    if (strlen($last10) >= 7) {
                        $q->orWhere('phone', 'like', "%{$last10}");
                    }
                });

            if ($gymId && $gymId > 1) {
                $duplicatePhoneQuery->where(function ($q) use ($gymId) {
                    $q->where('gym_id', $gymId)
                      ->orWhereNull('gym_id');
                });
            }

            if ($numTargetId && $numTargetId > 0) {
                $duplicatePhoneQuery->where('id', '!=', $numTargetId);
            }

            $existingWithPhone = $duplicatePhoneQuery->first();
            if ($existingWithPhone) {
                return response()->json([
                    'success' => false,
                    'message' => 'Member already exists with this mobile number.',
                    'errors' => [
                        'phone' => ['Member already exists with this mobile number.']
                    ]
                ], 422);
            }
        }

        // 2. Resolve plan and validate discount rules before any database writes
        $plan = null;
        if ($planId) {
            $plan = Plan::find($planId);
            if ($plan && $plan->max_discount !== null && (float)$plan->max_discount > 0) {
                $maxDisc = (float)$plan->max_discount;
                $enteredDisc = (float)($request->discount ?? $request->discount_amount ?? $request->discountAmount ?? 0);
                if ($enteredDisc > $maxDisc) {
                    return response()->json([
                        'success' => false,
                        'message' => "Discount of ₹" . number_format($enteredDisc) . " exceeds maximum allowed discount of ₹" . number_format($maxDisc) . " for plan {$plan->name}.",
                        'errors' => [
                            'discount' => ["Discount of ₹" . number_format($enteredDisc) . " exceeds maximum allowed discount of ₹" . number_format($maxDisc) . "."]
                        ]
                    ], 422);
                }

                $totalBillInput = (float)($request->input('total_amount', $request->input('totalAmount', 0)));
                if ($totalBillInput > 0 && $plan->price > 0 && ($plan->price - $totalBillInput) > ($maxDisc + 0.01)) {
                    $implicitDisc = (float)($plan->price - $totalBillInput);
                    return response()->json([
                        'success' => false,
                        'message' => "Discount of ₹" . number_format($implicitDisc) . " exceeds maximum allowed discount of ₹" . number_format($maxDisc) . " for plan {$plan->name}.",
                        'errors' => [
                            'discount' => ["Discount of ₹" . number_format($implicitDisc) . " exceeds maximum allowed discount of ₹" . number_format($maxDisc) . "."]
                        ]
                    ], 422);
                }
            }
        }

        $todayStr = now()->toDateString();
        $packagesList = $request->input('packages');

        // Validate package dates and overlaps if packages array is provided
        if (is_array($packagesList) && count($packagesList) > 0) {
            $packagesByType = [];
            foreach ($packagesList as $idx => $pkg) {
                $pkgName = $pkg['name'] ?? ("Package #" . ($idx + 1));
                $pkgStart = !empty($pkg['start_date']) ? \Illuminate\Support\Carbon::parse($pkg['start_date'])->toDateString() : null;
                $pkgEnd = !empty($pkg['end_date']) ? \Illuminate\Support\Carbon::parse($pkg['end_date'])->toDateString() : null;

                if ($pkgStart && $pkgStart < $todayStr) {
                    return response()->json([
                        'success' => false,
                        'message' => "Start date cannot be in the past for {$pkgName} ({$pkgStart}).",
                        'errors' => ['packages' => ["Start date cannot be in the past for {$pkgName}."]]
                    ], 422);
                }

                if ($pkgStart && $pkgEnd && $pkgEnd < $pkgStart) {
                    return response()->json([
                        'success' => false,
                        'message' => "End date cannot be before start date for {$pkgName}.",
                        'errors' => ['packages' => ["End date cannot be before start date for {$pkgName}."]]
                    ], 422);
                }

                $normType = \App\Services\PlanChainingService::normalizePackageType($pkg['package_type'] ?? 'Gym-Cardio');
                $packagesByType[$normType][] = [
                    'name' => $pkgName,
                    'start_date' => $pkgStart,
                    'end_date' => $pkgEnd,
                ];
            }

            // Check for date overlaps within the same package type in the same request
            foreach ($packagesByType as $pType => $pRows) {
                if (count($pRows) > 1) {
                    usort($pRows, function ($a, $b) {
                        return strcmp($a['start_date'] ?? '', $b['start_date'] ?? '');
                    });
                    for ($k = 0; $k < count($pRows) - 1; $k++) {
                        $curr = $pRows[$k];
                        $next = $pRows[$k + 1];
                        if ($curr['end_date'] && $next['start_date'] && $next['start_date'] <= $curr['end_date']) {
                            return response()->json([
                                'success' => false,
                                'message' => "Package '{$next['name']}' start date ({$next['start_date']}) overlaps with package '{$curr['name']}' ending on {$curr['end_date']}.",
                                'errors' => ['packages' => ["Package '{$next['name']}' overlaps with '{$curr['name']}'."]]
                            ], 422);
                        }
                    }
                }
            }

            // Resolve plan and expiry from submitted packages if not explicitly set
            $firstPkgWithPlan = collect($packagesList)->first(function ($p) {
                return !empty($p['plan_id']);
            });
            if ($firstPkgWithPlan && !$planId) {
                $planId = (int)str_replace('plan-', '', $firstPkgWithPlan['plan_id']);
                $plan = Plan::find($planId);
            }
        }

        $rawJoin = $request->join_date ?? $request->joinDate ?? $request->start_date ?? $request->startDate;
        $joinDate = $rawJoin ? \Illuminate\Support\Carbon::parse($rawJoin)->toDateString() : now()->toDateString();
        $rawExpiry = $request->expiry_date ?? $request->expiryDate;

        if ($joinDate < $todayStr && !$numTargetId) {
            return response()->json([
                'success' => false,
                'message' => 'Start date cannot be in the past.',
                'errors' => ['start_date' => ['Start date cannot be in the past.']]
            ], 422);
        }

        if ($rawExpiry) {
            $expiryDate = \Illuminate\Support\Carbon::parse($rawExpiry)->toDateString();
            if ($expiryDate < $joinDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'End date cannot be before start date.',
                    'errors' => ['expiry_date' => ['End date cannot be before start date.']]
                ], 422);
            }
        } else {
            if ($plan) {
                $startCarbon = \Illuminate\Support\Carbon::parse($joinDate);
                $durationMonths = (int)($plan->duration_months ?? 1);
                $offerDays = (int)($plan->offer_days ?? 0);
                if ($startCarbon->day === 1) {
                    $expiry = $startCarbon->copy()->addMonths($durationMonths - 1)->endOfMonth();
                } else {
                    $expiry = $startCarbon->copy()->addDays($durationMonths * 30);
                }
                if ($offerDays > 0) {
                    $expiry = $expiry->addDays($offerDays);
                }
                $expiryDate = $expiry->toDateString();
            } else {
                $expiryDate = null;
            }
        }

        // If packages array is provided, ensure expiryDate reflects the furthest end_date
        if (is_array($packagesList) && count($packagesList) > 0) {
            $maxPkgEnd = collect($packagesList)->pluck('end_date')->filter()->max();
            if ($maxPkgEnd && (!$expiryDate || $maxPkgEnd > $expiryDate)) {
                $expiryDate = \Illuminate\Support\Carbon::parse($maxPkgEnd)->toDateString();
            }
        }

        $computedStatus = self::computeMemberStatus($expiryDate, $request->status ?? ($expiryDate ? 'Active' : 'Unassigned'), $joinDate);
        $duesAmount = (float)($request->input('dues_amount', $request->input('duesAmount', 0)));
        $totalBill = (float)($request->input('total_amount', $request->input('totalAmount', $plan?->price ?? 0)));
        $paidAmountInput = $request->input('paid_amount', $request->input('paidAmount'));
        $receivedAmount = $paidAmountInput !== null
            ? (float)$paidAmountInput
            : (float)($request->input('amount', $totalBill));

        $rawDueDate = $request->input('due_date', $request->input('dueDate', $request->input('balance_due_date', $request->input('balanceDueDate'))));
        $parsedDueDate = ($duesAmount > 0 && $rawDueDate) ? \Illuminate\Support\Carbon::parse($rawDueDate)->toDateString() : null;

        if ($duesAmount > 0) {
            $promiseError = self::validatePromiseDate($parsedDueDate, $joinDate, $expiryDate, true);
            if ($promiseError) {
                return response()->json([
                    'success' => false,
                    'message' => $promiseError,
                    'errors' => [
                        'due_date' => [$promiseError],
                        'dueDate' => [$promiseError],
                        'balance_due_date' => [$promiseError],
                    ]
                ], 422);
            }
        }

        $rawTrainingType = $request->input('training_type', $request->input('trainingType', 'self'));
        $rawExecutive = $request->input('executive', $request->input('staff_name', $request->input('staffName')));
        $rawKycDocType = $request->input('kyc_doc_type', $request->input('kycDocType', 'Aadhaar Card'));
        $rawKycDocNumber = $request->input('kyc_doc_number', $request->input('kycDocNumber'));
        $rawKycStatus = $request->input('kyc_status', $request->input('kycStatus', 'Verified'));

        $authCreator = $request->user() ?: auth('sanctum')->user();
        $creatorId = $request->input('created_by', $request->input('createdBy', $authCreator?->id));
        $creatorName = $request->input('created_by_name', $request->input('createdByName', $request->input('executive', $request->input('handled_by', $authCreator?->name))));
        if (!$creatorName && $creatorId) {
            $creatorName = User::find($creatorId)?->name;
        }
        if (!$creatorName) {
            $creatorName = $authCreator?->name ?: (User::where('gym_id', $gymId)->where('role', 'owner')->value('name') ?: 'Staff');
        }
        $cleanCreatorName = preg_replace('/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i', '', $creatorName);
        $creatorName = trim($cleanCreatorName) ?: ($authCreator?->name ?: 'Staff');

        $emailVal = !empty($request->email) ? trim(strtolower($request->email)) : null;

        // 3. Perform all database writes atomically inside a transaction
        [$user, $profile, $qrCode, $primaryInvoiceNo, $primaryInvoice] = DB::transaction(function () use (
            $numTargetId, $request, $emailVal, $plainPassword, $gymId, $plan,
            $rawKycDocNumber, $rawKycDocType, $planId, $trainerId, $rawExecutive,
            $rawTrainingType, $computedStatus, $joinDate, $expiryDate, $duesAmount,
            $parsedDueDate, $receivedAmount, $totalBill, $rawKycStatus, $creatorId,
            $creatorName, $packagesList
        ) {
            $user = null;
            if ($numTargetId && $numTargetId > 0) {
                $user = User::find($numTargetId);
            }

            if ($user) {
                $user->name = $request->name;
                $user->phone = $request->phone ?? $user->phone;
                if ($request->has('email')) {
                    $user->email = $emailVal;
                }
                if ($request->filled('password')) {
                    $user->password = Hash::make($plainPassword);
                    $user->initial_password = Hash::make($plainPassword);
                    $user->must_change_password = true;
                }
                if ($request->filled('avatar')) {
                    $user->avatar = $request->avatar;
                }
                $user->save();
            } else {
                $user = User::create([
                    'name' => $request->name,
                    'email' => $emailVal,
                    'password' => Hash::make($plainPassword),
                    'initial_password' => Hash::make($plainPassword),
                    'must_change_password' => true,
                    'role' => 'member',
                    'phone' => $request->phone,
                    'gym_id' => $gymId,
                    'avatar' => $request->avatar ?? null,
                ]);
            }

            if ($plan) {
                $plan->increment('active_subscribers');
            }

            $profile = MemberProfile::firstOrCreate(['user_id' => $user->id]);

            $cleanName = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $user->name), 0, 5)) ?: 'MEMBER';
            $qrCode = $profile->qr_pass_code ?: ('PF-M-' . $user->id . '-' . $cleanName . '-' . strtoupper(substr(uniqid(), -4)));

            $rawDob = $request->dob ?? $request->date_of_birth ?? $request->birthdate ?? $request->DOB;
            $dob = $rawDob ? \Illuminate\Support\Carbon::parse($rawDob)->toDateString() : ($profile->dob ?? null);
            $computedAge = $dob ? \Illuminate\Support\Carbon::parse($dob)->age : ($request->age ?? $profile->age ?? null);

            if (!empty($rawKycDocNumber)) {
                if ($rawKycDocType === 'Aadhaar Card') {
                    $user->aadhaar_card = $rawKycDocNumber;
                } elseif ($rawKycDocType === 'PAN Card') {
                    $user->pan_card = $rawKycDocNumber;
                }
                $user->save();
            }

            // eSSL Biometric User ID (defaults to user ID if not provided)
            $biometricId = $request->input('biometric_user_id', $request->input('biometricUserId', (string)$user->id));
            $user->biometric_user_id = $biometricId;
            $user->synced_to_device = 0;
            $user->save();

            $profile->fill([
                'biometric_user_id' => $biometricId,
                'synced_to_device' => 0,
                'plan_id' => $planId,
                'trainer_id' => $trainerId,
                'executive' => $rawExecutive,
                'training_type' => $rawTrainingType,
                'phone' => $request->phone,
                'status' => $computedStatus,
                'join_date' => $joinDate,
                'expiry_date' => $expiryDate,
                'gender' => $request->gender ?? $profile->gender ?? null,
                'age' => $computedAge,
                'dob' => $dob,
                'weight' => $request->weight ?? $profile->weight ?? null,
                'target_weight' => $request->target_weight ?? $request->targetWeight ?? $profile->target_weight ?? null,
                'height' => $request->height ?? $profile->height ?? null,
                'goal' => $request->goal ?? $profile->goal ?? null,
                'medical_notes' => $request->medical_notes ?? $request->medicalNotes ?? $profile->medical_notes ?? null,
                'emergency_contact' => $request->emergency_contact ?? $request->emergencyContact ?? $profile->emergency_contact ?? null,
                'kyc_doc_type' => $rawKycDocType,
                'kyc_doc_number' => $rawKycDocNumber,
                'kyc_status' => $rawKycStatus,
                'qr_pass_code' => $qrCode,
                'dues_amount' => $duesAmount,
                'due_date' => $parsedDueDate,
            ]);
            $profile->save();

            // Create invoices and record inflow in revenue_and_billings
            $paymentMethod = $request->input('payment_method', $request->input('paymentMethod', 'UPI'));
            $validPackagesList = (is_array($packagesList) && count($packagesList) > 0)
                ? collect($packagesList)->filter(function ($p) {
                    return !empty($p['plan_id']) || !empty($p['price']) || !empty($p['name']);
                })->values()
                : collect();

            $primaryInvoice = null;
            $primaryInvoiceNo = null;

            if ($validPackagesList->isNotEmpty() || $receivedAmount > 0 || ($plan && $plan->price > 0)) {
                $topDiscount = (float)($request->discount ?? $request->discount_amount ?? $request->discountAmount ?? 0);
                $sumPkgDisc = $validPackagesList->sum(fn($p) => (float)($p['discount'] ?? 0));
                $unallocatedDiscount = ($sumPkgDisc > 0) ? 0 : $topDiscount;

                $items = [];
                $earliestStart = null;
                $furthestEnd = null;
                $grossSum = 0;

                if ($validPackagesList->isNotEmpty()) {
                    foreach ($validPackagesList as $pkg) {
                        $pkgType = \App\Services\PlanChainingService::normalizePackageType($pkg['package_type'] ?? 'Gym-Cardio');
                        $pkgPlanId = !empty($pkg['plan_id']) ? (int)str_replace('plan-', '', $pkg['plan_id']) : null;
                        $pkgPrice = (float)($pkg['price'] ?? 0);
                        $pkgDisc = (float)($pkg['discount'] ?? 0);
                        if ($pkgDisc === 0.0 && $unallocatedDiscount > 0) {
                            $pkgDisc = min($pkgPrice, $unallocatedDiscount);
                            $unallocatedDiscount = max(0, $unallocatedDiscount - $pkgDisc);
                        }
                        $rowNet = max(0, $pkgPrice - $pkgDisc);
                        $grossSum += $pkgPrice;

                        $rowStartDate = !empty($pkg['start_date']) ? \Illuminate\Support\Carbon::parse($pkg['start_date'])->toDateString() : $joinDate;
                        $rowEndDate = !empty($pkg['end_date']) ? \Illuminate\Support\Carbon::parse($pkg['end_date'])->toDateString() : $expiryDate;

                        if (!$earliestStart || $rowStartDate < $earliestStart) {
                            $earliestStart = $rowStartDate;
                        }
                        if (!$furthestEnd || $rowEndDate > $furthestEnd) {
                            $furthestEnd = $rowEndDate;
                        }

                        $items[] = [
                            'package_type' => $pkgType,
                            'packageType' => $pkgType,
                            'plan_id' => $pkgPlanId,
                            'name' => $pkg['name'] ?? ($pkgType . ' Package'),
                            'price' => $pkgPrice,
                            'discount' => $pkgDisc,
                            'net_amount' => $rowNet,
                            'start_date' => $rowStartDate,
                            'end_date' => $rowEndDate,
                            'trainer_id' => $pkg['trainer_id'] ?? null,
                            'pt_sessions' => (int)($pkg['pt_sessions'] ?? 0),
                        ];
                    }
                } else {
                    $singleType = $plan ? \App\Services\PlanChainingService::normalizePackageType($plan->package_type ?? 'Gym-Cardio') : 'Gym-Cardio';
                    $singlePrice = (float)($totalBill > 0 ? $totalBill : ($receivedAmount + $duesAmount));
                    $grossSum = $singlePrice;
                    $earliestStart = $joinDate;
                    $furthestEnd = $expiryDate;

                    $items[] = [
                        'package_type' => $singleType,
                        'packageType' => $singleType,
                        'plan_id' => $plan?->id,
                        'name' => $plan?->name ?? 'Membership',
                        'price' => $singlePrice,
                        'discount' => $topDiscount,
                        'net_amount' => max(0, $singlePrice - $topDiscount),
                        'start_date' => $joinDate,
                        'end_date' => $expiryDate,
                        'trainer_id' => $trainerId,
                        'pt_sessions' => 0,
                    ];
                }

                $invoiceNo = 'INV-' . strtoupper(substr(uniqid(), -6));
                $primaryInvoiceNo = $invoiceNo;
                $overallStartDate = $earliestStart ?: $joinDate;
                $overallEndDate = $furthestEnd ?: $expiryDate;
                $overallPackageType = $items[0]['package_type'] ?? 'Gym-Cardio';
                $overallPlanId = $items[0]['plan_id'] ?? $plan?->id;

                $computedGross = $grossSum;
                $computedNet = (float)($totalBill > 0 ? $totalBill : max(0, $computedGross - $topDiscount));
                $invPaid = (float)$receivedAmount;
                $invDues = (float)$duesAmount;
                if ($invDues <= 0 && $computedNet > $invPaid) {
                    $invDues = max(0, $computedNet - $invPaid);
                }
                $invStatus = $invDues > 0 ? 'Pending' : 'Paid';

                $invoiceTitle = implode(' + ', array_column($items, 'name')) ?: ($plan?->name ?? 'New Member Registration');

                $invPayload = [
                    'gym_id' => $gymId,
                    'invoice_number' => $invoiceNo,
                    'user_id' => $user->id,
                    'plan_id' => $overallPlanId,
                    'package_type' => $overallPackageType,
                    'amount' => $invPaid,
                    'date' => now()->toDateString(),
                    'start_date' => $overallStartDate,
                    'end_date' => $overallEndDate,
                    'due_date' => $parsedDueDate,
                    'payment_method' => $paymentMethod,
                    'status' => $invStatus,
                    'invoice_url' => '#',
                    'created_by' => $creatorId,
                    'created_by_name' => $creatorName,
                ];
                if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'items')) {
                    $invPayload['items'] = $items;
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'total_amount')) {
                    $invPayload['total_amount'] = $computedNet;
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('invoices', 'pending_amount')) {
                    $invPayload['pending_amount'] = $invDues;
                }

                $primaryInvoice = Invoice::create($invPayload);

                if ($invPaid > 0) {
                    RevenueBilling::create([
                        'gym_id' => $gymId,
                        'type' => 'inflow',
                        'reference_no' => $invoiceNo,
                        'user_id' => $user->id,
                        'member_name' => $user->name,
                        'plan_id' => $overallPlanId,
                        'plan_name' => $invoiceTitle,
                        'title' => $invoiceTitle . ($invDues > 0 ? " (Pending Balance Due: ₹" . number_format($invDues) . ")" : ""),
                        'category' => (count($items) === 1 && $overallPackageType === 'Personal Training') ? 'Personal Training' : 'Membership Fee',
                        'vendor' => null,
                        'amount' => $invPaid,
                        'date' => now()->toDateString(),
                        'payment_method' => $paymentMethod,
                        'status' => $invStatus,
                        'notes' => $invDues > 0 ? "Initial payment of ₹{$invPaid} received. Balance pending: ₹{$invDues}" : "Full payment received upon registration",
                        'created_by' => $creatorId,
                        'created_by_name' => $creatorName,
                    ]);
                }
            }

            // Sync member profile expiry date and status with uncancelled invoices
            \App\Services\PlanChainingService::syncMemberProfileExpiry($user->id);
            $profile->refresh();

            // If member registered with PT, automatically allocate and store PT session in database
            $ptPackages = $validPackagesList->filter(function ($p) {
                $t = \App\Services\PlanChainingService::normalizePackageType($p['package_type'] ?? '');
                return $t === 'Personal Training';
            });
            if ($ptPackages->isNotEmpty()) {
                foreach ($ptPackages as $ptPkg) {
                    $sessions = !empty($ptPkg['pt_sessions']) ? (int)$ptPkg['pt_sessions'] : 12;
                    $ptTrainerId = !empty($ptPkg['trainer_id']) ? (int)str_replace('trn-', '', $ptPkg['trainer_id']) : $trainerId;
                    $trainerUser = $ptTrainerId ? User::find($ptTrainerId) : null;
                    $trainerName = $trainerUser?->name ?? $request->input('trainer_name', $request->input('trainerName', 'PT Coach'));
                    $ptStartDate = !empty($ptPkg['start_date']) ? \Illuminate\Support\Carbon::parse($ptPkg['start_date'])->toDateString() : now()->toDateString();
                    $ptOtp = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

                    PtSession::create([
                        'gym_id' => $gymId,
                        'member_id' => $user->id,
                        'member_name' => $user->name,
                        'member_avatar' => $user->avatar,
                        'trainer_id' => $ptTrainerId,
                        'trainer_name' => $trainerName,
                        'plan_name' => $ptPkg['name'] ?? "{$sessions} 1-on-1 PT Sessions",
                        'total_sessions' => $sessions,
                        'completed_sessions' => 0,
                        'remaining_sessions' => $sessions,
                        'client_otp' => $ptOtp,
                        'status' => 'Active',
                        'start_date' => $ptStartDate,
                    ]);
                }
            } else {
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
            }

            // If an enquiry ID is linked, delete it so it is removed from the enquiries page and database
            $enquiryId = $request->input('enquiry_id', $request->input('enquiryId'));
            if ($enquiryId) {
                $cleanEnqId = (int)str_replace('enq-', '', $enquiryId);
                Enquiry::where('id', $cleanEnqId)->delete();
            }

            return [$user, $profile, $qrCode, $primaryInvoiceNo, $primaryInvoice];
        });

        // 4. Automatically register new member into eSSL Biometric Terminal over LAN
        $deviceSyncResult = $this->syncMemberToEsslDevice($user, $profile, 'push');

        // Automatically dispatch WhatsApp Welcome Notification to the new member
        $whatsappResult = null;
        try {
            $whatsappResult = \App\Services\WhatsAppNotificationService::sendWelcomeMessage($user, $profile, $gymId);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Auto WhatsApp welcome notification failed for user {$user->id}: " . $e->getMessage());
        }

        $formattedInvoice = $primaryInvoice ? \App\Http\Controllers\Api\InvoiceController::formatInvoiceRecord($primaryInvoice, $creatorName) : null;

        return response()->json([
            'success' => true,
            'message' => 'Member registered successfully',
            'invoice' => $formattedInvoice,
            'invoiceNumber' => $primaryInvoiceNo,
            'data' => [
                'id' => 'mem-' . $user->id,
                'userId' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'biometricUserId' => $profile->biometric_user_id,
                'planId' => $plan ? 'plan-' . $plan->id : null,
                'planName' => $plan?->name ?? 'Unassigned',
                'status' => $profile->status,
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
                'executive' => $profile->executive ?? '',
                'trainingType' => $profile->training_type ?? 'self',
                'kycDocType' => $profile->kyc_doc_type ?? 'Aadhaar Card',
                'kycDocNumber' => $profile->kyc_doc_number ?? '',
                'kycStatus' => $profile->kyc_status ?? 'Verified',
                'trainerId' => $trainerId ? 'trn-' . $trainerId : null,
                'trainerName' => $profile->trainer?->name ?? 'None / Self Guided',
                'duesAmount' => (float)$duesAmount,
                'dueDate' => $parsedDueDate,
                'paidAmount' => (float)$receivedAmount,
                'totalAmount' => (float)$totalBill,
                'paymentMethod' => $request->input('payment_method', $request->input('paymentMethod', 'UPI')),
                'qrPassCode' => $qrCode,
                'invoice' => $formattedInvoice,
                'invoiceNumber' => $primaryInvoiceNo,
                'invoice_number' => $primaryInvoiceNo,
                'createdBy' => $creatorId,
                'created_by' => $creatorId,
                'createdByName' => $creatorName,
                'created_by_name' => $creatorName,
                'executive' => $creatorName,
                'avatar' => $user->avatar,
                'device_sync' => $deviceSyncResult,
                'whatsapp_welcome' => $whatsappResult,
            ],
        ], 201);
    }


    public function update(Request $request, $id)
    {
        $numericId = str_replace('mem-', '', $id);
        $user = User::where('role', 'member')->findOrFail($numericId);
        $profile = MemberProfile::firstOrCreate(['user_id' => $user->id]);

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
            'emergency_contact' => [
                'nullable',
                'string',
                'regex:/^(\+?[0-9\s()-]{7,20})$/',
                function ($attribute, $value, $fail) {
                    if (empty(trim($value))) return;
                    $digits = preg_replace('/\D+/', '', $value);
                    if (str_starts_with(trim($value), '+')) {
                        if (strlen($digits) < 7 || strlen($digits) > 15) {
                            $fail('Emergency contact must contain between 7 and 15 digits.');
                        }
                    } else {
                        if (strlen($digits) !== 10) {
                            $fail('Emergency contact must be a valid 10-digit mobile number.');
                        }
                    }
                }
            ],
            'emergencyContact' => [
                'nullable',
                'string',
                'regex:/^(\+?[0-9\s()-]{7,20})$/',
                function ($attribute, $value, $fail) {
                    if (empty(trim($value))) return;
                    $digits = preg_replace('/\D+/', '', $value);
                    if (str_starts_with(trim($value), '+')) {
                        if (strlen($digits) < 7 || strlen($digits) > 15) {
                            $fail('Emergency contact must contain between 7 and 15 digits.');
                        }
                    } else {
                        if (strlen($digits) !== 10) {
                            $fail('Emergency contact must be a valid 10-digit mobile number.');
                        }
                    }
                }
            ],
            'dob' => 'nullable|date|before_or_equal:today',
            'date_of_birth' => 'nullable|date|before_or_equal:today',
            'birthdate' => 'nullable|date|before_or_equal:today',
            'DOB' => 'nullable|date|before_or_equal:today',
            'dues_amount' => 'nullable|numeric|min:0',
            'duesAmount' => 'nullable|numeric|min:0',
        ], [
            'name.min' => 'Name must be at least 2 characters.',
            'name.regex' => 'Name must only contain letters, spaces, hyphens, and apostrophes.',
            'phone.regex' => 'Please enter a valid mobile number with digits only.',
            'emergency_contact.regex' => 'Emergency contact must be a valid phone number with digits only.',
            'emergencyContact.regex' => 'Emergency contact must be a valid phone number with digits only.',
            'dob.before_or_equal' => 'Date of birth cannot be in the future.',
            'date_of_birth.before_or_equal' => 'Date of birth cannot be in the future.',
            'birthdate.before_or_equal' => 'Date of birth cannot be in the future.',
            'DOB.before_or_equal' => 'Date of birth cannot be in the future.',
            'dues_amount.min' => 'Dues amount cannot be negative.',
            'duesAmount.min' => 'Dues amount cannot be negative.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->has('name')) $user->name = $request->name;
        if ($request->has('email')) $user->email = !empty($request->email) ? trim($request->email) : null;
        if ($request->has('phone')) {
            $rawPhone = trim($request->phone ?? '');
            if (!empty($rawPhone)) {
                $cleanDigits = preg_replace('/\D+/', '', $rawPhone);
                $last10 = strlen($cleanDigits) >= 10 ? substr($cleanDigits, -10) : $cleanDigits;

                $duplicatePhone = User::where('role', 'member')
                    ->where('id', '!=', $user->id)
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
            $user->phone = $request->phone;
        }
        $oldBioId = (string)($profile->biometric_user_id ?: $user->id);
        DB::transaction(function () use ($request, $user, $profile) {
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
                $requestedStatus = $request->status;
                if (in_array($requestedStatus, ['Frozen', 'Frozen (Paused)', 'On Hold', 'Suspended', 'Cancelled'])) {
                    $profile->status = $requestedStatus;
                } else {
                    $profile->status = self::computeMemberStatus($profile->expiry_date, 'Active', $profile->join_date);
                }
            } else {
                if (!in_array($profile->status, ['Frozen', 'Frozen (Paused)', 'On Hold', 'Suspended', 'Cancelled'])) {
                    $profile->status = self::computeMemberStatus($profile->expiry_date, $profile->status, $profile->join_date);
                }
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
            if ($request->has('gender')) $profile->gender = $request->gender;
            if ($request->has('training_type') || $request->has('trainingType')) {
                $profile->training_type = $request->training_type ?? $request->trainingType;
            }
            if ($request->has('executive') || $request->has('staff_name') || $request->has('staffName')) {
                $profile->executive = $request->executive ?? $request->staff_name ?? $request->staffName;
            }
            if ($request->has('kyc_doc_type') || $request->has('kycDocType')) {
                $profile->kyc_doc_type = $request->kyc_doc_type ?? $request->kycDocType;
            }
            if ($request->has('kyc_doc_number') || $request->has('kycDocNumber')) {
                $profile->kyc_doc_number = $request->kyc_doc_number ?? $request->kycDocNumber;
                if ($profile->kyc_doc_type === 'Aadhaar Card') {
                    $user->aadhaar_card = $profile->kyc_doc_number;
                } elseif ($profile->kyc_doc_type === 'PAN Card') {
                    $user->pan_card = $profile->kyc_doc_number;
                }
                $user->save();
            }
            if ($request->has('kyc_status') || $request->has('kycStatus')) {
                $profile->kyc_status = $request->kyc_status ?? $request->kycStatus;
            }
            if ($request->has('phone')) {
                $profile->phone = $request->phone;
            }
            if ($request->has('qr_pass_code') || $request->has('qrPassCode')) {
                $profile->qr_pass_code = $request->qr_pass_code ?? $request->qrPassCode;
            }
            if ($request->has('dues_amount') || $request->has('duesAmount')) {
                $duesVal = (float)($request->dues_amount ?? $request->duesAmount);
                $profile->dues_amount = $duesVal;
                if ($duesVal <= 0) {
                    $profile->due_date = null;
                    Invoice::where('user_id', $user->id)
                        ->where('status', 'Pending')
                        ->update(['status' => 'Paid', 'pending_amount' => 0]);
                    RevenueBilling::where('user_id', $user->id)
                        ->where('status', 'Pending')
                        ->update(['status' => 'Paid']);
                } else {
                    Invoice::where('user_id', $user->id)
                        ->where('status', 'Pending')
                        ->update(['pending_amount' => $duesVal]);
                }
            }
            if ($request->has('biometric_user_id') || $request->has('biometricUserId')) {
                $rawBioId = $request->input('biometric_user_id', $request->input('biometricUserId'));
                $profile->biometric_user_id = !empty($rawBioId) ? trim((string)$rawBioId) : null;
            }
            if ($request->has('due_date') || $request->has('dueDate')) {
                $rawUpDueDate = $request->due_date ?? $request->dueDate;
                $newDueDate = $rawUpDueDate ? \Illuminate\Support\Carbon::parse($rawUpDueDate)->toDateString() : null;
                if ($profile->dues_amount > 0 && $newDueDate) {
                    $checkStart = $profile->join_date ? ($profile->join_date instanceof \DateTimeInterface ? $profile->join_date->format('Y-m-d') : substr((string)$profile->join_date, 0, 10)) : null;
                    $checkExpiry = $profile->expiry_date ? ($profile->expiry_date instanceof \DateTimeInterface ? $profile->expiry_date->format('Y-m-d') : substr((string)$profile->expiry_date, 0, 10)) : null;
                    $upDueError = self::validatePromiseDate($newDueDate, $checkStart, $checkExpiry);
                    if ($upDueError) {
                        return response()->json([
                            'success' => false,
                            'message' => $upDueError,
                            'errors' => ['due_date' => [$upDueError]]
                        ], 422);
                    }
                }
                $profile->due_date = $newDueDate;
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
        });

        $user->update(['synced_to_device' => 0]);
        $profile->update(['synced_to_device' => 0]);

        // Synchronize member update with eSSL Biometric Terminal over LAN
        $deviceSyncResult = $this->syncMemberToEsslDevice($user, $profile, 'push', $oldBioId ?? null);

        $responseData = $this->show('mem-' . $user->id)->original['data'];
        $responseData['device_sync'] = $deviceSyncResult;

        return response()->json([
            'success' => true,
            'message' => 'Member updated successfully',
            'data' => $responseData,
        ]);
    }

    public function destroy($id)
    {
        $numericId = str_replace('mem-', '', $id);
        $user = User::where('role', 'member')->findOrFail($numericId);
        $profile = MemberProfile::where('user_id', $user->id)->first();

        $bioId = (string)($profile?->biometric_user_id ?: $user->biometric_user_id ?: $user->id);
        if (\Illuminate\Support\Facades\Schema::hasTable('biometric_deletions')) {
            \Illuminate\Support\Facades\DB::table('biometric_deletions')->insert([
                'biometric_user_id' => $bioId,
                'user_name' => $user->name,
                'gym_id' => $user->gym_id,
                'created_at' => now(),
            ]);
        }

        // Automatically delete member from eSSL Biometric Terminal over LAN
        $deviceSyncResult = $this->syncMemberToEsslDevice($user, $profile, 'delete');

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Member removed successfully from system and biometric machine',
            'device_sync' => $deviceSyncResult
        ]);
    }

    /**
     * Synchronize gym member registration, update, or deletion with eSSL Biometric Terminal over LAN.
     */
    protected function syncMemberToEsslDevice(User $user, ?MemberProfile $profile, string $action = 'push', ?string $oldBioId = null): ?array
    {
        $syncService = app(\App\Services\EsslDeviceSyncService::class);
        if ($action === 'delete') {
            return $syncService->deleteUser($user, $profile?->biometric_user_id);
        }

        return $syncService->pushUser($user, $oldBioId);
    }
}
