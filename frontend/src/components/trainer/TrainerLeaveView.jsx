import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  HeartPulse,
  Sun,
  FileText,
  AlertCircle,
  Briefcase,
  ChevronDown,
  Check
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { hasSqlInjection } from '../../utils/validation';

export const TrainerLeaveView = ({ setActiveTab }) => {
  const {
    leaveRequests = [],
    leaveBalances = [],
    applyLeave,
    fetchLeaveRequests,
    fetchLeaveBalances,
    addToast
  } = useGymData();

  const { currentUser } = useAuth();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Leave application form
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Privilege Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Calculate my leave requests
  const myRequests = useMemo(() => {
    const cId = String(currentUser?.id || '').toLowerCase();
    const cUserId = String(currentUser?.userId || '').toLowerCase();
    const cName = String(currentUser?.name || '').toLowerCase();

    return leaveRequests.filter((r) => {
      const rId = String(r.userId || '').toLowerCase();
      const rName = String(r.userName || '').toLowerCase();
      return (
        rId === cId ||
        rId === cUserId ||
        (cName && rName && (rName.includes(cName) || cName.includes(rName)))
      );
    });
  }, [leaveRequests, currentUser]);

  const filteredRequests = useMemo(() => {
    if (filterStatus === 'ALL') return myRequests;
    return myRequests.filter((r) => r.status === filterStatus);
  }, [myRequests, filterStatus]);

  // Find my leave balances
  const myBalanceRecord = useMemo(() => {
    const cId = String(currentUser?.id || '');
    const cUserId = String(currentUser?.userId || '');
    const cName = String(currentUser?.name || '').toLowerCase();

    return leaveBalances.find((b) => {
      const bId = String(b.user_id || '');
      const bName = String(b.user_name || '').toLowerCase();
      return (
        bId === cId ||
        bId === cUserId ||
        (cName && bName && (bName.includes(cName) || cName.includes(bName)))
      );
    });
  }, [leaveBalances, currentUser]);

  // Filter options with live counts
  const filterOptions = useMemo(() => [
    { value: 'ALL', label: 'All Statuses', count: myRequests.length },
    { value: 'Pending', label: 'Pending Review', count: myRequests.filter((r) => r.status === 'Pending').length },
    { value: 'Approved', label: 'Approved', count: myRequests.filter((r) => r.status === 'Approved').length },
    { value: 'Rejected', label: 'Rejected', count: myRequests.filter((r) => r.status === 'Rejected').length }
  ], [myRequests]);

  const currentFilterLabel = filterOptions.find((o) => o.value === filterStatus)?.label || 'All Statuses';

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isFilterDropdownOpen]);

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(leaveForm.reason)) {
      addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
      addToast('End date cannot be earlier than start date', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const daysCount = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

      await applyLeave({
        user_id: currentUser?.userId || currentUser?.id || 72,
        leave_type: leaveForm.leaveType,
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        days_count: daysCount,
        reason: leaveForm.reason
      });

      setIsApplyModalOpen(false);
      setLeaveForm({
        leaveType: 'Privilege Leave',
        startDate: '',
        endDate: '',
        reason: ''
      });
    } catch (err) {
      // Toast handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLeaveTypeIcon = (type) => {
    if (type === 'Privilege Leave') return ShieldCheck;
    if (type === 'Sick Leave') return HeartPulse;
    if (type === 'Casual Leave') return Sun;
    return Briefcase;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 max-w-5xl mx-auto px-2 sm:px-0">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black font-heading text-slate-900 tracking-tight">
              My Leave Tracker & Applications
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Check your remaining paid leave balance and submit leave applications to management.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsApplyModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* 2. My Remaining Leave Balances (Small & Two in One Row) */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          My Leaves Balance (2026)
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {/* Total Remaining */}
          <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-800 rounded-xl sm:rounded-2xl shadow-xs">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block truncate">
              Total Leaves Left
            </span>
            <div className="text-base sm:text-xl font-black text-white mt-1 truncate">
              {myBalanceRecord?.total_remaining ?? 27}{' '}
              <span className="text-xs font-medium text-slate-300">Days</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-0.5 block truncate">
              Used: {myBalanceRecord?.total_used ?? 3} / Total: {myBalanceRecord?.total_allocated ?? 30}
            </span>
          </div>

          {/* Individual Category Balances */}
          {myBalanceRecord?.balances && myBalanceRecord.balances.length > 0 ? (
            myBalanceRecord.balances.map((b) => {
              const Icon = getLeaveTypeIcon(b.leave_type);
              return (
                <div
                  key={b.id || b.leave_type}
                  className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span className="truncate">{b.leave_type}</span>
                    <Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-1" />
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 mt-1 truncate">
                    {b.remaining_days}{' '}
                    <span className="text-xs font-normal text-slate-400">Left</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 block truncate">
                    Quota: {b.allocated_days} • Used: {b.used_days}
                  </div>
                </div>
              );
            })
          ) : (
            <>
              <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span className="truncate">Privilege Leave</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-1" />
                </div>
                <div className="text-base sm:text-xl font-black text-slate-900 mt-1 truncate">
                  10 <span className="text-xs font-normal text-slate-400">Left</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Quota: 12 • Used: 2</span>
              </div>
              <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span className="truncate">Sick Leave</span>
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-1" />
                </div>
                <div className="text-base sm:text-xl font-black text-slate-900 mt-1 truncate">
                  9 <span className="text-xs font-normal text-slate-400">Left</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Quota: 10 • Used: 1</span>
              </div>
              <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span className="truncate">Casual Leave</span>
                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                </div>
                <div className="text-base sm:text-xl font-black text-slate-900 mt-1 truncate">
                  8 <span className="text-xs font-normal text-slate-400">Left</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Quota: 8 • Used: 0</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. My Application History */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-20">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              My Past Applications & Approvals
            </h2>
            <p className="text-xs text-slate-500">History of leave requests and status</p>
          </div>

          {/* Custom Styled Filter Dropdown (Bounded within screen and card) */}
          <div className="relative w-full sm:w-52" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              className="w-full h-10 px-3.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {currentFilterLabel} ({filterOptions.find((o) => o.value === filterStatus)?.count ?? 0})
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-1.5 ${
                  isFilterDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              />
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute top-full right-0 left-0 sm:left-auto sm:w-56 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-fadeIn">
                {filterOptions.map((opt) => {
                  const isSelected = filterStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFilterStatus(opt.value);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-indigo-200/70 text-indigo-900' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
            No leave requests found in this category.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-900">{req.leaveType}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                      {req.daysCount} {req.daysCount === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {req.startDate} → {req.endDate}
                  </div>
                  <p className="text-xs text-slate-700 mt-1 italic">
                    "{req.reason}"
                  </p>
                  {req.actionNotes && (
                    <div className="text-[11px] text-slate-500 mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                      Management Note: {req.actionNotes}
                    </div>
                  )}
                </div>

                <div className="sm:text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${
                      req.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {req.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {req.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                    {req.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                    <span>{req.status}</span>
                  </span>
                  {req.actionBy && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Action by {req.actionBy}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Modal: Apply for Leave */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave"
      >
        <form onSubmit={handleSubmitApplication} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Leave Type *
            </label>
            <select
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-indigo-500"
            >
              <option value="Privilege Leave">Privilege Leave (PL)</option>
              <option value="Sick Leave">Sick Leave (SL)</option>
              <option value="Casual Leave">Casual Leave (CL)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Leave *
            </label>
            <textarea
              rows={3}
              required
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="State the reason for absence..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
