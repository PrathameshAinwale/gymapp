<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainerProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'specialty',
        'experience',
        'rating',
        'monthly_salary',
        'bio',
        'certifications',
        'age',
        'gender',
        'blood_group',
        'address',
    ];

    protected $casts = [
        'rating' => 'float',
        'monthly_salary' => 'float',
        'certifications' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignedMembers()
    {
        return $this->hasMany(MemberProfile::class, 'trainer_id', 'user_id');
    }
}
