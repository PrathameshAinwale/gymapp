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
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->string('name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('source')->default('Walk-in'); // Walk-in, Instagram, Referral, Google, Website, Other
            $table->string('interested_plan')->nullable();
            $table->string('fitness_goal')->nullable();
            $table->string('priority')->default('Warm')->index(); // Hot, Warm, Cold
            $table->string('status')->default('New')->index(); // New, Contacted, Trial Scheduled, Joined, Lost
            $table->date('follow_up_date')->nullable()->index();
            $table->string('staff_name')->nullable();
            $table->text('notes')->nullable();
            $table->json('comments')->nullable();
            $table->unsignedBigInteger('converted_member_id')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('converted_member_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
