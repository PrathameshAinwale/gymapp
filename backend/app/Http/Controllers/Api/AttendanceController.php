<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\MemberProfile;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public const TIMEZONE = 'Asia/Kolkata';

    public function index(Request $request)
    {
        // Auto check-out members and staff whose workout or shift has ended (throttled to 30 seconds)
        if (\Illuminate\Support\Facades\Cache::add('attendance_auto_checkout_lock', true, Carbon::now(self::TIMEZONE)->addSeconds(30))) {
            $this->autoCheckOutOverdueMembers();
        }

        $gymId = $this->resolveGymId($request);

        $query = Attendance::with('user.memberProfile.plan');

        if ($request->has('date') && $request->query('date') !== 'all') {
            $query->whereDate('date', $request->query('date'));
        }

        if ($gymId) {
            $query->whereHas('user', function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }

        $attendances = $query->latest('date')
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(function ($att) {
                $tz = self::TIMEZONE;

                // Duration: calculate from check_in_time and punch_out_time or check_out_time
                $duration = $att->duration ?? '--';
                if (!$att->duration && $att->check_in_time && ($att->punch_out_time ?? $att->check_out_time)) {
                    $outTime = $att->punch_out_time ?? $att->check_out_time;
                    try {
                        $dateStr = $att->date instanceof \Illuminate\Support\Carbon ? $att->date->toDateString() : (string)$att->date;
                        $in   = Carbon::parse($dateStr . ' ' . $att->check_in_time, $tz);
                        $out  = Carbon::parse($dateStr . ' ' . $outTime, $tz);
                        $mins = max(0, $in->diffInMinutes($out));
                        $h    = intdiv($mins, 60);
                        $m    = $mins % 60;
                        $duration = $h > 0 ? "{$h}h {$m}m" : "{$m}m";
                    } catch (\Throwable $e) {}
                }

                $isStaff = $att->user && $att->user->role !== 'member';
                $roleLabel = $att->user ? (method_exists($att->user, 'gymRole') && $att->user->gymRole ? $att->user->gymRole->name : ucfirst($att->user->role)) : 'Staff';
                $planName = $att->plan_name;
                if (!$planName) {
                    $planName = $isStaff ? $roleLabel : ($att->user?->memberProfile?->plan?->name ?? 'Active Plan');
                }

                $formatTime = function ($timeStr) use ($tz) {
                    if (!$timeStr || $timeStr === '--' || $timeStr === 'null') return '--';
                    try {
                        return Carbon::parse($timeStr, $tz)->format('h:i A');
                    } catch (\Throwable $e) {
                        return date('h:i A', strtotime($timeStr));
                    }
                };

                $currentDate = Carbon::now($tz)->toDateString();

                return [
                    'id'           => 'att-' . $att->id,
                    'memberId'     => ($isStaff ? 'stf-' : 'mem-') . $att->user_id,
                    'userId'       => $att->user_id,
                    'role'         => $att->user?->role ?? 'member',
                    'memberName'   => $att->member_name ?? $att->user?->name ?? 'Unknown Member',
                    'avatar'       => $att->member_avatar ?? $att->user?->avatar,
                    'planName'     => $planName,
                    'checkInTime'  => $formatTime($att->check_in_time),
                    'checkOutTime' => $formatTime($att->check_out_time),
                    'punchOutTime' => $formatTime($att->punch_out_time),
                    'duration'     => $duration,
                    'date'         => $att->date ? $att->date->format('Y-m-d') : $currentDate,
                    'rawDate'      => $att->date ? $att->date->format('Y-m-d') : $currentDate,
                    'displayDate'  => $att->date ? ($att->date->isToday() ? 'Today' : $att->date->format('d M Y')) : 'Today',
                    'status'       => $att->status,
                    'gate'         => $att->gate,
                ];
            });

        return response()->json([
            'success'           => true,
            'data'              => $attendances,
            'activeInsideCount' => $attendances->where('status', 'Inside Gym')->count(),
        ]);
    }

    public function checkIn(Request $request)
    {
        $input = $request->all();
        if (!isset($input['user_id']) && isset($input['member_id'])) {
            $input['user_id'] = $input['member_id'];
            $request->merge($input);
        }

        $validator = Validator::make($request->all(), [
            'qr_code'   => 'required_without_all:user_id,member_id,staff_id|string',
            'user_id'   => 'required_without:qr_code',
            'member_id' => 'sometimes',
            'staff_id'  => 'sometimes',
            'gate'      => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = null;
        if ($request->filled('qr_code')) {
            $code = $request->qr_code;
            $profile = MemberProfile::where('qr_pass_code', $code)->first();
            if ($profile) {
                $user = $profile->user;
            } else {
                // If the QR string was actually a member or staff ID
                $numericId = (int)preg_replace('/[^0-9]/', '', (string)$code);
                if ($numericId > 0) {
                    $user = User::find($numericId);
                }
            }
        }

        if (!$user && ($request->filled('user_id') || $request->filled('member_id') || $request->filled('staff_id'))) {
            $rawId = $request->user_id ?? $request->member_id ?? $request->staff_id;
            // Check if it matches QR code first
            $profile = MemberProfile::where('qr_pass_code', $rawId)->first();
            if ($profile) {
                $user = $profile->user;
            } else {
                $numericId = (int)preg_replace('/[^0-9]/', '', (string)$rawId);
                $user = User::find($numericId);
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid QR Code, Staff ID, or Member ID not found'
            ], 404);
        }

        $isStaff = $user->role !== 'member';
        $profile = $user->memberProfile;

        if (!$isStaff && $profile && $profile->status === 'Expired') {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: Membership package has expired. Please renew.'
            ], 403);
        }

        $tz = self::TIMEZONE;
        $now = Carbon::now($tz);

        $existing = Attendance::where('user_id', $user->id)
            ->whereDate('date', $now->toDateString())
            ->whereIn('status', ['Inside Gym', 'On Duty'])
            ->first();

        if ($existing) {
            $existingInTime = $existing->check_in_time ? Carbon::parse($existing->check_in_time, $tz)->format('h:i A') : $existing->check_in_time;
            return response()->json([
                'success'       => true,
                'alreadyInside' => true,
                'message'       => "{$user->name} is already punched in at {$existingInTime}",
                'attendance'    => $existing,
            ]);
        }

        $roleLabel = method_exists($user, 'gymRole') && $user->gymRole ? $user->gymRole->name : ucfirst($user->role);
        $planName = $isStaff ? $roleLabel : ($profile?->plan?->name ?? 'Active Plan');
        $status = $isStaff ? 'On Duty' : 'Inside Gym';
        $gate = $request->gate ?? ($isStaff ? 'Staff Gate / Reception' : 'Main Turnstile A');

        $timeStr = $now->format('H:i:s');
        $dateStr = $now->toDateString();

        $attendance = Attendance::create([
            'user_id'       => $user->id,
            'member_name'   => $user->name,
            'member_avatar' => $user->avatar,
            'plan_name'     => $planName,
            'check_in_time' => $timeStr,
            'date'          => $dateStr,
            'status'        => $status,
            'gate'          => $gate,
        ]);

        if ($profile) {
            $profile->increment('attendance_streak');
            $profile->last_check_in = $now;
            $profile->save();
        }

        return response()->json([
            'success' => true,
            'message' => $isStaff ? "Shift Punch-In recorded for {$user->name} ({$roleLabel})." : "Access Granted! Welcome to PulseFit, {$user->name}.",
            'member'  => [
                'id'     => ($isStaff ? 'stf-' : 'mem-') . $user->id,
                'name'   => $user->name,
                'plan'   => $planName,
                'role'   => $user->role,
                'streak' => $profile?->attendance_streak,
            ],
            'attendance' => $attendance,
        ]);
    }

    public function checkOut(Request $request, $id = null)
    {
        $id = $id ?? $request->input('attendance_id') ?? $request->input('id');
        if (!$id) {
            return response()->json(['success' => false, 'message' => 'Attendance ID is required.'], 422);
        }

        $numericId  = (int)preg_replace('/[^0-9]/', '', (string)$id);
        $attendance = Attendance::findOrFail($numericId);

        $tz = self::TIMEZONE;
        $now = Carbon::now($tz);
        $punchOutTime = $now->format('H:i:s');
        $duration     = '--';

        // Calculate workout / shift duration from check-in to punch-out
        if ($attendance->check_in_time) {
            try {
                $dateStr = $attendance->date instanceof Carbon ? $attendance->date->toDateString() : (string)$attendance->date;
                $in   = Carbon::parse($dateStr . ' ' . $attendance->check_in_time, $tz);
                $out  = Carbon::parse($dateStr . ' ' . $punchOutTime, $tz);
                $mins = max(0, $in->diffInMinutes($out));
                $h    = intdiv($mins, 60);
                $m    = $mins % 60;
                $duration = $h > 0 ? "{$h}h {$m}m" : "{$m}m";
            } catch (\Throwable $e) {}
        }

        $isStaff = ($attendance->user && $attendance->user->role !== 'member') || $attendance->status === 'On Duty';
        $newStatus = $isStaff ? 'Completed Shift' : 'Completed';

        $attendance->update([
            'check_out_time' => $punchOutTime,
            'punch_out_time' => $punchOutTime,
            'duration'       => $duration,
            'status'         => $newStatus,
        ]);

        return response()->json([
            'success'    => true,
            'message'    => ($isStaff ? 'Shift punched out successfully. Total shift duration: ' : 'Checked out successfully. Workout duration: ') . $duration,
            'punch_out'  => $now->format('h:i A'),
            'duration'   => $duration,
            'attendance' => $attendance,
        ]);
    }

    /**
     * Parse shift timings from string like "Morning Shift (06:00 AM - 02:00 PM)" or "06:00 AM - 02:00 PM"
     */
    public static function parseShiftTimings(?string $shiftString): ?array
    {
        if (empty($shiftString)) return null;

        // 1. Prefer timing inside parentheses: (06:00 AM - 02:00 PM)
        if (preg_match('/\(\s*([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)\s*[-–to]+\s*([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)\s*\)/i', $shiftString, $m)) {
            return [
                'start' => trim($m[1]),
                'end'   => trim($m[2]),
            ];
        }

        // 2. Direct range without parentheses: 06:00 AM - 02:00 PM or 06:00 - 14:00
        if (preg_match('/([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)\s*[-–to]+\s*([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)/i', $shiftString, $m)) {
            return [
                'start' => trim($m[1]),
                'end'   => trim($m[2]),
            ];
        }

        return null;
    }

    /**
     * Resolve exact shift end Carbon datetime for a staff member.
     */
    public static function resolveStaffShiftEnd($user, $attDate, $checkInTime, string $tz = self::TIMEZONE): ?Carbon
    {
        if (!$user) return null;
        $dateStr = $attDate instanceof Carbon ? $attDate->toDateString() : (string)$attDate;
        $checkInDateTime = Carbon::parse($dateStr . ' ' . $checkInTime, $tz);

        // 1. Check user->shifts string for embedded timings (e.g. "Morning (06:00 AM - 02:00 PM)")
        $rawShift = $user->shifts ?? null;
        if (!empty($rawShift)) {
            $parsed = self::parseShiftTimings($rawShift);
            if ($parsed && !empty($parsed['end'])) {
                try {
                    $shiftEnd = Carbon::parse($dateStr . ' ' . $parsed['end'], $tz);
                    if ($shiftEnd->lessThan($checkInDateTime)) {
                        $shiftEnd->addDay();
                    }
                    return $shiftEnd;
                } catch (\Throwable $e) {}
            }

            // 2. Lookup by shift name or ID in shifts table
            try {
                $cleanShiftName = trim(preg_replace('/\s*\(.*?\)/', '', $rawShift));
                $shiftQuery = Shift::where('is_active', true);
                if ($user->gym_id) {
                    $shiftQuery->where('gym_id', $user->gym_id);
                }
                $shiftRecord = $shiftQuery->where(function ($q) use ($cleanShiftName, $rawShift) {
                    $q->where('name', $cleanShiftName)
                      ->orWhere('name', 'like', "%{$cleanShiftName}%")
                      ->orWhere('id', (int)preg_replace('/[^0-9]/', '', (string)$rawShift));
                })->first();

                if ($shiftRecord && !empty($shiftRecord->timings)) {
                    $timings = is_array($shiftRecord->timings) ? $shiftRecord->timings : json_decode($shiftRecord->timings, true);
                    if (is_array($timings)) {
                        $endTimeStr = null;
                        foreach ($timings as $t) {
                            if (!empty($t['end_time'])) {
                                $endTimeStr = $t['end_time'];
                                break;
                            }
                        }
                        if ($endTimeStr) {
                            $shiftEnd = Carbon::parse($dateStr . ' ' . $endTimeStr, $tz);
                            if ($shiftEnd->lessThan($checkInDateTime)) {
                                $shiftEnd->addDay();
                            }
                            return $shiftEnd;
                        }
                    }
                }
            } catch (\Throwable $e) {}
        }

        // 3. Fallback: check all active shifts in the gym to see if checkInTime matches a shift start
        try {
            $gymShifts = Shift::where('is_active', true)
                ->when($user->gym_id, fn($q) => $q->where('gym_id', $user->gym_id))
                ->get();

            foreach ($gymShifts as $sh) {
                $timings = is_array($sh->timings) ? $sh->timings : json_decode($sh->timings, true);
                if (is_array($timings)) {
                    foreach ($timings as $t) {
                        if (!empty($t['start_time']) && !empty($t['end_time'])) {
                            $tStart = Carbon::parse($dateStr . ' ' . $t['start_time'], $tz);
                            $tEnd = Carbon::parse($dateStr . ' ' . $t['end_time'], $tz);
                            if ($tEnd->lessThan($tStart)) $tEnd->addDay();
                            if (abs($checkInDateTime->diffInMinutes($tStart, false)) <= 120) {
                                return $tEnd;
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {}

        // 4. Default 8 hours shift after check-in
        return $checkInDateTime->copy()->addHours(8);
    }

    /**
     * Automatically check out members and staff whose shift or gym session has ended.
     */
    public function autoCheckOutOverdueMembers(): int
    {
        try {
            $tz = self::TIMEZONE;
            $now = Carbon::now($tz);
            $updatedCount = 0;

            // Load configured settings
            $settings = \App\Http\Controllers\Api\GymSettingController::getDefaultPayrollAttendanceSettings();
            $gymSetting = \App\Models\GymSetting::first();
            if ($gymSetting && !empty($gymSetting->payroll_attendance_settings)) {
                $parsed = is_string($gymSetting->payroll_attendance_settings) ? json_decode($gymSetting->payroll_attendance_settings, true) : $gymSetting->payroll_attendance_settings;
                if (is_array($parsed)) $settings = array_replace_recursive($settings, $parsed);
            }

            // 1. Members Auto Check-Out (default 2 hours max workout)
            $memberSettings = $settings['member'] ?? ['auto_checkout' => true, 'auto_checkout_hours' => 2];
            if (!empty($memberSettings['auto_checkout'])) {
                $maxHours = (float)($memberSettings['auto_checkout_hours'] ?? 2);
                $maxMinutes = (int)($maxHours * 60);

                $activeMembers = Attendance::with('user')->where('status', 'Inside Gym')
                    ->whereNull('check_out_time')
                    ->whereHas('user', function ($q) {
                        $q->where('role', 'member');
                    })
                    ->get();

                foreach ($activeMembers as $att) {
                    if (!$att->check_in_time || !$att->date) continue;
                    $dateStr = $att->date instanceof Carbon ? $att->date->toDateString() : (string)$att->date;
                    $checkInDateTime = Carbon::parse($dateStr . ' ' . $att->check_in_time, $tz);

                    if ($checkInDateTime->diffInMinutes($now, false) >= $maxMinutes) {
                        $autoOutTime = $checkInDateTime->copy()->addMinutes($maxMinutes);
                        $outTimeStr = $autoOutTime->format('H:i:s');
                        $durationStr = $maxHours >= 1 ? (floor($maxHours) == $maxHours ? "{$maxHours}h 0m" : round($maxHours, 1) . "h") : "{$maxMinutes}m";

                        $att->update([
                            'check_out_time' => $outTimeStr,
                            'punch_out_time' => $outTimeStr,
                            'duration'       => $durationStr,
                            'status'         => 'Completed',
                        ]);
                        $updatedCount++;
                    }
                }
            }

            // 2. Staff Auto Check-Out (When staff shift ends, automatically punch them out at exact shift end)
            $activeStaff = Attendance::with(['user'])->where('status', 'On Duty')
                ->whereNull('check_out_time')
                ->whereHas('user', function ($q) {
                    $q->where('role', '!=', 'member');
                })
                ->get();

            foreach ($activeStaff as $att) {
                if (!$att->check_in_time || !$att->date) continue;
                $dateStr = $att->date instanceof Carbon ? $att->date->toDateString() : (string)$att->date;
                $checkInDateTime = Carbon::parse($dateStr . ' ' . $att->check_in_time, $tz);

                $shiftEnd = self::resolveStaffShiftEnd($att->user, $att->date, $att->check_in_time, $tz);
                if ($shiftEnd && $now->greaterThanOrEqualTo($shiftEnd)) {
                    $outTimeStr = $shiftEnd->format('H:i:s');
                    $mins = max(1, $checkInDateTime->diffInMinutes($shiftEnd));
                    $h = floor($mins / 60);
                    $m = $mins % 60;
                    $durationStr = $h > 0 ? "{$h}h {$m}m" : "{$mins}m";

                    $att->update([
                        'check_out_time' => $outTimeStr,
                        'punch_out_time' => $outTimeStr,
                        'duration'       => $durationStr,
                        'status'         => 'Completed Shift',
                    ]);
                    $updatedCount++;
                    continue;
                }

                // Safety fallback: if checked in over 12 hours ago
                if ($checkInDateTime->diffInHours($now, false) >= 12) {
                    $fallbackEnd = $checkInDateTime->copy()->addHours(8);
                    $outTimeStr = $fallbackEnd->format('H:i:s');
                    $att->update([
                        'check_out_time' => $outTimeStr,
                        'punch_out_time' => $outTimeStr,
                        'duration'       => '8h 0m',
                        'status'         => 'Completed Shift',
                    ]);
                    $updatedCount++;
                }
            }

            return $updatedCount;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Auto check-out error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Trigger auto check-out endpoint.
     */
    public function triggerAutoCheckOut(Request $request)
    {
        $count = $this->autoCheckOutOverdueMembers();
        return response()->json([
            'success' => true,
            'message' => "Auto check-out executed. {$count} records updated.",
            'updated' => $count
        ]);
    }
}
