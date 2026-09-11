<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Pro Shop Products & Store
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

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 2. Trainer Commissions
        Schema::create('commissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('trainer_id')->nullable()->index();
            $table->string('trainer_name');
            $table->string('member_name');
            $table->string('plan_name');
            $table->string('session_type')->default('Personal Training (PT)');
            $table->decimal('rate_percent', 5, 2)->default(20.00);
            $table->decimal('amount', 10, 2);
            $table->date('date')->index();
            $table->string('status')->default('Pending')->index(); // Pending, Paid
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('trainer_id')->references('id')->on('users')->onDelete('set null');
        });

        // 3. Membership Freezes & Extensions
        Schema::create('membership_freezes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('member_id')->nullable()->index();
            $table->string('member_name');
            $table->string('plan_name')->nullable();
            $table->date('freeze_start_date');
            $table->date('freeze_end_date');
            $table->integer('days_frozen')->default(15);
            $table->string('reason')->nullable();
            $table->string('status')->default('Active Freeze'); // Active Freeze, Completed, Rejected
            $table->string('approved_by')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('member_id')->references('id')->on('users')->onDelete('cascade');
        });

        // 4. Digital Consent & Medical Waivers
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
            $table->string('status')->default('Signed')->index(); // Signed, Pending, Expired
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('member_id')->references('id')->on('users')->onDelete('cascade');
        });

        // 5. Employee Payroll
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('employee_id')->nullable()->index();
            $table->string('employee_name');
            $table->string('role')->default('Fitness Coach');
            $table->string('month')->index(); // e.g. "August 2026"
            $table->decimal('base_salary', 10, 2);
            $table->decimal('bonus', 10, 2)->default(0);
            $table->decimal('deductions', 10, 2)->default(0);
            $table->decimal('net_pay', 10, 2);
            $table->string('status')->default('Pending')->index(); // Pending, Paid
            $table->date('pay_date')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('users')->onDelete('set null');
        });

        // 6. Biometric Turnstile Hardware Devices
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

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 7. Biometric Turnstile Punch Event Logs
        Schema::create('biometric_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->string('device_id')->nullable();
            $table->string('device_name')->default('Main Entrance Turnstile');
            $table->string('person_name');
            $table->string('person_type')->default('Active Member'); // Active Member, Staff, Guest
            $table->string('verification_mode')->default('RFID Turnstile Scan');
            $table->string('result')->default('Access Granted');
            $table->string('gate_trigger')->default('Main Gate Unlocked');
            $table->string('event_time');
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 8. Gate Override & Emergency Approvals
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
            $table->string('status')->default('Pending Approval')->index(); // Pending Approval, Approved, Denied
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 9. Personal Training (PT) Packages
        Schema::create('pt_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->integer('sessions');
            $table->integer('duration_weeks')->default(4);
            $table->boolean('popular')->default(false);
            $table->string('color')->nullable();
            $table->json('features')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 10. Recovery & Therapy Packages
        Schema::create('recovery_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->string('duration')->default('45 Mins');
            $table->integer('sessions')->default(1);
            $table->boolean('popular')->default(false);
            $table->string('color')->nullable();
            $table->json('features')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
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
    }
};
