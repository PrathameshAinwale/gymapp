import React, { useState, useEffect, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { Modal } from '../common/Modal';
import MemberSearchSelect from '../common/MemberSearchSelect';
import { api } from '../../services/api';
import { generateInvoicePdf, downloadPdfBlob, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';
import {
  hasSqlInjection,
  sanitizeDecimal,
  sanitizeDigits,
  preventNonNumericKey
} from '../../utils/validation';
import {
  IndianRupee,
  Calendar,
  CreditCard,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
  Dumbbell,
  Percent,
  UserCheck,
  HeartHandshake,
  Download,
  MessageCircle,
  AlertCircle,
  Plus,
  Check,
  Receipt,
  RotateCw
} from 'lucide-react';

export const RecordPaymentModal = ({
  isOpen,
  onClose,
  initialMember = null,
  initialMemberId = null
}) => {
  const {
    members = [],
    plans = [],
    ptPlans = [],
    recoveryPlans = [],
    trainers = [],
    gymInfo,
    fetchMembers,
    fetchPlans,
    fetchPtPlans,
    fetchRecoveryPlans,
    fetchTrainers,
    fetchInvoices,
    fetchDashboardStats,
    updateMember,
    addCommissionRecord,
    recordPayment,
    addToast
  } = useGymData();

  // Selected Member
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // 1. Base Membership Plan State
  const [includeBasePlan, setIncludeBasePlan] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [basePlanPrice, setBasePlanPrice] = useState('');
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [membershipEndDate, setMembershipEndDate] = useState('');
  const [isManualEndDate, setIsManualEndDate] = useState(false);

  // 2. Personal Training (PT) Package State
  const [includePtPackage, setIncludePtPackage] = useState(false);
  const [selectedPtPlanId, setSelectedPtPlanId] = useState('');
  const [ptSessions, setPtSessions] = useState(12);
  const [ptPrice, setPtPrice] = useState(3000);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [commissionType, setCommissionType] = useState('percent'); // 'percent' | 'fixed'
  const [ptCommissionPercent, setPtCommissionPercent] = useState(20);
  const [ptFixedCommission, setPtFixedCommission] = useState(1000);

  // 3. Recovery & Wellness Package State
  const [includeRecoveryPackage, setIncludeRecoveryPackage] = useState(false);
  const [selectedRecoveryPlanId, setSelectedRecoveryPlanId] = useState('');
  const [recoveryPrice, setRecoveryPrice] = useState(799);
  const [discountAmount, setDiscountAmount] = useState('');

  // 4. Payment Settlement & Date
  const [paymentDate, setPaymentDate] = useState('');
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [customPaidAmount, setCustomPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitOnlineAmount, setSplitOnlineAmount] = useState('');
  const [splitOnlineProvider, setSplitOnlineProvider] = useState('GPay'); // 'GPay' | 'PhonePe' | 'Account' | 'Other'
  const [splitOnlineProviderOther, setSplitOnlineProviderOther] = useState('');
  const [notes, setNotes] = useState('');

  // 5. Submission & Receipt States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedInvoiceData, setCompletedInvoiceData] = useState(null);

  const paymentMethods = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Split (Cash+Online)'];

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  const addMonthsPreservingDay = (baseDate, monthsToAdd) => {
    const target = new Date(baseDate.getTime());
    const originalDay = target.getDate();
    target.setDate(1);
    target.setMonth(target.getMonth() + monthsToAdd);
    const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(originalDay, daysInTargetMonth));
    return target;
  };

  // Helper to compute combined end date:
  // If member has active or future expiry (>= today), stack onto current expiry.
  // Otherwise, start from startDateStr (today / custom start date).
  const computeCombinedPlanEndDate = (baseStartDateStr, plan, currentExpiryStr = null) => {
    if (!plan) return '';
    const todayStr = formatDate(new Date());
    let effectiveBaseStr = baseStartDateStr || todayStr;

    if (currentExpiryStr) {
      const cleanCurrent = String(currentExpiryStr).split('T')[0];
      // If current plan expiry is today or in the future, extend from current expiry
      if (cleanCurrent >= todayStr) {
        effectiveBaseStr = cleanCurrent;
      }
    }

    try {
      const base = parseLocalDate(effectiveBaseStr);
      if (isNaN(base.getTime())) return '';
      let end = new Date(base.getTime());

      const periodStr = plan.period || '';
      const matchDays = periodStr.match(/(\d+)\s*Days?/i);
      if (matchDays) {
        end.setDate(end.getDate() + parseInt(matchDays[1], 10));
      } else {
        const months = Number(plan.durationMonths) || 1;
        end = addMonthsPreservingDay(end, months);
      }

      const bonusDays = Number(plan.offerDays || plan.offer_days) || 0;
      if (bonusDays > 0) {
        end.setDate(end.getDate() + bonusDays);
      }
      return formatDate(end);
    } catch (e) {
      console.warn('Date calculation error:', e);
      return '';
    }
  };

  // Auto-fetch data on open
  useEffect(() => {
    if (isOpen) {
      fetchMembers?.();
      fetchPlans?.();
      fetchPtPlans?.();
      fetchRecoveryPlans?.();
      fetchTrainers?.();

      const todayStr = formatDate(new Date());
      setPaymentDate(todayStr);

      const targetMember =
        initialMember ||
        (initialMemberId ? members.find((m) => String(m.id) === String(initialMemberId)) : null) ||
        members[0];

      const initialMemberIdResolved = targetMember ? String(targetMember.id) : (members[0] ? String(members[0].id) : '');
      setSelectedMemberId(initialMemberIdResolved);

      const mExpiry = targetMember?.expiryDate ? String(targetMember.expiryDate).split('T')[0] : null;
      const initialStartDate = (mExpiry && mExpiry >= todayStr) ? mExpiry : todayStr;
      setMembershipStartDate(initialStartDate);
      setIsManualEndDate(false);

      // Default Base Plan
      const defaultPlan =
        plans.find((p) => String(p.id) === String(targetMember?.planId) || p.name === targetMember?.planName) ||
        plans[0];

      if (defaultPlan) {
        setSelectedPlanId(String(defaultPlan.id));
        setBasePlanPrice(String(defaultPlan.price || ''));
        const calculatedEnd = computeCombinedPlanEndDate(initialStartDate, defaultPlan, targetMember?.expiryDate);
        setMembershipEndDate(calculatedEnd);
      }

      // Default PT Plan
      if (ptPlans && ptPlans.length > 0) {
        const defaultPt = ptPlans[0];
        setSelectedPtPlanId(String(defaultPt.id));
        setPtSessions(Number(defaultPt.sessions) || 12);
        setPtPrice(Number(defaultPt.price) || 3000);
      }

      // Default Trainer
      if (trainers && trainers.length > 0) {
        const defaultTrainer =
          trainers.find((t) => String(t.id) === String(targetMember?.trainerId)) ||
          trainers[0];
        setSelectedTrainerId(String(defaultTrainer.id));
      }

      // Default Recovery Plan
      if (recoveryPlans && recoveryPlans.length > 0) {
        const defaultRec = recoveryPlans[0];
        setSelectedRecoveryPlanId(String(defaultRec.id));
        setRecoveryPrice(Number(defaultRec.price) || 799);
      }

      setIncludeBasePlan(true);
      setIncludePtPackage(false);
      setIncludeRecoveryPackage(false);
      setIsFullPayment(true);
      setCustomPaidAmount('');
      setPaymentMethod('UPI');
      setSplitCashAmount('');
      setSplitOnlineAmount('');
      setSplitOnlineProvider('GPay');
      setSplitOnlineProviderOther('');
      setNotes('');
      setCompletedInvoiceData(null);
    }
  }, [isOpen, initialMember, initialMemberId]);

  // Selected Member Resolution
  const currentMember = useMemo(
    () => members.find((m) => String(m.id) === String(selectedMemberId)) || null,
    [members, selectedMemberId]
  );

  // Selected Plans Resolution
  const currentPlan = useMemo(
    () => plans.find((p) => String(p.id) === String(selectedPlanId)) || plans[0] || null,
    [plans, selectedPlanId]
  );

  const currentPtPlan = useMemo(
    () => ptPlans.find((p) => String(p.id) === String(selectedPtPlanId)) || null,
    [ptPlans, selectedPtPlanId]
  );

  const currentRecoveryPlan = useMemo(
    () => recoveryPlans.find((p) => String(p.id) === String(selectedRecoveryPlanId)) || null,
    [recoveryPlans, selectedRecoveryPlanId]
  );

  const currentTrainer = useMemo(
    () => trainers.find((t) => String(t.id) === String(selectedTrainerId)) || trainers[0] || null,
    [trainers, selectedTrainerId]
  );

  // Calculate Expiry Date Helper
  const calculateEndDate = (startDateStr, plan, memberCurrentExpiry = null) => {
    const targetExpiry = memberCurrentExpiry !== undefined ? memberCurrentExpiry : currentMember?.expiryDate;
    const computed = computeCombinedPlanEndDate(startDateStr, plan, targetExpiry);
    if (computed) {
      setMembershipEndDate(computed);
    }
  };

  // When Member Changes
  const handleMemberChange = (e) => {
    const memId = e.target.value;
    setSelectedMemberId(memId);
    const m = members.find((mem) => String(mem.id) === String(memId));
    if (m) {
      const todayStr = formatDate(new Date());
      const mExpiry = m.expiryDate ? String(m.expiryDate).split('T')[0] : null;
      const effectiveStart = (mExpiry && mExpiry >= todayStr) ? mExpiry : todayStr;
      setMembershipStartDate(effectiveStart);
      setIsManualEndDate(false);

      const matchedPlan = plans.find((p) => String(p.id) === String(m.planId) || p.name === m.planName) || currentPlan || plans[0];
      if (matchedPlan) {
        setSelectedPlanId(String(matchedPlan.id));
        setBasePlanPrice(String(matchedPlan.price || ''));
        if (!isManualEndDate) {
          const calculatedEnd = computeCombinedPlanEndDate(effectiveStart, matchedPlan, m.expiryDate);
          setMembershipEndDate(calculatedEnd);
        }
      }
      if (m.trainerId) {
        setSelectedTrainerId(String(m.trainerId));
      }
    }
  };

  // When Base Plan Changes
  const handlePlanChange = (e) => {
    const planId = e.target.value;
    setSelectedPlanId(planId);
    const p = plans.find((pl) => String(pl.id) === String(planId));
    if (p) {
      setBasePlanPrice(String(p.price || ''));
      if (!isManualEndDate) {
        const calculatedEnd = computeCombinedPlanEndDate(membershipStartDate, p, currentMember?.expiryDate);
        setMembershipEndDate(calculatedEnd);
      }
    }
  };

  // When PT Plan Changes
  const handlePtPlanChange = (e) => {
    const ptId = e.target.value;
    setSelectedPtPlanId(ptId);
    const pkg = ptPlans.find((p) => String(p.id) === String(ptId));
    if (pkg) {
      setPtSessions(Number(pkg.sessions) || 12);
      setPtPrice(Number(pkg.price) || 0);
    }
  };

  // When Recovery Plan Changes
  const handleRecoveryPlanChange = (e) => {
    const recId = e.target.value;
    setSelectedRecoveryPlanId(recId);
    const rec = recoveryPlans.find((r) => String(r.id) === String(recId));
    if (rec) {
      setRecoveryPrice(Number(rec.price) || 0);
    }
  };

  // Max Discount Ceiling for Selected Plan
  const maxPlanDiscount = currentPlan ? Number(currentPlan.maxDiscount ?? currentPlan.max_discount ?? 0) : 0;

  // Live Bill Amounts
  const effectiveBasePrice = includeBasePlan ? (Number(basePlanPrice) || 0) : 0;
  const effectivePtPrice = includePtPackage ? (Number(ptPrice) || 0) : 0;
  const effectiveRecoveryPrice = includeRecoveryPackage ? (Number(recoveryPrice) || 0) : 0;
  const numDiscount = Math.max(0, Number(discountAmount) || 0);
  const totalCalculatedBill = Math.max(0, (effectiveBasePrice - numDiscount) + effectivePtPrice + effectiveRecoveryPrice);

  const effectivePaidAmount = isFullPayment
    ? totalCalculatedBill
    : (customPaidAmount === '' ? 0 : Math.max(0, Number(customPaidAmount)));
  const calculatedBalanceDue = Math.max(0, totalCalculatedBill - effectivePaidAmount);

  // Trainer Commission Calculation
  const ptCommissionAmount = (includePtPackage && currentTrainer)
    ? (commissionType === 'percent'
        ? Math.round((effectivePtPrice * (Number(ptCommissionPercent) || 0)) / 100)
        : (Number(ptFixedCommission) || 0))
    : 0;

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasSqlInjection(splitOnlineProviderOther) || hasSqlInjection(notes)) {
      addToast('Invalid characters or disallowed database syntax detected.', 'error');
      return;
    }

    if (!selectedMemberId) {
      addToast('Please select a member.', 'error');
      return;
    }

    if (!includeBasePlan && !includePtPackage && !includeRecoveryPackage) {
      addToast('Please include at least one package (Membership Plan, PT Package, or Recovery Package).', 'error');
      return;
    }

    if (totalCalculatedBill <= 0) {
      addToast('Total bill amount must be greater than ₹0.', 'error');
      return;
    }

    if (includeBasePlan && maxPlanDiscount > 0 && numDiscount > maxPlanDiscount) {
      addToast(`Discount ₹${numDiscount} exceeds the maximum allowed discount of ₹${maxPlanDiscount} for ${currentPlan?.name || 'this plan'}.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const memberName = currentMember?.name || 'Valued Member';
      const cleanUserId = typeof currentMember?.id === 'string'
        ? parseInt(currentMember.id.replace(/\D/g, ''), 10) || 1
        : Number(currentMember?.id) || 1;

      // Build Itemized Titles
      const lineTitles = [];
      if (includeBasePlan && currentPlan) {
        lineTitles.push(`${currentPlan.name} (${currentPlan.durationMonths || 1}M)`);
      }
      if (includePtPackage) {
        lineTitles.push(`${ptSessions} Sessions PT${currentTrainer ? ` (Coach ${currentTrainer.name})` : ''}`);
      }
      if (includeRecoveryPackage && currentRecoveryPlan) {
        lineTitles.push(currentRecoveryPlan.name);
      }

      const invoiceTitle = lineTitles.join(' + ') || 'Gym Services Package';
      const mainCategory = includeBasePlan
        ? 'Membership Fee'
        : (includePtPackage ? 'Personal Training' : 'Recovery & Wellness');

      const generatedInvoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const resolvedOnlineProvider = splitOnlineProvider === 'Other'
        ? (splitOnlineProviderOther?.trim() || 'Other')
        : (splitOnlineProvider || 'GPay');
      const resolvedPaymentMethodString = (paymentMethod === 'Split' || paymentMethod === 'Split (Cash+Online)')
        ? `Split (Cash: ₹${splitCashAmount || 0} + Online [${resolvedOnlineProvider}]: ₹${splitOnlineAmount || 0})`
        : paymentMethod;

      // 1. Record Revenue Inflow in Database
      let backendInvoiceRef = generatedInvoiceNo;
      try {
        if (api.revenueBilling?.addInflow) {
          const inflowRes = await api.revenueBilling.addInflow({
            user_id: cleanUserId,
            memberId: currentMember?.id,
            member_name: memberName,
            plan_id: includeBasePlan ? currentPlan?.id : (includePtPackage ? currentPtPlan?.id : null),
            plan_name: invoiceTitle,
            title: `${memberName} - ${invoiceTitle}`,
            category: mainCategory,
            amount: effectivePaidAmount,
            total_amount: totalCalculatedBill,
            dues_amount: calculatedBalanceDue,
            payment_method: resolvedPaymentMethodString,
            date: paymentDate || new Date().toISOString().split('T')[0],
            notes: notes || `Recorded from Invoices billing: ${invoiceTitle}${calculatedBalanceDue > 0 ? ` (Balance Due: ₹${calculatedBalanceDue})` : ''}`,
            status: calculatedBalanceDue > 0 ? 'Partial' : 'Paid'
          });

          if (inflowRes?.data?.invoiceNumber || inflowRes?.data?.id) {
            backendInvoiceRef = inflowRes.data.invoiceNumber || inflowRes.data.id;
          }
        } else if (recordPayment) {
          await recordPayment({
            memberId: currentMember?.id,
            memberName: memberName,
            planId: includeBasePlan ? currentPlan?.id : null,
            planName: invoiceTitle,
            amount: effectivePaidAmount,
            paymentDate,
            expiryDate: includeBasePlan ? membershipEndDate : currentMember?.expiryDate,
            paymentMethod: resolvedPaymentMethodString
          });
        }
      } catch (err) {
        console.warn('Backend inflow note:', err);
      }

      // 2. Update Member Record (Sync New Validity, PT Sessions Balance, Assigned Coach & Dues)
      if (updateMember && currentMember) {
        const updatedDues = (Number(currentMember.duesAmount || 0) + calculatedBalanceDue);
        const memberPayload = {
          ...currentMember,
          duesAmount: updatedDues,
          dues_amount: updatedDues
        };

        if (includeBasePlan && currentPlan) {
          memberPayload.planId = currentPlan.id;
          memberPayload.planName = currentPlan.name;
          memberPayload.expiryDate = membershipEndDate;
          memberPayload.expiry_date = membershipEndDate;
          memberPayload.status = 'Active';
        }

        if (includePtPackage) {
          memberPayload.trainingType = 'pt';
          memberPayload.trainerId = currentTrainer?.id || currentMember.trainerId;
          memberPayload.trainerName = currentTrainer ? `${currentTrainer.name} (PT Coach)` : currentMember.trainerName;
          memberPayload.ptPlanId = selectedPtPlanId || currentMember.ptPlanId;
          memberPayload.ptPlanName = currentPtPlan?.name || `${ptSessions} Sessions PT`;
          memberPayload.ptSessions = (Number(currentMember.ptSessions) || 0) + Number(ptSessions);
        }

        if (includeRecoveryPackage && currentRecoveryPlan) {
          memberPayload.recoveryPlanId = currentRecoveryPlan.id;
          memberPayload.recoveryPlanName = currentRecoveryPlan.name;
        }

        await updateMember(currentMember.id, memberPayload);
      }

      // 3. Log Trainer Commission if PT Coach is included
      if (includePtPackage && currentTrainer && ptCommissionAmount > 0 && addCommissionRecord) {
        try {
          await addCommissionRecord({
            trainerId: currentTrainer.id,
            trainerName: currentTrainer.name,
            memberName: memberName,
            planName: currentPtPlan ? currentPtPlan.name : `1-on-1 PT (${ptSessions} Sessions)`,
            sessionType: 'Personal Training (PT)',
            serviceType: 'Personal Training (PT)',
            ratePercent: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
            commissionPct: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
            amount: effectivePtPrice,
            packageAmount: effectivePtPrice,
            commissionEarned: ptCommissionAmount,
            date: paymentDate || new Date().toISOString().split('T')[0],
            status: 'Pending'
          });
        } catch (comErr) {
          console.warn('Commission record error:', comErr);
        }
      }

      // 4. Refresh Data Stores
      await Promise.allSettled([
        fetchInvoices?.(),
        fetchMembers?.(),
        fetchDashboardStats?.()
      ]);

      addToast(`Payment of ₹${effectivePaidAmount.toLocaleString('en-IN')} recorded & Invoice #${backendInvoiceRef} generated!`, 'success');

      // 5. Set receipt state for immediate download/WhatsApp share
      setCompletedInvoiceData({
        id: backendInvoiceRef,
        invoiceNumber: backendInvoiceRef,
        memberName: memberName,
        phone: currentMember?.phone || '',
        email: currentMember?.email || '',
        planName: invoiceTitle,
        amount: effectivePaidAmount,
        totalAmount: totalCalculatedBill,
        duesAmount: calculatedBalanceDue,
        date: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: resolvedPaymentMethodString,
        status: calculatedBalanceDue > 0 ? 'Partial' : 'Paid',
        expiryDate: includeBasePlan ? membershipEndDate : currentMember?.expiryDate,
        itemsBreakdown: lineTitles
      });
    } catch (err) {
      console.error('Record payment error:', err);
      addToast(`Failed to record payment: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF Action
  const handleDownloadPdf = () => {
    if (!completedInvoiceData) return;
    try {
      const generated = generateInvoicePdf({
        invoice: completedInvoiceData,
        member: currentMember,
        gymInfo
      });
      if (generated?.blob) {
        downloadPdfBlob(generated.blob, `Invoice-${completedInvoiceData.invoiceNumber}.pdf`, generated.doc);
        addToast('Invoice PDF downloaded successfully!', 'success');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast('Failed to download invoice PDF', 'error');
    }
  };

  // WhatsApp Share Action
  const handleShareWhatsApp = () => {
    if (!completedInvoiceData) return;
    shareInvoicePdfToMobile({
      invoice: completedInvoiceData,
      member: currentMember,
      gymInfo,
      onToast: (msg, type) => addToast(msg, type)
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={completedInvoiceData ? 'Payment Receipt & Invoice Generated' : 'Record Fee Payment & Invoice Bill'}
      maxWidth="max-w-2xl"
    >
      {completedInvoiceData ? (
        /* SUCCESS RECEIPT VIEW */
        <div className="space-y-4 py-1">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Payment Recorded & Invoice Issued!
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Official GST gym invoice #{completedInvoiceData.invoiceNumber} has been added to Member Invoices.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
              <Receipt className="w-3.5 h-3.5" />
              <span>Invoice #{completedInvoiceData.invoiceNumber}</span>
            </div>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700">Member:</span>
              <span className="font-black text-slate-900">{completedInvoiceData.memberName}</span>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Invoiced Packages & Services:
              </span>
              <div className="p-2 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800">
                {completedInvoiceData.planName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Total Bill:</span>
                <span className="text-sm font-black text-slate-900">
                  ₹{Number(completedInvoiceData.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold block">Paid Amount:</span>
                <span className="text-sm font-black text-emerald-800">
                  ₹{Number(completedInvoiceData.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {Number(completedInvoiceData.duesAmount) > 0 && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between font-bold text-xs">
                <span>Remaining Balance Due:</span>
                <span>₹{Number(completedInvoiceData.duesAmount).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Invoice</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* MAIN BILLING & PACKAGE SELECTION FORM */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. MEMBER SELECTION & PROFILE STATUS */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Select Member *</span>
              </label>
              {currentMember && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Status: {currentMember.status || 'Active'}
                </span>
              )}
            </div>

            <MemberSearchSelect
              members={members}
              value={selectedMemberId}
              onChange={handleMemberChange}
              required
            />

            {currentMember && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Contact:</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {currentMember.phone || currentMember.email || 'N/A'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Current Plan:</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {currentMember.planName || 'Standard'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Plan Expiry:</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {currentMember.expiryDate || 'N/A'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">PT Sessions:</span>
                  <span className="font-bold text-emerald-700 truncate block">
                    {Number(currentMember.ptSessions) || 0} Available
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. PACKAGES & SERVICES SELECTION (MEMBERSHIP, PT, RECOVERY) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Packages To Bill & Renew
              </span>
              <span className="text-[10px] text-slate-500">
                Combine membership, PT, and recovery in 1 bill
              </span>
            </div>

            {/* A. BASE MEMBERSHIP PLAN ACCORDION / TOGGLE */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              includeBasePlan
                ? 'bg-white border-emerald-300 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 opacity-75'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBasePlan}
                    onChange={(e) => setIncludeBasePlan(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gym Membership Plan</span>
                  </span>
                </label>

                {includeBasePlan && (
                  <span className="text-xs font-black text-emerald-700">
                    ₹{effectiveBasePrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {includeBasePlan && (
                <div className="space-y-2.5 pt-1 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Membership Plan Tier *
                      </label>
                      <select
                        value={selectedPlanId}
                        onChange={handlePlanChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — ₹{Number(p.price).toLocaleString('en-IN')} ({p.period || `${p.durationMonths || 1} Month(s)`})
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const curP = plans.find((p) => String(p.id) === String(selectedPlanId));
                        if (curP && (curP.offer || Number(curP.offerDays || curP.offer_days) > 0)) {
                          return (
                            <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                {curP.offer || 'Offer'}{Number(curP.offerDays || curP.offer_days) > 0 ? ` (+${curP.offerDays || curP.offer_days} bonus days automatically added to expiry)` : ''}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Plan Fee (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={basePlanPrice}
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        onChange={(e) => setBasePlanPrice(sanitizeDecimal(e.target.value))}
                        placeholder="e.g. 2999"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Discount (₹)
                        </label>
                        {maxPlanDiscount > 0 && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Max: ₹{maxPlanDiscount}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        max={maxPlanDiscount > 0 ? maxPlanDiscount : undefined}
                        value={discountAmount}
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        onChange={(e) => setDiscountAmount(sanitizeDecimal(e.target.value))}
                        placeholder="0"
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          maxPlanDiscount > 0 && Number(discountAmount) > maxPlanDiscount
                            ? 'border-rose-500 ring-1 ring-rose-500 text-rose-700'
                            : 'border-slate-200 focus:border-emerald-500'
                        }`}
                      />
                      {maxPlanDiscount > 0 && Number(discountAmount) > maxPlanDiscount && (
                        <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                          Exceeds max allowed discount of ₹{maxPlanDiscount}!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Start Date & Calculated Expiry */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                        Membership Start Date *
                      </label>
                      <input
                        type="date"
                        value={membershipStartDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMembershipStartDate(val);
                          if (!isManualEndDate) {
                            calculateEndDate(val, currentPlan, null);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-700">
                          Expiry Date *
                        </label>
                        {isManualEndDate && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualEndDate(false);
                              calculateEndDate(membershipStartDate, currentPlan, currentMember?.expiryDate);
                            }}
                            className="text-[9px] text-emerald-600 hover:underline font-bold cursor-pointer"
                          >
                            Reset Auto
                          </button>
                        )}
                      </div>
                      <input
                        type="date"
                        value={membershipEndDate}
                        onChange={(e) => {
                          setIsManualEndDate(true);
                          setMembershipEndDate(e.target.value);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {currentMember?.expiryDate && String(currentMember.expiryDate).split('T')[0] >= formatDate(new Date()) && (
                      <div className="sm:col-span-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100/80 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>
                          Combined Expiry: Current plan expires on <strong>{String(currentMember.expiryDate).split('T')[0]}</strong>. The new plan duration is stacked onto current expiry, extending validity to <strong>{membershipEndDate}</strong>.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* B. 1-ON-1 PERSONAL TRAINING (PT) PACKAGE ACCORDION / TOGGLE */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              includePtPackage
                ? 'bg-white border-emerald-300 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 opacity-75'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePtPackage}
                    onChange={(e) => setIncludePtPackage(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Personal Training (PT) Package</span>
                  </span>
                </label>

                {includePtPackage && (
                  <span className="text-xs font-black text-emerald-700">
                    ₹{effectivePtPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {includePtPackage && (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select PT Package
                      </label>
                      <select
                        value={selectedPtPlanId}
                        onChange={handlePtPlanChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                      >
                        {ptPlans.length > 0 ? (
                          ptPlans.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} ({pkg.sessions} Sessions — ₹{Number(pkg.price).toLocaleString('en-IN')})
                            </option>
                          ))
                        ) : (
                          <option value="custom">Standard PT (12 Sessions — ₹3,000)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Dedicated PT Coach *
                      </label>
                      <select
                        value={selectedTrainerId}
                        onChange={(e) => setSelectedTrainerId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                      >
                        {trainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.specialty || 'Fitness Coach'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        PT Sessions Count *
                      </label>
                      <input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={ptSessions}
                        onKeyDown={(e) => preventNonNumericKey(e, false)}
                        onChange={(e) => setPtSessions(Math.max(1, Number(sanitizeDigits(e.target.value, 3)) || 1))}
                        placeholder="e.g. 12"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        PT Package Fee (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={ptPrice}
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        onChange={(e) => setPtPrice(sanitizeDecimal(e.target.value))}
                        placeholder="e.g. 3000"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Trainer Incentive Commission Setting */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Trainer Commission (Payout)</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        To: {currentTrainer?.name || 'Selected Coach'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shrink-0">
                        <button
                          type="button"
                          onClick={() => setCommissionType('percent')}
                          className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                            commissionType === 'percent'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          % Rate
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommissionType('fixed')}
                          className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                            commissionType === 'fixed'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ₹ Flat
                        </button>
                      </div>

                      {commissionType === 'percent' ? (
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            inputMode="numeric"
                            value={ptCommissionPercent}
                            onKeyDown={(e) => preventNonNumericKey(e, false)}
                            onChange={(e) => setPtCommissionPercent(Math.max(0, Math.min(100, Number(sanitizeDigits(e.target.value, 3)) || 0)))}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center pr-5 font-mono"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">%</span>
                        </div>
                      ) : (
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            value={ptFixedCommission}
                            onKeyDown={(e) => preventNonNumericKey(e, true)}
                            onChange={(e) => setPtFixedCommission(Math.max(0, Number(sanitizeDecimal(e.target.value)) || 0))}
                            className="w-full pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono"
                          />
                        </div>
                      )}

                      <div className="ml-auto text-right text-xs">
                        <span className="text-[10px] text-slate-400 block">Coach Earns:</span>
                        <span className="font-black text-emerald-700">₹{ptCommissionAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* C. RECOVERY & WELLNESS / OTHER PACKAGES ACCORDION / TOGGLE */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              includeRecoveryPackage
                ? 'bg-white border-emerald-300 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 opacity-75'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRecoveryPackage}
                    onChange={(e) => setIncludeRecoveryPackage(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recovery & Wellness Services (Cold Plunge, Sauna, Therapy)</span>
                  </span>
                </label>

                {includeRecoveryPackage && (
                  <span className="text-xs font-black text-emerald-700">
                    ₹{effectiveRecoveryPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {includeRecoveryPackage && (
                <div className="space-y-2.5 pt-1 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Recovery Package
                      </label>
                      <select
                        value={selectedRecoveryPlanId}
                        onChange={handleRecoveryPlanChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                      >
                        {recoveryPlans.length > 0 ? (
                          recoveryPlans.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.type || r.duration || 'Session'}) — ₹{Number(r.price).toLocaleString('en-IN')}
                            </option>
                          ))
                        ) : (
                          <option value="custom">Ice Plunge & Hydrotherapy (₹799)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Recovery Fee (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={recoveryPrice}
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        onChange={(e) => setRecoveryPrice(sanitizeDecimal(e.target.value))}
                        placeholder="e.g. 799"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. DYNAMIC INVOICE BREAKDOWN SUMMARY */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-emerald-200/70">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invoice Bill Summary</span>
              </span>
              <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md font-bold">
                Auto-Itemized
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              {includeBasePlan && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Membership Plan ({currentPlan?.name || 'Base'}):</span>
                  <span className="font-mono font-bold text-slate-900">₹{effectiveBasePrice.toLocaleString('en-IN')}</span>
                </div>
              )}
              {includePtPackage && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">1-on-1 PT ({ptSessions} Sessions with Coach {currentTrainer?.name || 'Assigned'}):</span>
                  <span className="font-mono font-bold text-slate-900">₹{effectivePtPrice.toLocaleString('en-IN')}</span>
                </div>
              )}
              {includeRecoveryPackage && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Recovery Package ({currentRecoveryPlan?.name || 'Wellness'}):</span>
                  <span className="font-mono font-bold text-slate-900">₹{effectiveRecoveryPrice.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
              <span className="text-xs font-bold text-slate-800">Total Invoice Bill Amount:</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                ₹{totalCalculatedBill.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 4. PAYMENT DETAILS & SCOPE OF SETTLEMENT */}
          <div className="mt-2 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Payment Details & Scope of Settlement
                </span>
              </div>
              <div className="text-[10px] font-semibold text-slate-500">
                Total Bill: <strong className="font-mono text-slate-800">₹{totalCalculatedBill.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Full Payment Done Checkbox */}
              <div className={`p-3 rounded-xl border transition-all ${
                isFullPayment 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFullPayment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsFullPayment(checked);
                      if (checked) {
                        setCustomPaidAmount('');
                      } else {
                        setCustomPaidAmount(totalCalculatedBill > 0 ? String(Math.round(totalCalculatedBill * 0.4)) : '');
                      }
                    }}
                    className="w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold block flex items-center gap-1.5">
                      <span>Full Payment Done</span>
                      {isFullPayment && <Check className="w-3.5 h-3.5 text-emerald-600 inline" />}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {isFullPayment ? '100% full payment received (₹0 balance)' : 'Partial payment / installment balance pending'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Payment Mode Selector Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash at Reception</option>
                  <option value="Split">Split (Part Cash + Part Online / UPI)</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking / NEFT</option>
                </select>
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Payment Date *</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Split Payment Breakdown Box (Only when Split is selected) */}
            {(paymentMethod === 'Split' || paymentMethod === 'Split (Cash+Online)') && (
              <div className="p-3.5 rounded-xl bg-violet-50/80 border border-violet-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-violet-600" />
                    <span>Split Payment Breakdown</span>
                  </span>
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded">
                    Total to Collect: ₹{effectivePaidAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cash Portion (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        max={effectivePaidAmount}
                        value={splitCashAmount}
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        onChange={(e) => {
                          const val = sanitizeDecimal(e.target.value);
                          setSplitCashAmount(val);
                          const num = Math.max(0, Number(val) || 0);
                          const rem = Math.max(0, effectivePaidAmount - num);
                          setSplitOnlineAmount(String(rem));
                        }}
                        placeholder="e.g. 2000"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-violet-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Online / UPI Portion (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        max={effectivePaidAmount}
                        value={splitOnlineAmount}
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        onChange={(e) => {
                          const val = sanitizeDecimal(e.target.value);
                          setSplitOnlineAmount(val);
                          const num = Math.max(0, Number(val) || 0);
                          const rem = Math.max(0, effectivePaidAmount - num);
                          setSplitCashAmount(String(rem));
                        }}
                        placeholder="e.g. 3000"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-violet-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-400"
                      />
                    </div>

                    {/* Online Received Via Options */}
                    <div className="mt-2.5 space-y-1.5">
                      <label className="block text-[10px] font-bold text-violet-900 uppercase tracking-wider">
                        Online Received Via *
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: 'GPay', label: 'GPay' },
                          { id: 'PhonePe', label: 'PhonePe' },
                          { id: 'Account', label: 'Account' },
                          { id: 'Other', label: 'Other' },
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setSplitOnlineProvider(provider.id)}
                            className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                              splitOnlineProvider === provider.id
                                ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-violet-50/50'
                            }`}
                          >
                            {provider.label}
                          </button>
                        ))}
                      </div>

                      {splitOnlineProvider === 'Other' && (
                        <input
                          type="text"
                          required
                          value={splitOnlineProviderOther}
                          onChange={(e) => setSplitOnlineProviderOther(e.target.value)}
                          placeholder="Type provider (e.g. Paytm, Cred, Cheque)..."
                          className="w-full px-2.5 py-1.5 bg-white border border-violet-300 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-400 mt-1"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-violet-200/70 font-medium">
                  <span className="text-violet-800">
                    Split: <strong>₹{Number(splitCashAmount || 0).toLocaleString('en-IN')} Cash</strong> + <strong>₹{Number(splitOnlineAmount || 0).toLocaleString('en-IN')} Online ({splitOnlineProvider === 'Other' ? (splitOnlineProviderOther || 'Other') : splitOnlineProvider})</strong>
                  </span>
                  <span className="font-bold text-violet-950 font-mono">
                    Total: ₹{(Number(splitCashAmount || 0) + Number(splitOnlineAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Scope of Payment: Partial Payment Inputs & Balance Due Field */}
            {!isFullPayment ? (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/90 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Amount Paid Right Now */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Amount Received Right Now (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        max={totalCalculatedBill}
                        value={customPaidAmount}
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        onChange={(e) => {
                          const val = sanitizeDecimal(e.target.value);
                          setCustomPaidAmount(val);
                          if (paymentMethod === 'Split' || paymentMethod === 'Split (Cash+Online)') {
                            const num = Math.max(0, Number(val) || 0);
                            setSplitCashAmount(String(Math.round(num * 0.5)));
                            setSplitOnlineAmount(String(num - Math.round(num * 0.5)));
                          }
                        }}
                        placeholder="e.g. 4000"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Remaining Balance Due Field */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Remaining Balance Due (₹)
                    </label>
                    <div className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 flex items-center justify-between shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500">Balance Pending:</span>
                      <span className="text-sm font-black font-mono text-rose-600">
                        ₹{calculatedBalanceDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Settlement Breakdown Summary */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200 font-medium">
                  <span className="text-slate-600">
                    Total: <strong className="text-slate-900 font-mono">₹{totalCalculatedBill.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    Paid Now: <strong className="font-mono">₹{effectivePaidAmount.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="text-rose-700 font-bold">
                    Balance Due: <strong className="font-mono">₹{calculatedBalanceDue.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Full payment of <strong>₹{totalCalculatedBill.toLocaleString('en-IN')}</strong> will be recorded with <strong>₹0</strong> balance due.</span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                  Full Payment Done
                </span>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer border border-slate-200 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalCalculatedBill <= 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Confirm & Issue Bill (₹{effectivePaidAmount.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
