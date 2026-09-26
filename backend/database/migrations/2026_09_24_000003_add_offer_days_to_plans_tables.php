<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('plans') && !Schema::hasColumn('plans', 'offer_days')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->unsignedInteger('offer_days')->default(0)->after('offer');
            });
        }
        if (Schema::hasTable('pt_plans') && !Schema::hasColumn('pt_plans', 'offer_days')) {
            Schema::table('pt_plans', function (Blueprint $table) {
                $table->unsignedInteger('offer_days')->default(0)->after('offer');
            });
        }
        if (Schema::hasTable('recovery_plans') && !Schema::hasColumn('recovery_plans', 'offer_days')) {
            Schema::table('recovery_plans', function (Blueprint $table) {
                $table->unsignedInteger('offer_days')->default(0)->after('offer');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('plans') && Schema::hasColumn('plans', 'offer_days')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->dropColumn('offer_days');
            });
        }
        if (Schema::hasTable('pt_plans') && Schema::hasColumn('pt_plans', 'offer_days')) {
            Schema::table('pt_plans', function (Blueprint $table) {
                $table->dropColumn('offer_days');
            });
        }
        if (Schema::hasTable('recovery_plans') && Schema::hasColumn('recovery_plans', 'offer_days')) {
            Schema::table('recovery_plans', function (Blueprint $table) {
                $table->dropColumn('offer_days');
            });
        }
    }
};
