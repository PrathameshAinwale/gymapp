<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('revenue_and_billings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gym_id')->nullable()->index();
            $table->enum('type', ['inflow', 'outflow'])->index();
            $table->string('reference_no')->index(); // INV-..., EXP-..., etc.
            $table->unsignedBigInteger('user_id')->nullable()->index(); // Member or user
            $table->string('member_name')->nullable();
            $table->unsignedBigInteger('plan_id')->nullable()->index();
            $table->string('plan_name')->nullable();
            $table->string('title');
            $table->string('category')->index();
            $table->string('vendor')->nullable(); // For expenses / outflow
            $table->decimal('amount', 12, 2);
            $table->date('date')->index();
            $table->string('payment_method')->default('UPI');
            $table->string('status')->default('Paid'); // Paid, Pending, Cancelled
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('gym_id')->references('id')->on('gyms')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('plan_id')->references('id')->on('plans')->nullOnDelete();
        });

        // Backfill existing Inflow from `invoices`
        if (Schema::hasTable('invoices')) {
            $existingInvoices = DB::table('invoices')
                ->leftJoin('users', 'invoices.user_id', '=', 'users.id')
                ->leftJoin('plans', 'invoices.plan_id', '=', 'plans.id')
                ->select(
                    'invoices.*',
                    'users.name as user_name',
                    'plans.name as plan_title'
                )
                ->get();

            foreach ($existingInvoices as $inv) {
                DB::table('revenue_and_billings')->insert([
                    'gym_id' => $inv->gym_id ?? 1,
                    'type' => 'inflow',
                    'reference_no' => $inv->invoice_number,
                    'user_id' => $inv->user_id,
                    'member_name' => $inv->user_name ?? 'Member',
                    'plan_id' => $inv->plan_id,
                    'plan_name' => $inv->plan_title ?? 'Membership Plan',
                    'title' => ($inv->plan_title ?? 'Membership Plan') . ' - Fee Collection',
                    'category' => 'Membership Fee',
                    'vendor' => null,
                    'amount' => $inv->amount,
                    'date' => $inv->date,
                    'payment_method' => $inv->payment_method ?? 'UPI',
                    'status' => $inv->status ?? 'Paid',
                    'notes' => 'Migrated from invoices',
                    'created_by' => null,
                    'created_at' => $inv->created_at ?? now(),
                    'updated_at' => $inv->updated_at ?? now(),
                ]);
            }
        }

        // Backfill existing Outflow from `expenses`
        if (Schema::hasTable('expenses')) {
            $existingExpenses = DB::table('expenses')->get();
            foreach ($existingExpenses as $exp) {
                DB::table('revenue_and_billings')->insert([
                    'gym_id' => $exp->gym_id ?? 1,
                    'type' => 'outflow',
                    'reference_no' => $exp->ref_no ?? ('EXP-' . $exp->id),
                    'user_id' => null,
                    'member_name' => null,
                    'plan_id' => null,
                    'plan_name' => null,
                    'title' => $exp->title,
                    'category' => $exp->category ?? 'Operating Expense',
                    'vendor' => $exp->vendor ?? 'General Expense',
                    'amount' => $exp->amount,
                    'date' => $exp->date,
                    'payment_method' => $exp->payment_mode ?? 'UPI',
                    'status' => 'Paid',
                    'notes' => $exp->notes,
                    'created_by' => $exp->created_by,
                    'created_at' => $exp->created_at ?? now(),
                    'updated_at' => $exp->updated_at ?? now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('revenue_and_billings');
    }
};
