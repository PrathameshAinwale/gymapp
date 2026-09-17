<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Gym;
use Illuminate\Support\Facades\Hash;

class SuperadminSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create or Update Superadmin
        $superadmin = User::updateOrCreate(
            ['email' => 'archdevops360@gmail.com'],
            [
                'name' => 'Arch DevOps Superadmin',
                'password' => Hash::make('111111'),
                'initial_password' => Hash::make('111111'),
                'role' => 'superadmin',
                'phone' => '+91 99999 88888',
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            ]
        );

        // 2. Create Initial Gym for existing Owner
        $owner = User::where('role', 'owner')->first();
        if ($owner) {
            $gym = Gym::firstOrCreate(
                ['id' => 1],
                [
                    'name' => 'PULSE FIT ATHLETIC CLUB',
                    'owner_id' => $owner->id,
                    'tagline' => 'Elite High-Performance Training Ground',
                    'address' => 'Plot 42, Bandra West',
                    'city' => 'Mumbai',
                    'phone' => $owner->phone ?? '+91 98201 54321',
                    'email' => $owner->email ?? 'owner@pulsefit.in',
                    'package' => 'Enterprise Platinum',
                    'status' => 'Active',
                    'initial_password' => Hash::make('admin123'),
                ]
            );

            // Assign all existing users to Gym 1
            User::whereNull('gym_id')->where('role', '!=', 'superadmin')->update(['gym_id' => $gym->id]);
            $owner->initial_password = Hash::make('admin123');
            $owner->gym_id = $gym->id;
            $owner->save();
        }
    }
}
