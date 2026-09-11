<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiometricDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'name',
        'ip_address',
        'serial_no',
        'location',
        'status',
        'total_punches_today',
        'pulse_duration_sec',
        'last_sync',
    ];

    protected $casts = [
        'total_punches_today' => 'integer',
        'pulse_duration_sec' => 'integer',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }
}
