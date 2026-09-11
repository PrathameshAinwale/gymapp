<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\Enquiry;
use App\Models\Gym;
use Illuminate\Database\Seeder;

class ExpensesAndEnquiriesSeeder extends Seeder
{
    public function run(): void
    {
        $defaultGymId = Gym::first()?->id ?? 1;

        // 1. Seed Seeded Operating Expenses
        $expenses = [
            [
                'gym_id' => $defaultGymId,
                'title' => 'Facility Commercial Lease - Powai Club',
                'category' => 'Rent',
                'vendor' => 'Hiranandani Realtors Pvt Ltd',
                'amount' => 120000.00,
                'date' => '2026-08-01',
                'payment_mode' => 'Bank Transfer',
                'ref_no' => 'LEASE-AUG-2026',
                'notes' => 'Monthly commercial premises rent including common area maintenance.',
            ],
            [
                'gym_id' => $defaultGymId,
                'title' => 'Adani Electricity Powai HT Commercial',
                'category' => 'Utilities',
                'vendor' => 'Adani Electricity Mumbai Ltd',
                'amount' => 45000.00,
                'date' => '2026-08-05',
                'payment_mode' => 'UPI',
                'ref_no' => 'BILL-AUG-9912',
                'notes' => 'HVAC central cooling units and heavy cardio floor electricity load.',
            ],
            [
                'gym_id' => $defaultGymId,
                'title' => 'Trainer & Staff Commissions Payout',
                'category' => 'Salaries',
                'vendor' => 'Pulse Fit Payroll Disbursement',
                'amount' => 48000.00,
                'date' => '2026-08-07',
                'payment_mode' => 'Bank Transfer',
                'ref_no' => 'SAL-AUG-01',
                'notes' => 'August fortnightly trainer personal training commissions and floor supervisor honorarium.',
            ],
            [
                'gym_id' => $defaultGymId,
                'title' => 'Life Fitness & Technogym AMC Inspection',
                'category' => 'Equipment AMC',
                'vendor' => 'Fitness World Services Mumbai',
                'amount' => 14500.00,
                'date' => '2026-08-10',
                'payment_mode' => 'Card',
                'ref_no' => 'AMC-Q3-004',
                'notes' => 'Quarterly cable lubrication, treadmill belt tensioning, and bio-arc sensor calibration.',
            ],
            [
                'gym_id' => $defaultGymId,
                'title' => 'Pro Shop Supplements Restock',
                'category' => 'Inventory',
                'vendor' => 'Optimum Nutrition India Wholesale',
                'amount' => 12500.00,
                'date' => '2026-08-12',
                'payment_mode' => 'UPI',
                'ref_no' => 'ON-IN-8831',
                'notes' => 'Gold Standard Whey 5lb (6 tubs) + Creatine Micronized (10 tubs) fast inventory restocking.',
            ],
            [
                'gym_id' => $defaultGymId,
                'title' => 'Social Media & Local Meta Ads Campaign',
                'category' => 'Marketing',
                'vendor' => 'Meta Platforms India',
                'amount' => 3500.00,
                'date' => '2026-08-14',
                'payment_mode' => 'Card',
                'ref_no' => 'META-AD-4412',
                'notes' => 'Hyperlocal Powai Instagram carousel targeting corporate residential leads in Hiranandani.',
            ],
        ];

        foreach ($expenses as $exp) {
            Expense::firstOrCreate(
                ['ref_no' => $exp['ref_no'], 'title' => $exp['title']],
                $exp
            );
        }

        // 2. Seed Initial Enquiries & Leads
        $enquiries = [
            [
                'gym_id' => $defaultGymId,
                'name' => 'Arjun Verma',
                'phone' => '+91 98201 12345',
                'email' => 'arjun.v@gmail.com',
                'source' => 'Walk-in',
                'interested_plan' => 'Platinum Annual All-Access',
                'fitness_goal' => 'Muscle Hypertrophy & Bulk',
                'priority' => 'Hot',
                'status' => 'Contacted',
                'follow_up_date' => '2026-08-16',
                'staff_name' => 'Coach Rohan',
                'notes' => 'Interested in 1-on-1 PT package with annual pass. Visited during evening peak.',
                'comments' => [
                    [
                        'id' => 1,
                        'text' => 'Came in at 6:30 PM. Walked through free-weights zone. Very keen on coach training.',
                        'author' => 'Coach Rohan',
                        'createdAt' => '2026-08-14 18:45'
                    ]
                ]
            ],
            [
                'gym_id' => $defaultGymId,
                'name' => 'Rohit Sharma',
                'phone' => '+91 98199 87654',
                'email' => 'rohit.s@outlook.com',
                'source' => 'Instagram',
                'interested_plan' => 'Gold Quarterly Fitness',
                'fitness_goal' => 'Weight Loss & Stamina',
                'priority' => 'Hot',
                'status' => 'Trial Scheduled',
                'follow_up_date' => '2026-08-15',
                'staff_name' => 'Coach Priya',
                'notes' => 'Booked 1-day complimentary floor workout pass for Saturday morning.',
                'comments' => [
                    [
                        'id' => 1,
                        'text' => 'Messaged on IG asking about Saturday morning batch. Trial booked for 8 AM.',
                        'author' => 'Coach Priya',
                        'createdAt' => '2026-08-14 12:15'
                    ]
                ]
            ],
            [
                'gym_id' => $defaultGymId,
                'name' => 'Priya Patil',
                'phone' => '+91 97654 32109',
                'email' => 'priya.patil@yahoo.com',
                'source' => 'Referral',
                'interested_plan' => 'Silver Monthly Pass',
                'fitness_goal' => 'Mobility & Yoga',
                'priority' => 'Warm',
                'status' => 'New',
                'follow_up_date' => '2026-08-17',
                'staff_name' => 'Coach Vikram',
                'notes' => 'Referred by member Ananya Roy. Wants early morning slot only.',
                'comments' => [
                    [
                        'id' => 1,
                        'text' => 'Ananya mentioned her colleague wants to join. Scheduled callback for Monday morning.',
                        'author' => 'Coach Vikram',
                        'createdAt' => '2026-08-13 16:30'
                    ]
                ]
            ],
            [
                'gym_id' => $defaultGymId,
                'name' => 'Vikram Rao',
                'phone' => '+91 99302 45678',
                'email' => 'vikram.rao@techcorp.in',
                'source' => 'Corporate Tie-up',
                'interested_plan' => 'Platinum Annual All-Access',
                'fitness_goal' => 'Strength & Conditioning',
                'priority' => 'Cold',
                'status' => 'Contacted',
                'follow_up_date' => '2026-08-20',
                'staff_name' => 'Admin Sunita',
                'notes' => 'Corporate discount inquiry from TCS Powai office. Follow up post budget approval.',
                'comments' => [
                    [
                        'id' => 1,
                        'text' => 'Sent corporate discount matrix for 10+ employees. Awaiting HR approval.',
                        'author' => 'Admin Sunita',
                        'createdAt' => '2026-08-12 11:00'
                    ]
                ]
            ],
            [
                'gym_id' => $defaultGymId,
                'name' => 'Sneha Nair',
                'phone' => '+91 98450 78901',
                'email' => 'sneha.nair@gmail.com',
                'source' => 'Google Maps',
                'interested_plan' => 'Gold Quarterly Fitness',
                'fitness_goal' => 'Post-rehab Strength',
                'priority' => 'Warm',
                'status' => 'Trial Scheduled',
                'follow_up_date' => '2026-08-18',
                'staff_name' => 'Coach Rohan',
                'notes' => 'Recovering from ACL sprain. Needs certified trainer evaluation on trial day.',
                'comments' => [
                    [
                        'id' => 1,
                        'text' => 'Advised to bring doctor fitness clearance certificate. Rohan will take mobility screening.',
                        'author' => 'Coach Rohan',
                        'createdAt' => '2026-08-13 14:20'
                    ]
                ]
            ],
        ];

        foreach ($enquiries as $enq) {
            Enquiry::firstOrCreate(
                ['phone' => $enq['phone'], 'name' => $enq['name']],
                $enq
            );
        }
    }
}
