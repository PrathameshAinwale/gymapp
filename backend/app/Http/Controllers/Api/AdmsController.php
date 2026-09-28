<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\BiometricDevice;
use App\Models\BiometricLog;
use App\Models\MemberProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class AdmsController extends Controller
{
    /**
     * Handle eSSL / ZKTeco ADMS cdata endpoint:
     * - GET:  Device Handshake / Device Registration / Options query
     * - POST: Attendance Punch Upload (table=ATTLOG) & Operations
     */
    public function cdata(Request $request)
    {
        $sn = $request->query('SN', $request->query('sn', 'UNKNOWN-SN'));
        $table = strtoupper($request->query('table', ''));
        $deviceIp = $request->ip();

        // Ensure or update BiometricDevice record
        $device = $this->resolveDevice($sn, $deviceIp);

        // ── 1. GET Request: Handshake & Configuration ──
        if ($request->isMethod('get')) {
            // ADMS handshake response telling the device server parameters
            $responseContent = "GET OPTION FROM: {$sn}\n" .
                "Stamp=9999\n" .
                "OpStamp=9999\n" .
                "PhotoStamp=9999\n" .
                "ErrorDelay=30\n" .
                "Delay=10\n" .
                "TransTimes=00:00;14:05\n" .
                "TransInterval=1\n" .
                "TransFlag=1111000000\n" .
                "Realtime=1\n" .
                "Encrypt=0\n";

            return response($responseContent, 200)
                ->header('Content-Type', 'text/plain');
        }

        // ── 2. POST Request: Data Push (Attendance / Operations) ──
        $rawContent = $request->getContent();
        if (empty($rawContent)) {
            $rawContent = file_get_contents('php://input');
        }

        Log::info("[ADMS POST] SN: {$sn}, Table: {$table}", ['payload' => substr($rawContent, 0, 500)]);

        $processedCount = 0;

        // Process Attendance Log punches
        if ($table === 'ATTLOG' || empty($table)) {
            $lines = preg_split('/[\r\n]+/', trim($rawContent));
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) continue;

                $success = $this->processPunchLine($line, $device, $deviceIp);
                if ($success) {
                    $processedCount++;
                }
            }
        }

        if ($device) {
            $device->update([
                'last_sync' => 'Just now (ADMS Push)',
                'total_punches_today' => ($device->total_punches_today ?? 0) + $processedCount,
                'status' => 'Connected & Online',
                'ip_address' => $deviceIp,
            ]);
        }

        // ADMS protocol requires "OK" or "OK: <count>" to acknowledge receipt
        $ack = $processedCount > 0 ? "OK: {$processedCount}" : "OK";
        return response($ack, 200)->header('Content-Type', 'text/plain');
    }

    /**
     * Handle Heartbeat / Command Request from eSSL device
     * GET /iclock/getrequest?SN=...
     */
    public function getrequest(Request $request)
    {
        $sn = $request->query('SN', $request->query('sn', 'UNKNOWN-SN'));
        $deviceIp = $request->ip();

        $device = $this->resolveDevice($sn, $deviceIp);
        if ($device) {
            $device->update([
                'last_sync' => 'Just now (Heartbeat)',
                'status' => 'Connected & Online',
                'ip_address' => $deviceIp,
            ]);
        }

        // Return "OK" indicating no pending command or commands if available
        return response("OK", 200)->header('Content-Type', 'text/plain');
    }

    /**
     * Handle Command Acknowledgment from eSSL device
     * POST /iclock/devicecmd?SN=...
     */
    public function devicecmd(Request $request)
    {
        return response("OK", 200)->header('Content-Type', 'text/plain');
    }

    /**
     * Manual / Test Biometric Punch Endpoint
     * Can be called from the Web UI or a test script:
     * POST /api/v1/attendance/biometric-punch
     */
    public function manualPunch(Request $request)
    {
        $request->validate([
            'pin' => 'required',
            'time' => 'nullable|string',
            'sn' => 'nullable|string',
        ]);

        $pin = trim($request->input('pin'));
        $timeStr = $request->input('time', now()->toDateTimeString());
        $sn = $request->input('sn', 'eSSL-MANUAL-TEST');
        $deviceIp = $request->ip();

        $device = $this->resolveDevice($sn, $deviceIp);

        $line = "{$pin}\t{$timeStr}\t0\t1\t0\t0\t0";
        $success = $this->processPunchLine($line, $device, $deviceIp);

        if ($success) {
            if ($device) {
                $device->increment('total_punches_today');
                $device->update(['last_sync' => 'Just now (Manual Test)']);
            }

            return response()->json([
                'success' => true,
                'message' => "Biometric punch processed successfully for PIN {$pin}",
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Member not found for PIN {$pin}",
        ], 404);
    }

    /**
     * Parse a single ATTLOG punch line:
     * Standard ZKTeco/eSSL formats:
     * - Tab delimited: PIN \t Date Time \t Status \t VerifyType \t WorkCode \t Reserved1 \t Reserved2
     * - Space delimited: PIN Date Time Status VerifyType
     */
    protected function processPunchLine(string $line, ?BiometricDevice $device, string $deviceIp): bool
    {
        $parts = preg_split('/[\t\s]+/', $line);
        if (count($parts) < 2) {
            return false;
        }

        $pin = $parts[0];
        // Date and Time might be separate parts or combined
        $punchTime = null;
        if (isset($parts[1]) && isset($parts[2]) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $parts[1]) && preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $parts[2])) {
            $punchTime = Carbon::parse($parts[1] . ' ' . $parts[2]);
        } elseif (isset($parts[1])) {
            try {
                $punchTime = Carbon::parse($parts[1]);
            } catch (\Throwable $e) {
                $punchTime = now();
            }
        } else {
            $punchTime = now();
        }

        $dateStr = $punchTime->toDateString();
        $timeStr = $punchTime->toTimeString();

        // 1. Resolve Member / User
        $user = $this->findUserByPin($pin);
        if (!$user) {
            // Log unrecognized punch attempt
            BiometricLog::create([
                'gym_id' => $device?->gym_id ?? 1,
                'device_id' => 'bio-dev-' . ($device?->id ?? 1),
                'device_name' => $device?->name ?? 'eSSL Biometric Gate',
                'person_name' => "Unrecognized (PIN #{$pin})",
                'person_type' => 'Guest / Unknown',
                'verification_mode' => 'Biometric (Face/Finger)',
                'result' => 'Access Denied (Unregistered PIN)',
                'gate_trigger' => 'Gate Locked',
                'event_time' => $punchTime->format('h:i:s A'),
            ]);
            return false;
        }

        $profile = $user->memberProfile;

        // Check if membership is expired
        if ($profile && $profile->status === 'Expired') {
            BiometricLog::create([
                'gym_id' => $user->gym_id ?? $device?->gym_id ?? 1,
                'device_id' => 'bio-dev-' . ($device?->id ?? 1),
                'device_name' => $device?->name ?? 'eSSL Biometric Gate',
                'person_name' => $user->name,
                'person_type' => 'Member (Expired)',
                'verification_mode' => 'Biometric Verified',
                'result' => 'Access Denied (Membership Expired)',
                'gate_trigger' => 'Gate Locked',
                'event_time' => $punchTime->format('h:i:s A'),
            ]);
            return true; // Return true to acknowledge punch to machine, even though access was denied
        }

        // 2. Check if currently checked in today (Inside Gym)
        $existing = Attendance::where('user_id', $user->id)
            ->whereDate('date', $dateStr)
            ->where('status', 'Inside Gym')
            ->first();

        $deviceName = $device?->name ?? 'eSSL Biometric Turnstile';

        if ($existing) {
            // Member is already inside: Auto Check-Out
            $duration = '--';
            if ($existing->check_in_time) {
                try {
                    $in = Carbon::parse($existing->date . ' ' . $existing->check_in_time);
                    $out = Carbon::parse($dateStr . ' ' . $timeStr);
                    $mins = max(0, $in->diffInMinutes($out));
                    $h = intdiv($mins, 60);
                    $m = $mins % 60;
                    $duration = $h > 0 ? "{$h}h {$m}m" : "{$m}m";
                } catch (\Throwable $e) {}
            }

            $existing->update([
                'check_out_time' => $timeStr,
                'punch_out_time' => $timeStr,
                'duration' => $duration,
                'status' => 'Completed',
            ]);

            BiometricLog::create([
                'gym_id' => $user->gym_id ?? $device?->gym_id ?? 1,
                'device_id' => 'bio-dev-' . ($device?->id ?? 1),
                'device_name' => $deviceName,
                'person_name' => $user->name,
                'person_type' => 'Active Member',
                'verification_mode' => 'eSSL Biometric Punch-Out',
                'result' => 'Access Granted (Check-Out)',
                'gate_trigger' => 'Exit Turnstile Unlocked',
                'event_time' => $punchTime->format('h:i:s A'),
            ]);
        } else {
            // Member is entering: Record Check-In
            Attendance::create([
                'user_id' => $user->id,
                'member_name' => $user->name,
                'member_avatar' => $user->avatar,
                'plan_name' => $profile?->plan?->name ?? 'Active Plan',
                'check_in_time' => $timeStr,
                'date' => $dateStr,
                'status' => 'Inside Gym',
                'gate' => $deviceName,
            ]);

            if ($profile) {
                $profile->increment('attendance_streak');
                $profile->last_check_in = $punchTime;
                $profile->save();
            }

            BiometricLog::create([
                'gym_id' => $user->gym_id ?? $device?->gym_id ?? 1,
                'device_id' => 'bio-dev-' . ($device?->id ?? 1),
                'device_name' => $deviceName,
                'person_name' => $user->name,
                'person_type' => 'Active Member',
                'verification_mode' => 'eSSL Biometric Punch-In',
                'result' => 'Access Granted (Check-In)',
                'gate_trigger' => 'Entry Turnstile Unlocked',
                'event_time' => $punchTime->format('h:i:s A'),
            ]);
        }

        return true;
    }

    /**
     * Match biometric PIN to a User record
     */
    protected function findUserByPin(string $pin): ?User
    {
        $cleanPin = trim($pin);
        $cleanPinWithoutPrefix = str_replace(['mem-', 'user-'], '', $cleanPin);

        // 1. Direct ID match
        if (is_numeric($cleanPinWithoutPrefix)) {
            $user = User::find((int)$cleanPinWithoutPrefix);
            if ($user) return $user;
        }

        // 2. Match by qr_pass_code in member_profiles
        $profile = MemberProfile::where('qr_pass_code', $cleanPin)->first();
        if ($profile && $profile->user) {
            return $profile->user;
        }

        // 3. Match by phone number
        $user = User::where('phone', $cleanPin)->first();
        if ($user) return $user;

        return null;
    }

    /**
     * Find or auto-register BiometricDevice by Serial Number
     */
    protected function resolveDevice(string $sn, string $ip): ?BiometricDevice
    {
        if (empty($sn) || $sn === 'UNKNOWN-SN') {
            return BiometricDevice::first();
        }

        $device = BiometricDevice::where('serial_no', $sn)->first();
        if (!$device) {
            $device = BiometricDevice::create([
                'gym_id' => 1,
                'name' => "eSSL Biometric ({$sn})",
                'ip_address' => $ip,
                'serial_no' => $sn,
                'location' => 'Main Entrance',
                'status' => 'Connected & Online',
                'total_punches_today' => 0,
                'pulse_duration_sec' => 5,
                'last_sync' => 'Just now',
            ]);
        } else {
            $device->update([
                'ip_address' => $ip,
                'status' => 'Connected & Online',
            ]);
        }

        return $device;
    }
}
