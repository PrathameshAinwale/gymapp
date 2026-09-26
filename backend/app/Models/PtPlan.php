<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PtPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'name',
        'price',
        'sessions',
        'duration_weeks',
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
        'duration_weeks' => 'integer',
        'popular' => 'boolean',
        'features' => 'array',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }
}
