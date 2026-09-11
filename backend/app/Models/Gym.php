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
        'initial_password',
    ];

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
