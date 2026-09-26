import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  Search,
  RotateCw,
  ShieldCheck,
  HeartPulse,
  Sun,
  Briefcase,
  ChevronRight,
  Info,
  Sliders,
  Check,
  X,
  ChevronDown,
  Filter
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
const StaffAvatar = ({ src, alt, className = "w-9 h-9 rounded-full", iconClassName = "w-4 h-4 text-indigo-600" }) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className={`${className} bg-indigo-50 border border-slate-200 flex items-center justify-center shrink-0`}>
        <User className={iconClassName} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Avatar"}
      className={`${className} object-cover shrink-0`}
      onError={() => setHasError(true)}
    />
  );
};

export const LeaveManagement = () => {
  const {
    leaveRequests = [],
    leaveBalances = [],
    leaveSummary = {},
    fetchLeaveRequests,
    fetchLeaveBalances,
    fetchLeaveSummary,
    fetchEmployeeLeaveBalance,
    updateLeaveStatus,
    allocateEmployeeLeaves,
    trainers = [],
    fetchTrainers,
    addToast
  } = useGymData();

  const { currentUser } = useAuth();

  // Active Tab: 'requests' | 'ledger' | 'quotas'
  const [activeTab, setActiveTab] = useState('requests');

  // Filter & Search States
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected Employee Details Modal (opened when clicking on staff name)
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState(null);
  const [isLoadingEmployeeDetails, setIsLoadingEmployeeDetails] = useState(false);

  // Direct Processing State for 1-Click Accept / Reject
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // Simple Paid Leaves Creation Form State: Casual, Sick, Privilege
  const [simpleQuotaForm, setSimpleQuotaForm] = useState({
    targetMode: 'ALL', // 'ALL' or 'INDIVIDUAL'
    userId: '',
    casualDays: '',
    sickDays: '',
    privilegeDays: '',
    year: 2026,
    isSubmitting: false
  });

  useEffect(() => {
    handleRefreshData();
    fetchTrainers?.();
  }, []);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchLeaveRequests?.(),
        fetchLeaveBalances?.(),
        fetchLeaveSummary?.()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open employee leave details modal when clicking staff name
  const handleOpenEmployeeDetails = async (userId, employeeName = null) => {
    if (!userId) return;
    setIsLoadingEmployeeDetails(true);
    try {
      const data = await fetchEmployeeLeaveBalance(userId);
      if (data) {
        setSelectedEmployeeBalance(data);
      } else {
        const match = leaveBalances.find(
          (b) => String(b.user_id) === String(userId) || b.user_name === employeeName
        );
        if (match) {
          setSelectedEmployeeBalance({
            user: {
              id: match.user_id,
              name: match.user_name,
              email: match.email,
              role: match.role,
              avatar: match.avatar,
              phone: match.phone
            },
            total_allocated: match.total_allocated,
            total_used: match.total_used,
            total_remaining: match.total_remaining,
            breakdown: match.balances || [],
            history: leaveRequests.filter((r) => String(r.userId) === String(match.user_id))
          });
        }
      }
    } catch (err) {
      console.error('Error fetching employee leave profile:', err);
    } finally {
      setIsLoadingEmployeeDetails(false);
    }
  };

  // Direct 1-Click Accept or Reject without confirmation modal popup
  const handleDirectAction = async (request, targetStatus) => {
    if (!request) return;
    const reqId = request.numericId || request.id;
    setProcessingRequestId(reqId);
    try {
      const approverName = currentUser?.name || 'Owner';
      const defaultNotes = targetStatus === 'Approved' ? 'Approved by owner.' : 'Rejected by owner.';
      await updateLeaveStatus(reqId, targetStatus, defaultNotes, approverName);

      if (selectedEmployeeBalance?.user?.id === request.userId) {
        handleOpenEmployeeDetails(request.userId);
      }
    } catch (err) {
      console.error('Failed to update leave status:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Save Simple Quotas (Casual, Sick, Privilege) for Trainers & Staff
  const handleSaveSimpleQuotas = async (e) => {
    e.preventDefault();
    if (simpleQuotaForm.targetMode === 'INDIVIDUAL' && !simpleQuotaForm.userId) {
      addToast('Please select a trainer or staff member', 'error');
      return;
    }

    setSimpleQuotaForm((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await allocateEmployeeLeaves({
        apply_all: simpleQuotaForm.targetMode === 'ALL',
        user_id: simpleQuotaForm.targetMode === 'INDIVIDUAL' ? simpleQuotaForm.userId : null,
        casual_leave: Number(simpleQuotaForm.casualDays) || 0,
        sick_leave: Number(simpleQuotaForm.sickDays) || 0,
        privilege_leave: Number(simpleQuotaForm.privilegeDays) || 0,
        year: Number(simpleQuotaForm.year) || 2026
      });

      setActiveTab('ledger');
    } catch (err) {
      // Handled by context
    } finally {
      setSimpleQuotaForm((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Only Trainers and Staff (strictly exclude plain members)
  const staffOnlyBalances = useMemo(() => {
    return leaveBalances.filter((b) => {
      const role = (b.role || '').toLowerCase();
      return role !== 'member';
    });
  }, [leaveBalances]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'ALL') count++;
    if (filterType !== 'ALL') count++;
    if (filterRole !== 'ALL') count++;
    return count;
  }, [filterStatus, filterType, filterRole]);

  const handleResetFilters = () => {
    setFilterStatus('ALL');
    setFilterType('ALL');
    setFilterRole('ALL');
    setSearchTerm('');
  };

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    if (activeTab === 'requests') {
      return leaveRequests
        .filter((r) =>
          (r.userName || '').toLowerCase().includes(term) ||
          (r.role || '').toLowerCase().includes(term) ||
          (r.leaveType || '').toLowerCase().includes(term) ||
          (r.reason || '').toLowerCase().includes(term)
        )
        .slice(0, 5);
    } else {
      return staffOnlyBalances
        .filter((b) =>
          (b.user_name || '').toLowerCase().includes(term) ||
          (b.role || '').toLowerCase().includes(term) ||
          (b.email || '').toLowerCase().includes(term)
        )
        .slice(0, 5);
    }
  }, [searchTerm, activeTab, leaveRequests, staffOnlyBalances]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      if (filterType !== 'ALL' && r.leaveType !== filterType) return false;
      if (filterRole !== 'ALL' && (r.role || '').toLowerCase() !== filterRole.toLowerCase()) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = r.userName?.toLowerCase().includes(query);
        const matchesRole = r.role?.toLowerCase().includes(query);
        const matchesReason = r.reason?.toLowerCase().includes(query);
        const matchesType = r.leaveType?.toLowerCase().includes(query);
        if (!matchesName && !matchesRole && !matchesReason && !matchesType) return false;
      }
      return true;
    });
  }, [leaveRequests, filterStatus, filterType, filterRole, searchTerm]);

  // Filtered ledger employees
  const filteredLedger = useMemo(() => {
    return staffOnlyBalances.filter((b) => {
      if (filterRole !== 'ALL' && (b.role || '').toLowerCase() !== filterRole.toLowerCase()) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = b.user_name?.toLowerCase().includes(query);
        const matchesRole = b.role?.toLowerCase().includes(query);
        const matchesEmail = b.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesRole && !matchesEmail) return false;
      }
      return true;
    });
  }, [staffOnlyBalances, filterRole, searchTerm]);

  // Helper to extract specific leave balance from an employee's balances array
  const getSpecificLeaveBalance = (employee, leaveTypeKey) => {
    const target = leaveTypeKey.toLowerCase();

    if (!employee?.balances || !Array.isArray(employee.balances) || employee.balances.length === 0) {
      return { remaining: 0, allocated: 0, used: 0 };
    }

    const found = employee.balances.find((b) => {
      const typeStr = String(b.leave_type || b.leaveType || '').toLowerCase();
      if (target.includes('casual')) return typeStr.includes('casual');
      if (target.includes('sick')) return typeStr.includes('sick');
      if (target.includes('privilege')) return typeStr.includes('privilege');
      return typeStr === target;
    });

    if (!found) {
      return { remaining: 0, allocated: 0, used: 0 };
    }

    const rem = Number(found.remaining_days ?? found.remainingDays ?? 0);
    const alloc = Number(found.allocated_days ?? found.allocatedDays ?? 0);
    const used = Number(found.used_days ?? found.usedDays ?? 0);

    return {
      remaining: rem,
      allocated: alloc,
      used: used
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
          text: 'Approved'
        };
      case 'Rejected':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: XCircle,
          text: 'Rejected'
        };
      case 'Pending':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
          icon: Clock,
          text: 'Pending'
        };
    }
  };

  const pendingCount = leaveRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-16 max-w-7xl mx-auto">
      {/* 1. Top Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Staff & Trainer Leave Management
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Review & accept/reject leave applications, inspect staff leave balances, and set annual quotas for trainers and staff.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh leave requests & balances"
          >
            <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards (Compact Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Pending Requests */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Pending Approvals
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1">
            {pendingCount}
          </div>
        </div>

        {/* Staff On Leave Today */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:border-sky-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Staff on Leave Today
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-sky-600 mt-0.5 sm:mt-1">
            {leaveSummary.staff_on_leave_today || 0}
          </div>
        </div>

        {/* Total Approved This Month */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Approved This Month
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">
            {leaveSummary.approved_this_month || 0} <span className="text-xs font-semibold text-slate-400">days</span>
          </div>
        </div>

        {/* Total Staff in Roster */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Staff & Coaches
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-600 mt-0.5 sm:mt-1">
            {staffOnlyBalances.length || leaveSummary.total_employees || 0}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Leave Requests & Approvals</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Leave Ledger & Remaining Balances</span>
        </button>

        <button
          onClick={() => setActiveTab('quotas')}
          className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'quotas'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Create Paid Leaves</span>
        </button>
      </div>

      {/* 4. TAB 1: Leave Requests & Accept/Reject Actions */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
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
                  placeholder="Search staff name, role, reason, or leave type..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs transition-all"
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

                {/* Autocomplete Suggestions Dropdown */}
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
                          setSearchTerm(item.userName || item.user_name || '');
                          setIsSearchDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50/60 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{item.userName || item.user_name}</span>
                          <span className="text-[10px] text-slate-400">({item.role || 'Staff'})</span>
                        </div>
                        {item.leaveType && (
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                            {item.leaveType}
                          </span>
                        )}
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
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
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

                {filterStatus !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    Status: {filterStatus}
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ALL')}
                      className="hover:text-indigo-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filterType !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    Type: {filterType}
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className="hover:text-indigo-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filterRole !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    Role: {filterRole}
                    <button
                      type="button"
                      onClick={() => setFilterRole('ALL')}
                      className="hover:text-indigo-900 cursor-pointer"
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
                  Showing {filteredRequests.length} of {leaveRequests.length} requests
                </span>
              </div>
            )}
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <EmptyState
                icon={CalendarDays}
                title="No Leave Requests Found"
                description="No leave applications match the selected status or filters."
              />
              {(activeFiltersCount > 0 || searchTerm) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Trainer / Staff Member</th>
                      <th className="py-3.5 px-4">Leave Type</th>
                      <th className="py-3.5 px-4">Duration & Dates</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => {
                      const statusBadge = getStatusBadge(req.status);
                      const StatusIcon = statusBadge.icon;

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Staff Column - Clickable Name to view remaining leaves */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <StaffAvatar
                                src={req.userAvatar}
                                alt={req.userName}
                                className="w-9 h-9 rounded-full"
                                iconClassName="w-4 h-4 text-indigo-600"
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEmployeeDetails(req.userId, req.userName)}
                                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 text-left cursor-pointer group"
                                  title="Click to view remaining leaves for this staff member"
                                >
                                  <span>{req.userName}</span>
                                  <Info className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600" />
                                </button>
                                <span className="text-[11px] text-slate-500 capitalize block">
                                  {req.role || 'Trainer / Staff'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Leave Type */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-flex items-center gap-1.5 ${
                                req.leaveType === 'Privilege Leave'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : req.leaveType === 'Sick Leave'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {req.leaveType === 'Privilege Leave' && <ShieldCheck className="w-3 h-3" />}
                              {req.leaveType === 'Sick Leave' && <HeartPulse className="w-3 h-3" />}
                              {req.leaveType === 'Casual Leave' && <Sun className="w-3 h-3" />}
                              <span>{req.leaveType}</span>
                            </span>
                            {req.remainingBalanceForType !== null && (
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                {req.remainingBalanceForType} days left in balance
                              </span>
                            )}
                          </td>

                          {/* Duration & Dates */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">
                              {req.daysCount} {req.daysCount === 1 ? 'Day' : 'Days'}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>{req.startDate}</span>
                              <span className="text-slate-300">→</span>
                              <span>{req.endDate}</span>
                            </div>
                          </td>

                          {/* Reason */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-slate-700 text-xs line-clamp-2" title={req.reason}>
                              "{req.reason || 'No reason provided'}"
                            </p>
                            {req.actionNotes && (
                              <div className="mt-1 text-[11px] text-slate-500 italic bg-slate-50 p-1 rounded border border-slate-100">
                                Note: {req.actionNotes}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 w-max ${statusBadge.bg}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{statusBadge.text}</span>
                            </span>
                            {req.actionBy && (
                              <span className="text-[10px] text-slate-400 block mt-1">
                                By {req.actionBy}
                              </span>
                            )}
                          </td>

                          {/* Actions: Direct 1-Click Accept or Reject */}
                          <td className="py-3.5 px-4 text-right">
                            {req.status === 'Pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={processingRequestId === (req.numericId || req.id)}
                                  onClick={() => handleDirectAction(req, 'Approved')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                  title="Directly accept and approve this leave request"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>
                                    {processingRequestId === (req.numericId || req.id)
                                      ? 'Accepting...'
                                      : 'Accept'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled={processingRequestId === (req.numericId || req.id)}
                                  onClick={() => handleDirectAction(req, 'Rejected')}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Directly reject this leave request"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>
                                    {processingRequestId === (req.numericId || req.id)
                                      ? 'Rejecting...'
                                      : 'Reject'}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEmployeeDetails(req.userId, req.userName)}
                                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>View Balances</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: Employee Leave Ledger & Remaining Balances Table */}
      {/* "in the employee leave and ledger and remaining balance show the member names and in front of them there leaves that are there in balance with them" */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Staff & Trainer Leave Balances
              </h3>
              <p className="text-xs text-slate-500">
                Trainer and staff names with their remaining Casual, Sick, and Privilege leaves shown in front of them.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff, trainer name..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500 transition-all"
              />
            </div>
          </div>

          {filteredLedger.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <EmptyState
                icon={Users}
                title="No Staff Balances Found"
                description="No trainers or staff records match your search."
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Trainer / Staff Name</th>
                      <th className="py-3.5 px-4">Casual Leave (CL)</th>
                      <th className="py-3.5 px-4">Sick Leave (SL)</th>
                      <th className="py-3.5 px-4">Privilege Leave (PL)</th>
                      <th className="py-3.5 px-4">Total Leaves Left</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLedger.map((emp) => {
                      const cl = getSpecificLeaveBalance(emp, 'Casual Leave');
                      const sl = getSpecificLeaveBalance(emp, 'Sick Leave');
                      const pl = getSpecificLeaveBalance(emp, 'Privilege Leave');

                      return (
                        <tr key={emp.user_id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Trainer / Staff Name (Clickable) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <StaffAvatar
                                src={emp.avatar}
                                alt={emp.user_name}
                                className="w-10 h-10 rounded-full"
                                iconClassName="w-5 h-5 text-indigo-600"
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEmployeeDetails(emp.user_id, emp.user_name)}
                                  className="font-bold text-slate-900 hover:text-indigo-600 hover:underline flex items-center gap-1.5 text-left cursor-pointer group"
                                  title="Click to view full leave history & details"
                                >
                                  <span>{emp.user_name}</span>
                                  <Info className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600" />
                                </button>
                                <span className="text-[11px] text-slate-500 capitalize block">
                                  {emp.role || 'Fitness Staff'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Casual Leave in front of name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <Sun className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">
                                  {cl.remaining} <span className="text-[11px] font-normal text-slate-400">Left</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  Quota: {cl.allocated} • Used: {cl.used}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Sick Leave in front of name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-amber-50 text-amber-600 border border-amber-200">
                                <HeartPulse className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">
                                  {sl.remaining} <span className="text-[11px] font-normal text-slate-400">Left</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  Quota: {sl.allocated} • Used: {sl.used}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Privilege Leave in front of name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">
                                  {pl.remaining} <span className="text-[11px] font-normal text-slate-400">Left</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  Quota: {pl.allocated} • Used: {pl.used}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Total Leaves in Balance */}
                          <td className="py-3.5 px-4">
                            {(() => {
                              const calcTotalRemaining = cl.remaining + sl.remaining + pl.remaining;
                              const calcTotalAllocated = cl.allocated + sl.allocated + pl.allocated;
                              const calcTotalUsed = cl.used + sl.used + pl.used;
                              const totalLeft = emp.total_remaining > 0 ? emp.total_remaining : calcTotalRemaining;
                              const totalAllocated = emp.total_allocated > 0 ? emp.total_allocated : calcTotalAllocated;
                              const totalUsed = emp.total_used > 0 ? emp.total_used : calcTotalUsed;

                              return (
                                <>
                                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                                    {totalLeft} Days Left
                                  </span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Used: {totalUsed} / {totalAllocated}
                                  </span>
                                </>
                              );
                            })()}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEmployeeDetails(emp.user_id, emp.user_name)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>View Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: Simplified Paid Leaves Creation */}
      {/* "make the leaves creation simple for the owner the owner will only create leaves for the trainer and staff not for the members , in the page of creation he wll add number of days for casual leave, sick leave , and privilege leaves thats it." */}
      {activeTab === 'quotas' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Set Paid Leaves (Trainers & Staff)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the number of days for Casual Leave, Sick Leave, and Privilege Leave. Only applies to trainers and staff.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSimpleQuotas} className="space-y-5">
              {/* Step 1: Target Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Who to Assign Leaves To *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSimpleQuotaForm((prev) => ({ ...prev, targetMode: 'ALL' }))}
                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                      simpleQuotaForm.targetMode === 'ALL'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    <div className="text-left">
                      <div>All Trainers & Staff</div>
                      <div className="text-[10px] font-normal text-slate-500">Apply gym-wide leave policy</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimpleQuotaForm((prev) => ({ ...prev, targetMode: 'INDIVIDUAL' }))}
                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                      simpleQuotaForm.targetMode === 'INDIVIDUAL'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4 text-indigo-600" />
                    <div className="text-left">
                      <div>Single Trainer or Staff</div>
                      <div className="text-[10px] font-normal text-slate-500">Custom quota for 1 person</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 1b: Specific Employee Dropdown */}
              {simpleQuotaForm.targetMode === 'INDIVIDUAL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Trainer / Staff Member *
                  </label>
                  <select
                    required
                    value={simpleQuotaForm.userId}
                    onChange={(e) => setSimpleQuotaForm((prev) => ({ ...prev, userId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-indigo-500"
                  >
                    <option value="">-- Choose Trainer or Staff --</option>
                    {staffOnlyBalances.map((stf) => (
                      <option key={stf.user_id} value={stf.user_id}>
                        {stf.user_name} ({stf.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 2: The 3 Simple Leave Inputs (Casual, Sick, Privilege) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Enter Number of Days for Each Leave Type</span>
                </div>

                {/* 1. Casual Leave */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Casual Leaves (CL)</span>
                      <span className="text-[10px] text-slate-500">For personal events and short breaks</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={simpleQuotaForm.casualDays}
                      onChange={(e) =>
                        setSimpleQuotaForm((prev) => ({ ...prev, casualDays: sanitizeDecimal(e.target.value) }))
                      }
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center text-slate-900 focus:bg-white focus:outline-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-semibold">Days</span>
                  </div>
                </div>

                {/* 2. Sick Leave */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Sick Leaves (SL)</span>
                      <span className="text-[10px] text-slate-500">For illness and medical recovery</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={simpleQuotaForm.sickDays}
                      onChange={(e) =>
                        setSimpleQuotaForm((prev) => ({ ...prev, sickDays: sanitizeDecimal(e.target.value) }))
                      }
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center text-slate-900 focus:bg-white focus:outline-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-semibold">Days</span>
                  </div>
                </div>

                {/* 3. Privilege Leave */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Privilege Leaves (PL)</span>
                      <span className="text-[10px] text-slate-500">Annual earned / privilege leave</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={simpleQuotaForm.privilegeDays}
                      onChange={(e) =>
                        setSimpleQuotaForm((prev) => ({ ...prev, privilegeDays: sanitizeDecimal(e.target.value) }))
                      }
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center text-slate-900 focus:bg-white focus:outline-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-semibold">Days</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={simpleQuotaForm.isSubmitting}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {simpleQuotaForm.isSubmitting
                      ? 'Saving Leaves...'
                      : simpleQuotaForm.targetMode === 'ALL'
                      ? 'Save & Assign Leaves to All Trainers & Staff'
                      : 'Save & Assign Leaves to Selected Staff'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Staff / Trainer Remaining Leaves Details */}
      {/* "when the owner will click on the name of the trainer or staff the leaves that are left for the trainer will be shown there" */}
      <Modal
        isOpen={Boolean(selectedEmployeeBalance) || isLoadingEmployeeDetails}
        onClose={() => setSelectedEmployeeBalance(null)}
        title="Employee Leave Balance & History"
      >
        {isLoadingEmployeeDetails ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Loading leave details...</span>
          </div>
        ) : selectedEmployeeBalance ? (
          <div className="space-y-5 max-w-xl">
            {/* Staff Card */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <StaffAvatar
                src={selectedEmployeeBalance.user?.avatar}
                alt={selectedEmployeeBalance.user?.name}
                className="w-12 h-12 rounded-full"
                iconClassName="w-6 h-6 text-indigo-600"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {selectedEmployeeBalance.user?.name}
                </h3>
                <span className="text-xs text-slate-500 capitalize block">
                  {selectedEmployeeBalance.user?.role || 'Fitness Staff'} • {selectedEmployeeBalance.user?.email}
                </span>
                {selectedEmployeeBalance.user?.phone && (
                  <span className="text-[11px] text-slate-400 block">
                    Phone: {selectedEmployeeBalance.user?.phone}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-600 block">
                  {selectedEmployeeBalance.total_remaining}
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Total Leaves Left
                </span>
              </div>
            </div>

            {/* Visual Leaves Left Breakdown Cards */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Remaining Leaves Left in Balance ({selectedEmployeeBalance.year || 2026})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {selectedEmployeeBalance.breakdown?.map((item) => (
                  <div
                    key={item.id || item.leave_type}
                    className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                      {item.leave_type === 'Casual Leave' && <Sun className="w-3.5 h-3.5 text-emerald-500" />}
                      {item.leave_type === 'Sick Leave' && <HeartPulse className="w-3.5 h-3.5 text-amber-500" />}
                      {item.leave_type === 'Privilege Leave' && <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />}
                      <span className="truncate">{item.leave_type}</span>
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {item.remaining_days}{' '}
                      <span className="text-xs font-normal text-slate-400">Days Left</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>Used: {item.used_days}</span>
                      <span>Quota: {item.allocated_days}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave History for this employee */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Leave Request History
              </h4>
              {selectedEmployeeBalance.history && selectedEmployeeBalance.history.length > 0 ? (
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  {selectedEmployeeBalance.history.map((h) => {
                    const statusBadge = getStatusBadge(h.status);
                    return (
                      <div key={h.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{h.leave_type || h.leaveType}</span>
                            <span className="text-slate-400 font-normal">
                              ({h.days_count || h.daysCount} {h.days_count === 1 ? 'day' : 'days'})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            {h.start_date || h.startDate} → {h.end_date || h.endDate}
                          </span>
                          <span className="text-[11px] text-slate-600 italic block mt-0.5">
                            "{h.reason}"
                          </span>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                            {h.status}
                          </span>
                          {h.action_notes && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {h.action_notes}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  No leave requests recorded yet for this employee.
                </div>
              )}
            </div>

            {/* Modal Bottom CTA */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployeeBalance(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Advanced Filter Modal (Portalled to document.body) */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Filter Leave Records</h3>
                  <p className="text-xs text-slate-500">Refine leave requests & employee lists</p>
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
              {/* Application Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Application Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'Pending', label: 'Pending Approval' },
                    { id: 'Approved', label: 'Approved' },
                    { id: 'Rejected', label: 'Rejected' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterStatus(st.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        filterStatus === st.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Leave Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ALL', label: 'All Leave Types' },
                    { id: 'Casual Leave', label: 'Casual Leave (CL)' },
                    { id: 'Sick Leave', label: 'Sick Leave (SL)' },
                    { id: 'Privilege Leave', label: 'Privilege Leave (PL)' }
                  ].map((lt) => (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => setFilterType(lt.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        filterType === lt.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Staff Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Roles' },
                    { id: 'trainer', label: 'Trainer' },
                    { id: 'manager', label: 'Manager' },
                    { id: 'staff', label: 'Accounts / Staff' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFilterRole(r.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                        filterRole === r.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
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
