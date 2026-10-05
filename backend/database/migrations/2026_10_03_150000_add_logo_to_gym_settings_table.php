<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_settings') && !Schema::hasColumn('gym_settings', 'logo')) {
            Schema::table('gym_settings', function (Blueprint $table) {
                $table->text('logo')->nullable()->after('tagline');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_settings') && Schema::hasColumn('gym_settings', 'logo')) {
            Schema::table('gym_settings', function (Blueprint $table) {
                $table->dropColumn('logo');
            });
        }
    }
};
