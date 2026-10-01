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
        if (!Schema::hasTable('shifts')) {
            Schema::create('shifts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->json('timings')->nullable(); // Array of timing slots: [{"start_time": "06:00", "end_time": "14:00", "label": "Morning Slot"}]
                $table->string('color', 50)->nullable()->default('emerald');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
