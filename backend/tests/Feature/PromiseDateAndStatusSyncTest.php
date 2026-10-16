<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Gym;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Http\Controllers\Api\MemberController;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

class PromiseDateAndStatusSyncTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;
    protected User $owner;
    protected Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym = Gym::create([
            'id' => 1,
            'name' => 'ArchFit Flagship',
            'phone' => '9888877777',
            'status' => 'Active',
        ]);

        $this->owner = User::factory()->create([
            'role' => 'owner',
            'gym_id' => 1,
            'email' => 'owner@archfit.test',
        ]);

        $this->plan = Plan::create([
            'gym_id' => 1,
            'name' => 'Gym 1 Month',
            'package_type' => 'Gym',
            'duration_months' => 1,
            'duration_days' => 30,
            'price' => 1000,
            'status' => 'Active',
        ]);
    }

    public function test_compute_member_status_maps_lifecycle_states_correctly(): void
    {
        $today = Carbon::now('Asia/Kolkata')->startOfDay();
        $refJoin = $today->copy()->subDays(10)->toDateString();

        // 1. Future join date -> Upcoming
        $futureJoin = $today->copy()->addDays(5)->toDateString();
        $futureExpiry = $today->copy()->addDays(35)->toDateString();
        $this->assertEquals(
            'Upcoming',
            MemberController::computeMemberStatus($futureExpiry, 'Active', $futureJoin)
        );

        // 2. Active (> 10 days left)
        $activeExpiry = $today->copy()->addDays(20)->toDateString();
        $this->assertEquals(
            'Active',
            MemberController::computeMemberStatus($activeExpiry, 'Active', $refJoin)
        );

        // 3. Expiring Soon (within 10 days)
        $expiringSoonExpiry = $today->copy()->addDays(5)->toDateString();
        $this->assertEquals(
            'Expiring Soon',
            MemberController::computeMemberStatus($expiringSoonExpiry, 'Active', $refJoin)
        );

        // 4. On the expiry date itself -> Expiring Soon, NOT Expired
        $todayExpiry = $today->copy()->toDateString();
        $this->assertEquals(
            'Expiring Soon',
            MemberController::computeMemberStatus($todayExpiry, 'Active', $refJoin)
        );

        // 5. Day after expiry date -> Expired
        $pastExpiry = $today->copy()->subDays(1)->toDateString();
        $this->assertEquals(
            'Expired',
            MemberController::computeMemberStatus($pastExpiry, 'Active', $refJoin)
        );

        // 6. Renewal clears Expired lock
        $this->assertEquals(
            'Active',
            MemberController::computeMemberStatus($activeExpiry, 'Expired', $refJoin)
        );

        // 7. Administrative overrides are preserved
        $administrative = ['Frozen', 'Frozen (Paused)', 'On Hold', 'Suspended', 'Cancelled'];
        foreach ($administrative as $status) {
            $this->assertEquals(
                $status,
                MemberController::computeMemberStatus($pastExpiry, $status, $refJoin),
                "Administrative status {$status} should be preserved even when expired"
            );
            $this->assertEquals(
                $status,
                MemberController::computeMemberStatus($futureExpiry, $status, $futureJoin),
                "Administrative status {$status} should be preserved even when upcoming"
            );
        }
    }

    public function test_promise_date_validation_in_member_registration(): void
    {
        $start = now()->toDateString();
        $expiry = now()->addDays(31)->toDateString();
        $dayBeforeExpiry = now()->addDays(30)->toDateString();

        // 1. Promise date on start date is permitted
        $resStart = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/members', [
            'name' => 'Member Start Date',
            'phone' => '9870000001',
            'gym_id' => 1,
            'plan_id' => $this->plan->id,
            'join_date' => $start,
            'expiry_date' => $expiry,
            'plan_amount' => 1000,
            'paid_amount' => 500,
            'dues_amount' => 500,
            'due_date' => $start,
        ]);
        $resStart->assertStatus(201);

        // 2. Promise date on day before expiry is permitted
        $resDayBefore = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/members', [
            'name' => 'Member Day Before',
            'phone' => '9870000002',
            'gym_id' => 1,
            'plan_id' => $this->plan->id,
            'join_date' => $start,
            'expiry_date' => $expiry,
            'plan_amount' => 1000,
            'paid_amount' => 500,
            'dues_amount' => 500,
            'due_date' => $dayBeforeExpiry,
        ]);
        $resDayBefore->assertStatus(201);

        // 3. Promise date on expiry date itself is strictly rejected
        $resExpiry = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/members', [
            'name' => 'Member Expiry Fail',
            'phone' => '9870000003',
            'gym_id' => 1,
            'plan_id' => $this->plan->id,
            'join_date' => $start,
            'expiry_date' => $expiry,
            'plan_amount' => 1000,
            'paid_amount' => 500,
            'dues_amount' => 500,
            'due_date' => $expiry,
        ]);
        $resExpiry->assertStatus(422);
        $resExpiry->assertJsonValidationErrors(['due_date']);
        $this->assertStringContainsString('strictly before', $resExpiry->json('errors.due_date.0'));

        // 4. Promise date after expiry is rejected
        $resAfter = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/members', [
            'name' => 'Member After Fail',
            'phone' => '9870000004',
            'gym_id' => 1,
            'plan_id' => $this->plan->id,
            'join_date' => $start,
            'expiry_date' => $expiry,
            'plan_amount' => 1000,
            'paid_amount' => 500,
            'dues_amount' => 500,
            'due_date' => '2026-11-16',
        ]);
        $resAfter->assertStatus(422);
        $resAfter->assertJsonValidationErrors(['due_date']);

        // 5. Promise date before start date is rejected
        $resBefore = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/members', [
            'name' => 'Member Before Fail',
            'phone' => '9870000005',
            'gym_id' => 1,
            'plan_id' => $this->plan->id,
            'join_date' => $start,
            'expiry_date' => $expiry,
            'plan_amount' => 1000,
            'paid_amount' => 500,
            'dues_amount' => 500,
            'due_date' => '2026-10-14',
        ]);
        $resBefore->assertStatus(422);
        $resBefore->assertJsonValidationErrors(['due_date']);

        // 6. Missing promise date when dues exist is rejected
        $resMissing = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/members', [
            'name' => 'Member Missing Fail',
            'phone' => '9870000006',
            'gym_id' => 1,
            'plan_id' => $this->plan->id,
            'join_date' => $start,
            'expiry_date' => $expiry,
            'plan_amount' => 1000,
            'paid_amount' => 500,
            'dues_amount' => 500,
            'due_date' => null,
        ]);
        $resMissing->assertStatus(422);
        $resMissing->assertJsonValidationErrors(['due_date']);
    }

    public function test_promise_date_validation_in_create_invoice(): void
    {
        $member = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Invoice Member',
            'phone' => '9870001111',
            'email' => 'inv.member@example.test',
        ]);

        $start = now()->toDateString();
        $expiry = now()->addDays(31)->toDateString();
        $dayBeforeExpiry = now()->addDays(30)->toDateString();

        MemberProfile::create([
            'user_id' => $member->id,
            'status' => 'Active',
            'join_date' => $start,
            'expiry_date' => $expiry,
        ]);

        // Attempt invoice with promise date on expiry date
        $resFail = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/invoices', [
            'gym_id' => 1,
            'member_id' => $member->id,
            'package_id' => $this->plan->id,
            'plan_name' => 'Gym 1 Month',
            'package_type' => 'Gym',
            'service_type' => 'Gym',
            'amount' => 1000,
            'paid_amount' => 400,
            'balance_due' => 600,
            'balance_due_date' => $expiry,
            'start_date' => $start,
            'end_date' => $expiry,
            'payment_status' => 'Partial',
            'payment_method' => 'Cash',
        ]);
        $resFail->assertStatus(422);
        $resFail->assertJsonValidationErrors(['balance_due_date']);

        // Successful invoice with day before expiry
        $resSuccess = $this->actingAs($this->owner, 'sanctum')->postJson('/api/v1/invoices', [
            'gym_id' => 1,
            'member_id' => $member->id,
            'package_id' => $this->plan->id,
            'plan_name' => 'Gym 1 Month',
            'package_type' => 'Gym',
            'service_type' => 'Gym',
            'amount' => 1000,
            'paid_amount' => 400,
            'balance_due' => 600,
            'balance_due_date' => $dayBeforeExpiry,
            'start_date' => $start,
            'end_date' => $expiry,
            'payment_status' => 'Partial',
            'payment_method' => 'Cash',
        ]);
        $resSuccess->assertStatus(201);
    }

    public function test_scheduler_command_synchronizes_all_member_statuses(): void
    {
        $today = Carbon::now('Asia/Kolkata')->startOfDay();

        // Member 1: Future start date
        $m1 = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        $p1 = MemberProfile::create([
            'user_id' => $m1->id,
            'status' => 'Active',
            'join_date' => $today->copy()->addDays(5)->toDateString(),
            'expiry_date' => $today->copy()->addDays(35)->toDateString(),
        ]);

        // Member 2: Expired yesterday
        $m2 = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        $p2 = MemberProfile::create([
            'user_id' => $m2->id,
            'status' => 'Active',
            'join_date' => $today->copy()->subDays(31)->toDateString(),
            'expiry_date' => $today->copy()->subDays(1)->toDateString(),
        ]);

        // Member 3: Expiring today (valid through end of today -> Expiring Soon, NOT Expired)
        $m3 = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        $p3 = MemberProfile::create([
            'user_id' => $m3->id,
            'status' => 'Active',
            'join_date' => $today->copy()->subDays(30)->toDateString(),
            'expiry_date' => $today->copy()->toDateString(),
        ]);

        // Member 4: Frozen administrative override with past expiry
        $m4 = User::factory()->create(['role' => 'member', 'gym_id' => 1]);
        $p4 = MemberProfile::create([
            'user_id' => $m4->id,
            'status' => 'Frozen',
            'join_date' => $today->copy()->subDays(40)->toDateString(),
            'expiry_date' => $today->copy()->subDays(10)->toDateString(),
        ]);

        // Run the scheduler sync command
        Artisan::call('members:sync-status');

        $this->assertEquals('Upcoming', $p1->fresh()->status);
        $this->assertEquals('Expired', $p2->fresh()->status);
        $this->assertEquals('Expiring Soon', $p3->fresh()->status);
        $this->assertEquals('Frozen', $p4->fresh()->status);
    }
}
