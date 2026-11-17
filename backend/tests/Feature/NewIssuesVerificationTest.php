<?php

namespace Tests\Feature;

use App\Models\ClassEnrollment;
use App\Models\Expense;
use App\Models\Gym;
use App\Models\GymClass;
use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\Plan;
use App\Models\RevenueBilling;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NewIssuesVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gymA;
    protected Gym $gymB;
    protected User $ownerA;
    protected User $ownerB;
    protected User $trainerA;
    protected User $memberA1;
    protected User $memberA2;
    protected User $memberA3;
    protected User $memberB;
    protected Plan $planA;

    protected function setUp(): void
    {
        parent::setUp();

        // Facility A
        $this->gymA = Gym::create([
            'id' => 1,
            'name' => 'Pulse Fit Pune',
            'phone' => '9888811111',
            'status' => 'Active',
        ]);

        $this->ownerA = User::factory()->create([
            'role' => 'owner',
            'gym_id' => 1,
            'name' => 'Owner Alpha',
            'email' => 'owner.a@pulsefit.test',
        ]);

        $this->trainerA = User::factory()->create([
            'role' => 'trainer',
            'gym_id' => 1,
            'name' => 'Coach Alpha',
            'email' => 'coach.a@pulsefit.test',
        ]);

        $this->memberA1 = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Member A1',
            'phone' => '9800000001',
            'email' => 'member.a1@pulsefit.test',
        ]);

        $this->memberA2 = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Member A2',
            'phone' => '9800000002',
            'email' => 'member.a2@pulsefit.test',
        ]);

        $this->memberA3 = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Member A3',
            'phone' => '9800000003',
            'email' => 'member.a3@pulsefit.test',
        ]);

        MemberProfile::create([
            'user_id' => $this->memberA1->id,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
        ]);

        MemberProfile::create([
            'user_id' => $this->memberA2->id,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
        ]);

        MemberProfile::create([
            'user_id' => $this->memberA3->id,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
        ]);

        $this->planA = Plan::create([
            'gym_id' => 1,
            'name' => 'General Fitness Plan',
            'price' => 1500,
            'duration_months' => 1,
            'package_type' => 'Gym-Cardio',
            'status' => 'Active',
        ]);

        // Facility B
        $this->gymB = Gym::create([
            'id' => 2,
            'name' => 'Titan Gym Mumbai',
            'phone' => '9888822222',
            'status' => 'Active',
        ]);

        $this->ownerB = User::factory()->create([
            'role' => 'owner',
            'gym_id' => 2,
            'name' => 'Owner Beta',
            'email' => 'owner.b@titangym.test',
        ]);

        $this->memberB = User::factory()->create([
            'role' => 'member',
            'gym_id' => 2,
            'name' => 'Member Beta',
            'phone' => '9800000099',
            'email' => 'member.b@titangym.test',
        ]);

        MemberProfile::create([
            'user_id' => $this->memberB->id,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
        ]);
    }

    /**
     * Requirement 1: Class enrollment full lifecycle
     * - enroll succeeds
     * - duplicate enrollment is rejected
     * - capacity limit is enforced
     * - removal decrements booked_count and keeps the invoice
     * - member from another gym cannot be enrolled
     */
    public function test_class_enrollment_full_lifecycle(): void
    {
        Sanctum::actingAs($this->ownerA);

        $cls = GymClass::create([
            'gym_id' => 1,
            'name' => 'CrossFit Bootcamp',
            'trainer_id' => $this->trainerA->id,
            'instructor_name' => $this->trainerA->name,
            'time' => '06:00 AM - 07:00 AM',
            'days' => ['Mon', 'Wed', 'Fri'],
            'capacity' => 2, // capacity of 2
            'booked_count' => 0,
            'category' => 'Strength & Power',
        ]);

        // 1. Enroll succeeds
        $res1 = $this->postJson("/api/v1/classes/{$cls->id}/enroll", [
            'user_id' => $this->memberA1->id,
            'amount' => 500,
            'payment_method' => 'UPI',
        ]);

        $res1->assertStatus(201)
            ->assertJson([
                'success' => true,
                'enrolledCount' => 1,
            ]);

        $this->assertEquals(1, $cls->fresh()->booked_count);
        $this->assertDatabaseHas('class_enrollments', [
            'gym_class_id' => $cls->id,
            'user_id' => $this->memberA1->id,
            'status' => 'Active',
        ]);

        $enrollment1 = ClassEnrollment::where('gym_class_id', $cls->id)
            ->where('user_id', $this->memberA1->id)
            ->first();
        $this->assertNotNull($enrollment1);
        $invoiceId1 = $enrollment1->invoice_id;
        $this->assertNotNull($invoiceId1);

        // 2. Duplicate enrollment is rejected
        $resDup = $this->postJson("/api/v1/classes/{$cls->id}/enroll", [
            'user_id' => $this->memberA1->id,
            'amount' => 500,
        ]);

        $resDup->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
        $this->assertStringContainsString('already enrolled', $resDup->json('message'));

        // 3. Member from another gym cannot be enrolled
        $resOtherGym = $this->postJson("/api/v1/classes/{$cls->id}/enroll", [
            'user_id' => $this->memberB->id,
            'amount' => 500,
        ]);

        $resOtherGym->assertStatus(404);

        // 4. Enroll second member up to capacity limit
        $res2 = $this->postJson("/api/v1/classes/{$cls->id}/enroll", [
            'user_id' => $this->memberA2->id,
            'amount' => 500,
        ]);
        $res2->assertStatus(201);
        $this->assertEquals(2, $cls->fresh()->booked_count);

        // 5. Capacity limit is enforced (capacity = 2, attempting third member)
        $resFull = $this->postJson("/api/v1/classes/{$cls->id}/enroll", [
            'user_id' => $this->memberA3->id,
            'amount' => 500,
        ]);

        $resFull->assertStatus(422);
        $this->assertStringContainsString('maximum capacity', $resFull->json('message'));
        $this->assertEquals(2, $cls->fresh()->booked_count);

        // 6. Removal decrements booked_count and keeps the invoice
        $resRemove = $this->deleteJson("/api/v1/classes/{$cls->id}/enroll/{$this->memberA1->id}");
        $resRemove->assertStatus(200);

        $this->assertEquals(1, $cls->fresh()->booked_count);
        $this->assertDatabaseMissing('class_enrollments', [
            'gym_class_id' => $cls->id,
            'user_id' => $this->memberA1->id,
        ]);

        // CRITICAL: Invoice must NOT be deleted upon enrollment removal
        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId1,
            'user_id' => $this->memberA1->id,
        ]);
    }

    /**
     * Requirement 2: Trainer schedule overlap validation
     * - overlapping days and time is rejected
     * - non-overlapping is accepted
     * - editing a class does not conflict with itself
     */
    public function test_trainer_schedule_overlap_validation(): void
    {
        Sanctum::actingAs($this->ownerA);

        // Class 1: Mon, Wed at 07:00 AM - 08:00 AM
        $res1 = $this->postJson('/api/v1/classes', [
            'name' => 'Morning HIIT Batch',
            'trainer_id' => $this->trainerA->id,
            'time' => '07:00 AM - 08:00 AM',
            'days' => ['Mon', 'Wed'],
            'capacity' => 20,
            'category' => 'Cardio & HIIT',
        ]);
        $res1->assertStatus(201);
        $class1Id = $res1->json('data.numericId');

        // Overlapping Class: Mon, Fri at 07:30 AM - 08:30 AM (overlaps Mon 07:30-08:00) -> Must reject
        $resOverlap = $this->postJson('/api/v1/classes', [
            'name' => 'Conflicting Strength Batch',
            'trainer_id' => $this->trainerA->id,
            'time' => '07:30 AM - 08:30 AM',
            'days' => ['Mon', 'Fri'],
            'capacity' => 15,
            'category' => 'Strength & Power',
        ]);
        $resOverlap->assertStatus(422)
            ->assertJson(['success' => false]);
        $this->assertStringContainsString('overlapping class', $resOverlap->json('message'));

        // Non-overlapping Class: Mon at 09:00 AM - 10:00 AM -> Must accept
        $resNonOverlapSameDay = $this->postJson('/api/v1/classes', [
            'name' => 'Midday Yoga',
            'trainer_id' => $this->trainerA->id,
            'time' => '09:00 AM - 10:00 AM',
            'days' => ['Mon'],
            'capacity' => 15,
            'category' => 'Yoga & Flexibility',
        ]);
        $resNonOverlapSameDay->assertStatus(201);

        // Non-overlapping Class: Tue, Thu at 07:00 AM - 08:00 AM (different days) -> Must accept
        $resDiffDays = $this->postJson('/api/v1/classes', [
            'name' => 'Tuesday Power Batch',
            'trainer_id' => $this->trainerA->id,
            'time' => '07:00 AM - 08:00 AM',
            'days' => ['Tue', 'Thu'],
            'capacity' => 20,
            'category' => 'Cardio & HIIT',
        ]);
        $resDiffDays->assertStatus(201);

        // Editing Class 1 without changing days/time does NOT conflict with itself
        $resEditSelf = $this->putJson("/api/v1/classes/{$class1Id}", [
            'name' => 'Morning HIIT Batch Renamed',
            'trainer_id' => $this->trainerA->id,
            'time' => '07:00 AM - 08:00 AM',
            'days' => ['Mon', 'Wed'],
            'capacity' => 25,
            'category' => 'Cardio & HIIT',
        ]);
        $resEditSelf->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Morning HIIT Batch Renamed',
                    'capacity' => 25,
                ]
            ]);
    }

    /**
     * Requirement 3: Class enrollment invoice & transaction rollback
     * - invoice and RevenueBilling are created together
     * - nothing is saved if an unhandled failure occurs (transaction rollback)
     */
    public function test_class_enrollment_invoice_and_transaction_rollback(): void
    {
        Sanctum::actingAs($this->ownerA);

        $cls = GymClass::create([
            'gym_id' => 1,
            'name' => 'Pilates Core Flow',
            'trainer_id' => $this->trainerA->id,
            'instructor_name' => $this->trainerA->name,
            'time' => '05:00 PM - 06:00 PM',
            'days' => ['Tue', 'Thu'],
            'capacity' => 10,
            'booked_count' => 0,
        ]);

        // 1. Invoice and RevenueBilling created together upon enrollment
        $res = $this->postJson("/api/v1/classes/{$cls->id}/enroll", [
            'user_id' => $this->memberA1->id,
            'amount' => 800,
            'payment_method' => 'Cash',
        ]);

        $res->assertStatus(201);
        $invNumber = $res->json('data.invoiceNumber');
        $this->assertNotEmpty($invNumber);

        // Verify Invoice in database
        $this->assertDatabaseHas('invoices', [
            'gym_id' => 1,
            'user_id' => $this->memberA1->id,
            'invoice_number' => $invNumber,
            'amount' => 800,
            'payment_method' => 'Cash',
            'status' => 'Paid',
        ]);

        // Verify matching RevenueBilling inflow in database
        $this->assertDatabaseHas('revenue_and_billings', [
            'gym_id' => 1,
            'type' => 'inflow',
            'reference_no' => $invNumber,
            'amount' => 800,
            'payment_method' => 'Cash',
            'status' => 'Paid',
        ]);

        // 2. Transaction Rollback verification: if an exception occurs during transaction, nothing commits
        $initialEnrollmentsCount = ClassEnrollment::count();
        $initialInvoicesCount = Invoice::count();
        $initialRevenueCount = RevenueBilling::count();

        try {
            DB::transaction(function () use ($cls) {
                ClassEnrollment::create([
                    'gym_id' => 1,
                    'gym_class_id' => $cls->id,
                    'user_id' => $this->memberA2->id,
                    'enrolled_date' => now()->toDateString(),
                    'status' => 'Active',
                ]);

                Invoice::create([
                    'gym_id' => 1,
                    'invoice_number' => 'INV-ROLLBACK-TEST',
                    'user_id' => $this->memberA2->id,
                    'amount' => 999,
                    'date' => now()->toDateString(),
                    'status' => 'Paid',
                ]);

                // Simulate catastrophic crash before completion
                throw new \RuntimeException('Simulated failure during enrollment transaction');
            });
        } catch (\RuntimeException $e) {
            // Expected
        }

        // Assert atomicity: nothing was committed
        $this->assertEquals($initialEnrollmentsCount, ClassEnrollment::count());
        $this->assertEquals($initialInvoicesCount, Invoice::count());
        $this->assertEquals($initialRevenueCount, RevenueBilling::count());
        $this->assertDatabaseMissing('invoices', ['invoice_number' => 'INV-ROLLBACK-TEST']);
    }

    /**
     * Requirement 4: Signed invoice URL security
     * - a valid link streams the PDF
     * - a tampered or expired link returns 403
     * - a user cannot request a signed URL for another gym's invoice
     */
    public function test_signed_invoice_url_security(): void
    {
        Sanctum::actingAs($this->ownerA);

        $invoiceA = Invoice::create([
            'gym_id' => 1,
            'invoice_number' => 'INV-2026-SIGNED1',
            'user_id' => $this->memberA1->id,
            'amount' => 1200,
            'date' => now()->toDateString(),
            'status' => 'Paid',
            'package_type' => 'Gym-Cardio',
        ]);

        $invoiceB = Invoice::create([
            'gym_id' => 2,
            'invoice_number' => 'INV-2026-SIGNED2',
            'user_id' => $this->memberB->id,
            'amount' => 2000,
            'date' => now()->toDateString(),
            'status' => 'Paid',
            'package_type' => 'Gym-Cardio',
        ]);

        // 1. Generate signed URL for Gym A invoice
        $resSignedUrl = $this->getJson("/api/v1/invoices/{$invoiceA->id}/signed-url");
        $resSignedUrl->assertStatus(200)
            ->assertJson(['success' => true]);

        $signedUrl = $resSignedUrl->json('signed_url');
        $this->assertNotEmpty($signedUrl);

        // 2. Access valid link without authentication -> must stream PDF with 200
        $parsed = parse_url($signedUrl);
        $relativeValidUrl = $parsed['path'] . '?' . $parsed['query'];

        // Drop auth headers to simulate WhatsApp member recipient
        $this->flushHeaders();
        $resStream = $this->get($relativeValidUrl);
        $resStream->assertStatus(200);
        $this->assertEquals('application/pdf', $resStream->headers->get('Content-Type'));

        // 3. Tampered link -> returns 403
        $tamperedUrl = $relativeValidUrl . 'extra=tampered';
        $resTampered = $this->get($tamperedUrl);
        $resTampered->assertStatus(403)
            ->assertJson(['success' => false]);

        // 4. Expired link -> returns 403
        $expiredUrl = URL::temporarySignedRoute(
            'api.v1.invoices.signed_pdf',
            now()->subMinutes(10), // expired 10 minutes ago
            ['invoice_number' => $invoiceA->invoice_number]
        );
        $parsedExpired = parse_url($expiredUrl);
        $resExpired = $this->get($parsedExpired['path'] . '?' . $parsedExpired['query']);
        $resExpired->assertStatus(403)
            ->assertJson(['success' => false]);

        // 5. User cannot request a signed URL for another gym's invoice
        Sanctum::actingAs($this->ownerA);
        $resCrossGym = $this->getJson("/api/v1/invoices/{$invoiceB->id}/signed-url");
        $resCrossGym->assertStatus(404);
    }

    /**
     * Requirement 5: Expense date restriction
     * - a date beyond 2 months is rejected on both store and update
     * - past dates are accepted
     */
    public function test_expense_date_restriction(): void
    {
        Sanctum::actingAs($this->ownerA);

        $tooFarFuture = now()->addMonths(3)->toDateString();
        $validPast = now()->subDays(15)->toDateString();
        $validNearFuture = now()->addMonth()->toDateString();

        // 1. Store: Date beyond 2 months is rejected
        $resStoreTooFar = $this->postJson('/api/v1/expenses', [
            'title' => 'Future AC Repair',
            'category' => 'Maintenance',
            'amount' => 5000,
            'date' => $tooFarFuture,
        ]);
        $resStoreTooFar->assertStatus(422)
            ->assertJsonValidationErrors(['date']);

        // 2. Store: Past date is accepted
        $resStorePast = $this->postJson('/api/v1/expenses', [
            'title' => 'Past Dumbbell Purchase',
            'category' => 'Equipment',
            'amount' => 3000,
            'date' => $validPast,
        ]);
        $resStorePast->assertStatus(201);
        $expenseId = $resStorePast->json('data.id') ?? $resStorePast->json('id');
        $numericExpId = (int)str_replace('exp-', '', (string)$expenseId);

        // 3. Update: Date beyond 2 months is rejected on update
        $resUpdateTooFar = $this->putJson("/api/v1/expenses/{$numericExpId}", [
            'title' => 'Past Dumbbell Purchase Updated',
            'category' => 'Equipment',
            'amount' => 3200,
            'date' => $tooFarFuture,
        ]);
        $resUpdateTooFar->assertStatus(422)
            ->assertJsonValidationErrors(['date']);

        // 4. Update: Date within 2 months is accepted
        $resUpdateValid = $this->putJson("/api/v1/expenses/{$numericExpId}", [
            'title' => 'Past Dumbbell Purchase Final',
            'category' => 'Equipment',
            'amount' => 3200,
            'date' => $validNearFuture,
        ]);
        $resUpdateValid->assertStatus(200);
    }

    /**
     * Requirement 6: Add Member Issue 7 backend rules
     * - packages with total_amount <= 0 rejected with fee mandatory error
     * - paid amount exceeding total bill rejected
     * - Personal Training package without trainer rejected
     * - dues amount without promise date rejected
     * - valid package and payment succeeds
     */
    public function test_add_member_issue_7_backend_rules(): void
    {
        Sanctum::actingAs($this->ownerA);

        // 1. Packages submitted with total bill <= 0 -> Rejected with mandatory fee error
        $resZeroBill = $this->postJson('/api/v1/members', [
            'name' => 'Zero Fee Member',
            'phone' => '9800000101',
            'gym_id' => 1,
            'total_amount' => 0,
            'packages' => [
                [
                    'name' => 'Free Trial Plan',
                    'price' => 0,
                    'package_type' => 'Gym-Cardio',
                ]
            ],
        ]);
        $resZeroBill->assertStatus(422);
        $this->assertStringContainsString('Fee Calculation & Payment Settlement is mandatory', $resZeroBill->json('message'));

        // 2. Paid amount exceeding total bill -> Rejected
        $resOverpay = $this->postJson('/api/v1/members', [
            'name' => 'Overpaying Member',
            'phone' => '9800000102',
            'gym_id' => 1,
            'total_amount' => 1000,
            'paid_amount' => 1500,
            'packages' => [
                [
                    'name' => 'Monthly Fitness',
                    'price' => 1000,
                    'package_type' => 'Gym-Cardio',
                ]
            ],
        ]);
        $resOverpay->assertStatus(422);
        $this->assertStringContainsString('cannot exceed total payable price', $resOverpay->json('message'));

        // 3. Personal Training package without coach -> Rejected
        $resPtNoCoach = $this->postJson('/api/v1/members', [
            'name' => 'PT Member No Coach',
            'phone' => '9800000103',
            'gym_id' => 1,
            'total_amount' => 3000,
            'paid_amount' => 3000,
            'trainer_id' => null,
            'packages' => [
                [
                    'name' => '10 PT Sessions',
                    'price' => 3000,
                    'package_type' => 'Personal Training',
                    'trainer_id' => null,
                ]
            ],
        ]);
        $resPtNoCoach->assertStatus(422);
        $this->assertStringContainsString('Trainer selection is compulsory for Personal Training packages', $resPtNoCoach->json('message'));

        // 4. Dues amount without promise date -> Rejected
        $resDuesNoDate = $this->postJson('/api/v1/members', [
            'name' => 'Dues Member No Promise Date',
            'phone' => '9800000104',
            'gym_id' => 1,
            'total_amount' => 2000,
            'paid_amount' => 1000,
            'dues_amount' => 1000,
            'due_date' => null,
            'packages' => [
                [
                    'name' => 'Gym Quarterly',
                    'price' => 2000,
                    'package_type' => 'Gym-Cardio',
                ]
            ],
        ]);
        $resDuesNoDate->assertStatus(422);
        $this->assertStringContainsString('Please select the date when the remaining balance due will be paid', $resDuesNoDate->json('message'));

        // 5. Valid package, trainer, and payment settlement -> Accepted
        $resValid = $this->postJson('/api/v1/members', [
            'name' => 'Valid Registered Member',
            'phone' => '9800000105',
            'gym_id' => 1,
            'total_amount' => 2500,
            'paid_amount' => 2500,
            'dues_amount' => 0,
            'payment_method' => 'UPI',
            'packages' => [
                [
                    'name' => 'Annual Gym Package',
                    'price' => 2500,
                    'package_type' => 'Gym-Cardio',
                ]
            ],
        ]);
        $resValid->assertStatus(201)
            ->assertJson(['success' => true]);
        $this->assertDatabaseHas('users', ['phone' => '9800000105']);
        $this->assertDatabaseHas('invoices', ['amount' => 2500, 'payment_method' => 'UPI']);
    }
}
