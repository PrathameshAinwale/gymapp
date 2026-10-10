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
        if (Schema::hasTable('member_profiles') && !Schema::hasColumn('member_profiles', 'notes')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $table->text('notes')->nullable()->after('medical_notes');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('member_profiles') && Schema::hasColumn('member_profiles', 'notes')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
    }
};
