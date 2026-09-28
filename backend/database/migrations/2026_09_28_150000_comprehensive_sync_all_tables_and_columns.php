<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * COMPREHENSIVE SYNC MIGRATION
 * 
 * This migration ensures the live/production database has ALL tables and columns
 * that the local development database has. Every operation is idempotent —
 * guarded by Schema::hasTable() and Schema::hasColumn() checks — so it is
 * completely safe to run on ANY database state (fresh, partial, or fully migrated).
 *
 * Tables created/synced:
 *   gyms, users, plans, member_profiles, trainer_profiles, gym_classes, class_bookings,
 *   attendances, workout_plans, diet_plans, body_metrics, invoices, equipment, expenses,
 *   enquiries, personal_access_tokens, gym_settings, products, commissions,
 *   membership_freezes, consent_forms, payrolls, biometric_devices, biometric_logs,
 *   entry_approvals, pt_plans, recovery_plans, pt_sessions, pt_session_logs,
 *   trainer_reviews, advance_requests, financial_transactions, revenue_and_billings,
 *   offers, membership_transfers, leave_balances, leave_requests, whatsapp_templates,
 *   whatsapp_logs
 */
return new class extends Migration
{
    public function up(): void
    {
        // =====================================================================
        // SECTION 1: CORE TABLES
        // =====================================================================

        // --- gyms ---
        if (!Schema::hasTable('gyms')) {
            Schema::create('gyms', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->unsignedBigInteger('owner_id')->nullable();
                $table->string('tagline')->nullable();
                $table->text('logo')->nullable();
                $table->string('address')->nullable();
                $table->string('city')->nullable();
                $table->string('state')->nullable();
                $table->string('pincode', 20)->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('website')->nullable();
                $table->string('operating_hours')->nullable();
                $table->string('currency')->default('₹');
                $table->string('gst_number', 50)->nullable();
                $table->string('package')->nullable();
                $table->string('package_tier')->nullable();
                $table->json('features')->nullable();
                $table->string('billing_cycle')->default('Monthly');
                $table->date('subscription_expires_at')->nullable();
                $table->decimal('package_amount', 10, 2)->nullable();
                $table->integer('max_members')->default(250);
                $table->integer('max_trainers')->default(7);
                $table->integer('max_branches')->default(1);
                $table->string('status')->default('Active');
                $table->text('notes')->nullable();
                $table->string('initial_password')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing gyms table
        if (Schema::hasTable('gyms')) {
            Schema::table('gyms', function (Blueprint $table) {
                if (!Schema::hasColumn('gyms', 'owner_id')) {
                    $table->unsignedBigInteger('owner_id')->nullable()->after('name');
                }
                if (!Schema::hasColumn('gyms', 'tagline')) {
                    $table->string('tagline')->nullable()->after('owner_id');
                }
                if (!Schema::hasColumn('gyms', 'logo')) {
                    $table->text('logo')->nullable()->after('tagline');
                }
                if (!Schema::hasColumn('gyms', 'state')) {
                    $table->string('state')->nullable()->after('city');
                }
                if (!Schema::hasColumn('gyms', 'pincode')) {
                    $table->string('pincode', 20)->nullable()->after('state');
                }
                if (!Schema::hasColumn('gyms', 'website')) {
                    $table->string('website')->nullable()->after('email');
                }
                if (!Schema::hasColumn('gyms', 'operating_hours')) {
                    $table->string('operating_hours')->nullable()->after('email');
                }
                if (!Schema::hasColumn('gyms', 'currency')) {
                    $table->string('currency')->default('₹')->after('operating_hours');
                }
                if (!Schema::hasColumn('gyms', 'gst_number')) {
                    $table->string('gst_number', 50)->nullable()->after('currency');
                }
                if (!Schema::hasColumn('gyms', 'package_tier')) {
                    $table->string('package_tier')->nullable()->after('package');
                }
                if (!Schema::hasColumn('gyms', 'features')) {
                    $table->json('features')->nullable()->after('package_tier');
                }
                if (!Schema::hasColumn('gyms', 'billing_cycle')) {
                    $table->string('billing_cycle')->default('Monthly')->after('features');
                }
                if (!Schema::hasColumn('gyms', 'subscription_expires_at')) {
                    $table->date('subscription_expires_at')->nullable()->after('billing_cycle');
                }
                if (!Schema::hasColumn('gyms', 'package_amount')) {
                    $table->decimal('package_amount', 10, 2)->nullable()->after('subscription_expires_at');
                }
                if (!Schema::hasColumn('gyms', 'max_members')) {
                    $table->integer('max_members')->default(250)->after('package_amount');
                }
                if (!Schema::hasColumn('gyms', 'max_trainers')) {
                    $table->integer('max_trainers')->default(7)->after('max_members');
                }
                if (!Schema::hasColumn('gyms', 'max_branches')) {
                    $table->integer('max_branches')->default(1)->after('max_trainers');
                }
                if (!Schema::hasColumn('gyms', 'notes')) {
                    $table->text('notes')->nullable()->after('status');
                }
                if (!Schema::hasColumn('gyms', 'initial_password')) {
                    $table->string('initial_password')->nullable()->after('notes');
                }
            });
        }

        // --- users (add missing columns) ---
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'role')) {
                    $table->string('role')->default('member')->after('email');
                }
                if (!Schema::hasColumn('users', 'gym_id')) {
                    $table->unsignedBigInteger('gym_id')->nullable()->after('role');
                }
                if (!Schema::hasColumn('users', 'phone')) {
                    $table->string('phone')->nullable()->after('gym_id');
                }
                if (!Schema::hasColumn('users', 'dob')) {
                    $table->date('dob')->nullable()->after('phone');
                }
                if (!Schema::hasColumn('users', 'aadhaar_card')) {
                    $table->string('aadhaar_card', 50)->nullable()->after('dob');
                }
                if (!Schema::hasColumn('users', 'aadhaar_image')) {
                    $table->longText('aadhaar_image')->nullable()->after('aadhaar_card');
                }
                if (!Schema::hasColumn('users', 'pan_card')) {
                    $table->string('pan_card', 50)->nullable()->after('aadhaar_image');
                }
                if (!Schema::hasColumn('users', 'pan_image')) {
                    $table->longText('pan_image')->nullable()->after('pan_card');
                }
                if (!Schema::hasColumn('users', 'salary')) {
                    $table->decimal('salary', 10, 2)->nullable()->after('pan_image');
                }
                if (!Schema::hasColumn('users', 'deductions')) {
                    $table->decimal('deductions', 10, 2)->default(0)->after('salary');
                }
                if (!Schema::hasColumn('users', 'shifts')) {
                    $table->string('shifts', 100)->nullable()->after('deductions');
                }
                if (!Schema::hasColumn('users', 'avatar')) {
                    $table->string('avatar')->nullable()->after('shifts');
                }
                if (!Schema::hasColumn('users', 'plain_password')) {
                    $table->string('plain_password')->nullable()->after('password');
                }
                if (!Schema::hasColumn('users', 'initial_password')) {
                    $table->string('initial_password')->nullable()->after('plain_password');
                }
                if (!Schema::hasColumn('users', 'must_change_password')) {
                    $table->boolean('must_change_password')->default(false)->after('initial_password');
                }
            });
        }

        // --- gym_settings ---
        if (!Schema::hasTable('gym_settings')) {
            Schema::create('gym_settings', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('tagline')->nullable();
                $table->string('address')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('operating_hours')->nullable();
                $table->string('currency')->default('₹');
                $table->timestamps();
            });
        }

        // =====================================================================
        // SECTION 2: MEMBER & TRAINER PROFILES
        // =====================================================================

        // --- plans ---
        if (!Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->decimal('price', 10, 2);
                $table->decimal('discount', 10, 2)->default(0);
                $table->decimal('max_discount', 10, 2)->default(0);
                $table->string('offer')->nullable();
                $table->unsignedInteger('offer_days')->default(0);
                $table->string('period')->nullable();
                $table->integer('duration_months')->default(1);
                $table->boolean('popular')->default(false);
                $table->string('status')->default('Active');
                $table->string('color')->nullable();
                $table->json('features')->nullable();
                $table->integer('active_subscribers')->default(0);
                $table->timestamps();
            });
        }

        // Add missing columns to existing plans table
        if (Schema::hasTable('plans')) {
            Schema::table('plans', function (Blueprint $table) {
                if (!Schema::hasColumn('plans', 'gym_id')) {
                    $table->unsignedBigInteger('gym_id')->nullable()->index()->after('id');
                }
                if (!Schema::hasColumn('plans', 'discount')) {
                    $table->decimal('discount', 10, 2)->default(0)->after('price');
                }
                if (!Schema::hasColumn('plans', 'max_discount')) {
                    $table->decimal('max_discount', 10, 2)->default(0)->after('discount');
                }
                if (!Schema::hasColumn('plans', 'offer')) {
                    $table->string('offer')->nullable()->after('max_discount');
                }
                if (!Schema::hasColumn('plans', 'offer_days')) {
                    $table->unsignedInteger('offer_days')->default(0)->after('offer');
                }
                if (!Schema::hasColumn('plans', 'period')) {
                    $table->string('period')->nullable()->after('offer_days');
                }
                if (!Schema::hasColumn('plans', 'duration_months')) {
                    $table->integer('duration_months')->default(1)->after('period');
                }
                if (!Schema::hasColumn('plans', 'status')) {
                    $table->string('status')->default('Active')->after('popular');
                }
                if (!Schema::hasColumn('plans', 'color')) {
                    $table->string('color')->nullable()->after('status');
                }
                if (!Schema::hasColumn('plans', 'features')) {
                    $table->json('features')->nullable()->after('color');
                }
                if (!Schema::hasColumn('plans', 'active_subscribers')) {
                    $table->integer('active_subscribers')->default(0)->after('features');
                }
            });
        }

        // --- trainer_profiles ---
        if (!Schema::hasTable('trainer_profiles')) {
            Schema::create('trainer_profiles', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->string('specialty')->nullable();
                $table->string('experience')->nullable();
                $table->integer('age')->nullable();
                $table->date('dob')->nullable();
                $table->string('gender')->nullable();
                $table->string('blood_group')->nullable();
                $table->text('address')->nullable();
                $table->decimal('rating', 3, 1)->default(0);
                $table->decimal('monthly_salary', 10, 2)->default(0);
                $table->text('bio')->nullable();
                $table->json('certifications')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing trainer_profiles
        if (Schema::hasTable('trainer_profiles')) {
            Schema::table('trainer_profiles', function (Blueprint $table) {
                if (!Schema::hasColumn('trainer_profiles', 'age')) {
                    $table->integer('age')->nullable()->after('experience');
                }
                if (!Schema::hasColumn('trainer_profiles', 'dob')) {
                    $table->date('dob')->nullable()->after('age');
                }
                if (!Schema::hasColumn('trainer_profiles', 'gender')) {
                    $table->string('gender')->nullable()->after('dob');
                }
                if (!Schema::hasColumn('trainer_profiles', 'blood_group')) {
                    $table->string('blood_group')->nullable()->after('gender');
                }
                if (!Schema::hasColumn('trainer_profiles', 'address')) {
                    $table->text('address')->nullable()->after('blood_group');
                }
                if (!Schema::hasColumn('trainer_profiles', 'monthly_salary')) {
                    $table->decimal('monthly_salary', 10, 2)->default(0)->after('rating');
                }
                if (!Schema::hasColumn('trainer_profiles', 'bio')) {
                    $table->text('bio')->nullable()->after('monthly_salary');
                }
                if (!Schema::hasColumn('trainer_profiles', 'certifications')) {
                    $table->json('certifications')->nullable()->after('bio');
                }
            });
        }

        // --- member_profiles ---
        if (!Schema::hasTable('member_profiles')) {
            Schema::create('member_profiles', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->unsignedBigInteger('plan_id')->nullable();
                $table->unsignedBigInteger('trainer_id')->nullable();
                $table->string('executive')->nullable();
                $table->string('training_type')->default('self-guided');
                $table->string('phone')->nullable();
                $table->string('status')->default('Active');
                $table->date('join_date')->nullable();
                $table->date('expiry_date')->nullable();
                $table->string('gender')->nullable();
                $table->integer('age')->nullable();
                $table->date('dob')->nullable();
                $table->decimal('weight', 5, 2)->nullable();
                $table->decimal('target_weight', 5, 2)->nullable();
                $table->decimal('height', 5, 2)->nullable();
                $table->string('goal')->nullable();
                $table->text('medical_notes')->nullable();
                $table->string('kyc_doc_type')->nullable()->default('Aadhaar Card');
                $table->string('kyc_doc_number')->nullable();
                $table->string('kyc_status')->nullable()->default('Verified');
                $table->string('emergency_contact')->nullable();
                $table->integer('attendance_streak')->default(0);
                $table->string('qr_pass_code')->nullable();
                $table->decimal('dues_amount', 10, 2)->default(0);
                $table->timestamp('last_check_in')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing member_profiles
        if (Schema::hasTable('member_profiles')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                if (!Schema::hasColumn('member_profiles', 'executive')) {
                    $table->string('executive')->nullable()->after('trainer_id');
                }
                if (!Schema::hasColumn('member_profiles', 'training_type')) {
                    $table->string('training_type')->default('self-guided')->after('executive');
                }
                if (!Schema::hasColumn('member_profiles', 'phone')) {
                    $table->string('phone')->nullable()->after('training_type');
                }
                if (!Schema::hasColumn('member_profiles', 'dob')) {
                    $table->date('dob')->nullable()->after('age');
                }
                if (!Schema::hasColumn('member_profiles', 'kyc_doc_type')) {
                    $table->string('kyc_doc_type')->nullable()->default('Aadhaar Card')->after('medical_notes');
                }
                if (!Schema::hasColumn('member_profiles', 'kyc_doc_number')) {
                    $table->string('kyc_doc_number')->nullable()->after('kyc_doc_type');
                }
                if (!Schema::hasColumn('member_profiles', 'kyc_status')) {
                    $table->string('kyc_status')->nullable()->default('Verified')->after('kyc_doc_number');
                }
            });
        }

        // =====================================================================
        // SECTION 3: CLASSES, BOOKINGS, ATTENDANCE
        // =====================================================================

        // --- gym_classes ---
        if (!Schema::hasTable('gym_classes')) {
            Schema::create('gym_classes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->unsignedBigInteger('trainer_id')->nullable();
                $table->string('instructor_name')->nullable();
                $table->string('time')->nullable();
                $table->string('duration')->default('45 min');
                $table->json('days')->nullable();
                $table->integer('capacity')->default(30);
                $table->integer('booked_count')->default(0);
                $table->string('status')->default('Active');
                $table->string('color')->nullable();
                $table->string('icon')->nullable();
                $table->string('category')->nullable();
                $table->string('room')->nullable();
                $table->string('difficulty')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing gym_classes
        if (Schema::hasTable('gym_classes')) {
            Schema::table('gym_classes', function (Blueprint $table) {
                if (!Schema::hasColumn('gym_classes', 'gym_id')) {
                    $table->unsignedBigInteger('gym_id')->nullable()->after('id');
                }
                if (!Schema::hasColumn('gym_classes', 'instructor_name')) {
                    $table->string('instructor_name')->nullable()->after('trainer_id');
                }
                if (!Schema::hasColumn('gym_classes', 'duration')) {
                    $table->string('duration')->default('45 min')->after('time');
                }
                if (!Schema::hasColumn('gym_classes', 'status')) {
                    $table->string('status')->default('Active')->after('booked_count');
                }
                if (!Schema::hasColumn('gym_classes', 'color')) {
                    $table->string('color')->nullable()->after('status');
                }
                if (!Schema::hasColumn('gym_classes', 'icon')) {
                    $table->string('icon')->nullable()->after('color');
                }
                if (!Schema::hasColumn('gym_classes', 'category')) {
                    $table->string('category')->nullable()->after('icon');
                }
                if (!Schema::hasColumn('gym_classes', 'room')) {
                    $table->string('room')->nullable()->after('category');
                }
                if (!Schema::hasColumn('gym_classes', 'difficulty')) {
                    $table->string('difficulty')->nullable()->after('room');
                }
            });
        }

        // --- class_bookings ---
        if (!Schema::hasTable('class_bookings')) {
            Schema::create('class_bookings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_class_id')->index();
                $table->unsignedBigInteger('user_id')->index();
                $table->date('booking_date');
                $table->string('status')->default('Confirmed');
                $table->timestamps();
            });
        }

        // --- attendances ---
        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->string('member_name')->nullable();
                $table->string('plan_name')->nullable();
                $table->string('member_avatar')->nullable();
                $table->timestamp('check_in_time')->nullable();
                $table->timestamp('check_out_time')->nullable();
                $table->string('punch_out_time')->nullable();
                $table->string('duration')->nullable();
                $table->date('date')->index();
                $table->string('status')->default('present');
                $table->string('gate')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing attendances
        if (Schema::hasTable('attendances')) {
            Schema::table('attendances', function (Blueprint $table) {
                if (!Schema::hasColumn('attendances', 'punch_out_time')) {
                    $table->string('punch_out_time')->nullable()->after('check_out_time');
                }
                if (!Schema::hasColumn('attendances', 'duration')) {
                    $table->string('duration')->nullable()->after('punch_out_time');
                }
                if (!Schema::hasColumn('attendances', 'member_name')) {
                    $table->string('member_name')->nullable()->after('user_id');
                }
                if (!Schema::hasColumn('attendances', 'plan_name')) {
                    $table->string('plan_name')->nullable()->after('member_name');
                }
                if (!Schema::hasColumn('attendances', 'member_avatar')) {
                    $table->string('member_avatar')->nullable()->after('plan_name');
                }
                if (!Schema::hasColumn('attendances', 'gate')) {
                    $table->string('gate')->nullable()->after('status');
                }
            });
        }

        // =====================================================================
        // SECTION 4: WORKOUT, DIET, BODY METRICS
        // =====================================================================

        if (!Schema::hasTable('workout_plans')) {
            Schema::create('workout_plans', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->unsignedBigInteger('trainer_id')->nullable();
                $table->string('title');
                $table->json('days')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('diet_plans')) {
            Schema::create('diet_plans', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->unsignedBigInteger('trainer_id')->nullable();
                $table->integer('daily_calories_target')->default(2000);
                $table->integer('protein_grams_target')->default(150);
                $table->integer('carbs_grams_target')->default(200);
                $table->integer('fats_grams_target')->default(65);
                $table->integer('water_glasses_target')->default(8);
                $table->json('days')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('body_metrics')) {
            Schema::create('body_metrics', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->string('date_label')->nullable();
                $table->decimal('weight', 5, 2)->nullable();
                $table->decimal('body_fat', 5, 2)->nullable();
                $table->decimal('muscle_mass', 5, 2)->nullable();
                $table->timestamps();
            });
        }

        // =====================================================================
        // SECTION 5: INVOICES, EQUIPMENT, EXPENSES, ENQUIRIES
        // =====================================================================

        if (!Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('invoice_number')->index();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->unsignedBigInteger('plan_id')->nullable()->index();
                $table->decimal('amount', 10, 2);
                $table->date('date');
                $table->string('payment_method')->default('UPI');
                $table->string('status')->default('Paid');
                $table->string('invoice_url')->nullable();
                $table->timestamps();
            });
        }

        // Add gym_id to invoices if missing
        if (Schema::hasTable('invoices') && !Schema::hasColumn('invoices', 'gym_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->unsignedBigInteger('gym_id')->nullable()->index()->after('id');
            });
        }

        if (!Schema::hasTable('equipment')) {
            Schema::create('equipment', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->string('brand')->nullable();
                $table->string('category')->nullable();
                $table->string('location')->nullable();
                $table->string('status')->default('Active');
                $table->date('last_serviced')->nullable();
                $table->date('next_service_due')->nullable();
                $table->string('condition')->nullable();
                $table->timestamps();
            });
        }

        // Add gym_id to equipment if missing
        if (Schema::hasTable('equipment') && !Schema::hasColumn('equipment', 'gym_id')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->unsignedBigInteger('gym_id')->nullable()->index()->after('id');
            });
        }

        if (!Schema::hasTable('expenses')) {
            Schema::create('expenses', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('title');
                $table->string('category')->nullable();
                $table->string('vendor')->nullable();
                $table->decimal('amount', 10, 2);
                $table->date('date');
                $table->string('payment_mode')->nullable();
                $table->string('ref_no')->nullable();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('enquiries')) {
            Schema::create('enquiries', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('source')->nullable();
                $table->string('interested_plan')->nullable();
                $table->string('fitness_goal')->nullable();
                $table->string('priority')->default('Medium');
                $table->string('status')->default('New');
                $table->date('follow_up_date')->nullable();
                $table->string('staff_name')->nullable();
                $table->text('notes')->nullable();
                $table->text('comments')->nullable();
                $table->unsignedBigInteger('converted_member_id')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        // =====================================================================
        // SECTION 6: OPERATIONS TABLES
        // =====================================================================

        // --- products (Pro Shop) ---
        if (!Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->string('category')->default('Supplements')->index();
                $table->decimal('price', 10, 2);
                $table->integer('stock')->default(0);
                $table->integer('min_stock_alert')->default(5);
                $table->string('status')->default('In Stock');
                $table->string('image')->nullable();
                $table->timestamps();
            });
        }

        // --- commissions ---
        if (!Schema::hasTable('commissions')) {
            Schema::create('commissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('trainer_id')->nullable()->index();
                $table->string('trainer_name');
                $table->string('member_name');
                $table->string('plan_name');
                $table->string('session_type')->default('Personal Training (PT)');
                $table->decimal('rate_percent', 5, 2)->default(20.00);
                $table->decimal('package_amount', 10, 2)->nullable();
                $table->decimal('commission_earned', 10, 2)->nullable();
                $table->decimal('amount', 10, 2);
                $table->date('date')->index();
                $table->string('status')->default('Pending')->index();
                $table->timestamps();
            });
        }

        // Add missing columns to existing commissions
        if (Schema::hasTable('commissions')) {
            Schema::table('commissions', function (Blueprint $table) {
                if (!Schema::hasColumn('commissions', 'package_amount')) {
                    $table->decimal('package_amount', 10, 2)->nullable()->after('rate_percent');
                }
                if (!Schema::hasColumn('commissions', 'commission_earned')) {
                    $table->decimal('commission_earned', 10, 2)->nullable()->after('package_amount');
                }
            });
        }

        // --- membership_freezes ---
        if (!Schema::hasTable('membership_freezes')) {
            Schema::create('membership_freezes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('member_id')->nullable()->index();
                $table->string('member_name');
                $table->string('plan_name')->nullable();
                $table->date('freeze_start_date');
                $table->date('freeze_end_date');
                $table->integer('days_frozen')->default(15);
                $table->decimal('fee', 10, 2)->default(0);
                $table->string('payment_method', 100)->nullable();
                $table->string('type', 50)->default('freeze');
                $table->string('reason')->nullable();
                $table->string('status')->default('Active Freeze');
                $table->string('approved_by')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing membership_freezes
        if (Schema::hasTable('membership_freezes')) {
            Schema::table('membership_freezes', function (Blueprint $table) {
                if (!Schema::hasColumn('membership_freezes', 'fee')) {
                    $table->decimal('fee', 10, 2)->default(0)->after('days_frozen');
                }
                if (!Schema::hasColumn('membership_freezes', 'payment_method')) {
                    $table->string('payment_method', 100)->nullable()->after('fee');
                }
                if (!Schema::hasColumn('membership_freezes', 'type')) {
                    $table->string('type', 50)->default('freeze')->after('payment_method');
                }
            });
        }

        // --- consent_forms ---
        if (!Schema::hasTable('consent_forms')) {
            Schema::create('consent_forms', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('member_id')->nullable()->index();
                $table->string('member_name');
                $table->string('phone')->nullable();
                $table->string('plan_name')->nullable();
                $table->string('emergency_contact')->nullable();
                $table->string('emergency_phone')->nullable();
                $table->text('medical_conditions')->nullable();
                $table->date('signed_date')->nullable();
                $table->string('status')->default('Signed')->index();
                $table->timestamps();
            });
        }

        // --- payrolls ---
        if (!Schema::hasTable('payrolls')) {
            Schema::create('payrolls', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('employee_id')->nullable()->index();
                $table->string('employee_name');
                $table->string('role')->default('Fitness Coach');
                $table->string('month')->index();
                $table->decimal('base_salary', 10, 2);
                $table->decimal('commission_earned', 10, 2)->default(0);
                $table->decimal('incentives', 10, 2)->default(0);
                $table->decimal('bonus', 10, 2)->default(0);
                $table->decimal('deductions', 10, 2)->default(0);
                $table->decimal('net_pay', 10, 2);
                $table->string('status')->default('Pending')->index();
                $table->date('pay_date')->nullable();
                $table->string('adjusted_by')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing payrolls
        if (Schema::hasTable('payrolls')) {
            Schema::table('payrolls', function (Blueprint $table) {
                if (!Schema::hasColumn('payrolls', 'commission_earned')) {
                    $table->decimal('commission_earned', 10, 2)->default(0)->after('base_salary');
                }
                if (!Schema::hasColumn('payrolls', 'incentives')) {
                    $table->decimal('incentives', 10, 2)->default(0)->after('commission_earned');
                }
                if (!Schema::hasColumn('payrolls', 'adjusted_by')) {
                    $table->string('adjusted_by')->nullable()->after('pay_date');
                }
                if (!Schema::hasColumn('payrolls', 'notes')) {
                    $table->text('notes')->nullable()->after('adjusted_by');
                }
            });
        }

        // --- biometric_devices ---
        if (!Schema::hasTable('biometric_devices')) {
            Schema::create('biometric_devices', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->string('ip_address')->nullable();
                $table->string('serial_no')->nullable();
                $table->string('location')->default('Main Entrance Turnstile');
                $table->string('status')->default('Connected & Online');
                $table->integer('total_punches_today')->default(0);
                $table->integer('pulse_duration_sec')->default(5);
                $table->string('last_sync')->default('Just now');
                $table->timestamps();
            });
        }

        // --- biometric_logs ---
        if (!Schema::hasTable('biometric_logs')) {
            Schema::create('biometric_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('device_id')->nullable();
                $table->string('device_name')->default('Main Entrance Turnstile');
                $table->string('person_name');
                $table->string('person_type')->default('Active Member');
                $table->string('verification_mode')->default('RFID Turnstile Scan');
                $table->string('result')->default('Access Granted');
                $table->string('gate_trigger')->default('Main Gate Unlocked');
                $table->string('event_time');
                $table->timestamps();
            });
        }

        // --- entry_approvals ---
        if (!Schema::hasTable('entry_approvals')) {
            Schema::create('entry_approvals', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('member_id')->nullable();
                $table->string('member_name');
                $table->string('avatar')->nullable();
                $table->string('issue');
                $table->string('gate')->default('Turnstile Gate B');
                $table->string('reason')->nullable();
                $table->string('requested_time')->default('Just now');
                $table->string('status')->default('Pending Approval')->index();
                $table->timestamps();
            });
        }

        // --- pt_plans ---
        if (!Schema::hasTable('pt_plans')) {
            Schema::create('pt_plans', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->decimal('price', 10, 2);
                $table->string('offer')->nullable();
                $table->unsignedInteger('offer_days')->default(0);
                $table->integer('sessions');
                $table->integer('duration_weeks')->default(4);
                $table->boolean('popular')->default(false);
                $table->string('color')->nullable();
                $table->json('features')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing pt_plans
        if (Schema::hasTable('pt_plans')) {
            Schema::table('pt_plans', function (Blueprint $table) {
                if (!Schema::hasColumn('pt_plans', 'offer')) {
                    $table->string('offer')->nullable()->after('price');
                }
                if (!Schema::hasColumn('pt_plans', 'offer_days')) {
                    $table->unsignedInteger('offer_days')->default(0)->after('offer');
                }
            });
        }

        // --- recovery_plans ---
        if (!Schema::hasTable('recovery_plans')) {
            Schema::create('recovery_plans', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->decimal('price', 10, 2);
                $table->string('offer')->nullable();
                $table->unsignedInteger('offer_days')->default(0);
                $table->string('duration')->default('45 Mins');
                $table->integer('sessions')->default(1);
                $table->boolean('popular')->default(false);
                $table->string('color')->nullable();
                $table->json('features')->nullable();
                $table->timestamps();
            });
        }

        // Add missing columns to existing recovery_plans
        if (Schema::hasTable('recovery_plans')) {
            Schema::table('recovery_plans', function (Blueprint $table) {
                if (!Schema::hasColumn('recovery_plans', 'offer')) {
                    $table->string('offer')->nullable()->after('price');
                }
                if (!Schema::hasColumn('recovery_plans', 'offer_days')) {
                    $table->unsignedInteger('offer_days')->default(0)->after('offer');
                }
            });
        }

        // =====================================================================
        // SECTION 7: PT SESSIONS, REVIEWS, ADVANCES, FINANCIAL
        // =====================================================================

        // --- pt_sessions ---
        if (!Schema::hasTable('pt_sessions')) {
            Schema::create('pt_sessions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('member_id')->nullable()->index();
                $table->string('member_name');
                $table->string('member_avatar')->nullable();
                $table->unsignedBigInteger('trainer_id')->nullable()->index();
                $table->string('trainer_name');
                $table->string('plan_name')->nullable();
                $table->integer('total_sessions')->default(12);
                $table->integer('completed_sessions')->default(0);
                $table->integer('remaining_sessions')->default(12);
                $table->string('client_otp', 6)->nullable();
                $table->string('status')->default('Active')->index();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->timestamps();
            });
        }

        // --- pt_session_logs ---
        if (!Schema::hasTable('pt_session_logs')) {
            Schema::create('pt_session_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('pt_session_id')->index();
                $table->unsignedBigInteger('member_id')->nullable()->index();
                $table->unsignedBigInteger('trainer_id')->nullable()->index();
                $table->string('member_name');
                $table->string('trainer_name');
                $table->integer('session_number')->default(1);
                $table->string('otp_entered', 6)->nullable();
                $table->boolean('otp_verified')->default(true);
                $table->text('notes')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
            });
        }

        // --- trainer_reviews ---
        if (!Schema::hasTable('trainer_reviews')) {
            Schema::create('trainer_reviews', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('trainer_id')->nullable()->index();
                $table->string('trainer_name');
                $table->unsignedBigInteger('member_id')->nullable()->index();
                $table->string('member_name');
                $table->string('member_avatar')->nullable();
                $table->unsignedTinyInteger('rating')->default(5);
                $table->text('comment')->nullable();
                $table->date('date')->nullable();
                $table->timestamps();
            });
        }

        // --- advance_requests ---
        if (!Schema::hasTable('advance_requests')) {
            Schema::create('advance_requests', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('trainer_id')->nullable()->index();
                $table->string('trainer_name');
                $table->string('trainer_avatar')->nullable();
                $table->decimal('amount', 10, 2);
                $table->text('reason');
                $table->string('repayment_month')->default('Next Cycle');
                $table->string('status')->default('Pending')->index();
                $table->date('request_date')->nullable();
                $table->timestamp('disbursed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // --- financial_transactions ---
        if (!Schema::hasTable('financial_transactions')) {
            Schema::create('financial_transactions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('type')->default('Inflow')->index();
                $table->string('category');
                $table->string('description');
                $table->decimal('amount', 12, 2);
                $table->date('date')->index();
                $table->string('reference_id')->nullable();
                $table->string('reference_type')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        // =====================================================================
        // SECTION 8: REVENUE, OFFERS, TRANSFERS, LEAVES, WHATSAPP
        // =====================================================================

        // --- revenue_and_billings ---
        if (!Schema::hasTable('revenue_and_billings')) {
            Schema::create('revenue_and_billings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->enum('type', ['inflow', 'outflow'])->index();
                $table->string('reference_no')->index();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('member_name')->nullable();
                $table->unsignedBigInteger('plan_id')->nullable()->index();
                $table->string('plan_name')->nullable();
                $table->string('title');
                $table->string('category')->index();
                $table->string('vendor')->nullable();
                $table->decimal('amount', 12, 2);
                $table->date('date')->index();
                $table->string('payment_method')->default('UPI');
                $table->string('status')->default('Paid');
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        // --- offers ---
        if (!Schema::hasTable('offers')) {
            Schema::create('offers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('title');
                $table->string('code')->nullable();
                $table->string('discount_type')->default('percent');
                $table->decimal('discount_value', 10, 2)->default(0);
                $table->string('plan_id')->nullable();
                $table->string('plan_name')->nullable();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // --- membership_transfers ---
        if (!Schema::hasTable('membership_transfers')) {
            Schema::create('membership_transfers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('from_member_id')->nullable();
                $table->string('from_member_name');
                $table->string('to_member_id')->nullable();
                $table->string('to_member_name');
                $table->string('to_member_phone')->nullable();
                $table->string('plan_name')->nullable();
                $table->integer('days_remaining')->default(0);
                $table->decimal('transfer_fee', 10, 2)->default(0);
                $table->string('payment_method')->nullable();
                $table->date('transfer_date')->nullable();
                $table->text('reason')->nullable();
                $table->string('status')->default('Completed');
                $table->timestamps();
            });
        }

        // --- leave_balances ---
        if (!Schema::hasTable('leave_balances')) {
            Schema::create('leave_balances', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('user_id')->index();
                $table->string('user_name')->nullable();
                $table->string('role')->nullable();
                $table->string('leave_type');
                $table->decimal('allocated_days', 5, 1)->default(0);
                $table->decimal('used_days', 5, 1)->default(0);
                $table->decimal('remaining_days', 5, 1)->default(0);
                $table->integer('year')->default(2026);
                $table->timestamps();
            });
        }

        // --- leave_requests ---
        if (!Schema::hasTable('leave_requests')) {
            Schema::create('leave_requests', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('user_id')->index();
                $table->string('user_name');
                $table->string('user_avatar')->nullable();
                $table->string('role')->nullable();
                $table->string('leave_type');
                $table->date('start_date');
                $table->date('end_date');
                $table->decimal('days_count', 5, 1)->default(1);
                $table->text('reason')->nullable();
                $table->string('status')->default('Pending')->index();
                $table->string('action_by')->nullable();
                $table->text('action_notes')->nullable();
                $table->timestamp('action_date')->nullable();
                $table->timestamps();
            });
        }

        // --- whatsapp_templates ---
        if (!Schema::hasTable('whatsapp_templates')) {
            Schema::create('whatsapp_templates', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name');
                $table->string('category')->default('birthday')->index();
                $table->string('target_role')->default('member')->index();
                $table->text('message_body');
                $table->boolean('is_active')->default(true)->index();
                $table->boolean('is_auto_enabled')->default(true);
                $table->string('timing_trigger')->default('on_birthday');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        // --- whatsapp_logs ---
        if (!Schema::hasTable('whatsapp_logs')) {
            Schema::create('whatsapp_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('template_id')->nullable()->index();
                $table->unsignedBigInteger('recipient_id')->nullable()->index();
                $table->string('recipient_name');
                $table->string('recipient_phone');
                $table->string('recipient_role')->default('member');
                $table->string('category')->default('birthday');
                $table->text('message');
                $table->string('status')->default('sent');
                $table->string('channel')->default('whatsapp_web');
                $table->string('trigger_type')->default('manual');
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop tables in reverse dependency order
        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('whatsapp_templates');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('membership_transfers');
        Schema::dropIfExists('offers');
        Schema::dropIfExists('revenue_and_billings');
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('advance_requests');
        Schema::dropIfExists('trainer_reviews');
        Schema::dropIfExists('pt_session_logs');
        Schema::dropIfExists('pt_sessions');
        Schema::dropIfExists('recovery_plans');
        Schema::dropIfExists('pt_plans');
        Schema::dropIfExists('entry_approvals');
        Schema::dropIfExists('biometric_logs');
        Schema::dropIfExists('biometric_devices');
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('consent_forms');
        Schema::dropIfExists('membership_freezes');
        Schema::dropIfExists('commissions');
        Schema::dropIfExists('products');
        Schema::dropIfExists('enquiries');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('equipment');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('body_metrics');
        Schema::dropIfExists('diet_plans');
        Schema::dropIfExists('workout_plans');
        Schema::dropIfExists('class_bookings');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('gym_classes');
        Schema::dropIfExists('member_profiles');
        Schema::dropIfExists('trainer_profiles');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('gym_settings');
    }
};
