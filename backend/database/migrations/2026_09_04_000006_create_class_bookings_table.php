<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gym_class_id')->constrained('gym_classes')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('booking_date');
            $table->string('status')->default('Confirmed'); // 'Confirmed', 'Cancelled', 'Attended'
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_bookings');
    }
};
