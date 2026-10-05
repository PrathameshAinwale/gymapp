<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create saas_plans table
        if (!Schema::hasTable('saas_plans')) {
            Schema::create('saas_plans', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->string('name');
                $table->string('tier')->default('Bronze'); // Bronze, Silver, Gold, Platinum, Custom
                $table->decimal('monthly_price', 10, 2)->nullable();
                $table->decimal('annual_price', 10, 2)->nullable();
                $table->integer('max_members')->nullable();
                $table->integer('max_trainers')->nullable();
                $table->integer('max_branches')->default(1);
                $table->json('features')->nullable();
                $table->text('description')->nullable();
                $table->string('badge_color')->nullable();
                $table->boolean('is_popular')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });

            // Seed default 4 Tier Plans: Bronze, Silver, Gold, Platinum
            $defaultPlans = [
                [
                    'slug' => 'bronze',
                    'name' => 'Bronze Starter Plan',
                    'tier' => 'Bronze',
                    'monthly_price' => 999.00,
                    'annual_price' => 9999.00,
                    'max_members' => 150,
                    'max_trainers' => 3,
                    'max_branches' => 1,
                    'features' => json_encode([
                        'enquiry',
                        'members',
                        'plans',
                        'attendance',
                        'settings'
                    ]),
                    'description' => 'Essential operations and member management for fitness studios and newly launched gym centers.',
                    'badge_color' => 'amber',
                    'is_popular' => false,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'slug' => 'silver',
                    'name' => 'Silver Growth Plan',
                    'tier' => 'Silver',
                    'monthly_price' => 1799.00,
                    'annual_price' => 18000.00,
                    'max_members' => 350,
                    'max_trainers' => 8,
                    'max_branches' => 1,
                    'features' => json_encode([
                        'enquiry',
                        'members',
                        'plans',
                        'attendance',
                        'settings',
                        'whatsapp',
                        'staff',
                        'diet_workout',
                        'reports'
                    ]),
                    'description' => 'Growing clubs needing staff workflows, WhatsApp automation triggers, and client training trackers.',
                    'badge_color' => 'slate',
                    'is_popular' => false,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'slug' => 'gold',
                    'name' => 'Gold Pro Club Plan',
                    'tier' => 'Gold',
                    'monthly_price' => 2499.00,
                    'annual_price' => 24000.00,
                    'max_members' => 700,
                    'max_trainers' => 15,
                    'max_branches' => 2,
                    'features' => json_encode([
                        'enquiry',
                        'members',
                        'plans',
                        'attendance',
                        'settings',
                        'whatsapp',
                        'staff',
                        'diet_workout',
                        'reports',
                        'finance',
                        'pos',
                        'biometric',
                        'commissions',
                        'analytics'
                    ]),
                    'description' => 'Comprehensive gym automation with biometric machine sync, POS store, finance ledger, and coach commissions.',
                    'badge_color' => 'yellow',
                    'is_popular' => true,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'slug' => 'platinum',
                    'name' => 'Platinum Enterprise Plan',
                    'tier' => 'Platinum',
                    'monthly_price' => null, // Flat annual package as requested
                    'annual_price' => 30000.00,
                    'max_members' => null, // Unlimited
                    'max_trainers' => null, // Unlimited
                    'max_branches' => 5,
                    'features' => json_encode([
                        'enquiry',
                        'members',
                        'plans',
                        'attendance',
                        'settings',
                        'whatsapp',
                        'staff',
                        'diet_workout',
                        'reports',
                        'finance',
                        'pos',
                        'biometric',
                        'commissions',
                        'analytics',
                        'mobile_app',
                        'multi_branch',
                        'white_label',
                        'priority_support'
                    ]),
                    'description' => 'The ultimate all-inclusive plan: ₹30,000 for 1 year with all mobile applications, multi-branch, white-label branding, and unlimited athlete capacity.',
                    'badge_color' => 'purple',
                    'is_popular' => false,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('saas_plans')->insert($defaultPlans);
        }

        // 2. Create platform_pages table for Privacy Policy, Terms & Conditions, and Help & Support
        if (!Schema::hasTable('platform_pages')) {
            Schema::create('platform_pages', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique(); // 'privacy-policy', 'terms-conditions', 'help-support'
                $table->string('title');
                $table->longText('content')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });

            // Seed initial contents
            $defaultPages = [
                [
                    'slug' => 'privacy-policy',
                    'title' => 'Privacy Policy',
                    'content' => "At ARCHFIT, we are committed to protecting the privacy, security, and integrity of personal information for gym owners, managers, coaches, and athletes.\n\n### 1. Information We Collect\nWe collect information necessary to provide gym management services, including:\n- Contact Information: Full name, phone number, email address, and physical address.\n- Membership & Attendance Data: Admission records, check-in timestamps, attendance punches, and RFID/Biometric access logs.\n- Fitness & Health Profile: Body measurements, trainer notes, and customized workout/diet charts voluntarily shared.\n- Financial Records: Invoices, receipt numbers, and billing history.\n\n### 2. How We Use Your Data\nYour information is used strictly to:\n- Administer club operations, classes, personal training schedules, and gym memberships.\n- Send transaction receipts, membership expiration alerts, and automated WhatsApp notifications.\n- Ensure facility access security and prevent unauthorized entry.\n\n### 3. Data Protection & Security\nWe implement enterprise-grade encryption (TLS/HTTPS), strict role-based access control, hashed passwords, and automated daily backups to safeguard all member and facility records.\n\n### 4. Contact Us Regarding Privacy\nFor questions regarding data access, corrections, or privacy concerns, please contact our Data Protection Officer at privacy@archfit.com.",
                    'metadata' => json_encode([
                        'last_updated' => '2026-10-01',
                        'effective_date' => '2026-01-01',
                        'version' => '2.1'
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'slug' => 'terms-conditions',
                    'title' => 'Terms and Conditions',
                    'content' => "Welcome to ARCHFIT Club Management Platform. By accessing or using our application, websites, or services, you agree to comply with and be bound by the following Terms and Conditions.\n\n### 1. Acceptance of Terms\nThese Terms apply to all facility owners, staff members, coaches, and gym athletes. If you disagree with any portion of these terms, please discontinue use immediately.\n\n### 2. Facility Access & Membership Rules\n- Members must scan active QR passes or biometric devices upon arrival.\n- Memberships are strictly non-transferable unless explicitly processed through the official Membership Transfer workflow.\n- Appropriate athletic attire and indoor training footwear are mandatory across all workout zones.\n\n### 3. Billing, Fees & Cancellation\n- Membership fees must be settled prior to or on the scheduled due date.\n- Refund requests are subject to the specific refund and cancellation policy established by your facility management.\n\n### 4. Health & Safety Disclaimer\nParticipation in athletic exercise and fitness programs involves inherent risk. Members must declare relevant medical conditions and acknowledge that facility workouts are undertaken at their own discretion.\n\n### 5. Termination & Suspension\nFacility owners reserve the right to suspend or terminate accounts that breach safety protocols, conduct guidelines, or terms of service.",
                    'metadata' => json_encode([
                        'last_updated' => '2026-10-01',
                        'jurisdiction' => 'India',
                        'version' => '1.8'
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'slug' => 'help-support',
                    'title' => 'Help and Support',
                    'content' => "Welcome to ARCHFIT Dedicated Support Center. Our team is committed to ensuring seamless 24/7 facility operations, hardware integrations, and billing workflows.\n\n### Quick Assistance Channels\nNeed help with turnstile setup, biometric sync, WhatsApp templates, or member billing? Reach out through any of our direct support desks listed below.",
                    'metadata' => json_encode([
                        'support_email' => 'support@archfit.com',
                        'support_phone' => '+91 98200 98200',
                        'whatsapp_number' => '+91 98200 98200',
                        'operating_hours' => 'Monday - Saturday: 8:00 AM - 10:00 PM IST',
                        'faqs' => [
                            [
                                'question' => 'How do I add a new member or issue a gym pass?',
                                'answer' => 'Navigate to Operations & Schedule > Member Directory, click "+ Add Member", fill in athlete details, assign a membership plan, and save to generate an instant QR pass.'
                            ],
                            [
                                'question' => 'How do automated WhatsApp reminders work?',
                                'answer' => 'Under Operations, go to WhatsApp & Templates. You can preview, edit, and trigger pre-configured templates for Welcome alerts, Membership expiry notices, and Birthday wishes.'
                            ],
                            [
                                'question' => 'Can I connect our eSSL or ZKTeco biometric machine?',
                                'answer' => 'Yes! ARCHFIT provides native ADMS real-time push integration. Go to Hardware Settings or contact support for your cloud server IP & port credentials.'
                            ],
                            [
                                'question' => 'How can we upgrade our facility subscription plan?',
                                'answer' => 'Contact the ARCHFIT Superadmin team or WhatsApp support directly to upgrade to Gold or Platinum Enterprise plans.'
                            ]
                        ]
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('platform_pages')->insert($defaultPages);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_pages');
        Schema::dropIfExists('saas_plans');
    }
};
