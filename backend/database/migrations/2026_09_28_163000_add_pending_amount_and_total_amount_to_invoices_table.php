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
                if (!Schema::hasColumn('invoices', 'pending_amount')) {
                    $table->decimal('pending_amount', 10, 2)->default(0)->after('amount');
                }
                if (!Schema::hasColumn('invoices', 'total_amount')) {
                    $table->decimal('total_amount', 10, 2)->nullable()->after('amount');
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
                if (Schema::hasColumn('invoices', 'pending_amount')) {
                    $table->dropColumn('pending_amount');
                }
                if (Schema::hasColumn('invoices', 'total_amount')) {
                    $table->dropColumn('total_amount');
                }
            });
        }
    }
};
