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
  AlertCircle
} from 'lucide-react';

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

  // Billing and settlement state
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [amountPaid, setAmountPaid] = useState('');
  const [balanceDueDate, setBalanceDueDate] = useState('');
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

  // Financial calculations
  const totalGrossAmount = useMemo(
    () => selectedPackages.reduce((acc, p) => acc + (Number(p.price) || 0), 0),
    [selectedPackages]
  );

  const totalDiscount = useMemo(
    () => selectedPackages.reduce((acc, p) => acc + (Number(p.discount) || 0), 0),
    [selectedPackages]
  );

  const netPayableAmount = Math.max(0, totalGrossAmount - totalDiscount);

  // Default amountPaid to netPayableAmount if not manually modified
  const effectiveAmountPaid = amountPaid === '' ? netPayableAmount : Math.max(0, Number(amountPaid) || 0);
  const remainingBalanceDue = Math.max(0, netPayableAmount - effectiveAmountPaid);

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

    if (remainingBalanceDue > 0 && !balanceDueDate) {
      addToast('Please specify a balance due date for partial payment.', 'error');
      return;
    }

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
        status: 'Active'
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

      // Update dues
      const newTotalDues = remainingBalanceDue > 0
        ? (Number(currentMember.duesAmount) || 0) + remainingBalanceDue
        : 0;
      updatedMemberPayload.dues_amount = newTotalDues;
      updatedMemberPayload.duesAmount = newTotalDues;
      updatedMemberPayload.due_date = remainingBalanceDue > 0 ? balanceDueDate : null;
      updatedMemberPayload.dueDate = remainingBalanceDue > 0 ? balanceDueDate : null;

      // 2. Commit member update to backend API
      if (api.members?.update) {
        await api.members.update(currentMember.id, {
          plan_id: updatedMemberPayload.plan_id || updatedMemberPayload.planId,
          expiry_date: updatedMemberPayload.expiry_date || updatedMemberPayload.expiryDate,
          status: 'Active',
          trainer_id: updatedMemberPayload.trainer_id || updatedMemberPayload.trainerId,
          training_type: updatedMemberPayload.training_type,
          dues_amount: newTotalDues,
          due_date: remainingBalanceDue > 0 ? balanceDueDate : null
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

      const invNo = 'INV-' + strtoupper(substr(uniqid(), -6));
      if (api.revenueBilling?.addInflow) {
        await api.revenueBilling.addInflow({
          user_id: cleanUserId || 1,
          memberId: currentMember.id,
          member_name: currentMember.name,
          plan_id: gymPkg?.packageId || null,
          plan_name: packageTitles.join(', '),
          title: `${currentMember.name} - ${invoiceTitle}`,
          category: 'Membership Fee',
          amount: effectiveAmountPaid,
          total_amount: netPayableAmount,
          dues_amount: remainingBalanceDue,
          due_date: remainingBalanceDue > 0 ? balanceDueDate : null,
          payment_method: paymentMethod,
          date: todayStr,
          status: remainingBalanceDue > 0 ? 'Pending' : 'Paid',
          notes: paymentNotes || `Upgraded & renewed: ${invoiceTitle}. Received ₹${effectiveAmountPaid}.`
        });
      } else if (api.invoices?.create) {
        await api.invoices.create({
          user_id: cleanUserId || currentMember.id,
          plan_id: gymPkg?.packageId,
          amount: effectiveAmountPaid,
          payment_method: paymentMethod,
          status: remainingBalanceDue > 0 ? 'Pending' : 'Paid'
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

        {/* SECTION 3: Payment Breakdown & Settlement */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Payment Collection & Settlement
              </h2>
              <span className="text-[11px] text-slate-400">
                Collect membership fees and issue billing receipt
              </span>
            </div>
          </div>

          {/* Pricing Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Gross Fee
              </span>
              <span className="text-sm font-extrabold text-slate-800">
                ₹{totalGrossAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Discount
              </span>
              <span className="text-sm font-extrabold text-rose-600">
                - ₹{totalDiscount.toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Final Net Payable
              </span>
              <span className="text-lg font-black text-emerald-700">
                ₹{netPayableAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Method & Amount Paid Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="Cash">Cash</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Net Banking">Net Banking / Transfer</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Amount Paying Now (₹) *
                </label>
                <button
                  type="button"
                  onClick={() => setAmountPaid(String(netPayableAmount))}
                  className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                >
                  Full Amount
                </button>
              </div>
              <input
                type="number"
                min="0"
                max={netPayableAmount}
                value={amountPaid === '' ? netPayableAmount : amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pending Balance Due (₹)
              </label>
              <input
                type="text"
                readOnly
                value={`₹${remainingBalanceDue.toLocaleString('en-IN')}`}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-bold font-mono ${
                  remainingBalanceDue > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              />
            </div>
          </div>

          {/* If partial payment, prompt for Due Date */}
          {remainingBalanceDue > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-medium text-amber-800">
                  Remaining balance of <strong>₹{remainingBalanceDue.toLocaleString('en-IN')}</strong> will be recorded as pending dues.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-bold text-amber-900 whitespace-nowrap">
                  Due Date:
                </label>
                <input
                  type="date"
                  required
                  value={balanceDueDate}
                  onChange={(e) => setBalanceDueDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Notes / Remarks */}
          <div>
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
