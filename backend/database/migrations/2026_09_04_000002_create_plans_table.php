<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->string('period')->default('Monthly');
            $table->integer('duration_months')->default(1);
            $table->boolean('popular')->default(false);
            $table->string('color')->nullable();
            $table->json('features')->nullable();
            $table->integer('active_subscribers')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
