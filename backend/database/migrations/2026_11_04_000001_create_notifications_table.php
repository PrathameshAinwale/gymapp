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
        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('gym_id')->index();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('type', 50)->index();
                $table->string('reference_id', 191)->nullable()->index();
                $table->string('title', 255);
                $table->text('message');
                $table->json('data')->nullable();
                $table->string('urgency', 20)->default('normal');
                $table->boolean('is_read')->default(false)->index();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                // Composite indexes for optimal query performance
                $table->index(['user_id', 'created_at'], 'idx_notif_user_created');
                $table->index(['user_id', 'is_read'], 'idx_notif_user_is_read');
                $table->index(['gym_id', 'type'], 'idx_notif_gym_type');
                $table->index(['user_id', 'reference_id'], 'idx_notif_user_ref');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};

