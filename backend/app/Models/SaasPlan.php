<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaasPlan extends Model
{
    use HasFactory;

    protected $table = 'saas_plans';

    protected $fillable = [
        'slug',
        'name',
        'tier',
        'monthly_price',
        'annual_price',
        'max_members',
        'max_trainers',
        'max_branches',
        'features',
        'description',
        'badge_color',
        'is_popular',
        'is_active',
    ];

    protected $casts = [
        'features' => 'array',
        'monthly_price' => 'float',
        'annual_price' => 'float',
        'max_members' => 'integer',
        'max_trainers' => 'integer',
        'max_branches' => 'integer',
        'is_popular' => 'boolean',
        'is_active' => 'boolean',
    ];
}
