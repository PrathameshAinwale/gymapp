import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  Check,
  RotateCw,
  Send,
  Settings,
  Phone,
  Smartphone,
  Building2,
  Search,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { api } from '../../services/api';

export const SuperadminWhatsAppManager = ({ showToast, initialGyms = [] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isGymLoading, setIsGymLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [gymsList, setGymsList] = useState([]);
  const [selectedGymId, setSelectedGymId] = useState(null);
  const [selectedGym, setSelectedGym] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'configured' | 'pending'

  const [testNumber, setTestNumber] = useState('');
  const [testResult, setTestResult] = useState(null);

  const [settings, setSettings] = useState({
    provider: 'ultramsg',
    is_enabled: true,
    instance_id: '',
    api_token: '',
    phone_number_id: '',
    api_url: '',
    auto_send_welcome: true,
    auto_send_birthday: true,
    auto_send_expiry: true,
    auto_send_dues: true,
  });

  // Load facilities and settings
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const res = await api.superadmin.getWhatsAppSettings();
      if (res?.success) {
        const gyms = res.gyms || [];
        setGymsList(gyms);

        const currentGym = res.selected_gym || gyms[0] || null;
        setSelectedGym(currentGym);
        setSelectedGymId(currentGym?.id || null);

        if (res.data) {
          applySettingsData(res.data);
        }
      } else if (initialGyms && initialGyms.length > 0) {
        setGymsList(initialGyms.map(g => ({
          ...g,
          is_configured: false,
          provider: 'none',
          is_enabled: false
        })));
        setSelectedGym(initialGyms[0]);
        setSelectedGymId(initialGyms[0].id);
      }
    } catch (err) {
      console.error('Failed to load superadmin WhatsApp settings:', err);
      showToast?.('Failed to load WhatsApp settings: ' + (err.message || 'Server error'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadGymSettings = async (gymId) => {
    if (!gymId) return;
    setIsGymLoading(true);
    setTestResult(null);
    try {
      const res = await api.superadmin.getWhatsAppSettings(gymId);
      if (res?.success) {
        if (res.selected_gym) {
          setSelectedGym(res.selected_gym);
        } else {
          const match = gymsList.find(g => Number(g.id) === Number(gymId));
          if (match) setSelectedGym(match);
        }

        if (res.gyms) {
          setGymsList(res.gyms);
        }

        if (res.data) {
          applySettingsData(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to load gym WhatsApp settings:', err);
      showToast?.('Failed to load settings for selected gym: ' + (err.message || 'Error'));
    } finally {
      setIsGymLoading(false);
    }
  };

  const applySettingsData = (data) => {
    setSettings({
      provider: data.provider || 'ultramsg',
      is_enabled: data.is_enabled ?? true,
      instance_id: data.instance_id || '',
      api_token: data.api_token || '',
      phone_number_id: data.phone_number_id || '',
      api_url: data.api_url || '',
      auto_send_welcome: data.auto_send_welcome ?? true,
      auto_send_birthday: data.auto_send_birthday ?? true,
      auto_send_expiry: data.auto_send_expiry ?? true,
      auto_send_dues: data.auto_send_dues ?? true,
    });
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectGym = (gym) => {
    if (!gym || Number(gym.id) === Number(selectedGymId)) return;
    setSelectedGymId(gym.id);
    setSelectedGym(gym);
    loadGymSettings(gym.id);
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!selectedGymId) {
      showToast?.('Please select a facility first.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.superadmin.updateWhatsAppSettings(settings, selectedGymId);
      if (res?.success) {
        showToast?.(res.message || `WhatsApp Gateway & Automation for ${selectedGym?.name || 'facility'} saved!`);
        
        // Optimistically update gymsList status
        const hasCredentials = Boolean(
          settings.api_token && (settings.instance_id || settings.phone_number_id || settings.api_url)
        );
        setGymsList(prev => prev.map(g => {
          if (Number(g.id) === Number(selectedGymId)) {
            return {
              ...g,
              is_configured: hasCredentials,
              provider: settings.provider,
              is_enabled: settings.is_enabled,
            };
          }
          return g;
        }));
      } else {
        showToast?.(res?.message || 'Failed to save settings.');
      }
    } catch (err) {
      showToast?.('Failed to save settings: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async (e) => {
    e?.preventDefault?.();
    if (!testNumber) {
      showToast?.('Please enter a phone number to test');
      return;
    }
    if (!selectedGymId) {
      showToast?.('Please select a facility first.');
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.superadmin.testWhatsAppMessage(testNumber, selectedGymId);
      setTestResult(res?.result || res);
      if (res?.success) {
        showToast?.(`Test WhatsApp message dispatched via ${selectedGym?.name || 'facility'}!`);
      } else {
        showToast?.('Dispatch reported: ' + (res?.message || 'Check gateway logs'));
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      showToast?.('Test dispatch failed: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filtered gym list
  const filteredGyms = useMemo(() => {
    return gymsList.filter(g => {
      const matchSearch =
        (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.phone || '').includes(searchQuery);

      if (!matchSearch) return false;
      if (filterStatus === 'configured') return g.is_configured;
      if (filterStatus === 'pending') return !g.is_configured;
      return true;
    });
  }, [gymsList, searchQuery, filterStatus]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = gymsList.length;
    const configured = gymsList.filter(g => g.is_configured).length;
    const pending = total - configured;
    const active = gymsList.filter(g => g.is_enabled && g.is_configured).length;
    return { total, configured, pending, active };
  }, [gymsList]);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
        <RotateCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs font-bold text-slate-500">Loading Facility WhatsApp Gateway Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* ════════════════════════════════════════════════════════════ */}
      {/* Facility Selector Ribbon / Directory                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-800" />
            <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Select Gym Facility to Configure
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              ({filteredGyms.length} of {gymsList.length})
            </span>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search facility name, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('configured')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  filterStatus === 'configured' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Configured
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  filterStatus === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Facility Cards Carousel / Horizontal Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filteredGyms.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-400 w-full">
              No facility found matching "{searchQuery}"
            </div>
          ) : (
            filteredGyms.map((gym) => {
              const isSelected = Number(selectedGymId) === Number(gym.id);
              return (
                <button
                  key={gym.id}
                  onClick={() => handleSelectGym(gym)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left shrink-0 transition-all cursor-pointer flex items-center gap-2.5 min-w-[180px] ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    {gym.name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-xs truncate block max-w-[120px] ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>{gym.name}</span>
                      {gym.is_configured ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Gateway Configured" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Setup Pending" />
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] ${isSelected ? 'text-indigo-700/80' : 'text-slate-500'}`}>
                      <span>{gym.city || 'Facility'}</span>
                      <span>•</span>
                      <span className="font-mono text-[9px] uppercase font-bold">
                        {gym.provider && gym.provider !== 'none' ? gym.provider : 'Not set'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Selected Facility Active Panel                               */}
      {/* ════════════════════════════════════════════════════════════ */}
      {selectedGym && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shadow-2xs shrink-0">
              {selectedGym.name?.charAt(0)?.toUpperCase() || 'G'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-950">{selectedGym.name}</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                  Gym #{selectedGym.id}
                </span>
                {selectedGym.package && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {selectedGym.package}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    settings.is_enabled && (settings.instance_id || settings.phone_number_id)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {settings.is_enabled && (settings.instance_id || settings.phone_number_id)
                    ? '● Active Gateway'
                    : '○ Setup Incomplete'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedGym.city ? `${selectedGym.city} • ` : ''}
                {selectedGym.phone ? `Phone: ${selectedGym.phone} • ` : ''}
                {selectedGym.email ? `Email: ${selectedGym.email}` : ''}
              </p>
            </div>
          </div>

          {/* Master Facility Power Switch */}
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 shrink-0 self-start sm:self-center">
            <div className="text-right">
              <span className="text-[11px] font-bold block text-slate-800">
                Facility WhatsApp Service
              </span>
              <span
                className={`text-[10px] font-mono font-bold ${
                  settings.is_enabled ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {settings.is_enabled ? 'ENABLED FOR THIS GYM' : 'DISABLED'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.is_enabled}
                onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Gateway Connection & Trigger Automation Grid                 */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        {isGymLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-10 flex items-center justify-center rounded-2xl">
            <RotateCw className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        )}

        {/* Left Column (7 Cols): Gateway Connection Settings */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedGym?.name || 'Facility'} Gateway Credentials
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Configure individual Instance ID, Auth Key, and Phone ID for this gym
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                {settings.provider.toUpperCase()}
              </span>
            </div>

            {/* Provider Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">WhatsApp Gateway Provider</label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ultramsg">UltraMsg (Instance ID + Auth Token - Most Popular)</option>
                <option value="msg91">MSG91 (Message91 AuthKey + Integrated Number)</option>
                <option value="meta">Meta WhatsApp Business Cloud API</option>
                <option value="custom">Custom Webhook / REST Gateway</option>
                <option value="none">Manual WhatsApp Web Link Only</option>
              </select>
            </div>

            {/* UltraMsg Provider Fields */}
            {settings.provider === 'ultramsg' && (
              <div className="space-y-3.5 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-left">
                <div className="text-[11px] text-emerald-950 leading-relaxed">
                  <strong>UltraMsg Setup for {selectedGym?.name}:</strong> Each gym can scan their dedicated WhatsApp account on <a href="https://ultramsg.com" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800">ultramsg.com</a>. Enter this gym's specific <strong>Instance ID</strong> and <strong>API Auth Key</strong> below.
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">UltraMsg Instance ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. instance10524"
                    value={settings.instance_id}
                    onChange={(e) => setSettings({ ...settings, instance_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Found on the UltraMsg dashboard for this gym's connected device.</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">UltraMsg Auth Key / Token *</label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showToken ? 'Hide' : 'Show Key'}</span>
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Enter UltraMsg Auth Token"
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* MSG91 Provider Fields */}
            {settings.provider === 'msg91' && (
              <div className="space-y-3.5 p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 text-left">
                <div className="text-[11px] text-indigo-950 leading-relaxed">
                  <strong>MSG91 Setup for {selectedGym?.name}:</strong> Enter the MSG91 <strong>AuthKey</strong> and the registered <strong>Integrated WhatsApp Number</strong> assigned to this gym.
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">MSG91 AuthKey *</label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showToken ? 'Hide' : 'Show Key'}</span>
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Enter MSG91 AuthKey"
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Integrated Sender Number * (e.g. 919834945652)</label>
                  <input
                    type="text"
                    placeholder="919834945652"
                    value={settings.phone_number_id}
                    onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">12-digit number including country code (91) with no + sign.</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Custom MSG91 API URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="Default: https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/"
                    value={settings.api_url}
                    onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Meta Cloud Provider Fields */}
            {settings.provider === 'meta' && (
              <div className="space-y-3.5 p-4 rounded-xl bg-sky-50/50 border border-sky-200 text-left">
                <div className="text-[11px] text-sky-950 leading-relaxed">
                  <strong>Meta Cloud Setup for {selectedGym?.name}:</strong> Configure Meta WhatsApp Business Cloud Phone Number ID and Permanent System User Access Token.
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Meta Phone Number ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. 109876543210987"
                    value={settings.phone_number_id}
                    onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">System User Permanent Token / Auth Key *</label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[10px] text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showToken ? 'Hide' : 'Show Key'}</span>
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="EAAB..."
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* Custom Webhook Fields */}
            {settings.provider === 'custom' && (
              <div className="space-y-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Custom Webhook / REST Endpoint URL *</label>
                  <input
                    type="text"
                    placeholder="https://api.yourgateway.com/send"
                    value={settings.api_url}
                    onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Bearer Token / Auth Key (Optional)</label>
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Bearer token or secret key"
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>
                  {isSaving
                    ? `Saving Settings for ${selectedGym?.name}...`
                    : `SAVE WHATSAPP SETUP FOR ${selectedGym?.name?.toUpperCase() || 'THIS GYM'}`}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (5 Cols): Automation Trigger Rules & Live Test Dispatcher */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Automated Notification Triggers for this Gym */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 text-left">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedGym?.name || 'Facility'} Automation Rules
                </h4>
                <p className="text-[11px] text-slate-500">
                  Enable or pause background automated notifications for this gym
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Welcome Rule */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Auto New Member Welcome</span>
                  <span className="text-[11px] text-slate-500">Sent instantly when a member joins this gym</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.auto_send_welcome}
                    onChange={(e) => setSettings({ ...settings, auto_send_welcome: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Birthday Rule */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Auto Daily Birthday Greetings</span>
                  <span className="text-[11px] text-slate-500">Dispatched morning at 9:00 AM for this gym's members</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.auto_send_birthday}
                    onChange={(e) => setSettings({ ...settings, auto_send_birthday: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Expiry Rule */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Membership Expiry Reminders</span>
                  <span className="text-[11px] text-slate-500">Sent 7 & 3 days before membership validity ends</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.auto_send_expiry}
                    onChange={(e) => setSettings({ ...settings, auto_send_expiry: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Dues Rule */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Payment & Fee Due Alerts</span>
                  <span className="text-[11px] text-slate-500">Sent for pending invoice balances</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.auto_send_dues}
                    onChange={(e) => setSettings({ ...settings, auto_send_dues: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Live Test Dispatcher for this Gym */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 text-left">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Test {selectedGym?.name || 'Facility'} Gateway
                </h4>
                <p className="text-[11px] text-slate-500">
                  Dispatch a live WhatsApp test using this gym's credentials
                </p>
              </div>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter phone number (e.g. 9834945652)"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingTest || !testNumber}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isSendingTest ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>
                  {isSendingTest
                    ? `Testing ${selectedGym?.name}...`
                    : `Dispatch Test via ${selectedGym?.name || 'Facility'}`}
                </span>
              </button>
            </form>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-mono ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.success ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>{testResult.success ? 'Gateway Delivered Successfully:' : 'Dispatch Reported Issue:'}</span>
                </div>
                <div className="text-[11px] truncate mt-1 text-slate-700">
                  {JSON.stringify(testResult)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
