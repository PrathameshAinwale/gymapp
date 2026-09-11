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
                    'specialty' => $profile?->specialty ?? 'Strength & Conditioning',
                    'experience' => $profile?->experience ?? '3+ Years',
                    'rating' => $profile?->rating ?? 5.0,
                    'activeClientsCount' => $activeClientsCount,
                    'monthlySalary' => $profile?->monthly_salary ?? 50000,
                    'bio' => $profile?->bio ?? 'Dedicated fitness professional.',
                    'certifications' => $profile?->certifications ?? [],
                    'age' => $profile?->age,
                    'gender' => $profile?->gender,
                    'bloodGroup' => $profile?->blood_group,
                    'address' => $profile?->address,
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
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'specialty' => $profile?->specialty,
                'experience' => $profile?->experience,
                'rating' => $profile?->rating,
                'monthlySalary' => $profile?->monthly_salary,
                'bio' => $profile?->bio,
                'certifications' => $profile?->certifications ?? [],
                'age' => $profile?->age,
                'gender' => $profile?->gender,
                'bloodGroup' => $profile?->blood_group,
                'address' => $profile?->address,
                'clients' => $clients,
                'classes' => $user->taughtClasses,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'specialty' => 'nullable|string',
            'monthly_salary' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request) ?? 1;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password ?? 'trainer123'),
            'role' => 'trainer',
            'phone' => $request->phone ?? '+91 98000 00000',
            'gym_id' => $gymId,
            'avatar' => $request->avatar ?? 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&auto=format&fit=crop&q=80',
        ]);

        $certifications = $request->certifications;
        if (is_string($certifications)) {
            $certifications = array_values(array_filter(array_map('trim', explode(',', $certifications))));
        }

        $profile = TrainerProfile::create([
            'user_id' => $user->id,
            'specialty' => $request->specialty ?? 'General Fitness',
            'experience' => $request->experience ?? '2+ Years',
            'rating' => $request->rating ?? 5.0,
            'monthly_salary' => $request->monthly_salary ?? $request->monthlySalary ?? 45000,
            'bio' => $request->bio ?? '',
            'certifications' => $certifications ?? [],
            'age' => $request->age ? (int)$request->age : null,
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

        if ($request->has('name')) $user->name = $request->name;
        if ($request->has('email')) $user->email = $request->email;
        if ($request->has('phone')) $user->phone = $request->phone;
        if ($request->has('avatar')) $user->avatar = $request->avatar;
        $user->save();

        if ($request->has('specialty')) $profile->specialty = $request->specialty;
        if ($request->has('experience')) $profile->experience = $request->experience;
        if ($request->has('rating')) $profile->rating = $request->rating;
        if ($request->has('monthly_salary') || $request->has('monthlySalary')) {
            $profile->monthly_salary = $request->monthly_salary ?? $request->monthlySalary;
        }
        if ($request->has('bio')) $profile->bio = $request->bio;
        if ($request->has('age')) $profile->age = $request->age ? (int)$request->age : null;
        if ($request->has('gender')) $profile->gender = $request->gender;
        if ($request->has('blood_group') || $request->has('bloodGroup')) {
            $profile->blood_group = $request->blood_group ?? $request->bloodGroup;
        }
        if ($request->has('address')) $profile->address = $request->address;
        if ($request->has('certifications')) {
            $certs = $request->certifications;
            if (is_string($certs)) {
                $certs = array_values(array_filter(array_map('trim', explode(',', $certs))));
            }
            $profile->certifications = $certs;
        }
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
