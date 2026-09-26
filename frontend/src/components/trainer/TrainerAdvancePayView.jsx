import React, { useState, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Coins,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  IndianRupee,
  ShieldCheck,
  FileText,
  HelpCircle,
  Award
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  hasSqlInjection,
  sanitizeDecimal,
  preventNonNumericKey
} from '../../utils/validation';

export const TrainerAdvancePayView = ({ setActiveTab }) => {
  const { advanceRequests = [], requestAdvancePay, addToast } = useGymData();
  const { currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [advanceForm, setAdvanceForm] = useState({
    amount: 15000,
    reason: '',
    repaymentMonth: 'Next Cycle'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Match requests for the logged-in coach
  const myRequests = useMemo(() => {
    const cId = String(currentUser?.id || '').toLowerCase();
    const cUserId = String(currentUser?.userId || '').toLowerCase();
    const cName = String(currentUser?.name || '').toLowerCase();

    return advanceRequests.filter((r) => {
      const rId = String(r.trainerId || r.staffId || '').toLowerCase();
      const rName = String(r.trainerName || r.staffName || '').toLowerCase();
      return (
        rId === cId ||
        rId.replace(/[^0-9]/g, '') === cUserId ||
        (cName && rName && (rName.includes(cName) || cName.includes(rName))) ||
        !r.trainerId
      );
    });
  }, [advanceRequests, currentUser]);

  const filteredRequests = useMemo(() => {
    if (filterStatus === 'ALL') return myRequests;
    return myRequests.filter((r) => r.status === filterStatus);
  }, [myRequests, filterStatus]);

  // Aggregate stats
  const totalRequested = myRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalDisbursed = myRequests
    .filter((r) => r.status === 'Disbursed')
    .reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const pendingCount = myRequests.filter((r) => r.status === 'Pending').length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(advanceForm.reason)) {
      addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!advanceForm.amount || !advanceForm.reason) {
      addToast('Please specify an amount and reason for advance pay', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestAdvancePay({
        staffId: currentUser?.id || 'trn-2',
        staffName: currentUser?.name || 'Coach Alex Rivers',
        role: currentUser?.roleLabel || 'Senior Fitness Coach',
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason,
        repaymentMonth: advanceForm.repaymentMonth
      });

      setIsModalOpen(false);
      setAdvanceForm({ amount: 15000, reason: '', repaymentMonth: 'Next Cycle' });
    } catch (err) {
      addToast(err.message || 'Failed to submit advance request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight">
              Request Advance Salary
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit salary advances, select flexible payroll deduction terms, and track approval sign-offs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Advance Pay</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Advances Applied
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalRequested.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {myRequests.length} total applications submitted
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Disbursed (Paid Out)
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
            Processed via bank transfer / cash
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Awaiting Review
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {pendingCount}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
            Pending Superadmin & Accounts sign-off
          </span>
        </div>
      </div>

      {/* 3. Club Policy Info Strip */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs">
        <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-amber-900 leading-relaxed">
          <span className="font-bold">Staff Advance Salary Policy: </span>
          Advances are reviewed by Superadmin & Accounts. Approved advances are deducted from your upcoming payroll cycles according to your selected repayment terms (100% next cycle, or split over 2-3 months).
        </div>
      </div>

      {/* 4. Requests History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Application History & Approvals</h2>
            <p className="text-xs text-slate-500">Live records of your salary advance requests</p>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto no-scrollbar">
            {['ALL', 'Pending', 'Approved', 'Disbursed', 'Rejected'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
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

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th className="py-3 px-4">Request Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Reason / Purpose</th>
                <th className="py-3 px-4">Repayment Schedule</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sign-Off Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Coins className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No advance salary requests found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Need emergency funds? Click "Apply for Advance Pay" above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';
                  const isDisbursed = req.status === 'Disbursed';
                  const isRejected = req.status === 'Rejected';

                  const dateDisplay = req.requestDate || req.date || 'Recent';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {typeof dateDisplay === 'string' ? dateDisplay.slice(0, 10) : dateDisplay}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-sm text-slate-900 whitespace-nowrap">
                        ₹{Number(req.amount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        <span className="font-medium line-clamp-2" title={req.reason}>
                          {req.reason}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {req.repaymentMonth || 'Next Cycle'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isDisbursed && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Disbursed (Paid)</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {isDisbursed && (
                          <span className="text-emerald-700 font-medium">
                            Disbursed {req.disbursedDate ? `on ${req.disbursedDate}` : ''}
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-blue-700 font-medium">
                            Signed off by {req.approvedBy || 'Superadmin'}
                          </span>
                        )}
                        {isPending && (
                          <span className="text-amber-700">Awaiting management action</span>
                        )}
                        {isRejected && (
                          <span className="text-rose-700">Declined by management</span>
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

      {/* 5. Submit Advance Salary Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply for Advance Salary"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <span className="font-bold text-amber-900 text-xs">Club Staff Advance Policy</span>
            <p className="text-[11px] text-amber-800">
              Approved salary advances are deducted from future payroll cycles. Requests are reviewed and approved directly by Superadmin & Accounts.
            </p>
          </div>

          {/* Amount Input with Quick Buttons */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Advance Amount (₹)
            </label>
            <input
              type="number"
              min={1000}
              max={100000}
              step={1000}
              required
              inputMode="decimal"
              value={advanceForm.amount}
              onKeyDown={(e) => preventNonNumericKey(e, true)}
              onChange={(e) => setAdvanceForm({ ...advanceForm, amount: sanitizeDecimal(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs"
            />
            <div className="flex gap-2 mt-2">
              {[5000, 10000, 15000, 25000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAdvanceForm({ ...advanceForm, amount: val })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    Number(advanceForm.amount) === val
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ₹{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Repayment Schedule */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Repayment Schedule
            </label>
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

          {/* Reason */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Reason for Advance
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Medical emergency, urgent personal expense, or equipment purchase"
              value={advanceForm.reason}
              onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
