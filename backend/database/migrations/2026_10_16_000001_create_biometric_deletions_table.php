<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('biometric_deletions')) {
            Schema::create('biometric_deletions', function (Blueprint $table) {
                $table->id();
                $table->string('biometric_user_id', 255)->index();
                $table->string('user_name', 255)->nullable();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_deletions');
    }
};
