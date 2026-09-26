import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Filter,
  X,
  Plus,
  RotateCw,
  Trash2,
  CreditCard,
  IndianRupee,
  Percent,
  Receipt,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import {
  hasSqlInjection,
  sanitizeDigits,
  preventNonNumericKey,
  sanitizeDecimal
} from '../../utils/validation';

const fallbackPtPresets = [
  { id: 'preset-1', name: 'Kickstarter PT (6 Sessions)', sessions: 6, price: 7499, duration_weeks: 3 },
  { id: 'preset-2', name: 'Transformation Intensive (12 Sessions)', sessions: 12, price: 13999, duration_weeks: 6 },
  { id: 'preset-3', name: 'Pro Athlete Mastery (24 Sessions)', sessions: 24, price: 24999, duration_weeks: 12 },
];

const calculateEndDate = (startDateStr, weeks) => {
  if (!startDateStr || !weeks) return '';
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + Number(weeks) * 7);
  return d.toISOString().split('T')[0];
};

export const PTSessionsManager = () => {
  const {
    ptSessions = [],
    trainers = [],
    members = [],
    ptPlans = [],
    fetchPtSessions,
    fetchTrainers,
    fetchMembers,
    fetchPtPlans,
    allocatePTSessions,
    deletePTSession,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchPtSessions?.();
    fetchTrainers?.();
    fetchMembers?.();
    fetchPtPlans?.();
  }, [fetchPtSessions, fetchTrainers, fetchMembers, fetchPtPlans]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [trainerFilter, setTrainerFilter] = useState('ALL');
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

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedSessionPkg, setSelectedSessionPkg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialStartDate = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    memberId: '',
    trainerId: '',
    selectedPtPlanId: '',
    packageTitle: 'Transformation Intensive (12 Sessions)',
    totalSessions: 12,
    packageAmount: '13999',
    paidAmount: '13999',
    paymentMethod: 'UPI',
    splitCashAmount: '',
    splitOnlineAmount: '',
    splitOnlineProvider: 'GPay',
    commissionType: 'percent', // 'percent' | 'fixed'
    commissionPct: 20,
    fixedCommission: '2800',
    startDate: initialStartDate,
    endDate: calculateEndDate(initialStartDate, 6),
    notes: ''
  });

  // Sync default member & trainer when lists load
  useEffect(() => {
    if (members.length > 0 && !form.memberId) {
      setForm((prev) => ({ ...prev, memberId: members[0].id }));
    }
  }, [members, form.memberId]);

  useEffect(() => {
    if (trainers.length > 0 && !form.trainerId) {
      setForm((prev) => ({ ...prev, trainerId: trainers[0].id }));
    }
  }, [trainers, form.trainerId]);

  // Sync default plan preset when plans load
  useEffect(() => {
    const available = ptPlans.length > 0 ? ptPlans : fallbackPtPresets;
    if (available.length > 0 && !form.selectedPtPlanId) {
      const popular = available.find((p) => p.popular) || available[0];
      const weeks = popular.duration_weeks || Math.ceil((popular.sessions || 12) / 2);
      const price = Number(popular.price) || 13999;
      setForm((prev) => ({
        ...prev,
        selectedPtPlanId: popular.id,
        packageTitle: popular.name,
        totalSessions: Number(popular.sessions) || 12,
        packageAmount: String(price),
        paidAmount: String(price),
        endDate: calculateEndDate(prev.startDate || initialStartDate, weeks),
        fixedCommission: String(Math.round((price * 20) / 100))
      }));
    }
  }, [ptPlans, form.selectedPtPlanId, initialStartDate]);

  const handlePackageSelect = (planId) => {
    if (planId === 'custom') {
      setForm((prev) => ({
        ...prev,
        selectedPtPlanId: 'custom',
        packageTitle: 'Custom 1-on-1 PT Package',
        totalSessions: 12,
        packageAmount: '6000',
        paidAmount: '6000',
        fixedCommission: '1200'
      }));
      return;
    }

    const availablePlans = ptPlans.length > 0 ? ptPlans : fallbackPtPresets;
    const selected = availablePlans.find((p) => String(p.id) === String(planId));
    if (selected) {
      const price = Number(selected.price) || 0;
      const sessions = Number(selected.sessions) || 12;
      const weeks = selected.duration_weeks || Math.ceil(sessions / 2);
      const calculatedEnd = calculateEndDate(form.startDate, weeks);
      const commPct = Number(form.commissionPct) || 20;

      setForm((prev) => ({
        ...prev,
        selectedPtPlanId: selected.id,
        packageTitle: selected.name,
        totalSessions: sessions,
        packageAmount: String(price),
        paidAmount: String(price),
        endDate: calculatedEnd,
        fixedCommission: String(Math.round((price * commPct) / 100)),
        splitCashAmount: '',
        splitOnlineAmount: ''
      }));
    }
  };

  const handlePackageAmountChange = (newAmount) => {
    const cleanAmt = sanitizeDecimal(newAmount);
    const num = Number(cleanAmt) || 0;
    const commPct = Number(form.commissionPct) || 20;
    setForm((prev) => ({
      ...prev,
      packageAmount: cleanAmt,
      paidAmount: cleanAmt,
      fixedCommission: String(Math.round((num * commPct) / 100)),
      splitCashAmount: '',
      splitOnlineAmount: ''
    }));
  };

  const handlePaidAmountChange = (newPaid) => {
    const cleanPaid = sanitizeDecimal(newPaid);
    setForm((prev) => ({
      ...prev,
      paidAmount: cleanPaid,
      splitCashAmount: '',
      splitOnlineAmount: ''
    }));
  };

  const handleCommissionPctChange = (newPct) => {
    const pct = Math.max(0, Math.min(100, Number(newPct) || 0));
    const pkgAmt = Number(form.packageAmount) || 0;
    setForm((prev) => ({
      ...prev,
      commissionPct: pct,
      fixedCommission: String(Math.round((pkgAmt * pct) / 100))
    }));
  };

  const handleSplitCashChange = (val) => {
    const clean = sanitizeDecimal(val);
    const total = Number(form.paidAmount) || 0;
    const cash = Math.max(0, Number(clean) || 0);
    const online = Math.max(0, total - cash);
    setForm((prev) => ({
      ...prev,
      splitCashAmount: clean,
      splitOnlineAmount: String(online)
    }));
  };

  const handleSplitOnlineChange = (val) => {
    const clean = sanitizeDecimal(val);
    const total = Number(form.paidAmount) || 0;
    const online = Math.max(0, Number(clean) || 0);
    const cash = Math.max(0, total - online);
    setForm((prev) => ({
      ...prev,
      splitOnlineAmount: clean,
      splitCashAmount: String(cash)
    }));
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(form.packageTitle) || hasSqlInjection(form.notes)) {
      addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }

    const mem = members.find((m) => String(m.id) === String(form.memberId)) || members[0];
    const trn = trainers.find((t) => String(t.id) === String(form.trainerId)) || trainers[0];

    if (!mem) {
      addToast('Please select a member', 'error');
      return;
    }
    if (!trn) {
      addToast('Please select a trainer', 'error');
      return;
    }

    const pkgAmt = Number(form.packageAmount) || 0;
    const paidAmt = form.paidAmount !== '' && Number(form.paidAmount) >= 0 ? Number(form.paidAmount) : pkgAmt;
    const sessions = Number(form.totalSessions) || 12;

    const commissionAmt = form.commissionType === 'percent'
      ? Math.round((pkgAmt * (Number(form.commissionPct) || 0)) / 100)
      : Number(form.fixedCommission) || 0;

    const commissionPctVal = form.commissionType === 'percent'
      ? Number(form.commissionPct)
      : (pkgAmt > 0 ? (commissionAmt / pkgAmt) * 100 : 0);

    const paymentMethodLabel = form.paymentMethod === 'Split'
      ? `Split: ${form.splitOnlineProvider || 'GPay'}`
      : form.paymentMethod;

    setIsSubmitting(true);
    try {
      await allocatePTSessions({
        memberId: mem.id,
        memberName: mem.name,
        memberEmail: mem.email,
        trainerId: trn.id,
        trainerName: trn.name,
        totalSessions: sessions,
        packageTitle: form.packageTitle || `${sessions} 1-on-1 PT Sessions`,
        packageAmount: pkgAmt,
        paidAmount: paidAmt,
        paymentMethod: paymentMethodLabel,
        commissionPct: commissionPctVal,
        commissionAmount: commissionAmt,
        startDate: form.startDate,
        endDate: form.endDate || null,
        notes: form.notes,
        splitDetails: form.paymentMethod === 'Split' ? {
          cashAmount: form.splitCashAmount,
          onlineAmount: form.splitOnlineAmount,
          onlineMethod: form.splitOnlineProvider
        } : null
      });

      setIsAllocateModalOpen(false);
      addToast(`PT Package allocated for ${mem.name} with Coach ${trn.name}! Invoice, inflow, and trainer commission recorded.`, 'success');
    } catch (err) {
      console.error('Allocate PT package error:', err);
      addToast(err?.message || 'Failed to allocate PT package', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deduplicate any duplicate active packages for the same member
  const uniqueSessions = [];
  const seenMemberActive = new Set();
  for (const pt of ptSessions) {
    const key = `${pt.memberId || pt.memberName}-${pt.status}`;
    if (pt.status === 'Active' && (Number(pt.completedSessions) || 0) === 0) {
      if (!seenMemberActive.has(key)) {
        seenMemberActive.add(key);
        uniqueSessions.push(pt);
      }
    } else {
      uniqueSessions.push(pt);
    }
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (trainerFilter !== 'ALL') count++;
    return count;
  }, [statusFilter, trainerFilter]);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setTrainerFilter('ALL');
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    return uniqueSessions
      .filter((pt) =>
        (pt.memberName || '').toLowerCase().includes(term) ||
        (pt.trainerName || '').toLowerCase().includes(term) ||
        (pt.packageTitle || '').toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [searchTerm, uniqueSessions]);

  const filteredSessions = useMemo(() => {
    return uniqueSessions.filter((pt) => {
      const term = (searchTerm || '').trim().toLowerCase();
      const matchesSearch =
        !term ||
        (pt.memberName || '').toLowerCase().includes(term) ||
        (pt.trainerName || '').toLowerCase().includes(term) ||
        (pt.packageTitle || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Status
      if (statusFilter !== 'ALL' && (pt.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Trainer
      if (trainerFilter !== 'ALL') {
        const matchesTrnId = String(pt.trainerId || '') === String(trainerFilter);
        const matchesTrnName = (pt.trainerName || '').toLowerCase() === String(trainerFilter).toLowerCase();
        if (!matchesTrnId && !matchesTrnName) return false;
      }

      return true;
    });
  }, [uniqueSessions, searchTerm, statusFilter, trainerFilter]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Personal Training (PT) Sessions Tracker
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track individual PT session quotas, completion statuses, trainer assignments, and member OTP verifications.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsAllocateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Allocate PT Package</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          {/* Search Input with Autocomplete */}
          <div className="relative flex-1" ref={searchContainerRef}>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              placeholder="Search member, coach, or PT package..."
              className="w-full pl-8 sm:pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 font-medium"
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

            {/* Autocomplete Dropdown */}
            {isSearchDropdownOpen && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-100">
                <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Matching PT Packages ({searchSuggestions.length})
                </div>
                {searchSuggestions.map((pt, idx) => (
                  <div
                    key={pt.id || idx}
                    onClick={() => {
                      setSearchTerm(pt.memberName || pt.packageTitle);
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-2.5 hover:bg-teal-50/70 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center border border-teal-200">
                        {(pt.memberName || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-teal-700">
                          {pt.memberName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Coach: {pt.trainerName || 'Assigned Coach'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                        {pt.packageTitle || `${pt.totalSessions || 12} Sessions`}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                        {pt.status || 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Dedicated Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeFiltersCount > 0
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${activeFiltersCount > 0 ? 'text-white' : 'text-teal-600'}`} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-teal-700 rounded-full text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-medium">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-teal-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {trainerFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-medium">
                Coach: {trainers.find(t => String(t.id) === String(trainerFilter))?.name || trainerFilter}
                <button type="button" onClick={() => setTrainerFilter('ALL')} className="hover:text-purple-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer ml-auto"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Package Count & Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 font-medium">
        <span>
          Showing <strong className="text-teal-700">{filteredSessions.length}</strong> of {uniqueSessions.length} PT Packages
        </span>
        {searchTerm && (
          <span className="text-[11px] text-slate-400">
            Filtered by "{searchTerm}"
          </span>
        )}
      </div>

      {/* PT Packages Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {filteredSessions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Dumbbell}
              title={searchTerm || activeFiltersCount > 0 ? "No matching PT sessions found" : "No PT Sessions Allocated Yet"}
              description={
                searchTerm || activeFiltersCount > 0
                  ? `No PT packages match your search or selected filters. Try resetting filters or allocate a new PT package.`
                  : "Allocate 1-on-1 personal training session packages to gym members with dedicated certified coaches."
              }
              actionText="Allocate PT Package"
              onAction={() => setIsAllocateModalOpen(true)}
              secondaryActionText={searchTerm || activeFiltersCount > 0 ? "Clear All Filters" : undefined}
              onSecondaryAction={handleResetFilters}
              color="teal"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Dedicated Coach</th>
                  <th className="py-3 px-4">PT Package Title</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">Remaining</th>
                  <th className="py-3 px-4 text-center">Total Sessions</th>
                  <th className="py-3 px-4 text-right">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSessions.map((pt) => {
                  const pct = Math.min(100, Math.round((pt.completedSessions / pt.totalSessions) * 100));

                  return (
                    <tr key={pt.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {pt.memberName}
                        <div className="text-[10px] text-slate-400 font-mono">{pt.memberEmail}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-teal-700 font-semibold">
                          <Award className="w-3.5 h-3.5" />
                          <span>{pt.trainerName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {pt.packageTitle}
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div className="bg-teal-500 h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        {pt.completedSessions}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                        {pt.remainingSessions}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {pt.totalSessions}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSessionPkg(pt)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                          >
                            View Logs ({(pt.logs || []).length})
                          </button>
                          {deletePTSession && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Remove PT package for ${pt.memberName}?`)) {
                                  deletePTSession(pt.numericId || pt.id);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                              title="Delete Package"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* SESSION LOGS POPUP */}
      <Modal
        isOpen={Boolean(selectedSessionPkg)}
        onClose={() => setSelectedSessionPkg(null)}
        title={`PT Verification Logs: ${selectedSessionPkg?.memberName || ''}`}
        maxWidth="max-w-md"
      >
        {selectedSessionPkg && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-teal-800 uppercase font-bold block">Assigned Coach</span>
                <span className="font-bold text-teal-950 text-sm">{selectedSessionPkg.trainerName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-teal-800 uppercase font-bold block">Progress</span>
                <span className="font-mono font-bold text-teal-950">{selectedSessionPkg.completedSessions} / {selectedSessionPkg.totalSessions} Completed</span>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(!selectedSessionPkg.logs || selectedSessionPkg.logs.length === 0) ? (
                <div className="p-4 text-center text-slate-400">
                  No sessions logged yet. The trainer logs sessions from their dashboard using the member's OTP.
                </div>
              ) : (
                selectedSessionPkg.logs.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Session #{log.sessionNo}</span>
                      <span className="text-[10px] font-mono text-slate-400">{log.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic">"{log.trainerNotes}"</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified via Member OTP confirmation</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ALLOCATE MODAL */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => !isSubmitting && setIsAllocateModalOpen(false)}
        title="Allocate 1-on-1 PT Package & Process Billing"
        maxWidth="max-w-2xl"
      >
        {(() => {
          const selectedMember = members.find((m) => String(m.id) === String(form.memberId));
          const selectedTrainer = trainers.find((t) => String(t.id) === String(form.trainerId));
          const pkgAmountNum = Number(form.packageAmount) || 0;
          const paidAmountNum = Number(form.paidAmount) || 0;
          const duesAmount = Math.max(0, pkgAmountNum - paidAmountNum);
          const calculatedCommission = form.commissionType === 'percent'
            ? Math.round((pkgAmountNum * (Number(form.commissionPct) || 0)) / 100)
            : (Number(form.fixedCommission) || 0);

          return (
            <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
              {/* Member & Coach Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.memberId}
                    onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer shadow-xs"
                    required
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.phone ? `(${m.phone})` : ''} — {m.planName || 'Active Member'}
                      </option>
                    ))}
                  </select>
                  {selectedMember && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">Current Plan:</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {selectedMember.planName || 'Standard Member'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign Coach / Trainer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.trainerId}
                    onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer shadow-xs"
                    required
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialty || 'Personal Trainer'})
                      </option>
                    ))}
                  </select>
                  {selectedTrainer && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-teal-700">
                      <Award className="w-3 h-3 text-teal-600 shrink-0" />
                      <span className="font-semibold">Specialty:</span>
                      <span>{selectedTrainer.specialty || 'Strength & Conditioning'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Package Presets & Selection */}
              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-teal-900">
                    Choose PT Package Preset <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-teal-700 font-medium">Auto-populates sessions, fee & dates</span>
                </div>
                <select
                  value={form.selectedPtPlanId}
                  onChange={(e) => handlePackageSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-500 cursor-pointer shadow-xs"
                >
                  {(ptPlans.length > 0 ? ptPlans : fallbackPtPresets).map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — {pkg.sessions} Sessions (₹{Number(pkg.price).toLocaleString('en-IN')})
                    </option>
                  ))}
                  <option value="custom">⚙️ Custom / Ad-hoc PT Package</option>
                </select>
              </div>

              {/* Package Details Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Package Title</label>
                  <input
                    type="text"
                    value={form.packageTitle}
                    onChange={(e) => setForm({ ...form, packageTitle: e.target.value })}
                    placeholder="e.g. 12 1-on-1 PT Sessions"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Total Sessions</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      inputMode="numeric"
                      value={form.totalSessions}
                      onKeyDown={(e) => preventNonNumericKey(e, false)}
                      onChange={(e) => setForm({ ...form, totalSessions: sanitizeDigits(e.target.value, 3) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-teal-500 pr-16"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                      Sessions
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Package Price / Fee (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={form.packageAmount}
                      onChange={(e) => handlePackageAmountChange(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Validity / End Date</label>
                  <input
                    type="date"
                    value={form.endDate || ''}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Trainer Commission Card */}
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Percent className="w-3.5 h-3.5 text-teal-600" />
                    <span>Trainer Commission (Incentive Payout)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100/80 text-teal-800 border border-teal-300">
                    Coach: {selectedTrainer?.name || 'Assigned Coach'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-teal-300 p-0.5 bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, commissionType: 'percent' }))}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                          form.commissionType === 'percent'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        % Rate
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, commissionType: 'fixed' }))}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                          form.commissionType === 'fixed'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ₹ Flat
                      </button>
                    </div>

                    {form.commissionType === 'percent' ? (
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={form.commissionPct}
                          onChange={(e) => handleCommissionPctChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-center pr-6 focus:outline-none focus:border-teal-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                      </div>
                    ) : (
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={(e) => preventNonNumericKey(e, true)}
                          value={form.fixedCommission}
                          onChange={(e) => setForm({ ...form, fixedCommission: sanitizeDecimal(e.target.value) })}
                          className="w-full pl-6 pr-2 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200 text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Coach Incentive</span>
                    <span className="text-sm font-black text-teal-700">₹{calculatedCommission.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <p className="text-[10px] text-teal-700">
                  ⚡ Recorded in Commissions table and automatically credited to the coach's pending monthly payroll.
                </p>
              </div>

              {/* Payment & Cash Inflow Record */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                    <span>Billing & Cash Inflow Record</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    Official Invoice Generated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Amount Received (₹) <span className="text-rose-500">*</span>
                      </label>
                      {duesAmount > 0 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                          Due: ₹{duesAmount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        value={form.paidAmount}
                        onChange={(e) => handlePaidAmountChange(e.target.value)}
                        placeholder="e.g. 13999"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Payment Mode <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="UPI">UPI</option>
                      <option value="GPay">GPay (Google Pay)</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Account Transfer">Account Transfer</option>
                      <option value="Cash">Cash at Reception</option>
                      <option value="Split">Split (Part Cash + Part Online / UPI)</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking / NEFT</option>
                    </select>
                  </div>
                </div>

                {/* Split Payment Breakdown */}
                {form.paymentMethod === 'Split' && (
                  <div className="p-3 rounded-xl bg-violet-50/80 border border-violet-200 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-violet-900 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-violet-600" />
                        <span>Split Payment Breakdown</span>
                      </span>
                      <span className="text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded">
                        Total: ₹{paidAmountNum.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Cash Portion (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={(e) => preventNonNumericKey(e, true)}
                            value={form.splitCashAmount}
                            onChange={(e) => handleSplitCashChange(e.target.value)}
                            placeholder="e.g. 5000"
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-violet-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-violet-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Online Portion (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={(e) => preventNonNumericKey(e, true)}
                            value={form.splitOnlineAmount}
                            onChange={(e) => handleSplitOnlineChange(e.target.value)}
                            placeholder="e.g. 8999"
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-violet-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-violet-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-violet-900 uppercase tracking-wider">
                        Online Received Via
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: 'UPI', label: 'UPI' },
                          { id: 'GPay', label: 'GPay' },
                          { id: 'PhonePe', label: 'PhonePe' },
                          { id: 'Account', label: 'Account' },
                          { id: 'Other', label: 'Other' },
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, splitOnlineProvider: provider.id }))}
                            className={`py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all border ${
                              form.splitOnlineProvider === provider.id
                                ? 'bg-violet-600 text-white border-violet-700 shadow-xs'
                                : 'bg-white text-slate-600 border-violet-200 hover:bg-violet-100/50'
                            }`}
                          >
                            {provider.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Notes / Reference (Optional)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Bank ref #983421, GPay transaction ID, or client requests"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Summary Strip */}
              <div className="bg-slate-100/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Package</span>
                    <span className="font-bold text-slate-800">{form.totalSessions} Sessions</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Inflow Amount</span>
                    <span className="font-bold text-emerald-700">₹{paidAmountNum.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Trainer Commission</span>
                    <span className="font-bold text-teal-700">₹{calculatedCommission.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Allocating & Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Allocate Package & Bill</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Advanced Filter Modal (Portalled to document.body) */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div
            onClick={() => setShowFilterModal(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fadeIn"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-scaleUp my-auto max-h-[88vh]"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-100/80 text-teal-700">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Filter PT Packages</h3>
                  <p className="text-xs text-slate-500">Filter personal training quotas by session status and assigned coach</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Package Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Package Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Packages' },
                    { id: 'Active', label: 'Active Quotas' },
                    { id: 'Completed', label: 'Completed' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer text-center ${
                        statusFilter === st.id
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned Coach */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Assigned PT Coach</span>
                  {trainerFilter !== 'ALL' && (
                    <button type="button" onClick={() => setTrainerFilter('ALL')} className="text-[10px] text-teal-600 font-bold hover:underline">
                      Reset
                    </button>
                  )}
                </label>
                <select
                  value={trainerFilter}
                  onChange={(e) => setTrainerFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none"
                >
                  <option value="ALL">All Certified Coaches</option>
                  {(trainers || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialty || 'Personal Trainer'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20 cursor-pointer"
              >
                Apply Filters ({filteredSessions.length} Results)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
