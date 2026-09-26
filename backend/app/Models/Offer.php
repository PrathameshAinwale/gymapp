<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Offer extends Model
{
    use HasFactory;

    protected $table = 'offers';

    protected $fillable = [
        'gym_id',
        'title',
        'code',
        'discount_type',
        'discount_value',
        'plan_id',
        'plan_name',
        'start_date',
        'end_date',
        'description',
        'is_active',
    ];

    protected $casts = [
        'discount_value' => 'float',
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }
}
