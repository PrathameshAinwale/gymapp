<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('specialty')->nullable();
            $table->string('experience')->nullable();
            $table->decimal('rating', 3, 2)->default(5.0);
            $table->decimal('monthly_salary', 10, 2)->default(0);
            $table->text('bio')->nullable();
            $table->json('certifications')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainer_profiles');
    }
};
