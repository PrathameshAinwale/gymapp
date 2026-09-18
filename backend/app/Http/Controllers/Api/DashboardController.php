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
use App\Models\RevenueBilling;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function getOwnerStats(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        MemberController::syncAllMemberStatuses();

        if (!$gymId) {
            return response()->json([
                'success' => true,
                'stats' => [
                    'totalMembers' => 0,
                    'activeMembers' => 0,
                    'expiringMembers' => 0,
                    'expiredMembers' => 0,
                    'totalTrainers' => 0,
                    'todayAttendance' => 0,
                    'monthlyRevenue' => 0,
                    'monthlyExpenses' => 0,
                    'monthlyProfit' => 0,
                    'totalLeads' => 0,
                    'hotLeads' => 0
                ],
                'revenueAnalytics' => [],
                'weeklyTraffic' => []
            ]);
        }

        $membersQuery = User::where('role', 'member')->where('gym_id', $gymId);
        $trainersQuery = User::where('role', 'trainer')->where('gym_id', $gymId);

        $totalMembers = $membersQuery->count();
        $totalTrainers = $trainersQuery->count();

        $activeMembers = MemberProfile::whereHas('user', function ($q) use ($gymId) {
            $q->where('gym_id', $gymId);
        })->where('status', 'Active')->count();

        $expiringMembers = MemberProfile::whereHas('user', function ($q) use ($gymId) {
            $q->where('gym_id', $gymId);
        })->where('status', 'Expiring Soon')->count();

        $expiredMembers = MemberProfile::whereHas('user', function ($q) use ($gymId) {
            $q->where('gym_id', $gymId);
        })->where('status', 'Expired')->count();

        $todayAttendance = Attendance::whereHas('user', function ($q) use ($gymId) {
            $q->where('gym_id', $gymId);
        })->whereDate('date', now()->toDateString())->count();

        // Enquiries / Leads from database
        $enquiriesQuery = Enquiry::where('gym_id', $gymId);
        $totalLeads = $enquiriesQuery->count();
        $hotLeads = (clone $enquiriesQuery)->where('priority', 'Hot')->count();

        // Calculate inflow (revenue) for this gym from RevenueBilling (authoritative) or Invoice fallback
        $inflowSum = (float) RevenueBilling::inflow()->forGym($gymId)->sum('amount');
        $invoiceSum = (float) Invoice::where('gym_id', $gymId)->where('status', 'Paid')->sum('amount');
        $dbRevenue = $inflowSum > 0 ? $inflowSum : $invoiceSum;

        // Calculate real expenses / outflows from RevenueBilling or Expense fallback
        $outflowSum = (float) RevenueBilling::outflow()->forGym($gymId)->sum('amount');
        $expenseSum = (float) Expense::where('gym_id', $gymId)->sum('amount');
        $dbExpenses = $outflowSum > 0 ? $outflowSum : $expenseSum;

        $monthlyRevenue = $dbRevenue;
        $monthlyExpenses = $dbExpenses;
        $monthlyProfit = max(0, $monthlyRevenue - $monthlyExpenses);

        $now = now();
        $revenueAnalytics = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = (clone $now)->subMonths($i);
            $monthName = $m->format('M');
            $yearMonth = $m->format('Y-m');

            $mInflow = (float) RevenueBilling::inflow()->forGym($gymId)
                ->where('date', 'like', "{$yearMonth}%")
                ->sum('amount');
            $mInvoice = (float) Invoice::where('gym_id', $gymId)
                ->where('status', 'Paid')
                ->where('date', 'like', "{$yearMonth}%")
                ->sum('amount');
            $mRev = $mInflow > 0 ? $mInflow : $mInvoice;

            $mOutflow = (float) RevenueBilling::outflow()->forGym($gymId)
                ->where('date', 'like', "{$yearMonth}%")
                ->sum('amount');
            $mExpense = (float) Expense::where('gym_id', $gymId)
                ->where('date', 'like', "{$yearMonth}%")
                ->sum('amount');
            $mExp = $mOutflow > 0 ? $mOutflow : $mExpense;

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
                $q->where('gym_id', $gymId);
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
