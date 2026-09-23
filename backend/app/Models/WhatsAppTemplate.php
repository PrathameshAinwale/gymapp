<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsAppTemplate extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_templates';

    protected $fillable = [
        'gym_id',
        'name',
        'category',
        'target_role',
        'message_body',
        'is_active',
        'is_auto_enabled',
        'timing_trigger',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_auto_enabled' => 'boolean',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs()
    {
        return $this->hasMany(WhatsAppLog::class, 'template_id');
    }
}
