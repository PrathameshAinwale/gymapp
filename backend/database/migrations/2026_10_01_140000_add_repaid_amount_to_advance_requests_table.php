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
        if (Schema::hasTable('advance_requests') && !Schema::hasColumn('advance_requests', 'repaid_amount')) {
            Schema::table('advance_requests', function (Blueprint $table) {
                $table->decimal('repaid_amount', 10, 2)->default(0)->after('amount');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('advance_requests') && Schema::hasColumn('advance_requests', 'repaid_amount')) {
            Schema::table('advance_requests', function (Blueprint $table) {
                $table->dropColumn('repaid_amount');
            });
        }
    }
};
