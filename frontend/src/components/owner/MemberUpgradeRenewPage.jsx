import React, { useState, useMemo, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { calculatePlanExpiryDate } from '../../utils/dateUtils';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Zap,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Dumbbell,
  CheckCircle2,
  Clock,
  HeartPulse,
  Tag,
  Loader2,
  AlertCircle,
  Receipt
} from 'lucide-react';
import {
  preventNonNumericKey,
  sanitizeDecimal
} from '../../utils/validation';

export const MemberUpgradeRenewPage = ({
  member: passedMember,
  onBack,
  onSuccess,
  onNavigateTab
}) => {
  const {
    members = [],
    plans = [],
    ptPlans = [],
    recoveryPlans = [],
    trainers = [],
    updateMember,
    allocatePTSessions,
    addToast,
    fetchMembers,
    fetchInvoices,
    fetchDashboardStats,
    calculateMemberStatus
  } = useGymData();

  const { currentUser } = useAuth();

  // Find the most up-to-date member object from context or fallback to passedMember
  const currentMember = useMemo(() => {
    if (!passedMember) return null;
    const found = members.find((m) => m.id === passedMember.id || m.id === passedMember);
    return found || passedMember;
  }, [members, passedMember]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Determine initial start date for renewal:
  // If current plan is active and expiryDate is in the future, renew from expiry date;
  // If expired or not set, start today.
  const initialStartDate = useMemo(() => {
    if (!currentMember?.expiryDate) return todayStr;
    const cleanExpiry = String(currentMember.expiryDate).split('T')[0];
    if (cleanExpiry > todayStr) {
      return cleanExpiry;
    }
    return todayStr;
  }, [currentMember, todayStr]);

  // Packages state (each package can be Gym Membership, Personal Training, or Recovery)
  const [selectedPackages, setSelectedPackages] = useState(() => [
    {
      id: 1,
      packageType: 'Gym Membership Plan',
      packageId: currentMember?.planId || (plans[0]?.id || ''),
      startDate: initialStartDate,
      expiryDate: '',
      price: 0,
      discount: 0,
      trainerId: currentMember?.trainerId || ''
    }
  ]);

  // Payment Breakdown States (Identical to AddMemberPage)
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [accountTransferAmount, setAccountTransferAmount] = useState('');
  const [balanceDueDate, setBalanceDueDate] = useState('');
  const [isGstIncluded, setIsGstIncluded] = useState(true);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recalculate package expiry date whenever plan or start date changes
  const computeExpiryForPackage = (pkgType, pkgId, startDate) => {
    if (!startDate) return '';
    if (pkgType === 'Gym Membership Plan') {
      const plan = plans.find((p) => p.id === pkgId);
      if (!plan) return '';
      const duration = Number(plan.durationMonths || plan.duration_months) || 1;
      const period = plan.period || '';
      const bonus = Number(plan.offerDays || plan.offer_days) || 0;
      return calculatePlanExpiryDate(startDate, duration, period, bonus);
    }
    if (pkgType === 'Personal Training (PT)') {
      const plan = ptPlans.find((p) => p.id === pkgId);
      if (!plan) return '';
      const duration = Number(plan.durationMonths || plan.duration_months) || 1;
      const period = plan.period || '';
      return calculatePlanExpiryDate(startDate, duration, period, 0);
    }
    if (pkgType === 'Recovery / Wellness') {
      const plan = recoveryPlans.find((p) => p.id === pkgId);
      if (!plan) return '';
      const duration = Number(plan.durationMonths || plan.duration_months) || 1;
      const period = plan.period || '';
      return calculatePlanExpiryDate(startDate, duration, period, 0);
    }
    return '';
  };

  // Sync initial plan price & expiry on first load if packages empty or default
  useEffect(() => {
    if (plans.length > 0 && selectedPackages.length === 1 && !selectedPackages[0].price) {
      const defaultPlan = plans.find((p) => p.id === currentMember?.planId) || plans[0];
      if (defaultPlan) {
        const computedExp = computeExpiryForPackage('Gym Membership Plan', defaultPlan.id, initialStartDate);
        setSelectedPackages([
          {
            id: 1,
            packageType: 'Gym Membership Plan',
            packageId: defaultPlan.id,
            startDate: initialStartDate,
            expiryDate: computedExp,
            price: Number(defaultPlan.price || 0),
            discount: 0,
            trainerId: currentMember?.trainerId || ''
          }
        ]);
      }
    }
  }, [plans, currentMember, initialStartDate]);

  // Handler: Add new package row
  const handleAddPackage = () => {
    const newId = Date.now();
    // Default to PT or Recovery if Gym Membership is already chosen
    const hasGymPlan = selectedPackages.some((p) => p.packageType === 'Gym Membership Plan');
    const defaultType = hasGymPlan ? 'Personal Training (PT)' : 'Gym Membership Plan';

    let defaultPlanId = '';
    let defaultPrice = 0;

    if (defaultType === 'Gym Membership Plan') {
      const p = plans[0];
      defaultPlanId = p?.id || '';
      defaultPrice = Number(p?.price || 0);
    } else if (defaultType === 'Personal Training (PT)') {
      const p = ptPlans[0];
      defaultPlanId = p?.id || '';
      defaultPrice = Number(p?.price || 0);
    } else {
      const p = recoveryPlans[0];
      defaultPlanId = p?.id || '';
      defaultPrice = Number(p?.price || 0);
    }

    const computedExp = computeExpiryForPackage(defaultType, defaultPlanId, todayStr);

    setSelectedPackages((prev) => [
      ...prev,
      {
        id: newId,
        packageType: defaultType,
        packageId: defaultPlanId,
        startDate: todayStr,
        expiryDate: computedExp,
        price: defaultPrice,
        discount: 0,
        trainerId: ''
      }
    ]);
  };

  // Handler: Remove package row
  const handleRemovePackage = (id) => {
    if (selectedPackages.length <= 1) {
      addToast('At least one package is required to upgrade or renew.', 'error');
      return;
    }
    setSelectedPackages((prev) => prev.filter((p) => p.id !== id));
  };

  // Handler: Change package type
  const handlePackageTypeChange = (id, newType) => {
    let defaultPlanId = '';
    let defaultPrice = 0;

    if (newType === 'Gym Membership Plan') {
      const p = plans[0];
      defaultPlanId = p?.id || '';
      defaultPrice = Number(p?.price || 0);
    } else if (newType === 'Personal Training (PT)') {
      const p = ptPlans[0];
      defaultPlanId = p?.id || '';
      defaultPrice = Number(p?.price || 0);
    } else {
      const p = recoveryPlans[0];
      defaultPlanId = p?.id || '';
      defaultPrice = Number(p?.price || 0);
    }

    setSelectedPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id === id) {
          const computedExp = computeExpiryForPackage(newType, defaultPlanId, pkg.startDate || todayStr);
          return {
            ...pkg,
            packageType: newType,
            packageId: defaultPlanId,
            price: defaultPrice,
            discount: 0,
            expiryDate: computedExp
          };
        }
        return pkg;
      })
    );
  };

  // Handler: Change package plan
  const handlePlanChange = (id, planId) => {
    setSelectedPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id === id) {
          let foundPlan = null;
          if (pkg.packageType === 'Gym Membership Plan') foundPlan = plans.find((p) => p.id === planId);
          else if (pkg.packageType === 'Personal Training (PT)') foundPlan = ptPlans.find((p) => p.id === planId);
          else foundPlan = recoveryPlans.find((p) => p.id === planId);

          const newPrice = Number(foundPlan?.price || 0);
          const computedExp = computeExpiryForPackage(pkg.packageType, planId, pkg.startDate || todayStr);

          return {
            ...pkg,
            packageId: planId,
            price: newPrice,
            discount: 0,
            expiryDate: computedExp
          };
        }
        return pkg;
      })
    );
  };

  // Handler: Change start date
  const handleStartDateChange = (id, newStartDate) => {
    setSelectedPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id === id) {
          const computedExp = computeExpiryForPackage(pkg.packageType, pkg.packageId, newStartDate);
          return {
            ...pkg,
            startDate: newStartDate,
            expiryDate: computedExp
          };
        }
        return pkg;
      })
    );
  };

  // Handler: Change package discount
  const handleDiscountChange = (id, discountVal) => {
    const num = Math.max(0, Number(discountVal) || 0);
    setSelectedPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id === id) {
          return {
            ...pkg,
            discount: Math.min(pkg.price, num)
          };
        }
        return pkg;
      })
    );
  };

  // Handler: Change package trainer
  const handleTrainerChange = (id, trainerId) => {
    setSelectedPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? { ...pkg, trainerId } : pkg))
    );
  };

  // Financial calculations (Identical to AddMemberPage)
  const totalGrossPackages = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  }, [selectedPackages]);

  const totalDiscountAmount = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + Math.max(0, Number(r.discount) || 0), 0);
  }, [selectedPackages]);

  const numDiscount = totalDiscountAmount;
  const netPackageAmount = Math.max(0, totalGrossPackages - totalDiscountAmount);
  // Total bill is the net package fee — disabling GST does not increase the bill
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

  // Check if member is expired
  const isMemberExpired = useMemo(() => {
    if (!currentMember) return false;
    if (currentMember.status === 'Expired') return true;
    if (currentMember.expiryDate) {
      const cleanExp = String(currentMember.expiryDate).split('T')[0];
      return cleanExp < todayStr;
    }
    return false;
  }, [currentMember, todayStr]);

  // Form submission: atomic renewal and upgrade execution
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentMember) {
      addToast('No member selected for upgrade or renewal.', 'error');
      return;
    }

    if (selectedPackages.length === 0) {
      addToast('Please add at least one package to upgrade or renew.', 'error');
      return;
    }

    // Verify all package selections have valid plan IDs
    for (let i = 0; i < selectedPackages.length; i++) {
      const pkg = selectedPackages[i];
      if (!pkg.packageId) {
        addToast(`Please select a plan for Package #${i + 1}.`, 'error');
        return;
      }
    }

    if (calculatedBalanceDue > 0 && !balanceDueDate) {
      addToast('Please specify a balance due date for partial payment.', 'error');
      return;
    }

    const finalPaymentMethod = getResolvedPaymentMethod();

    setIsSubmitting(true);
    try {
      // 1. Separate chosen package types
      const gymPkg = selectedPackages.find((p) => p.packageType === 'Gym Membership Plan');
      const ptPkg = selectedPackages.find((p) => p.packageType === 'Personal Training (PT)');
      const recoveryPkg = selectedPackages.find((p) => p.packageType === 'Recovery / Wellness');

      const packageTitles = [];

      // Determine updated membership fields
      const updatedMemberPayload = {
        ...currentMember,
        status: 'Active',
        amount: effectivePaidAmount,
        paid_amount: effectivePaidAmount,
        paidAmount: effectivePaidAmount,
        total_amount: totalCalculatedAmount,
        totalAmount: totalCalculatedAmount,
        discount: numDiscount,
        discount_amount: numDiscount,
        discountAmount: numDiscount,
        dues_amount: calculatedBalanceDue,
        duesAmount: calculatedBalanceDue,
        due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
        dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
        payment_method: finalPaymentMethod,
        paymentMethod: finalPaymentMethod,
        is_gst_included: isGstIncluded,
        gst_included: isGstIncluded,
        gst_rate: 18,
        gstRate: 18,
        gst_amount: gstBreakdown.totalGst,
        gstAmount: gstBreakdown.totalGst,
        taxable_amount: gstBreakdown.taxable,
        taxableAmount: gstBreakdown.taxable
      };

      if (gymPkg) {
        const selectedPlan = plans.find((p) => p.id === gymPkg.packageId);
        updatedMemberPayload.plan_id = gymPkg.packageId;
        updatedMemberPayload.planId = gymPkg.packageId;
        updatedMemberPayload.planName = selectedPlan?.name || currentMember.planName;
        updatedMemberPayload.expiry_date = gymPkg.expiryDate;
        updatedMemberPayload.expiryDate = gymPkg.expiryDate;
        packageTitles.push(`Membership: ${selectedPlan?.name || 'Renewed Plan'}`);
      }

      if (ptPkg) {
        const selectedPt = ptPlans.find((p) => p.id === ptPkg.packageId);
        const resolvedTrainer = trainers.find((t) => t.id === ptPkg.trainerId);
        updatedMemberPayload.training_type = 'pt';
        updatedMemberPayload.ptPlanId = ptPkg.packageId;
        updatedMemberPayload.ptPlanName = selectedPt?.name || 'Personal Training';
        if (resolvedTrainer) {
          updatedMemberPayload.trainer_id = resolvedTrainer.id;
          updatedMemberPayload.trainerId = resolvedTrainer.id;
          updatedMemberPayload.trainerName = resolvedTrainer.name;
        }
        const sessionCount = Number(selectedPt?.sessions || selectedPt?.session_count || 12);
        updatedMemberPayload.ptSessions = (Number(currentMember.ptSessions) || 0) + sessionCount;
        packageTitles.push(`PT: ${selectedPt?.name || 'Personal Training'}`);

        if (allocatePTSessions) {
          allocatePTSessions({
            memberId: currentMember.id,
            memberName: currentMember.name,
            trainerId: resolvedTrainer?.id,
            trainerName: resolvedTrainer?.name,
            totalSessions: sessionCount,
            planName: selectedPt?.name || 'PT Package'
          });
        }
      }

      if (recoveryPkg) {
        const selectedRec = recoveryPlans.find((p) => p.id === recoveryPkg.packageId);
        updatedMemberPayload.recoveryPlanId = recoveryPkg.packageId;
        updatedMemberPayload.recoveryPlanName = selectedRec?.name || 'Recovery Pass';
        packageTitles.push(`Recovery: ${selectedRec?.name || 'Recovery Pass'}`);
      }

      // 2. Commit member update to backend API
      if (api.members?.update) {
        await api.members.update(currentMember.id, {
          plan_id: updatedMemberPayload.plan_id || updatedMemberPayload.planId,
          expiry_date: updatedMemberPayload.expiry_date || updatedMemberPayload.expiryDate,
          status: 'Active',
          trainer_id: updatedMemberPayload.trainer_id || updatedMemberPayload.trainerId,
          training_type: updatedMemberPayload.training_type,
          dues_amount: calculatedBalanceDue,
          due_date: calculatedBalanceDue > 0 ? balanceDueDate : null
        });
      }

      if (updateMember) {
        await updateMember(currentMember.id, updatedMemberPayload);
      }

      // 3. Record payment inflow & invoice
      const invoiceTitle = packageTitles.join(' + ') || 'Membership Upgrade & Renewal';
      const rawMemberId = currentMember.numericId || currentMember.id;
      const cleanUserId = typeof rawMemberId === 'string'
        ? parseInt(rawMemberId.replace(/\D/g, ''), 10)
        : Number(rawMemberId);

      if (api.revenueBilling?.addInflow) {
        await api.revenueBilling.addInflow({
          user_id: cleanUserId || 1,
          memberId: currentMember.id,
          member_name: currentMember.name,
          plan_id: gymPkg?.packageId || null,
          plan_name: packageTitles.join(', '),
          title: `${currentMember.name} - ${invoiceTitle}`,
          category: 'Membership Fee',
          amount: effectivePaidAmount,
          total_amount: totalCalculatedAmount,
          dues_amount: calculatedBalanceDue,
          due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
          payment_method: finalPaymentMethod,
          date: todayStr,
          status: calculatedBalanceDue > 0 ? 'Pending' : 'Paid',
          is_gst_included: isGstIncluded,
          gst_amount: gstBreakdown.totalGst,
          taxable_amount: gstBreakdown.taxable,
          notes: paymentNotes || `Upgraded & renewed: ${invoiceTitle}. Received ₹${effectivePaidAmount}.`
        });
      } else if (api.invoices?.create) {
        await api.invoices.create({
          user_id: cleanUserId || currentMember.id,
          plan_id: gymPkg?.packageId,
          amount: effectivePaidAmount,
          payment_method: finalPaymentMethod,
          status: calculatedBalanceDue > 0 ? 'Pending' : 'Paid'
        });
      }

      // 4. Refresh global data context
      fetchMembers?.();
      fetchInvoices?.();
      fetchDashboardStats?.();

      addToast(`Membership upgraded & renewed successfully for ${currentMember.name}!`, 'success');

      if (onSuccess) {
        onSuccess();
      } else if (onBack) {
        onBack();
      } else if (onNavigateTab) {
        onNavigateTab('members');
      }
    } catch (err) {
      console.error('Upgrade & Renew Error:', err);
      addToast(`Failed to process upgrade and renewal: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for unique ID generation
  function strtoupper(str) {
    return str.toUpperCase();
  }
  function substr(str, start, len) {
    return str.substr(start, len);
  }
  function uniqid() {
    return Math.random().toString(36).substring(2, 9);
  }

  if (!currentMember) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">No Member Selected</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Please choose a member from the directory to upgrade or renew.
          </p>
          <button
            type="button"
            onClick={onBack || (() => onNavigateTab?.('members'))}
            className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            ← Back to Member Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn pb-16 w-full max-w-5xl mx-auto">
      {/* Top Header Navigation Bar */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack || (() => onNavigateTab?.('members'))}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Return to Member Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-600" />
              <span>Upgrade & Renew Membership</span>
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              Renew plan validity and add upgraded training packages for {currentMember.name}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wider shrink-0 hidden sm:inline-block">
          Consolidated Flow
        </span>
      </div>

      {/* SECTION 1: Member Profile Dossier (Displaying details that the member has added) */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-200">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Member Information
              </h2>
              <span className="text-[11px] text-slate-400">
                Member profile details on record
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 ${
              isMemberExpired
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : currentMember.status === 'Expiring Soon'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isMemberExpired
                  ? 'bg-rose-500'
                  : currentMember.status === 'Expiring Soon'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span>{isMemberExpired ? 'Expired' : currentMember.status || 'Active'}</span>
          </span>
        </div>

        {/* Member Card Top Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {currentMember.avatar ? (
              <img
                src={currentMember.avatar}
                alt={currentMember.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-black text-violet-700">
                {currentMember.name?.charAt(0) || 'M'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {currentMember.name}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                {currentMember.id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 mt-1">
              {currentMember.phone && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentMember.phone}</span>
                </div>
              )}
              {currentMember.email && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentMember.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Grid (Only displaying entered details, no static fallback placeholders) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          {/* Current / Last Plan */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Plan
            </span>
            <span className="font-bold text-slate-900 block truncate">
              {currentMember.planName || 'Unassigned'}
            </span>
          </div>

          {/* Enrolled Date */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Joined Date
            </span>
            <span className="font-bold text-slate-800 block">
              {currentMember.joinDate || 'N/A'}
            </span>
          </div>

          {/* Expiry Date: Expired in bold red if expired */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Plan Expiry
            </span>
            {isMemberExpired ? (
              <span className="text-rose-600 font-bold block">
                Expired
              </span>
            ) : (
              <span className="font-bold text-slate-800 block">
                {currentMember.expiryDate || 'N/A'}
              </span>
            )}
          </div>

          {/* Assigned Coach */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Assigned Coach
            </span>
            <span className="font-bold text-slate-800 block truncate">
              {currentMember.trainerName &&
              currentMember.trainerName !== 'None / Self Guided' &&
              currentMember.trainerName !== 'Self Guided'
                ? currentMember.trainerName
                : ''}
            </span>
          </div>

          {/* Gender (only if entered) */}
          {currentMember.gender &&
            currentMember.gender !== 'Unspecified' &&
            currentMember.gender !== 'Not specified' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Gender
                </span>
                <span className="font-bold text-slate-800 block">
                  {currentMember.gender}
                </span>
              </div>
            )}

          {/* Age / DOB (only if entered) */}
          {(currentMember.dob || currentMember.age) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Age / DOB
              </span>
              <span className="font-bold text-slate-800 block">
                {currentMember.dob || `${currentMember.age} yrs`}
              </span>
            </div>
          )}

          {/* Emergency Contact (only if entered) */}
          {currentMember.emergencyContact &&
            currentMember.emergencyContact !== 'N/A' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Emergency Contact
                </span>
                <span className="font-bold text-slate-800 block truncate">
                  {currentMember.emergencyContact}
                </span>
              </div>
            )}

          {/* Outstanding Balance Dues (if any) */}
          {Number(currentMember.duesAmount) > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                Existing Balance Due
              </span>
              <span className="font-black text-rose-700 block">
                ₹{Number(currentMember.duesAmount).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FORM: Upgrade / Renew Packages & Financial Settlement */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 2: Packages Selector with prominent "Add Package" button */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Select Packages to Upgrade or Renew
                </h2>
                <span className="text-[11px] text-slate-400">
                  Choose gym membership extension, personal training, or recovery services
                </span>
              </div>
            </div>

            {/* "Add Package" Button */}
            <button
              type="button"
              onClick={handleAddPackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Package</span>
            </button>
          </div>

          {/* List of Package Rows */}
          <div className="space-y-3">
            {selectedPackages.map((pkg, idx) => {
              // Get available plans according to selected package type
              let availablePlans = [];
              if (pkg.packageType === 'Gym Membership Plan') availablePlans = plans;
              else if (pkg.packageType === 'Personal Training (PT)') availablePlans = ptPlans;
              else availablePlans = recoveryPlans;

              return (
                <div
                  key={pkg.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Package #{idx + 1}</span>
                    </span>

                    {selectedPackages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePackage(pkg.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Remove this package"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Package Type */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Package Type *
                      </label>
                      <select
                        value={pkg.packageType}
                        onChange={(e) => handlePackageTypeChange(pkg.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="Gym Membership Plan">Gym Membership Plan (Renew)</option>
                        <option value="Personal Training (PT)">Personal Training (PT)</option>
                        <option value="Recovery / Wellness">Recovery / Wellness Pass</option>
                      </select>
                    </div>

                    {/* Package Plan */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Plan *
                      </label>
                      <select
                        value={pkg.packageId}
                        onChange={(e) => handlePlanChange(pkg.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">
                          -- Choose {pkg.packageType} --
                        </option>
                        {availablePlans.map((p) => (
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
                      </select>
                    </div>

                    {/* Plan Fee */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Fee (₹)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`₹${(Number(pkg.price) || 0).toLocaleString('en-IN')}`}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                    {/* Start Date */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        <span>Start Date *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={pkg.startDate}
                        onChange={(e) => handleStartDateChange(pkg.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Calculated Expiry / Validity */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Valid Until</span>
                      </label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center justify-between">
                        <span>{pkg.expiryDate || 'N/A'}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Auto-calculated</span>
                      </div>
                    </div>

                    {/* Discount */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={pkg.price}
                        placeholder="0"
                        value={pkg.discount || ''}
                        onChange={(e) => handleDiscountChange(pkg.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Coach Assignment if PT package */}
                  {pkg.packageType === 'Personal Training (PT)' && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Assign PT Trainer / Coach
                      </label>
                      <select
                        value={pkg.trainerId || ''}
                        onChange={(e) => handleTrainerChange(pkg.id, e.target.value)}
                        className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">-- Choose Coach --</option>
                        {trainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.specialty || 'Personal Trainer'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Fee Calculation, Discounts & Payment Settlement (Exact match with member addition) */}
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

          {/* 3 Payment Methods: Cash, UPI, Account Transfer (Compact 3-column grid with titles on top) */}
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

                {/* Toggle Button with "GST Included" / "GST Disabled" text */}
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

              {/* When GST is Ticked: Show Base Amount + CGST + SGST = Total Bifurcation */}
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
                /* When GST is Disabled: Non-Tax Banner, NO CGST / SGST Bifurcation */
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

          {/* If Amount Added is Not Complete: Show Remaining Balance Due & Due Date Picker */}
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
                      min={todayStr}
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
              placeholder="e.g. Plan renewed on quarterly cycle with personal training add-on"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack || (() => onNavigateTab?.('members'))}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Upgrade & Renewal...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Upgrade & Renew</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
