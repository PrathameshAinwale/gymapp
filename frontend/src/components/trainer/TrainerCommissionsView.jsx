import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  TrendingUp,
  Search,
  CheckCircle2,
  Clock,
  X,
  Calendar
} from 'lucide-react';

export const TrainerCommissionsView = () => {
  const { currentUser } = useAuth();
  const { commissions } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter commissions for this trainer
  const myCommissions = commissions.filter((c) => {
    const matchesId =
      String(c.trainerId) === String(currentUser?.id) ||
      String(c.trainer_id) === String(currentUser?.id) ||
      String(c.trainerId) === String(currentUser?.userId) ||
      String(c.trainer_id) === String(currentUser?.userId);

    const matchesName =
      currentUser?.name &&
      c.trainerName &&
      (c.trainerName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
        currentUser.name.toLowerCase().includes(c.trainerName.toLowerCase()));

    return matchesId || matchesName;
  });

  // Display list (fallback to all commissions if demo trainer has no explicit ID match)
  const displayCommissions = myCommissions.length > 0 ? myCommissions : commissions;

  // Filter by search & status
  const filteredCommissions = displayCommissions.filter((c) => {
    const matchesSearch =
      (c.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.serviceType || c.sessionType || c.planName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && c.status === statusFilter;
  });

  const getCommissionEarned = (c) => {
    if (c.commissionEarned !== undefined && c.commissionEarned !== null) return Number(c.commissionEarned);
    const pkg = Number(c.packageAmount || c.amount) || 0;
    const rate = Number(c.commissionPct || c.ratePercent) || 20;
    return Math.round((pkg * rate) / 100);
  };

  // Metric calculations
  const totalEarned = displayCommissions.reduce(
    (acc, c) => acc + getCommissionEarned(c),
    0
  );
  const paidEarned = displayCommissions
    .filter((c) => c.status === 'Paid')
    .reduce((acc, c) => acc + getCommissionEarned(c), 0);
  const pendingEarned = displayCommissions
    .filter((c) => c.status === 'Pending')
    .reduce((acc, c) => acc + getCommissionEarned(c), 0);

  const uniqueClientsCount = new Set(displayCommissions.map((c) => c.memberName || c.memberId)).size;

  return (
    <div className="space-y-3 sm:space-y-5 animate-fadeIn pb-16 max-w-4xl mx-auto w-full">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-bold font-heading text-slate-900 tracking-tight truncate">
                My Trainer Commissions
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Commission payouts provided by the gym owner for your personal training clients.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {displayCommissions.length} Commission Records
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Total Commission
          </span>
          <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">
            ₹{totalEarned.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Lifetime share</span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Paid Out
          </span>
          <div className="text-base sm:text-xl font-black text-emerald-700 mt-0.5">
            ₹{paidEarned.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Settled by owner</span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Pending Payout
          </span>
          <div className="text-base sm:text-xl font-black text-amber-600 mt-0.5">
            ₹{pendingEarned.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Awaiting next cycle</span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Clients Coached
          </span>
          <div className="text-base sm:text-xl font-black text-teal-700 mt-0.5">
            {uniqueClientsCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Commission clients</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by client name or package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 w-full sm:w-auto shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'Paid', label: 'Paid' },
            { id: 'Pending', label: 'Pending' }
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Commission Cards */}
      <div className="space-y-2.5">
        {filteredCommissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-8 text-center space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No commission records found</h3>
            <p className="text-[11px] text-slate-500">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter.'
                : 'No commission records have been assigned to your profile yet.'}
            </p>
          </div>
        ) : (
          filteredCommissions.map((comm) => {
            const isPaid = comm.status === 'Paid';
            const earnedAmount = getCommissionEarned(comm);
            const packageAmount = Number(comm.packageAmount || comm.amount || comm.packagePrice) || 0;
            const rate = comm.commissionPct || comm.ratePercent || comm.commissionRate || 20;

            return (
              <div
                key={comm.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl sm:rounded-2xl p-3 sm:p-4.5 shadow-sm transition-all space-y-2.5"
              >
                {/* Top Row: Client Info + Status */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0">
                      {comm.memberName ? comm.memberName.substring(0, 2).toUpperCase() : 'CL'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {comm.memberName || 'Client'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate">
                        {comm.serviceType || comm.sessionType || 'Personal Training Package'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{isPaid ? 'Paid Out' : 'Pending'}</span>
                  </span>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">
                      Client Fee
                    </span>
                    <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
                      ₹{packageAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">
                      Commission
                    </span>
                    <span className="font-bold text-teal-700 text-[11px] sm:text-xs">
                      {rate}% Share
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">
                      Your Earnings
                    </span>
                    <span className="font-black text-emerald-700 text-[11px] sm:text-xs">
                      ₹{earnedAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Footer: Date & Owner Note */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-0.5 px-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Awarded on: {comm.date || comm.createdAt || 'Recent Session'}</span>
                  </span>
                  <span className="text-slate-500 font-medium">
                    Assigned by Gym Owner
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
