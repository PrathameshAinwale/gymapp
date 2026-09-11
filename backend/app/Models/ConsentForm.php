<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsentForm extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'member_id',
        'member_name',
        'phone',
        'plan_name',
        'emergency_contact',
        'emergency_phone',
        'medical_conditions',
        'signed_date',
        'status',
    ];

    protected $casts = [
        'signed_date' => 'date:Y-m-d',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function member()
    {
        return $this->belongsTo(User::class, 'member_id');
    }
}
