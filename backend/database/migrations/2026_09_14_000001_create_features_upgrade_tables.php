<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations — All new platform features: PT Sessions, Reviews, Advance Pay, Attendance Punch-out
     */
    public function up(): void
    {
        // 1. PT Sessions Packages (allocated per member when they join with PT training type)
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
            $table->string('client_otp', 6)->nullable(); // Member's verification OTP
            $table->string('status')->default('Active')->index(); // Active, Completed, Suspended
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 2. Individual PT Session Log (each verified session check-in)
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

            $table->foreign('pt_session_id')->references('id')->on('pt_sessions')->onDelete('cascade');
        });

        // 3. Trainer Reviews (submitted by members, shown on trainer dashboard & coaches page)
        Schema::create('trainer_reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('trainer_id')->nullable()->index();
            $table->string('trainer_name');
            $table->unsignedBigInteger('member_id')->nullable()->index();
            $table->string('member_name');
            $table->string('member_avatar')->nullable();
            $table->unsignedTinyInteger('rating')->default(5); // 1 to 5 stars
            $table->text('comment')->nullable();
            $table->date('date')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 4. Salary Advance Requests (submitted by trainers, approved by superadmin/accounts)
        Schema::create('advance_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('trainer_id')->nullable()->index();
            $table->string('trainer_name');
            $table->string('trainer_avatar')->nullable();
            $table->decimal('amount', 10, 2);
            $table->text('reason');
            $table->string('repayment_month')->default('Next Cycle');
            $table->string('status')->default('Pending')->index(); // Pending, Approved, Disbursed, Rejected
            $table->date('request_date')->nullable();
            $table->timestamp('disbursed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 5. Add punch_out_time and duration to attendances
        Schema::table('attendances', function (Blueprint $table) {
            $table->string('punch_out_time')->nullable()->after('check_out_time');
            $table->string('duration')->nullable()->after('punch_out_time'); // e.g. "1h 30m"
            $table->string('member_name')->nullable()->after('user_id');
            $table->string('plan_name')->nullable()->after('member_name');
            $table->string('member_avatar')->nullable()->after('plan_name');
        });

        // 6. Add training_type to member_profiles
        if (Schema::hasTable('member_profiles')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                if (!Schema::hasColumn('member_profiles', 'training_type')) {
                    $table->string('training_type')->default('self-guided')->after('trainer_id'); // self-guided, general, pt
                }
                if (!Schema::hasColumn('member_profiles', 'phone')) {
                    $table->string('phone')->nullable()->after('training_type');
                }
            });
        }

        // 7. Add role column to users if not present
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'role')) {
                    $table->string('role')->default('member')->after('email');
                }
                if (!Schema::hasColumn('users', 'gym_id')) {
                    $table->unsignedBigInteger('gym_id')->nullable()->after('role');
                }
                if (!Schema::hasColumn('users', 'avatar')) {
                    $table->string('avatar')->nullable()->after('gym_id');
                }
                if (!Schema::hasColumn('users', 'phone')) {
                    $table->string('phone')->nullable()->after('avatar');
                }
                if (!Schema::hasColumn('users', 'must_change_password')) {
                    $table->boolean('must_change_password')->default(false)->after('phone');
                }
            });
        }

        // 8. Financial transactions (inflow/outflow for revenue tracking)
        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->string('type')->default('Inflow')->index(); // Inflow, Outflow
            $table->string('category'); // Membership Fee, PT Package, Advance Pay, Equipment, etc.
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->date('date')->index();
            $table->string('reference_id')->nullable(); // Links to invoice_id, advance_request_id, etc.
            $table->string('reference_type')->nullable(); // 'invoice', 'advance_request', 'expense'
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 9. Class sessions (batches with scheduling - extends existing gym_classes)
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
            });
        }

        // 10. Payroll adjustments tracking
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('advance_requests');
        Schema::dropIfExists('trainer_reviews');
        Schema::dropIfExists('pt_session_logs');
        Schema::dropIfExists('pt_sessions');

        // Remove added columns from attendances
        if (Schema::hasTable('attendances')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->dropColumn(['punch_out_time', 'duration', 'member_name', 'plan_name', 'member_avatar']);
            });
        }
    }
};
