<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'user_id',
        'user_name',
        'role',
        'leave_type',
        'allocated_days',
        'used_days',
        'remaining_days',
        'year',
    ];

    protected $casts = [
        'allocated_days' => 'float',
        'used_days'      => 'float',
        'remaining_days' => 'float',
        'year'           => 'integer',
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
