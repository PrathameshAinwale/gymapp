import React, { useState, useEffect, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import MemberSearchSelect from '../common/MemberSearchSelect';
import { MembershipPlanModal, PACKAGE_TYPES, getPackagesForType, getPackageObjectFromLists } from '../common/MembershipPlanModal';
import { api } from '../../services/api';
import { generateInvoicePdf, downloadPdfBlob, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';
import { calculatePlanExpiryDate } from '../../utils/dateUtils';
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
  HeartHandshake,
  Download,
  MessageCircle,
  AlertCircle,
  Plus,
  Trash2,
  Tag,
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

  const defaultHandledBy = currentUser?.name || '';

  // Selected Member
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [handledByStaffName, setHandledByStaffName] = useState(defaultHandledBy);

  useEffect(() => {
    if (!handledByStaffName && defaultHandledBy) {
      setHandledByStaffName(defaultHandledBy);
    }
  }, [defaultHandledBy]);

  // Membership Dates State
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [membershipEndDate, setMembershipEndDate] = useState('');
  const [isManualEndDate, setIsManualEndDate] = useState(false);

  // PT Specific State
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [commissionType, setCommissionType] = useState('percent'); // 'percent' | 'fixed'
  const [ptCommissionPercent, setPtCommissionPercent] = useState(20);
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
  const [quickAddPlanType, setQuickAddPlanType] = useState(null); // 'membership' | 'pt' | 'recovery'
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

  // Payment Settlement & Date
  const [paymentDate, setPaymentDate] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [accountTransferAmount, setAccountTransferAmount] = useState('');
  const [balanceDueDate, setBalanceDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Submission & Receipt States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedInvoiceData, setCompletedInvoiceData] = useState(null);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };

  const getPackageObject = (type, id) => {
    return getPackageObjectFromLists(type, id, plans, ptPlans, recoveryPlans);
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
      if (cleanCurrent >= todayStr) {
        effectiveBaseStr = cleanCurrent;
      }
    }

    const durationMonths = Number(plan.durationMonths || plan.duration_months) || 1;
    const periodStr = plan.period || '';
    const bonusDays = Number(plan.offerDays || plan.offer_days) || 0;

    return calculatePlanExpiryDate(effectiveBaseStr, durationMonths, periodStr, bonusDays);
  };

  // Auto-fetch data and initialize on open
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
        const calculatedEnd = computeCombinedPlanEndDate(initialStartDate, defaultPlan, targetMember?.expiryDate);
        setMembershipEndDate(calculatedEnd);
      }

      // Default Trainer
      if (trainers && trainers.length > 0) {
        const defaultTrainer =
          trainers.find((t) => String(t.id) === String(targetMember?.trainerId)) ||
          trainers[0];
        setSelectedTrainerId(String(defaultTrainer.id));
      }

      // Default Package Row
      const defaultPackageType = defaultPlan?.packageType || defaultPlan?.package_type || 'Gym-Cardio';
      setSelectedPackages([
        {
          id: 'pkg-1',
          packageType: defaultPackageType,
          packageId: defaultPlan ? String(defaultPlan.id) : '',
          price: Number(defaultPlan?.price) || 0,
          discount: ''
        }
      ]);

      setCashAmount('');
      setUpiAmount('');
      setAccountTransferAmount('');
      setBalanceDueDate('');
      setNotes('');
      setCompletedInvoiceData(null);
    }
  }, [isOpen, initialMember, initialMemberId]);

  // Sync first package when plans load asynchronously
  useEffect(() => {
    if (plans && plans.length > 0) {
      setSelectedPackages((prev) => {
        const first = prev[0];
        if (first && !first.packageId) {
          const available = getPackagesForType(first.packageType, plans, ptPlans, recoveryPlans);
          const p = available[0] || plans[0];
          return prev.map((row, idx) =>
            idx === 0
              ? { ...row, packageType: row.packageType || p.packageType || 'Gym-Cardio', packageId: String(p.id), price: Number(p.price) || 0 }
              : row
          );
        }
        return prev;
      });
    }
  }, [plans, ptPlans, recoveryPlans]);

  // Selected Member Resolution
  const currentMember = useMemo(
    () => members.find((m) => String(m.id) === String(selectedMemberId)) || null,
    [members, selectedMemberId]
  );

  const currentTrainer = useMemo(
    () => trainers.find((t) => String(t.id) === String(selectedTrainerId)) || trainers[0] || null,
    [trainers, selectedTrainerId]
  );

  // Helper to re-calculate expiry date
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

      const matchedPlan = plans.find((p) => String(p.id) === String(m.planId) || p.name === m.planName) || plans[0];
      if (matchedPlan) {
        const matchedType = matchedPlan.packageType || matchedPlan.package_type || 'Gym-Cardio';
        setSelectedPackages((prev) =>
          prev.map((row, idx) =>
            idx === 0
              ? { ...row, packageType: matchedType, packageId: String(matchedPlan.id), price: Number(matchedPlan.price) || 0 }
              : row
          )
        );
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

  // Package Row Handlers
  const handlePackageTypeChange = (rowId, newType) => {
    const isPt = newType === 'Personal Training' || newType === 'pt';
    if (isPt && trainers && trainers.length > 0 && !selectedTrainerId) {
      setSelectedTrainerId(trainers[0].id);
    }
    const available = getPackagesForType(newType, plans, ptPlans, recoveryPlans);
    const firstPlan = available[0] || null;

    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const newPackageId = firstPlan ? String(firstPlan.id) : '';
        const newPrice = Number(firstPlan?.price) || 0;

        if (firstPlan && !isPt && !isManualEndDate && membershipStartDate) {
          const calculated = computeCombinedPlanEndDate(membershipStartDate, firstPlan, currentMember?.expiryDate);
          if (calculated) setMembershipEndDate(calculated);
        }

        return {
          ...row,
          packageType: newType,
          packageId: newPackageId,
          price: newPrice,
          discount: ''
        };
      })
    );
  };

  const handlePackageIdChange = (rowId, newPackageId) => {
    if (newPackageId === '__ADD_NEW__') {
      const row = selectedPackages.find((r) => r.id === rowId);
      handleOpenQuickAdd(row?.packageType || 'Gym-Cardio', rowId);
      return;
    }
    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const found = getPackageObject(row.packageType, newPackageId);
        const price = Number(found?.price) || 0;
        const isPt = row.packageType === 'Personal Training' || row.packageType === 'pt';

        if (found && !isPt && !isManualEndDate && membershipStartDate) {
          const calculated = computeCombinedPlanEndDate(membershipStartDate, found, currentMember?.expiryDate);
          if (calculated) setMembershipEndDate(calculated);
        } else if (isPt && trainers && trainers.length > 0 && !selectedTrainerId) {
          setSelectedTrainerId(trainers[0].id);
        }

        return {
          ...row,
          packageId: newPackageId,
          price: price
        };
      })
    );
  };

  const handlePackagePriceChange = (rowId, val) => {
    const sanitized = sanitizeDecimal(val);
    setSelectedPackages((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, price: sanitized } : row))
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

    setSelectedPackages((prev) => [
      ...prev,
      {
        id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        packageType: nextType,
        packageId: firstPlan ? String(firstPlan.id) : '',
        price: Number(firstPlan?.price) || 0,
        discount: ''
      }
    ]);
  };

  const handleRemovePackageRow = (rowId) => {
    if (selectedPackages.length <= 1) {
      const defaultType = 'Gym-Cardio';
      const available = getPackagesForType(defaultType, plans, ptPlans, recoveryPlans);
      const first = available[0] || plans[0] || null;
      setSelectedPackages([
        {
          id: `pkg-${Date.now()}`,
          packageType: defaultType,
          packageId: first ? String(first.id) : '',
          price: Number(first?.price) || 0,
          discount: ''
        }
      ]);
      return;
    }
    setSelectedPackages((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Quick Plan Creation Handlers
  const handleOpenQuickAdd = (type, rowId = null) => {
    setQuickAddTargetRowId(rowId);
    if (type === 'recovery') {
      setQuickPlanForm({
        name: '',
        price: 799,
        duration: '30 Mins',
        sessions: 1,
        instructorOrType: 'Ice Plunge',
        description: 'Therapy & Recovery Session'
      });
    } else if (type === 'pt') {
      setQuickPlanForm({
        name: '',
        price: 3000,
        sessions: 12,
        validityDays: 30,
        instructorOrType: 'Master Coach',
        description: '1-on-1 PT coaching'
      });
    }
    setQuickAddPlanType(type);
  };

  const handleSaveQuickPlan = async (e) => {
    e.preventDefault();
    if (!quickPlanForm.name.trim()) {
      addToast('Please enter a plan name.', 'error');
      return;
    }
    if (!quickPlanForm.price || Number(quickPlanForm.price) <= 0) {
      addToast('Please enter a valid plan price.', 'error');
      return;
    }

    setIsSavingQuickPlan(true);
    try {
      if (quickAddPlanType === 'recovery') {
        const created = await addRecoveryPlan?.({
          name: quickPlanForm.name.trim(),
          duration: quickPlanForm.duration || '30 Mins',
          sessions: Number(quickPlanForm.sessions) || 1,
          price: Number(quickPlanForm.price),
          type: quickPlanForm.instructorOrType || 'Ice Plunge',
          description: quickPlanForm.description || 'Therapy & Recovery Session'
        });
        if (created?.id) {
          await fetchRecoveryPlans?.();
          if (quickAddTargetRowId) {
            setSelectedPackages((prev) =>
              prev.map((r) =>
                r.id === quickAddTargetRowId
                  ? { ...r, packageId: String(created.id), price: Number(created.price) || 0 }
                  : r
              )
            );
          }
          addToast(`Recovery plan "${quickPlanForm.name}" created and applied!`, 'success');
        }
      } else if (quickAddPlanType === 'pt') {
        const created = await addPTPlan?.({
          name: quickPlanForm.name.trim(),
          sessions: Number(quickPlanForm.sessions) || 12,
          validityDays: Number(quickPlanForm.validityDays) || 30,
          price: Number(quickPlanForm.price),
          trainerLevel: quickPlanForm.instructorOrType || 'Master Coach',
          description: quickPlanForm.description || '1-on-1 PT coaching'
        });
        if (created?.id) {
          await fetchPtPlans?.();
          if (quickAddTargetRowId) {
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
      }
      setQuickAddPlanType(null);
    } catch (err) {
      console.error('Error saving quick plan:', err);
      addToast(`Failed to save plan: ${err.message}`, 'error');
    } finally {
      setIsSavingQuickPlan(false);
    }
  };

  // Financial Calculations
  const totalGrossPackages = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  }, [selectedPackages]);

  const totalDiscountAmount = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + Math.max(0, Number(r.discount) || 0), 0);
  }, [selectedPackages]);

  const totalCalculatedBill = Math.max(0, totalGrossPackages - totalDiscountAmount);

  const numCash = Math.max(0, Number(cashAmount) || 0);
  const numUpi = Math.max(0, Number(upiAmount) || 0);
  const numAccountTransfer = Math.max(0, Number(accountTransferAmount) || 0);
  const effectivePaidAmount = numCash + numUpi + numAccountTransfer;
  const calculatedBalanceDue = Math.max(0, totalCalculatedBill - effectivePaidAmount);

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

  // Live Duplicate Invoice Check - Scoped strictly to the Member's Current Active Plan
  // Rules:
  // 1. If invoice date is DIFFERENT -> ALWAYS ALLOWED (even if all other fields match).
  // 2. If invoice date is SAME, but bill contents / amounts are DIFFERENT -> ALWAYS ALLOWED.
  // 3. If invoice date is SAME AND all contents / amounts match on the active plan -> BLOCKED (Duplicate).
  // 4. Past / expired plans from previous cycles are NOT compared.
  const duplicateActivePlanInvoice = useMemo(() => {
    if (!currentMember || !paymentDate || totalCalculatedBill <= 0) return null;

    const todayStr = formatDate(new Date());
    const memberExpiryStr = currentMember.expiryDate ? String(currentMember.expiryDate).split('T')[0] : null;
    const isMemberActive = Boolean(
      currentMember.status === 'Active' ||
      (memberExpiryStr && memberExpiryStr >= todayStr)
    );

    const activePlanId = currentMember.planId ? String(currentMember.planId).replace('plan-', '') : null;
    const activePlanName = (currentMember.planName || '').trim().toLowerCase();

    // Only active plan of the member is checked
    if (!isMemberActive || (!activePlanId && !activePlanName)) {
      return null;
    }

    const cleanTargetId = String(currentMember.id).replace('mem-', '');

    // Get all existing invoices for this member
    const memberInvoices = (invoices || []).filter((inv) => {
      const invMemId = String(inv.memberId || inv.user_id || inv.userId || '').replace('mem-', '');
      return invMemId === cleanTargetId;
    });

    // Filter to only invoices of the member's current active plan
    const activePlanInvoices = memberInvoices.filter((inv) => {
      const invPlanId = inv.planId ? String(inv.planId).replace('plan-', '') : null;
      const invPlanName = String(inv.planName || inv.title || '').trim().toLowerCase();
      const matchesPlanId = activePlanId && invPlanId && invPlanId === activePlanId;
      const matchesPlanName = activePlanName && invPlanName.includes(activePlanName);
      return matchesPlanId || matchesPlanName;
    });

    // Check duplicate condition
    return activePlanInvoices.find((inv) => {
      const invDate = String(inv.date || '').split('T')[0];
      if (invDate !== paymentDate) {
        return false; // Different date is ALWAYS allowed!
      }

      const invTotal = Number(inv.totalAmount || inv.total_amount || inv.amount || 0);
      const invPaid = Number(inv.amount || 0);
      const isSameTotal = Math.abs(invTotal - totalCalculatedBill) < 1;
      const isSamePaid = Math.abs(invPaid - effectivePaidAmount) < 1;

      return isSameTotal && isSamePaid;
    }) || null;
  }, [currentMember, paymentDate, totalCalculatedBill, effectivePaidAmount, invoices]);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasSqlInjection(notes)) {
      addToast('Invalid characters or disallowed database syntax detected.', 'error');
      return;
    }

    if (!selectedMemberId) {
      addToast('Please select a member.', 'error');
      return;
    }

    const validPackages = selectedPackages.filter((r) => r.packageId && (Number(r.price) >= 0));
    if (validPackages.length === 0) {
      addToast('Please select at least one package with a plan.', 'error');
      return;
    }

    if (totalCalculatedBill <= 0) {
      addToast('Total bill amount must be greater than ₹0.', 'error');
      return;
    }

    if (calculatedBalanceDue > 0 && !balanceDueDate) {
      addToast('Please select the date when the remaining balance due will be paid.', 'error');
      return;
    }

    // Duplicate Invoice Check (Only on Member's Active Plan)
    if (duplicateActivePlanInvoice) {
      addToast(
        `Duplicate invoice detected: An identical invoice of ₹${effectivePaidAmount.toLocaleString('en-IN')} already exists on ${paymentDate} for this member's active plan. If this is a separate transaction, please select a different invoice date or modify bill contents.`,
        'error'
      );
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

      // 1. Record Revenue Inflow in Database
      let backendInvoiceRef = generatedInvoiceNo;
      try {
        if (api.revenueBilling?.addInflow) {
          const inflowRes = await api.revenueBilling.addInflow({
            user_id: cleanUserId,
            memberId: currentMember?.id,
            member_name: memberName,
            plan_id: membershipPlanObj?.id || ptPlanObj?.id || recoveryPlanObj?.id || null,
            plan_name: invoiceTitle,
            title: `${memberName} - ${invoiceTitle}`,
            category: mainCategory,
            amount: effectivePaidAmount,
            total_amount: totalCalculatedBill,
            dues_amount: calculatedBalanceDue,
            due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
            dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
            payment_method: resolvedPaymentMethodString,
            date: paymentDate || new Date().toISOString().split('T')[0],
            invoice_date: paymentDate || new Date().toISOString().split('T')[0],
            invoiceDate: paymentDate || new Date().toISOString().split('T')[0],
            payment_date: paymentDate || new Date().toISOString().split('T')[0],
            paymentDate: paymentDate || new Date().toISOString().split('T')[0],
            notes: notes || `Recorded from Invoices billing: ${invoiceTitle}${calculatedBalanceDue > 0 ? ` (Pending Balance Due: ₹${calculatedBalanceDue})` : ''}`,
            status: calculatedBalanceDue > 0 ? 'Pending' : 'Paid',
            created_by: currentUser?.userId || currentUser?.id,
            created_by_name: handledByStaffName?.trim() || defaultHandledBy || currentUser?.name || 'Staff'
          });

          if (inflowRes?.data?.invoiceNumber || inflowRes?.data?.id) {
            backendInvoiceRef = inflowRes.data.invoiceNumber || inflowRes.data.id;
          }
        } else if (recordPayment) {
          await recordPayment({
            memberId: currentMember?.id,
            memberName: memberName,
            planId: membershipPlanObj?.id || null,
            planName: invoiceTitle,
            amount: effectivePaidAmount,
            dues_amount: calculatedBalanceDue,
            due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
            dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
            paymentDate,
            expiryDate: hasMembership ? membershipEndDate : currentMember?.expiryDate,
            paymentMethod: resolvedPaymentMethodString,
            created_by: currentUser?.userId || currentUser?.id,
            created_by_name: handledByStaffName?.trim() || defaultHandledBy || currentUser?.name || 'Staff'
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
          dues_amount: updatedDues,
          due_date: calculatedBalanceDue > 0 ? balanceDueDate : currentMember.dueDate,
          dueDate: calculatedBalanceDue > 0 ? balanceDueDate : currentMember.dueDate,
        };

        if (hasMembership && membershipPlanObj) {
          memberPayload.planId = membershipPlanObj.id;
          memberPayload.planName = membershipPlanObj.name;
          memberPayload.expiryDate = membershipEndDate;
          memberPayload.expiry_date = membershipEndDate;
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
        pendingAmount: calculatedBalanceDue,
        date: paymentDate || new Date().toISOString().split('T')[0],
        invoiceDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: resolvedPaymentMethodString,
        status: calculatedBalanceDue > 0 ? 'Pending' : 'Paid',
        expiryDate: hasMembership ? membershipEndDate : currentMember?.expiryDate,
        itemsBreakdown: lineTitles,
        createdByName: handledByStaffName?.trim() || defaultHandledBy || currentUser?.name || 'Staff'
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={completedInvoiceData ? 'Payment Receipt & Invoice Generated' : 'Record Fee Payment & Invoice Bill'}
        maxWidth="max-w-3xl"
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
                  Official gym invoice #{completedInvoiceData.invoiceNumber} has been recorded to Member Invoices.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Invoice #{completedInvoiceData.invoiceNumber}</span>
                </div>
                {Number(completedInvoiceData.duesAmount) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Pending • ₹{Number(completedInvoiceData.duesAmount).toLocaleString('en-IN')} Due</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Paid in Full</span>
                  </span>
                )}
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
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
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

            {/* 2. PACKAGES & SERVICES SELECTION (DYNAMIC ROWS IDENTICAL TO REGISTER FORM) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Membership Packages & Services
                  </h3>
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

              <div className="space-y-3">
                {selectedPackages.map((pkgRow, idx) => {
                  const currentPkgObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
                  const isPt = pkgRow.packageType === 'Personal Training' || pkgRow.packageType === 'pt';
                  const isMembership = !isPt;
                  const availablePackages = getPackagesForType(pkgRow.packageType, plans, ptPlans, recoveryPlans);

                  const maxPlanDiscount = currentPkgObj
                    ? Number(currentPkgObj.maxDiscount ?? currentPkgObj.max_discount ?? 0)
                    : 0;

                  return (
                    <div
                      key={pkgRow.id}
                      className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Package #{idx + 1}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 ml-1">
                            {pkgRow.packageType}
                          </span>
                        </span>

                        {selectedPackages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePackageRow(pkgRow.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {/* Line 1: Package Type & Package Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Package Type */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Package Type *
                          </label>
                          <select
                            value={pkgRow.packageType}
                            onChange={(e) => handlePackageTypeChange(pkgRow.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                          >
                            {PACKAGE_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Package Name / Selector */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Package Name *
                            </label>
                            <button
                              type="button"
                              onClick={() => handleOpenQuickAdd(pkgRow.packageType, pkgRow.id)}
                              className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                            >
                              + New
                            </button>
                          </div>
                          <select
                            value={pkgRow.packageId}
                            onChange={(e) => handlePackageIdChange(pkgRow.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                          >
                            <option value="">
                              -- Choose {pkgRow.packageType} {availablePackages.length === 0 ? '(No plans yet)' : ''} --
                            </option>
                            {availablePackages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sessions ? `(${p.sessions} Sessions)` : (p.period ? `(${p.period})` : (p.durationMonths ? `(${p.durationMonths}M)` : ''))} — ₹{Number(p.price || 0).toLocaleString('en-IN')}
                              </option>
                            ))}
                            <option value="__ADD_NEW__">+ Create New Plan...</option>
                          </select>
                        </div>
                      </div>

                      {/* Line 2: Amount / Fee & Discount (below Package Type and Package Name) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Fee (₹)</label>
                          <input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            value={pkgRow.price}
                            onKeyDown={(e) => preventNonNumericKey(e, true)}
                            onChange={(e) => handlePackagePriceChange(pkgRow.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">Discount</label>
                            {maxPlanDiscount > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                Number(pkgRow.discount) > maxPlanDiscount
                                  ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                Max: ₹{maxPlanDiscount.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            placeholder="0"
                            value={pkgRow.discount}
                            onKeyDown={(e) => preventNonNumericKey(e, true)}
                            onChange={(e) => handlePackageDiscountChange(pkgRow.id, e.target.value)}
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              maxPlanDiscount > 0 && Number(pkgRow.discount) > maxPlanDiscount
                                ? 'border-rose-500 ring-1 ring-rose-500 text-rose-700 bg-rose-50/40'
                                : 'border-slate-200 focus:border-emerald-500'
                            }`}
                          />
                          {maxPlanDiscount > 0 && Number(pkgRow.discount) > maxPlanDiscount && (
                            <p className="text-[10px] text-rose-600 font-bold mt-1">
                              ⚠️ Discount cannot exceed ₹{maxPlanDiscount.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date Fields if Membership */}
                      {isMembership && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Membership Start Date *</span>
                            </label>
                            <input
                              type="date"
                              required
                              value={membershipStartDate}
                              onChange={(e) => {
                                const newStart = e.target.value;
                                setMembershipStartDate(newStart);
                                setIsManualEndDate(false);
                                if (newStart && currentPkgObj) {
                                  calculateEndDate(newStart, currentPkgObj, currentMember?.expiryDate);
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                <span>End Date (Expiry) *</span>
                              </label>
                              {isManualEndDate && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsManualEndDate(false);
                                    if (currentPkgObj) {
                                      calculateEndDate(membershipStartDate, currentPkgObj, currentMember?.expiryDate);
                                    }
                                  }}
                                  className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                                >
                                  Reset Auto
                                </button>
                              )}
                            </div>
                            <input
                              type="date"
                              required
                              value={membershipEndDate}
                              onChange={(e) => {
                                setIsManualEndDate(true);
                                setMembershipEndDate(e.target.value);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
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

                          {currentPkgObj && (currentPkgObj.offer || Number(currentPkgObj.offerDays || currentPkgObj.offer_days) > 0) && (
                            <div className="sm:col-span-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {currentPkgObj.offer || 'Offer'}{Number(currentPkgObj.offerDays || currentPkgObj.offer_days) > 0 ? ` (+${currentPkgObj.offerDays || currentPkgObj.offer_days} bonus days automatically added to expiry)` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dedicated PT Coach selection if PT package */}
                      {isPt && (
                        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                              <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Dedicated PT Coach Selection</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                              {currentPkgObj?.sessions || ptCustomSessions} Sessions Included
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="sm:col-span-7">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Assigned Coach *
                              </label>
                              <select
                                value={selectedTrainerId}
                                onChange={(e) => setSelectedTrainerId(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                {trainers && trainers.length > 0 ? (
                                  trainers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.specialty || 'Fitness Coach'})
                                    </option>
                                  ))
                                ) : (
                                  <option value="">No coaches available</option>
                                )}
                              </select>
                            </div>

                            <div className="sm:col-span-5 bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <Percent className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Commission</span>
                                </span>
                                <span className="font-mono font-bold text-indigo-700 text-xs">
                                  ₹{ptCommissionAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setCommissionType('percent')}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                                      commissionType === 'percent' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                                    }`}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCommissionType('fixed')}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                                      commissionType === 'fixed' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                                    }`}
                                  >
                                    ₹
                                  </button>
                                </div>
                                {commissionType === 'percent' ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    inputMode="numeric"
                                    value={ptCommissionPercent}
                                    onKeyDown={(e) => preventNonNumericKey(e, false)}
                                    onChange={(e) => setPtCommissionPercent(Math.max(0, Math.min(100, Number(sanitizeDigits(e.target.value, 3)) || 0)))}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    inputMode="decimal"
                                    value={ptFixedCommission}
                                    onKeyDown={(e) => preventNonNumericKey(e, true)}
                                    onChange={(e) => setPtFixedCommission(Math.max(0, Number(sanitizeDecimal(e.target.value)) || 0))}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. DYNAMIC INVOICE BREAKDOWN SUMMARY */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-emerald-200/70">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Invoice Bill Breakdown</span>
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md font-bold">
                  {selectedPackages.length} Item(s) Selected
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                {selectedPackages.map((pkgRow, idx) => {
                  const pkgObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
                  const rowGross = Number(pkgRow.price) || 0;
                  const rowDisc = Math.max(0, Number(pkgRow.discount) || 0);
                  const rowNet = Math.max(0, rowGross - rowDisc);
                  return (
                    <div key={pkgRow.id || idx} className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">
                        {pkgObj ? pkgObj.name : `Package #${idx + 1}`} ({pkgRow.packageType}):
                        {rowDisc > 0 && <span className="text-[10px] text-emerald-600 ml-1.5 font-bold">(-₹{rowDisc.toLocaleString('en-IN')} off)</span>}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{rowNet.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
                <span className="text-xs font-bold text-slate-800">Total Invoice Bill Amount:</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  ₹{totalCalculatedBill.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* 4. PAYMENT METHOD & SETTLEMENT */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Payment Collection & Settlement
                  </span>
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  Total Payable: <strong className="font-mono text-slate-800">₹{totalCalculatedBill.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Invoice / Payment Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Invoice Date (Payment Date) *</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Serves as official invoice & transaction date
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none ${
                    duplicateActivePlanInvoice
                      ? 'border-amber-400 ring-1 ring-amber-300'
                      : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />

                {duplicateActivePlanInvoice && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2 animate-fadeIn mt-2 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Duplicate Invoice Detected for Active Plan</p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        An identical invoice (#{duplicateActivePlanInvoice.invoiceNumber || duplicateActivePlanInvoice.id || 'INV'}) of <strong>₹{effectivePaidAmount.toLocaleString('en-IN')}</strong> already exists on <strong>{paymentDate}</strong> for {currentMember?.name}'s active plan. If this is a separate transaction, please select a different invoice date or modify bill contents.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3 Payment Methods: Cash, UPI, Account Transfer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                        const rem = Math.max(0, totalCalculatedBill - other);
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
                        const rem = Math.max(0, totalCalculatedBill - other);
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
                        const rem = Math.max(0, totalCalculatedBill - other);
                        setAccountTransferAmount(rem > 0 ? String(rem) : '');
                      }}
                      className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      Full
                    </button>
                  </div>
                </div>
              </div>

              {/* Settlement Status Banner */}
              {calculatedBalanceDue > 0 ? (
                <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
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

                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                        <span>Promised Due Date *</span>
                        <span className="text-[10px] font-normal text-amber-800">When balance will be paid</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="date"
                          required
                          value={balanceDueDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setBalanceDueDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200/80 font-medium">
                    <span className="text-slate-600">
                      Total Bill: <strong className="text-slate-900 font-mono">₹{totalCalculatedBill.toLocaleString('en-IN')}</strong>
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
                      {totalCalculatedBill > 0 ? (
                        <>Full payment of <strong>₹{totalCalculatedBill.toLocaleString('en-IN')}</strong> entered. <strong>No balance remaining.</strong></>
                      ) : (
                        <>Payment settled. <strong>No balance remaining.</strong></>
                      )}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-300 shrink-0">
                    No Balance Remaining
                  </span>
                </div>
              )}

              {/* Handled By / Created By Staff Input */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Invoice Created / Handled By (Staff / Owner)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Audit Record</span>
                </label>
                <input
                  type="text"
                  value={handledByStaffName}
                  onChange={(e) => setHandledByStaffName(e.target.value)}
                  placeholder="e.g. Rajesh Mehta (Manager) / Vikramaditya (Owner)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bill Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Renewal discount applied, member opting for quarterly cycle"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
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
                disabled={isSubmitting || totalCalculatedBill <= 0 || Boolean(duplicateActivePlanInvoice)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Invoice...</span>
                  </>
                ) : duplicateActivePlanInvoice ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Duplicate Invoice (Change Date/Details)</span>
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

      {/* Shared Reusable Membership Plan Modal (Nested-Safe Dialog for creating new plans) */}
      <MembershipPlanModal
        isOpen={Boolean(quickAddPlanType && quickAddPlanType !== 'pt' && quickAddPlanType !== 'recovery')}
        onClose={() => setQuickAddPlanType(null)}
        defaultPackageType={quickAddPlanType || 'Gym-Cardio'}
        isNested={true}
        onSuccess={async (created) => {
          if (created?.id) {
            await fetchPlans?.();
            if (quickAddTargetRowId) {
              setSelectedPackages((prev) =>
                prev.map((r) =>
                  r.id === quickAddTargetRowId
                    ? {
                        ...r,
                        packageType: created.package_type || created.packageType || quickAddPlanType,
                        packageId: String(created.id),
                        price: Number(created.price) || 0
                      }
                    : r
                )
              );
              if (!isManualEndDate && membershipStartDate) {
                const calculatedEnd = computeCombinedPlanEndDate(
                  membershipStartDate,
                  created,
                  currentMember?.expiryDate
                );
                if (calculatedEnd) setMembershipEndDate(calculatedEnd);
              }
            }
            addToast(`Package plan "${created.name}" created and applied!`, 'success');
          }
          setQuickAddPlanType(null);
        }}
      />

      {/* Quick Add PT / Recovery Plan Modal */}
      <Modal
        isOpen={quickAddPlanType === 'pt' || quickAddPlanType === 'recovery'}
        onClose={() => setQuickAddPlanType(null)}
        title={quickAddPlanType === 'recovery' ? 'Create New Recovery Plan' : 'Create Personal Training (PT) Package'}
        maxWidth="max-w-md"
        isNested={true}
      >
        <form onSubmit={handleSaveQuickPlan} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plan / Service Name *</label>
              <input
                type="text"
                required
                placeholder={quickAddPlanType === 'recovery' ? 'e.g. Ice Bath Therapy, Sauna Session' : 'e.g. 12 Sessions Personal Training'}
                value={quickPlanForm.name}
                onChange={(e) => setQuickPlanForm({ ...quickPlanForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee / Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min={0}
                    required
                    value={quickPlanForm.price}
                    onChange={(e) => setQuickPlanForm({ ...quickPlanForm, price: e.target.value })}
                    className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              {quickAddPlanType === 'pt' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Included Sessions</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={quickPlanForm.sessions}
                    onChange={(e) => setQuickPlanForm({ ...quickPlanForm, sessions: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              )}

              {quickAddPlanType === 'recovery' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Therapy Category</label>
                  <select
                    value={quickPlanForm.instructorOrType}
                    onChange={(e) => setQuickPlanForm({ ...quickPlanForm, instructorOrType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Ice Plunge">Ice Plunge / Cold Bath</option>
                    <option value="Infrared Sauna">Infrared Sauna</option>
                    <option value="Massage Gun">Percussion Massage Gun</option>
                    <option value="Cryotherapy">Cryotherapy</option>
                    <option value="Physiotherapy">Physiotherapy & Stretch</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickAddPlanType(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingQuickPlan}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingQuickPlan ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Plan...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save & Apply Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
export default RecordPaymentModal;
