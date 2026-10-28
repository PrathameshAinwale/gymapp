import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import {
  PauseCircle,
  PlayCircle,
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldCheck,
  CalendarPlus,
  Loader2,
  RotateCw,
  ArrowRightLeft,
  ArrowRight,
  DollarSign,
  CreditCard,
  Receipt,
  Check,
  Banknote,
  Filter,
  X,
  Settings,
  AlertTriangle,
  SlidersHorizontal,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { MemberSearchSelect } from '../common/MemberSearchSelect';
import { api } from '../../services/api';
import {
  hasSqlInjection,
  sanitizeDigits,
  sanitizeDecimal,
  sanitizePhone,
  preventNonNumericKey,
  preventNonPhoneKey,
  isValidPhone
} from '../../utils/validation';

// Preset duration options for gym policy dropdowns
const DURATION_POLICY_OPTIONS = [
  { val: 0, label: 'Any Plan (No Minimum Restriction - 0 Months)' },
  { val: 1, label: '1 Month & Above (≥ 1 Month)' },
  { val: 2, label: '2 Months & Above (≥ 2 Months)' },
  { val: 3, label: '3 Months & Above (Quarterly - ≥ 3 Months)' },
  { val: 4, label: '4 Months & Above (≥ 4 Months)' },
  { val: 5, label: '5 Months & Above (≥ 5 Months)' },
  { val: 6, label: '6 Months & Above (Half-Yearly - ≥ 6 Months)' },
  { val: 7, label: '7 Months & Above (≥ 7 Months)' },
  { val: 8, label: '8 Months & Above (≥ 8 Months)' },
  { val: 9, label: '9 Months & Above (≥ 9 Months)' },
  { val: 10, label: '10 Months & Above (≥ 10 Months)' },
  { val: 11, label: '11 Months & Above (≥ 11 Months)' },
  { val: 12, label: '12 Months & Above (Annual - ≥ 12 Months)' },
  { val: 18, label: '18 Months & Above (1.5 Years - ≥ 18 Months)' },
  { val: 24, label: '24 Months & Above (2 Years - ≥ 24 Months)' },
  { val: 36, label: '36 Months & Above (3 Years - ≥ 36 Months)' }
];

// Helpers for date and plan duration validation
const getTodayIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const cleanId = (idVal) => String(idVal || '').replace(/\D/g, '');

const extractMemberId = (val) => {
  if (!val) return '';
  if (typeof val === 'object') {
    if (val.target && val.target.value !== undefined) return String(val.target.value);
    if (val.value !== undefined) return String(val.value);
    if (val.id !== undefined) return String(val.id);
  }
  return String(val);
};

const findMemberById = (memberList, idVal) => {
  if (!idVal || !Array.isArray(memberList)) return null;
  const clean = extractMemberId(idVal);
  if (!clean) return null;
  const digits = clean.replace(/\D/g, '');
  return memberList.find((m) => {
    if (!m) return false;
    const mIdStr = String(m.id || '');
    const mUserIdStr = String(m.userId || m.user_id || '');
    if (mIdStr === clean || mUserIdStr === clean) return true;
    if (digits && (mIdStr.replace(/\D/g, '') === digits || mUserIdStr.replace(/\D/g, '') === digits)) return true;
    return false;
  }) || null;
};

const getEndDateFromDays = (startStr, days) => {
  const baseDateStr = startStr || getTodayIso();
  const [y, m, d] = String(baseDateStr).split('T')[0].split(' ')[0].split('-').map(Number);
  if (!y || !m || !d) return getTodayIso();
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + Number(days || 15));
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToDateStr = (dateStr, daysToAdd) => {
  const days = Number(daysToAdd) || 0;
  const baseDateStr = dateStr || getTodayIso();
  const [y, m, d] = String(baseDateStr).split('T')[0].split(' ')[0].split('-').map(Number);
  if (!y || !m || !d) return getTodayIso();
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + days);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDiffDays = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return 0;
  const [sy, sm, sd] = String(startDateStr).split('T')[0].split(' ')[0].split('-').map(Number);
  const [ey, em, ed] = String(endDateStr).split('T')[0].split(' ')[0].split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const diffTime = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
};

const calculateNewPlanExpiry = (currentExpiry, daysToAdd) => {
  const days = Number(daysToAdd) || 0;
  const baseDateStr = currentExpiry || getTodayIso();
  return addDaysToDateStr(baseDateStr, days);
};

const formatDateReadable = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const getMemberPlanDurationMonths = (member, allPlans = []) => {
  if (!member) return 0;
  if (member.durationMonths || member.planDurationMonths) {
    return Number(member.durationMonths || member.planDurationMonths);
  }
  const cleanPlanId = (id) => String(id || '').replace(/^plan-/, '');
  const memberPlanId = cleanPlanId(member.planId || member.plan_id);
  const foundPlan = (allPlans || []).find((p) => cleanPlanId(p.id) === memberPlanId || String(p.id) === String(member.planId));
  if (foundPlan && (foundPlan.durationMonths || foundPlan.duration_months)) {
    return Number(foundPlan.durationMonths || foundPlan.duration_months);
  }
  const text = `${member.planName || ''} ${foundPlan?.name || ''} ${foundPlan?.period || ''}`.toLowerCase();
  if (text.includes('12 month') || text.includes('year') || text.includes('annual')) return 12;
  if (text.includes('6 month') || text.includes('half-year') || text.includes('half year')) return 6;
  if (text.includes('3 month') || text.includes('quarter')) return 3;
  if (text.includes('1 month') || text.includes('monthly')) return 1;
  return 0;
};

const isMemberEligible = (member, allPlans = [], minMonths = 0) => {
  if (!member) return false;
  const reqMonths = Number(minMonths) || 0;
  if (reqMonths <= 0) return true; // 0 means no restriction (any plan duration is eligible)
  const months = getMemberPlanDurationMonths(member, allPlans);
  return months >= reqMonths;
};

const isMemberEligibleForFreeze = (member, allPlans = [], minMonths = 6) => {
  return isMemberEligible(member, allPlans, minMonths);
};

