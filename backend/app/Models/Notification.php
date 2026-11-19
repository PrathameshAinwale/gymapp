<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'user_id',
        'type',
        'reference_id',
        'title',
        'message',
        'data',
        'urgency',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'gym_id' => 'integer',
        'user_id' => 'integer',
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * User who owns this notification.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Gym where this notification occurred.
     */
    public function gym(): BelongsTo
    {
        return $this->belongsTo(Gym::class);
    }

    /**
     * Scope for user & facility.
     */
    public function scopeForUser(Builder $query, int $userId, ?int $gymId = null): Builder
    {
        $query->where('user_id', $userId);
        if ($gymId) {
            $query->where('gym_id', $gymId);
        }
        return $query;
    }

    /**
     * Scope for unread notifications.
     */
    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope for read notifications.
     */
    public function scopeRead(Builder $query): Builder
    {
        return $query->where('is_read', true);
    }

    /**
     * Scope for notifications created after a given timestamp (catch-up on reconnect).
     */
    public function scopeSince(Builder $query, $timestamp): Builder
    {
        if (is_numeric($timestamp)) {
            $timestamp = date('Y-m-d H:i:s', (int) $timestamp);
        }
        return $query->where('created_at', '>', $timestamp);
    }

    /**
     * Scope for specific notification type.
     */
    public function scopeOfType(Builder $query, ?string $type): Builder
    {
        if ($type && $type !== 'all') {
            return $query->where('type', $type);
        }
        return $query;
    }
}

