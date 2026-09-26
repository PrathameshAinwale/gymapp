<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'plain_password',
        'initial_password',
        'must_change_password',
        'role', // 'superadmin', 'owner', 'trainer', 'member'
        'gym_id',
        'phone',
        'avatar',
        'dob',
        'aadhaar_card',
        'aadhaar_image',
        'pan_card',
        'pan_image',
        'salary',
        'deductions',
        'shifts',
    ];

    protected $hidden = [
        'password',
        'initial_password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'initial_password' => 'hashed',
            'must_change_password' => 'boolean',
            'deductions' => 'float',
            'salary' => 'float',
        ];
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    public function ownedGym()
    {
        return $this->hasOne(Gym::class, 'owner_id');
    }

    public function trainerProfile()
    {
        return $this->hasOne(TrainerProfile::class, 'user_id');
    }

    public function memberProfile()
    {
        return $this->hasOne(MemberProfile::class, 'user_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'user_id');
    }

    public function workoutPlans()
    {
        return $this->hasMany(WorkoutPlan::class, 'user_id');
    }

    public function dietPlans()
    {
        return $this->hasMany(DietPlan::class, 'user_id');
    }

    public function bodyMetrics()
    {
        return $this->hasMany(BodyMetric::class, 'user_id');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'user_id');
    }

    public function classBookings()
    {
        return $this->hasMany(ClassBooking::class, 'user_id');
    }

    public function taughtClasses()
    {
        return $this->hasMany(GymClass::class, 'trainer_id');
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class, 'user_id');
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class, 'user_id');
    }
}
