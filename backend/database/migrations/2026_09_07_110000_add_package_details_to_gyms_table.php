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
            $table->string('package_tier')->default('Growth')->after('package');
            $table->string('billing_cycle')->default('Monthly')->after('package_tier');
            $table->decimal('package_amount', 10, 2)->default(1799.00)->after('billing_cycle');
            $table->integer('max_members')->default(250)->after('package_amount');
            $table->integer('max_trainers')->default(7)->after('max_members');
            $table->integer('max_branches')->default(1)->after('max_trainers');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gyms', function (Blueprint $table) {
            $table->dropColumn([
                'package_tier',
                'billing_cycle',
                'package_amount',
                'max_members',
                'max_trainers',
                'max_branches'
            ]);
        });
    }
};
