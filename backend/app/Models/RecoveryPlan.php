<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecoveryPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'name',
        'price',
        'duration',
        'sessions',
        'popular',
        'offer',
        'offer_days',
        'color',
        'features',
    ];

    protected $casts = [
        'price' => 'float',
        'sessions' => 'integer',
        'offer_days' => 'integer',
        'popular' => 'boolean',
        'features' => 'array',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }
}
