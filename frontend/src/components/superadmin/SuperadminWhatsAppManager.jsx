import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Check,
  AlertCircle,
  RotateCw,
  Send,
  Settings,
  Phone,
  Smartphone,
  CheckCircle2,
  Lock,
  Layers,
  Power
} from 'lucide-react';
import { api } from '../../services/api';

export const SuperadminWhatsAppManager = ({ showToast }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testResult, setTestResult] = useState(null);

  const [settings, setSettings] = useState({
    provider: 'msg91',
    is_enabled: true,
    instance_id: '',
    api_token: '',
    phone_number_id: '919834945652',
    api_url: '',
    auto_send_welcome: true,
    auto_send_birthday: true,
    auto_send_expiry: true,
    auto_send_dues: true,
  });

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.superadmin.getWhatsAppSettings();
      if (res?.data) {
        setSettings({
          provider: res.data.provider || 'msg91',
          is_enabled: res.data.is_enabled ?? true,
          instance_id: res.data.instance_id || '',
          api_token: res.data.api_token || '',
          phone_number_id: res.data.phone_number_id || '919834945652',
          api_url: res.data.api_url || '',
          auto_send_welcome: res.data.auto_send_welcome ?? true,
          auto_send_birthday: res.data.auto_send_birthday ?? true,
          auto_send_expiry: res.data.auto_send_expiry ?? true,
          auto_send_dues: res.data.auto_send_dues ?? true,
        });
      }
    } catch (err) {
      console.error('Failed to load superadmin WhatsApp settings:', err);
      showToast?.('Failed to load WhatsApp settings: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setIsSaving(true);
    try {
      const res = await api.superadmin.updateWhatsAppSettings(settings);
      if (res?.success) {
        showToast?.('Platform WhatsApp Gateway & Automation rules updated successfully!');
      }
    } catch (err) {
      showToast?.('Failed to save settings: ' + err.message);
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
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.superadmin.testWhatsAppMessage(testNumber);
      setTestResult(res?.result || res);
      if (res?.success) {
        showToast?.('Test WhatsApp message dispatched successfully via ' + settings.provider.toUpperCase() + '!');
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

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
        <RotateCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs font-bold text-slate-500">Loading Master WhatsApp Gateway Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Master Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-md border border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-wide">
              Centralized Platform WhatsApp Gateway & Automation
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
              Superadmin Control
            </span>
          </div>
          <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
            All member welcome packs, birthday wishes, and expiry notices across all gyms on this platform will be delivered through this centralized gateway account. Individual gym owners cannot modify API credentials.
          </p>
        </div>

        {/* Master Power Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[11px] font-bold block text-white">Platform WhatsApp Engine</span>
            <span className={`text-[10px] font-mono font-bold ${settings.is_enabled ? 'text-emerald-400' : 'text-rose-400'}`}>
              {settings.is_enabled ? 'ACTIVE & ONLINE' : 'PAUSED'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is_enabled}
              onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Gateway Connection Settings */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Gateway API Connection</h4>
                  <p className="text-[11px] text-slate-500">Configure MSG91, UltraMsg, or Meta Cloud API credentials</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                Provider: {settings.provider.toUpperCase()}
              </span>
            </div>

            {/* Provider Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Gateway Provider</label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="msg91">MSG91 (Message91 WhatsApp API - Popular in India)</option>
                <option value="ultramsg">UltraMsg REST API (QR-Code Instant)</option>
                <option value="meta">Meta WhatsApp Business Cloud API</option>
                <option value="custom">Custom Webhook / HTTP REST Gateway</option>
                <option value="none">Manual 1-Click WhatsApp Link Mode</option>
              </select>
            </div>

            {/* Provider Fields */}
            {settings.provider === 'msg91' && (
              <div className="space-y-3 p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-left">
                <div className="text-[11px] text-indigo-900 leading-relaxed">
                  <strong>MSG91 Setup:</strong> Log in to <a href="https://msg91.com" target="_blank" rel="noreferrer" className="underline font-bold">msg91.com</a>. Obtain your <strong>AuthKey</strong> (from Dashboard &gt; Authkeys) and your <strong>Integrated WhatsApp Number</strong> (e.g. <code>919834945652</code>).
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">MSG91 AuthKey *</label>
                  <input
                    type="password"
                    placeholder="Enter your MSG91 AuthKey"
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Integrated WhatsApp Sender Number * (With Country Code)</label>
                  <input
                    type="text"
                    placeholder="e.g. 919834945652"
                    value={settings.phone_number_id}
                    onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Your registered WhatsApp Business number with 91 country code (no + or spaces).</span>
                </div>
              </div>
            )}

            {settings.provider === 'ultramsg' && (
              <div className="space-y-3 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-left">
                <div className="text-[11px] text-emerald-900 leading-relaxed">
                  <strong>UltraMsg Setup:</strong> Log in to <a href="https://ultramsg.com" target="_blank" rel="noreferrer" className="underline font-bold">ultramsg.com</a>, scan your WhatsApp QR code, and enter your Instance ID and Token.
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Instance ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. instance12345"
                    value={settings.instance_id}
                    onChange={(e) => setSettings({ ...settings, instance_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">API Token *</label>
                  <input
                    type="password"
                    placeholder="e.g. abc123token"
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {settings.provider === 'meta' && (
              <div className="space-y-3 p-4 rounded-xl bg-sky-50/60 border border-sky-200 text-left">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Phone Number ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. 109876543210987"
                    value={settings.phone_number_id}
                    onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Permanent Access Token *</label>
                  <input
                    type="password"
                    placeholder="EAAB..."
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {settings.provider === 'custom' && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Webhook / Gateway URL *</label>
                  <input
                    type="text"
                    placeholder="https://api.yourgateway.com/send"
                    value={settings.api_url}
                    onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Bearer Token (Optional)</label>
                  <input
                    type="password"
                    placeholder="Bearer token or API key"
                    value={settings.api_token}
                    onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSaving ? 'Saving Master Settings...' : 'Save Platform Gateway Settings'}</span>
            </button>
          </form>
        </div>

        {/* Right Column (5 Cols): Automation Trigger Rules & Test Dispatcher */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Global Automated Notification Triggers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 text-left">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Platform Automation Rules</h4>
                <p className="text-[11px] text-slate-500">Enable or disable background triggers globally</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Welcome Rule */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Auto New Member Welcome</span>
                  <span className="text-[11px] text-slate-500">Sent instantly on member registration</span>
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
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Auto Daily Birthday Wishes</span>
                  <span className="text-[11px] text-slate-500">Sent automatically every morning at 9:00 AM</span>
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
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Membership Expiry Notices</span>
                  <span className="text-[11px] text-slate-500">Sent 7 & 3 days before validity end</span>
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
            </div>
          </div>

          {/* 2. Live Superadmin Test Dispatcher */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 text-left">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Send Test WhatsApp Message</h4>
                <p className="text-[11px] text-slate-500">Test platform gateway delivery directly to your phone</p>
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
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isSendingTest ? 'Dispatching Test...' : 'Dispatch Test WhatsApp Message'}</span>
              </button>
            </form>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs font-mono ${testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                <div className="font-bold">{testResult.success ? '✓ Gateway Delivered:' : '✗ Dispatch Failed:'}</div>
                <div className="text-[11px] truncate mt-1">{JSON.stringify(testResult)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
