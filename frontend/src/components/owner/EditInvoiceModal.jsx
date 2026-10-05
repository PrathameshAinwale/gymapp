import React, { useState, useEffect } from 'react';
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
  Tag
} from 'lucide-react';
import {
  hasSqlInjection,
  sanitizeDigits,
  sanitizeDecimal,
  preventNonNumericKey
} from '../../utils/validation';

export const EditInvoiceModal = ({
  isOpen,
  onClose,
  invoice,
  onUpdated
}) => {
  const { updateInvoice, addToast } = useGymData();

  const [formData, setFormData] = useState({
    memberName: '',
    planName: '',
    amount: '',
    totalAmount: '',
    pendingAmount: '',
    date: '',
    dueDate: '',
    paymentMethod: 'UPI',
    status: 'Paid',
    createdByName: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

      setFormData({
        memberName: invoice.memberName || invoice.member_name || '',
        planName: invoice.planName || invoice.plan_name || 'Membership Plan',
        amount: String(invPaid),
        totalAmount: String(invTotal),
        pendingAmount: String(invPending),
        date: invoice.date ? String(invoice.date).split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate ? String(invoice.dueDate).split('T')[0] : '',
        paymentMethod: invoice.paymentMethod || invoice.payment_method || 'UPI',
        status: invoice.status || (invPending > 0 ? 'Pending' : 'Paid'),
        createdByName: invoice.createdByName || invoice.created_by_name || 'Staff',
        notes: invoice.notes || ''
      });
      setErrorMessage('');
    }
  }, [invoice, isOpen]);

  // Auto-sync pending dues when total or paid amount changes
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (hasSqlInjection(formData.memberName) || hasSqlInjection(formData.planName) || hasSqlInjection(formData.notes)) {
      setErrorMessage('Disallowed characters or SQL injection syntax detected.');
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
        planName: formData.planName.trim(),
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Invoice: #${invoice.id || invoice.invoiceNumber || 'INV'}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Alert on Real-time Revenue & Cashflow Sync */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex items-start gap-2.5 shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <span className="font-bold">Real-time Financial Sync:</span> Modifying the amount or payment method will automatically update the <strong>Revenue &amp; Billing Inflow</strong>, member dues, and financial cashflow reports.
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Member Name & Item/Plan Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Member / Customer Name *
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.memberName}
                onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Item / Package Description *
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                placeholder="e.g. Annual Platinum Plan / 12 PT Sessions"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Amount Section (Total Billed vs Amount Paid Inflow vs Balance Due) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Invoice Financials &amp; Revenue Breakdown</span>
            <span className="text-[10px] font-normal text-slate-500">Auto-balanced</span>
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
                Pending Due (₹)
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
        </div>

        {/* Payment Method, Status & Dates */}
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
                <option value="GPay">GPay</option>
                <option value="PhonePe">PhonePe</option>
                <option value="UPI">UPI</option>
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

          {/* Invoice Issued / Payment Date */}
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

          {/* Due Date (Optional or if Pending) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Due Date {Number(formData.pendingAmount) > 0 && <span className="text-rose-500">*</span>}
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

        {/* Handled By / Billed By & Notes */}
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
              Revision Notes / Reason (Optional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Corrected fee amount, cash settlement"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Actions */}
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
