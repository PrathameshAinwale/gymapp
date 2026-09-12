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
  Flame,
  LogOut,
  Heart,
  Edit2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatCard } from '../common/StatCard';

export const MemberProfile = () => {
  const { currentUser, logout } = useAuth();
  const { members, plans, updateMember, addToast } = useGymData();

  const member = members.find((m) => String(m.id) === String(currentUser?.id)) || members[0] || {};
  const memberPlan = plans.find((p) => p.id === member?.planId);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      name: member?.name || currentUser?.name || '',
      phone: member?.phone || currentUser?.phone || '',
      emergencyContact: member?.emergencyContact || '',
      weight: member?.weight || '',
      targetWeight: member?.targetWeight || '',
      height: member?.height || '',
      goal: member?.goal || '',
      medicalNotes: member?.medicalNotes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!member?.id) return;

    setIsSaving(true);
    try {
      await updateMember(member.id, {
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
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate days remaining
  const expiryDate = member?.expiryDate ? new Date(member.expiryDate) : null;
  const joinDate = member?.joinDate ? new Date(member.joinDate) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const today = new Date();
  const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))) : 180;
  const totalPlanDays = expiryDate && joinDate ? Math.max(1, Math.ceil((expiryDate - joinDate) / (1000 * 60 * 60 * 24))) : 365;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalPlanDays - daysRemaining) / totalPlanDays) * 100)));

  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 15;

  const planStatusBadge = isExpired ? (
    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
      Expired
    </span>
  ) : isExpiringSoon ? (
    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
      Expiring Soon
    </span>
  ) : (
    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
      Active
    </span>
  );

  // Height & Weight BMI
  const heightInMeters = (member?.height || 175) / 100;
  const weightVal = member?.weight || 75;
  const bmi = (weightVal / (heightInMeters * heightInMeters)).toFixed(1);

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-16 max-w-4xl mx-auto">
      {/* 1. Profile Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md shadow-emerald-500/20 shrink-0">
            {member?.name ? member.name.charAt(0) : currentUser?.name ? currentUser.name.charAt(0) : 'M'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-2xl font-bold font-heading text-slate-900 tracking-tight truncate">
                {member?.name || currentUser?.name || 'Athlete'}
              </h1>
              {planStatusBadge}
            </div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="font-medium text-slate-700">{currentUser?.email || member?.email}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">{member?.planName || memberPlan?.name || 'Annual Elite'}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">ID: {String(member?.id || currentUser?.id).toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI StatCards (Owner Dashboard Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Membership Tier"
          value={member?.planName || memberPlan?.name || 'Standard Pro'}
          change="Full Gym Access"
          isPositive={true}
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          title="Days Left"
          value={`${daysRemaining} Days`}
          change={isExpiringSoon ? 'Expiring Soon' : 'Valid & Verified'}
          isPositive={!isExpired}
          icon={Calendar}
          color="cyan"
        />
        <StatCard
          title="Body BMI"
          value={`${bmi} BMI`}
          change="Healthy Weight Range"
          isPositive={true}
          icon={Activity}
          color="teal"
        />
        <StatCard
          title="Assigned Coach"
          value={member?.trainerName || 'Coach Alex Rivers'}
          change="1-on-1 Mentorship"
          isPositive={true}
          icon={User}
          color="indigo"
        />
      </div>

      {/* 3. Plan Validity & Membership Progress Bar */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
              Membership Timeline & Validity
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-600">
            {daysRemaining} days remaining
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${100 - progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 pt-0.5">
          <span>
            Joined: <strong className="text-slate-700">{member?.joinDate || 'Jan 15, 2026'}</strong>
          </span>
          <span>
            Expires: <strong className="text-slate-700">{member?.expiryDate || 'Jan 15, 2027'}</strong>
          </span>
        </div>
      </div>

      {/* 4. Details Breakdown (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
        {/* Column 1: Personal & Contact Information */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
              Personal & Contact Details
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
              </span>
              <span className="font-semibold text-slate-800">{currentUser?.email || member?.email || '—'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
              </span>
              <span className="font-semibold text-slate-800">{member?.phone || currentUser?.phone || '+91 98765 43210'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Emergency Contact
              </span>
              <span className="font-semibold text-slate-800">{member?.emergencyContact || '+91 91234 56789 (Family)'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Access Pass Code
              </span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {member?.qrPassCode || currentUser?.qrPassCode || 'PF-MEM-4092'}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Fitness Profile & Biometrics */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Activity className="w-4 h-4 text-cyan-600" />
            <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
              Biometrics & Fitness Goals
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-400" /> Current Weight
              </span>
              <span className="font-bold text-slate-900">{member?.weight || 75} kg</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" /> Target Weight
              </span>
              <span className="font-bold text-emerald-700">{member?.targetWeight || 70} kg</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-slate-400" /> Primary Goal
              </span>
              <span className="font-bold text-slate-800">{member?.goal || 'Fat Loss & Hypertrophy'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Medical Notes
              </span>
              <span className="font-medium text-slate-700">{member?.medicalNotes || 'None / Cleared for high intensity'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Account Sign Out Action */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">Sign Out of Session</h4>
          <p className="text-[11px] text-slate-500">Log out of your member account securely on this device.</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of PulseFit</span>
        </button>
      </div>

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
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Target (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.targetWeight}
                onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Primary Fitness Goal
            </label>
            <input
              type="text"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              placeholder="e.g. Weight Loss, Muscle Building, Marathon Training"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Medical Notes / Restrictions
            </label>
            <textarea
              rows={2}
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
              placeholder="e.g. Lower back pain, asthma, none"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-xs cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
