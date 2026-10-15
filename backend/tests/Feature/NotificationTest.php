<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\NotificationRead;
use App\Models\Plan;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-13 10:00:00', 'Asia/Kolkata'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
    }

    public function test_all_13_notification_scenarios()
    {
        Carbon::setTestNow(Carbon::parse('2026-10-13 12:00:00', 'Asia/Kolkata'));

        // Setup Gym A and Gym B
        $gymA = Gym::create(['name' => 'Gym Alpha Test', 'phone' => '9999990001']);
        $gymB = Gym::create(['name' => 'Gym Beta Test', 'phone' => '9999990002']);

        $ownerA = User::create([
            'name' => 'Owner Alpha',
            'email' => 'owner_alpha@test.com',
            'password' => bcrypt('secret123'),
            'role' => 'owner',
            'gym_id' => $gymA->id,
        ]);

        $staffA = User::create([
            'name' => 'Staff Alpha',
            'email' => 'staff_alpha@test.com',
            'password' => bcrypt('secret123'),
            'role' => 'staff',
            'gym_id' => $gymA->id,
        ]);

        $ownerB = User::create([
            'name' => 'Owner Beta',
            'email' => 'owner_beta@test.com',
            'password' => bcrypt('secret123'),
            'role' => 'owner',
            'gym_id' => $gymB->id,
        ]);

        $plan1 = Plan::create([
            'gym_id' => $gymA->id,
            'name' => '1 Month Pass',
            'price' => 2000,
            'duration_months' => 1,
            'package_type' => 'Gym-Cardio',
        ]);

        $ptPlan = Plan::create([
            'gym_id' => $gymA->id,
            'name' => 'PT Monthly',
            'price' => 5000,
            'duration_months' => 1,
            'package_type' => 'Personal Training',
        ]);

        // Helper to create member in Gym A
        $createMember = function ($name, $email, $expiry = null, $gymId = null) use ($gymA, $plan1) {
            $gymId = $gymId ?: $gymA->id;
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => bcrypt('secret123'),
                'role' => 'member',
                'gym_id' => $gymId,
            ]);
            MemberProfile::create([
                'user_id' => $user->id,
                'plan_id' => $plan1->id,
                'status' => 'Active',
                'expiry_date' => $expiry ?: '2026-11-12',
            ]);
            return $user;
        };

        // SCENARIO 1: Member with due date 15 Oct and pending amount (due in 2 days <= 3 days)
        $m1 = $createMember('Member Due Soon', 'm1@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-01',
            'user_id' => $m1->id,
            'amount' => 2000,
            'pending_amount' => 1000,
            'status' => 'Pending',
            'date' => '2026-10-01',
            'due_date' => '2026-10-15',
        ]);

        // SCENARIO 2: Member with due date 10 Oct (overdue) -> higher urgency
        $m2 = $createMember('Member Overdue', 'm2@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-02',
            'user_id' => $m2->id,
            'amount' => 2000,
            'pending_amount' => 500,
            'status' => 'Pending',
            'date' => '2026-09-25',
            'due_date' => '2026-10-10',
        ]);

        // SCENARIO 3: Member with due date 10 days away (23 Oct) -> no notification
        $m3 = $createMember('Member Due Later', 'm3@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-03',
            'user_id' => $m3->id,
            'amount' => 2000,
            'pending_amount' => 500,
            'status' => 'Pending',
            'date' => '2026-10-01',
            'due_date' => '2026-10-23',
        ]);

        // SCENARIO 4: Member with paid invoice (pending 0) -> no notification
        $m4 = $createMember('Member Paid', 'm4@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-04',
            'user_id' => $m4->id,
            'amount' => 2000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'date' => '2026-10-01',
            'due_date' => '2026-10-14',
        ]);

        // SCENARIO 5: Cancelled invoice with pending amount -> no notification
        $m5 = $createMember('Member Cancelled Inv', 'm5@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-05',
            'user_id' => $m5->id,
            'amount' => 2000,
            'pending_amount' => 1500,
            'status' => 'Cancelled',
            'date' => '2026-10-01',
            'due_date' => '2026-10-14',
        ]);

        // SCENARIO 6: Plan ending 18 Oct (in 5 days) -> shows in Plan Expiring. Plan ending 19 Oct (in 6 days) -> does not show.
        $m6Expiring = $createMember('Member Expiring Soon', 'm6a@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-06A',
            'user_id' => $m6Expiring->id,
            'package_type' => 'Gym-Cardio',
            'start_date' => '2026-09-18',
            'end_date' => '2026-10-18',
            'amount' => 2000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'date' => '2026-09-18',
        ]);

        $m6NotExpiring = $createMember('Member Expiring Later', 'm6b@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-06B',
            'user_id' => $m6NotExpiring->id,
            'package_type' => 'Gym-Cardio',
            'start_date' => '2026-09-19',
            'end_date' => '2026-10-19', // 6 days away
            'amount' => 2000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'date' => '2026-09-19',
        ]);

        // SCENARIO 7: Plan ends 16 Oct, but member has a chained plan of same type starting 17 Oct -> no notification
        $m7Chained = $createMember('Member Chained Renewal', 'm7@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-07A',
            'user_id' => $m7Chained->id,
            'package_type' => 'Gym-Cardio',
            'start_date' => '2026-09-16',
            'end_date' => '2026-10-16',
            'amount' => 2000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'date' => '2026-09-16',
        ]);
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-07B',
            'user_id' => $m7Chained->id,
            'package_type' => 'Gym-Cardio',
            'start_date' => '2026-10-17', // Chained plan!
            'end_date' => '2026-11-17',
            'amount' => 2000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'date' => '2026-10-10',
        ]);

        // SCENARIO 8: Gym-Cardio ending in 3 days (16 Oct) and PT ending in 30 days (12 Nov) -> only Gym-Cardio notified
        $m8Multi = $createMember('Member Multi Package', 'm8@test.com');
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-08A',
            'user_id' => $m8Multi->id,
            'package_type' => 'Gym-Cardio',
            'start_date' => '2026-09-16',
            'end_date' => '2026-10-16', // in 3 days
            'amount' => 2000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'date' => '2026-09-16',
        ]);
        Invoice::create([
            'gym_id' => $gymA->id,
            'invoice_number' => 'INV-TEST-08B',
            'user_id' => $m8Multi->id,
            'package_type' => 'Personal Training',
            'start_date' => '2026-10-13',
            'end_date' => '2026-11-12', // in 30 days
            'amount' => 5000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'date' => '2026-10-13',
        ]);

        // SCENARIO 9: Legacy member with no invoice dates, expiry_date in 4 days (17 Oct) -> shows via fallback
        $m9Legacy = $createMember('Legacy Member', 'm9@test.com', '2026-10-17');

        // SCENARIO 12: Member in Gym B with due and expiring -> should NOT leak into Gym A
        $mB = $createMember('Gym B Member', 'mb@test.com', '2026-10-15', $gymB->id);
        Invoice::create([
            'gym_id' => $gymB->id,
            'invoice_number' => 'INV-TEST-B1',
            'user_id' => $mB->id,
            'amount' => 3000,
            'pending_amount' => 1500,
            'status' => 'Pending',
            'date' => '2026-10-01',
            'due_date' => '2026-10-14',
        ]);

        $service = new NotificationService();

        // RUN TESTS AGAINST SERVICE
        $res = $service->getNotificationsForUser($gymA->id, $ownerA->id);

        // Verification for Payment Due:
        // m1 (due 15 Oct) + m2 (overdue 10 Oct) qualify. m3, m4, m5, mB do NOT.
        $this->assertEquals(2, $res['payment_due']['total']);
        $dueMemberIds = collect($res['payment_due']['items'])->pluck('member_id')->all();
        $this->assertContains($m1->id, $dueMemberIds);
        $this->assertContains($m2->id, $dueMemberIds);
        $this->assertNotContains($m3->id, $dueMemberIds);
        $this->assertNotContains($m4->id, $dueMemberIds);
        $this->assertNotContains($m5->id, $dueMemberIds);
        $this->assertNotContains($mB->id, $dueMemberIds);

        // Overdue check (m2 is overdue, m1 is not)
        $m2Item = collect($res['payment_due']['items'])->firstWhere('member_id', $m2->id);
        $this->assertTrue($m2Item['is_overdue']);
        $this->assertEquals('high', $m2Item['urgency']);

        $m1Item = collect($res['payment_due']['items'])->firstWhere('member_id', $m1->id);
        $this->assertFalse($m1Item['is_overdue']);
        $this->assertEquals('normal', $m1Item['urgency']);

        // Verification for Plan Expiring:
        // m6Expiring (ends 18 Oct) qualifies. m6NotExpiring (ends 19 Oct) does NOT.
        // m7Chained (chained to Nov) does NOT qualify.
        // m8Multi has Gym-Cardio ending 16 Oct -> qualifies for Gym-Cardio only.
        // m9Legacy (profile expiry 17 Oct) -> qualifies via fallback.
        // Total expiring = m6Expiring (Gym-Cardio) + m8Multi (Gym-Cardio) + m9Legacy = 3 items.
        $this->assertEquals(3, $res['plan_expiring']['total']);
        $expiringMemberIds = collect($res['plan_expiring']['items'])->pluck('member_id')->all();
        $this->assertContains($m6Expiring->id, $expiringMemberIds);
        $this->assertContains($m8Multi->id, $expiringMemberIds);
        $this->assertContains($m9Legacy->id, $expiringMemberIds);
        $this->assertNotContains($m6NotExpiring->id, $expiringMemberIds);
        $this->assertNotContains($m7Chained->id, $expiringMemberIds);
        $this->assertNotContains($mB->id, $expiringMemberIds);

        // Check m8Multi notified package is Gym-Cardio, NOT Personal Training
        $m8Item = collect($res['plan_expiring']['items'])->firstWhere('member_id', $m8Multi->id);
        $this->assertEquals('Gym-Cardio', $m8Item['package_type']);

        // Total initial unread count = 2 (due) + 3 (expiring) = 5
        $this->assertEquals(5, $res['unread_count']);

        // SCENARIO 10: Marking notification as read removes from badge count
        $firstItem = $res['payment_due']['items'][0];
        $service->markAsRead($gymA->id, $ownerA->id, $firstItem['type'], $firstItem['reference_id']);

        $resAfterRead = $service->getNotificationsForUser($gymA->id, $ownerA->id);
        $this->assertEquals(4, $resAfterRead['unread_count']);
        $readItem = collect($resAfterRead['payment_due']['items'])->firstWhere('reference_id', $firstItem['reference_id']);
        $this->assertTrue($readItem['is_read']);

        // SCENARIO 11: Staff A has independent read state (Staff A still sees 5 unread)
        $resStaffA = $service->getNotificationsForUser($gymA->id, $staffA->id);
        $this->assertEquals(5, $resStaffA['unread_count']);

        // SCENARIO 13: Badge count equals number of members shown in filtered directory
        $filteredDueIds = $service->getMemberIdsForFilter($gymA->id, 'payment_due');
        $this->assertEquals(2, count($filteredDueIds));
        $this->assertEquals($res['payment_due']['total'], count($filteredDueIds));

        $filteredExpiringIds = $service->getMemberIdsForFilter($gymA->id, 'plan_expiring');
        $this->assertEquals(3, count($filteredExpiringIds));
        $this->assertEquals($res['plan_expiring']['total'], count($filteredExpiringIds));

        // Clean up test records
        Gym::whereIn('id', [$gymA->id, $gymB->id])->delete();
    }
}
