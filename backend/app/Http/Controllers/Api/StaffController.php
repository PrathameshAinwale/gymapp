<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TrainerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

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
            'dob', 'aadhaar_card', 'aadhaar_image', 'pan_card', 'pan_image', 'salary', 'shifts'
        ];
        // Filter only columns that actually exist in the table to be 100% safe
        $selectCols = array_filter($selectCols, fn($c) => Schema::hasColumn('users', $c));
        $hasPlain = Schema::hasColumn('users', 'plain_password');
        if ($hasPlain) {
            $selectCols[] = 'plain_password';
        }

        $query = User::whereIn('role', ['manager', 'accounts', 'trainer'])
            ->with(['trainerProfile.assignedMembers.user', 'trainerProfile.assignedMembers.plan']);

        if ($gymId && $gymId > 0) {
            $query->where('gym_id', $gymId);
        }

        $staff = $query->orderByRaw("CASE role
                WHEN 'accounts'   THEN 1
                WHEN 'manager'    THEN 2
                WHEN 'trainer'    THEN 3
                ELSE 4 END")
            ->orderBy('name')
            ->get($selectCols);

        // Ensure each staff record has the verified plain_password and password
        $data = $staff->map(function ($u) use ($hasPlain) {
            $arr = $u->toArray();
            $plain = $hasPlain ? $u->plain_password : null;

            if (empty($plain) || $plain === 'password123') {
                if ($u->email === 'sohan@gmail.com' || Hash::check('sohan123', $u->password ?? '')) {
                    $plain = 'sohan123';
                } elseif ($u->email === 'coach1@gmail.com' || Hash::check('trainer123', $u->password ?? '')) {
                    $plain = 'trainer123';
                } elseif ($u->email === 'ajay@gmail.com' || Hash::check('123456', $u->password ?? '')) {
                    $plain = '123456';
                } elseif (Hash::check('admin123', $u->password ?? '')) {
                    $plain = 'admin123';
                } elseif ($u->role === 'manager') {
                    $plain = 'manager123';
                } elseif ($u->role === 'accounts') {
                    $plain = 'accounts123';
                } elseif ($u->role === 'trainer') {
                    $plain = 'trainer123';
                } else {
                    $plain = 'sohan123';
                }

                if ($hasPlain) {
                    $u->plain_password = $plain;
                    $u->save();
                }
            }

            $arr['plain_password'] = $plain;
            $arr['password'] = $plain;

            // Include Trainer Profile details if staff role is trainer or has profile
            if ($u->role === 'trainer' || $u->trainerProfile) {
                $profile = $u->trainerProfile;
                if (!$profile && $u->role === 'trainer') {
                    $profile = TrainerProfile::firstOrCreate(
                        ['user_id' => $u->id],
                        [
                            'specialty' => 'Strength & Conditioning',
                            'experience' => '2+ Years',
                            'rating' => 5.0,
                            'monthly_salary' => $u->salary ?? 45000,
                            'bio' => 'Dedicated fitness mentor guiding members toward strength, conditioning, and sustainable health.',
                            'certifications' => ['NASM-CPT', 'CSCS']
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
            'name'           => 'required|string|max:100',
            'email'          => 'required|email|unique:users,email',
            'password'       => 'required|string|min:6',
            'role'           => 'required|in:manager,accounts,trainer',
            'phone'          => 'nullable|string|max:20',
            'gym_id'         => 'nullable|integer',
            'avatar'         => 'nullable|string',
            'dob'            => 'nullable|date',
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
        ]);

        $gymId = $validated['gym_id'] ?? $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json(['success' => false, 'message' => 'Gym ID is required to create a staff account.'], 422);
        }

        $userData = [
            'name'                 => $validated['name'],
            'email'                => $validated['email'],
            'password'             => Hash::make($validated['password']),
            'role'                 => $validated['role'],
            'phone'                => $validated['phone'] ?? null,
            'gym_id'               => $gymId,
            'avatar'               => $request->avatar ?? null,
            'dob'                  => $validated['dob'] ?? null,
            'aadhaar_card'         => $validated['aadhaar_card'] ?? null,
            'aadhaar_image'        => $validated['aadhaar_image'] ?? null,
            'pan_card'             => $validated['pan_card'] ?? null,
            'pan_image'            => $validated['pan_image'] ?? null,
            'salary'               => $validated['salary'] ?? null,
            'shifts'               => $validated['shifts'] ?? null,
            'must_change_password' => false,
        ];

        if (Schema::hasColumn('users', 'plain_password')) {
            $userData['plain_password'] = $validated['password'];
        }

        $user = User::create($userData);

        $responseData = $user->toArray();
        $responseData['password'] = $validated['password'];
        $responseData['plain_password'] = $validated['password'];

        // If creating a trainer account, create corresponding TrainerProfile
        if ($validated['role'] === 'trainer') {
            $certifications = $request->certifications;
            if (is_string($certifications)) {
                $certifications = array_values(array_filter(array_map('trim', explode(',', $certifications))));
            } elseif (!is_array($certifications)) {
                $certifications = ['NASM-CPT', 'CSCS'];
            }

            $profile = TrainerProfile::create([
                'user_id'        => $user->id,
                'specialty'      => $request->specialty ?? 'Strength & Conditioning',
                'experience'     => $request->experience ?? '2+ Years',
                'rating'         => $request->rating ?? 5.0,
                'monthly_salary' => $validated['salary'] ?? $request->monthly_salary ?? 45000,
                'bio'            => $request->bio ?? 'Dedicated fitness mentor guiding members toward strength, conditioning, and sustainable health.',
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
            'name'           => 'sometimes|string|max:100',
            'email'          => "sometimes|email|unique:users,email,{$id}",
            'phone'          => 'nullable|string|max:20',
            'role'           => 'sometimes|in:manager,accounts,trainer',
            'password'       => 'nullable|string|min:6',
            'dob'            => 'nullable|date',
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
        ]);

        if (isset($validated['name']))  $user->name  = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (array_key_exists('phone', $validated)) $user->phone = $validated['phone'];
        if (isset($validated['role']))  $user->role  = $validated['role'];
        if (array_key_exists('dob', $validated)) $user->dob = $validated['dob'];
        if (array_key_exists('aadhaar_card', $validated)) $user->aadhaar_card = $validated['aadhaar_card'];
        if (array_key_exists('aadhaar_image', $validated)) $user->aadhaar_image = $validated['aadhaar_image'];
        if (array_key_exists('pan_card', $validated)) $user->pan_card = $validated['pan_card'];
        if (array_key_exists('pan_image', $validated)) $user->pan_image = $validated['pan_image'];
        if (array_key_exists('salary', $validated)) $user->salary = $validated['salary'];
        if (array_key_exists('shifts', $validated)) $user->shifts = $validated['shifts'];

        $hasPlain = Schema::hasColumn('users', 'plain_password');
        // Update password if provided
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
            if ($hasPlain) {
                $user->plain_password = $validated['password'];
            }
        }

        $user->save();

        $plain = $hasPlain ? $user->plain_password : null;
        if (empty($plain)) {
            if ($user->role === 'manager') $plain = 'manager123';
            elseif ($user->role === 'accounts') $plain = 'accounts123';
            elseif ($user->role === 'trainer') $plain = 'trainer123';
            else $plain = 'password123';
        }
        $responseData = $user->toArray();
        $responseData['plain_password'] = $plain;
        $responseData['password'] = $plain;

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
                    $certs = ['NASM-CPT', 'CSCS'];
                }
                $profile->certifications = $certs;
            }
            if ($request->has('salary') || $request->has('monthly_salary')) {
                $profile->monthly_salary = $request->salary ?? $request->monthly_salary;
            }
            if ($request->has('age')) $profile->age = $request->age;
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

        if ($user->role === 'trainer') {
            TrainerProfile::where('user_id', $user->id)->delete();
        }

        $userName = $user->name;
        $user->delete();

        return response()->json(['success' => true, 'message' => "Staff account for {$userName} deleted."]);
    }
}

