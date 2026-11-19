<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class RealtimeNotificationBroadcaster
{
    private const BUFFER_TTL_SECONDS = 300; // 5 minutes buffer for missed events
    private const MAX_BUFFER_ITEMS = 50;

    /**
     * Publish a new notification event to the user's channel.
     */
    public function publishNotification(Notification $notification): void
    {
        $payload = [
            'id' => (string) $notification->id,
            'event' => 'notification',
            'data' => [
                'id' => $notification->id,
                'gym_id' => $notification->gym_id,
                'user_id' => $notification->user_id,
                'type' => $notification->type,
                'reference_id' => $notification->reference_id,
                'title' => $notification->title,
                'message' => $notification->message,
                'data' => $notification->data,
                'urgency' => $notification->urgency,
                'is_read' => $notification->is_read,
                'created_at' => $notification->created_at?->toIso8601String() ?? now()->toIso8601String(),
            ],
            'timestamp' => now()->timestamp,
        ];

        $this->pushToUserBuffer($notification->user_id, $payload);
    }

    /**
     * Publish a "mark read" event for optimistic cross-tab and client sync.
     */
    public function publishRead(int $userId, int $gymId, $referenceOrId): void
    {
        $payload = [
            'id' => 'read_' . uniqid(),
            'event' => 'read',
            'data' => [
                'user_id' => $userId,
                'gym_id' => $gymId,
                'reference_id' => (string) $referenceOrId,
                'id' => is_numeric($referenceOrId) ? (int) $referenceOrId : null,
            ],
            'timestamp' => now()->timestamp,
        ];

        $this->pushToUserBuffer($userId, $payload);
    }

    /**
     * Publish a "mark all read" event.
     */
    public function publishAllRead(int $userId, int $gymId): void
    {
        $payload = [
            'id' => 'all_read_' . uniqid(),
            'event' => 'all_read',
            'data' => [
                'user_id' => $userId,
                'gym_id' => $gymId,
            ],
            'timestamp' => now()->timestamp,
        ];

        $this->pushToUserBuffer($userId, $payload);
    }

    /**
     * Pop pending unread stream messages for a user.
     * Consumes items so they are only sent once to the active stream.
     */
    public function popPendingMessages(int $userId): array
    {
        $lockKey = "lock_realtime_pop_{$userId}";
        $cacheKey = $this->getUserQueueKey($userId);

        try {
            // Check Redis list if Redis is available
            if ($this->isRedisAvailable()) {
                $messages = [];
                while ($item = Redis::rpop("realtime_queue:{$userId}")) {
                    $decoded = json_decode($item, true);
                    if ($decoded) {
                        $messages[] = $decoded;
                    }
                }
                return $messages;
            }
        } catch (\Throwable $e) {
            // Fallback to Cache
        }

        // Cache store fallback
        $messages = Cache::get($cacheKey, []);
        if (!empty($messages)) {
            Cache::forget($cacheKey);
        }

        return is_array($messages) ? $messages : [];
    }

    /**
     * Push message to user channel buffer.
     */
    protected function pushToUserBuffer(int $userId, array $message): void
    {
        try {
            if ($this->isRedisAvailable()) {
                Redis::lpush("realtime_queue:{$userId}", json_encode($message));
                Redis::expire("realtime_queue:{$userId}", self::BUFFER_TTL_SECONDS);
                // Also publish for multi-server pub/sub listeners
                Redis::publish("channel_notifications_{$userId}", json_encode($message));
                return;
            }
        } catch (\Throwable $e) {
            // Redis error or not running; fallback to Cache
        }

        $cacheKey = $this->getUserQueueKey($userId);
        $existing = Cache::get($cacheKey, []);
        if (!is_array($existing)) {
            $existing = [];
        }
        $existing[] = $message;
        if (count($existing) > self::MAX_BUFFER_ITEMS) {
            $existing = array_slice($existing, -self::MAX_BUFFER_ITEMS);
        }
        Cache::put($cacheKey, $existing, self::BUFFER_TTL_SECONDS);
    }

    /**
     * Check if Redis is enabled and reachable.
     */
    protected function isRedisAvailable(): bool
    {
        if (config('database.redis.client') && extension_loaded('redis')) {
            try {
                return (bool) Redis::ping();
            } catch (\Throwable $e) {
                return false;
            }
        }
        return false;
    }

    private function getUserQueueKey(int $userId): string
    {
        return "realtime_notifs_queue_{$userId}";
    }
}

