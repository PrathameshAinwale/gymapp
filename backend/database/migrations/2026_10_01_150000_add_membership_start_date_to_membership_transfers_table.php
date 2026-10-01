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
        if (Schema::hasTable('membership_transfers') && !Schema::hasColumn('membership_transfers', 'membership_start_date')) {
            Schema::table('membership_transfers', function (Blueprint $table) {
                $table->date('membership_start_date')->nullable()->after('transfer_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('membership_transfers') && Schema::hasColumn('membership_transfers', 'membership_start_date')) {
            Schema::table('membership_transfers', function (Blueprint $table) {
                $table->dropColumn('membership_start_date');
            });
        }
    }
};
