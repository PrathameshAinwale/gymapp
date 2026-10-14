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
        if (!Schema::hasTable('notification_reads')) {
            Schema::create('notification_reads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->unsignedBigInteger('gym_id')->index();
                $table->string('notification_type', 50)->index();
                $table->string('reference_id', 100)->index();
                $table->date('read_date')->index();
                $table->timestamps();

                $table->unique(
                    ['user_id', 'gym_id', 'notification_type', 'reference_id', 'read_date'],
                    'uniq_notif_user_gym_ref_date'
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_reads');
    }
};
