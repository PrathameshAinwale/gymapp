<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BodyMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date_label',
        'weight',
        'body_fat',
        'muscle_mass',
    ];

    protected $casts = [
        'weight' => 'float',
        'body_fat' => 'float',
        'muscle_mass' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
