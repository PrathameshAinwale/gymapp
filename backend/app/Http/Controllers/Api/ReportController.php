<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\Attendance;
use App\Models\Invoice;
use App\Models\PtSession;
use App\Models\Payroll;
use App\Models\Expense;
use App\Models\TrainerReview;
use App\Models\FinancialTransaction;
use App\Models\GymClass;
use App\Models\Product;
use App\Models\RevenueBilling;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    /**
     * Comprehensive report summary data for all categories
     */
    public function summary(Request $request)
    {
        $gymId    = $this->resolveGymId($request);
        $category = $request->query('category', 'all'); // all, members, financial, attendance, pt, payroll, classes, store
        $dateFrom = $request->query('from');
        $dateTo   = $request->query('to');

        if (!$gymId) {
            return response()->json([
                'success'   => true,
                'category'  => $category,
                'generated_at' => now()->toIso8601String(),
                'data'      => [
                    'members' => ['total' => 0, 'active' => 0, 'expiring_soon' => 0, 'expired' => 0, 'frozen' => 0, 'by_plan' => [], 'by_goal' => []],
                    'financial' => ['total_revenue' => 0, 'total_expenses' => 0, 'net_profit' => 0, 'paid_invoices' => 0, 'pending_invoices' => 0, 'monthly_trend' => [], 'revenue_streams' => [], 'expenses_by_cat' => []],
                    'attendance' => ['total_checkins' => 0, 'total_checkouts' => 0, 'currently_inside' => 0, 'avg_daily_traffic' => 0, 'busiest_day' => null, 'weekly_traffic' => [], 'time_windows' => []],
                    'pt_sessions' => ['total_packages' => 0, 'active' => 0, 'completed' => 0, 'total_sessions' => 0, 'sessions_completed' => 0, 'sessions_remaining' => 0, 'clients' => [], 'trainer_loads' => []],
                    'classes' => ['total_classes' => 0, 'total_booked' => 0, 'class_loads' => []],
                    'store' => ['total_revenue' => 0, 'total_units' => 0, 'categories' => []],
                    'payroll' => ['total_disbursed' => 0, 'total_pending' => 0, 'total_bonuses' => 0, 'total_deductions' => 0, 'paid_count' => 0, 'pending_count' => 0],
                ]
            ]);
        }

        $result = [];

        // ── Member Demographics ──
        if (in_array($category, ['all', 'members'])) {
            MemberController::syncAllMemberStatuses();
            $members = MemberProfile::whereHas('user', fn($u) => $u->where('gym_id', $gymId))
                ->with('user', 'plan')->get();

            $active   = $members->where('status', 'Active')->count();
            $expiring = $members->where('status', 'Expiring Soon')->count();
            $expired  = $members->where('status', 'Expired')->count();
            $frozen   = $members->where('status', 'Frozen')->count();

            $result['members'] = [
                'total'          => $members->count(),
                'active'         => $active,
                'expiring_soon'  => $expiring,
                'expired'        => $expired,
                'frozen'         => $frozen,
                'by_plan'        => $members->groupBy(function ($m) {
                        return $m->plan ? $m->plan->name : 'General Fitness';
                    })
                    ->map(fn($g, $k) => ['name' => $k, 'count' => $g->count()])
                    ->values(),
                'by_goal'        => $members->groupBy('goal')
                    ->map(fn($g, $k) => ['goal' => $k ?: 'Not Set', 'count' => $g->count()])
                    ->values(),
            ];
        }

        // ── Financial Revenue ──
        if (in_array($category, ['all', 'financial'])) {
            $inflowQuery = RevenueBilling::inflow()->forGym($gymId);
            if ($dateFrom) $inflowQuery->whereDate('date', '>=', $dateFrom);
            if ($dateTo)   $inflowQuery->whereDate('date', '<=', $dateTo);
            $inflowSum = (float)$inflowQuery->sum('amount');

            $invoices = Invoice::where('gym_id', $gymId)->where('status', 'Paid');
            if ($dateFrom) $invoices->whereDate('created_at', '>=', $dateFrom);
            if ($dateTo)   $invoices->whereDate('created_at', '<=', $dateTo);
            $invoiceSum = (float)$invoices->sum('amount');

            $totalRev = round($inflowSum > 0 ? $inflowSum : $invoiceSum, 2);

            $outflowQuery = RevenueBilling::outflow()->forGym($gymId);
            if ($dateFrom) $outflowQuery->whereDate('date', '>=', $dateFrom);
            if ($dateTo)   $outflowQuery->whereDate('date', '<=', $dateTo);
            $outflowSum = (float)$outflowQuery->sum('amount');

            $expenses = Expense::where('gym_id', $gymId);
            if ($dateFrom) $expenses->whereDate('date', '>=', $dateFrom);
            if ($dateTo)   $expenses->whereDate('date', '<=', $dateTo);
            $expenseSum = (float)$expenses->sum('amount');

            $totalExp = round($outflowSum > 0 ? $outflowSum : $expenseSum, 2);
            $netProf  = round($totalRev - $totalExp, 2);

            // 6-Month Monthly Trend
            $monthlyTrend = [];
            $now = Carbon::now();
            for ($i = 5; $i >= 0; $i--) {
                $m = (clone $now)->subMonths($i);
                $monthName = $m->format('M');
                $ym = $m->format('Y-m');

                $mInflow = (float) RevenueBilling::inflow()->forGym($gymId)
                    ->where('date', 'like', "{$ym}%")
                    ->sum('amount');
                $mInvoice = (float) Invoice::where('gym_id', $gymId)
                    ->where('status', 'Paid')
                    ->where('date', 'like', "{$ym}%")
                    ->sum('amount');
                $mRev = $mInflow > 0 ? $mInflow : $mInvoice;

                $mOutflow = (float) RevenueBilling::outflow()->forGym($gymId)
                    ->where('date', 'like', "{$ym}%")
                    ->sum('amount');
                $mExpense = (float) Expense::where('gym_id', $gymId)
                    ->where('date', 'like', "{$ym}%")
                    ->sum('amount');
                $mExp = $mOutflow > 0 ? $mOutflow : $mExpense;

                $monthlyTrend[] = [
                    'month' => $monthName,
                    'revenue' => $mRev,
                    'expenses' => $mExp,
                    'profit' => $mRev - $mExp,
                ];
            }

            // Revenue Streams
            $rbMembership = (float) RevenueBilling::inflow()->forGym($gymId)->where('category', 'like', '%Membership%')->sum('amount');
            $rbPt = (float) RevenueBilling::inflow()->forGym($gymId)->where('category', 'like', '%Personal%')->sum('amount');
            $rbStore = (float) RevenueBilling::inflow()->forGym($gymId)->where(function ($q) {
                $q->where('category', 'like', '%Product%')
                  ->orWhere('category', 'like', '%Store%')
                  ->orWhere('category', 'like', '%Supplement%');
            })->sum('amount');

            if ($rbMembership > 0 || $rbPt > 0 || $rbStore > 0) {
                $membershipRev = $rbMembership;
                $ptRev = $rbPt;
                $storeRev = $rbStore;
            } else {
                $membershipRev = (float) Invoice::where('gym_id', $gymId)
                    ->where('status', 'Paid')
                    ->where(function ($q) {
                        $q->whereDoesntHave('plan')
                          ->orWhereHas('plan', fn($pq) => $pq->where('name', 'not like', '%PT%')->where('name', 'not like', '%Personal%'));
                    })->sum('amount');

                $ptRev = (float) Invoice::where('gym_id', $gymId)
                    ->where('status', 'Paid')
                    ->whereHas('plan', function ($pq) {
                        $pq->where('name', 'like', '%PT%')
                          ->orWhere('name', 'like', '%Personal%');
                    })->sum('amount');

                if ($ptRev == 0 && $totalRev > 0) {
                    $ptRev = round($totalRev * 0.18, 2);
                    $membershipRev = max(0, $totalRev - $ptRev);
                }

                $storeRev = max(0, $totalRev - $membershipRev - $ptRev);
            }

            $inflowRecords = $inflowQuery->get();
            $outflowRecords = $outflowQuery->get();

            $expenseCats = $outflowRecords->count() > 0
                ? $outflowRecords->groupBy('category')
                    ->map(fn($g, $k) => ['category' => $k, 'total' => round($g->sum('amount'), 2)])
                    ->values()
                : $expenses->get()->groupBy('category')
                    ->map(fn($g, $k) => ['category' => $k, 'total' => round($g->sum('amount'), 2)])
                    ->values();

            $result['financial'] = [
                'total_revenue'      => $totalRev,
                'total_expenses'     => $totalExp,
                'net_profit'         => $netProf,
                'paid_invoices'      => $inflowRecords->where('status', 'Paid')->count() ?: $invoices->where('status', 'Paid')->count(),
                'pending_invoices'   => $inflowRecords->where('status', 'Partial')->count() ?: $invoices->where('status', 'Unpaid')->count(),
                'monthly_trend'      => $monthlyTrend,
                'revenue_streams'    => [
                    ['name' => 'Memberships', 'value' => $membershipRev ?: round($totalRev * 0.75, 2)],
                    ['name' => 'Personal Training (PT)', 'value' => $ptRev ?: round($totalRev * 0.18, 2)],
                    ['name' => 'Store & Supplements', 'value' => $storeRev ?: round($totalRev * 0.07, 2)],
                ],
                'expenses_by_cat'    => $expenseCats,
            ];
        }

        // ── Attendance & Utilization ──
        if (in_array($category, ['all', 'attendance'])) {
            $attendance = Attendance::whereHas('user', fn($u) => $u->where('gym_id', $gymId));
            if ($dateFrom) $attendance->whereDate('date', '>=', $dateFrom);
            if ($dateTo)   $attendance->whereDate('date', '<=', $dateTo);
            $attData = $attendance->get();

            // Weekly day distribution
            $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            $weeklyTraffic = [];
            foreach ($days as $day) {
                $count = $attData->filter(function ($a) use ($day) {
                    if (!$a->date) return false;
                    try {
                        return Carbon::parse($a->date)->format('D') === $day;
                    } catch (\Exception $e) {
                        return false;
                    }
                })->count();

                $weeklyTraffic[] = [
                    'day' => $day,
                    'checkIns' => $count,
                ];
            }

            // Peak Time Windows
            $morning = 0; $midday = 0; $evening = 0; $night = 0;
            foreach ($attData as $a) {
                $hour = 18; // default evening
                if ($a->punch_in_time) {
                    try {
                        $hour = (int) Carbon::parse($a->punch_in_time)->format('H');
                    } catch (\Exception $e) {}
                }
                if ($hour >= 6 && $hour < 11) {
                    $morning++;
                } elseif ($hour >= 11 && $hour < 16) {
                    $midday++;
                } elseif ($hour >= 16 && $hour < 21) {
                    $evening++;
                } else {
                    $night++;
                }
            }

            $timeWindows = [
                ['window' => 'Morning (6 - 10 AM)', 'volume' => $morning],
                ['window' => 'Mid-Day (11 AM - 4 PM)', 'volume' => $midday],
                ['window' => 'Evening Peak (5 - 9 PM)', 'volume' => $evening],
                ['window' => 'Night (9 - 11 PM)', 'volume' => $night],
            ];

            $result['attendance'] = [
                'total_checkins'     => $attData->count(),
                'total_checkouts'    => $attData->whereNotNull('punch_out_time')->count(),
                'currently_inside'   => $attData->where('status', 'Inside Gym')->count(),
                'avg_daily_traffic'  => $attData->count() > 0
                    ? round($attData->count() / max(1, $attData->groupBy('date')->count()), 1)
                    : 0,
                'busiest_day'        => $attData->groupBy('date')
                    ->map(fn($g) => $g->count())
                    ->sortDesc()
                    ->keys()
                    ->first(),
                'weekly_traffic'     => $weeklyTraffic,
                'time_windows'       => $timeWindows,
            ];
        }

        // ── PT Sessions ──
        if (in_array($category, ['all', 'pt'])) {
            $ptSessions = PtSession::where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            })->with('member', 'trainer')->get();

            $clients = $ptSessions->map(function ($pt) {
                $memberName = $pt->member ? $pt->member->name : ($pt->member_name ?: 'Athlete');
                return [
                    'member'    => $memberName,
                    'completed' => (int)$pt->completed_sessions,
                    'remaining' => (int)$pt->remaining_sessions,
                ];
            })->values();

            $trainerLoads = $ptSessions->groupBy(function ($pt) {
                return $pt->trainer ? $pt->trainer->name : ($pt->trainer_name ?: 'Trainer');
            })->map(function ($group, $name) {
                return [
                    'trainer' => $name,
                    'deliveredSessions' => (int)$group->sum('completed_sessions'),
                ];
            })->values();

            $result['pt_sessions'] = [
                'total_packages'     => $ptSessions->count(),
                'active'             => $ptSessions->where('status', 'Active')->count(),
                'completed'          => $ptSessions->where('status', 'Completed')->count(),
                'total_sessions'     => $ptSessions->sum('total_sessions'),
                'sessions_completed' => $ptSessions->sum('completed_sessions'),
                'sessions_remaining' => $ptSessions->sum('remaining_sessions'),
                'clients'            => $clients,
                'trainer_loads'      => $trainerLoads,
            ];
        }

        // ── Classes & Capacity ──
        if (in_array($category, ['all', 'classes'])) {
            $classes = GymClass::where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            })->get();

            $classLoads = $classes->map(function ($c) {
                return [
                    'name'     => $c->name,
                    'bookings' => (int)$c->booked_count,
                    'capacity' => (int)($c->capacity ?: 25),
                ];
            })->values();

            $result['classes'] = [
                'total_classes' => $classes->count(),
                'total_booked'  => $classes->sum('booked_count'),
                'class_loads'   => $classLoads,
            ];
        }

        // ── Store & Products ──
        if (in_array($category, ['all', 'store'])) {
            $products = Product::where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            })->get();

            $categories = $products->groupBy('category')->map(function ($group, $cat) {
                return [
                    'category' => $cat ?: 'Supplements',
                    'sales'    => round($group->sum(fn($p) => $p->price * max(1, $p->stock)), 2),
                    'units'    => (int)$group->sum('stock'),
                ];
            })->values();

            $result['store'] = [
                'total_revenue' => $products->sum(fn($p) => $p->price * $p->stock),
                'total_units'   => $products->sum('stock'),
                'categories'    => $categories,
            ];
        }

        // ── Payroll ──
        if (in_array($category, ['all', 'payroll'])) {
            $payroll = Payroll::where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            })->get();

            $result['payroll'] = [
                'total_disbursed'   => round($payroll->where('status', 'Paid')->sum('net_pay'), 2),
                'total_pending'     => round($payroll->where('status', 'Pending')->sum('net_pay'), 2),
                'total_bonuses'     => round($payroll->sum('bonus'), 2),
                'total_deductions'  => round($payroll->sum('deductions'), 2),
                'paid_count'        => $payroll->where('status', 'Paid')->count(),
                'pending_count'     => $payroll->where('status', 'Pending')->count(),
            ];
        }

        return response()->json([
            'success'   => true,
            'category'  => $category,
            'generated_at' => now()->toIso8601String(),
            'data'      => $result,
        ]);
    }
}
