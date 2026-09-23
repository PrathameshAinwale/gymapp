<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Employee Leave Balances and Leave Requests.
     */
    public function up(): void
    {
        // 1. Employee Leave Balances / Quotas
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->index(); // Staff or Trainer user id
            $table->string('user_name')->nullable();
            $table->string('role')->nullable(); // trainer, manager, accounts, etc.
            $table->string('leave_type'); // Privilege Leave, Sick Leave, Casual Leave, etc.
            $table->decimal('allocated_days', 5, 1)->default(0); // e.g. 12.0 days
            $table->decimal('used_days', 5, 1)->default(0); // e.g. 2.0 days
            $table->decimal('remaining_days', 5, 1)->default(0); // e.g. 10.0 days
            $table->integer('year')->default(2026);
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['user_id', 'leave_type', 'year'], 'user_leave_type_year_unique');
        });

        // 2. Staff & Trainer Leave Requests
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('user_name');
            $table->string('user_avatar')->nullable();
            $table->string('role')->nullable();
            $table->string('leave_type'); // Privilege Leave, Sick Leave, Casual Leave, etc.
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('days_count', 5, 1)->default(1);
            $table->text('reason')->nullable();
            $table->string('status')->default('Pending')->index(); // Pending, Approved, Rejected, Cancelled
            $table->string('action_by')->nullable();
            $table->text('action_notes')->nullable();
            $table->timestamp('action_date')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_balances');
    }
};
