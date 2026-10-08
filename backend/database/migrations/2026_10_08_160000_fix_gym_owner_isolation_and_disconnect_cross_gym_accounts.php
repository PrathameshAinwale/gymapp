<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\Gym;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Enforce strict gym owner isolation and disconnect any owner from gyms they do not own.
     */
    public function up(): void
    {
        try {
            // 1. Fix Prathamesh's dedicated gym facility if user exists
            $prathameshUser = User::where('email', 'prathamesh@gmail.com')
                ->orWhere('name', 'prathamesh')
                ->orWhere('phone', '8767227125')
                ->first();

            if ($prathameshUser) {
                $prathameshUser->role = 'owner';
                // Check if Prathamesh already owns a gym
                $pGym = Gym::where('owner_id', $prathameshUser->id)->first();
                if (!$pGym) {
                    $pGym = Gym::create([
                        'name' => 'prathamesh gym',
                        'owner_id' => $prathameshUser->id,
                        'tagline' => 'High-Performance Athletic Club',
                        'address' => 'Gym Facility',
                        'city' => 'Nashik',
                        'phone' => $prathameshUser->phone ?: '8767227125',
                        'email' => $prathameshUser->email ?: 'prathamesh@gmail.com',
                        'package' => 'Silver',
                        'package_tier' => 'Silver',
                        'billing_cycle' => 'Annual',
                        'package_amount' => 15000.00,
                        'max_members' => 500,
                        'max_branches' => 1,
                        'status' => 'Active',
                        'currency' => '₹',
                    ]);
                }

                $prathameshUser->gym_id = $pGym->id;
                $prathameshUser->save();
            }

            // 2. Scan all users with role 'owner' and ensure they are NOT hooked to another owner's gym
            $owners = User::where('role', 'owner')->get();
            foreach ($owners as $owner) {
                // Find gym owned by this user
                $ownedGym = Gym::where('owner_id', $owner->id)->first();

                if ($ownedGym) {
                    if ($owner->gym_id !== $ownedGym->id) {
                        $owner->gym_id = $ownedGym->id;
                        $owner->save();
                    }
                } else {
                    // This owner has no gym of their own.
                    // If their current gym_id belongs to another owner, disconnect them and provision their own gym.
                    $currentGym = $owner->gym_id ? Gym::find($owner->gym_id) : null;
                    if ($currentGym && $currentGym->owner_id && $currentGym->owner_id !== $owner->id) {
                        // Current gym belongs to another person! Provision dedicated gym for this owner
                        $newGym = Gym::create([
                            'name' => ($owner->name ? $owner->name . "'s Gym" : 'Club Facility'),
                            'owner_id' => $owner->id,
                            'phone' => $owner->phone,
                            'email' => $owner->email,
                            'package' => 'Bronze',
                            'package_tier' => 'Bronze',
                            'billing_cycle' => 'Annual',
                            'status' => 'Active',
                            'currency' => '₹',
                        ]);
                        $owner->gym_id = $newGym->id;
                        $owner->save();
                    }
                }
            }

            // 3. Invalidate settings cache
            Cache::flush();
        } catch (\Throwable $e) {
            // Defensive execution for production compatibility
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op for data isolation fix
    }
};
