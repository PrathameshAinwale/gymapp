import React, { useState, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { AddMemberModal } from './AddMemberModal';
import {
  CustomizeStatCardsModal,
  ALL_STAT_CARD_DEFINITIONS,
  DEFAULT_CARD_IDS,
  DEFAULT_MANAGER_CARD_IDS
} from './CustomizeStatCardsModal';
import { getTodayIso, recordMatchesDate } from '../../utils/dateUtils';
import {
  Users,
  AlertTriangle,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  CalendarCheck,
  MessageCircle,
  Flame,
  ShoppingBag,
  Activity,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Plus,
  UserPlus,
  Loader2,
  SlidersHorizontal,
  X,
  PieChart as PieChartIcon,
  Dumbbell,
  Calendar,
  Wrench,
  Coins,
  FileText,
  PauseCircle,
  Award,
  ArrowUpRight,
  ExternalLink,
  RotateCcw,
  Clock,
  Layers,
  BarChart3,
  RotateCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const OwnerDashboard = ({ setActiveTab, onOpenAddMember }) => {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCustomizeCardsOpen, setIsCustomizeCardsOpen] = useState(false);

  const {
    members = [],
    trainers = [],
    plans = [],
    invoices = [],
    ownerStats,
    revenueAnalytics,
    attendance = [],
    enquiries = [],
    products = [],
    membershipFreezes = [],
    classes = [],
    equipment = [],
    ptSessions = [],
    advanceRequests = [],
    calculateMemberStatus,
    fetchAllFromBackend,
    addEnquiry,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchAllFromBackend?.();
  }, [fetchAllFromBackend]);

  const { currentUser, currentRole, canAccessFinancials } = useAuth();

  // Segment tab state for Priority Action Hub (reduces page clutter)
  const [activeActionTab, setActiveActionTab] = useState('leads'); // 'leads' | 'renewals'

  // Customizable Stat Cards LocalStorage State
  const defaultCardIds = canAccessFinancials ? DEFAULT_CARD_IDS : DEFAULT_MANAGER_CARD_IDS;
  const [customCardIds, setCustomCardIds] = useState(() => {
    try {
      const saved = localStorage.getItem('pulsefit_custom_stat_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load custom stat cards:', e);
    }
    return defaultCardIds;
  });

  const handleSaveCustomCards = (newIds) => {
    setCustomCardIds(newIds);
    try {
      localStorage.setItem('pulsefit_custom_stat_cards', JSON.stringify(newIds));
      if (addToast) addToast('Dashboard cards layout updated successfully!');
    } catch (e) {
      console.warn('Failed to persist custom stat cards:', e);
    }
  };

  const handleRemoveCard = (cardId, e) => {
    if (e) e.stopPropagation();
    if (customCardIds.length <= 1) {
      if (addToast) addToast('You must keep at least 1 stat card on your dashboard.', 'error');
      return;
    }
    const next = customCardIds.filter((id) => id !== cardId);
    handleSaveCustomCards(next);
  };

  const handleResetCardsToDefault = () => {
    handleSaveCustomCards(defaultCardIds);
  };

  // New Enquiry Modal State
  const defaultStaffName = currentUser?.name
    ? `${currentUser.name} (${currentUser.role === 'owner' ? 'Owner' : 'Staff'})`
    : 'Pooja Sharma (Front Desk)';

  const [isAddEnquiryOpen, setIsAddEnquiryOpen] = useState(false);
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);
  const [enquiryFormData, setEnquiryFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Walk-in Visit',
    interestedPlan: plans[0]?.name || 'Gold Quarterly Fitness',
    goal: 'Weight Loss & Fitness',
    status: 'Warm',
    staffName: defaultStaffName,
    notes: ''
  });

  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleAddEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryFormData.name || !enquiryFormData.phone) return;

    try {
      setIsSubmittingEnquiry(true);
      const today = getTodayFormatted();
      const cleanNotes = (enquiryFormData.notes || '').replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();
      const stampedNote = cleanNotes ? `[${today}] ${cleanNotes}` : '';

      if (addEnquiry) {
        await addEnquiry({
          ...enquiryFormData,
          status: enquiryFormData.status || 'Warm',
          priority: ['Hot', 'Warm', 'Cold'].includes(enquiryFormData.status) ? enquiryFormData.status : 'Warm',
          notes: stampedNote,
          noteDate: cleanNotes ? today : null
        });
      }

      setIsAddEnquiryOpen(false);
      setEnquiryFormData({
        name: '',
        phone: '',
        email: '',
        source: 'Walk-in Visit',
        interestedPlan: plans[0]?.name || 'Gold Quarterly Fitness',
        goal: 'Weight Loss & Fitness',
        status: 'Warm',
        staffName: defaultStaffName,
        notes: ''
      });
      if (addToast) {
        addToast(`New enquiry for "${enquiryFormData.name}" added successfully!`);
      }
    } catch (err) {
      console.error('Failed to add enquiry:', err);
      if (addToast) {
        addToast('Failed to save enquiry', 'error');
      }
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  // Core metrics calculations
  const totalMembersCount = members.length;
  const getMemStatus = (m) => (calculateMemberStatus ? calculateMemberStatus(m?.expiryDate, m?.status) : (m?.status || 'Active'));
  const activeMembersCount = members.filter((m) => getMemStatus(m).toLowerCase() === 'active').length;
  const expiringMembers = members.filter((m) => {
    const s = getMemStatus(m).toLowerCase();
    return s === 'expired' || s === 'expiring soon';
  });
  const expiringSoonCount = members.filter((m) => getMemStatus(m).toLowerCase() === 'expiring soon').length;
  const expiredOnlyCount = members.filter((m) => getMemStatus(m).toLowerCase() === 'expired').length;
  const expiredMembersCount = expiringMembers.length;
  const frozenMembersCount = members.filter(
    (m) => getMemStatus(m).toLowerCase() === 'frozen' || getMemStatus(m).toLowerCase() === 'on hold'
  ).length;
  const inactiveOtherCount = Math.max(
    0,
    totalMembersCount - activeMembersCount - expiringSoonCount - expiredOnlyCount - frozenMembersCount
  );

  // Active vs All Users Pie Chart Data
  const memberPieData = [
    { name: 'Active Passes', value: activeMembersCount, color: '#10B981' },
    { name: 'Expiring Soon', value: expiringSoonCount, color: '#F59E0B' },
    { name: 'Expired', value: expiredOnlyCount, color: '#EF4444' },
    { name: 'Frozen / On Hold', value: frozenMembersCount, color: '#0EA5E9' },
    ...(inactiveOtherCount > 0
      ? [{ name: 'Inactive / Other', value: inactiveOtherCount, color: '#94A3B8' }]
      : [])
  ].filter((item) => item.value > 0);

  // If no members in database yet, provide clean placeholder
  const chartPieData =
    memberPieData.length > 0
      ? memberPieData
      : [
          { name: 'Active Passes', value: 1, color: '#10B981' },
          { name: 'Inactive', value: 0, color: '#94A3B8' }
        ];

  const activeRetentionPct = totalMembersCount > 0
    ? ((activeMembersCount / totalMembersCount) * 100).toFixed(0)
    : 0;

  // Leads metrics
  const hotLeads = enquiries.filter(
    (e) => e.status !== 'Converted' && (e.priority === 'Hot' || e.status === 'New Lead')
  );
  const lowStockProducts = products.filter((p) => p.stock <= (p.minStockAlert || 5));
  const pendingAdvances = advanceRequests.filter((r) => r.status === 'Pending');

  // Live Check-ins strictly for TODAY (resets to 0 each morning)
  const todayIso = getTodayIso();
  const todayAttendance = (attendance || []).filter((a) => recordMatchesDate(a, todayIso));
  const recentCheckIns = todayAttendance.slice(0, 4).map((a) => ({
    id: a.id,
    personName: a.memberName || a.name || 'Member',
    time: a.time || a.checkInTime || 'Today',
    mode: 'QR Pass Check-In'
  }));

  // Dynamic Revenue calculation from real database invoices & stats
  const currentPaidInvoicesSum = (invoices || [])
    .filter((inv) => (inv.status || '').toLowerCase() === 'paid')
    .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const totalRevenue =
    ownerStats?.monthlyRevenue != null && ownerStats.monthlyRevenue > 0
      ? ownerStats.monthlyRevenue
      : currentPaidInvoicesSum;

  const previousMonthRevenue = revenueAnalytics && revenueAnalytics.length >= 2
    ? (revenueAnalytics[revenueAnalytics.length - 2]?.revenue || 0)
    : 0;
  const momGrowthPct = previousMonthRevenue > 0
    ? (((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1)
    : (totalRevenue > 0 ? '+100.0' : '0.0');

  // Revenue chart data from backend database
  const revenueChartData = (revenueAnalytics && revenueAnalytics.length > 0)
    ? revenueAnalytics.map((item, idx, arr) => {
        if (idx === arr.length - 1) {
          return {
            month: item.month,
            revenue: totalRevenue || item.revenue || 0
          };
        }
        return {
          month: item.month,
          revenue: item.revenue || 0
        };
      })
    : [
        { month: 'Past', revenue: 0 },
        { month: 'Current', revenue: totalRevenue }
      ];

  // Dynamic values lookup map for all available stat cards
  const cardValuesMap = {
    active_members: activeMembersCount,
    total_members: totalMembersCount,
    renewals_due: expiredMembersCount,
    hot_leads: enquiries.length,
    monthly_revenue: `₹${(totalRevenue / 100000).toFixed(2)}L`,
    today_checkins: todayAttendance.length,
    pt_sessions: ptSessions.length,
    classes_today: classes.length,
    pending_advance: advanceRequests.filter((r) => r.status === 'Pending').length,
    equipment_alerts: equipment.filter((e) => e.status !== 'Operational' || e.condition === 'Fair' || e.condition === 'Needs Repair').length,
    pro_shop: lowStockProducts.length,
    frozen_members: membershipFreezes.filter((f) => f.status === 'Active' || f.status === 'Approved').length,
    unpaid_invoices: invoices.filter((i) => (i.status || '').toLowerCase() !== 'paid').length,
    coach_roster: trainers.length
  };

  // Build the active stat cards list based on customCardIds
  const activeStatCards = customCardIds
    .map((id) => ALL_STAT_CARD_DEFINITIONS.find((def) => def.id === id))
    .filter(Boolean)
    .filter((card) => canAccessFinancials || !card.restricted);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 max-w-7xl mx-auto">
      
      {/* 1. CLEAN & CALM HEADER */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                Gym Overview
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Welcome back. Here is your facility's real-time operational pulse and multi-module hub.
            </p>
          </div>

          {/* Action Buttons with high-contrast hover feedback */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 lg:pt-0">
            <button
              type="button"
              onClick={() => setIsAddEnquiryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] sm:text-xs font-bold border border-blue-200 hover:border-blue-300 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>New Enquiry</span>
            </button>

            {canAccessFinancials && (
              <button
                type="button"
                onClick={() => setActiveTab('financials')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] sm:text-xs font-bold border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 shadow-2xs"
              >
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                <span>Record Fee</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-[11px] sm:text-xs font-bold border border-slate-200 hover:border-teal-300 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 shadow-2xs"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-sm shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CUSTOMIZABLE STAT CARDS SECTION */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
              Operational Metrics
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {activeStatCards.length} Cards Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomizeCardsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold border border-slate-200 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customise Cards</span>
            </button>

            {customCardIds.join(',') !== defaultCardIds.join(',') && (
              <button
                type="button"
                onClick={handleResetCardsToDefault}
                title="Reset cards to default 4 layout"
                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {activeStatCards.map((card) => {
            const Icon = card.icon;
            const value = cardValuesMap[card.id] ?? '0';

            // Color specific styles
            const colorClasses = {
              emerald: {
                bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                borderHover: 'hover:border-emerald-300',
                linkText: 'text-emerald-700',
                badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
              },
              amber: {
                bg: 'bg-amber-50 text-amber-600 border-amber-200',
                borderHover: 'hover:border-amber-300',
                linkText: 'text-amber-700',
                badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
              },
              rose: {
                bg: 'bg-rose-50 text-rose-600 border-rose-200',
                borderHover: 'hover:border-rose-300',
                linkText: 'text-rose-700',
                badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
              },
              indigo: {
                bg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
                borderHover: 'hover:border-indigo-300',
                linkText: 'text-indigo-700',
                badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
              },
              teal: {
                bg: 'bg-teal-50 text-teal-600 border-teal-200',
                borderHover: 'hover:border-teal-300',
                linkText: 'text-teal-700',
                badgeBg: 'bg-teal-50 text-teal-700 border-teal-200'
              },
              purple: {
                bg: 'bg-purple-50 text-purple-600 border-purple-200',
                borderHover: 'hover:border-purple-300',
                linkText: 'text-purple-700',
                badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
              },
              blue: {
                bg: 'bg-blue-50 text-blue-600 border-blue-200',
                borderHover: 'hover:border-blue-300',
                linkText: 'text-blue-700',
                badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
              },
              orange: {
                bg: 'bg-orange-50 text-orange-600 border-orange-200',
                borderHover: 'hover:border-orange-300',
                linkText: 'text-orange-700',
                badgeBg: 'bg-orange-50 text-orange-700 border-orange-200'
              },
              pink: {
                bg: 'bg-pink-50 text-pink-600 border-pink-200',
                borderHover: 'hover:border-pink-300',
                linkText: 'text-pink-700',
                badgeBg: 'bg-pink-50 text-pink-700 border-pink-200'
              },
              sky: {
                bg: 'bg-sky-50 text-sky-600 border-sky-200',
                borderHover: 'hover:border-sky-300',
                linkText: 'text-sky-700',
                badgeBg: 'bg-sky-50 text-sky-700 border-sky-200'
              },
              violet: {
                bg: 'bg-violet-50 text-violet-600 border-violet-200',
                borderHover: 'hover:border-violet-300',
                linkText: 'text-violet-700',
                badgeBg: 'bg-violet-50 text-violet-700 border-violet-200'
              }
            }[card.color] || {
              bg: 'bg-slate-100 text-slate-700 border-slate-200',
              borderHover: 'hover:border-slate-400',
              linkText: 'text-slate-700',
              badgeBg: 'bg-slate-100 text-slate-700 border-slate-200'
            };

            return (
              <div
                key={card.id}
                onClick={() => setActiveTab(card.tab)}
                className={`group relative bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3.5 shadow-2xs hover:shadow-sm ${colorClasses.borderHover} transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99]`}
              >
                {/* Remove Card 'X' Button on top-right */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveCard(card.id, e)}
                  title={`Remove ${card.label}`}
                  className="absolute top-2 right-2 p-1 rounded-md bg-slate-100/80 hover:bg-rose-100 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  <X className="w-2.5 h-2.5" />
                </button>

                {/* Top: Label + Icon */}
                <div className="flex items-center justify-between gap-1 pr-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                      {card.shortLabel || card.label}
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-semibold px-1 py-0.2 rounded border ${colorClasses.badgeBg} inline-block`}>
                      {card.badge}
                    </span>
                  </div>
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${colorClasses.bg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>

                {/* Bottom: Number + Compact Link */}
                <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-slate-100/80">
                  <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {value}
                  </div>
                  <div className={`flex items-center gap-0.5 text-[10px] font-bold ${colorClasses.linkText} group-hover:translate-x-0.5 transition-transform`}>
                    <span>View</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* "+ Add Card" compact interactive slot */}
          <div
            onClick={() => setIsCustomizeCardsOpen(true)}
            className="border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/20 rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[76px]"
          >
            <div className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600 flex items-center justify-center transition-colors mb-1">
              <Plus className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-700">
              + Customise
            </span>
            <span className="text-[9px] text-slate-400">
              Add / remove
            </span>
          </div>
        </div>
      </div>

      {/* 3. VISUAL ANALYTICS ROW: REVENUE TREND + ACTIVE VS ALL USER PIE CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
        
        {/* Revenue Growth Trend Area Chart (Left 7 Cols or Full if no revenue) */}
        {canAccessFinancials && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Revenue Growth Trend</h2>
                  <p className="text-xs text-slate-500">Monthly membership & trainer fee collections (Mar – Aug 2026)</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Total: ₹{Number(totalRevenue).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="h-48 sm:h-64 w-full mt-3 sm:mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)'
                      }}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ fill: '#059669', r: 3, strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 5, fill: '#059669' }}
                      fillOpacity={1}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Month-on-Month Growth: <strong className="text-emerald-600">{momGrowthPct}%</strong></span>
              <button
                type="button"
                onClick={() => setActiveTab('financials')}
                className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Financial Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE VS ALL USER PIE / DONUT CHART (Right 5 Cols or 12 Cols for manager) */}
        <div className={`${canAccessFinancials ? 'lg:col-span-5' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Active vs All Users
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live membership status distribution & retention
                </p>
              </div>

              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                {activeRetentionPct}% Active
              </span>
            </div>

            {/* Donut Chart with center label & legend */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center mt-3 sm:mt-4">
              {/* Donut Chart Visual */}
              <div className="sm:col-span-6 h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)'
                      }}
                      formatter={(val, name) => [
                        `${val} members (${((val / (totalMembersCount || 1)) * 100).toFixed(1)}%)`,
                        name
                      ]}
                    />
                    <Pie
                      data={chartPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {chartPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Statistic */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                    {activeMembersCount}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">
                    Active / {totalMembersCount}
                  </span>
                </div>
              </div>

              {/* Status Breakdown Legend with Clickable Filtering */}
              <div className="sm:col-span-6 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Membership Breakdown
                </div>
                {chartPieData.map((item) => {
                  const pct = totalMembersCount > 0 ? ((item.value / totalMembersCount) * 100).toFixed(0) : 0;
                  return (
                    <div
                      key={item.name}
                      onClick={() => setActiveTab('members')}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-right shrink-0">
                        <span className="font-bold text-slate-900">{item.value}</span>
                        <span className="text-[10px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
            <span className="text-slate-500">
              Total Lifetime: <strong>{totalMembersCount} athletes</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Member Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 4. STREAMLINED OPERATIONS DIRECTORY — IMPORTANT DETAILS ONLY (UNCLUTTERED) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              Operations Directory
            </h2>
            <span className="text-[10px] text-slate-400 hidden sm:inline">• Click any page to navigate</span>
          </div>
        </div>

        {/* Compact, clean 1-click launcher grid showing essential counts only */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
          
          {/* Module 1: Classes */}
          <div
            onClick={() => setActiveTab('classes')}
            className="group p-2.5 sm:p-3 bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                  Classes & Batches
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {classes.length} Schedules Active
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* Module 2: PT Sessions */}
          <div
            onClick={() => setActiveTab('pt-sessions')}
            className="group p-2.5 sm:p-3 bg-white hover:bg-purple-50/40 border border-slate-200 hover:border-purple-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700 truncate">
                  PT Sessions
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {ptSessions.length} Active Packages
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* Module 3: Invoices (Restricted for manager) */}
          {canAccessFinancials && (
            <div
              onClick={() => setActiveTab('invoices')}
              className="group p-2.5 sm:p-3 bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                    Invoices & Billing
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {invoices.length} Invoices Issued
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}

          {/* Module 4: Equipment */}
          <div
            onClick={() => setActiveTab('equipment')}
            className="group p-2.5 sm:p-3 bg-white hover:bg-orange-50/40 border border-slate-200 hover:border-orange-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-orange-700 truncate">
                  Equipment Health
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {equipment.filter(e => e.status === 'Operational').length}/{equipment.length} Operational
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* Module 5: Pro Shop */}
          <div
            onClick={() => setActiveTab('products')}
            className="group p-2.5 sm:p-3 bg-white hover:bg-pink-50/40 border border-slate-200 hover:border-pink-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 border border-pink-200 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-pink-700 truncate">
                  Pro Shop Store
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock` : `${products.length} Products`}
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* Module 6: Plans */}
          <div
            onClick={() => setActiveTab('plans')}
            className="group p-2.5 sm:p-3 bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                  Membership Plans
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {plans.length} Tier Options
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* Module 7: Advance Pay (Restricted for manager) */}
          {canAccessFinancials && (
            <div
              onClick={() => setActiveTab('advance-pay')}
              className="group p-2.5 sm:p-3 bg-white hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700 truncate">
                    Coach Advance Pay
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {advanceRequests.filter(r => r.status === 'Pending').length} Awaiting Approval
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}

          {/* Module 8: Freeze */}
          <div
            onClick={() => setActiveTab('membership-freeze')}
            className="group p-2.5 sm:p-3 bg-white hover:bg-sky-50/40 border border-slate-200 hover:border-sky-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0">
                <PauseCircle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700 truncate">
                  Freeze & Extensions
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {membershipFreezes.length} Active Holds
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* Module 9: Reports (Restricted for manager) */}
          {canAccessFinancials && (
            <div
              onClick={() => setActiveTab('reports')}
              className="group p-2.5 sm:p-3 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                    Facility Reports
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Analytics & Export
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}

        </div>
      </div>

      {/* Pending Salary Advance Notice Banner for Superadmin */}
      {canAccessFinancials && pendingAdvances.length > 0 && (
        <div
          onClick={() => setActiveTab('advance-pay')}
          className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-xs sm:text-sm block truncate">
                {pendingAdvances.length} Staff Salary Advance {pendingAdvances.length === 1 ? 'Application' : 'Applications'} Awaiting Sign-Off
              </span>
              <span className="text-[11px] text-amber-800 truncate block">
                Latest request from {pendingAdvances[0]?.staffName || pendingAdvances[0]?.trainerName} for ₹{Number(pendingAdvances[0]?.amount).toLocaleString('en-IN')}. Click to review & disburse.
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs hover:bg-amber-50">
            <span>Review Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* 5. MAIN WORKSPACE: PRIORITY ACTION HUB & LIVE STATUS STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
        
        {/* Left 8 Cols: Clean Segmented Priority Action Hub */}
        <div className="lg:col-span-8 space-y-3 sm:space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Today's Priority Actions</h3>
                <p className="text-xs text-slate-500">Items that require owner review or immediate callback</p>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveActionTab('leads')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeActionTab === 'leads'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hot Leads ({hotLeads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveActionTab('renewals')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeActionTab === 'renewals'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Renewals Due ({expiringMembers.length})
                </button>
                {canAccessFinancials && (
                  <button
                    type="button"
                    onClick={() => setActiveActionTab('advances')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeActionTab === 'advances'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Advances</span>
                    {pendingAdvances.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        {pendingAdvances.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* TAB 1: HOT LEADS */}
            {activeActionTab === 'leads' && (
              <div className="pt-4 space-y-3">
                {hotLeads.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                    <p>No pending hot leads. All prospects followed up!</p>
                    <button
                      type="button"
                      onClick={() => setIsAddEnquiryOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add New Enquiry</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hotLeads.slice(0, 4).map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 hover:bg-white transition-all flex flex-col justify-between space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{lead.name}</div>
                            <div className="text-[11px] text-emerald-700 font-medium">
                              {lead.interestedPlan}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {lead.priority}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          Phone: <span className="font-semibold text-slate-800">{lead.phone}</span>
                          {lead.notes && (
                            <p className="line-clamp-1 italic text-slate-500 mt-1">"{lead.notes}"</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <a
                            href={`https://wa.me/${(lead.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hi ${lead.name}, greetings from Pulse Fitness! Following up on your enquiry for ${lead.interestedPlan}. Would you like to book a complimentary trial session this week?`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setActiveTab('enquiries')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setActiveTab('enquiries')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    Open Full Enquiries CRM ({enquiries.length}) →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: RENEWALS DUE */}
            {activeActionTab === 'renewals' && (
              <div className="pt-4 space-y-3">
                {expiringMembers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    All memberships are active. No renewals due!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {expiringMembers.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 hover:bg-white transition-all flex flex-col justify-between space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[11px] text-slate-500">{m.planName}</div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'Expired'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          Expires: <span className="font-semibold text-slate-700">{m.expiryDate || 'Immediate'}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <a
                            href={`https://wa.me/${(m.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hi ${m.name}, this is PULSE FIT Gym. Your ${m.planName} membership is up for renewal. Let us know if you'd like us to reserve your spot!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>Remind Renewal</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    Open Member Directory & Renewals →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PENDING SALARY ADVANCES */}
            {activeActionTab === 'advances' && (
              <div className="pt-4 space-y-3">
                {pendingAdvances.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                    <p>No pending salary advance applications. All requests reviewed!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingAdvances.slice(0, 4).map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 hover:bg-white transition-all flex flex-col justify-between space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{req.staffName || req.trainerName}</div>
                            <div className="text-[11px] text-amber-700 font-semibold font-mono">
                              ₹{Number(req.amount).toLocaleString('en-IN')} Requested
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          <div>Repayment: <span className="font-semibold text-slate-700">{req.repaymentMonth || 'Next Cycle'}</span></div>
                          {req.reason && (
                            <p className="line-clamp-1 italic text-slate-600 mt-0.5">"{req.reason}"</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setActiveTab('advance-pay')}
                            className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Review & Disburse</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setActiveTab('advance-pay')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    Open Staff Advance Pay Manager ({advanceRequests.length}) →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Live Floor Status & Check-ins Stream */}
        <div className="lg:col-span-4 space-y-3 sm:space-y-6">
          
          {/* Floor Capacity & Gym Status */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Gym Floor</h3>
                <p className="text-xs text-slate-500">Real-time athlete presence</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Floor
              </span>
            </div>

            {/* Occupancy Gauge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Floor Occupancy</span>
                <span className="font-bold text-slate-900">
                  {Math.min(attendance.length > 0 ? attendance.length : 42, 60)} / 60 Athletes ({Math.round(((attendance.length > 0 ? attendance.length : 42) / 60) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((attendance.length > 0 ? attendance.length : 42) / 60) * 100))}%` }}
                ></div>
              </div>
            </div>

            {/* Pro Shop Alert (if any) */}
            <div
              onClick={() => setActiveTab('products')}
              className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-800">Pro Shop Stock</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock items` : 'Stock Optimal'}
              </span>
            </div>
          </div>

          {/* Recent Check-ins Feed */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recent Member Check-Ins</span>
              </div>
              <span className="text-[10px] text-slate-400">Live Attendance</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {recentCheckIns.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">No recent check-ins recorded yet.</div>
              ) : (
                recentCheckIns.map((log) => (
                  <div key={log.id} className="py-2 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{log.personName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{log.mode}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {log.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className="w-full py-2 mt-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Attendance Tracker</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* CUSTOMIZE STAT CARDS MODAL */}
      <CustomizeStatCardsModal
        isOpen={isCustomizeCardsOpen}
        onClose={() => setIsCustomizeCardsOpen(false)}
        selectedCardIds={customCardIds}
        onSave={handleSaveCustomCards}
        canAccessFinancials={canAccessFinancials}
        cardValues={cardValuesMap}
      />

      {/* ADD NEW ENQUIRY MODAL */}
      <Modal
        isOpen={isAddEnquiryOpen}
        onClose={() => setIsAddEnquiryOpen(false)}
        title="Add New Gym Enquiry / Lead"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddEnquirySubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Prospect Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={enquiryFormData.name}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, name: e.target.value })}
                placeholder="e.g. Vikram Malhotra"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={enquiryFormData.phone}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, phone: e.target.value })}
                placeholder="+91 98200 00000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={enquiryFormData.email}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, email: e.target.value })}
                placeholder="prospect@email.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Lead Source</label>
              <select
                value={enquiryFormData.source}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, source: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Walk-in Visit">Walk-in Visit</option>
                <option value="Phone Call">Phone Inquiry</option>
                <option value="Instagram / Social Media">Instagram / Social Media</option>
                <option value="Google Search / Maps">Google Search / Maps</option>
                <option value="Member Referral">Member Referral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Interested Plan</label>
              <select
                value={enquiryFormData.interestedPlan}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, interestedPlan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Fitness Goal</label>
              <input
                type="text"
                value={enquiryFormData.goal}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, goal: e.target.value })}
                placeholder="e.g. Weight Loss & Muscle Gain"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Lead Priority / Status</label>
            <select
              value={enquiryFormData.status}
              onChange={(e) => setEnquiryFormData({ ...enquiryFormData, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Hot">🔥 Hot (Ready to join immediately / trial session)</option>
              <option value="Warm">⚡ Warm (Interested / evaluating options)</option>
              <option value="Cold">❄️ Cold (General inquiry / comparing prices)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Logged By Staff Member <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={enquiryFormData.staffName}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, staffName: e.target.value })}
                placeholder="e.g. Pooja Sharma, Coach Alex, Owner"
                list="overview-staff-name-datalist"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <datalist id="overview-staff-name-datalist">
                <option value={`${currentUser?.name || 'Vikramaditya Singhania'} (Owner)`} />
                <option value="Pooja Sharma (Front Desk)" />
                <option value="Rohan Deshmukh (Front Desk)" />
                {trainers?.map((t) => (
                  <option key={t.id} value={`${t.name} (Coach)`} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700">Notes & Discussion Summary</label>
              <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                Date Stamped: {getTodayFormatted()}
              </span>
            </div>
            <textarea
              rows={2}
              value={enquiryFormData.notes}
              onChange={(e) => setEnquiryFormData({ ...enquiryFormData, notes: e.target.value })}
              placeholder="Add details about their requirement, preferred workout hours, fitness history..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 resize-none"
            />
            <p className="text-[9px] text-slate-400 mt-0.5">
              Today's date ({getTodayFormatted()}) will automatically be saved in front of this note.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddEnquiryOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingEnquiry}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSubmittingEnquiry && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmittingEnquiry ? 'Saving...' : 'Save Enquiry'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Direct Add Member Modal on Gym Overview Dashboard */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
      />

    </div>
  );
};
