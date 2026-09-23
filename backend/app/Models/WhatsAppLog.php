<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsAppLog extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_logs';

    protected $fillable = [
        'gym_id',
        'template_id',
        'recipient_id',
        'recipient_name',
        'recipient_phone',
        'recipient_role',
        'category',
        'message',
        'status',
        'channel',
        'trigger_type',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    public function template()
    {
        return $this->belongsTo(WhatsAppTemplate::class, 'template_id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
