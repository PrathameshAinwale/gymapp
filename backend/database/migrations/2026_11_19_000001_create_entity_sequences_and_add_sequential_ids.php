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
        // 1. Dedicated Sequence Counters Table
        if (!Schema::hasTable('entity_sequences')) {
            Schema::create('entity_sequences', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->default(1)->index();
                $table->string('entity_type', 32); // 'invoice', 'member', 'enquiry'
                $table->string('fy_code', 8);       // '26', '27', etc.
                $table->unsignedBigInteger('last_number')->default(0);
                $table->timestamps();

                $table->unique(['gym_id', 'entity_type', 'fy_code'], 'uniq_gym_entity_fy');
            });
        }

        // 2. Add member_number to users table
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'member_number')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('member_number', 32)->nullable()->after('role')->index();
            });
        }

        // 3. Add member_number and converted_from_enquiry_number to member_profiles table
        if (Schema::hasTable('member_profiles')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                if (!Schema::hasColumn('member_profiles', 'member_number')) {
                    $table->string('member_number', 32)->nullable()->after('user_id')->index();
                }
                if (!Schema::hasColumn('member_profiles', 'converted_from_enquiry_number')) {
                    $table->string('converted_from_enquiry_number', 32)->nullable()->after('member_number');
                }
            });
        }

        // 4. Add enquiry_number to enquiries table
        if (Schema::hasTable('enquiries') && !Schema::hasColumn('enquiries', 'enquiry_number')) {
            Schema::table('enquiries', function (Blueprint $table) {
                $table->string('enquiry_number', 32)->nullable()->after('gym_id')->index();
            });
        }

        // 5. Add compound unique safety index on (gym_id, member_number) and (gym_id, enquiry_number)
        // using try-catch to avoid index duplication in multi-tenant environments
        try {
            if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'invoice_number') && Schema::hasColumn('invoices', 'gym_id')) {
                Schema::table('invoices', function (Blueprint $table) {
                    $table->unique(['gym_id', 'invoice_number'], 'uniq_invoices_gym_invoice_no');
                });
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('users') && Schema::hasColumn('users', 'member_number') && Schema::hasColumn('users', 'gym_id')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->unique(['gym_id', 'member_number'], 'uniq_users_gym_member_no');
                });
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('enquiries') && Schema::hasColumn('enquiries', 'enquiry_number') && Schema::hasColumn('enquiries', 'gym_id')) {
                Schema::table('enquiries', function (Blueprint $table) {
                    $table->unique(['gym_id', 'enquiry_number'], 'uniq_enquiries_gym_enquiry_no');
                });
            }
        } catch (\Throwable $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            if (Schema::hasTable('enquiries')) {
                Schema::table('enquiries', function (Blueprint $table) {
                    $table->dropIndex(['gym_id', 'enquiry_number']);
                    $table->dropColumn('enquiry_number');
                });
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('member_profiles')) {
                Schema::table('member_profiles', function (Blueprint $table) {
                    $table->dropColumn(['member_number', 'converted_from_enquiry_number']);
                });
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('users')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropIndex(['gym_id', 'member_number']);
                    $table->dropColumn('member_number');
                });
            }
        } catch (\Throwable $e) {}

        Schema::dropIfExists('entity_sequences');
    }
};
