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
        // 1. Drop unique constraint on email if it exists
        try {
            $indexes = DB::select("SHOW INDEXES FROM users WHERE Key_name = 'users_email_unique'");
            if (!empty($indexes)) {
                DB::statement('ALTER TABLE users DROP INDEX users_email_unique');
            }
        } catch (\Throwable $e) {
            // Ignore if already dropped
        }

        // 2. Make email nullable
        try {
            DB::statement('ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL');
        } catch (\Throwable $e) {
            // Fallback via Blueprint if supported
            Schema::table('users', function (Blueprint $table) {
                $table->string('email')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE users ADD UNIQUE users_email_unique (email)');
        } catch (\Throwable $e) {
            // Ignore
        }
    }
};
