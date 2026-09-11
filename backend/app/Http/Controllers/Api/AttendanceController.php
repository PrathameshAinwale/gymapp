<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\MemberProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $query = Attendance::with('user.memberProfile.plan');

        if ($request->has('date') && $request->query('date') !== 'all') {
            $query->whereDate('date', $request->query('date'));
        }

        if ($gymId) {
            $query->whereHas('user', function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) {
                    $q->orWhereNull('gym_id');
                }
            });
        }

        $attendances = $query->latest('date')
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(function ($att) {
                return [
                    'id' => 'att-' . $att->id,
                    'memberId' => 'mem-' . $att->user_id,
                    'memberName' => $att->user?->name ?? 'Unknown Member',
                    'avatar' => $att->user?->avatar,
                    'planName' => $att->user?->memberProfile?->plan?->name ?? 'Active Plan',
                    'checkInTime' => $att->check_in_time ? date('h:i A', strtotime($att->check_in_time)) : '--',
                    'checkOutTime' => $att->check_out_time ? date('h:i A', strtotime($att->check_out_time)) : '--',
                    'date' => $att->date->isToday() ? 'Today' : $att->date->format('d M Y'),
                    'status' => $att->status,
                    'gate' => $att->gate,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $attendances,
            'activeInsideCount' => $attendances->where('status', 'Inside Gym')->count(),
        ]);
    }

    public function checkIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'qr_code' => 'required_without:user_id|string',
            'user_id' => 'required_without:qr_code',
            'gate' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = null;
        if ($request->has('qr_code')) {
            $profile = MemberProfile::where('qr_pass_code', $request->qr_code)->first();
            if ($profile) {
                $user = $profile->user;
            }
        } elseif ($request->has('user_id')) {
            $numericId = (int)str_replace('mem-', '', $request->user_id);
            $user = User::where('role', 'member')->find($numericId);
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid QR Code or Member ID not found'
            ], 404);
        }

        $profile = $user->memberProfile;

        // Check if member is expired
        if ($profile && $profile->status === 'Expired') {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: Membership package has expired. Please renew.'
            ], 403);
        }

        // Check if already checked in today
        $existing = Attendance::where('user_id', $user->id)
            ->whereDate('date', now()->toDateString())
            ->where('status', 'Inside Gym')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'alreadyInside' => true,
                'message' => "{$user->name} is already checked in at {$existing->check_in_time}",
                'attendance' => $existing,
            ]);
        }

        $attendance = Attendance::create([
            'user_id' => $user->id,
            'check_in_time' => now()->toTimeString(),
            'date' => now()->toDateString(),
            'status' => 'Inside Gym',
            'gate' => $request->gate ?? 'Main Turnstile A',
        ]);

        if ($profile) {
            $profile->increment('attendance_streak');
            $profile->last_check_in = now();
            $profile->save();
        }

        return response()->json([
            'success' => true,
            'message' => "Access Granted! Welcome to PulseFit, {$user->name}.",
            'member' => [
                'id' => 'mem-' . $user->id,
                'name' => $user->name,
                'plan' => $profile?->plan?->name,
                'streak' => $profile?->attendance_streak,
            ],
            'attendance' => $attendance,
        ]);
    }

    public function checkOut(Request $request, $id)
    {
        $numericId = str_replace('att-', '', $id);
        $attendance = Attendance::findOrFail($numericId);
        $attendance->update([
            'check_out_time' => now()->toTimeString(),
            'status' => 'Completed',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Checked out successfully',
            'attendance' => $attendance,
        ]);
    }
}
