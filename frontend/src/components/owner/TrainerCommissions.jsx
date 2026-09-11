import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  TrendingUp,
  Search,
  Plus,
  Filter,
  Award,
  CheckCircle2,
  Clock,
  IndianRupee,
  Calendar,
  UserCheck,
  CreditCard,
  Percent,
  FileText,
  Printer,
  Download
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const TrainerCommissions = () => {
  const { commissions, addCommissionRecord, markCommissionPaid, trainers, members } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    trainerId: trainers[0]?.id || '',
    trainerName: trainers[0]?.name || '',
    memberId: members[0]?.id || '',
    memberName: members[0]?.name || '',
    serviceType: 'Personal Training (12 Sessions)',
    amount: 12000,
    commissionPct: 25
  });

  const totalCommissions = commissions.reduce((acc, c) => acc + (Number(c.commissionEarned || c.amount) || 0), 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === 'Pending')
    .reduce((acc, c) => acc + (Number(c.commissionEarned || c.amount) || 0), 0);
  const paidCommissions = commissions
    .filter((c) => c.status === 'Paid')
    .reduce((acc, c) => acc + (Number(c.commissionEarned || c.amount) || 0), 0);

  const filteredCommissions = commissions.filter((c) => {
    const matchesSearch =
      (c.trainerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.serviceType || c.sessionType || c.planName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && c.status === statusFilter;
  });

  const handleTrainerChange = (tId) => {
    const t = trainers.find((tr) => tr.id === tId);
    setFormData({
      ...formData,
      trainerId: tId,
      trainerName: t?.name || ''
    });
  };

  const handleMemberChange = (mId) => {
    const m = members.find((mem) => mem.id === mId);
    setFormData({
      ...formData,
      memberId: mId,
      memberName: m?.name || ''
    });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const earned = Math.round((Number(formData.amount) * Number(formData.commissionPct)) / 100);

    addCommissionRecord({
      trainerId: formData.trainerId || trainers[0]?.id,
      trainerName: formData.trainerName || trainers[0]?.name,
      memberId: formData.memberId || members[0]?.id,
      memberName: formData.memberName || members[0]?.name,
      serviceType: formData.serviceType,
      amount: Number(formData.amount),
      commissionPct: Number(formData.commissionPct),
      commissionEarned: earned
    });

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">Trainer Commissions</h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Track incentive bonuses, personal training commissions, and membership referral earnings for coaches.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Commission Report</span>
            <span className="inline sm:hidden">Report</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Commission</span>
            <span className="inline sm:hidden">Log</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Commissions</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">₹{totalCommissions.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">All-time incentives</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Pending Payouts</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1">₹{pendingCommissions.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium hidden sm:block">Due in upcoming cycle</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Paid Out</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">₹{paidCommissions.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium hidden sm:block">Disbursed successfully</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by coach name, member name, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Payout</option>
            <option value="Paid">Paid Out</option>
          </select>
        </div>
      </div>

      {/* Commissions Mobile Cards View */}
      <div className="block sm:hidden space-y-2.5">
        {filteredCommissions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium">
            No commission records found.
          </div>
        ) : (
          filteredCommissions.map((com) => {
            const isPaid = com.status === 'Paid';

            return (
              <div
                key={com.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900 text-xs truncate">{com.trainerName}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    <span>{com.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 text-[10px]">
                  <div>
                    <span className="text-slate-400 font-medium block">Member</span>
                    <span className="font-semibold text-slate-800 truncate block">{com.memberName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Program</span>
                    <span className="font-semibold text-slate-700 truncate block">{com.serviceType || com.sessionType || com.planName || 'PT Session'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Service Fee</span>
                    <span className="font-bold text-slate-800">₹{Number(com.packageAmount || com.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Commission ({com.commissionPct || com.ratePercent || 20}%)</span>
                    <span className="font-black text-emerald-600 text-xs">₹{Number(com.commissionEarned || com.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>Date: {com.date}</span>
                  {!isPaid ? (
                    <button
                      type="button"
                      onClick={() => markCommissionPaid(com.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      Disburse Pay
                    </button>
                  ) : (
                    <span className="text-slate-400 font-semibold">Disbursed</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Commissions Table (Desktop View) */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl lg:rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Coach / Trainer</th>
                <th className="py-3.5 px-4">Member / Client</th>
                <th className="py-3.5 px-4">Service / PT Program</th>
                <th className="py-3.5 px-4">Service Amount</th>
                <th className="py-3.5 px-4">Rate %</th>
                <th className="py-3.5 px-4">Earned Commission</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCommissions.map((com) => {
                const isPaid = com.status === 'Paid';

                return (
                  <tr key={com.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{com.trainerName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Date: {com.date}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {com.memberName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {com.serviceType || com.sessionType || com.planName || 'PT Session'}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      ₹{Number(com.packageAmount || com.amount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {com.commissionPct || com.ratePercent || 20}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                      ₹{Number(com.commissionEarned || com.amount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{com.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => markCommissionPaid(com.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer"
                        >
                          Disburse Pay
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Disbursed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Commission Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Log Trainer Commission / PT Incentive"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Coach / Trainer *</label>
            <select
              value={formData.trainerId}
              onChange={(e) => handleTrainerChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialty || 'Trainer'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Member / Client *</label>
            <select
              value={formData.memberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.planName || 'Member'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Service / Program *</label>
            <input
              type="text"
              required
              value={formData.serviceType}
              onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              placeholder="e.g. 1-on-1 PT (12 Sessions)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Service Fee (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Commission % *</label>
              <input
                type="number"
                required
                min="1"
                max="100"
                value={formData.commissionPct}
                onChange={(e) => setFormData({ ...formData, commissionPct: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Calculated Payout:</span>
            <span className="text-lg font-black text-slate-900">
              ₹{Math.round((Number(formData.amount) * Number(formData.commissionPct)) / 100).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Record Commission
            </button>
          </div>
        </form>
      </Modal>

      {/* Trainer PT & Incentive Commission Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Trainer Personal Training (PT) Commission Report"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          {/* Report Header */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Monthly Audited Incentive Statement
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">
                PULSE FIT Athletic Club • Powai
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Comprehensive PT session tracking, commission percentages, and disbursement audit.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Volume</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                ₹{commissions.reduce((a, c) => a + (Number(c.amount) || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Commissions</div>
              <div className="text-lg font-black text-emerald-600 mt-0.5">
                ₹{totalCommissions.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Paid Out</div>
              <div className="text-lg font-black text-slate-700 mt-0.5">
                ₹{paidCommissions.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Pending Dues</div>
              <div className="text-lg font-black text-amber-600 mt-0.5">
                ₹{pendingCommissions.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown by Coach */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Coach Earnings Breakdown</span>
              <span className="text-[11px] text-slate-500 font-medium">Auto-calculated from PT & Sales logs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Coach</th>
                    <th className="py-2.5 px-4">Package / Deal</th>
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-4">Rate %</th>
                    <th className="py-2.5 px-4">Earned (₹)</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{c.trainerName}</td>
                      <td className="py-2.5 px-4 text-slate-600">{c.serviceType}</td>
                      <td className="py-2.5 px-4 text-slate-600">{c.memberName}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{c.commissionPct}%</td>
                      <td className="py-2.5 px-4 font-black text-emerald-700">
                        ₹{Number(c.commissionEarned).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
            <span>Audit Ref: #{Date.now().toString().slice(-8)} • Verified by Owner</span>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
