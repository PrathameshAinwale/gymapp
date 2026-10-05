<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GymSetting;
use Illuminate\Http\Request;

class GymSettingController extends Controller
{
    public function show(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if ($gymId) {
            $gym = \App\Models\Gym::find($gymId);
            if ($gym) {
                $packageTier = $gym->package_tier ?? $gym->package ?? 'Bronze';
                $saasPlan = \App\Models\SaasPlan::where('tier', $packageTier)->first();
                $packageName = $saasPlan ? $saasPlan->name : ($packageTier . ' Plan');

                // Subscription Starting Date: from created_at
                $startsAt = $gym->created_at ? $gym->created_at->format('Y-m-d') : null;

                // Subscription Ending Date: from subscription_expires_at or calculated from billing cycle
                $expiresAt = null;
                if ($gym->subscription_expires_at) {
                    $expiresAt = $gym->subscription_expires_at->format('Y-m-d');
                } elseif ($gym->created_at) {
                    $cycle = strtolower($gym->billing_cycle ?? 'annual');
                    if (str_contains($cycle, 'month')) {
                        $expiresAt = $gym->created_at->copy()->addMonth()->format('Y-m-d');
                    } else {
                        $expiresAt = $gym->created_at->copy()->addYear()->format('Y-m-d');
                    }
                }

                return response()->json([
                    'success' => true,
                    'data' => [
                        'id' => $gym->id,
                        'name' => $gym->name ?? '',
                        'tagline' => $gym->tagline ?? '',
                        'logo' => $gym->logo ?? '',
                        'address' => $gym->address ?? '',
                        'city' => $gym->city ?? '',
                        'state' => $gym->state ?? '',
                        'pincode' => $gym->pincode ?? '',
                        'phone' => $gym->phone ?? '',
                        'email' => $gym->email ?? '',
                        'website' => $gym->website ?? '',
                        'operatingHours' => $gym->operating_hours ?? '',
                        'currency' => $gym->currency ?? '₹',
                        'gstNumber' => $gym->gst_number ?? '',
                        'package' => $packageTier,
                        'packageTier' => $packageTier,
                        'package_tier' => $packageTier,
                        'packageName' => $packageName,
                        'package_name' => $packageName,
                        'billingCycle' => $gym->billing_cycle ?? 'Annual',
                        'billing_cycle' => $gym->billing_cycle ?? 'Annual',
                        'packageAmount' => $gym->package_amount != null ? (float)$gym->package_amount : ($saasPlan?->annual_price ? (float)$saasPlan->annual_price : null),
                        'package_amount' => $gym->package_amount != null ? (float)$gym->package_amount : ($saasPlan?->annual_price ? (float)$saasPlan->annual_price : null),
                        'features' => !empty($gym->features) ? $gym->features : ($saasPlan?->features ?? []),
                        'subscriptionStartsAt' => $startsAt,
                        'subscription_starts_at' => $startsAt,
                        'subscriptionExpiresAt' => $expiresAt,
                        'subscription_expires_at' => $expiresAt,
                        'createdAt' => $startsAt,
                        'created_at' => $startsAt,
                        'status' => $gym->status ?? 'Active',
                        'maxMembers' => $gym->max_members ?? $saasPlan?->max_members,
                        'max_members' => $gym->max_members ?? $saasPlan?->max_members,
                        'maxTrainers' => $gym->max_trainers ?? $saasPlan?->max_trainers,
                        'max_trainers' => $gym->max_trainers ?? $saasPlan?->max_trainers,
                        'maxBranches' => $gym->max_branches ?? 1,
                        'max_branches' => $gym->max_branches ?? 1,
                    ]
                ]);
            }
        }

        $setting = GymSetting::first();
        if ($setting) {
            return response()->json([
                'success' => true,
                'data' => [
                    'name' => $setting->name ?? '',
                    'tagline' => $setting->tagline ?? '',
                    'logo' => $setting->logo ?? '',
                    'address' => $setting->address ?? '',
                    'phone' => $setting->phone ?? '',
                    'email' => $setting->email ?? '',
                    'operatingHours' => $setting->operating_hours ?? '',
                    'currency' => $setting->currency ?? '₹',
                    'package' => 'Bronze',
                    'packageTier' => 'Bronze',
                    'features' => [],
                    'maxMembers' => 200,
                    'max_members' => 200,
                    'maxTrainers' => 0,
                    'max_trainers' => 0,
                    'maxBranches' => 1,
                    'max_branches' => 1,
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'name' => '',
                'tagline' => '',
                'logo' => '',
                'address' => '',
                'phone' => '',
                'email' => '',
                'operatingHours' => '',
                'currency' => '₹',
            ]
        ]);
    }

    public function update(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $gym = $gymId ? \App\Models\Gym::find($gymId) : null;

        if ($gym) {
            if ($request->has('name')) $gym->name = $request->input('name') ?: '';
            if ($request->has('tagline')) $gym->tagline = $request->input('tagline') ?: null;
            if ($request->has('logo')) $gym->logo = $request->input('logo') ?: null;
            if ($request->has('address')) $gym->address = $request->input('address') ?: null;
            if ($request->has('phone')) $gym->phone = $request->input('phone') ?: null;
            if ($request->has('email')) $gym->email = $request->input('email') ?: null;
            if (($request->has('operatingHours') || $request->has('operating_hours')) && \Illuminate\Support\Facades\Schema::hasColumn('gyms', 'operating_hours')) {
                $gym->operating_hours = $request->input('operatingHours') ?? $request->input('operating_hours') ?: null;
            }
            if ($request->has('currency') && \Illuminate\Support\Facades\Schema::hasColumn('gyms', 'currency')) $gym->currency = $request->input('currency') ?: '₹';
            $gym->save();
        }

        // Also keep GymSetting updated if any exists or if no gym found
        $setting = GymSetting::first();
        if ($setting || !$gym) {
            if (!$setting) {
                $setting = new GymSetting();
            }
            if ($request->has('name')) $setting->name = $request->input('name') ?: '';
            if ($request->has('tagline')) $setting->tagline = $request->input('tagline') ?: null;
            if ($request->has('logo')) $setting->logo = $request->input('logo') ?: null;
            if ($request->has('address')) $setting->address = $request->input('address') ?: null;
            if ($request->has('phone')) $setting->phone = $request->input('phone') ?: null;
            if ($request->has('email')) $setting->email = $request->input('email') ?: null;
            if ($request->has('operatingHours') || $request->has('operating_hours')) {
                $setting->operating_hours = $request->input('operatingHours') ?? $request->input('operating_hours') ?: null;
            }
            if ($request->has('currency')) $setting->currency = $request->input('currency') ?: '₹';
            $setting->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Gym settings updated successfully',
            'data' => $this->show($request)->original['data'],
        ]);
    }

