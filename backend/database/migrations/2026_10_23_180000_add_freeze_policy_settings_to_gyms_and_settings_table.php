<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gyms') && !Schema::hasColumn('gyms', 'freeze_policy_settings')) {
            Schema::table('gyms', function (Blueprint $table) {
                $table->text('freeze_policy_settings')->nullable()->after('payroll_attendance_settings');
            });
        }
        if (Schema::hasTable('gym_settings') && !Schema::hasColumn('gym_settings', 'freeze_policy_settings')) {
            Schema::table('gym_settings', function (Blueprint $table) {
                $table->text('freeze_policy_settings')->nullable()->after('payroll_attendance_settings');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gyms') && Schema::hasColumn('gyms', 'freeze_policy_settings')) {
            Schema::table('gyms', function (Blueprint $table) {
                $table->dropColumn('freeze_policy_settings');
            });
        }
        if (Schema::hasTable('gym_settings') && Schema::hasColumn('gym_settings', 'freeze_policy_settings')) {
            Schema::table('gym_settings', function (Blueprint $table) {
                $table->dropColumn('freeze_policy_settings');
            });
        }
    }
};
