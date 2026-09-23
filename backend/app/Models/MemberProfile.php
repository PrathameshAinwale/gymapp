<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MemberProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'plan_id',
        'trainer_id',
        'status',
        'join_date',
        'expiry_date',
        'gender',
        'age',
        'dob',
        'weight',
        'target_weight',
        'height',
        'goal',
        'medical_notes',
        'emergency_contact',
        'attendance_streak',
        'qr_pass_code',
        'dues_amount',
        'last_check_in',
    ];

    protected $casts = [
        'age' => 'integer',
        'dob' => 'date',
        'weight' => 'float',
        'target_weight' => 'float',
        'height' => 'float',
        'attendance_streak' => 'integer',
        'dues_amount' => 'float',
        'join_date' => 'date',
        'expiry_date' => 'date',
        'last_check_in' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }
}