    /**
     * Get all gym branches owned by the authenticated owner (Platinum multi-gym).
     */
    public function getBranches(Request $request)
    {
        $user = $request->user() ?: auth('sanctum')->user();

        $ownerId = null;
        if ($user) {
            $role = strtolower($user->role ?? '');
            if ($role === 'owner') {
                $ownerId = $user->id;
            } elseif ($user->gym_id) {
                $ownerId = \App\Models\Gym::find($user->gym_id)?->owner_id;
            }
        }

        if (!$ownerId) {
            $activeGymId = $this->resolveGymId($request) ?: ($user?->gym_id);
            $currentGym = $activeGymId ? \App\Models\Gym::find($activeGymId) : null;
            $ownerId = $currentGym?->owner_id;
        }

        if (!$ownerId && $user) {
            $ownedGym = \App\Models\Gym::where('owner_id', $user->id)->first();
            $ownerId = $ownedGym?->owner_id;
        }

        if (!$ownerId) {
            return response()->json(['success' => false, 'message' => 'No facility owner found for this account.'], 403);
        }

        $gyms = \App\Models\Gym::where('owner_id', $ownerId)->orderBy('id', 'asc')->get();

        // Check if owner has Platinum plan or max_branches > 1
        $isPlatinum = false;
        $maxAllowed = 1;
        foreach ($gyms as $g) {
            $tier = strtolower($g->package_tier ?? $g->package ?? '');
            if (str_contains($tier, 'platinum') || ($g->max_branches && $g->max_branches > 1)) {
                $isPlatinum = true;
                $maxAllowed = max($maxAllowed, (int)($g->max_branches ?: 3));
            }
        }

        $activeGymId = $this->resolveGymId($request);

        $branches = $gyms->map(function ($gym) use ($activeGymId) {
            $memberCount = \App\Models\User::where('gym_id', $gym->id)->where('role', 'member')->count();
            $staffCount = \App\Models\User::where('gym_id', $gym->id)->whereIn('role', ['trainer', 'staff', 'manager'])->count();
            return [
                'id' => $gym->id,
                'name' => $gym->name,
                'tagline' => $gym->tagline,
                'logo' => $gym->logo,
                'address' => $gym->address,
                'city' => $gym->city,
                'phone' => $gym->phone,
                'email' => $gym->email,
                'operating_hours' => $gym->operating_hours,
                'package_tier' => $gym->package_tier ?? $gym->package ?? 'Bronze',
                'status' => $gym->status ?? 'Active',
                'member_count' => $memberCount,
                'staff_count' => $staffCount,
                'is_active' => ($gym->id == $activeGymId),
                'created_at' => $gym->created_at?->format('Y-m-d')
            ];
        });

        return response()->json([
            'success' => true,
            'is_platinum' => $isPlatinum,
            'max_branches' => $maxAllowed,
            'can_add_branch' => ($isPlatinum && count($branches) < $maxAllowed),
            'active_gym_id' => $activeGymId,
            'branches' => $branches
        ]);
    }

