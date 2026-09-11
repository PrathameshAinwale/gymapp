import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Users,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  UserCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  QrCode,
  CheckCircle,
  AlertCircle,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  Target,
  Camera,
  Upload,
  Image,
  MessageCircle,
  FileText,
  Share2,
  ChevronDown
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { RecordPaymentModal } from './RecordPaymentModal';

export const MemberList = ({ isOpenAddModal, setIsOpenAddModal }) => {
  const { registerAccount } = useAuth();
  const { members, trainers, plans, addMember, updateMember, deleteMember, renewMemberPlan, addToast } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState(null);
  const [renewingMember, setRenewingMember] = useState(null);
  const [selectedPlanForRenewal, setSelectedPlanForRenewal] = useState(plans[0]?.id || '');
  const [editingMember, setEditingMember] = useState(null);
  const [newlyCreatedCredentials, setNewlyCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paymentLinkModalMember, setPaymentLinkModalMember] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Form State for New Member with Photo and KYC
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'member' + Math.floor(100 + Math.random() * 900),
    avatar: '',
    age: 25,
    gender: 'Male',
    planId: plans[0]?.id || '',
    trainerId: trainers[0]?.id || '',
    goal: 'Muscle Gain & Strength',
    weight: 70,
    targetWeight: 75,
    height: 175,
    medicalNotes: 'None',
    emergencyContact: '',
    kycDocType: 'Aadhaar Card',
    kycDocNumber: '',
    kycStatus: 'Verified'
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const generateRandomPassword = () => {
    const pass = 'fit' + Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, password: pass });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const chosenPlan = plans.find((p) => p.id === formData.planId) || plans[0];
    const chosenTrainer = trainers.find((t) => t.id === formData.trainerId);

    const today = new Date();
    const expiry = new Date();
    expiry.setMonth(today.getMonth() + (chosenPlan.durationMonths || 1));

    // 1. Add to Gym CRM state
    const createdMember = addMember({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      avatar: formData.avatar || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=200&auto=format&fit=crop&q=80`,
      age: formData.age,
      gender: formData.gender,
      planId: chosenPlan.id,
      planName: chosenPlan.name,
      trainerId: chosenTrainer ? chosenTrainer.id : null,
      trainerName: chosenTrainer ? chosenTrainer.name : 'None / Self Guided',
      goal: formData.goal,
      weight: formData.weight,
      targetWeight: formData.targetWeight,
      height: formData.height,
      medicalNotes: formData.medicalNotes,
      emergencyContact: formData.emergencyContact,
      expiryDate: expiry.toISOString().split('T')[0],
      kycDocType: formData.kycDocType || 'Aadhaar Card',
      kycDocNumber: formData.kycDocNumber || 'Not provided',
      kycStatus: formData.kycStatus || 'Verified'
    });

    // 2. Provision Login Account in Auth Database
    registerAccount({
      id: createdMember.id,
      name: formData.name,
      email: formData.email,
      username: formData.email.split('@')[0],
      password: formData.password || 'member123',
      role: 'member',
      planName: chosenPlan.name,
      qrPassCode: createdMember.qrPassCode
    });

    // 3. Open Credentials Receipt for Owner
    setNewlyCreatedCredentials({
      name: formData.name,
      email: formData.email,
      password: formData.password || 'member123',
      id: createdMember.id,
      qrPassCode: createdMember.qrPassCode,
      planName: chosenPlan.name
    });

    setIsOpenAddModal(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: 'member' + Math.floor(100 + Math.random() * 900),
      avatar: '',
      age: 25,
      gender: 'Male',
      planId: plans[0]?.id || '',
      trainerId: trainers[0]?.id || '',
      goal: 'Muscle Gain & Strength',
      weight: 70,
      targetWeight: 75,
      height: 175,
      medicalNotes: 'None',
      emergencyContact: '',
      kycDocType: 'Aadhaar Card',
      kycDocNumber: '',
      kycStatus: 'Verified'
    });
  };

  const handleCopyCredentials = () => {
    if (!newlyCreatedCredentials) return;
    const text = `Welcome to PULSE FIT!\nHere are your Member Login Credentials:\n• App URL: http://localhost:5173/\n• Login Email: ${newlyCreatedCredentials.email}\n• Password: ${newlyCreatedCredentials.password}\n• Member ID: ${newlyCreatedCredentials.id}\n• Plan: ${newlyCreatedCredentials.planName}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingMember) return;
    const chosenTrainer = trainers.find((t) => t.id === editingMember.trainerId);
    updateMember(editingMember.id, {
      ...editingMember,
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
    return matchSearch && (m?.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const activeCount = (members || []).filter((m) => (m?.status || '').toLowerCase() === 'active').length;
  const expiringCount = (members || []).filter((m) => (m?.status || '').toLowerCase() === 'expiring soon').length;
  const expiredCount = (members || []).filter((m) => (m?.status || '').toLowerCase() === 'expired').length;

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

        <button
          onClick={() => setIsOpenAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add New Member</span>
          <span className="inline sm:hidden">Add Member</span>
        </button>
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
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium">
            No members found matching your search criteria.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isExpiring = member.status === 'Expiring Soon';
            const isExpired = member.status === 'Expired';

            let statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" /> Active
              </span>
            );

            if (isExpiring) {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Expiring
                </span>
              );
            } else if (isExpired) {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 inline-flex items-center gap-1">
                  <ShieldAlert className="w-2.5 h-2.5" /> Expired
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
                    <span className="text-slate-400 font-medium block">Pass</span>
                    <span className="font-mono text-slate-600 truncate block">{member.qrPassCode || member.id}</span>
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
                      onClick={() => {
                        setRenewingMember(member);
                        setSelectedPlanForRenewal(member.planId);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Renew</span>
                    </button>
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
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No members found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isExpiring = member.status === 'Expiring Soon';
                  const isExpired = member.status === 'Expired';

                  let statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  );

                  if (isExpiring) {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Expiring Soon
                      </span>
                    );
                  } else if (isExpired) {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 inline-flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Expired
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
                              <span>{member.email}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-400">{member.id}</span>
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
                                  <span>WhatsApp</span>
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

                      {/* Status */}
                      <td className="py-3 px-4">
                        {statusBadge}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">


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
        title={`Member Profile Card`}
        maxWidth="max-w-2xl"
      >
        {selectedMember && (
          <div className="space-y-6">
            
            {/* Header Hero Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-slate-900 font-heading">{selectedMember.name}</h4>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">
                      {selectedMember.id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>{selectedMember.gender}, {selectedMember.age} Years</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">{selectedMember.planName}</span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedMember.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedMember.status === 'Expiring Soon'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {selectedMember.status}
                </span>
                <div className="text-xs text-amber-600 font-bold mt-1">
                   {selectedMember.attendanceStreak || 0} Days Streak
                </div>
              </div>
            </div>

            {/* Quick Actions Bar (WhatsApp & Payment Link) */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              {selectedMember.phone && (
                <a
                  href={`https://wa.me/${(selectedMember.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${selectedMember.name}, greetings from Pulse Fitness! We are checking in on your fitness routine. Please let us know if you need any assistance!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>1-Click WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  const m = selectedMember;
                  setSelectedMember(null);
                  setPaymentLinkModalMember(m);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Share Payment Link & QR</span>
              </button>

              <div className="ml-auto text-[11px] font-semibold text-slate-500">
                Gate Pass: <strong className="font-mono text-slate-800">{selectedMember.qrPassCode}</strong>
              </div>
            </div>

            {/* Contact & KYC Document Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" /> Contact Details
                </span>
                <div className="text-slate-600">Email: <strong className="text-slate-900">{selectedMember.email}</strong></div>
                <div className="text-slate-600">Phone: <strong className="text-slate-900">{selectedMember.phone || 'Not provided'}</strong></div>
                <div className="text-slate-600">Emergency: <strong className="text-amber-700">{selectedMember.emergencyContact || 'None'}</strong></div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" /> KYC Document Data
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    {selectedMember.kycStatus || 'Verified'}
                  </span>
                </div>
                <div className="text-slate-600">Doc Type: <strong className="text-slate-900">{selectedMember.kycDocType || 'Aadhaar Card'}</strong></div>
                <div className="text-slate-600">Doc Number: <strong className="text-slate-900 font-mono">{selectedMember.kycDocNumber || '5412 8901 2345'}</strong></div>
                <div className="text-slate-600">Package: <strong className="text-emerald-700">{selectedMember.planName}</strong></div>
              </div>
            </div>

            {/* Biometrics & Physical Stats */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Body Metrics & Physical Target
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Current Weight</div>
                  <div className="text-base font-black text-slate-900 mt-1">{selectedMember.weight} kg</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Target Weight</div>
                  <div className="text-base font-black text-emerald-600 mt-1">{selectedMember.targetWeight} kg</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Height</div>
                  <div className="text-base font-black text-slate-900 mt-1">{selectedMember.height} cm</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Assigned Coach</div>
                  <div className="text-xs font-bold text-emerald-700 mt-1 truncate">{selectedMember.trainerName || 'Unassigned'}</div>
                </div>
              </div>
            </div>

            {/* Goal & Medical History */}
            <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Primary Fitness Objective:
                </span>
                <p className="text-slate-900 font-semibold mt-0.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {selectedMember.goal}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Medical Notes & Health Considerations:
                </span>
                <p className="text-amber-800 mt-0.5">{selectedMember.medicalNotes || 'No reported health issues or injuries.'}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const m = selectedMember;
                  setSelectedMember(null);
                  setRenewingMember(m);
                  setSelectedPlanForRenewal(m.planId);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renew Subscription</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Close File
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

      {/* REGISTER NEW MEMBER MODAL WITH CREDENTIALS PROVISIONING */}
      <Modal
        isOpen={isOpenAddModal}
        onClose={() => setIsOpenAddModal(false)}
        title="Register Member & Issue Login Account"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          
          {/* Member Photo Upload */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 border-2 border-slate-300 shrink-0 flex items-center justify-center group shadow-sm">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Member Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-1.5 text-center sm:text-left">
              <label className="block text-xs font-bold text-slate-800">
                Member Profile Photo
              </label>
              <p className="text-[11px] text-slate-500">
                Upload a photo for attendance, QR turnstile verification, and member profile.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar: '' })}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Account Credentials Box */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <KeyRound className="w-4 h-4" />
                <span>Member Portal Login Credentials</span>
              </div>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-generate Password
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Initial Password *
                </label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              The member can log into the PULSE FIT Member Portal using this email and password.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Liam Hemsworth"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98200 00000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Membership Plan</label>
              <select
                value={formData.planId}
                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price.toLocaleString('en-IN')} / {p.period})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign Trainer</label>
              <select
                value={formData.trainerId}
                onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">None / Self Guided</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Weight (kg)</label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Weight (kg)</label>
              <input
                type="number"
                value={formData.targetWeight}
                onChange={(e) => setFormData({ ...formData, targetWeight: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fitness Goal</label>
            <input
              type="text"
              placeholder="e.g. Fat loss, Marathon training, Hypertrophy"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Medical Notes & Allergies</label>
            <input
              type="text"
              placeholder="e.g. Asthma, Lower back pain history"
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact</label>
            <input
              type="text"
              placeholder="e.g. Jane Doe (+91 98200 12345)"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpenAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Create Account & Issue Pass
            </button>
          </div>
        </form>
      </Modal>

      {/* MEMBER CREDENTIALS RECEIPT MODAL */}
      <Modal
        isOpen={!!newlyCreatedCredentials}
        onClose={() => setNewlyCreatedCredentials(null)}
        title="Member Account Created & Credentials Ready"
        maxWidth="max-w-md"
      >
        {newlyCreatedCredentials && (
          <div className="space-y-5 text-center">
            
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-heading font-extrabold text-lg text-slate-900">
                {newlyCreatedCredentials.name}
              </h4>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                Plan: {newlyCreatedCredentials.planName}
              </p>
            </div>

            {/* Credential Slip Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Member ID:</span>
                <span className="font-mono font-bold text-slate-900">{newlyCreatedCredentials.id}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Login Email / Username:</span>
                <span className="font-bold text-slate-900">{newlyCreatedCredentials.email}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Assigned Password:</span>
                <span className="font-mono font-black text-emerald-800 text-sm bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {newlyCreatedCredentials.password}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Membership Plan:</span>
                <span className="font-bold text-emerald-700 text-xs">{newlyCreatedCredentials.planName}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNewlyCreatedCredentials(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

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
