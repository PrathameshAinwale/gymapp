import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Zap,
  Download,
  Printer,
  ExternalLink,
  Lock,
  KeyRound
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AddMemberModal } from './AddMemberModal';
import { EmptyState } from '../common/EmptyState';
import { generateInvoicePdf, shareInvoicePdfToMobile, downloadPdfBlob } from '../../utils/invoicePdfGenerator';

export const MemberList = ({ isOpenAddModal, setIsOpenAddModal }) => {
  const { registerAccount, canEditDelete, currentRole } = useAuth();
  const {
    members = [],
    trainers = [],
    plans = [],
    invoices = [],
    ptPlans = [],
    recoveryPlans = [],
    gymInfo,
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
  const [renewingMember, setRenewingMember] = useState(null);
  const [upgradingMember, setUpgradingMember] = useState(null);
  const [selectedPlanForRenewal, setSelectedPlanForRenewal] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Invoice Receipt View Modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceViewMode, setInvoiceViewMode] = useState('sheet'); // 'sheet' | 'pdf'
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Password editing via mobile OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

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

  const openEditModal = (m) => {
    setEditingMember({
      ...m,
      weight: m.weight ?? '',
      targetWeight: m.targetWeight ?? '',
      height: m.height ?? '',
      gender: m.gender || 'Male',
      age: m.age ?? '',
      goal: m.goal || 'General Fitness',
      medicalNotes: m.medicalNotes || '',
      emergencyContact: m.emergencyContact || '',
      phone: m.phone || '',
      email: m.email || '',
      name: m.name || '',
      trainerId: m.trainerId || '',
      status: m.status || 'Active',
      expiryDate: m.expiryDate || ''
    });
    setOtpSent(false);
    setGeneratedOtp('');
    setEnteredOtp('');
    setIsOtpVerified(false);
    setNewPassword('');
    setShowPasswordText(false);
  };

  // Resolve member for selected invoice
  const selectedInvoiceMember = useMemo(() => {
    if (!selectedInvoice) return null;
    return (
      (members || []).find(
        (m) =>
          (selectedInvoice.memberId && String(m.id) === String(selectedInvoice.memberId)) ||
          (selectedInvoice.userId && String(m.userId) === String(selectedInvoice.userId)) ||
          (selectedInvoice.user_id && String(m.userId) === String(selectedInvoice.user_id)) ||
          (m.name || '').toLowerCase().trim() === (selectedInvoice.memberName || selectedInvoice.member_name || '').toLowerCase().trim()
      ) || selectedMember || {
        name: selectedInvoice.memberName,
        phone: selectedInvoice.phone || '',
        email: selectedInvoice.email || '',
        id: selectedInvoice.memberId || 'PF-M'
      }
    );
  }, [selectedInvoice, members, selectedMember]);

  // Generate live PDF Preview Blob URL when an invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      try {
        const generated = generateInvoicePdf({
          invoice: selectedInvoice,
          member: selectedInvoiceMember,
          gymInfo
        });
        const url = URL.createObjectURL(generated.blob);
        setPdfPreviewUrl(url);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Failed to create PDF preview:', err);
      }
    } else {
      setPdfPreviewUrl(null);
    }
  }, [selectedInvoice, selectedInvoiceMember, gymInfo]);

  const handleDownloadInvoicePdf = (inv, memb) => {
    const targetMember = memb || selectedInvoiceMember;
    const generated = generateInvoicePdf({
      invoice: inv,
      member: targetMember,
      gymInfo
    });

    const success = generated.download();
    if (success && addToast) {
      addToast(`Downloaded PDF: ${generated.fileName}`, 'success');
    }
  };

  const handleSharePdfToMobileNumber = async (inv, memb) => {
    const targetMember = memb || selectedInvoiceMember || {
      name: inv.memberName,
      phone: inv.phone || ''
    };

    await shareInvoicePdfToMobile({
      invoice: inv,
      member: targetMember,
      gymInfo,
      onToast: addToast
    });
  };

  const handleSendOtp = () => {
    const mobile = editingMember?.phone;
    if (!mobile || mobile.trim() === '') {
      addToast('Member does not have a registered mobile number. Please add phone first.', 'error');
      return;
    }
    setIsSendingOtp(true);
    // Generate authentic 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    setIsSendingOtp(false);
    addToast(`Verification OTP sent to ${mobile}: [ ${code} ]`, 'info');
  };

  const handleVerifyOtp = () => {
    if (enteredOtp.trim() === generatedOtp.trim() && generatedOtp.trim() !== '') {
      setIsOtpVerified(true);
      addToast('Mobile verification successful! You can now set a new password.', 'success');
    } else {
      addToast('Invalid verification OTP code. Please enter the 6 digits correctly.', 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSavingEdit(true);
    try {
      const chosenTrainer = trainers.find((t) => String(t.id) === String(editingMember.trainerId));
      const autoStatus = calculateMemberStatus
        ? calculateMemberStatus(editingMember.expiryDate, editingMember.status)
        : editingMember.status;

      const payload = {
        ...editingMember,
        status: autoStatus,
        trainerName: chosenTrainer ? chosenTrainer.name : (editingMember.trainerId ? editingMember.trainerName : null)
      };

      if (isOtpVerified && newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      await updateMember(editingMember.id, payload);

      if (selectedMember && (String(selectedMember.id) === String(editingMember.id) || String(selectedMember.userId) === String(editingMember.userId))) {
        setSelectedMember((prev) => ({ ...prev, ...payload }));
      }

      setEditingMember(null);
    } catch (err) {
      console.error('Failed to update member:', err);
      addToast(err?.message || 'Failed to update member details', 'error');
    } finally {
      setIsSavingEdit(false);
    }
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
                          onClick={() => openEditModal(member)}
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
                                onClick={() => openEditModal(member)}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                    <span className="text-[10px] font-normal text-slate-400 lowercase hidden sm:inline">(click row to view invoice)</span>
                  </span>
                  {memberInvoices.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      Total Paid: ₹{totalPaidTillDate.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {memberInvoices.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Description / Plan</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {memberInvoices.map((inv, idx) => (
                            <tr
                              key={inv.id || idx}
                              onClick={() => setSelectedInvoice(inv)}
                              className="hover:bg-emerald-50/70 transition-colors cursor-pointer group"
                              title="Click to view and download full tax invoice"
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 group-hover:text-emerald-800">
                                <span className="inline-flex items-center gap-1.5 underline decoration-emerald-300 underline-offset-2">
                                  <Receipt className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                                  {inv.id}
                                </span>
                              </td>
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
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoice(inv);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </button>
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

              {/* 5. Physical Profile & Health */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Physical Profile & Health
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
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
                      setTimeout(() => {
                        setRenewingMember(m);
                        setSelectedPlanForRenewal(m.planId);
                      }, 50);
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
                      setTimeout(() => {
                        openEditModal(m);
                      }, 50);
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

      {/* PARTICULAR INVOICE RECEIPT / TAX INVOICE MODAL */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice ? `Tax Invoice & Receipt: #${selectedInvoice.id?.toUpperCase()}` : 'Tax Invoice'}
        maxWidth="max-w-3xl"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            {/* View Mode Switcher and Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('sheet')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceViewMode === 'sheet'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Tax Sheet View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('pdf')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceViewMode === 'pdf'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Document View</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {pdfPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(pdfPreviewUrl, '_blank')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Open PDF in Browser Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Open in Tab</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePdf(selectedInvoice, selectedInvoiceMember)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Download actual PDF file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSharePdfToMobileNumber(selectedInvoice, selectedInvoiceMember)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  title={`Send PDF to ${selectedInvoiceMember?.phone || 'Mobile'}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Share PDF</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: 1. NATIVE PDF DOCUMENT VIEWER */}
            {invoiceViewMode === 'pdf' && pdfPreviewUrl && (
              <div className="w-full h-[65vh] min-h-[460px] rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner flex flex-col relative">
                <object
                  data={`${pdfPreviewUrl}#toolbar=1&navpanes=0&view=FitH`}
                  type="application/pdf"
                  className="w-full h-full flex-1"
                >
                  <iframe
                    src={`${pdfPreviewUrl}#toolbar=1&navpanes=0&view=FitH`}
                    title="Invoice PDF Document"
                    className="w-full h-full border-0"
                  >
                    <div className="p-8 text-center bg-white h-full flex flex-col items-center justify-center space-y-3">
                      <FileText className="w-12 h-12 text-emerald-600 mx-auto" />
                      <p className="text-slate-800 font-bold">PDF Document Ready</p>
                      <p className="text-slate-500 text-xs max-w-sm">
                        If your browser does not render PDFs directly inside the frame, click below to open or download the PDF file.
                      </p>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => window.open(pdfPreviewUrl, '_blank')}
                          className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
                        >
                          Open in Browser
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoicePdf(selectedInvoice, selectedInvoiceMember)}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </iframe>
                </object>
              </div>
            )}

            {/* TAB CONTENT: 2. AUTHENTIC GYM MEMBERSHIP RECEIPT SHEET */}
            {(invoiceViewMode === 'sheet' || !pdfPreviewUrl) && (
              <div className="p-5 sm:p-7 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-sm space-y-5 print:p-0 print:border-none">
                {/* Gym Header Branding & Receipt Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                      AF
                    </div>
                    <div>
                      <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                        {gymInfo?.name || 'ARCHFIT ATHLETIC CLUB'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {gymInfo?.address || 'Central Avenue, Hiranandani Gardens, Powai, Mumbai - 400076'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 mt-1">
                        <span>GSTIN: <strong className="text-slate-600 font-mono">{gymInfo?.gstin || '27AAPCP1234F1Z8'}</strong></span>
                        <span>•</span>
                        <span>Phone: <strong className="text-slate-600">{gymInfo?.phone || '+91 98201 54321'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Payment Verified
                    </span>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-1.5">
                      Receipt #{selectedInvoice.id?.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Issued: {formatDate(selectedInvoice.date)}
                    </div>
                  </div>
                </div>

                {/* Two-Column Info: Billed Member & Payment Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Billed To Customer */}
                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Member Information
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {selectedInvoiceMember?.name || selectedInvoice.memberName}
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Member ID: <strong className="text-slate-800">{selectedInvoiceMember?.id || selectedInvoice.memberId || 'AF-M-101'}</strong></span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mobile: <strong className="text-slate-800">{selectedInvoiceMember?.phone || selectedInvoice.phone || 'N/A'}</strong></span>
                    </div>
                    {selectedInvoiceMember?.email && (
                      <div className="text-slate-600 flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email: {selectedInvoiceMember.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Payment Verification
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Receipt No:</span>
                      <strong className="text-slate-900 font-mono">#{selectedInvoice.id?.toUpperCase()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date Paid:</span>
                      <strong className="text-slate-800">{formatDate(selectedInvoice.date)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Mode:</span>
                      <strong className="text-slate-800">{selectedInvoice.paymentMethod || 'UPI / Instant Transfer'}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Settlement Status:</span>
                      <strong className="text-emerald-700 flex items-center gap-1 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Paid & Active</span>
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Membership Plan Highlight Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                        Active Membership Subscription
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1">
                        {selectedInvoice.planName || 'Comprehensive Gym Membership Pass'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Total Subscription Fee</span>
                      <span className="text-lg sm:text-xl font-black text-slate-900">
                        ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Included Privileges Checkmarks */}
                  <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Full cardio, strength & free-weight floor access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Turnstile QR Pass on ArchFit Mobile App</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Locker, steam room & shower facilities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Complimentary body composition evaluation</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary & Tax Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start text-xs">
                  {/* Left: Notes and Words */}
                  <div className="sm:col-span-7 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Amount In Words
                    </span>
                    <div className="font-bold text-slate-900 text-xs">
                      Rupees {Math.round(Number(selectedInvoice.amount || 0)).toLocaleString('en-IN')} Only
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                      Official tax invoice receipt generated under the Indian Information Technology Act 2000. Valid for corporate wellness reimbursement.
                    </p>
                  </div>

                  {/* Right: Tax Breakdown */}
                  <div className="sm:col-span-5 space-y-1.5 text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Plan Base Fee:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{Math.round(Number(selectedInvoice.amount || 0) / 1.18).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>CGST (9%):</span>
                      <span>₹{Math.round(((Number(selectedInvoice.amount || 0) / 1.18) * 0.09)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>SGST (9%):</span>
                      <span>₹{Math.round(((Number(selectedInvoice.amount || 0) / 1.18) * 0.09)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900 text-sm">Total Paid:</span>
                      <span className="text-xl font-black text-emerald-600 font-mono">
                        ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms & Official Seal Signature */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500">
                  <div className="space-y-1">
                    <p>• Membership passes are non-transferable & non-refundable once activated.</p>
                    <p>• Turnstile QR Pass is required for gym floor access.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0 min-w-[170px]">
                    <div className="text-emerald-700 font-bold uppercase text-[10px] flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Digitally Verified</span>
                    </div>
                    <div className="font-bold text-slate-800 text-xs mt-0.5">Authorized Signatory</div>
                    <div className="text-[10px] text-slate-400">ArchFit Athletic Club</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer active:scale-95 transition-all"
                title="Print Invoice"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print</span>
              </button>
            </div>
          </div>
        )}
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

      {/* EDIT MEMBER MODAL (All Fields + Mobile OTP Verification for Password) */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title={`Edit Athlete Dossier: ${editingMember?.name || ''}`}
        maxWidth="max-w-2xl"
      >
        {editingMember && (
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* 1. Personal & Contact Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                1. Personal Information & Identification
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingMember.name || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">Email Address</label>
                    <span className="text-[10px] font-bold text-slate-400 inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled
                    readOnly
                    value={editingMember.email || ''}
                    className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed select-none font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                    <span>Permanent member login ID (cannot be changed).</span>
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">Phone / Mobile Number</label>
                    <span className="text-[10px] font-bold text-slate-400 inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                    </span>
                  </div>
                  <input
                    type="tel"
                    disabled
                    readOnly
                    value={editingMember.phone || ''}
                    className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed select-none font-medium"
                    placeholder="+91 98765 43210"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                    <span>Locked for mobile OTP verification & account security.</span>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editingMember.emergencyContact || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="Relation & Phone"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editingMember.gender || 'Male'}
                    onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editingMember.age || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, age: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Physical Profile & Goals */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                2. Physical Profile & Biometrics
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Current Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingMember.weight || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, weight: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 70"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingMember.targetWeight || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, targetWeight: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 75"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingMember.height || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, height: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 175"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fitness Goal</label>
                  <input
                    type="text"
                    value={editingMember.goal || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, goal: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Muscle Gain, Fat Loss"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Medical Notes</label>
                  <input
                    type="text"
                    value={editingMember.medicalNotes || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, medicalNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="None or any restrictions"
                  />
                </div>
              </div>
            </div>

            {/* 3. Membership Status & Coaching */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                3. Membership & Coaching
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Plan Expiry Date</label>
                  <input
                    type="date"
                    value={editingMember.expiryDate || ''}
                    onChange={(e) => {
                      const newExpiry = e.target.value;
                      const autoStatus = calculateMemberStatus ? calculateMemberStatus(newExpiry, editingMember.status) : editingMember.status;
                      setEditingMember({ ...editingMember, expiryDate: newExpiry, status: autoStatus });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingMember.status || 'Active'}
                    onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                    <option value="Frozen">Frozen / Paused</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Assign Coach</label>
                  <select
                    value={editingMember.trainerId || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, trainerId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">None / Self Guided</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Security & Password Update (Protected with Mobile OTP) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. Account Security & Password</span>
                </span>
                {isOtpVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3 h-3" /> Password Unlocked (OTP Verified)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600 border border-slate-300">
                    <Lock className="w-2.5 h-2.5" /> Password Locked
                  </span>
                )}
              </div>

              {!isOtpVerified ? (
                <div className="space-y-3">
                  {/* Locked Password display field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">Account Password</label>
                      <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Locked (Mobile OTP Verification Required)
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        disabled
                        readOnly
                        value="••••••••••••"
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-400 cursor-not-allowed select-none font-mono tracking-widest"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      The password is secure and locked. It can only be changed after verifying an OTP sent to <strong className="text-slate-600 font-mono">{editingMember.phone || 'registered phone'}</strong>.
                    </p>
                  </div>

                  {/* OTP Dispatch and Verification Box */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                    {!otpSent ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verify Mobile to Unlock Password</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Send a 6-digit OTP code to registered number: <strong className="text-slate-800 font-mono">{editingMember.phone || 'No phone registered'}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !editingMember.phone}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Send OTP to Mobile</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-emerald-600" />
                            <span>Enter 6-Digit OTP Code</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold font-mono">Dispatched to {editingMember.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-2xs transition-colors shrink-0 active:scale-95"
                          >
                            Verify OTP
                          </button>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 shrink-0"
                          >
                            Resend
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          A test notification popup toast with the 6-digit OTP has been dispatched for instant verification.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Set New Account Password (Unlocked)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {showPasswordText ? 'Hide Password' : 'Show Password'}
                    </button>
                  </div>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    autoFocus
                  />
                  <p className="text-[10px] text-emerald-700">
                    Password will be hashed and encrypted in the database when you click "Save Changes".
                  </p>
                </div>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
      </div>
  );
};
