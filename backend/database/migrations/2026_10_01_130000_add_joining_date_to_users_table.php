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
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'joining_date')) {
            Schema::table('users', function (Blueprint $table) {
                $table->date('joining_date')->nullable()->after('dob');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'joining_date')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('joining_date');
            });
        }
    }
};
