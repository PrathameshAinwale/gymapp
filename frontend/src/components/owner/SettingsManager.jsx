import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { api } from '../../services/api';
import { Settings, Building, Clock, Mail, Phone, Save, ShieldCheck, Bell, Loader2, RotateCw, Upload, Image as ImageIcon, Trash2, Sparkles, Calendar, Crown, Award, Zap, CheckCircle2, Building2, Plus, X, Lock, Check } from 'lucide-react';
import { getPlanByTier } from '../superadmin/packagePlans';
import { formatDateDisplay } from '../../utils/dateUtils';
import {
  hasSqlInjection,
  isValidEmail,
  isValidPhone,
  preventNonPhoneKey,
  sanitizePhone,
  sanitizeText
} from '../../utils/validation';


const calculateDaysRemaining = (expiryDate) => {
  if (!expiryDate) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    if (isNaN(exp.getTime())) return null;
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

export const SettingsManager = () => {
  const { gymInfo, setGymInfo, fetchGymInfo, addToast, branches = [], branchesData = {}, fetchBranches, switchBranch, createBranch } = useGymData();
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isSwitchingId, setIsSwitchingId] = useState(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const branchLogoInputRef = useRef(null);
  const [newBranchData, setNewBranchData] = useState({
    name: '',
    tagline: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    operating_hours: 'Mon-Sat: 6:00 AM - 10:30 PM',
    logo: ''
  });
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: gymInfo?.name || '',
    tagline: gymInfo?.tagline || '',
    logo: gymInfo?.logo || '',
    address: gymInfo?.address || '',
    phone: gymInfo?.phone || '',
    email: gymInfo?.email || '',
    operatingHours: gymInfo?.operatingHours || '',
    currency: gymInfo?.currency || '₹',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Purchased Plan & Subscription dates computed from real gymInfo
  const currentTier = gymInfo?.packageTier || gymInfo?.package || 'Bronze';
  const currentPlan = getPlanByTier(currentTier);
  const isPlatinum = Boolean(branchesData?.is_platinum || currentTier?.toLowerCase() === 'platinum');

  const startsAtRaw = gymInfo?.subscriptionStartsAt || gymInfo?.createdAt;
  const expiresAtRaw = gymInfo?.subscriptionExpiresAt;

  const startsAtDisplay = startsAtRaw ? formatDateDisplay(startsAtRaw) : '';
  const expiresAtDisplay = expiresAtRaw ? formatDateDisplay(expiresAtRaw) : '';

  const daysRemaining = expiresAtRaw ? calculateDaysRemaining(expiresAtRaw) : null;

  useEffect(() => {
    fetchGymInfo?.();
    fetchBranches?.();
  }, [fetchGymInfo, fetchBranches]);

  useEffect(() => {
    if (gymInfo) {
      setFormData({
        name: gymInfo.name || '',
        tagline: gymInfo.tagline || '',
        logo: gymInfo.logo || '',
        address: gymInfo.address || '',
        phone: gymInfo.phone || '',
        email: gymInfo.email || '',
        operatingHours: gymInfo.operatingHours || '',
        currency: gymInfo.currency || '₹',
      });
    }
  }, [gymInfo]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGymInfo?.();
    setIsRefreshing(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, logo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleSwitchToBranch = async (targetGymId, targetGymName) => {
    if (isSwitchingId) return;
    setIsSwitchingId(targetGymId);
    try {
      addToast(`Switching active workspace to "${targetGymName}"...`, 'info');
      await switchBranch(targetGymId);
    } catch (err) {
      alert('Failed to switch facility: ' + (err.message || 'Server error'));
      setIsSwitchingId(null);
    }
  };

  const handleBranchLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewBranchData((prev) => ({ ...prev, logo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBranchSubmit = async (e) => {
    e.preventDefault();
    if (!newBranchData.name.trim()) {
      alert('Please enter a gym name for the new facility.');
      return;
    }
    if (newBranchData.phone && !isValidPhone(newBranchData.phone)) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (newBranchData.email && !isValidEmail(newBranchData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsCreatingBranch(true);
    try {
      const res = await createBranch(newBranchData);
      if (res?.success) {
        addToast(`Gym facility "${newBranchData.name}" created successfully!`, 'success');
        setIsAddBranchModalOpen(false);
        setNewBranchData({
          name: '',
          tagline: '',
          address: '',
          city: '',
          phone: '',
          email: '',
          operating_hours: 'Mon-Sat: 6:00 AM - 10:30 PM',
          logo: ''
        });
        await fetchGymInfo?.();
      }
    } catch (err) {
      alert('Error adding facility: ' + (err.message || 'Server error'));
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (
      hasSqlInjection(formData.name) ||
      hasSqlInjection(formData.tagline) ||
      hasSqlInjection(formData.address) ||
      hasSqlInjection(formData.email) ||
      hasSqlInjection(formData.phone) ||
      hasSqlInjection(formData.operatingHours)
    ) {
      alert('Security Warning: SQL or script injection characters detected. Please remove special characters.');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      alert('Please enter a valid 10-digit contact phone number.');
      return;
    }

    try {
      setIsSaving(true);
      const sanitizedPayload = {
        name: sanitizeText(formData.name),
        tagline: sanitizeText(formData.tagline),
        logo: formData.logo || '',
        address: sanitizeText(formData.address),
        phone: formData.phone,
        email: sanitizeText(formData.email),
        operatingHours: sanitizeText(formData.operatingHours),
        currency: formData.currency || '₹',
      };
      let updatedData = { ...sanitizedPayload };
      try {
        const res = await api.gymInfo.update(sanitizedPayload);
        if (res?.data) {
          updatedData = {
            id: res.data.id || gymInfo?.id,
            name: res.data.name || '',
            tagline: res.data.tagline || '',
            logo: res.data.logo !== undefined ? res.data.logo : formData.logo,
            address: res.data.address || '',
            phone: res.data.phone || '',
            email: res.data.email || '',
            operatingHours: res.data.operatingHours || res.data.operating_hours || '',
            currency: res.data.currency || '₹',
          };
        }
      } catch (err) {
        console.warn('Backend gymInfo update note:', err.message);
      }
      setGymInfo(updatedData);
      setFormData(updatedData);
      localStorage.setItem('pulsefit_gymInfo', JSON.stringify(updatedData));
      addToast('Gym profile, logo & operational settings saved successfully!', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Settings & Branding
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Configure club business information, operational timings, and front desk communications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 self-start sm:self-auto"
          title="Refresh from MySQL Database"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* SUBSCRIPTION PLAN & VALIDITY DETAILS (CLEAN & SIMPLE) */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPlatinum
                ? 'bg-purple-50 text-purple-600 border border-purple-200'
                : currentTier.toLowerCase() === 'gold'
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
            }`}>
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {gymInfo?.packageName || `${currentTier} Plan`}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
                {gymInfo?.packageAmount && (
                  <span className="text-xs font-semibold text-slate-500">
                    • ₹{Number(gymInfo.packageAmount).toLocaleString('en-IN')}/{gymInfo?.billingCycle === 'Monthly' ? 'mo' : 'yr'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPlatinum
                  ? 'Unlimited athletes, unlimited staff accounts & multi-facility management.'
                  : currentPlan?.description || 'Active gym subscription.'}
              </p>
            </div>
          </div>

          {daysRemaining !== null && (
            <div className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shrink-0 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{daysRemaining > 0 ? `${daysRemaining} Days Remaining` : 'Renew Today'}</span>
            </div>
          )}
        </div>

        {/* 3 Simple Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Plan Starting Date
              </div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {startsAtDisplay || 'Active since signup'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Plan Ending / Renewal
              </div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {expiresAtDisplay || '1 Year Term'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Facility Quotas
              </div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {gymInfo?.maxMembers ? `${gymInfo.maxMembers} Athletes` : 'Unlimited Athletes'}
                <span className="text-xs font-normal text-slate-500">
                  {' '}• {gymInfo?.maxBranches && gymInfo.maxBranches > 1 ? `${gymInfo.maxBranches} Gyms` : '1 Gym'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-GYM & BRANCHES MANAGEMENT (PLATINUM TIER FEATURE) */}
      <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  Multi-Gym Facility Workspaces
                </h3>
                {isPlatinum ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xs uppercase">
                    Platinum Privilege
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Platinum Exclusive
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPlatinum
                  ? `Manage up to ${branchesData.max_branches || 3} independent gym facilities with completely isolated athletes, trainers, and finances.`
                  : 'Add and manage multiple gym facilities from one master account. Each branch gets independent members, staff & accounts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {isPlatinum && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                {branches.length} / {branchesData.max_branches || 3} Gyms Added
              </span>
            )}
            {isPlatinum && branches.length < (branchesData.max_branches || 3) && (
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Gym</span>
              </button>
            )}
          </div>
        </div>

        {/* If user is NOT on Platinum, show informative upgrade card */}
        {!isPlatinum ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50/80 via-indigo-50/60 to-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Unlock Multi-Gym Support with Platinum Plan
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                  Your current {currentTier} Plan supports 1 single gym facility. Upgrade to the Platinum Plan to create up to 3 separate gym locations with complete data isolation for members, revenue, staff, and workout schedules.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-sm">
                <Crown className="w-3.5 h-3.5" />
                <span>Platinum Feature</span>
              </span>
            </div>
          </div>
        ) : (
          /* PLATINUM BRANCHES LIST */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {branches.map((b) => {
              const isCurrent = b.is_active || (b.id === gymInfo?.id);
              const isSwitchingThis = isSwitchingId === b.id;
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-gradient-to-br from-indigo-50/70 to-purple-50/40 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {b.logo ? (
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            <img src={b.logo} alt={b.name} className="w-full h-full object-contain p-0.5" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {(b.name || 'G').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate leading-tight">
                            {b.name}
                          </h4>
                          {b.tagline && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{b.tagline}</p>
                          )}
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Active
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      {b.address && (
                        <div className="line-clamp-1 text-slate-500">
                          📍 {b.address}{b.city ? `, ${b.city}` : ''}
                        </div>
                      )}
                      {b.phone && (
                        <div className="text-slate-500">
                          📞 {b.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                        🏋️ {b.member_count || 0} Athletes
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                        👔 {b.staff_count || 0} Staff
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/80">
                    {isCurrent ? (
                      <div className="w-full py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Current Active Workspace</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchToBranch(b.id, b.name)}
                        disabled={isSwitchingId !== null}
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        {isSwitchingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Switching Workspace...</span>
                          </>
                        ) : (
                          <span>Switch to this Gym →</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty slot placeholder if under limit */}
            {branches.length < (branchesData.max_branches || 3) && (
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(true)}
                className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 cursor-pointer min-h-[170px]"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-800">Add Gym Facility {branches.length + 1}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Platinum allowance: up to {branchesData.max_branches || 3} gyms</div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-3 sm:space-y-6">
        {/* General Business Profile */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-4">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Facility Profile & Branding Details</span>
          </h3>

          {/* Gym Logo & Navbar Appearance */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gym Brand Logo</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Shown on Top Navbar & Reports</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Logo Preview */}
              <div className="relative group shrink-0">
                {formData.logo ? (
                  <div className="relative w-16 h-16 rounded-2xl bg-white border-2 border-emerald-500/40 p-1 flex items-center justify-center shadow-xs overflow-hidden">
                    <img
                      src={formData.logo}
                      alt="Gym Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-sm border border-emerald-400/30">
                    {(formData.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Image</span>
                  </button>

                  {formData.logo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="text"
                    placeholder="Or paste direct image URL (https://...)"
                    value={formData.logo.startsWith('data:') ? '' : formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">PNG, JPG, WebP, or SVG (max 2MB)</span>
                </div>
              </div>
            </div>

            {/* Live Top Navbar Preview */}
            <div className="mt-2 pt-3 border-t border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Top Navbar Preview
              </span>
              <div className="inline-flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                {formData.logo ? (
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={formData.logo}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-0.5"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shrink-0">
                    {(formData.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col justify-center min-w-0 pr-2">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate max-w-[200px] leading-tight">
                    {formData.name || 'YOUR GYM NAME'}
                  </span>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold tracking-wider uppercase leading-none mt-0.5">
                    <span>powered by</span>
                    <span className="font-black text-slate-800 tracking-tight">
                      ARCH<span className="text-lime-500">FIT</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Gym Name</label>
              <input
                type="text"
                placeholder="Enter gym name (e.g. FitZone Club)"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                placeholder="Enter tagline or motto"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Physical Facility Address</label>
            <input
              type="text"
              placeholder="Enter physical facility address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="contact@gym.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Phone (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                onKeyDown={preventNonPhoneKey}
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-4">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Gym & Floor Operational Hours</span>
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Operating Hours Schedule</label>
            <input
              type="text"
              placeholder="e.g. Mon-Sat: 6:00 AM - 10:30 PM | Sun: 7:00 AM - 1:00 PM"
              value={formData.operatingHours || ''}
              onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* System & Currency Settings */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-4">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>System Localization & Currency</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Billing Currency</label>
              <input
                type="text"
                readOnly
                value="Indian Rupee (₹ / INR)"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Timezone</label>
              <input
                type="text"
                readOnly
                value="Asia/Kolkata (IST - UTC+05:30)"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving Settings...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* ADD ANOTHER GYM MODAL (PLATINUM MULTI-GYM) */}
      {isAddBranchModalOpen && createPortal(
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-[#0e1017] border border-white/[0.12] rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-base">
                      Add New Gym Facility
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                      Platinum Tier
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Creates an isolated facility workspace with separate athletes, trainers, and accounts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateBranchSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Data isolation banner */}
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-200">
                    <strong className="text-white block mb-0.5">Complete Data Isolation Guarantee</strong>
                    Members, admission plans, billing receipts, staff accounts, and attendance logs registered in this facility will be strictly kept separate from your other gyms.
                  </div>
                </div>

                {/* Facility Name & Tagline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Facility Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elev8 Fitness Downtown Branch"
                      value={newBranchData.name}
                      onChange={(e) => setNewBranchData({ ...newBranchData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Tagline / Motto</label>
                    <input
                      type="text"
                      placeholder="e.g. Strength & Conditioning Zone"
                      value={newBranchData.tagline}
                      onChange={(e) => setNewBranchData({ ...newBranchData, tagline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Address & City */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Facility Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 2nd Floor, Phoenix Mall Annex"
                      value={newBranchData.address}
                      onChange={(e) => setNewBranchData({ ...newBranchData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={newBranchData.city}
                      onChange={(e) => setNewBranchData({ ...newBranchData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Contact Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Desk Phone (10 Digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9820123456"
                      onKeyDown={preventNonPhoneKey}
                      value={newBranchData.phone}
                      onChange={(e) => setNewBranchData({ ...newBranchData, phone: sanitizePhone(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Desk Email</label>
                    <input
                      type="email"
                      placeholder="e.g. branch2@gym.com"
                      value={newBranchData.email}
                      onChange={(e) => setNewBranchData({ ...newBranchData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Operating Hours */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Operating Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Mon-Sat: 6:00 AM - 10:30 PM | Sun: 7:00 AM - 1:00 PM"
                    value={newBranchData.operating_hours}
                    onChange={(e) => setNewBranchData({ ...newBranchData, operating_hours: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Branch Logo Upload */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300">Facility Logo (Optional)</label>
                    <span className="text-[10px] text-slate-400">Uses main logo if left empty</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={branchLogoInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleBranchLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => branchLogoInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold border border-white/[0.1] transition-colors cursor-pointer"
                    >
                      Choose Image...
                    </button>
                    {newBranchData.logo && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Logo uploaded
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#090b10] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBranch}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreatingBranch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Facility...</span>
                    </>
                  ) : (
                    <span>Create Gym Facility</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
