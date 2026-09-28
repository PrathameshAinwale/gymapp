<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('plans')) {
            Schema::table('plans', function (Blueprint $table) {
                if (!Schema::hasColumn('plans', 'status')) {
                    $table->string('status')->default('Active')->after('popular');
                }
                if (!Schema::hasColumn('plans', 'discount')) {
                    $table->decimal('discount', 10, 2)->default(0)->after('price');
                }
            });
        }

        if (Schema::hasTable('member_profiles')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                if (!Schema::hasColumn('member_profiles', 'executive')) {
                    $table->string('executive')->nullable()->after('trainer_id');
                }
                if (!Schema::hasColumn('member_profiles', 'kyc_doc_type')) {
                    $table->string('kyc_doc_type')->nullable()->default('Aadhaar Card')->after('medical_notes');
                }
                if (!Schema::hasColumn('member_profiles', 'kyc_doc_number')) {
                    $table->string('kyc_doc_number')->nullable()->after('kyc_doc_type');
                }
                if (!Schema::hasColumn('member_profiles', 'kyc_status')) {
                    $table->string('kyc_status')->nullable()->default('Verified')->after('kyc_doc_number');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('plans')) {
            Schema::table('plans', function (Blueprint $table) {
                if (Schema::hasColumn('plans', 'status')) {
                    $table->dropColumn('status');
                }
                if (Schema::hasColumn('plans', 'discount')) {
                    $table->dropColumn('discount');
                }
            });
        }

        if (Schema::hasTable('member_profiles')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $colsToDrop = [];
                if (Schema::hasColumn('member_profiles', 'executive')) $colsToDrop[] = 'executive';
                if (Schema::hasColumn('member_profiles', 'kyc_doc_type')) $colsToDrop[] = 'kyc_doc_type';
                if (Schema::hasColumn('member_profiles', 'kyc_doc_number')) $colsToDrop[] = 'kyc_doc_number';
                if (Schema::hasColumn('member_profiles', 'kyc_status')) $colsToDrop[] = 'kyc_status';
                if (!empty($colsToDrop)) {
                    $table->dropColumn($colsToDrop);
                }
            });
        }
    }
};
