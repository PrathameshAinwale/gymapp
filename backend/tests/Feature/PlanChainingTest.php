<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\Invoice;
use App\Models\MembershipFreeze;
use App\Services\PlanChainingService;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PlanChainingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \App\Models\Gym::create([
            'id' => 1,
            'name' => 'Test Gym',
            'phone' => '9999999999',
            'status' => 'Active',
        ]);
    }

    /**
     * Test 1: Day after chaining rule for same package type.
     */
    public function test_chained_plan_starts_day_after_previous_plan_end_date()
    {
        $today = PlanChainingService::getTodayIst();
        $planEndDate = $today->copy()->addDays(20); // active plan ending 20 days in future

        // Create user and uncancelled invoice
        $user = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        $invoice = Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-TEST-001',
            'user_id' => $user->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 1500,
            'date' => $today->toDateString(),
            'start_date' => $today->toDateString(),
            'end_date' => $planEndDate->toDateString(),
            'payment_method' => 'UPI',
            'status' => 'Paid',
        ]);

        $chainingInfo = PlanChainingService::calculatePlanDates($user->id, 'Gym-Cardio', 1);

        $expectedStart = $planEndDate->copy()->addDay()->toDateString();
        $this->assertTrue($chainingInfo['has_active_plan']);
        $this->assertEquals($planEndDate->toDateString(), $chainingInfo['latest_end_date']);
        $this->assertEquals($expectedStart, $chainingInfo['default_start_date']);
        $this->assertEquals($expectedStart, $chainingInfo['min_start_date']);
        $this->assertEquals('chained', $chainingInfo['chaining_mode']);
    }

    /**
     * Test 2: Different package types are independent.
     */
    public function test_different_package_types_are_independent()
    {
        $today = PlanChainingService::getTodayIst();
        $planEndDate = $today->copy()->addDays(30);

        $user = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-TEST-002',
            'user_id' => $user->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 2000,
            'date' => $today->toDateString(),
            'start_date' => $today->toDateString(),
            'end_date' => $planEndDate->toDateString(),
            'payment_method' => 'Cash',
            'status' => 'Paid',
        ]);

        // Query Personal Training for the same user
        $ptChaining = PlanChainingService::calculatePlanDates($user->id, 'Personal Training', 1);

        $this->assertFalse($ptChaining['has_active_plan']);
        $this->assertEquals($today->toDateString(), $ptChaining['default_start_date']);
        $this->assertEquals($today->toDateString(), $ptChaining['min_start_date']);
        $this->assertEquals('fresh', $ptChaining['chaining_mode']);
    }

    /**
     * Test 3: Past dates and overlapping dates are rejected with validation error.
     */
    public function test_validation_rejects_past_dates_and_dates_before_chained_start()
    {
        $today = PlanChainingService::getTodayIst();
        $planEndDate = $today->copy()->addDays(15);

        $user = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-TEST-003',
            'user_id' => $user->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 1000,
            'date' => $today->toDateString(),
            'start_date' => $today->toDateString(),
            'end_date' => $planEndDate->toDateString(),
            'payment_method' => 'UPI',
            'status' => 'Paid',
        ]);

        // 3a: Past date rejected
        $this->expectException(ValidationException::class);
        PlanChainingService::validateStartDate($user->id, 'Gym-Cardio', $today->copy()->subDay()->toDateString(), 1);
    }

    /**
     * Test 4: Overlapping dates before previous plan end date + 1 are rejected.
     */
    public function test_validation_rejects_dates_before_previous_plan_end_plus_one()
    {
        $today = PlanChainingService::getTodayIst();
        $planEndDate = $today->copy()->addDays(15);

        $user = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-TEST-004',
            'user_id' => $user->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 1000,
            'date' => $today->toDateString(),
            'start_date' => $today->toDateString(),
            'end_date' => $planEndDate->toDateString(),
            'payment_method' => 'UPI',
            'status' => 'Paid',
        ]);

        // Attempt to start on the end_date itself (not day after)
        $this->expectException(ValidationException::class);
        PlanChainingService::validateStartDate($user->id, 'Gym-Cardio', $planEndDate->toDateString(), 1);
    }

    /**
     * Test 5: Frozen plans extend the latest end date (Option 1).
     */
    public function test_frozen_plans_extend_end_date_for_chaining()
    {
        $today = PlanChainingService::getTodayIst();
        $planEndDate = $today->copy()->addDays(10);

        $user = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-TEST-005',
            'user_id' => $user->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 1000,
            'date' => $today->toDateString(),
            'start_date' => $today->toDateString(),
            'end_date' => $planEndDate->toDateString(),
            'payment_method' => 'UPI',
            'status' => 'Paid',
        ]);

        // Add 7 frozen days
        MembershipFreeze::create([
            'gym_id' => 1,
            'member_name' => $user->name,
            'member_id' => $user->id,
            'freeze_start_date' => $today->toDateString(),
            'freeze_end_date' => $today->copy()->addDays(7)->toDateString(),
            'days_frozen' => 7,
            'status' => 'Active Freeze',
            'reason' => 'Medical reason',
        ]);

        $chainingInfo = PlanChainingService::calculatePlanDates($user->id, 'Gym-Cardio', 1);

        $expectedExtendedEnd = $planEndDate->copy()->addDays(7);
        $expectedStart = $expectedExtendedEnd->copy()->addDay()->toDateString();

        $this->assertEquals($expectedExtendedEnd->toDateString(), $chainingInfo['latest_end_date']);
        $this->assertEquals($expectedStart, $chainingInfo['default_start_date']);
    }

    /**
     * Test 6: Legacy invoices with null start_date / end_date fall back gracefully to member profile.
     */
    public function test_legacy_invoices_without_dates_fall_back_to_member_profile()
    {
        $today = PlanChainingService::getTodayIst();
        $profileExpiry = $today->copy()->addDays(25);

        $user = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        MemberProfile::create([
            'user_id' => $user->id,
            'status' => 'Active',
            'expiry_date' => $profileExpiry->toDateString(),
        ]);

        // Old legacy invoice with null start_date and end_date
        Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-LEGACY-001',
            'user_id' => $user->id,
            'package_type' => null,
            'amount' => 1200,
            'date' => $today->toDateString(),
            'start_date' => null,
            'end_date' => null,
            'payment_method' => 'Cash',
            'status' => 'Paid',
        ]);

        $chainingInfo = PlanChainingService::calculatePlanDates($user->id, 'Gym-Cardio', 1);

        $this->assertTrue($chainingInfo['has_active_plan']);
        $this->assertEquals($profileExpiry->toDateString(), $chainingInfo['latest_end_date']);
        $this->assertEquals($profileExpiry->copy()->addDay()->toDateString(), $chainingInfo['default_start_date']);
    }

    /**
     * Test 7: Cancelling an earlier plan is blocked if later chained plans exist (Option 1).
     */
    public function test_cancellation_of_earlier_plan_is_blocked_when_chained_plan_exists()
    {
        $today = PlanChainingService::getTodayIst();
        $firstPlanEnd = $today->copy()->addDays(30);
        $secondPlanStart = $firstPlanEnd->copy()->addDay();
        $secondPlanEnd = $secondPlanStart->copy()->addDays(30);

        $user = User::factory()->create(['role' => 'member', 'gym_id' => 1]);

        $inv1 = Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-CHAIN-1',
            'user_id' => $user->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 1000,
            'date' => $today->toDateString(),
            'start_date' => $today->toDateString(),
            'end_date' => $firstPlanEnd->toDateString(),
            'payment_method' => 'UPI',
            'status' => 'Paid',
        ]);

        $inv2 = Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-CHAIN-2',
            'user_id' => $user->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 1000,
            'date' => $today->toDateString(),
            'start_date' => $secondPlanStart->toDateString(),
            'end_date' => $secondPlanEnd->toDateString(),
            'payment_method' => 'UPI',
            'status' => 'Paid',
        ]);

        // Attempting to cancel inv1 should be blocked because inv2 chains after it
        $check1 = PlanChainingService::checkCanCancelOrDeleteInvoice($inv1);
        $this->assertFalse($check1['can_cancel']);
        $this->assertStringContainsString('INV-CHAIN-2', $check1['message']);

        // Attempting to cancel inv2 (the leaf plan) should be permitted
        $check2 = PlanChainingService::checkCanCancelOrDeleteInvoice($inv2);
        $this->assertTrue($check2['can_cancel']);
    }
}
