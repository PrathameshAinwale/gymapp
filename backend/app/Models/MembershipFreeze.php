<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembershipFreeze extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'member_id',
        'member_name',
        'plan_name',
        'freeze_start_date',
        'freeze_end_date',
        'days_frozen',
        'fee',
        'payment_method',
        'type',
        'reason',
        'status',
        'approved_by',
    ];

    protected $casts = [
        'freeze_start_date' => 'date:Y-m-d',
        'freeze_end_date' => 'date:Y-m-d',
        'days_frozen' => 'integer',
        'fee' => 'float',
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
