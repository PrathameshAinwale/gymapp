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
  Zap,
  Trash2,
  QrCode
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { PayDueModal } from './PayDueModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { getWhatsAppUrl, getGymName } from '../../utils/whatsapp';
import { generateInvoicePdf, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';
import { compareInvoicesDesc } from '../../utils/searchUtils';
import { api } from '../../services/api';
import { normalizePackageType } from '../common/MembershipPlanModal';

const isFeeOrBalanceItem = (item) => {
  if (!item) return false;
  const pkgType = String(item.packageType || item.package_type || item.category || '').toLowerCase();
  const name = String(item.planName || item.name || item.title || '').toLowerCase();
  const combo = `${pkgType} ${name}`;
  return (
    pkgType === 'due payment' ||
    pkgType === 'fee payment' ||
    pkgType === 'membership fee' ||
    combo.includes('balance due') ||
    combo.includes('due payment') ||
    combo.includes('dues payment') ||
    combo.includes('fee collection') ||
    combo.includes('membership fee package')
  );
};

export const MemberProfilePage = ({
  initialMemberId,
  onBackToDashboard,
  onNavigateTab,
  onNavigateToCreateInvoice,
  onNavigateToEditInvoice
}) => {
  const {
    members = [],
    invoices = [],
    gymInfo,
    calculateMemberStatus,
    getExpiryDaysDiff,
    fetchMembers,
    fetchInvoices,
    deleteInvoice,
    addToast
  } = useGymData();

  // Always refresh freshest data from backend on mount
  useEffect(() => {
    fetchMembers?.();
    fetchInvoices?.();
  }, [fetchMembers, fetchInvoices]);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPayDueOpen, setIsPayDueOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsDeletingInvoice(true);
      await deleteInvoice(invoiceToDelete.id || invoiceToDelete.invoiceNumber);
      if (selectedInvoice && (selectedInvoice.id === invoiceToDelete.id || selectedInvoice.invoiceNumber === invoiceToDelete.invoiceNumber)) {
        setSelectedInvoice(null);
      }
      setInvoiceToDelete(null);
      fetchMembers?.();
      fetchInvoices?.();
    } catch (err) {
      // toast handled in deleteInvoice
    } finally {
      setIsDeletingInvoice(false);
    }
  };

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

  // Fetch full member profile with activePlans from backend
  useEffect(() => {
    let isMounted = true;
    const loadFullMember = async () => {
      const idToFetch = currentMember?.userId || currentMember?.user_id || cleanMemberId;
      if (!idToFetch || !api.members?.get) return;
      try {
        const res = await api.members.get(idToFetch);
        if (isMounted && res?.data) {
          setProfileData(res.data);
        }
      } catch (err) {
        // Fallback gracefully to list/local state
      }
    };
    loadFullMember();
    return () => { isMounted = false; };
  }, [cleanMemberId, currentMember?.userId, currentMember?.user_id]);

  const memberInvoices = useMemo(() => {
    if (!currentMember) return [];
    return (invoices || [])
      .filter((inv) => {
        const cleanInvMemberId = String(inv.memberId || inv.userId || inv.user_id || '').replace(/\D/g, '');
        if (cleanMemberId && cleanInvMemberId) return cleanMemberId === cleanInvMemberId;
        const cleanInvPhone = String(inv.memberPhone || inv.phone || '').replace(/\D/g, '').slice(-10);
        if (cleanMemberPhone && cleanInvPhone) return cleanMemberPhone === cleanInvPhone;
        const cleanInvName = (inv.memberName || inv.name || '').toLowerCase().trim();
        if (!cleanInvMemberId && !cleanInvPhone && memberNameClean && cleanInvName) return memberNameClean === cleanInvName;
        return false;
      })
      .sort(compareInvoicesDesc);
  }, [invoices, currentMember, cleanMemberId, cleanMemberPhone, memberNameClean]);

  const totalPaidTillDate = useMemo(() => {
    return memberInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [memberInvoices]);

  // Subscriptions & Packages Breakdown (Active by package type, Upcoming chained, Expired)
  const plansBreakdown = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetMember = profileData || currentMember;

    const memberStatus = String(targetMember?.status || '').toLowerCase();
    const expiryStr = (targetMember?.expiryDate || targetMember?.expiry_date || '').split('T')[0];
    const isMemberExpired = memberStatus === 'expired' || (expiryStr && expiryStr < todayStr);

    // If backend provided pre-computed activePlans on member object
    if (targetMember?.activePlans?.length > 0 || targetMember?.upcomingPlans?.length > 0 || targetMember?.expiredPlans?.length > 0) {
      let active = (targetMember.activePlans || [])
        .filter(p => !isFeeOrBalanceItem(p) && p.status !== 'Transferred' && p.status !== 'Expired');
      const upcoming = [...(targetMember.upcomingPlans || [])].filter(p => !isFeeOrBalanceItem(p));
      const expired = [...(targetMember.expiredPlans || [])].filter(p => !isFeeOrBalanceItem(p));

      // If member overall status is Expired, any Gym-Cardio or expired/transferred plan cannot be active
      if (isMemberExpired) {
        const remainingActive = [];
        active.forEach(p => {
          if (p.packageType === 'Gym-Cardio' || p.endDate < todayStr || (expiryStr && p.endDate <= expiryStr)) {
            expired.push({ ...p, status: p.status === 'Transferred' ? 'Transferred' : 'Expired' });
          } else {
            remainingActive.push(p);
          }
        });
        active = remainingActive;
      }

      return {
        active,
        upcoming,
        expired
      };
    }

    const activeMap = {};
    const upcoming = [];
    const expired = [];

    (memberInvoices || []).forEach((inv) => {
      if (inv.status === 'Cancelled' || inv.status === 'Refunded' || inv.status === 'Transferred' || isFeeOrBalanceItem(inv)) return;

      const itemsToProcess = Array.isArray(inv.packages) && inv.packages.length > 0
        ? inv.packages
        : [inv];

      itemsToProcess.forEach((itemRow) => {
        if (itemRow.status === 'Transferred' || itemRow.status === 'Cancelled' || itemRow.status === 'Refunded' || isFeeOrBalanceItem(itemRow)) return;
        let rawType = itemRow.packageType || itemRow.package_type || itemRow.category || inv.packageType || inv.package_type || inv.category;
        const itemName = itemRow.name || itemRow.planName || itemRow.plan_name || itemRow.title || inv.planName || inv.plan_name || inv.title || '';
        if (!rawType && itemName) {
          const combo = itemName.toLowerCase();
          if (combo.includes('pt') || combo.includes('personal training')) {
            rawType = 'Personal Training';
          } else if (combo.includes('massage') || combo.includes('recovery') || combo.includes('spa')) {
            rawType = 'Massage';
          }
        }
        const type = normalizePackageType(rawType || 'Gym-Cardio');

        const startStr = (itemRow.startDate || itemRow.start_date || inv.startDate || inv.start_date || inv.date || '').split('T')[0] || todayStr;
        let endStr = (itemRow.endDate || itemRow.end_date || itemRow.expiryDate || itemRow.expiry_date || inv.endDate || inv.end_date || inv.expiryDate || inv.expiry_date || '').split('T')[0];

        if (!endStr && startStr) {
          try {
            const d = new Date(startStr);
            d.setDate(d.getDate() + 30);
            endStr = d.toISOString().split('T')[0];
          } catch (_) {}
        }
        if (!endStr) return;

        const planName = itemName || `${type} Package`;
        const planItem = {
          packageType: type,
          planName,
          startDate: startStr,
          endDate: endStr,
          invoiceNumber: inv.id || inv.invoiceNumber,
          status: 'Active'
        };

        if (startStr && startStr > todayStr) {
          planItem.status = 'Upcoming';
          upcoming.push(planItem);
        } else if (endStr < todayStr || (isMemberExpired && (type === 'Gym-Cardio' || (expiryStr && endStr <= expiryStr)))) {
          planItem.status = 'Expired';
          expired.push(planItem);
        } else {
          planItem.status = 'Active';
          if (!activeMap[type] || endStr > activeMap[type].endDate) {
            activeMap[type] = planItem;
          }
        }
      });
    });

    // Fallback: ONLY if member has NO invoice plans at all, inspect profile fields
    const hasAnyPlans = Object.keys(activeMap).length > 0 || upcoming.length > 0 || expired.length > 0;
    if (!hasAnyPlans && !activeMap['Gym-Cardio'] && (targetMember?.expiryDate || targetMember?.expiry_date)) {
      const exp = (targetMember.expiryDate || targetMember.expiry_date).split('T')[0];
      const start = (targetMember.startDate || targetMember.start_date || targetMember.joinDate || targetMember.join_date || todayStr).split('T')[0];
      const isUpcoming = start > todayStr;
      const fallbackItem = {
        packageType: 'Gym-Cardio',
        planName: targetMember.planName || targetMember.plan_name || 'Gym Membership',
        startDate: start,
        endDate: exp,
        status: isUpcoming ? 'Upcoming' : ((exp >= todayStr && !isMemberExpired) ? 'Active' : 'Expired')
      };
      if (isUpcoming) {
        upcoming.push(fallbackItem);
      } else if (exp >= todayStr && !isMemberExpired) {
        activeMap['Gym-Cardio'] = fallbackItem;
      } else {
        expired.push(fallbackItem);
      }
    }

    return {
      active: Object.values(activeMap),
      upcoming,
      expired
    };
  }, [profileData, currentMember, memberInvoices]);

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
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <h2 className="text-base font-bold text-slate-800">Member Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-3.5">
            Could not find the requested member profile. The record may have been removed or updated.
          </p>
          <button
            type="button"
            onClick={onBackToDashboard || (() => onNavigateTab?.('dashboard'))}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 sm:space-y-4 animate-fadeIn pb-14 w-full max-w-6xl mx-auto">
      {/* Top Header Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/90 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard || (() => onNavigateTab?.('dashboard'))}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-normal truncate">
              Member Profile: {currentMember.name || 'Member Details'}
            </h1>
          </div>
        </div>

        {/* Quick Actions in Header */}
        <div className="flex items-center gap-1.5 shrink-0">
          {currentMember.phone && (
            <a
              href={getWhatsAppUrl(currentMember.phone, `Hi ${currentMember.name}, greetings from ${getGymName(gymInfo?.name)}!`)}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-2.5 rounded-lg sm:rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-2xs font-semibold flex items-center gap-1 transition-all active:scale-95"
              title="WhatsApp Chat"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}

          {duesAmount > 0 ? (
            <button
              type="button"
              onClick={() => setIsPayDueOpen(true)}
              className="h-8 px-2.5 rounded-lg sm:rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-2xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Due (₹{Number(duesAmount).toLocaleString('en-IN')})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onNavigateToCreateInvoice) {
                  onNavigateToCreateInvoice(currentMember);
                } else if (onNavigateTab) {
                  onNavigateTab('create-invoice');
                } else {
                  setIsRecordPaymentOpen(true);
                }
              }}
              className="h-8 px-2.5 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-2xs font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Unified Member Identity Hero Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Avatar */}
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-sm sm:text-base font-bold shadow-sm shadow-emerald-500/20 shrink-0 overflow-hidden">
              {currentMember.avatar ? (
                <img src={currentMember.avatar} alt={currentMember.name} className="w-full h-full object-cover" />
              ) : (
                currentMember.name?.charAt(0) || 'M'
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {currentMember.name}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-2xs font-bold border inline-flex items-center gap-1 shrink-0 ${
                    effectiveStatus === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : effectiveStatus === 'Expiring Soon'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : effectiveStatus === 'Frozen' || effectiveStatus === 'Frozen (Paused)'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : effectiveStatus === 'Unassigned'
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    effectiveStatus === 'Active'
                      ? 'bg-emerald-500 animate-pulse'
                      : effectiveStatus === 'Expiring Soon'
                      ? 'bg-amber-500'
                      : effectiveStatus === 'Frozen' || effectiveStatus === 'Frozen (Paused)'
                      ? 'bg-sky-500'
                      : 'bg-rose-500'
                  }`} />
                  <span>{effectiveStatus}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-2xs text-slate-500 truncate mt-0.5 flex-wrap">
                <span className="font-mono text-slate-600 font-semibold">ID: #{currentMember.id || currentMember.memberId}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">{currentMember.phone || 'No phone'}</span>
                {currentMember.age && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>Age: {currentMember.age}</span>
                  </>
                )}
                {currentMember.gender && currentMember.gender !== 'Unspecified' && currentMember.gender !== 'Not specified' && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{currentMember.gender}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dues Status Pill on Right */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {duesAmount > 0 ? (
              <div className="px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-2xs font-bold text-rose-700 flex items-center gap-1">
                <Coins className="w-3 h-3 text-rose-600" />
                <span>₹{Number(duesAmount).toLocaleString('en-IN')} Due</span>
                {dueDate && <span className="text-rose-500 font-normal">({formatDate(dueDate)})</span>}
              </div>
            ) : (
              <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-2xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>All Fees Cleared</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Compact 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Metric 1: Total Fees Paid */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-2xs font-semibold uppercase text-slate-400 truncate">Total Paid</span>
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 text-xs sm:text-sm font-bold font-mono text-slate-900 truncate">
            ₹{totalPaidTillDate.toLocaleString('en-IN')}
          </div>
          <div className="text-2xs text-slate-500 truncate mt-0.5">
            {memberInvoices.length} receipt{memberInvoices.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Metric 2: Days Remaining */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-2xs font-semibold uppercase text-slate-400 truncate">Validity</span>
            <div className="p-1 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`mt-1 text-xs sm:text-sm font-bold truncate ${effectiveStatus === 'Expired' ? 'text-rose-600' : 'text-slate-900'}`}>
            {effectiveStatus === 'Expired' ? 'Expired' : expiryDiffDays !== null ? `${expiryDiffDays} Days` : 'Active'}
          </div>
          <div className="text-2xs text-slate-500 truncate mt-0.5">
            {effectiveStatus === 'Expired' ? 'Plan Overdue' : `Exp: ${formatDate(currentMember.expiryDate || currentMember.expiry_date)}`}
          </div>
        </div>

        {/* Metric 3: Pending Dues */}
        <div className={`rounded-xl p-2.5 sm:p-3 border shadow-2xs transition-all ${
          duesAmount > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className={`text-2xs font-semibold uppercase truncate ${duesAmount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
              Pending Dues
            </span>
            <div className={`p-1 rounded-lg shrink-0 ${duesAmount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`mt-1 text-xs sm:text-sm font-bold font-mono truncate ${duesAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            ₹{Number(duesAmount).toLocaleString('en-IN')}
          </div>
          <div className="text-2xs text-slate-500 truncate mt-0.5">
            {duesAmount > 0 ? (dueDate ? `Due: ${formatDate(dueDate)}` : 'Payment Due') : 'No balance due'}
          </div>
        </div>

        {/* Metric 4: BMI & Biometrics */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-2xs font-semibold uppercase text-slate-400 truncate">BMI Index</span>
            <div className="p-1 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 text-xs sm:text-sm font-bold text-slate-900 truncate">
            {bmi ? `${bmi} BMI` : '—'}
          </div>
          <div className="text-2xs text-slate-500 truncate mt-0.5">
            {currentMember.weight ? `${currentMember.weight} kg` : 'Weight —'} • {currentMember.height ? `${currentMember.height} cm` : 'Height —'}
          </div>
        </div>
      </div>

      {/* 3. Main Content Split (Left: Member Info & Highlights, Right: Subscriptions & Invoices) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        
        {/* ================= LEFT COLUMN: Member Details & Information ================= */}
        <div className="lg:col-span-4 space-y-2.5 sm:space-y-4">
          
          {/* Member Information Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
                Member Information
              </h3>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Plan:</span>
                <span className="font-bold text-slate-800 truncate max-w-[170px]">
                  {currentMember.planName || 'Gym Membership'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Assigned Coach:</span>
                <span className="font-bold text-slate-800 truncate max-w-[170px]">
                  {currentMember.trainerName && currentMember.trainerName !== 'None / Self Guided' && currentMember.trainerName !== 'Self Guided' && currentMember.trainerName !== 'None'
                    ? currentMember.trainerName
                    : 'Self Guided'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Primary Goal:</span>
                <span className="font-bold text-slate-800 truncate max-w-[170px]">
                  {currentMember.goal || 'General Fitness'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Joined Date:</span>
                <span className="font-semibold text-slate-800">
                  {currentMember.joinDate || currentMember.join_date ? formatDate(currentMember.joinDate || currentMember.join_date) : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Expiry Date:</span>
                {effectiveStatus === 'Expired' || String(currentMember.status || '').toLowerCase() === 'expired' ? (
                  <span className="font-bold text-rose-600">Expired</span>
                ) : effectiveStatus === 'Unassigned' || (!currentMember.expiryDate && !currentMember.expiry_date) ? (
                  <span className="font-medium text-slate-400 italic">No Active Plan</span>
                ) : (
                  <span className="font-semibold text-slate-800">
                    {formatDate(currentMember.expiryDate || currentMember.expiry_date)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Phone:</span>
                <span className="font-semibold text-slate-800">{currentMember.phone || '—'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                  {currentMember.email && !currentMember.email.endsWith('@gym.local') && currentMember.email !== 'Not provided' ? currentMember.email : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Emergency:</span>
                <span className="font-semibold text-slate-800">
                  {currentMember.emergencyContact && currentMember.emergencyContact !== 'N/A' && currentMember.emergencyContact !== 'None' ? currentMember.emergencyContact : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 font-medium">Digital Pass:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-2xs">
                  {currentMember.qrPassCode || currentMember.qr_pass_code || `PF-MEM-${String(currentMember.id || '0000').slice(-4)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Subscriptions & Invoices ================= */}
        <div className="lg:col-span-8 space-y-2.5 sm:space-y-4">
          
          {/* Active Subscriptions & Packages Breakdown */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Active Subscriptions & Packages</span>
              </h3>
              <span className="text-2xs font-bold text-slate-400">
                {plansBreakdown.active.length} Active Plan{plansBreakdown.active.length === 1 ? '' : 's'}
              </span>
            </div>

            {plansBreakdown.active.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {plansBreakdown.active.map((pkg, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate">{pkg.packageType}</span>
                        <span className={`px-1.5 py-0.2 rounded text-2xs font-bold shrink-0 border ${
                          pkg.status === 'Frozen'
                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {pkg.status || 'Active'}
                        </span>
                      </div>
                      <span className="text-2xs text-slate-500 block truncate">{pkg.planName}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xs text-emerald-600 font-semibold block">Duration</span>
                      <span className="font-bold font-mono text-emerald-900 text-2xs">
                        {formatDate(pkg.startDate)} – {formatDate(pkg.endDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                No active membership plans recorded for this member.
              </div>
            )}

            {/* Upcoming Subscriptions */}
            {plansBreakdown.upcoming.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-2xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-600" />
                  <span>Upcoming (Chained) Subscriptions</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plansBreakdown.upcoming.map((pkg, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-200 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{pkg.packageType}</span>
                          <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded text-2xs font-bold">Upcoming</span>
                        </div>
                        <span className="text-2xs text-slate-500 block truncate">{pkg.planName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-2xs text-sky-600 font-semibold block">Starts & Ends</span>
                        <span className="font-bold font-mono text-sky-900 text-2xs">
                          {formatDate(pkg.startDate)} – {formatDate(pkg.endDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Plans */}
            {plansBreakdown.expired.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-2xs font-bold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Past Plans ({plansBreakdown.expired.length})</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {plansBreakdown.expired.slice(0, 3).map((pkg, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-2xs opacity-75">
                      <span className="font-medium text-slate-700 truncate pr-2">{pkg.packageType}: {pkg.planName}</span>
                      <span className="font-mono text-slate-400 shrink-0">{formatDate(pkg.endDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Billing Invoices & Receipts */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Billing Invoices & Receipts</span>
              </h3>
              <span className="text-2xs font-bold text-slate-400">
                {memberInvoices.length} Receipt{memberInvoices.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Compact Action Button */}
            <button
              type="button"
              onClick={() => {
                if (onNavigateToCreateInvoice) {
                  onNavigateToCreateInvoice(currentMember);
                } else if (onNavigateTab) {
                  onNavigateTab('create-invoice');
                } else {
                  setIsRecordPaymentOpen(true);
                }
              }}
              className="w-full h-9 px-3 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-99"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Record a fee / invoice</span>
            </button>

            {/* Invoices List */}
            {memberInvoices.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {memberInvoices.map((inv, idx) => (
                  <div
                    key={inv.id || idx}
                    onClick={() => handleOpenInvoicePreview(inv)}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 -mx-1.5 px-1.5 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                          {inv.planName || inv.plan_name || 'Gym Membership'} • #{inv.id}
                        </div>
                        <div className="text-2xs text-slate-400 font-medium truncate">
                          {formatDate(inv.date || inv.created_at)} • Mode: {inv.paymentMethod || inv.payment_method || 'UPI'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-mono font-bold text-emerald-700">
                          ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 justify-end">
                          {Number(inv.pendingAmount || inv.pending_amount || 0) > 0 && (
                            <span className="text-2xs font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                              ₹{Number(inv.pendingAmount || inv.pending_amount).toLocaleString('en-IN')} Due
                            </span>
                          )}
                          <span className={`text-2xs font-bold px-1.5 py-0.2 rounded ${
                            String(inv.status).toLowerCase() === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {inv.status || 'Paid'}
                          </span>
                        </div>
                      </div>

                      {/* Compact Action Buttons */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            const payload = { ...inv, member: currentMember, currentMember };
                            if (onNavigateToEditInvoice) {
                              onNavigateToEditInvoice(payload);
                            } else {
                              setEditingInvoice(payload);
                            }
                          }}
                          className="h-7.5 px-2 text-2xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1 active:scale-95"
                          title="Edit invoice"
                        >
                          <Edit2 className="w-3 h-3 text-indigo-600" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenInvoicePreview(inv)}
                          className="h-7.5 px-2 text-2xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors shadow-2xs flex items-center active:scale-95"
                        >
                          Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(inv)}
                          className="w-7.5 h-7.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors flex items-center justify-center active:scale-95"
                          title="Download PDF"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(inv)}
                          className="w-7.5 h-7.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer transition-colors flex items-center justify-center active:scale-95"
                          title="Share WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
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
        title={selectedInvoice ? `Invoice & Receipt: #${selectedInvoice.id?.toUpperCase()}` : 'Tax Invoice'}
        maxWidth="max-w-3xl"
      >
        {selectedInvoice && currentMember && (
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    Tax Invoice & Receipt
                  </div>
                  <div className="text-2xs text-slate-500 truncate">
                    Official gym payment voucher & tax summary
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const payload = { ...selectedInvoice, member: currentMember, currentMember };
                    if (onNavigateToEditInvoice) {
                      setSelectedInvoice(null);
                      onNavigateToEditInvoice(payload);
                    } else {
                      setEditingInvoice(payload);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-2xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="Edit invoice"
                >
                  <Edit2 className="w-3 h-3 text-indigo-600" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-2xs font-semibold shadow-2xs transition-colors cursor-pointer active:scale-95"
                >
                  <Download className="w-3 h-3" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedInvoice)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-2xs font-semibold shadow-2xs transition-colors cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-2xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="Print Invoice"
                >
                  <Printer className="w-3 h-3 text-slate-600" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">{getGymName(gymInfo?.name) || 'Fitness Club'}</h4>
                  <p className="text-2xs text-slate-500">{gymInfo?.address || 'Fitness Center'}</p>
                  {gymInfo?.gstin && <p className="text-2xs text-slate-400">GSTIN: {gymInfo.gstin}</p>}
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm block">#{selectedInvoice.id}</span>
                  <span className="text-2xs text-slate-500 block">{formatDate(selectedInvoice.date || selectedInvoice.created_at)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-slate-700 bg-slate-50 p-2.5 rounded-lg">
                <div>
                  <span className="text-2xs uppercase font-semibold text-slate-400 block">Billed To</span>
                  <strong className="text-slate-900 block truncate">{currentMember.name}</strong>
                  <span className="text-2xs text-slate-500 block truncate">{currentMember.phone || currentMember.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xs uppercase font-semibold text-slate-400 block">Payment Mode</span>
                  <strong className="text-slate-900 block">{selectedInvoice.paymentMethod || selectedInvoice.payment_method || 'UPI'}</strong>
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedInvoice.status || 'Paid'}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-2xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2">Item / Service</th>
                      <th className="p-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-xs">
                    <tr>
                      <td className="p-2 text-slate-800">{selectedInvoice.planName || selectedInvoice.plan_name || 'Gym Membership'}</td>
                      <td className="p-2 text-right font-mono text-emerald-700 font-medium">
                        ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-bold text-xs sm:text-sm">
                <span className="text-slate-800">Total Paid Amount:</span>
                <span className="font-mono text-emerald-700 text-sm sm:text-base">₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT INVOICE MODAL */}
      <EditInvoiceModal
        isOpen={Boolean(editingInvoice)}
        invoice={editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onUpdated={(updated) => {
          if (selectedInvoice && (selectedInvoice.id === updated.id || selectedInvoice.numericId === updated.numericId)) {
            setSelectedInvoice((prev) => ({ ...prev, ...updated }));
          }
          fetchMembers?.();
          fetchInvoices?.();
        }}
      />

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

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(invoiceToDelete)}
        title="Delete Invoice Record"
        message={`Are you sure you want to permanently delete Invoice #${invoiceToDelete?.id || invoiceToDelete?.invoiceNumber}? This action cannot be undone.`}
        onConfirm={handleConfirmDeleteInvoice}
        onCancel={() => setInvoiceToDelete(null)}
        isDeleting={isDeletingInvoice}
      />
    </div>
  );
};
