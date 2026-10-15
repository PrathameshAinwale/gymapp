<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceSyncController extends Controller
{
    public function sync(Request $request)
    {
        $token = $request->bearerToken() ?: ($request->header('X-Collector-Token') ?: $request->header('X-Device-Token'));

        $device = DB::table('biometric_devices')->where('api_token', $token)->first();
        if (!$device) {
            return response()->json(['success' => false, 'message' => 'Invalid Device Token'], 401);
        }

        $records = $request->input('records', $request->input('transactions', []));
        $inserted = 0;
        $duplicates = 0;
        $unmatched = 0;

        foreach ($records as $item) {
            $bioUserId = (string) ($item['biometric_user_id'] ?? ($item['user_id'] ?? ''));
            $punchedAt = $item['punched_at'] ?? ($item['timestamp'] ?? null);
            if (!$bioUserId || !$punchedAt) continue;

            $punchedAtCarbon = Carbon::parse($punchedAt);

            // SHA-256 deduplication
            $hash = hash('sha256', "{$device->id}_{$bioUserId}_{$punchedAtCarbon->toDateTimeString()}");
            if (DB::table('attendance_transactions')->where('transaction_hash', $hash)->exists()) {
                $duplicates++;
                continue;
            }

            // Find matching member profile or user
            // 1. Match member_profiles by biometric_user_id
            $member = DB::table('member_profiles')
                ->where('biometric_user_id', $bioUserId)
                ->first();

            // 2. If not found, match by user_id
            if (!$member) {
                $member = DB::table('member_profiles')
                    ->where('user_id', $bioUserId)
                    ->first();
            }

            // 3. If not found, match by member_profiles.id
            if (!$member) {
                $member = DB::table('member_profiles')
                    ->where('id', $bioUserId)
                    ->first();
            }

            // 4. Resolve User object (member, trainer, manager, accountant, etc.)
            $userObj = null;
            if ($member && !empty($member->user_id)) {
                $userObj = DB::table('users')->where('id', $member->user_id)->first();
            } else {
                $userObj = DB::table('users')
                    ->where('biometric_user_id', $bioUserId)
                    ->orWhere('id', $bioUserId)
                    ->first();
                if ($userObj && !$member) {
                    $member = DB::table('member_profiles')->where('user_id', $userObj->id)->first();
                }
            }

            $memberId = $member?->id;
            if (!$member && !$userObj) {
                $unmatched++;
            }

            // Backfill biometric_user_id on member_profiles if empty
            if ($member && empty($member->biometric_user_id)) {
                DB::table('member_profiles')->where('id', $member->id)->update([
                    'biometric_user_id' => $bioUserId,
                    'synced_to_device'  => 1,
                    'device_synced_at'  => now()
                ]);
            }

            // Backfill biometric_user_id on users if empty
            if ($userObj && empty($userObj->biometric_user_id)) {
                DB::table('users')->where('id', $userObj->id)->update([
                    'biometric_user_id' => $bioUserId,
                    'synced_to_device'  => 1,
                    'device_synced_at'  => now()
                ]);
            }

            // Insert transaction
            DB::table('attendance_transactions')->insert([
                'biometric_device_id' => $device->id,
                'member_profile_id'   => $memberId,
                'biometric_user_id'   => $bioUserId,
                'punched_at'          => $punchedAtCarbon,
                'punch_direction'     => $item['punch_direction'] ?? 'check_in',
                'punch_type'          => (string) ($item['punch_type'] ?? ''),
                'transaction_hash'    => $hash,
                'raw_metadata'        => json_encode($item['raw_metadata'] ?? $item),
                'created_at'          => now(),
            ]);

            // Update member profile last_check_in & streak if it's a member
            if ($member) {
                $isNewDayCheckin = !$member->last_check_in ||
                    Carbon::parse($member->last_check_in)->toDateString() !== $punchedAtCarbon->toDateString();

                $streak = $member->attendance_streak ?? 0;
                if ($isNewDayCheckin) {
                    $yesterday = $punchedAtCarbon->copy()->subDay()->toDateString();
                    $lastCheckinDate = $member->last_check_in ? Carbon::parse($member->last_check_in)->toDateString() : null;
                    $streak = ($lastCheckinDate === $yesterday) ? ($streak + 1) : 1;
                }

                DB::table('member_profiles')->where('id', $member->id)->update([
                    'last_check_in'     => $punchedAtCarbon,
                    'attendance_streak' => $streak,
                    'updated_at'        => now()
                ]);
            }

            // Synchronize with attendances table for real-time live Attendance Tracker display
            if ($userObj) {
                $dateStr = $punchedAtCarbon->toDateString();
                $timeStr = $punchedAtCarbon->toTimeString();
                $isStaff = ($userObj->role && $userObj->role !== 'member');

                // Resolve plan name
                $planName = 'Active Member';
                if ($member && $member->plan_id) {
                    $plan = DB::table('plans')->where('id', $member->plan_id)->first();
                    if ($plan && !empty($plan->name)) {
                        $planName = $plan->name;
                    }
                } elseif ($isStaff) {
                    $planName = ucfirst($userObj->role) . ' Shift';
                }

                $existingAtt = DB::table('attendances')
                    ->where('user_id', $userObj->id)
                    ->where('date', $dateStr)
                    ->latest('id')
                    ->first();

                $direction = strtolower($item['punch_direction'] ?? '');

                if (!$existingAtt) {
                    DB::table('attendances')->insert([
                        'user_id'        => $userObj->id,
                        'member_name'    => $userObj->name ?? ($isStaff ? ucfirst($userObj->role) : 'Member'),
                        'member_avatar'  => $userObj->avatar ?? null,
                        'plan_name'      => $planName,
                        'check_in_time'  => $timeStr,
                        'check_out_time' => null,
                        'punch_out_time' => null,
                        'duration'       => '--',
                        'date'           => $dateStr,
                        'status'         => $isStaff ? 'On Duty' : 'Inside Gym',
                        'gate'           => $device->name ?? 'Turnstile Gate',
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                } else if ($direction === 'check_out' || (empty($existingAtt->check_out_time) && $punchedAtCarbon->diffInMinutes(Carbon::parse($dateStr . ' ' . $existingAtt->check_in_time)) >= 1)) {
                    $in = Carbon::parse($dateStr . ' ' . $existingAtt->check_in_time);
                    $mins = max(0, $in->diffInMinutes($punchedAtCarbon));
                    $h = intdiv($mins, 60);
                    $m = $mins % 60;
                    $duration = $h > 0 ? "{$h}h {$m}m" : "{$m}m";

                    DB::table('attendances')->where('id', $existingAtt->id)->update([
                        'check_out_time' => $timeStr,
                        'punch_out_time' => $timeStr,
                        'duration'       => $duration,
                        'status'         => $isStaff ? 'Completed Shift' : 'Completed',
                        'updated_at'     => now(),
                    ]);
                }
            }

            $inserted++;
        }

        // Update device status in database
        $updateFields = [
            'status'     => 'online',
            'updated_at' => now(),
        ];
        if (\Illuminate\Support\Facades\Schema::hasColumn('biometric_devices', 'last_sync')) {
            $updateFields['last_sync'] = now()->format('Y-m-d H:i:s');
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('biometric_devices', 'last_successful_sync_at')) {
            $updateFields['last_successful_sync_at'] = now();
        }
        DB::table('biometric_devices')->where('id', $device->id)->update($updateFields);

        // Auto check-out members who exceeded 2 hours
        try {
            (new \App\Http\Controllers\Api\AttendanceController())->autoCheckOutOverdueMembers();
        } catch (\Throwable $e) {}

        return response()->json([
            'success'    => true,
            'inserted'   => $inserted,
            'duplicates' => $duplicates,
            'unmatched'  => $unmatched,
            'total'      => count($records)
        ]);
    }
}