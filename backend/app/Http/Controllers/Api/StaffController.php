<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TrainerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use App\Services\IdentityValidationService;

class StaffController extends Controller
{
    /**
     * List all staff accounts (superadmin, manager, accounts, trainer)
     * Excludes plain members from this view.
     */
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $selectCols = [
            'id', 'name', 'email', 'role', 'phone', 'avatar', 'gym_id',
            'must_change_password', 'created_at',
            'dob', 'joining_date', 'aadhaar_card', 'aadhaar_image', 'pan_card', 'pan_image', 'salary', 'shifts',
            'biometric_user_id', 'synced_to_device'
        ];
        // Filter only columns that actually exist in the table to be 100% safe
        $selectCols = array_filter($selectCols, fn($c) => Schema::hasColumn('users', $c));

        $relations = ['trainerProfile.assignedMembers.user', 'trainerProfile.assignedMembers.plan'];
        $hasGymRolesTable = false;
        try {
            $hasGymRolesTable = Schema::hasTable('gym_roles');
        } catch (\Throwable $e) {}

        if ($hasGymRolesTable) {
            $relations[] = 'gymRole';
        }

        $query = User::whereNotIn('role', ['owner', 'superadmin', 'member'])
            ->with($relations);

        if ($gymId && $gymId > 0) {
            $query->where('gym_id', $gymId);
        }

        $staff = $query->orderBy('name')
            ->get($selectCols);

        // Staff records with masked passwords
        $data = $staff->map(function ($u) use ($hasGymRolesTable) {
            $arr = $u->toArray();
            $arr['plain_password'] = '••••••••';
            $arr['password'] = '••••••••';
            $arr['biometric_user_id'] = $u->biometric_user_id ?: (string)$u->id;
            $arr['biometricUserId'] = $u->biometric_user_id ?: (string)$u->id;
            $arr['synced_to_device'] = (bool)$u->synced_to_device;
            $gymRole = ($hasGymRolesTable && $u->relationLoaded('gymRole')) ? $u->gymRole : null;
            $arr['role_label'] = $gymRole ? $gymRole->name : ucfirst($u->role);
            $arr['role_color'] = $gymRole ? $gymRole->color : 'indigo';
            $arr['assigned_pages'] = $gymRole ? ($gymRole->assigned_pages ?? []) : [];

            // Include Trainer Profile details if staff role is trainer or has profile
            if ($u->role === 'trainer' || $u->trainerProfile) {
                $profile = $u->trainerProfile;
                if (!$profile && $u->role === 'trainer') {
                    $profile = TrainerProfile::firstOrCreate(
                        ['user_id' => $u->id],
                        [
                            'specialty' => '',
                            'experience' => '',
                            'rating' => 5.0,
                            'monthly_salary' => $u->salary ?? 0,
                            'bio' => '',
                            'certifications' => []
                        ]
                    );
                }

                $assignedMembers = [];
                if ($profile && $profile->assignedMembers) {
                    $assignedMembers = $profile->assignedMembers->map(function ($m) {
                        return [
                            'id' => 'mem-' . $m->user_id,
                            'numericId' => $m->user_id,
                            'name' => $m->user?->name ?? 'Gym Member',
                            'email' => $m->user?->email ?? '',
                            'phone' => $m->user?->phone ?? '',
                            'goal' => $m->goal ?? 'General Fitness',
                            'status' => $m->status ?? 'active',
                            'planName' => $m->plan?->name ?? 'PT Subscription'
                        ];
                    })->values()->all();
                }

                $arr['specialty'] = $profile?->specialty ?? 'Strength & Conditioning';
                $arr['experience'] = $profile?->experience ?? '2+ Years';
                $arr['rating'] = $profile?->rating ?? 5.0;
                $arr['bio'] = $profile?->bio ?? 'Dedicated fitness mentor guiding members toward strength, conditioning, and sustainable health.';
                $arr['certifications'] = $profile?->certifications ?? ['NASM-CPT', 'CSCS'];
                $arr['age'] = $profile?->age;
                $arr['gender'] = $profile?->gender;
                $arr['blood_group'] = $profile?->blood_group;
                $arr['address'] = $profile?->address;
                $arr['monthlySalary'] = $profile?->monthly_salary ?? $u->salary ?? 0;
                $arr['monthly_salary'] = $profile?->monthly_salary ?? $u->salary ?? 0;
                if (empty($arr['salary']) && $profile?->monthly_salary) {
                    $arr['salary'] = $profile->monthly_salary;
                }

                $arr['assigned_members'] = $assignedMembers;
                $arr['assignedMembers'] = $assignedMembers;
                $arr['activeClientsCount'] = count($assignedMembers);
                $arr['assigned_clients_count'] = count($assignedMembers);
            }

            return $arr;
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Create a new staff account (superadmin provisions manager / accounts / trainer)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\p{N}\s\'.\-]+$/u'],
            'phone'          => [
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
            'email'          => 'nullable|email',
            'password'       => 'required|string|min:4',
            'role'           => 'required|string|max:50',
            'gym_id'         => 'nullable|integer',
            'avatar'         => 'nullable|string',
            'dob'            => 'nullable|date|before_or_equal:' . now()->subYears(15)->format('Y-m-d'),
            'joining_date'   => 'nullable|date',
            'aadhaar_card'   => 'nullable|string|max:50',
            'aadhaar_image'  => 'nullable|string',
            'pan_card'       => 'nullable|string|max:50',
            'pan_image'      => 'nullable|string',
            'salary'         => 'nullable|numeric',
            'shifts'         => 'nullable|string|max:100',
            'specialty'      => 'nullable|string|max:255',
            'experience'     => 'nullable|string|max:100',
            'bio'            => 'nullable|string',
            'certifications' => 'nullable',
            'rating'         => 'nullable|numeric',
            'age'            => 'nullable|integer',
            'gender'         => 'nullable|string|max:20',
            'blood_group'    => 'nullable|string|max:10',
            'bloodGroup'     => 'nullable|string|max:10',
            'address'        => 'nullable|string',
            'biometric_user_id' => 'nullable|string|max:50',
            'biometricUserId'   => 'nullable|string|max:50',
        ], [
            'name.required' => 'Staff full name is required.',
            'name.min' => 'Name must be at least 2 characters.',
            'name.regex' => 'Name must only contain letters, numbers, spaces, hyphens, and apostrophes.',
            'phone.required' => 'Mobile number is mandatory to register staff.',
            'phone.min' => 'Please enter a valid mobile number.',
            'phone.regex' => 'Please enter a valid mobile number with digits only.',
            'dob.before_or_equal' => 'Staff member date of birth cannot be less than 15 years (must be at least 15 years old).',
        ]);

