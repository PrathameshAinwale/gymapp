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
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'logo' => 'nullable|string',
            'website' => 'nullable|string|max:255',
            'gst_number' => 'nullable|string|max:50',
            'subscription_expires_at' => 'nullable|date',
            'notes' => 'nullable|string',
            'features' => 'nullable|array',
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
            $tier = $request->package_tier ?? $request->gym_package ?? 'Basic';
            $billingCycle = $request->billing_cycle ?? 'Monthly';
            $amount = $request->has('package_amount') && $request->package_amount !== null
                ? $request->package_amount
                : ($billingCycle === 'Annual' ? 9999.00 : 999.00);

            // Default features based on tier if not provided
            $features = $request->features;
            if (empty($features)) {
                if ($tier === 'Platinum') {
                    $features = ['enquiry', 'members', 'plans', 'attendance', 'whatsapp', 'pos', 'finance', 'trainers', 'staff', 'biometric', 'mobile_app', 'multi_branch', 'white_label'];
                } elseif ($tier === 'Gold') {
                    $features = ['enquiry', 'members', 'plans', 'attendance', 'whatsapp', 'pos', 'finance', 'trainers', 'staff', 'biometric'];
                } else {
                    $features = ['enquiry', 'members', 'plans', 'attendance'];
                }
            }

            // 2. Create the Gym entity
            $gym = Gym::create([
                'name' => $request->gym_name,
                'owner_id' => $owner->id,
                'tagline' => $request->tagline ?: null,
                'logo' => $request->logo ?: null,
                'address' => $request->gym_address ?: ($request->address ?: null),
                'city' => $request->gym_city ?: null,
                'state' => $request->state ?: null,
                'pincode' => $request->pincode ?: null,
                'phone' => $request->gym_phone ?: ($request->phone ?: $request->owner_phone),
                'email' => $request->gym_email ?: ($request->email ?: $request->owner_email),
                'website' => $request->website ?: null,
                'operating_hours' => $request->operating_hours ?: ($request->operatingHours ?: null),
                'currency' => $request->currency ?: '₹',
                'gst_number' => $request->gst_number ?: null,
                'package' => $tier,
                'package_tier' => $tier,
                'billing_cycle' => $billingCycle,
                'package_amount' => $amount,
                'subscription_expires_at' => $request->subscription_expires_at ?: now()->addMonths($billingCycle === 'Annual' ? 12 : 1),
                'max_members' => $request->max_members ?? 250,
                'max_trainers' => $request->max_trainers ?? 7,
                'max_branches' => $request->max_branches ?? 1,
                'status' => 'Active',
                'notes' => $request->notes ?: null,
                'features' => $features,
                'initial_password' => Hash::make($request->owner_password),
            ]);

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
        if ($request->has('logo')) $gym->logo = $request->logo;
        if ($request->has('address') || $request->has('gym_address')) {
            $gym->address = $request->address ?? $request->gym_address;
        }
        if ($request->has('city') || $request->has('gym_city')) {
            $gym->city = $request->city ?? $request->gym_city;
        }
        if ($request->has('state')) $gym->state = $request->state;
        if ($request->has('pincode')) $gym->pincode = $request->pincode;
        if ($request->has('phone') || $request->has('gym_phone')) {
            $gym->phone = $request->phone ?? $request->gym_phone;
        }
        if ($request->has('email') || $request->has('gym_email')) {
            $gym->email = $request->email ?? $request->gym_email;
        }
        if ($request->has('website')) $gym->website = $request->website;
        if ($request->has('operating_hours') || $request->has('operatingHours')) {
            $gym->operating_hours = $request->operating_hours ?? $request->operatingHours;
        }
        if ($request->has('currency')) $gym->currency = $request->currency;
        if ($request->has('gst_number')) $gym->gst_number = $request->gst_number;
        if ($request->has('package_tier') || $request->has('package')) {
            $tier = $request->package_tier ?? $request->package;
            $gym->package_tier = $tier;
            $gym->package = $tier;
        }
        if ($request->has('billing_cycle')) $gym->billing_cycle = $request->billing_cycle;
        if ($request->has('package_amount')) $gym->package_amount = $request->package_amount;
        if ($request->has('subscription_expires_at')) $gym->subscription_expires_at = $request->subscription_expires_at;
        if ($request->has('max_members')) $gym->max_members = $request->max_members;
        if ($request->has('max_trainers')) $gym->max_trainers = $request->max_trainers;
        if ($request->has('max_branches')) $gym->max_branches = $request->max_branches;
        if ($request->has('status')) $gym->status = $request->status;
        if ($request->has('notes')) $gym->notes = $request->notes;
        if ($request->has('features')) $gym->features = $request->features;

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
                if (!$request->filled('phone')) $gym->phone = $request->owner_phone;
            }
            if ($request->filled('owner_email')) {
                $gym->owner->email = $request->owner_email;
                if (!$request->filled('email')) $gym->email = $request->owner_email;
            }
            $gym->owner->save();
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
