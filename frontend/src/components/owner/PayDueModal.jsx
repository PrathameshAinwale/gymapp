import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { api } from '../../services/api';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Receipt,
  User,
  Phone,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const PayDueModal = ({
  isOpen,
  onClose,
  member = null,
  onSuccess = null
}) => {
  const { currentUser } = useAuth();
  const {
    updateMember,
    fetchMembers,
    fetchInvoices,
    fetchDashboardStats,
    addToast
  } = useGymData();

  const getInitialDueAmount = (m) => {
    if (!m) return 0;
    const directFields = [
      m.duesAmount,
      m.dues_amount,
      m.balanceDue,
      m.balance_due,
      m.pendingAmount,
      m.pending_amount,
      m.dueAmount,
      m.due_amount
    ];
    for (const f of directFields) {
      if (f !== undefined && f !== null && f !== '') {
        const num = parseFloat(String(f).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return 0;
  };

  const totalDue = getInitialDueAmount(member);

  const defaultCollectorName = (currentUser?.name && !currentUser.name.toLowerCase().includes('sohan'))
    ? currentUser.name
    : 'prathamesh';

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [accountTransferAmount, setAccountTransferAmount] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [handledByName, setHandledByName] = useState(defaultCollectorName);

  useEffect(() => {
    if (currentUser?.name && !handledByName) {
      setHandledByName(defaultCollectorName);
    }
  }, [currentUser, defaultCollectorName]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setCashAmount('');
      setUpiAmount('');
      setAccountTransferAmount('');
      setNextDueDate(member?.dueDate || member?.due_date || '');
      setNotes('');
    }
  }, [isOpen, member]);

  const numCash = Math.max(0, Number(cashAmount) || 0);
  const numUpi = Math.max(0, Number(upiAmount) || 0);
  const numAccountTransfer = Math.max(0, Number(accountTransferAmount) || 0);
  const paidNow = numCash + numUpi + numAccountTransfer;
  const remainingDue = Math.max(0, totalDue - paidNow);

  const getResolvedPaymentMethod = () => {
    const parts = [];
    if (numCash > 0) parts.push(`Cash: ₹${numCash.toLocaleString('en-IN')}`);
    if (numUpi > 0) parts.push(`UPI: ₹${numUpi.toLocaleString('en-IN')}`);
    if (numAccountTransfer > 0) parts.push(`Account Transfer: ₹${numAccountTransfer.toLocaleString('en-IN')}`);
    if (parts.length === 0) return 'Pending Payment';
    if (parts.length === 1) {
      if (numCash > 0) return 'Cash';
      if (numUpi > 0) return 'UPI';
      if (numAccountTransfer > 0) return 'Account Transfer';
    }
    return `Split (${parts.join(', ')})`;
  };

  const sanitizeDecimal = (val) => {
    if (!val) return '';
    let clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    return clean;
  };

  const preventNonNumericKey = (e, allowDecimal = true) => {
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End'
      ].includes(e.key)
    ) {
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
    if (allowDecimal && e.key === '.') {
      if (e.currentTarget.value.includes('.')) {
        e.preventDefault();
      }
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!member) {
      addToast('No member selected.', 'error');
      return;
    }

    if (totalDue <= 0) {
      addToast('This member has ₹0 outstanding balance due.', 'info');
      onClose();
      return;
    }

    if (paidNow <= 0) {
      addToast('Please enter an amount to collect in Cash, UPI, or Account Transfer.', 'error');
      return;
    }

    if (paidNow > totalDue) {
      addToast(`Paid amount (₹${paidNow.toLocaleString('en-IN')}) cannot exceed the total balance due (₹${totalDue.toLocaleString('en-IN')}).`, 'error');
      return;
    }

    if (remainingDue > 0 && !nextDueDate) {
      addToast('Please select the promised date when the remaining balance will be paid.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanUserId = typeof member?.id === 'string'
        ? parseInt(member.id.replace(/\D/g, ''), 10) || 1
        : Number(member?.id) || 1;

      const invoiceTitle = `Balance Due Payment - ${member.planName || 'Gym Membership'}`;
      const resolvedPaymentMethodString = getResolvedPaymentMethod();

      // 1. Record Inflow in Revenue & Invoices
      if (api.revenueBilling?.addInflow) {
        await api.revenueBilling.addInflow({
          user_id: cleanUserId,
          memberId: member.id,
          member_name: member.name,
          plan_name: invoiceTitle,
          title: `${member.name} - ${invoiceTitle}`,
          category: 'Membership Fee',
          amount: paidNow,
          total_amount: totalDue,
          dues_amount: remainingDue,
          due_date: remainingDue > 0 ? nextDueDate : null,
          dueDate: remainingDue > 0 ? nextDueDate : null,
          payment_method: resolvedPaymentMethodString,
          date: paymentDate || new Date().toISOString().split('T')[0],
          notes: notes || `Balance dues payment: Collected ₹${paidNow.toLocaleString('en-IN')} via ${resolvedPaymentMethodString}. Remaining Due: ₹${remainingDue.toLocaleString('en-IN')}`,
          status: remainingDue > 0 ? 'Pending' : 'Paid',
          created_by: currentUser?.userId || currentUser?.id,
          created_by_name: handledByName?.trim() || defaultCollectorName || 'Staff'
        });
      }

      // 2. Update Member profile dues in state & DB
      if (updateMember) {
        await updateMember(member.id, {
          ...member,
          duesAmount: remainingDue,
          dues_amount: remainingDue,
          due_date: remainingDue > 0 ? nextDueDate : null,
          dueDate: remainingDue > 0 ? nextDueDate : null
        });
      }

      // 3. Refresh data stores
      await Promise.allSettled([
        fetchInvoices?.(),
        fetchMembers?.(),
        fetchDashboardStats?.()
      ]);

      addToast(
        remainingDue === 0
          ? `Full dues of ₹${paidNow.toLocaleString('en-IN')} cleared for ${member.name}!`
          : `Collected ₹${paidNow.toLocaleString('en-IN')}. Remaining balance: ₹${remainingDue.toLocaleString('en-IN')}.`,
        'success'
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to record balance due payment:', err);
      addToast(`Error recording payment: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay Remaining Balance Amount"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Member Header Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                {member.name?.charAt(0) || 'M'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">{member.name}</h3>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{member.planName || 'Standard Member'}</span>
                  {member.phone && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {member.phone}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                Total Balance Due
              </span>
              <span className="text-base font-black font-mono text-rose-600">
                ₹{totalDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {(member.dueDate || member.due_date) && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center gap-1.5 text-[11px] text-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Previous Promised Due Date: <strong>{member.dueDate || member.due_date}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payment Received Date *</span>
          </label>
          <input
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 3 Payment Methods: Cash, UPI, Account Transfer */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Payment Breakdown & Methods *
          </label>

          {/* 1. Cash */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[160px]">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100">
                💵
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Cash</span>
                <span className="text-[10px] text-slate-500 block">Cash at Reception</span>
              </div>
            </div>
            <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  value={cashAmount}
                  onChange={(e) => setCashAmount(sanitizeDecimal(e.target.value))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-400 transition-all text-right"
                />
              </div>
              <button
                type="button"
                title="Pay remaining in Cash"
                onClick={() => {
                  const other = (Number(upiAmount) || 0) + (Number(accountTransferAmount) || 0);
                  const rem = Math.max(0, totalDue - other);
                  setCashAmount(rem > 0 ? String(rem) : '');
                }}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all cursor-pointer whitespace-nowrap"
              >
                Full
              </button>
            </div>
          </div>

          {/* 2. UPI */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[160px]">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">
                📱
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">UPI</span>
                <span className="text-[10px] text-slate-500 block">GPay, PhonePe, Paytm</span>
              </div>
            </div>
            <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(sanitizeDecimal(e.target.value))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-400 transition-all text-right"
                />
              </div>
              <button
                type="button"
                title="Pay remaining via UPI"
                onClick={() => {
                  const other = (Number(cashAmount) || 0) + (Number(accountTransferAmount) || 0);
                  const rem = Math.max(0, totalDue - other);
                  setUpiAmount(rem > 0 ? String(rem) : '');
                }}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer whitespace-nowrap"
              >
                Full
              </button>
            </div>
          </div>

          {/* 3. Account Transfer */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[160px]">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-100">
                🏦
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Account Transfer</span>
                <span className="text-[10px] text-slate-500 block">NEFT / IMPS / Netbanking</span>
              </div>
            </div>
            <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  value={accountTransferAmount}
                  onChange={(e) => setAccountTransferAmount(sanitizeDecimal(e.target.value))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-400 transition-all text-right"
                />
              </div>
              <button
                type="button"
                title="Pay remaining via Account Transfer"
                onClick={() => {
                  const other = (Number(cashAmount) || 0) + (Number(upiAmount) || 0);
                  const rem = Math.max(0, totalDue - other);
                  setAccountTransferAmount(rem > 0 ? String(rem) : '');
                }}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer whitespace-nowrap"
              >
                Full
              </button>
            </div>
          </div>
        </div>

        {/* If Amount Added is Not Complete: Show Remaining Balance Due & Due Date Picker */}
        {remainingDue > 0 ? (
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Balance Due Display */}
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Remaining Balance Pending (₹)
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 flex items-center justify-between shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-600">Still Due:</span>
                  <span className="text-sm font-black font-mono text-rose-600">
                    ₹{remainingDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Next Due Date Picker */}
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                  <span>Next Promised Due Date *</span>
                  <span className="text-[10px] font-normal text-amber-800">Promise date</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200/80 font-medium">
              <span className="text-slate-600">
                Total Due: <strong className="text-slate-900 font-mono">₹{totalDue.toLocaleString('en-IN')}</strong>
              </span>
              <span className="text-emerald-700 font-semibold">
                Paying Now: <strong className="font-mono">₹{paidNow.toLocaleString('en-IN')}</strong>
              </span>
              <span className="text-rose-700 font-bold">
                Remaining Due: <strong className="font-mono">₹{remainingDue.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full balance of <strong>₹{totalDue.toLocaleString('en-IN')}</strong> will be cleared! <strong>₹0</strong> dues remaining.</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-300 shrink-0">
              Clear All Dues
            </span>
          </div>
        )}

        {/* Handled By / Created By Staff Input */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Payment Collected & Invoice Created By</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Audit Record</span>
          </label>
          <input
            type="text"
            value={handledByName}
            onChange={(e) => setHandledByName(e.target.value)}
            placeholder="e.g. Rajesh Mehta (Manager) / Vikramaditya (Owner)"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Payment Notes / Remarks (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid part balance via UPI, remaining promised next Monday"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || paidNow <= 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <span>Recording...</span>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Collect ₹{paidNow.toLocaleString('en-IN')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
