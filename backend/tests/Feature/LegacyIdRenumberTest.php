<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Gym;
use App\Models\User;
use App\Models\Enquiry;
use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\RevenueBilling;
use App\Models\IdMigrationLog;
use App\Services\LegacyIdRenumberService;
use App\Services\SequentialIdService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LegacyIdRenumberTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym1;
    protected Gym $gym2;
    protected User $memberGym1;
    protected User $memberGym2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym1 = Gym::create([
            'name' => 'Metro Fitness Center',
            'address' => '101 MG Road, Bengaluru',
            'phone' => '9876543210',
            'email' => 'admin@metrofit.test',
            'package_tier' => 'platinum',
        ]);

        $this->gym2 = Gym::create([
            'name' => 'Titan Gym',
            'address' => '202 FC Road, Pune',
            'phone' => '9876543211',
            'email' => 'admin@titangym.test',
            'package_tier' => 'platinum',
        ]);

        $this->memberGym1 = User::create([
            'gym_id' => $this->gym1->id,
            'name' => 'Member G1',
            'email' => 'mem1@test.com',
            'password' => Hash::make('secret'),
            'role' => 'member',
            'member_number' => 'INIT-MEM-1',
        ]);

        $this->memberGym2 = User::create([
            'gym_id' => $this->gym2->id,
            'name' => 'Member G2',
            'email' => 'mem2@test.com',
            'password' => Hash::make('secret'),
            'role' => 'member',
            'member_number' => 'INIT-MEM-2',
        ]);
    }

    private function authenticateGymAdmin(Gym $gym)
    {
        $user = User::create([
            'name' => 'Owner ' . $gym->name,
            'email' => 'owner_' . $gym->id . '@gym.test',
            'password' => Hash::make('password123'),
            'role' => 'owner',
            'gym_id' => $gym->id,
        ]);
        return $this->actingAs($user, 'sanctum');
    }

    private function createInvoice(array $attributes): Invoice
    {
        $gymId = $attributes['gym_id'] ?? $this->gym1->id;
        $defaultUserId = ($gymId == $this->gym2->id) ? $this->memberGym2->id : $this->memberGym1->id;

        return Invoice::create(array_merge([
            'gym_id' => $gymId,
            'user_id' => $defaultUserId,
            'member_id' => (string)$defaultUserId,
            'amount' => 1000,
            'total_amount' => 1000,
            'paid_amount' => 1000,
            'status' => 'Paid',
            'plan_name' => 'Standard Fitness',
            'package_type' => 'Gym',
        ], $attributes));
    }

    /**
     * TEST 1: Dry run by default makes NO database modifications.
     */
    public function test_dry_run_does_not_modify_database()
    {
        $inv = $this->createInvoice([
            'gym_id' => $this->gym1->id,
            'invoice_number' => 'INV-RANDOM-001',
            'date' => Carbon::create(2026, 6, 15, 12, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 6, 15, 12, 0, 0, 'Asia/Kolkata'),
        ]);

        $member = User::create([
            'gym_id' => $this->gym1->id,
            'name' => 'John Legacy',
            'email' => 'john.legacy@test.com',
            'password' => Hash::make('secret'),
            'role' => 'member',
            'member_number' => null,
            'created_at' => Carbon::create(2026, 6, 15, 12, 0, 0, 'Asia/Kolkata'),
        ]);

        $exitCode = Artisan::call('gym:renumber-legacy-ids', ['--gym' => $this->gym1->id]);
        $this->assertEquals(0, $exitCode);

        // Database remains unmutated
        $this->assertEquals('INV-RANDOM-001', $inv->fresh()->invoice_number);
        $this->assertNull($inv->fresh()->legacy_id);
        $this->assertNull($member->fresh()->member_number);
        $this->assertEquals(0, IdMigrationLog::count());
    }

    /**
     * TEST 2: Renumbering assigns 0001, 0002... chronologically by FY,
     * updates references, sets counter store, and preserves existing new-format records.
     */
    public function test_chronological_renumbering_and_collision_avoidance()
    {
        // 1. Legacy Invoice 1 created on June 10
        $inv1 = $this->createInvoice([
            'gym_id' => $this->gym1->id,
            'invoice_number' => 'INV-OLD-111',
            'amount' => 1200,
            'total_amount' => 1200,
            'paid_amount' => 1200,
            'date' => Carbon::create(2026, 6, 10, 10, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 6, 10, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        // Revenue billing reference to Invoice 1
        $rev1 = RevenueBilling::create([
            'gym_id' => $this->gym1->id,
            'title' => 'Membership Inflow',
            'category' => 'Membership',
            'type' => 'inflow',
            'amount' => 1200,
            'reference_no' => 'INV-OLD-111',
            'date' => Carbon::create(2026, 6, 10, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        // 2. Already Sequential Invoice 2 created on July 1 (INV260001)
        $inv2 = $this->createInvoice([
            'gym_id' => $this->gym1->id,
            'invoice_number' => 'INV260001',
            'amount' => 2000,
            'total_amount' => 2000,
            'paid_amount' => 2000,
            'date' => Carbon::create(2026, 7, 1, 10, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 7, 1, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        // 3. Legacy Member 1 created on June 12
        $member1 = User::create([
            'gym_id' => $this->gym1->id,
            'name' => 'Legacy Member One',
            'email' => 'legacymem1@test.com',
            'password' => Hash::make('secret'),
            'role' => 'member',
            'member_number' => 'OLD-MEM-99',
            'joining_date' => Carbon::create(2026, 6, 12, 11, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 6, 12, 11, 0, 0, 'Asia/Kolkata'),
        ]);
        MemberProfile::create([
            'user_id' => $member1->id,
            'member_number' => 'OLD-MEM-99',
            'membership_status' => 'active',
        ]);

        // 4. Legacy Enquiry converted to member
        $enq = Enquiry::create([
            'gym_id' => $this->gym1->id,
            'name' => 'Enquiry Lead',
            'phone' => '9811122233',
            'enquiry_number' => 'OLD-ENQ-55',
            'created_at' => Carbon::create(2026, 6, 5, 9, 0, 0, 'Asia/Kolkata'),
        ]);
        $convertedMem = User::create([
            'gym_id' => $this->gym1->id,
            'name' => 'Converted Lead Member',
            'email' => 'converted@test.com',
            'password' => Hash::make('secret'),
            'role' => 'member',
            'member_number' => 'MEM260001', // Already sequential
            'created_at' => Carbon::create(2026, 7, 2, 9, 0, 0, 'Asia/Kolkata'),
        ]);
        $convertedProfile = MemberProfile::create([
            'user_id' => $convertedMem->id,
            'member_number' => 'MEM260001',
            'converted_from_enquiry_number' => 'OLD-ENQ-55',
            'membership_status' => 'active',
        ]);

        // Initial counter was 1 (from already sequential records)
        DB::table('entity_sequences')->insert([
            ['gym_id' => $this->gym1->id, 'entity_type' => 'invoice', 'fy_code' => '26', 'last_number' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['gym_id' => $this->gym1->id, 'entity_type' => 'member', 'fy_code' => '26', 'last_number' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Execute Apply
        $exitCode = Artisan::call('gym:renumber-legacy-ids', ['--apply' => true, '--gym' => $this->gym1->id]);
        $this->assertEquals(0, $exitCode);

        // Verification assertions:
        // 1. Inv 2 (INV260001) was preserved and NOT renumbered
        $this->assertEquals('INV260001', $inv2->fresh()->invoice_number);

        // 2. Inv 1 avoided collision with INV260001 and received INV260002
        $freshInv1 = $inv1->fresh();
        $this->assertEquals('INV260002', $freshInv1->invoice_number);
        $this->assertEquals('INV-OLD-111', $freshInv1->legacy_id);

        // 3. Revenue billing reference updated in sync
        $this->assertEquals('INV260002', $rev1->fresh()->reference_no);

        // 4. Member 1 received MEM260003 (avoiding collision with MEM260001 and following memberGym1)
        $this->assertEquals('MEM260003', $member1->fresh()->member_number);
        $this->assertEquals('OLD-MEM-99', $member1->fresh()->legacy_id);
        $this->assertEquals('MEM260003', MemberProfile::where('user_id', $member1->id)->first()->member_number);

        // 5. Enquiry renumbered to ENQ260001
        $freshEnq = $enq->fresh();
        $this->assertEquals('ENQ260001', $freshEnq->enquiry_number);
        $this->assertEquals('OLD-ENQ-55', $freshEnq->legacy_id);

        // 6. Converted profile reference updated in sync
        $this->assertEquals('ENQ260001', $convertedProfile->fresh()->converted_from_enquiry_number);

        // 7. Counter store updated to 2 (never lowered)
        $invSeq = DB::table('entity_sequences')->where('gym_id', $this->gym1->id)->where('entity_type', 'invoice')->where('fy_code', '26')->first();
        $this->assertGreaterThanOrEqual(2, $invSeq->last_number);

        $memSeq = DB::table('entity_sequences')->where('gym_id', $this->gym1->id)->where('entity_type', 'member')->where('fy_code', '26')->first();
        $this->assertGreaterThanOrEqual(2, $memSeq->last_number);

        $enqSeq = DB::table('entity_sequences')->where('gym_id', $this->gym1->id)->where('entity_type', 'enquiry')->where('fy_code', '26')->first();
        $this->assertEquals(1, $enqSeq->last_number);
    }

    /**
     * TEST 3: Gym isolation: Gym 1 and Gym 2 get separate numbering.
     */
    public function test_per_gym_isolation()
    {
        $invGym1 = $this->createInvoice([
            'gym_id' => $this->gym1->id,
            'invoice_number' => 'OLD-G1',
            'amount' => 500,
            'total_amount' => 500,
            'paid_amount' => 500,
            'date' => Carbon::create(2026, 5, 1, 10, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 5, 1, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        $invGym2 = $this->createInvoice([
            'gym_id' => $this->gym2->id,
            'invoice_number' => 'OLD-G2',
            'amount' => 700,
            'total_amount' => 700,
            'paid_amount' => 700,
            'date' => Carbon::create(2026, 5, 1, 10, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 5, 1, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        Artisan::call('gym:renumber-legacy-ids', ['--apply' => true]);

        // Both gyms start from INV260001 independently
        $this->assertEquals('INV260001', $invGym1->fresh()->invoice_number);
        $this->assertEquals('INV260001', $invGym2->fresh()->invoice_number);
    }

    /**
     * TEST 4: Search and detail endpoints find records by both new ID and legacy_id.
     */
    public function test_search_and_lookup_by_legacy_id()
    {
        $this->authenticateGymAdmin($this->gym1);

        $inv = $this->createInvoice([
            'gym_id' => $this->gym1->id,
            'invoice_number' => 'INV-ORIG-987',
            'amount' => 1500,
            'total_amount' => 1500,
            'paid_amount' => 1500,
            'date' => Carbon::create(2026, 5, 10, 10, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 5, 10, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        $mem = User::create([
            'gym_id' => $this->gym1->id,
            'name' => 'Member Searchable',
            'email' => 'searchable@test.com',
            'password' => Hash::make('secret'),
            'role' => 'member',
            'member_number' => 'OLD-MEM-SEARCH',
            'created_at' => Carbon::create(2026, 5, 10, 10, 0, 0, 'Asia/Kolkata'),
        ]);
        MemberProfile::create([
            'user_id' => $mem->id,
            'member_number' => 'OLD-MEM-SEARCH',
            'membership_status' => 'active',
        ]);

        Artisan::call('gym:renumber-legacy-ids', ['--apply' => true, '--gym' => $this->gym1->id]);

        $newInvId = $inv->fresh()->invoice_number;
        $this->assertEquals('INV260001', $newInvId);
        $this->assertEquals('INV-ORIG-987', $inv->fresh()->legacy_id);

        $newMemId = $mem->fresh()->member_number;
        $this->assertEquals('MEM260002', $newMemId);
        $this->assertEquals('OLD-MEM-SEARCH', $mem->fresh()->legacy_id);

        // 1. Invoices API search by old legacy ID
        $resSearch = $this->getJson("/api/v1/invoices?search=INV-ORIG-987");
        $resSearch->assertStatus(200);
        $this->assertEquals($newInvId, $resSearch->json('data.0.invoice_number'));

        // 2. Invoices Public HTML View by old legacy ID
        $resPublicView = $this->get("/api/v1/public/invoices/INV-ORIG-987/view");
        $resPublicView->assertStatus(200);
        $resPublicView->assertSee($newInvId);

        // 3. Member Show by new ID
        $resMemberNew = $this->getJson("/api/v1/members/{$newMemId}");
        $resMemberNew->assertStatus(200);
        $this->assertEquals($newMemId, $resMemberNew->json('data.memberNumber'));

        // 4. Member Show by old legacy ID
        $resMemberOld = $this->getJson("/api/v1/members/OLD-MEM-SEARCH");
        $resMemberOld->assertStatus(200);
        $this->assertEquals($newMemId, $resMemberOld->json('data.memberNumber'));
        $this->assertEquals('OLD-MEM-SEARCH', $resMemberOld->json('data.legacyId'));
    }

    /**
     * TEST 5: Idempotency - running --apply twice does not change IDs or duplicate logs.
     */
    public function test_idempotency_of_migration()
    {
        $this->createInvoice([
            'gym_id' => $this->gym1->id,
            'invoice_number' => 'INV-IDEM-01',
            'date' => Carbon::create(2026, 8, 1, 10, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 8, 1, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        // First apply
        Artisan::call('gym:renumber-legacy-ids', ['--apply' => true, '--gym' => $this->gym1->id]);
        $firstInv = Invoice::first();
        $firstLogCount = IdMigrationLog::count();
        $this->assertEquals('INV260001', $firstInv->invoice_number);
        $this->assertGreaterThanOrEqual(1, $firstLogCount);

        // Second apply
        Artisan::call('gym:renumber-legacy-ids', ['--apply' => true, '--gym' => $this->gym1->id]);
        $secondInv = Invoice::first();
        $secondLogCount = IdMigrationLog::count();

        // Exactly the same
        $this->assertEquals('INV260001', $secondInv->invoice_number);
        $this->assertEquals($firstLogCount, $secondLogCount);
    }

    /**
     * TEST 6: Rollback mode restores old IDs, references, and clears migration logs.
     */
    public function test_rollback_restores_original_ids_and_references()
    {
        $inv = $this->createInvoice([
            'gym_id' => $this->gym1->id,
            'invoice_number' => 'INV-RESTORE-TEST',
            'amount' => 1100,
            'total_amount' => 1100,
            'paid_amount' => 1100,
            'date' => Carbon::create(2026, 9, 1, 10, 0, 0, 'Asia/Kolkata'),
            'created_at' => Carbon::create(2026, 9, 1, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        $rev = RevenueBilling::create([
            'gym_id' => $this->gym1->id,
            'title' => 'Inflow',
            'category' => 'Membership',
            'type' => 'inflow',
            'amount' => 1100,
            'reference_no' => 'INV-RESTORE-TEST',
            'date' => Carbon::create(2026, 9, 1, 10, 0, 0, 'Asia/Kolkata'),
        ]);

        // Apply migration
        Artisan::call('gym:renumber-legacy-ids', ['--apply' => true, '--gym' => $this->gym1->id]);
        $this->assertEquals('INV260001', $inv->fresh()->invoice_number);
        $this->assertEquals('INV260001', $rev->fresh()->reference_no);
        $this->assertGreaterThanOrEqual(1, IdMigrationLog::count());

        // Dry-run rollback does not restore yet
        Artisan::call('gym:renumber-legacy-ids', ['--rollback' => true, '--gym' => $this->gym1->id]);
        $this->assertEquals('INV260001', $inv->fresh()->invoice_number);

        // Apply rollback
        $exitRollback = Artisan::call('gym:renumber-legacy-ids', [
            '--rollback' => true,
            '--apply' => true,
            '--gym' => $this->gym1->id,
        ]);
        $this->assertEquals(0, $exitRollback);

        // Original IDs and references successfully restored
        $this->assertEquals('INV-RESTORE-TEST', $inv->fresh()->invoice_number);
        $this->assertNull($inv->fresh()->legacy_id);
        $this->assertEquals('INV-RESTORE-TEST', $rev->fresh()->reference_no);
        $this->assertEquals(0, IdMigrationLog::count());
    }
}