    /**
     * Add a new gym facility under this owner's Platinum subscription.
     */
    public function createBranch(Request $request)
    {
        $user = $request->user() ?: auth('sanctum')->user();

        $ownerId = null;
        if ($user) {
            $role = strtolower($user->role ?? '');
            if ($role === 'owner') {
                $ownerId = $user->id;
            } elseif ($user->gym_id) {
                $ownerId = \App\Models\Gym::find($user->gym_id)?->owner_id;
            }
        }

        if (!$ownerId) {
            $activeGymId = $this->resolveGymId($request) ?: ($user?->gym_id);
            $currentGym = $activeGymId ? \App\Models\Gym::find($activeGymId) : null;
            $ownerId = $currentGym?->owner_id;
        }

        if (!$ownerId && $user) {
            $ownedGym = \App\Models\Gym::where('owner_id', $user->id)->first();
            $ownerId = $ownedGym?->owner_id;
        }

        if (!$ownerId) {
            return response()->json(['success' => false, 'message' => 'No facility owner found. Please log in again.'], 401);
        }

        $existingGyms = \App\Models\Gym::where('owner_id', $ownerId)->get();
        if ($existingGyms->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No primary gym found for this owner.'], 404);
        }

        // Check if owner has Platinum membership
        $isPlatinum = false;
        $maxAllowed = 1;
        $primaryGym = $existingGyms->first();
        foreach ($existingGyms as $g) {
            $tier = strtolower($g->package_tier ?? $g->package ?? '');
            if (str_contains($tier, 'platinum') || ($g->max_branches && $g->max_branches > 1)) {
                $isPlatinum = true;
                $maxAllowed = max($maxAllowed, (int)($g->max_branches ?: 3));
                $primaryGym = $g;
            }
        }

        if (!$isPlatinum) {
            return response()->json([
                'success' => false,
                'message' => 'Multi-Gym feature is an exclusive privilege of the Platinum Plan. Please upgrade to Platinum to unlock multi-facility management.'
            ], 403);
        }

        if ($existingGyms->count() >= $maxAllowed) {
            return response()->json([
                'success' => false,
                'message' => "You have reached your maximum facility limit of {$maxAllowed} gyms under your Platinum Plan."
            ], 422);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'operating_hours' => 'nullable|string|max:255',
            'logo' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Create the new gym branch with fully isolated records
        $newGym = \App\Models\Gym::create([
            'name' => $request->name,
            'owner_id' => $ownerId,
            'tagline' => $request->tagline ?: null,
            'address' => $request->address ?: null,
            'city' => $request->city ?: ($primaryGym->city ?? null),
            'phone' => $request->phone ?: ($user?->phone ?: $primaryGym->phone),
            'email' => $request->email ?: ($user?->email ?: $primaryGym->email),
            'package' => 'Platinum',
            'package_tier' => 'Platinum',
            'billing_cycle' => $primaryGym->billing_cycle ?? 'Annual',
            'subscription_expires_at' => $primaryGym->subscription_expires_at,
            'status' => 'Active',
            'currency' => $primaryGym->currency ?? '₹',
            'operating_hours' => $request->operating_hours ?: ($primaryGym->operating_hours ?? 'Mon-Sat: 6:00 AM - 10:30 PM'),
            'logo' => $request->logo ?: ($primaryGym->logo ?? null),
            'max_members' => $primaryGym->max_members,
            'max_trainers' => $primaryGym->max_trainers,
            'max_branches' => $maxAllowed,
            'features' => $primaryGym->features,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Gym branch \"{$newGym->name}\" added successfully!",
            'gym' => $newGym
        ], 201);
    }

    /**
     * Switch the owner's active gym facility workspace.
     */
    public function switchBranch(Request $request)
    {
        $user = $request->user() ?: auth('sanctum')->user();

        $gymId = (int)$request->input('gym_id');
        if (!$gymId) {
            return response()->json(['success' => false, 'message' => 'Please provide a valid gym ID.'], 422);
        }

        // Verify that this gym belongs to the authenticated owner
        $targetGym = \App\Models\Gym::find($gymId);
        if (!$targetGym) {
            return response()->json(['success' => false, 'message' => 'Gym facility not found.'], 404);
        }

        if ($user->role !== 'superadmin' && $targetGym->owner_id !== $user->id && $user->gym_id !== $gymId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access to this gym facility.'], 403);
        }

        // Update user's active gym
        $user->gym_id = $gymId;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => "Switched active workspace to \"{$targetGym->name}\"",
            'active_gym_id' => $gymId,
            'gym' => [
                'id' => $targetGym->id,
                'name' => $targetGym->name,
                'tagline' => $targetGym->tagline,
                'logo' => $targetGym->logo,
                'address' => $targetGym->address,
                'package_tier' => $targetGym->package_tier ?? $targetGym->package ?? 'Platinum'
            ]
        ]);
    }
}
