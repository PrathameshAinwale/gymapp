<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\User;
use App\Models\SaasPlan;
use App\Models\PlatformPage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class SuperadminController extends Controller
{
    /**
     * Get platform-wide overview metrics for Superadmin.
     */
    public function stats(Request $request)
    {
        $totalGyms = Gym::count();
        $totalOwners = User::where('role', 'owner')->count();
        $totalMembers = User::where('role', 'member')->count();
        $totalTrainers = User::where('role', 'trainer')->count();
        $totalAccounts = $totalOwners + $totalMembers + $totalTrainers;
        $activeGyms = Gym::where('status', 'Active')->count();

        return response()->json([
            'success' => true,
            'stats' => [
                'totalGyms' => $totalGyms,
                'totalOwners' => $totalOwners,
                'totalMembers' => $totalMembers,
                'totalTrainers' => $totalTrainers,
                'totalAccounts' => $totalAccounts,
                'activeGyms' => $activeGyms,
            ]
        ]);
    }

    /**
     * List all Gyms with Owners, Credential info, and Account counts.
     */
    public function indexGyms(Request $request)
    {
        $gyms = Gym::with(['owner'])->latest()->get()->map(function ($gym) {
            $isDefaultGym = ($gym->id == 1);
            
            // Count accounts tied to this gym
            $membersCount = User::where('role', 'member')
                ->where('gym_id', $gym->id)->count();

            $trainersCount = User::where('role', 'trainer')
                ->where('gym_id', $gym->id)->count();

            $owner = $gym->owner;

            return [
                'id' => $gym->id,
                'name' => $gym->name,
                'tagline' => $gym->tagline ?? '',
                'address' => $gym->address ?? '',
                'city' => $gym->city ?? '',
                'phone' => $gym->phone ?? ($owner?->phone ?? ''),
                'email' => $gym->email ?? ($owner?->email ?? ''),
                'operatingHours' => $gym->operating_hours ?? '',
                'operating_hours' => $gym->operating_hours ?? '',
                'currency' => $gym->currency ?? '₹',
                'package' => $gym->package_tier ?: ($gym->package ?: ''),
                'packageTier' => $gym->package_tier ?: ($gym->package ?: ''),
                'billingCycle' => $gym->billing_cycle ?? '',
                'packageAmount' => $gym->package_amount !== null ? (float)$gym->package_amount : 0,
                'maxMembers' => $gym->max_members !== null ? (int)$gym->max_members : null,
                'maxTrainers' => $gym->max_trainers !== null ? (int)$gym->max_trainers : null,
                'maxBranches' => $gym->max_branches !== null ? (int)$gym->max_branches : null,
                'status' => $gym->status ?? 'Active',
                'state' => $gym->state ?? '',
                'pincode' => $gym->pincode ?? '',
                'logo' => $gym->logo ?? '',
                'website' => $gym->website ?? '',
                'gstNumber' => $gym->gst_number ?? '',
                'gst_number' => $gym->gst_number ?? '',
                'features' => $gym->features ?? [],
                'subscriptionExpiresAt' => $gym->subscription_expires_at?->format('Y-m-d') ?? '',
                'subscription_expires_at' => $gym->subscription_expires_at?->format('Y-m-d') ?? '',
                'notes' => $gym->notes ?? '',
                'owner' => $owner ? [
                    'id' => $owner->id,
                    'name' => $owner->name,
                    'email' => $owner->email ?? '',
                    'phone' => $owner->phone ?? '',
                    'avatar' => $owner->avatar,
                    'role' => 'owner',
                    'loginPassword' => '••••••••',
                ] : null,
                'accounts' => [
                    'members' => $membersCount,
                    'trainers' => $trainersCount,
                    'owners' => $owner ? 1 : 0,
                    'total' => $membersCount + $trainersCount + ($owner ? 1 : 0),
                ]
            ];
        });

        return response()->json([
            'success' => true,
            'gyms' => $gyms,
        ]);
    }

    /**
     * Register a brand-new Gym Owner and their Gym.
     */
    public function storeGym(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'owner_name' => 'required|string|max:255',
            'owner_phone' => 'required|string|min:7|max:50',
            'owner_email' => 'nullable|email',
            'owner_password' => 'required|string|min:4',
            'gym_name' => 'required|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'gym_address' => 'nullable|string|max:255',
            'gym_city' => 'nullable|string|max:100',
            'gym_phone' => 'nullable|string|max:50',
            'gym_email' => 'nullable|email|max:100',
            'operating_hours' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:10',
            'gym_package' => 'nullable|string|max:100',
            'package_tier' => 'nullable|string|max:100',
            'billing_cycle' => 'nullable|string|in:Monthly,Annual,Custom',
            'package_amount' => 'nullable|numeric|min:0',
            'max_members' => 'nullable|integer',
            'max_trainers' => 'nullable|integer',
            'max_branches' => 'nullable|integer',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'logo' => 'nullable|string',
            'website' => 'nullable|string|max:255',
            'gst_number' => 'nullable|string|max:50',
            'subscription_expires_at' => 'nullable|date',
            'notes' => 'nullable|string',
            'features' => 'nullable|array',
        ], [
            'owner_phone.required' => 'Owner mobile number is mandatory to register gym.',
            'owner_phone.min' => 'Please enter a valid owner mobile number.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // 1. Create the Gym Owner User account
            $owner = User::create([
                'name' => $request->owner_name,
                'email' => !empty($request->owner_email) ? $request->owner_email : null,
                'password' => Hash::make($request->owner_password),
                'initial_password' => Hash::make($request->owner_password),
                'must_change_password' => true,
                'phone' => $request->owner_phone,
                'role' => 'owner',
                'avatar' => $request->avatar ?? null,
            ]);

            // Determine package details from real request inputs
            $tier = $request->package_tier ?: ($request->gym_package ?: null);
            $billingCycle = $request->billing_cycle ?: null;
            $amount = $request->has('package_amount') && $request->package_amount !== null && $request->package_amount !== ''
                ? (float)$request->package_amount
                : null;
            $features = is_array($request->features) ? $request->features : [];

            // 2. Create the Gym entity
            // Build core data — ONLY columns from the original gyms table migration
            $gymData = [
                'name' => $request->gym_name,
                'owner_id' => $owner->id,
                'tagline' => $request->tagline ?: null,
                'address' => $request->gym_address ?: ($request->address ?: null),
                'city' => $request->gym_city ?: null,
                'phone' => $request->gym_phone ?: ($request->phone ?: $request->owner_phone),
                'email' => $request->gym_email ?: ($request->email ?: $request->owner_email),
                'package' => $tier ?: null,
                'status' => 'Active',
                'initial_password' => Hash::make($request->owner_password),
            ];

            // Conditionally add columns that were introduced via later migrations.
            // This prevents "Column not found" on production if migrations haven't run yet.
            $optionalColumns = [
                'logo'                    => $request->logo ?: null,
                'state'                   => $request->state ?: null,
                'pincode'                 => $request->pincode ?: null,
                'website'                 => $request->website ?: null,
                'operating_hours'         => $request->operating_hours ?: ($request->operatingHours ?: null),
                'currency'                => $request->currency ?: '₹',
                'gst_number'              => $request->gst_number ?: null,
                'package_tier'            => $tier,
                'billing_cycle'           => $billingCycle,
                'package_amount'          => $amount,
                'subscription_expires_at' => $request->subscription_expires_at ?: null,
                'max_members'             => $request->filled('max_members') ? (int)$request->max_members : null,
                'max_trainers'            => $request->filled('max_trainers') ? (int)$request->max_trainers : null,
                'max_branches'            => $request->filled('max_branches') ? (int)$request->max_branches : null,
                'notes'                   => $request->notes ?: null,
                'features'                => $features,
            ];

            foreach ($optionalColumns as $col => $val) {
                if (Schema::hasColumn('gyms', $col)) {
                    $gymData[$col] = $val;
                }
            }

            $gym = Gym::create($gymData);

            // 3. Link owner's gym_id
            $owner->gym_id = $gym->id;
            $owner->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Gym and Owner provisioned successfully',
                'gym' => $gym->fresh('owner')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to register gym owner: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Gym details, status, features, or credentials.
     */
    public function updateGym(Request $request, $id)
    {
        $gym = Gym::with('owner')->find($id);

        if (!$gym) {
            return response()->json([
                'success' => false,
                'message' => 'Gym not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'logo' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'website' => 'nullable|string|max:255',
            'operating_hours' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:10',
            'gst_number' => 'nullable|string|max:50',
            'package' => 'nullable|string|max:100',
            'package_tier' => 'nullable|string|max:100',
            'billing_cycle' => 'nullable|string|in:Monthly,Annual,Custom,Lifetime',
            'package_amount' => 'nullable|numeric|min:0',
            'subscription_expires_at' => 'nullable|date',
            'max_members' => 'nullable|integer',
            'max_trainers' => 'nullable|integer',
            'max_branches' => 'nullable|integer',
            'status' => 'nullable|string|in:Active,Suspended,Trial,Expired',
            'notes' => 'nullable|string',
            'features' => 'nullable|array',
            'new_password' => 'nullable|string|min:4',
            'owner_name' => 'nullable|string|max:255',
            'owner_phone' => 'nullable|string|max:50',
            'owner_email' => 'nullable|email|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->has('name')) $gym->name = $request->name;
        if ($request->has('tagline')) $gym->tagline = $request->tagline;
        if ($request->has('logo') && Schema::hasColumn('gyms', 'logo')) $gym->logo = $request->logo;
        if ($request->has('address') || $request->has('gym_address')) {
            $gym->address = $request->address ?? $request->gym_address;
        }
        if ($request->has('city') || $request->has('gym_city')) {
            $gym->city = $request->city ?? $request->gym_city;
        }
        if ($request->has('state') && Schema::hasColumn('gyms', 'state')) $gym->state = $request->state;
        if ($request->has('pincode') && Schema::hasColumn('gyms', 'pincode')) $gym->pincode = $request->pincode;
        if ($request->has('phone') || $request->has('gym_phone')) {
            $gym->phone = $request->phone ?? $request->gym_phone;
        }
        if ($request->has('email') || $request->has('gym_email')) {
            $gym->email = $request->email ?? $request->gym_email;
        }
        if ($request->has('website') && Schema::hasColumn('gyms', 'website')) $gym->website = $request->website;
        if (($request->has('operating_hours') || $request->has('operatingHours')) && Schema::hasColumn('gyms', 'operating_hours')) {
            $gym->operating_hours = $request->operating_hours ?? $request->operatingHours;
        }
        if ($request->has('currency') && Schema::hasColumn('gyms', 'currency')) $gym->currency = $request->currency;
        if ($request->has('gst_number') && Schema::hasColumn('gyms', 'gst_number')) $gym->gst_number = $request->gst_number;
        if ($request->has('package_tier') || $request->has('package')) {
            $tier = $request->package_tier ?? $request->package;
            if (Schema::hasColumn('gyms', 'package_tier')) $gym->package_tier = $tier;
            $gym->package = $tier;
        }
        if ($request->has('billing_cycle') && Schema::hasColumn('gyms', 'billing_cycle')) $gym->billing_cycle = $request->billing_cycle;
        if ($request->has('package_amount') && Schema::hasColumn('gyms', 'package_amount')) {
            $gym->package_amount = ($request->package_amount !== '' && $request->package_amount !== null) ? (float)$request->package_amount : null;
        }
        if ($request->has('subscription_expires_at') && Schema::hasColumn('gyms', 'subscription_expires_at')) {
            $gym->subscription_expires_at = !empty($request->subscription_expires_at) ? $request->subscription_expires_at : null;
        }
        if ($request->has('max_members') && Schema::hasColumn('gyms', 'max_members')) {
            $gym->max_members = ($request->max_members !== '' && $request->max_members !== null) ? (int)$request->max_members : null;
        }
        if ($request->has('max_trainers') && Schema::hasColumn('gyms', 'max_trainers')) {
            $gym->max_trainers = ($request->max_trainers !== '' && $request->max_trainers !== null) ? (int)$request->max_trainers : null;
        }
        if ($request->has('max_branches') && Schema::hasColumn('gyms', 'max_branches')) {
            $gym->max_branches = ($request->max_branches !== '' && $request->max_branches !== null) ? (int)$request->max_branches : null;
        }
        if ($request->has('status')) {
            $oldStatus = $gym->status;
            $gym->status = $request->status;

            // If changing to Suspended, revoke all active sessions for this facility's accounts
            if ($request->status === 'Suspended' && $oldStatus !== 'Suspended') {
                $usersQuery = User::where('role', '!=', 'superadmin')
                    ->where(function ($q) use ($gym) {
                        $q->where('gym_id', $gym->id);
                        if ($gym->owner_id) {
                            $q->orWhere('id', $gym->owner_id);
                        }
                    });
                $userIds = $usersQuery->pluck('id')->unique()->filter()->values()->toArray();
                if (!empty($userIds)) {
                    DB::table('personal_access_tokens')
                        ->where('tokenable_type', User::class)
                        ->whereIn('tokenable_id', $userIds)
                        ->delete();
                }
            }
        }
        if ($request->has('notes') && Schema::hasColumn('gyms', 'notes')) $gym->notes = $request->notes;
        if ($request->has('features') && Schema::hasColumn('gyms', 'features')) $gym->features = $request->features;

        $owner = $gym->owner;

        // If the gym has no owner, but owner details are provided, find or create the owner
        if (!$owner && ($request->filled('owner_name') || $request->filled('owner_email') || $request->filled('owner_phone'))) {
            if ($request->filled('owner_email')) {
                $owner = User::where('email', $request->owner_email)->first();
            }
            if (!$owner && $request->filled('owner_phone')) {
                $owner = User::where('phone', $request->owner_phone)->where('role', 'owner')->first();
            }
            if (!$owner) {
                $owner = User::create([
                    'name' => $request->owner_name ?: ($gym->name . ' Owner'),
                    'email' => !empty($request->owner_email) ? $request->owner_email : null,
                    'phone' => $request->owner_phone ?: ($gym->phone ?? null),
                    'password' => Hash::make($request->new_password ?: '123456'),
                    'initial_password' => Hash::make($request->new_password ?: '123456'),
                    'role' => 'owner',
                    'gym_id' => $gym->id,
                    'must_change_password' => false,
                ]);
            } else {
                $owner->gym_id = $gym->id;
                $owner->role = 'owner';
            }
            $gym->owner_id = $owner->id;
        }

        // If updating owner details
        if ($owner) {
            if ($request->filled('owner_name')) $owner->name = $request->owner_name;
            if ($request->filled('owner_phone')) {
                $owner->phone = $request->owner_phone;
                if (!$request->filled('phone')) $gym->phone = $request->owner_phone;
            }
            if ($request->has('owner_email')) {
                $owner->email = !empty($request->owner_email) ? $request->owner_email : null;
                if (!$request->filled('email')) $gym->email = $owner->email;
            }
            if ($request->filled('new_password')) {
                $owner->password = Hash::make($request->new_password);
                $owner->initial_password = Hash::make($request->new_password);
            }
            $owner->save();
        }

        // If updating password on gym entity
        if ($request->filled('new_password')) {
            $gym->initial_password = Hash::make($request->new_password);
        }

        $gym->save();

        return response()->json([
            'success' => true,
            'message' => 'Gym and Owner updated successfully!',
            'gym' => $gym->fresh('owner')
        ]);
    }

    /**
     * Impersonate / Login as Gym Owner directly from Superadmin
     */
    public function impersonateGym(Request $request, $id)
    {
        $gym = Gym::with('owner')->find($id);

        if (!$gym || !$gym->owner) {
            return response()->json([
                'success' => false,
                'message' => 'Gym owner account not found'
            ], 404);
        }

        $owner = $gym->owner;
        $token = $owner->createToken('superadmin-impersonate')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => "Switched to {$owner->name} ({$gym->name})",
            'user' => [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'role' => 'owner',
                'gym_id' => $gym->id,
                'phone' => $owner->phone,
                'avatar' => $owner->avatar,
            ],
            'gym' => $gym,
            'token' => $token,
        ]);
    }

    /**
     * Stop all access for a Gym Owner and all accounts (members, trainers, staff) created under that gym.
     * Revokes all active Sanctum tokens immediately and sets gym status to Suspended.
     */
    public function stopAccess(Request $request, $id)
    {
        $gym = Gym::with('owner')->find($id);

        if (!$gym) {
            return response()->json([
                'success' => false,
                'message' => 'Gym not found'
            ], 404);
        }

        // 1. Gather all user IDs strictly associated with this gym (owner, trainers, members, staff)
        $usersQuery = User::where('role', '!=', 'superadmin')
            ->where(function ($q) use ($gym) {
                $q->where('gym_id', $gym->id);
                if ($gym->owner_id) {
                    $q->orWhere('id', $gym->owner_id);
                }
            });

        $userIds = $usersQuery->pluck('id')->unique()->filter()->values()->toArray();

        // 2. Revoke all active Sanctum tokens immediately so sessions terminate instantly
        if (!empty($userIds)) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereIn('tokenable_id', $userIds)
                ->delete();
        }

        // 3. Mark Gym status as Suspended
        $gym->status = 'Suspended';
        $gym->save();

        return response()->json([
            'success' => true,
            'message' => "Access stopped for {$gym->name}. All active sessions terminated and login blocked for owner and all " . count($userIds) . " associated accounts.",
            'gym' => $gym->fresh('owner'),
            'affected_accounts' => count($userIds)
        ]);
    }

    /**
     * Restore access for a Gym Owner and all accounts created under that gym.
     */
    public function restoreAccess(Request $request, $id)
    {
        $gym = Gym::with('owner')->find($id);

        if (!$gym) {
            return response()->json([
                'success' => false,
                'message' => 'Gym not found'
            ], 404);
        }

        // Mark Gym status as Active
        $gym->status = 'Active';
        $gym->save();

        return response()->json([
            'success' => true,
            'message' => "Access restored successfully for {$gym->name}. Owner and all accounts can now log in.",
            'gym' => $gym->fresh('owner')
        ]);
    }

    /**
     * Update Superadmin Login Password.
     * Requires current password and two new password fields (new password and confirm new password).
     */
    public function updatePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ], [
            'current_password.required' => 'Please enter your current Superadmin password.',
            'new_password.required' => 'Please enter a new password.',
            'new_password.min' => 'New password must be at least 6 characters.',
            'new_password.confirmed' => 'New password and confirmation password do not match.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        // Resolve Superadmin user
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user && $request->filled('superadmin_id')) {
            $user = User::where('id', $request->superadmin_id)->where('role', 'superadmin')->first();
        }
        if (!$user && $request->filled('current_email')) {
            $user = User::where('email', $request->current_email)->where('role', 'superadmin')->first();
        }
        if (!$user) {
            $user = User::where('role', 'superadmin')->first();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Superadmin account not found.'
            ], 404);
        }

        // Verify current password against hash (or plain/initial fallbacks)
        $currentMatches = Hash::check($request->current_password, $user->password);
        if (!$currentMatches && Schema::hasColumn('users', 'plain_password') && !empty($user->plain_password)) {
            $currentMatches = ($user->plain_password === $request->current_password);
        }
        if (!$currentMatches && !empty($user->initial_password)) {
            $currentMatches = (Hash::check($request->current_password, $user->initial_password) || $user->initial_password === $request->current_password);
        }

        if (!$currentMatches) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect. Please verify your existing password.',
                'errors' => [
                    'current_password' => ['Current password does not match.']
                ]
            ], 400);
        }

        $user->password = Hash::make($request->new_password);
        if (Schema::hasColumn('users', 'plain_password')) {
            $user->plain_password = $request->new_password;
        }
        $user->initial_password = null;
        $user->must_change_password = false;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Superadmin password updated successfully! Please use this new password for /superadmin login.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ]);
    }

    /**
     * Update Superadmin Login Email.
     * Requires current password verification and two email fields (new email and confirm email).
     */
    public function updateEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_email' => 'required|email|max:255|confirmed',
        ], [
            'current_password.required' => 'Please enter your current Superadmin password to authorize email change.',
            'new_email.required' => 'Please enter a new email address.',
            'new_email.email' => 'Please enter a valid email address.',
            'new_email.confirmed' => 'New email and confirmation email do not match.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        // Resolve Superadmin user
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user && $request->filled('superadmin_id')) {
            $user = User::where('id', $request->superadmin_id)->where('role', 'superadmin')->first();
        }
        if (!$user && $request->filled('current_email')) {
            $user = User::where('email', $request->current_email)->where('role', 'superadmin')->first();
        }
        if (!$user) {
            $user = User::where('role', 'superadmin')->first();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Superadmin account not found.'
            ], 404);
        }

        // Verify current password against hash
        $currentMatches = Hash::check($request->current_password, $user->password);
        if (!$currentMatches && Schema::hasColumn('users', 'plain_password') && !empty($user->plain_password)) {
            $currentMatches = ($user->plain_password === $request->current_password);
        }
        if (!$currentMatches && !empty($user->initial_password)) {
            $currentMatches = (Hash::check($request->current_password, $user->initial_password) || $user->initial_password === $request->current_password);
        }

        if (!$currentMatches) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect. Identity verification failed.',
                'errors' => [
                    'current_password' => ['Current password does not match.']
                ]
            ], 400);
        }

        // Check if new email is already taken by another user
        $emailExists = User::where('email', $request->new_email)
            ->where('id', '!=', $user->id)
            ->exists();

        if ($emailExists) {
            return response()->json([
                'success' => false,
                'message' => 'This email address is already assigned to another user account.',
                'errors' => [
                    'new_email' => ['This email address is already in use.']
                ]
            ], 422);
        }

        $user->email = $request->new_email;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Superadmin email updated successfully! Please use this new email for /superadmin login.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ]);
    }

    /**
     * Delete a gym and completely purge all associated accounts, tokens, and scoped records.
     */
    public function deleteGym($id)
    {
        $gym = Gym::find($id);

        if (!$gym) {
            return response()->json(['success' => false, 'message' => 'Gym not found'], 404);
        }

        DB::beginTransaction();
        try {
            // 1. Gather all user IDs strictly associated with this gym (owner, trainers, members, managers, staff)
            // NEVER delete superadmins or users from other gyms
            $usersQuery = User::where('role', '!=', 'superadmin')
                ->where(function ($q) use ($gym) {
                    $q->where('gym_id', $gym->id);
                    if ($gym->owner_id) {
                        $q->orWhere('id', $gym->owner_id);
                    }
                });

            $userIds = $usersQuery->pluck('id')->unique()->filter()->values()->toArray();

            if (!empty($userIds)) {
                // Revoke Sanctum tokens
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->whereIn('tokenable_id', $userIds)
                    ->delete();

                // Delete related member and trainer profiles
                if (Schema::hasTable('member_profiles')) {
                    DB::table('member_profiles')->whereIn('user_id', $userIds)->delete();
                }
                if (Schema::hasTable('trainer_profiles')) {
                    DB::table('trainer_profiles')->whereIn('user_id', $userIds)->delete();
                }

                // Delete all collected users
                User::whereIn('id', $userIds)->delete();
            }

            // 2. Explicitly purge any tables that reference gym_id to ensure complete cleanup
            $gymScopedTables = [
                'attendances',
                'invoices',
                'plans',
                'gym_classes',
                'equipment',
                'enquiries',
                'expenses',
                'revenue_billings',
                'pt_sessions',
                'pt_plans',
                'recovery_plans',
                'shifts',
                'leave_requests',
                'leave_balances',
                'whatsapp_templates',
                'whatsapp_logs',
                'consent_forms',
                'membership_freezes',
                'membership_transfers',
                'payrolls',
                'products',
                'commissions',
                'entry_approvals',
                'trainer_reviews'
            ];

            foreach ($gymScopedTables as $tableName) {
                if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'gym_id')) {
                    DB::table($tableName)->where('gym_id', $gym->id)->delete();
                }
            }

            // 3. Delete the gym entity itself
            $gym->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Gym and all associated accounts purged successfully'
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete gym: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get list of all SaaS Plans.
     */
    public function indexPlans(Request $request)
    {
        $plans = SaasPlan::orderByRaw("FIELD(tier, 'Bronze', 'Silver', 'Gold', 'Platinum')")
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'plans' => $plans
        ]);
    }

    /**
     * Create a brand-new SaaS Plan.
     */
    public function storePlan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'tier' => 'required|string|max:100',
            'monthly_price' => 'nullable',
            'annual_price' => 'nullable',
            'max_members' => 'nullable',
            'max_trainers' => 'nullable',
            'max_branches' => 'nullable',
            'features' => 'nullable|array',
            'description' => 'nullable|string',
            'badge_color' => 'nullable|string|max:50',
            'is_popular' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $slug = \Illuminate\Support\Str::slug($request->name);
        $originalSlug = $slug;
        $counter = 1;
        while (SaasPlan::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        $plan = SaasPlan::create([
            'slug' => $slug,
            'name' => $request->name,
            'tier' => $request->tier,
            'monthly_price' => ($request->filled('monthly_price') && $request->monthly_price !== '') ? (float)$request->monthly_price : null,
            'annual_price' => ($request->filled('annual_price') && $request->annual_price !== '') ? (float)$request->annual_price : null,
            'max_members' => ($request->filled('max_members') && $request->max_members !== '') ? (int)$request->max_members : null,
            'max_trainers' => ($request->filled('max_trainers') && $request->max_trainers !== '') ? (int)$request->max_trainers : null,
            'max_branches' => ($request->filled('max_branches') && $request->max_branches !== '') ? (int)$request->max_branches : 1,
            'features' => $request->features ?: [],
            'description' => $request->description ?: null,
            'badge_color' => $request->badge_color ?: 'indigo',
            'is_popular' => (bool)$request->is_popular,
            'is_active' => $request->has('is_active') ? (bool)$request->is_active : true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'SaaS subscription plan created successfully',
            'plan' => $plan
        ], 201);
    }

    /**
     * Update an existing SaaS Plan.
     */
    public function updatePlan(Request $request, $id)
    {
        $plan = SaasPlan::find($id);
        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'tier' => 'nullable|string|max:100',
            'monthly_price' => 'nullable',
            'annual_price' => 'nullable',
            'max_members' => 'nullable',
            'max_trainers' => 'nullable',
            'max_branches' => 'nullable',
            'features' => 'nullable|array',
            'description' => 'nullable|string',
            'badge_color' => 'nullable|string|max:50',
            'is_popular' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->has('name')) $plan->name = $request->name;
        if ($request->has('tier')) $plan->tier = $request->tier;
        if ($request->has('monthly_price')) {
            $plan->monthly_price = ($request->monthly_price !== null && $request->monthly_price !== '') ? (float)$request->monthly_price : null;
        }
        if ($request->has('annual_price')) {
            $plan->annual_price = ($request->annual_price !== null && $request->annual_price !== '') ? (float)$request->annual_price : null;
        }
        if ($request->has('max_members')) {
            $plan->max_members = ($request->max_members !== null && $request->max_members !== '') ? (int)$request->max_members : null;
        }
        if ($request->has('max_trainers')) {
            $plan->max_trainers = ($request->max_trainers !== null && $request->max_trainers !== '') ? (int)$request->max_trainers : null;
        }
        if ($request->has('max_branches')) {
            $plan->max_branches = ($request->max_branches !== null && $request->max_branches !== '') ? (int)$request->max_branches : 1;
        }
        if ($request->has('features')) $plan->features = $request->features ?: [];
        if ($request->has('description')) $plan->description = $request->description;
        if ($request->has('badge_color')) $plan->badge_color = $request->badge_color;
        if ($request->has('is_popular')) $plan->is_popular = (bool)$request->is_popular;
        if ($request->has('is_active')) $plan->is_active = (bool)$request->is_active;

        $plan->save();

        return response()->json([
            'success' => true,
            'message' => 'Plan updated successfully',
            'plan' => $plan
        ]);
    }

    /**
     * Delete a SaaS Plan.
     */
    public function deletePlan($id)
    {
        $plan = SaasPlan::find($id);
        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found'
            ], 404);
        }

        $plan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Plan removed successfully'
        ]);
    }

    /**
     * List all Platform Pages (Privacy Policy, Terms & Conditions, Help & Support).
     */
    public function indexPages()
    {
        $pages = PlatformPage::all()->keyBy('slug');

        return response()->json([
            'success' => true,
            'pages' => $pages
        ]);
    }

    /**
     * Show a single Platform Page by slug.
     */
    public function showPage($slug)
    {
        $page = PlatformPage::where('slug', $slug)->first();
        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Page not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'page' => $page
        ]);
    }

    /**
     * Update a Platform Page.
     */
    public function updatePage(Request $request, $slug)
    {
        $page = PlatformPage::where('slug', $slug)->first();
        if (!$page) {
            $page = new PlatformPage();
            $page->slug = $slug;
            $page->title = $request->title ?: ucwords(str_replace('-', ' ', $slug));
        }

        if ($request->has('title')) $page->title = $request->title;
        if ($request->has('content')) $page->content = $request->content;
        if ($request->has('metadata')) $page->metadata = $request->metadata;

        $page->save();

        return response()->json([
            'success' => true,
            'message' => "Page '{$page->title}' updated successfully",
            'page' => $page
        ]);
    }

    /**
     * Get Master Platform WhatsApp Automation & Gateway settings
     */
    public function getWhatsAppSettings(Request $request)
    {
        $settings = \App\Models\WhatsAppSetting::whereNull('gym_id')->first()
            ?: \App\Models\WhatsAppSetting::first();

        if (!$settings) {
            $settings = \App\Models\WhatsAppSetting::create([
                'gym_id'             => null,
                'provider'           => 'msg91',
                'is_enabled'         => true,
                'instance_id'        => null,
                'api_token'          => null,
                'phone_number_id'    => null,
                'api_url'            => null,
                'auto_send_welcome'  => true,
                'auto_send_birthday' => true,
                'auto_send_expiry'   => true,
                'auto_send_dues'     => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => $settings,
        ]);
    }

    /**
     * Update Master Platform WhatsApp Automation & Gateway settings
     */
    public function updateWhatsAppSettings(Request $request)
    {
        $settings = \App\Models\WhatsAppSetting::whereNull('gym_id')->first()
            ?: \App\Models\WhatsAppSetting::first();

        if (!$settings) {
            $settings = new \App\Models\WhatsAppSetting();
            $settings->gym_id = null;
        }

        $validated = $request->validate([
            'provider'           => 'required|string|in:msg91,ultramsg,meta,custom,none',
            'is_enabled'         => 'nullable|boolean',
            'instance_id'        => 'nullable|string|max:255',
            'api_token'          => 'nullable|string',
            'phone_number_id'    => 'nullable|string|max:255',
            'api_url'            => 'nullable|string|max:500',
            'auto_send_welcome'  => 'nullable|boolean',
            'auto_send_birthday' => 'nullable|boolean',
            'auto_send_expiry'   => 'nullable|boolean',
            'auto_send_dues'     => 'nullable|boolean',
        ]);

        $settings->fill($validated);
        $settings->gym_id = null;
        $settings->save();

        // Also update existing gym rows so they inherit master settings
        \App\Models\WhatsAppSetting::whereNotNull('gym_id')->update([
            'provider'           => $settings->provider,
            'is_enabled'         => $settings->is_enabled,
            'instance_id'        => $settings->instance_id,
            'api_token'          => $settings->api_token,
            'phone_number_id'    => $settings->phone_number_id,
            'api_url'            => $settings->api_url,
            'auto_send_welcome'  => $settings->auto_send_welcome,
            'auto_send_birthday' => $settings->auto_send_birthday,
            'auto_send_expiry'   => $settings->auto_send_expiry,
            'auto_send_dues'     => $settings->auto_send_dues,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Platform WhatsApp Automation & Gateway settings saved successfully by Superadmin!',
            'data'    => $settings,
        ]);
    }

    /**
     * Send a live test WhatsApp message from Superadmin
     */
    public function testWhatsAppMessage(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        $phone = $request->input('phone');
        $testMsg = "Hello from *ArchFit Superadmin*! 🚀\n\nThis is a test notification confirming that the platform-wide WhatsApp gateway is fully active and connected!";

        $result = \App\Services\WhatsAppNotificationService::dispatchViaGateway($phone, $testMsg, null);

        return response()->json([
            'success' => $result['success'] ?? true,
            'message' => ($result['status'] ?? '') === 'sent'
                ? 'Test WhatsApp message dispatched successfully via gateway!'
                : 'Test WhatsApp message processed.',
            'result'  => $result,
        ]);
    }
}
