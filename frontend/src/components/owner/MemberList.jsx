import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Receipt,
  UserCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Check,
  Target,
  MessageCircle,
  FileText,
  Loader2,
  ShieldCheck,
  HeartPulse,
  Dumbbell,
  IndianRupee,
  Clock,
  ChevronDown,
  Zap
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AddMemberModal } from './AddMemberModal';
import { EmptyState } from '../common/EmptyState';

export const MemberList = ({ isOpenAddModal, setIsOpenAddModal }) => {
  const { registerAccount, canEditDelete, currentRole } = useAuth();
  const {
    members = [],
    trainers = [],
    plans = [],
    invoices = [],
    ptPlans = [],
    recoveryPlans = [],
    fetchMembers,
    fetchPlans,
    fetchTrainers,
    addMember,
    updateMember,
    deleteMember,
    renewMemberPlan,
    recordPayment,
    calculateMemberStatus,
    getExpiryDaysDiff,
    addConsentForm,
    addCommissionRecord,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchMembers?.();
    fetchPlans?.();
    fetchTrainers?.();
  }, [fetchMembers, fetchPlans, fetchTrainers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [renewingMember, setRenewingMember] = useState(null);
  const [upgradingMember, setUpgradingMember] = useState(null);
  const [selectedPlanForRenewal, setSelectedPlanForRenewal] = useState('');
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getMemberEffectiveStatus = (m) => {
    return calculateMemberStatus ? calculateMemberStatus(m?.expiryDate, m?.status) : (m?.status || 'Active');
  };

  const handleRefreshMembers = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([fetchMembers?.(), fetchPlans?.(), fetchTrainers?.()]);
      addToast('Member directory refreshed from database!', 'info');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getBmiData = (weight, height) => {
    if (!weight || !height) return null;
    const hM = Number(height) / 100;
    if (hM <= 0) return null;
    const bmiVal = (Number(weight) / (hM * hM)).toFixed(1);
    let category = 'Normal';
    let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (bmiVal < 18.5) {
      category = 'Underweight';
      color = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (bmiVal >= 25 && bmiVal < 30) {
      category = 'Overweight';
      color = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (bmiVal >= 30) {
      category = 'Obese';
      color = 'text-rose-700 bg-rose-50 border-rose-200';
    }
    return { bmi: bmiVal, category, color };
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingMember) return;
    const chosenTrainer = trainers.find((t) => t.id === editingMember.trainerId);
    const autoStatus = calculateMemberStatus
      ? calculateMemberStatus(editingMember.expiryDate, editingMember.status)
      : editingMember.status;
    updateMember(editingMember.id, {
      ...editingMember,
      status: autoStatus,
      trainerName: chosenTrainer ? chosenTrainer.name : editingMember.trainerName
    });
    setEditingMember(null);
  };

  const filteredMembers = (members || []).filter((m) => {
    const term = (searchTerm || '').trim().toLowerCase();
    const matchSearch =
      !term ||
      (m?.name || '').toLowerCase().includes(term) ||
      (m?.email || '').toLowerCase().includes(term) ||
      (m?.phone || '').toLowerCase().includes(term) ||
      (m?.qrPassCode || '').toLowerCase().includes(term) ||
      (m?.planName || '').toLowerCase().includes(term);

    if (statusFilter === 'ALL' || !statusFilter) return matchSearch;
    const effectiveStatus = getMemberEffectiveStatus(m);
    return matchSearch && effectiveStatus.toLowerCase() === statusFilter.toLowerCase();
  });

  const activeCount = (members || []).filter((m) => getMemberEffectiveStatus(m).toLowerCase() === 'active').length;
  const expiringCount = (members || []).filter((m) => getMemberEffectiveStatus(m).toLowerCase() === 'expiring soon').length;
  const expiredCount = (members || []).filter((m) => getMemberEffectiveStatus(m).toLowerCase() === 'expired').length;

  return (
    <div className="space-y-3 sm:space-y-5 animate-fadeIn pb-12 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 sm:p-5 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                Member Directory
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                Manage athletes, track subscription validity, and issue instant login credentials.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshMembers}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            title="Refresh members list from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setIsOpenAddModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add New Member</span>
            <span className="inline sm:hidden">Add Member</span>
          </button>
        </div>
      </div>

      {/* Sleek Compact Search & Filter Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1 sm:w-72 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-[10px] sm:placeholder:text-[11px] placeholder:text-slate-400 text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 text-[10px] font-bold cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
          >
            <option value="ALL">All ({members.length})</option>
            <option value="Active">Active ({activeCount})</option>
            <option value="Expiring Soon">Expiring ({expiringCount})</option>
            <option value="Expired">Expired ({expiredCount})</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Member Count & Quick Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 font-medium">
        <span>
          Showing <strong className="text-emerald-700">{filteredMembers.length}</strong> of {members.length} Athletes
        </span>
        {searchTerm && (
          <span className="text-[11px] text-slate-400">
            Filtered by "{searchTerm}"
          </span>
        )}
      </div>

      {/* Member Cards (Mobile View) */}
      <div className="block sm:hidden space-y-2.5">
        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={members.length === 0 ? "No Members Enrolled Yet" : "No Members Matching Filter"}
            description={members.length === 0 
              ? "There is currently no member data for this gym. Click below to add and register your first athlete."
              : `No members match the search query "${searchTerm}" or the selected status filter.`}
            actionText="Add New Member"
            onAction={() => setIsOpenAddModal(true)}
            secondaryActionText={searchTerm || statusFilter !== 'ALL' ? "Clear Search Filter" : undefined}
            onSecondaryAction={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
            accentColor="emerald"
          />
        ) : (
          filteredMembers.map((member) => {
            const effectiveStatus = getMemberEffectiveStatus(member);
            const isExpiring = effectiveStatus === 'Expiring Soon';
            const isExpired = effectiveStatus === 'Expired';
            const diffDays = getExpiryDaysDiff ? getExpiryDaysDiff(member.expiryDate) : null;

            let statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" /> Active
              </span>
            );

            if (isExpiring) {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Expiring {diffDays !== null ? `(${diffDays === 0 ? 'Today' : `${diffDays}d`})` : 'Soon'}
                </span>
              );
            } else if (isExpired) {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 inline-flex items-center gap-1">
                  <ShieldAlert className="w-2.5 h-2.5" /> Expired {diffDays !== null ? `(${Math.abs(diffDays)}d ago)` : ''}
                </span>
              );
            }

            return (
              <div
                key={member.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className="flex items-center gap-2.5 min-w-0 text-left focus:outline-none cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="font-bold text-xs text-emerald-700">
                          {member.name ? member.name.charAt(0) : 'M'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {member.email}
                      </div>
                    </div>
                  </button>
                  <div className="shrink-0">{statusBadge}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 text-[10px]">
                  <div>
                    <span className="text-slate-400 font-medium block">Plan</span>
                    <span className="font-bold text-slate-800 truncate block">{member.planName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Expires</span>
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 text-amber-500" /> {member.expiryDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Coach</span>
                    <span className="font-semibold text-emerald-700 truncate block">{member.trainerName || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Balance Due</span>
                    {Number(member.duesAmount || 0) > 0 ? (
                      <span className="font-bold text-rose-600 truncate block">
                        ₹{Number(member.duesAmount).toLocaleString('en-IN')} Due
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700 truncate block">
                        ₹0 (Clear)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {member.phone && (
                      <a
                        href={`https://wa.me/${(member.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${member.name}, greetings from Pulse Fitness!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Chat</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setUpgradingMember(member)}
                      className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                      title="Upgrade / Add Top-ups"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Upgrade</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenewingMember(member);
                        setSelectedPlanForRenewal(member.planId);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Renew</span>
                    </button>
                    {canEditDelete && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingMember(member)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMember(member.id)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Streamlined Members Table (Desktop View) */}
      <div className="hidden sm:block bg-white rounded-2xl lg:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Plan & Validity</th>
                <th className="py-3 px-4">Assigned Coach</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4">
                    <EmptyState
                      icon={Users}
                      title={members.length === 0 ? "No Members Enrolled Yet" : "No Members Matching Filter"}
                      description={members.length === 0 
                        ? "There is currently no member data for this gym. Click below to add and register your first athlete."
                        : `No members match the search query "${searchTerm}" or the selected status filter.`}
                      actionText="Add New Member"
                      onAction={() => setIsOpenAddModal(true)}
                      secondaryActionText={searchTerm || statusFilter !== 'ALL' ? "Clear Search Filter" : undefined}
                      onSecondaryAction={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                      accentColor="emerald"
                    />
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const effectiveStatus = getMemberEffectiveStatus(member);
                  const isExpiring = effectiveStatus === 'Expiring Soon';
                  const isExpired = effectiveStatus === 'Expired';
                  const diffDays = getExpiryDaysDiff ? getExpiryDaysDiff(member.expiryDate) : null;

                  let statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  );

                  if (isExpiring) {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1" title={diffDays !== null ? `Expires in ${diffDays} days` : 'Expiring soon'}>
                        <AlertCircle className="w-3 h-3" /> Expiring Soon {diffDays !== null ? `(${diffDays === 0 ? 'Today' : `${diffDays}d`})` : ''}
                      </span>
                    );
                  } else if (isExpired) {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 inline-flex items-center gap-1" title={diffDays !== null ? `Expired ${Math.abs(diffDays)} days ago` : 'Expired'}>
                        <ShieldAlert className="w-3 h-3" /> Expired {diffDays !== null ? `(${Math.abs(diffDays)}d ago)` : ''}
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Clickable Member Avatar & Name */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="text-left group/name focus:outline-none flex items-center gap-3 cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-sm">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="font-bold text-xs text-emerald-700">
                                {member.name ? member.name.charAt(0) : 'M'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs group-hover/name:text-emerald-600 transition-colors">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              {member.phone && (
                                <>
                                  <span>{member.phone}</span>
                                </>
                              )}
                              {member.phone && (
                                <a
                                  href={`https://wa.me/${(member.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${member.name}, greetings from Pulse Fitness! Your ${member.planName} plan is active until ${member.expiryDate}. Reach out anytime for assistance!`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                                  title="1-Click WhatsApp"
                                >
                                  <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                                </a>
                              )}
                            </div>
                          </div>
                        </button>
                      </td>

                      {/* Plan & Validity */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {member.planName}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-amber-500" />
                            Valid until: <strong className="text-slate-700">{member.expiryDate}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Assigned Coach */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-700 text-xs">
                            {member.trainerName || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4">
                        {Number(member.duesAmount || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            <span>₹{Number(member.duesAmount).toLocaleString('en-IN')} Due</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>₹0 (Clear)</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {statusBadge}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">


                          <button
                            type="button"
                            onClick={() => setUpgradingMember(member)}
                            title="Upgrade / Add Top-ups (PT, Recovery, Membership Upgrade)"
                            className="px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Zap className="w-3 h-3 text-violet-600" />
                            <span>Upgrade</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRenewingMember(member);
                              setSelectedPlanForRenewal(member.planId);
                            }}
                            title="Renew Membership Plan"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Renew</span>
                          </button>

                          {canEditDelete && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                title="Edit Member Details"
                                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteMember(member.id)}
                                title="Remove Member"
                                className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPREHENSIVE MEMBER PROFILE CARD MODAL */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title="Member Dossier & Billing History"
        maxWidth="max-w-3xl"
      >
        {selectedMember && (() => {
          const memberInvoices = (invoices || []).filter(
            (inv) =>
              String(inv.memberId) === String(selectedMember.id) ||
              String(inv.userId) === String(selectedMember.id) ||
              String(inv.user_id) === String(selectedMember.id) ||
              (selectedMember.name && inv.memberName && inv.memberName.toLowerCase().trim() === selectedMember.name.toLowerCase().trim())
          );

          const totalPaidTillDate = memberInvoices.reduce(
            (sum, inv) => sum + (Number(inv.amount) || 0),
            0
          );

          const bmiInfo = getBmiData(selectedMember.weight, selectedMember.height);

          return (
            <div className="space-y-5">
              {/* 1. Header Hero Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-200 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  {selectedMember.avatar ? (
                    <img
                      src={selectedMember.avatar}
                      alt={selectedMember.name}
                      className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl object-cover border-2 border-white shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border border-emerald-200 shrink-0">
                      {selectedMember.name?.charAt(0) || 'M'}
                    </div>
                  )}

                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                      {selectedMember.name}
                    </h4>

                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{selectedMember.gender}, {selectedMember.age} Years</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                        {selectedMember.planName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-100">
                  {(() => {
                    const drawerEffectiveStatus = getMemberEffectiveStatus(selectedMember);
                    const drawerDiffDays = getExpiryDaysDiff ? getExpiryDaysDiff(selectedMember.expiryDate) : null;
                    return (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          drawerEffectiveStatus === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : drawerEffectiveStatus === 'Expiring Soon'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {drawerEffectiveStatus} {drawerDiffDays !== null ? (drawerDiffDays < 0 ? `(${Math.abs(drawerDiffDays)}d ago)` : drawerDiffDays <= 10 ? `(${drawerDiffDays === 0 ? 'Today' : `${drawerDiffDays}d left`})` : '') : ''}
                      </span>
                    );
                  })()}
                  <div className="text-xs text-amber-700 font-bold mt-1">
                    {selectedMember.attendanceStreak || 0} Days Streak
                  </div>
                </div>
              </div>

              {/* 2. Membership & Joining History */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Membership & Joining History</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Coach: <strong className="text-slate-800">{selectedMember.trainerName || 'None / Self Guided'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Date Joined</div>
                    <div className="font-bold text-slate-900 mt-0.5 text-sm">
                      {formatDate(selectedMember.joinDate || selectedMember.createdAt || selectedMember.created_at)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                      Enrolled
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Valid Until</div>
                    {(() => {
                      const drawerEffectiveStatus = getMemberEffectiveStatus(selectedMember);
                      const drawerDiffDays = getExpiryDaysDiff ? getExpiryDaysDiff(selectedMember.expiryDate) : null;
                      return (
                        <>
                          <div className={`font-bold mt-0.5 text-sm ${drawerEffectiveStatus === 'Expired' ? 'text-rose-600' : drawerEffectiveStatus === 'Expiring Soon' ? 'text-amber-600' : 'text-slate-900'}`}>
                            {formatDate(selectedMember.expiryDate)}
                          </div>
                          <div className={`text-[10px] font-medium mt-0.5 ${drawerEffectiveStatus === 'Expired' ? 'text-rose-600' : drawerEffectiveStatus === 'Expiring Soon' ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {drawerEffectiveStatus === 'Expired' ? (drawerDiffDays !== null ? `Expired ${Math.abs(drawerDiffDays)}d ago` : 'Plan Expired') : drawerEffectiveStatus === 'Expiring Soon' ? (drawerDiffDays !== null ? `Expires in ${drawerDiffDays}d` : 'Expiring Soon') : 'Plan Active'}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Attendance Streak</div>
                    <div className="font-bold text-amber-600 mt-0.5 text-sm">
                      {selectedMember.attendanceStreak || 0} Days
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Last: {selectedMember.lastCheckIn || 'Recently'}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Dues</div>
                    <div className="font-bold text-slate-900 mt-0.5 text-sm">
                      ₹{Number(selectedMember.duesAmount || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {Number(selectedMember.duesAmount || 0) === 0 ? 'All Clear' : 'Payment Due'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Invoices Created Till Date */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Invoices Created Till Date ({memberInvoices.length})</span>
                  </span>
                  {memberInvoices.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      Total Paid: ₹{totalPaidTillDate.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {memberInvoices.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Description / Plan</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {memberInvoices.map((inv, idx) => (
                            <tr key={inv.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.id}</td>
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(inv.date)}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{inv.planName}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">
                                  {inv.paymentMethod || 'UPI'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> {inv.status || 'Paid'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs">
                    <Receipt className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                    <p className="font-semibold text-slate-700">No invoices recorded yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Billing receipts issued for this member will automatically show here.</p>
                  </div>
                )}
              </div>

              {/* 4. Contact Information */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" /> Contact Information
                  </span>
                  {selectedMember.phone && (
                    <a
                      href={`https://wa.me/${(selectedMember.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${selectedMember.name}, greetings from Pulse Fitness!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email Address</span>
                    <strong className="text-slate-900 font-medium text-xs break-all">{selectedMember.email}</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Phone Number</span>
                    <strong className="text-slate-900 font-medium text-xs">{selectedMember.phone || 'Not provided'}</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Emergency Contact</span>
                    <strong className="text-slate-900 font-medium text-xs">{selectedMember.emergencyContact || 'None reported'}</strong>
                  </div>
                </div>
              </div>

              {/* 5. Biometrics & Physical Goals */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Physical Profile & Health
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Current Weight</div>
                    <div className="text-base font-black text-slate-900 mt-1">{selectedMember.weight || '--'} kg</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Target Weight</div>
                    <div className="text-base font-black text-emerald-600 mt-1">{selectedMember.targetWeight || '--'} kg</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Height</div>
                    <div className="text-base font-black text-slate-900 mt-1">{selectedMember.height || '--'} cm</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">BMI</div>
                    <div className="text-base font-black text-slate-900 mt-1">
                      {bmiInfo ? (
                        <>
                          <span>{bmiInfo.bmi}</span>
                          <span className="text-[9px] block font-bold text-slate-500">{bmiInfo.category}</span>
                        </>
                      ) : (
                        '--'
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs text-xs space-y-2">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      Fitness Objective:
                    </span>
                    <p className="text-slate-900 font-semibold mt-0.5 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {selectedMember.goal || 'General Fitness'}
                    </p>
                  </div>
                  {selectedMember.medicalNotes && selectedMember.medicalNotes !== 'None' && (
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        Medical Notes & Health Considerations:
                      </span>
                      <p className="text-amber-800 mt-0.5">{selectedMember.medicalNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const m = selectedMember;
                      setSelectedMember(null);
                      setRenewingMember(m);
                      setSelectedPlanForRenewal(m.planId);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Renew Membership</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const m = selectedMember;
                      setSelectedMember(null);
                      setEditingMember(m);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* RENEW MEMBERSHIP MODAL (Full Payment & Automated Validity Engine) */}
      <RecordPaymentModal
        isOpen={!!renewingMember}
        onClose={() => setRenewingMember(null)}
        initialMember={renewingMember}
      />

      {/* REGISTER NEW MEMBER OR UPGRADE EXISTING MEMBER MODAL */}
      <AddMemberModal
        isOpen={isOpenAddModal || !!upgradingMember}
        onClose={() => {
          setIsOpenAddModal(false);
          setUpgradingMember(null);
        }}
        initialData={upgradingMember}
        isUpgrade={!!upgradingMember}
        upgradeMember={upgradingMember}
      />

      {/* EDIT MEMBER MODAL */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title={`Edit Member: ${editingMember?.name}`}
      >
        {editingMember && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={editingMember.name}
                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={editingMember.email}
                onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plan Expiry Date</label>
              <input
                type="date"
                value={editingMember.expiryDate || ''}
                onChange={(e) => {
                  const newExpiry = e.target.value;
                  const autoStatus = calculateMemberStatus ? calculateMemberStatus(newExpiry, editingMember.status) : editingMember.status;
                  setEditingMember({ ...editingMember, expiryDate: newExpiry, status: autoStatus });
                }}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Auto-updates status: Expired if exceeded, Expiring Soon if within 10 days, Active if &gt; 10 days.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={editingMember.status}
                onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign Coach</label>
              <select
                value={editingMember.trainerId || ''}
                onChange={(e) => setEditingMember({ ...editingMember, trainerId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">None / Self Guided</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
