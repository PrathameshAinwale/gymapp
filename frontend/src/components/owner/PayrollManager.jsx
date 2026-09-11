import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  Wallet,
  Search,
  Plus,
  Filter,
  Award,
  CheckCircle2,
  Clock,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const PayrollManager = () => {
  const { payrollRecords, markPayrollPaid, trainers } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewingPayslip, setViewingPayslip] = useState(null);

  const totalPayroll = payrollRecords.reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);
  const paidPayroll = payrollRecords
    .filter((p) => p.status === 'Paid')
    .reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);
  const pendingPayroll = payrollRecords
    .filter((p) => p.status === 'Pending')
    .reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);

  const filteredPayroll = payrollRecords.filter((p) => {
    const name = p.trainerName || p.employeeName || p.name || '';
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.role || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
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

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Pending Approvals</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">₹{pendingPayroll.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium block truncate">Ready for disbursement</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Payment</option>
            <option value="Paid">Paid Out</option>
          </select>
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
                      onClick={() => markPayrollPaid(pay.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      Pay Salary
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
                            onClick={() => markPayrollPaid(pay.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            Pay Salary
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
                  onClick={() => {
                    markPayrollPaid(viewingPayslip.id);
                    setViewingPayslip(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md active:scale-95 cursor-pointer"
                >
                  Disburse & Mark Paid
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
