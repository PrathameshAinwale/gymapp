import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const AttendanceTracker = () => {
  const {
    attendance,
    checkInMemberByQR,
    staffAttendanceLogs,
    recordStaffCheckIn,
    members,
    trainers,
    addToast
  } = useGymData();

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'staff'
  const [searchTerm, setSearchTerm] = useState('');
  const [isMemberCheckInModalOpen, setIsMemberCheckInModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [loadingStaffId, setLoadingStaffId] = useState(null);
  const [isCheckingInManual, setIsCheckingInManual] = useState(false);

  // Live Metrics
  const staffOnDuty = staffAttendanceLogs.filter(
    (s) => s.status === 'On Premises (Active)' || (s.checkInTime && !s.checkOutTime)
  ).length;

  const filteredMemberAttendance = attendance.filter((a) =>
    (a.memberName || a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.planName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaffAttendance = staffAttendanceLogs.filter((s) =>
    (s.staffName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Attendance Tracker
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Real-time check-in logs for gym members and shift punch in/out tracking for trainers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Muster Report</span>
            <span className="inline sm:hidden">Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Today's Total Check-ins</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{attendance.length + staffAttendanceLogs.length}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">Turnstile & staff punches</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Members Present</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{attendance.length} Members</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium block truncate">Marked present today</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Staff on Duty</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{staffOnDuty} Coaches</div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">Active duty shifts</span>
        </div>
      </div>

      {/* Tabs Switcher & Sleek Compact Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Members ({attendance.length})
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
            Trainer Shifts ({staffAttendanceLogs.length})
          </button>
        </div>

        {/* Compact Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={activeTab === 'members' ? "Search member, plan..." : "Search coach, role..."}
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
      </div>

      {/* Tab Content */}
      {activeTab === 'members' ? (
        <div className="space-y-2.5">
          {/* Mobile View: Member Cards */}
          <div className="block sm:hidden space-y-2">
            {filteredMemberAttendance.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                No member check-ins recorded.
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
                      <span>Present</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Punch In Time</span>
                      <span className="font-semibold text-emerald-700">{log.checkInTime || log.punchInTime || '07:15 AM'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Date</span>
                      <span className="font-medium text-slate-600">{log.date || 'Today'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Member Table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-5">Member Name</th>
                    <th className="py-3.5 px-5">Plan</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Punch In Time</th>
                    <th className="py-3.5 px-5">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMemberAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-medium">
                        No member check-ins recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredMemberAttendance.map((log, idx) => (
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
                            <span>{log.date || 'Today'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-emerald-700 font-bold">
                          {log.checkInTime || log.punchInTime || '07:15 AM'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Present</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Mobile View: Trainer Staff Cards */}
          <div className="block sm:hidden space-y-2">
            {filteredStaffAttendance.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                No trainer shift logs found.
              </div>
            ) : (
              filteredStaffAttendance.map((stf) => {
                const isOnDuty = stf.status === 'On Premises (Active)' || (stf.checkInTime && !stf.checkOutTime);
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
                        <span>{isOnDuty ? 'On Duty' : isPunchedOut ? 'Shift Completed' : 'Scheduled'}</span>
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
                        <span className="font-bold text-emerald-700">{stf.totalHours || (isOnDuty ? 'In progress' : '0h')}</span>
                      </div>
                    </div>

                    {/* Action Footer: If Punched Out, NO Punch Out button is shown */}
                    {isOnDuty ? (
                      <div className="flex justify-end pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={loadingStaffId === stf.staffId}
                          onClick={() => handleRecordPunch(stf.staffId)}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {loadingStaffId === stf.staffId && <Loader2 className="w-3 h-3 animate-spin text-rose-600" />}
                          <span>{loadingStaffId === stf.staffId ? 'Saving...' : 'Punch Out'}</span>
                        </button>
                      </div>
                    ) : isPunchedOut ? (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-400">Punched out at {stf.checkOutTime}</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={loadingStaffId === stf.staffId}
                          onClick={() => handleRecordPunch(stf.staffId)}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {loadingStaffId === stf.staffId && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                          <span>{loadingStaffId === stf.staffId ? 'Saving...' : 'Punch In'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Trainer Staff Table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                    <th className="py-3.5 px-5 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStaffAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                        No trainer shift logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredStaffAttendance.map((stf) => {
                      const isOnDuty = stf.status === 'On Premises (Active)' || (stf.checkInTime && !stf.checkOutTime);
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
                              <span>{stf.date || 'Today'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-emerald-700 font-semibold">
                            {stf.checkInTime || '—'}
                          </td>
                          <td className="py-3.5 px-5 text-slate-700 font-semibold">
                            {stf.checkOutTime || (isOnDuty ? <span className="text-amber-600 font-medium">In Progress</span> : '—')}
                          </td>
                          <td className="py-3.5 px-5 font-bold text-slate-900">
                            {isPunchedOut ? (
                              <span className="text-emerald-700 font-bold">{stf.totalHours}</span>
                            ) : isOnDuty ? (
                              <span className="text-amber-600 font-medium">In progress</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isOnDuty
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : isPunchedOut
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {isOnDuty ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>{isOnDuty ? 'On Duty' : isPunchedOut ? 'Shift Completed' : 'Scheduled'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {isOnDuty ? (
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
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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

      {/* Unified Attendance Muster Roll & Shift Report Modal */}
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
                Audited check-in & shift logs for members and trainers.
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
              <div className="text-[9px] uppercase font-bold text-slate-400">Total Punches</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{attendance.length + staffAttendanceLogs.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[9px] uppercase font-bold text-slate-400">Members Present</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">{attendance.length}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[9px] uppercase font-bold text-slate-400">Staff On Duty</div>
              <div className="text-base font-black text-purple-600 mt-0.5">{staffOnDuty}</div>
            </div>
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
    </div>
  );
};
