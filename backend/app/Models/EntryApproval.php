<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EntryApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'member_id',
        'member_name',
        'avatar',
        'issue',
        'gate',
        'reason',
        'requested_time',
        'status',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }
}
