<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'user_id',
        'user_name',
        'user_avatar',
        'role',
        'leave_type',
        'start_date',
        'end_date',
        'days_count',
        'reason',
        'status',
        'action_by',
        'action_notes',
        'action_date',
    ];

    protected $casts = [
        'days_count'  => 'float',
        'start_date'  => 'date:Y-m-d',
        'end_date'    => 'date:Y-m-d',
        'action_date' => 'datetime',
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
