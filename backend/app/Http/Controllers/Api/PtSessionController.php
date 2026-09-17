<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PtSession;
use App\Models\PtSessionLog;
use App\Models\Gym;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PtSessionController extends Controller
{
    /**
     * List all PT session packages, optionally filtered by trainer or member
     */
    public function index(Request $request)
    {
        $gymId     = $this->resolveGymId($request);
        $trainerId = $request->query('trainer_id');
        $memberId  = $request->query('member_id');

        $query = PtSession::with('logs');
        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        if ($trainerId) $query->where('trainer_id', $trainerId);
        if ($memberId)  $query->where('member_id', $memberId);

        $sessions = $query->orderBy('created_at', 'desc')->get();

        // Append progress percent to each session
        $sessions->each(function ($s) {
            $s->progress_percent = $s->getProgressPercent();
        });

        return response()->json(['success' => true, 'data' => $sessions]);
    }

    /**
     * Allocate a new PT sessions package for a member
     */
    public function store(Request $request)
    {
        $input = $request->all();
        if (isset($input['member_id']) && is_string($input['member_id'])) {
            $input['member_id'] = (int)str_replace(['mem-', 'usr-member-'], '', $input['member_id']);
        }
        if (isset($input['trainer_id']) && is_string($input['trainer_id'])) {
            $input['trainer_id'] = (int)str_replace(['tr-', 'trn-', 'usr-trainer-'], '', $input['trainer_id']);
        }
        $request->merge($input);

        $validated = $request->validate([
            'gym_id'        => 'nullable|integer',
            'member_id'     => 'nullable|integer',
            'member_name'   => 'required|string|max:100',
            'member_avatar' => 'nullable|string',
            'trainer_id'    => 'nullable|integer',
            'trainer_name'  => 'required|string|max:100',
            'plan_name'     => 'nullable|string|max:100',
            'total_sessions' => 'required|integer|min:1|max:200',
            'start_date'    => 'nullable|date',
        ]);

        $gymId = $validated['gym_id'] ?? $this->resolveGymId($request);

        if (!empty($validated['member_id']) && empty($validated['member_avatar'])) {
            $memberUser = User::find($validated['member_id']);
            if ($memberUser) {
                $validated['member_avatar'] = $memberUser->avatar;
                if (empty($validated['member_name'])) {
                    $validated['member_name'] = $memberUser->name;
                }
            }
        }
        if (!empty($validated['trainer_id']) && empty($validated['trainer_name'])) {
            $trainerUser = User::find($validated['trainer_id']);
            if ($trainerUser) {
                $validated['trainer_name'] = $trainerUser->name;
            }
        }

        $otp = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

        $ptSession = PtSession::create([
            ...$validated,
            'completed_sessions' => 0,
            'remaining_sessions' => $validated['total_sessions'],
            'client_otp'         => $otp,
            'status'             => 'Active',
            'gym_id'             => $gymId,
            'start_date'         => $validated['start_date'] ?? now()->toDateString(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "PT package with {$validated['total_sessions']} sessions allocated. Client OTP: {$otp}",
            'data'    => $ptSession,
        ], 201);
    }

    /**
     * Log a verified PT session using the client's OTP
     */
    public function logSession(Request $request, int $id)
    {
        $ptSession = PtSession::findOrFail($id);

        $validated = $request->validate([
            'otp_entered' => 'required|string|max:6',
            'notes'       => 'nullable|string|max:500',
        ]);

        // Validate OTP
        if ($ptSession->client_otp !== $validated['otp_entered']) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect OTP. Please ask the member for their 4-digit verification code.',
            ], 422);
        }

        // Check remaining sessions
        if ($ptSession->remaining_sessions <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'No remaining sessions in this PT package.',
            ], 422);
        }

        // Log the session
        $sessionNumber = $ptSession->completed_sessions + 1;

        $log = PtSessionLog::create([
            'pt_session_id' => $ptSession->id,
            'member_id'     => $ptSession->member_id,
            'trainer_id'    => $ptSession->trainer_id,
            'member_name'   => $ptSession->member_name,
            'trainer_name'  => $ptSession->trainer_name,
            'session_number' => $sessionNumber,
            'otp_entered'   => $validated['otp_entered'],
            'otp_verified'  => true,
            'notes'         => $validated['notes'] ?? null,
            'verified_at'   => now(),
        ]);

        // Update session counts
        $ptSession->completed_sessions += 1;
        $ptSession->remaining_sessions -= 1;
        if ($ptSession->remaining_sessions === 0) {
            $ptSession->status = 'Completed';
        }
        $ptSession->save();

        return response()->json([
            'success' => true,
            'message' => "Session #{$sessionNumber} logged successfully for {$ptSession->member_name}.",
            'data'    => [
                'log'        => $log,
                'pt_session' => $ptSession,
                'progress'   => $ptSession->getProgressPercent(),
            ],
        ]);
    }

    /**
     * Regenerate a new OTP for a member's PT package
     */
    public function regenerateOtp(int $id)
    {
        $ptSession = PtSession::findOrFail($id);
        $newOtp = $ptSession->generateOtp();

        return response()->json([
            'success' => true,
            'message' => "New OTP generated for {$ptSession->member_name}: {$newOtp}",
            'otp'     => $newOtp,
        ]);
    }

    /**
     * Get session logs for a specific PT package
     */
    public function getLogs(int $id)
    {
        $ptSession = PtSession::with('logs')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $ptSession->logs()->orderBy('created_at', 'desc')->get(),
        ]);
    }
}
