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
        // 1. Add max_discount to plans table
        if (Schema::hasTable('plans') && !Schema::hasColumn('plans', 'max_discount')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->decimal('max_discount', 10, 2)->default(0)->after('price');
            });
        }

        // 2. Create offers table for membership plan offers
        if (!Schema::hasTable('offers')) {
            Schema::create('offers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('title');
                $table->string('code')->nullable();
                $table->string('discount_type')->default('percent'); // 'percent' | 'fixed'
                $table->decimal('discount_value', 10, 2)->default(0);
                $table->string('plan_id')->nullable();
                $table->string('plan_name')->nullable();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 3. Add staff attributes to users table
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'dob')) {
                    $table->date('dob')->nullable()->after('phone');
                }
                if (!Schema::hasColumn('users', 'aadhaar_card')) {
                    $table->string('aadhaar_card', 50)->nullable()->after('dob');
                }
                if (!Schema::hasColumn('users', 'aadhaar_image')) {
                    $table->longText('aadhaar_image')->nullable()->after('aadhaar_card');
                }
                if (!Schema::hasColumn('users', 'pan_card')) {
                    $table->string('pan_card', 50)->nullable()->after('aadhaar_image');
                }
                if (!Schema::hasColumn('users', 'pan_image')) {
                    $table->longText('pan_image')->nullable()->after('pan_card');
                }
                if (!Schema::hasColumn('users', 'salary')) {
                    $table->decimal('salary', 10, 2)->nullable()->after('pan_image');
                }
                if (!Schema::hasColumn('users', 'shifts')) {
                    $table->string('shifts', 100)->nullable()->after('salary');
                }
            });
        }

        // 4. Add fee and payment_method to membership_freezes table
        if (Schema::hasTable('membership_freezes')) {
            Schema::table('membership_freezes', function (Blueprint $table) {
                if (!Schema::hasColumn('membership_freezes', 'fee')) {
                    $table->decimal('fee', 10, 2)->default(0)->after('days_frozen');
                }
                if (!Schema::hasColumn('membership_freezes', 'payment_method')) {
                    $table->string('payment_method', 100)->nullable()->after('fee');
                }
                if (!Schema::hasColumn('membership_freezes', 'type')) {
                    $table->string('type', 50)->default('freeze')->after('payment_method'); // 'freeze' | 'extension'
                }
            });
        }

        // 5. Create membership_transfers table
        if (!Schema::hasTable('membership_transfers')) {
            Schema::create('membership_transfers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('from_member_id')->nullable();
                $table->string('from_member_name');
                $table->string('to_member_id')->nullable();
                $table->string('to_member_name');
                $table->string('to_member_phone')->nullable();
                $table->string('plan_name')->nullable();
                $table->integer('days_remaining')->default(0);
                $table->decimal('transfer_fee', 10, 2)->default(0);
                $table->string('payment_method')->nullable();
                $table->date('transfer_date')->nullable();
                $table->text('reason')->nullable();
                $table->string('status')->default('Completed');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_transfers');
        Schema::dropIfExists('offers');
    }
};
