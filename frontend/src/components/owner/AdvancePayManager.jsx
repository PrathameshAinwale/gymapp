import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  Calendar,
  User,
  ArrowUpRight,
  ShieldCheck,
  Award,
  RotateCw,
  Search,
  Filter,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

export const AdvancePayManager = () => {
  const { advanceRequests = [], updateAdvancePayStatus, fetchAdvanceRequests, fetchTrainers, addToast } = useGymData();
  const { currentUser, currentRole } = useAuth();

  useEffect(() => {
    fetchAdvanceRequests?.();
    fetchTrainers?.();
  }, [fetchAdvanceRequests, fetchTrainers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const approverLabel =
    currentRole === 'accounts'
      ? `${currentUser?.name || 'Finance Officer'} (Accounts)`
      : `${currentUser?.name || 'Superadmin'} (Superadmin)`;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'ALL') count++;
    return count;
  }, [filterStatus]);

  const handleResetFilters = () => {
    setFilterStatus('ALL');
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return advanceRequests
      .filter(
        (r) =>
          r.staffName?.toLowerCase().includes(query) ||
          r.role?.toLowerCase().includes(query) ||
          r.reason?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [advanceRequests, searchTerm]);

  const filteredRequests = useMemo(() => {
    return advanceRequests.filter((r) => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = r.staffName?.toLowerCase().includes(query);
        const matchesRole = r.role?.toLowerCase().includes(query);
        const matchesReason = r.reason?.toLowerCase().includes(query);
        const matchesMonth = r.repaymentMonth?.toLowerCase().includes(query);
        const matchesAmount = String(r.amount || '').includes(query);
        if (!matchesName && !matchesRole && !matchesReason && !matchesMonth && !matchesAmount) return false;
      }
      return true;
    });
  }, [advanceRequests, filterStatus, searchTerm]);

  const totalRequested = advanceRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalDisbursed = advanceRequests
    .filter((r) => r.status === 'Disbursed')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const pendingCount = advanceRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Coins className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Staff Advance Salary & Disbursals
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review staff salary advance requests, grant approvals, and disburse payments directly into expense cash outflows.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{pendingCount} Pending Requests</span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Advances Requested</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalRequested.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{advanceRequests.length} total applications</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Disbursed (Paid Out)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">Recorded in cash outflow</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Actions</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {pendingCount}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">Awaiting sign-off</span>
        </div>
      </div>

      {/* UNIFIED SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Autocomplete Search Bar */}
          <div ref={searchContainerRef} className="relative flex-1">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                placeholder="Search by staff name, reason, repayment month..."
                className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {isSearchDropdownOpen && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-100">
                <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Suggested Staff Advances
                </div>
                {searchSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSearchTerm(item.staffName);
                      setIsSearchDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-amber-50/60 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{item.staffName}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({item.role})</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">₹{Number(item.amount).toLocaleString('en-IN')}</span>
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
                  ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white">
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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                Status: {filterStatus}
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className="hover:text-amber-900 cursor-pointer"
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
              Showing {filteredRequests.length} records
            </span>
          </div>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Coins}
              title={activeFiltersCount > 0 || searchTerm ? "No matching advance requests" : "No Advance Salary Requests"}
              description={
                activeFiltersCount > 0 || searchTerm
                  ? "No advance salary requests match your current search and filter criteria."
                  : "Staff advance salary requests and emergency disbursement approvals will appear here."
              }
              secondaryActionText={activeFiltersCount > 0 || searchTerm ? "Clear All Filters" : undefined}
              onSecondaryAction={activeFiltersCount > 0 || searchTerm ? handleResetFilters : undefined}
              color="amber"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Amount Requested</th>
                  <th className="py-3 px-4">Reason / Purpose</th>
                  <th className="py-3 px-4">Repayment Cycle</th>
                  <th className="py-3 px-4">Date Requested</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map((req) => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';
                  const isDisbursed = req.status === 'Disbursed';
                  const isRejected = req.status === 'Rejected';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span>{req.staffName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{req.role}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-sm text-slate-900">
                        ₹{Number(req.amount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {req.repaymentMonth}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {req.requestDate}
                      </td>

                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Approved
                          </span>
                        )}
                        {isDisbursed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Disbursed & Paid
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateAdvancePayStatus(req.id, 'Approved', approverLabel)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] cursor-pointer active:scale-95 shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAdvancePayStatus(req.id, 'Rejected', approverLabel)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 cursor-pointer active:scale-95"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => updateAdvancePayStatus(req.id, 'Disbursed', approverLabel)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer active:scale-95 shadow-sm flex items-center gap-1"
                            >
                              <Coins className="w-3 h-3" />
                              <span>Disburse Payment</span>
                            </button>
                          )}

                          {isDisbursed && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              Paid {req.disbursedDate}
                            </span>
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

      {/* PORTALLED FILTER MODAL */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Advance Pay Filters</h3>
                  <p className="text-[11px] text-slate-400">Filter requests by approval and disbursement status</p>
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Request Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'All Requests', val: 'ALL' },
                    { label: 'Pending Review', val: 'Pending' },
                    { label: 'Approved', val: 'Approved' },
                    { label: 'Disbursed', val: 'Disbursed' },
                    { label: 'Rejected', val: 'Rejected' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setFilterStatus(opt.val)}
                      className={`py-2 px-3 text-left rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        filterStatus === opt.val
                          ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
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
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
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
