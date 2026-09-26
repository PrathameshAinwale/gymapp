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
  X
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

export const MembershipFreezeManager = () => {
  const {
    membershipFreezes,
    addFreezeRequest,
    unfreezeMembership,
    extendMembership,
    members,
    fetchFreezes,
    fetchMembers,
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

  // Transfers state
  const [transfers, setTransfers] = useState([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);

  // Initial load
  useEffect(() => {
    fetchFreezes?.();
    fetchMembers?.();
    loadTransfers();
  }, [fetchFreezes, fetchMembers]);

  const loadTransfers = async () => {
    try {
      setIsLoadingTransfers(true);
      const res = await api.transfers?.getAll();
      if (res?.data && Array.isArray(res.data)) {
        setTransfers(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch transfers:', err.message);
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  // Freeze Form State
  const [freezeData, setFreezeData] = useState({
    memberId: members[0]?.id || '',
    freezeStartDate: new Date().toISOString().split('T')[0],
    freezeEndDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    daysFrozen: 15,
    fee: 0,
    isFullPayment: true,
    paymentMethod: 'UPI',
    splitCashAmount: 0,
    splitOnlineAmount: 0,
    splitOnlineProvider: 'GPay',
    splitOnlineProviderOther: '',
    reason: 'Official travel / Out of town'
  });

  // Extend Form State
  const [extendData, setExtendData] = useState({
    memberId: members[0]?.id || '',
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
        if (paymentFilter === 'UPI' && !pm.includes('upi') && !pm.includes('gpay') && !pm.includes('phonepe') && !pm.includes('paytm')) return false;
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
        if (paymentFilter === 'UPI' && !pm.includes('upi') && !pm.includes('gpay') && !pm.includes('phonepe') && !pm.includes('paytm')) return false;
        if (paymentFilter === 'Split' && !pm.includes('split')) return false;
        if (paymentFilter === 'Card' && !pm.includes('card')) return false;
      }

      return true;
    });
  }, [transfers, searchTerm, paymentFilter]);

  const handleStartDateChange = (startStr) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + Number(freezeData.daysFrozen) * 86400000);
    setFreezeData({
      ...freezeData,
      freezeStartDate: startStr,
      freezeEndDate: end.toISOString().split('T')[0]
    });
  };

  const handleDaysChange = (days) => {
    const start = new Date(freezeData.freezeStartDate);
    const end = new Date(start.getTime() + Number(days) * 86400000);
    setFreezeData({
      ...freezeData,
      daysFrozen: Number(days),
      freezeEndDate: end.toISOString().split('T')[0]
    });
  };

  const handleFreezeSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(freezeData.reason) || hasSqlInjection(freezeData.splitOnlineProviderOther)) {
      addToast?.('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    const mem = members.find((m) => m.id === freezeData.memberId) || members[0];
    if (!mem) {
      addToast?.('Please select a valid member', 'error');
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
        planName: mem.planName || 'Silver Monthly Pass',
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
    const mem = members.find((m) => m.id === extendData.memberId) || members[0];
    if (!mem) {
      addToast?.('Please select a valid member', 'error');
      return;
    }

    try {
      setIsSubmittingExtend(true);
      const extendProvider = extendData.splitOnlineProvider === 'Other'
        ? (extendData.splitOnlineProviderOther?.trim() || 'Other')
        : (extendData.splitOnlineProvider || 'GPay');
      await extendMembership({
        memberId: extendData.memberId,
        extensionDays: Number(extendData.extensionDays),
        fee: Number(extendData.fee) || 0,
        paymentMethod: extendData.paymentMethod === 'Split'
          ? `Split (Cash: ₹${extendData.splitCashAmount || 0} + Online [${extendProvider}]: ₹${extendData.splitOnlineAmount || 0})`
          : extendData.paymentMethod,
        reason: extendData.reason
      });
      setIsExtendModalOpen(false);
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
    const fromMember = members.find((m) => m.id === transferData.fromMemberId);
    if (!fromMember) {
      addToast?.('Please select a source member', 'error');
      return;
    }

    let targetName = transferData.toMemberName;
    let targetPhone = transferData.toMemberPhone;
    let toMemberId = null;

    if (transferData.isExistingTarget) {
      const toMember = members.find((m) => m.id === transferData.toMemberId);
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

    // Calculate days remaining
    let daysRemaining = 30;
    if (fromMember.expiryDate) {
      const exp = new Date(fromMember.expiryDate);
      const now = new Date();
      const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(diff, 0);
    }

    try {
      setIsSubmittingTransfer(true);
      const transferProvider = transferData.splitOnlineProvider === 'Other'
        ? (transferData.splitOnlineProviderOther?.trim() || 'Other')
        : (transferData.splitOnlineProvider || 'GPay');
      const res = await api.transfers.create({
        fromMemberId: fromMember.id,
        fromMemberName: fromMember.name,
        toMemberId: toMemberId,
        toMemberName: targetName,
        toMemberPhone: targetPhone,
        planName: fromMember.planName || 'Membership Plan',
        daysRemaining,
        transferCharge: Number(transferData.transferCharge) || 0,
        paymentMethod: transferData.paymentMethod === 'Split'
          ? `Split (Cash: ₹${transferData.splitCashAmount || 0} + Online [${transferProvider}]: ₹${transferData.splitOnlineAmount || 0})`
          : transferData.paymentMethod,
        reason: transferData.reason
      });

      if (res?.data) {
        setTransfers((prev) => [res.data, ...prev]);
      } else {
        await loadTransfers();
      }
      fetchMembers?.();
      addToast?.(`Membership successfully transferred to ${targetName}!`);
      setIsTransferModalOpen(false);
    } catch (err) {
      console.error('Transfer failed:', err);
      addToast?.(err.message || 'Failed to complete membership transfer', 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Helper for source member in transfer modal
  const selectedSourceMember = members.find((m) => m.id === transferData.fromMemberId);
  const remainingDaysSource = selectedSourceMember?.expiryDate
    ? Math.max(0, Math.ceil((new Date(selectedSourceMember.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                Freeze, Extension & Transfers
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                Manage membership holds, complimentary/paid validity extensions, and transfer memberships between members.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {activeTab === 'freezes' ? (
            <>
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4 text-emerald-600" />
                <span>+ Extend</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFreezeModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <PauseCircle className="w-4 h-4" />
                <span>+ Freeze</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>+ Transfer Membership</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('freezes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transfers'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Membership Transfers</span>
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {/* Autocomplete Search Bar */}
              <div ref={searchContainerRef} className="relative flex-1">
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
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-2xs transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
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
                  onAction={searchTerm || activeFiltersCount > 0 ? handleResetFilters : () => setIsFreezeModalOpen(true)}
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

            {/* Mobile View */}
            <div className="block sm:hidden space-y-2">
              {filteredFreezes.map((f) => (
                <div key={f.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{f.memberName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{f.planName}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ₹{Number(f.fee || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-50 text-[11px]">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">Period</span>
                      <span>{f.freezeStartDate} → {f.freezeEndDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">Days / Mode</span>
                      <span>{f.daysFrozen} Days • {f.paymentMethod || 'Cash'}</span>
                    </div>
                  </div>

                  {f.status === 'Active Freeze' && (
                    <button
                      type="button"
                      onClick={() => unfreezeMembership(f.id)}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Unfreeze Plan</span>
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
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
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
                  onAction={() => setIsTransferModalOpen(true)}
                  color="violet"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">From Member</th>
                      <th className="py-3.5 px-4">To Transferee</th>
                      <th className="py-3.5 px-4">Plan Name</th>
                      <th className="py-3.5 px-4">Days Transferred</th>
                      <th className="py-3.5 px-4">Transfer Fee</th>
                      <th className="py-3.5 px-4">Payment Mode</th>
                      <th className="py-3.5 px-4">Date</th>
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
                        <td className="py-3.5 px-4 text-slate-500">
                          {t.transferDate}
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
          {/* Typeable Member Combobox */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Member *</label>
            <MemberSearchSelect
              members={members}
              value={freezeData.memberId}
              onChange={(id) => setFreezeData({ ...freezeData, memberId: id })}
              placeholder="Type to search member name or phone..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={freezeData.freezeStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
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
                  <option value="UPI">UPI / GPay / PhonePe</option>
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
              disabled={isSubmittingFreeze}
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
          {/* Typeable Member Combobox */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Member *</label>
            <MemberSearchSelect
              members={members}
              value={extendData.memberId}
              onChange={(id) => setExtendData({ ...extendData, memberId: id })}
              placeholder="Type to search member name or phone..."
            />
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
                  <option value="UPI">UPI / GPay / PhonePe</option>
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
              disabled={isSubmittingExtend}
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
          {/* Source Member */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Source Member (Transfer From) *
            </label>
            <MemberSearchSelect
              members={members}
              value={transferData.fromMemberId}
              onChange={(id) => setTransferData({ ...transferData, fromMemberId: id })}
              placeholder="Type to search source member..."
            />
            {selectedSourceMember && (
              <div className="mt-2 p-2.5 rounded-xl bg-violet-50/70 border border-violet-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-violet-900">{selectedSourceMember.planName || 'Plan'}</span>
                  <span className="text-[11px] text-violet-700 block">Expires: {selectedSourceMember.expiryDate || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-violet-600 uppercase font-bold block">Remaining Days</span>
                  <span className="text-sm font-black text-violet-900">{remainingDaysSource} Days</span>
                </div>
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
                  onClick={() => setTransferData({ ...transferData, isExistingTarget: true })}
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
                  onClick={() => setTransferData({ ...transferData, isExistingTarget: false })}
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
              <MemberSearchSelect
                members={members.filter((m) => m.id !== transferData.fromMemberId)}
                value={transferData.toMemberId}
                onChange={(id) => setTransferData({ ...transferData, toMemberId: id })}
                placeholder="Type to search recipient member..."
              />
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
                  <option value="UPI">UPI / GPay / PhonePe</option>
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
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
            >
              {isSubmittingTransfer && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingTransfer ? 'Transferring...' : 'Confirm Transfer'}</span>
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
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Modes' },
                    { id: 'UPI', label: 'Online / UPI' },
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
