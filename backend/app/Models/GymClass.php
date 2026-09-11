<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GymClass extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'name',
        'trainer_id',
        'time',
        'days',
        'capacity',
        'booked_count',
        'category',
        'room',
        'difficulty',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    protected $casts = [
        'days' => 'array',
        'capacity' => 'integer',
        'booked_count' => 'integer',
    ];

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    public function bookings()
    {
        return $this->hasMany(ClassBooking::class, 'gym_class_id');
    }
}
