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
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('invoices', 'package_type')) {
                    $table->string('package_type', 100)->nullable()->index()->after('plan_id');
                }
                if (!Schema::hasColumn('invoices', 'start_date')) {
                    $table->date('start_date')->nullable()->index()->after('package_type');
                }
                if (!Schema::hasColumn('invoices', 'end_date')) {
                    $table->date('end_date')->nullable()->index()->after('start_date');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                $columns = [];
                if (Schema::hasColumn('invoices', 'end_date')) {
                    $columns[] = 'end_date';
                }
                if (Schema::hasColumn('invoices', 'start_date')) {
                    $columns[] = 'start_date';
                }
                if (Schema::hasColumn('invoices', 'package_type')) {
                    $columns[] = 'package_type';
                }
                if (!empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};
