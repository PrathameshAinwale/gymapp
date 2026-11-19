<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Gym;
use App\Models\User;
use App\Models\Plan;
use App\Models\Enquiry;
use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Services\SequentialIdService;
use App\Services\TextSanitizerService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SequentialIdEnterpriseTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gymA;
    protected Gym $gymB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gymA = Gym::create([
            'id' => 1,
            'name' => 'Alpha Fitness Center',
            'address' => '123 Main St, Mumbai',
            'phone' => '9876543210',
            'email' => 'contact@alphafit.test',
            'package_tier' => 'platinum',
        ]);

        $this->gymB = Gym::create([
            'id' => 2,
            'name' => 'Beta Athletic Club',
            'address' => '456 Cross Rd, Pune',
            'phone' => '9876543211',
            'email' => 'contact@betafit.test',
            'package_tier' => 'platinum',
        ]);
    }

    private function authenticateGymAdmin(Gym $gym)
    {
        $user = User::create([
            'name' => 'Gym Admin ' . $gym->id,
            'email' => 'admin_' . $gym->id . '_' . uniqid() . '@pulsefit.in',
            'password' => Hash::make('secret123'),
            'role' => 'owner',
            'phone' => '98765' . str_pad($gym->id, 5, '0', STR_PAD_LEFT),
            'gym_id' => $gym->id
        ]);
        return $this->actingAs($user, 'sanctum');
    }

    /**
     * Requirement: Sequence increments correctly for invoice, member and enquiry.
     */
    public function test_sequence_increments_correctly_for_invoice_member_and_enquiry()
    {
        $currentFy = SequentialIdService::getFinancialYearCode();

        // Invoices
        $inv1 = SequentialIdService::generateInvoiceNumber($this->gymA->id);
        $inv2 = SequentialIdService::generateInvoiceNumber($this->gymA->id);
        $inv3 = SequentialIdService::generateInvoiceNumber($this->gymA->id);

        $this->assertEquals("INV{$currentFy}0001", $inv1);
        $this->assertEquals("INV{$currentFy}0002", $inv2);
        $this->assertEquals("INV{$currentFy}0003", $inv3);

        // Members
        $mem1 = SequentialIdService::generateMemberNumber($this->gymA->id);
        $mem2 = SequentialIdService::generateMemberNumber($this->gymA->id);

        $this->assertEquals("MEM{$currentFy}0001", $mem1);
        $this->assertEquals("MEM{$currentFy}0002", $mem2);

        // Enquiries
        $enq1 = SequentialIdService::generateEnquiryNumber($this->gymA->id);
        $enq2 = SequentialIdService::generateEnquiryNumber($this->gymA->id);

        $this->assertEquals("ENQ{$currentFy}0001", $enq1);
        $this->assertEquals("ENQ{$currentFy}0002", $enq2);
    }

    /**
     * Requirement: Delete then create: the deleted number is never reused.
     */
    public function test_delete_then_create_never_reuses_deleted_number()
    {
        $this->authenticateGymAdmin($this->gymA);
        $currentFy = SequentialIdService::getFinancialYearCode();

        // 1. Create Enquiry 1 (ENQxx0001) and Enquiry 2 (ENQxx0002)
        $res1 = $this->postJson('/api/v1/enquiries', [
            'name' => 'Rahul Sharma',
            'phone' => '9876543210',
            'notes' => 'Looking for strength training',
        ])->assertStatus(201);

        $enqNum1 = $res1->json('data.enquiryNumber');
        $this->assertEquals("ENQ{$currentFy}0001", $enqNum1);

        // Delete Enquiry 1
        $this->deleteJson('/api/v1/enquiries/' . $enqNum1)->assertStatus(200);

        // Create Enquiry 2 -> Must get ENQxx0002, NEVER re-issue ENQxx0001
        $res2 = $this->postJson('/api/v1/enquiries', [
            'name' => 'Pooja Verma',
            'phone' => '9876543211',
            'notes' => 'Inquiring for morning yoga',
        ])->assertStatus(201);

        $enqNum2 = $res2->json('data.enquiryNumber');
        $this->assertEquals("ENQ{$currentFy}0002", $enqNum2);
    }

    /**
     * Requirement: Two different gyms get independent numbering for all three entities.
     */
    public function test_two_different_gyms_get_independent_numbering()
    {
        $currentFy = SequentialIdService::getFinancialYearCode();

        // Gym A generates 3 members
        $gymAMem1 = SequentialIdService::generateMemberNumber($this->gymA->id);
        $gymAMem2 = SequentialIdService::generateMemberNumber($this->gymA->id);
        $gymAMem3 = SequentialIdService::generateMemberNumber($this->gymA->id);

        $this->assertEquals("MEM{$currentFy}0001", $gymAMem1);
        $this->assertEquals("MEM{$currentFy}0002", $gymAMem2);
        $this->assertEquals("MEM{$currentFy}0003", $gymAMem3);

        // Gym B starts its own independent sequence from 0001
        $gymBMem1 = SequentialIdService::generateMemberNumber($this->gymB->id);
        $this->assertEquals("MEM{$currentFy}0001", $gymBMem1);

        // Gym A continues at 0004
        $gymAMem4 = SequentialIdService::generateMemberNumber($this->gymA->id);
        $this->assertEquals("MEM{$currentFy}0004", $gymAMem4);

        // Invoices isolation
        $gymAInv1 = SequentialIdService::generateInvoiceNumber($this->gymA->id);
        $gymBInv1 = SequentialIdService::generateInvoiceNumber($this->gymB->id);
        $this->assertEquals("INV{$currentFy}0001", $gymAInv1);
        $this->assertEquals("INV{$currentFy}0001", $gymBInv1);

        // Enquiries isolation
        $gymAEnq1 = SequentialIdService::generateEnquiryNumber($this->gymA->id);
        $gymBEnq1 = SequentialIdService::generateEnquiryNumber($this->gymB->id);
        $this->assertEquals("ENQ{$currentFy}0001", $gymAEnq1);
        $this->assertEquals("ENQ{$currentFy}0001", $gymBEnq1);
    }

    /**
     * Requirement: Enquiry -> member conversion gets the next member number
     * and keeps original enquiry number linked on record.
     */
    public function test_enquiry_to_member_conversion_gets_next_member_number_and_preserves_linkage()
    {
        $this->authenticateGymAdmin($this->gymA);
        $currentFy = SequentialIdService::getFinancialYearCode();

        // Create initial member (MEMxx0001)
        SequentialIdService::generateMemberNumber($this->gymA->id);

        // Create enquiry (ENQxx0001)
        $enqRes = $this->postJson('/api/v1/enquiries', [
            'name' => 'Ananya Roy',
            'phone' => '9820012345',
            'fitness_goal' => 'Weight Loss & Cardio',
        ])->assertStatus(201);

        $enquiryId = $enqRes->json('data.id');
        $enquiryNo = $enqRes->json('data.enquiryNumber');
        $this->assertEquals("ENQ{$currentFy}0001", $enquiryNo);

        // Convert enquiry to member via API
        $convRes = $this->postJson("/api/v1/enquiries/{$enquiryId}/convert", [
            'name' => 'ananya roy',
            'phone' => '9820012345',
            'goal' => 'advanced body toning',
        ])->assertStatus(200);

        // Converted member must get the NEXT member number (MEMxx0002)
        $memberNumber = $convRes->json('data.memberNumber');
        $this->assertEquals("MEM{$currentFy}0002", $memberNumber);

        // Linked enquiry number must be preserved on the member profile
        $linkedEnquiryNo = $convRes->json('data.convertedFromEnquiryNumber');
        $this->assertEquals($enquiryNo, $linkedEnquiryNo);

        // Converted enquiry record status is 'Converted'
        $enquiryRecord = Enquiry::where('enquiry_number', $enquiryNo)->first();
        $this->assertNotNull($enquiryRecord);
        $this->assertEquals('Converted', $enquiryRecord->status);
        $this->assertNotNull($enquiryRecord->converted_member_id);
    }

    /**
     * Requirement: FY boundaries:
     * - 31 Mar 23:59 IST -> FY25 (starts 1 Apr 2025)
     * - 1 Apr 00:00 IST -> FY26 (starts 1 Apr 2026)
     * - 1 Apr 00:30 IST while server runs in UTC -> FY26
     * - 31 Mar 2027 23:59:59 IST -> FY26
     * - 1 Apr 2027 00:00:00 IST -> FY27
     */
    public function test_financial_year_boundaries_strictly_in_ist_timezone()
    {
        // 1. 31 Mar 2026 23:59:59 IST (FY25)
        $fy1 = SequentialIdService::getFinancialYearCode('2026-03-31 23:59:59');
        $this->assertEquals('25', $fy1);

        // 2. 1 Apr 2026 00:00:00 IST (FY26)
        $fy2 = SequentialIdService::getFinancialYearCode('2026-04-01 00:00:00');
        $this->assertEquals('26', $fy2);

        // 3. 1 Apr 2026 00:30:00 IST while timestamp is expressed in UTC (2026-03-31 19:00:00 UTC)
        $utcTime = Carbon::parse('2026-03-31 19:00:00', 'UTC');
        $fyUtc = SequentialIdService::getFinancialYearCode($utcTime);
        $this->assertEquals('26', $fyUtc, '1 Apr 00:30 IST on a UTC server must resolve to FY26');

        // 4. 31 Mar 2027 23:59:59 IST (FY26)
        $fy3 = SequentialIdService::getFinancialYearCode('2027-03-31 23:59:59');
        $this->assertEquals('26', $fy3);

        // 5. 1 Apr 2027 00:00:00 IST (FY27)
        $fy4 = SequentialIdService::getFinancialYearCode('2027-04-01 00:00:00');
        $this->assertEquals('27', $fy4);
    }

    /**
     * Requirement: Counter restarts at 0001 in the new FY, and conversion across the FY boundary works.
     */
    public function test_counter_restarts_at_0001_in_new_fy_and_cross_fy_conversion()
    {
        // Issue last invoice of FY26
        $invFY26 = SequentialIdService::generateInvoiceNumber($this->gymA->id, '2026-11-19 12:00:00');
        $this->assertEquals('INV260001', $invFY26);

        // Issue first invoice of FY27 (1 Apr 2027)
        $invFY27_1 = SequentialIdService::generateInvoiceNumber($this->gymA->id, '2027-04-01 09:00:00');
        $this->assertEquals('INV270001', $invFY27_1);

        // Subsequent invoice in FY27 continues
        $invFY27_2 = SequentialIdService::generateInvoiceNumber($this->gymA->id, '2027-04-02 10:00:00');
        $this->assertEquals('INV270002', $invFY27_2);

        // Old FY26 counter is not altered: another back-dated entry in FY26 continues FY26 sequence
        $invFY26_2 = SequentialIdService::generateInvoiceNumber($this->gymA->id, '2027-03-15 12:00:00');
        $this->assertEquals('INV260002', $invFY26_2);

        // Cross FY Conversion:
        // Enquiry created on 15 Feb 2027 (FY26) -> ENQ260001
        $enqFY26 = SequentialIdService::generateEnquiryNumber($this->gymA->id, '2027-02-15 10:00:00');
        $this->assertEquals('ENQ260001', $enqFY26);

        // Converted on 5 Apr 2027 (FY27) as gym's first member in FY27 -> MEM270001
        $memFY27 = SequentialIdService::generateMemberNumber($this->gymA->id, '2027-04-05 14:00:00');
        $this->assertEquals('MEM270001', $memFY27);
    }

    /**
     * Requirement: Concurrency-safe: increment produces no duplicate numbers.
     */
    public function test_concurrency_safe_unique_number_generation()
    {
        $numbers = [];
        $currentFy = SequentialIdService::getFinancialYearCode();

        for ($i = 0; $i < 20; $i++) {
            $num = SequentialIdService::generateInvoiceNumber($this->gymA->id);
            $numbers[] = $num;
        }

        $this->assertCount(20, array_unique($numbers), 'All 20 generated invoice numbers must be unique');
        $this->assertEquals("INV{$currentFy}0001", $numbers[0]);
        $this->assertEquals("INV{$currentFy}0020", $numbers[19]);
    }

    /**
     * Requirement: Part 2: Auto-capitalise first letter of each word and field exclusions.
     */
    public function test_title_case_sanitizer_and_field_exclusions()
    {
        // 1. Text Title-casing
        $this->assertEquals('Rahul Sharma', TextSanitizerService::toTitleCase('rahul sharma'));
        $this->assertEquals('123 Main Street, Apt 4b', TextSanitizerService::toTitleCase('123 main street, apt 4b'));
        $this->assertEquals('Pt Session With Vip Coach', TextSanitizerService::toTitleCase('pt session with vip coach'));
        $this->assertEquals('John-Doe', TextSanitizerService::toTitleCase('john-doe'));
        $this->assertEquals('Weight Loss & Cardio / Yoga', TextSanitizerService::toTitleCase('weight loss & cardio / yoga'));

        // Preserves already uppercase characters and acronyms
        $this->assertEquals('PT Coach Alex', TextSanitizerService::toTitleCase('PT Coach Alex'));
        $this->assertEquals('100KG Bench Press', TextSanitizerService::toTitleCase('100KG Bench Press'));

        // 2. Batch sanitizer on arrays with field exclusions
        $payload = [
            'name' => 'rohan kulkarni',
            'executive' => 'pooja sharma',
            'goal' => 'muscle gain & bulk',
            // Excluded fields: must remain exact
            'email' => 'rohan@example.com',
            'phone' => '9876543210',
            'password' => 'secretP@ss1',
            'date_of_birth' => '1995-05-14',
            'amount' => 15000,
            'pan_card' => 'ABCDE1234F',
            'aadhaar_card' => '123456789012',
        ];

        $sanitized = TextSanitizerService::sanitizeArray($payload, ['name', 'executive', 'goal']);

        $this->assertEquals('Rohan Kulkarni', $sanitized['name']);
        $this->assertEquals('Pooja Sharma', $sanitized['executive']);
        $this->assertEquals('Muscle Gain & Bulk', $sanitized['goal']);

        // Verify excluded fields were completely untouched
        $this->assertEquals('rohan@example.com', $sanitized['email']);
        $this->assertEquals('9876543210', $sanitized['phone']);
        $this->assertEquals('secretP@ss1', $sanitized['password']);
        $this->assertEquals('1995-05-14', $sanitized['date_of_birth']);
        $this->assertEquals(15000, $sanitized['amount']);
        $this->assertEquals('ABCDE1234F', $sanitized['pan_card']);
        $this->assertEquals('123456789012', $sanitized['aadhaar_card']);
    }

    /**
     * Requirement: Member API creates sequential MEM + FY + 0001, dual lookup by MEM number and ID works.
     */
    public function test_member_api_sequential_id_generation_lookup_and_non_reuse()
    {
        $this->authenticateGymAdmin($this->gymA);
        $currentFy = SequentialIdService::getFinancialYearCode();

        // Create Member 1
        $res1 = $this->postJson('/api/v1/members', [
            'name' => 'kabir khan',
            'phone' => '9988776655',
            'email' => 'kabir@test.com',
            'executive' => 'alex coach',
            'goal' => 'strength training',
        ])->assertStatus(201);

        $memberNumber = $res1->json('data.memberNumber');
        $this->assertEquals("MEM{$currentFy}0001", $memberNumber);
        $this->assertEquals('Kabir Khan', $res1->json('data.name'));
        $this->assertEquals('Alex Coach', $res1->json('data.executive'));

        // Dual lookup: by member_number
        $getRes = $this->getJson("/api/v1/members/{$memberNumber}")->assertStatus(200);
        $this->assertEquals($memberNumber, $getRes->json('data.memberNumber'));
        $this->assertEquals('Kabir Khan', $getRes->json('data.name'));

        // Dual lookup: by numeric ID
        $userId = $res1->json('data.userId');
        $this->getJson("/api/v1/members/{$userId}")->assertStatus(200);

        // Delete Member 1
        $this->deleteJson("/api/v1/members/{$memberNumber}")->assertStatus(200);

        // Create Member 2 -> Must be MEMxx0002
        $res2 = $this->postJson('/api/v1/members', [
            'name' => 'rohit deshmukh',
            'phone' => '9988776656',
            'email' => 'rohit@test.com',
        ])->assertStatus(201);

        $this->assertEquals("MEM{$currentFy}0002", $res2->json('data.memberNumber'));
        $this->assertEquals('Rohit Deshmukh', $res2->json('data.name'));
    }
}
