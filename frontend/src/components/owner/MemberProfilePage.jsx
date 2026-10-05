import React, { useState, useMemo, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
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
  Scale,
  Activity,
  Plus,
  ArrowLeft,
  Coins,
  Heart,
  Droplets,
  Flame,
  Award
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { PayDueModal } from './PayDueModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { generateInvoicePdf, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';

export const MemberProfilePage = ({ initialMemberId, onBackToDashboard, onNavigateTab }) => {
  const {
    members = [],
    invoices = [],
    gymInfo,
    calculateMemberStatus,
    getExpiryDaysDiff,
    fetchMembers,
    fetchInvoices,
    addToast
  } = useGymData();

  // Always refresh freshest data from backend on mount
  useEffect(() => {
    fetchMembers?.();
    fetchInvoices?.();
  }, [fetchMembers, fetchInvoices]);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceViewMode, setInvoiceViewMode] = useState('sheet'); // 'sheet' | 'pdf'
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPayDueOpen, setIsPayDueOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Directly locate THIS particular member from backend records
  const currentMember = useMemo(() => {
    if (!initialMemberId) return members[0] || null;
    const targetStr = String(initialMemberId).trim().toLowerCase();
    const targetDigits = targetStr.replace(/\D/g, '');
    return (
      members.find((m) => {
        if (!m) return false;
        if (String(m.id).toLowerCase() === targetStr) return true;
        if (String(m.userId).toLowerCase() === targetStr) return true;
        if (String(m.user_id).toLowerCase() === targetStr) return true;
        if (targetDigits && String(m.id).replace(/\D/g, '') === targetDigits) return true;
        if (targetDigits && String(m.userId || m.user_id || '').replace(/\D/g, '') === targetDigits) return true;
        if (m.name && m.name.toLowerCase().trim() === targetStr) return true;
        if (targetDigits && m.phone && m.phone.replace(/\D/g, '').endsWith(targetDigits)) return true;
        return false;
      }) || members[0] || null
    );
  }, [members, initialMemberId]);

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

  const effectiveStatus = currentMember && calculateMemberStatus
    ? calculateMemberStatus(currentMember.expiryDate, currentMember.status)
    : (currentMember?.status || 'Active');

  const expiryDiffDays = currentMember && getExpiryDaysDiff
    ? getExpiryDaysDiff(currentMember.expiryDate)
    : null;

  // Member Invoices
  const cleanMemberId = String(currentMember?.id || currentMember?.userId || currentMember?.user_id || '').replace(/\D/g, '');
  const cleanMemberPhone = String(currentMember?.phone || '').replace(/\D/g, '').slice(-10);
  const memberNameClean = (currentMember?.name || '').toLowerCase().trim();

  const memberInvoices = useMemo(() => {
    if (!currentMember) return [];
    return (invoices || []).filter((inv) => {
      const cleanInvMemberId = String(inv.memberId || inv.userId || inv.user_id || '').replace(/\D/g, '');
      if (cleanMemberId && cleanInvMemberId && cleanMemberId === cleanInvMemberId) return true;
      const cleanInvPhone = String(inv.memberPhone || inv.phone || '').replace(/\D/g, '').slice(-10);
      if (cleanMemberPhone && cleanInvPhone && cleanMemberPhone === cleanInvPhone) return true;
      const cleanInvName = (inv.memberName || inv.name || '').toLowerCase().trim();
      if (memberNameClean && cleanInvName && memberNameClean === cleanInvName) return true;
      return false;
    });
  }, [invoices, currentMember, cleanMemberId, cleanMemberPhone, memberNameClean]);

  const totalPaidTillDate = useMemo(() => {
    return memberInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [memberInvoices]);

  // Comprehensive Pending Dues extraction across direct member fields and invoices
  const duesAmount = useMemo(() => {
    if (!currentMember) return 0;
    
    // 1. Direct fields from backend member model
    const directFields = [
      currentMember.duesAmount,
      currentMember.dues_amount,
      currentMember.pendingAmount,
      currentMember.pending_amount,
      currentMember.balanceDue,
      currentMember.balance_due,
      currentMember.dueAmount,
      currentMember.due_amount,
      currentMember.dues,
      currentMember.due,
      currentMember.balance
    ];
    for (const val of directFields) {
      if (val !== undefined && val !== null && val !== '') {
        const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }

    // 2. Cross-reference memberInvoices for any pending amounts
    for (const inv of memberInvoices) {
      const invPending = [
        inv.pendingAmount,
        inv.pending_amount,
        inv.duesAmount,
        inv.dues_amount,
        inv.balanceDue,
        inv.balance_due
      ];
      for (const val of invPending) {
        if (val !== undefined && val !== null && val !== '') {
          const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num) && num > 0) return num;
        }
      }
      if (inv.status === 'Pending' || String(inv.status).toLowerCase() === 'pending') {
        const num = parseFloat(String(inv.pendingAmount || inv.pending_amount || inv.amount || 0).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }

    return 0;
  }, [currentMember, memberInvoices]);

  // Due Date from backend member profile or pending invoice
  const dueDate = useMemo(() => {
    if (currentMember?.dueDate) return currentMember.dueDate;
    if (currentMember?.due_date) return currentMember.due_date;
    const invWithDueDate = memberInvoices.find((i) => i.dueDate || i.due_date);
    return invWithDueDate?.dueDate || invWithDueDate?.due_date || null;
  }, [currentMember, memberInvoices]);

  const handleOpenInvoicePreview = (inv) => {
    setSelectedInvoice(inv);
    try {
      const generated = generateInvoicePdf({
        invoice: inv,
        member: currentMember,
        gymInfo
      });
      const url = generated.getBlobUrl();
      setPdfPreviewUrl(url);
    } catch (e) {
      console.warn('PDF Preview generation failed:', e);
      setPdfPreviewUrl(null);
    }
  };

  const handleDownloadInvoice = (inv) => {
    try {
      const generated = generateInvoicePdf({
        invoice: inv,
        member: currentMember,
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
    shareInvoicePdfToMobile(inv, currentMember, gymInfo, addToast);
  };

  const bmi = currentMember?.weight && currentMember?.height
    ? (Number(currentMember.weight) / Math.pow(Number(currentMember.height) / 100, 2)).toFixed(1)
    : null;

  if (!currentMember) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Member Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Could not find the requested member profile. The record may have been removed or updated.
          </p>
          <button
            type="button"
            onClick={onBackToDashboard || (() => onNavigateTab?.('dashboard'))}
            className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn pb-14 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Page Title (Identical to reference mockup) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard || (() => onNavigateTab?.('dashboard'))}
            className="text-xs font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer mb-1 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Member Profile
          </h1>
        </div>
      </div>

      {/* Main Grid Layout (Left Column 4/12, Right Column 8/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* 1. Member Photo & Quick Action Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center flex flex-col items-center">
            {/* Avatar with soft turquoise/teal background block (as in reference image) */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-emerald-100/70 border-4 border-emerald-50 flex items-center justify-center overflow-hidden mb-4 shadow-sm relative group">
              {currentMember.avatar ? (
                <img
                  src={currentMember.avatar}
                  alt={currentMember.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-4xl flex items-center justify-center">
                  {currentMember.name?.charAt(0) || 'M'}
                </div>
              )}
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {currentMember.name}
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Age: {currentMember.age ? `${currentMember.age}` : 'Not specified'} • {currentMember.gender || 'Member'}
            </p>

            {/* Member Status Badge */}
            <div className="mt-2.5">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 ${
                  effectiveStatus === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : effectiveStatus === 'Expiring Soon'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${effectiveStatus === 'Active' ? 'bg-emerald-500 animate-pulse' : effectiveStatus === 'Expiring Soon' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <span>{effectiveStatus}</span>
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="w-full mt-5 space-y-2">
              {currentMember.phone && (
                <a
                  href={getWhatsAppUrl(currentMember.phone, `Hi ${currentMember.name}, greetings from ${gymInfo?.name || 'ArchFit'}!`)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Chat</span>
                </a>
              )}

              {duesAmount > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsPayDueOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Balance (₹{Number(duesAmount).toLocaleString('en-IN')})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Record Fee</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Detailed Information Card (Matching reference "Information:") */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">
              Information:
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Gender:</span>
                <span className="font-bold text-slate-800">{currentMember.gender || 'Not specified'}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Plan:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                  {currentMember.planName || 'General Plan'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Assigned Coach:</span>
                <span className="font-bold text-slate-800">{currentMember.trainerName || 'Self Guided'}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Height:</span>
                <span className="font-bold text-slate-800">{currentMember.height ? `${currentMember.height} cm` : '--'}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Weight:</span>
                <span className="font-bold text-slate-800">{currentMember.weight ? `${currentMember.weight} kg` : '--'}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">BMI Score:</span>
                <span className="font-bold text-emerald-700 font-mono">{bmi || '--'}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Member ID:</span>
                <span className="font-mono font-bold text-slate-800">{currentMember.id || currentMember.memberId || 'MEM-001'}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Joined Date:</span>
                <span className="font-bold text-slate-800">
                  {formatDate(currentMember.joinDate || currentMember.join_date || currentMember.joiningDate || currentMember.joining_date || currentMember.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Expiry Date:</span>
                <span className={`font-bold ${effectiveStatus === 'Expired' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatDate(currentMember.expiryDate || currentMember.expiry_date)}
                </span>
              </div>

              {/* Real-time Dues Amount from Backend */}
              {duesAmount > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-rose-100 bg-rose-50/60 -mx-2 px-2 py-1 rounded-lg">
                  <span className="text-rose-700 font-bold">Pending Dues:</span>
                  <span className="font-mono font-bold text-rose-600">₹{Number(duesAmount).toLocaleString('en-IN')}</span>
                </div>
              )}

              {/* Due Date if pending amount exists */}
              {dueDate && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Due Date:</span>
                  <span className="font-bold text-slate-800">{formatDate(dueDate)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Phone:</span>
                <span className="font-bold text-slate-800">{currentMember.phone || 'Not provided'}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="font-bold text-slate-800 truncate max-w-[160px]">{currentMember.email || 'Not provided'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Emergency:</span>
                <span className="font-bold text-slate-800">{currentMember.emergencyContact || 'None reported'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* 1. Top 3 Metric Cards (Matching reference Heart Rate, Body Temperature, Glucose) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Metric 1: Total Fees Paid */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-2xs">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Total Fees Paid</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-mono">
                ₹{totalPaidTillDate.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Metric 2: Days Remaining */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-2 shadow-2xs">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Days Remaining</span>
              <div className={`text-2xl font-black tracking-tight mt-1 ${effectiveStatus === 'Expired' ? 'text-rose-600' : 'text-slate-900'}`}>
                {effectiveStatus === 'Expired'
                  ? 'Expired'
                  : expiryDiffDays !== null
                  ? `${expiryDiffDays} days`
                  : 'Active'}
              </div>
            </div>

            {/* Metric 3: Pending Dues (Correctly pulled from backend duesAmount & invoices) */}
            <div className={`rounded-3xl p-5 border shadow-xs flex flex-col items-center justify-center text-center transition-all ${
              duesAmount > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200/80'
            }`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 shadow-2xs ${
                duesAmount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <Coins className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold ${duesAmount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                Pending Dues
              </span>
              <div className={`text-2xl font-black tracking-tight mt-1 font-mono ${
                duesAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                ₹{Number(duesAmount).toLocaleString('en-IN')}
              </div>
              {duesAmount > 0 && dueDate && (
                <span className="text-[10px] text-rose-500 font-semibold mt-1">
                  Due: {formatDate(dueDate)}
                </span>
              )}
            </div>
          </div>

          {/* 2. Program Highlights (Matching reference "Test Reports" row) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">
              Program & Highlights
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Highlight 1: Plan */}
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{currentMember.planName || 'Gym Plan'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
                    {currentMember.durationMonths ? `${currentMember.durationMonths} Months` : 'Membership'}
                  </div>
                </div>
              </div>

              {/* Highlight 2: Coach */}
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{currentMember.trainerName || 'None / Self Guided'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Personal Trainer</div>
                </div>
              </div>

              {/* Highlight 3: Goal */}
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{currentMember.goal || 'General Fitness'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Fitness Objective</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Billing Invoices & Receipts (Matching reference "Prescriptions" with "+ Add a prescription") */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Billing Invoices & Receipts
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {memberInvoices.length} Receipt{memberInvoices.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Dotted Action Button (Matching "+ Add a prescription" in the mockup) */}
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-99"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>+ Record a fee / invoice</span>
            </button>

            {/* Invoices List / Table */}
            {memberInvoices.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {memberInvoices.map((inv, idx) => (
                  <div
                    key={inv.id || idx}
                    onClick={() => handleOpenInvoicePreview(inv)}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 -mx-3 px-3 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          {inv.planName || inv.plan_name || 'Gym Membership'} • #{inv.id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {formatDate(inv.date || inv.created_at)} • Mode: {inv.paymentMethod || inv.payment_method || 'UPI'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-mono font-black text-emerald-700">
                          ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                          {Number(inv.pendingAmount || inv.pending_amount || 0) > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              ₹{Number(inv.pendingAmount || inv.pending_amount).toLocaleString('en-IN')} Due
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            String(inv.status).toLowerCase() === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {inv.status || 'Paid'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenInvoicePreview(inv)}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                        >
                          Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(inv)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(inv)}
                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                          title="Share WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                No invoices recorded yet. Click above to record a fee for {currentMember.name}.
              </div>
            )}
          </div>
        </div>
      </div>

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
        {selectedInvoice && currentMember && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('sheet')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceViewMode === 'sheet'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Tax Sheet View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('pdf')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceViewMode === 'pdf'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Document View</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>

            {invoiceViewMode === 'pdf' && pdfPreviewUrl ? (
              <div className="h-[480px] w-full rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  src={pdfPreviewUrl}
                  title="PDF Invoice Preview"
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{gymInfo?.name || 'Pulse Fitness'}</h4>
                    <p className="text-[11px] text-slate-500">{gymInfo?.address || 'Fitness Center'}</p>
                    {gymInfo?.gstin && <p className="text-[10px] text-slate-400">GSTIN: {gymInfo.gstin}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 text-sm block">#{selectedInvoice.id}</span>
                    <span className="text-[11px] text-slate-500 block">{formatDate(selectedInvoice.date || selectedInvoice.created_at)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To</span>
                    <strong className="text-slate-900 block">{currentMember.name}</strong>
                    <span className="text-[11px] text-slate-500 block">{currentMember.phone || currentMember.email}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                    <strong className="text-slate-900 block">{selectedInvoice.paymentMethod || selectedInvoice.payment_method || 'UPI'}</strong>
                    <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {selectedInvoice.status || 'Paid'}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item / Service</th>
                        <th className="p-2.5 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      <tr>
                        <td className="p-2.5 text-slate-800">{selectedInvoice.planName || selectedInvoice.plan_name || 'Gym Membership'}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-700 font-bold">
                          ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-bold text-sm">
                  <span className="text-slate-800">Total Paid Amount:</span>
                  <span className="font-mono text-emerald-700 text-base">₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* PAY DUE MODAL */}
      <PayDueModal
        isOpen={isPayDueOpen}
        onClose={() => setIsPayDueOpen(false)}
        member={currentMember}
        onSuccess={() => {
          setIsPayDueOpen(false);
          fetchMembers?.();
          fetchInvoices?.();
        }}
      />

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        member={currentMember}
        onSuccess={() => {
          setIsRecordPaymentOpen(false);
          fetchMembers?.();
          fetchInvoices?.();
        }}
      />
    </div>
  );
};
