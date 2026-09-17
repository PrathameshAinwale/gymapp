<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PtSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id', 'member_id', 'member_name', 'member_avatar',
        'trainer_id', 'trainer_name', 'plan_name',
        'total_sessions', 'completed_sessions', 'remaining_sessions',
        'client_otp', 'status', 'start_date', 'end_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_sessions' => 'integer',
        'completed_sessions' => 'integer',
        'remaining_sessions' => 'integer',
    ];

    // Relations
    public function member()
    {
        return $this->belongsTo(User::class, 'member_id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    public function logs()
    {
        return $this->hasMany(PtSessionLog::class, 'pt_session_id');
    }

    // Helpers
    public function getProgressPercent(): float
    {
        if ($this->total_sessions === 0) return 0;
        return round(($this->completed_sessions / $this->total_sessions) * 100, 1);
    }

    public function generateOtp(): string
    {
        $otp = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $this->client_otp = $otp;
        $this->save();
        return $otp;
    }
}
