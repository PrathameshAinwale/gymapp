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
        // 1. Line items storage for invoices (Task 3: One Form = One Invoice)
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('invoices', 'items')) {
                    $table->json('items')->nullable()->after('end_date');
                }
            });
        }

        // 2. Biometric sync columns on member_profiles
        if (Schema::hasTable('member_profiles')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                if (!Schema::hasColumn('member_profiles', 'biometric_user_id')) {
                    $table->string('biometric_user_id')->nullable()->after('qr_pass_code');
                }
                if (!Schema::hasColumn('member_profiles', 'synced_to_device')) {
                    $table->boolean('synced_to_device')->default(false)->after('biometric_user_id');
                }
                if (!Schema::hasColumn('member_profiles', 'device_synced_at')) {
                    $table->timestamp('device_synced_at')->nullable()->after('synced_to_device');
                }
            });
        }

        // 3. ESSL device IP & Port settings on gyms
        if (Schema::hasTable('gyms')) {
            Schema::table('gyms', function (Blueprint $table) {
                if (!Schema::hasColumn('gyms', 'essl_device_ip')) {
                    $table->string('essl_device_ip')->nullable()->default('192.168.1.201')->after('currency');
                }
                if (!Schema::hasColumn('gyms', 'essl_device_port')) {
                    $table->integer('essl_device_port')->nullable()->default(4370)->after('essl_device_ip');
                }
            });
        }

        // 4. ESSL device IP & Port settings on gym_settings
        if (Schema::hasTable('gym_settings')) {
            Schema::table('gym_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('gym_settings', 'essl_device_ip')) {
                    $table->string('essl_device_ip')->nullable()->default('192.168.1.201')->after('currency');
                }
                if (!Schema::hasColumn('gym_settings', 'essl_device_port')) {
                    $table->integer('essl_device_port')->nullable()->default(4370)->after('essl_device_ip');
                }
            });
        }

        // 5. Port column on biometric_devices
        if (Schema::hasTable('biometric_devices')) {
            Schema::table('biometric_devices', function (Blueprint $table) {
                if (!Schema::hasColumn('biometric_devices', 'port')) {
                    $table->integer('port')->nullable()->default(4370)->after('ip_address');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'items')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropColumn('items');
            });
        }

        if (Schema::hasTable('member_profiles')) {
            Schema::table('member_profiles', function (Blueprint $table) {
                $cols = ['biometric_user_id', 'synced_to_device', 'device_synced_at'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('member_profiles', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('gyms')) {
            Schema::table('gyms', function (Blueprint $table) {
                $cols = ['essl_device_ip', 'essl_device_port'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('gyms', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('gym_settings')) {
            Schema::table('gym_settings', function (Blueprint $table) {
                $cols = ['essl_device_ip', 'essl_device_port'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('gym_settings', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('biometric_devices') && Schema::hasColumn('biometric_devices', 'port')) {
            Schema::table('biometric_devices', function (Blueprint $table) {
                $table->dropColumn('port');
            });
        }
    }
};
