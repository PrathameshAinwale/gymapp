<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'must_change_password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('must_change_password')->default(false)->after('initial_password');
            });
        }

        if (!Schema::hasColumn('gym_classes', 'gym_id')) {
            Schema::table('gym_classes', function (Blueprint $table) {
                $table->foreignId('gym_id')->nullable()->after('id')->constrained('gyms')->cascadeOnDelete();
            });
        }

        // Set existing gym_classes to Gym 1 (Pulse Fit)
        DB::table('gym_classes')->whereNull('gym_id')->update(['gym_id' => 1]);

        // For any owner created with an initial_password, require first login password change
        DB::table('users')
            ->where('role', 'owner')
            ->whereNotNull('initial_password')
            ->update(['must_change_password' => true]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('gym_classes', 'gym_id')) {
            Schema::table('gym_classes', function (Blueprint $table) {
                $table->dropForeign(['gym_id']);
                $table->dropColumn('gym_id');
            });
        }

        if (Schema::hasColumn('users', 'must_change_password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('must_change_password');
            });
        }
    }
};
