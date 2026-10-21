import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import MemberSearchSelect from '../common/MemberSearchSelect';
import {
  MembershipPlanModal,
  PACKAGE_TYPES,
  getPackagesForType,
  getPackageObjectFromLists,
  normalizePackageType
} from '../common/MembershipPlanModal';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  calculatePlanExpiryDate,
  formatDateDisplay,
  calculateMaxPromiseDate,
  validatePromiseDate
} from '../../utils/dateUtils';
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
  AlertCircle,
  Plus,
  Trash2,
  Tag,
  Receipt,
  Phone,
  Mail,
  Edit2
} from 'lucide-react';

export const EditInvoiceModal = ({
  isOpen,
  onClose,
  invoice,
  onUpdated
}) => {
  const {
    members = [],
    plans = [],
    ptPlans = [],
    recoveryPlans = [],
    trainers = [],
    gymInfo,
    updateInvoice,
    deleteInvoice,
    fetchInvoices,
    fetchMembers,
    fetchDashboardStats,
    addPlan,
    addRecoveryPlan,
    addPTPlan,
    addToast
  } = useGymData();

  const { currentUser } = useAuth();
  const defaultHandledBy = (currentUser?.name && !currentUser.name.toLowerCase().includes('arch devops'))
    ? currentUser.name
    : (gymInfo?.name ? `${gymInfo.name} Staff` : 'Staff');

  // Quick Plan Creation modal state
  const [quickAddModal, setQuickAddModal] = useState({
    isOpen: false,
    packageType: 'Gym-Cardio',
    targetRowId: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [handledByStaffName, setHandledByStaffName] = useState(defaultHandledBy);
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [balanceDueDate, setBalanceDueDate] = useState('');

  // Packages state
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [membershipEndDate, setMembershipEndDate] = useState('');

  // PT specific state
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [commissionType, setCommissionType] = useState('percent');
  const [ptCommissionPercent, setPtCommissionPercent] = useState(10);
  const [ptFixedCommission, setPtFixedCommission] = useState(1000);

  // Payment Breakdown inputs
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [accountTransferAmount, setAccountTransferAmount] = useState('');
  const [isGstIncluded, setIsGstIncluded] = useState(false);

  // Helper to locate package object from plans
  const getPackageObject = (packageType, packageId) => {
    return getPackageObjectFromLists(packageType, packageId, plans, ptPlans, recoveryPlans);
  };

  const isPtRow = (r) => {
    const norm = normalizePackageType(r.packageType);
    return norm === 'pt' || norm === 'Personal Training';
  };

  const isRecoveryRow = (r) => {
    const norm = normalizePackageType(r.packageType);
    return norm === 'recovery' || norm === 'Recovery & Wellness';
  };

  // Find currently selected member object
  const currentMember = useMemo(() => {
    const fallbackMember = invoice?.member || invoice?.currentMember || (invoice ? {
      id: invoice.memberId || (invoice.userId ? `mem-${invoice.userId}` : ''),
      userId: invoice.userId || invoice.user_id,
      name: invoice.memberName || invoice.member_name,
      phone: invoice.memberPhone || invoice.member_phone,
      email: invoice.memberEmail || invoice.member_email,
      planName: invoice.planName || invoice.plan_name,
      expiryDate: invoice.expiryDate || invoice.endDate
    } : null);

    if (!selectedMemberId) return fallbackMember;
    const cleanNum = String(selectedMemberId).replace(/\D/g, '');
    return members.find((m) =>
      String(m.id) === String(selectedMemberId) ||
      `mem-${m.userId}` === String(selectedMemberId) ||
      `mem-${m.id}` === String(selectedMemberId) ||
      (cleanNum && (String(m.id).replace(/\D/g, '') === cleanNum || String(m.userId) === cleanNum))
    ) || fallbackMember;
  }, [members, selectedMemberId, invoice]);

  // Current Trainer
  const currentTrainer = useMemo(() => {
    if (!selectedTrainerId) return null;
    return trainers.find((t) => String(t.id) === String(selectedTrainerId)) || null;
  }, [trainers, selectedTrainerId]);

  // Outstanding Dues
  const memberDueAmount = useMemo(() => {
    if (!currentMember) return 0;
    return Number(currentMember.duesAmount ?? currentMember.dues_amount ?? 0);
  }, [currentMember]);

  // End Date Calculation helper (strictly from start date, no chaining for invoice edits)
  const calculateEndDate = (startDateStr, planObj) => {
    if (!startDateStr || !planObj) return;
    const durationMonths = Number(planObj.durationMonths || planObj.duration_months || 1);
    const periodStr = planObj.period || (planObj.validityDays ? `${planObj.validityDays} Days` : '');
    const bonusDays = Number(planObj.offerDays || planObj.offer_days) || 0;

    const calculated = calculatePlanExpiryDate(startDateStr, durationMonths, periodStr, bonusDays);
    if (calculated) {
      setMembershipEndDate(calculated);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // AUTO-POPULATE FORM DATA FROM INVOICE WHEN MODAL OPENS
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isOpen && invoice) {
      // 1. Resolve matching member
      const mId = invoice.userId || invoice.user_id || invoice.memberId;
      const cleanNumId = mId ? String(mId).replace(/\D/g, '') : null;
      const matchedMember = (invoice.member || invoice.currentMember) || members.find((m) =>
        (mId && (m.id === mId || `mem-${m.userId}` === mId || `mem-${m.id}` === mId)) ||
        (cleanNumId && (String(m.id).replace(/\D/g, '') === cleanNumId || String(m.userId) === cleanNumId)) ||
        (invoice.memberName && m.name?.trim().toLowerCase() === invoice.memberName?.trim().toLowerCase()) ||
        (invoice.memberPhone && m.phone && m.phone.slice(-10) === invoice.memberPhone.slice(-10))
      ) || null;

      const resolvedMemberId = matchedMember?.id || (cleanNumId ? `mem-${cleanNumId}` : (mId || ''));
      setSelectedMemberId(resolvedMemberId);

      // 2. Set Member Contact & Name
      setMemberName(invoice.memberName || invoice.member_name || matchedMember?.name || '');
      setMemberPhone(invoice.memberPhone || invoice.member_phone || matchedMember?.phone || '');
      setMemberEmail(invoice.memberEmail || invoice.member_email || matchedMember?.email || '');

      // 3. Payment date & Staff
      const invDate = invoice.date ? String(invoice.date).split('T')[0] : (invoice.issueDate ? String(invoice.issueDate).split('T')[0] : new Date().toISOString().split('T')[0]);
      setPaymentDate(invDate);

      const invDueDate = invoice.dueDate ? String(invoice.dueDate).split('T')[0] : (invoice.due_date ? String(invoice.due_date).split('T')[0] : (matchedMember?.dueDate ? String(matchedMember.dueDate).split('T')[0] : ''));
      setBalanceDueDate(invDueDate);

      setHandledByStaffName(invoice.createdByName || invoice.created_by_name || defaultHandledBy);
      setNotes(invoice.notes || '');

      // 4. GST state
      setIsGstIncluded(Boolean(invoice.isGstIncluded || invoice.gst_included || invoice.is_gst_included || false));

      // 5. Payment method split
      const paid = Number(invoice.amount ?? invoice.paidAmount ?? invoice.paid_amount ?? 0);
      const payMethod = String(invoice.paymentMethod || invoice.payment_method || 'UPI').toUpperCase();

      if (payMethod.includes('CASH') && (payMethod.includes('UPI') || payMethod.includes('TRANSFER') || payMethod.includes('BANK'))) {
        const cashMatch = payMethod.match(/cash\s*\(?₹?([0-9,]+)\)?/i);
        const upiMatch = payMethod.match(/upi\s*\(?₹?([0-9,]+)\)?/i);
        const transferMatch = payMethod.match(/(transfer|bank|cheque)\s*\(?₹?([0-9,]+)\)?/i);
        setCashAmount(cashMatch ? cashMatch[1].replace(/,/g, '') : '');
        setUpiAmount(upiMatch ? upiMatch[1].replace(/,/g, '') : '');
        setAccountTransferAmount(transferMatch ? transferMatch[2].replace(/,/g, '') : '');
      } else if (payMethod.includes('CASH')) {
        setCashAmount(paid > 0 ? String(paid) : '');
        setUpiAmount('');
        setAccountTransferAmount('');
      } else if (payMethod.includes('TRANSFER') || payMethod.includes('CARD') || payMethod.includes('BANK') || payMethod.includes('CHEQUE')) {
        setCashAmount('');
        setUpiAmount('');
        setAccountTransferAmount(paid > 0 ? String(paid) : '');
      } else {
        // Default to UPI
        setCashAmount('');
        setUpiAmount(paid > 0 ? String(paid) : '');
        setAccountTransferAmount('');
      }

      // 6. Parse and initialize Packages
      let rawItems = [];
      try {
        if (Array.isArray(invoice.items) && invoice.items.length > 0) rawItems = invoice.items;
        else if (typeof invoice.items === 'string') rawItems = JSON.parse(invoice.items);
        else if (Array.isArray(invoice.packages) && invoice.packages.length > 0) rawItems = invoice.packages;
        else if (typeof invoice.packages === 'string') rawItems = JSON.parse(invoice.packages);
      } catch (_) {
        rawItems = [];
      }

      const invStartDate = invoice.startDate || invoice.start_date || invDate;
      const invEndDate = invoice.expiryDate || invoice.expiry_date || invoice.endDate || invoice.end_date || '';

      setMembershipStartDate(invStartDate);
      setMembershipEndDate(invEndDate ? String(invEndDate).split('T')[0] : '');

      // Helper to find matching plan from plans, ptPlans, or recoveryPlans
      const findPlan = (rawPlanId, rawPlanName) => {
        const pIdStr = rawPlanId ? String(rawPlanId).trim() : '';
        const cleanNum = pIdStr ? pIdStr.replace(/\D/g, '') : '';
        const pNameLower = rawPlanName ? String(rawPlanName).trim().toLowerCase() : '';

        const matchFn = (p) => {
          if (!p) return false;
          if (pIdStr && (String(p.id) === pIdStr || `plan-${p.id}` === pIdStr || `pt-${p.id}` === pIdStr || `rec-${p.id}` === pIdStr)) return true;
          if (cleanNum && String(p.id).replace(/\D/g, '') === cleanNum) return true;
          if (pNameLower && p.name && p.name.trim().toLowerCase() === pNameLower) return true;
          return false;
        };

        const found = (Array.isArray(plans) ? plans.find(matchFn) : null) ||
          (Array.isArray(ptPlans) ? ptPlans.find(matchFn) : null) ||
          (Array.isArray(recoveryPlans) ? recoveryPlans.find(matchFn) : null) || null;

        if (!found) return null;
        return {
          ...found,
          packageType: found.packageType || found.package_type || found.category || 'Gym-Cardio'
        };
      };

      if (rawItems.length > 0) {
        const rows = rawItems.map((it, idx) => {
          const rawPlanId = it.planId ?? it.plan_id ?? it.packageId ?? it.package_id ?? it.id ?? '';
          const rawPlanName = it.name || it.planName || it.plan_name || it.title || '';
          const matchedPlan = findPlan(rawPlanId, rawPlanName);

          const rawPkgType = it.packageType || it.package_type || matchedPlan?.packageType || invoice.packageType || invoice.package_type || 'Gym-Cardio';
          const pkgType = matchedPlan?.packageType || normalizePackageType(rawPkgType);
          const resolvedPkgId = matchedPlan?.id || rawPlanId || '';

          if (it.trainerId || it.trainer_id) {
            setSelectedTrainerId(String(it.trainerId || it.trainer_id));
          }

          return {
            id: `pkg-${idx}-${Date.now()}`,
            packageType: pkgType,
            packageId: resolvedPkgId,
            planName: rawPlanName || matchedPlan?.name || '',
            price: String(Number(it.price ?? it.amount ?? matchedPlan?.price ?? 0)),
            discount: String(Number(it.discount ?? 0)),
            startDate: it.startDate || it.start_date || invStartDate,
            expiryDate: it.endDate || it.end_date || it.expiryDate || it.expiry_date || invEndDate
          };
        });
        setSelectedPackages(rows);
      } else {
        // Fallback: 1 package row from primary invoice plan
        const rawPlanId = invoice.planId || invoice.plan_id || invoice.packageId || invoice.package_id || '';
        const rawPlanName = invoice.planName || invoice.plan_name || invoice.title || invoice.name || '';
        const matchedPlan = findPlan(rawPlanId, rawPlanName);

        const rawPkgType = invoice.packageType || invoice.package_type || matchedPlan?.packageType || 'Gym-Cardio';
        const pkgType = matchedPlan?.packageType || normalizePackageType(rawPkgType);
        const resolvedPkgId = matchedPlan?.id || rawPlanId || (plans[0]?.id || '');

        const totalBilled = Number(invoice.totalAmount ?? (paid + Number(invoice.pendingAmount ?? 0)));
        const invDiscount = Number(invoice.discount || invoice.discountAmount || 0);

        if (invoice.trainerId || invoice.trainer_id) {
          setSelectedTrainerId(String(invoice.trainerId || invoice.trainer_id));
        }

        setSelectedPackages([{
          id: `pkg-0-${Date.now()}`,
          packageType: pkgType,
          packageId: resolvedPkgId,
          planName: rawPlanName || matchedPlan?.name || '',
          price: String(matchedPlan?.price ?? totalBilled),
          discount: String(invDiscount),
          startDate: invStartDate,
          expiryDate: invEndDate ? String(invEndDate).split('T')[0] : ''
        }]);
      }

      setErrorMessage('');
    }
  }, [isOpen, invoice, members, plans, ptPlans, recoveryPlans, defaultHandledBy]);

  // Handle member change via MemberSearchSelect
  const handleMemberChange = (e) => {
    const newMemberId = e.target.value;
    setSelectedMemberId(newMemberId);

    const m = members.find((mem) => String(mem.id) === String(newMemberId) || `mem-${mem.userId}` === String(newMemberId));
    if (m) {
      setMemberName(m.name || '');
      setMemberPhone(m.phone || '');
      setMemberEmail(m.email || '');

      // Recalculate end date based strictly on plan duration from start date
      const primaryPkg = selectedPackages[0];
      if (primaryPkg) {
        const planObj = getPackageObject(primaryPkg.packageType, primaryPkg.packageId);
        if (planObj) {
          calculateEndDate(membershipStartDate, planObj);
        }
      }
    }
  };

  // Package row manipulation
  const handleAddPackageRow = () => {
    const hasMembershipAlready = selectedPackages.some((r) => !isPtRow(r) && !isRecoveryRow(r));
    const nextType = hasMembershipAlready ? 'Personal Training' : 'Gym-Cardio';
    const available = getPackagesForType(nextType, plans, ptPlans, recoveryPlans);
    const defaultPlan = available[0] || null;

    const newRow = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      packageType: nextType,
      packageId: defaultPlan?.id || '',
      price: defaultPlan ? String(defaultPlan.price || 0) : '0',
      discount: '0',
      startDate: membershipStartDate,
      expiryDate: membershipEndDate
    };

    setSelectedPackages((prev) => [...prev, newRow]);
  };

  const handleRemovePackageRow = (rowId) => {
    setSelectedPackages((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handlePackageTypeChange = (rowId, newType) => {
    const available = getPackagesForType(newType, plans, ptPlans, recoveryPlans);
    const defaultPlan = available[0] || null;

    setSelectedPackages((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          packageType: newType,
          packageId: defaultPlan?.id || '',
          price: defaultPlan ? String(defaultPlan.price || 0) : '0',
          discount: '0'
        };
      })
    );

    if (defaultPlan && !isPtRow({ packageType: newType })) {
      calculateEndDate(membershipStartDate, defaultPlan);
    }
  };

  const handlePackageIdChange = (rowId, newPlanId) => {
    if (newPlanId === '__ADD_NEW__') {
      const targetRow = selectedPackages.find((r) => r.id === rowId);
      setQuickAddModal({
        isOpen: true,
        packageType: targetRow?.packageType || 'Gym-Cardio',
        targetRowId: rowId
      });
      return;
    }

    setSelectedPackages((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const planObj = getPackageObject(r.packageType, newPlanId);
        const planPrice = planObj ? String(planObj.price || 0) : r.price;

        if (planObj && !isPtRow(r)) {
          calculateEndDate(membershipStartDate, planObj);
        }

        return {
          ...r,
          packageId: newPlanId,
          price: planPrice
        };
      })
    );
  };

  const handlePackagePriceChange = (rowId, newPrice) => {
    setSelectedPackages((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, price: newPrice } : r))
    );
  };

  const handlePackageDiscountChange = (rowId, newDiscount) => {
    setSelectedPackages((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, discount: newDiscount } : r))
    );
  };

  // Quick Plan Creation Success Handler
  const handleQuickPlanCreated = (newPlan) => {
    const targetRowId = quickAddModal.targetRowId;
    if (targetRowId && newPlan) {
      setSelectedPackages((prev) =>
        prev.map((r) => {
          if (r.id !== targetRowId) return r;
          return {
            ...r,
            packageId: newPlan.id,
            price: String(newPlan.price || 0)
          };
        })
      );
      if (!isPtRow({ packageType: quickAddModal.packageType })) {
        calculateEndDate(membershipStartDate, newPlan);
      }
    }
    setQuickAddModal({ isOpen: false, packageType: 'Gym-Cardio', targetRowId: null });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // BILLING & FINANCIAL CALCULATIONS
  // ═════════════════════════════════════════════════════════════════════════
  const { totalCalculatedBill, totalBaseFee, totalGst, cgst, sgst, halfTaxRate } = useMemo(() => {
    const rawSum = selectedPackages.reduce((acc, r) => {
      const p = Math.max(0, Number(r.price) || 0);
      const d = Math.max(0, Number(r.discount) || 0);
      return acc + Math.max(0, p - d);
    }, 0);

    const taxRate = Number(gymInfo?.tax_rate ?? gymInfo?.taxRate ?? 18) || 18;
    const halfTax = (taxRate / 2).toFixed(taxRate % 2 === 0 ? 0 : 1);

    if (isGstIncluded) {
      const base = Math.round(rawSum / (1 + (taxRate / 100)));
      const gst = Math.max(0, rawSum - base);
      const halfGst = Math.round(gst / 2);
      return {
        totalCalculatedBill: rawSum,
        totalBaseFee: base,
        totalGst: gst,
        cgst: halfGst,
        sgst: gst - halfGst,
        halfTaxRate: halfTax
      };
    }

    return {
      totalCalculatedBill: rawSum,
      totalBaseFee: rawSum,
      totalGst: 0,
      cgst: 0,
      sgst: 0,
      halfTaxRate: halfTax
    };
  }, [selectedPackages, isGstIncluded, gymInfo]);

  const effectivePaidAmount = useMemo(() => {
    const c = Math.max(0, Number(cashAmount) || 0);
    const u = Math.max(0, Number(upiAmount) || 0);
    const t = Math.max(0, Number(accountTransferAmount) || 0);
    return c + u + t;
  }, [cashAmount, upiAmount, accountTransferAmount]);

  const calculatedBalanceDue = useMemo(() => {
    return Math.max(0, totalCalculatedBill - effectivePaidAmount);
  }, [totalCalculatedBill, effectivePaidAmount]);

  // PT Commission calculation
  const ptCommissionAmount = useMemo(() => {
    const ptRow = selectedPackages.find(isPtRow);
    if (!ptRow) return 0;
    const ptPrice = Math.max(0, (Number(ptRow.price) || 0) - (Number(ptRow.discount) || 0));
    if (commissionType === 'percent') {
      return Math.round((ptPrice * (Number(ptCommissionPercent) || 0)) / 100);
    }
    return Math.min(ptPrice, Number(ptFixedCommission) || 0);
  }, [selectedPackages, commissionType, ptCommissionPercent, ptFixedCommission]);

  // Max Promise Date Calculation
  const minModalPromiseDate = useMemo(() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }, []);

  const maxModalPromiseDate = useMemo(() => {
    const targetEnd = membershipEndDate || currentMember?.expiryDate;
    return calculateMaxPromiseDate(targetEnd) || '';
  }, [membershipEndDate, currentMember]);

  // Resolve Payment Method string
  const getResolvedPaymentMethod = () => {
    const c = Number(cashAmount) || 0;
    const u = Number(upiAmount) || 0;
    const a = Number(accountTransferAmount) || 0;

    const parts = [];
    if (c > 0) parts.push(`Cash (₹${c.toLocaleString('en-IN')})`);
    if (u > 0) parts.push(`UPI (₹${u.toLocaleString('en-IN')})`);
    if (a > 0) parts.push(`Account Transfer (₹${a.toLocaleString('en-IN')})`);

    if (parts.length > 1) return `Split: ${parts.join(' + ')}`;
    if (c > 0) return 'Cash';
    if (a > 0) return 'Account Transfer';
    return 'UPI';
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!invoice) return;
    try {
      setIsDeleting(true);
      await deleteInvoice(invoice.id || invoice.invoiceNumber);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      // toast shown by deleteInvoice
    } finally {
      setIsDeleting(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // SUBMIT HANDLER (UPDATES INVOICE, MEMBER NAME, DUES & BILLING)
  // ═════════════════════════════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!invoice) return;

    if (!memberName.trim()) {
      setErrorMessage('Member name is required.');
      return;
    }

    if (hasSqlInjection(memberName) || hasSqlInjection(notes) || hasSqlInjection(handledByStaffName)) {
      setErrorMessage('Disallowed characters or potential SQL injection syntax detected.');
      return;
    }

    if (selectedPackages.length === 0) {
      setErrorMessage('Please select at least one package or service.');
      return;
    }

    // Validate PT Coach requirement
    const hasPt = selectedPackages.some(isPtRow);
    if (hasPt && !selectedTrainerId) {
      setErrorMessage('Please select an assigned PT Coach for Personal Training.');
      return;
    }

    // Validate Promise Date if balance due > 0
    if (calculatedBalanceDue > 0) {
      if (!balanceDueDate) {
        setErrorMessage('Please specify a Promised Due Date for the remaining balance.');
        return;
      }
      const targetEnd = membershipEndDate || currentMember?.expiryDate;
      const promiseError = validatePromiseDate(balanceDueDate, paymentDate, targetEnd);
      if (promiseError) {
        setErrorMessage(promiseError);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const membershipRow = selectedPackages.find((r) => !isPtRow(r) && !isRecoveryRow(r));
      const membershipPlanObj = membershipRow ? getPackageObject(membershipRow.packageType, membershipRow.packageId) : null;
      const ptRow = selectedPackages.find(isPtRow);
      const ptPlanObj = ptRow ? getPackageObject(ptRow.packageType, ptRow.packageId) : null;
      const recoveryRow = selectedPackages.find(isRecoveryRow);
      const recoveryPlanObj = recoveryRow ? getPackageObject(recoveryRow.packageType, recoveryRow.packageId) : null;

      const mainCategory = membershipRow
        ? (membershipRow.packageType || 'Gym-Cardio')
        : (hasPt ? 'Personal Training' : 'Recovery & Wellness');

      const resolvedPaymentMethodString = getResolvedPaymentMethod();

      // Build packages array for backend items
      const packageItems = selectedPackages.map((pkg) => {
        const pkgObj = getPackageObject(pkg.packageType, pkg.packageId);
        const isPkgPt = isPtRow(pkg);
        return {
          name: pkgObj?.name || pkg.packageType,
          plan_id: pkg.packageId ? Number(String(pkg.packageId).replace(/\D/g, '')) : null,
          planId: pkg.packageId ? Number(String(pkg.packageId).replace(/\D/g, '')) : null,
          package_type: normalizePackageType(pkg.packageType),
          packageType: normalizePackageType(pkg.packageType),
          price: Number(pkg.price) || 0,
          discount: Number(pkg.discount) || 0,
          start_date: pkg.startDate || membershipStartDate,
          startDate: pkg.startDate || membershipStartDate,
          end_date: pkg.expiryDate || membershipEndDate,
          endDate: pkg.expiryDate || membershipEndDate,
          trainer_id: isPkgPt ? (selectedTrainerId ? Number(selectedTrainerId) : null) : null,
          trainerId: isPkgPt ? (selectedTrainerId ? Number(selectedTrainerId) : null) : null,
          trainer_name: isPkgPt ? (currentTrainer?.name || null) : null,
          trainerName: isPkgPt ? (currentTrainer?.name || null) : null
        };
      });

      const lineTitles = packageItems.map((p) => p.name).join(' + ') || 'Gym Services';
      const cleanUserId = currentMember?.userId || currentMember?.id || invoice.userId || invoice.user_id;
      const numericUserId = cleanUserId ? (Number(String(cleanUserId).replace(/\D/g, '')) || null) : null;

      const payload = {
        user_id: numericUserId,
        userId: numericUserId,
        member_name: memberName.trim(),
        memberName: memberName.trim(),
        member_phone: memberPhone?.trim() || null,
        memberPhone: memberPhone?.trim() || null,
        member_email: memberEmail?.trim() || null,
        memberEmail: memberEmail?.trim() || null,
        plan_id: membershipPlanObj?.id || ptPlanObj?.id || recoveryPlanObj?.id || null,
        planId: membershipPlanObj?.id || ptPlanObj?.id || recoveryPlanObj?.id || null,
        plan_name: lineTitles,
        planName: lineTitles,
        package_type: mainCategory,
        packageType: mainCategory,
        packages: packageItems,
        items: packageItems,
        amount: effectivePaidAmount,
        total_amount: totalCalculatedBill,
        totalAmount: totalCalculatedBill,
        pending_amount: calculatedBalanceDue,
        pendingAmount: calculatedBalanceDue,
        dues_amount: calculatedBalanceDue,
        duesAmount: calculatedBalanceDue,
        date: paymentDate,
        payment_date: paymentDate,
        paymentDate: paymentDate,
        due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
        dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
        start_date: membershipStartDate || null,
        startDate: membershipStartDate || null,
        expiry_date: membershipEndDate || null,
        expiryDate: membershipEndDate || null,
        payment_method: resolvedPaymentMethodString,
        paymentMethod: resolvedPaymentMethodString,
        status: calculatedBalanceDue > 0 ? (effectivePaidAmount > 0 ? 'Partial' : 'Pending') : 'Paid',
        is_gst_included: isGstIncluded,
        isGstIncluded: isGstIncluded,
        created_by_name: handledByStaffName.trim(),
        createdByName: handledByStaffName.trim(),
        notes: notes.trim()
      };

      const updated = await updateInvoice(invoice.id || invoice.numericId || invoice.invoiceNumber, payload);
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update invoice. Please verify entries and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Edit Invoice & Bill: #${invoice.id || invoice.invoiceNumber || 'INV'}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1: MEMBER SELECTION & EDITABLE MEMBER NAME
              ══════════════════════════════════════════════════════════════ */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Member Information &amp; Selection</span>
              </label>
              {currentMember && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Status: {currentMember.status || 'Active'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Member Search & Select (Allows reassigning member) */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Select / Change Member</span>
                  <span className="text-[10px] text-slate-400 font-normal">Switch member</span>
                </label>
                <MemberSearchSelect
                  members={members}
                  value={selectedMemberId}
                  fallbackMember={currentMember}
                  onChange={handleMemberChange}
                  required
                />
              </div>

              {/* EDITABLE MEMBER NAME INPUT (Direct User Requirement) */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-900 font-extrabold">
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Member Name *</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Editable Field
                  </span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Enter member's full name"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-400 ring-1 ring-emerald-500/20 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 shadow-2xs transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Member Snapshot Cards */}
            {currentMember && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Contact:</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {memberPhone || currentMember.phone || currentMember.email || 'N/A'}
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
                    {currentMember.expiryDate ? String(currentMember.expiryDate).split('T')[0] : 'N/A'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Pending Dues:</span>
                  <span className="font-bold truncate block">
                    {memberDueAmount > 0 ? (
                      <span className="text-rose-600 font-extrabold font-mono">₹{memberDueAmount.toLocaleString('en-IN')} Due</span>
                    ) : (
                      <span className="text-emerald-700">₹0 Settled</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2: MEMBERSHIP PACKAGES & SERVICES
              ══════════════════════════════════════════════════════════════ */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Membership Packages &amp; Services
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
                const isPt = isPtRow(pkgRow);
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

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Package Name *
                          </label>
                          <button
                            type="button"
                            onClick={() => setQuickAddModal({ isOpen: true, packageType: pkgRow.packageType, targetRowId: pkgRow.id })}
                            className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                          >
                            + New Plan
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
                          {pkgRow.packageId && !availablePackages.some((p) => String(p.id) === String(pkgRow.packageId)) && (
                            <option value={pkgRow.packageId}>
                              {currentPkgObj?.name || pkgRow.planName || `Plan #${pkgRow.packageId}`} {currentPkgObj?.sessions ? `(${currentPkgObj.sessions} Sessions)` : (currentPkgObj?.period ? `(${currentPkgObj.period})` : (currentPkgObj?.durationMonths ? `(${currentPkgObj.durationMonths}M)` : ''))} — ₹{Number(currentPkgObj?.price || pkgRow.price || 0).toLocaleString('en-IN')}
                            </option>
                          )}
                          {availablePackages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.sessions ? `(${p.sessions} Sessions)` : (p.period ? `(${p.period})` : (p.durationMonths ? `(${p.durationMonths}M)` : ''))} — ₹{Number(p.price || 0).toLocaleString('en-IN')}
                            </option>
                          ))}
                          <option value="__ADD_NEW__">+ Create New Plan...</option>
                        </select>
                      </div>
                    </div>

                    {/* Line 2: Fee & Discount */}
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">Discount</label>
                          {maxPlanDiscount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Membership Start & End Date */}
                    {(idx === 0 || !isPt) && (
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
                              if (newStart && currentPkgObj) {
                                calculateEndDate(newStart, currentPkgObj);
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
                            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Auto-calculated
                            </span>
                          </div>
                          <input
                            type="date"
                            value={membershipEndDate}
                            onChange={(e) => setMembershipEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
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
                            {currentPkgObj?.sessions || 12} Sessions
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-7">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                              <span>Assigned Coach / Trainer</span>
                              <span className="text-rose-500 font-extrabold">* (Compulsory)</span>
                            </label>
                            <select
                              required
                              value={selectedTrainerId}
                              onChange={(e) => setSelectedTrainerId(e.target.value)}
                              className={`w-full px-3 py-2 bg-white border ${!selectedTrainerId ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-200' : 'border-slate-200 focus:border-indigo-500'} rounded-xl text-xs font-medium text-slate-900 focus:outline-none cursor-pointer`}
                            >
                              <option value="">-- Choose Coach / Trainer (Required) * --</option>
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
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${commissionType === 'percent' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                                >
                                  %
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCommissionType('fixed')}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${commissionType === 'fixed' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
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

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3: INVOICE BILL BREAKDOWN & TAX
              ══════════════════════════════════════════════════════════════ */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-emerald-200/70">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invoice Bill Breakdown</span>
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={isGstIncluded}
                  onChange={(e) => setIsGstIncluded(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                />
                <span>Apply 18% GST</span>
              </label>
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

            {/* GST Details if enabled */}
            {isGstIncluded && (
              <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-3 gap-2 text-[11px] text-emerald-950 font-semibold">
                <div>Plan Base: <strong className="font-mono">₹{totalBaseFee.toLocaleString('en-IN')}</strong></div>
                <div>CGST ({halfTaxRate}%): <strong className="font-mono">₹{cgst.toLocaleString('en-IN')}</strong></div>
                <div>SGST ({halfTaxRate}%): <strong className="font-mono">₹{sgst.toLocaleString('en-IN')}</strong></div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
              <span className="text-xs font-bold text-slate-800">Total Invoice Bill Amount:</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                ₹{totalCalculatedBill.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 4: PAYMENT COLLECTION & SETTLEMENT
              ══════════════════════════════════════════════════════════════ */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Payment Collection &amp; Settlement
                </span>
              </div>
              <div className="text-[10px] font-semibold text-slate-500">
                Total Bill: <strong className="font-mono text-slate-800">₹{totalCalculatedBill.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {/* Payment / Issue Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Invoice Issue Date (Payment Date) *</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Serves as official invoice transaction date
                </span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Payment Method Split: Cash, UPI, Account Transfer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Cash */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs space-y-1.5">
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
                      className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500 text-right"
                    />
                  </div>
                  <button
                    type="button"
                    title="Pay full amount in Cash"
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

              {/* UPI */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs space-y-1.5">
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
                      className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-500 text-right"
                    />
                  </div>
                  <button
                    type="button"
                    title="Pay full amount via UPI"
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

              {/* Account Transfer / Card */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">Account Transfer / Card</span>
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
                      className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-sky-500 text-right"
                    />
                  </div>
                  <button
                    type="button"
                    title="Pay full amount via Account Transfer"
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
                        min={minModalPromiseDate}
                        max={maxModalPromiseDate}
                        onChange={(e) => setBalanceDueDate(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200/80 font-medium">
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
              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Full payment of <strong>₹{totalCalculatedBill.toLocaleString('en-IN')}</strong> accounted for. <strong>No balance remaining.</strong>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-300 shrink-0">
                  Fully Settled
                </span>
              </div>
            )}

            {/* Handled By / Created By Staff Input */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Invoice Handled By (Staff / Owner)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Audit Record</span>
              </label>
              <input
                type="text"
                value={handledByStaffName}
                onChange={(e) => setHandledByStaffName(e.target.value)}
                placeholder="e.g. Vikramaditya (Owner) / Staff Name"
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
                placeholder="e.g. Renewal discount applied, modified package duration"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              FOOTER ACTION BUTTONS
              ══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-2xs"
              title="Delete invoice record permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Invoice</span>
            </button>

            <div className="flex items-center gap-2">
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
                    <span>Saving Invoice...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Save &amp; Update Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* QUICK ADD NEW PLAN MODAL */}
      <MembershipPlanModal
        isOpen={quickAddModal.isOpen}
        onClose={() => setQuickAddModal({ isOpen: false, packageType: 'Gym-Cardio', targetRowId: null })}
        packageType={quickAddModal.packageType}
        onPlanAdded={handleQuickPlanCreated}
      />

      {/* CONFIRM INVOICE DELETION MODAL */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Delete Invoice"
        itemType="invoice"
        recordName={invoice?.id ? `#${invoice.id}` : 'this invoice'}
        message={`Are you sure you want to permanently delete invoice #${invoice?.id || invoice?.invoiceNumber || ''}?`}
        description="This will permanently delete the invoice, reverse matching revenue inflows, and re-calculate member dues and facility expiry date."
        confirmText="Yes, Delete Invoice"
      />
    </>
  );
};

export default EditInvoiceModal;
