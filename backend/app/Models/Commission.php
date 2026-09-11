<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Commission extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'trainer_id',
        'trainer_name',
        'member_name',
        'plan_name',
        'session_type',
        'rate_percent',
        'amount',
        'date',
        'status',
    ];

    protected $casts = [
        'rate_percent' => 'float',
        'amount' => 'float',
        'date' => 'date:Y-m-d',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }
}
