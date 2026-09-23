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
        Schema::table('gyms', function (Blueprint $table) {
            if (!Schema::hasColumn('gyms', 'operating_hours')) {
                $table->string('operating_hours')->nullable()->after('email');
            }
            if (!Schema::hasColumn('gyms', 'currency')) {
                $table->string('currency')->default('₹')->after('operating_hours');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gyms', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('gyms', 'operating_hours')) {
                $columns[] = 'operating_hours';
            }
            if (Schema::hasColumn('gyms', 'currency')) {
                $columns[] = 'currency';
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
