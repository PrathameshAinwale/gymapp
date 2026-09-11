<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->foreignId('trainer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('Active'); // 'Active', 'Expiring Soon', 'Expired', 'Frozen'
            $table->date('join_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('gender')->nullable();
            $table->integer('age')->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('target_weight', 5, 2)->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->string('goal')->nullable();
            $table->text('medical_notes')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->integer('attendance_streak')->default(0);
            $table->string('qr_pass_code')->unique()->nullable();
            $table->decimal('dues_amount', 10, 2)->default(0);
            $table->timestamp('last_check_in')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_profiles');
    }
};
