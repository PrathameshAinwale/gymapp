import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  User,
  Phone,
  Mail,
  Scale,
  Target,
  Activity,
  Calendar,
  Clock,
  Shield,
  CreditCard,
  Flame,
  LogOut,
  Heart,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const MemberProfile = () => {
  const { currentUser, logout } = useAuth();
  const { members, plans, updateMember, addToast } = useGymData();

  const member = members.find((m) => m.id === currentUser?.id) || members[0];
  const memberPlan = plans.find((p) => p.id === member?.planId);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergencyContact: '',
    weight: '',
    targetWeight: '',
    height: '',
    goal: '',
    medicalNotes: ''
  });

  const handleOpenEdit = () => {
    setFormData({
      name: member?.name || '',
      phone: member?.phone || '',
      emergencyContact: member?.emergencyContact || '',
      weight: member?.weight || '',
      targetWeight: member?.targetWeight || '',
      height: member?.height || '',
      goal: member?.goal || '',
      medicalNotes: member?.medicalNotes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!member?.id) return;

    updateMember(member.id, {
      name: formData.name,
      phone: formData.phone,
      emergencyContact: formData.emergencyContact,
      weight: formData.weight ? Number(formData.weight) : undefined,
      targetWeight: formData.targetWeight ? Number(formData.targetWeight) : undefined,
      height: formData.height ? Number(formData.height) : undefined,
      goal: formData.goal,
      medicalNotes: formData.medicalNotes
    });

    setIsEditModalOpen(false);
    addToast('Profile updated successfully!');
  };

  // Calculate days remaining
  const expiryDate = member?.expiryDate ? new Date(member.expiryDate) : null;
  const today = new Date();
  const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))) : 0;
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 15;

  const planStatusColor = isExpired
    ? 'text-red-700 bg-red-50 border-red-200'
    : isExpiringSoon
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200';

  const planStatusLabel = isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active';

  const InfoRow = ({ icon: Icon, label, value, accent = false }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
        <Icon className={`w-4 h-4 ${accent ? 'text-emerald-600' : 'text-slate-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
        <div className={`text-xs font-semibold ${accent ? 'text-emerald-700' : 'text-slate-900'} truncate`}>{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn pb-10 max-w-2xl mx-auto">
      
      {/* Profile Header */}
      <div className="relative p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
        {/* Edit Profile Button */}
        <button
          type="button"
          onClick={handleOpenEdit}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="Edit Profile Details"
        >
          <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Edit</span>
        </button>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto text-2xl font-black shadow-md shadow-emerald-500/20">
          {member?.name?.charAt(0) || 'M'}
        </div>
        <h1 className="text-xl font-bold font-heading text-slate-900 mt-3">
          {member?.name || 'Member'}
        </h1>
        <div className="text-xs text-slate-500 mt-0.5">
          {currentUser?.roleLabel || 'Member'} • Pass ID: {member?.qrPassCode || 'PF-M-101'}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${planStatusColor}`}>
            {planStatusLabel}
          </span>
          <span className="px-3 py-1 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200">
            <Flame className="w-3 h-3 inline mr-1 text-amber-500" />{member?.attendanceStreak || 14} Day Streak
          </span>
        </div>
      </div>

      {/* Plan & Validity Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900 font-heading">Plan & Validity</h2>
        </div>
        
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">{member?.planName || 'Gold Quarterly Fitness'}</div>
              <div className="text-[10px] text-slate-500">{memberPlan?.period || 'Quarterly (3 Months)'}</div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${planStatusColor}`}>
              {planStatusLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Join Date</div>
              <div className="text-xs font-bold text-slate-800">{member?.joinDate || '2025-11-15'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Expiry Date</div>
              <div className={`text-xs font-bold ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>{member?.expiryDate || '2026-09-15'}</div>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${isExpired ? 100 : Math.max(5, 100 - (daysRemaining / 365) * 100)}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
            {isExpired ? (
              <>
                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                <span className="text-red-600 font-semibold">Plan has expired. Please renew at front desk.</span>
              </>
            ) : (
              <span>{daysRemaining} days remaining on membership</span>
            )}
          </div>
        </div>
      </div>

      {/* Personal Info Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 font-heading">Personal Information</h2>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
        <InfoRow icon={Mail} label="Email" value={member?.email || 'member@pulsefit.in'} />
        <InfoRow icon={Phone} label="Phone" value={member?.phone || '+91 98765 43210'} />
        <InfoRow icon={User} label="Gender" value={member?.gender || 'Male'} />
        <InfoRow icon={Calendar} label="Age" value={member?.age ? `${member.age} years` : '27 years'} />
        <InfoRow icon={Heart} label="Emergency Contact" value={member?.emergencyContact || 'Neha Sharma (+91 98765 11223)'} />
      </div>

      {/* Body Stats Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 font-heading">Body Stats & Goal</h2>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" /> Update Stats
          </button>
        </div>
        <InfoRow icon={Scale} label="Current Weight" value={member?.weight ? `${member.weight} kg` : '78.5 kg'} accent />
        <InfoRow icon={Target} label="Target Weight" value={member?.targetWeight ? `${member.targetWeight} kg` : '74.0 kg'} />
        <InfoRow icon={Flame} label="Fitness Goal" value={member?.goal || 'Lean Muscle Gain & Core Strength'} accent />
        <InfoRow icon={Shield} label="Medical Notes" value={member?.medicalNotes || 'Minor left shoulder impingement (cleared)'} />
      </div>

      {/* Coach Info */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900 font-heading">Assigned Coach</h2>
        </div>
        <InfoRow icon={User} label="Trainer" value={member?.trainerName || 'Coach Alex Rivers'} accent />
        <InfoRow icon={Clock} label="Last Check-In" value={member?.lastCheckIn || 'Today'} />
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Sign Out of PulseFit
      </button>

      {/* EDIT PROFILE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member Profile"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                placeholder="e.g. Spouse / Parent (+91 ...)"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Current Wt (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="75"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Target Wt (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="70"
                value={formData.targetWeight}
                onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Fitness Goal
            </label>
            <input
              type="text"
              placeholder="e.g. Muscle Hypertrophy & Athletic Conditioning"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Medical & Health Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Lower back sensitivity, avoid heavy squats..."
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-98 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
