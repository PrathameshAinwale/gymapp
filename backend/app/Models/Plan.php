<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'name',
        'price',
        'max_discount',
        'offer',
        'offer_days',
        'period',
        'duration_months',
        'popular',
        'color',
        'features',
        'active_subscribers',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    protected $casts = [
        'price' => 'float',
        'max_discount' => 'float',
        'offer_days' => 'integer',
        'duration_months' => 'integer',
        'popular' => 'boolean',
        'features' => 'array',
        'active_subscribers' => 'integer',
    ];

    public function memberProfiles()
    {
        return $this->hasMany(MemberProfile::class, 'plan_id');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'plan_id');
    }
}
