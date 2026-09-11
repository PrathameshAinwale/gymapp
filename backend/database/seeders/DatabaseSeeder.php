<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\GymSetting;
use App\Models\Plan;
use App\Models\TrainerProfile;
use App\Models\MemberProfile;
use App\Models\GymClass;
use App\Models\ClassBooking;
use App\Models\Attendance;
use App\Models\WorkoutPlan;
use App\Models\DietPlan;
use App\Models\BodyMetric;
use App\Models\Invoice;
use App\Models\Equipment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Gym General Settings
        GymSetting::create([
            'name' => 'PULSE FIT ATHLETIC CLUB',
            'tagline' => "India's Premier Strength & Conditioning Hub",
            'address' => 'Plot 42, Hiranandani Business Park, Powai, Mumbai, Maharashtra 400076',
            'phone' => '+91 98201 54321',
            'email' => 'contact@pulsefit.in',
            'operating_hours' => 'Mon-Sat: 5:30 AM - 11:00 PM | Sun: 6:00 AM - 8:00 PM',
            'currency' => '₹',
        ]);

        // 2. Membership Plans
        $silverPlan = Plan::create([
            'name' => 'Silver Monthly Pass',
            'price' => 1999,
            'period' => 'Monthly (1 Month)',
            'duration_months' => 1,
            'popular' => false,
            'color' => 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
            'features' => [
                'Access to all cardio & strength training zones',
                'Locker, steam room & shower facilities',
                'PulseFit Mobile App QR Turnstile Pass',
                '1 Initial InBody body composition scan'
            ],
            'active_subscribers' => 142,
        ]);

        $goldPlan = Plan::create([
            'name' => 'Gold Quarterly Fitness',
            'price' => 4999,
            'period' => 'Quarterly (3 Months)',
            'duration_months' => 3,
            'popular' => true,
            'color' => 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40',
            'features' => [
                'All Silver Plan benefits included',
                'Unlimited group classes (Yoga, HIIT, Bollywood Zumba)',
                'Dedicated Trainer workout assignment & routine',
                'Bi-weekly body composition & BMI assessment',
                'Steam, Sauna & Recovery Zone access'
            ],
            'active_subscribers' => 285,
        ]);

        $platinumPlan = Plan::create([
            'name' => 'Platinum Half-Yearly',
            'price' => 8999,
            'period' => 'Half-Yearly (6 Months)',
            'duration_months' => 6,
            'popular' => false,
            'color' => 'from-purple-500/20 to-pink-500/20 border-purple-500/40',
            'features' => [
                'All Gold Plan benefits included',
                '2 Free Personal Trainer 1-on-1 sessions',
                'Personalized Indian Macro & Diet Chart',
                'Complimentary dedicated locker for 6 months',
                '2 Free guest workout passes per month'
            ],
            'active_subscribers' => 118,
        ]);

        $diamondPlan = Plan::create([
            'name' => 'Diamond VIP Annual Elite',
            'price' => 15999,
            'period' => 'Annual (12 Months)',
            'duration_months' => 12,
            'popular' => true,
            'color' => 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
            'features' => [
                '24/7 VIP Gym floor, Lounge & Steam access',
                'Weekly 1-on-1 Personal Training Session',
                'Customized Indian Vegetarian / Non-Veg Macro Diet',
                'Free PulseFit Athlete Kit (Duffel Bag, Shaker & Towel)',
                'Complimentary Post-Workout Protein Shakes'
            ],
            'active_subscribers' => 94,
        ]);

        // 3. Owner Account
        $owner = User::create([
            'name' => 'Vikramaditya Singhania',
            'email' => 'owner@pulsefit.in',
            'role' => 'owner',
            'password' => Hash::make('admin123'),
            'phone' => '+91 98201 54321',
            'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        ]);

        // 4. Trainers Accounts
        $trainer1 = User::create([
            'name' => 'Coach Alex Rivers',
            'email' => 'trainer@pulsefit.in',
            'role' => 'trainer',
            'password' => Hash::make('trainer123'),
            'phone' => '+91 98201 11223',
            'avatar' => 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&auto=format&fit=crop&q=80',
        ]);
        TrainerProfile::create([
            'user_id' => $trainer1->id,
            'specialty' => 'Hypertrophy & Powerlifting',
            'experience' => '8+ Years',
            'rating' => 4.9,
            'monthly_salary' => 65000,
            'bio' => 'Certified CSCS with specialization in biomechanics, muscle hypertrophy, and athlete conditioning.',
            'certifications' => ['CSCS', 'NASM-CPT', 'Precision Nutrition L1'],
        ]);

        $trainer2 = User::create([
            'name' => 'Coach Elena Rostova',
            'email' => 'elena.r@pulsefit.com',
            'role' => 'trainer',
            'password' => Hash::make('trainer123'),
            'phone' => '+91 98201 22334',
            'avatar' => 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&auto=format&fit=crop&q=80',
        ]);
        TrainerProfile::create([
            'user_id' => $trainer2->id,
            'specialty' => 'Fat Loss & Functional Movement',
            'experience' => '6 Years',
            'rating' => 4.8,
            'monthly_salary' => 55000,
            'bio' => 'Passionate about mobility, core power, and high-intensity body transformations.',
            'certifications' => ['CrossFit L2', 'ACE Personal Trainer', 'Kettlebell Athletics'],
        ]);

        $trainer3 = User::create([
            'name' => 'Coach Marcus Thorne',
            'email' => 'marcus.t@pulsefit.com',
            'role' => 'trainer',
            'password' => Hash::make('trainer123'),
            'phone' => '+91 98201 33445',
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        ]);
        TrainerProfile::create([
            'user_id' => $trainer3->id,
            'specialty' => 'Yoga, Mobility & Spine Rehab',
            'experience' => '10 Years',
            'rating' => 5.0,
            'monthly_salary' => 58000,
            'bio' => 'Focuses on injury rehabilitation, spine health, restorative yoga, and sustainable mobility for all ages.',
            'certifications' => ['RYT-500', 'FMS Level 2', 'CES'],
        ]);

        // 5. Member Accounts
        $member1 = User::create([
            'name' => 'Aarav Sharma',
            'email' => 'member@pulsefit.in',
            'role' => 'member',
            'password' => Hash::make('member123'),
            'phone' => '+91 98765 43210',
            'avatar' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        ]);
        MemberProfile::create([
            'user_id' => $member1->id,
            'plan_id' => $goldPlan->id,
            'trainer_id' => $trainer1->id,
            'status' => 'Active',
            'join_date' => '2025-11-15',
            'expiry_date' => '2026-09-15',
            'gender' => 'Male',
            'age' => 27,
            'weight' => 78.5,
            'target_weight' => 74.0,
            'height' => 178,
            'goal' => 'Lean Muscle Gain & Core Strength',
            'medical_notes' => 'Minor left shoulder impingement (cleared)',
            'emergency_contact' => 'Neha Sharma (+91 98765 11223)',
            'attendance_streak' => 14,
            'qr_pass_code' => 'PF-M-101-AARAV',
            'dues_amount' => 0,
            'last_check_in' => now()->subHours(2),
        ]);

        $member2 = User::create([
            'name' => 'Priya Patel',
            'email' => 'priya.patel@example.com',
            'role' => 'member',
            'password' => Hash::make('member123'),
            'phone' => '+91 98112 34567',
            'avatar' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        ]);
        MemberProfile::create([
            'user_id' => $member2->id,
            'plan_id' => $diamondPlan->id,
            'trainer_id' => $trainer2->id,
            'status' => 'Active',
            'join_date' => '2025-08-10',
            'expiry_date' => '2026-08-10',
            'gender' => 'Female',
            'age' => 29,
            'weight' => 62.0,
            'target_weight' => 57.0,
            'height' => 165,
            'goal' => 'Fat Loss & Athletic Conditioning',
            'medical_notes' => 'None reported',
            'emergency_contact' => 'Rajesh Patel (+91 98112 99887)',
            'attendance_streak' => 21,
            'qr_pass_code' => 'PF-M-102-PRIYA',
            'dues_amount' => 0,
            'last_check_in' => now()->subHours(3),
        ]);

        $member3 = User::create([
            'name' => 'Rohan Verma',
            'email' => 'rohan.v@example.com',
            'role' => 'member',
            'password' => Hash::make('member123'),
            'phone' => '+91 98223 45678',
            'avatar' => 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
        ]);
        MemberProfile::create([
            'user_id' => $member3->id,
            'plan_id' => $silverPlan->id,
            'trainer_id' => null,
            'status' => 'Expiring Soon',
            'join_date' => '2026-01-20',
            'expiry_date' => '2026-03-02',
            'gender' => 'Male',
            'age' => 32,
            'weight' => 84.0,
            'target_weight' => 80.0,
            'height' => 182,
            'goal' => 'Cardiovascular Health & Fat Loss',
            'medical_notes' => 'Mild asthma (keeps inhaler)',
            'emergency_contact' => 'Kavita Verma (+91 98223 88776)',
            'attendance_streak' => 3,
            'qr_pass_code' => 'PF-M-103-ROHAN',
            'dues_amount' => 1999,
            'last_check_in' => now()->subDays(1),
        ]);

        $member4 = User::create([
            'name' => 'Ananya Iyer',
            'email' => 'ananya.iyer@example.com',
            'role' => 'member',
            'password' => Hash::make('member123'),
            'phone' => '+91 98334 56789',
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        ]);
        MemberProfile::create([
            'user_id' => $member4->id,
            'plan_id' => $goldPlan->id,
            'trainer_id' => $trainer3->id,
            'status' => 'Active',
            'join_date' => '2025-10-01',
            'expiry_date' => '2026-07-01',
            'gender' => 'Female',
            'age' => 26,
            'weight' => 54.0,
            'target_weight' => 56.0,
            'height' => 160,
            'goal' => 'Hypertrophy, Flexibility & Core Stability',
            'medical_notes' => 'None',
            'emergency_contact' => 'Suresh Iyer (+91 98334 11223)',
            'attendance_streak' => 8,
            'qr_pass_code' => 'PF-M-104-ANANYA',
            'dues_amount' => 0,
            'last_check_in' => now()->subHours(1),
        ]);

        $member5 = User::create([
            'name' => 'Kabir Mehra',
            'email' => 'kabir.m@example.com',
            'role' => 'member',
            'password' => Hash::make('member123'),
            'phone' => '+91 98445 67890',
            'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        ]);
        MemberProfile::create([
            'user_id' => $member5->id,
            'plan_id' => $silverPlan->id,
            'trainer_id' => null,
            'status' => 'Expired',
            'join_date' => '2025-12-01',
            'expiry_date' => '2026-01-01',
            'gender' => 'Male',
            'age' => 35,
            'weight' => 92.0,
            'target_weight' => 85.0,
            'height' => 175,
            'goal' => 'General Fitness & Weight Loss',
            'medical_notes' => 'Lower back soreness (avoid heavy deadlifts)',
            'emergency_contact' => 'Sunita Mehra (+91 98445 22334)',
            'attendance_streak' => 0,
            'qr_pass_code' => 'PF-M-105-KABIR',
            'dues_amount' => 1999,
            'last_check_in' => now()->subDays(24),
        ]);

        // 6. Classes
        $class1 = GymClass::create([
            'name' => 'Power Yoga & Core Flow',
            'trainer_id' => $trainer3->id,
            'time' => '07:00 AM - 08:00 AM',
            'days' => ['Mon', 'Wed', 'Fri'],
            'capacity' => 20,
            'booked_count' => 16,
            'category' => 'Yoga & Flexibility',
            'room' => 'Studio A (Zen Room)',
            'difficulty' => 'All Levels',
        ]);

        $class2 = GymClass::create([
            'name' => 'High Octane HIIT & Metabolic Conditioning',
            'trainer_id' => $trainer2->id,
            'time' => '06:30 PM - 07:30 PM',
            'days' => ['Tue', 'Thu', 'Sat'],
            'capacity' => 25,
            'booked_count' => 22,
            'category' => 'HIIT & Cardio',
            'room' => 'Main Turf Zone',
            'difficulty' => 'Advanced',
        ]);

        $class3 = GymClass::create([
            'name' => 'Heavy Barbell & Strength Club',
            'trainer_id' => $trainer1->id,
            'time' => '05:30 PM - 06:30 PM',
            'days' => ['Mon', 'Wed', 'Fri'],
            'capacity' => 15,
            'booked_count' => 14,
            'category' => 'Strength & Powerlifting',
            'room' => 'Olympic Lifting Platforms',
            'difficulty' => 'Intermediate / Advanced',
        ]);

        $class4 = GymClass::create([
            'name' => 'Bollywood Dance & Zumba Cardio',
            'trainer_id' => $trainer2->id,
            'time' => '08:00 AM - 09:00 AM',
            'days' => ['Tue', 'Thu'],
            'capacity' => 30,
            'booked_count' => 28,
            'category' => 'Dance & Cardio',
            'room' => 'Studio B',
            'difficulty' => 'All Levels',
        ]);

        // Class Bookings
        ClassBooking::create([
            'gym_class_id' => $class1->id,
            'user_id' => $member1->id,
            'booking_date' => now()->toDateString(),
            'status' => 'Confirmed',
        ]);

        // 7. Attendance
        Attendance::create([
            'user_id' => $member1->id,
            'check_in_time' => '07:15:00',
            'check_out_time' => null,
            'date' => now()->toDateString(),
            'status' => 'Inside Gym',
            'gate' => 'Main Turnstile A',
        ]);

        Attendance::create([
            'user_id' => $member2->id,
            'check_in_time' => '06:45:00',
            'check_out_time' => null,
            'date' => now()->toDateString(),
            'status' => 'Inside Gym',
            'gate' => 'VIP Turnstile C',
        ]);

        Attendance::create([
            'user_id' => $member4->id,
            'check_in_time' => '08:30:00',
            'check_out_time' => null,
            'date' => now()->toDateString(),
            'status' => 'Inside Gym',
            'gate' => 'Main Turnstile B',
        ]);

        // 8. Workout Plan for Aarav Sharma
        WorkoutPlan::create([
            'user_id' => $member1->id,
            'trainer_id' => $trainer1->id,
            'title' => '6-Day Push Pull Legs (PPL) Hypertrophy Program',
            'days' => [
                [
                    'day' => 'Monday',
                    'label' => 'Push Day – Chest, Shoulders & Triceps',
                    'restDay' => false,
                    'exercises' => [
                        ['id' => 'w-m-1', 'name' => 'Flat Barbell Bench Press', 'sets' => '4', 'reps' => '8-10', 'weight' => '70 kg', 'rest' => 90, 'done' => false],
                        ['id' => 'w-m-2', 'name' => 'Incline Dumbbell Press', 'sets' => '3', 'reps' => '10-12', 'weight' => '22 kg each', 'rest' => 75, 'done' => false],
                        ['id' => 'w-m-3', 'name' => 'Seated Dumbbell OHP', 'sets' => '4', 'reps' => '10', 'weight' => '18 kg each', 'rest' => 75, 'done' => false],
                        ['id' => 'w-m-4', 'name' => 'Cable Lateral Raises', 'sets' => '3', 'reps' => '15', 'weight' => '7 kg', 'rest' => 45, 'done' => false],
                        ['id' => 'w-m-5', 'name' => 'Tricep Rope Pushdown', 'sets' => '3', 'reps' => '12-15', 'weight' => '20 kg', 'rest' => 45, 'done' => false],
                        ['id' => 'w-m-6', 'name' => 'Overhead Dumbbell Extension', 'sets' => '3', 'reps' => '12', 'weight' => '14 kg', 'rest' => 45, 'done' => false],
                    ]
                ],
                [
                    'day' => 'Tuesday',
                    'label' => 'Pull Day – Back & Biceps',
                    'restDay' => false,
                    'exercises' => [
                        ['id' => 'w-t-1', 'name' => 'Deadlift (Conventional)', 'sets' => '4', 'reps' => '5-6', 'weight' => '100 kg', 'rest' => 120, 'done' => false],
                        ['id' => 'w-t-2', 'name' => 'Weighted Pull-Ups', 'sets' => '4', 'reps' => '8-10', 'weight' => '+10 kg', 'rest' => 90, 'done' => false],
                        ['id' => 'w-t-3', 'name' => 'Seated Cable Row', 'sets' => '3', 'reps' => '12', 'weight' => '50 kg', 'rest' => 60, 'done' => false],
                        ['id' => 'w-t-4', 'name' => 'Face Pulls', 'sets' => '3', 'reps' => '15', 'weight' => '15 kg', 'rest' => 45, 'done' => false],
                        ['id' => 'w-t-5', 'name' => 'Barbell Bicep Curl', 'sets' => '3', 'reps' => '10-12', 'weight' => '25 kg', 'rest' => 60, 'done' => false],
                        ['id' => 'w-t-6', 'name' => 'Hammer Dumbbell Curl', 'sets' => '3', 'reps' => '12', 'weight' => '12 kg each', 'rest' => 45, 'done' => false],
                    ]
                ],
                [
                    'day' => 'Wednesday',
                    'label' => 'Legs & Glutes – Heavy Compound',
                    'restDay' => false,
                    'exercises' => [
                        ['id' => 'w-w-1', 'name' => 'Barbell Back Squat', 'sets' => '4', 'reps' => '6-8', 'weight' => '90 kg', 'rest' => 120, 'done' => false],
                        ['id' => 'w-w-2', 'name' => 'Romanian Deadlift (RDL)', 'sets' => '4', 'reps' => '10', 'weight' => '70 kg', 'rest' => 90, 'done' => false],
                        ['id' => 'w-w-3', 'name' => 'Leg Press (45°)', 'sets' => '3', 'reps' => '12', 'weight' => '180 kg', 'rest' => 75, 'done' => false],
                        ['id' => 'w-w-4', 'name' => 'Walking Lunges (DB)', 'sets' => '3', 'reps' => '12 each', 'weight' => '16 kg each', 'rest' => 60, 'done' => false],
                        ['id' => 'w-w-5', 'name' => 'Leg Curl Machine', 'sets' => '3', 'reps' => '15', 'weight' => '35 kg', 'rest' => 45, 'done' => false],
                        ['id' => 'w-w-6', 'name' => 'Standing Calf Raises', 'sets' => '4', 'reps' => '15-20', 'weight' => '60 kg', 'rest' => 45, 'done' => false],
                    ]
                ],
                [
                    'day' => 'Thursday',
                    'label' => 'Push Day – Upper Body Hypertrophy',
                    'restDay' => false,
                    'exercises' => [
                        ['id' => 'w-th-1', 'name' => 'Incline Barbell Bench Press', 'sets' => '4', 'reps' => '8-10', 'weight' => '60 kg', 'rest' => 90, 'done' => false],
                        ['id' => 'w-th-2', 'name' => 'Flat Dumbbell Fly', 'sets' => '3', 'reps' => '12', 'weight' => '16 kg each', 'rest' => 60, 'done' => false],
                        ['id' => 'w-th-3', 'name' => 'Arnold Press', 'sets' => '4', 'reps' => '10', 'weight' => '16 kg each', 'rest' => 75, 'done' => false],
                        ['id' => 'w-th-4', 'name' => 'Cable Crossover', 'sets' => '3', 'reps' => '15', 'weight' => '12 kg each', 'rest' => 45, 'done' => false],
                        ['id' => 'w-th-5', 'name' => 'Skull Crusher (EZ Bar)', 'sets' => '3', 'reps' => '10-12', 'weight' => '20 kg', 'rest' => 60, 'done' => false],
                        ['id' => 'w-th-6', 'name' => 'Dips (Bodyweight)', 'sets' => '3', 'reps' => 'To Failure', 'weight' => 'BW', 'rest' => 60, 'done' => false],
                    ]
                ],
                [
                    'day' => 'Friday',
                    'label' => 'Pull Day – Back Width & Arms',
                    'restDay' => false,
                    'exercises' => [
                        ['id' => 'w-f-1', 'name' => 'Barbell Bent-Over Row', 'sets' => '4', 'reps' => '8-10', 'weight' => '60 kg', 'rest' => 90, 'done' => false],
                        ['id' => 'w-f-2', 'name' => 'Wide Grip Lat Pulldown', 'sets' => '4', 'reps' => '10-12', 'weight' => '55 kg', 'rest' => 60, 'done' => false],
                        ['id' => 'w-f-3', 'name' => 'Single-Arm DB Row', 'sets' => '3', 'reps' => '10 each', 'weight' => '24 kg', 'rest' => 60, 'done' => false],
                        ['id' => 'w-f-4', 'name' => 'Rear Delt Machine Fly', 'sets' => '3', 'reps' => '15', 'weight' => '25 kg', 'rest' => 45, 'done' => false],
                        ['id' => 'w-f-5', 'name' => 'Preacher Curl (EZ Bar)', 'sets' => '3', 'reps' => '10-12', 'weight' => '20 kg', 'rest' => 60, 'done' => false],
                        ['id' => 'w-f-6', 'name' => 'Reverse Grip Cable Curl', 'sets' => '3', 'reps' => '12', 'weight' => '15 kg', 'rest' => 45, 'done' => false],
                    ]
                ],
                [
                    'day' => 'Saturday',
                    'label' => 'Legs & Core – Volume Day',
                    'restDay' => false,
                    'exercises' => [
                        ['id' => 'w-s-1', 'name' => 'Front Squat', 'sets' => '4', 'reps' => '8', 'weight' => '65 kg', 'rest' => 90, 'done' => false],
                        ['id' => 'w-s-2', 'name' => 'Bulgarian Split Squat', 'sets' => '3', 'reps' => '10 each', 'weight' => '14 kg each', 'rest' => 60, 'done' => false],
                        ['id' => 'w-s-3', 'name' => 'Leg Extension Machine', 'sets' => '3', 'reps' => '15', 'weight' => '40 kg', 'rest' => 45, 'done' => false],
                        ['id' => 'w-s-4', 'name' => 'Hip Thrust (Barbell)', 'sets' => '4', 'reps' => '12', 'weight' => '80 kg', 'rest' => 75, 'done' => false],
                        ['id' => 'w-s-5', 'name' => 'Hanging Leg Raises', 'sets' => '3', 'reps' => '15', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                        ['id' => 'w-s-6', 'name' => 'Ab Wheel Rollout', 'sets' => '3', 'reps' => '12', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                    ]
                ],
            ]
        ]);

        // 9. Diet Plan for Aarav Sharma
        DietPlan::create([
            'user_id' => $member1->id,
            'trainer_id' => $trainer1->id,
            'daily_calories_target' => 2600,
            'protein_grams_target' => 175,
            'carbs_grams_target' => 290,
            'fats_grams_target' => 65,
            'water_glasses_target' => 10,
            'days' => [
                [
                    'day' => 'Monday',
                    'meals' => [
                        ['id' => 'd-mo-1', 'name' => 'Power Breakfast', 'time' => '08:30 AM', 'items' => '4 Boiled Eggs + 2 Multigrain Parathas with Curd + 1 Banana', 'calories' => 580, 'protein' => 34, 'carbs' => 65, 'fats' => 18],
                        ['id' => 'd-mo-2', 'name' => 'Mid-Morning Fuel', 'time' => '11:30 AM', 'items' => 'Whey Protein Shake + Almonds & Walnuts (15g)', 'calories' => 290, 'protein' => 28, 'carbs' => 14, 'fats' => 9],
                        ['id' => 'd-mo-3', 'name' => 'Post-Workout Lunch', 'time' => '02:00 PM', 'items' => '180g Grilled Chicken Breast + Brown Rice + Dal Tadka + Green Salad', 'calories' => 720, 'protein' => 52, 'carbs' => 85, 'fats' => 16],
                        ['id' => 'd-mo-4', 'name' => 'Evening Snack', 'time' => '05:30 PM', 'items' => 'Roasted Chana + Black Coffee + 1 Apple', 'calories' => 220, 'protein' => 10, 'carbs' => 38, 'fats' => 3],
                        ['id' => 'd-mo-5', 'name' => 'Lean Dinner', 'time' => '08:45 PM', 'items' => 'Paneer Bhurji with 2 Chapatis + Stir-fried Broccoli', 'calories' => 640, 'protein' => 45, 'carbs' => 60, 'fats' => 16],
                    ]
                ],
                [
                    'day' => 'Tuesday',
                    'meals' => [
                        ['id' => 'd-tu-1', 'name' => 'Power Breakfast', 'time' => '08:30 AM', 'items' => 'Moong Dal Chilla (3 pcs) + Green Chutney + 1 Glass Milk', 'calories' => 520, 'protein' => 30, 'carbs' => 58, 'fats' => 14],
                        ['id' => 'd-tu-2', 'name' => 'Mid-Morning Fuel', 'time' => '11:30 AM', 'items' => 'Protein Bar + 1 Banana', 'calories' => 280, 'protein' => 22, 'carbs' => 32, 'fats' => 8],
                        ['id' => 'd-tu-3', 'name' => 'Post-Workout Lunch', 'time' => '02:00 PM', 'items' => 'Fish Curry (180g) + Steamed Rice + Sabzi + Raita', 'calories' => 690, 'protein' => 48, 'carbs' => 80, 'fats' => 15],
                        ['id' => 'd-tu-4', 'name' => 'Evening Snack', 'time' => '05:30 PM', 'items' => 'Sprouts Chaat + Green Tea', 'calories' => 200, 'protein' => 12, 'carbs' => 30, 'fats' => 4],
                        ['id' => 'd-tu-5', 'name' => 'Lean Dinner', 'time' => '08:45 PM', 'items' => 'Egg White Omelette (5 whites) + 2 Multigrain Toast + Soup', 'calories' => 420, 'protein' => 35, 'carbs' => 40, 'fats' => 10],
                    ]
                ],
                [
                    'day' => 'Wednesday',
                    'meals' => [
                        ['id' => 'd-we-1', 'name' => 'Power Breakfast', 'time' => '08:30 AM', 'items' => 'Oats Upma with Veggies + 2 Boiled Eggs + Peanut Butter Toast', 'calories' => 610, 'protein' => 32, 'carbs' => 70, 'fats' => 20],
                        ['id' => 'd-we-2', 'name' => 'Mid-Morning Fuel', 'time' => '11:30 AM', 'items' => 'Whey Protein Shake + Mixed Dry Fruits (20g)', 'calories' => 310, 'protein' => 30, 'carbs' => 16, 'fats' => 10],
                        ['id' => 'd-we-3', 'name' => 'Post-Workout Lunch', 'time' => '02:00 PM', 'items' => 'Soya Chunk Curry + Brown Rice + Curd + Green Salad', 'calories' => 700, 'protein' => 50, 'carbs' => 88, 'fats' => 14],
                        ['id' => 'd-we-4', 'name' => 'Evening Snack', 'time' => '05:30 PM', 'items' => '1 Handful Makhana + Black Coffee', 'calories' => 180, 'protein' => 8, 'carbs' => 28, 'fats' => 4],
                        ['id' => 'd-we-5', 'name' => 'Lean Dinner', 'time' => '08:45 PM', 'items' => 'Grilled Chicken Salad with Olive Oil Dressing + 1 Chapati', 'calories' => 520, 'protein' => 42, 'carbs' => 35, 'fats' => 18],
                    ]
                ]
            ]
        ]);

        // 10. Body Metrics
        BodyMetric::create(['user_id' => $member1->id, 'date_label' => 'Oct 2025', 'weight' => 83.0, 'body_fat' => 22.5, 'muscle_mass' => 34.0]);
        BodyMetric::create(['user_id' => $member1->id, 'date_label' => 'Nov 2025', 'weight' => 81.2, 'body_fat' => 20.8, 'muscle_mass' => 34.6]);
        BodyMetric::create(['user_id' => $member1->id, 'date_label' => 'Dec 2025', 'weight' => 80.0, 'body_fat' => 19.4, 'muscle_mass' => 35.1]);
        BodyMetric::create(['user_id' => $member1->id, 'date_label' => 'Jan 2026', 'weight' => 79.1, 'body_fat' => 18.0, 'muscle_mass' => 35.8]);
        BodyMetric::create(['user_id' => $member1->id, 'date_label' => 'Feb 2026', 'weight' => 78.5, 'body_fat' => 17.2, 'muscle_mass' => 36.2]);

        // 11. Invoices
        Invoice::create([
            'invoice_number' => 'INV-2026-8891',
            'user_id' => $member1->id,
            'plan_id' => $goldPlan->id,
            'amount' => 4999,
            'date' => '2026-02-15',
            'payment_method' => 'UPI (Google Pay)',
            'status' => 'Paid',
            'invoice_url' => '#',
        ]);

        Invoice::create([
            'invoice_number' => 'INV-2026-8840',
            'user_id' => $member2->id,
            'plan_id' => $diamondPlan->id,
            'amount' => 15999,
            'date' => '2026-02-10',
            'payment_method' => 'Credit Card (HDFC)',
            'status' => 'Paid',
            'invoice_url' => '#',
        ]);

        Invoice::create([
            'invoice_number' => 'INV-2026-8722',
            'user_id' => $member4->id,
            'plan_id' => $goldPlan->id,
            'amount' => 4999,
            'date' => '2026-01-28',
            'payment_method' => 'UPI (PhonePe)',
            'status' => 'Paid',
            'invoice_url' => '#',
        ]);

        // 12. Equipment Inventory
        Equipment::create([
            'name' => 'Commercial Dual Cable Cross / Functional Trainer',
            'brand' => 'LifeFitness Signature Series',
            'category' => 'Cable / Resistance',
            'status' => 'Operational',
            'last_serviced' => '2026-01-15',
            'next_service_due' => '2026-04-15',
            'condition' => 'Excellent',
        ]);

        Equipment::create([
            'name' => 'Olympic Power Squat Racks (Set of 3)',
            'brand' => 'Rogue Fitness Monster Lite',
            'category' => 'Free Weights',
            'status' => 'Operational',
            'last_serviced' => '2026-02-01',
            'next_service_due' => '2026-05-01',
            'condition' => 'Excellent',
        ]);

        Equipment::create([
            'name' => 'Curved Motorless High-Speed Treadmill',
            'brand' => 'Woodway Curve',
            'category' => 'Cardio',
            'status' => 'Needs Inspection',
            'last_serviced' => '2025-11-20',
            'next_service_due' => '2026-02-25',
            'condition' => 'Belt friction calibration needed',
        ]);

        Equipment::create([
            'name' => 'Air Assault Fan Bikes (Set of 4)',
            'brand' => 'Assault Fitness Pro',
            'category' => 'Cardio / Conditioning',
            'status' => 'Operational',
            'last_serviced' => '2026-01-28',
            'next_service_due' => '2026-04-28',
            'condition' => 'Good',
        ]);

        $this->call([
            MultiMemberWorkoutDietSeeder::class,
            ExpensesAndEnquiriesSeeder::class,
            OperationsSeeder::class,
        ]);
    }
}
