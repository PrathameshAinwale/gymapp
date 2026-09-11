<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diet_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // member
            $table->foreignId('trainer_id')->nullable()->constrained('users')->nullOnDelete(); // trainer
            $table->integer('daily_calories_target')->default(2500);
            $table->integer('protein_grams_target')->default(150);
            $table->integer('carbs_grams_target')->default(250);
            $table->integer('fats_grams_target')->default(60);
            $table->integer('water_glasses_target')->default(8);
            $table->json('days'); // daily meals breakdown
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diet_plans');
    }
};
