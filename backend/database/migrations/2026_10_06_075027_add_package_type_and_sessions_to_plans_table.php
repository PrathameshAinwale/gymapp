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
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'package_type')) {
                $table->string('package_type')->nullable()->default('Gym-Cardio')->index()->after('name');
            }
            if (!Schema::hasColumn('plans', 'sessions')) {
                $table->string('sessions')->nullable()->after('period');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'package_type')) {
                $table->dropColumn('package_type');
            }
            if (Schema::hasColumn('plans', 'sessions')) {
                $table->dropColumn('sessions');
            }
        });
    }
};
