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
        if (!Schema::hasTable('gym_roles')) {
            Schema::create('gym_roles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('gym_id')->constrained('gyms')->onDelete('cascade');
                $table->string('name');
                $table->string('slug');
                $table->text('description')->nullable();
                $table->string('color')->default('indigo');
                $table->json('assigned_pages')->nullable();
                $table->boolean('is_default')->default(false);
                $table->timestamps();

                $table->unique(['gym_id', 'slug']);
                $table->index('gym_id');
            });

            // Seed default 3 staff roles (manager, accounts, trainer) for any existing gyms
            $gyms = DB::table('gyms')->select('id')->get();
            $now = now();
            $defaultRoles = [];

            $managerPages = [
                'dashboard', 'whatsapp-automation', 'analytics', 'members',
                'classes', 'pt-sessions', 'enquiries', 'attendance',
                'plans', 'membership-freeze', 'products', 'equipment',
                'privacy-policy', 'terms-conditions', 'help-support'
            ];

            $accountsPages = [
                'dashboard', 'members', 'classes', 'pt-sessions', 'enquiries', 'attendance',
                'whatsapp-automation', 'plans', 'membership-freeze', 'staff-accounts', 'shifts',
                'leaves', 'advance-pay', 'payroll', 'commissions', 'analytics', 'reports',
                'financials', 'invoices', 'products', 'equipment', 'settings',
                'privacy-policy', 'terms-conditions', 'help-support'
            ];

            $trainerPages = [
                'dashboard', 'sessions', 'clients', 'workout-builder', 'diet-builder',
                'advance-request', 'trainer-leaves', 'commissions', 'profile',
                'privacy-policy', 'terms-conditions', 'help-support'
            ];

            foreach ($gyms as $gym) {
                $defaultRoles[] = [
                    'gym_id' => $gym->id,
                    'name' => 'Manager',
                    'slug' => 'manager',
                    'description' => 'Front desk, admissions & daily club operations',
                    'color' => 'indigo',
                    'assigned_pages' => json_encode($managerPages),
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $defaultRoles[] = [
                    'gym_id' => $gym->id,
                    'name' => 'Accounts',
                    'slug' => 'accounts',
                    'description' => 'Finances, payroll, invoices & billing ledger',
                    'color' => 'amber',
                    'assigned_pages' => json_encode($accountsPages),
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $defaultRoles[] = [
                    'gym_id' => $gym->id,
                    'name' => 'Trainer',
                    'slug' => 'trainer',
                    'description' => '1-on-1 PT coaching, workout & diet plans',
                    'color' => 'purple',
                    'assigned_pages' => json_encode($trainerPages),
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($defaultRoles)) {
                DB::table('gym_roles')->insert($defaultRoles);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gym_roles');
    }
};
