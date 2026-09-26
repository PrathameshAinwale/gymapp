import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Users,
  Dumbbell,
  Utensils,
  Award,
  ArrowRight,
  ChevronRight,
  Target,
  TrendingUp,
  IndianRupee,
  Coins,
  Star,
  KeyRound,
  CheckCircle2,
  Send,
  Plus,
  Calendar,
  Clock,
  Flame,
  ShieldCheck,
  Activity,
  Sparkles,
  User
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { hasSqlInjection, preventNonNumericKey, sanitizeDecimal, sanitizeText } from '../../utils/validation';

const AvatarWithFallback = ({ src, alt, className = "w-10 h-10 rounded-xl", iconClassName = "w-5 h-5 text-emerald-600", bgClassName = "bg-emerald-50" }) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className={`${className} ${bgClassName} border border-slate-200 flex items-center justify-center shrink-0`}>
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

export const TrainerDashboard = ({ setActiveTab, initialOpenAdvance = false }) => {
  const { currentUser } = useAuth();
  const {
    members,
    commissions,
    ptSessions = [],
    logPTSessionWithOtp,
    trainerReviews = [],
    requestAdvancePay,
    addToast
  } = useGymData();

  // Robust Trainer Matching
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

  // Assigned clients
  const assignedClients = useMemo(() => {
    return members.filter(
      (m) => m.trainerId === currentUser?.id || !m.trainerId
    );
  }, [members, currentUser]);

  // PT Packages assigned to this trainer
  const myPtSessions = useMemo(() => {
    return ptSessions.filter(isMySession);
  }, [ptSessions, currentUser]);

  // Reviews for this trainer
  const myReviews = useMemo(() => {
    return trainerReviews.filter(
      (r) => r.trainerId === currentUser?.id || r.trainerName?.toLowerCase().includes(currentUser?.name?.toLowerCase() || '')
    );
  }, [trainerReviews, currentUser]);

  // Commissions for this trainer
  const myCommissions = useMemo(() => {
    return (commissions || []).filter(
      (c) => c.trainerId === currentUser?.id || c.trainerName?.toLowerCase().includes(currentUser?.name?.toLowerCase() || '')
    );
  }, [commissions, currentUser]);

  // Aggregate Stats
  const totalCompletedSessions = myPtSessions.reduce((acc, pt) => acc + (Number(pt.completedSessions) || 0), 0);
  const totalAllocatedSessions = myPtSessions.reduce((acc, pt) => acc + (Number(pt.totalSessions) || 0), 0);
  const totalRemainingSessions = myPtSessions.reduce((acc, pt) => acc + (Number(pt.remainingSessions) || 0), 0);
  const totalCommissionsEarned = myCommissions.reduce((acc, c) => acc + (Number(c.commissionEarned || c.amount || 0)), 0);
  const avgRating = myReviews.length > 0
    ? (myReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / myReviews.length).toFixed(1)
    : '5.0';

  // OTP Modal State
  const [selectedPtForOtp, setSelectedPtForOtp] = useState(null);
  const [inputOtp, setInputOtp] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [focusArea, setFocusArea] = useState('Strength & Hypertrophy');

  // Advance Pay Request Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(initialOpenAdvance);
  const [advanceForm, setAdvanceForm] = useState({
    amount: 15000,
    reason: '',
    repaymentMonth: 'Next Cycle'
  });

  useEffect(() => {
    if (initialOpenAdvance) {
      setIsAdvanceModalOpen(true);
    }
  }, [initialOpenAdvance]);

  const handleCloseAdvanceModal = () => {
    setIsAdvanceModalOpen(false);
    if (initialOpenAdvance && setActiveTab) {
      setActiveTab('dashboard');
    }
  };

  const handleVerifyOtpSubmit = (e) => {
    e.preventDefault();
    if (!selectedPtForOtp || !inputOtp) return;

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

  const handleAdvanceSubmit = (e) => {
    e.preventDefault();
    if (!advanceForm.amount || !advanceForm.reason) {
      addToast('Please enter an amount and reason for advance pay', 'error');
      return;
    }

    if (hasSqlInjection(advanceForm.reason)) {
      alert('Security Warning: SQL or script injection characters detected in reason. Please remove them.');
      return;
    }

    requestAdvancePay({
      staffId: currentUser?.id || 'trn-2',
      staffName: currentUser?.name || 'Coach Alex Rivers',
      role: currentUser?.roleLabel || 'Senior Fitness Coach',
      amount: Number(advanceForm.amount),
      reason: sanitizeText(advanceForm.reason),
      repaymentMonth: advanceForm.repaymentMonth
    });

    handleCloseAdvanceModal();
    setAdvanceForm({ amount: 15000, reason: '', repaymentMonth: 'Next Cycle' });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-7xl mx-auto">
      {/* 1. Coach Hero Header Card (White Card with Horizontal Quick Buttons Bar) */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <AvatarWithFallback
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl ring-2 ring-teal-500/20"
                iconClassName="w-8 h-8 text-teal-600"
                bgClassName="bg-teal-50"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
                  Verified Head Coach
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{avgRating} ({myReviews.length} reviews)</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-slate-900 truncate">
                {currentUser?.name || 'Coach Alex Rivers'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                {currentUser?.specialty || 'Hypertrophy, Biomechanics & Elite Conditioning'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Hub Navigation - Clean Horizontal Bar */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            <Dumbbell className="w-4 h-4" />
            <span>1-on-1 PT Sessions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workout-builder')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Workout Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diet-builder')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Utensils className="w-4 h-4 text-teal-600" />
            <span>Diet Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advance-request')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Request Advance Pay</span>
          </button>
        </div>
      </div>

      {/* 2. Compact 4-Card KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Active Clients */}
        <div
          onClick={() => setActiveTab('clients')}
          className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition-all shadow-xs hover:shadow-md cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Roster</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-slate-900 block leading-tight">
              {assignedClients.length}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
              <span>Supervised athletes</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Sessions Delivered */}
        <div
          onClick={() => setActiveTab('sessions')}
          className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-all shadow-xs hover:shadow-md cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-slate-900 block leading-tight">
              {totalCompletedSessions}
            </span>
            <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-0.5 mt-0.5">
              <span>{totalAllocatedSessions > 0 ? `${Math.round((totalCompletedSessions / totalAllocatedSessions) * 100)}% quota` : 'Verified sessions'}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Remaining Quota */}
        <div
          onClick={() => setActiveTab('sessions')}
          className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 hover:border-amber-300 transition-all shadow-xs hover:shadow-md cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Remaining</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-slate-900 block leading-tight">
              {totalRemainingSessions}
            </span>
            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 mt-0.5">
              <span>{myPtSessions.length} active packages</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Commissions & Earnings */}
        <div
          onClick={() => setActiveTab('commissions')}
          className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 transition-all shadow-xs hover:shadow-md cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commissions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-slate-900 block leading-tight">
              ₹{totalCommissionsEarned.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-0.5 mt-0.5">
              <span>{myCommissions.length} recorded deals</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Grid (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: PT Sessions & Client Roster (2 Cols Wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active 1-on-1 PT Sessions Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Active 1-on-1 PT Sessions</h2>
                  <p className="text-xs text-slate-500">Track quotas and authenticate completed coaching hours</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {myPtSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Dumbbell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium text-slate-700 text-xs">No PT packages assigned to your roster yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">When superadmin assigns PT packages to you, they will appear here for session logging.</p>
                </div>
              ) : (
                myPtSessions.slice(0, 3).map((pt) => {
                  const completed = Number(pt.completedSessions) || 0;
                  const total = Number(pt.totalSessions) || 12;
                  const remaining = Number(pt.remainingSessions) || 0;
                  const pct = Math.min(100, Math.round((completed / total) * 100));
                  const isFinished = remaining <= 0;

                  return (
                    <div
                      key={pt.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-xs truncate">{pt.memberName}</h4>
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-teal-100/70 text-teal-800">
                            {pt.packageTitle}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1 max-w-md">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Session Progress</span>
                            <span className="font-mono font-bold text-slate-800">
                              {completed} / {total} Delivered ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          disabled={isFinished}
                          onClick={() => {
                            setSelectedPtForOtp(pt);
                            setInputOtp('');
                            setSessionNotes('');
                            setFocusArea('Strength & Hypertrophy');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{isFinished ? 'Completed' : 'Log Session with OTP'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Assigned Athletes Roster Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">My Client Roster</h2>
                  <p className="text-xs text-slate-500">Athletes and gym members assigned under your training program</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('clients')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignedClients.slice(0, 4).map((client) => (
                <div
                  key={client.id}
                  onClick={() => setActiveTab('clients')}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarWithFallback
                      src={client.avatar}
                      alt={client.name}
                      className="w-10 h-10 rounded-xl"
                      iconClassName="w-5 h-5 text-emerald-600"
                      bgClassName="bg-emerald-50"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {client.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <Target className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{client.goal || 'Strength Gain'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900 block">{client.weight || 75} kg</span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {client.attendanceStreak || 12}d streak
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Action Cards, Salary Advance & Reviews */}
        <div className="space-y-6">
          {/* Quick Workouts & Nutrition Cards */}
          <div className="space-y-3">
            <div
              onClick={() => setActiveTab('workout-builder')}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Workout Builder</h3>
                  <p className="text-[11px] text-slate-500">Configure sets, reps & splits for clients</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            <div
              onClick={() => setActiveTab('diet-builder')}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Diet & Macro Builder</h3>
                  <p className="text-[11px] text-slate-500">Customize daily meals & Indian macro charts</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </div>

          {/* Advance Salary Request Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Need an Advance on Salary?</span>
            </div>
            <p className="text-xs text-amber-800/80 leading-relaxed">
              Submit advance pay requests directly to Club Superadmin & Accounts with customized repayment terms.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('advance-request')}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Request Advance Pay</span>
            </button>
          </div>

          {/* Athlete Reviews & Testimonials */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900">Athlete Reviews</h3>
              </div>
              <span className="text-xs font-bold text-slate-500">{myReviews.length} Ratings</span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {myReviews.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No reviews submitted yet.</p>
              ) : (
                myReviews.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{rev.memberName}</span>
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 italic">"{rev.comment}"</p>
                    <span className="text-[9px] text-slate-400 block font-mono">{rev.date}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OTP CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(selectedPtForOtp)}
        onClose={() => setSelectedPtForOtp(null)}
        title={`Authenticate & Log Session: ${selectedPtForOtp?.memberName || ''}`}
        maxWidth="max-w-md"
      >
        {selectedPtForOtp && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 text-xs">
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Workout Focus / Muscle Group
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Coach Workout Notes & Recommendations
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Completed heavy barbell work, monitored eccentric tempo."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            {/* OTP Input - Final Verification Step at the Bottom */}
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
                placeholder="Enter 4-digit OTP"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center tracking-widest text-lg font-mono font-black py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

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

      {/* ADVANCE PAY MODAL */}
      <Modal
        isOpen={isAdvanceModalOpen}
        onClose={handleCloseAdvanceModal}
        title="Submit Advance Salary Request"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdvanceSubmit} className="space-y-3.5 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <span className="font-bold text-amber-900 text-xs">Staff Advance Pay Policy</span>
            <p className="text-[11px] text-amber-800">
              Requests are reviewed by Superadmin & Accounts. Approved advances are deducted from your upcoming payroll cycles.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Requested Amount (₹)</label>
            <input
              type="number"
              min={1000}
              max={100000}
              step={1000}
              required
              onKeyDown={(e) => preventNonNumericKey(e, false)}
              value={advanceForm.amount}
              onChange={(e) => setAdvanceForm({ ...advanceForm, amount: sanitizeDecimal(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Repayment Schedule</label>
            <select
              value={advanceForm.repaymentMonth}
              onChange={(e) => setAdvanceForm({ ...advanceForm, repaymentMonth: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="Next Cycle">Deduct from next payroll cycle (100%)</option>
              <option value="Split 2 Cycles">Split equally over next 2 payroll cycles (50% / 50%)</option>
              <option value="Split 3 Cycles">Split equally over next 3 payroll cycles (33% each)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Reason for Advance</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Medical emergency or personal urgent expense"
              value={advanceForm.reason}
              onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseAdvanceModal}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
