<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiometricLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'device_id',
        'device_name',
        'person_name',
        'person_type',
        'verification_mode',
        'result',
        'gate_trigger',
        'event_time',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }
}
