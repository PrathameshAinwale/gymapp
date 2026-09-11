<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Commission;
use App\Models\MembershipFreeze;
use App\Models\ConsentForm;
use App\Models\Payroll;
use App\Models\BiometricDevice;
use App\Models\BiometricLog;
use App\Models\EntryApproval;
use App\Models\PtPlan;
use App\Models\RecoveryPlan;
use App\Models\Gym;
use Illuminate\Database\Seeder;

class OperationsSeeder extends Seeder
{
    public function run(): void
    {
        $gymId = Gym::first()?->id ?? 1;

        // 1. Pro Shop Products
        $products = [
            [
                'gym_id' => $gymId,
                'name' => 'Optimum Nutrition Gold Standard Whey (5 lbs)',
                'category' => 'Supplements',
                'price' => 6499.00,
                'stock' => 18,
                'min_stock_alert' => 5,
                'status' => 'In Stock',
                'image' => 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=300&auto=format&fit=crop&q=80',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'Cellucor C4 Original Pre-Workout (60 Servings)',
                'category' => 'Supplements',
                'price' => 2899.00,
                'stock' => 12,
                'min_stock_alert' => 4,
                'status' => 'In Stock',
                'image' => 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=300&auto=format&fit=crop&q=80',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'MuscleBlaze Creatine Monohydrate (400g)',
                'category' => 'Supplements',
                'price' => 1199.00,
                'stock' => 24,
                'min_stock_alert' => 6,
                'status' => 'In Stock',
                'image' => 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300&auto=format&fit=crop&q=80',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'PulseFit Steel Matte Shaker Bottle (750ml)',
                'category' => 'Accessories',
                'price' => 799.00,
                'stock' => 35,
                'min_stock_alert' => 10,
                'status' => 'In Stock',
                'image' => 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=300&auto=format&fit=crop&q=80',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'Harbinger Heavy Duty Padded Lifting Straps',
                'category' => 'Accessories',
                'price' => 999.00,
                'stock' => 8,
                'min_stock_alert' => 3,
                'status' => 'In Stock',
                'image' => 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'PulseFit Athletic Dry-Fit Gym T-Shirt (L)',
                'category' => 'Apparel',
                'price' => 1299.00,
                'stock' => 15,
                'min_stock_alert' => 5,
                'status' => 'In Stock',
                'image' => 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'RDX 4-inch Leather Weightlifting Belt (M)',
                'category' => 'Accessories',
                'price' => 2499.00,
                'stock' => 4,
                'min_stock_alert' => 5,
                'status' => 'Low Stock',
                'image' => 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=300&auto=format&fit=crop&q=80',
            ],
        ];
        foreach ($products as $p) {
            Product::firstOrCreate(['name' => $p['name']], $p);
        }

        // 2. Trainer Commissions
        $commissions = [
            [
                'gym_id' => $gymId,
                'trainer_id' => 1,
                'trainer_name' => 'Coach Alex Rivers',
                'member_name' => 'Marcus Aurelius',
                'plan_name' => '1-on-1 PT Master Tier (12 Sessions)',
                'session_type' => 'Personal Training (PT)',
                'rate_percent' => 20.00,
                'amount' => 2400.00,
                'date' => '2026-08-10',
                'status' => 'Paid',
            ],
            [
                'gym_id' => $gymId,
                'trainer_id' => 2,
                'trainer_name' => 'Coach Elena Rostova',
                'member_name' => 'Priya Sharma',
                'plan_name' => 'HIIT Power Hour Group Batch',
                'session_type' => 'Group Class Instruction',
                'rate_percent' => 15.00,
                'amount' => 1500.00,
                'date' => '2026-08-11',
                'status' => 'Paid',
            ],
            [
                'gym_id' => $gymId,
                'trainer_id' => 1,
                'trainer_name' => 'Coach Alex Rivers',
                'member_name' => 'Rohan Joshi',
                'plan_name' => 'Olympic Weightlifting Foundation (8 Sessions)',
                'session_type' => 'Personal Training (PT)',
                'rate_percent' => 20.00,
                'amount' => 1800.00,
                'date' => '2026-08-13',
                'status' => 'Pending',
            ],
            [
                'gym_id' => $gymId,
                'trainer_id' => 3,
                'trainer_name' => 'Coach Marcus Vance',
                'member_name' => 'Ananya Roy',
                'plan_name' => 'Vinyasa Flow Sunset Batch',
                'session_type' => 'Group Class Instruction',
                'rate_percent' => 15.00,
                'amount' => 1200.00,
                'date' => '2026-08-14',
                'status' => 'Pending',
            ],
        ];
        foreach ($commissions as $c) {
            Commission::firstOrCreate(
                ['trainer_name' => $c['trainer_name'], 'member_name' => $c['member_name'], 'date' => $c['date']],
                $c
            );
        }

        // 3. Membership Freezes
        $freezes = [
            [
                'gym_id' => $gymId,
                'member_id' => 7,
                'member_name' => 'Rohan Joshi',
                'plan_name' => 'Gold Quarterly Fitness',
                'freeze_start_date' => '2026-08-05',
                'freeze_end_date' => '2026-08-25',
                'days_frozen' => 20,
                'reason' => 'Overseas business assignment to Singapore.',
                'status' => 'Active Freeze',
                'approved_by' => 'Vikramaditya Singhania (Owner)',
            ],
            [
                'gym_id' => $gymId,
                'member_id' => 8,
                'member_name' => 'Sneha Kapoor',
                'plan_name' => 'Silver Monthly Pass',
                'freeze_start_date' => '2026-07-10',
                'freeze_end_date' => '2026-07-25',
                'days_frozen' => 15,
                'reason' => 'Ankle ligament sprain recovery.',
                'status' => 'Completed',
                'approved_by' => 'Vikramaditya Singhania (Owner)',
            ],
        ];
        foreach ($freezes as $f) {
            MembershipFreeze::firstOrCreate(
                ['member_name' => $f['member_name'], 'freeze_start_date' => $f['freeze_start_date']],
                $f
            );
        }

        // 4. Digital Consent & Waivers
        $consents = [
            [
                'gym_id' => $gymId,
                'member_id' => 1,
                'member_name' => 'Marcus Aurelius',
                'phone' => '+91 98201 11111',
                'plan_name' => 'Diamond VIP Annual Elite',
                'emergency_contact' => 'Faustina Aurelius (Spouse)',
                'emergency_phone' => '+91 98201 99991',
                'medical_conditions' => 'None reported. Cleared for heavy resistance training.',
                'signed_date' => '2026-01-10',
                'status' => 'Signed',
            ],
            [
                'gym_id' => $gymId,
                'member_id' => 2,
                'member_name' => 'Priya Sharma',
                'phone' => '+91 98201 22222',
                'plan_name' => 'Platinum Half-Yearly',
                'emergency_contact' => 'Dr. R. Sharma (Father)',
                'emergency_phone' => '+91 98201 99992',
                'medical_conditions' => 'Mild asthmatic wheeze during intense winter cardio.',
                'signed_date' => '2026-03-15',
                'status' => 'Signed',
            ],
            [
                'gym_id' => $gymId,
                'member_id' => 3,
                'member_name' => 'Rahul Dravid',
                'phone' => '+91 98201 33333',
                'plan_name' => 'Gold Quarterly Fitness',
                'emergency_contact' => 'Vijeta Dravid (Spouse)',
                'emergency_phone' => '+91 98201 99993',
                'medical_conditions' => 'Previous lower back strain from professional athletics.',
                'signed_date' => '2026-06-01',
                'status' => 'Signed',
            ],
        ];
        foreach ($consents as $cs) {
            ConsentForm::firstOrCreate(['member_name' => $cs['member_name']], $cs);
        }

        // 5. Employee Payroll
        $payrolls = [
            [
                'gym_id' => $gymId,
                'employee_id' => 1,
                'employee_name' => 'Coach Alex Rivers',
                'role' => 'Head Strength Coach & CSCS',
                'month' => 'July 2026',
                'base_salary' => 65000.00,
                'bonus' => 9500.00,
                'deductions' => 2000.00,
                'net_pay' => 72500.00,
                'status' => 'Paid',
                'pay_date' => '2026-08-01',
            ],
            [
                'gym_id' => $gymId,
                'employee_id' => 2,
                'employee_name' => 'Coach Elena Rostova',
                'role' => 'Functional Movement Lead',
                'month' => 'July 2026',
                'base_salary' => 55000.00,
                'bonus' => 7200.00,
                'deductions' => 1500.00,
                'net_pay' => 60700.00,
                'status' => 'Paid',
                'pay_date' => '2026-08-01',
            ],
            [
                'gym_id' => $gymId,
                'employee_id' => 3,
                'employee_name' => 'Coach Marcus Vance',
                'role' => 'Yoga & Mobility Master',
                'month' => 'July 2026',
                'base_salary' => 50000.00,
                'bonus' => 5000.00,
                'deductions' => 1200.00,
                'net_pay' => 53800.00,
                'status' => 'Paid',
                'pay_date' => '2026-08-01',
            ],
            [
                'gym_id' => $gymId,
                'employee_id' => 1,
                'employee_name' => 'Coach Alex Rivers',
                'role' => 'Head Strength Coach & CSCS',
                'month' => 'August 2026',
                'base_salary' => 65000.00,
                'bonus' => 12000.00,
                'deductions' => 2000.00,
                'net_pay' => 75000.00,
                'status' => 'Pending',
                'pay_date' => null,
            ],
        ];
        foreach ($payrolls as $pay) {
            Payroll::firstOrCreate(
                ['employee_name' => $pay['employee_name'], 'month' => $pay['month']],
                $pay
            );
        }

        // 6. Biometric Devices
        $devices = [
            [
                'gym_id' => $gymId,
                'name' => 'Main Turnstile Gateway A (Entry)',
                'ip_address' => '192.168.1.101',
                'serial_no' => 'PF-TRN-8821-A',
                'location' => 'Main Reception Lobby',
                'status' => 'Connected & Online',
                'total_punches_today' => 38,
                'pulse_duration_sec' => 5,
                'last_sync' => 'Just now (Live WebSocket)',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'Main Turnstile Gateway B (Exit & VIP)',
                'ip_address' => '192.168.1.102',
                'serial_no' => 'PF-TRN-8822-B',
                'location' => 'Lobby West Exit',
                'status' => 'Connected & Online',
                'total_punches_today' => 32,
                'pulse_duration_sec' => 5,
                'last_sync' => '1 min ago',
            ],
            [
                'gym_id' => $gymId,
                'name' => 'VIP Steam & Recovery Turnstile C',
                'ip_address' => '192.168.1.105',
                'serial_no' => 'PF-TRN-9014-C',
                'location' => 'Zone D Recovery Area',
                'status' => 'Connected & Online',
                'total_punches_today' => 14,
                'pulse_duration_sec' => 4,
                'last_sync' => 'Just now',
            ],
        ];
        foreach ($devices as $d) {
            BiometricDevice::firstOrCreate(['serial_no' => $d['serial_no']], $d);
        }

        // 7. Biometric Punch Logs
        $logs = [
            [
                'gym_id' => $gymId,
                'device_id' => 'bio-dev-1',
                'device_name' => 'Main Turnstile Gateway A (Entry)',
                'person_name' => 'Marcus Aurelius',
                'person_type' => 'Diamond VIP Member',
                'verification_mode' => 'Dynamic QR Scan',
                'result' => 'Access Granted',
                'gate_trigger' => 'Turnstile Flap Unlocked (5s)',
                'event_time' => '07:12:44 AM',
            ],
            [
                'gym_id' => $gymId,
                'device_id' => 'bio-dev-1',
                'device_name' => 'Main Turnstile Gateway A (Entry)',
                'person_name' => 'Priya Sharma',
                'person_type' => 'Platinum Member',
                'verification_mode' => 'RFID Turnstile Band',
                'result' => 'Access Granted',
                'gate_trigger' => 'Turnstile Flap Unlocked (5s)',
                'event_time' => '07:28:19 AM',
            ],
            [
                'gym_id' => $gymId,
                'device_id' => 'bio-dev-2',
                'device_name' => 'Main Turnstile Gateway B (Exit & VIP)',
                'person_name' => 'Coach Alex Rivers',
                'person_type' => 'Staff / Coach',
                'verification_mode' => 'Biometric Fingerprint',
                'result' => 'Access Granted',
                'gate_trigger' => 'Staff Bypass Pulse',
                'event_time' => '07:45:02 AM',
            ],
            [
                'gym_id' => $gymId,
                'device_id' => 'bio-dev-1',
                'device_name' => 'Main Turnstile Gateway A (Entry)',
                'person_name' => 'Rahul Dravid',
                'person_type' => 'Gold Member',
                'verification_mode' => 'Dynamic QR Scan',
                'result' => 'Access Granted',
                'gate_trigger' => 'Turnstile Flap Unlocked (5s)',
                'event_time' => '08:05:31 AM',
            ],
        ];
        foreach ($logs as $l) {
            BiometricLog::firstOrCreate(
                ['person_name' => $l['person_name'], 'event_time' => $l['event_time']],
                $l
            );
        }

        // 8. Entry Approvals (Gate Overrides)
        $approvals = [
            [
                'gym_id' => $gymId,
                'member_id' => 9,
                'member_name' => 'Vikram Malhotra',
                'avatar' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
                'issue' => 'Expired Pass (Overdue by 3 days)',
                'gate' => 'Turnstile Gate B',
                'reason' => 'Requested 1-day extension while renewal bank wire processes.',
                'requested_time' => '4 mins ago',
                'status' => 'Pending Approval',
            ],
            [
                'gym_id' => $gymId,
                'member_id' => 7,
                'member_name' => 'Rohan Joshi',
                'avatar' => 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
                'issue' => 'Membership On Active Freeze',
                'gate' => 'Turnstile Gate A',
                'reason' => 'Came in to collect locker belongings prior to flight.',
                'requested_time' => '11 mins ago',
                'status' => 'Pending Approval',
            ],
        ];
        foreach ($approvals as $a) {
            EntryApproval::firstOrCreate(['member_name' => $a['member_name'], 'issue' => $a['issue']], $a);
        }

        // 9. Personal Training Packages
        $ptPlans = [
            [
                'gym_id' => $gymId,
                'name' => 'Kickstarter PT (6 Sessions)',
                'price' => 7499.00,
                'sessions' => 6,
                'duration_weeks' => 3,
                'popular' => false,
                'color' => 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
                'features' => [
                    'Form correction & posture biomechanics screening',
                    'Cardio conditioning & free-weight technique',
                    'Custom workout split for off-trainer days',
                    'Valid across 21 calendar days'
                ],
            ],
            [
                'gym_id' => $gymId,
                'name' => 'Transformation Intensive (12 Sessions)',
                'price' => 13999.00,
                'sessions' => 12,
                'duration_weeks' => 6,
                'popular' => true,
                'color' => 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40',
                'features' => [
                    '1-on-1 dedicated coach training',
                    'Custom macro diet chart with weekly adjustments',
                    'InBody body scan every 2 weeks',
                    'Priority slot booking during peak hours'
                ],
            ],
            [
                'gym_id' => $gymId,
                'name' => 'Pro Athlete Mastery (24 Sessions)',
                'price' => 24999.00,
                'sessions' => 24,
                'duration_weeks' => 12,
                'popular' => false,
                'color' => 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
                'features' => [
                    'Senior CSCS coach guidance for power & hypertrophy',
                    'Advanced supplement stack recommendation',
                    'Daily nutrition diary auditing via WhatsApp',
                    'Recovery room & ice bath access included'
                ],
            ],
        ];
        foreach ($ptPlans as $pt) {
            PtPlan::firstOrCreate(['name' => $pt['name']], $pt);
        }

        // 10. Recovery & Therapy Packages
        $recoveryPlans = [
            [
                'gym_id' => $gymId,
                'name' => 'Deep Tissue Sports Massage',
                'price' => 1799.00,
                'duration' => '60 Mins',
                'sessions' => 1,
                'popular' => true,
                'color' => 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40',
                'features' => [
                    'Targeted trigger point myofascial release',
                    'Warm herbal compression & eucalyptus essential oil',
                    'Accelerates post-leg-day lactic acid flushing',
                    'Administered by licensed sports physiotherapist'
                ],
            ],
            [
                'gym_id' => $gymId,
                'name' => 'Sub-Zero Cryo & Ice Bath Session',
                'price' => 999.00,
                'duration' => '20 Mins',
                'sessions' => 1,
                'popular' => false,
                'color' => 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
                'features' => [
                    'Cold shock immersion at 6°C - 8°C water temperature',
                    'Reduces acute inflammation and systemic DOMS soreness',
                    'Guided breathwork coaching before immersion',
                    'Followed by warm Himalayan salt steam room'
                ],
            ],
            [
                'gym_id' => $gymId,
                'name' => 'Normatec Pneumatic Compression Therapy',
                'price' => 799.00,
                'duration' => '30 Mins',
                'sessions' => 1,
                'popular' => false,
                'color' => 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
                'features' => [
                    'Dynamic pulse sequential limb compression boots',
                    'Improves lymphatic drainage & venal return',
                    'Zero physical stress — relax in VIP recliner',
                    'Ideal pre-race or post-heavy-squat recovery'
                ],
            ],
        ];
        foreach ($recoveryPlans as $rc) {
            RecoveryPlan::firstOrCreate(['name' => $rc['name']], $rc);
        }
    }
}
