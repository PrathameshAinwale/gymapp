<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    use HasFactory;

    protected $table = 'equipment';

    protected $fillable = [
        'gym_id',
        'name',
        'brand',
        'category',
        'location',
        'status',
        'last_serviced',
        'next_service_due',
        'condition',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    protected $casts = [
        'last_serviced' => 'date',
        'next_service_due' => 'date',
    ];
}
