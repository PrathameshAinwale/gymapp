import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
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
  History,
  RotateCw,
  Printer,
  Building2,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { preventNonNumericKey, sanitizeDecimal } from '../../utils/validation';

export const PayrollManager = () => {
  const {
    payrollRecords,
    markPayrollPaid,
    updatePayrollAdjustments,
    trainers,
    commissions = [],
    fetchPayroll,
    fetchTrainers,
    fetchCommissions
  } = useGymData();
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchPayroll?.();
    fetchTrainers?.();
    fetchCommissions?.();
  }, [fetchPayroll, fetchTrainers, fetchCommissions]);

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
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [adjustingRecord, setAdjustingRecord] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ bonus: '', deductions: '' });

  const isCurrentCycle = selectedMonth === last12Months[0]?.label;

  // 1. Helper to compute PT commission from trainer commissions for a particular trainer
  const getTrainerCommissionSum = (trainerId, trainerName) => {
    if (!commissions || !Array.isArray(commissions)) return 0;
    const cleanId = String(trainerId || '').replace(/^(tr-|trn-)/, '');
    const cleanName = (trainerName || '').toLowerCase().trim();
    return commissions
      .filter((c) => {
        const cId = String(c.trainerId || c.trainer_id || '').replace(/^(tr-|trn-)/, '');
        const cName = (c.trainerName || c.trainer_name || '').toLowerCase().trim();
        return (cleanId && cId === cleanId) || (cleanName && cName === cleanName);
      })
      .reduce((sum, c) => {
        const amt = Number(c.commissionEarned ?? c.commission_earned) ||
          Math.round((Number(c.packageAmount || c.amount || 0) * Number(c.commissionPct || c.ratePercent || 20)) / 100);
        return sum + amt;
      }, 0);
  };

  // 2. Helper to get persistent deductions for a staff/trainer (empty 0 at first, but once added, always comes)
  const getPersistentDeductions = (employeeId, employeeName) => {
    try {
      const saved = JSON.parse(localStorage.getItem('pulsefit_staff_deductions') || '{}');
      const cleanId = String(employeeId || '').replace(/^(tr-|trn-)/, '');
      const cleanName = (employeeName || '').toLowerCase().trim();
      if (saved[String(employeeId)] !== undefined) return Number(saved[String(employeeId)]) || 0;
      if (cleanId && saved[cleanId] !== undefined) return Number(saved[cleanId]) || 0;
      if (cleanName && saved[cleanName] !== undefined) return Number(saved[cleanName]) || 0;
    } catch (e) {}
    // Fallback: check if any record in payrollRecords has deductions > 0 for this employee
    const cleanId = String(employeeId || '').replace(/^(tr-|trn-)/, '');
    const cleanName = (employeeName || '').toLowerCase().trim();
    const prevRec = (payrollRecords || []).find((r) => {
      const rId = String(r.employeeId || r.employee_id || '').replace(/^(tr-|trn-)/, '');
      const rName = (r.employeeName || r.trainerName || r.name || '').toLowerCase().trim();
      return ((cleanId && rId === cleanId) || (cleanName && rName === cleanName)) && Number(r.deductions) > 0;
    });
    return prevRec ? Number(prevRec.deductions) || 0 : 0;
  };

  // Derive payroll records:
  // - PT commissions: from trainer commission for that particular trainer
  // - Deductions: empty at first (0), but once added for any staff/trainer, always comes for that trainer/staff
  // - Bonus / Incentive: empty until filled (0)
  const monthlyRecords = useMemo(() => {
    const matchingRecords = (payrollRecords || []).filter(
      (p) => !p.month || p.month === selectedMonth || p.period === selectedMonth
    );

    if (matchingRecords.length > 0) {
      return matchingRecords.map((p) => {
        const isTrainer = (p.role || '').toLowerCase().includes('coach') || (p.role || '').toLowerCase().includes('trainer');
        // PT Commission: for trainers, get from trainer commissions
        const liveComm = isTrainer ? getTrainerCommissionSum(p.employeeId, p.trainerName || p.employeeName) : 0;
        const ptComm = isTrainer ? (liveComm || Number(p.commissions || 0)) : 0;

        // Deductions: empty at first (0), but once added, always comes
        const persistentDed = getPersistentDeductions(p.employeeId, p.trainerName || p.employeeName);
        const deductions = Number(p.deductions) > 0 ? Number(p.deductions) : persistentDed;

        // Bonus: empty (0) until filled
        const bonus = Number(p.bonus) || 0;
        const base = Number(p.baseSalary) || 0;
        const netPay = Math.max(0, base + ptComm + bonus - deductions);

        return {
          ...p,
          commissions: ptComm,
          bonus,
          deductions,
          netPay: p.status === 'Paid' ? (Number(p.netPay) || netPay) : netPay
        };
      });
    }

    // Historical month records or dynamic fallback if backend records haven't been generated for that month yet
    return (trainers || []).map((t, idx) => {
      const base = Number(t.monthlySalary || t.baseSalary || t.salary || (30000 + (idx * 5000)));
      const ptComm = getTrainerCommissionSum(t.id || t.userId, t.name);
      const deductions = getPersistentDeductions(t.id || t.userId, t.name);
      const bonus = 0; // empty until filled
      const netPay = Math.max(0, base + ptComm + bonus - deductions);

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
        commissions: ptComm,
        bonus,
        deductions,
        netPay,
        status: isCurrentCycle ? 'Pending' : 'Paid',
        payDate: `${selectedMonth.split(' ')[1] || '2026'}-${String(Math.min(28, 25 + idx)).padStart(2, '0')}`,
        paymentMethod: 'Bank Direct Transfer'
      };
    });
  }, [selectedMonth, payrollRecords, trainers, commissions, isCurrentCycle]);

  const totalPayroll = monthlyRecords.reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);
  const paidPayroll = monthlyRecords
    .filter((p) => p.status === 'Paid')
    .reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);
  const pendingPayroll = monthlyRecords
    .filter((p) => p.status === 'Pending')
    .reduce((acc, p) => acc + (Number(p.netPay) || 0), 0);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (roleFilter !== 'ALL') count++;
    if (selectedMonth !== last12Months[0]?.label) count++;
    return count;
  }, [statusFilter, roleFilter, selectedMonth, last12Months]);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setSelectedMonth(last12Months[0]?.label);
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    return monthlyRecords
      .filter((p) => {
        const name = p.trainerName || p.employeeName || p.name || '';
        return name.toLowerCase().includes(term) || (p.role || '').toLowerCase().includes(term);
      })
      .slice(0, 5);
  }, [searchTerm, monthlyRecords]);

  const filteredPayroll = useMemo(() => {
    return monthlyRecords.filter((p) => {
      const name = p.trainerName || p.employeeName || p.name || '';
      const matchesSearch =
        !searchTerm.trim() ||
        name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (p.role || '').toLowerCase().includes(searchTerm.toLowerCase().trim());

      if (!matchesSearch) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (roleFilter !== 'ALL') {
        const role = (p.role || '').toLowerCase();
        if (roleFilter === 'coach' && !role.includes('coach') && !role.includes('trainer')) return false;
        if (roleFilter === 'manager' && !role.includes('manager')) return false;
        if (roleFilter === 'staff' && (role.includes('coach') || role.includes('trainer') || role.includes('manager'))) return false;
      }
      return true;
    });
  }, [monthlyRecords, searchTerm, statusFilter, roleFilter]);

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

        {/* 1-Year Historical Month Selector & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-xs">
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

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Autocomplete Search Bar */}
          <div ref={searchContainerRef} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              placeholder="Search staff member, role, or designation..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchDropdownOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Autocomplete Suggestions */}
            {isSearchDropdownOpen && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Suggestions
                </div>
                {searchSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchTerm(item.trainerName || item.employeeName || item.name || '');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50/60 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.trainerName || item.employeeName || item.name}</span>
                      <span className="text-[10px] text-slate-400">({item.role})</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      ₹{Number(item.netPay).toLocaleString('en-IN')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Filter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFiltersCount > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Chips & Clear Action */}
        {(activeFiltersCount > 0 || searchTerm) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">Active:</span>

            {selectedMonth !== last12Months[0]?.label && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Cycle: {selectedMonth}
                <button
                  type="button"
                  onClick={() => setSelectedMonth(last12Months[0]?.label)}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {roleFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Role: {roleFilter === 'coach' ? 'Coaches' : roleFilter === 'manager' ? 'Managers' : 'Staff'}
                <button
                  type="button"
                  onClick={() => setRoleFilter('ALL')}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                "{searchTerm}"
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium ml-1 cursor-pointer"
            >
              Reset all
            </button>

            <span className="ml-auto text-[11px] text-slate-400">
              Showing {filteredPayroll.length} of {monthlyRecords.length} records
            </span>
          </div>
        )}
      </div>

      {/* Mobile View: Compact Cards */}
      <div className="block sm:hidden space-y-2">
        {filteredPayroll.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <EmptyState
              icon={Wallet}
              title={searchTerm || activeFiltersCount > 0 ? "No matching payroll records" : `No Payroll Logs for ${selectedMonth}`}
              description={
                searchTerm || activeFiltersCount > 0
                  ? "No staff salary payouts match your current search or status filter."
                  : `No payroll records have been generated yet for ${selectedMonth}.`
              }
              secondaryActionText={searchTerm || activeFiltersCount > 0 ? "Reset Filters" : undefined}
              onSecondaryAction={searchTerm || activeFiltersCount > 0 ? handleResetFilters : undefined}
              color="emerald"
            />
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

                <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Base</span>
                    <span className="font-semibold text-slate-800">₹{Number(pay.baseSalary).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">PT Comm</span>
                    <span className="font-semibold text-emerald-700">₹{Number(pay.commissions || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Deduct</span>
                    <span className={`font-semibold ${Number(pay.deductions) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {Number(pay.deductions) > 0 ? `-₹${Number(pay.deductions).toLocaleString('en-IN')}` : '₹0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Net Pay</span>
                    <span className="font-black text-slate-900 text-[11px]">₹{Number(pay.netPay).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustingRecord(pay);
                      setAdjustForm({
                        bonus: pay.bonus ? String(pay.bonus) : '',
                        deductions: pay.deductions ? String(pay.deductions) : ''
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
                    title="Edit Incentives & Deductions"
                  >
                    <IndianRupee className="w-3 h-3 text-emerald-600" />
                    <span>Adjust</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingPayslip(pay)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
                    title="Generate formatted salary slip"
                  >
                    <Printer className="w-3 h-3 text-emerald-600" />
                    <span>Generate Slip</span>
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
        {filteredPayroll.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Wallet}
              title={searchTerm || activeFiltersCount > 0 ? "No matching payroll records" : `No Payroll Logs for ${selectedMonth}`}
              description={
                searchTerm || activeFiltersCount > 0
                  ? "No staff salary payouts match your current search or status filter."
                  : `No payroll records have been generated yet for ${selectedMonth}.`
              }
              secondaryActionText={searchTerm || activeFiltersCount > 0 ? "Reset Filters" : undefined}
              onSecondaryAction={searchTerm || activeFiltersCount > 0 ? handleResetFilters : undefined}
              color="emerald"
            />
          </div>
        ) : (
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
                      {Number(pay.commissions) > 0 ? `+₹${Number(pay.commissions).toLocaleString('en-IN')}` : '₹0'}
                    </td>

                    <td className="py-3.5 px-5 font-semibold">
                      {Number(pay.bonus) > 0 ? (
                        <span className="text-emerald-700">+₹{Number(pay.bonus).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 font-semibold">
                      {Number(pay.deductions) > 0 ? (
                        <span className="text-rose-600">-₹{Number(pay.deductions).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0</span>
                      )}
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
                          onClick={() => {
                            setAdjustingRecord(pay);
                            setAdjustForm({
                              bonus: pay.bonus ? String(pay.bonus) : '',
                              deductions: pay.deductions ? String(pay.deductions) : ''
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Edit Incentives & Deductions"
                        >
                          <IndianRupee className="w-3 h-3 text-emerald-600" />
                          <span>Adjust</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingPayslip(pay)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Generate formatted salary slip"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Generate Slip</span>
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
      )}
    </div>

      {/* Manual Incentives & Deductions Modal */}
      <Modal
        isOpen={Boolean(adjustingRecord)}
        onClose={() => setAdjustingRecord(null)}
        title={`Adjust Pay: ${adjustingRecord?.trainerName || 'Staff'}`}
        maxWidth="max-w-md"
      >
        {adjustingRecord && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const bVal = Number(adjustForm.bonus) || 0;
              const dVal = Number(adjustForm.deductions) || 0;

              // Persist deduction for this staff/trainer so it always comes for that trainer/staff
              try {
                const saved = JSON.parse(localStorage.getItem('pulsefit_staff_deductions') || '{}');
                const empId = adjustingRecord.employeeId || adjustingRecord.employee_id;
                if (empId) saved[String(empId)] = dVal;
                const cleanId = String(empId || '').replace(/^(tr-|trn-)/, '');
                if (cleanId) saved[cleanId] = dVal;
                if (adjustingRecord.trainerName) saved[adjustingRecord.trainerName.toLowerCase()] = dVal;
                if (adjustingRecord.employeeName) saved[adjustingRecord.employeeName.toLowerCase()] = dVal;
                localStorage.setItem('pulsefit_staff_deductions', JSON.stringify(saved));
              } catch (err) {}

              updatePayrollAdjustments(adjustingRecord.id, {
                bonus: bVal,
                deductions: dVal
              });
              setAdjustingRecord(null);
            }}
            className="space-y-4 text-xs"
          >
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex justify-between font-medium text-slate-600">
                <span>Base Salary:</span>
                <span className="font-bold text-slate-900">₹{Number(adjustingRecord.baseSalary).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span>PT Commissions:</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                    From Trainer Commissions
                  </span>
                </span>
                <span className="font-bold text-emerald-700">+₹{Number(adjustingRecord.commissions || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Incentive / Bonus (₹)
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Empty until filled</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0 (empty until filled)"
                onKeyDown={(e) => preventNonNumericKey(e, true)}
                value={adjustForm.bonus}
                onChange={(e) => setAdjustForm({ ...adjustForm, bonus: sanitizeDecimal(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Manual performance reward or monthly incentive for this cycle.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Salary Deductions (₹)
                </label>
                <span className="text-[10px] text-emerald-600 font-semibold">Persistent per staff</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0 (empty at first)"
                onKeyDown={(e) => preventNonNumericKey(e, true)}
                value={adjustForm.deductions}
                onChange={(e) => setAdjustForm({ ...adjustForm, deductions: sanitizeDecimal(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                TDS, advance repayments, or penalties. Once added, this deduction will automatically apply always for this staff/trainer.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
              <span className="font-bold text-emerald-900">Revised Net Payable:</span>
              <span className="font-mono font-black text-sm text-emerald-700">
                ₹{Math.max(0, (
                  Number(adjustingRecord.baseSalary || 0) +
                  Number(adjustingRecord.commissions || 0) +
                  (Number(adjustForm.bonus) || 0) -
                  (Number(adjustForm.deductions) || 0)
                )).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustingRecord(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm cursor-pointer"
              >
                Save Adjustments
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Formatted Payslip Slip Generation & Print Modal */}
      <Modal
        isOpen={Boolean(viewingPayslip)}
        onClose={() => setViewingPayslip(null)}
        title="Official Staff Salary Slip"
        maxWidth="max-w-2xl"
      >
        {viewingPayslip && (
          <div className="space-y-4">
            {/* Printable Slip Container */}
            <div
              id="salary-slip-printable"
              className="p-5 sm:p-6 bg-white border-2 border-slate-300 rounded-2xl text-slate-800 text-xs space-y-4 font-sans shadow-xs"
            >
              {/* Slip Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                      AF
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                        {currentUser?.gymName || 'PULSE FIT ATHLETIC CLUB'}
                      </h3>
                      <p className="text-[10px] text-slate-500">Official Staff Salary Payment Voucher / Pay Slip</p>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Slip No:</span>
                  <span className="font-mono font-black text-xs text-slate-800">
                    SLIP-{viewingPayslip.id || '2026-PAY'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Issued: {viewingPayslip.payDate || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* Employee & Pay Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Employee Name</span>
                  <span className="font-bold text-slate-900 text-xs">{viewingPayslip.trainerName || viewingPayslip.employeeName || viewingPayslip.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Designation</span>
                  <span className="font-semibold text-slate-800">{viewingPayslip.role || 'Fitness Coach'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Pay Cycle</span>
                  <span className="font-bold text-emerald-800">{viewingPayslip.period || viewingPayslip.month || selectedMonth}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Payment Status</span>
                  <span className={`font-bold inline-flex items-center gap-1 ${viewingPayslip.status === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{viewingPayslip.status}</span>
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200">
                    Earnings (Credits)
                  </div>
                  <div className="p-3 space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Basic Monthly Pay:</span>
                      <span className="font-mono font-bold text-slate-900">₹{Number(viewingPayslip.baseSalary || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">PT Commissions:</span>
                      <span className="font-mono font-bold text-emerald-700">+₹{Number(viewingPayslip.commissions || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Performance Incentives:</span>
                      <span className="font-mono font-bold text-emerald-700">+₹{Number(viewingPayslip.bonus || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Gross Earnings:</span>
                      <span className="font-mono text-emerald-700">
                        ₹{(Number(viewingPayslip.baseSalary || 0) + Number(viewingPayslip.commissions || 0) + Number(viewingPayslip.bonus || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200">
                    Deductions (Debits)
                  </div>
                  <div className="p-3 space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">TDS / Professional Tax:</span>
                      <span className="font-mono text-slate-500">₹0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Advance / Loan Recovery:</span>
                      <span className="font-mono font-bold text-rose-600">
                        {viewingPayslip.deductions > 0 ? `-₹${Number(viewingPayslip.deductions).toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Absence Penalties:</span>
                      <span className="font-mono text-slate-500">₹0</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Deductions:</span>
                      <span className="font-mono text-rose-600">
                        -₹{Number(viewingPayslip.deductions || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Take-Home Pay Highlight */}
              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold block">
                    Net Take-Home Salary Disbursed
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Payment Method: {viewingPayslip.paymentMethod || 'Bank Direct Transfer'}
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xl sm:text-2xl font-black text-emerald-800 font-mono">
                    ₹{Number(viewingPayslip.netPay).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Signatures Section */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-center">
                <div className="space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">Employee Signature</span>
                  <span className="text-[9px] text-slate-400">{viewingPayslip.trainerName || viewingPayslip.employeeName}</span>
                </div>
                <div className="space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="font-serif italic font-bold text-xs text-slate-700">Vikramaditya (Owner)</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">Authorized Signatory</span>
                  <span className="text-[9px] text-slate-400">{currentUser?.gymName || 'Club Management'}</span>
                </div>
              </div>
            </div>

            {/* Modal Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                Official computer-generated salary slip
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('salary-slip-printable')?.innerHTML;
                    if (!printContents) return;
                    const printWindow = window.open('', '', 'height=700,width=850');
                    printWindow.document.write('<html><head><title>Salary Slip - ' + (viewingPayslip.trainerName || 'Staff') + '</title>');
                    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                    printWindow.document.write('</head><body class="p-8 bg-white">');
                    printWindow.document.write(printContents);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                    }, 500);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>

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
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold shadow-sm active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    {payingId === viewingPayslip.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{payingId === viewingPayslip.id ? 'Disbursing...' : 'Disburse & Mark Paid'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingPayslip(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Advanced Filter Modal (Portalled to document.body) */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Filter Payroll Records</h3>
                  <p className="text-xs text-slate-500">Refine salary disbursement logs & cycles</p>
                </div>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Payroll Cycle Month */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Payroll Cycle Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {last12Months.map((m) => (
                    <option key={m.val} value={m.label}>
                      {m.label} {m.isCurrent ? '(Current Active Cycle)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Payment Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'Paid', label: 'Paid / Disbursed' },
                    { id: 'Pending', label: 'Pending Approval' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusFilter(s.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                        statusFilter === s.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Staff Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Roles' },
                    { id: 'coach', label: 'Fitness Coaches' },
                    { id: 'manager', label: 'Managers' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoleFilter(r.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                        roleFilter === r.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
