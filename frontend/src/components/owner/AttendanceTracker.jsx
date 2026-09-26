import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import {
  CalendarCheck,
  Search,
  Plus,
  Award,
  CheckCircle2,
  Clock,
  QrCode,
  Calendar,
  FileText,
  Printer,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Sparkles,
  Info,
  CalendarDays,
  Filter,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import {
  getTodayIso,
  getYesterdayIso,
  formatDateDisplay,
  recordMatchesDate
} from '../../utils/dateUtils';

export const AttendanceTracker = () => {
  const {
    attendance = [],
    checkInMemberByQR,
    punchOutMember,
    staffAttendanceLogs = [],
    recordStaffCheckIn,
    members = [],
    trainers = [],
    fetchAttendance,
    fetchMembers,
    fetchTrainers,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchAttendance?.();
    fetchMembers?.();
    fetchTrainers?.();
  }, [fetchAttendance, fetchMembers, fetchTrainers]);

  const todayIso = getTodayIso();
  const yesterdayIso = getYesterdayIso();

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'staff'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  const [isMemberCheckInModalOpen, setIsMemberCheckInModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [loadingStaffId, setLoadingStaffId] = useState(null);
  const [isCheckingInManual, setIsCheckingInManual] = useState(false);

  const isToday = selectedDate === todayIso;
  const isYesterday = selectedDate === yesterdayIso;

  // Step 1 Day Backward
  const handlePrevDay = () => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const prev = new Date(y, m - 1, d);
      prev.setDate(prev.getDate() - 1);
      const prevIso = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
      setSelectedDate(prevIso);
    } catch (e) {
      setSelectedDate(yesterdayIso);
    }
  };

  // Step 1 Day Forward (capped at today)
  const handleNextDay = () => {
    if (selectedDate >= todayIso) return;
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const next = new Date(y, m - 1, d);
      next.setDate(next.getDate() + 1);
      const nextIso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      if (nextIso > todayIso) {
        setSelectedDate(todayIso);
      } else {
        setSelectedDate(nextIso);
      }
    } catch (e) {
      setSelectedDate(todayIso);
    }
  };

  // Filter records strictly by selectedDate
  const dayMemberAttendance = attendance.filter((a) =>
    recordMatchesDate(a, selectedDate)
  );

  const dayStaffAttendance = staffAttendanceLogs.filter((s) =>
    recordMatchesDate(s, selectedDate)
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (selectedDate !== todayIso) count++;
    return count;
  }, [statusFilter, selectedDate, todayIso]);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setSelectedDate(todayIso);
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    if (activeTab === 'members') {
      return dayMemberAttendance
        .filter((a) =>
          (a.memberName || a.name || '').toLowerCase().includes(term) ||
          (a.planName || '').toLowerCase().includes(term)
        )
        .slice(0, 5);
    } else {
      return dayStaffAttendance
        .filter((s) =>
          (s.staffName || '').toLowerCase().includes(term) ||
          (s.role || '').toLowerCase().includes(term)
        )
        .slice(0, 5);
    }
  }, [searchTerm, activeTab, dayMemberAttendance, dayStaffAttendance]);

  // Search filter
  const filteredMemberAttendance = useMemo(() => {
    return dayMemberAttendance.filter((a) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (a.memberName || a.name || '').toLowerCase().includes(term) ||
        (a.planName || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (statusFilter !== 'ALL') {
        const isCompleted = (a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'checked out';
        const hasCheckedOut = a.checkOutTime && a.checkOutTime !== '--' && a.checkOutTime !== 'null';
        const hasPunchedOut = a.punchOutTime && a.punchOutTime !== '--' && a.punchOutTime !== 'null';
        const isInside = !isCompleted && !hasCheckedOut && !hasPunchedOut;

        if (statusFilter === 'INSIDE' && !isInside) return false;
        if (statusFilter === 'CHECKED_OUT' && isInside) return false;
      }

      return true;
    });
  }, [dayMemberAttendance, searchTerm, statusFilter]);

  const filteredStaffAttendance = useMemo(() => {
    return dayStaffAttendance.filter((s) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (s.staffName || '').toLowerCase().includes(term) ||
        (s.role || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (statusFilter !== 'ALL') {
        const isInside = s.status === 'On Premises (Active)' || (s.checkInTime && !s.checkOutTime);
        if (statusFilter === 'INSIDE' && !isInside) return false;
        if (statusFilter === 'CHECKED_OUT' && isInside) return false;
      }

      return true;
    });
  }, [dayStaffAttendance, searchTerm, statusFilter]);

  // Metrics for selectedDate
  const currentlyInsideCount = dayMemberAttendance.filter((a) => {
    const isCompleted = (a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'checked out';
    const hasCheckedOut = a.checkOutTime && a.checkOutTime !== '--' && a.checkOutTime !== 'null';
    const hasPunchedOut = a.punchOutTime && a.punchOutTime !== '--' && a.punchOutTime !== 'null';
    return !isCompleted && !hasCheckedOut && !hasPunchedOut;
  }).length;

  const staffOnDuty = isToday
    ? dayStaffAttendance.filter(
        (s) => s.status === 'On Premises (Active)' || (s.checkInTime && !s.checkOutTime)
      ).length
    : dayStaffAttendance.length;

  const totalDayCheckins = dayMemberAttendance.length + dayStaffAttendance.length;

  const handleManualMemberCheckIn = async (e) => {
    e.preventDefault();
    const mem = members.find((m) => m.id === selectedMemberId);
    if (!mem) return;

    setIsCheckingInManual(true);
    try {
      await checkInMemberByQR(mem.qrPassCode || `PF-M-${mem.id.toUpperCase()}-CHECKIN`);
      setIsMemberCheckInModalOpen(false);
      addToast(`Member "${mem.name}" marked Present!`);
    } finally {
      setIsCheckingInManual(false);
    }
  };

  const handleRecordPunch = async (staffId) => {
    setLoadingStaffId(staffId);
    try {
      await recordStaffCheckIn(staffId);
    } finally {
      setLoadingStaffId(null);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                Attendance Tracker
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daily member turnstile check-ins & coach shift tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Muster Report</span>
          </button>

          {isToday ? (
            <button
              type="button"
              onClick={() => setIsMemberCheckInModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Punch In Member</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedDate(todayIso)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Switch to Live Today</span>
            </button>
          )}
        </div>
      </div>

      {/* INTERACTIVE DATE TRACKER CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Date Navigator Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-slate-700 font-bold text-xs mr-1">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>Attendance Date:</span>
            </div>

            {/* Prev Day Button */}
            <button
              type="button"
              onClick={handlePrevDay}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              title="View Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev Day</span>
            </button>

            {/* Native Date Input Picker */}
            <div className="relative inline-flex items-center">
              <input
                type="date"
                value={selectedDate}
                max={todayIso}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer shadow-2xs"
              />
            </div>

            {/* Next Day Button (Disabled if already at today) */}
            <button
              type="button"
              onClick={handleNextDay}
              disabled={selectedDate >= todayIso}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              title="View Next Day"
            >
              <span className="hidden sm:inline">Next Day</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Chips: Today & Yesterday */}
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isToday
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayIso)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isYesterday
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Yesterday
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards (Filtered strictly for selectedDate) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            {isToday ? "Today's Total Footfall" : `Total Footfall (${formatDateDisplay(selectedDate, { withRelative: true })})`}
          </span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
            {totalDayCheckins}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
            {isToday ? 'Turnstile & staff punches (starts at 0)' : `Recorded on ${formatDateDisplay(selectedDate)}`}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            {isToday ? 'Currently on Floor' : 'Members Attended'}
          </span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">
            {isToday ? `${currentlyInsideCount} Inside Now` : `${dayMemberAttendance.length} Members`}
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium block truncate">
            {isToday ? `${dayMemberAttendance.length} total check-ins today` : `Checked in on ${formatDateDisplay(selectedDate)}`}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            {isToday ? 'Staff on Duty' : 'Staff On Shift'}
          </span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
            {staffOnDuty} Coaches
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">
            {isToday ? 'Active duty shifts' : `Coaches logged on ${formatDateDisplay(selectedDate)}`}
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'members'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Members ({dayMemberAttendance.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trainer Shifts ({dayStaffAttendance.length})
            </button>
          </div>

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
              placeholder={activeTab === 'members' ? "Search member, pass plan..." : "Search coach, role..."}
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
                      setSearchTerm(item.memberName || item.staffName || item.name || '');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50/60 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.memberName || item.staffName || item.name}</span>
                      <span className="text-[10px] text-slate-400">({item.planName || item.role || 'Entry'})</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {item.checkInTime || 'Checked in'}
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

            {selectedDate !== todayIso && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Date: {formatDateDisplay(selectedDate)}
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayIso)}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Status: {statusFilter === 'INSIDE' ? 'Inside Gym' : 'Checked Out'}
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
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
              Showing {activeTab === 'members' ? filteredMemberAttendance.length : filteredStaffAttendance.length} records
            </span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'members' ? (
        <div className="space-y-2.5">
          {/* Mobile View: Member Cards */}
          <div className="block sm:hidden space-y-2">
            {filteredMemberAttendance.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <EmptyState
                  icon={CalendarCheck}
                  title={searchTerm ? "No matching member attendance" : `No Attendance Recorded for ${formatDateDisplay(selectedDate)}`}
                  description={
                    searchTerm
                      ? `No member records match "${searchTerm}".`
                      : isToday
                      ? "Members who scan their QR code pass at turnstiles or front desk will automatically appear here."
                      : `No check-ins were found on ${formatDateDisplay(selectedDate)}.`
                  }
                  actionText={isToday ? "Check In Member" : undefined}
                  onAction={isToday ? () => setIsMemberCheckInModalOpen(true) : undefined}
                  secondaryActionText={!isToday ? "Switch to Today" : (searchTerm ? "Clear Search" : undefined)}
                  onSecondaryAction={!isToday ? () => setSelectedDate(todayIso) : (searchTerm ? () => setSearchTerm('') : undefined)}
                  color="emerald"
                />
              </div>
            ) : (
              filteredMemberAttendance.map((log, idx) => (
                <div key={log.id || idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">{log.memberName || log.name || 'Member'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{log.planName || 'Active Pass'}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{log.status === 'Inside Gym' ? 'Inside Gym' : 'Present'}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">In Time</span>
                      <span className="font-semibold text-emerald-700">{log.checkInTime || log.punchInTime || '07:15 AM'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Out Time</span>
                      <span className="font-semibold text-slate-700">{log.checkOutTime || '--'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Duration</span>
                      <span className="font-medium text-slate-600">{log.duration || (log.checkOutTime ? '1h 15m' : 'In gym')}</span>
                    </div>
                  </div>

                  {isToday && (!log.checkOutTime || log.checkOutTime === '--' || log.status === 'Inside Gym') && (
                    <button
                      type="button"
                      onClick={() => punchOutMember(log.id)}
                      className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Punch Out Member</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Member Table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {filteredMemberAttendance.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CalendarCheck}
                  title={searchTerm ? "No matching member attendance" : `No Attendance Recorded for ${formatDateDisplay(selectedDate)}`}
                  description={
                    searchTerm
                      ? `No member records match "${searchTerm}".`
                      : isToday
                      ? "Members who scan their QR code pass at turnstiles or front desk will automatically appear here."
                      : `No check-ins were found on ${formatDateDisplay(selectedDate)}.`
                  }
                  actionText={isToday ? "Check In Member" : undefined}
                  onAction={isToday ? () => setIsMemberCheckInModalOpen(true) : undefined}
                  secondaryActionText={!isToday ? "Switch to Today" : (searchTerm ? "Clear Search" : undefined)}
                  onSecondaryAction={!isToday ? () => setSelectedDate(todayIso) : (searchTerm ? () => setSearchTerm('') : undefined)}
                  color="emerald"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-5">Member Name</th>
                      <th className="py-3.5 px-5">Plan</th>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5">Punch In</th>
                      <th className="py-3.5 px-5">Punch Out</th>
                      <th className="py-3.5 px-5">Duration</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMemberAttendance.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900 text-xs">
                          {log.memberName || log.name || 'Member'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">
                          {log.planName || 'Active Membership Pass'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.displayDate || formatDateDisplay(log.date || log.rawDate, { withRelative: true }) || 'Today'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-emerald-700 font-bold">
                          {log.checkInTime || log.punchInTime || '07:15 AM'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 font-semibold">
                          {log.checkOutTime || '--'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 font-medium">
                          {log.duration || (log.checkOutTime ? '1h 15m' : <span className="text-emerald-600 font-bold">In Progress</span>)}
                        </td>
                        <td className="py-3.5 px-5">
                          {(!log.checkOutTime || log.checkOutTime === '--' || log.status === 'Inside Gym') ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Inside Gym</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <CheckCircle2 className="w-3 h-3 text-slate-400" />
                              <span>Completed</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {isToday && (!log.checkOutTime || log.checkOutTime === '--' || log.status === 'Inside Gym') ? (
                            <button
                              type="button"
                              onClick={() => punchOutMember(log.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Clock className="w-3 h-3 text-rose-600" />
                              <span>Punch Out</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">Archived</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Mobile View: Trainer Staff Cards */}
          <div className="block sm:hidden space-y-2">
            {filteredStaffAttendance.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <EmptyState
                  icon={Award}
                  title={searchTerm ? "No matching coach records" : `No Trainer Shifts for ${formatDateDisplay(selectedDate)}`}
                  description={
                    searchTerm
                      ? `No coach shift records match "${searchTerm}".`
                      : "Trainer shifts and floor check-ins will appear here once logged."
                  }
                  secondaryActionText={!isToday ? "Switch to Today" : (searchTerm ? "Clear Search" : undefined)}
                  onSecondaryAction={!isToday ? () => setSelectedDate(todayIso) : (searchTerm ? () => setSearchTerm('') : undefined)}
                  color="teal"
                />
              </div>
            ) : (
              filteredStaffAttendance.map((stf) => {
                const isOnDuty = isToday && (stf.status === 'On Premises (Active)' || (stf.checkInTime && !stf.checkOutTime));
                const isPunchedOut = Boolean(stf.checkOutTime && stf.checkOutTime !== '--' && stf.checkOutTime !== 'null');

                return (
                  <div key={stf.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                          <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{stf.staffName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{stf.role}</div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${
                          isOnDuty
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : isPunchedOut
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isOnDuty ? <Clock className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                        <span>{isOnDuty ? 'On Duty' : isPunchedOut ? 'Shift Completed' : 'Completed'}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Punch In</span>
                        <span className="font-semibold text-slate-800">{stf.checkInTime || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Punch Out</span>
                        <span className="font-semibold text-slate-800">
                          {stf.checkOutTime || (isOnDuty ? 'In Progress' : '—')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Hours</span>
                        <span className="font-bold text-emerald-700">{stf.totalHours || (isOnDuty ? 'In progress' : '8.0 hrs')}</span>
                      </div>
                    </div>

                    {isToday && (
                      <div className="flex justify-end pt-1 border-t border-slate-100">
                        {isOnDuty ? (
                          <button
                            type="button"
                            disabled={loadingStaffId === stf.staffId}
                            onClick={() => handleRecordPunch(stf.staffId)}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 disabled:opacity-60 flex items-center gap-1.5"
                          >
                            {loadingStaffId === stf.staffId && <Loader2 className="w-3 h-3 animate-spin text-rose-600" />}
                            <span>{loadingStaffId === stf.staffId ? 'Saving...' : 'Punch Out'}</span>
                          </button>
                        ) : isPunchedOut ? (
                          <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Shift Completed
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingStaffId === stf.staffId}
                            onClick={() => handleRecordPunch(stf.staffId)}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-1.5"
                          >
                            {loadingStaffId === stf.staffId && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                            <span>{loadingStaffId === stf.staffId ? 'Saving...' : 'Punch In'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Trainer Staff Table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {filteredStaffAttendance.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Award}
                  title={searchTerm ? "No matching coach records" : `No Trainer Shifts for ${formatDateDisplay(selectedDate)}`}
                  description={
                    searchTerm
                      ? `No coach shift records match "${searchTerm}".`
                      : "Trainer shifts and floor check-ins will appear here once logged."
                  }
                  secondaryActionText={!isToday ? "Switch to Today" : (searchTerm ? "Clear Search" : undefined)}
                  onSecondaryAction={!isToday ? () => setSelectedDate(todayIso) : (searchTerm ? () => setSearchTerm('') : undefined)}
                  color="teal"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-5">Trainer / Staff</th>
                      <th className="py-3.5 px-5">Role</th>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5">Punch In</th>
                      <th className="py-3.5 px-5">Punch Out</th>
                      <th className="py-3.5 px-5">Total Hours</th>
                      <th className="py-3.5 px-5">Shift Status</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStaffAttendance.map((stf) => {
                      const isOnDuty = isToday && (stf.status === 'On Premises (Active)' || (stf.checkInTime && !stf.checkOutTime));
                      const isPunchedOut = Boolean(stf.checkOutTime && stf.checkOutTime !== '--' && stf.checkOutTime !== 'null');

                      return (
                        <tr key={stf.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-5 font-bold text-slate-900 text-xs flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>{stf.staffName}</span>
                          </td>
                          <td className="py-3.5 px-5 text-slate-600">
                            {stf.role}
                          </td>
                          <td className="py-3.5 px-5 text-slate-700">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{stf.displayDate || formatDateDisplay(stf.date || stf.rawDate, { withRelative: true }) || 'Today'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-emerald-700 font-semibold">
                            {stf.checkInTime || '—'}
                          </td>
                          <td className="py-3.5 px-5 text-slate-700 font-semibold">
                            {stf.checkOutTime || (isOnDuty ? '--' : '—')}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600">
                            {stf.totalHours || (isOnDuty ? 'In progress' : '8.0 hrs')}
                          </td>
                          <td className="py-3.5 px-5">
                            {isOnDuty ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>On Duty</span>
                              </span>
                            ) : isPunchedOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Shift Completed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <span>Completed</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {isToday ? (
                              isOnDuty ? (
                                <button
                                  type="button"
                                  disabled={loadingStaffId === stf.staffId}
                                  onClick={() => handleRecordPunch(stf.staffId)}
                                  className="px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer active:scale-95 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 disabled:opacity-60 inline-flex items-center gap-1.5"
                                >
                                  {loadingStaffId === stf.staffId && <Loader2 className="w-3 h-3 animate-spin text-rose-600" />}
                                  <span>{loadingStaffId === stf.staffId ? 'Saving...' : 'Punch Out'}</span>
                                </button>
                              ) : isPunchedOut ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Punched Out ({stf.checkOutTime})</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={loadingStaffId === stf.staffId}
                                  onClick={() => handleRecordPunch(stf.staffId)}
                                  className="px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer active:scale-95 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center gap-1.5"
                                >
                                  {loadingStaffId === stf.staffId && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                                  <span>{loadingStaffId === stf.staffId ? 'Saving...' : 'Punch In'}</span>
                                </button>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">Archived</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Check-in Modal for Members */}
      <Modal
        isOpen={isMemberCheckInModalOpen}
        onClose={() => setIsMemberCheckInModalOpen(false)}
        title="Punch In Member"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleManualMemberCheckIn} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Member *</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.planName || 'Member'} • ID: {m.id})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-800 block text-[11px]">Instant Attendance Record</span>
              <p className="text-emerald-700 text-[10px]">
                Immediately logs member's punch-in timestamp and marks attendance as Present.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMemberCheckInModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCheckingInManual}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
            >
              {isCheckingInManual && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
              <span>{isCheckingInManual ? 'Punching In...' : 'Confirm Punch In'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Unified Attendance Muster Roll & Shift Report Modal for Selected Date */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Muster Roll & Shift Report"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Report Header */}
          <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Turnstile & Biometric Muster Roll
              </div>
              <h3 className="text-sm sm:text-lg font-black text-slate-900 mt-0.5">
                PULSE FIT Athletic Club
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Audited check-in & shift logs for <strong>{formatDateDisplay(selectedDate, { includeWeekday: true })}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Muster</span>
            </button>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[9px] uppercase font-bold text-slate-400">Total Day Punches</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{totalDayCheckins}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[9px] uppercase font-bold text-slate-400">Members Present</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">{dayMemberAttendance.length}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[9px] uppercase font-bold text-slate-400">Staff On Duty/Shift</div>
              <div className="text-base font-black text-purple-600 mt-0.5">{staffOnDuty}</div>
            </div>
          </div>

          {/* Member table for Muster */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Plan / Role</th>
                  <th className="py-2 px-3">Punch In</th>
                  <th className="py-2 px-3">Punch Out</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dayMemberAttendance.length === 0 && dayStaffAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">No logs for this date.</td>
                  </tr>
                ) : (
                  <>
                    {dayMemberAttendance.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 px-3 font-semibold">{m.memberName || m.name}</td>
                        <td className="py-2 px-3 text-slate-500">{m.planName}</td>
                        <td className="py-2 px-3 text-emerald-700 font-bold">{m.checkInTime}</td>
                        <td className="py-2 px-3 text-slate-500">{m.checkOutTime || '--'}</td>
                        <td className="py-2 px-3 text-emerald-600 font-bold">{m.status}</td>
                      </tr>
                    ))}
                    {dayStaffAttendance.map((s) => (
                      <tr key={s.id} className="bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-purple-900">{s.staffName} (Staff)</td>
                        <td className="py-2 px-3 text-slate-500">{s.role}</td>
                        <td className="py-2 px-3 text-purple-700 font-bold">{s.checkInTime}</td>
                        <td className="py-2 px-3 text-slate-500">{s.checkOutTime || '--'}</td>
                        <td className="py-2 px-3 text-purple-600 font-bold">{s.status}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            <span>Official Pulse Fit Turnstile Hardware Sync</span>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* PORTALLED FILTER MODAL */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Attendance Filters</h3>
                  <p className="text-[11px] text-slate-400">Refine punches by date & stay status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Date Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayIso)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      selectedDate === todayIso
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(yesterdayIso)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      selectedDate === yesterdayIso
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
                <input
                  type="date"
                  max={todayIso}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Presence Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'All Punches', val: 'ALL' },
                    { label: 'Inside Gym', val: 'INSIDE' },
                    { label: 'Checked Out', val: 'CHECKED_OUT' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setStatusFilter(opt.val)}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        statusFilter === opt.val
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
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
