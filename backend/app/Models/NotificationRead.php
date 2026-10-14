<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationRead extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'gym_id',
        'notification_type',
        'reference_id',
        'read_date',
    ];

    protected $casts = [
        'read_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }
}
