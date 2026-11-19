<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RealtimeNotificationBroadcaster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationEnterpriseTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;
    protected User $owner;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym = Gym::create([
            'name' => 'Apex Gym Pro',
            'phone' => '9888877770',
        ]);

        $this->owner = User::create([
            'name' => 'Owner Apex',
            'email' => 'owner_apex@test.com',
            'password' => bcrypt('secret123'),
            'role' => 'owner',
            'gym_id' => $this->gym->id,
        ]);

        $this->staff = User::create([
            'name' => 'Staff Apex',
            'email' => 'staff_apex@test.com',
            'password' => bcrypt('secret123'),
            'role' => 'staff',
            'gym_id' => $this->gym->id,
        ]);
    }

    public function test_event_driven_creation_and_deduplication(): void
    {
        $service = app(NotificationService::class);

        // 1. Create notification
        $notif1 = $service->notify(
            $this->gym->id,
            $this->owner->id,
            'payment_received',
            'Payment Received',
            'Invoice #INV-101 was paid in full',
            ['invoice_id' => 101, 'amount' => 5000],
            'normal',
            'payment_receipt:101'
        );

        $this->assertDatabaseHas('notifications', [
            'id' => $notif1->id,
            'user_id' => $this->owner->id,
            'reference_id' => 'payment_receipt:101',
            'is_read' => false,
        ]);

        // 2. Rapid-fire duplicate notification with same reference_id updates existing rather than duplicating
        $notif2 = $service->notify(
            $this->gym->id,
            $this->owner->id,
            'payment_received',
            'Payment Received (Updated)',
            'Invoice #INV-101 was updated with extra note',
            ['invoice_id' => 101, 'amount' => 5000],
            'normal',
            'payment_receipt:101'
        );

        $this->assertEquals($notif1->id, $notif2->id);
        $this->assertEquals('Payment Received (Updated)', $notif2->title);
        $this->assertEquals(1, Notification::where('user_id', $this->owner->id)->where('reference_id', 'payment_receipt:101')->count());
    }

    public function test_fast_unread_count_endpoint_with_cache(): void
    {
        Sanctum::actingAs($this->owner);

        $service = app(NotificationService::class);
        $service->notify($this->gym->id, $this->owner->id, 'alert', 'Alert 1', 'Message 1', [], 'normal', 'ref:1');
        $service->notify($this->gym->id, $this->owner->id, 'alert', 'Alert 2', 'Message 2', [], 'normal', 'ref:2');

        $response = $this->getJson('/api/v1/notifications/unread-count');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'unread_count' => 2,
            ]);

        $this->assertTrue($response->headers->has('ETag'));
        $etag = $response->headers->get('ETag');

        // Test 304 Not Modified when ETag matches
        $cachedResponse = $this->withHeaders(['If-None-Match' => $etag])
            ->getJson('/api/v1/notifications/unread-count');
        $cachedResponse->assertStatus(304);
    }

    public function test_idempotent_mark_read_and_mark_all_read(): void
    {
        Sanctum::actingAs($this->owner);
        $service = app(NotificationService::class);

        $n1 = $service->notify($this->gym->id, $this->owner->id, 'alert', 'Test 1', 'Msg 1', [], 'normal', 'ref:101');
        $n2 = $service->notify($this->gym->id, $this->owner->id, 'alert', 'Test 2', 'Msg 2', [], 'normal', 'ref:102');

        // Mark single as read by reference_id
        $resp1 = $this->postJson('/api/v1/notifications/read', [
            'type' => 'alert',
            'reference_id' => 'ref:101',
        ]);
        $resp1->assertStatus(200)->assertJson(['success' => true]);

        $this->assertTrue($n1->fresh()->is_read);
        $this->assertFalse($n2->fresh()->is_read);

        // Calling markRead again is idempotent and does not error
        $respDuplicate = $this->postJson('/api/v1/notifications/read', [
            'type' => 'alert',
            'reference_id' => 'ref:101',
        ]);
        $respDuplicate->assertStatus(200)->assertJson(['success' => true]);

        // Mark all read
        $respAll = $this->postJson('/api/v1/notifications/mark-all-read');
        $respAll->assertStatus(200)->assertJson(['success' => true]);

        $this->assertTrue($n2->fresh()->is_read);
    }

    public function test_cursor_pagination_and_since_catchup(): void
    {
        Sanctum::actingAs($this->owner);
        $service = app(NotificationService::class);

        for ($i = 1; $i <= 5; $i++) {
            $service->notify($this->gym->id, $this->owner->id, 'item', "Item {$i}", "Msg {$i}", [], 'normal', "ref:seq:{$i}");
        }

        // Fetch page with limit = 2
        $resPage1 = $this->getJson('/api/v1/notifications?limit=2');
        $resPage1->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'unread_count',
                'items',
                'has_more',
            ]);

        $items1 = $resPage1->json('items');
        $this->assertCount(2, $items1);
        $this->assertTrue($resPage1->json('has_more'));
        $nextCursor = $resPage1->json('next_cursor');
        $this->assertNotNull($nextCursor);

        // Fetch page 2 with cursor
        $resPage2 = $this->getJson("/api/v1/notifications?limit=2&cursor={$nextCursor}");
        $resPage2->assertStatus(200);
        $items2 = $resPage2->json('items');
        $this->assertCount(2, $items2);
        // Ensure page 2 has different IDs than page 1
        $this->assertNotEquals($items1[0]['id'], $items2[0]['id']);

        // Test since filter for reconnect catch-up
        $pastTimestamp = time() - 100;
        $resSince = $this->getJson("/api/v1/notifications?since={$pastTimestamp}");
        $resSince->assertStatus(200);
        $this->assertGreaterThan(0, count($resSince->json('items')));
    }

    public function test_delete_notification(): void
    {
        Sanctum::actingAs($this->owner);
        $service = app(NotificationService::class);

        $notif = $service->notify($this->gym->id, $this->owner->id, 'temp', 'Temporary', 'To delete', [], 'normal', 'del:1');

        $deleteResp = $this->deleteJson("/api/v1/notifications/{$notif->id}");
        $deleteResp->assertStatus(200)->assertJson(['success' => true]);

        $this->assertDatabaseMissing('notifications', ['id' => $notif->id]);
    }

    public function test_realtime_broadcaster_buffers_messages(): void
    {
        $broadcaster = app(RealtimeNotificationBroadcaster::class);
        $service = app(NotificationService::class);

        $notif = $service->notify($this->gym->id, $this->owner->id, 'ping', 'Ping Alert', 'Hello', [], 'high', 'ping:1');

        $pending = $broadcaster->popPendingMessages($this->owner->id);
        $this->assertNotEmpty($pending);
        $first = $pending[0];
        $this->assertEquals('notification', $first['event']);
        $this->assertEquals('Ping Alert', $first['data']['title']);

        // Once popped, queue is empty
        $afterPop = $broadcaster->popPendingMessages($this->owner->id);
        $this->assertEmpty($afterPop);
    }
}

