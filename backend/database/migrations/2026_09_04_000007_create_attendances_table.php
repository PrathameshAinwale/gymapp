<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->time('check_in_time')->nullable();
            $table->time('check_out_time')->nullable();
            $table->date('date');
            $table->string('status')->default('Inside Gym'); // 'Inside Gym', 'Completed'
            $table->string('gate')->default('Main Turnstile A');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
