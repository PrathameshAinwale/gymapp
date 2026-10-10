import React, { useState, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Edit2,
  RefreshCw,
  MessageCircle,
  ExternalLink,
  Download,
  FileText,
  Target,
  Dumbbell,
  ShieldCheck,
  Heart,
  Scale,
  Cake,
  Activity,
  X,
  Plus,
  Coins
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { PayDueModal } from './PayDueModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { generateInvoicePdf, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';

export const MemberProfileView = ({
  member,
  isOpen,
  onClose,
  onEditMember,
  onRenewMember
}) => {
  const {
    invoices = [],
    gymInfo,
    calculateMemberStatus,
    getExpiryDaysDiff,
    addToast
  } = useGymData();
  const { currentUser } = useAuth();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPayDueOpen, setIsPayDueOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  if (!isOpen || !member) return null;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(dateStr);
    }
  };

  const effectiveStatus = calculateMemberStatus
    ? calculateMemberStatus(member.expiryDate, member.status)
    : (member.status || 'Active');

  const expiryDiffDays = getExpiryDaysDiff ? getExpiryDaysDiff(member.expiryDate) : null;

  // Calculate Member Invoices
  const cleanMemberId = String(member.id || member.userId || member.user_id || '').replace(/\D/g, '');
  const cleanMemberPhone = String(member.phone || '').replace(/\D/g, '').slice(-10);
  const memberNameClean = (member.name || '').toLowerCase().trim();

  const memberInvoices = (invoices || []).filter((inv) => {
    const cleanInvMemberId = String(inv.memberId || inv.userId || inv.user_id || '').replace(/\D/g, '');
    if (cleanMemberId && cleanInvMemberId && cleanMemberId === cleanInvMemberId) return true;
    const cleanInvPhone = String(inv.memberPhone || inv.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanMemberPhone && cleanInvPhone && cleanMemberPhone === cleanInvPhone) return true;
    if (inv.memberName && inv.memberName.toLowerCase().trim() === memberNameClean) return true;
    return false;
  }).sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));

  const totalPaidTillDate = memberInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  // Calculate Dues
  const duesAmount = (() => {
    const directFields = [
      member.duesAmount,
      member.dues_amount,
      member.balanceDue,
      member.balance_due,
      member.pendingAmount,
      member.pending_amount,
      member.dueAmount,
      member.due_amount
    ];
    for (const val of directFields) {
      if (val !== undefined && val !== null && val !== '') {
        const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    for (const inv of memberInvoices) {
      const p = parseFloat(String(inv.pendingAmount || inv.duesAmount || (inv.status === 'Pending' ? inv.amount : 0)));
      if (!isNaN(p) && p > 0) return p;
    }
    return 0;
  })();

  // PDF Preview Handler
  const handleOpenInvoicePreview = (inv) => {
    setSelectedInvoice(inv);
    try {
      const generated = generateInvoicePdf({
        invoice: inv,
        member,
        gymInfo
      });
      const url = URL.createObjectURL(generated.blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error('Failed to generate PDF preview:', err);
    }
  };

  const handleDownloadPdf = (inv) => {
    try {
      const generated = generateInvoicePdf({
        invoice: inv,
        member,
        gymInfo
      });
      generated.download();
      addToast?.(`Downloaded Invoice #${inv.id}`, 'success');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      addToast?.('Failed to download invoice PDF', 'error');
    }
  };

  const handleShareWhatsApp = (inv) => {
    shareInvoicePdfToMobile(inv, member, gymInfo, addToast);
  };

  // BMI calculation
  const bmi = member.weight && member.height
    ? (Number(member.weight) / Math.pow(Number(member.height) / 100, 2)).toFixed(1)
    : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Member Profile: ${member.name}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 sm:space-y-5 max-h-[82vh] overflow-y-auto pr-1">
          {/* 1. HERO BANNER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-sm border border-emerald-400 shrink-0">
                  {member.name?.charAt(0) || 'M'}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {member.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                      effectiveStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : effectiveStatus === 'Expiring Soon'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : effectiveStatus === 'Expired'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{effectiveStatus}</span>
                  </span>
                </div>

                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap font-medium">
                  <span className="font-mono text-slate-500 font-bold">
                    ID: {member.id || member.memberId || 'MEM-001'}
                  </span>
                  <span>•</span>
                  <span>{member.gender || 'Not specified'}{member.age ? `, ${member.age} yrs` : ''}</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                    {member.planName || 'General Membership'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact Icons */}
            <div className="flex items-center gap-2 shrink-0">
              {member.phone && (
                <a
                  href={getWhatsAppUrl(member.phone, `Hi ${member.name}, greetings from ${gymInfo?.name || 'ArchFit'}!`)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}

              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                  title={`Call ${member.phone}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}

              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                  title={`Email ${member.email}`}
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Print Profile"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. MEMBERSHIP & VALIDITY CARD */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Membership Details & Validity</span>
              </span>
              <span className="text-xs text-slate-500">
                Assigned Coach: <strong className="text-slate-800">{member.trainerName || member.trainer || 'Self Guided'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Plan Name</span>
                <strong className="text-slate-900 font-bold text-xs truncate block">{member.planName || 'Plan'}</strong>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{member.durationMonths ? `${member.durationMonths} Months` : 'Active Pass'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Joining Date</span>
                <strong className="text-slate-900 font-bold text-xs block">
                  {formatDate(member.joinDate || member.join_date || member.joiningDate || member.joining_date || member.createdAt)}
                </strong>
                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Enrolled Member</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Valid Until</span>
                <strong className={`font-bold text-xs block ${effectiveStatus === 'Expired' ? 'text-rose-600' : effectiveStatus === 'Expiring Soon' ? 'text-amber-600' : 'text-slate-900'}`}>
                  {formatDate(member.expiryDate || member.expiry_date)}
                </strong>
                <span className={`text-[10px] font-semibold mt-0.5 block ${effectiveStatus === 'Expired' ? 'text-rose-600' : effectiveStatus === 'Expiring Soon' ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {effectiveStatus === 'Expired'
                    ? (expiryDiffDays !== null ? `Expired ${Math.abs(expiryDiffDays)}d ago` : 'Plan Expired')
                    : effectiveStatus === 'Expiring Soon'
                    ? (expiryDiffDays !== null ? `Expires in ${expiryDiffDays}d` : 'Expiring Soon')
                    : (expiryDiffDays !== null ? `${expiryDiffDays} Days Left` : 'Active')}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${duesAmount > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200/70'}`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Outstanding Balance</span>
                <strong className={`font-mono font-black text-sm block ${duesAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{Number(duesAmount).toLocaleString('en-IN')}
                </strong>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {duesAmount > 0 ? (member.dueDate ? `Due: ${member.dueDate}` : 'Pending Due') : 'All Dues Cleared'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. INVOICES & BILLING HISTORY TABLE */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    Invoices & Receipts History ({memberInvoices.length})
                  </h4>
                  <p className="text-[10px] text-slate-500">Official billing records for this member</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Total Paid: ₹{totalPaidTillDate.toLocaleString('en-IN')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Record Fee</span>
                </button>
              </div>
            </div>

            {memberInvoices.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description / Plan</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {memberInvoices.map((inv, idx) => (
                        <tr
                          key={inv.id || idx}
                          onClick={() => handleOpenInvoicePreview(inv)}
                          className="hover:bg-emerald-50/60 transition-colors cursor-pointer group"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 group-hover:text-emerald-800">
                            {inv.id}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(inv.date || inv.created_at)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{inv.planName || inv.plan_name || 'Membership Pass'}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">
                              {inv.paymentMethod || inv.payment_method || 'UPI'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> {inv.status || 'Paid'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingInvoice(inv);
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
                                title="Edit invoice details and amount"
                              >
                                <Edit2 className="w-3 h-3 text-indigo-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInvoicePreview(inv);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                              >
                                Receipt
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                <Receipt className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                <p className="font-semibold text-slate-700">No invoices recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Billing receipts issued for this member will automatically show here.</p>
              </div>
            )}
          </div>

          {/* 4. CONTACT & EMERGENCY INFORMATION */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>Contact & Emergency Information</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Phone Number</span>
                <strong className="text-slate-900 font-semibold text-xs block">{member.phone || 'Not provided'}</strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email Address</span>
                <strong className="text-slate-900 font-semibold text-xs break-all block">{member.email || 'Not provided'}</strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Emergency Contact</span>
                <strong className="text-slate-900 font-semibold text-xs block">{member.emergencyContact || 'None reported'}</strong>
              </div>
            </div>
          </div>

          {/* 5. PHYSICAL PROFILE & HEALTH */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>Physical Profile & Health Notes</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Weight</span>
                <div className="text-base font-black text-slate-900 mt-0.5">{member.weight ? `${member.weight} kg` : '--'}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Weight</span>
                <div className="text-base font-black text-emerald-600 mt-0.5">{member.targetWeight ? `${member.targetWeight} kg` : '--'}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Height</span>
                <div className="text-base font-black text-slate-900 mt-0.5">{member.height ? `${member.height} cm` : '--'}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">BMI Score</span>
                <div className="text-base font-black text-slate-900 mt-0.5">{bmi || '--'}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fitness Objective
              </span>
              <p className="text-slate-900 font-semibold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{member.goal || 'General Fitness & Conditioning'}</span>
              </p>

              {member.medicalNotes && member.medicalNotes !== 'None' && (
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Medical Notes & Considerations
                  </span>
                  <p className="text-amber-900 mt-0.5">{member.medicalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 6. BOTTOM ACTIONS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {duesAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPayDueOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay Balance (₹{Number(duesAmount).toLocaleString('en-IN')})</span>
                </button>
              )}

              {onRenewMember && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRenewMember(member);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renew Membership</span>
                </button>
              )}

              {onEditMember && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditMember(member);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* INVOICE RECEIPT / PDF MODAL */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => {
          setSelectedInvoice(null);
          if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }}
        title={selectedInvoice ? `Tax Invoice & Receipt: #${selectedInvoice.id?.toUpperCase()}` : 'Tax Invoice'}
        maxWidth="max-w-3xl"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-50/90 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    Tax Invoice & Receipt
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Official gym payment voucher & tax summary
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                {pdfPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(pdfPreviewUrl, '_blank')}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 cursor-pointer active:scale-95 transition-all shadow-2xs"
                    title="Open PDF in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{gymInfo?.name || 'ArchFit Athletic Club'}</h3>
                    <p className="text-xs text-slate-500">{gymInfo?.address || 'Mumbai, Maharashtra'}</p>
                    <p className="text-[11px] text-slate-400 font-mono">GSTIN: {gymInfo?.gstin || '27AAPCP1234F1Z8'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedInvoice.id}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">{formatDate(selectedInvoice.date || selectedInvoice.created_at)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To</span>
                    <strong className="text-slate-900 font-bold text-sm">{member.name}</strong>
                    <div className="text-slate-600">{member.phone}</div>
                    <div className="text-slate-600">{member.email}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                    <strong className="text-slate-800 font-semibold">{selectedInvoice.paymentMethod || 'UPI'}</strong>
                    <div className="text-[10px] text-emerald-700 font-bold mt-1">Status: Paid (Settled)</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">
                          {selectedInvoice.planName || 'Gym Membership Subscription'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td className="p-3">Total Paid Amount:</td>
                        <td className="p-3 text-right font-mono text-emerald-700 text-sm">
                          ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
          </div>
        )}
      </Modal>

      {/* PAY DUE MODAL */}
      <PayDueModal
        isOpen={isPayDueOpen}
        onClose={() => setIsPayDueOpen(false)}
        member={member}
      />

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        preselectedMemberId={member.id}
      />

      {/* EDIT INVOICE MODAL */}
      <EditInvoiceModal
        isOpen={Boolean(editingInvoice)}
        invoice={editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onUpdated={(updated) => {
          if (selectedInvoice && (selectedInvoice.id === updated.id || selectedInvoice.numericId === updated.numericId)) {
            setSelectedInvoice((prev) => ({ ...prev, ...updated }));
          }
        }}
      />
    </>
  );
};
