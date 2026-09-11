<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_class_id',
        'user_id',
        'booking_date',
        'status',
    ];

    protected $casts = [
        'booking_date' => 'date',
    ];

    public function gymClass()
    {
        return $this->belongsTo(GymClass::class, 'gym_class_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
