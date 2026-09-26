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
  Trash2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import {
  hasSqlInjection,
  sanitizeDigits,
  preventNonNumericKey
} from '../../utils/validation';

export const PTSessionsManager = () => {
  const {
    ptSessions = [],
    trainers = [],
    members = [],
    fetchPtSessions,
    fetchTrainers,
    fetchMembers,
    allocatePTSessions,
    deletePTSession,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchPtSessions?.();
    fetchTrainers?.();
    fetchMembers?.();
  }, [fetchPtSessions, fetchTrainers, fetchMembers]);

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

  const [form, setForm] = useState({
    memberId: members[0]?.id || '',
    trainerId: trainers[0]?.id || '',
    totalSessions: 12,
    packageTitle: '12 1-on-1 PT Sessions'
  });

  const handleAllocateSubmit = (e) => {
    e.preventDefault();
    if (hasSqlInjection(form.packageTitle)) {
      addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    const mem = members.find((m) => m.id === form.memberId) || members[0];
    const trn = trainers.find((t) => t.id === form.trainerId) || trainers[0];

    allocatePTSessions({
      memberId: mem?.id,
      memberName: mem?.name,
      memberEmail: mem?.email,
      trainerId: trn?.id,
      trainerName: trn?.name,
      totalSessions: Number(form.totalSessions) || 12,
      packageTitle: form.packageTitle
    });

    setIsAllocateModalOpen(false);
    addToast(`PT Package allocated for ${mem?.name} with ${trn?.name}!`, 'success');
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
        onClose={() => setIsAllocateModalOpen(false)}
        title="Allocate 1-on-1 PT Package"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAllocateSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Member</label>
            <select
              value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.planName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Trainer</label>
            <select
              value={form.trainerId}
              onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Number of Sessions</label>
              <input
                type="number"
                min={1}
                max={120}
                inputMode="numeric"
                value={form.totalSessions}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setForm({ ...form, totalSessions: sanitizeDigits(e.target.value, 3) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Package Title</label>
              <input
                type="text"
                value={form.packageTitle}
                onChange={(e) => setForm({ ...form, packageTitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAllocateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              Allocate Package
            </button>
          </div>
        </form>
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
