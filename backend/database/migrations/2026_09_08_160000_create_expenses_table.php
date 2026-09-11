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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->string('title');
            $table->string('category')->index(); // Rent, Utilities, Salaries, Equipment AMC, Maintenance, Inventory, Marketing, Other
            $table->string('vendor');
            $table->decimal('amount', 12, 2);
            $table->date('date')->index();
            $table->string('payment_mode')->default('UPI'); // UPI, Bank Transfer, Card, Cash, Cheque
            $table->string('ref_no')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
