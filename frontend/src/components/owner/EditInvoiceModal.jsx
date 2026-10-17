import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useGymData } from '../../context/GymDataContext';
import {
  FileText,
  IndianRupee,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Tag,
  Phone,
  Mail,
  Clock,
  Layers,
  ArrowRight,
  BadgePercent
} from 'lucide-react';
import {
  hasSqlInjection,
  sanitizeDecimal,
  preventNonNumericKey
} from '../../utils/validation';
import { calculatePlanExpiryDate } from '../../utils/dateUtils';

export const EditInvoiceModal = ({
  isOpen,
  onClose,
  invoice,
  onUpdated
}) => {
  const { updateInvoice, members = [], plans = [], ptPlans = [], recoveryPlans = [], addToast, gymInfo } = useGymData();

  // Resolve matching member to identify their current active package and profile details
  const targetMember = useMemo(() => {
    if (invoice?.member || invoice?.currentMember) {
      return invoice.member || invoice.currentMember;
    }
    if (!invoice) return null;

    const mId = invoice.memberId || invoice.userId || invoice.user_id;
    const cleanNumId = mId ? String(mId).replace(/[^0-9]/g, '') : null;

    return (
      members?.find((m) =>
        (mId && (m.id === mId || `mem-${m.userId}` === mId || `mem-${m.id}` === mId)) ||
        (cleanNumId && (String(m.id).replace(/[^0-9]/g, '') === cleanNumId || String(m.userId) === cleanNumId)) ||
        (invoice.memberName && m.name?.trim().toLowerCase() === invoice.memberName?.trim().toLowerCase()) ||
        (invoice.memberPhone && m.phone && m.phone.slice(-10) === invoice.memberPhone.slice(-10))
      ) || null
    );
  }, [invoice, members]);

  // Current package info of the member
  const currentMemberPackage = useMemo(() => {
    const planName = targetMember?.planName || targetMember?.plan_name || invoice?.planName || 'Standard Membership';
    const startDate = targetMember?.startDate || targetMember?.joinDate || (invoice?.date ? String(invoice.date).split('T')[0] : '');
    const expiryDate = targetMember?.expiryDate ? String(targetMember.expiryDate).split('T')[0] : '';
    const status = targetMember?.status || 'Active';
    const dues = Number(targetMember?.duesAmount ?? invoice?.pendingAmount ?? 0);
    const trainerName = targetMember?.trainerName || null;
    const trainingType = targetMember?.trainingType || 'self';

    return {
      planName,
      startDate,
      expiryDate,
      status,
      dues,
      trainerName,
      trainingType
    };
  }, [targetMember, invoice]);

  const [formData, setFormData] = useState({
    memberName: '',
    memberPhone: '',
    memberEmail: '',
    selectedPlanId: '',
    planName: '',
    startDate: '',
    expiryDate: '',
    amount: '',
    totalAmount: '',
    pendingAmount: '',
    discount: '0',
    isGstIncluded: false,
    date: '',
    dueDate: '',
    paymentMethod: 'UPI',
    status: 'Paid',
    createdByName: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialise form state when invoice opens
  useEffect(() => {
    if (invoice && isOpen) {
      const invPending = Number(
        invoice.pendingAmount ??
        invoice.duesAmount ??
        invoice.dues_amount ??
        0
      );
      const invPaid = Number(invoice.amount ?? 0);
      const invTotal = Number(invoice.totalAmount ?? (invPaid + invPending));

      const memberStartDate = targetMember?.startDate || targetMember?.joinDate || (invoice.date ? String(invoice.date).split('T')[0] : new Date().toISOString().split('T')[0]);
      const memberExpiryDate = targetMember?.expiryDate ? String(targetMember.expiryDate).split('T')[0] : '';

      setFormData({
        memberName: invoice.memberName || invoice.member_name || targetMember?.name || '',
        memberPhone: invoice.memberPhone || targetMember?.phone || '',
        memberEmail: invoice.memberEmail || targetMember?.email || '',
        selectedPlanId: invoice.planId || targetMember?.planId || 'custom',
        planName: invoice.planName || invoice.plan_name || targetMember?.planName || 'Membership Plan',
        startDate: memberStartDate,
        expiryDate: memberExpiryDate,
        amount: String(invPaid),
        totalAmount: String(invTotal),
        pendingAmount: String(invPending),
        discount: String(invoice.discount || invoice.discountAmount || 0),
        isGstIncluded: Boolean(invoice.isGstIncluded || invoice.gst_included || invoice.is_gst_included || false),
        date: invoice.date ? String(invoice.date).split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate ? String(invoice.dueDate).split('T')[0] : (targetMember?.dueDate ? String(targetMember.dueDate).split('T')[0] : ''),
        paymentMethod: invoice.paymentMethod || invoice.payment_method || 'UPI',
        status: invoice.status || (invPending > 0 ? 'Pending' : 'Paid'),
        createdByName: invoice.createdByName || invoice.created_by_name || 'Staff',
        notes: invoice.notes || ''
      });
      setErrorMessage('');
    }
  }, [invoice, targetMember, isOpen]);

  // Handle selecting a plan from dropdown
  const handleSelectPackage = (planId) => {
    if (planId === 'custom' || !planId) {
      setFormData((prev) => ({
        ...prev,
        selectedPlanId: 'custom'
      }));
      return;
    }

    // Look for membership plan
    const chosenPlan = plans.find((p) => p.id === planId || `plan-${p.id}` === planId);
    if (chosenPlan) {
      const planPrice = Number(chosenPlan.price || 0);
      const durationMonths = Number(chosenPlan.durationMonths || chosenPlan.duration_months || 1);
      const paid = Number(formData.amount) || 0;
      const newPending = Math.max(0, planPrice - paid);

      // Compute suggested expiry date from startDate using standard 30-day rule
      const periodStr = chosenPlan.period || (chosenPlan.validityDays ? `${chosenPlan.validityDays} Days` : '');
      const bonusDays = Number(chosenPlan.offerDays || chosenPlan.offer_days) || 0;
      const newExpiry = calculatePlanExpiryDate(formData.startDate || new Date().toISOString().split('T')[0], durationMonths, periodStr, bonusDays) || formData.expiryDate;

      setFormData((prev) => ({
        ...prev,
        selectedPlanId: planId,
        planName: chosenPlan.name,
        totalAmount: String(planPrice),
        pendingAmount: String(newPending),
        expiryDate: newExpiry,
        status: newPending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending')
      }));
      return;
    }

    // Look for PT plan
    const chosenPt = ptPlans.find((pt) => pt.id === planId || `pt-${pt.id}` === planId);
    if (chosenPt) {
      const ptPrice = Number(chosenPt.price || 0);
      const paid = Number(formData.amount) || 0;
      const newPending = Math.max(0, ptPrice - paid);

      setFormData((prev) => ({
        ...prev,
        selectedPlanId: planId,
        planName: chosenPt.name || `${chosenPt.sessions || 12} PT Sessions`,
        totalAmount: String(ptPrice),
        pendingAmount: String(newPending),
        status: newPending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending')
      }));
      return;
    }

    // Look for Recovery plan
    const chosenRec = recoveryPlans.find((r) => r.id === planId || `rec-${r.id}` === planId);
    if (chosenRec) {
      const recPrice = Number(chosenRec.price || 0);
      const paid = Number(formData.amount) || 0;
      const newPending = Math.max(0, recPrice - paid);

      setFormData((prev) => ({
        ...prev,
        selectedPlanId: planId,
        planName: chosenRec.name,
        totalAmount: String(recPrice),
        pendingAmount: String(newPending),
        status: newPending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending')
      }));
    }
  };

  // Auto-sync pending dues when paid amount changes
  const handleAmountChange = (newAmount) => {
    const paid = Math.max(0, Number(newAmount) || 0);
    const total = Math.max(0, Number(formData.totalAmount) || 0);
    const newPending = Math.max(0, total - paid);

    setFormData((prev) => ({
      ...prev,
      amount: newAmount,
      pendingAmount: String(newPending),
      status: newPending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending')
    }));
  };

  // Auto-sync pending dues when total bill changes
  const handleTotalAmountChange = (newTotal) => {
    const total = Math.max(0, Number(newTotal) || 0);
    const paid = Math.max(0, Number(formData.amount) || 0);
    const newPending = Math.max(0, total - paid);

    setFormData((prev) => ({
      ...prev,
      totalAmount: newTotal,
      pendingAmount: String(newPending),
      status: newPending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending')
    }));
  };

  // Handle submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (hasSqlInjection(formData.memberName) || hasSqlInjection(formData.planName) || hasSqlInjection(formData.notes)) {
      setErrorMessage('Disallowed characters or potential SQL injection syntax detected.');
      return;
    }

    const paidNum = Number(formData.amount);
    const totalNum = Number(formData.totalAmount);
    const pendingNum = Number(formData.pendingAmount);

    if (isNaN(paidNum) || paidNum < 0) {
      setErrorMessage('Please enter a valid paid collection amount (₹).');
      return;
    }
    if (isNaN(totalNum) || totalNum < 0) {
      setErrorMessage('Please enter a valid total invoice amount (₹).');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        amount: paidNum,
        totalAmount: totalNum,
        pendingAmount: pendingNum,
        duesAmount: pendingNum,
        date: formData.date,
        dueDate: pendingNum > 0 ? formData.dueDate : null,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        memberName: formData.memberName.trim(),
        memberPhone: formData.memberPhone?.trim() || null,
        planName: formData.planName.trim(),
        planId: formData.selectedPlanId !== 'custom' ? formData.selectedPlanId : null,
        startDate: formData.startDate || null,
        expiryDate: formData.expiryDate || null,
        discount: Number(formData.discount) || 0,
        isGstIncluded: formData.isGstIncluded,
        createdByName: formData.createdByName.trim(),
        notes: formData.notes.trim()
      };

      const updated = await updateInvoice(invoice.id || invoice.numericId, payload);
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  // Tax calculations
  const totalBilled = Number(formData.totalAmount) || 0;
  const taxRate = Number(formData.taxRate ?? invoice.taxRate ?? gymInfo?.tax_rate ?? gymInfo?.taxRate ?? 18) || 18;
  const halfTaxRate = (taxRate / 2).toFixed(taxRate % 2 === 0 ? 0 : 1);
  const baseFee = formData.isGstIncluded ? Math.round(totalBilled / (1 + (taxRate / 100))) : totalBilled;
  const totalGst = formData.isGstIncluded ? Math.max(0, totalBilled - baseFee) : 0;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Invoice & Package: #${invoice.id || invoice.invoiceNumber || 'INV'}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CURRENT MEMBER & ACTIVE PACKAGE DOSSIER CARD */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
            {/* Member Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                {(formData.memberName || 'M').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-100 truncate">
                    {formData.memberName || targetMember?.name || 'Member'}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentMemberPackage.status === 'Active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {currentMemberPackage.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 mt-0.5">
                  {formData.memberPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{formData.memberPhone}</span>
                    </span>
                  )}
                  {targetMember?.id && (
                    <span className="font-mono text-slate-400">({targetMember.id})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Current Dues Banner */}
            <div className="sm:text-right shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Member Dues
              </div>
              <div className={`text-sm font-extrabold font-mono ${currentMemberPackage.dues > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currentMemberPackage.dues > 0 ? `₹${currentMemberPackage.dues.toLocaleString('en-IN')} Due` : 'Clear (₹0)'}
              </div>
            </div>
          </div>

          {/* Current Package Overview Strip */}
          <div className="pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-400">Current Package:</span>
              <strong className="text-slate-100 font-semibold truncate">
                {currentMemberPackage.planName}
              </strong>
            </div>

            <div className="flex items-center gap-2 text-slate-300 sm:justify-end">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400">Current Validity:</span>
              <span className="font-mono font-medium text-slate-200">
                {currentMemberPackage.expiryDate ? `${currentMemberPackage.expiryDate}` : 'Not Set'}
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PACKAGE & PLAN SELECTION */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Package Selection &amp; Service Customization</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-700">Editable</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quick Package Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Choose Package / Membership Tier
              </label>
              <div className="relative">
                <select
                  value={formData.selectedPlanId}
                  onChange={(e) => handleSelectPackage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8 shadow-2xs"
                >
                  <optgroup label="Gym Membership Plans">
                    {plans?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{Number(p.price || 0).toLocaleString('en-IN')} ({p.durationMonths || p.duration_months || 1}M)
                      </option>
                    ))}
                  </optgroup>

                  {ptPlans && ptPlans.length > 0 && (
                    <optgroup label="Personal Training (PT) Packages">
                      {ptPlans.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name} — ₹{Number(pt.price || 0).toLocaleString('en-IN')} ({pt.sessions || 12} Sessions)
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {recoveryPlans && recoveryPlans.length > 0 && (
                    <optgroup label="Recovery &amp; Add-on Plans">
                      {recoveryPlans.map((rec) => (
                        <option key={rec.id} value={rec.id}>
                          {rec.name} — ₹{Number(rec.price || 0).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <option value="custom">✍ Custom / Modified Package</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Editable Package Title */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Package / Invoice Title *
              </label>
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                placeholder="e.g. Annual Platinum Plan / 12 PT Sessions"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Membership Validity Dates (Start & Expiry) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Membership Start Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Membership Expiry Date (Valid Till)
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FINANCIALS & REVENUE BREAKDOWN */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-slate-600" />
              <span>Invoice Financials &amp; Payment Amounts</span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-600 select-none">
              <input
                type="checkbox"
                checked={formData.isGstIncluded}
                onChange={(e) => setFormData({ ...formData, isGstIncluded: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-emerald-600"
              />
              <span>Apply 18% GST</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Total Billed Amount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Total Billed (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  inputMode="numeric"
                  value={formData.totalAmount}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => handleTotalAmountChange(sanitizeDecimal(e.target.value, 8))}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-black focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Paid Amount (Reflects in Inflow) */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-800 mb-1">
                Paid / Inflow (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  inputMode="numeric"
                  value={formData.amount}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => handleAmountChange(sanitizeDecimal(e.target.value, 8))}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs text-emerald-700 font-black focus:outline-none focus:border-emerald-600 ring-1 ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Pending Balance Due */}
            <div>
              <label className="block text-[10px] font-bold text-rose-700 mb-1">
                Balance Due (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="numeric"
                  value={formData.pendingAmount}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setFormData({ ...formData, pendingAmount: sanitizeDecimal(e.target.value, 8) })}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-rose-700 font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Tax Summary Preview if GST applied */}
          {formData.isGstIncluded && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
              <span>Plan Base: <strong>₹{baseFee.toLocaleString('en-IN')}</strong></span>
              <span>CGST ({halfTaxRate}%): <strong>₹{cgst.toLocaleString('en-IN')}</strong></span>
              <span>SGST ({halfTaxRate}%): <strong>₹{sgst.toLocaleString('en-IN')}</strong></span>
              <span>Total Tax: <strong>₹{totalGst.toLocaleString('en-IN')}</strong></span>
            </div>
          )}
        </div>

        {/* PAYMENT METHOD, STATUS & DATES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method *</label>
            <div className="relative">
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
              >
                <option value="UPI">UPI</option>
                <option value="GPay">GPay</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Account Transfer">Account Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Split: Cash + Online">Split: Cash + Online</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Invoice Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Status *</label>
            <div className="relative">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
              >
                <option value="Paid">Paid (Full Payment)</option>
                <option value="Partial">Partial (Balance Due)</option>
                <option value="Pending">Pending (Payment Awaited)</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Invoice Payment / Issued Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Payment / Issued Date *
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Balance Due Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Balance Due Date {Number(formData.pendingAmount) > 0 && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* HANDLED BY & REVISION NOTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Billed / Handled By
            </label>
            <input
              type="text"
              value={formData.createdByName}
              onChange={(e) => setFormData({ ...formData, createdByName: e.target.value })}
              placeholder="e.g. Staff Name or Owner"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Revision Notes / Remarks
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Corrected plan fee, package switched"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save &amp; Update Invoice</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditInvoiceModal;

