<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('plans', 'gym_id')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->foreignId('gym_id')->nullable()->after('id')->constrained('gyms')->cascadeOnDelete();
            });
        }

        if (!Schema::hasColumn('equipment', 'gym_id')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->foreignId('gym_id')->nullable()->after('id')->constrained('gyms')->cascadeOnDelete();
            });
        }

        if (!Schema::hasColumn('equipment', 'location')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->string('location')->nullable()->after('category');
            });
        }

        if (!Schema::hasColumn('invoices', 'gym_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->foreignId('gym_id')->nullable()->after('id')->constrained('gyms')->cascadeOnDelete();
            });
        }

        // Assign existing records to default Gym 1 (Pulse Fit)
        DB::table('plans')->whereNull('gym_id')->update(['gym_id' => 1]);
        DB::table('equipment')->whereNull('gym_id')->update(['gym_id' => 1]);
        DB::table('invoices')->whereNull('gym_id')->update(['gym_id' => 1]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('invoices', 'gym_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropForeign(['gym_id']);
                $table->dropColumn('gym_id');
            });
        }

        if (Schema::hasColumn('equipment', 'gym_id')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->dropForeign(['gym_id']);
                $table->dropColumn('gym_id');
            });
        }

        if (Schema::hasColumn('equipment', 'location')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->dropColumn('location');
            });
        }

        if (Schema::hasColumn('plans', 'gym_id')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->dropForeign(['gym_id']);
                $table->dropColumn('gym_id');
            });
        }
    }
};
