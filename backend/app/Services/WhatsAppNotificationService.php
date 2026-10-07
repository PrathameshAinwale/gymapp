<?php

namespace App\Services;

use App\Models\Gym;
use App\Models\GymSetting;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\User;
use App\Models\WhatsAppLog;
use App\Models\WhatsAppSetting;
use App\Models\WhatsAppTemplate;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppNotificationService
{
    /**
     * Normalize international phone numbers for WhatsApp.
     * If 10-digit Indian number, prepends 91.
     */
    public static function cleanPhone(?string $phone): string
    {
        if (!$phone) return '';
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($cleaned) === 10) {
            $cleaned = '91' . $cleaned;
        }
        return $cleaned;
    }

    /**
     * Replace dynamic template placeholder variables.
     */
    public static function renderMessage(string $template, array $data): string
    {
        $placeholders = [
            '{{name}}'          => $data['name'] ?? '',
            '{{gym_name}}'      => $data['gym_name'] ?? 'PulseFit Pro',
            '{{role}}'          => ucfirst($data['role'] ?? 'Member'),
            '{{phone}}'         => $data['phone'] ?? '',
            '{{plan_name}}'     => $data['plan_name'] ?? 'Membership',
            '{{expiry_date}}'   => $data['expiry_date'] ?? '',
            '{{days_left}}'     => (string) ($data['days_left'] ?? ''),
            '{{dues_amount}}'   => isset($data['dues_amount']) ? '₹' . number_format((float) $data['dues_amount'], 2) : '₹0',
            '{{date}}'          => $data['date'] ?? Carbon::today()->format('d M Y'),
            '{{trainer_name}}'  => $data['trainer_name'] ?? 'Personal Coach',
            '{{age}}'           => (string) ($data['age'] ?? ''),
            '{{dob}}'           => (string) ($data['dob'] ?? ''),
            '{{portal_url}}'    => $data['portal_url'] ?? config('app.url', 'https://archfit.archenterprises.co.in'),
            '{{qr_pass_code}}'  => $data['qr_pass_code'] ?? '',
            '{{custom_note}}'   => $data['custom_note'] ?? '',
        ];

        $rendered = str_replace(array_keys($placeholders), array_values($placeholders), $template);
        return str_replace(['Coach Coach ', 'Coach Coach'], 'Coach ', $rendered);
    }

    /**
     * Dispatch an outbound message via the configured WhatsApp Gateway (UltraMsg, Meta, or Custom).
     * If no gateway keys are configured, falls back to simulated delivery with direct wa_link.
     */
    public static function dispatchViaGateway(string $phone, string $message, ?int $gymId = null): array
    {
        $cleanPhone = self::cleanPhone($phone);
        if (!$cleanPhone) {
            return [
                'success' => false,
                'status'  => 'invalid_phone',
                'message' => 'Invalid or missing phone number.',
            ];
        }

        $settings = WhatsAppSetting::forGym($gymId);
        $waLink = "https://api.whatsapp.com/send?phone={$cleanPhone}&text=" . urlencode($message);

        if (!$settings->is_enabled) {
            return [
                'success' => true,
                'status'  => 'disabled',
                'wa_link' => $waLink,
                'note'    => 'WhatsApp automation is currently paused in settings.',
            ];
        }

        $provider = strtolower($settings->provider ?? 'ultramsg');

        // 1. UltraMsg REST API Gateway
        if ($provider === 'ultramsg' && !empty($settings->instance_id) && !empty($settings->api_token)) {
            try {
                $endpoint = "https://api.ultramsg.com/" . trim($settings->instance_id) . "/messages/chat";
                $response = Http::timeout(10)->asForm()->post($endpoint, [
                    'token' => trim($settings->api_token),
                    'to'    => '+' . $cleanPhone,
                    'body'  => $message,
                ]);

                $json = $response->json();
                $isSent = $response->successful() && (!isset($json['error']) || empty($json['error']));

                return [
                    'success'  => $isSent,
                    'status'   => $isSent ? 'sent' : 'failed',
                    'provider' => 'ultramsg',
                    'response' => $json,
                    'wa_link'  => $waLink,
                ];
            } catch (\Throwable $e) {
                Log::warning("UltraMsg WhatsApp dispatch failed: " . $e->getMessage());
                return [
                    'success'  => false,
                    'status'   => 'gateway_error',
                    'provider' => 'ultramsg',
                    'error'    => $e->getMessage(),
                    'wa_link'  => $waLink,
                ];
            }
        }

        // 2. Meta WhatsApp Business Cloud API
        if ($provider === 'meta' && !empty($settings->phone_number_id) && !empty($settings->api_token)) {
            try {
                $endpoint = "https://graph.facebook.com/v19.0/" . trim($settings->phone_number_id) . "/messages";
                $response = Http::timeout(10)
                    ->withToken(trim($settings->api_token))
                    ->post($endpoint, [
                        'messaging_product' => 'whatsapp',
                        'recipient_type'    => 'individual',
                        'to'                => $cleanPhone,
                        'type'              => 'text',
                        'text'              => [
                            'preview_url' => false,
                            'body'        => $message,
                        ],
                    ]);

                $isSent = $response->successful();
                return [
                    'success'  => $isSent,
                    'status'   => $isSent ? 'sent' : 'failed',
                    'provider' => 'meta',
                    'response' => $response->json(),
                    'wa_link'  => $waLink,
                ];
            } catch (\Throwable $e) {
                Log::warning("Meta WhatsApp Cloud dispatch failed: " . $e->getMessage());
                return [
                    'success'  => false,
                    'status'   => 'gateway_error',
                    'provider' => 'meta',
                    'error'    => $e->getMessage(),
                    'wa_link'  => $waLink,
                ];
            }
        }

        // 3. MSG91 (Message91) WhatsApp API
        if ($provider === 'msg91' && !empty($settings->api_token) && !empty($settings->phone_number_id)) {
            try {
                $endpoint = !empty($settings->api_url)
                    ? trim($settings->api_url)
                    : "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";

                $cleanIntegratedNumber = preg_replace('/\D/', '', $settings->phone_number_id);

                $response = Http::timeout(12)
                    ->withHeaders([
                        'authkey'      => trim($settings->api_token),
                        'Content-Type' => 'application/json',
                    ])
                    ->post($endpoint, [
                        'integrated_number' => $cleanIntegratedNumber,
                        'content_type'      => 'text',
                        'payload'           => [
                            'to'   => $cleanPhone,
                            'text' => $message,
                        ],
                    ]);

                $json = $response->json();
                $isSent = $response->successful() && (!isset($json['status']) || $json['status'] === 'success' || (isset($json['type']) && $json['type'] === 'success'));

                return [
                    'success'  => $isSent,
                    'status'   => $isSent ? 'sent' : 'failed',
                    'provider' => 'msg91',
                    'response' => $json,
                    'wa_link'  => $waLink,
                ];
            } catch (\Throwable $e) {
                Log::warning("MSG91 WhatsApp dispatch failed: " . $e->getMessage());
                return [
                    'success'  => false,
                    'status'   => 'gateway_error',
                    'provider' => 'msg91',
                    'error'    => $e->getMessage(),
                    'wa_link'  => $waLink,
                ];
            }
        }

        // 4. Custom REST Webhook Gateway
        if ($provider === 'custom' && !empty($settings->api_url)) {
            try {
                $headers = [];
                if (!empty($settings->api_token)) {
                    $headers['Authorization'] = 'Bearer ' . trim($settings->api_token);
                }
                $response = Http::timeout(10)->withHeaders($headers)->post($settings->api_url, [
                    'phone'   => $cleanPhone,
                    'to'      => $cleanPhone,
                    'message' => $message,
                    'body'    => $message,
                ]);

                $isSent = $response->successful();
                return [
                    'success'  => $isSent,
                    'status'   => $isSent ? 'sent' : 'failed',
                    'provider' => 'custom',
                    'response' => $response->json(),
                    'wa_link'  => $waLink,
                ];
            } catch (\Throwable $e) {
                Log::warning("Custom WhatsApp Webhook dispatch failed: " . $e->getMessage());
                return [
                    'success'  => false,
                    'status'   => 'gateway_error',
                    'provider' => 'custom',
                    'error'    => $e->getMessage(),
                    'wa_link'  => $waLink,
                ];
            }
        }

        // 4. Default / Simulated fallback (Gateway keys not entered yet)
        return [
            'success'  => true,
            'status'   => 'ready_for_dispatch',
            'provider' => 'manual_or_simulated',
            'note'     => 'No gateway credentials entered yet. Prepared with direct 1-click WhatsApp link.',
            'wa_link'  => $waLink,
        ];
    }

    /**
     * Send automatic Welcome WhatsApp notification when a new member joins.
     */
    public static function sendWelcomeMessage(User $user, ?MemberProfile $profile = null, ?int $gymId = null): array
    {
        $gymId = $gymId ?: ($user->gym_id ?: 1);
        $settings = WhatsAppSetting::forGym($gymId);

        if (!$settings->auto_send_welcome || !$settings->is_enabled) {
            return ['dispatched' => false, 'reason' => 'Auto-welcome disabled'];
        }

        $gym = Gym::find($gymId);
        $gymName = $gym ? $gym->name : (GymSetting::first()?->name ?? 'PulseFit Pro');
        $portalUrl = config('app.url', 'https://archfit.archenterprises.co.in');

        // Locate active welcome template
        $template = WhatsAppTemplate::where('category', 'welcome')
            ->where('is_active', true)
            ->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            })
            ->first();

        $messageBody = $template?->message_body ?: 
            "*Welcome to the {{gym_name}} Family, {{name}}!*\n\n" .
            "We are thrilled to accompany you on your fitness journey! Your *{{plan_name}}* membership is now active.\n\n" .
            "Quick Gym Guide:\n" .
            "• Turnstile QR Code: {{qr_pass_code}}\n" .
            "• Operating Hours: Mon-Sat 5:30 AM - 11:00 PM | Sun 6:00 AM - 8:00 PM\n" .
            "• Locker & Shower Amenities: Included\n" .
            "• Access Portal: {{portal_url}}\n\n" .
            "See you on the gym floor! Let's crush your goals together!";

        $planName = $profile?->plan?->name ?: 'Gym Membership';
        $expDate = $profile?->expiry_date ? Carbon::parse($profile->expiry_date)->format('d M Y') : 'Active';

        $rendered = self::renderMessage($messageBody, [
            'name'         => $user->name,
            'gym_name'     => $gymName,
            'role'         => 'Member',
            'phone'        => $user->phone,
            'plan_name'    => $planName,
            'expiry_date'  => $expDate,
            'portal_url'   => $portalUrl,
            'qr_pass_code' => $profile?->qr_pass_code ?? '',
            'date'         => Carbon::today()->format('d M Y'),
        ]);

        $dispatchResult = self::dispatchViaGateway($user->phone ?? '', $rendered, $gymId);

        // Store log in database
        $log = WhatsAppLog::create([
            'gym_id'          => $gymId,
            'template_id'     => $template?->id,
            'recipient_id'    => $user->id,
            'recipient_name'  => $user->name,
            'recipient_phone' => $user->phone ?? '',
            'recipient_role'  => 'member',
            'category'        => 'welcome',
            'message'         => $rendered,
            'status'          => $dispatchResult['status'] === 'failed' ? 'failed' : 'sent',
            'channel'         => !empty($dispatchResult['provider']) && $dispatchResult['provider'] !== 'manual_or_simulated' ? $dispatchResult['provider'] : 'whatsapp_web',
            'trigger_type'    => 'automated_welcome',
            'sent_at'         => Carbon::now(),
        ]);

        return [
            'dispatched'      => true,
            'log_id'          => $log->id,
            'recipient_name'  => $user->name,
            'recipient_phone' => $user->phone,
            'message'         => $rendered,
            'wa_link'         => $dispatchResult['wa_link'] ?? null,
            'gateway_status'  => $dispatchResult['status'] ?? 'sent',
        ];
    }

    /**
     * Send automatic Birthday greeting to a member or coach.
     */
    public static function sendBirthdayGreeting(User $user, $profile, ?int $gymId = null, string $role = 'member'): array
    {
        $gymId = $gymId ?: ($user->gym_id ?: 1);
        $settings = WhatsAppSetting::forGym($gymId);

        if (!$settings->auto_send_birthday || !$settings->is_enabled) {
            return ['dispatched' => false, 'reason' => 'Auto-birthday disabled'];
        }

        $today = Carbon::today();
        $cleanPhone = self::cleanPhone($user->phone ?? '');

        // Check if already greeted today to prevent duplicate greetings
        $alreadySent = WhatsAppLog::where(function ($q) use ($cleanPhone, $user) {
                $q->where('recipient_phone', $cleanPhone)
                  ->orWhere('recipient_phone', $user->phone)
                  ->orWhere('recipient_id', $user->id);
            })
            ->where('category', 'birthday')
            ->whereDate('sent_at', $today->toDateString())
            ->exists();

        if ($alreadySent) {
            return ['dispatched' => false, 'reason' => 'Already greeted today'];
        }

        $gym = Gym::find($gymId);
        $gymName = $gym ? $gym->name : (GymSetting::first()?->name ?? 'PulseFit Pro');
        $portalUrl = config('app.url', 'https://archfit.archenterprises.co.in');

        // Locate active birthday template
        $template = WhatsAppTemplate::where('category', 'birthday')
            ->where('is_active', true)
            ->where(function ($q) use ($role) {
                $q->where('target_role', $role)
                  ->orWhere('target_role', 'all');
            })
            ->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            })
            ->first();

        $defaultMsg = ($role === 'trainer')
            ? "*Happy Birthday Coach {{name}}!*\n\nThank you for inspiring, coaching, and empowering our members every single day at *{{gym_name}}*! Have a phenomenal celebration!"
            : "*Happy Birthday {{name}}!*\n\nWishing you strength, great health, and limitless PRs this year from all of us at *{{gym_name}}*! Drop by reception today for a special birthday workout perk! Enjoy your day!";

        $messageBody = $template?->message_body ?: $defaultMsg;

        $dobFormatted = $profile?->dob ? Carbon::parse($profile->dob)->format('d M Y') : null;
        $age = $profile?->dob ? Carbon::parse($profile->dob)->age : ($profile?->age ?? null);
        $planName = $profile?->plan?->name ?? 'Membership';

        $rendered = self::renderMessage($messageBody, [
            'name'       => $user->name,
            'gym_name'   => $gymName,
            'role'       => ucfirst($role),
            'phone'      => $user->phone,
            'plan_name'  => $planName,
            'portal_url' => $portalUrl,
            'age'        => (string) $age,
            'dob'        => (string) $dobFormatted,
            'date'       => $today->format('d M Y'),
        ]);

        $dispatchResult = self::dispatchViaGateway($user->phone ?? '', $rendered, $gymId);

        $log = WhatsAppLog::create([
            'gym_id'          => $gymId,
            'template_id'     => $template?->id,
            'recipient_id'    => $user->id,
            'recipient_name'  => $user->name,
            'recipient_phone' => $user->phone ?? '',
            'recipient_role'  => $role,
            'category'        => 'birthday',
            'message'         => $rendered,
            'status'          => $dispatchResult['status'] === 'failed' ? 'failed' : 'sent',
            'channel'         => !empty($dispatchResult['provider']) && $dispatchResult['provider'] !== 'manual_or_simulated' ? $dispatchResult['provider'] : 'whatsapp_web',
            'trigger_type'    => 'automated_birthday',
            'sent_at'         => Carbon::now(),
        ]);

        return [
            'dispatched'      => true,
            'log_id'          => $log->id,
            'recipient_name'  => $user->name,
            'recipient_phone' => $user->phone,
            'role'            => $role,
            'age'             => $age,
            'message'         => $rendered,
            'wa_link'         => $dispatchResult['wa_link'] ?? null,
            'gateway_status'  => $dispatchResult['status'] ?? 'sent',
        ];
    }

    /**
     * Scan the database for all birthdays today (members + trainers) and auto-dispatch wishes.
     */
    public static function processDailyBirthdayGreetings(?int $gymId = null): array
    {
        $today = Carbon::today();
        $todayMonth = (int) $today->format('m');
        $todayDay   = (int) $today->format('d');

        $dispatched = [];

        // 1. Scan Members celebrating birthdays today
        $memberQuery = MemberProfile::with(['user', 'plan'])
            ->whereNotNull('dob')
            ->where('dob', '!=', '')
            ->whereMonth('dob', $todayMonth)
            ->whereDay('dob', $todayDay);

        if ($gymId) {
            $memberQuery->whereHas('user', function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            });
        }

        $memberBirthdays = $memberQuery->get();

        foreach ($memberBirthdays as $mp) {
            $user = $mp->user;
            if (!$user || !$user->phone) continue;

            $result = self::sendBirthdayGreeting($user, $mp, $gymId, 'member');
            if (!empty($result['dispatched'])) {
                $dispatched[] = $result;
            }
        }

        // 2. Scan Trainers celebrating birthdays today
        $trainerQuery = TrainerProfile::with('user')
            ->whereNotNull('dob')
            ->where('dob', '!=', '')
            ->whereMonth('dob', $todayMonth)
            ->whereDay('dob', $todayDay);

        if ($gymId) {
            $trainerQuery->whereHas('user', function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            });
        }

        $trainerBirthdays = $trainerQuery->get();

        foreach ($trainerBirthdays as $tp) {
            $user = $tp->user;
            if (!$user || !$user->phone) continue;

            $result = self::sendBirthdayGreeting($user, $tp, $gymId, 'trainer');
            if (!empty($result['dispatched'])) {
                $dispatched[] = $result;
            }
        }

        return [
            'count'      => count($dispatched),
            'dispatched' => $dispatched,
            'timestamp'  => Carbon::now()->toIso8601String(),
        ];
    }
}
