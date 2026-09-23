<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for WhatsApp Templates, Automation Triggers, and Logs.
     */
    public function up(): void
    {
        // 1. Add dob (Date of Birth) to member_profiles if not present
        if (Schema::hasTable('member_profiles') && !Schema::hasColumn('member_profiles', 'dob')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $table->date('dob')->nullable()->after('age')->index();
            });
        }

        // 2. Add dob (Date of Birth) to trainer_profiles if not present
        if (Schema::hasTable('trainer_profiles') && !Schema::hasColumn('trainer_profiles', 'dob')) {
            Schema::table('trainer_profiles', function (Blueprint $table) {
                $table->date('dob')->nullable()->after('age')->index();
            });
        }

        // 3. WhatsApp Message Templates Table
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->string('name'); // e.g. "Member Birthday Celebration"
            $table->string('category')->default('birthday')->index(); // birthday, expiry_reminder, membership_expired, welcome, fee_due, absentee, custom
            $table->string('target_role')->default('member')->index(); // all, member, trainer, staff
            $table->text('message_body'); // Text with placeholders like {{name}}, {{gym_name}}, etc.
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_auto_enabled')->default(true); // automatic trigger toggle
            $table->string('timing_trigger')->default('on_birthday'); // on_birthday, days_before_expiry_7, days_before_expiry_3, on_expiry, on_signup, manual
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });

        // 4. WhatsApp Automation & Dispatch History Logs Table
        Schema::create('whatsapp_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('template_id')->nullable()->index();
            $table->unsignedBigInteger('recipient_id')->nullable()->index();
            $table->string('recipient_name');
            $table->string('recipient_phone');
            $table->string('recipient_role')->default('member'); // member, trainer, staff
            $table->string('category')->default('birthday'); // birthday, expiry_reminder, welcome, etc.
            $table->text('message');
            $table->string('status')->default('sent'); // sent, queued, failed
            $table->string('channel')->default('whatsapp_web'); // whatsapp_web, whatsapp_api, direct_link
            $table->string('trigger_type')->default('manual'); // automated_birthday, automated_expiry, broadcast, manual
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('whatsapp_templates');

        if (Schema::hasTable('member_profiles') && Schema::hasColumn('member_profiles', 'dob')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $table->dropColumn('dob');
            });
        }

        if (Schema::hasTable('trainer_profiles') && Schema::hasColumn('trainer_profiles', 'dob')) {
            Schema::table('trainer_profiles', function (Blueprint $table) {
                $table->dropColumn('dob');
            });
        }
    }
};
