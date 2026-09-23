<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
                'phone' => $gym->phone ?? $owner?->phone ?? '',
                'email' => $gym->email ?? $owner?->email ?? '',
                'operatingHours' => $gym->operating_hours ?? '',
                'operating_hours' => $gym->operating_hours ?? '',
                'currency' => $gym->currency ?? '₹',
                'package' => $gym->package_tier ?? $gym->package ?? 'Growth',
                'packageTier' => $gym->package_tier ?? $gym->package ?? 'Growth',
                'billingCycle' => $gym->billing_cycle ?? 'Monthly',
                'packageAmount' => (float) ($gym->package_amount ?? 1799.00),
                'maxMembers' => $gym->max_members ?? 250,
                'maxTrainers' => $gym->max_trainers ?? 7,
                'maxBranches' => $gym->max_branches ?? 1,
                'status' => $gym->status ?? 'Active',
                'initialPassword' => '••••••••',
                'createdAt' => $gym->created_at?->format('Y-m-d'),
                'owner' => [
                    'id' => $owner?->id,
                    'name' => $owner?->name ?? 'Unassigned',
                    'email' => $owner?->email ?? $gym->email,
                    'phone' => $owner?->phone ?? $gym->phone,
                    'avatar' => $owner?->avatar,
                    'role' => 'owner',
                    'loginPassword' => '••••••••',
                ],
                'accounts' => [
                    'members' => $membersCount,
                    'trainers' => $trainersCount,
                    'owners' => 1,
                    'total' => $membersCount + $trainersCount,
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
            'owner_email' => 'required|email|unique:users,email',
            'owner_password' => 'required|string|min:4',
            'owner_phone' => 'nullable|string|max:50',
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
                'email' => $request->owner_email,
                'password' => Hash::make($request->owner_password),
                'initial_password' => Hash::make($request->owner_password),
                'must_change_password' => true,
                'phone' => $request->owner_phone,
                'role' => 'owner',
                'avatar' => $request->avatar ?? null,
            ]);

            // Determine package details
            $tier = $request->package_tier ?? $request->gym_package ?? 'Growth';
            $billingCycle = $request->billing_cycle ?? 'Monthly';
            $amount = $request->has('package_amount') && $request->package_amount !== null
                ? $request->package_amount
                : ($billingCycle === 'Annual' ? 17999.00 : 1799.00);

            // 2. Create the Gym entity
            $gym = Gym::create([
                'name' => $request->gym_name,
                'owner_id' => $owner->id,
                'tagline' => $request->tagline ?: null,
                'address' => $request->gym_address ?: ($request->address ?: null),
                'city' => $request->gym_city ?: null,
                'phone' => $request->gym_phone ?: ($request->phone ?: $request->owner_phone),
                'email' => $request->gym_email ?: ($request->email ?: $request->owner_email),
                'operating_hours' => $request->operating_hours ?: ($request->operatingHours ?: null),
                'currency' => $request->currency ?: '₹',
                'package' => $tier,
                'package_tier' => $tier,
                'billing_cycle' => $billingCycle,
                'package_amount' => $amount,
                'max_members' => $request->max_members ?? 250,
                'max_trainers' => $request->max_trainers ?? 7,
                'max_branches' => $request->max_branches ?? 1,
                'status' => 'Active',
                'initial_password' => Hash::make($request->owner_password),
            ]);

            // 3. Link owner's gym_id
            $owner->gym_id = $gym->id;
            $owner->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Gym and Owner provisioned successfully',
                'gym' => [
                    'id' => $gym->id,
                    'name' => $gym->name,
                    'tagline' => $gym->tagline,
                    'address' => $gym->address,
                    'city' => $gym->city,
                    'phone' => $gym->phone,
                    'email' => $gym->email,
                    'package' => $gym->package_tier,
                    'packageTier' => $gym->package_tier,
                    'billingCycle' => $gym->billing_cycle,
                    'packageAmount' => (float) $gym->package_amount,
                    'maxMembers' => $gym->max_members,
                    'maxTrainers' => $gym->max_trainers,
                    'maxBranches' => $gym->max_branches,
                    'status' => $gym->status,
                    'initialPassword' => '••••••••',
                    'createdAt' => $gym->created_at?->format('Y-m-d'),
                    'owner' => [
                        'id' => $owner->id,
                        'name' => $owner->name,
                        'email' => $owner->email,
                        'phone' => $owner->phone,
                        'loginPassword' => '••••••••',
                    ],
                    'accounts' => [
                        'members' => 0,
                        'trainers' => 0,
                        'owners' => 1,
                        'total' => 0,
                    ]
                ]
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
     * Update Gym details, status, or credentials.
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
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'operating_hours' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:10',
            'package' => 'nullable|string|max:100',
            'package_tier' => 'nullable|string|max:100',
            'billing_cycle' => 'nullable|string|in:Monthly,Annual,Custom',
            'package_amount' => 'nullable|numeric|min:0',
            'max_members' => 'nullable|integer',
            'max_trainers' => 'nullable|integer',
            'max_branches' => 'nullable|integer',
            'status' => 'nullable|string|in:Active,Suspended,Trial',
            'new_password' => 'nullable|string|min:4',
            'owner_name' => 'nullable|string|max:255',
            'owner_phone' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->has('name')) $gym->name = $request->name;
        if ($request->has('tagline')) $gym->tagline = $request->tagline;
        if ($request->has('address') || $request->has('gym_address')) {
            $gym->address = $request->address ?? $request->gym_address;
        }
        if ($request->has('city') || $request->has('gym_city')) {
            $gym->city = $request->city ?? $request->gym_city;
        }
        if ($request->has('phone') || $request->has('gym_phone')) {
            $gym->phone = $request->phone ?? $request->gym_phone;
        }
        if ($request->has('email') || $request->has('gym_email')) {
            $gym->email = $request->email ?? $request->gym_email;
        }
        if ($request->has('operating_hours') || $request->has('operatingHours')) {
            $gym->operating_hours = $request->operating_hours ?? $request->operatingHours;
        }
        if ($request->has('currency')) $gym->currency = $request->currency;
        if ($request->has('package')) $gym->package = $request->package;
        if ($request->has('package_tier')) {
            $gym->package_tier = $request->package_tier;
            $gym->package = $request->package_tier;
        }
        if ($request->has('billing_cycle')) $gym->billing_cycle = $request->billing_cycle;
        if ($request->has('package_amount')) $gym->package_amount = $request->package_amount;
        if ($request->has('max_members')) $gym->max_members = $request->max_members;
        if ($request->has('max_trainers')) $gym->max_trainers = $request->max_trainers;
        if ($request->has('max_branches')) $gym->max_branches = $request->max_branches;
        if ($request->has('status')) $gym->status = $request->status;

        // If updating password
        if ($request->filled('new_password')) {
            $gym->initial_password = Hash::make($request->new_password);
            if ($gym->owner) {
                $gym->owner->password = Hash::make($request->new_password);
                $gym->owner->initial_password = Hash::make($request->new_password);
                $gym->owner->save();
            }
        }

        // If updating owner details
        if ($gym->owner) {
            if ($request->filled('owner_name')) $gym->owner->name = $request->owner_name;
            if ($request->filled('owner_phone')) {
                $gym->owner->phone = $request->owner_phone;
                $gym->phone = $request->owner_phone;
            }
            $gym->owner->save();
        }

        $gym->save();

        return response()->json([
            'success' => true,
            'message' => 'Gym updated successfully!',
            'gym' => $gym->fresh('owner')
        ]);
    }

    /**
     * Delete a gym and optionally its owner account.
     */
    public function deleteGym($id)
    {
        $gym = Gym::find($id);

        if (!$gym) {
            return response()->json(['success' => false, 'message' => 'Gym not found'], 404);
        }

        // Delete gym owner
        if ($gym->owner_id) {
            User::where('id', $gym->owner_id)->delete();
        }

        $gym->delete();

        return response()->json([
            'success' => true,
            'message' => 'Gym and owner account deleted successfully'
        ]);
    }
}
