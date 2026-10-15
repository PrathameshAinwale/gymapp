<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Gym;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\Invoice;
use App\Models\RevenueBilling;
use App\Services\PlanChainingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CreateInvoicePersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;
    protected User $owner;
    protected User $member;
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

        $this->member = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Rahul Verma',
            'phone' => '9876543210',
            'email' => 'rahul.verma@example.test',
        ]);

        MemberProfile::create([
            'user_id' => $this->member->id,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
        ]);

        $this->plan = Plan::create([
            'gym_id' => 1,
            'name' => 'Gym-Cardio Gold',
            'package_type' => 'Gym-Cardio',
            'price' => 5000,
            'duration_months' => 1,
        ]);
    }

    public function test_create_invoice_persists_inflow_and_is_returned_by_member_invoices_and_active_plans(): void
    {
        $today = PlanChainingService::getTodayIst();
        $startDate = $today->toDateString();
        $endDate = $today->copy()->addDays(30)->toDateString();

        $payload = [
            'user_id' => $this->member->id,
            'plan_id' => $this->plan->id,
            'plan_name' => 'Gym-Cardio Gold',
            'package_type' => 'Gym-Cardio',
            'amount' => 5000,
            'total_amount' => 5000,
            'dues_amount' => 0,
            'payment_date' => $startDate,
            'start_date' => $startDate,
            'expiry_date' => $endDate,
            'payment_method' => 'UPI',
            'status' => 'Paid',
            'created_by' => $this->owner->id,
            'created_by_name' => $this->owner->name,
            'gym_id' => 1,
        ];

        // 1. Post to real create invoice endpoint
        $createResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/invoices', $payload);

        $createResponse->assertSuccessful();
        $createResponse->assertJson(['success' => true]);
        $invoiceNumber = $createResponse->json('data.id');
        $this->assertNotEmpty($invoiceNumber);

        // Assert Invoice row exists in database
        $this->assertDatabaseHas('invoices', [
            'user_id' => $this->member->id,
            'invoice_number' => $invoiceNumber,
            'package_type' => 'Gym-Cardio',
            'amount' => 5000,
        ]);

        // Assert RevenueBilling (inflow) row was created
        $this->assertDatabaseHas('revenue_and_billings', [
            'type' => 'inflow',
            'reference_no' => $invoiceNumber,
            'user_id' => $this->member->id,
            'amount' => 5000,
        ]);

        // 2. Query member's invoices endpoint (/api/v1/invoices?user_id=...)
        $invoicesResponse = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/invoices?user_id=' . $this->member->id . '&gym_id=1');

        $invoicesResponse->assertStatus(200);
        $invoicesData = $invoicesResponse->json('data');
        $this->assertNotEmpty($invoicesData);
        $matchingInvoice = collect($invoicesData)->firstWhere('id', $invoiceNumber);
        $this->assertNotNull($matchingInvoice, 'Invoice must be returned in member invoices list');
        $this->assertEquals(5000, $matchingInvoice['amount']);

        // Also query accounting inflow endpoint (/api/v1/revenue-billing/inflow?user_id=...)
        $inflowsResponse = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/revenue-billing/inflow?user_id=' . $this->member->id . '&gym_id=1');
        $inflowsResponse->assertStatus(200);
        $inflowsData = $inflowsResponse->json('data');
        $matchingInflow = collect($inflowsData)->firstWhere('id', $invoiceNumber);
        $this->assertNotNull($matchingInflow, 'Invoice must be returned in revenue billing inflows');

        // 3. Query member profile (/api/v1/members/{id})
        $memberResponse = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/members/' . $this->member->id . '?gym_id=1');

        $memberResponse->assertStatus(200);
        $memberData = $memberResponse->json('data');

        // Assert activePlans array is present and includes Gym-Cardio package with exact start and end dates
        $this->assertArrayHasKey('activePlans', $memberData);
        $activePlans = $memberData['activePlans'];
        $this->assertNotEmpty($activePlans);

        $activeGymCardio = collect($activePlans)->firstWhere('packageType', 'Gym-Cardio');
        $this->assertNotNull($activeGymCardio, 'Active plans must contain Gym-Cardio package');
        $this->assertEquals($startDate, $activeGymCardio['startDate']);
        $this->assertEquals($endDate, $activeGymCardio['endDate']);
        $this->assertEquals('Active', $activeGymCardio['status']);
    }

    public function test_multi_package_pt_and_chained_upcoming_plans_appear_in_profile_breakdown(): void
    {
        $today = PlanChainingService::getTodayIst();
        $ptStart = $today->toDateString();
        $ptEnd = $today->copy()->addDays(45)->toDateString();

        // 1. Create PT Invoice
        $ptPayload = [
            'user_id' => $this->member->id,
            'plan_name' => '1-on-1 Personal Training',
            'package_type' => 'Personal Training',
            'amount' => 8000,
            'total_amount' => 8000,
            'dues_amount' => 0,
            'payment_date' => $ptStart,
            'start_date' => $ptStart,
            'expiry_date' => $ptEnd,
            'payment_method' => 'Cash',
            'status' => 'Paid',
            'created_by' => $this->owner->id,
            'gym_id' => 1,
        ];

        $res1 = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/invoices', $ptPayload);
        $res1->assertSuccessful();

        // 2. Create Chained (Upcoming) Gym-Cardio Invoice starting after current membership
        $currentExp = Carbon::parse($this->member->memberProfile->expiry_date);
        $chainedStart = $currentExp->copy()->addDay()->toDateString();
        $chainedEnd = $currentExp->copy()->addDays(31)->toDateString();

        $chainedPayload = [
            'user_id' => $this->member->id,
            'plan_name' => 'Gym-Cardio Renewal',
            'package_type' => 'Gym-Cardio',
            'amount' => 4500,
            'total_amount' => 4500,
            'dues_amount' => 0,
            'payment_date' => $today->toDateString(),
            'start_date' => $chainedStart,
            'expiry_date' => $chainedEnd,
            'payment_method' => 'UPI',
            'status' => 'Paid',
            'created_by' => $this->owner->id,
            'gym_id' => 1,
        ];

        $res2 = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/invoices', $chainedPayload);
        $res2->assertSuccessful();

        // 3. Query member profile
        $memberResponse = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/members/' . $this->member->id . '?gym_id=1');

        $memberResponse->assertStatus(200);
        $memberData = $memberResponse->json('data');

        // Assert Personal Training is in activePlans with correct dates
        $activePt = collect($memberData['activePlans'])->firstWhere('packageType', 'Personal Training');
        $this->assertNotNull($activePt, 'PT must be present in activePlans');
        $this->assertEquals($ptStart, $activePt['startDate']);
        $this->assertEquals($ptEnd, $activePt['endDate']);

        // Assert Upcoming chained plan is in upcomingPlans
        $this->assertArrayHasKey('upcomingPlans', $memberData);
        $upcomingGym = collect($memberData['upcomingPlans'])->firstWhere('packageType', 'Gym-Cardio');
        $this->assertNotNull($upcomingGym, 'Chained plan must be present in upcomingPlans');
        $this->assertEquals($chainedStart, $upcomingGym['startDate']);
        $this->assertEquals($chainedEnd, $upcomingGym['endDate']);
    }

    public function test_member_with_gym_and_pt_in_one_invoice_and_separate_invoices_with_upcoming_and_expired(): void
    {
        $today = PlanChainingService::getTodayIst();
        $todayStr = $today->toDateString();

        // 1. New Member
        $athlete = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Vikram Malhotra',
            'email' => 'vikram@example.test',
        ]);
        MemberProfile::create([
            'user_id' => $athlete->id,
            'status' => 'Active',
            'join_date' => $todayStr,
            'expiry_date' => $today->copy()->addDays(30)->toDateString(),
        ]);

        // SCENARIO 1: Single invoice with both Gym-Cardio and PT packages
        $gymStart = $todayStr;
        $gymEnd = $today->copy()->addDays(30)->toDateString();
        $ptStart = $todayStr;
        $ptEnd = $today->copy()->addDays(60)->toDateString();

        $multiPkgPayload = [
            'user_id' => $athlete->id,
            'amount' => 12000,
            'total_amount' => 12000,
            'payment_date' => $todayStr,
            'payment_method' => 'UPI',
            'status' => 'Paid',
            'packages' => [
                [
                    'package_type' => 'Gym-Cardio',
                    'plan_name' => 'Gold Gym-Cardio Monthly',
                    'start_date' => $gymStart,
                    'end_date' => $gymEnd,
                    'amount' => 5000,
                ],
                [
                    'package_type' => 'Personal Training',
                    'plan_name' => '24 Sessions Personal Training',
                    'start_date' => $ptStart,
                    'end_date' => $ptEnd,
                    'amount' => 7000,
                ],
            ],
            'created_by' => $this->owner->id,
            'gym_id' => 1,
        ];

        $resMulti = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/invoices', $multiPkgPayload);
        $resMulti->assertSuccessful();

        // Check member profile endpoint
        $profileRes = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/members/' . $athlete->id . '?gym_id=1');
        $profileRes->assertSuccessful();
        $activePlans = $profileRes->json('data.activePlans');

        $activeGym = collect($activePlans)->firstWhere('packageType', 'Gym-Cardio');
        $this->assertNotNull($activeGym, 'Gym-Cardio must be active from multi-package invoice');
        $this->assertEquals($gymStart, $activeGym['startDate']);
        $this->assertEquals($gymEnd, $activeGym['endDate']);

        $activePt = collect($activePlans)->firstWhere('packageType', 'Personal Training');
        $this->assertNotNull($activePt, 'PT must be active from multi-package invoice');
        $this->assertEquals($ptStart, $activePt['startDate']);
        $this->assertEquals($ptEnd, $activePt['endDate']);

        // SCENARIO 2: Add an Upcoming chained Gym-Cardio plan
        $upcomingStart = $today->copy()->addDays(31)->toDateString();
        $upcomingEnd = $today->copy()->addDays(61)->toDateString();

        $upcomingPayload = [
            'user_id' => $athlete->id,
            'plan_name' => 'Gym-Cardio Renewal Pass',
            'package_type' => 'Gym-Cardio',
            'amount' => 5000,
            'total_amount' => 5000,
            'payment_date' => $todayStr,
            'start_date' => $upcomingStart,
            'expiry_date' => $upcomingEnd,
            'payment_method' => 'Cash',
            'status' => 'Paid',
            'created_by' => $this->owner->id,
            'gym_id' => 1,
        ];

        $resUpcoming = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/invoices', $upcomingPayload);
        $resUpcoming->assertSuccessful();

        // SCENARIO 3: Add an Expired Plan
        $expiredStart = $today->copy()->subDays(60)->toDateString();
        $expiredEnd = $today->copy()->subDays(30)->toDateString();

        Invoice::create([
            'user_id' => $athlete->id,
            'member_id' => (string)$athlete->id,
            'invoice_number' => 'INV-HIST-001',
            'plan_name' => 'Past Month Recovery Spa',
            'package_type' => 'Massage',
            'amount' => 2000,
            'total_amount' => 2000,
            'date' => $expiredStart,
            'start_date' => $expiredStart,
            'end_date' => $expiredEnd,
            'status' => 'Paid',
            'gym_id' => 1,
        ]);

        // Verify profile response has active, upcoming, and expired plans
        $finalProfile = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/members/' . $athlete->id . '?gym_id=1');
        $finalProfile->assertSuccessful();
        $data = $finalProfile->json('data');

        // Check activePlans
        $this->assertNotEmpty(collect($data['activePlans'])->firstWhere('packageType', 'Gym-Cardio'));
        $this->assertNotEmpty(collect($data['activePlans'])->firstWhere('packageType', 'Personal Training'));

        // Check upcomingPlans
        $upcomingItem = collect($data['upcomingPlans'])->firstWhere('packageType', 'Gym-Cardio');
        $this->assertNotNull($upcomingItem, 'Upcoming chained plan must be in upcomingPlans');
        $this->assertEquals($upcomingStart, $upcomingItem['startDate']);
        $this->assertEquals($upcomingEnd, $upcomingItem['endDate']);
        $this->assertEquals('Upcoming', $upcomingItem['status']);

        // Check expiredPlans
        $expiredItem = collect($data['expiredPlans'])->firstWhere('packageType', 'Massage');
        $this->assertNotNull($expiredItem, 'Expired plan must be in expiredPlans');
        $this->assertEquals($expiredStart, $expiredItem['startDate']);
        $this->assertEquals($expiredEnd, $expiredItem['endDate']);
        $this->assertEquals('Expired', $expiredItem['status']);
    }

    public function test_cannot_create_invoice_when_member_has_outstanding_due_until_paid(): void
    {
        // 1. Give member an existing outstanding due balance
        $this->member->memberProfile->update([
            'dues_amount' => 1500,
            'due_date' => now()->addDays(5)->toDateString(),
        ]);

        $payload = [
            'user_id' => $this->member->id,
            'plan_id' => $this->plan->id,
            'plan_name' => 'Gym-Cardio Gold',
            'package_type' => 'Gym-Cardio',
            'amount' => 5000,
            'total_amount' => 5000,
            'dues_amount' => 0,
            'payment_date' => now()->toDateString(),
            'start_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
            'payment_method' => 'UPI',
            'status' => 'Paid',
            'created_by' => $this->owner->id,
            'gym_id' => 1,
        ];

        // 2. Attempt to create new invoice - must be rejected with HTTP 422
        $response = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/invoices', $payload);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
        ]);
        $this->assertStringContainsString('outstanding due balance', $response->json('message'));

        // 3. Member pays their due balance
        $this->member->memberProfile->update([
            'dues_amount' => 0,
            'due_date' => null,
        ]);

        // 4. Creation now succeeds
        $successResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/invoices', $payload);

        $successResponse->assertSuccessful();
        $successResponse->assertJson(['success' => true]);
    }
}
