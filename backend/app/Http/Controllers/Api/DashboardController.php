<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\Attendance;
use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Enquiry;
use App\Models\Expense;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function getOwnerStats(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $membersQuery = User::where('role', 'member');
        $trainersQuery = User::where('role', 'trainer');
        if ($gymId) {
            $membersQuery->where('gym_id', $gymId);
            $trainersQuery->where('gym_id', $gymId);
        }

        $totalMembers = $membersQuery->count();
        $totalTrainers = $trainersQuery->count();

        $activeMembers = MemberProfile::whereHas('user', function ($q) use ($gymId) {
            if ($gymId) $q->where('gym_id', $gymId);
        })->where('status', 'Active')->count();

        $expiringMembers = MemberProfile::whereHas('user', function ($q) use ($gymId) {
            if ($gymId) $q->where('gym_id', $gymId);
        })->where('status', 'Expiring Soon')->count();

        $expiredMembers = MemberProfile::whereHas('user', function ($q) use ($gymId) {
            if ($gymId) $q->where('gym_id', $gymId);
        })->where('status', 'Expired')->count();

        $todayAttendance = Attendance::whereHas('user', function ($q) use ($gymId) {
            if ($gymId) $q->where('gym_id', $gymId);
        })->whereDate('date', now()->toDateString())->count();

        // Enquiries / Leads from database
        $enquiriesQuery = Enquiry::query();
        if ($gymId) {
            $enquiriesQuery->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) $q->orWhereNull('gym_id');
            });
        }
        $totalLeads = $enquiriesQuery->count();
        $hotLeads = (clone $enquiriesQuery)->where('priority', 'Hot')->count();

        // Calculate revenue for this gym
        $invoicesQuery = Invoice::where('status', 'Paid');
        if ($gymId) {
            $invoicesQuery->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) {
                    $q->orWhereNull('gym_id');
                }
            });
        }
        $dbRevenue = (float)$invoicesQuery->sum('amount');

        // Calculate real expenses from database
        $expensesQuery = Expense::query();
        if ($gymId) {
            $expensesQuery->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) $q->orWhereNull('gym_id');
            });
        }
        $dbExpenses = (float)$expensesQuery->sum('amount');

        $monthlyRevenue = $dbRevenue;
        $monthlyExpenses = $dbExpenses;
        $monthlyProfit = max(0, $monthlyRevenue - $monthlyExpenses);

        $now = now();
        $revenueAnalytics = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = (clone $now)->subMonths($i);
            $monthName = $m->format('M');
            $yearMonth = $m->format('Y-m');

            $mRevQuery = Invoice::where('status', 'Paid')->where('date', 'like', "{$yearMonth}%");
            if ($gymId) {
                $mRevQuery->where(function ($q) use ($gymId) {
                    $q->where('gym_id', $gymId);
                    if ($gymId == 1) $q->orWhereNull('gym_id');
                });
            }
            $mRev = (float)$mRevQuery->sum('amount');

            $mExpQuery = Expense::where('date', 'like', "{$yearMonth}%");
            if ($gymId) {
                $mExpQuery->where(function ($q) use ($gymId) {
                    $q->where('gym_id', $gymId);
                    if ($gymId == 1) $q->orWhereNull('gym_id');
                });
            }
            $mExp = (float)$mExpQuery->sum('amount');

            $revenueAnalytics[] = [
                'month' => $monthName,
                'revenue' => $mRev,
                'profit' => max(0, $mRev - $mExp),
                'expenses' => $mExp,
            ];
        }

        $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        $weeklyTraffic = [];
        foreach ($days as $day) {
            $attCount = Attendance::whereHas('user', function ($q) use ($gymId) {
                if ($gymId) $q->where('gym_id', $gymId);
            })->whereRaw("DAYNAME(date) LIKE ?", ["{$day}%"])->count();

            $weeklyTraffic[] = [
                'day' => $day,
                'morning' => (int)round($attCount * 0.4),
                'evening' => (int)round($attCount * 0.6),
                'total' => $attCount,
            ];
        }

        return response()->json([
            'success' => true,
            'stats' => [
                'totalMembers' => $totalMembers,
                'activeMembers' => $activeMembers,
                'expiringMembers' => $expiringMembers,
                'expiredMembers' => $expiredMembers,
                'totalTrainers' => $totalTrainers,
                'todayAttendance' => $todayAttendance,
                'monthlyRevenue' => $monthlyRevenue,
                'monthlyExpenses' => $monthlyExpenses,
                'monthlyProfit' => $monthlyProfit,
                'totalLeads' => $totalLeads,
                'hotLeads' => $hotLeads,
            ],
            'revenueAnalytics' => $revenueAnalytics,
            'weeklyTraffic' => $weeklyTraffic,
        ]);
    }
}
