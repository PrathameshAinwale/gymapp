import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Dumbbell,
  Users,
  CheckCircle2,
  Clock,
  KeyRound,
  Calendar,
  Award,
  Sparkles,
  Search,
  Plus,
  Target,
  ArrowRight,
  ShieldCheck,
  Flame,
  FileText,
  ChevronRight,
  AlertCircle,
  User
} from 'lucide-react';
import { Modal } from '../common/Modal';

const UserAvatar = ({ src, alt, className = "w-11 h-11 rounded-xl", iconClassName = "w-5 h-5 text-teal-600" }) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className={`${className} bg-teal-50 border border-slate-200 flex items-center justify-center shrink-0`}>
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

export const TrainerSessionsView = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const {
    ptSessions = [],
    members = [],
    logPTSessionWithOtp,
    addToast
  } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | completed
  const [selectedPtForOtp, setSelectedPtForOtp] = useState(null);
  const [viewHistoryPkg, setViewHistoryPkg] = useState(null);

  // OTP Form State
  const [inputOtp, setInputOtp] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [focusArea, setFocusArea] = useState('Strength & Hypertrophy');

  // Filter sessions assigned to this trainer (or match by name/id)
  const isMySession = (pt) => {
    if (!pt) return false;
    const cId = String(currentUser?.id || '').toLowerCase();
    const cUserId = String(currentUser?.userId || '').toLowerCase();
    const cName = String(currentUser?.name || '').toLowerCase();
    const ptTrnId = String(pt.trainerId || '').toLowerCase();
    const ptTrnName = String(pt.trainerName || '').toLowerCase();

    return (
      ptTrnId === cId ||
      ptTrnId.replace(/[^0-9]/g, '') === cUserId ||
      (cName && ptTrnName && (ptTrnName.includes(cName) || cName.includes(ptTrnName))) ||
      !pt.trainerId
    );
  };

  const myPtSessions = useMemo(() => {
    return ptSessions.filter(isMySession);
  }, [ptSessions, currentUser]);

  const filteredSessions = useMemo(() => {
    return myPtSessions.filter((pt) => {
      const nameMatch =
        (pt.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pt.packageTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

      const isCompleted = pt.remainingSessions <= 0;
      if (statusFilter === 'active') return nameMatch && !isCompleted;
      if (statusFilter === 'completed') return nameMatch && isCompleted;
      return nameMatch;
    });
  }, [myPtSessions, searchTerm, statusFilter]);

  // Aggregated KPI Stats
  const totalCompleted = myPtSessions.reduce((acc, pt) => acc + (Number(pt.completedSessions) || 0), 0);
  const totalAllocated = myPtSessions.reduce((acc, pt) => acc + (Number(pt.totalSessions) || 0), 0);
  const totalRemaining = myPtSessions.reduce((acc, pt) => acc + (Number(pt.remainingSessions) || 0), 0);
  const activeClientsCount = myPtSessions.filter((pt) => pt.remainingSessions > 0).length;

  const handleVerifyOtpSubmit = (e) => {
    e.preventDefault();
    if (!selectedPtForOtp) return;

    const fullNotes = `[${focusArea}] ${sessionNotes || '1-on-1 coaching workout completed'}`;

    const res = logPTSessionWithOtp({
      ptSessionId: selectedPtForOtp.id,
      inputOtp: inputOtp.trim(),
      trainerNotes: fullNotes
    });

    if (res.success) {
      setSelectedPtForOtp(null);
      setInputOtp('');
      setSessionNotes('');
      setFocusArea('Strength & Hypertrophy');
    } else {
      addToast(res.message || 'OTP verification failed', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                1-on-1 Personal Training (PT) Sessions
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Log completed coaching sessions with client OTP verification, track quota progress, and view athlete workout logs.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Client Roster</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name or package title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({myPtSessions.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Progress ({myPtSessions.filter((p) => p.remainingSessions > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({myPtSessions.filter((p) => p.remainingSessions <= 0).length})
          </button>
        </div>
      </div>

      {/* PT Packages Grid */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3 border border-teal-200">
            <Dumbbell className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No PT Sessions Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No sessions matching "${searchTerm}". Try another search keyword.`
              : 'You currently have no 1-on-1 personal training packages allocated. Ask the Superadmin to assign clients to your roster.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredSessions.map((pt) => {
            const completed = Number(pt.completedSessions) || 0;
            const total = Number(pt.totalSessions) || 12;
            const remaining = Number(pt.remainingSessions) || 0;
            const pct = Math.min(100, Math.round((completed / total) * 100));
            const isFinished = remaining <= 0;
            const memberObj = members.find((m) => m.id === pt.memberId || m.name === pt.memberName);

            return (
              <div
                key={pt.id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${
                  isFinished
                    ? 'border-slate-200 bg-slate-50/50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Member Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        src={pt.memberAvatar || memberObj?.avatar}
                        alt={pt.memberName}
                        className="w-11 h-11 rounded-xl"
                        iconClassName="w-5 h-5 text-teal-600"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{pt.memberName}</h3>
                        <p className="text-[11px] text-slate-500 truncate">{pt.packageTitle}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        isFinished
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {isFinished ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  {/* Goal & Details Pill */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <Target className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{memberObj?.goal || 'General Fitness & Muscle Building'}</span>
                  </div>

                  {/* Progress Bar & Quota */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Session Quota</span>
                      <span className="font-mono font-bold text-slate-900">
                        {completed} / {total} Delivered ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFinished ? 'bg-teal-500' : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>{remaining} sessions remaining</span>
                      {pt.otp && !isFinished && (
                        <span className="text-[10px] font-mono text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                          Active Pass: {pt.otp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isFinished}
                    onClick={() => {
                      setSelectedPtForOtp(pt);
                      setInputOtp('');
                      setSessionNotes('');
                      setFocusArea('Strength & Hypertrophy');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isFinished
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs shadow-teal-600/20 active:scale-95'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Log Session</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewHistoryPkg(pt)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                    title="View Session History Logs"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Logs ({pt.logs?.length || 0})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOG SESSION MODAL (WITH CLIENT OTP & WORKOUT NOTES) */}
      <Modal
        isOpen={Boolean(selectedPtForOtp)}
        onClose={() => setSelectedPtForOtp(null)}
        title={`Authenticate & Log Session: ${selectedPtForOtp?.memberName || ''}`}
        maxWidth="max-w-md"
      >
        {selectedPtForOtp && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 text-xs">
            {/* Package Summary Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-xs">{selectedPtForOtp.memberName}</div>
                <div className="text-[11px] text-slate-500">{selectedPtForOtp.packageTitle}</div>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="font-bold text-teal-700">{selectedPtForOtp.completedSessions + 1}</span>
                <span className="text-slate-400">/{selectedPtForOtp.totalSessions}</span>
                <div className="text-[10px] text-slate-500">Session #{selectedPtForOtp.completedSessions + 1}</div>
              </div>
            </div>

            {/* Workout Focus Area */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Workout Focus Area
              </label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="Strength & Hypertrophy">Strength & Hypertrophy</option>
                <option value="Back & Deadlift Power">Back Width & Deadlift Power</option>
                <option value="Leg Day & Squat Mechanics">Leg Day & Squat Biomechanics</option>
                <option value="HIIT & Cardio VO2 Max">HIIT Circuit & Conditioning</option>
                <option value="Mobility & Spine Rehab">Mobility & Core Rehab</option>
                <option value="Olympic Weightlifting">Olympic Weightlifting</option>
              </select>
            </div>

            {/* Session Notes */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Coach Workout Notes & Recommendations
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Worked on progressive overload, form check passed."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            {/* OTP Input - Final Step at the Bottom */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-800">
                  Client Verification OTP (Final Step)
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  Passcode: <strong className="text-teal-700">{selectedPtForOtp.otp}</strong>
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="Enter 4-digit client OTP"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center tracking-widest text-lg font-mono font-black py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPtForOtp(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Record Session</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* SESSION HISTORY LOGS MODAL */}
      <Modal
        isOpen={Boolean(viewHistoryPkg)}
        onClose={() => setViewHistoryPkg(null)}
        title={`Session History: ${viewHistoryPkg?.memberName || ''}`}
        maxWidth="max-w-lg"
      >
        {viewHistoryPkg && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-teal-800 uppercase font-bold block">Package Title</span>
                <span className="font-bold text-teal-950 text-sm">{viewHistoryPkg.packageTitle}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-teal-800 uppercase font-bold block">Delivered Quota</span>
                <span className="font-mono font-bold text-teal-950">
                  {viewHistoryPkg.completedSessions} / {viewHistoryPkg.totalSessions} Completed
                </span>
              </div>
            </div>

            {/* Logs List */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {!viewHistoryPkg.logs || viewHistoryPkg.logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Dumbbell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium text-slate-600">No sessions logged yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    When you conduct and verify sessions with {viewHistoryPkg.memberName}, timestamped logs will appear here.
                  </p>
                </div>
              ) : (
                viewHistoryPkg.logs.map((log, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Session #{log.sessionNo}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {log.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">"{log.trainerNotes}"</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Authenticated via Member Pass Verification</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewHistoryPkg(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
