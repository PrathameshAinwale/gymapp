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
        Schema::table('trainer_profiles', function (Blueprint $table) {
            $table->integer('age')->nullable()->after('experience');
            $table->string('gender')->nullable()->after('age');
            $table->string('blood_group')->nullable()->after('gender');
            $table->text('address')->nullable()->after('blood_group');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('trainer_profiles', function (Blueprint $table) {
            $table->dropColumn(['age', 'gender', 'blood_group', 'address']);
        });
    }
};
