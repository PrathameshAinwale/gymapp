<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class LeaveController extends Controller
{
    /**
     * Standard default leave quotas per year (in days)
     */
    const DEFAULT_LEAVE_TYPES = [
        'Privilege Leave' => 12.0,
        'Sick Leave'      => 10.0,
        'Casual Leave'    => 8.0,
    ];

    /**
     * Auto-seed/ensure default balances for staff if not yet initialized
     */
    protected function ensureUserBalances($userId, $gymId, $year = 2026)
    {
        $user = User::find($userId);
        if (!$user) return;

        foreach (self::DEFAULT_LEAVE_TYPES as $type => $days) {
            $bal = LeaveBalance::firstOrNew([
                'user_id'    => $userId,
                'leave_type' => $type,
                'year'       => $year,
            ]);

            if (!$bal->exists) {
                $bal->gym_id         = $gymId ?: ($user->gym_id ?: 1);
                $bal->user_name      = $user->name;
                $bal->role           = $user->role;
                $bal->allocated_days = $days;
                $bal->used_days      = 0;
                $bal->remaining_days = $days;
                $bal->save();
            } elseif ($bal->allocated_days <= 0 && $days > 0) {
                $bal->allocated_days = $days;
                $bal->remaining_days = max(0, $days - (float) $bal->used_days);
                $bal->save();
            }
        }
    }

    /**
     * 1. List all leave requests with filters
     */
    public function indexRequests(Request $request)
    {
        $gymId   = $this->resolveGymId($request);
        $status  = $request->query('status');
        $userId  = $request->query('user_id') ?: $request->query('trainer_id');
        $role    = $request->query('role');

        $query = LeaveRequest::with(['user:id,name,email,role,avatar,phone'])
            ->orderBy('created_at', 'desc');

        if ($gymId) {
            $hasGymReqs = (clone $query)->where('gym_id', $gymId)->exists();
            if ($hasGymReqs) {
                $query->where('gym_id', $gymId);
            }
        }

        if ($status && strtoupper($status) !== 'ALL') {
            $query->where('status', $status);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($role) {
            $query->where('role', $role);
        }

        $requests = $query->get();

        // Attach current remaining balance for the requested leave type
        $requests->transform(function ($req) {
            $balance = LeaveBalance::where('user_id', $req->user_id)
                ->where('leave_type', $req->leave_type)
                ->where('year', Carbon::parse($req->start_date)->year ?: 2026)
                ->first();

            $req->remaining_balance_for_type = $balance ? (float) $balance->remaining_days : null;
            return $req;
        });

        return response()->json([
            'success' => true,
            'data'    => $requests,
        ]);
    }

    /**
     * 2. Submit a new leave request (Trainer, Staff, or Owner submitting on behalf)
     */
    public function storeRequest(Request $request)
    {
        $validated = $request->validate([
            'user_id'    => 'required|exists:users,id',
            'leave_type' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'days_count' => 'nullable|numeric|min:0.5',
            'reason'     => 'required|string|max:1000',
            'gym_id'     => 'nullable|integer',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $gymId = $validated['gym_id'] ?? ($user->gym_id ?: $this->resolveGymId($request));

        // Calculate days count if not provided
        $startDate = Carbon::parse($validated['start_date']);
        $endDate   = Carbon::parse($validated['end_date']);
        $daysCount = isset($validated['days_count']) && $validated['days_count'] > 0
            ? (float) $validated['days_count']
            : ($startDate->diffInDays($endDate) + 1);

        $year = $startDate->year ?: 2026;
        $this->ensureUserBalances($user->id, $gymId, $year);

        // Check remaining balance
        $balance = LeaveBalance::where('user_id', $user->id)
            ->where('leave_type', $validated['leave_type'])
            ->where('year', $year)
            ->first();

        $remainingDays = $balance ? (float) $balance->remaining_days : 0;

        $leaveRequest = LeaveRequest::create([
            'gym_id'      => $gymId,
            'user_id'     => $user->id,
            'user_name'   => $user->name,
            'user_avatar' => $user->avatar,
            'role'        => $user->role,
            'leave_type'  => $validated['leave_type'],
            'start_date'  => $validated['start_date'],
            'end_date'    => $validated['end_date'],
            'days_count'  => $daysCount,
            'reason'      => $validated['reason'],
            'status'      => 'Pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Leave application for {$daysCount} day(s) submitted successfully.",
            'data'    => $leaveRequest,
            'remaining_balance' => $remainingDays,
        ], 201);
    }

    /**
     * 3. Owner/Superadmin Accept or Reject leave request
     * Automatically adjusts the employee's remaining leave balance!
     */
    public function updateRequestStatus(Request $request, $id)
    {
        $leaveRequest = LeaveRequest::findOrFail($id);

        $validated = $request->validate([
            'status'       => 'required|in:Approved,Rejected,Pending,Cancelled',
            'action_notes' => 'nullable|string|max:500',
            'action_by'    => 'nullable|string|max:100',
        ]);

        $oldStatus = $leaveRequest->status;
        $newStatus = $validated['status'];
        $notes     = $validated['action_notes'] ?? null;
        $actionBy  = $validated['action_by'] ?? ($request->user() ? $request->user()->name : 'Owner');

        $year = Carbon::parse($leaveRequest->start_date)->year ?: 2026;
        $this->ensureUserBalances($leaveRequest->user_id, $leaveRequest->gym_id, $year);

        $balance = LeaveBalance::where('user_id', $leaveRequest->user_id)
            ->where('leave_type', $leaveRequest->leave_type)
            ->where('year', $year)
            ->first();

        DB::transaction(function () use ($leaveRequest, $oldStatus, $newStatus, $notes, $actionBy, $balance) {
            // Deduct or restore balance based on status transition
            if ($newStatus === 'Approved' && $oldStatus !== 'Approved') {
                if ($balance) {
                    $balance->used_days += (float) $leaveRequest->days_count;
                    $balance->remaining_days = max(0, (float) $balance->allocated_days - (float) $balance->used_days);
                    $balance->save();
                }
            } elseif ($oldStatus === 'Approved' && in_array($newStatus, ['Rejected', 'Cancelled', 'Pending'])) {
                if ($balance) {
                    $balance->used_days = max(0, (float) $balance->used_days - (float) $leaveRequest->days_count);
                    $balance->remaining_days = (float) $balance->allocated_days - (float) $balance->used_days;
                    $balance->save();
                }
            }

            $leaveRequest->status       = $newStatus;
            $leaveRequest->action_by    = $actionBy;
            $leaveRequest->action_notes = $notes;
            $leaveRequest->action_date  = now();
            $leaveRequest->save();
        });

        // Refresh balance
        $balance?->refresh();

        return response()->json([
            'success' => true,
            'message' => "Leave request for {$leaveRequest->user_name} marked as {$newStatus}.",
            'data'    => $leaveRequest,
            'updated_balance' => $balance ? [
                'leave_type'     => $balance->leave_type,
                'allocated_days' => (float) $balance->allocated_days,
                'used_days'      => (float) $balance->used_days,
                'remaining_days' => (float) $balance->remaining_days,
            ] : null,
        ]);
    }

    /**
     * 4. List all employee leave balances across gym
     */
    public function indexBalances(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $year  = (int) ($request->query('year') ?: 2026);

        // Fetch all staff and trainers (exclude members)
        $staffQuery = User::whereIn('role', ['trainer', 'manager', 'accounts', 'staff', 'owner']);
        if ($gymId && $gymId > 0) {
            $hasGymStaff = (clone $staffQuery)->where('gym_id', $gymId)->where('role', '!=', 'owner')->exists();
            if ($hasGymStaff) {
                $staffQuery->where('gym_id', $gymId);
            }
        }
        $staffUsers = $staffQuery->get();

        // Ensure default balances exist for each employee
        foreach ($staffUsers as $stf) {
            $this->ensureUserBalances($stf->id, $gymId, $year);
        }

        // Match balances directly by user_id so no balance is lost due to gym_id mismatch
        $balances = LeaveBalance::where('year', $year)
            ->whereIn('user_id', $staffUsers->pluck('id'))
            ->with(['user:id,name,email,role,avatar,phone'])
            ->get();

        // Group balances by employee
        $grouped = $staffUsers->map(function ($u) use ($balances) {
            $userBalances = $balances->where('user_id', $u->id)->values();

            $totalAllocated = $userBalances->sum('allocated_days');
            $totalUsed      = $userBalances->sum('used_days');
            $totalRemaining = $userBalances->sum('remaining_days');

            return [
                'user_id'         => $u->id,
                'user_name'       => $u->name,
                'role'            => $u->role,
                'email'           => $u->email,
                'phone'           => $u->phone,
                'avatar'          => $u->avatar,
                'total_allocated' => (float) $totalAllocated,
                'total_used'      => (float) $totalUsed,
                'total_remaining' => (float) $totalRemaining,
                'balances'        => $userBalances->map(function ($b) {
                    return [
                        'id'             => $b->id,
                        'leave_type'     => $b->leave_type,
                        'allocated_days' => (float) $b->allocated_days,
                        'used_days'      => (float) $b->used_days,
                        'remaining_days' => (float) $b->remaining_days,
                        'year'           => $b->year,
                    ];
                }),
            ];
        });

        return response()->json([
            'success' => true,
            'year'    => $year,
            'data'    => $grouped,
        ]);
    }

    /**
     * 5. Get detailed leaves left for a specific trainer or staff member
     * Called when the owner clicks on the name of the trainer or staff!
     */
    public function getUserBalance(Request $request, $userId)
    {
        $gymId = $this->resolveGymId($request);
        $year  = (int) ($request->query('year') ?: 2026);

        $user = User::findOrFail($userId);
        $this->ensureUserBalances($user->id, $gymId, $year);

        $balances = LeaveBalance::where('user_id', $user->id)
            ->where('year', $year)
            ->get();

        $totalAllocated = $balances->sum('allocated_days');
        $totalUsed      = $balances->sum('used_days');
        $totalRemaining = $balances->sum('remaining_days');

        // Retrieve leave requests history for this employee
        $history = LeaveRequest::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'user' => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'email'  => $user->email,
                    'role'   => $user->role,
                    'avatar' => $user->avatar,
                    'phone'  => $user->phone,
                ],
                'year'            => $year,
                'total_allocated' => (float) $totalAllocated,
                'total_used'      => (float) $totalUsed,
                'total_remaining' => (float) $totalRemaining,
                'breakdown'       => $balances->map(function ($b) {
                    return [
                        'id'             => $b->id,
                        'leave_type'     => $b->leave_type,
                        'allocated_days' => (float) $b->allocated_days,
                        'used_days'      => (float) $b->used_days,
                        'remaining_days' => (float) $b->remaining_days,
                    ];
                }),
                'history'         => $history,
            ],
        ]);
    }

    /**
     * 6. Paid Leaves Creation / Quotas Allocation
     * The owner only creates leaves for trainers and staff (not members).
     * Configures Casual Leave, Sick Leave, and Privilege Leave.
     */
    public function allocateLeaves(Request $request)
    {
        $input = $request->json()->all() ?: $request->all();
        $gymId = $input['gym_id'] ?? $this->resolveGymId($request);
        $year  = (int) ($input['year'] ?? 2026);
        $applyAll = !empty($input['apply_all']) || empty($input['user_id']);

        // Check if multi-type payload (casual, sick, privilege) is provided
        $hasMultiTypes = isset($input['casual_leave']) || isset($input['sick_leave']) || isset($input['privilege_leave'])
            || isset($input['casual_days']) || isset($input['sick_days']) || isset($input['privilege_days'])
            || isset($input['casualLeave']) || isset($input['sickLeave']) || isset($input['privilegeLeave']);

        $typesToSet = [];
        if ($hasMultiTypes) {
            $typesToSet['Casual Leave']    = (float) ($input['casual_leave'] ?? $input['casual_days'] ?? $input['casualLeave'] ?? 8);
            $typesToSet['Sick Leave']      = (float) ($input['sick_leave'] ?? $input['sick_days'] ?? $input['sickLeave'] ?? 10);
            $typesToSet['Privilege Leave'] = (float) ($input['privilege_leave'] ?? $input['privilege_days'] ?? $input['privilegeLeave'] ?? 12);
        } else {
            $leaveType = trim($input['leave_type'] ?? 'Privilege Leave');
            $allocatedDays = (float) ($input['allocated_days'] ?? 12);
            $typesToSet[$leaveType] = $allocatedDays;
        }

        // Fetch eligible employees ONLY (Trainers and Staff, strictly NO members)
        $targetUserIds = [];
        if ($applyAll) {
            $staffUsers = User::whereIn('role', ['trainer', 'manager', 'accounts', 'staff', 'owner'])
                ->when($gymId, fn($q) => $q->where('gym_id', $gymId))
                ->get();
            $targetUserIds = $staffUsers->pluck('id')->toArray();
        } else {
            $user = User::whereIn('role', ['trainer', 'manager', 'accounts', 'staff', 'owner'])
                ->findOrFail($input['user_id']);
            $staffUsers = collect([$user]);
            $targetUserIds = [$user->id];
        }

        foreach ($staffUsers as $stf) {
            foreach ($typesToSet as $lType => $days) {
                $balance = LeaveBalance::firstOrNew([
                    'user_id'    => $stf->id,
                    'leave_type' => $lType,
                    'year'       => $year,
                ]);

                $balance->gym_id         = $gymId ?: ($stf->gym_id ?: 1);
                $balance->user_name      = $stf->name;
                $balance->role           = $stf->role;
                $balance->allocated_days = $days;
                $balance->used_days      = $balance->used_days ?: 0;
                $balance->remaining_days = max(0, $days - (float) $balance->used_days);
                $balance->save();
            }
        }

        $namesCount = count($staffUsers);
        return response()->json([
            'success' => true,
            'message' => $applyAll
                ? "Paid leaves successfully configured for all {$namesCount} trainers & staff members!"
                : "Paid leaves successfully configured for {$staffUsers->first()->name}!",
        ]);
    }

    /**
     * 7. Summary metrics for Leave Dashboard
     */
    public function summary(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $today = Carbon::today()->toDateString();
        $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
        $endOfMonth   = Carbon::now()->endOfMonth()->toDateString();

        $query = LeaveRequest::query();
        if ($gymId) {
            $hasGymRequests = (clone $query)->where('gym_id', $gymId)->exists();
            if ($hasGymRequests) {
                $query->where('gym_id', $gymId);
            }
        }

        $pendingCount = (clone $query)->where('status', 'Pending')->count();

        // Staff on leave today
        $onLeaveTodayCount = (clone $query)
            ->where('status', 'Approved')
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->count();

        // Total leaves approved this month
        $approvedThisMonth = (clone $query)
            ->where('status', 'Approved')
            ->whereBetween('start_date', [$startOfMonth, $endOfMonth])
            ->sum('days_count');

        // Total staff with active leave balance
        $staffCount = User::whereIn('role', ['trainer', 'manager', 'accounts', 'staff'])
            ->when($gymId, fn($q) => $q->where('gym_id', $gymId))
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'pending_requests'     => $pendingCount,
                'staff_on_leave_today' => $onLeaveTodayCount,
                'approved_this_month'  => (float) $approvedThisMonth,
                'total_employees'      => $staffCount,
            ],
        ]);
    }
}
