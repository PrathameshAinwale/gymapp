<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembershipTransfer extends Model
{
    use HasFactory;

    protected $table = 'membership_transfers';

    protected $fillable = [
        'gym_id',
        'from_member_id',
        'from_member_name',
        'to_member_id',
        'to_member_name',
        'to_member_phone',
        'plan_name',
        'days_remaining',
        'transfer_fee',
        'payment_method',
        'transfer_date',
        'reason',
        'status',
    ];

    protected $casts = [
        'days_remaining' => 'integer',
        'transfer_fee' => 'float',
        'transfer_date' => 'date',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }
}
