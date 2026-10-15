import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Settings, Building, Clock, Mail, Phone, Save, ShieldCheck, Bell, Loader2, RotateCw, Upload, Image as ImageIcon, Trash2, Sparkles, Calendar, Crown, Award, Zap, CheckCircle2, Building2, Plus, X, Lock, Check, Eye, EyeOff, KeyRound, AlertCircle, FileText, Users, Dumbbell, Calculator, UserCheck, Sliders, Info, CheckSquare } from 'lucide-react';
import { getPlanByTier } from '../superadmin/packagePlans';
import { formatDateDisplay } from '../../utils/dateUtils';
import { getGymConsentForm, saveGymConsentForm, DEFAULT_CONSENT_FORM } from '../../utils/consentFormConfig';
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
  const { currentUser, updateUserPassword } = useAuth();

  // Active Settings Sub-Tab: 'general' | 'consent'
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  // Payroll & Attendance Policy Configuration State
  const DEFAULT_PAYROLL_ATTENDANCE = {
    member: {
      auto_checkout: true,
      auto_checkout_hours: 'shift',
      late_mark_minutes: 0,
      workout_window_alert: true,
    },
    trainer: {
      auto_checkout: true,
      auto_checkout_hours: 'shift',
      late_mark_minutes: 15,
      half_day_hours: 4,
      late_penalty_enabled: true,
    },
    manager: {
      auto_checkout: true,
      auto_checkout_hours: 'shift',
      late_mark_minutes: 15,
      half_day_hours: 4.5,
      late_penalty_enabled: false,
    },
    accounts: {
      auto_checkout: true,
      auto_checkout_hours: 'shift',
      late_mark_minutes: 15,
      half_day_hours: 4,
      late_penalty_enabled: true,
    },
  };

  const [payrollConfig, setPayrollConfig] = useState(() => {
    return gymInfo?.payrollAttendanceSettings || gymInfo?.payroll_attendance_settings || DEFAULT_PAYROLL_ATTENDANCE;
  });
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);

  useEffect(() => {
    if (gymInfo?.payrollAttendanceSettings || gymInfo?.payroll_attendance_settings) {
      setPayrollConfig((prev) => ({
        ...DEFAULT_PAYROLL_ATTENDANCE,
        ...(gymInfo.payrollAttendanceSettings || gymInfo.payroll_attendance_settings),
      }));
    }
  }, [gymInfo]);

  const handleUpdateRoleSetting = (role, key, value) => {
    setPayrollConfig((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || DEFAULT_PAYROLL_ATTENDANCE[role] || {}),
        [key]: value,
      },
    }));
  };

  const handleSavePayrollConfig = async () => {
    setIsSavingPayroll(true);
    try {
      await api.gym.updateInfo({
        payrollAttendanceSettings: payrollConfig,
        payroll_attendance_settings: payrollConfig,
      });
      if (setGymInfo) {
        setGymInfo((prev) => ({
          ...prev,
          payrollAttendanceSettings: payrollConfig,
          payroll_attendance_settings: payrollConfig,
        }));
      }
      addToast('Payroll & Attendance policies saved and applied successfully!', 'success');
    } catch (err) {
      addToast('Failed to save settings: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const handleResetPayrollConfig = () => {
    if (window.confirm('Reset all roles to standard gym attendance & payroll defaults?')) {
      setPayrollConfig(DEFAULT_PAYROLL_ATTENDANCE);
      addToast('Reset to standard recommended policies. Click "Save Policies" to confirm.', 'info');
    }
  };

  // Dynamic Consent Form Builder State
  const [consentFormConfig, setConsentFormConfig] = useState(() => getGymConsentForm(gymInfo?.id));
  const [isSavingConsent, setIsSavingConsent] = useState(false);

  // Sync consent form if gym id changes
  useEffect(() => {
    if (gymInfo?.id) {
      setConsentFormConfig(getGymConsentForm(gymInfo.id));
    }
  }, [gymInfo?.id]);

  const handleSaveConsentForm = () => {
    setIsSavingConsent(true);
    try {
      saveGymConsentForm(gymInfo?.id, consentFormConfig);
      addToast('Registration consent form updated successfully! New members will now review these clauses.', 'success');
    } catch (err) {
      addToast('Failed to save consent form: ' + err.message, 'error');
    } finally {
      setIsSavingConsent(false);
    }
  };

  const handleResetConsentForm = () => {
    if (window.confirm('Reset all consent form clauses to the standard legal template?')) {
      setConsentFormConfig(DEFAULT_CONSENT_FORM);
      saveGymConsentForm(gymInfo?.id, DEFAULT_CONSENT_FORM);
      addToast('Reset to standard legal waiver template.', 'info');
    }
  };

  const handleAddClause = () => {
    const nextId = Date.now();
    setConsentFormConfig((prev) => ({
      ...prev,
      clauses: [
        ...prev.clauses,
        {
          id: nextId,
          title: `Custom Policy / Clause #${prev.clauses.length + 1}`,
          text: 'Enter the terms, rules, or waiver declaration for this clause here.'
        }
      ]
    }));
  };

  const handleUpdateClause = (clauseId, field, value) => {
    setConsentFormConfig((prev) => ({
      ...prev,
      clauses: prev.clauses.map((c) => (c.id === clauseId ? { ...c, [field]: value } : c))
    }));
  };

  const handleDeleteClause = (clauseId) => {
    setConsentFormConfig((prev) => ({
      ...prev,
      clauses: prev.clauses.filter((c) => c.id !== clauseId)
    }));
  };

  // Owner Password Update States
  const [ownerCurrentPassword, setOwnerCurrentPassword] = useState('');
  const [ownerNewPassword, setOwnerNewPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');
  const [showOwnerCurrent, setShowOwnerCurrent] = useState(false);
  const [showOwnerNew, setShowOwnerNew] = useState(false);
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

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
    gstNumber: gymInfo?.gstNumber || gymInfo?.gstin || gymInfo?.gst_number || '',
    upiId: gymInfo?.upiId || gymInfo?.upi_id || '',
    bankDetails: gymInfo?.bankDetails || gymInfo?.bank_details || '',
    termsAndConditions: gymInfo?.termsAndConditions || gymInfo?.terms_and_conditions || '',
    footerText: gymInfo?.footerText || gymInfo?.footer_text || '',
    signatoryText: gymInfo?.signatoryText || gymInfo?.signatory_text || '',
    taxRate: gymInfo?.taxRate !== undefined ? gymInfo?.taxRate : (gymInfo?.tax_rate !== undefined ? gymInfo?.tax_rate : 18),
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
        operatingHours: gymInfo.operatingHours || gymInfo.operating_hours || '',
        currency: gymInfo.currency || '₹',
        gstNumber: gymInfo.gstNumber || gymInfo.gstin || gymInfo.gst_number || '',
        upiId: gymInfo.upiId || gymInfo.upi_id || '',
        bankDetails: gymInfo.bankDetails || gymInfo.bank_details || '',
        termsAndConditions: gymInfo.termsAndConditions || gymInfo.terms_and_conditions || '',
        footerText: gymInfo.footerText || gymInfo.footer_text || '',
        signatoryText: gymInfo.signatoryText || gymInfo.signatory_text || '',
        taxRate: gymInfo.taxRate !== undefined ? gymInfo.taxRate : (gymInfo.tax_rate !== undefined ? gymInfo.tax_rate : 18),
      });
    }
  }, [gymInfo]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGymInfo?.();
    setIsRefreshing(false);
  };

  const handleUpdateOwnerPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!ownerCurrentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!ownerNewPassword || ownerNewPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (ownerNewPassword !== ownerConfirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (ownerCurrentPassword === ownerNewPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.auth.changePassword(ownerCurrentPassword, ownerNewPassword);
      if (res?.success) {
        setPasswordSuccess('Your owner password has been successfully updated! Use your new password for future logins.');
        setOwnerCurrentPassword('');
        setOwnerNewPassword('');
        setOwnerConfirmPassword('');
        addToast?.('Owner account password updated successfully!', 'success');
        if (updateUserPassword) {
          updateUserPassword(ownerNewPassword);
        }
      } else {
        setPasswordError(res?.message || 'Failed to update password. Please verify your current password.');
      }
    } catch (err) {
      setPasswordError(err.message || 'Error updating password. Please verify your current password.');
    } finally {
      setIsChangingPassword(false);
    }
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
        gstNumber: sanitizeText(formData.gstNumber),
        gstin: sanitizeText(formData.gstNumber),
        upiId: sanitizeText(formData.upiId),
        upi_id: sanitizeText(formData.upiId),
        bankDetails: sanitizeText(formData.bankDetails),
        bank_details: sanitizeText(formData.bankDetails),
        termsAndConditions: sanitizeText(formData.termsAndConditions),
        terms_and_conditions: sanitizeText(formData.termsAndConditions),
        footerText: sanitizeText(formData.footerText),
        footer_text: sanitizeText(formData.footerText),
        signatoryText: sanitizeText(formData.signatoryText),
        signatory_text: sanitizeText(formData.signatoryText),
        taxRate: Number(formData.taxRate) || 18,
        tax_rate: Number(formData.taxRate) || 18,
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
            gstNumber: res.data.gstNumber || res.data.gstin || res.data.gst_number || '',
            gstin: res.data.gstNumber || res.data.gstin || res.data.gst_number || '',
            upiId: res.data.upiId || res.data.upi_id || '',
            bankDetails: res.data.bankDetails || res.data.bank_details || '',
            termsAndConditions: res.data.termsAndConditions || res.data.terms_and_conditions || '',
            footerText: res.data.footerText || res.data.footer_text || '',
            signatoryText: res.data.signatoryText || res.data.signatory_text || '',
            taxRate: res.data.taxRate !== undefined ? res.data.taxRate : 18,
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
    <div className="space-y-4 animate-fadeIn pb-12 w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Settings & Branding
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Top Level Settings Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('general')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSettingsTab === 'general'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Facility Profile & Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('consent')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSettingsTab === 'consent'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Member Registration Consent Form</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('payroll_attendance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSettingsTab === 'payroll_attendance'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Payroll & Attendance</span>
        </button>
      </div>

      {activeSettingsTab === 'general' ? (
        <div className="space-y-4">
          {/* SUBSCRIPTION PLAN & VALIDITY DETAILS (CLEAN & SIMPLE) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
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
              </div>
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
                  {' '}â€¢ {gymInfo?.maxBranches && gymInfo.maxBranches > 1 ? `${gymInfo.maxBranches} Gyms` : '1 Gym'}
                </span>
              </div>
            </div>
          </div>
        </div>
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

        {/* Invoice, Tax & Payment Settings */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Invoice, Tax & Payment Configuration</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
              Printed on Member PDF Receipts & Official Invoices
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                GSTIN / Tax Number
              </label>
              <input
                type="text"
                placeholder="e.g. 27AAPCP1234F1Z8"
                value={formData.gstNumber || ''}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                UPI ID (VPA for QR payments)
              </label>
              <input
                type="text"
                placeholder="e.g. gymname@okaxis"
                value={formData.upiId || ''}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="18"
                value={formData.taxRate !== undefined ? formData.taxRate : 18}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bank Transfer Details (NEFT/RTGS)
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Bank: HDFC Bank, A/C: 50200012345678, IFSC: HDFC0001234, Branch: Bandra West"
                value={formData.bankDetails || ''}
                onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Authorized Signatory Text
              </label>
              <input
                type="text"
                placeholder="e.g. Authorised Signatory"
                value={formData.signatoryText || ''}
                onChange={(e) => setFormData({ ...formData, signatoryText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Terms & Conditions Note
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Fees once paid are non-refundable. Non-transferable under any circumstances."
                value={formData.termsAndConditions || ''}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Invoice Footer / Thank You Message
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Thank you for your business! Stay consistent & conquer your goals."
                value={formData.footerText || ''}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* OWNER ACCOUNT & PASSWORD SECURITY                         */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Owner Account &amp; Password Security
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Change and set a new password for your gym owner portal account.
              </p>
            </div>
          </div>

          {(currentUser?.email || currentUser?.username) && (
            <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-auto font-mono">
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span>{currentUser.email || currentUser.username}</span>
            </div>
          )}
        </div>

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUpdateOwnerPassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Field 1: Current Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showOwnerCurrent ? 'text' : 'password'}
                  required
                  value={ownerCurrentPassword}
                  onChange={(e) => setOwnerCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerCurrent(!showOwnerCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showOwnerCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 2: New Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showOwnerNew ? 'text' : 'password'}
                  required
                  value={ownerNewPassword}
                  onChange={(e) => setOwnerNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerNew(!showOwnerNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showOwnerNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Confirm New Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showOwnerConfirm ? 'text' : 'password'}
                  required
                  value={ownerConfirmPassword}
                  onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerConfirm(!showOwnerConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showOwnerConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">

            <button
              type="submit"
              disabled={isChangingPassword || !ownerCurrentPassword || !ownerNewPassword || !ownerConfirmPassword}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Update Owner Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

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
                          {b.address}{b.city ? `, ${b.city}` : ''}
                        </div>
                      )}
                      {b.phone && (
                        <div className="text-slate-500">
                           {b.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                         {b.member_count || 0} Athletes
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                         {b.staff_count || 0} Staff
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
                          <span>Switch to this Gym â†’</span>
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
      </div>
      ) : activeSettingsTab === 'consent' ? (
        /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
        /* TAB 2: DIGITAL CONSENT & WAIVER BUILDER                   */
        /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
        <div className="space-y-4 sm:space-y-6">
          {/* Top Info & Action Card */}
          <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Digital Consent & Liability Waiver Builder
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Customize the legal clauses, club policies, and health declarations presented to new athletes during member enrollment.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleResetConsentForm}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                title="Reset to default legal waiver template"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reset to Standard</span>
              </button>
              <button
                type="button"
                onClick={handleSaveConsentForm}
                disabled={isSavingConsent}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isSavingConsent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSavingConsent ? 'Saving...' : 'Save Consent Form'}</span>
              </button>
            </div>
          </div>

          {/* Form Configuration Card */}
          <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 border-b border-slate-100 pb-2.5">
              Document Header & Declaration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={consentFormConfig.title}
                  onChange={(e) => setConsentFormConfig((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Gym Rules & Liability Waiver Consent Form"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Instruction / Subtitle Note
                </label>
                <input
                  type="text"
                  value={consentFormConfig.subtitle}
                  onChange={(e) => setConsentFormConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Review terms & physical activity declaration below before signing."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mandatory Checkbox Acknowledgment Text *
                </label>
                <input
                  type="text"
                  value={consentFormConfig.declarationText}
                  onChange={(e) => setConsentFormConfig((prev) => ({ ...prev, declarationText: e.target.value }))}
                  placeholder="e.g. I have read, understood, and accept all terms of the Health Declaration, Liability Waiver & Gym Rules."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Allowed Signing Methods */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 mb-2">
                Allowed Signature Methods During Registration
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentFormConfig.allowPhysicalSign}
                    onChange={(e) => setConsentFormConfig((prev) => ({ ...prev, allowPhysicalSign: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Physical / Paper Form Signed</span>
                    <span className="text-[10px] text-slate-500 block">Front desk staff verifies physical signed paper</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentFormConfig.allowEmailOtp}
                    onChange={(e) => setConsentFormConfig((prev) => ({ ...prev, allowEmailOtp: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Email OTP Digital Signature</span>
                    <span className="text-[10px] text-slate-500 block">Member verifies with one-time password sent to email</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Legal Clauses List & Editor */}
          <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                  Consent Form Clauses & Rules ({consentFormConfig.clauses.length} Clauses)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Add, edit, or remove clauses below. Each clause will be displayed clearly to athletes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddClause}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Clause</span>
              </button>
            </div>

            <div className="space-y-3">
              {consentFormConfig.clauses.map((clause, index) => (
                <div
                  key={clause.id || index}
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                      Clause #{index + 1}
                    </span>
                    {consentFormConfig.clauses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClause(clause.id || index)}
                        className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove this clause"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Clause Title
                    </label>
                    <input
                      type="text"
                      value={clause.title}
                      onChange={(e) => handleUpdateClause(clause.id || index, 'title', e.target.value)}
                      placeholder="e.g. Physical Fitness & Medical Health Affirmation"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Clause Full Description / Text
                    </label>
                    <textarea
                      rows={3}
                      value={clause.text}
                      onChange={(e) => handleUpdateClause(clause.id || index, 'text', e.target.value)}
                      placeholder="Enter legal terms, waiver declarations or club rules..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddClause}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Clause</span>
            </button>
          </div>

          {/* Live Preview Card */}
          <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Registration Live Preview (How Athletes & Staff See It)
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">
                Preview Mode
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200 text-[11px]">
                <span className="font-bold text-slate-800">
                  Participant: <span className="text-emerald-700">Athlete Name</span>
                </span>
                <span className="text-slate-500">
                  Facility: <strong className="text-slate-700">{gymInfo?.name || 'PulseFit Athletic Club'}</strong> &bull; Date: Today
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                {consentFormConfig.clauses.map((clause, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0 text-xs">{idx + 1}.</span>
                    <p>
                      <strong className="text-slate-900">{clause.title}:</strong> {clause.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Mandatory Checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-800">
              <input type="checkbox" checked readOnly className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-emerald-300" />
              <div>
                <span className="font-bold block text-emerald-950">
                  {consentFormConfig.declarationText || 'I have read, understood, and accept all terms of the Health Declaration, Liability Waiver & Gym Rules.'}
                </span>
                <span className="text-[11px] text-slate-600">
                  {consentFormConfig.declarationSubtext || 'By checking this box, the athlete confirms full agreement and understanding of the above clauses.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
        /* TAB 3: PAYROLL & ATTENDANCE POLICY RULES                   */
        /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
        <div className="space-y-5 animate-fadeIn">
          {/* Header Action Bar */}
          <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Payroll & Attendance Policy Rules
                  </h2>
                  <p className="text-xs text-slate-500">
                    Set role-specific late mark grace periods, auto check-out toggles, and work duration cutoffs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleResetPayrollConfig}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                disabled={isSavingPayroll}
                onClick={handleSavePayrollConfig}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingPayroll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSavingPayroll ? 'Saving...' : 'Save All Policies'}</span>
              </button>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {/* 1. MEMBER ATTENDANCE & AUTO CHECK-OUT SECTION             */}
          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Gym Member Settings</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Member Role
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Turnstile gate check-in duration rules and automatic session completion.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Auto Check-Out Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto Check-Out</span>
                    <span className="text-[11px] text-slate-500 block">
                      Auto-close workouts if member doesn't punch out at turnstile
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!payrollConfig.member?.auto_checkout}
                      onChange={(e) => handleUpdateRoleSetting('member', 'auto_checkout', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {payrollConfig.member?.auto_checkout && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Auto Check-Out Time:
                      </label>
                      <select
                        value={payrollConfig.member?.auto_checkout_hours ?? 'shift'}
                        onChange={(e) => handleUpdateRoleSetting('member', 'auto_checkout_hours', e.target.value === 'shift' ? 'shift' : Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                      >
                        <option value="shift">As per Assigned Shift (End Time in Profile)</option>
                        <option value={1}>1.0 Hour (60 mins)</option>
                        <option value={1.5}>1.5 Hours (90 mins)</option>
                        <option value={2}>2.0 Hours (120 mins - Standard)</option>
                        <option value={2.5}>2.5 Hours (150 mins)</option>
                        <option value={3}>3.0 Hours (180 mins)</option>
                        <option value={4}>4.0 Hours (240 mins)</option>
                      </select>
                    </div>
                    {payrollConfig.member?.auto_checkout_hours === 'shift' && (
                      <p className="text-[10px] text-emerald-600 font-medium text-right">
                        Auto check-out triggers at shift end time in user profile.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Late Mark Setting Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Late Mark Tracking</span>
                    <span className="text-[11px] text-slate-500 block">
                      Arrival time grace rules for workouts
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-200/80 text-slate-600">
                    Not Applicable
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Members enjoy open flexible workout hours within facility timings. Late mark tracking only applies to staff shifts.</span>
                </div>
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {/* 2. TRAINER & FITNESS COACH SECTION                        */}
          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="bg-white border border-purple-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-100/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-200 shrink-0">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Trainer & Coach Settings</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                      Trainer Role
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Shift punctuality, late mark grace window, and auto-clock out for coaches.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Late Mark Grace Period Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Late Mark Grace Period</span>
                    <span className="text-[11px] text-slate-500 block">
                      Allowed grace buffer after shift start time
                    </span>
                  </div>
                  <select
                    value={payrollConfig.trainer?.late_mark_minutes ?? 15}
                    onChange={(e) => handleUpdateRoleSetting('trainer', 'late_mark_minutes', Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-purple-900 focus:outline-none focus:border-purple-500 cursor-pointer shadow-xs"
                  >
                    <option value={0}>0 mins (Strict start)</option>
                    <option value={5}>5 mins Grace</option>
                    <option value={10}>10 mins Grace</option>
                    <option value={15}>15 mins Grace (Standard)</option>
                    <option value={20}>20 mins Grace</option>
                    <option value={30}>30 mins Grace</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Punches recorded after shift start + {payrollConfig.trainer?.late_mark_minutes ?? 15} mins will be logged as <strong>Late Mark</strong>.
                </p>
              </div>

              {/* Auto Check-Out Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto Check-Out</span>
                    <span className="text-[11px] text-slate-500 block">
                      Auto-close shift if trainer forgets to punch out
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!payrollConfig.trainer?.auto_checkout}
                      onChange={(e) => handleUpdateRoleSetting('trainer', 'auto_checkout', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {payrollConfig.trainer?.auto_checkout && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Auto Clock-Out After:
                      </label>
                      <select
                        value={payrollConfig.trainer?.auto_checkout_hours ?? 'shift'}
                        onChange={(e) => handleUpdateRoleSetting('trainer', 'auto_checkout_hours', e.target.value === 'shift' ? 'shift' : Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-purple-900 focus:outline-none focus:border-purple-500 cursor-pointer shadow-xs"
                      >
                        <option value="shift">As per Assigned Shift (End Time in Profile)</option>
                        <option value={6}>6.0 Hours</option>
                        <option value={7}>7.0 Hours</option>
                        <option value={8}>8.0 Hours (Standard Shift)</option>
                        <option value={9}>9.0 Hours</option>
                        <option value={10}>10.0 Hours</option>
                        <option value={12}>12.0 Hours</option>
                      </select>
                    </div>
                    {payrollConfig.trainer?.auto_checkout_hours === 'shift' && (
                      <p className="text-[10px] text-purple-600 font-medium text-right">
                        Auto clock-out triggers at shift end time in user profile (e.g. 02:00 PM).
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {/* 3. FACILITY MANAGER SECTION                               */}
          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="bg-white border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-200 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Manager Settings</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      Manager Role
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Late mark threshold and auto-closing shift rules for club managers.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Late Mark Grace Period Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Late Mark Grace Period</span>
                    <span className="text-[11px] text-slate-500 block">
                      Allowed grace buffer after shift start time
                    </span>
                  </div>
                  <select
                    value={payrollConfig.manager?.late_mark_minutes ?? 15}
                    onChange={(e) => handleUpdateRoleSetting('manager', 'late_mark_minutes', Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-blue-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
                  >
                    <option value={0}>0 mins (Strict start)</option>
                    <option value={5}>5 mins Grace</option>
                    <option value={10}>10 mins Grace</option>
                    <option value={15}>15 mins Grace (Standard)</option>
                    <option value={20}>20 mins Grace</option>
                    <option value={30}>30 mins Grace</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Manager arrivals after {payrollConfig.manager?.late_mark_minutes ?? 15} mins grace are flagged for review.
                </p>
              </div>

              {/* Auto Check-Out Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto Check-Out</span>
                    <span className="text-[11px] text-slate-500 block">
                      Auto-close shift when punch out is missed
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!payrollConfig.manager?.auto_checkout}
                      onChange={(e) => handleUpdateRoleSetting('manager', 'auto_checkout', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {payrollConfig.manager?.auto_checkout && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Auto Clock-Out After:
                      </label>
                      <select
                        value={payrollConfig.manager?.auto_checkout_hours ?? 'shift'}
                        onChange={(e) => handleUpdateRoleSetting('manager', 'auto_checkout_hours', e.target.value === 'shift' ? 'shift' : Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-blue-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
                      >
                        <option value="shift">As per Assigned Shift (End Time in Profile)</option>
                        <option value={8}>8.0 Hours</option>
                        <option value={9}>9.0 Hours (Standard Manager Shift)</option>
                        <option value={10}>10.0 Hours</option>
                        <option value={12}>12.0 Hours</option>
                      </select>
                    </div>
                    {payrollConfig.manager?.auto_checkout_hours === 'shift' && (
                      <p className="text-[10px] text-blue-600 font-medium text-right">
                        Auto clock-out triggers at shift end time in user profile (e.g. 02:00 PM).
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {/* 4. ACCOUNTANT & FRONT-DESK SECTION                        */}
          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-100/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200 shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Accountant & Desk Staff Settings</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Accounts Role
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Late grace buffer, daily working hour thresholds, and automatic punch-out.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Late Mark Grace Period Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Late Mark Grace Period</span>
                    <span className="text-[11px] text-slate-500 block">
                      Allowed grace buffer after shift start time
                    </span>
                  </div>
                  <select
                    value={payrollConfig.accounts?.late_mark_minutes ?? 15}
                    onChange={(e) => handleUpdateRoleSetting('accounts', 'late_mark_minutes', Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-amber-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
                  >
                    <option value={0}>0 mins (Strict start)</option>
                    <option value={5}>5 mins Grace</option>
                    <option value={10}>10 mins Grace</option>
                    <option value={15}>15 mins Grace (Standard)</option>
                    <option value={20}>20 mins Grace</option>
                    <option value={30}>30 mins Grace</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Desk arrivals after {payrollConfig.accounts?.late_mark_minutes ?? 15} mins grace will be flagged for payroll.
                </p>
              </div>

              {/* Auto Check-Out Card */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto Check-Out</span>
                    <span className="text-[11px] text-slate-500 block">
                      Auto-close shift when punch out is missed
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!payrollConfig.accounts?.auto_checkout}
                      onChange={(e) => handleUpdateRoleSetting('accounts', 'auto_checkout', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {payrollConfig.accounts?.auto_checkout && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Auto Clock-Out After:
                      </label>
                      <select
                        value={payrollConfig.accounts?.auto_checkout_hours ?? 'shift'}
                        onChange={(e) => handleUpdateRoleSetting('accounts', 'auto_checkout_hours', e.target.value === 'shift' ? 'shift' : Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-amber-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
                      >
                        <option value="shift">As per Assigned Shift (End Time in Profile)</option>
                        <option value={6}>6.0 Hours</option>
                        <option value={7}>7.0 Hours</option>
                        <option value={8}>8.0 Hours (Standard Shift)</option>
                        <option value={9}>9.0 Hours</option>
                        <option value={10}>10.0 Hours</option>
                      </select>
                    </div>
                    {payrollConfig.accounts?.auto_checkout_hours === 'shift' && (
                      <p className="text-[10px] text-amber-600 font-medium text-right">
                        Auto clock-out triggers at shift end time in user profile (e.g. 02:00 PM).
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