        $gymId = $validated['gym_id'] ?? $this->resolveGymId($request);
        if (!$gymId) {
            $firstGym = \App\Models\Gym::first();
            $gymId = $firstGym ? $firstGym->id : 1;
        }

        $userData = [
            'name'                 => $validated['name'],
            'email'                => !empty($validated['email']) ? trim($validated['email']) : null,
            'password'             => Hash::make($validated['password']),
            'role'                 => $validated['role'],
            'phone'                => $validated['phone'],
            'gym_id'               => $gymId,
            'avatar'               => $request->avatar ?? null,
            'dob'                  => $validated['dob'] ?? null,
            'joining_date'         => $validated['joining_date'] ?? null,
            'aadhaar_card'         => $validated['aadhaar_card'] ?? null,
            'aadhaar_image'        => $validated['aadhaar_image'] ?? null,
            'pan_card'             => $validated['pan_card'] ?? null,
            'pan_image'            => $validated['pan_image'] ?? null,
            'salary'               => $validated['salary'] ?? null,
            'shifts'               => $validated['shifts'] ?? null,
            'must_change_password' => false,
            'biometric_user_id'    => $request->input('biometric_user_id', $request->input('biometricUserId')),
        ];

        // System-wide unique Aadhaar & PAN validation across all roles (member, staff, trainer, etc.)
        if (!empty($validated['aadhaar_card'])) {
            $conflict = IdentityValidationService::findAadhaarConflict($validated['aadhaar_card']);
            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => "This Aadhaar number is already registered to another person ({$conflict['name']} - {$conflict['role']}).",
                    'errors' => [
                        'aadhaar_card' => ["This Aadhaar number is already registered to another person ({$conflict['name']})."]
                    ]
                ], 422);
            }
        }

        if (!empty($validated['pan_card'])) {
            $conflict = IdentityValidationService::findPanConflict($validated['pan_card']);
            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => "This PAN number is already registered to another person ({$conflict['name']} - {$conflict['role']}).",
                    'errors' => [
                        'pan_card' => ["This PAN number is already registered to another person ({$conflict['name']})."]
                    ]
                ], 422);
            }
        }

        // Check if user already exists with this phone or email
        $rawPhone = trim($validated['phone'] ?? '');
        $cleanDigits = preg_replace('/\D+/', '', $rawPhone);
        $last10 = strlen($cleanDigits) >= 10 ? substr($cleanDigits, -10) : $cleanDigits;

        $existingUser = User::where(function ($q) use ($rawPhone, $cleanDigits, $last10, $validated) {
            $q->where('phone', $rawPhone);
            if (!empty($cleanDigits)) {
                $q->orWhere('phone', $cleanDigits);
            }
            if (strlen($last10) >= 7) {
                $q->orWhere('phone', 'like', "%{$last10}");
            }
            if (!empty($validated['email'])) {
                $q->orWhere('email', trim($validated['email']));
            }
        })->first();

        if ($existingUser) {
            // Guard: Never overwrite an owner or superadmin account when registering staff
            if (in_array($existingUser->role, ['owner', 'superadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'The mobile number or email belongs to a gym owner or administrator account. Please use a unique phone and email for staff.'
                ], 422);
            }

            // Do not wipe existing email if staff form didn't specify one
            if (empty($validated['email']) && !empty($existingUser->email)) {
                unset($userData['email']);
            }

            $existingUser->update($userData);
            $user = $existingUser;
        } else {
            $user = User::create($userData);
        }

        if (empty($user->biometric_user_id)) {
            $user->update(['biometric_user_id' => (string)$user->id]);
        }

        $responseData = $user->toArray();
        $responseData['password'] = $validated['password'];
        $responseData['plain_password'] = $validated['password'];
        $responseData['biometric_user_id'] = $user->biometric_user_id;
        $responseData['biometricUserId'] = $user->biometric_user_id;
        $responseData['synced_to_device'] = (bool)$user->synced_to_device;

        // If creating a trainer account, create corresponding TrainerProfile
        if ($validated['role'] === 'trainer') {
            $certifications = $request->certifications;
            if (is_string($certifications)) {
                $certifications = array_values(array_filter(array_map('trim', explode(',', $certifications))));
            } elseif (!is_array($certifications)) {
                $certifications = [];
            }

            $profile = TrainerProfile::create([
                'user_id'        => $user->id,
                'specialty'      => $request->specialty ?? '',
                'experience'     => $request->experience ?? '',
                'rating'         => $request->rating ?? 5.0,
                'monthly_salary' => $validated['salary'] ?? $request->monthly_salary ?? $user->salary ?? 0,
                'bio'            => $request->bio ?? '',
                'certifications' => $certifications,
                'age'            => $request->age ?? null,
                'dob'            => $validated['dob'] ?? null,
                'gender'         => $request->gender ?? null,
                'blood_group'    => $request->blood_group ?? $request->bloodGroup ?? null,
                'address'        => $request->address ?? null,
            ]);

            $responseData['specialty'] = $profile->specialty;
            $responseData['experience'] = $profile->experience;
            $responseData['rating'] = $profile->rating;
            $responseData['bio'] = $profile->bio;
            $responseData['certifications'] = $profile->certifications;
            $responseData['monthlySalary'] = $profile->monthly_salary;
            $responseData['monthly_salary'] = $profile->monthly_salary;
            $responseData['assigned_members'] = [];
            $responseData['assignedMembers'] = [];
            $responseData['assigned_clients_count'] = 0;
            $responseData['activeClientsCount'] = 0;
        }

        $user->update(['synced_to_device' => 0]);

        // Automatically register staff into eSSL Biometric Terminal over LAN
        $deviceSyncResult = app(\App\Services\EsslDeviceSyncService::class)->pushUser($user);
        $responseData['device_sync'] = $deviceSyncResult;

        return response()->json([
            'success' => true,
            'message' => "Staff account created for {$user->name} as {$user->role}.",
            'data'    => $responseData,
        ], 201);
    }

    /**
     * Update a staff account
     */
    public function update(Request $request, int $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Staff user not found.'], 404);
        }

        $validated = $request->validate([
            'name'           => ['sometimes', 'required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\p{N}\s\'.\-]+$/u'],
            'email'          => 'nullable|email',
            'phone'          => [
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
            'role'           => 'sometimes|string|max:50',
            'password'       => 'nullable|string|min:4',
            'dob'            => 'nullable|date|before_or_equal:' . now()->subYears(15)->format('Y-m-d'),
            'joining_date'   => 'nullable|date',
            'aadhaar_card'   => 'nullable|string|max:50',
            'aadhaar_image'  => 'nullable|string',
            'pan_card'       => 'nullable|string|max:50',
            'pan_image'      => 'nullable|string',
            'salary'         => 'nullable|numeric',
            'shifts'         => 'nullable|string|max:100',
            'specialty'      => 'nullable|string|max:255',
            'experience'     => 'nullable|string|max:100',
            'bio'            => 'nullable|string',
            'certifications' => 'nullable',
            'rating'         => 'nullable|numeric',
            'age'            => 'nullable|integer',
            'gender'         => 'nullable|string|max:20',
            'blood_group'    => 'nullable|string|max:10',
            'bloodGroup'     => 'nullable|string|max:10',
            'address'        => 'nullable|string',
        ], [
            'name.min' => 'Name must be at least 2 characters.',
            'name.regex' => 'Name must only contain letters, numbers, spaces, hyphens, and apostrophes.',
            'phone.required' => 'Mobile number is mandatory.',
            'phone.regex' => 'Please enter a valid mobile number with digits only.',
            'dob.before_or_equal' => 'Staff member date of birth cannot be less than 15 years (must be at least 15 years old).',
        ]);

        // Guard against duplicate phone/email collision with owner or superadmin
        if (!empty($validated['phone']) || !empty($validated['email'])) {
            $conflictUser = User::where('id', '!=', $user->id)
                ->where(function ($q) use ($validated) {
                    if (!empty($validated['phone'])) {
                        $q->where('phone', $validated['phone']);
                    }
                    if (!empty($validated['email'])) {
                        $q->orWhere('email', trim($validated['email']));
                    }
                })
                ->first();
            if ($conflictUser && in_array($conflictUser->role, ['owner', 'superadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'The mobile number or email belongs to a gym owner or administrator account.'
                ], 422);
            }
        }

        // System-wide unique Aadhaar & PAN validation across all roles (member, staff, trainer, etc.)
        if (array_key_exists('aadhaar_card', $validated) && !empty($validated['aadhaar_card'])) {
            $conflict = IdentityValidationService::findAadhaarConflict($validated['aadhaar_card'], $user->id);
            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => "This Aadhaar number is already registered to another person ({$conflict['name']} - {$conflict['role']}).",
                    'errors' => [
                        'aadhaar_card' => ["This Aadhaar number is already registered to another person ({$conflict['name']})."]
                    ]
                ], 422);
            }
        }

        if (array_key_exists('pan_card', $validated) && !empty($validated['pan_card'])) {
            $conflict = IdentityValidationService::findPanConflict($validated['pan_card'], $user->id);
            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => "This PAN number is already registered to another person ({$conflict['name']} - {$conflict['role']}).",
                    'errors' => [
                        'pan_card' => ["This PAN number is already registered to another person ({$conflict['name']})."]
                    ]
                ], 422);
            }
        }

        $oldBioId = (string)($user->biometric_user_id ?: $user->id);

        if (isset($validated['name']))  $user->name  = $validated['name'];
        if (array_key_exists('email', $validated)) $user->email = !empty($validated['email']) ? $validated['email'] : null;
        if (isset($validated['phone'])) $user->phone = $validated['phone'];
        if (isset($validated['role']))  $user->role  = $validated['role'];
        if (array_key_exists('dob', $validated)) $user->dob = $validated['dob'];
        if (array_key_exists('joining_date', $validated)) $user->joining_date = $validated['joining_date'];
        if (array_key_exists('aadhaar_card', $validated)) $user->aadhaar_card = $validated['aadhaar_card'];
        if (array_key_exists('aadhaar_image', $validated)) $user->aadhaar_image = $validated['aadhaar_image'];
        if (array_key_exists('pan_card', $validated)) $user->pan_card = $validated['pan_card'];
        if (array_key_exists('pan_image', $validated)) $user->pan_image = $validated['pan_image'];
        if (array_key_exists('salary', $validated)) $user->salary = $validated['salary'];
        if (array_key_exists('shifts', $validated)) $user->shifts = $validated['shifts'];

        $bioIdInput = $request->input('biometric_user_id', $request->input('biometricUserId'));
        if (!empty($bioIdInput)) {
            $existingWithBio = User::where('biometric_user_id', (string)$bioIdInput)->where('id', '!=', $user->id)->first();
            if ($existingWithBio) {
                return response()->json([
                    'success' => false,
                    'message' => "Biometric PIN {$bioIdInput} is already assigned to {$existingWithBio->name}."
                ], 422);
            }
            $user->biometric_user_id = (string)$bioIdInput;
        }

        // Update password if provided
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        $responseData = $user->toArray();
        $responseData['plain_password'] = '••••••••';
        $responseData['password'] = '••••••••';
        $responseData['biometric_user_id'] = $user->biometric_user_id ?: (string)$user->id;
        $responseData['biometricUserId'] = $user->biometric_user_id ?: (string)$user->id;
        $responseData['synced_to_device'] = (bool)$user->synced_to_device;

        // If user is a trainer or trainer fields provided, update / create TrainerProfile
        if ($user->role === 'trainer' || ($validated['role'] ?? '') === 'trainer' || $request->has('specialty')) {
            $profile = TrainerProfile::firstOrCreate(['user_id' => $user->id]);
            if ($request->has('specialty')) $profile->specialty = $request->specialty;
            if ($request->has('experience')) $profile->experience = $request->experience;
            if ($request->has('bio')) $profile->bio = $request->bio;
            if ($request->has('certifications')) {
                $certs = $request->certifications;
                if (is_string($certs)) {
                    $certs = array_values(array_filter(array_map('trim', explode(',', $certs))));
                } elseif (!is_array($certs)) {
                    $certs = [];
                }
                $profile->certifications = $certs;
            }
            if ($request->has('salary') || $request->has('monthly_salary')) {
                $sal = $request->input('monthly_salary', $request->input('salary'));
                if ($sal !== null && $sal !== '') {
                    $profile->monthly_salary = (float)$sal;
                }
            }
            if ($profile->monthly_salary === null) {
                $profile->monthly_salary = $user->salary ?? 0;
            }
            if ($profile->rating === null) {
                $profile->rating = 5.0;
            }
            if ($request->has('age')) $profile->age = $request->age ? (int)$request->age : null;
            if ($request->has('gender')) $profile->gender = $request->gender;
            if ($request->has('blood_group') || $request->has('bloodGroup')) {
                $profile->blood_group = $request->blood_group ?? $request->bloodGroup;
            }
            if ($request->has('address')) $profile->address = $request->address;
            if (isset($validated['dob'])) $profile->dob = $validated['dob'];
            $profile->save();

            $responseData['specialty'] = $profile->specialty;
            $responseData['experience'] = $profile->experience;
            $responseData['rating'] = $profile->rating;
            $responseData['bio'] = $profile->bio;
            $responseData['certifications'] = $profile->certifications;
            $responseData['monthlySalary'] = $profile->monthly_salary;
            $responseData['monthly_salary'] = $profile->monthly_salary;
        }

        $user->update(['synced_to_device' => 0]);

        // Synchronize updated staff details with eSSL Biometric Terminal over LAN
        $deviceSyncResult = app(\App\Services\EsslDeviceSyncService::class)->pushUser($user, $oldBioId);
        $responseData['device_sync'] = $deviceSyncResult;

        return response()->json([
            'success' => true,
            'message' => "Staff account for {$user->name} updated successfully.",
            'data'    => $responseData,
        ]);
    }

    /**
     * Delete a staff account
     */
    public function destroy(int $id)
    {
        $user = User::find($id);

        if (!$user) {
            // Already deleted or mock user ID
            return response()->json(['success' => true, 'message' => "Staff account removed."]);
        }

        // Protect superadmin and owner accounts from deletion
        if (in_array($user->role, ['superadmin', 'owner'])) {
            return response()->json(['success' => false, 'message' => 'Cannot delete superadmin or owner account.'], 403);
        }

        $bioId = (string)($user->biometric_user_id ?: $user->id);
        if (\Illuminate\Support\Facades\Schema::hasTable('biometric_deletions')) {
            \Illuminate\Support\Facades\DB::table('biometric_deletions')->insert([
                'biometric_user_id' => $bioId,
                'user_name' => $user->name,
                'gym_id' => $user->gym_id,
                'created_at' => now(),
            ]);
        }

        // Synchronize deletion with physical eSSL Biometric Terminal over LAN
        $deviceSyncResult = app(\App\Services\EsslDeviceSyncService::class)->deleteUser($user);

        if ($user->role === 'trainer') {
            TrainerProfile::where('user_id', $user->id)->delete();
        }

        $userName = $user->name;
        $user->delete();

        return response()->json([
            'success'     => true,
            'message'     => "Staff account for {$userName} deleted from system and biometric machine.",
            'device_sync' => $deviceSyncResult
        ]);
    }

    }
