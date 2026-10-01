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
                if (!Schema::hasColumn('invoices', 'created_by')) {
                    $table->unsignedBigInteger('created_by')->nullable()->after('invoice_url');
                }
                if (!Schema::hasColumn('invoices', 'created_by_name')) {
                    $table->string('created_by_name')->nullable()->after('created_by');
                }
            });
        }

        if (Schema::hasTable('revenue_and_billings')) {
            Schema::table('revenue_and_billings', function (Blueprint $table) {
                if (!Schema::hasColumn('revenue_and_billings', 'created_by_name')) {
                    $table->string('created_by_name')->nullable()->after('created_by');
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
                if (Schema::hasColumn('invoices', 'created_by_name')) {
                    $table->dropColumn('created_by_name');
                }
                if (Schema::hasColumn('invoices', 'created_by')) {
                    $table->dropColumn('created_by');
                }
            });
        }

        if (Schema::hasTable('revenue_and_billings')) {
            Schema::table('revenue_and_billings', function (Blueprint $table) {
                if (Schema::hasColumn('revenue_and_billings', 'created_by_name')) {
                    $table->dropColumn('created_by_name');
                }
            });
        }
    }
};
