<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Use raw ALTER TABLE to avoid requiring doctrine/dbal package
        DB::statement("ALTER TABLE `gyms` 
            MODIFY `package` VARCHAR(255) NULL DEFAULT NULL,
            MODIFY `package_tier` VARCHAR(255) NULL DEFAULT NULL,
            MODIFY `billing_cycle` VARCHAR(255) NULL DEFAULT NULL,
            MODIFY `package_amount` DECIMAL(10,2) NULL DEFAULT NULL,
            MODIFY `max_members` INT NULL DEFAULT NULL,
            MODIFY `max_trainers` INT NULL DEFAULT NULL,
            MODIFY `max_branches` INT NULL DEFAULT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `gyms` 
            MODIFY `package` VARCHAR(255) NOT NULL DEFAULT 'Pro Club',
            MODIFY `package_tier` VARCHAR(255) NOT NULL DEFAULT 'Growth',
            MODIFY `billing_cycle` VARCHAR(255) NOT NULL DEFAULT 'Monthly',
            MODIFY `package_amount` DECIMAL(10,2) NOT NULL DEFAULT 1799.00,
            MODIFY `max_members` INT NOT NULL DEFAULT 250,
            MODIFY `max_trainers` INT NOT NULL DEFAULT 7,
            MODIFY `max_branches` INT NOT NULL DEFAULT 1
        ");
    }
};
