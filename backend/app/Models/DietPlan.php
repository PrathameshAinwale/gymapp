<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DietPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'trainer_id',
        'daily_calories_target',
        'protein_grams_target',
        'carbs_grams_target',
        'fats_grams_target',
        'water_glasses_target',
        'days',
    ];

    protected $casts = [
        'daily_calories_target' => 'integer',
        'protein_grams_target' => 'integer',
        'carbs_grams_target' => 'integer',
        'fats_grams_target' => 'integer',
        'water_glasses_target' => 'integer',
        'days' => 'array',
    ];

    public function member()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }
}
