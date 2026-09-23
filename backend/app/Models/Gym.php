<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Gym extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'owner_id',
        'tagline',
        'address',
        'city',
        'phone',
        'email',
        'package',
        'package_tier',
        'billing_cycle',
        'package_amount',
        'max_members',
        'max_trainers',
        'max_branches',
        'status',
        'operating_hours',
        'currency',
        'initial_password',
    ];

    protected $hidden = [
        'initial_password',
    ];

    protected function casts(): array
    {
        return [
            'initial_password' => 'hashed',
        ];
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'gym_id');
    }

    public function members()
    {
        return $this->hasMany(User::class, 'gym_id')->where('role', 'member');
    }

    public function trainers()
    {
        return $this->hasMany(User::class, 'gym_id')->where('role', 'trainer');
    }
}
