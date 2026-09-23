<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Gym;
use App\Models\Plan;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\GymClass;
use App\Models\Attendance;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\Commission;
use App\Models\Payroll;
use App\Models\Enquiry;
use App\Models\Equipment;
use App\Models\Product;
use App\Models\PtPlan;
use App\Models\RecoveryPlan;
use App\Models\MembershipFreeze;
use App\Models\PtSession;
use App\Models\PtSessionLog;
use App\Models\TrainerReview;
use App\Models\AdvanceRequest;
use App\Models\FinancialTransaction;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class PlatformUpgradeSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0');
        }
        $this->command->info('🏋️  Seeding PULSEFIT Platform Upgrade Data...');


        // ─── GYM ────────────────────────────────────────────
        $gym = Gym::firstOrCreate(['id' => 1], [
            'name'        => 'PULSE FIT Athletic Club',
            'owner_name'  => 'Vikramaditya Singhania',
            'email'       => 'owner@pulsefit.in',
            'phone'       => '9876543210',
            'address'     => '14, Fitness Avenue, Andheri West, Mumbai 400053',
            'city'        => 'Mumbai',
            'established' => '2019',
            'status'      => 'Active',
        ]);

        // ─── USERS ──────────────────────────────────────────
        $superadmin = User::firstOrCreate(['email' => 'owner@pulsefit.in'], [
            'name'                => 'Vikramaditya Singhania',
            'password'            => Hash::make('admin123'),
            'role'                => 'superadmin',
            'gym_id'              => $gym->id,
            'avatar'              => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
            'phone'               => '9876543210',
            'must_change_password' => false,
        ]);

        $trainer2 = User::firstOrCreate(['email' => 'elena@pulsefit.in'], [
            'name'                => 'Elena Rostova',
            'password'            => Hash::make('trainer123'),
            'role'                => 'trainer',
            'gym_id'              => $gym->id,
            'avatar'              => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
            'phone'               => '9456789012',
            'must_change_password' => false,
        ]);

        $member1 = User::firstOrCreate(['email' => 'member@pulsefit.in'], [
            'name'                => 'Aarav Sharma',
            'password'            => Hash::make('member123'),
            'role'                => 'member',
            'gym_id'              => $gym->id,
            'avatar'              => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
            'phone'               => '9567890123',
            'must_change_password' => false,
        ]);

        $member2 = User::firstOrCreate(['email' => 'priya@pulsefit.in'], [
            'name'                => 'Priya Patel',
            'password'            => Hash::make('member123'),
            'role'                => 'member',
            'gym_id'              => $gym->id,
            'avatar'              => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
            'phone'               => '9678901234',
            'must_change_password' => false,
        ]);

        $member3 = User::firstOrCreate(['email' => 'rohan@pulsefit.in'], [
            'name'                => 'Rohan Verma',
            'password'            => Hash::make('member123'),
            'role'                => 'member',
            'gym_id'              => $gym->id,
            'avatar'              => 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&auto=format&fit=crop&q=80',
            'phone'               => '9789012345',
            'must_change_password' => false,
        ]);

        $member4 = User::firstOrCreate(['email' => 'sneha@pulsefit.in'], [
            'name'                => 'Sneha Reddy',
            'password'            => Hash::make('member123'),
            'role'                => 'member',
            'gym_id'              => $gym->id,
            'avatar'              => 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80',
            'phone'               => '9890123456',
            'must_change_password' => false,
        ]);

        $this->command->info('✅ Users seeded');

        // ─── MEMBERSHIP PLANS ───────────────────────────────
        $plan1 = Plan::firstOrCreate(['name' => 'Gold Quarterly Fitness'], [
            'gym_id'           => $gym->id,
            'duration_months'  => 3,
            'period'           => 'Quarterly (3 Months)',
            'price'            => 6500,
            'popular'          => true,
            'features'         => json_encode(['Unlimited Access', 'Locker', 'Group Classes']),
            'active_subscribers' => 0,
        ]);
        $plan2 = Plan::firstOrCreate(['name' => 'Platinum Annual Elite'], [
            'gym_id'           => $gym->id,
            'duration_months'  => 12,
            'period'           => 'Annual (12 Months)',
            'price'            => 18000,
            'popular'          => false,
            'features'         => json_encode(['Unlimited Access', 'Pool', 'All Classes', 'Nutrition Plan']),
            'active_subscribers' => 0,
        ]);
        $plan3 = Plan::firstOrCreate(['name' => 'Silver Monthly'], [
            'gym_id'           => $gym->id,
            'duration_months'  => 1,
            'period'           => 'Monthly (1 Month)',
            'price'            => 2500,
            'popular'          => false,
            'features'         => json_encode(['Basic Access', 'Cardio Zone']),
            'active_subscribers' => 0,
        ]);


        // ─── TRAINER PROFILES ───────────────────────────────
        TrainerProfile::firstOrCreate(['user_id' => $trainer1->id], [
            'specialty'      => 'Strength & Conditioning, HIIT',
            'experience'     => '6 years',
            'bio'            => 'Certified strength coach with a passion for pushing limits.',
            'rating'         => 4.9,
            'monthly_salary' => 45000,
        ]);
        TrainerProfile::firstOrCreate(['user_id' => $trainer2->id], [
            'specialty'      => 'Yoga, Pilates, Mobility',
            'experience'     => '5 years',
            'bio'            => 'Mind-body balance specialist bringing calm power to every session.',
            'rating'         => 4.8,
            'monthly_salary' => 40000,
        ]);


        // ─── MEMBER PROFILES ────────────────────────────────
        MemberProfile::firstOrCreate(['user_id' => $member1->id], [
            'plan_id'          => $plan1->id,
            'trainer_id'       => $trainer1->id,
            'training_type'    => 'pt',
            'status'           => 'Active',
            'join_date'        => Carbon::now()->subMonths(8)->toDateString(),
            'expiry_date'      => Carbon::now()->addMonths(1)->toDateString(),
            'gender'           => 'Male',
            'age'              => 26,
            'weight'           => 78.5,
            'target_weight'    => 72.0,
            'height'           => 178.0,
            'goal'             => 'Fat Loss & Muscle Gain',
            'attendance_streak' => 14,
            'qr_pass_code'     => 'PF-M-001-AARAV',
        ]);

        MemberProfile::firstOrCreate(['user_id' => $member2->id], [
            'plan_id'          => $plan2->id,
            'trainer_id'       => $trainer2->id,
            'training_type'    => 'general',
            'status'           => 'Active',
            'join_date'        => Carbon::now()->subMonths(5)->toDateString(),
            'expiry_date'      => Carbon::now()->addMonths(7)->toDateString(),
            'gender'           => 'Female',
            'age'              => 29,
            'weight'           => 58.0,
            'target_weight'    => 55.0,
            'height'           => 162.0,
            'goal'             => 'Weight Loss',
            'attendance_streak' => 22,
            'qr_pass_code'     => 'PF-M-002-PRIYA',
        ]);

        MemberProfile::firstOrCreate(['user_id' => $member3->id], [
            'plan_id'          => $plan1->id,
            'training_type'    => 'self-guided',
            'status'           => 'Active',
            'join_date'        => Carbon::now()->subMonths(3)->toDateString(),
            'expiry_date'      => Carbon::now()->addMonths(2)->toDateString(),
            'gender'           => 'Male',
            'age'              => 32,
            'weight'           => 85.0,
            'target_weight'    => 80.0,
            'height'           => 180.0,
            'goal'             => 'Build Strength',
            'attendance_streak' => 8,
            'qr_pass_code'     => 'PF-M-003-ROHAN',
        ]);

        MemberProfile::firstOrCreate(['user_id' => $member4->id], [
            'plan_id'          => $plan3->id,
            'trainer_id'       => $trainer2->id,
            'training_type'    => 'general',
            'status'           => 'Expiring Soon',
            'join_date'        => Carbon::now()->subMonths(1)->toDateString(),
            'expiry_date'      => Carbon::now()->addDays(6)->toDateString(),
            'gender'           => 'Female',
            'age'              => 24,
            'weight'           => 52.0,
            'target_weight'    => 50.0,
            'height'           => 158.0,
            'goal'             => 'Flexibility & Wellness',
            'attendance_streak' => 5,
            'qr_pass_code'     => 'PF-M-004-SNEHA',
        ]);

        $this->command->info('✅ Member & Trainer profiles seeded');

        // ─── GYM CLASSES ────────────────────────────────────
        GymClass::firstOrCreate(['name' => 'High-Intensity Crossfit'], [
            'gym_id'          => $gym->id,
            'trainer_id'      => $trainer1->id,
            'instructor_name' => $trainer1->name,
            'time'            => '06:30 AM',
            'duration'        => '60 min',
            'days'            => json_encode(['Mon', 'Wed', 'Fri']),
            'capacity'        => 20,
            'booked_count'    => 14,
            'category'        => 'HIIT',
            'room'            => 'Zone A - Functional',
            'difficulty'      => 'Advanced',
            'status'          => 'Active',
            'color'           => 'from-orange-500/20 to-red-500/20 border-orange-500/40',
        ]);
        GymClass::firstOrCreate(['name' => 'Power Vinyasa Yoga'], [
            'gym_id'          => $gym->id,
            'trainer_id'      => $trainer2->id,
            'instructor_name' => $trainer2->name,
            'time'            => '07:00 AM',
            'duration'        => '45 min',
            'days'            => json_encode(['Tue', 'Thu', 'Sat']),
            'capacity'        => 15,
            'booked_count'    => 9,
            'category'        => 'Yoga',
            'room'            => 'Zone C - Mind-Body Studio',
            'difficulty'      => 'All Levels',
            'status'          => 'Active',
            'color'           => 'from-purple-500/20 to-pink-500/20 border-purple-500/40',
        ]);
        GymClass::firstOrCreate(['name' => 'Strength & Power Lifting'], [
            'gym_id'          => $gym->id,
            'trainer_id'      => $trainer1->id,
            'instructor_name' => $trainer1->name,
            'time'            => '05:00 PM',
            'duration'        => '75 min',
            'days'            => json_encode(['Mon', 'Wed', 'Fri']),
            'capacity'        => 12,
            'booked_count'    => 10,
            'category'        => 'Strength',
            'room'            => 'Zone B - Weight Floor',
            'difficulty'      => 'Intermediate',
            'status'          => 'Active',
            'color'           => 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40',
        ]);

        $this->command->info('✅ Classes seeded');

        // ─── ATTENDANCE LOGS ────────────────────────────────
        $attendanceData = [
            ['user' => $member1, 'in' => '06:30:00', 'out' => '08:15:00', 'dur' => '1h 45m', 'gate' => 'Main Turnstile A'],
            ['user' => $member2, 'in' => '07:00:00', 'out' => '08:30:00', 'dur' => '1h 30m', 'gate' => 'Main Turnstile A'],
            ['user' => $member3, 'in' => '09:00:00', 'out' => null, 'dur' => null, 'gate' => 'Gate B'],
            ['user' => $member4, 'in' => '10:30:00', 'out' => '11:45:00', 'dur' => '1h 15m', 'gate' => 'Main Turnstile A'],
        ];

        foreach ($attendanceData as $row) {
            $profile = MemberProfile::where('user_id', $row['user']->id)->first();
            Attendance::firstOrCreate([
                'user_id' => $row['user']->id,
                'date'    => now()->subDays(2)->toDateString(),
            ], [
                'member_name'    => $row['user']->name,
                'member_avatar'  => $row['user']->avatar,
                'plan_name'      => $profile?->plan?->name ?? 'Active Plan',
                'check_in_time'  => $row['in'],
                'check_out_time' => $row['out'],
                'punch_out_time' => $row['out'],
                'duration'       => $row['dur'],
                'status'         => $row['out'] ? 'Completed' : 'Inside Gym',
                'gate'           => $row['gate'],
            ]);
        }

        $this->command->info('✅ Attendance seeded');

        // ─── INVOICES (Revenue Inflow) ───────────────────────
        $invoices = [
            ['member' => $member1, 'plan' => $plan1, 'amount' => 6500, 'date' => now()->subDays(30)],
            ['member' => $member2, 'plan' => $plan2, 'amount' => 18000, 'date' => now()->subDays(60)],
            ['member' => $member3, 'plan' => $plan1, 'amount' => 6500, 'date' => now()->subDays(10)],
            ['member' => $member4, 'plan' => $plan3, 'amount' => 2500, 'date' => now()->subDays(35)],
        ];

        foreach ($invoices as $inv) {
            $invoice = Invoice::create([
                'gym_id'         => $gym->id,
                'user_id'        => $inv['member']->id,
                'plan_id'        => $inv['plan']->id,
                'invoice_number' => 'INV-' . strtoupper(substr(md5($inv['member']->id . $inv['amount']), 0, 8)),
                'amount'         => $inv['amount'],
                'status'         => 'Paid',
                'date'           => $inv['date']->toDateString(),
                'payment_method' => 'UPI',
            ]);

            // Create financial inflow transaction
            FinancialTransaction::create([
                'gym_id'         => $gym->id,
                'type'           => 'Inflow',
                'category'       => 'Membership Fee',
                'description'    => "Membership Payment – {$inv['member']->name} ({$inv['plan']->name})",
                'amount'         => $inv['amount'],
                'date'           => $inv['date']->toDateString(),
                'reference_id'   => (string) $invoice->id,
                'reference_type' => 'invoice',
                'created_by'     => $superadmin->id,
            ]);
        }

        $this->command->info('✅ Invoices & financial inflow seeded');

        // ─── EXPENSES ───────────────────────────────────────
        $expensesData = [
            ['title' => 'Monthly Gym Rent', 'cat' => 'Rent', 'amount' => 75000, 'date' => now()->subDays(5)],
            ['title' => 'Electricity & Water Bill', 'cat' => 'Utilities', 'amount' => 12000, 'date' => now()->subDays(8)],
            ['title' => 'Whey Protein Restock', 'cat' => 'Inventory', 'amount' => 28500, 'date' => now()->subDays(12)],
            ['title' => 'Treadmill Annual Service', 'cat' => 'Equipment AMC', 'amount' => 8000, 'date' => now()->subDays(20)],
        ];

        foreach ($expensesData as $exp) {
            Expense::create([
                'gym_id'       => $gym->id,
                'title'        => $exp['title'],
                'category'     => $exp['cat'],
                'vendor'       => 'Vendor ' . $exp['cat'],
                'amount'       => $exp['amount'],
                'date'         => $exp['date']->toDateString(),
                'payment_mode' => 'Bank Transfer',
                'ref_no'       => 'EXP-' . strtoupper(substr(md5($exp['title']), 0, 6)),
                'created_by'   => $superadmin->id,
            ]);

            FinancialTransaction::create([
                'gym_id'         => $gym->id,
                'type'           => 'Outflow',
                'category'       => $exp['cat'],
                'description'    => $exp['title'],
                'amount'         => $exp['amount'],
                'date'           => $exp['date']->toDateString(),
                'reference_type' => 'expense',
                'created_by'     => $superadmin->id,
            ]);
        }

        $this->command->info('✅ Expenses & outflow transactions seeded');

        // ─── PAYROLL ────────────────────────────────────────
        $payrollData = [
            ['emp' => $trainer1, 'role' => 'Personal Trainer', 'base' => 45000, 'commission' => 12000, 'bonus' => 3000, 'deductions' => 2000],
            ['emp' => $trainer2, 'role' => 'Yoga & Wellness Coach', 'base' => 40000, 'commission' => 8000, 'bonus' => 2000, 'deductions' => 1500],
            ['emp' => $manager, 'role' => 'Operations Manager', 'base' => 55000, 'commission' => 0, 'bonus' => 0, 'deductions' => 3000],
        ];

        foreach ($payrollData as $pay) {
            $netPay = $pay['base'] + $pay['commission'] + $pay['bonus'] - $pay['deductions'];
            Payroll::firstOrCreate([
                'employee_id' => $pay['emp']->id,
                'month'       => Carbon::now()->format('F Y'),
            ], [
                'gym_id'           => $gym->id,
                'employee_name'    => $pay['emp']->name,
                'role'             => $pay['role'],
                'base_salary'      => $pay['base'],
                'commission_earned' => $pay['commission'],
                'incentives'       => 0,
                'bonus'            => $pay['bonus'],
                'deductions'       => $pay['deductions'],
                'net_pay'          => $netPay,
                'status'           => 'Pending',
            ]);
        }

        $this->command->info('✅ Payroll seeded');

        // ─── PT SESSIONS (packages with OTP) ─────────────────
        $ptSession1 = PtSession::firstOrCreate([
            'member_id'  => $member1->id,
            'trainer_id' => $trainer1->id,
        ], [
            'gym_id'             => $gym->id,
            'member_name'        => $member1->name,
            'member_avatar'      => $member1->avatar,
            'trainer_name'       => $trainer1->name,
            'plan_name'          => 'Premium PT Package',
            'total_sessions'     => 24,
            'completed_sessions' => 8,
            'remaining_sessions' => 16,
            'client_otp'         => '4829',
            'status'             => 'Active',
            'start_date'         => Carbon::now()->subMonths(2)->toDateString(),
        ]);

        $ptSession2 = PtSession::firstOrCreate([
            'member_id'  => $member2->id,
            'trainer_id' => $trainer2->id,
        ], [
            'gym_id'             => $gym->id,
            'member_name'        => $member2->name,
            'member_avatar'      => $member2->avatar,
            'trainer_name'       => $trainer2->name,
            'plan_name'          => 'Yoga Transformation Package',
            'total_sessions'     => 12,
            'completed_sessions' => 6,
            'remaining_sessions' => 6,
            'client_otp'         => '7341',
            'status'             => 'Active',
            'start_date'         => Carbon::now()->subMonth()->toDateString(),
        ]);

        // PT Session Logs
        if ($ptSession1->logs()->count() === 0) {
            for ($i = 1; $i <= 3; $i++) {
                PtSessionLog::create([
                    'pt_session_id' => $ptSession1->id,
                    'member_id'     => $member1->id,
                    'trainer_id'    => $trainer1->id,
                    'member_name'   => $member1->name,
                    'trainer_name'  => $trainer1->name,
                    'session_number' => $i,
                    'otp_entered'   => '4829',
                    'otp_verified'  => true,
                    'notes'         => "Session #{$i} — Upper body strength focus.",
                    'verified_at'   => Carbon::now()->subDays(14 - ($i * 4)),
                ]);
            }
        }

        $this->command->info('✅ PT Sessions & Logs seeded');

        // ─── TRAINER REVIEWS ────────────────────────────────
        $reviews = [
            ['trainer' => $trainer1, 'member' => $member1, 'rating' => 5, 'comment' => 'Absolutely transformed my physique! Alex pushes you to your best.'],
            ['trainer' => $trainer1, 'member' => $member3, 'rating' => 5, 'comment' => 'Best strength coach in Mumbai. Detailed, disciplined, and inspiring.'],
            ['trainer' => $trainer2, 'member' => $member2, 'rating' => 5, 'comment' => 'Elena\'s yoga sessions are incredible. I feel balanced and energized!'],
            ['trainer' => $trainer2, 'member' => $member4, 'rating' => 4, 'comment' => 'Great instructor, very patient and encouraging. Loved the Vinyasa flow.'],
        ];

        foreach ($reviews as $rev) {
            TrainerReview::firstOrCreate([
                'trainer_id' => $rev['trainer']->id,
                'member_id'  => $rev['member']->id,
            ], [
                'gym_id'         => $gym->id,
                'trainer_name'   => $rev['trainer']->name,
                'member_name'    => $rev['member']->name,
                'member_avatar'  => $rev['member']->avatar,
                'rating'         => $rev['rating'],
                'comment'        => $rev['comment'],
                'date'           => Carbon::now()->subDays(rand(3, 30))->toDateString(),
            ]);
        }

        $this->command->info('✅ Trainer Reviews seeded');

        // ─── ADVANCE PAY REQUESTS ───────────────────────────
        AdvanceRequest::firstOrCreate([
            'trainer_id' => $trainer1->id,
            'status'     => 'Pending',
        ], [
            'gym_id'          => $gym->id,
            'trainer_name'    => $trainer1->name,
            'trainer_avatar'  => $trainer1->avatar,
            'amount'          => 15000,
            'reason'          => 'Medical emergency – dental surgery for family member.',
            'repayment_month' => 'Next Cycle (October 2026)',
            'request_date'    => Carbon::now()->subDays(3)->toDateString(),
        ]);

        AdvanceRequest::firstOrCreate([
            'trainer_id' => $trainer2->id,
            'status'     => 'Disbursed',
        ], [
            'gym_id'          => $gym->id,
            'trainer_name'    => $trainer2->name,
            'trainer_avatar'  => $trainer2->avatar,
            'amount'          => 10000,
            'reason'          => 'Equipment for home training setup.',
            'repayment_month' => 'September 2026',
            'request_date'    => Carbon::now()->subDays(15)->toDateString(),
            'disbursed_at'    => Carbon::now()->subDays(10),
            'notes'           => 'Approved and disbursed via bank transfer.',
        ]);

        $this->command->info('✅ Advance Pay Requests seeded');

        // ─── COMMISSIONS ────────────────────────────────────
        Commission::firstOrCreate([
            'trainer_id' => $trainer1->id,
            'member_name' => $member1->name,
        ], [
            'gym_id'        => $gym->id,
            'trainer_name'  => $trainer1->name,
            'plan_name'     => 'Premium PT Package',
            'session_type'  => 'Personal Training (PT)',
            'rate_percent'  => 25.00,
            'amount'        => 1625,
            'date'          => Carbon::now()->subDays(30)->toDateString(),
            'status'        => 'Paid',
        ]);

        Commission::firstOrCreate([
            'trainer_id' => $trainer2->id,
            'member_name' => $member2->name,
        ], [
            'gym_id'        => $gym->id,
            'trainer_name'  => $trainer2->name,
            'plan_name'     => 'Yoga Transformation Package',
            'session_type'  => 'Personal Training (PT)',
            'rate_percent'  => 20.00,
            'amount'        => 2400,
            'date'          => Carbon::now()->subDays(20)->toDateString(),
            'status'        => 'Pending',
        ]);

        $this->command->info('✅ Commissions seeded');

        // ─── EQUIPMENT ──────────────────────────────────────
        $equipmentData = [
            ['name' => 'Technogym Treadmill X12', 'cat' => 'Cardio', 'status' => 'Operational'],
            ['name' => 'Olympic Power Rack', 'cat' => 'Free Weights', 'status' => 'Operational'],
            ['name' => 'Cable Cross Machine', 'cat' => 'Resistance', 'status' => 'Under Maintenance'],
            ['name' => 'Assault Air Bike', 'cat' => 'Cardio', 'status' => 'Operational'],
        ];
        foreach ($equipmentData as $eq) {
            Equipment::firstOrCreate(['name' => $eq['name']], [
                'gym_id'           => $gym->id,
                'category'         => $eq['cat'],
                'status'           => $eq['status'],
                'condition'        => 'Good',
                'last_serviced'    => Carbon::now()->subMonths(rand(1, 6))->toDateString(),
                'next_service_due' => Carbon::now()->addMonths(rand(1, 6))->toDateString(),
            ]);
        }

        $this->command->info('✅ Equipment seeded');

        // ─── PRODUCTS ───────────────────────────────────────
        $products = [
            ['name' => 'Optimum Whey Protein Gold (2kg)', 'cat' => 'Supplements', 'price' => 4200, 'stock' => 25],
            ['name' => 'PulseFit Performance Shaker', 'cat' => 'Accessories', 'price' => 350, 'stock' => 60],
            ['name' => 'Creatine Monohydrate (500g)', 'cat' => 'Supplements', 'price' => 899, 'stock' => 40],
            ['name' => 'Resistance Band Set (5 levels)', 'cat' => 'Equipment', 'price' => 1200, 'stock' => 15],
        ];
        foreach ($products as $prod) {
            Product::firstOrCreate(['name' => $prod['name']], [
                'gym_id'        => $gym->id,
                'category'      => $prod['cat'],
                'price'         => $prod['price'],
                'stock'         => $prod['stock'],
                'min_stock_alert' => 5,
            ]);
        }

        $this->command->info('✅ Products seeded');

        // ─── ENQUIRIES ──────────────────────────────────────
        Enquiry::firstOrCreate(['name' => 'Arjun Nair', 'email' => 'arjun.nair@gmail.com'], [
            'gym_id'         => $gym->id,
            'phone'          => '9011223344',
            'source'         => 'Google Ads',
            'interested_plan' => 'Platinum Annual Elite',
            'fitness_goal'   => 'Weight Loss',
            'status'         => 'Hot Lead',
            'priority'       => 'High',
            'follow_up_date' => Carbon::now()->addDays(2)->toDateString(),
            'notes'          => 'Very interested in annual platinum plan.',
        ]);

        $this->command->info('✅ Enquiries seeded');
        $this->command->info('🎉 All PULSEFIT Platform Upgrade data seeded successfully!');
    }
}
