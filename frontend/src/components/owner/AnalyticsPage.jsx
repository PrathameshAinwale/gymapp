import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  IndianRupee,
  CalendarCheck,
  Clock,
  Dumbbell,
  Layers,
  ShoppingBag,
  PieChart as PieIcon,
  Printer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Database,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const PALETTE = {
  emerald: '#10B981',
  indigo: '#6366F1',
  blue: '#3B82F6',
  amber: '#F59E0B',
  rose: '#F43F5E',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  slate: '#64748B'
};

const PIE_COLORS = ['#10B981', '#6366F1', '#3B82F6', '#F59E0B', '#EC4899', '#14B8A6', '#8B5CF6'];

// Reusable Empty State for Charts with No Real Records in Database
const EmptyChartState = ({
  icon: Icon = Database,
  title = 'No Data Recorded',
  message = 'No records found in the database yet.',
  height = 'h-72'
}) => (
  <div className={`${height} w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 select-none`}>
    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 mb-3">
      <Icon className="w-6 h-6 text-slate-400" />
    </div>
    <p className="text-sm font-bold text-slate-700">{title}</p>
    <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">{message}</p>
  </div>
);

export const AnalyticsPage = () => {
  const {
    members = [],
    invoices = [],
    expenses = [],
    attendance = [],
    ptSessions = [],
    products = [],
    bookedClasses = [],
    fetchInvoices,
    fetchExpenses,
    fetchMembers,
    fetchAttendance,
    calculateMemberStatus
  } = useGymData();

  const { canAccessFinancials, currentUser } = useAuth();
  const currentGymId = currentUser?.gymId || currentUser?.gym_id || localStorage.getItem('pulsefit_gym_id');
  const [activeTab, setActiveTab] = useState('overview');
  const [dbData, setDbData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const tabsScrollRef = useRef(null);

  // Scoped fallback data for current gym
  const gymInvoices = useMemo(() => {
    if (!currentGymId) return invoices;
    return invoices.filter(inv => !inv.gymId || String(inv.gymId) === String(currentGymId));
  }, [invoices, currentGymId]);

  const gymExpenses = useMemo(() => {
    if (!currentGymId) return expenses;
    return expenses.filter(exp => !exp.gymId || String(exp.gymId) === String(currentGymId));
  }, [expenses, currentGymId]);

  const gymMembers = useMemo(() => {
    if (!currentGymId) return members;
    return members.filter(m => !m.gymId || String(m.gymId) === String(currentGymId));
  }, [members, currentGymId]);

  // Fetch real database aggregations from backend API
  const fetchDbAnalytics = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);

    try {
      const [repRes] = await Promise.allSettled([
        api.reports.getSummary({ gym_id: currentGymId }),
        fetchInvoices?.(),
        fetchExpenses?.(),
        fetchMembers?.(),
        fetchAttendance?.()
      ]);
      if (repRes.status === 'fulfilled' && repRes.value?.data) {
        setDbData(repRes.value.data);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Could not fetch backend report summary, using local context data:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDbAnalytics();
  }, [currentGymId]);

  // Category navigation tabs
  const CATEGORY_TABS = [
    { id: 'overview', label: 'Overview Dashboard', icon: BarChart3 },
    ...(canAccessFinancials
      ? [{ id: 'finance', label: 'Cash Flow & Financials', icon: IndianRupee }]
      : []),
    { id: 'members', label: 'Members & Subscriptions', icon: Users },
    { id: 'attendance', label: 'Footfall & Attendance', icon: CalendarCheck },
    { id: 'pt', label: 'Coaching & PT Packages', icon: Dumbbell },
    { id: 'classes', label: 'Classes & Batch Capacity', icon: Layers },
    { id: 'store', label: 'Pro Shop & Merchandise', icon: ShoppingBag }
  ];

  const scrollTabs = (direction) => {
    if (tabsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-white text-xs z-50">
          <div className="font-semibold text-slate-300 mb-1 border-b border-slate-700/60 pb-1">
            {label}
          </div>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color || entry.fill }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-100 font-mono">
                  {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}{suffix}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // 1. FINANCIAL DATA (100% Real Database Calculations)
  const financialData = useMemo(() => {
    const rawFin = dbData?.financial;
    const totalInflow = rawFin?.total_revenue ?? gymInvoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalExpenses = rawFin?.total_expenses ?? gymExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = rawFin?.net_profit ?? (totalInflow - totalExpenses);
    const paidInvoicesCount = rawFin?.paid_invoices ?? gymInvoices.filter((i) => i.status === 'Paid').length;
    const pendingInvoicesCount = rawFin?.pending_invoices ?? gymInvoices.filter((i) => i.status !== 'Paid').length;

    // Monthly Trend from DB or calculated dynamically from actual gym invoices/expenses
    let monthlyTrend = [];
    if (rawFin?.monthly_trend && rawFin.monthly_trend.length > 0) {
      monthlyTrend = rawFin.monthly_trend;
    } else {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('en-US', { month: 'short' });
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mRev = gymInvoices
          .filter(inv => inv.status === 'Paid' && (inv.issueDate || inv.date || '').startsWith(ym))
          .reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
        const mExp = gymExpenses
          .filter(exp => (exp.date || '').startsWith(ym))
          .reduce((s, exp) => s + (Number(exp.amount) || 0), 0);
        monthlyTrend.push({
          month: monthName,
          revenue: mRev,
          expenses: mExp,
          profit: mRev - mExp
        });
      }
    }

    // Revenue streams from DB (only active streams with real value > 0)
    let revenueStreams = [];
    if (rawFin?.revenue_streams && rawFin.revenue_streams.length > 0) {
      revenueStreams = rawFin.revenue_streams
        .map((s, idx) => ({
          ...s,
          color: [PALETTE.emerald, PALETTE.indigo, PALETTE.amber][idx % 3]
        }))
        .filter(s => s.value > 0);
    } else if (totalInflow > 0) {
      revenueStreams = [
        { name: 'Memberships', value: totalInflow, color: PALETTE.emerald }
      ];
    }

    // Expenses breakdown from DB (empty array if 0 expenses)
    let expenseCategories = [];
    if (rawFin?.expenses_by_cat && rawFin.expenses_by_cat.length > 0) {
      expenseCategories = rawFin.expenses_by_cat.map((item, idx) => ({
        category: item.category,
        amount: item.total,
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }));
    } else if (gymExpenses.length > 0) {
      const map = {};
      gymExpenses.forEach(e => {
        const cat = e.category || 'General';
        map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
      });
      expenseCategories = Object.entries(map).map(([category, amount], idx) => ({
        category,
        amount,
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }));
    }

    return {
      totalInflow,
      totalExpenses,
      netProfit,
      paidInvoicesCount,
      pendingInvoicesCount,
      monthlyTrend,
      revenueStreams,
      expenseCategories
    };
  }, [dbData, gymInvoices, gymExpenses]);

  // 2. MEMBER DATA (100% Real Database Calculations)
  const memberData = useMemo(() => {
    const rawMem = dbData?.members;
    const getS = (m) => (calculateMemberStatus ? calculateMemberStatus(m?.expiryDate, m?.status) : (m?.status || 'Active'));
    const total = rawMem?.total ?? gymMembers.length;
    const active = rawMem?.active ?? gymMembers.filter((m) => getS(m).toLowerCase() === 'active').length;
    const expiring = rawMem?.expiring_soon ?? gymMembers.filter((m) => getS(m).toLowerCase() === 'expiring soon').length;
    const expired = rawMem?.expired ?? gymMembers.filter((m) => getS(m).toLowerCase() === 'expired').length;
    const frozen = rawMem?.frozen ?? gymMembers.filter((m) => getS(m).toLowerCase() === 'frozen' || getS(m).toLowerCase() === 'on hold').length;

    const statusBreakdown = [
      { name: 'Active', value: active, fill: PALETTE.emerald },
      { name: 'Expiring Soon', value: expiring, fill: PALETTE.amber },
      { name: 'Expired', value: expired, fill: PALETTE.rose },
      { name: 'Frozen', value: frozen, fill: PALETTE.blue }
    ].filter((item) => item.value > 0);

    let planDistribution = [];
    if (rawMem?.by_plan && rawMem.by_plan.length > 0) {
      planDistribution = rawMem.by_plan
        .map((item, idx) => ({
          name: item.name ? item.name.replace(' Membership', '') : 'General',
          count: item.count,
          fill: PIE_COLORS[idx % PIE_COLORS.length]
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);
    } else if (gymMembers.length > 0) {
      const map = {};
      gymMembers.forEach(m => {
        const plan = m.planName || m.plan || 'General';
        map[plan] = (map[plan] || 0) + 1;
      });
      planDistribution = Object.entries(map).map(([name, count], idx) => ({
        name: name.replace(' Membership', ''),
        count,
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      })).sort((a, b) => b.count - a.count);
    }

    return {
      total,
      active,
      expiring,
      expired,
      statusBreakdown,
      planDistribution
    };
  }, [dbData, gymMembers, calculateMemberStatus]);

  // 3. ATTENDANCE FOOTFALL DATA (100% Real Database Calculations)
  const attendanceData = useMemo(() => {
    const rawAtt = dbData?.attendance;
    const totalCheckins = rawAtt?.total_checkins ?? attendance.length;
    const busiestDay = rawAtt?.busiest_day
      ? new Date(rawAtt.busiest_day).toLocaleDateString('en-US', { weekday: 'long' })
      : (totalCheckins > 0 ? 'Recorded' : 'None');

    const weeklyTraffic = (rawAtt?.weekly_traffic && rawAtt.weekly_traffic.length > 0)
      ? rawAtt.weekly_traffic
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
          day,
          checkIns: 0
        }));

    const timeWindows = (rawAtt?.time_windows && rawAtt.time_windows.length > 0)
      ? rawAtt.time_windows.map((w, idx) => ({
          ...w,
          fill: [PALETTE.emerald, PALETTE.blue, PALETTE.indigo, PALETTE.slate][idx % 4]
        }))
      : [
          { window: 'Morning (6 - 10 AM)', volume: 0, fill: PALETTE.emerald },
          { window: 'Mid-Day (11 AM - 4 PM)', volume: 0, fill: PALETTE.blue },
          { window: 'Evening Peak (5 - 9 PM)', volume: 0, fill: PALETTE.indigo },
          { window: 'Night (9 - 11 PM)', volume: 0, fill: PALETTE.slate }
        ];

    const hasTraffic = weeklyTraffic.some(d => d.checkIns > 0);
    const hasTimeWindowTraffic = timeWindows.some(w => w.volume > 0);

    return {
      totalCheckins,
      busiestDay,
      weeklyTraffic,
      timeWindows,
      hasTraffic,
      hasTimeWindowTraffic
    };
  }, [dbData, attendance]);

  // 4. PT DATA (100% Real Database Calculations)
  const ptData = useMemo(() => {
    const rawPt = dbData?.pt_sessions;
    const totalPackages = rawPt?.total_packages ?? (ptSessions ? ptSessions.length : 0);
    const activePackages = rawPt?.active ?? 0;

    let clients = [];
    if (rawPt?.clients && rawPt.clients.length > 0) {
      clients = rawPt.clients;
    } else if (ptSessions.length > 0) {
      clients = ptSessions.map(pt => ({
        member: pt.memberName || pt.member?.name || 'Athlete',
        completed: Number(pt.completedSessions || pt.completed_sessions || 0),
        remaining: Number(pt.remainingSessions || pt.remaining_sessions || 0)
      }));
    }

    let trainerLoads = [];
    if (rawPt?.trainer_loads && rawPt.trainer_loads.length > 0) {
      trainerLoads = rawPt.trainer_loads.map((t, idx) => ({
        ...t,
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }));
    } else if (ptSessions.length > 0) {
      const map = {};
      ptSessions.forEach(pt => {
        const tr = pt.trainerName || pt.trainer?.name || 'Trainer';
        map[tr] = (map[tr] || 0) + Number(pt.completedSessions || pt.completed_sessions || 0);
      });
      trainerLoads = Object.entries(map).map(([trainer, deliveredSessions], idx) => ({
        trainer,
        deliveredSessions,
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }));
    }

    return {
      totalPackages,
      activePackages,
      clients,
      trainerLoads
    };
  }, [dbData, ptSessions]);

  // 5. CLASSES DATA (100% Real Database Calculations)
  const classData = useMemo(() => {
    const rawClasses = dbData?.classes;
    const totalClasses = rawClasses?.total_classes ?? (bookedClasses ? bookedClasses.length : 0);

    let classLoads = [];
    if (rawClasses?.class_loads && rawClasses.class_loads.length > 0) {
      classLoads = rawClasses.class_loads;
    } else if (bookedClasses && bookedClasses.length > 0) {
      classLoads = bookedClasses.map(c => ({
        name: c.name || c.title || 'Class',
        bookings: Number(c.bookedCount || c.enrolledCount || 0),
        capacity: Number(c.capacity || 20)
      }));
    }

    return {
      totalClasses,
      classLoads
    };
  }, [dbData, bookedClasses]);

  // 6. STORE / PRODUCTS DATA (100% Real Database Calculations)
  const storeData = useMemo(() => {
    const rawStore = dbData?.store;
    const totalProducts = products ? products.length : 0;
    const totalCatalogValue = rawStore?.total_revenue ?? 0;

    let categories = [];
    if (rawStore?.categories && rawStore.categories.length > 0) {
      categories = rawStore.categories.map((c, idx) => ({
        ...c,
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }));
    } else if (products && products.length > 0) {
      const map = {};
      const units = {};
      products.forEach(p => {
        const cat = p.category || 'General';
        const price = Number(p.price || 0);
        const stock = Number(p.stock || p.stockQuantity || 0);
        map[cat] = (map[cat] || 0) + (price * stock);
        units[cat] = (units[cat] || 0) + stock;
      });
      categories = Object.entries(map).map(([category, sales], idx) => ({
        category,
        sales,
        units: units[category] || 0,
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }));
    }

    return {
      totalProducts,
      totalCatalogValue,
      categories
    };
  }, [dbData, products]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Gym Analytics & Visual Insights
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Database className="w-3 h-3 text-emerald-600" />
                Live Database
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live visual charts and historical trends aggregated from your gym's database.
              {lastSyncTime && <span className="ml-1.5 text-slate-400">Synced at {lastSyncTime}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDbAnalytics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            title="Print Summary"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ── TOP LIVE METRIC SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Inflow */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              ₹{financialData.totalInflow.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">{financialData.paidInvoicesCount}</span> paid invoices
          </p>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              ₹{financialData.totalExpenses.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Net: <span className={`font-semibold ${financialData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₹{financialData.netProfit.toLocaleString('en-IN')}
            </span>
          </p>
        </div>

        {/* Active Members */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Members</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {memberData.active}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total: <span className="font-semibold text-slate-700">{memberData.total}</span> registered
          </p>
        </div>

        {/* PT Packages */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">PT Packages</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {ptData.totalPackages}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            <span className="font-semibold text-purple-600">{ptData.clients.length}</span> active client quota
          </p>
        </div>
      </div>

      {/* ── HORIZONTAL SLIDER TAB BAR (DOMAINS) ── */}
      <div className="relative bg-white border border-slate-200 p-2 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Tabs Track */}
          <div
            ref={tabsScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth w-full"
          >
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm font-bold scale-[1.02]'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. OVERVIEW DASHBOARD VIEW (PURE CHARTS) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Revenue Trajectory */}
          {canAccessFinancials && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Revenue vs Expenses (Last 6 Months)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly cash inflow vs recorded operational spending from database.
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialData.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip prefix="₹" />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke={PALETTE.emerald}
                      strokeWidth={2.5}
                      fill="url(#revGradient)"
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill={PALETTE.rose}
                      opacity={0.8}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 2: Member Plans */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Members by Subscription Plan
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live distribution of active athletes across registered plans in database.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {memberData.planDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberData.planDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip suffix=" members" />} />
                    <Bar dataKey="count" name="Subscribers" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {memberData.planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={Users}
                  title="No Plan Subscriptions"
                  message="No members are currently linked to subscription plans in the database."
                />
              )}
            </div>
          </div>

          {/* Chart 3: Weekly Footfall */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                  Weekly Footfall (Mon – Sun)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live member turnstile punches recorded in attendances table.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Peak: {attendanceData.busiestDay}
              </span>
            </div>

            <div className="h-72 w-full">
              {attendanceData.hasTraffic ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData.weeklyTraffic} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip suffix=" check-ins" />} />
                    <Bar dataKey="checkIns" name="Check-ins" fill={PALETTE.blue} radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={CalendarCheck}
                  title="No Attendance Check-ins"
                  message="No member turnstile punches recorded in the database yet."
                />
              )}
            </div>
          </div>

          {/* Chart 4: Revenue by Stream */}
          {canAccessFinancials && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-amber-500" />
                    Revenue by Stream
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Share of revenue calculated from paid invoices and product sales.
                  </p>
                </div>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                {financialData.revenueStreams.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip prefix="₹" />} />
                      <Pie
                        data={financialData.revenueStreams}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                      >
                        {financialData.revenueStreams.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState
                    icon={PieIcon}
                    title="No Revenue Streams"
                    message="No paid invoices or sales recorded in the database yet."
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. CASH FLOW & FINANCIALS VIEW (PURE CHARTS) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'finance' && canAccessFinancials && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Monthly Cash Inflow vs Expenses
            </h2>
            <p className="text-xs text-slate-500 mb-4">6-month trend aggregated from invoices and expenses tables.</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialData.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Revenue" fill={PALETTE.emerald} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" name="Expenses" fill={PALETTE.rose} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operational Expense Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <IndianRupee className="w-4 h-4 text-rose-500" />
              Expense Allocation Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-4">Live expense categories summed from database records.</p>
            <div className="h-72 w-full">
              {financialData.expenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData.expenseCategories} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" stroke="#94A3B8" fontSize={11} tickLine={false} width={100} />
                    <Tooltip content={<CustomTooltip prefix="₹" />} />
                    <Bar dataKey="amount" name="Expense (₹)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {financialData.expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={IndianRupee}
                  title="No Expenses Logged"
                  message="No operating expenses or bills recorded in the database."
                />
              )}
            </div>
          </div>

          {/* Revenue by Stream Donut */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-amber-500" />
              Revenue by Stream Distribution
            </h2>
            <p className="text-xs text-slate-500 mb-4">Breakdown of gross revenue between memberships, personal training, and shop merchandise.</p>
            <div className="h-72 w-full flex items-center justify-center">
              {financialData.revenueStreams.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip prefix="₹" />} />
                    <Pie
                      data={financialData.revenueStreams}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                    >
                      {financialData.revenueStreams.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={PieIcon}
                  title="No Revenue Streams"
                  message="No revenue billing records or paid invoices found in the database."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. MEMBERS & SUBSCRIPTIONS VIEW (PURE CHARTS) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-indigo-600" />
              Subscribers by Plan Tier
            </h2>
            <p className="text-xs text-slate-500 mb-4">Actual member subscriptions linked to plans in database.</p>
            <div className="h-72 w-full">
              {memberData.planDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberData.planDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip suffix=" members" />} />
                    <Bar dataKey="count" name="Subscribers" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {memberData.planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={Users}
                  title="No Plan Subscriptions"
                  message="No active members mapped to plans in the database."
                />
              )}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              Membership Status Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-4">Live breakdown of Active, Expiring, and Expired members.</p>
            <div className="h-72 w-full flex items-center justify-center">
              {memberData.statusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip suffix=" members" />} />
                    <Pie
                      data={memberData.statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {memberData.statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={PieIcon}
                  title="No Member Records"
                  message="No members found in the database."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 4. FOOTFALL & ATTENDANCE VIEW (PURE CHARTS) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Load */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <CalendarCheck className="w-4 h-4 text-blue-600" />
              Weekly Day-by-Day Turnstile Load
            </h2>
            <p className="text-xs text-slate-500 mb-4">Actual day-wise attendance distribution from database.</p>
            <div className="h-72 w-full">
              {attendanceData.hasTraffic ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData.weeklyTraffic} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip suffix=" check-ins" />} />
                    <Bar dataKey="checkIns" name="Check-ins" fill={PALETTE.blue} radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={CalendarCheck}
                  title="No Attendance Punches"
                  message="No attendance records logged in the database yet."
                />
              )}
            </div>
          </div>

          {/* Peak Time Windows */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-indigo-600" />
              Peak Workout Time Windows
            </h2>
            <p className="text-xs text-slate-500 mb-4">Punches mapped by check-in timestamp in database.</p>
            <div className="h-72 w-full">
              {attendanceData.hasTimeWindowTraffic ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData.timeWindows} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="window" stroke="#94A3B8" fontSize={10} tickLine={false} width={110} />
                    <Tooltip content={<CustomTooltip suffix=" check-ins" />} />
                    <Bar dataKey="volume" name="Athletes" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {attendanceData.timeWindows.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={Clock}
                  title="No Time Punch Data"
                  message="No attendance check-in timestamps found in the database."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 5. COACHING & PT PACKAGES VIEW (PURE CHARTS) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'pt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PT Sessions Status per Client */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-emerald-600" />
              PT Client Quota Progress
            </h2>
            <p className="text-xs text-slate-500 mb-4">Completed sessions vs remaining quota per registered client in DB.</p>
            <div className="h-72 w-full">
              {ptData.clients.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ptData.clients} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="member" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip suffix=" sessions" />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="completed" name="Completed (OTP)" fill={PALETTE.emerald} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="remaining" name="Remaining Quota" fill={PALETTE.slate} opacity={0.4} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={Dumbbell}
                  title="No PT Packages"
                  message="No active personal training packages found in the database."
                />
              )}
            </div>
          </div>

          {/* Sessions Delivered by Trainer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-indigo-600" />
              Sessions Delivered by Coach
            </h2>
            <p className="text-xs text-slate-500 mb-4">Delivered session count aggregated by assigned trainer.</p>
            <div className="h-72 w-full">
              {ptData.trainerLoads.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ptData.trainerLoads} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="trainer" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip suffix=" sessions" />} />
                    <Bar dataKey="deliveredSessions" name="Sessions Delivered" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {ptData.trainerLoads.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  icon={Users}
                  title="No Coach Sessions"
                  message="No coaches or personal training delivery sessions found in the database."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 6. CLASSES & BATCH CAPACITY VIEW (PURE CHARTS) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'classes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-indigo-600" />
            Class Capacity & Bookings Volume
          </h2>
          <p className="text-xs text-slate-500 mb-4">Enrolled athletes vs total available slots from gym_classes table in database.</p>
          <div className="h-80 w-full">
            {classData.classLoads.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData.classLoads} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip suffix=" athletes" />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="bookings" name="Enrolled Athletes" fill={PALETTE.indigo} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="capacity" name="Max Capacity" fill={PALETTE.slate} opacity={0.3} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                icon={Layers}
                title="No Classes Scheduled"
                message="No group fitness classes or batch schedules found in the database."
                height="h-80"
              />
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 7. PRO SHOP & MERCHANDISE VIEW (PURE CHARTS) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'store' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            Inventory Value by Product Category
          </h2>
          <p className="text-xs text-slate-500 mb-4">Stock values aggregated from the products table in database.</p>
          <div className="h-80 w-full">
            {storeData.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storeData.categories} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="category" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Bar dataKey="sales" name="Catalog Value (₹)" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {storeData.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                icon={ShoppingBag}
                title="No Store Inventory"
                message="No products or merchandise registered in the database."
                height="h-80"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
