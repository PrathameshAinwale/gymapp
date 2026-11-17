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
        if (!Schema::hasTable('class_enrollments')) {
            Schema::create('class_enrollments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->unsignedBigInteger('gym_class_id')->index();
                $table->unsignedBigInteger('user_id')->index();
                $table->unsignedBigInteger('invoice_id')->nullable()->index();
                $table->date('enrolled_date');
                $table->string('status', 50)->default('Active');
                $table->timestamps();

                $table->unique(['gym_class_id', 'user_id'], 'class_member_unique');
                $table->foreign('gym_class_id')->references('id')->on('gym_classes')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_enrollments');
    }
};
