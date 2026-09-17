<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PtSessionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'pt_session_id', 'member_id', 'trainer_id',
        'member_name', 'trainer_name', 'session_number',
        'otp_entered', 'otp_verified', 'notes', 'verified_at',
    ];

    protected $casts = [
        'otp_verified' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function ptSession()
    {
        return $this->belongsTo(PtSession::class, 'pt_session_id');
    }

    public function member()
    {
        return $this->belongsTo(User::class, 'member_id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }
}
