<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TrainerReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id', 'trainer_id', 'trainer_name',
        'member_id', 'member_name', 'member_avatar',
        'rating', 'comment', 'date',
    ];

    protected $casts = [
        'rating' => 'integer',
        'date' => 'date',
    ];

    // Relations
    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    public function member()
    {
        return $this->belongsTo(User::class, 'member_id');
    }

    // Scopes
    public function scopeForTrainer($query, int $trainerId)
    {
        return $query->where('trainer_id', $trainerId);
    }

    // Static: recalculate average rating for a trainer after a review is saved
    public static function recalculateAverageForTrainer(int $trainerId): float
    {
        $avg = self::where('trainer_id', $trainerId)->avg('rating') ?? 0;
        return round($avg, 1);
    }
}
