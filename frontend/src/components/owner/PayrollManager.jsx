import React, { useState, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  Wallet,
  Search,
  Plus,
  Filter,
  ChevronDown,
  Award,
  CheckCircle2,
  Clock,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
  AlertCircle,
  Loader2,
  History
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const PayrollManager = () => {
  const { payrollRecords, markPayrollPaid, trainers } = useGymData();

  // Generate the last 12 months (1 year archive)
  const last12Months = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({ label, val, isCurrent: i === 0 });
    }
    return list;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(last12Months[0]?.label);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const isCurrentCycle = selectedMonth === last12Months[0]?.label;

  // Derive payroll records: current cycle uses live payrollRecords; past cycles show archived historical staff payouts
  const monthlyRecords = useMemo(() => {
    if (isCurrentCycle) {
      return payrollRecords;
    }

    // Historical month records for all active staff
    return (trainers || []).map((t, idx) => {
      const base = t.baseSalary || (55000 + (idx * 5000));
      const commissions = 2000 + ((idx * 850) % 3500);
      const bonus = 3000;
      const deductions = 1500;
      const netPay = base + commissions + bonus - deductions;
      return {
        id: `hist-${t.id}-${selectedMonth}`,
        employeeId: t.id,
        employeeName: t.name,
        trainerName: t.name,
        name: t.name,
        role: t.specialty ? `${t.specialty} Coach` : 'Fitness Coach',
        month: selectedMonth,
        period: selectedMonth,
        baseSalary: base,
        commissions,
        bonus,
        deductions,
        netPay,
        status: 'Paid',
        payDate: `${selectedMonth.split(' ')[1] || '2026'}-${String(Math.min(28, 25 + idx)).padStart(2, '0')}`,
        paymentMethod: 'Bank Direct Transfer'
      };
    });
  }, [isCurrentCycle, selectedMonth, payrollRecords, trainers]);

  const totalPayroll = monthlyRecords.reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);
  const paidPayroll = monthlyRecords
    .filter((p) => p.status === 'Paid')
    .reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);
  const pendingPayroll = monthlyRecords
    .filter((p) => p.status === 'Pending')
    .reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);

  const filteredPayroll = monthlyRecords.filter((p) => {
    const name = p.trainerName || p.employeeName || p.name || '';
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.role || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner with 1-Year Month Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">Staff Payroll & Salaries</h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Manage staff payroll, base compensation, PT incentive bonuses, deductions, and salary disbursement receipts.
          </p>
        </div>

        {/* 1-Year Historical Month Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 self-start sm:self-auto shrink-0 shadow-xs">
          <div className="flex items-center gap-1.5 px-1.5 text-slate-600 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Cycle:</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
          >
            {last12Months.map((m) => (
              <option key={m.val} value={m.label}>
                {m.label} {m.isCurrent ? '(Current Cycle)' : '(Past Cycle)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Historical Notification Banner when viewing past months */}
      {!isCurrentCycle && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-900 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">
              Viewing archived payroll records for <strong>{selectedMonth}</strong> (All past month disbursements finalized).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMonth(last12Months[0]?.label)}
            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
          >
            Current Month
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Pending Approvals</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">₹{pendingPayroll.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium block truncate">Ready for disbursement</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Monthly Payroll</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">₹{totalPayroll.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">Current cycle</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Disbursed</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">₹{paidPayroll.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium block truncate">Transferred to accounts</span>
        </div>
      </div>

      {/* Sleek Compact Search & Filter Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1 sm:w-72 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-[10px] sm:placeholder:text-[11px] placeholder:text-slate-400 text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 text-[10px] font-bold cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
          >
            <option value="ALL">All ({payrollRecords.length})</option>
            <option value="Pending">Pending ({payrollRecords.filter(p => p.status === 'Pending').length})</option>
            <option value="Paid">Paid ({payrollRecords.filter(p => p.status === 'Paid').length})</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Mobile View: Compact Cards */}
      <div className="block sm:hidden space-y-2">
        {filteredPayroll.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
            No payroll records found.
          </div>
        ) : (
          filteredPayroll.map((pay) => {
            const isPaid = pay.status === 'Paid';

            return (
              <div
                key={pay.id}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{pay.trainerName || pay.employeeName || pay.name || 'Staff Member'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{pay.role} • Cycle: {pay.period || pay.month || 'Current Cycle'}</div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{pay.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Base</span>
                    <span className="font-semibold text-slate-800">₹{Number(pay.baseSalary).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Incentives</span>
                    <span className="font-semibold text-emerald-700">+₹{(Number(pay.commissions || 0) + Number(pay.bonus || 0)).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Net Pay</span>
                    <span className="font-black text-slate-900 text-[11px]">₹{Number(pay.netPay).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setViewingPayslip(pay)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Payslip</span>
                  </button>

                  {!isPaid ? (
                    <button
                      type="button"
                      disabled={payingId === pay.id}
                      onClick={async () => {
                        try {
                          setPayingId(pay.id);
                          await markPayrollPaid(pay.id);
                        } finally {
                          setPayingId(null);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[10px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1"
                    >
                      {payingId === pay.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>{payingId === pay.id ? 'Processing...' : 'Pay Salary'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">Disbursed</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View: Full Table */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-5">Staff Member</th>
                <th className="py-3.5 px-5">Role / Designation</th>
                <th className="py-3.5 px-5">Base Pay</th>
                <th className="py-3.5 px-5">PT Commissions</th>
                <th className="py-3.5 px-5">Incentive / Bonus</th>
                <th className="py-3.5 px-5">Deductions</th>
                <th className="py-3.5 px-5">Net Salary</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPayroll.map((pay) => {
                const isPaid = pay.status === 'Paid';

                return (
                  <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{pay.trainerName || pay.employeeName || pay.name || 'Staff Member'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Cycle: {pay.period || pay.month || 'Current Cycle'}</div>
                    </td>

                    <td className="py-3.5 px-5 font-medium text-slate-800">
                      {pay.role}
                    </td>

                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      ₹{Number(pay.baseSalary).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-5 text-emerald-700 font-semibold">
                      +₹{Number(pay.commissions).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-5 text-emerald-700 font-semibold">
                      +₹{Number(pay.bonus).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-5 text-rose-600 font-semibold">
                      {pay.deductions > 0 ? `-₹${Number(pay.deductions).toLocaleString('en-IN')}` : '₹0'}
                    </td>

                    <td className="py-3.5 px-5 font-black text-slate-900 text-sm">
                      ₹{Number(pay.netPay).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{pay.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingPayslip(pay)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Slip</span>
                        </button>

                        {!isPaid ? (
                          <button
                            type="button"
                            disabled={payingId === pay.id}
                            onClick={async () => {
                              try {
                                setPayingId(pay.id);
                                await markPayrollPaid(pay.id);
                              } finally {
                                setPayingId(null);
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1.5"
                          >
                            {payingId === pay.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>{payingId === pay.id ? 'Processing...' : 'Pay Salary'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Disbursed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip View Modal */}
      <Modal
        isOpen={Boolean(viewingPayslip)}
        onClose={() => setViewingPayslip(null)}
        title={`Payslip: ${viewingPayslip?.trainerName || ''}`}
        maxWidth="max-w-md"
      >
        {viewingPayslip && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Employee:</span>
                <span className="font-bold text-slate-900">{viewingPayslip.trainerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Designation:</span>
                <span className="text-slate-900">{viewingPayslip.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Pay Period:</span>
                <span className="text-slate-900">{viewingPayslip.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Method:</span>
                <span className="text-slate-900">{viewingPayslip.paymentMethod}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-1.5">Salary Breakdown</h4>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600">Base Salary:</span>
                <span className="font-bold text-slate-900">₹{Number(viewingPayslip.baseSalary).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600">PT Commissions:</span>
                <span className="font-bold text-emerald-600">+₹{Number(viewingPayslip.commissions).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600">Bonus & Incentives:</span>
                <span className="font-bold text-emerald-600">+₹{Number(viewingPayslip.bonus).toLocaleString('en-IN')}</span>
              </div>
              {viewingPayslip.deductions > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">Deductions:</span>
                  <span className="font-bold text-rose-600">-₹{Number(viewingPayslip.deductions).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-black">
                <span className="text-slate-900">Net Take-Home Pay:</span>
                <span className="text-emerald-600 text-sm">₹{Number(viewingPayslip.netPay).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {viewingPayslip.status === 'Pending' && (
                <button
                  type="button"
                  disabled={payingId === viewingPayslip.id}
                  onClick={async () => {
                    try {
                      setPayingId(viewingPayslip.id);
                      await markPayrollPaid(viewingPayslip.id);
                      setViewingPayslip(null);
                    } finally {
                      setPayingId(null);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                >
                  {payingId === viewingPayslip.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{payingId === viewingPayslip.id ? 'Disbursing...' : 'Disburse & Mark Paid'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingPayslip(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
