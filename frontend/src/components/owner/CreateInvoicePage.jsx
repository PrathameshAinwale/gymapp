import React, { useState, useEffect, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import MemberSearchSelect from '../common/MemberSearchSelect';
import { MembershipPlanModal, PACKAGE_TYPES, getPackagesForType, getPackageObjectFromLists, normalizePackageType } from '../common/MembershipPlanModal';
import { api } from '../../services/api';
import { generateInvoicePdf, downloadPdfBlob, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';
import { calculatePlanExpiryDate, formatDateDisplay } from '../../utils/dateUtils';
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
  Download,
  MessageCircle,
  AlertCircle,
  Plus,
  Trash2,
  Tag,
  Receipt,
  ArrowLeft,
  FileText,
  Printer,
  Users,
  Send,
  CheckCircle
} from 'lucide-react';

export const CreateInvoicePage = ({
  initialMember = null,
  initialMemberId = null,
  onBack,
  onNavigateTab,
  onSuccess,
  isModal = false
}) => {
  const {
    members = [],
    plans = [],
    ptPlans = [],
    recoveryPlans = [],
    trainers = [],
    invoices = [],
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
    addPlan,
    addRecoveryPlan,
    addPTPlan,
    addToast
  } = useGymData();
  const { currentUser } = useAuth();

  const defaultHandledBy = currentUser?.name || 'Staff';

  // Selected Member
  const [selectedMemberId, setSelectedMemberId] = useState(
    initialMember?.id || initialMemberId || ''
  );
  const [handledByStaffName, setHandledByStaffName] = useState(defaultHandledBy);

  useEffect(() => {
    if (initialMember?.id) {
      setSelectedMemberId(initialMember.id);
    } else if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
    }
  }, [initialMember, initialMemberId]);

  useEffect(() => {
    if (!handledByStaffName && defaultHandledBy) {
      setHandledByStaffName(defaultHandledBy);
    }
  }, [defaultHandledBy]);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };

  const getTodayDateStr = () => formatDate(new Date());

  // Membership Dates State
  const [membershipStartDate, setMembershipStartDate] = useState(getTodayDateStr());
  const [membershipEndDate, setMembershipEndDate] = useState('');

  // PT Specific State
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [commissionType, setCommissionType] = useState('percent');
  const [ptCommissionPercent, setPtCommissionPercent] = useState(10);
  const [ptFixedCommission, setPtFixedCommission] = useState(1000);
  const [ptCustomSessions, setPtCustomSessions] = useState(12);

  // Multi-Package Selection State
  const [selectedPackages, setSelectedPackages] = useState([
    {
      id: 'pkg-1',
      packageType: 'Gym-Cardio',
      packageId: '',
      price: 0,
      discount: ''
    }
  ]);

  // Quick Plan Creation State
  const [quickAddPlanType, setQuickAddPlanType] = useState(null);
  const [quickAddTargetRowId, setQuickAddTargetRowId] = useState(null);
  const [isSavingQuickPlan, setIsSavingQuickPlan] = useState(false);
  const [quickPlanForm, setQuickPlanForm] = useState({
    name: '',
    price: 1999,
    sessions: 12,
    validityDays: 30,
    duration: '30 Mins',
    instructorOrType: 'Therapy',
    description: ''
  });

  // Billing and Payment Settlement (Exact mirror of AddMemberPage)
  const [paymentDate, setPaymentDate] = useState(getTodayDateStr());
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [accountTransferAmount, setAccountTransferAmount] = useState('');
  const [balanceDueDate, setBalanceDueDate] = useState('');
  const [isGstIncluded, setIsGstIncluded] = useState(true);
  const [notes, setNotes] = useState('');

  // Submission & Receipt States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedInvoiceData, setCompletedInvoiceData] = useState(null);

  const getPackageObject = (type, id) => {
    return getPackageObjectFromLists(type, id, plans, ptPlans, recoveryPlans);
  };

  // Helper to compute combined end date
  const computeCombinedPlanEndDate = (baseStartDateStr, plan, currentExpiryStr = null) => {
    if (!plan) return '';
    const todayStr = getTodayDateStr();
    const effectiveBaseStr = baseStartDateStr || (currentExpiryStr && String(currentExpiryStr).split('T')[0] >= todayStr ? String(currentExpiryStr).split('T')[0] : todayStr);

    try {
      const name = (plan.name || '').toLowerCase();
      const period = (plan.period || (plan.validityDays ? `${plan.validityDays} Days` : '')).toLowerCase();
      let monthsToAdd = Number(plan.durationMonths || plan.duration_months) || 1;

      if (name.includes('annual') || name.includes('1 year') || name.includes('12 month') || period.includes('12 month') || period.includes('annual')) {
        monthsToAdd = 12;
      } else if (name.includes('6 month') || period.includes('6 month') || name.includes('half year')) {
        monthsToAdd = 6;
      } else if (name.includes('3 month') || period.includes('3 month') || name.includes('quarter')) {
        monthsToAdd = 3;
      } else if (name.includes('1 month') || period.includes('1 month') || name.includes('monthly')) {
        monthsToAdd = 1;
      }

      const bonusDays = Number(plan.offerDays || plan.offer_days) || 0;
      return calculatePlanExpiryDate(effectiveBaseStr, monthsToAdd, plan.period || (plan.validityDays ? `${plan.validityDays} Days` : ''), bonusDays);
    } catch {
      return '';
    }
  };

  const currentMember = useMemo(() => {
    return members.find((m) => String(m.id) === String(selectedMemberId)) || null;
  }, [members, selectedMemberId]);

  const currentTrainer = useMemo(() => {
    return trainers.find((t) => String(t.id) === String(selectedTrainerId)) || null;
  }, [trainers, selectedTrainerId]);

  // Current Plan of the selected member
  const memberCurrentPlan = useMemo(() => {
    if (!currentMember) return null;
    const planId = currentMember.planId || currentMember.plan_id;
    const foundPlan = plans.find((p) => String(p.id) === String(planId));
    const rawExpiry = currentMember.expiryDate || currentMember.expiry_date || '';
    const cleanExpiry = rawExpiry ? String(rawExpiry).split('T')[0] : '';
    const today = getTodayDateStr();
    const isExpired = currentMember.status === 'Expired' || (cleanExpiry && cleanExpiry < today);

    let remainingDays = 0;
    if (!isExpired && cleanExpiry && cleanExpiry >= today) {
      const d1 = new Date(today);
      const d2 = new Date(cleanExpiry);
      const diffMs = d2.getTime() - d1.getTime();
      remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const hasPlan = Boolean(currentMember.planName || foundPlan || cleanExpiry);

    return {
      hasPlan,
      planName: currentMember.planName || foundPlan?.name || (hasPlan ? 'Active Membership Plan' : null),
      planObj: foundPlan,
      startDate: currentMember.startDate || currentMember.joiningDate || currentMember.created_at || '',
      expiryDate: cleanExpiry,
      isExpired,
      remainingDays,
      status: isExpired ? 'Expired' : (currentMember.status || 'Active')
    };
  }, [currentMember, plans]);

  // Plan duration in days helper
  const getPlanDurationDays = (plan) => {
    if (!plan) return 0;
    const period = (plan.period || (plan.validityDays ? `${plan.validityDays} Days` : '')).toLowerCase();
    const matchDays = period.match(/(\d+)\s*days?/i);
    if (matchDays) {
      return parseInt(matchDays[1], 10);
    }
    const matchMonths = period.match(/(\d+)\s*months?/i);
    const months = Number(plan.durationMonths || plan.duration_months) || (matchMonths ? parseInt(matchMonths[1], 10) : 1);
    const bonus = Number(plan.offerDays || plan.offer_days) || 0;
    return (months * 30) + bonus;
  };

  // Compute validity for any package row
  const computePackageValidity = (pkgRow) => {
    if (!pkgRow?.packageId) return null;
    const planObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
    if (!planObj) return null;

    const newPlanDays = getPlanDurationDays(planObj);
    const currentRemainingDays = memberCurrentPlan?.remainingDays || 0;
    const isExtended = currentRemainingDays > 0 && memberCurrentPlan?.expiryDate;
    const todayStr = getTodayDateStr();

    // Start date: extend from current plan's expiryDate if active; else start from today / membershipStartDate
    const effectiveBaseStart = isExtended ? memberCurrentPlan.expiryDate : (membershipStartDate || todayStr);
    const newExpiry = computeCombinedPlanEndDate(
      effectiveBaseStart,
      planObj,
      isExtended ? memberCurrentPlan?.expiryDate : null
    );
    const totalCombinedDays = currentRemainingDays + newPlanDays;

    return {
      planObj,
      newPlanDays,
      currentRemainingDays,
      totalCombinedDays,
      effectiveStartDate: effectiveBaseStart,
      newExpiryDate: newExpiry,
      isExtended,
      currentExpiryFormatted: memberCurrentPlan?.expiryDate || 'N/A'
    };
  };

  // Top membership validity info (for the main gym membership plan in the bill)
  const mainMembershipValidityInfo = useMemo(() => {
    const isPtRow = (r) => (r.packageType === 'Personal Training' || r.packageType === 'pt');
    const isRecRow = (r) => (r.packageType === 'Massage' || r.packageType === 'Activities' || r.packageType === 'recovery');
    const memRow = selectedPackages.find((r) => !isPtRow(r) && !isRecRow(r) && r.packageId);
    if (!memRow) return null;
    return computePackageValidity(memRow);
  }, [selectedPackages, memberCurrentPlan, membershipStartDate, plans, ptPlans, recoveryPlans]);

  // Keep membershipEndDate synchronized with the validity calculation
  useEffect(() => {
    if (mainMembershipValidityInfo?.newExpiryDate) {
      setMembershipEndDate(mainMembershipValidityInfo.newExpiryDate);
    }
  }, [mainMembershipValidityInfo]);

  // Synchronize start date whenever member changes
  useEffect(() => {
    if (currentMember) {
      const todayStr = getTodayDateStr();
      const rawExpiry = currentMember.expiryDate || currentMember.expiry_date || '';
      const cleanExpiry = rawExpiry ? String(rawExpiry).split('T')[0] : '';
      const effectiveStart = cleanExpiry && cleanExpiry >= todayStr ? cleanExpiry : todayStr;
      setMembershipStartDate(effectiveStart);

      if (currentMember.trainerId) {
        setSelectedTrainerId(currentMember.trainerId);
      }
    }
  }, [currentMember]);

  // Handle Member Change
  const handleMemberChange = (newMemberId) => {
    setSelectedMemberId(newMemberId);
    const m = members.find((item) => String(item.id) === String(newMemberId));
    if (m) {
      const todayStr = getTodayDateStr();
      const rawExpiry = m.expiryDate || m.expiry_date || '';
      const cleanExpiry = rawExpiry ? String(rawExpiry).split('T')[0] : '';
      const effectiveStart = cleanExpiry && cleanExpiry >= todayStr ? cleanExpiry : todayStr;
      setMembershipStartDate(effectiveStart);

      if (m.trainerId) {
        setSelectedTrainerId(m.trainerId);
      }
    }
  };

  // Sync first package row when plans load
  useEffect(() => {
    if (plans.length > 0 && selectedPackages.length > 0 && !selectedPackages[0].packageId) {
      const firstPlan = plans[0];
      const pkgType = normalizePackageType(firstPlan.packageType || firstPlan.package_type || 'Gym-Cardio');
      const defaultStart = (memberCurrentPlan?.remainingDays > 0 && memberCurrentPlan?.expiryDate)
        ? memberCurrentPlan.expiryDate
        : getTodayDateStr();
      const computedExp = computeCombinedPlanEndDate(
        defaultStart,
        firstPlan,
        memberCurrentPlan?.remainingDays > 0 ? memberCurrentPlan.expiryDate : null
      );
      setSelectedPackages([
        {
          id: 'pkg-1',
          packageType: pkgType,
          packageId: String(firstPlan.id),
          price: Number(firstPlan.price || 0),
          discount: '',
          startDate: defaultStart,
          expiryDate: computedExp
        }
      ]);
    }
  }, [plans, memberCurrentPlan]);

  // Package row handlers
  const handlePackageTypeChange = (rowId, newType) => {
    const isPt = newType === 'Personal Training' || newType === 'pt';
    if (isPt && trainers.length > 0 && !selectedTrainerId) {
      setSelectedTrainerId(trainers[0].id);
    }

    const available = getPackagesForType(newType, plans, ptPlans, recoveryPlans);
    const firstPlan = available[0] || null;
    const defaultStart = (memberCurrentPlan?.remainingDays > 0 && memberCurrentPlan?.expiryDate)
      ? memberCurrentPlan.expiryDate
      : getTodayDateStr();
    const computedExp = firstPlan
      ? computeCombinedPlanEndDate(defaultStart, firstPlan, memberCurrentPlan?.remainingDays > 0 ? memberCurrentPlan.expiryDate : null)
      : '';

    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const rowStart = row.startDate || defaultStart;
        return {
          ...row,
          packageType: newType,
          packageId: firstPlan ? String(firstPlan.id) : '',
          price: Number(firstPlan?.price || 0),
          discount: '',
          startDate: rowStart,
          expiryDate: computedExp
        };
      })
    );
  };

  const handlePackageIdChange = (rowId, newPackageId) => {
    if (newPackageId === '__ADD_NEW__') {
      const row = selectedPackages.find((r) => r.id === rowId);
      const rowType = row?.packageType || 'Gym-Cardio';
      const norm = String(rowType).toLowerCase();
      let modalType = 'membership';
      if (norm.includes('pt') || norm.includes('training')) modalType = 'pt';
      else if (norm.includes('massage') || norm.includes('activities') || norm.includes('recovery')) modalType = 'recovery';

      setQuickAddPlanType(modalType);
      setQuickAddTargetRowId(rowId);
      return;
    }

    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const found = getPackageObject(row.packageType, newPackageId);
        const defaultStart = (memberCurrentPlan?.remainingDays > 0 && memberCurrentPlan?.expiryDate)
          ? memberCurrentPlan.expiryDate
          : getTodayDateStr();
        const rowStart = row.startDate || defaultStart;
        const computedExp = found
          ? computeCombinedPlanEndDate(rowStart, found, memberCurrentPlan?.remainingDays > 0 ? memberCurrentPlan.expiryDate : null)
          : row.expiryDate;
        return {
          ...row,
          packageId: newPackageId,
          price: Number(found?.price || 0),
          startDate: rowStart,
          expiryDate: computedExp
        };
      })
    );
  };

  const handlePackageStartDateChange = (rowId, newStartDate) => {
    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const planObj = getPackageObject(row.packageType, row.packageId);
        const computedExp = planObj
          ? computeCombinedPlanEndDate(newStartDate, planObj, null)
          : row.expiryDate;
        return {
          ...row,
          startDate: newStartDate,
          expiryDate: computedExp
        };
      })
    );
  };

  const handlePackageExpiryDateChange = (rowId, newExpiryDate) => {
    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          expiryDate: newExpiryDate
        };
      })
    );
  };

  const handlePackageDiscountChange = (rowId, val) => {
    const sanitized = sanitizeDecimal(val);
    setSelectedPackages((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, discount: sanitized } : row))
    );
  };

  const handleAddPackageRow = () => {
    const typesUsed = selectedPackages.map((p) => p.packageType);
    let nextType = PACKAGE_TYPES.find((t) => !typesUsed.includes(t)) || 'Personal Training';

    const available = getPackagesForType(nextType, plans, ptPlans, recoveryPlans);
    const firstPlan = available[0] || null;
    const defaultStart = (memberCurrentPlan?.remainingDays > 0 && memberCurrentPlan?.expiryDate)
      ? memberCurrentPlan.expiryDate
      : getTodayDateStr();
    const computedExp = firstPlan
      ? computeCombinedPlanEndDate(defaultStart, firstPlan, memberCurrentPlan?.remainingDays > 0 ? memberCurrentPlan.expiryDate : null)
      : '';

    setSelectedPackages((prev) => [
      ...prev,
      {
        id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        packageType: nextType,
        packageId: firstPlan ? String(firstPlan.id) : '',
        price: Number(firstPlan?.price || 0),
        discount: '',
        startDate: defaultStart,
        expiryDate: computedExp
      }
    ]);
  };

  const handleRemovePackageRow = (rowId) => {
    if (selectedPackages.length <= 1) {
      addToast('At least one package is required to create an invoice.', 'error');
      return;
    }
    setSelectedPackages((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Quick Plan Creation modal submission
  const handleSaveQuickPlan = async () => {
    if (!quickPlanForm.name || !quickPlanForm.name.trim()) {
      addToast('Please enter a plan name', 'error');
      return;
    }

    setIsSavingQuickPlan(true);
    try {
      if (quickAddPlanType === 'membership') {
        const created = await addPlan({
          name: quickPlanForm.name.trim(),
          price: Number(quickPlanForm.price) || 0,
          period: quickPlanForm.validityDays ? `${quickPlanForm.validityDays} Days` : '30 Days',
          packageType: 'Gym-Cardio',
          validityDays: Number(quickPlanForm.validityDays) || 30,
          description: quickPlanForm.description || ''
        });
        if (created) {
          setSelectedPackages((prev) =>
            prev.map((r) =>
              r.id === quickAddTargetRowId
                ? { ...r, packageId: String(created.id), price: Number(created.price) || 0 }
                : r
            )
          );
        }
        addToast(`Plan "${quickPlanForm.name}" created and applied!`, 'success');
      } else if (quickAddPlanType === 'recovery') {
        const created = await addRecoveryPlan({
          name: quickPlanForm.name.trim(),
          price: Number(quickPlanForm.price) || 0,
          serviceType: 'Recovery',
          duration: quickPlanForm.duration || '30 Mins',
          description: quickPlanForm.description || ''
        });
        if (created) {
          setSelectedPackages((prev) =>
            prev.map((r) =>
              r.id === quickAddTargetRowId
                ? { ...r, packageId: String(created.id), price: Number(created.price) || 0 }
                : r
            )
          );
        }
        addToast(`Pass "${quickPlanForm.name}" created and applied!`, 'success');
      } else if (quickAddPlanType === 'pt') {
        const created = await addPTPlan({
          name: quickPlanForm.name.trim(),
          price: Number(quickPlanForm.price) || 0,
          sessions: Number(quickPlanForm.sessions) || 12,
          packageType: 'Personal Training',
          validityDays: Number(quickPlanForm.validityDays) || 30,
          description: quickPlanForm.description || ''
        });
        if (created) {
          setSelectedPackages((prev) =>
            prev.map((r) =>
              r.id === quickAddTargetRowId
                ? { ...r, packageId: String(created.id), price: Number(created.price) || 0 }
                : r
            )
          );
        }
        addToast(`PT package "${quickPlanForm.name}" created and applied!`, 'success');
      }
      setQuickAddPlanType(null);
    } catch (err) {
      console.error('Error saving quick plan:', err);
      addToast(`Failed to save plan: ${err.message}`, 'error');
    } finally {
      setIsSavingQuickPlan(false);
    }
  };

  // Financial Calculations (Exact mirror of AddMemberPage)
  const totalGrossPackages = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  }, [selectedPackages]);

  const totalDiscountAmount = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + Math.max(0, Number(r.discount) || 0), 0);
  }, [selectedPackages]);

  const numDiscount = totalDiscountAmount;
  const netPackageAmount = Math.max(0, totalGrossPackages - totalDiscountAmount);
  const totalCalculatedAmount = netPackageAmount;

  const parseAmount = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  const numCash = parseAmount(cashAmount);
  const numUpi = parseAmount(upiAmount);
  const numTransfer = parseAmount(accountTransferAmount);
  const isAnyPartialFilled = cashAmount !== '' || upiAmount !== '' || accountTransferAmount !== '';
  const totalEnteredPaid = Math.round((numCash + numUpi + numTransfer) * 100) / 100;
  const isPaymentAmountEntered = isAnyPartialFilled || totalEnteredPaid > 0;
  const effectivePaidAmount = isAnyPartialFilled ? totalEnteredPaid : totalCalculatedAmount;
  const calculatedBalanceDue = Math.max(0, Math.round((totalCalculatedAmount - effectivePaidAmount) * 100) / 100);

  // Live GST breakdown:
  // - If GST is ticked: Base amount + CGST (9%) + SGST (9%) = targetAmount
  // - If GST is disabled: Flat payment without GST, no CGST / SGST bifurcation
  const gstBreakdown = useMemo(() => {
    const targetAmount = effectivePaidAmount > 0 ? effectivePaidAmount : totalCalculatedAmount;
    if (isGstIncluded) {
      const taxable = Math.round(targetAmount / 1.18);
      const totalGst = Math.max(0, targetAmount - taxable);
      const cgst = Math.round(totalGst / 2);
      const sgst = totalGst - cgst;
      return { taxable, totalGst, cgst, sgst, hasGst: true, targetAmount };
    } else {
      return { taxable: targetAmount, totalGst: 0, cgst: 0, sgst: 0, hasGst: false, targetAmount };
    }
  }, [isGstIncluded, effectivePaidAmount, totalCalculatedAmount]);

  const getResolvedPaymentMethod = () => {
    const parts = [];
    if (numCash > 0) parts.push(`Cash (₹${numCash.toLocaleString('en-IN')})`);
    if (numUpi > 0) parts.push(`UPI (₹${numUpi.toLocaleString('en-IN')})`);
    if (numTransfer > 0) parts.push(`Bank Transfer (₹${numTransfer.toLocaleString('en-IN')})`);

    if (parts.length > 1) {
      return `Split: ${parts.join(' + ')}`;
    }
    if (numCash > 0) return 'Cash';
    if (numUpi > 0) return 'UPI';
    if (numTransfer > 0) return 'Account Transfer';
    return 'UPI';
  };

  // PT Package & Commission Calculation
  const ptPackages = useMemo(
    () => selectedPackages.filter((r) => (r.packageType === 'pt' || r.packageType === 'Personal Training') && r.packageId),
    [selectedPackages]
  );
  const hasPtPackage = ptPackages.length > 0;
  const totalPtPrice = ptPackages.reduce((sum, r) => sum + Math.max(0, (Number(r.price) || 0) - (Number(r.discount) || 0)), 0);

  const ptCommissionAmount = (hasPtPackage && currentTrainer)
    ? (commissionType === 'percent'
        ? Math.round((totalPtPrice * (Number(ptCommissionPercent) || 0)) / 100)
        : (Number(ptFixedCommission) || 0))
    : 0;

  // Current Itemized Invoice Title
  const currentInvoiceTitle = useMemo(() => {
    const lineTitles = [];
    selectedPackages.forEach((pkgRow) => {
      const pkgObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
      if (!pkgObj) return;
      const isPtType = pkgRow.packageType === 'Personal Training' || pkgRow.packageType === 'pt';
      if (isPtType) {
        const sess = pkgObj.sessions || ptCustomSessions || 12;
        lineTitles.push(`${sess} Sessions PT${currentTrainer ? ` (Coach ${currentTrainer.name})` : ''}`);
      } else {
        const duration = pkgObj.period || `${pkgObj.durationMonths || pkgObj.duration_months || 1}M`;
        lineTitles.push(`${pkgObj.name} (${duration})`);
      }
    });
    return lineTitles.join(' + ') || 'Gym Services Package';
  }, [selectedPackages, currentTrainer, ptCustomSessions, plans, ptPlans, recoveryPlans]);

  // Live Duplicate Invoice Check
  const duplicateActivePlanInvoice = useMemo(() => {
    if (!currentMember || !paymentDate || totalCalculatedAmount <= 0) return null;

    const todayStr = getTodayDateStr();
    const memberExpiryStr = currentMember.expiryDate ? String(currentMember.expiryDate).split('T')[0] : null;
    const isMemberActive = Boolean(
      currentMember.status === 'Active' ||
      (memberExpiryStr && memberExpiryStr >= todayStr)
    );

    const activePlanId = currentMember.planId ? String(currentMember.planId).replace('plan-', '') : null;
    const activePlanName = (currentMember.planName || '').trim().toLowerCase();

    if (!isMemberActive || (!activePlanId && !activePlanName)) {
      return null;
    }

    const cleanTargetId = String(currentMember.id).replace('mem-', '');

    const memberInvoices = (invoices || []).filter((inv) => {
      const invMemId = String(inv.memberId || inv.user_id || inv.userId || '').replace('mem-', '');
      return invMemId === cleanTargetId;
    });

    const activePlanInvoices = memberInvoices.filter((inv) => {
      const invPlanId = inv.planId ? String(inv.planId).replace('plan-', '') : null;
      const invPlanName = String(inv.planName || inv.title || '').trim().toLowerCase();
      const matchesPlanId = activePlanId && invPlanId && invPlanId === activePlanId;
      const matchesPlanName = activePlanName && invPlanName.includes(activePlanName);
      return matchesPlanId || matchesPlanName;
    });

    return activePlanInvoices.find((inv) => {
      const invDate = String(inv.date || '').split('T')[0];
      if (invDate !== paymentDate) {
        return false;
      }

      const invTotal = Number(inv.totalAmount || inv.total_amount || inv.amount || 0);
      const invPaid = Number(inv.amount || 0);
      const isSameTotal = Math.abs(invTotal - totalCalculatedAmount) < 1;
      const isSamePaid = Math.abs(invPaid - effectivePaidAmount) < 1;

      return isSameTotal && isSamePaid;
    }) || null;
  }, [currentMember, paymentDate, totalCalculatedAmount, effectivePaidAmount, invoices]);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasSqlInjection(notes)) {
      addToast('Invalid characters or disallowed database syntax detected.', 'error');
      return;
    }

    if (!selectedMemberId) {
      addToast('Please select a member to create an invoice.', 'error');
      return;
    }

    const validPackages = selectedPackages.filter((r) => r.packageId && (Number(r.price) >= 0));
    if (validPackages.length === 0) {
      addToast('Please select at least one package with a plan.', 'error');
      return;
    }

    if (totalCalculatedAmount <= 0) {
      addToast('Total bill amount must be greater than ₹0.', 'error');
      return;
    }

    if (calculatedBalanceDue > 0 && !balanceDueDate) {
      addToast('Please select the date when the remaining balance due will be paid.', 'error');
      return;
    }

    // Check discount ceiling across all selected packages
    for (const r of selectedPackages) {
      const pObj = getPackageObject(r.packageType, r.packageId);
      const maxDisc = pObj ? Number(pObj.maxDiscount ?? pObj.max_discount ?? 0) : 0;
      const enteredDisc = Math.max(0, Number(r.discount) || 0);
      if (maxDisc > 0 && enteredDisc > maxDisc) {
        addToast(`Discount ₹${enteredDisc.toLocaleString('en-IN')} on "${pObj?.name || r.packageType}" exceeds max allowed discount of ₹${maxDisc.toLocaleString('en-IN')}.`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const memberName = currentMember?.name || 'Valued Member';
      const cleanUserId = typeof currentMember?.id === 'string'
        ? parseInt(currentMember.id.replace(/\D/g, ''), 10) || 1
        : Number(currentMember?.id) || 1;

      const invoiceTitle = currentInvoiceTitle;
      const isPtRow = (r) => (r.packageType === 'Personal Training' || r.packageType === 'pt') && r.packageId;
      const isRecoveryRow = (r) => (r.packageType === 'Massage' || r.packageType === 'Activities' || r.packageType === 'recovery') && r.packageId;
      const hasPt = selectedPackages.some(isPtRow);
      const hasRecovery = selectedPackages.some(isRecoveryRow);
      const hasMembership = selectedPackages.some((r) => !isPtRow(r) && !isRecoveryRow(r) && r.packageId);

      const membershipRow = selectedPackages.find((r) => !isPtRow(r) && !isRecoveryRow(r) && r.packageId) || selectedPackages.find((r) => r.packageId);
      const membershipPlanObj = membershipRow ? getPackageObject(membershipRow.packageType, membershipRow.packageId) : null;

      const ptRow = selectedPackages.find(isPtRow);
      const ptPlanObj = ptRow ? getPackageObject(ptRow.packageType, ptRow.packageId) : null;

      const recoveryRow = selectedPackages.find(isRecoveryRow);
      const recoveryPlanObj = recoveryRow ? getPackageObject(recoveryRow.packageType, recoveryRow.packageId) : null;

      const mainCategory = hasMembership
        ? (membershipRow ? (membershipRow.packageType || 'Membership Fee') : 'Membership Fee')
        : (hasPt ? 'Personal Training' : 'Recovery & Wellness');

      const generatedInvoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const resolvedPaymentMethodString = getResolvedPaymentMethod();
      const targetExpiryDate = membershipRow?.expiryDate
        || ptRow?.expiryDate
        || recoveryRow?.expiryDate
        || membershipEndDate
        || mainMembershipValidityInfo?.newExpiryDate
        || currentMember?.expiryDate;

      const targetStartDate = membershipRow?.startDate
        || ptRow?.startDate
        || recoveryRow?.startDate
        || membershipStartDate
        || paymentDate
        || getTodayDateStr();

      // 1. Record Invoice directly in Backend Database API
      let backendInvoiceRef = generatedInvoiceNo;

      try {
        if (api.invoices?.create) {
          const invPayload = {
            user_id: cleanUserId,
            member_id: currentMember?.id,
            memberId: currentMember?.id,
            member_name: memberName,
            memberName: memberName,
            plan_id: membershipPlanObj?.id || ptPlanObj?.id || recoveryPlanObj?.id || null,
            planId: membershipPlanObj?.id || ptPlanObj?.id || recoveryPlanObj?.id || null,
            plan_name: invoiceTitle,
            planName: invoiceTitle,
            title: `${memberName} - ${invoiceTitle}`,
            category: mainCategory,
            amount: effectivePaidAmount,
            total_amount: totalCalculatedAmount,
            totalAmount: totalCalculatedAmount,
            dues_amount: calculatedBalanceDue,
            duesAmount: calculatedBalanceDue,
            pending_amount: calculatedBalanceDue,
            pendingAmount: calculatedBalanceDue,
            due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
            dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
            payment_date: paymentDate || getTodayDateStr(),
            date: paymentDate || getTodayDateStr(),
            start_date: targetStartDate,
            startDate: targetStartDate,
            payment_method: resolvedPaymentMethodString,
            paymentMethod: resolvedPaymentMethodString,
            status: calculatedBalanceDue > 0 ? 'Pending' : 'Paid',
            expiry_date: targetExpiryDate,
            expiryDate: targetExpiryDate,
            is_gst_included: isGstIncluded,
            gst_amount: gstBreakdown.totalGst,
            taxable_amount: gstBreakdown.taxable,
            notes: notes || `Recorded invoice: ${invoiceTitle}${calculatedBalanceDue > 0 ? ` (Pending Balance Due: ₹${calculatedBalanceDue})` : ''}`,
            created_by: currentUser?.userId || currentUser?.id,
            created_by_name: handledByStaffName?.trim() || defaultHandledBy || currentUser?.name || 'Staff'
          };

          const invRes = await api.invoices.create(invPayload);
          if (invRes?.data?.invoiceNumber || invRes?.data?.id) {
            backendInvoiceRef = invRes.data.invoiceNumber || invRes.data.id;
          }
        }
      } catch (invErr) {
        console.warn('Backend invoice create note:', invErr);
        if (recordPayment) {
          await recordPayment({
            memberId: currentMember?.id,
            memberName: memberName,
            planId: membershipPlanObj?.id || null,
            planName: invoiceTitle,
            amount: effectivePaidAmount,
            totalAmount: totalCalculatedAmount,
            duesAmount: calculatedBalanceDue,
            dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
            paymentDate,
            expiryDate: targetExpiryDate,
            paymentMethod: resolvedPaymentMethodString
          });
        }
      }

      // 2. Synchronize Member Status & Expiry in Backend
      if (currentMember?.id) {
        try {
          if (api.members?.update) {
            const memberUpdateData = {
              status: 'Active',
              dues_amount: calculatedBalanceDue,
              due_date: calculatedBalanceDue > 0 ? balanceDueDate : null
            };
            if (hasMembership && membershipPlanObj) {
              memberUpdateData.plan_id = membershipPlanObj.id;
              memberUpdateData.plan_name = membershipPlanObj.name;
              memberUpdateData.expiry_date = targetExpiryDate;
              if (membershipRow?.startDate) {
                memberUpdateData.start_date = membershipRow.startDate;
              }
            }
            if (hasPt && ptRow) {
              memberUpdateData.training_type = 'pt';
              if (currentTrainer) {
                memberUpdateData.trainer_id = currentTrainer.id;
              }
              const sessionsToAdd = Number(ptPlanObj?.sessions) || ptCustomSessions || 12;
              memberUpdateData.pt_sessions = (Number(currentMember.ptSessions) || 0) + sessionsToAdd;
            }
            await api.members.update(currentMember.id, memberUpdateData);
          }
        } catch (memErr) {
          console.warn('Member update API note:', memErr);
        }

        // Also update local context
        if (updateMember) {
          const updatedDues = calculatedBalanceDue;
          const memberPayload = {
            ...currentMember,
            duesAmount: updatedDues,
            dues_amount: updatedDues,
            due_date: calculatedBalanceDue > 0 ? balanceDueDate : currentMember.dueDate,
            dueDate: calculatedBalanceDue > 0 ? balanceDueDate : currentMember.dueDate,
          };
          if (hasMembership && membershipPlanObj) {
            memberPayload.planId = membershipPlanObj.id;
            memberPayload.planName = membershipPlanObj.name;
            memberPayload.expiryDate = targetExpiryDate;
            memberPayload.expiry_date = targetExpiryDate;
            if (membershipRow?.startDate) {
              memberPayload.startDate = membershipRow.startDate;
              memberPayload.start_date = membershipRow.startDate;
            }
            memberPayload.status = 'Active';
          }
          if (hasPt && ptPlanObj) {
            const sessionsToAdd = Number(ptPlanObj.sessions) || ptCustomSessions || 12;
            memberPayload.trainingType = 'pt';
            memberPayload.trainerId = currentTrainer?.id || currentMember.trainerId;
            memberPayload.trainerName = currentTrainer ? `${currentTrainer.name} (PT Coach)` : currentMember.trainerName;
            memberPayload.ptPlanId = ptRow.packageId;
            memberPayload.ptPlanName = ptPlanObj.name;
            memberPayload.ptSessions = (Number(currentMember.ptSessions) || 0) + sessionsToAdd;
          }
          if (recoveryRow && recoveryPlanObj) {
            memberPayload.recoveryPlanId = recoveryPlanObj.id;
            memberPayload.recoveryPlanName = recoveryPlanObj.name;
          }
          await updateMember(currentMember.id, memberPayload);
        }
      }

      // 3. Log Trainer Commission if PT Coach is included
      if (hasPt && currentTrainer && ptCommissionAmount > 0 && addCommissionRecord) {
        try {
          await addCommissionRecord({
            trainerId: currentTrainer.id,
            trainerName: currentTrainer.name,
            memberName: memberName,
            planName: ptPlanObj ? ptPlanObj.name : `1-on-1 PT Coaching`,
            sessionType: 'Personal Training (PT)',
            serviceType: 'Personal Training (PT)',
            ratePercent: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
            commissionPct: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
            amount: totalPtPrice,
            packageAmount: totalPtPrice,
            commissionEarned: ptCommissionAmount,
            date: paymentDate || getTodayDateStr(),
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
        totalAmount: totalCalculatedAmount,
        duesAmount: calculatedBalanceDue,
        pendingAmount: calculatedBalanceDue,
        dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
        date: paymentDate || getTodayDateStr(),
        invoiceDate: paymentDate || getTodayDateStr(),
        paymentDate: paymentDate || getTodayDateStr(),
        paymentMethod: resolvedPaymentMethodString,
        isGstIncluded,
        status: calculatedBalanceDue > 0 ? 'Pending' : 'Paid',
        expiryDate: targetExpiryDate,
        createdByName: handledByStaffName?.trim() || defaultHandledBy || currentUser?.name || 'Staff'
      });
    } catch (err) {
      console.error('Create invoice error:', err);
      addToast(`Failed to create invoice: ${err.message}`, 'error');
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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateTab) {
      onNavigateTab('invoices');
    }
  };

  // -------------------------------------------------------------
  // SUCCESS RECEIPT FULL-SCREEN VIEW (Matches AddMemberPage Receipt)
  // -------------------------------------------------------------
  if (completedInvoiceData) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 w-full max-w-5xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                  Tax Invoice Issued
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Invoice Issued & Payment Recorded!
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official gym invoice #{completedInvoiceData.invoiceNumber} has been logged in Member Invoices & Accounts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Back to Invoices</span>
            </button>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Invoice Number</span>
              <div className="text-base font-black text-slate-900 font-mono">
                #{completedInvoiceData.invoiceNumber}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Member</span>
              <div className="text-sm font-bold text-slate-800">
                {completedInvoiceData.memberName}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Payment Status</span>
              <div>
                {Number(completedInvoiceData.duesAmount) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Pending • ₹{Number(completedInvoiceData.duesAmount).toLocaleString('en-IN')} Due</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Paid in Full</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Bill</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                ₹{Number(completedInvoiceData.totalAmount || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Paid Now</span>
              <div className="text-base font-black text-emerald-800 mt-0.5">
                ₹{Number(completedInvoiceData.amount || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Mode</span>
              <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                {completedInvoiceData.paymentMethod}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Issued By</span>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {completedInvoiceData.createdByName}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Invoice</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCompletedInvoiceData(null);
                setSelectedMemberId('');
              }}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer active:scale-95"
            >
              + Create Another Invoice
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN INVOICE CREATION FULL-SCREEN FORM (Matches AddMemberPage)
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 w-full max-w-5xl mx-auto">
      {/* Top Header Navigation Bar (Matches AddMemberPage) */}
      {!isModal && (
        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Return to Member Invoices"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Create Invoice & Collect Fee
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Select member, configure multi-package services, apply discounts, and generate official GST invoice.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tax Invoicing
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* SECTION 1: MEMBER SELECTION & STAFF IN-CHARGE */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Member Selection & Staff In-Charge
              </h2>
            </div>
            {currentMember && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                currentMember.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : currentMember.status === 'Expired'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                Status: {currentMember.status || 'Active'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Member Search & Select */}
            <div className="sm:col-span-8">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Choose Athlete / Member *
              </label>
              <MemberSearchSelect
                members={members}
                value={selectedMemberId}
                onChange={handleMemberChange}
                required
              />
            </div>

            {/* Handled By Staff Executive */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Handled By Staff *
              </label>
              <input
                type="text"
                value={handledByStaffName}
                onChange={(e) => setHandledByStaffName(e.target.value)}
                placeholder="Staff Executive Name"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Member Details Snapshot */}
          {currentMember && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-[11px]">
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Contact Phone</span>
                <span className="font-bold text-slate-900 truncate block mt-0.5">
                  {currentMember.phone || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Current Active Plan</span>
                <span className="font-bold text-slate-900 truncate block mt-0.5">
                  {memberCurrentPlan?.planName || currentMember.planName || 'Standard Plan'}
                </span>
              </div>
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Plan Validity</span>
                <span className="font-bold block mt-0.5">
                  {memberCurrentPlan?.isExpired ? (
                    <span className="text-rose-600 font-extrabold uppercase">Expired</span>
                  ) : (
                    <span className="text-emerald-700">{formatDateDisplay(memberCurrentPlan?.expiryDate || currentMember.expiryDate) || 'N/A'}</span>
                  )}
                </span>
              </div>
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Pending Dues</span>
                <span className="font-bold block mt-0.5">
                  {Number(currentMember.duesAmount || 0) > 0 ? (
                    <span className="text-rose-600 font-mono">₹{Number(currentMember.duesAmount).toLocaleString('en-IN')}</span>
                  ) : (
                    <span className="text-emerald-700">₹0 Settled</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* DEDICATED CURRENT PLAN DETAILS & REMAINING DAYS CARD */}
          {currentMember && memberCurrentPlan?.hasPlan && (
            <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200 shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-emerald-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Member Current Plan Details
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {memberCurrentPlan.planName}
                      </span>
                      {memberCurrentPlan.isExpired ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200 uppercase">
                          Expired • 0 Days Remaining
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          Active • {memberCurrentPlan.remainingDays} Days Remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {memberCurrentPlan.remainingDays > 0 ? (
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-center shadow-2xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Days Left</span>
                      <span className="text-sm font-black text-emerald-700 font-mono">
                        {memberCurrentPlan.remainingDays} Days
                      </span>
                    </div>
                  ) : (
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-rose-200 text-center shadow-2xs">
                      <span className="text-[9px] uppercase font-bold text-rose-400 block">Status</span>
                      <span className="text-sm font-black text-rose-600 uppercase">
                        Expired
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Specs Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Joined / Started</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {memberCurrentPlan.startDate ? formatDateDisplay(memberCurrentPlan.startDate) : 'N/A'}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Current Expiry</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {memberCurrentPlan.isExpired ? (
                      <span className="text-rose-600 font-bold">Expired</span>
                    ) : (
                      memberCurrentPlan.expiryDate ? formatDateDisplay(memberCurrentPlan.expiryDate) : 'N/A'
                    )}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Remaining Days</span>
                  <span className="font-black font-mono block mt-0.5">
                    {memberCurrentPlan.remainingDays > 0 ? (
                      <span className="text-emerald-700">{memberCurrentPlan.remainingDays} Days</span>
                    ) : (
                      <span className="text-rose-600">0 Days (Expired)</span>
                    )}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Membership Dues</span>
                  <span className="font-semibold font-mono block mt-0.5">
                    {Number(currentMember.duesAmount || 0) > 0 ? (
                      <span className="text-rose-600 font-bold">₹{Number(currentMember.duesAmount).toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-emerald-700">₹0 Settled</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: PACKAGES & SERVICES SELECTION (Dynamic Multi-Package Grid) */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Dumbbell className="w-4 h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Invoiced Packages & Services
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddPackageRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Package</span>
            </button>
          </div>

          {/* DYNAMIC VALIDITY ACCUMULATION & EXTENSION BANNER */}
          {mainMembershipValidityInfo && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200 shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Plan Validity & Extension Calculation</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 self-start sm:self-auto shadow-2xs">
                  {mainMembershipValidityInfo.isExtended ? '⚡ Extended on Top of Current Active Plan' : '⚡ Fresh Plan Validity'}
                </span>
              </div>

              {/* 4 Cards: Current Remaining | New Plan Duration | Total Accumulated Validity | Resulting Expiry Date */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Current Remaining</span>
                  <span className="font-black text-slate-800 font-mono text-sm sm:text-base block mt-0.5">
                    {mainMembershipValidityInfo.currentRemainingDays} Days
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                    {mainMembershipValidityInfo.currentRemainingDays > 0 ? `Till ${formatDateDisplay(mainMembershipValidityInfo.currentExpiryFormatted)}` : 'Plan Expired'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">+ New Plan Duration</span>
                  <span className="font-black text-emerald-700 font-mono text-sm sm:text-base block mt-0.5">
                    +{mainMembershipValidityInfo.newPlanDays} Days
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                    {mainMembershipValidityInfo.planObj?.name}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs text-center">
                  <span className="text-[10px] text-emerald-800 block uppercase font-bold">= Total Validity</span>
                  <span className="font-black text-emerald-800 font-mono text-sm sm:text-base block mt-0.5">
                    {mainMembershipValidityInfo.totalCombinedDays} Days
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-semibold">
                    Combined Active Days
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">New Valid Till</span>
                  <span className="font-black text-emerald-700 text-sm sm:text-base block mt-0.5">
                    {formatDateDisplay(mainMembershipValidityInfo.newExpiryDate)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                    {mainMembershipValidityInfo.isExtended ? `From ${formatDateDisplay(mainMembershipValidityInfo.effectiveStartDate)}` : `Starts ${formatDateDisplay(mainMembershipValidityInfo.effectiveStartDate)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {selectedPackages.map((pkgRow, idx) => {
              const currentPkgObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
              const isPt = pkgRow.packageType === 'Personal Training' || pkgRow.packageType === 'pt';
              const availablePackages = getPackagesForType(pkgRow.packageType, plans, ptPlans, recoveryPlans);

              const maxPlanDiscount = currentPkgObj
                ? Number(currentPkgObj.maxDiscount ?? currentPkgObj.max_discount ?? 0)
                : 0;

              const pkgVal = computePackageValidity(pkgRow);

              return (
                <div
                  key={pkgRow.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>Service #{idx + 1}: {pkgRow.packageType}</span>
                    </span>

                    {selectedPackages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePackageRow(pkgRow.id)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Package Category */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={pkgRow.packageType}
                        onChange={(e) => handlePackageTypeChange(pkgRow.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {PACKAGE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Package Plan */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Plan / Pass *
                      </label>
                      <select
                        value={pkgRow.packageId}
                        onChange={(e) => handlePackageIdChange(pkgRow.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">-- Choose Plan --</option>
                        {availablePackages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{' '}
                            {p.sessions
                              ? `(${p.sessions} Sessions)`
                              : p.period
                              ? `(${p.period})`
                              : p.durationMonths
                              ? `(${p.durationMonths} Mo)`
                              : ''}{' '}
                            — ₹{Number(p.price || 0).toLocaleString('en-IN')}
                          </option>
                        ))}
                        <option value="__ADD_NEW__" className="font-bold text-emerald-600">
                          + Create New Custom Plan...
                        </option>
                      </select>
                    </div>

                    {/* Price */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Fee (₹)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`₹${(Number(pkgRow.price) || 0).toLocaleString('en-IN')}`}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 text-right"
                      />
                    </div>

                    {/* Discount */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={(e) => preventNonNumericKey(e, true)}
                        placeholder="0"
                        value={pkgRow.discount}
                        onChange={(e) => handlePackageDiscountChange(pkgRow.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500 text-right"
                      />
                    </div>
                  </div>

                  {/* Start Date & End Date Row */}
                  <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Start Date *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={pkgRow.startDate || getTodayDateStr()}
                        onChange={(e) => handlePackageStartDateChange(pkgRow.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 cursor-pointer shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>End Date / Valid Till *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={pkgRow.expiryDate || ''}
                        onChange={(e) => handlePackageExpiryDateChange(pkgRow.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 cursor-pointer shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Validity Info for Row */}
                  {pkgVal && (
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {!isPt && pkgVal.isExtended ? (
                          <span>
                            Current Remaining: <strong className="text-slate-900 font-mono">{pkgVal.currentRemainingDays}d</strong> + New Plan: <strong className="text-emerald-700 font-mono">+{pkgVal.newPlanDays}d</strong> = Total Validity: <strong className="text-emerald-800 font-mono">{pkgVal.totalCombinedDays} Days</strong>
                          </span>
                        ) : (
                          <span>
                            Plan Duration: <strong className="text-emerald-700 font-mono">{pkgVal.newPlanDays} Days</strong>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        <span>Valid Until: {formatDateDisplay(pkgRow.expiryDate || pkgVal.newExpiryDate)}</span>
                      </div>
                    </div>
                  )}

                  {/* Coach Assignment if PT */}
                  {isPt && (
                    <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Assign PT Coach / Trainer
                        </label>
                        <select
                          value={selectedTrainerId}
                          onChange={(e) => setSelectedTrainerId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="">-- Choose Coach --</option>
                          {trainers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.specialty || 'Personal Trainer'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {currentTrainer && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Trainer Commission Rate
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={ptCommissionPercent}
                              onChange={(e) => setPtCommissionPercent(e.target.value)}
                              className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                            />
                            <span className="text-xs text-slate-500 font-semibold">% (₹{ptCommissionAmount.toLocaleString('en-IN')})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: FEE CALCULATION & PAYMENT SETTLEMENT (Exact mirror of AddMemberPage Section 5) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
          {/* Header with Title, Gross Packages & Discounts, and Total Payable Price Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Fee Calculation & Payment Settlement
                </h2>
              </div>
              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pl-7">
                <span>Total Packages: <strong className="text-slate-700 font-mono">₹{totalGrossPackages.toLocaleString('en-IN')}</strong></span>
                {numDiscount > 0 && (
                  <span className="text-amber-700 font-semibold">Total Discount: <strong className="font-mono">-₹{numDiscount.toLocaleString('en-IN')}</strong></span>
                )}
                {isPaymentAmountEntered && (
                  isGstIncluded ? (
                    <span className="text-emerald-700 font-medium">GST (18%): <span className="font-semibold">Included in Bill</span></span>
                  ) : (
                    <span className="text-slate-500 font-medium">GST: <span className="font-semibold">Disabled (Non-GST)</span></span>
                  )
                )}
              </div>
            </div>

            {/* Total Payable Price Pill */}
            <div className="sm:self-center shrink-0 bg-emerald-50/90 px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-2.5 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Total Payable Price</span>
              <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                ₹{totalCalculatedAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 3 Payment Methods: Cash, UPI, Account Transfer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* 1. Cash */}
            <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-1.5">
              <span className="text-xs font-bold text-slate-800 block">Cash</span>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={(e) => preventNonNumericKey(e, true)}
                    value={cashAmount}
                    onChange={(e) => setCashAmount(sanitizeDecimal(e.target.value))}
                    placeholder="0"
                    className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all text-right"
                  />
                </div>
                <button
                  type="button"
                  title="Pay remaining in Cash"
                  onClick={() => {
                    const other = (Number(upiAmount) || 0) + (Number(accountTransferAmount) || 0);
                    const rem = Math.max(0, totalCalculatedAmount - other);
                    setCashAmount(rem > 0 ? String(rem) : '');
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                >
                  Full
                </button>
              </div>
            </div>

            {/* 2. UPI */}
            <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-1.5">
              <span className="text-xs font-bold text-slate-800 block">UPI</span>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={(e) => preventNonNumericKey(e, true)}
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(sanitizeDecimal(e.target.value))}
                    placeholder="0"
                    className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 transition-all text-right"
                  />
                </div>
                <button
                  type="button"
                  title="Pay remaining via UPI"
                  onClick={() => {
                    const other = (Number(cashAmount) || 0) + (Number(accountTransferAmount) || 0);
                    const rem = Math.max(0, totalCalculatedAmount - other);
                    setUpiAmount(rem > 0 ? String(rem) : '');
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                >
                  Full
                </button>
              </div>
            </div>

            {/* 3. Account Transfer */}
            <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-1.5">
              <span className="text-xs font-bold text-slate-800 block">Account Transfer</span>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={(e) => preventNonNumericKey(e, true)}
                    value={accountTransferAmount}
                    onChange={(e) => setAccountTransferAmount(sanitizeDecimal(e.target.value))}
                    placeholder="0"
                    className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400 transition-all text-right"
                  />
                </div>
                <button
                  type="button"
                  title="Pay remaining via Account Transfer"
                  onClick={() => {
                    const other = (Number(cashAmount) || 0) + (Number(upiAmount) || 0);
                    const rem = Math.max(0, totalCalculatedAmount - other);
                    setAccountTransferAmount(rem > 0 ? String(rem) : '');
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                >
                  Full
                </button>
              </div>
            </div>
          </div>

          {/* GST TOGGLE BUTTON & TAX BREAKDOWN (Appears when payment amount is entered) */}
          {isPaymentAmountEntered && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg border transition-colors shrink-0 mt-0.5 sm:mt-0 ${
                      isGstIncluded
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">GST</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          isGstIncluded
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isGstIncluded ? 'GST Included' : 'GST Disabled (Non-GST)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isGstIncluded
                        ? `GST included in ₹${gstBreakdown.targetAmount.toLocaleString('en-IN')}. Bill will display Base Fee + CGST + SGST = ₹${gstBreakdown.targetAmount.toLocaleString('en-IN')}.`
                        : `Received ₹${gstBreakdown.targetAmount.toLocaleString('en-IN')} flat without GST. Bill will NOT have CGST / SGST bifurcation.`}
                    </p>
                  </div>
                </div>

                {/* Toggle Button */}
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none self-start sm:self-center bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                  <input
                    type="checkbox"
                    checked={isGstIncluded}
                    onChange={(e) => setIsGstIncluded(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                  <span className="text-xs font-bold text-slate-800">
                    {isGstIncluded ? 'GST Included' : 'GST Disabled'}
                  </span>
                </label>
              </div>

              {/* When GST is Ticked: Show Base Amount + CGST + SGST = Total */}
              {isGstIncluded ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">Base Amount</span>
                    <strong className="text-slate-800 font-mono text-xs">
                      ₹{gstBreakdown.taxable.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">CGST (9%)</span>
                    <strong className="text-slate-800 font-mono text-xs">
                      ₹{gstBreakdown.cgst.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">SGST (9%)</span>
                    <strong className="text-slate-800 font-mono text-xs">
                      ₹{gstBreakdown.sgst.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg border bg-emerald-50/70 border-emerald-200 text-emerald-900">
                    <span className="block text-[10px] font-semibold uppercase">
                      Total (Base + Taxes)
                    </span>
                    <strong className="font-mono text-xs">
                      ₹{gstBreakdown.targetAmount.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="font-medium">
                    Non-Tax Bill: Flat <strong>₹{gstBreakdown.targetAmount.toLocaleString('en-IN')}</strong> received without GST.
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                    No GST Bifurcation on Bill
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Remaining Balance Due or Paid in Full banner */}
          {calculatedBalanceDue > 0 ? (
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Balance Due Display */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Remaining Balance Due (Pending)
                  </label>
                  <div className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 flex items-center justify-between shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-600">Balance Pending:</span>
                    <span className="text-sm font-black font-mono text-rose-600">
                      ₹{calculatedBalanceDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Date Option for Remaining Payment */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                    <span>Promised Due Date *</span>
                    <span className="text-[10px] font-normal text-amber-800">When remaining will be paid</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={balanceDueDate}
                      min={getTodayDateStr()}
                      onChange={(e) => setBalanceDueDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Settlement Summary */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200/80 font-medium">
                <span className="text-slate-600">
                  Total Bill: <strong className="text-slate-900 font-mono">₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong>
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
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {totalCalculatedAmount > 0 ? (
                    <>Full payment of <strong>₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong> entered. <strong>No balance remaining.</strong></>
                  ) : (
                    <>Payment settled. <strong>No balance remaining.</strong></>
                  )}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-300">
                No Balance Remaining
              </span>
            </div>
          )}

          {/* Notes / Remarks */}
          <div className="pt-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Invoice Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Invoiced via front desk with quarterly renewal + personal coaching"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || duplicateActivePlanInvoice}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Issuing Invoice & Recording Payment...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Issue Invoice & Collect Fee</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Plan Creation Modal */}
      {quickAddPlanType && (
        <MembershipPlanModal
          isOpen={Boolean(quickAddPlanType)}
          onClose={() => setQuickAddPlanType(null)}
          title={
            quickAddPlanType === 'membership'
              ? 'Quick Add Membership Plan'
              : quickAddPlanType === 'pt'
              ? 'Quick Add Personal Training Plan'
              : 'Quick Add Recovery / Wellness Pass'
          }
          planType={quickAddPlanType}
          formData={quickPlanForm}
          setFormData={setQuickPlanForm}
          onSave={handleSaveQuickPlan}
          isSubmitting={isSavingQuickPlan}
        />
      )}
    </div>
  );
};

export default CreateInvoicePage;
