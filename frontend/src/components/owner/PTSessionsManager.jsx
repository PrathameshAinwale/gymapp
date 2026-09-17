import React, { useState, useEffect } from 'react';
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
  RotateCw
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

export const PTSessionsManager = () => {
  const {
    ptSessions = [],
    trainers = [],
    members = [],
    fetchPtSessions,
    fetchTrainers,
    fetchMembers,
    allocatePTSessions,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchPtSessions?.();
    fetchTrainers?.();
    fetchMembers?.();
  }, [fetchPtSessions, fetchTrainers, fetchMembers]);

  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredSessions = ptSessions.filter((pt) =>
    (pt.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pt.trainerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pt.packageTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* PT Packages Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member, coach, or PT package..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 font-medium"
            />
          </div>
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
            Active Packages: <strong>{filteredSessions.length}</strong>
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Dumbbell}
              title={searchTerm ? "No matching PT sessions found" : "No PT Sessions Allocated Yet"}
              description={
                searchTerm
                  ? `No PT packages match "${searchTerm}". Try resetting your search filter or allocate a new PT package.`
                  : "Allocate 1-on-1 personal training session packages to gym members with dedicated certified coaches."
              }
              actionText="Allocate PT Package"
              onAction={() => setIsAllocateModalOpen(true)}
              secondaryActionText={searchTerm ? "Clear Search" : undefined}
              onSecondaryAction={searchTerm ? () => setSearchTerm('') : undefined}
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
                  <th className="py-3 px-4 text-center">Current Session OTP</th>
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

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-bold text-xs shadow-2xs">
                          <KeyRound className="w-3 h-3 text-indigo-600" />
                          <span>{pt.otp || '****'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSessionPkg(pt)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                        >
                          View Logs ({(pt.logs || []).length})
                        </button>
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
                value={form.totalSessions}
                onChange={(e) => setForm({ ...form, totalSessions: Number(e.target.value) })}
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
    </div>
  );
};
