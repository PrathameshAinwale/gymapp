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
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'deductions')) {
            Schema::table('users', function (Blueprint $table) {
                $table->decimal('deductions', 10, 2)->default(0)->after('salary');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'deductions')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('deductions');
            });
        }
    }
};
