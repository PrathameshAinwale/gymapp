<?php

namespace App\Repositories;

use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\Cursor;

class NotificationRepository
{
    /**
     * Get paginated notifications with cursor support.
     *
     * @param int $userId
     * @param int|null $gymId
     * @param array $filters [type, is_read, since, limit, cursor]
     * @return array ['items' => Collection, 'next_cursor' => string|null, 'has_more' => bool]
     */
    public function getPaginatedForUser(int $userId, ?int $gymId = null, array $filters = []): array
    {
        $limit = min((int) ($filters['limit'] ?? 20), 100);
        if ($limit <= 0) {
            $limit = 20;
        }

        $query = Notification::query()
            ->forUser($userId, $gymId)
            ->orderBy('id', 'desc');

        if (!empty($filters['type']) && $filters['type'] !== 'all') {
            $query->ofType($filters['type']);
        }

        if (isset($filters['is_read'])) {
            $isRead = filter_var($filters['is_read'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isRead !== null) {
                $query->where('is_read', $isRead);
            }
        }

        if (!empty($filters['since'])) {
            $query->since($filters['since']);
        }

        if (!empty($filters['cursor'])) {
            $cursorId = (int) $filters['cursor'];
            if ($cursorId > 0) {
                $query->where('id', '<', $cursorId);
            }
        }

        // Fetch limit + 1 to know if more items exist
        $items = $query->take($limit + 1)->get();

        $hasMore = $items->count() > $limit;
        if ($hasMore) {
            $items = $items->slice(0, $limit);
        }

        $lastItem = $items->last();
        $nextCursor = ($hasMore && $lastItem) ? (string) $lastItem->id : null;

        return [
            'items' => $items->values(),
            'next_cursor' => $nextCursor,
            'has_more' => $hasMore,
        ];
    }

    /**
     * Get unread count for user in gym.
     */
    public function getUnreadCount(int $userId, ?int $gymId = null): int
    {
        return Notification::query()
            ->forUser($userId, $gymId)
            ->unread()
            ->count();
    }

    /**
     * Create or update a notification with deduplication.
     * If a notification with the same user_id and reference_id already exists and is recent,
     * updates it to avoid spam/thundering notifications.
     */
    public function createOrUpdate(array $attributes): Notification
    {
        $userId = $attributes['user_id'];
        $gymId = $attributes['gym_id'];
        $referenceId = $attributes['reference_id'] ?? null;

        if ($referenceId) {
            $existing = Notification::where('user_id', $userId)
                ->where('gym_id', $gymId)
                ->where('reference_id', $referenceId)
                ->first();

            if ($existing) {
                $existing->update([
                    'title' => $attributes['title'] ?? $existing->title,
                    'message' => $attributes['message'] ?? $existing->message,
                    'data' => $attributes['data'] ?? $existing->data,
                    'urgency' => $attributes['urgency'] ?? $existing->urgency,
                    'is_read' => false,
                    'read_at' => null,
                    'updated_at' => Carbon::now(),
                ]);
                return $existing->fresh();
            }
        }

        return Notification::create($attributes);
    }

    /**
     * Mark a single notification as read by ID or reference_id.
     */
    public function markAsRead(int $userId, ?int $gymId, $idOrReference): bool
    {
        $query = Notification::query()->forUser($userId, $gymId);

        if (is_numeric($idOrReference)) {
            $query->where(function ($q) use ($idOrReference) {
                $q->where('id', (int) $idOrReference)
                  ->orWhere('reference_id', (string) $idOrReference);
            });
        } else {
            $query->where('reference_id', (string) $idOrReference);
        }

        $affected = $query->update([
            'is_read' => true,
            'read_at' => Carbon::now(),
        ]);

        return $affected > 0;
    }

    /**
     * Mark all notifications for user as read.
     */
    public function markAllAsRead(int $userId, ?int $gymId = null): int
    {
        return Notification::query()
            ->forUser($userId, $gymId)
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => Carbon::now(),
            ]);
    }

    /**
     * Delete notification.
     */
    public function delete(int $userId, ?int $gymId, int $id): bool
    {
        return (bool) Notification::query()
            ->forUser($userId, $gymId)
            ->where('id', $id)
            ->delete();
    }

    /**
     * Prune old notifications past TTL (e.g. read > 60 days, unread > 180 days).
     */
    public function pruneOld(int $readDays = 60, int $unreadDays = 180): int
    {
        $readDeleted = Notification::where('is_read', true)
            ->where('updated_at', '<', Carbon::now()->subDays($readDays))
            ->delete();

        $unreadDeleted = Notification::where('is_read', false)
            ->where('created_at', '<', Carbon::now()->subDays($unreadDays))
            ->delete();

        return $readDeleted + $unreadDeleted;
    }
}

