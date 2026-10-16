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

class MultiPackageInvoiceTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;
    protected User $owner;
    protected User $member;
    protected User $trainer;
    protected Plan $gymPlan;
    protected Plan $ptPlan;
    protected Plan $massagePlan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym = Gym::create([
            'id' => 1,
            'name' => 'Fitness Club Pune',
            'phone' => '9888877777',
            'status' => 'Active',
        ]);

        $this->owner = User::factory()->create([
            'role' => 'owner',
            'gym_id' => 1,
            'name' => 'Gym Owner',
            'email' => 'owner@fitnessclub.test',
        ]);

        $this->member = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Aarav Sharma',
            'phone' => '9876543210',
            'email' => 'aarav@fitnessclub.test',
        ]);

        $this->trainer = User::factory()->create([
            'role' => 'trainer',
            'gym_id' => 1,
            'name' => 'Coach Vikram',
            'email' => 'vikram@fitnessclub.test',
        ]);

        MemberProfile::create([
            'user_id' => $this->member->id,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
        ]);

        $this->gymPlan = Plan::create([
            'gym_id' => 1,
            'name' => 'Gym-Cardio Annual',
            'package_type' => 'Gym-Cardio',
            'price' => 12000,
            'duration_months' => 12,
            'status' => 'Active',
        ]);

        $this->ptPlan = Plan::create([
            'gym_id' => 1,
            'name' => 'Personal Training 24 Sessions',
            'package_type' => 'Personal Training',
            'price' => 8000,
            'duration_months' => 3,
            'status' => 'Active',
        ]);

        $this->massagePlan = Plan::create([
            'gym_id' => 1,
            'name' => 'Recovery & Spa 1 Month',
            'package_type' => 'Massage',
            'price' => 2500,
            'duration_months' => 1,
            'status' => 'Active',
        ]);
    }

    /**
     * Test 2 packages (Gym-Cardio + PT) in 1 request creates exactly 1 invoice, 2 items, 1 inflow, correct totals.
     */
    public function test_two_packages_in_one_request_creates_exactly_one_invoice_with_two_items_and_one_inflow(): void
    {
        $startDate = now()->toDateString();
        $gymEnd = now()->addYear()->subDay()->toDateString();
        $ptEnd = now()->addMonths(3)->subDay()->toDateString();

        $payload = [
            'gym_id' => 1,
            'user_id' => $this->member->id,
            'amount' => 18000,
            'total_amount' => 18000,
            'pending_amount' => 0,
            'discount' => 2000,
            'payment_method' => 'UPI',
            'packages' => [
                [
                    'package_type' => 'Gym-Cardio',
                    'plan_id' => $this->gymPlan->id,
                    'name' => 'Gym-Cardio Annual',
                    'price' => 12000,
                    'discount' => 1000,
                    'start_date' => $startDate,
                    'end_date' => $gymEnd,
                ],
                [
                    'package_type' => 'Personal Training',
                    'plan_id' => $this->ptPlan->id,
                    'name' => 'Personal Training 24 Sessions',
                    'trainer_id' => $this->trainer->id,
                    'price' => 8000,
                    'discount' => 1000,
                    'start_date' => $startDate,
                    'end_date' => $ptEnd,
                ]
            ],
        ];

        $response = $this->actingAs($this->owner)->postJson('/api/v1/invoices', $payload);
        $response->assertStatus(201);

        // Assert exactly 1 invoice exists
        $this->assertEquals(1, Invoice::count(), 'Expected exactly 1 invoice row to be created');
        $invoice = Invoice::first();

        // Assert 2 line items are stored in invoices.items
        $this->assertIsArray($invoice->items);
        $this->assertCount(2, $invoice->items);
        $this->assertEquals('Gym-Cardio Annual', $invoice->items[0]['name']);
        $this->assertEquals('Personal Training 24 Sessions', $invoice->items[1]['name']);

        // Assert totals
        $this->assertEquals(18000, (float)$invoice->amount);
        $this->assertEquals(18000, (float)$invoice->total_amount);
        $this->assertEquals(0, (float)$invoice->pending_amount);
        $this->assertEquals('Paid', $invoice->status);

        // Assert exactly 1 RevenueBilling inflow exists with matching invoice number
        $this->assertEquals(1, RevenueBilling::where('type', 'inflow')->count(), 'Expected exactly 1 revenue inflow record');
        $inflow = RevenueBilling::where('type', 'inflow')->first();
        $this->assertEquals($invoice->invoice_number, $inflow->reference_no);
        $this->assertEquals(18000, (float)$inflow->amount);
    }

    /**
     * Test 3 packages of mixed types in one request creates single invoice with 3 line items.
     */
    public function test_three_packages_of_mixed_types_creates_single_invoice_with_three_items(): void
    {
        $startDate = now()->toDateString();
        $gymEnd = now()->addYear()->subDay()->toDateString();
        $ptEnd = now()->addMonths(3)->subDay()->toDateString();
        $spaEnd = now()->addMonth()->subDay()->toDateString();

        $payload = [
            'gym_id' => 1,
            'user_id' => $this->member->id,
            'amount' => 20000,
            'total_amount' => 22500,
            'pending_amount' => 2500,
            'payment_method' => 'Cash',
            'packages' => [
                [
                    'package_type' => 'Gym-Cardio',
                    'plan_id' => $this->gymPlan->id,
                    'name' => 'Gym-Cardio Annual',
                    'price' => 12000,
                    'start_date' => $startDate,
                    'end_date' => $gymEnd,
                ],
                [
                    'package_type' => 'Personal Training',
                    'plan_id' => $this->ptPlan->id,
                    'name' => 'Personal Training 24 Sessions',
                    'trainer_id' => $this->trainer->id,
                    'price' => 8000,
                    'start_date' => $startDate,
                    'end_date' => $ptEnd,
                ],
                [
                    'package_type' => 'Massage',
                    'plan_id' => $this->massagePlan->id,
                    'name' => 'Recovery & Spa 1 Month',
                    'price' => 2500,
                    'start_date' => $startDate,
                    'end_date' => $spaEnd,
                ]
            ],
        ];

        $response = $this->actingAs($this->owner)->postJson('/api/v1/invoices', $payload);
        $response->assertStatus(201);

        $this->assertEquals(1, Invoice::count(), 'Expected exactly 1 invoice row');
        $invoice = Invoice::first();
        $this->assertCount(3, $invoice->items);
        $this->assertEquals(20000, (float)$invoice->amount);
        $this->assertEquals(22500, (float)$invoice->total_amount);
        $this->assertEquals(2500, (float)$invoice->pending_amount);
        $this->assertEquals('Pending', $invoice->status);

        $this->assertEquals(1, RevenueBilling::where('type', 'inflow')->count());
    }

    /**
     * Test single package submission still works seamlessly.
     */
    public function test_single_package_submission_still_works(): void
    {
        $startDate = now()->toDateString();
        $expiryDate = now()->addYear()->subDay()->toDateString();

        $payload = [
            'gym_id' => 1,
            'user_id' => $this->member->id,
            'plan_id' => $this->gymPlan->id,
            'package_type' => 'Gym-Cardio',
            'amount' => 12000,
            'total_amount' => 12000,
            'pending_amount' => 0,
            'payment_method' => 'UPI',
            'start_date' => $startDate,
            'expiry_date' => $expiryDate,
        ];

        $response = $this->actingAs($this->owner)->postJson('/api/v1/invoices', $payload);
        $response->assertStatus(201);

        $this->assertEquals(1, Invoice::count());
        $invoice = Invoice::first();
        $this->assertNotEmpty($invoice->items);
        $this->assertEquals(1, count($invoice->items));
        $this->assertEquals(12000, (float)$invoice->amount);
        $this->assertEquals(1, RevenueBilling::where('type', 'inflow')->count());
    }

    /**
     * Test failure rolls back everything (no orphaned invoice or revenue record).
     */
    public function test_failure_rolls_back_everything_in_transaction(): void
    {
        $initialInvoices = Invoice::count();
        $initialInflows = RevenueBilling::count();

        // Pass invalid user ID to trigger validation failure
        $payload = [
            'gym_id' => 1,
            'user_id' => 999999, // Non-existent user
            'amount' => 5000,
            'payment_method' => 'UPI',
        ];

        $response = $this->actingAs($this->owner)->postJson('/api/v1/invoices', $payload);
        $response->assertStatus(422);

        $this->assertEquals($initialInvoices, Invoice::count());
        $this->assertEquals($initialInflows, RevenueBilling::count());
    }

    /**
     * Test member registration with 2 packages:
     * - Returns identical invoice number in store response and fetch
     * - Preserves both package line items with independent start and end dates in plan breakdown
     */
    public function test_register_member_with_two_packages_returns_identical_invoice_matching_fetch(): void
    {
        $startDate = now()->toDateString();
        $gymEnd = now()->addYear()->subDay()->toDateString();
        $ptEnd = now()->addMonths(3)->subDay()->toDateString();

        $payload = [
            'gym_id' => 1,
            'name' => 'Rohan Sen',
            'phone' => '9811223344',
            'email' => 'rohan.sen@example.test',
            'password' => 'pass1234',
            'joinDate' => $startDate,
            'startDate' => $startDate,
            'expiryDate' => $gymEnd,
            'amount' => 19000,
            'totalAmount' => 20000,
            'discountAmount' => 1000,
            'duesAmount' => 0,
            'paymentMethod' => 'UPI',
            'packages' => [
                [
                    'package_type' => 'Gym-Cardio',
                    'plan_id' => $this->gymPlan->id,
                    'name' => 'Gym-Cardio Annual',
                    'price' => 12000,
                    'discount' => 1000,
                    'start_date' => $startDate,
                    'end_date' => $gymEnd,
                ],
                [
                    'package_type' => 'Personal Training',
                    'plan_id' => $this->ptPlan->id,
                    'name' => 'Personal Training 24 Sessions',
                    'trainer_id' => $this->trainer->id,
                    'price' => 8000,
                    'discount' => 0,
                    'start_date' => $startDate,
                    'end_date' => $ptEnd,
                ]
            ],
        ];

        $regResponse = $this->actingAs($this->owner)->postJson('/api/v1/members', $payload);
        $regResponse->assertStatus(201);

        $createdData = $regResponse->json('data');
        $storedInvoiceNo = $createdData['invoiceNumber'] ?? $regResponse->json('invoiceNumber');
        $this->assertNotEmpty($storedInvoiceNo, 'Store response must return invoiceNumber');

        // Exactly 1 invoice created in database
        $memberUser = User::where('email', 'rohan.sen@example.test')->first();
        $this->assertNotNull($memberUser);
        $memberInvoices = Invoice::where('user_id', $memberUser->id)->get();
        $this->assertCount(1, $memberInvoices, 'Member must have exactly 1 invoice created');

        $singleInvoice = $memberInvoices->first();
        $this->assertEquals($storedInvoiceNo, $singleInvoice->invoice_number);

        // Fetch member invoices endpoint
        $fetchInvoicesResponse = $this->actingAs($this->owner)->getJson("/api/v1/invoices?user_id={$memberUser->id}");
        $fetchInvoicesResponse->assertStatus(200);
        $invoicesData = $fetchInvoicesResponse->json('data');
        $this->assertCount(1, $invoicesData);
        $this->assertEquals($storedInvoiceNo, $invoicesData[0]['id']);
        $this->assertEquals($storedInvoiceNo, $invoicesData[0]['invoiceNumber']);
        $this->assertCount(2, $invoicesData[0]['items']);

        // Check member subscription plan breakdown
        $breakdown = PlanChainingService::getMemberPlansBreakdown($memberUser);
        $this->assertNotEmpty($breakdown['activeGrouped']);
        $this->assertArrayHasKey('Gym-Cardio', $breakdown['activeGrouped']);
        $this->assertArrayHasKey('Personal Training', $breakdown['activeGrouped']);

        // Both packages keep independent end dates
        $this->assertEquals($gymEnd, $breakdown['activeGrouped']['Gym-Cardio']['endDate']);
        $this->assertEquals($ptEnd, $breakdown['activeGrouped']['Personal Training']['endDate']);
    }
}
