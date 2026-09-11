<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gym_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('PULSE FIT ATHLETIC CLUB');
            $table->string('tagline')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('operating_hours')->nullable();
            $table->string('currency')->default('₹');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gym_settings');
    }
};
