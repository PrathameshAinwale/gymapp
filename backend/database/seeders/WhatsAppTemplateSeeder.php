<?php

namespace Database\Seeders;

use App\Models\Gym;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\User;
use App\Models\WhatsAppTemplate;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class WhatsAppTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $gym = Gym::first();
        $gymId = $gym ? $gym->id : 1;
        $today = Carbon::today();

        // 1. Seed Rich Pre-configured WhatsApp Message Templates
        $defaultTemplates = [
            [
                'gym_id'          => $gymId,
                'name'            => 'Member Birthday Celebration Perk',
                'category'        => 'birthday',
                'target_role'     => 'member',
                'timing_trigger'  => 'on_birthday',
                'is_active'       => true,
                'is_auto_enabled' => true,
                'message_body'    => "*Happy Birthday {{name}}!*\n\nWishing you boundless strength, great health, and many more PRs this year from the entire team at *{{gym_name}}*!\n\nAs our birthday gift, drop by the reception today for a complimentary recovery shake / 1-day guest pass for a buddy! Enjoy your special day!",
            ],
            [
                'gym_id'          => $gymId,
                'name'            => 'Coach & Staff Birthday Greeting',
                'category'        => 'birthday',
                'target_role'     => 'trainer',
                'timing_trigger'  => 'on_birthday',
                'is_active'       => true,
                'is_auto_enabled' => true,
                'message_body'    => "*Happy Birthday Coach {{name}}!*\n\nThank you for the infectious energy, dedication, and inspirational guidance you bring to *{{gym_name}}* every day! You make our fitness family thrive.\n\nWishing you an incredible year ahead filled with personal triumphs and milestones! Enjoy your day!",
            ],
            [
                'gym_id'          => $gymId,
                'name'            => '7-Day Membership Expiry Notice',
                'category'        => 'expiry_reminder',
                'target_role'     => 'member',
                'timing_trigger'  => 'days_before_expiry_7',
                'is_active'       => true,
                'is_auto_enabled' => true,
                'message_body'    => "Hi *{{name}}*,\n\nYour *{{gym_name}}* membership for the *{{plan_name}}* plan is scheduled to expire in *{{days_left}} days* on *{{expiry_date}}*.\n\nDon't let your hard-earned progress pause! Renew your plan this week at the front desk or via UPI to lock in continuous access and exclusive renewal benefits.\n\nReach out if you need assistance!",
            ],
            [
                'gym_id'          => $gymId,
                'name'            => '3-Day Urgent Renewal Reminder',
                'category'        => 'expiry_reminder',
                'target_role'     => 'member',
                'timing_trigger'  => 'days_before_expiry_3',
                'is_active'       => true,
                'is_auto_enabled' => true,
                'message_body'    => "*Urgent Notice for {{name}}*:\n\nYour fitness membership at *{{gym_name}}* expires in just *{{days_left}} days* ({{expiry_date}}).\n\nAvoid turnstile access deactivation — renew today and keep smashing your fitness goals! Contact the front desk now.",
            ],
            [
                'gym_id'          => $gymId,
                'name'            => 'New Member Welcome Pack',
                'category'        => 'welcome',
                'target_role'     => 'member',
                'timing_trigger'  => 'on_signup',
                'is_active'       => true,
                'is_auto_enabled' => true,
                'message_body'    => "*Welcome to the {{gym_name}} Family, {{name}}!*\n\nWe are thrilled to accompany you on your transformation journey. Your *{{plan_name}}* is now active!\n\nQuick Gym Guide:\n• Operating Hours: Mon-Sat 5:30 AM - 11:00 PM | Sun 6:00 AM - 8:00 PM\n• Check-in: Scan your QR code at turnstile gates\n• Locker & Showers: Available for all active members\n\nSee you on the gym floor! Let's crush it!",
            ],
            [
                'gym_id'          => $gymId,
                'name'            => 'Membership Fee Due Notice',
                'category'        => 'fee_due',
                'target_role'     => 'member',
                'timing_trigger'  => 'on_dues_pending',
                'is_active'       => true,
                'is_auto_enabled' => true,
                'message_body'    => "*Fee Payment Reminder*\n\nDear *{{name}}*,\n\nThis is a friendly reminder from *{{gym_name}}* that an outstanding dues amount of *{{dues_amount}}* is pending on your account.\n\nKindly clear the payment at the front desk or via UPI to maintain seamless workout access. Thank you for your co-operation!",
            ],
            [
                'gym_id'          => $gymId,
                'name'            => 'We Miss You - 7-Day Inactivity Check-in',
                'category'        => 'absentee',
                'target_role'     => 'member',
                'timing_trigger'  => 'manual',
                'is_active'       => true,
                'is_auto_enabled' => true,
                'message_body'    => "*Hey {{name}}, we miss you on the gym floor!*\n\nConsistency is the secret to real fitness breakthroughs. We noticed it's been over a week since your last check-in at *{{gym_name}}*.\n\nNeed a workout reset or routine refresher? Drop by today — the iron is waiting for you! Let's get back on track!",
            ],
            [
                'gym_id'          => $gymId,
                'name'            => 'General Gym Announcement',
                'category'        => 'custom',
                'target_role'     => 'all',
                'timing_trigger'  => 'manual',
                'is_active'       => true,
                'is_auto_enabled' => false,
                'message_body'    => "*Announcement from {{gym_name}}*\n\nHello {{name}},\n\nWe have exciting updates regarding our schedule, equipment upgrades, and upcoming fitness challenges! Check out the details on your athlete dashboard or visit the front desk.\n\nStay strong, stay committed!",
            ],
        ];

        foreach ($defaultTemplates as $tpl) {
            WhatsAppTemplate::updateOrCreate(
                [
                    'gym_id'   => $gymId,
                    'name'     => $tpl['name'],
                ],
                $tpl
            );
        }

        // 2. Ensure DOBs for Members (create sample members if none exist)
        $members = MemberProfile::with('user')->get();
        if ($members->count() === 0) {
            // Create Plan if needed
            $plan = \App\Models\Plan::first() ?: \App\Models\Plan::create([
                'gym_id'   => $gymId,
                'name'     => 'Gold Annual All-Access',
                'price'    => 12999,
                'period'   => '12 Months',
                'duration' => 12,
                'features' => ['All-access gym floor', 'Locker & Steam', 'Nutrition consultation'],
            ]);

            // Member 1: Birthday TODAY!
            $u1 = User::firstOrCreate(['email' => 'rahul.sharma@pulsefit.in'], [
                'name'     => 'Rahul Sharma',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'plain_password' => 'password123',
                'role'     => 'member',
                'gym_id'   => $gymId,
                'phone'    => '+91 98765 43210',
                'avatar'   => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            ]);
            MemberProfile::firstOrCreate(['user_id' => $u1->id], [
                'plan_id'      => $plan->id,
                'status'       => 'Active',
                'join_date'    => $today->copy()->subMonths(6)->toDateString(),
                'expiry_date'  => $today->copy()->addMonths(6)->toDateString(),
                'age'          => 26,
                'dob'          => Carbon::create(1998, $today->month, $today->day)->toDateString(),
                'gender'       => 'Male',
                'dues_amount'  => 0,
                'attendance_streak' => 14,
            ]);

            // Member 2: Membership Expiring in 3 Days + Birthday TODAY!
            $u2 = User::firstOrCreate(['email' => 'ananya.verma@pulsefit.in'], [
                'name'     => 'Ananya Verma',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'plain_password' => 'password123',
                'role'     => 'member',
                'gym_id'   => $gymId,
                'phone'    => '+91 98190 87654',
                'avatar'   => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
            ]);
            MemberProfile::firstOrCreate(['user_id' => $u2->id], [
                'plan_id'      => $plan->id,
                'status'       => 'Active',
                'join_date'    => $today->copy()->subMonths(12)->toDateString(),
                'expiry_date'  => $today->copy()->addDays(3)->toDateString(),
                'age'          => 24,
                'dob'          => Carbon::create(2002, $today->month, $today->day)->toDateString(),
                'gender'       => 'Female',
                'dues_amount'  => 1500,
                'attendance_streak' => 8,
            ]);

            // Member 3: Expiring in 6 days
            $u3 = User::firstOrCreate(['email' => 'rohit.mehta@pulsefit.in'], [
                'name'     => 'Rohit Mehta',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'plain_password' => 'password123',
                'role'     => 'member',
                'gym_id'   => $gymId,
                'phone'    => '+91 97690 12345',
                'avatar'   => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
            ]);
            MemberProfile::firstOrCreate(['user_id' => $u3->id], [
                'plan_id'      => $plan->id,
                'status'       => 'Active',
                'join_date'    => $today->copy()->subMonths(3)->toDateString(),
                'expiry_date'  => $today->copy()->addDays(6)->toDateString(),
                'age'          => 29,
                'dob'          => Carbon::create(1997, 5, 15)->toDateString(),
                'gender'       => 'Male',
                'dues_amount'  => 2500,
            ]);
        } else {
            $m1 = $members->first();
            $m1->dob = Carbon::create(1998, $today->month, $today->day)->toDateString();
            $m1->save();

            if ($members->count() > 1) {
                $m2 = $members->get(1);
                $m2->dob = Carbon::create(2001, $today->month, $today->day)->toDateString();
                $m2->save();
            }
        }

        // 3. Ensure Trainers with Birthday
        $trainers = TrainerProfile::with('user')->get();
        if ($trainers->count() === 0) {
            $tUser = User::firstOrCreate(['email' => 'coach.alex@pulsefit.in'], [
                'name'     => 'Coach Alex Rivers',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'plain_password' => 'password123',
                'role'     => 'trainer',
                'gym_id'   => $gymId,
                'phone'    => '+91 98201 11223',
                'avatar'   => 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&auto=format&fit=crop&q=80',
            ]);
            TrainerProfile::firstOrCreate(['user_id' => $tUser->id], [
                'specialty'      => 'Hypertrophy & Strength',
                'experience'     => '8+ Years',
                'rating'         => 4.9,
                'monthly_salary' => 65000,
                'age'            => 33,
                'dob'            => Carbon::create(1993, $today->month, $today->day)->toDateString(),
                'gender'         => 'Male',
            ]);
        } else {
            $t1 = $trainers->first();
            $t1->dob = Carbon::create(1992, $today->month, $today->day)->toDateString();
            $t1->save();
        }
    }
}
