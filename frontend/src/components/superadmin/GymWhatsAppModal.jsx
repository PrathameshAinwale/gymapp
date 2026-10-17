import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Sparkles,
  Check,
  RotateCw,
  Send,
  Smartphone,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';
import { api } from '../../services/api';

export const GymWhatsAppModal = ({ gym, onClose, showToast, onSaved }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showToken, setShowToken] = useState(false);

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

  useEffect(() => {
    if (!gym?.id) return;
    let isMounted = true;

    const fetchGymSettings = async () => {
      setIsLoading(true);
      try {
        const res = await api.superadmin.getWhatsAppSettings(gym.id);
        if (isMounted && res?.data) {
          setSettings({
            provider: res.data.provider || 'ultramsg',
            is_enabled: res.data.is_enabled ?? true,
            instance_id: res.data.instance_id || '',
            api_token: res.data.api_token || '',
            phone_number_id: res.data.phone_number_id || '',
            api_url: res.data.api_url || '',
            auto_send_welcome: res.data.auto_send_welcome ?? true,
            auto_send_birthday: res.data.auto_send_birthday ?? true,
            auto_send_expiry: res.data.auto_send_expiry ?? true,
            auto_send_dues: res.data.auto_send_dues ?? true,
          });
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to load WhatsApp settings for gym ${gym.id}:`, err);
          showToast?.('Failed to load settings: ' + (err.message || 'Server error'));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGymSettings();

    return () => {
      isMounted = false;
    };
  }, [gym?.id]);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setIsSaving(true);
    try {
      const res = await api.superadmin.updateWhatsAppSettings(settings, gym.id);
      if (res?.success) {
        showToast?.(res.message || `WhatsApp settings for ${gym.name} saved successfully!`);
        onSaved?.();
        onClose?.();
      } else {
        showToast?.(res?.message || 'Failed to save settings.');
      }
    } catch (err) {
      showToast?.('Error saving settings: ' + (err.message || 'Server error'));
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
      const res = await api.superadmin.testWhatsAppMessage(testNumber, gym.id);
      setTestResult(res?.result || res);
      if (res?.success) {
        showToast?.(`Live test message dispatched via ${gym.name}'s gateway!`);
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

  if (!gym) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn text-left">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-white text-slate-900 rounded-t-2xl border-b border-slate-200/90 flex items-center justify-between gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900">{gym.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  WhatsApp Automation
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Gym #{gym.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure isolated Instance ID, Auth Key, and notification triggers for this facility
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2.5">
            <RotateCw className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-xs font-bold text-slate-500">Loading {gym.name}'s WhatsApp configuration...</span>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4 flex-1">
            {/* Facility Master Switch */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  Enable WhatsApp Automation for {gym.name}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  When enabled, all member welcome alerts, birthday greetings, and expiry reminders will be sent via this gym's gateway
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.is_enabled}
                  onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">WhatsApp Gateway Provider</label>
                <select
                  value={settings.provider}
                  onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ultramsg">UltraMsg (Instance ID + Auth Token - Recommended)</option>
                  <option value="msg91">MSG91 (AuthKey + Integrated Number)</option>
                  <option value="meta">Meta WhatsApp Business Cloud API</option>
                  <option value="custom">Custom Webhook / REST Gateway</option>
                  <option value="none">Manual WhatsApp Web Link Only</option>
                </select>
              </div>

              {/* Provider Specific Credentials */}
              {settings.provider === 'ultramsg' && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-left">
                  <div className="text-[11px] text-emerald-950 leading-relaxed">
                    <strong>UltraMsg Setup for {gym.name}:</strong> Link this gym's physical WhatsApp account on <a href="https://ultramsg.com" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800">ultramsg.com</a> and paste this gym's <strong>Instance ID</strong> and <strong>Token</strong>.
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
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">UltraMsg Auth Token / Key *</label>
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

              {settings.provider === 'msg91' && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 text-left">
                  <div className="text-[11px] text-indigo-950 leading-relaxed">
                    <strong>MSG91 Setup for {gym.name}:</strong> Enter the MSG91 <strong>AuthKey</strong> and <strong>Integrated WhatsApp Number</strong> for this gym.
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
                  </div>
                </div>
              )}

              {settings.provider === 'meta' && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-sky-50/50 border border-sky-200 text-left">
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
                      <label className="block text-xs font-bold text-slate-700">System User Permanent Token *</label>
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

              {settings.provider === 'custom' && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Webhook / REST Gateway URL *</label>
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

              {/* Automation Trigger Rules */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Automation Triggers for {gym.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Auto Welcome Message</span>
                      <span className="text-[10px] text-slate-500">On new member enrollment</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.auto_send_welcome}
                        onChange={(e) => setSettings({ ...settings, auto_send_welcome: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Daily Birthday Wishes</span>
                      <span className="text-[10px] text-slate-500">Every morning at 9:00 AM</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.auto_send_birthday}
                        onChange={(e) => setSettings({ ...settings, auto_send_birthday: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Expiry Reminders</span>
                      <span className="text-[10px] text-slate-500">7 & 3 days before expiry</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.auto_send_expiry}
                        onChange={(e) => setSettings({ ...settings, auto_send_expiry: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Fee Due Alerts</span>
                      <span className="text-[10px] text-slate-500">For pending invoice balances</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.auto_send_dues}
                        onChange={(e) => setSettings({ ...settings, auto_send_dues: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wide flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSaving ? 'Saving...' : `Save Settings for ${gym.name}`}</span>
                </button>
              </div>
            </form>

            {/* Live Test Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">
                  Test {gym.name}'s Connection
                </span>
              </div>
              <form onSubmit={handleSendTest} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter phone number (e.g. 9834945652)"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isSendingTest || !testNumber}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isSendingTest ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isSendingTest ? 'Testing...' : 'Dispatch Test'}</span>
                </button>
              </form>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono ${
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
                    <span>{testResult.success ? 'Gateway Delivered:' : 'Gateway Reported:'}</span>
                  </div>
                  <div className="text-[11px] truncate mt-1 text-slate-700">
                    {JSON.stringify(testResult)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
