import React, { useState, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { api } from '../../services/api';
import { Settings, Building, Clock, Mail, Phone, Save, ShieldCheck, Bell, Loader2, RotateCw } from 'lucide-react';
import {
  hasSqlInjection,
  isValidEmail,
  isValidPhone,
  preventNonPhoneKey,
  sanitizePhone,
  sanitizeText
} from '../../utils/validation';

export const SettingsManager = () => {
  const { gymInfo, setGymInfo, fetchGymInfo, addToast } = useGymData();
  const [formData, setFormData] = useState({
    name: gymInfo?.name || '',
    tagline: gymInfo?.tagline || '',
    address: gymInfo?.address || '',
    phone: gymInfo?.phone || '',
    email: gymInfo?.email || '',
    operatingHours: gymInfo?.operatingHours || '',
    currency: gymInfo?.currency || '₹',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchGymInfo?.();
  }, [fetchGymInfo]);

  useEffect(() => {
    if (gymInfo) {
      setFormData({
        name: gymInfo.name || '',
        tagline: gymInfo.tagline || '',
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
            name: res.data.name || '',
            tagline: res.data.tagline || '',
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
      addToast('Gym profile & operational settings saved successfully!', 'success');
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

      <form onSubmit={handleSave} className="space-y-3 sm:space-y-6">
        {/* General Business Profile */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-4">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Facility Profile & Branding Details</span>
          </h3>

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
    </div>
  );
};
