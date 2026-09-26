import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  CreditCard,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Search,
  Receipt,
  Wallet,
  Calendar
} from 'lucide-react';
import { StatCard } from '../common/StatCard';

export const MemberInvoices = () => {
  const { currentUser } = useAuth();
  const { invoices, members } = useGymData();
  const [searchTerm, setSearchTerm] = useState('');

  const currentMember = members.find((m) => String(m.id) === String(currentUser?.id)) || {};

  const cleanCurrentUserId = String(currentUser?.id || currentUser?.userId || '').replace(/\D/g, '');
  const myInvoices = invoices.filter((inv) => {
    const cleanInvMemberId = String(inv.memberId || inv.userId || inv.user_id || '').replace(/\D/g, '');
    if (cleanCurrentUserId && cleanInvMemberId && cleanCurrentUserId === cleanInvMemberId) return true;
    if (currentUser?.email && inv.memberEmail && inv.memberEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser?.name && inv.memberName && inv.memberName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) return true;
    return false;
  });

  const filteredInvoices = myInvoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return (
      (inv.planName && inv.planName.toLowerCase().includes(term)) ||
      (inv.id && String(inv.id).toLowerCase().includes(term)) ||
      (inv.date && inv.date.toLowerCase().includes(term)) ||
      (inv.paymentMethod && inv.paymentMethod.toLowerCase().includes(term))
    );
  });

  const totalInvested = myInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const activePlanName = currentMember.planName || (myInvoices[0]?.planName) || 'Standard Access';

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-16 max-w-4xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-2xl font-bold font-heading text-slate-900 tracking-tight truncate">
                Invoices & Billing History
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                {myInvoices.length} {myInvoices.length === 1 ? 'Receipt' : 'Receipts'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Access your membership payment receipts, tax vouchers, and transaction history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Account in Good Standing</span>
          </span>
        </div>
      </div>

      {/* 2. Top KPI StatCards (Owner Dashboard Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Paid"
          value={`₹${totalInvested.toLocaleString('en-IN')}`}
          change="Lifetime Investment"
          isPositive={true}
          icon={Wallet}
          color="emerald"
        />
        <StatCard
          title="Active Plan"
          value={activePlanName}
          change="Current Tier"
          isPositive={true}
          icon={ShieldCheck}
          color="cyan"
        />
        <StatCard
          title="Tax Invoices"
          value={String(myInvoices.length)}
          change="All Generated"
          isPositive={true}
          icon={FileText}
          color="teal"
        />
        <StatCard
          title="Billing Status"
          value="Settled"
          change="Zero Dues Pending"
          isPositive={true}
          icon={CheckCircle2}
          color="indigo"
        />
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipts by plan, id, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="text-[11px] font-bold text-slate-500 self-end sm:self-center">
          Showing {filteredInvoices.length} of {myInvoices.length} records
        </div>
      </div>

      {/* 4. Invoice Records List */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Official Invoices & Tax Receipts</span>
          </h3>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-700">No payment receipts found</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Your issued billing receipts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {inv.planName || 'Gym Membership'}
                      </h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                        Paid
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="font-mono font-medium">#{String(inv.id).toUpperCase()}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {inv.date}
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">
                        {inv.paymentMethod || 'UPI'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/70">
                  <div className="text-left sm:text-right">
                    <div className="text-sm sm:text-base font-black text-slate-900 font-heading">
                      ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      Payment Verified
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
                    title="Print or Download Receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