export const MembershipFreezeManager = () => {
  const {
    membershipFreezes,
    addFreezeRequest,
    unfreezeMembership,
    extendMembership,
    transfers = [],
    transferMembership,
    fetchTransfers,
    members,
    plans = [],
    fetchFreezes,
    fetchMembers,
    fetchPlans,
    fetchInvoices,
    fetchDashboardStats,
    addToast
  } = useGymData();

  const [activeTab, setActiveTab] = useState('freezes'); // 'freezes' | 'transfers'
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'freeze' | 'extension'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active Freeze' | 'Completed' | 'Extended'
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const todayIso = useMemo(() => getTodayIso(), []);

  // Policy State
  const [freezePolicy, setFreezePolicy] = useState({
    is_configured: true,
    freeze_min_months: 6,
    extension_min_months: 6,
    transfer_min_months: 6
  });
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    freeze_min_months: 6,
    extension_min_months: 6,
    transfer_min_months: 6,
    syncAll: false
  });

  const isPolicyConfigured = Boolean(freezePolicy?.is_configured ?? true);
  const freezeMinMonths = Number(freezePolicy?.freeze_min_months ?? 6);
  const extensionMinMonths = Number(freezePolicy?.extension_min_months ?? 6);
  const transferMinMonths = Number(freezePolicy?.transfer_min_months ?? 6);

  const fetchPolicy = async () => {
    try {
      setIsLoadingPolicy(true);
      const res = await api.freezePolicy.get();
      if (res && res.success && res.data) {
        setFreezePolicy(res.data);
        const fMonths = Number(res.data.freeze_min_months ?? 6);
        const eMonths = Number(res.data.extension_min_months ?? 6);
        const tMonths = Number(res.data.transfer_min_months ?? 6);
        setPolicyForm({
          freeze_min_months: fMonths,
          extension_min_months: eMonths,
          transfer_min_months: tMonths,
          syncAll: fMonths === eMonths && eMonths === tMonths
        });
      }
    } catch (err) {
      console.error('Failed to load freeze policy:', err);
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  // Eligible members for freeze
  const eligibleFreezeMembers = useMemo(() => {
    return (members || []).filter((m) => isMemberEligible(m, plans, freezeMinMonths));
  }, [members, plans, freezeMinMonths]);

  // Eligible members for extension
  const eligibleExtendMembers = useMemo(() => {
    return (members || []).filter((m) => isMemberEligible(m, plans, extensionMinMonths));
  }, [members, plans, extensionMinMonths]);

  // Eligible members for transfer (source members)
  const eligibleTransferMembers = useMemo(() => {
    return (members || []).filter((m) => isMemberEligible(m, plans, transferMinMonths));
  }, [members, plans, transferMinMonths]);

  // Backwards-compatible reference
  const eligibleMembers = eligibleFreezeMembers;

  useEffect(() => {
    fetchPolicy();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [isSubmittingFreeze, setIsSubmittingFreeze] = useState(false);
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [unfreezingId, setUnfreezingId] = useState(null);

  // Initial load
  useEffect(() => {
    fetchFreezes?.();
    fetchMembers?.();
    fetchPlans?.();
    fetchTransfers?.();
  }, [fetchFreezes, fetchMembers, fetchPlans, fetchTransfers]);

  // Freeze Form State
  const [freezeData, setFreezeData] = useState(() => {
    const today = getTodayIso();
    return {
      memberId: '',
      freezeStartDate: today,
      freezeEndDate: getEndDateFromDays(today, 15),
      daysFrozen: 15,
      fee: 0,
      isFullPayment: true,
      paymentMethod: 'UPI',
      splitCashAmount: 0,
      splitOnlineAmount: 0,
      splitOnlineProvider: 'GPay',
      splitOnlineProviderOther: '',
      reason: 'Official travel / Out of town'
    };
  });

  // Extend Form State
  const [extendData, setExtendData] = useState({
    memberId: '',
    extensionDays: 15,
    fee: 0,
    isFullPayment: true,
    paymentMethod: 'UPI',
    splitCashAmount: 0,
    splitOnlineAmount: 0,
    splitOnlineProvider: 'GPay',
    splitOnlineProviderOther: '',
    reason: 'Complimentary bonus extension'
  });

  // Transfer Form State
  const [transferData, setTransferData] = useState({
    fromMemberId: members[0]?.id || '',
    toMemberId: '',
    toMemberName: '',
    toMemberPhone: '',
    isExistingTarget: true,
    transferCharge: 500,
    transferDate: new Date().toISOString().split('T')[0],
    membershipStartDate: new Date().toISOString().split('T')[0],
    isFullPayment: true,
    paymentMethod: 'UPI',
    splitCashAmount: 0,
    splitOnlineAmount: 0,
    splitOnlineProvider: 'GPay',
    splitOnlineProviderOther: '',
    reason: 'Member relocated / transferred to family/friend'
  });

  // Calculate metrics
  const activeFreezes = membershipFreezes.filter((f) => f.status === 'Active Freeze');
  const totalDaysFrozen = membershipFreezes.reduce((acc, f) => acc + (Number(f.daysFrozen) || 0), 0);
  const totalFreezeFees = membershipFreezes.reduce((acc, f) => acc + (Number(f.fee) || 0), 0);
  const totalTransferFees = transfers.reduce((acc, t) => acc + (Number(t.transferFee) || 0), 0);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (paymentFilter !== 'ALL') count++;
    return count;
  }, [typeFilter, statusFilter, paymentFilter]);

  const handleResetFilters = () => {
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    if (activeTab === 'freezes') {
      return membershipFreezes
        .filter((f) =>
          (f.memberName || '').toLowerCase().includes(term) ||
          (f.planName || '').toLowerCase().includes(term) ||
          (f.reason || '').toLowerCase().includes(term)
        )
        .slice(0, 5);
    } else {
      return transfers
        .filter((t) =>
          (t.fromMemberName || '').toLowerCase().includes(term) ||
          (t.toMemberName || '').toLowerCase().includes(term) ||
          (t.planName || '').toLowerCase().includes(term)
        )
        .slice(0, 5);
    }
  }, [searchTerm, activeTab, membershipFreezes, transfers]);

  const filteredFreezes = useMemo(() => {
    return membershipFreezes.filter((f) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (f.memberName || '').toLowerCase().includes(term) ||
        (f.reason || '').toLowerCase().includes(term) ||
        (f.planName || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (typeFilter !== 'ALL') {
        const isExtension = f.type === 'extension' || f.status === 'Extended';
        if (typeFilter === 'freeze' && isExtension) return false;
        if (typeFilter === 'extension' && !isExtension) return false;
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Active Freeze' && f.status !== 'Active Freeze') return false;
        if (statusFilter === 'Completed' && f.status === 'Active Freeze') return false;
        if (statusFilter === 'Extended' && f.status !== 'Extended' && f.type !== 'extension') return false;
      }

      if (paymentFilter !== 'ALL') {
        const pm = (f.paymentMethod || '').toLowerCase();
        if (paymentFilter === 'Cash' && !pm.includes('cash')) return false;
        if (paymentFilter === 'UPI' && (!pm.includes('upi') || pm.includes('gpay') || pm.includes('phonepe'))) return false;
        if (paymentFilter === 'GPay' && !pm.includes('gpay') && !pm.includes('google pay')) return false;
        if (paymentFilter === 'PhonePe' && !pm.includes('phonepe') && !pm.includes('phone pay') && !pm.includes('phone_pe')) return false;
        if ((paymentFilter === 'Account Transfer' || paymentFilter === 'Account') && !pm.includes('account') && !pm.includes('transfer') && !pm.includes('bank')) return false;
        if (paymentFilter === 'Split' && !pm.includes('split')) return false;
        if (paymentFilter === 'Card' && !pm.includes('card')) return false;
      }

      return true;
    });
  }, [membershipFreezes, searchTerm, typeFilter, statusFilter, paymentFilter]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (t.fromMemberName || '').toLowerCase().includes(term) ||
        (t.toMemberName || '').toLowerCase().includes(term) ||
        (t.planName || '').toLowerCase().includes(term) ||
        (t.reason || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (paymentFilter !== 'ALL') {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (paymentFilter === 'Cash' && !pm.includes('cash')) return false;
        if (paymentFilter === 'UPI' && (!pm.includes('upi') || pm.includes('gpay') || pm.includes('phonepe'))) return false;
        if (paymentFilter === 'GPay' && !pm.includes('gpay') && !pm.includes('google pay')) return false;
        if (paymentFilter === 'PhonePe' && !pm.includes('phonepe') && !pm.includes('phone pay') && !pm.includes('phone_pe')) return false;
        if ((paymentFilter === 'Account Transfer' || paymentFilter === 'Account') && !pm.includes('account') && !pm.includes('transfer') && !pm.includes('bank')) return false;
        if (paymentFilter === 'Split' && !pm.includes('split')) return false;
        if (paymentFilter === 'Card' && !pm.includes('card')) return false;
      }

      return true;
    });
  }, [transfers, searchTerm, paymentFilter]);

  const handlePolicyFormChange = (field, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setPolicyForm((prev) => {
      if (prev.syncAll) {
        return {
          ...prev,
          freeze_min_months: num,
          extension_min_months: num,
          transfer_min_months: num
        };
      }
      return {
        ...prev,
        [field]: num
      };
    });
  };

  const handlePolicySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSavingPolicy(true);
      const payload = {
        freeze_min_months: Math.max(0, Number(policyForm.freeze_min_months) || 0),
        extension_min_months: Math.max(0, Number(policyForm.extension_min_months) || 0),
        transfer_min_months: Math.max(0, Number(policyForm.transfer_min_months) || 0)
      };
      const res = await api.freezePolicy.update(payload);
      if (res && res.success) {
        setFreezePolicy(res.data);
        addToast?.('Gym policy settings saved successfully!', 'success');
        setIsSettingsModalOpen(false);
      } else {
        addToast?.(res?.message || 'Failed to update policy settings', 'error');
      }
    } catch (err) {
      addToast?.(err?.response?.data?.message || err?.message || 'Error saving policy settings', 'error');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleOpenFreezeModal = () => {
    if (!isPolicyConfigured) {
      addToast?.('Please configure your gym policy before performing a membership freeze.', 'warning');
      setIsSettingsModalOpen(true);
      return;
    }
    const defaultMember = eligibleFreezeMembers[0];
    const today = getTodayIso();
    setFreezeData((prev) => ({
      ...prev,
      memberId: prev.memberId && eligibleFreezeMembers.some((m) => m.id === prev.memberId)
        ? prev.memberId
        : (defaultMember?.id || ''),
      freezeStartDate: today,
      freezeEndDate: getEndDateFromDays(today, prev.daysFrozen || 15)
    }));
    setIsFreezeModalOpen(true);
  };

  const handleOpenExtendModal = () => {
    if (!isPolicyConfigured) {
      addToast?.('Please configure your gym policy before performing a plan extension.', 'warning');
      setIsSettingsModalOpen(true);
      return;
    }
    const defaultMember = eligibleExtendMembers[0];
    setExtendData((prev) => ({
      ...prev,
      memberId: prev.memberId && eligibleExtendMembers.some((m) => m.id === prev.memberId)
        ? prev.memberId
        : (defaultMember?.id || '')
    }));
    setIsExtendModalOpen(true);
  };

  const handleStartDateChange = (startStr) => {
    if (!startStr) return;
    const today = getTodayIso();
    if (startStr < today) {
      addToast?.(`Freeze start date cannot be before today (${today}).`, 'error');
      return;
    }
    setFreezeData((prev) => ({
      ...prev,
      freezeStartDate: startStr,
      freezeEndDate: getEndDateFromDays(startStr, prev.daysFrozen || 15)
    }));
  };

  const handleDaysChange = (days) => {
    const numDays = Math.max(1, Number(days) || 1);
    setFreezeData((prev) => ({
      ...prev,
      daysFrozen: numDays,
      freezeEndDate: getEndDateFromDays(prev.freezeStartDate, numDays)
    }));
  };

  const handleFreezeSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(freezeData.reason) || hasSqlInjection(freezeData.splitOnlineProviderOther)) {
      addToast?.('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }

    const today = getTodayIso();
    if (freezeData.freezeStartDate < today) {
      addToast?.(`Freeze start date cannot be before today (${today}).`, 'error');
      return;
    }

    if (!isPolicyConfigured) {
      addToast?.('Gym policy is not configured. Please set the policy first.', 'error');
      setIsSettingsModalOpen(true);
      return;
    }

    const mem = findMemberById(members, freezeData.memberId);
    if (!mem) {
      addToast?.('Please select an eligible member', 'error');
      return;
    }

    if (!isMemberEligible(mem, plans, freezeMinMonths)) {
      addToast?.(
        freezeMinMonths > 0
          ? `Freeze is only applicable to members with plans of at least ${freezeMinMonths} month(s).`
          : 'Member is not eligible for freeze.',
        'error'
      );
      return;
    }

    try {
      setIsSubmittingFreeze(true);
      const freezeProvider = freezeData.splitOnlineProvider === 'Other'
        ? (freezeData.splitOnlineProviderOther?.trim() || 'Other')
        : (freezeData.splitOnlineProvider || 'GPay');
      await addFreezeRequest({
        memberId: mem.id,
        memberName: mem.name,
        planName: mem.planName || 'Membership Plan',
        freezeStartDate: freezeData.freezeStartDate,
        freezeEndDate: freezeData.freezeEndDate,
        daysFrozen: Number(freezeData.daysFrozen),
        fee: Number(freezeData.fee) || 0,
        paymentMethod: freezeData.paymentMethod === 'Split'
          ? `Split (Cash: ₹${freezeData.splitCashAmount || 0} + Online [${freezeProvider}]: ₹${freezeData.splitOnlineAmount || 0})`
          : freezeData.paymentMethod,
        type: 'freeze',
        reason: freezeData.reason
      });
      setIsFreezeModalOpen(false);
    } catch (err) {
      // Handled in context / toast
    } finally {
      setIsSubmittingFreeze(false);
    }
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(extendData.reason) || hasSqlInjection(extendData.splitOnlineProviderOther)) {
      addToast?.('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }

    if (!isPolicyConfigured) {
      addToast?.('Gym policy is not configured. Please set the policy first.', 'error');
      setIsSettingsModalOpen(true);
      return;
    }

    const mem = findMemberById(members, extendData.memberId);
    if (!mem) {
      addToast?.('Please select an eligible member', 'error');
      return;
    }

    if (!isMemberEligible(mem, plans, extensionMinMonths)) {
      addToast?.(
        extensionMinMonths > 0
          ? `Extension is only applicable to members with plans of at least ${extensionMinMonths} month(s).`
          : 'Member is not eligible for extension.',
        'error'
      );
      return;
    }

    try {
      setIsSubmittingExtend(true);
      const extendProvider = extendData.splitOnlineProvider === 'Other'
        ? (extendData.splitOnlineProviderOther?.trim() || 'Other')
        : (extendData.splitOnlineProvider || 'GPay');
      await extendMembership({
        memberId: mem.id,
        extensionDays: Number(extendData.extensionDays),
        fee: Number(extendData.fee) || 0,
        paymentMethod: extendData.paymentMethod === 'Split'
          ? `Split (Cash: ₹${extendData.splitCashAmount || 0} + Online [${extendProvider}]: ₹${extendData.splitOnlineAmount || 0})`
          : extendData.paymentMethod,
        reason: extendData.reason
      });
      setIsExtendModalOpen(false);
    } catch (err) {
      // Handled in context / toast
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (
      hasSqlInjection(transferData.toMemberName) ||
      hasSqlInjection(transferData.toMemberPhone) ||
      hasSqlInjection(transferData.reason) ||
      hasSqlInjection(transferData.splitOnlineProviderOther)
    ) {
      addToast?.('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!isPolicyConfigured) {
      addToast?.('Gym policy is not configured. Please set the policy first.', 'error');
      setIsSettingsModalOpen(true);
      return;
    }

    const fromMember = findMemberById(members, transferData.fromMemberId);
    if (!fromMember) {
      addToast?.('Please select a source member', 'error');
      return;
    }

    if (!isMemberEligible(fromMember, plans, transferMinMonths)) {
      addToast?.(
        transferMinMonths > 0
          ? `Transfer is only applicable to source members with plans of at least ${transferMinMonths} month(s).`
          : 'Source member is not eligible for transfer.',
        'error'
      );
      return;
    }

    let targetName = transferData.toMemberName;
    let targetPhone = transferData.toMemberPhone;
    let toMemberId = null;

    if (transferData.isExistingTarget) {
      const toMember = findMemberById(members, transferData.toMemberId);
      if (!toMember) {
        addToast?.('Please select a destination member', 'error');
        return;
      }
      toMemberId = toMember.id;
      targetName = toMember.name;
      targetPhone = toMember.phone || '';
    } else {
      if (!isValidPhone(targetPhone)) {
        addToast?.('Please enter a valid 10-digit mobile number for transferee', 'error');
        return;
      }
    }

    if (!targetName) {
      addToast?.('Please specify transferee name', 'error');
      return;
    }

    if (remainingDaysSource <= 0) {
      addToast?.('Selected source member has 0 days left on their plan and cannot transfer membership.', 'error');
      return;
    }

    if (transferData.membershipStartDate < minMembershipStartDate) {
      addToast?.(`Membership start date cannot be earlier than ${formatDateReadable(minMembershipStartDate)} (transferee's current plan expiry).`, 'error');
      return;
    }

    const daysRemaining = remainingDaysSource;
    const transferDate = transferData.transferDate || getTodayIso();
    const membershipStartDate = transferData.membershipStartDate || minMembershipStartDate;

    try {
      setIsSubmittingTransfer(true);
      const transferProvider = transferData.splitOnlineProvider === 'Other'
        ? (transferData.splitOnlineProviderOther?.trim() || 'Other')
        : (transferData.splitOnlineProvider || 'GPay');
      await transferMembership({
        fromMemberId: fromMember.id,
        fromMemberName: fromMember.name,
        toMemberId: toMemberId,
        toMemberName: targetName,
        toMemberPhone: targetPhone,
        planName: fromMember.planName || 'Membership Plan',
        daysRemaining,
        transferCharge: Number(transferData.transferCharge) || 0,
        transferFee: Number(transferData.transferCharge) || 0,
        paymentMethod: transferData.paymentMethod === 'Split'
          ? `Split (Cash: ₹${transferData.splitCashAmount || 0} + Online [${transferProvider}]: ₹${transferData.splitOnlineAmount || 0})`
          : transferData.paymentMethod,
        reason: transferData.reason,
        transferDate,
        membershipStartDate,
        calcRecipientExpiry,
        isExistingTarget: transferData.isExistingTarget
      });
      setIsTransferModalOpen(false);
      setActiveTab('transfers');
      fetchTransfers?.();
      fetchMembers?.();
      setTransferData({
        fromMemberId: '',
        toMemberId: '',
        toMemberName: '',
        toMemberPhone: '',
        isExistingTarget: true,
        transferCharge: 500,
        transferDate: getTodayIso(),
        membershipStartDate: getTodayIso(),
        isFullPayment: true,
        paymentMethod: 'UPI',
        splitCashAmount: 0,
        splitOnlineAmount: 0,
        splitOnlineProvider: 'GPay',
        splitOnlineProviderOther: '',
        reason: 'Member relocated / transferred to family/friend'
      });
    } catch (err) {
      console.error('Transfer failed:', err);
      addToast?.(err.message || 'Failed to complete membership transfer', 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Helper for source member in transfer modal
  const selectedSourceMember = useMemo(() => {
    return findMemberById(members, transferData.fromMemberId);
  }, [members, transferData.fromMemberId]);

  const remainingDaysSource = useMemo(() => {
    if (!selectedSourceMember?.expiryDate) return 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(selectedSourceMember.expiryDate);
      expDate.setHours(0, 0, 0, 0);
      if (isNaN(expDate.getTime())) return 0;
      const diffTime = expDate.getTime() - today.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  }, [selectedSourceMember]);

  const selectedDestinationMember = useMemo(() => {
    if (!transferData.isExistingTarget || !transferData.toMemberId) return null;
    return findMemberById(members, transferData.toMemberId);
  }, [members, transferData.isExistingTarget, transferData.toMemberId]);

  const minMembershipStartDate = useMemo(() => {
    const today = getTodayIso();
    if (transferData.isExistingTarget && selectedDestinationMember?.expiryDate) {
      try {
        const destExp = new Date(selectedDestinationMember.expiryDate);
        destExp.setHours(0, 0, 0, 0);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        if (!isNaN(destExp.getTime()) && destExp >= todayDate) {
          const y = destExp.getFullYear();
          const m = String(destExp.getMonth() + 1).padStart(2, '0');
          const d = String(destExp.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch {}
    }
    return today;
  }, [transferData.isExistingTarget, selectedDestinationMember]);

  // Keep membership start date in sync whenever minimum start date increases
  useEffect(() => {
    if (isTransferModalOpen && minMembershipStartDate) {
      setTransferData((prev) => {
        if (!prev.membershipStartDate || prev.membershipStartDate < minMembershipStartDate) {
          return { ...prev, membershipStartDate: minMembershipStartDate };
        }
        return prev;
      });
    }
  }, [isTransferModalOpen, minMembershipStartDate]);

  const calcRecipientExpiry = useMemo(() => {
    const sDate = transferData.membershipStartDate || minMembershipStartDate;
    if (!sDate) return '';
    return addDaysToDateStr(sDate, remainingDaysSource);
  }, [transferData.membershipStartDate, minMembershipStartDate, remainingDaysSource]);

  const handleSourceMemberChange = (raw) => {
    const id = extractMemberId(raw);
    setTransferData((prev) => ({
      ...prev,
      fromMemberId: id
    }));
  };

  const handleDestinationMemberChange = (raw) => {
    const id = extractMemberId(raw);
    const dest = findMemberById(members, id);
    const today = getTodayIso();
    const destExpiry = dest?.expiryDate ? String(dest.expiryDate).split('T')[0].split(' ')[0] : '';
    const destStart = destExpiry && destExpiry >= today ? destExpiry : today;
    setTransferData((prev) => ({
      ...prev,
      toMemberId: id,
      membershipStartDate: destStart
    }));
  };

  const handleToggleTargetType = (isExisting) => {
    const today = getTodayIso();
    let newStart = today;
    if (isExisting && selectedDestinationMember?.expiryDate) {
      const expStr = String(selectedDestinationMember.expiryDate).split('T')[0].split(' ')[0];
      newStart = expStr >= today ? expStr : today;
    }
    setTransferData((prev) => ({
      ...prev,
      isExistingTarget: isExisting,
      membershipStartDate: newStart
    }));
  };

  const handleOpenTransferModal = () => {
    if (!isPolicyConfigured) {
      addToast?.('Please configure your gym policy before performing a membership transfer.', 'warning');
      setIsSettingsModalOpen(true);
      return;
    }
    const today = getTodayIso();
    const source = eligibleTransferMembers[0] || findMemberById(members, transferData.fromMemberId) || members[0];
    const sourceId = source ? String(source.id) : '';
    const dest = findMemberById(members, transferData.toMemberId);
    const destExpiry = dest?.expiryDate ? String(dest.expiryDate).split('T')[0].split(' ')[0] : '';
    const initialStart = transferData.isExistingTarget && destExpiry && destExpiry >= today
      ? destExpiry
      : today;

    setTransferData((prev) => ({
      ...prev,
      fromMemberId: sourceId,
      transferDate: today,
      membershipStartDate: initialStart
    }));
    setIsTransferModalOpen(true);
  };

  const selectedFreezeMember = findMemberById(members, freezeData.memberId);
  const freezeMemberPlanMonths = selectedFreezeMember ? getMemberPlanDurationMonths(selectedFreezeMember, plans) : 0;

  const selectedExtendMember = findMemberById(members, extendData.memberId);
  const extendMemberPlanMonths = selectedExtendMember ? getMemberPlanDurationMonths(selectedExtendMember, plans) : 0;

  return (
    <div className="space-y-4 animate-fadeIn pb-10 w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <PauseCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Freeze, Extension & Transfers
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Manage membership holds, complimentary/paid validity extensions, and transfer memberships between members.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
              !isPolicyConfigured && !isLoadingPolicy
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm animate-pulse'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Configure Gym Eligibility Policy for Freeze, Extension & Transfer"
          >
            <Settings className={`w-3.5 h-3.5 ${!isPolicyConfigured && !isLoadingPolicy ? 'text-white' : 'text-slate-600'}`} />
            <span><span className="hidden sm:inline">Policy </span>Settings</span>
            {!isPolicyConfigured && !isLoadingPolicy && (
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-0.5" />
            )}
          </button>

          {activeTab === 'freezes' ? (
            <>
              <button
                type="button"
                onClick={handleOpenExtendModal}
                className="min-h-[38px] flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Extend</span>
              </button>

              <button
                type="button"
                onClick={handleOpenFreezeModal}
                className="min-h-[38px] flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Freeze</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleOpenTransferModal}
              className="min-h-[38px] flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>+ Transfer</span>
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Configuration Notice Banner */}
      {!isLoadingPolicy && !isPolicyConfigured && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-amber-950">Gym Eligibility Policy Required</h3>
              <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                Before performing any Freeze, Plan Extension, or Membership Transfer, you must configure the minimum plan duration eligibility period for your gym.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure Policy Now</span>
          </button>
        </div>
      )}

      {/* Configured Policy Summary Bar */}
      {!isLoadingPolicy && isPolicyConfigured && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Gym Eligibility Policy:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                Freeze: {freezeMinMonths > 0 ? `≥ ${freezeMinMonths} mo` : 'Any Plan'}
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                Extend: {extensionMinMonths > 0 ? `≥ ${extensionMinMonths} mo` : 'Any Plan'}
              </span>
              <span className="bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-md font-bold">
                Transfer: {transferMinMonths > 0 ? `≥ ${transferMinMonths} mo` : 'Any Plan'}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
          >
            Edit Policy
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('freezes')}
          className={`min-h-[40px] flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'freezes'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PauseCircle className="w-4 h-4" />
          <span>Freezes & Extensions</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'freezes' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {membershipFreezes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`min-h-[40px] flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transfers'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Transfers</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'transfers' ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {transfers.length}
          </span>
        </button>
      </div>

      {activeTab === 'freezes' ? (
        <>
          {/* Freezes KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Preserved Days</span>
              <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">{totalDaysFrozen} Days</div>
              <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium block truncate">Added to expirations</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Active Freezes</span>
              <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">{activeFreezes.length}</div>
              <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium block truncate">Paused validity</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Freeze / Ext. Fees</span>
              <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">₹{totalFreezeFees.toLocaleString('en-IN')}</div>
              <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium block truncate">Total fees charged</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Records</span>
              <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{membershipFreezes.length}</div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">Holds & extensions</span>
            </div>
          </div>

          {/* Freezes Table Section */}
          <div className="space-y-2.5">
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Autocomplete Search Bar */}
              <div ref={searchContainerRef} className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  placeholder="Search member, plan name, or reason..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-2xs transition-all truncate"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Autocomplete Suggestions */}
                {isSearchDropdownOpen && searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Suggestions
                    </div>
                    {searchSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchTerm(item.memberName || item.fromMemberName || '');
                          setIsSearchDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50/60 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{item.memberName || item.fromMemberName}</span>
                          <span className="text-[10px] text-slate-400">({item.planName || 'Plan'})</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {item.daysFrozen ? `${item.daysFrozen} Days` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons: Filter */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  className={`min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFiltersCount > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active Chips */}
            {(activeFiltersCount > 0 || searchTerm) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400 font-medium">Active:</span>

                {typeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Type: {typeFilter === 'freeze' ? 'Freeze Hold' : 'Extension'}
                    <button type="button" onClick={() => setTypeFilter('ALL')} className="hover:text-emerald-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Status: {statusFilter}
                    <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-emerald-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {paymentFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Payment: {paymentFilter}
                    <button type="button" onClick={() => setPaymentFilter('ALL')} className="hover:text-emerald-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    "{searchTerm}"
                    <button type="button" onClick={() => setSearchTerm('')} className="hover:text-slate-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium ml-1 cursor-pointer"
                >
                  Reset all
                </button>

                <span className="ml-auto text-[11px] text-slate-400">
                  Showing {filteredFreezes.length} of {membershipFreezes.length} records
                </span>
              </div>
            )}
          </div>

          {/* Desktop View Table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {filteredFreezes.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={PauseCircle}
                  title={searchTerm || activeFiltersCount > 0 ? "No matching freeze records" : "No Memberships Frozen"}
                  description={searchTerm || activeFiltersCount > 0 ? "No freeze records match your search or filter criteria." : "Pause active memberships or add validity extensions with fees."}
                  actionText={searchTerm || activeFiltersCount > 0 ? "Reset Filters" : "Freeze Member Plan"}
                  onAction={searchTerm || activeFiltersCount > 0 ? handleResetFilters : handleOpenFreezeModal}
                  color="amber"
                />
              </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Member Name</th>
                        <th className="py-3.5 px-4">Plan</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Days</th>
                        <th className="py-3.5 px-4">Fee Charged</th>
                        <th className="py-3.5 px-4">Payment Mode</th>
                        <th className="py-3.5 px-4">Reason</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredFreezes.map((f) => {
                        const isActive = f.status === 'Active Freeze';
                        const isExtension = f.type === 'extension' || f.status === 'Extended';

                        return (
                          <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>{f.memberName}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {f.planName}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                isExtension
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {isExtension ? 'Extension' : 'Freeze'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-700">
                              <div className="flex items-center gap-1 text-[11px]">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{f.freezeStartDate} → {f.freezeEndDate}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                                {f.daysFrozen} Days
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 text-xs">
                                ₹{Number(f.fee || 0).toLocaleString('en-IN')}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="text-[11px] text-slate-600 font-medium">
                                {f.paymentMethod || 'Cash'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={f.reason}>
                              {f.reason || '—'}
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isActive ? <PauseCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                <span>{f.status}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {isActive ? (
                                <button
                                  type="button"
                                  disabled={unfreezingId === f.id}
                                  onClick={async () => {
                                    try {
                                      setUnfreezingId(f.id);
                                      await unfreezeMembership(f.id);
                                    } finally {
                                      setUnfreezingId(null);
                                    }
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1 ml-auto active:scale-95"
                                >
                                  {unfreezingId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                  <span>{unfreezingId === f.id ? 'Resuming...' : 'Unfreeze'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Completed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Mobile View for Freezes */}
            <div className="block sm:hidden space-y-2.5">
              {filteredFreezes.map((f) => (
                <div key={f.id} className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{f.memberName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{f.planName}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      ₹{Number(f.fee || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 text-[11px]">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Period</span>
                      <span className="text-slate-800 font-medium">{f.freezeStartDate} → {f.freezeEndDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Days / Mode</span>
                      <span className="text-slate-800 font-medium">{f.daysFrozen} Days • {f.paymentMethod || 'Cash'}</span>
                    </div>
                  </div>

                  {f.status === 'Active Freeze' && (
                    <button
                      type="button"
                      disabled={unfreezingId === f.id}
                      onClick={async () => {
                        try {
                          setUnfreezingId(f.id);
                          await unfreezeMembership(f.id);
                        } finally {
                          setUnfreezingId(null);
                        }
                      }}
                      className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      {unfreezingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                      <span>{unfreezingId === f.id ? 'Resuming...' : 'Unfreeze Plan'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Transfers Section */
        <div className="space-y-4">
          {/* Transfers KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Transfers</span>
              <div className="text-xl sm:text-2xl font-black text-violet-600 mt-1">{transfers.length}</div>
              <span className="text-[11px] text-slate-500 block">Memberships reassigned</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Transfer Fees Collected</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">₹{totalTransferFees.toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-emerald-700 font-medium block">Revenue from transfer charges</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Transfer Charge</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ₹{transfers.length > 0 ? Math.round(totalTransferFees / transfers.length).toLocaleString('en-IN') : 0}
              </div>
              <span className="text-[11px] text-slate-500 block">Per transfer processing</span>
            </div>
          </div>

          {/* Transfers Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">Membership Transfer Log</h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search transfers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {filteredTransfers.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={ArrowRightLeft}
                  title={searchTerm ? "No matching transfers" : "No Membership Transfers"}
                  description={searchTerm ? `No transfer records match "${searchTerm}".` : "Transfer remaining membership validity from one member to another and charge a transfer fee."}
                  actionText="Transfer Membership"
                  onAction={handleOpenTransferModal}
                  color="violet"
                />
              </div>
            ) : (
              <>
                {/* Mobile View for Transfers */}
                <div className="block sm:hidden p-3 space-y-2.5">
                  {filteredTransfers.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">From</div>
                          <div className="font-bold text-slate-900 text-xs truncate">{t.fromMemberName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">To Transferee</div>
                          <div className="font-bold text-violet-700 text-xs truncate">{t.toMemberName}</div>
                          {t.toMemberPhone && (
                            <div className="text-[10px] text-slate-400">{t.toMemberPhone}</div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-emerald-700 text-xs block">
                            ₹{Number(t.transferFee || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>{t.status || 'Completed'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Plan & Days</span>
                          <span className="font-semibold text-slate-800 block truncate">{t.planName}</span>
                          <span className="text-[10px] text-violet-700 font-bold">{t.daysRemaining} Days</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Date / Mode</span>
                          <span className="text-slate-800 font-medium block">{t.transferDate}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{t.paymentMethod || 'UPI'}</span>
                        </div>
                      </div>

                      {t.reason && (
                        <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                          "{t.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop View Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">From Member</th>
                        <th className="py-3.5 px-4">To Transferee</th>
                        <th className="py-3.5 px-4">Plan Name</th>
                        <th className="py-3.5 px-4">Days Transferred</th>
                        <th className="py-3.5 px-4">Transfer Fee</th>
                        <th className="py-3.5 px-4">Payment Mode</th>
                        <th className="py-3.5 px-4">Transfer / Start Date</th>
                        <th className="py-3.5 px-4">Reason</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredTransfers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900">{t.fromMemberName}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-bold text-violet-700">{t.toMemberName}</span>
                              {t.toMemberPhone && <span className="block text-[10px] text-slate-400">{t.toMemberPhone}</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {t.planName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-violet-50 text-violet-800 border border-violet-200">
                              {t.daysRemaining} Days
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600">
                            ₹{Number(t.transferFee || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {t.paymentMethod || 'UPI'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 block">{t.transferDate}</span>
                            {t.membershipStartDate && (
                              <span className="text-[10px] text-violet-600 font-medium block">Starts: {t.membershipStartDate}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={t.reason}>
                            {t.reason || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>{t.status || 'Completed'}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Freeze Modal */}
      <Modal
        isOpen={isFreezeModalOpen}
        onClose={() => setIsFreezeModalOpen(false)}
        title="Freeze Member Plan"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFreezeSubmit} className="space-y-3.5">
          {/* Eligibility Policy Notice */}
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <span className="font-bold block text-blue-950">Gym Eligibility Policy</span>
              <p className="text-blue-800">
                {freezeMinMonths > 0
                  ? `According to your gym's settings, Freeze is applicable only to members with membership plans of at least ${freezeMinMonths} month(s). Plans shorter than ${freezeMinMonths} month(s) are not eligible.`
                  : 'According to your gym\'s settings, Freeze is allowed for all active membership plans with no minimum duration restriction.'}
              </p>
            </div>
          </div>

          {/* Typeable Member Combobox */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Select Member *</label>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {eligibleFreezeMembers.length} Eligible Members
              </span>
            </div>
            {eligibleFreezeMembers.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                {freezeMinMonths > 0
                  ? `No active members currently hold plans with duration of ${freezeMinMonths}+ months.`
                  : 'No active members available.'}
              </div>
            ) : (
              <MemberSearchSelect
                members={eligibleFreezeMembers}
                value={freezeData.memberId}
                onChange={(id) => setFreezeData({ ...freezeData, memberId: extractMemberId(id) })}
                placeholder={`Type to search eligible member (${freezeMinMonths > 0 ? `${freezeMinMonths}+ month plans` : 'all plans'})...`}
              />
            )}
            {selectedFreezeMember && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="text-slate-400">Current Plan:</span>
                <span className="font-bold text-slate-800">{selectedFreezeMember.planName}</span>
                {freezeMemberPlanMonths > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {freezeMemberPlanMonths} Months Plan
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                min={todayIso}
                value={freezeData.freezeStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Cannot be earlier than today ({todayIso})</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Days Frozen *</label>
              <input
                type="number"
                required
                min="1"
                max="90"
                inputMode="numeric"
                value={freezeData.daysFrozen}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => handleDaysChange(sanitizeDigits(e.target.value, 2))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Validity Increase Preview */}
          {selectedFreezeMember && (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Current Plan Expiry:</span>
                <span className="font-bold text-slate-800">
                  {formatDateReadable(selectedFreezeMember.expiryDate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-medium">Freeze Days Added to Plan:</span>
                <span className="font-bold text-emerald-700">+{freezeData.daysFrozen} Days</span>
              </div>
              <div className="pt-1.5 border-t border-emerald-200/90 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>New Extended Plan Validity:</span>
                </span>
                <span className="font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-xs">
                  {formatDateReadable(calculateNewPlanExpiry(selectedFreezeMember.expiryDate, freezeData.daysFrozen))}
                </span>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Resume Date: {freezeData.freezeEndDate}</span>
            </div>
            <p className="text-[10px] text-amber-700">
              The member's expiry date will be automatically pushed forward by {freezeData.daysFrozen} days.
            </p>
          </div>

          {/* Freeze Fee & Payment Options */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Freeze Fee & Payment Options</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Freeze Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={freezeData.fee}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setFreezeData({ ...freezeData, fee: sanitizeDecimal(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0 for complimentary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={freezeData.paymentMethod}
                  onChange={(e) => setFreezeData({ ...freezeData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="UPI">UPI</option>
                  <option value="GPay">GPay (Google Pay)</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Account Transfer">Account Transfer</option>
                  <option value="Cash">Cash at Reception</option>
                  <option value="Split">Split (Cash + UPI)</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            {/* Split Breakdown */}
            {freezeData.paymentMethod === 'Split' && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Cash (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={freezeData.splitCashAmount}
                      onChange={(e) => setFreezeData({ ...freezeData, splitCashAmount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Online (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={freezeData.splitOnlineAmount}
                      onChange={(e) => setFreezeData({ ...freezeData, splitOnlineAmount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {/* Online Provider Selection */}
                    <div className="mt-1.5 space-y-1">
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: 'UPI', label: 'UPI' },
                          { id: 'GPay', label: 'GPay' },
                          { id: 'PhonePe', label: 'PhonePe' },
                          { id: 'Account', label: 'Account' },
                          { id: 'Other', label: 'Other' },
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setFreezeData({ ...freezeData, splitOnlineProvider: provider.id })}
                            className={`py-0.5 px-1 rounded text-[9px] font-bold border transition-all text-center cursor-pointer ${
                              freezeData.splitOnlineProvider === provider.id
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {provider.label}
                          </button>
                        ))}
                      </div>
                      {freezeData.splitOnlineProvider === 'Other' && (
                        <input
                          type="text"
                          required
                          value={freezeData.splitOnlineProviderOther}
                          onChange={(e) => setFreezeData({ ...freezeData, splitOnlineProviderOther: e.target.value })}
                          placeholder="Type provider..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-900"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Freeze</label>
            <input
              type="text"
              required
              value={freezeData.reason}
              onChange={(e) => setFreezeData({ ...freezeData, reason: e.target.value })}
              placeholder="e.g. Work travel, medical recovery"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFreezeModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingFreeze || eligibleFreezeMembers.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
            >
              {isSubmittingFreeze && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingFreeze ? 'Freezing...' : 'Confirm Freeze'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Extend Modal */}
      <Modal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        title="Extend Plan Validity"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleExtendSubmit} className="space-y-3.5">
          {/* Eligibility Policy Notice */}
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <span className="font-bold block text-blue-950">Gym Eligibility Policy</span>
              <p className="text-blue-800">
                {extensionMinMonths > 0
                  ? `According to your gym's settings, Plan Extension is applicable only to members with membership plans of at least ${extensionMinMonths} month(s). Plans shorter than ${extensionMinMonths} month(s) are not eligible.`
                  : 'According to your gym\'s settings, Plan Extension is allowed for all active membership plans with no minimum duration restriction.'}
              </p>
            </div>
          </div>

          {/* Typeable Member Combobox */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Select Member *</label>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {eligibleExtendMembers.length} Eligible Members
              </span>
            </div>
            {eligibleExtendMembers.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                {extensionMinMonths > 0
                  ? `No active members currently hold plans with duration of ${extensionMinMonths}+ months.`
                  : 'No active members available.'}
              </div>
            ) : (
              <MemberSearchSelect
                members={eligibleExtendMembers}
                value={extendData.memberId}
                onChange={(id) => setExtendData({ ...extendData, memberId: extractMemberId(id) })}
                placeholder={`Type to search eligible member (${extensionMinMonths > 0 ? `${extensionMinMonths}+ month plans` : 'all plans'})...`}
              />
            )}
            {selectedExtendMember && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="text-slate-400">Current Plan:</span>
                <span className="font-bold text-slate-800">{selectedExtendMember.planName}</span>
                {extendMemberPlanMonths > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {extendMemberPlanMonths} Months Plan
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Extension Days to Add *</label>
            <input
              type="number"
              required
              min="1"
              max="180"
              inputMode="numeric"
              value={extendData.extensionDays}
              onKeyDown={(e) => preventNonNumericKey(e, false)}
              onChange={(e) => setExtendData({ ...extendData, extensionDays: sanitizeDigits(e.target.value, 3) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Validity Increase Preview */}
          {selectedExtendMember && (
            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Current Plan Expiry:</span>
                <span className="font-bold text-slate-800">
                  {formatDateReadable(selectedExtendMember.expiryDate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-blue-700 font-medium">Extension Days Added:</span>
                <span className="font-bold text-blue-700">+{extendData.extensionDays || 0} Days</span>
              </div>
              <div className="pt-1.5 border-t border-blue-200/90 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-950 flex items-center gap-1">
                  <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>New Extended Plan Validity:</span>
                </span>
                <span className="font-black text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-300 shadow-xs">
                  {formatDateReadable(calculateNewPlanExpiry(selectedExtendMember.expiryDate, extendData.extensionDays))}
                </span>
              </div>
            </div>
          )}

          {/* Extension Fee & Payment Options */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Extension Fee & Payment Options</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Extension Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={extendData.fee}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setExtendData({ ...extendData, fee: sanitizeDecimal(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0 for complimentary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={extendData.paymentMethod}
                  onChange={(e) => setExtendData({ ...extendData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="UPI">UPI</option>
                  <option value="GPay">GPay (Google Pay)</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Account Transfer">Account Transfer</option>
                  <option value="Cash">Cash at Reception</option>
                  <option value="Split">Split (Cash + UPI)</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            {/* Split Breakdown */}
            {extendData.paymentMethod === 'Split' && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Cash (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={extendData.splitCashAmount}
                      onChange={(e) => setExtendData({ ...extendData, splitCashAmount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Online (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={extendData.splitOnlineAmount}
                      onChange={(e) => setExtendData({ ...extendData, splitOnlineAmount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {/* Online Provider Selection */}
                    <div className="mt-1.5 space-y-1">
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: 'UPI', label: 'UPI' },
                          { id: 'GPay', label: 'GPay' },
                          { id: 'PhonePe', label: 'PhonePe' },
                          { id: 'Account', label: 'Account' },
                          { id: 'Other', label: 'Other' },
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setExtendData({ ...extendData, splitOnlineProvider: provider.id })}
                            className={`py-0.5 px-1 rounded text-[9px] font-bold border transition-all text-center cursor-pointer ${
                              extendData.splitOnlineProvider === provider.id
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {provider.label}
                          </button>
                        ))}
                      </div>
                      {extendData.splitOnlineProvider === 'Other' && (
                        <input
                          type="text"
                          required
                          value={extendData.splitOnlineProviderOther}
                          onChange={(e) => setExtendData({ ...extendData, splitOnlineProviderOther: e.target.value })}
                          placeholder="Type provider..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-900"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
            <input
              type="text"
              required
              value={extendData.reason}
              onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
              placeholder="e.g. Festival bonus, compensation"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExtendModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingExtend || eligibleExtendMembers.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
            >
              {isSubmittingExtend && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingExtend ? 'Applying Extension...' : 'Apply Extension'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Membership to Another Member"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          {/* Eligibility Policy Notice */}
          <div className="p-3 rounded-xl bg-violet-50/80 border border-violet-200/80 text-xs text-violet-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <span className="font-bold block text-violet-950">Gym Eligibility Policy</span>
              <p className="text-violet-800">
                {transferMinMonths > 0
                  ? `According to your gym's settings, Membership Transfer can only be initiated by members with plans of at least ${transferMinMonths} month(s).`
                  : 'According to your gym\'s settings, Membership Transfer is allowed from any active membership plan.'}
              </p>
            </div>
          </div>

          {/* Source Member */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Source Member (Transfer From) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                  {eligibleTransferMembers.length} Eligible
                </span>
                {selectedSourceMember && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    remainingDaysSource > 0 ? 'bg-violet-100 text-violet-800 border border-violet-200' : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {remainingDaysSource > 0 ? `${remainingDaysSource} Days Remaining` : '0 Days (Expired)'}
                  </span>
                )}
              </div>
            </div>
            {eligibleTransferMembers.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                {transferMinMonths > 0
                  ? `No active members currently hold plans with duration of ${transferMinMonths}+ months to transfer.`
                  : 'No active members available.'}
              </div>
            ) : (
              <MemberSearchSelect
                members={eligibleTransferMembers}
                value={transferData.fromMemberId}
                onChange={handleSourceMemberChange}
                placeholder={`Type to search eligible source member (${transferMinMonths > 0 ? `${transferMinMonths}+ month plans` : 'all plans'})...`}
              />
            )}
            {selectedSourceMember && (
              <div className="mt-2 p-3 rounded-xl bg-violet-50/80 border border-violet-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-violet-950 block">{selectedSourceMember.planName || 'Plan'}</span>
                    <span className="text-[11px] text-violet-700">Expires: {formatDateReadable(selectedSourceMember.expiryDate)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-violet-600 uppercase font-bold block">Remaining Days Left</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                      remainingDaysSource > 0 ? 'bg-violet-600 text-white' : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {remainingDaysSource} Days Left
                    </span>
                  </div>
                </div>
                {remainingDaysSource <= 0 && (
                  <div className="pt-1.5 border-t border-red-200/80 text-[11px] text-red-700 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>This member's plan has expired (0 days left). Only members with active remaining days can transfer.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Destination Member Mode Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Destination Transferee (Transfer To) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleTargetType(true)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                    transferData.isExistingTarget
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Existing Member
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTargetType(false)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                    !transferData.isExistingTarget
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  New Transferee
                </button>
              </div>
            </div>

            {transferData.isExistingTarget ? (
              <>
                <MemberSearchSelect
                  members={members.filter((m) => String(m.id) !== String(transferData.fromMemberId) && cleanId(m.id) !== cleanId(transferData.fromMemberId))}
                  value={transferData.toMemberId}
                  onChange={handleDestinationMemberChange}
                  placeholder="Type to search recipient member..."
                />
                {selectedDestinationMember && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">{selectedDestinationMember.planName || 'No Active Plan'}</span>
                      <span className="text-[11px] text-slate-500">
                        Current Expiry: {formatDateReadable(selectedDestinationMember.expiryDate)}
                      </span>
                    </div>
                    {selectedDestinationMember.expiryDate && String(selectedDestinationMember.expiryDate).split('T')[0] >= todayIso ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Current Plan Expires: {formatDateReadable(selectedDestinationMember.expiryDate)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Expired / No Active Plan
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Transferee Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={transferData.toMemberName}
                    onChange={(e) => setTransferData({ ...transferData, toMemberName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    value={transferData.toMemberPhone}
                    onKeyDown={preventNonPhoneKey}
                    onChange={(e) => setTransferData({ ...transferData, toMemberPhone: sanitizePhone(e.target.value) })}
                    placeholder="10 digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Transfer Date & New Membership Start Date */}
          <div className="p-3.5 rounded-xl bg-violet-50/50 border border-violet-200/70 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-violet-600" />
              <span>Transfer & Validity Dates</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Transfer Date *
                </label>
                <input
                  type="date"
                  required
                  value={transferData.transferDate}
                  onChange={(e) => setTransferData({ ...transferData, transferDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500 font-semibold cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Membership Start Date *
                </label>
                <input
                  type="date"
                  required
                  min={minMembershipStartDate}
                  value={transferData.membershipStartDate}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (chosen < minMembershipStartDate) {
                      addToast?.(`Start date cannot be earlier than ${formatDateReadable(minMembershipStartDate)}`, 'warning');
                      return;
                    }
                    setTransferData({ ...transferData, membershipStartDate: chosen });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500 font-semibold cursor-pointer"
                />
                <span className="text-[10px] text-violet-700 mt-0.5 block font-medium">
                  {minMembershipStartDate > todayIso
                    ? `Cannot be earlier than transferee's current plan expiry (${formatDateReadable(minMembershipStartDate)})`
                    : `Cannot be earlier than today (${formatDateReadable(todayIso)})`}
                </span>
              </div>
            </div>

            {/* Transfer Impact & Validity Calculation Banner */}
            <div className="p-3 rounded-lg bg-white border border-violet-100 text-xs space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-violet-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
                  Transferred Validity Calculation:
                </span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
                  remainingDaysSource > 0 ? 'bg-violet-100 text-violet-800' : 'bg-red-100 text-red-700'
                }`}>
                  +{remainingDaysSource} Days Added
                </span>
              </div>
              <div className="text-[11px] text-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Source Plan Days Remaining:</span>
                  <span className="font-bold text-violet-950">
                    {remainingDaysSource} Days (from {selectedSourceMember?.name || 'source'})
                  </span>
                </div>
                {selectedDestinationMember && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Transferee Current Plan Expiry:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDestinationMember.expiryDate ? formatDateReadable(selectedDestinationMember.expiryDate) : 'No Active Plan'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">New Membership Start Date:</span>
                  <span className="font-bold text-slate-900">{formatDateReadable(transferData.membershipStartDate)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="font-bold text-violet-950">Transferee New Expiry Date:</span>
                  <span className="font-black text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-lg border border-violet-200">
                    {formatDateReadable(calcRecipientExpiry)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-violet-700 leading-relaxed">
                Exactly <strong>{remainingDaysSource} days</strong> remaining from <strong>{selectedSourceMember?.name || 'source'}</strong> will be added to {selectedDestinationMember ? <strong>{selectedDestinationMember.name}</strong> : 'the destination member'}'s plan starting from <strong>{formatDateReadable(transferData.membershipStartDate)}</strong> to <strong>{formatDateReadable(calcRecipientExpiry)}</strong>.
              </p>
              <div className="pt-1 border-t border-slate-100 text-[10px] text-amber-700 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Source member will be marked as <strong className="text-amber-900">Expired</strong> immediately upon transfer.</span>
              </div>
            </div>
          </div>

          {/* Transfer Charge Amount & Payment Options */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Transfer Charge Amount & Payment Options</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Transfer Charge Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  inputMode="decimal"
                  value={transferData.transferCharge}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setTransferData({ ...transferData, transferCharge: sanitizeDecimal(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-violet-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={transferData.paymentMethod}
                  onChange={(e) => setTransferData({ ...transferData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="UPI">UPI</option>
                  <option value="GPay">GPay (Google Pay)</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Account Transfer">Account Transfer</option>
                  <option value="Cash">Cash at Reception</option>
                  <option value="Split">Split (Cash + UPI)</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            {/* Split breakdown */}
            {transferData.paymentMethod === 'Split' && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Cash (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={transferData.splitCashAmount}
                      onChange={(e) => setTransferData({ ...transferData, splitCashAmount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Online (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={transferData.splitOnlineAmount}
                      onChange={(e) => setTransferData({ ...transferData, splitOnlineAmount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {/* Online Provider Selection */}
                    <div className="mt-1.5 space-y-1">
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: 'UPI', label: 'UPI' },
                          { id: 'GPay', label: 'GPay' },
                          { id: 'PhonePe', label: 'PhonePe' },
                          { id: 'Account', label: 'Account' },
                          { id: 'Other', label: 'Other' },
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setTransferData({ ...transferData, splitOnlineProvider: provider.id })}
                            className={`py-0.5 px-1 rounded text-[9px] font-bold border transition-all text-center cursor-pointer ${
                              transferData.splitOnlineProvider === provider.id
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {provider.label}
                          </button>
                        ))}
                      </div>
                      {transferData.splitOnlineProvider === 'Other' && (
                        <input
                          type="text"
                          required
                          value={transferData.splitOnlineProviderOther}
                          onChange={(e) => setTransferData({ ...transferData, splitOnlineProviderOther: e.target.value })}
                          placeholder="Type provider..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-900"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Transfer</label>
            <input
              type="text"
              required
              value={transferData.reason}
              onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              placeholder="e.g. Relocated to another city, gave pass to brother"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingTransfer}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
            >
              {isSubmittingTransfer && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingTransfer ? 'Transferring...' : 'Confirm Transfer'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Policy Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          if (!isPolicyConfigured) {
            addToast?.('Configuring eligibility policy is mandatory for this gym.', 'warning');
          }
          setIsSettingsModalOpen(false);
        }}
        title="Eligibility Policy Settings"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handlePolicySubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Configure Minimum Plan Duration</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Define the minimum plan duration (in months) a member must hold to be eligible for Freeze, Plan Extension, or Membership Transfer.
              Set to <strong>0</strong> to allow any plan with no minimum duration restriction.
            </p>
          </div>

          {/* Quick sync toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div>
              <span className="text-xs font-bold text-emerald-950 block">Same duration for all</span>
              <span className="text-[10px] text-emerald-700">Keep freeze, extension, and transfer periods synchronized</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policyForm.syncAll}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setPolicyForm((prev) => ({
                    ...prev,
                    syncAll: checked,
                    extension_min_months: checked ? prev.freeze_min_months : prev.extension_min_months,
                    transfer_min_months: checked ? prev.freeze_min_months : prev.transfer_min_months
                  }));
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Freeze Min Months */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Minimum Plan Duration for Freeze *
              </label>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {policyForm.freeze_min_months === 0 ? 'Any Plan (No limit)' : `≥ ${policyForm.freeze_min_months} Months`}
              </span>
            </div>
            <div className="relative">
              <select
                value={policyForm.freeze_min_months}
                onChange={(e) => handlePolicyFormChange('freeze_min_months', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-9 shadow-2xs"
              >
                {DURATION_POLICY_OPTIONS.map((opt) => (
                  <option key={`freeze-opt-${opt.val}`} value={opt.val}>
                    {opt.label}
                  </option>
                ))}
                {!DURATION_POLICY_OPTIONS.some((o) => o.val === Number(policyForm.freeze_min_months)) && (
                  <option value={policyForm.freeze_min_months}>
                    {policyForm.freeze_min_months} Months & Above (Custom)
                  </option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Extension Min Months */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Minimum Plan Duration for Extension *
              </label>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {policyForm.extension_min_months === 0 ? 'Any Plan (No limit)' : `≥ ${policyForm.extension_min_months} Months`}
              </span>
            </div>
            <div className="relative">
              <select
                disabled={policyForm.syncAll}
                value={policyForm.extension_min_months}
                onChange={(e) => handlePolicyFormChange('extension_min_months', e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 appearance-none pr-9 shadow-2xs ${
                  policyForm.syncAll ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
                }`}
              >
                {DURATION_POLICY_OPTIONS.map((opt) => (
                  <option key={`ext-opt-${opt.val}`} value={opt.val}>
                    {opt.label}
                  </option>
                ))}
                {!DURATION_POLICY_OPTIONS.some((o) => o.val === Number(policyForm.extension_min_months)) && (
                  <option value={policyForm.extension_min_months}>
                    {policyForm.extension_min_months} Months & Above (Custom)
                  </option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {policyForm.syncAll && (
              <p className="text-[10px] text-slate-400 italic">Synchronized with Freeze duration setting</p>
            )}
          </div>

          {/* Transfer Min Months */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Minimum Plan Duration for Transfer *
              </label>
              <span className="text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md">
                {policyForm.transfer_min_months === 0 ? 'Any Plan (No limit)' : `≥ ${policyForm.transfer_min_months} Months`}
              </span>
            </div>
            <div className="relative">
              <select
                disabled={policyForm.syncAll}
                value={policyForm.transfer_min_months}
                onChange={(e) => handlePolicyFormChange('transfer_min_months', e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-violet-500 appearance-none pr-9 shadow-2xs ${
                  policyForm.syncAll ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
                }`}
              >
                {DURATION_POLICY_OPTIONS.map((opt) => (
                  <option key={`tr-opt-${opt.val}`} value={opt.val}>
                    {opt.label}
                  </option>
                ))}
                {!DURATION_POLICY_OPTIONS.some((o) => o.val === Number(policyForm.transfer_min_months)) && (
                  <option value={policyForm.transfer_min_months}>
                    {policyForm.transfer_min_months} Months & Above (Custom)
                  </option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {policyForm.syncAll && (
              <p className="text-[10px] text-slate-400 italic">Synchronized with Freeze duration setting</p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingPolicy}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
            >
              {isSavingPolicy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSavingPolicy ? 'Saving Policy...' : 'Save Policy Settings'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Advanced Filter Modal (Portalled to document.body) */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Filter Freezes & Extensions</h3>
                  <p className="text-xs text-slate-500">Refine holds, validity extensions and payments</p>
                </div>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Record Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Types' },
                    { id: 'freeze', label: 'Freeze Hold' },
                    { id: 'extension', label: 'Extension' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTypeFilter(t.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                        typeFilter === t.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'Active Freeze', label: 'Active Freeze' },
                    { id: 'Completed', label: 'Completed / Resumed' },
                    { id: 'Extended', label: 'Extended' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusFilter(s.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        statusFilter === s.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ALL', label: 'All Modes' },
                    { id: 'UPI', label: 'UPI' },
                    { id: 'GPay', label: 'GPay' },
                    { id: 'PhonePe', label: 'PhonePe' },
                    { id: 'Account Transfer', label: 'Account' },
                    { id: 'Cash', label: 'Cash' },
                    { id: 'Split', label: 'Split' },
                    { id: 'Card', label: 'Card' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentFilter(m.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                        paymentFilter === m.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
