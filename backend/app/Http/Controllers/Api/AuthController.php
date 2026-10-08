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
use Illuminate\Support\Facades\Schema;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $loginInput = trim($request->input('login', $request->input('email', $request->input('phone', $request->input('username', '')))));
        $password = (string)$request->password;

        if (empty($loginInput) || empty($password)) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide mobile number or email, and password.',
                'errors' => [
                    'email' => ['Please provide mobile number or email.'],
                    'password' => ['Password is required.']
                ]
            ], 422);
        }

        // Clean digits if input is or contains a phone number
        $digits = preg_replace('/\D+/', '', $loginInput);
        $last10 = strlen($digits) >= 10 ? substr($digits, -10) : $digits;

        // Search candidates by email, phone, name, or username
        $users = User::where(function ($q) use ($loginInput, $digits, $last10) {
            $q->where('email', $loginInput)
              ->orWhere('name', $loginInput);
            if (!empty($digits)) {
                $q->orWhere('phone', $loginInput)
                  ->orWhere('phone', $digits);
                if (strlen($last10) >= 7) {
                    $q->orWhere('phone', 'like', "%{$last10}")
                      ->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') LIKE ?", ["%{$last10}"]);
                }
            }
            if (!str_contains($loginInput, '@')) {
                $q->orWhere('email', 'like', "{$loginInput}@%");
            }
        })->get();

        // Check password against matching user(s)
        $user = null;
        $hasPlain = Schema::hasColumn('users', 'plain_password');
        foreach ($users as $candidate) {
            $matched = false;
            if (Hash::check($password, $candidate->password)) {
                $matched = true;
            } elseif ($hasPlain && !empty($candidate->plain_password) && $candidate->plain_password === $password) {
                $matched = true;
            } elseif (!empty($candidate->initial_password) && (Hash::check($password, $candidate->initial_password) || $candidate->initial_password === $password)) {
                $matched = true;
            }

            if ($matched) {
                // Keep password hash and plain_password in sync
                if (!Hash::check($password, $candidate->password)) {
                    $candidate->password = Hash::make($password);
                }
                if ($hasPlain && $candidate->plain_password !== $password) {
                    $candidate->plain_password = $password;
                }
                $candidate->save();
                $user = $candidate;
                break;
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found. Please check your mobile number or email, and password.'
            ], 404);
        }

        // Verify gym affiliation for non-superadmin accounts
        if ($user->role !== 'superadmin') {
            $gym = null;
            if ($user->role === 'owner') {
                // Owner MUST only ever belong to a gym they actually own
                $gym = \App\Models\Gym::where('owner_id', $user->id)->first();
                if (!$gym && $user->gym_id) {
                    $candidate = \App\Models\Gym::find($user->gym_id);
                    if ($candidate && ($candidate->owner_id === $user->id || empty($candidate->owner_id))) {
                        $candidate->owner_id = $user->id;
                        $candidate->save();
                        $gym = $candidate;
                    }
                }
                if (!$gym) {
                    // Auto-provision their dedicated facility so an owner NEVER sees another club
                    $gym = \App\Models\Gym::create([
                        'name' => ($user->name ? $user->name . "'s Gym" : 'Club Facility'),
                        'owner_id' => $user->id,
                        'phone' => $user->phone,
                        'email' => $user->email,
                        'package' => 'Bronze',
                        'package_tier' => 'Bronze',
                        'billing_cycle' => 'Annual',
                        'status' => 'Active',
                        'currency' => '₹',
                    ]);
                }
                $user->gym_id = $gym->id;
                $user->save();
            } else {
                if ($user->gym_id) {
                    $gym = \App\Models\Gym::find($user->gym_id);
                }
                if (!$gym) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Account not found. This gym account has been deleted.'
                    ], 404);
                }
            }

            if (in_array(strtolower($gym->status ?? 'active'), ['suspended', 'expired', 'inactive'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access Denied: This facility has been suspended by the platform administrator. Access for the owner and all accounts under this facility is stopped.'
                ], 403);
            }
        }

        // Load profile and gym relations
        if ($user->role === 'member') {
            $user->load(['memberProfile.plan', 'memberProfile.trainer', 'gym']);
        } elseif ($user->role === 'trainer') {
            $user->load(['trainerProfile', 'gym']);
        } else {
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
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|min:7|max:20',
            'email' => 'nullable|email',
            'password' => 'required|string|min:4',
            'role' => 'nullable|in:owner,trainer,member,manager,accounts,superadmin',
            'avatar' => 'nullable|string',
        ], [
            'phone.required' => 'Mobile number is mandatory.',
            'phone.min' => 'Please enter a valid mobile number.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $rawPhone = trim($request->phone ?? '');
        $cleanDigits = preg_replace('/\D+/', '', $rawPhone);
        $last10 = strlen($cleanDigits) >= 10 ? substr($cleanDigits, -10) : $cleanDigits;

        // Check if member already exists with this phone
        $existingUser = User::where(function ($q) use ($rawPhone, $last10, $cleanDigits) {
            $q->where('phone', $rawPhone)
              ->orWhere('phone', $cleanDigits);
            if (strlen($last10) >= 7) {
                $q->orWhere('phone', 'like', "%{$last10}");
            }
        })->first();

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
        }

        $user = User::create([
            'name' => $request->name,
            'email' => !empty($request->email) ? $request->email : null,
            'role' => $request->role ?? 'member',
            'phone' => $rawPhone,
            'password' => Hash::make($request->password),
            'avatar' => $request->avatar ?? null,
        ]);

        if ($user->role === 'member') {
            MemberProfile::create([
                'user_id' => $user->id,
                'status' => 'Active',
                'join_date' => now()->toDateString(),
                'qr_pass_code' => 'PF-M-' . $user->id . '-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $user->name), 0, 4)),
            ]);
            $user->load('memberProfile');
            try {
                \App\Services\WhatsAppNotificationService::sendWelcomeMessage($user, $user->memberProfile, $user->gym_id ?: 1);
            } catch (\Throwable $e) {
                // Keep silent on auth
            }
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
        if (!$user && $request->bearerToken()) {
            $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken());
            if ($tokenModel) $user = $tokenModel->tokenable;
        }

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        if ($user->role === 'owner') {
            $ownedGym = \App\Models\Gym::where('owner_id', $user->id)->first();
            if ($ownedGym && $user->gym_id !== $ownedGym->id) {
                $user->gym_id = $ownedGym->id;
                $user->save();
            }
        }

        if ($user->role !== 'superadmin') {
            $gym = $user->gym_id ? \App\Models\Gym::find($user->gym_id) : ($user->role === 'owner' ? \App\Models\Gym::where('owner_id', $user->id)->first() : null);
            if ($gym && in_array(strtolower($gym->status ?? 'active'), ['suspended', 'expired', 'inactive'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access Denied: This facility has been suspended by the platform administrator. Access for the owner and all accounts under this facility is stopped.'
                ], 403);
            }
        }

        $user->load('gym');
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
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $currentMatches = Hash::check($request->current_password, $user->password);
        if (!$currentMatches && Schema::hasColumn('users', 'plain_password') && !empty($user->plain_password)) {
            $currentMatches = ($user->plain_password === $request->current_password);
        }

        if (!$currentMatches) {
            return response()->json([
                'success' => false,
                'message' => 'Current password does not match.'
            ], 400);
        }

        $user->password = Hash::make($request->new_password);
        if (Schema::hasColumn('users', 'plain_password')) {
            $user->plain_password = $request->new_password;
        }
        $user->must_change_password = false;
        $user->initial_password = null;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
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
