import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { Settings, Building, Clock, Mail, Phone, Save, ShieldCheck, Bell } from 'lucide-react';

export const SettingsManager = () => {
  const { gymInfo, setGymInfo, addToast } = useGymData();
  const [formData, setFormData] = useState({ ...gymInfo });

  const handleSave = (e) => {
    e.preventDefault();
    setGymInfo(formData);
    localStorage.setItem('pulsefit_gymInfo', JSON.stringify(formData));
    addToast('Gym profile & operational settings saved successfully!', 'success');
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
          onClick={handleSave}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Save All Settings</span>
          <span className="inline sm:hidden">Save Settings</span>
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
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
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
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              value={formData.operatingHours || ''}
              onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] truncate">Turnstiles lock automatically outside operational hours.</span>
            </div>
            <span className="font-bold text-[10px] bg-emerald-100 px-2 py-0.5 rounded shrink-0">Auto Gate Sync</span>
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
