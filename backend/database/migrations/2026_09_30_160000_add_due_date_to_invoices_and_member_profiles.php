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
        if (Schema::hasTable('invoices') && !Schema::hasColumn('invoices', 'due_date')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->date('due_date')->nullable()->after('date');
            });
        }

        if (Schema::hasTable('member_profiles') && !Schema::hasColumn('member_profiles', 'due_date')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $table->date('due_date')->nullable()->after('expiry_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'due_date')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropColumn('due_date');
            });
        }

        if (Schema::hasTable('member_profiles') && Schema::hasColumn('member_profiles', 'due_date')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $table->dropColumn('due_date');
            });
        }
    }
};
