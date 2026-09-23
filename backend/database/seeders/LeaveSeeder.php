<?php

namespace Database\Seeders;

use App\Models\Gym;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class LeaveSeeder extends Seeder
{
    public function run(): void
    {
        $gym = Gym::first() ?: Gym::create([
            'id'      => 1,
            'name'    => 'ARCHFIT Athletic Club',
            'email'   => 'contact@archfit.in',
            'phone'   => '+91 98201 54321',
            'address' => 'Plot 42, Hiranandani Business Park, Powai, Mumbai',
            'city'    => 'Mumbai',
            'status'  => 'Active',
        ]);

        $gymId = $gym->id;

        // Ensure Staff and Trainers exist
        $staffMembers = [
            [
                'name'      => 'Coach Alex Rivers',
                'email'     => 'coach.alex@archfit.in',
                'role'      => 'trainer',
                'phone'     => '+91 98201 11223',
                'avatar'    => 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&auto=format&fit=crop&q=80',
                'specialty' => 'Hypertrophy & Powerlifting',
                'salary'    => 65000,
            ],
            [
                'name'      => 'Coach Priya Nair',
                'email'     => 'priya.nair@archfit.in',
                'role'      => 'trainer',
                'phone'     => '+91 98201 22334',
                'avatar'    => 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&auto=format&fit=crop&q=80',
                'specialty' => 'HIIT, Zumba & Core Conditioning',
                'salary'    => 55000,
            ],
            [
                'name'      => 'Coach Marcus Thorne',
                'email'     => 'marcus.t@archfit.in',
                'role'      => 'trainer',
                'phone'     => '+91 98201 33445',
                'avatar'    => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
                'specialty' => 'Functional Mobility & Rehab',
                'salary'    => 60000,
            ],
            [
                'name'      => 'Vikram Patel',
                'email'     => 'vikram.manager@archfit.in',
                'role'      => 'manager',
                'phone'     => '+91 98201 44556',
                'avatar'    => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
                'specialty' => 'Operations & Floor Management',
                'salary'    => 75000,
            ],
            [
                'name'      => 'Neha Kulkarni',
                'email'     => 'neha.accounts@archfit.in',
                'role'      => 'accounts',
                'phone'     => '+91 98201 55667',
                'avatar'    => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
                'specialty' => 'Finance, GST & Payroll',
                'salary'    => 58000,
            ],
        ];

        $users = [];
        foreach ($staffMembers as $s) {
            $user = User::firstOrCreate(
                ['email' => $s['email']],
                [
                    'name'           => $s['name'],
                    'role'           => $s['role'],
                    'gym_id'         => $gymId,
                    'password'       => Hash::make('password123'),
                    'plain_password' => 'password123',
                    'phone'          => $s['phone'],
                    'avatar'         => $s['avatar'],
                ]
            );

            if ($s['role'] === 'trainer') {
                TrainerProfile::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'specialty'      => $s['specialty'],
                        'experience'     => '6+ Years',
                        'rating'         => 4.9,
                        'monthly_salary' => $s['salary'],
                        'bio'            => 'Senior elite fitness specialist at ArchFit.',
                        'certifications' => ['CSCS', 'NASM-CPT'],
                    ]
                );
            }

            $users[$s['email']] = $user;

            // Seed Leave Balances for 2026
            $quotas = [
                'Privilege Leave' => ['allocated' => 12.0, 'used' => 2.0],
                'Sick Leave'      => ['allocated' => 10.0, 'used' => 1.0],
                'Casual Leave'    => ['allocated' => 8.0,  'used' => 0.0],
            ];

            foreach ($quotas as $type => $q) {
                LeaveBalance::updateOrCreate(
                    [
                        'user_id'    => $user->id,
                        'leave_type' => $type,
                        'year'       => 2026,
                    ],
                    [
                        'gym_id'         => $gymId,
                        'user_name'      => $user->name,
                        'role'           => $user->role,
                        'allocated_days' => $q['allocated'],
                        'used_days'      => $q['used'],
                        'remaining_days' => $q['allocated'] - $q['used'],
                    ]
                );
            }
        }

        // Also ensure leave balances for any existing owners/superadmins
        $existingAdmins = User::whereIn('role', ['owner', 'superadmin'])->get();
        foreach ($existingAdmins as $adm) {
            foreach (['Privilege Leave' => 12.0, 'Sick Leave' => 10.0, 'Casual Leave' => 8.0] as $type => $days) {
                LeaveBalance::firstOrCreate(
                    [
                        'user_id'    => $adm->id,
                        'leave_type' => $type,
                        'year'       => 2026,
                    ],
                    [
                        'gym_id'         => $gymId,
                        'user_name'      => $adm->name,
                        'role'           => $adm->role,
                        'allocated_days' => $days,
                        'used_days'      => 0,
                        'remaining_days' => $days,
                    ]
                );
            }
        }

        // Seed Sample Leave Requests
        $alex = $users['coach.alex@archfit.in'] ?? null;
        $priya = $users['priya.nair@archfit.in'] ?? null;
        $marcus = $users['marcus.t@archfit.in'] ?? null;
        $vikram = $users['vikram.manager@archfit.in'] ?? null;

        if ($alex) {
            // 1. Pending Request from Coach Alex
            LeaveRequest::updateOrCreate(
                [
                    'user_id'    => $alex->id,
                    'start_date' => Carbon::now()->addDays(2)->toDateString(),
                ],
                [
                    'gym_id'      => $gymId,
                    'user_name'   => $alex->name,
                    'user_avatar' => $alex->avatar,
                    'role'        => $alex->role,
                    'leave_type'  => 'Privilege Leave',
                    'start_date'  => Carbon::now()->addDays(2)->toDateString(),
                    'end_date'    => Carbon::now()->addDays(4)->toDateString(),
                    'days_count'  => 3.0,
                    'reason'      => 'Attending National Strength & Conditioning Expo in Delhi.',
                    'status'      => 'Pending',
                ]
            );

            // 2. Approved Past Request from Coach Alex
            LeaveRequest::updateOrCreate(
                [
                    'user_id'    => $alex->id,
                    'start_date' => Carbon::now()->subDays(15)->toDateString(),
                ],
                [
                    'gym_id'       => $gymId,
                    'user_name'    => $alex->name,
                    'user_avatar'  => $alex->avatar,
                    'role'         => $alex->role,
                    'leave_type'   => 'Sick Leave',
                    'start_date'   => Carbon::now()->subDays(15)->toDateString(),
                    'end_date'     => Carbon::now()->subDays(14)->toDateString(),
                    'days_count'   => 1.0,
                    'reason'       => 'Severe viral flu & fever. Physician advised rest.',
                    'status'       => 'Approved',
                    'action_by'    => 'Owner',
                    'action_notes' => 'Medical certificate verified. Approved.',
                    'action_date'  => Carbon::now()->subDays(15),
                ]
            );
        }

        if ($priya) {
            // 3. Pending Request from Coach Priya
            LeaveRequest::updateOrCreate(
                [
                    'user_id'    => $priya->id,
                    'start_date' => Carbon::now()->addDays(5)->toDateString(),
                ],
                [
                    'gym_id'      => $gymId,
                    'user_name'   => $priya->name,
                    'user_avatar' => $priya->avatar,
                    'role'        => $priya->role,
                    'leave_type'  => 'Casual Leave',
                    'start_date'  => Carbon::now()->addDays(5)->toDateString(),
                    'end_date'    => Carbon::now()->addDays(6)->toDateString(),
                    'days_count'  => 2.0,
                    'reason'      => 'Family wedding celebration in Pune.',
                    'status'      => 'Pending',
                ]
            );
        }

        if ($vikram) {
            // 4. Approved Request from Manager Vikram
            LeaveRequest::updateOrCreate(
                [
                    'user_id'    => $vikram->id,
                    'start_date' => Carbon::now()->subDays(5)->toDateString(),
                ],
                [
                    'gym_id'       => $gymId,
                    'user_name'    => $vikram->name,
                    'user_avatar'  => $vikram->avatar,
                    'role'         => $vikram->role,
                    'leave_type'   => 'Privilege Leave',
                    'start_date'   => Carbon::now()->subDays(5)->toDateString(),
                    'end_date'     => Carbon::now()->subDays(4)->toDateString(),
                    'days_count'   => 2.0,
                    'reason'       => 'Personal family commitments.',
                    'status'       => 'Approved',
                    'action_by'    => 'Owner',
                    'action_notes' => 'Duty delegated to assistant manager.',
                    'action_date'  => Carbon::now()->subDays(6),
                ]
            );
        }
    }
}
