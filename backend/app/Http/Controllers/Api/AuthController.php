<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);
        }

        // Load profile and gym relations
        if ($user->role === 'member') {
            $user->load(['memberProfile.plan', 'memberProfile.trainer', 'gym']);
        } elseif ($user->role === 'trainer') {
            $user->load(['trainerProfile', 'gym']);
        } elseif ($user->role === 'owner') {
            if (!$user->gym_id) {
                $ownedGym = \App\Models\Gym::where('owner_id', $user->id)->first();
                if ($ownedGym) {
                    $user->gym_id = $ownedGym->id;
                    $user->save();
                }
            }
            $user->load('gym');
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Logged in successfully',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function register(Request $request)
    {
        $existingUser = User::where('email', $request->email)->first();
        if ($existingUser) {
            if ($existingUser->role === 'member') {
                if ($request->filled('password')) {
                    $existingUser->password = Hash::make($request->password);
                    $existingUser->initial_password = Hash::make($request->password);
                    $existingUser->must_change_password = true;
                    $existingUser->save();
                }
                $token = $existingUser->createToken('auth-token')->plainTextToken;
                return response()->json([
                    'success' => true,
                    'message' => 'Member account synced successfully',
                    'token' => $token,
                    'user' => $existingUser->load('memberProfile'),
                ], 200);
            }
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => ['email' => ['The email has already been taken.']]
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|in:owner,trainer,member',
            'phone' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $rawPhone = trim($request->phone ?? '');
        if (!empty($rawPhone)) {
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

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role ?? 'member',
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'avatar' => $request->avatar ?? null,
        ]);

        if ($user->role === 'member') {
            MemberProfile::create([
                'user_id' => $user->id,
                'status' => 'Active',
                'join_date' => now()->toDateString(),
                'qr_pass_code' => 'PF-M-' . $user->id . '-' . strtoupper(substr($user->name, 0, 4)),
            ]);
            $user->load('memberProfile');
        } elseif ($user->role === 'trainer') {
            TrainerProfile::create([
                'user_id' => $user->id,
                'specialty' => 'General Fitness',
                'experience' => '1 Year',
                'rating' => 5.0,
            ]);
            $user->load('trainerProfile');
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully',
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'member') {
            $user->load(['memberProfile.plan', 'memberProfile.trainer']);
        } elseif ($user->role === 'trainer') {
            $user->load('trainerProfile');
        }

        return response()->json([
            'success' => true,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password does not match'
            ], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->must_change_password = false;
        $user->initial_password = null;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully',
            'user' => $user,
        ]);
    }

    public function firstLoginSetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'new_password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $user->password = Hash::make($request->new_password);
        $user->must_change_password = false;
        $user->initial_password = null;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully! You can now access your gym portal.',
            'user' => $user,
        ]);
    }
}
