<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('plans') && !Schema::hasColumn('plans', 'offer')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->string('offer')->nullable()->after('max_discount');
            });
        }
        if (Schema::hasTable('pt_plans') && !Schema::hasColumn('pt_plans', 'offer')) {
            Schema::table('pt_plans', function (Blueprint $table) {
                $table->string('offer')->nullable()->after('price');
            });
        }
        if (Schema::hasTable('recovery_plans') && !Schema::hasColumn('recovery_plans', 'offer')) {
            Schema::table('recovery_plans', function (Blueprint $table) {
                $table->string('offer')->nullable()->after('price');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('plans') && Schema::hasColumn('plans', 'offer')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->dropColumn('offer');
            });
        }
        if (Schema::hasTable('pt_plans') && Schema::hasColumn('pt_plans', 'offer')) {
            Schema::table('pt_plans', function (Blueprint $table) {
                $table->dropColumn('offer');
            });
        }
        if (Schema::hasTable('recovery_plans') && Schema::hasColumn('recovery_plans', 'offer')) {
            Schema::table('recovery_plans', function (Blueprint $table) {
                $table->dropColumn('offer');
            });
        }
    }
};
