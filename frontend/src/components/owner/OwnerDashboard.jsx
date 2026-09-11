import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  Users,
  AlertTriangle,
  PlusCircle,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  CalendarCheck,
  MessageCircle,
  Flame,
  PhoneCall,
  ShoppingBag,
  Activity,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Plus
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const OwnerDashboard = ({ setActiveTab, onOpenAddMember }) => {
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
    membershipFreezes = []
  } = useGymData();

  // Segment tab state for Priority Action Hub (reduces page clutter)
  const [activeActionTab, setActiveActionTab] = useState('leads'); // 'leads' | 'renewals'

  // Core metrics
  const totalMembersCount = members.length;
  const activeMembersCount = members.filter((m) => (m.status || '').toLowerCase() === 'active').length;
  const expiringMembers = members.filter((m) => {
    const s = (m.status || '').toLowerCase();
    return s === 'expired' || s === 'expiring soon';
  });
  const expiredMembersCount = expiringMembers.length;

  // Leads metrics
  const hotLeads = enquiries.filter(
    (e) => e.status !== 'Converted' && (e.priority === 'Hot' || e.status === 'New Lead')
  );
  const convertedLeadsCount = enquiries.filter((e) => e.status === 'Converted').length;
  const lowStockProducts = products.filter((p) => p.stock <= (p.minStockAlert || 5));

  // Live Check-ins from attendance or member records
  const recentCheckIns = (attendance && attendance.length > 0)
    ? attendance.slice(0, 4).map((a) => ({
        id: a.id,
        personName: a.memberName || a.name || 'Member',
        time: a.time || a.checkInTime || 'Today',
        mode: 'QR Pass Check-In'
      }))
    : members.filter((m) => m.lastCheckIn && m.lastCheckIn !== 'Never').slice(0, 4).map((m) => ({
        id: m.id,
        personName: m.name,
        time: m.lastCheckIn,
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
  const momGrowthAmount = totalRevenue - previousMonthRevenue;

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

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      
      {/* 1. CLEAN & CALM HEADER */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Gym Overview
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Welcome back. Here is your facility's operational pulse for today.
            </p>
          </div>

          {/* Primary CTA - always visible */}
          <button
            type="button"
            onClick={onOpenAddMember}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Member</span>
          </button>
        </div>

        {/* Quick Actions Row - scrollable on mobile */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('enquiries')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
            <span>Enquiries</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            <span>Record Fee</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Attendance</span>
          </button>
        </div>
      </div>

      {/* 2. THE 4 ESSENTIAL STATS CARDS (CLEAN, SCANNABLE & UNCLUTTERED) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        
        {/* Active Members Card */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98]" onClick={() => setActiveTab('members')}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              {activeMembersCount}
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-emerald-700 items-center justify-between pt-2 border-t border-slate-100">
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Renewals Due Card */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98]" onClick={() => setActiveTab('members')}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Renewals
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              {expiredMembersCount}
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-amber-700 items-center justify-between pt-2 border-t border-slate-100">
            <span>Review</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Leads & Enquiries Card */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98]" onClick={() => setActiveTab('enquiries')}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Leads
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              {enquiries.length}
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-rose-700 items-center justify-between pt-2 border-t border-slate-100">
            <span>Follow-up</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* August Collections Card */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98]" onClick={() => setActiveTab('financials')}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Revenue
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              ₹{(totalRevenue / 100000).toFixed(2)}L
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-emerald-700 items-center justify-between pt-2 border-t border-slate-100">
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: REVENUE TREND + ORGANIZED ACTION HUB & LIVE STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
        
        {/* Left 8 Cols: Revenue Chart & Priority Action Hub */}
        <div className="lg:col-span-8 space-y-3 sm:space-y-6">
          
          {/* Revenue Trend Area Chart */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
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

            <div className="h-44 sm:h-64 w-full mt-3 sm:mt-4">
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

          {/* Clean Segmented Priority Action Hub */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Today's Priority Actions</h3>
                <p className="text-xs text-slate-500">Items that require owner review or immediate callback</p>
              </div>

              {/* Segmented Tab Switcher (Calm, organized, not overwhelming) */}
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
              </div>
            </div>

            {/* TAB 1: HOT LEADS */}
            {activeActionTab === 'leads' && (
              <div className="pt-4 space-y-3">
                {hotLeads.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No pending hot leads. All prospects followed up!
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
                Active
              </span>
            </div>

            {/* Occupancy Gauge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Floor Occupancy</span>
                <span className="font-bold text-slate-900">42 / 60 Athletes (70%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: '70%' }}></div>
              </div>
            </div>

            {/* Pro Shop Alert (if any) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-800">Pro Shop Stock</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock` : 'Optimal'}
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

    </div>
  );
};
