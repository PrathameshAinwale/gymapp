<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            if (Schema::hasTable('gyms') && Schema::hasColumn('gyms', 'logo')) {
                Schema::table('gyms', function (Blueprint $table) {
                    $table->longText('logo')->nullable()->change();
                });
            }
        } catch (\Throwable $e) {
            // Fallback direct raw SQL for MySQL environments if change() needs doctrine/dbal
            try {
                DB::statement("ALTER TABLE `gyms` MODIFY COLUMN `logo` LONGTEXT NULL");
            } catch (\Throwable $ex) {}
        }

        try {
            if (Schema::hasTable('gym_settings') && Schema::hasColumn('gym_settings', 'logo')) {
                Schema::table('gym_settings', function (Blueprint $table) {
                    $table->longText('logo')->nullable()->change();
                });
            }
        } catch (\Throwable $e) {
            try {
                DB::statement("ALTER TABLE `gym_settings` MODIFY COLUMN `logo` LONGTEXT NULL");
            } catch (\Throwable $ex) {}
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            if (Schema::hasTable('gyms') && Schema::hasColumn('gyms', 'logo')) {
                Schema::table('gyms', function (Blueprint $table) {
                    $table->text('logo')->nullable()->change();
                });
            }
            if (Schema::hasTable('gym_settings') && Schema::hasColumn('gym_settings', 'logo')) {
                Schema::table('gym_settings', function (Blueprint $table) {
                    $table->text('logo')->nullable()->change();
                });
            }
        } catch (\Throwable $e) {}
    }
};
