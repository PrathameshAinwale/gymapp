<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gyms', function (Blueprint $table) {
            if (!Schema::hasColumn('gyms', 'upi_id')) {
                $table->string('upi_id')->nullable()->after('currency');
            }
            if (!Schema::hasColumn('gyms', 'bank_details')) {
                $table->text('bank_details')->nullable()->after('upi_id');
            }
            if (!Schema::hasColumn('gyms', 'terms_and_conditions')) {
                $table->text('terms_and_conditions')->nullable()->after('bank_details');
            }
            if (!Schema::hasColumn('gyms', 'footer_text')) {
                $table->string('footer_text')->nullable()->after('terms_and_conditions');
            }
            if (!Schema::hasColumn('gyms', 'signatory_text')) {
                $table->string('signatory_text')->nullable()->after('footer_text');
            }
            if (!Schema::hasColumn('gyms', 'tax_rate')) {
                $table->unsignedTinyInteger('tax_rate')->default(18)->after('signatory_text');
            }
        });
    }

    public function down(): void
    {
        Schema::table('gyms', function (Blueprint $table) {
            $cols = ['upi_id', 'bank_details', 'terms_and_conditions', 'footer_text', 'signatory_text', 'tax_rate'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('gyms', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
