<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\MemberProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        // Auto check-out members who have exceeded 2 hours
        $this->autoCheckOutOverdueMembers();

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
                // Duration: calculate from check_in_time and punch_out_time or check_out_time
                $duration = $att->duration ?? '--';
                if (!$att->duration && $att->check_in_time && ($att->punch_out_time ?? $att->check_out_time)) {
                    $outTime = $att->punch_out_time ?? $att->check_out_time;
                    try {
                        $dateStr = $att->date instanceof \Illuminate\Support\Carbon ? $att->date->toDateString() : (string)$att->date;
                        $in   = Carbon::parse($dateStr . ' ' . $att->check_in_time);
                        $out  = Carbon::parse($dateStr . ' ' . $outTime);
                        $mins = max(0, $in->diffInMinutes($out));
                        $h    = intdiv($mins, 60);
                        $m    = $mins % 60;
                        $duration = $h > 0 ? "{$h}h {$m}m" : "{$m}m";
                    } catch (\Throwable $e) {}
                }

                return [
                    'id'           => 'att-' . $att->id,
                    'memberId'     => 'mem-' . $att->user_id,
                    'userId'       => $att->user_id,
                    'role'         => $att->user?->role ?? 'member',
                    'memberName'   => $att->member_name ?? $att->user?->name ?? 'Unknown Member',
                    'avatar'       => $att->member_avatar ?? $att->user?->avatar,
                    'planName'     => $att->plan_name ?? $att->user?->memberProfile?->plan?->name ?? 'Active Plan',
                    'checkInTime'  => $att->check_in_time ? date('h:i A', strtotime($att->check_in_time)) : '--',
                    'checkOutTime' => $att->check_out_time ? date('h:i A', strtotime($att->check_out_time)) : '--',
                    'punchOutTime' => $att->punch_out_time ? date('h:i A', strtotime($att->punch_out_time)) : '--',
                    'duration'     => $duration,
                    'date'         => $att->date ? $att->date->format('Y-m-d') : now()->toDateString(),
                    'rawDate'      => $att->date ? $att->date->format('Y-m-d') : now()->toDateString(),
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
            'qr_code'   => 'required_without_all:user_id,member_id|string',
            'user_id'   => 'required_without:qr_code',
            'member_id' => 'sometimes',
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
                // If the QR string was actually a member ID
                $numericId = (int)str_replace('mem-', '', $code);
                if ($numericId > 0) {
                    $user = User::where('role', 'member')->find($numericId);
                }
            }
        }

        if (!$user && ($request->filled('user_id') || $request->filled('member_id'))) {
            $rawId = $request->user_id ?? $request->member_id;
            // Check if it matches QR code first
            $profile = MemberProfile::where('qr_pass_code', $rawId)->first();
            if ($profile) {
                $user = $profile->user;
            } else {
                $numericId = (int)str_replace('mem-', '', (string)$rawId);
                $user = User::where('role', 'member')->find($numericId);
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid QR Code or Member ID not found'
            ], 404);
        }

        $profile = $user->memberProfile;

        if ($profile && $profile->status === 'Expired') {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: Membership package has expired. Please renew.'
            ], 403);
        }

        $existing = Attendance::where('user_id', $user->id)
            ->whereDate('date', now()->toDateString())
            ->where('status', 'Inside Gym')
            ->first();

        if ($existing) {
            return response()->json([
                'success'       => true,
                'alreadyInside' => true,
                'message'       => "{$user->name} is already checked in at {$existing->check_in_time}",
                'attendance'    => $existing,
            ]);
        }

        $attendance = Attendance::create([
            'user_id'       => $user->id,
            'member_name'   => $user->name,
            'member_avatar' => $user->avatar,
            'plan_name'     => $profile?->plan?->name ?? 'Active Plan',
            'check_in_time' => now()->toTimeString(),
            'date'          => now()->toDateString(),
            'status'        => 'Inside Gym',
            'gate'          => $request->gate ?? 'Main Turnstile A',
        ]);

        if ($profile) {
            $profile->increment('attendance_streak');
            $profile->last_check_in = now();
            $profile->save();
        }

        return response()->json([
            'success' => true,
            'message' => "Access Granted! Welcome to PulseFit, {$user->name}.",
            'member'  => [
                'id'     => 'mem-' . $user->id,
                'name'   => $user->name,
                'plan'   => $profile?->plan?->name,
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

        $numericId  = str_replace('att-', '', (string)$id);
        $attendance = Attendance::findOrFail($numericId);

        $punchOutTime = now()->toTimeString();
        $duration     = '--';

        // Calculate workout duration from check-in to punch-out
        if ($attendance->check_in_time) {
            try {
                $in   = Carbon::parse($attendance->date . ' ' . $attendance->check_in_time);
                $out  = Carbon::parse($attendance->date . ' ' . $punchOutTime);
                $mins = max(0, $in->diffInMinutes($out));
                $h    = intdiv($mins, 60);
                $m    = $mins % 60;
                $duration = $h > 0 ? "{$h}h {$m}m" : "{$m}m";
            } catch (\Throwable $e) {}
        }

        $attendance->update([
            'check_out_time' => $punchOutTime,
            'punch_out_time' => $punchOutTime,
            'duration'       => $duration,
            'status'         => 'Completed',
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Checked out successfully. Workout duration: ' . $duration,
            'punch_out'  => date('h:i A', strtotime($punchOutTime)),
            'duration'   => $duration,
            'attendance' => $attendance,
        ]);
    }

    /**
     * Parse shift timings from string like "manager shift (06:00 AM - 02:00 PM)"
     * Takes only timings inside parentheses or formatted range, ignoring variable shift prefix names.
     */
    public static function parseShiftTimings(?string $shiftString): ?array
    {
        if (empty($shiftString)) return null;

        // 1. Prefer timing inside parentheses: (06:00 AM - 02:00 PM)
        if (preg_match('/\(\s*([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)\s*[-â€“to]+\s*([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)\s*\)/i', $shiftString, $m)) {
            return [
                'start' => trim($m[1]),
                'end'   => trim($m[2]),
            ];
        }

        // 2. Direct range without parentheses: 06:00 AM - 02:00 PM
        if (preg_match('/([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)\s*[-â€“to]+\s*([0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|am|pm))?)/i', $shiftString, $m)) {
            return [
                'start' => trim($m[1]),
                'end'   => trim($m[2]),
            ];
        }

        return null;
    }

    /**
     * Automatically check out members and staff whose shift or gym session has ended.
     */
    public function autoCheckOutOverdueMembers(): int
    {
        try {
            $tz = 'Asia/Kolkata';
            $now = Carbon::now($tz);
            $updatedCount = 0;

            // Load configured settings
            $settings = \App\Http\Controllers\Api\GymSettingController::getDefaultPayrollAttendanceSettings();
            $gymSetting = \App\Models\GymSetting::first();
            if ($gymSetting && !empty($gymSetting->payroll_attendance_settings)) {
                $parsed = is_string($gymSetting->payroll_attendance_settings) ? json_decode($gymSetting->payroll_attendance_settings, true) : $gymSetting->payroll_attendance_settings;
                if (is_array($parsed)) $settings = array_replace_recursive($settings, $parsed);
            }

            // 1. Members Auto Check-Out
            $memberSettings = $settings['member'] ?? ['auto_checkout' => true, 'auto_checkout_hours' => 2];
            if (!empty($memberSettings['auto_checkout'])) {
                $isShiftBased = (($memberSettings['auto_checkout_hours'] ?? null) === 'shift' || ($memberSettings['auto_checkout_hours'] ?? null) === 'shifts');
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

                    if ($isShiftBased) {
                        $shiftTimings = self::parseShiftTimings($att->user?->shifts);
                        if ($shiftTimings && !empty($shiftTimings['end'])) {
                            $shiftEnd = Carbon::parse($dateStr . ' ' . $shiftTimings['end'], $tz);
                            if ($shiftEnd->lessThan($checkInDateTime)) {
                                $shiftEnd->addDay();
                            }
                            if ($now->greaterThanOrEqualTo($shiftEnd)) {
                                $outTimeStr = $shiftEnd->toTimeString();
                                $mins = max(1, $checkInDateTime->diffInMinutes($shiftEnd));
                                $h = floor($mins / 60);
                                $m = $mins % 60;
                                $durationStr = $h > 0 ? "{$h}h {$m}m" : "{$mins}m";

                                $att->update([
                                    'check_out_time' => $outTimeStr,
                                    'punch_out_time' => $outTimeStr,
                                    'duration'       => $durationStr,
                                    'status'         => 'Completed',
                                ]);
                                $updatedCount++;
                            }
                            continue;
                        }
                    }

                    if ($checkInDateTime->diffInMinutes($now, false) >= $maxMinutes) {
                        $autoOutTime = $checkInDateTime->copy()->addMinutes($maxMinutes);
                        $outTimeStr = $autoOutTime->toTimeString();
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

            // 2. Staff (Trainer, Manager, Accountant) Auto Check-Out
            $roles = ['trainer', 'manager', 'accounts'];
            foreach ($roles as $role) {
                $roleSettings = $settings[$role] ?? null;
                if ($roleSettings && !empty($roleSettings['auto_checkout'])) {
                    $isShiftBased = (($roleSettings['auto_checkout_hours'] ?? null) === 'shift' || ($roleSettings['auto_checkout_hours'] ?? null) === 'shifts');
                    $maxHours = is_numeric($roleSettings['auto_checkout_hours'] ?? null) ? (float)$roleSettings['auto_checkout_hours'] : 8;
                    $maxMinutes = (int)($maxHours * 60);

                    $activeStaff = Attendance::with('user')->where('status', 'On Duty')
                        ->whereNull('check_out_time')
                        ->whereHas('user', function ($q) use ($role) {
                            $q->where('role', $role);
                        })
                        ->get();

                    foreach ($activeStaff as $att) {
                        if (!$att->check_in_time || !$att->date) continue;
                        $dateStr = $att->date instanceof Carbon ? $att->date->toDateString() : (string)$att->date;
                        $checkInDateTime = Carbon::parse($dateStr . ' ' . $att->check_in_time, $tz);

                        if ($isShiftBased) {
                            $shiftTimings = self::parseShiftTimings($att->user?->shifts);
                            if ($shiftTimings && !empty($shiftTimings['end'])) {
                                $shiftEnd = Carbon::parse($dateStr . ' ' . $shiftTimings['end'], $tz);
                                if ($shiftEnd->lessThan($checkInDateTime)) {
                                    $shiftEnd->addDay();
                                }
                                if ($now->greaterThanOrEqualTo($shiftEnd)) {
                                    $outTimeStr = $shiftEnd->toTimeString();
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
                                }
                                continue;
                            }
                        }

                        // Fixed duration fallback
                        if ($checkInDateTime->diffInMinutes($now, false) >= $maxMinutes) {
                            $autoOutTime = $checkInDateTime->copy()->addMinutes($maxMinutes);
                            $outTimeStr = $autoOutTime->toTimeString();
                            $durationStr = "{$maxHours}h 0m";

                            $att->update([
                                'check_out_time' => $outTimeStr,
                                'punch_out_time' => $outTimeStr,
                                'duration'       => $durationStr,
                                'status'         => 'Completed Shift',
                            ]);
                            $updatedCount++;
                        }
                    }
                }
            }

            // Check for unexcused staff absence (0 remaining leaves & no check-in) -> Mark Unpaid Leave & Deduct Salary
            try {
                \App\Http\Controllers\Api\LeaveController::processUnpaidLeavesForAbsentStaff();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Unpaid leave check error: " . $e->getMessage());
            }

            return $updatedCount;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Auto check-out error: " . $e->getMessage());
            return 0;
        }
    }
}
