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
import { SearchInput } from '../common/SearchInput';
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
    <div className="space-y-4 animate-fadeIn pb-12 w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 bg-white border border-slate-200/90 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="app-page-title font-bold text-slate-900 tracking-normal truncate">
                Staff Advance Salary
              </h1>
              <p className="text-2xs text-slate-500 hidden sm:block truncate max-w-[70ch]">
                Review staff salary advance requests, grant approvals, and disburse payments directly into expense cash outflows.
              </p>
              <p className="text-2xs text-slate-400 font-medium sm:hidden truncate">
                {pendingCount} pending • {advanceRequests.length} total
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{pendingCount} <span className="hidden sm:inline">Pending</span></span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Total Advances Requested</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ₹{totalRequested.toLocaleString('en-IN')}
          </div>
          <span className="text-2xs text-slate-500 mt-0.5 block">{advanceRequests.length} total applications</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Total Disbursed (Paid Out)</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </div>
          <span className="text-2xs text-emerald-700 font-medium mt-0.5 block">Recorded in cash outflow</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Pending Actions</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {pendingCount}
          </div>
          <span className="text-2xs text-amber-700 font-medium mt-0.5 block">Awaiting sign-off</span>
        </div>
      </div>

      {/* UNIFIED SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Autocomplete Search Bar */}
          <SearchInput
            containerRef={searchContainerRef}
            value={searchTerm}
            onFocus={() => setIsSearchDropdownOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchDropdownOpen(true);
            }}
            onClear={() => {
              setSearchTerm('');
              setIsSearchDropdownOpen(false);
            }}
            placeholder="Search by staff name, reason, repayment month..."
            mobilePlaceholder="Search advances..."
            containerClassName="flex-1 min-w-0"
          >
            
          </SearchInput>

          {/* Action Buttons: Filter */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`flex items-center justify-center gap-1.5 px-3 h-9.5 sm:h-9 sm:px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                activeFiltersCount > 0
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${activeFiltersCount > 0 ? 'text-white' : 'text-amber-600'}`} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-amber-700 rounded-full text-2xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Chips & Clear Action */}
        {(activeFiltersCount > 0 || searchTerm) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-2xs">
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

            <span className="ml-auto text-2xs text-slate-400">
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-2xs">
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
                      <td className="py-3.5 px-4 min-w-0 max-w-[180px]">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                          <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate" title={req.staffName}>{req.staffName}</span>
                        </div>
                        <div className="text-2xs text-slate-400 mt-0.5 truncate" title={req.role}>{req.role}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-sm text-slate-900 whitespace-nowrap shrink-0">
                        ₹{Number(req.amount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        <span className="truncate block" title={req.reason}>{req.reason}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap shrink-0">
                        {req.repaymentMonth}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap shrink-0">
                        {req.requestDate}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap shrink-0">
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            Approved
                          </span>
                        )}
                        {isDisbursed && (
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            Disbursed & Paid
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap shrink-0">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateAdvancePayStatus(req.id, 'Approved', approverLabel)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-2xs cursor-pointer active:scale-95 shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAdvancePayStatus(req.id, 'Rejected', approverLabel)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-2xs border border-rose-200 cursor-pointer active:scale-95"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => updateAdvancePayStatus(req.id, 'Disbursed', approverLabel)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-2xs cursor-pointer active:scale-95 shadow-sm flex items-center gap-1"
                            >
                              <Coins className="w-3 h-3" />
                              <span>Disburse Payment</span>
                            </button>
                          )}

                          {isDisbursed && (
                            <span className="text-2xs text-slate-400 font-mono">
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
                  <p className="text-2xs text-slate-400">Filter requests by approval and disbursement status</p>
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
