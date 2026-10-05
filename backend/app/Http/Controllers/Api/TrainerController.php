<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TrainerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class TrainerController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $query = User::where('role', 'trainer')
            ->with(['trainerProfile', 'trainerProfile.assignedMembers.user']);

        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        $trainers = $query->get()
            ->map(function ($user) {
                $profile = $user->trainerProfile;
                $activeClientsCount = $profile?->assignedMembers()->count() ?? 0;

                return [
                    'id' => 'trn-' . $user->id,
                    'userId' => $user->id,
                    'name' => $user->name,
                    'role' => 'Fitness Coach',
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar' => $user->avatar,
                    'specialty' => $profile?->specialty ?? '',
                    'experience' => $profile?->experience ?? '',
                    'rating' => $profile?->rating ?? 5.0,
                    'activeClientsCount' => $activeClientsCount,
                    'monthlySalary' => $profile?->monthly_salary ?? $user->salary ?? 0,
                    'salary' => $profile?->monthly_salary ?? $user->salary ?? 0,
                    'bio' => $profile?->bio ?? '',
                    'certifications' => $profile?->certifications ?? [],
                    'age' => $profile?->age,
                    'dob' => $profile?->dob ? $profile->dob->format('Y-m-d') : ($user->dob ? \Illuminate\Support\Carbon::parse($user->dob)->toDateString() : null),
                    'gender' => $profile?->gender ?? $user->gender,
                    'bloodGroup' => $profile?->blood_group ?? $user->blood_group,
                    'blood_group' => $profile?->blood_group ?? $user->blood_group,
                    'address' => $profile?->address ?? $user->address,
                    'shifts' => $user->shifts,
                    'joiningDate' => $user->joining_date,
                    'joining_date' => $user->joining_date,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $trainers,
            'count' => $trainers->count(),
        ]);
    }

    public function show($id)
    {
        $numericId = str_replace('trn-', '', $id);
        $user = User::where('role', 'trainer')
            ->with(['trainerProfile', 'trainerProfile.assignedMembers.user', 'taughtClasses'])
            ->findOrFail($numericId);

        $profile = $user->trainerProfile;
        $clients = $profile?->assignedMembers->map(function ($m) {
            return [
                'id' => 'mem-' . $m->user_id,
                'name' => $m->user?->name,
                'email' => $m->user?->email,
                'phone' => $m->user?->phone,
                'goal' => $m->goal,
                'status' => $m->status,
                'weight' => $m->weight,
                'targetWeight' => $m->target_weight,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'trn-' . $user->id,
                'userId' => $user->id,
                'name' => $user->name,
                'role' => 'Fitness Coach',
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'specialty' => $profile?->specialty ?? '',
                'experience' => $profile?->experience ?? '',
                'rating' => $profile?->rating ?? 5.0,
                'monthlySalary' => $profile?->monthly_salary ?? $user->salary ?? 0,
                'salary' => $profile?->monthly_salary ?? $user->salary ?? 0,
                'bio' => $profile?->bio ?? '',
                'certifications' => $profile?->certifications ?? [],
                'age' => $profile?->age,
                'dob' => $profile?->dob ? $profile->dob->format('Y-m-d') : ($user->dob ? \Illuminate\Support\Carbon::parse($user->dob)->toDateString() : null),
                'gender' => $profile?->gender ?? $user->gender,
                'bloodGroup' => $profile?->blood_group ?? $user->blood_group,
                'blood_group' => $profile?->blood_group ?? $user->blood_group,
                'address' => $profile?->address ?? $user->address,
                'shifts' => $user->shifts,
                'joiningDate' => $user->joining_date,
                'joining_date' => $user->joining_date,
                'clients' => $clients,
                'classes' => $user->taughtClasses,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|min:7|max:20',
            'email' => 'nullable|email',
            'specialty' => 'nullable|string',
            'monthly_salary' => 'nullable|numeric',
        ], [
            'phone.required' => 'Mobile number is mandatory to register trainer.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request);

        $user = User::create([
            'name' => $request->name,
            'email' => !empty($request->email) ? $request->email : null,
            'password' => Hash::make($request->password ?? 'trainer123'),
            'role' => 'trainer',
            'phone' => $request->phone,
            'gym_id' => $gymId,
            'avatar' => $request->avatar ?? null,
            'shifts' => $request->shifts ?? null,
            'joining_date' => $request->joining_date ?? null,
            'salary' => $request->salary ?? $request->monthly_salary ?? $request->monthlySalary ?? null,
        ]);

        $certifications = $request->certifications;
        if (is_string($certifications)) {
            $certifications = array_values(array_filter(array_map('trim', explode(',', $certifications))));
        } elseif (!is_array($certifications)) {
            $certifications = [];
        }

        $profile = TrainerProfile::create([
            'user_id' => $user->id,
            'specialty' => $request->specialty ?? '',
            'experience' => $request->experience ?? '',
            'rating' => $request->rating ?? 5.0,
            'monthly_salary' => $request->monthly_salary ?? $request->monthlySalary ?? $request->salary ?? 0,
            'bio' => $request->bio ?? '',
            'certifications' => $certifications,
            'age' => $request->age ? (int)$request->age : null,
            'dob' => $request->dob ? \Illuminate\Support\Carbon::parse($request->dob)->toDateString() : null,
            'gender' => $request->gender,
            'blood_group' => $request->blood_group ?? $request->bloodGroup,
            'address' => $request->address,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Trainer added successfully',
            'data' => $this->show('trn-' . $user->id)->original['data'],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $numericId = str_replace('trn-', '', $id);
        $user = User::where('role', 'trainer')->findOrFail($numericId);
        $profile = TrainerProfile::firstOrCreate(['user_id' => $user->id]);

        // Editable personal/contact details
        if ($request->has('name') && filled($request->name)) $user->name = $request->name;
        if ($request->has('email')) $user->email = filled($request->email) ? $request->email : null;
        if ($request->has('phone') && filled($request->phone)) $user->phone = $request->phone;
        if ($request->has('avatar')) $user->avatar = $request->avatar;
        $user->save();

        // Editable profile credentials
        if ($request->has('specialty')) $profile->specialty = $request->specialty ?? '';
        if ($request->has('experience')) $profile->experience = $request->experience ?? '';
        if ($request->has('bio')) $profile->bio = $request->bio ?? '';
        if ($request->has('age')) $profile->age = $request->age ? (int)$request->age : null;
        if ($request->has('dob')) {
            $profile->dob = $request->dob ? \Illuminate\Support\Carbon::parse($request->dob)->toDateString() : null;
        }
        if ($request->has('gender')) $profile->gender = $request->gender;
        if ($request->has('blood_group') || $request->has('bloodGroup')) {
            $profile->blood_group = $request->blood_group ?? $request->bloodGroup;
        }
        if ($request->has('address')) $profile->address = $request->address;
        if ($request->has('certifications')) {
            $certs = $request->certifications;
            if (is_string($certs)) {
                $certs = array_values(array_filter(array_map('trim', explode(',', $certs))));
            } elseif (!is_array($certs)) {
                $certs = [];
            }
            $profile->certifications = $certs;
        }

        // STRICT CONSTRAINT: Coach CANNOT edit salary or employment-related data.
        // Therefore, monthly_salary, salary, shifts, joining_date, and role are ignored here.

        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Trainer profile updated successfully',
            'data' => $this->show('trn-' . $user->id)->original['data'],
        ]);
    }

    public function destroy($id)
    {
        $numericId = str_replace('trn-', '', $id);
        $user = User::where('role', 'trainer')->findOrFail($numericId);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Trainer removed successfully'
        ]);
    }
}
