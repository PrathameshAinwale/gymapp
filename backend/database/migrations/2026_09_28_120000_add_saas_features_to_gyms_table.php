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
            if (!Schema::hasColumn('gyms', 'features')) {
                $table->json('features')->nullable()->after('package_tier');
            }
            if (!Schema::hasColumn('gyms', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (!Schema::hasColumn('gyms', 'pincode')) {
                $table->string('pincode', 20)->nullable()->after('state');
            }
            if (!Schema::hasColumn('gyms', 'logo')) {
                $table->text('logo')->nullable()->after('tagline');
            }
            if (!Schema::hasColumn('gyms', 'website')) {
                $table->string('website')->nullable()->after('email');
            }
            if (!Schema::hasColumn('gyms', 'gst_number')) {
                $table->string('gst_number', 50)->nullable()->after('currency');
            }
            if (!Schema::hasColumn('gyms', 'subscription_expires_at')) {
                $table->date('subscription_expires_at')->nullable()->after('billing_cycle');
            }
            if (!Schema::hasColumn('gyms', 'notes')) {
                $table->text('notes')->nullable()->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gyms', function (Blueprint $table) {
            $columns = ['features', 'state', 'pincode', 'logo', 'website', 'gst_number', 'subscription_expires_at', 'notes'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('gyms', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
