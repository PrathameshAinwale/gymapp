<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    use HasFactory;

    protected $table = 'shifts';

    protected $fillable = [
        'gym_id',
        'name',
        'description',
        'timings',
        'color',
        'is_active',
    ];

    protected $casts = [
        'timings'   => 'array',
        'is_active' => 'boolean',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }
}
