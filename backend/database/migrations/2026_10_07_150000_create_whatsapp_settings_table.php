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
        if (!Schema::hasTable('whatsapp_settings')) {
            Schema::create('whatsapp_settings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->nullable()->index();
                $table->string('provider')->default('ultramsg'); // 'ultramsg', 'meta', 'custom', 'none'
                $table->boolean('is_enabled')->default(true);
                $table->string('instance_id')->nullable();
                $table->text('api_token')->nullable();
                $table->string('phone_number_id')->nullable();
                $table->string('api_url')->nullable();
                $table->boolean('auto_send_welcome')->default(true);
                $table->boolean('auto_send_birthday')->default(true);
                $table->boolean('auto_send_expiry')->default(true);
                $table->boolean('auto_send_dues')->default(true);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_settings');
    }
};
