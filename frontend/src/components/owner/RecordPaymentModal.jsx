import React, { useState, useEffect, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { Modal } from '../common/Modal';
import {
  IndianRupee,
  Calendar,
  CreditCard,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';

export const RecordPaymentModal = ({
  isOpen,
  onClose,
  initialMember = null,
  initialMemberId = null
}) => {
  const { members, plans, recordPayment } = useGymData();

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentMethods = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer'];

  // Helper to format Date to YYYY-MM-DD
  const formatDate = (date) => {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };

  useEffect(() => {
    if (isOpen) {
      const todayStr = formatDate(new Date());
      setPaymentDate(todayStr);

      const targetMember =
        initialMember ||
        (initialMemberId ? members.find((m) => m.id === initialMemberId) : null) ||
        members[0];

      const initialMemberIdResolved = targetMember?.id || members[0]?.id || '';
      setSelectedMemberId(initialMemberIdResolved);

      const defaultPlan =
        plans.find((p) => p.id === targetMember?.planId || p.name === targetMember?.planName) ||
        plans[0];

      if (defaultPlan) {
        setSelectedPlanId(defaultPlan.id);
        setAmount(String(defaultPlan.price || ''));
      }

      setPaymentMethod('UPI');
    }
  }, [isOpen, initialMember, initialMemberId, members, plans]);

  const currentMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const currentPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );

  // Auto-calculate Expiry Date based on paymentDate + currentPlan.durationMonths
  const calculatedExpiryDate = useMemo(() => {
    if (!paymentDate) return '';
    try {
      const d = new Date(paymentDate);
      if (isNaN(d.getTime())) return '';
      const monthsToAdd = Number(currentPlan?.durationMonths) || 1;
      d.setMonth(d.getMonth() + monthsToAdd);
      return formatDate(d);
    } catch {
      return '';
    }
  }, [paymentDate, currentPlan]);

  const formattedExpiryDisplay = useMemo(() => {
    if (!calculatedExpiryDate) return '--';
    try {
      const d = new Date(calculatedExpiryDate);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return calculatedExpiryDate;
    }
  }, [calculatedExpiryDate]);

  const handleMemberChange = (e) => {
    const memId = e.target.value;
    setSelectedMemberId(memId);
    const m = members.find((mem) => mem.id === memId);
    if (m) {
      const matchedPlan = plans.find((p) => p.id === m.planId || p.name === m.planName);
      if (matchedPlan) {
        setSelectedPlanId(matchedPlan.id);
        setAmount(String(matchedPlan.price || ''));
      }
    }
  };

  const handlePlanChange = (e) => {
    const planId = e.target.value;
    setSelectedPlanId(planId);
    const p = plans.find((pl) => pl.id === planId);
    if (p) {
      setAmount(String(p.price || ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      alert('Please select a member.');
      return;
    }
    if (!currentPlan) {
      alert('Please select a membership plan.');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        memberId: currentMember?.id,
        memberName: currentMember?.name,
        planId: currentPlan?.id,
        planName: currentPlan?.name,
        amount: Number(amount),
        paymentDate,
        expiryDate: calculatedExpiryDate,
        paymentMethod
      });
      onClose();
    } catch (err) {
      alert('Failed to record payment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialMember ? `Renew: ${initialMember.name}` : 'Record Fee Payment'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* 1. Member Select */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Select Member *
          </label>
          <select
            value={selectedMemberId}
            onChange={handleMemberChange}
            required
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.planName || 'Active'} • #{m.id})
              </option>
            ))}
          </select>
          {currentMember && (
            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 px-0.5">
              <span className="truncate">{currentMember.phone || currentMember.email || 'No contact'}</span>
              <span className="shrink-0 font-medium text-emerald-600">Status: {currentMember.status || 'Active'}</span>
            </div>
          )}
        </div>

        {/* 2. Membership Plan Select */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Membership Plan / Package *
          </label>
          <select
            value={selectedPlanId}
            onChange={handlePlanChange}
            required
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{Number(p.price).toLocaleString('en-IN')} ({p.durationMonths || 1}M)
              </option>
            ))}
          </select>
        </div>

        {/* 3. Row: Payment Date & Fee Amount */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Renewal Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5500"
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>
        </div>

        {/* 4. Auto-Calculated Expiry Date Banner */}
        <div className="p-3 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Membership Expiry
              </span>
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {formattedExpiryDisplay}
              </div>
              <p className="text-[10px] text-slate-600 truncate">
                +{currentPlan?.durationMonths || 1} Month(s) from {paymentDate || 'today'}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            Auto-Sync
          </span>
        </div>

        {/* 5. Payment Method */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Payment Mode
          </label>
          <div className="flex flex-wrap gap-1.5">
            {paymentMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ${
                  paymentMethod === m
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Recording...' : 'Confirm & Receipt'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
