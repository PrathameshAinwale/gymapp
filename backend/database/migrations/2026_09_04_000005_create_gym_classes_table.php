<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gym_classes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('trainer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('time');
            $table->json('days')->nullable();
            $table->integer('capacity')->default(20);
            $table->integer('booked_count')->default(0);
            $table->string('category')->nullable();
            $table->string('room')->nullable();
            $table->string('difficulty')->default('All Levels');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gym_classes');
    }
};
