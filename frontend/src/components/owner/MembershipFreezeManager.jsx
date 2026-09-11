import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  PauseCircle,
  PlayCircle,
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldCheck,
  CalendarPlus
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const MembershipFreezeManager = () => {
  const { membershipFreezes, addFreezeRequest, unfreezeMembership, extendMembership, members } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  // Freeze Form State
  const [freezeData, setFreezeData] = useState({
    memberId: members[0]?.id || '',
    freezeStartDate: new Date().toISOString().split('T')[0],
    freezeEndDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    daysFrozen: 15,
    reason: 'Official travel / Out of town'
  });

  // Extend Form State
  const [extendData, setExtendData] = useState({
    memberId: members[0]?.id || '',
    extensionDays: 15,
    reason: 'Complimentary bonus extension'
  });

  const activeFreezes = membershipFreezes.filter((f) => f.status === 'Active Freeze');
  const totalDaysFrozen = membershipFreezes.reduce((acc, f) => acc + (Number(f.daysFrozen) || 0), 0);

  const filteredFreezes = membershipFreezes.filter((f) =>
    (f.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartDateChange = (startStr) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + Number(freezeData.daysFrozen) * 86400000);
    setFreezeData({
      ...freezeData,
      freezeStartDate: startStr,
      freezeEndDate: end.toISOString().split('T')[0]
    });
  };

  const handleDaysChange = (days) => {
    const start = new Date(freezeData.freezeStartDate);
    const end = new Date(start.getTime() + Number(days) * 86400000);
    setFreezeData({
      ...freezeData,
      daysFrozen: Number(days),
      freezeEndDate: end.toISOString().split('T')[0]
    });
  };

  const handleFreezeSubmit = (e) => {
    e.preventDefault();
    const mem = members.find((m) => m.id === freezeData.memberId) || members[0];
    addFreezeRequest({
      memberId: mem.id,
      memberName: mem.name,
      planName: mem.planName || 'Silver Monthly Pass',
      freezeStartDate: freezeData.freezeStartDate,
      freezeEndDate: freezeData.freezeEndDate,
      daysFrozen: Number(freezeData.daysFrozen),
      reason: freezeData.reason
    });
    setIsFreezeModalOpen(false);
  };

  const handleExtendSubmit = (e) => {
    e.preventDefault();
    extendMembership({
      memberId: extendData.memberId,
      extensionDays: Number(extendData.extensionDays),
      reason: extendData.reason
    });
    setIsExtendModalOpen(false);
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <PauseCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">Freeze & Extensions</h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Pause active memberships for medical rest or travel without losing days, or grant bonus validity extensions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExtendModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            <span>Extend</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFreezeModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <PauseCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Freeze</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Active Freezes</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">{activeFreezes.length}</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium block truncate">Paused validity</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Freeze Logs</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{membershipFreezes.length}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">Historical records</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Preserved Days</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">{totalDaysFrozen} Days</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium block truncate">Added to expirations</span>
        </div>
      </div>

      {/* Freezes Section with Dual Views */}
      <div className="space-y-2.5">
        {/* Search Bar */}
        <div className="bg-white border border-slate-200 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">Active & Historical Membership Freezes</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Mobile View: Compact Cards */}
        <div className="block sm:hidden space-y-2">
          {filteredFreezes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
              No membership freeze records found.
            </div>
          ) : (
            filteredFreezes.map((f) => {
              const isActive = f.status === 'Active Freeze';

              return (
                <div
                  key={f.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{f.memberName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{f.planName}</div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isActive ? <PauseCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      <span>{f.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Duration</span>
                      <span className="font-medium text-slate-700">{f.freezeStartDate} → {f.freezeEndDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Preserved</span>
                      <span className="font-bold text-amber-700">{f.daysFrozen} Days</span>
                    </div>
                  </div>

                  {f.reason && (
                    <div className="text-[11px] text-slate-600 italic truncate">
                      "{f.reason}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">By: {f.approvedBy || 'Owner'}</span>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => unfreezeMembership(f.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <PlayCircle className="w-3 h-3" />
                        <span>Unfreeze Plan</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Resumed</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Member Name</th>
                  <th className="py-3.5 px-5">Membership Plan</th>
                  <th className="py-3.5 px-5">Freeze Duration</th>
                  <th className="py-3.5 px-5">Days Frozen</th>
                  <th className="py-3.5 px-5">Reason</th>
                  <th className="py-3.5 px-5">Approved By</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFreezes.map((f) => {
                  const isActive = f.status === 'Active Freeze';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{f.memberName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-slate-600 font-medium">
                        {f.planName}
                      </td>

                      <td className="py-3.5 px-5 text-slate-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{f.freezeStartDate} → {f.freezeEndDate}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {f.daysFrozen} Days
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-slate-600 max-w-xs">
                        {f.reason}
                      </td>

                      <td className="py-3.5 px-5 text-slate-500">
                        {f.approvedBy}
                      </td>

                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isActive ? <PauseCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          <span>{f.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => unfreezeMembership(f.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1 ml-auto active:scale-95"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Unfreeze</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Resumed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Freeze Modal */}
      <Modal
        isOpen={isFreezeModalOpen}
        onClose={() => setIsFreezeModalOpen(false)}
        title="Freeze Member Plan"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFreezeSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Member *</label>
            <select
              value={freezeData.memberId}
              onChange={(e) => setFreezeData({ ...freezeData, memberId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.planName || 'Member'} • Expires: {m.expiryDate || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={freezeData.freezeStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Days Frozen *</label>
              <input
                type="number"
                required
                min="1"
                max="90"
                value={freezeData.daysFrozen}
                onChange={(e) => handleDaysChange(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Resume Date: {freezeData.freezeEndDate}</span>
            </div>
            <p className="text-[10px] text-amber-700">
              The member's expiry date will be automatically pushed forward by {freezeData.daysFrozen} days.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Reason for Freeze</label>
            <input
              type="text"
              required
              value={freezeData.reason}
              onChange={(e) => setFreezeData({ ...freezeData, reason: e.target.value })}
              placeholder="e.g. Work travel, medical recovery"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFreezeModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              Confirm Freeze
            </button>
          </div>
        </form>
      </Modal>

      {/* Extend Modal */}
      <Modal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        title="Extend Plan Validity"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExtendSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Member *</label>
            <select
              value={extendData.memberId}
              onChange={(e) => setExtendData({ ...extendData, memberId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.planName || 'Member'} • Expires: {m.expiryDate || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Extension Days to Add *</label>
            <input
              type="number"
              required
              min="1"
              max="180"
              value={extendData.extensionDays}
              onChange={(e) => setExtendData({ ...extendData, extensionDays: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Reason / Notes</label>
            <input
              type="text"
              required
              value={extendData.reason}
              onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
              placeholder="e.g. Festival bonus, compensation"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExtendModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              Apply Extension
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
