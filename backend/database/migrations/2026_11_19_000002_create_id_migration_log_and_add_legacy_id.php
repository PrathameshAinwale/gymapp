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
        // 1. Create id_migration_log table
        if (!Schema::hasTable('id_migration_log')) {
            Schema::create('id_migration_log', function (Blueprint $table) {
                $table->id();
                $table->string('entity', 32)->index(); // 'invoice', 'member', 'enquiry'
                $table->unsignedBigInteger('gym_id')->default(1)->index();
                $table->unsignedBigInteger('record_id')->index(); // local primary key in invoices/users/enquiries
                $table->string('old_id', 64)->index();
                $table->string('new_id', 64)->index();
                $table->string('batch_id', 64)->index();
                $table->timestamp('migrated_at')->useCurrent();

                $table->index(['entity', 'gym_id'], 'idx_log_entity_gym');
                $table->index(['batch_id', 'gym_id'], 'idx_log_batch_gym');
            });
        }

        // 2. Add legacy_id to invoices
        if (Schema::hasTable('invoices') && !Schema::hasColumn('invoices', 'legacy_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->string('legacy_id', 64)->nullable()->after('invoice_number')->index();
            });
        }

        // 3. Add legacy_id to users
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'legacy_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('legacy_id', 64)->nullable()->after('member_number')->index();
            });
        }

        // 4. Add legacy_id to member_profiles
        if (Schema::hasTable('member_profiles') && !Schema::hasColumn('member_profiles', 'legacy_id')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $table->string('legacy_id', 64)->nullable()->after('member_number')->index();
            });
        }

        // 5. Add legacy_id to enquiries
        if (Schema::hasTable('enquiries') && !Schema::hasColumn('enquiries', 'legacy_id')) {
            Schema::table('enquiries', function (Blueprint $table) {
                $table->string('legacy_id', 64)->nullable()->after('enquiry_number')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            if (Schema::hasTable('enquiries') && Schema::hasColumn('enquiries', 'legacy_id')) {
                Schema::table('enquiries', function (Blueprint $table) {
                    $table->dropIndex(['legacy_id']);
                    $table->dropColumn('legacy_id');
                });
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('member_profiles') && Schema::hasColumn('member_profiles', 'legacy_id')) {
                Schema::table('member_profiles', function (Blueprint $table) {
                    $table->dropIndex(['legacy_id']);
                    $table->dropColumn('legacy_id');
                });
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('users') && Schema::hasColumn('users', 'legacy_id')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropIndex(['legacy_id']);
                    $table->dropColumn('legacy_id');
                });
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'legacy_id')) {
                Schema::table('invoices', function (Blueprint $table) {
                    $table->dropIndex(['legacy_id']);
                    $table->dropColumn('legacy_id');
                });
            }
        } catch (\Throwable $e) {}

        Schema::dropIfExists('id_migration_log');
    }
};
