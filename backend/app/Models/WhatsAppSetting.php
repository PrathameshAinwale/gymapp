<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsAppSetting extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_settings';

    protected $fillable = [
        'gym_id',
        'provider',
        'is_enabled',
        'instance_id',
        'api_token',
        'phone_number_id',
        'api_url',
        'auto_send_welcome',
        'auto_send_birthday',
        'auto_send_expiry',
        'auto_send_dues',
    ];

    protected $casts = [
        'is_enabled'         => 'boolean',
        'auto_send_welcome'  => 'boolean',
        'auto_send_birthday' => 'boolean',
        'auto_send_expiry'   => 'boolean',
        'auto_send_dues'     => 'boolean',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    /**
     * Get or create active settings for a given gym.
     */
    public static function forGym(?int $gymId = null): self
    {
        $setting = null;
        if ($gymId) {
            $setting = self::where('gym_id', $gymId)->first();
        }
        if (!$setting) {
            $setting = self::whereNull('gym_id')->orWhere('gym_id', 1)->first();
        }
        if (!$setting) {
            $setting = self::create([
                'gym_id'             => $gymId ?: 1,
                'provider'           => env('WHATSAPP_PROVIDER', 'ultramsg'),
                'is_enabled'         => true,
                'instance_id'        => env('WHATSAPP_INSTANCE_ID', null),
                'api_token'          => env('WHATSAPP_API_TOKEN', null),
                'phone_number_id'    => env('WHATSAPP_PHONE_NUMBER_ID', null),
                'api_url'            => env('WHATSAPP_API_URL', null),
                'auto_send_welcome'  => true,
                'auto_send_birthday' => true,
                'auto_send_expiry'   => true,
                'auto_send_dues'     => true,
            ]);
        }
        return $setting;
    }
}
