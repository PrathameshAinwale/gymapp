<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enquiry extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'name',
        'phone',
        'email',
        'source',
        'interested_plan',
        'fitness_goal',
        'priority',
        'status',
        'follow_up_date',
        'staff_name',
        'notes',
        'comments',
        'converted_member_id',
    ];

    protected $casts = [
        'follow_up_date' => 'date:Y-m-d',
        'comments' => 'array',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function convertedMember()
    {
        return $this->belongsTo(User::class, 'converted_member_id');
    }

    public function scopeHot($query)
    {
        return $query->where('priority', 'Hot');
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['Joined', 'Lost']);
    }
}
