import React, { useState, useEffect } from 'react';
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
  RotateCw
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

export const AdvancePayManager = () => {
  const { advanceRequests, updateAdvancePayStatus, fetchAdvanceRequests, fetchTrainers, addToast } = useGymData();
  const { currentUser, currentRole } = useAuth();

  useEffect(() => {
    fetchAdvanceRequests?.();
    fetchTrainers?.();
  }, [fetchAdvanceRequests, fetchTrainers]);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const approverLabel =
    currentRole === 'accounts'
      ? `${currentUser?.name || 'Finance Officer'} (Accounts)`
      : `${currentUser?.name || 'Superadmin'} (Superadmin)`;

  const filteredRequests = advanceRequests.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

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

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {['ALL', 'Pending', 'Approved', 'Disbursed', 'Rejected'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Coins}
              title={filterStatus !== 'ALL' ? "No requests in this status" : "No Advance Salary Requests"}
              description={
                filterStatus !== 'ALL'
                  ? `No advance pay applications found with status "${filterStatus}".`
                  : "Staff advance salary requests and emergency disbursement approvals will appear here."
              }
              secondaryActionText={filterStatus !== 'ALL' ? "Show All Requests" : undefined}
              onSecondaryAction={filterStatus !== 'ALL' ? () => setFilterStatus('ALL') : undefined}
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
    </div>
  );
};
