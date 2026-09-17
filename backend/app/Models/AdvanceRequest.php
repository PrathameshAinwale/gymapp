<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AdvanceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id', 'trainer_id', 'trainer_name', 'trainer_avatar',
        'amount', 'reason', 'repayment_month',
        'status', 'request_date', 'disbursed_at', 'notes',
    ];

    protected $casts = [
        'amount' => 'float',
        'request_date' => 'date',
        'disbursed_at' => 'datetime',
    ];

    // Relations
    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    public function scopeDisbursed($query)
    {
        return $query->where('status', 'Disbursed');
    }
}
