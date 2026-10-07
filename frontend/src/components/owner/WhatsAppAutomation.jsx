import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import {
  MessageSquare,
  MessageCircle,
  Sparkles,
  Send,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Cake,
  Clock,
  AlertTriangle,
  CreditCard,
  UserCheck,
  Users,
  Award,
  Search,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Eye,
  CheckCheck,
  Flame,
  ShieldCheck,
  ChevronRight,
  Filter,
  Check,
  Phone,
  Calendar,
  X,
  Smartphone,
  Share2,
  Zap,
  FileText,
  History,
  User,
  Settings,
  Lock
} from 'lucide-react';
import {
  hasSqlInjection,
  isValidPhone,
  preventNonPhoneKey,
  sanitizePhone,
  sanitizeText
} from '../../utils/validation';
import { getWhatsAppUrl, openWhatsApp } from '../../utils/whatsapp';

const BirthdayAvatar = ({ src, alt, className = "w-10 h-10 rounded-full", iconClassName = "w-5 h-5 text-pink-500" }) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className={`${className} bg-pink-50 border-2 border-pink-200 flex items-center justify-center shrink-0`}>
        <User className={iconClassName} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Avatar"}
      className={`${className} object-cover shrink-0`}
      onError={() => setHasError(true)}
    />
  );
};

export const WhatsAppAutomation = () => {
  const {
    whatsappTemplates = [],
    whatsappTriggers = { summary: {}, triggers: {} },
    whatsappLogs = [],
    whatsappStats = {},
    members = [],
    trainers = [],
    gymInfo,
    fetchWhatsAppTemplates,
    createWhatsAppTemplate,
    updateWhatsAppTemplate,
    deleteWhatsAppTemplate,
    toggleWhatsAppTemplate,
    fetchWhatsAppTriggers,
    logWhatsAppMessage,
    fetchWhatsAppLogs,
    fetchWhatsAppStats,
    broadcastWhatsAppTemplate,
    broadcastWhatsAppDirect,
    processWhatsAppAutoSend,
    whatsappSettings,
    fetchWhatsAppSettings,
    updateWhatsAppSettings,
    testWhatsAppMessage,
    addToast
  } = useGymData();

  const { currentUser } = useAuth();

  // Active Tab: 'templates' | 'triggers' | 'broadcast' | 'settings' | 'logs'
  const [activeTab, setActiveTab] = useState('templates');

  // Filter & Search States
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');
  const [templateRoleFilter, setTemplateRoleFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningAutoTriggers, setIsRunningAutoTriggers] = useState(false);

  // Gateway Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [gatewayForm, setGatewayForm] = useState({
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

  // Sync gatewayForm when whatsappSettings loads
  useEffect(() => {
    if (whatsappSettings) {
      setGatewayForm({
        provider: whatsappSettings.provider || 'ultramsg',
        is_enabled: whatsappSettings.is_enabled ?? true,
        instance_id: whatsappSettings.instance_id || '',
        api_token: whatsappSettings.api_token || '',
        phone_number_id: whatsappSettings.phone_number_id || '',
        api_url: whatsappSettings.api_url || '',
        auto_send_welcome: whatsappSettings.auto_send_welcome ?? true,
        auto_send_birthday: whatsappSettings.auto_send_birthday ?? true,
        auto_send_expiry: whatsappSettings.auto_send_expiry ?? true,
        auto_send_dues: whatsappSettings.auto_send_dues ?? true,
      });
    }
  }, [whatsappSettings]);

  // Template Modal State (Create or Edit)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'birthday',
    target_role: 'member',
    message_body: '',
    is_active: true,
    is_auto_enabled: true,
    timing_trigger: 'on_birthday'
  });

  // Direct Preview / Test Send Modal State
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  // 1-Click Broadcast Dispatch Modal State
  const [oneClickModal, setOneClickModal] = useState({
    isOpen: false,
    template: null,
    targetRole: 'all',
    planName: '',
    customNote: '',
    isBroadcasting: false,
    results: null
  });

  // Broadcaster State
  const [broadcastTarget, setBroadcastTarget] = useState('members_all'); // 'members_all' | 'members_active' | 'trainers' | 'staff'
  const [selectedTemplateForBroadcast, setSelectedTemplateForBroadcast] = useState('');
  const [broadcastCustomNote, setBroadcastCustomNote] = useState('');

  // Current SaaS subscription tier
  const currentTier = gymInfo?.packageTier || gymInfo?.package || currentUser?.packageTier || 'Gold';
  const isPlatinum = true; // Full automation enabled for gym owner

  // Ref for textarea cursor insertion
  const textareaRef = useRef(null);

  useEffect(() => {
    handleRefreshAll();
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      const tasks = [
        fetchWhatsAppTemplates?.(),
        fetchWhatsAppTriggers?.(),
        fetchWhatsAppLogs?.(),
        fetchWhatsAppStats?.(),
        fetchWhatsAppSettings?.(),
        processWhatsAppAutoSend?.()
      ];
      await Promise.allSettled(tasks);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunAutoTriggers = async () => {
    setIsRunningAutoTriggers(true);
    try {
      const res = await processWhatsAppAutoSend?.();
      if (res?.success) {
        addToast(res.message || 'Auto-trigger engine executed successfully!', 'success');
        fetchWhatsAppTriggers?.();
        fetchWhatsAppLogs?.();
        fetchWhatsAppStats?.();
      }
    } catch (err) {
      addToast('Auto-trigger check completed.', 'info');
    } finally {
      setIsRunningAutoTriggers(false);
    }
  };

  const handleSaveGatewaySettings = async (e) => {
    e?.preventDefault?.();
    setIsSavingSettings(true);
    try {
      await updateWhatsAppSettings(gatewayForm);
    } catch (err) {
      // handled by addToast in context
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSendTestMessage = async (e) => {
    e?.preventDefault?.();
    if (!testNumber.trim()) {
      addToast('Please enter a phone number to send the test message.', 'error');
      return;
    }
    setIsSendingTest(true);
    try {
      await testWhatsAppMessage(testNumber.trim());
    } catch (err) {
      // handled in context
    } finally {
      setIsSendingTest(false);
    }
  };

  const getRecipientCountForRole = (role) => {
    const memCount = members.length || 0;
    const coachCount = trainers.length || 0;
    if (role === 'member') return memCount;
    if (role === 'trainer') return coachCount;
    if (role === 'staff') return 5;
    return memCount + coachCount;
  };

  // ── Open Editor Modal ──────────────────────────────────────
  const handleOpenCreateModal = (presetCategory = 'birthday') => {
    setEditingTemplate(null);
    const targetRole = (presetCategory === 'birthday' || presetCategory === 'expiry_reminder') ? 'member' : 'all';
    const defaultName = presetCategory === 'new_plan' 
      ? 'New Gym Membership Plan Announcement'
      : presetCategory === 'birthday' 
        ? 'Member Birthday Celebration Perk'
        : '';

    setFormData({
      name: defaultName,
      category: presetCategory,
      target_role: targetRole,
      message_body: getDefaultMessageBody(presetCategory),
      is_active: true,
      is_auto_enabled: true,
      timing_trigger: getDefaultTiming(presetCategory)
    });
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (tpl) => {
    setEditingTemplate(tpl);
    setFormData({
      name: tpl.name,
      category: tpl.category,
      target_role: tpl.target_role,
      message_body: tpl.message_body,
      is_active: Boolean(tpl.is_active),
      is_auto_enabled: Boolean(tpl.is_auto_enabled),
      timing_trigger: tpl.timing_trigger || 'manual'
    });
    setIsEditorOpen(true);
  };

  const getDefaultMessageBody = (cat) => {
    switch (cat) {
      case 'new_plan':
        return `*Special Announcement from {{gym_name}}!* 🚀\n\nHello {{name}},\n\nWe are thrilled to launch our brand-new membership plan: *{{plan_name}}*! 🏋️‍♂️✨\n\nExperience upgraded workout zones, elite coaching guidance, and premium fitness perks designed to fast-track your health goals.\n\n🔥 *Special Launch Offer*: Upgrade or enroll this week to lock in exclusive founder pricing!\n\n📲 Visit front desk or explore at {{portal_url}}\nLet's crush your fitness goals together!`;
      case 'birthday':
        return `*Happy Birthday {{name}}!*\n\nWishing you strength, great health, and limitless PRs this year from all of us at *{{gym_name}}*!\n\nDrop by reception today for a special birthday workout perk! Enjoy your day!`;
      case 'expiry_reminder':
        return `Hi *{{name}}*,\n\nYour *{{gym_name}}* membership for {{plan_name}} expires in *{{days_left}} days* ({{expiry_date}}).\n\nRenew this week to maintain uninterrupted gym access and unlock loyalty perks!`;
      case 'welcome':
        return `*Welcome to {{gym_name}}, {{name}}!*\n\nYour *{{plan_name}}* membership is active! Scan your QR code at turnstile gates to enter.\n\nLet's crush your fitness goals together!`;
      case 'fee_due':
        return `*Payment Reminder*\n\nDear *{{name}}*,\n\nA gentle reminder that an outstanding dues amount of *{{dues_amount}}* is pending on your *{{gym_name}}* account.\n\nKindly clear at the desk or via UPI to keep your access seamless. Thank you!`;
      case 'absentee':
        return `*We miss you at {{gym_name}}, {{name}}!*\n\nConsistency is key to results. We noticed you haven't checked in recently. Your workout floor is ready — let's get back on track this week!`;
      default:
        return `*Announcement from {{gym_name}}*\n\nHello {{name}},\n\nWe have exciting updates for you! Check your athlete dashboard or visit front desk for details.\n\nStay strong!`;
    }
  };

  const renderCategoryBadge = (category) => {
    switch (category) {
      case 'new_plan':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-600" />
            <span>New Plan / Offer</span>
          </span>
        );
      case 'birthday':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 border border-pink-200 flex items-center gap-1">
            <Cake className="w-3 h-3 text-pink-600" />
            <span className="capitalize">{category.replace('_', ' ')}</span>
          </span>
        );
      case 'expiry_reminder':
      case 'membership_expired':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span className="capitalize">{category.replace('_', ' ')}</span>
          </span>
        );
      case 'welcome':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span className="capitalize">{category.replace('_', ' ')}</span>
          </span>
        );
      case 'fee_due':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-rose-600" />
            <span className="capitalize">{category.replace('_', ' ')}</span>
          </span>
        );
      case 'absentee':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-600" />
            <span className="capitalize">{category.replace('_', ' ')}</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-sky-600" />
            <span className="capitalize">{category.replace('_', ' ')}</span>
          </span>
        );
    }
  };

  const getDefaultTiming = (cat) => {
    if (cat === 'birthday') return 'on_birthday';
    if (cat === 'new_plan') return 'on_new_plan';
    if (cat === 'expiry_reminder') return 'days_before_expiry_7';
    if (cat === 'welcome') return 'on_signup';
    if (cat === 'fee_due') return 'on_dues_pending';
    return 'manual';
  };

  // ── Insert Variable Tag at Cursor ───────────────────────────
  const handleInsertVariable = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData((prev) => ({ ...prev, message_body: prev.message_body + tag }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.message_body;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const updated = before + tag + after;
    setFormData((prev) => ({ ...prev, message_body: updated }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // ── Save Template ──────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message_body.trim()) {
      addToast('Please provide a template title and message content.', 'error');
      return;
    }

    if (hasSqlInjection(formData.name)) {
      alert('Security Warning: SQL or script injection characters detected in template title.');
      return;
    }

    setIsSaving(true);
    try {
      const sanitized = {
        ...formData,
        name: sanitizeText(formData.name),
        message_body: sanitizeText(formData.message_body)
      };
      if (editingTemplate) {
        await updateWhatsAppTemplate(editingTemplate.id, sanitized);
      } else {
        await createWhatsAppTemplate(sanitized);
      }
      setIsEditorOpen(false);
    } catch (err) {
      // toast already handled in context
    } finally {
      setIsSaving(false);
    }
  };

  // ── 1-Click Broadcast Handlers ─────────────────────────────
  const handleOpenOneClickBroadcast = (tpl) => {
    setOneClickModal({
      isOpen: true,
      template: tpl,
      targetRole: tpl.target_role || 'all',
      planName: tpl.category === 'new_plan' ? 'Elite All-Access Plan' : '',
      customNote: '',
      isBroadcasting: false,
      results: null
    });
  };

  const handleExecuteOneClickBroadcast = async () => {
    if (!oneClickModal.template) return;
    setOneClickModal((prev) => ({ ...prev, isBroadcasting: true }));
    try {
      const res = await broadcastWhatsAppTemplate(oneClickModal.template.id, {
        target_role: oneClickModal.targetRole,
        plan_name: oneClickModal.planName,
        custom_note: oneClickModal.customNote
      });
      if (res?.success) {
        setOneClickModal((prev) => ({
          ...prev,
          isBroadcasting: false,
          results: res.recipients || []
        }));
        await handleRefreshAll();
      }
    } catch (err) {
      setOneClickModal((prev) => ({ ...prev, isBroadcasting: false }));
    }
  };

  const handleSaveAndBroadcastNow = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim() || !formData.message_body.trim()) {
      addToast('Please provide a template title and message content.', 'error');
      return;
    }
    if (hasSqlInjection(formData.name)) {
      alert('Security Warning: SQL or script injection characters detected in template title.');
      return;
    }

    setIsSaving(true);
    try {
      const sanitized = {
        ...formData,
        name: sanitizeText(formData.name),
        message_body: sanitizeText(formData.message_body)
      };
      let savedTpl = null;
      if (editingTemplate) {
        savedTpl = await updateWhatsAppTemplate(editingTemplate.id, sanitized);
      } else {
        savedTpl = await createWhatsAppTemplate(sanitized);
      }
      setIsEditorOpen(false);

      if (savedTpl) {
        handleOpenOneClickBroadcast(savedTpl);
      }
    } catch (err) {
      // toast handled
    } finally {
      setIsSaving(false);
    }
  };

  // ── Duplicate Template ─────────────────────────────────────
  const handleDuplicate = async (tpl) => {
    try {
      await createWhatsAppTemplate({
        name: `${tpl.name} (Copy)`,
        category: tpl.category,
        target_role: tpl.target_role,
        message_body: tpl.message_body,
        is_active: true,
        is_auto_enabled: false,
        timing_trigger: tpl.timing_trigger
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ── Delete Template ────────────────────────────────────────
  const handleDeleteTemplate = async (tpl) => {
    if (window.confirm(`Are you sure you want to delete template "${tpl.name}"?`)) {
      await deleteWhatsAppTemplate(tpl.id);
    }
  };

  // ── 1-Click Launch WhatsApp and Log ────────────────────────
  const handleSendWhatsApp = (item, triggerType = 'manual') => {
    if (!item.wa_link) {
      addToast(`No valid phone number for ${item.name}`, 'error');
      return;
    }

    // Open WhatsApp in new tab/app window
    window.open(item.wa_link, '_blank', 'noopener,noreferrer');

    // Record in audit log
    logWhatsAppMessage({
      template_id: item.template_id || null,
      recipient_id: item.user_id || null,
      recipient_name: item.name,
      recipient_phone: item.phone,
      recipient_role: item.role || 'member',
      category: item.category || (triggerType.includes('birthday') ? 'birthday' : 'custom'),
      message: item.message,
      trigger_type: triggerType,
      status: 'sent'
    });
  };

  // ── Send to All Celebrants / Batch Runner ───────────────────
  const [isBatchSending, setIsBatchSending] = useState(false);
  const handleSendToAllBirthdays = async () => {
    const pendingCelebrants = (whatsappTriggers?.triggers?.birthdays || []).filter((b) => !b.is_sent);
    if (pendingCelebrants.length === 0) {
      addToast('All birthday greetings for today have already been sent!', 'info');
      return;
    }

    setIsBatchSending(true);
    try {
      for (const celebrant of pendingCelebrants) {
        if (celebrant.wa_link) {
          window.open(celebrant.wa_link, '_blank');
          await logWhatsAppMessage({
            recipient_id: celebrant.user_id,
            recipient_name: celebrant.name,
            recipient_phone: celebrant.phone,
            recipient_role: celebrant.role,
            category: 'birthday',
            message: celebrant.message,
            trigger_type: 'automated_birthday',
            status: 'sent'
          });
          // brief pause between tab launches to prevent browser popup block
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
      addToast(`Dispatched birthday greetings to ${pendingCelebrants.length} celebrants!`, 'success');
    } finally {
      setIsBatchSending(false);
    }
  };

  // ── Dynamic WhatsApp Preview Renderer ──────────────────────
  const renderPreviewText = (templateText, sampleOverrides = {}) => {
    const gymName = gymInfo?.name || 'PulseFit Pro';
    const sample = {
      '{{name}}': sampleOverrides.name || 'Rahul Sharma',
      '{{gym_name}}': gymName,
      '{{role}}': sampleOverrides.role || 'Member',
      '{{plan_name}}': sampleOverrides.plan || 'Gold Annual All-Access',
      '{{expiry_date}}': sampleOverrides.expiry || '28 Sep 2026',
      '{{days_left}}': sampleOverrides.daysLeft || '6',
      '{{dues_amount}}': sampleOverrides.dues || '₹1,500.00',
      '{{date}}': new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      '{{trainer_name}}': 'Coach Alex Rivers',
      '{{phone}}': sampleOverrides.phone || '+91 98765 43210',
      '{{portal_url}}': window.location.origin
    };

    let result = templateText || '';
    Object.entries(sample).forEach(([tag, val]) => {
      result = result.split(tag).join(val);
    });
    return result;
  };

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return whatsappTemplates.filter((t) => {
      const matchCat = templateCategoryFilter === 'ALL' || t.category === templateCategoryFilter;
      const matchRole = templateRoleFilter === 'ALL' || t.target_role === templateRoleFilter || t.target_role === 'all';
      const matchSearch =
        !searchTerm ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.message_body.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchRole && matchSearch;
    });
  }, [whatsappTemplates, templateCategoryFilter, templateRoleFilter, searchTerm]);

  // Telemetry counts
  const birthdaysTodayCount = whatsappTriggers?.summary?.birthdays_today ?? whatsappStats?.birthdays_today ?? 0;
  const expiringSoonCount = whatsappTriggers?.summary?.expiring_soon ?? whatsappStats?.expiring_soon ?? 0;
  const pendingDuesCount = whatsappTriggers?.summary?.pending_dues ?? 0;
  const absenteesCount = whatsappTriggers?.summary?.absentees ?? 0;
  const birthdayCelebrants = whatsappTriggers?.triggers?.birthdays || [];
  const birthdayCelebrantsNames = birthdayCelebrants.map((b) => b.name).filter(Boolean).join(', ');

  return (
    <div className="space-y-4 animate-fadeIn pb-16 w-full">
      {/* ── Top Header Banner ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  WhatsApp & Templates
                </h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline-flex ${
                  isPlatinum
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  {isPlatinum ? 'Automated' : 'Templates'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Member & trainer birthday greetings, expiry renewal alerts, and fee notices with 1-click dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh triggers and templates"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
              <span>{isRefreshing ? 'Scanning...' : 'Sync Triggers'}</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal('birthday')}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </div>
        </div>

      {/* Metric Ribbon Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Birthdays Today Highlight Card */}
        <div
          onClick={() => setActiveTab('triggers')}
          className={`cursor-pointer rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all border shadow-sm ${
            birthdaysTodayCount > 0
              ? 'bg-white border-pink-300 hover:border-pink-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Today's Birthdays
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200 flex items-center justify-center shrink-0">
              <Cake className="w-4 h-4 text-pink-500" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
            <span className="text-lg sm:text-2xl font-black text-slate-900">{birthdaysTodayCount}</span>
            <span className={`text-[11px] font-medium ${birthdaysTodayCount > 0 ? 'text-pink-600 font-bold' : 'text-slate-400'}`}>
              {birthdaysTodayCount > 0 ? 'Celebrants today!' : 'No birthdays today'}
            </span>
          </div>
        </div>

        {/* Expiring Soon Card */}
        <div
          onClick={() => setActiveTab('triggers')}
          className="cursor-pointer bg-white border border-slate-200 hover:border-amber-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Expiring in 7 Days
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
            <span className="text-lg sm:text-2xl font-black text-slate-900">{expiringSoonCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">Renewals pending</span>
          </div>
        </div>

        {/* Active Templates Card */}
        <div
          onClick={() => setActiveTab('templates')}
          className="cursor-pointer bg-white border border-slate-200 hover:border-emerald-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Active Templates
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
            <span className="text-lg sm:text-2xl font-black text-slate-900">
              {whatsappTemplates.filter((t) => t.is_active).length}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              of {whatsappTemplates.length} total
            </span>
          </div>
        </div>

        {/* Total Dispatches Card */}
        <div
          onClick={() => setActiveTab('logs')}
          className="cursor-pointer bg-white border border-slate-200 hover:border-sky-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Messages Sent
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0">
              <CheckCheck className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
            <span className="text-lg sm:text-2xl font-black text-slate-900">
              {whatsappStats?.total_sent ?? whatsappLogs.length}
            </span>
            <span className="text-[11px] text-sky-700 font-medium">
              {whatsappStats?.sent_today ?? 0} sent today
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'templates', label: 'Message Templates', icon: FileText, count: whatsappTemplates.length },
          { id: 'triggers', label: "Today's Birthdays (Database Match)", icon: Cake, count: birthdaysTodayCount },
          { id: 'broadcast', label: 'Instant Broadcaster', icon: Send },
          { id: 'settings', label: 'Automation Preferences', icon: Settings },
          { id: 'logs', label: 'Delivery Audit Logs', icon: History, count: whatsappLogs.length }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main Tab Content ───────────────────────────────────── */}
      <div>
        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: DAILY TRIGGER CENTER                              */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'triggers' && (
          <div className="space-y-6">
            {/* Automated Daily Birthday & Trigger Engine Status Banner */}
            <div className="rounded-xl sm:rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/60 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {isPlatinum
                        ? 'Automated Member Birthday & Daily Trigger Engine (Platinum Plan)'
                        : 'Manual WhatsApp Template Sending Mode (Gold Plan)'}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isPlatinum
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {isPlatinum ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          100% AUTOMATED & RUNNING
                        </>
                      ) : (
                        'MANUAL 1-CLICK MODE'
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isPlatinum
                      ? "When a member's birthday arrives, their personalized WhatsApp greeting is automatically dispatched in the background and recorded in audit logs."
                      : "In the Gold Plan, template messages are dispatched manually via 1-Click WhatsApp buttons. Full background automation runs automatically on the Platinum Plan."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                {isPlatinum ? (
                  <button
                    onClick={handleRunAutoTriggers}
                    disabled={isRunningAutoTriggers}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Run auto-scan and greeting dispatch for today"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRunningAutoTriggers ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
                    <span>{isRunningAutoTriggers ? 'Executing Trigger...' : 'Run Auto-Trigger Check'}</span>
                  </button>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Upgrade to Platinum for 100% Auto-Send</span>
                  </div>
                )}
              </div>
            </div>

            {/* Architecture Clarification Callout */}
            <div className="rounded-xl sm:rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-blue-50/70 p-4 sm:p-5 shadow-2xs flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Single Master Birthday Template Architecture</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold border border-sky-200">
                    No Separate Triggers Needed
                  </span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You do <strong>not</strong> need to configure individual triggers or separate templates for each person (no trigger for Atharva Patil, no trigger for Test). There is strictly <strong>one single Birthday Template</strong> in Message Templates.
                  Every day, the system checks the database for members whose Date of Birth matches today. When found, their name is dynamically swapped into <code className="bg-sky-100 text-sky-900 px-1 py-0.5 rounded font-mono font-bold">&#123;&#123;name&#125;&#125;</code> and dispatched to their WhatsApp number.
                </p>
              </div>
            </div>

            {/* 1. Birthday Celebration Hub */}
            <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 shadow-2xs">
                    <Cake className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Today's Birthday Stars</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-semibold">
                        {birthdaysTodayCount} Celebrant{birthdaysTodayCount !== 1 ? 's' : ''}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Members and trainers with birthdays today. Automated wishes personalized with gym perk.
                    </p>
                  </div>
                </div>

                {birthdaysTodayCount > 0 && (
                  <button
                    onClick={handleSendToAllBirthdays}
                    disabled={isBatchSending}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-pink-600/20 active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isBatchSending ? 'Dispatching...' : 'Send All Birthday Wishes'}</span>
                  </button>
                )}
              </div>

              {/* Birthday List Cards */}
              {whatsappTriggers?.triggers?.birthdays?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whatsappTriggers.triggers.birthdays.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white p-4 flex flex-col justify-between hover:border-pink-300 transition-all shadow-2xs group"
                    >
                      <div>
                        {/* Member Header */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <BirthdayAvatar
                              src={item.avatar}
                              alt={item.name}
                              className="w-10 h-10 rounded-full border-2 border-pink-200 shadow-2xs"
                              iconClassName="w-5 h-5 text-pink-500"
                            />
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-pink-600 transition-colors">
                                {item.name}
                              </h3>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                                    item.role === 'trainer'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {item.role}
                                </span>
                                <span>Turning {item.age} today</span>
                              </div>
                            </div>
                          </div>

                          {/* Sent Status Badge */}
                          {item.is_sent ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Sent Today
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-medium">
                              Pending
                            </span>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.phone || 'No phone number'}</span>
                        </div>

                        {/* Message Preview Box */}
                        <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 leading-relaxed font-sans line-clamp-3">
                          {item.message}
                        </div>

                        {/* Dynamic Substitution Indicator */}
                        <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-pink-50/80 border border-pink-100 flex items-center justify-between text-[11px] text-pink-950 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                            <span>Dynamic &#123;&#123;name&#125;&#125; → <strong>{item.name}</strong></span>
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">DOB: {item.dob || 'Today'}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setPreviewTemplate({
                              name: `Birthday greeting for ${item.name}`,
                              message_body: item.message,
                              sampleOverrides: { name: item.name, phone: item.phone, role: item.role }
                            });
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => handleSendWhatsApp(item, 'automated_birthday')}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Send WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center">
                  <Cake className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No member or trainer birthdays today.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Birthdays are automatically scanned based on Date of Birth recorded in Member Directory.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Membership Expiry Reminders (1 to 7 Days) */}
            <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Membership Expiry Reminders</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        {expiringSoonCount} Expiring Soon
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Members scheduled to expire in the next 1–7 days. Prompt renewal to keep momentum.
                    </p>
                  </div>
                </div>
              </div>

              {whatsappTriggers?.triggers?.expiring?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whatsappTriggers.triggers.expiring.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white p-4 flex flex-col justify-between hover:border-amber-300 transition-all shadow-2xs group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                            {item.name}
                          </h3>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            Expires in {item.days_left}d
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Plan: <span className="text-slate-800 font-semibold">{item.plan_name}</span> | Expiry: {item.expiry_date}
                        </div>
                        <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.phone}</span>
                        </div>
                        <div className="mt-3 p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 line-clamp-3">
                          {item.message}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={() => handleSendWhatsApp(item, 'automated_expiry')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Send Expiry Alert</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No memberships expiring in the next 7 days.
                </div>
              )}
            </div>

            {/* 3. Outstanding Fee Dues & Inactivity Triggers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Fee Dues */}
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                  <CreditCard className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Pending Fee Notices</h3>
                    <p className="text-[11px] text-slate-500">Members with pending dues</p>
                  </div>
                </div>

                {whatsappTriggers?.triggers?.dues?.length > 0 ? (
                  <div className="space-y-3">
                    {whatsappTriggers.triggers.dues.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-rose-600 font-bold">
                            Due: ₹{Number(item.dues_amount).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendWhatsApp(item, 'fee_due')}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Send Notice</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-500 text-xs">No pending fee balances found.</div>
                )}
              </div>

              {/* Absentee / Miss You */}
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Inactive Members (7+ Days)</h3>
                    <p className="text-[11px] text-slate-500">Re-engage athletes who haven't visited recently</p>
                  </div>
                </div>

                {whatsappTriggers?.triggers?.absentees?.length > 0 ? (
                  <div className="space-y-3">
                    {whatsappTriggers.triggers.absentees.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500">Last visited: {item.last_seen}</div>
                        </div>
                        <button
                          onClick={() => handleSendWhatsApp(item, 'absentee')}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Send Reconnect</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-500 text-xs">All active members visited recently!</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 2: TEMPLATES HUB                                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'ALL', label: 'All Templates', icon: null },
                  { id: 'new_plan', label: 'New Plan / Offer', icon: Zap },
                  { id: 'birthday', label: 'Birthday', icon: Cake },
                  { id: 'expiry_reminder', label: 'Expiry Reminder', icon: Clock },
                  { id: 'welcome', label: 'Welcome', icon: Sparkles },
                  { id: 'fee_due', label: 'Fee Due', icon: CreditCard },
                  { id: 'absentee', label: 'Inactivity', icon: Flame },
                  { id: 'custom', label: 'Announcement', icon: MessageSquare }
                ].map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setTemplateCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                        templateCategoryFilter === cat.id
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Audience */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 w-48 md:w-56"
                  />
                </div>

                <select
                  value={templateRoleFilter}
                  onChange={(e) => setTemplateRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="member">Members</option>
                  <option value="trainer">Trainers</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>

            {/* Template Cards Grid */}
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTemplates.map((tpl) => {
                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-xl sm:rounded-2xl border bg-white p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm ${
                        tpl.is_active ? 'border-slate-200 hover:border-emerald-300' : 'border-slate-200/50 opacity-60'
                      }`}
                    >
                      <div>
                        {/* Header: Title & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              {tpl.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {renderCategoryBadge(tpl.category)}
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {tpl.target_role}
                              </span>
                              {tpl.category === 'birthday' ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 border border-pink-300 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-pink-600" />
                                  <span>1 Master Dynamic Template</span>
                                </span>
                              ) : (
                                tpl.is_auto_enabled && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-sky-600" />
                                    <span>Auto Trigger</span>
                                  </span>
                                )
                              )}
                            </div>
                          </div>

                          {/* Active Toggle Switch */}
                          <button
                            onClick={() => toggleWhatsAppTemplate(tpl.id, 'is_active')}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                              tpl.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            title={tpl.is_active ? 'Template is Active' : 'Template is Disabled'}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                tpl.is_active ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Message Preview Box */}
                        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line line-clamp-5 select-text">
                          {tpl.message_body}
                        </div>

                        {/* Dynamic Database Birthday Auto-Scan Callout */}
                        {tpl.category === 'birthday' && (
                          <div className="mt-3 p-3 rounded-xl bg-pink-50/80 border border-pink-200 text-xs text-pink-950 space-y-1.5">
                            <div className="flex items-center justify-between font-bold text-pink-900">
                              <span className="flex items-center gap-1.5 text-xs">
                                <Cake className="w-3.5 h-3.5 text-pink-600" />
                                <span>1 Template Powers All Celebrants</span>
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-200 text-pink-800 font-bold uppercase tracking-wider">
                                Dynamic &#123;&#123;name&#125;&#125;
                              </span>
                            </div>
                            <p className="text-[11px] text-pink-800 leading-snug">
                              No separate triggers or templates per person. The system queries the database daily for matching birthdays. When found, this single template sends to that user with <code className="bg-pink-100 text-pink-900 px-1 py-0.2 rounded font-mono font-bold">&#123;&#123;name&#125;&#125;</code> swapped dynamically.
                            </p>
                            {birthdayCelebrants.length > 0 && (
                              <div className="pt-1.5 border-t border-pink-200/70 flex flex-wrap items-center justify-between gap-1 text-[11px] text-pink-900">
                                <span className="font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Today in Database: {birthdayCelebrants.map((b) => b.name).join(', ')}
                                </span>
                                <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-1.5 py-0.5 rounded">
                                  {birthdayCelebrants.length} Found Today
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewTemplate(tpl)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Preview on phone screen"
                          >
                            <Smartphone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(tpl)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Duplicate template"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {tpl.category === 'birthday' ? (
                            <button
                              onClick={handleSendToAllBirthdays}
                              disabled={isBatchSending || birthdaysTodayCount === 0}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ${
                                birthdaysTodayCount > 0
                                  ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/20'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              }`}
                              title={
                                birthdaysTodayCount > 0
                                  ? `Auto-send birthday greetings to today's ${birthdaysTodayCount} celebrant(s)`
                                  : 'No member birthdays in database today'
                              }
                            >
                              <Send className="w-3 h-3" />
                              <span>
                                {isBatchSending ? 'Dispatching...' : `Auto-Send Today's Birthdays (${birthdaysTodayCount})`}
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenOneClickBroadcast(tpl)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                              title={`1-Click Broadcast to all ${tpl.target_role === 'all' ? 'users' : tpl.target_role + 's'}`}
                            >
                              <Send className="w-3 h-3" />
                              <span>1-Click Send ({getRecipientCountForRole(tpl.target_role)})</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(tpl)}
                            className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No templates found"
                description="Create your first automated message template or adjust your filters."
                action={
                  <button
                    onClick={() => handleOpenCreateModal('birthday')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                  >
                    Create Template
                  </button>
                }
              />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 3: INSTANT BROADCASTER                                */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                Broadcast & Direct Messenger
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select a target audience segment, pick a template, and send directly via WhatsApp.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* 1. Target Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Target Segment</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'members_all', label: `All Members (${members.length})`, icon: Users },
                      {
                        id: 'members_active',
                        label: `Active Members (${members.filter((m) => m.status === 'Active').length})`,
                        icon: UserCheck
                      },
                      { id: 'trainers', label: `Coaches & Trainers (${trainers.length})`, icon: Award },
                      { id: 'custom_person', label: 'Select Specific Person', icon: Phone }
                    ].map((seg) => {
                      const isSelected = broadcastTarget === seg.id;
                      const Icon = seg.icon;
                      return (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() => setBroadcastTarget(seg.id)}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-emerald-600" />
                          <span>{seg.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 2. Choose Template */}
                  <div className="mt-5">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Select Template</label>
                    <select
                      value={selectedTemplateForBroadcast}
                      onChange={(e) => setSelectedTemplateForBroadcast(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Choose an active template --</option>
                      {whatsappTemplates
                        .filter((t) => t.is_active)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category} - {t.target_role})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Populated Message Preview</label>
                  <div className="h-56 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans overflow-y-auto whitespace-pre-line select-text">
                    {selectedTemplateForBroadcast ? (
                      renderPreviewText(
                        whatsappTemplates.find((t) => String(t.id) === String(selectedTemplateForBroadcast))
                          ?.message_body || ''
                      )
                    ) : (
                      <span className="text-slate-400 italic">Select a template to view the preview.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recipient Launch Queue */}
              <div className="mt-8 pt-5 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Segment Recipients Ready to Dispatch</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(broadcastTarget.includes('member') ? members : trainers).slice(0, 15).map((person) => {
                    const templateObj = whatsappTemplates.find(
                      (t) => String(t.id) === String(selectedTemplateForBroadcast)
                    );
                    const waLink = person.phone ? getWhatsAppUrl(person.phone, rendered) : null;

                    return (
                      <div
                        key={person.id}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            {person.name?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{person.name}</div>
                            <div className="text-[11px] text-slate-500">{person.phone || 'No phone'}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (!waLink) {
                              addToast('No valid phone number', 'error');
                              return;
                            }
                            window.open(waLink, '_blank');
                            logWhatsAppMessage({
                              recipient_id: person.userId || person.id,
                              recipient_name: person.name,
                              recipient_phone: person.phone,
                              recipient_role: broadcastTarget.includes('member') ? 'member' : 'trainer',
                              category: templateObj?.category || 'custom',
                              message: rendered,
                              trigger_type: 'broadcast',
                              status: 'sent'
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors active:scale-95 shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Send WA</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 4: DELIVERY AUDIT LOGS                                */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                WhatsApp Message History & Audit Trail ({whatsappLogs.length})
              </h2>
              <button
                onClick={fetchWhatsAppLogs}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                <span>Refresh Logs</span>
              </button>
            </div>

            {whatsappLogs.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Trigger Type</th>
                        <th className="px-4 py-3">Message Snippet</th>
                        <th className="px-4 py-3">Sent At</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {whatsappLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{log.recipient_name}</div>
                            <div className="text-[11px] text-slate-500">{log.recipient_phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {log.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-slate-500 font-medium">{log.trigger_type}</span>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-[11px] text-slate-700">
                            {log.message}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                            {log.sent_at
                              ? new Date(log.sent_at).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Just now'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Dispatched
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No dispatched WhatsApp messages logged yet.
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 5: AUTOMATION & GATEWAY SETTINGS                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Engine Overview Header */}
            <div className="rounded-xl sm:rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/60 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      WhatsApp Background Dispatch Engine
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      AUTO-DISPATCH ENABLED
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure automated notifications for new member joins and daily birthday wishes without any user intervention.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunAutoTriggers}
                  disabled={isRunningAutoTriggers}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRunningAutoTriggers ? 'animate-spin' : ''}`} />
                  <span>{isRunningAutoTriggers ? 'Running Engine...' : 'Scan & Run Today’s Triggers'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Automation Triggers & Rules */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Automated Notification Triggers */}
                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Automated Notification Rules</h4>
                        <p className="text-[11px] text-slate-500">Enable or disable hands-free background triggers</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Welcome Rule */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-200 transition-all flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">New Member Welcome Notification</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Instant</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          When a new member registers, instantly sends their personalized Welcome Pack, membership plan details, turnstile QR access pass, and operating hours.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={gatewayForm.auto_send_welcome}
                          onChange={(e) => setGatewayForm({ ...gatewayForm, auto_send_welcome: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Birthday Rule */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-pink-200 transition-all flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">Daily Member Birthday Wishes</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-100 text-pink-800">Daily 9:00 AM</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Automatically checks the database every morning. When a member or trainer celebrates a birthday today, their greeting with custom gym perk is dispatched without human intervention.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={gatewayForm.auto_send_birthday}
                          onChange={(e) => setGatewayForm({ ...gatewayForm, auto_send_birthday: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Expiry Rule */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-amber-200 transition-all flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">Membership Expiry Notices</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">7 & 3 Days Before</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Sends renewal reminders before turnstile deactivation so members can renew without friction.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={gatewayForm.auto_send_expiry}
                          onChange={(e) => setGatewayForm({ ...gatewayForm, auto_send_expiry: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Dues Rule */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-rose-200 transition-all flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">Outstanding Balance & Fee Reminders</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">On Dues Pending</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Notifies members with outstanding balances to clear dues via UPI or front desk.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={gatewayForm.auto_send_dues}
                          onChange={(e) => setGatewayForm({ ...gatewayForm, auto_send_dues: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Live Test Dispatcher */}
                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Send Test WhatsApp Message</h4>
                      <p className="text-[11px] text-slate-500">Test live delivery to your own phone number in real-time</p>
                    </div>
                  </div>

                  <form onSubmit={handleSendTestMessage} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Enter phone number (e.g. 9876543210)"
                        value={testNumber}
                        onChange={(e) => setTestNumber(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingTest || !testNumber}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isSendingTest ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Test Message</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column (5 cols): Centralized Platform Gateway Status */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Platform Gateway Status</h4>
                        <p className="text-[11px] text-slate-500">Centralized Superadmin Gateway</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      CONNECTED
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/50 border border-indigo-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Gateway Service:</span>
                      <span className="font-bold text-indigo-900 font-mono">
                        {gatewayForm.provider === 'msg91'
                          ? 'MSG91 Enterprise WhatsApp'
                          : gatewayForm.provider === 'ultramsg'
                          ? 'UltraMsg Cloud Gateway'
                          : gatewayForm.provider === 'meta'
                          ? 'Meta WhatsApp Cloud API'
                          : 'Platform WhatsApp Gateway'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Sender Number:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {gatewayForm.phone_number_id ? `+${gatewayForm.phone_number_id}` : 'Verified Platform Business'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Gateway Routing:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600" /> Managed by Superadmin
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                    <strong>Note:</strong> Delivery credentials and API keys are maintained centrally by your system administrator. Your facility’s automated welcome messages and birthday wishes are routed automatically without requiring any manual setup.
                  </div>

                  <form onSubmit={handleSaveGatewaySettings}>
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isSavingSettings ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating Preferences...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Facility Notification Preferences</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE / EDIT TEMPLATE                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isEditorOpen && (
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingTemplate ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}
          maxWidth="max-w-4xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form (7 Columns) */}
            <form onSubmit={handleSaveTemplate} className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Template Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Member Birthday Wishes, 7-Day Renewal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormData({
                        ...formData,
                        category: newCat,
                        timing_trigger: getDefaultTiming(newCat)
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="new_plan">New Gym Membership Plan / Offer 🚀</option>
                    <option value="birthday">Member Birthday Celebration Perk 🎂</option>
                    <option value="expiry_reminder">Expiry Reminder (1–7 Days)</option>
                    <option value="membership_expired">Overdue / Expired</option>
                    <option value="welcome">Welcome & Onboarding Pack</option>
                    <option value="fee_due">Payment & Fee Due Notice</option>
                    <option value="absentee">Inactivity Check-in</option>
                    <option value="custom">General Announcement / Promotion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Audience</label>
                  <select
                    value={formData.target_role}
                    onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="all">Everyone / All Users ({getRecipientCountForRole('all')} recipients)</option>
                    <option value="member">Members Only ({getRecipientCountForRole('member')} recipients)</option>
                    <option value="trainer">Trainers & Coaches ({getRecipientCountForRole('trainer')} recipients)</option>
                    <option value="staff">Staff Employees (5 recipients)</option>
                  </select>
                </div>
              </div>

              {/* Birthday Single Master Template Notice */}
              {formData.category === 'birthday' && (
                <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 text-xs text-pink-950 flex items-start gap-2.5">
                  <Cake className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-pink-900">Single Master Birthday Template:</span>
                    <p className="text-[11px] text-pink-800 mt-0.5 leading-snug">
                      You only write <strong>one</strong> template for all members. Do <strong>not</strong> create separate templates or triggers for different people. Simply write <code className="bg-pink-100 text-pink-900 px-1 py-0.2 rounded font-mono font-bold">&#123;&#123;name&#125;&#125;</code> in your message. Whenever any member's birthday is today in the database, this template triggers automatically and personalizes the greeting with their name.
                    </p>
                  </div>
                </div>
              )}

              {/* Timing Trigger Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Trigger Condition / Dispatch Timing</label>
                <select
                  value={formData.timing_trigger}
                  onChange={(e) => setFormData({ ...formData, timing_trigger: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="on_birthday">🎂 Auto-Trigger on Member/Coach Birthday (Daily Scan)</option>
                  <option value="on_new_plan">🚀 1-Click Broadcast on New Membership Plan Launch</option>
                  <option value="days_before_expiry_7">⏰ 7 Days Before Membership Expiry</option>
                  <option value="days_before_expiry_3">⚠️ 3 Days Before Membership Expiry</option>
                  <option value="on_signup">🎉 Automatically on New Registration / Sign-up</option>
                  <option value="on_dues_pending">💳 When Membership Fee / Dues are Pending</option>
                  <option value="manual">📢 Manual / 1-Click On Demand Broadcast</option>
                </select>
              </div>

              {/* Variable Chips Insertion Bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Click to Insert Dynamic Placeholders</label>
                  <span className="text-[10px] text-emerald-700 font-semibold">Auto-personalized for each member</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {[
                    { tag: '{{name}}', label: 'Name' },
                    { tag: '{{gym_name}}', label: 'Gym Name' },
                    { tag: '{{role}}', label: 'Role' },
                    { tag: '{{plan_name}}', label: 'Plan Name' },
                    { tag: '{{expiry_date}}', label: 'Expiry Date' },
                    { tag: '{{days_left}}', label: 'Days Left' },
                    { tag: '{{dues_amount}}', label: 'Dues' },
                    { tag: '{{date}}', label: 'Today Date' },
                    { tag: '{{portal_url}}', label: 'Portal Link' }
                  ].map((chip) => (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() => handleInsertVariable(chip.tag)}
                      className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 text-[11px] font-mono font-semibold transition-colors border border-slate-200 hover:border-emerald-300 cursor-pointer"
                    >
                      + {chip.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Message Content (WhatsApp Formatted)</label>
                <textarea
                  ref={textareaRef}
                  required
                  rows={6}
                  placeholder="Compose your message here. Tip: Use *bold*, _italics_, and dynamic placeholders..."
                  value={formData.message_body}
                  onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                />
              </div>

              {/* Switches */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300"
                  />
                  <span>Active & Ready to Dispatch</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={formData.is_auto_enabled}
                    onChange={(e) => setFormData({ ...formData, is_auto_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300"
                  />
                  <span>Enable Auto-Trigger for Matching Members</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Save Template'}
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveAndBroadcastNow}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Save template and immediately broadcast to intended recipients with 1 click"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Save & 1-Click Send to All ({getRecipientCountForRole(formData.target_role)})</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Right Phone Mockup Preview (5 Columns) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-sm rounded-[2.5rem] bg-slate-900 border-4 border-slate-300 shadow-xl p-3 flex flex-col h-[480px]">
                {/* Phone Speaker Notch */}
                <div className="w-20 h-3 bg-slate-700 rounded-full mx-auto mb-2"></div>

                {/* WhatsApp Chat Header */}
                <div className="bg-[#075E54] text-white px-3.5 py-2.5 rounded-t-2xl flex items-center gap-2 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-[#128C7E] flex items-center justify-center font-bold text-xs text-white">
                    PF
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{gymInfo?.name || 'PulseFit Pro'}</div>
                    <div className="text-[10px] text-emerald-100">WhatsApp Business</div>
                  </div>
                </div>

                {/* WhatsApp Chat Background & Bubble */}
                <div className="flex-1 bg-[#ECE5DD] rounded-b-2xl p-3 overflow-y-auto flex flex-col justify-end space-y-2 border-t border-emerald-900/20">
                  <div className="self-center bg-white/90 shadow-2xs px-2.5 py-0.5 rounded text-[9px] font-medium text-slate-600 mb-1">
                    TODAY
                  </div>

                  {/* Chat Bubble */}
                  <div className="self-end max-w-[90%] bg-[#DCF8C6] border border-[#c1e7a4] text-slate-900 rounded-2xl rounded-tr-sm p-3 shadow-xs">
                    <div className="text-[11px] text-slate-900 font-sans whitespace-pre-line leading-relaxed">
                      {renderPreviewText(formData.message_body || 'Type your message on the left to see live preview...')}
                    </div>
                    <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] text-slate-500">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3 h-3 text-[#34B7F1]" />
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-medium">Live WhatsApp Render Simulation</span>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: LIVE PREVIEW & TEST SEND                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {previewTemplate && (
        <Modal
          isOpen={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
          title={`Preview: ${previewTemplate.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line select-text">
              {renderPreviewText(previewTemplate.message_body, previewTemplate.sampleOverrides || {})}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Send Test Message To</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="Enter 10-digit phone number (e.g. 9820154321)"
                onKeyDown={preventNonPhoneKey}
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(sanitizePhone(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleaned = sanitizePhone(testPhoneNumber);
                  if (!isValidPhone(cleaned)) {
                    addToast('Please enter a valid 10-digit phone number for testing.', 'error');
                    return;
                  }
                  const text = renderPreviewText(
                    previewTemplate.message_body,
                    previewTemplate.sampleOverrides || {}
                  );
                  openWhatsApp({
                    phone: cleaned,
                    text,
                    onToast: addToast
                  });
                  setPreviewTemplate(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Test on WhatsApp</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: 1-CLICK BROADCAST DISPATCHER                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {oneClickModal?.isOpen && (
        <Modal
          isOpen={oneClickModal.isOpen}
          onClose={() => !oneClickModal.isBroadcasting && setOneClickModal({ ...oneClickModal, isOpen: false })}
          title={`1-Click Broadcast: ${oneClickModal.template?.name || 'Send WhatsApp'}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Header info banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-emerald-600/20">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      {oneClickModal.targetRole === 'all' ? 'All Users (Members & Coaches)' : oneClickModal.targetRole + 's'}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      1-Click Delivery
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Messages are automatically generated, personalized, and dispatched to all intended recipients' WhatsApp numbers.
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-slate-900">
                  {getRecipientCountForRole(oneClickModal.targetRole)}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Recipients</div>
              </div>
            </div>

            {/* Template Preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Populated Message Preview</label>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line max-h-40 overflow-y-auto select-text">
                {renderPreviewText(oneClickModal.template?.message_body || '', {
                  name: 'Rahul Sharma',
                  plan: oneClickModal.planName || 'Elite All-Access Plan'
                })}
              </div>
            </div>

            {/* Plan Name override if New Plan */}
            {(oneClickModal.template?.category === 'new_plan' || oneClickModal.template?.message_body?.includes('{{plan_name}}')) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Membership Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Platinum All-Access 2026, Summer Shred Plan"
                  value={oneClickModal.planName}
                  onChange={(e) => setOneClickModal({ ...oneClickModal, planName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Dispatched Results or Recipients Preview List */}
            {oneClickModal.results ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Successfully dispatched to all {oneClickModal.results.length} intended user(s)!</span>
                  </div>
                  <span className="text-[10px] text-emerald-800 font-semibold">Logged in Database Audit Trail</span>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50">
                  {oneClickModal.results.map((rec) => (
                    <div key={rec.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-white transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] border border-emerald-200">
                          {rec.name?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{rec.name}</div>
                          <div className="text-[10px] text-slate-500">{rec.phone} • {rec.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Dispatched
                        </span>
                        {rec.wa_link && (
                          <a
                            href={rec.wa_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 text-slate-600 hover:text-emerald-700 transition-colors"
                            title="Open direct WhatsApp conversation"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Intended Recipients ({getRecipientCountForRole(oneClickModal.targetRole)} Total)
                </label>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50">
                  {(oneClickModal.targetRole.includes('member')
                    ? members
                    : oneClickModal.targetRole === 'trainer'
                    ? trainers
                    : [...members, ...trainers]
                  ).slice(0, 10).map((u) => (
                    <div key={u.id} className="p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {u.name?.[0] || 'U'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800">{u.name}</span>
                          <span className="text-[10px] text-slate-500 ml-2">({u.phone || 'No phone'})</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {u.role || (u.planName ? 'Member' : 'User')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOneClickModal({ ...oneClickModal, isOpen: false })}
                disabled={oneClickModal.isBroadcasting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer disabled:opacity-50"
              >
                {oneClickModal.results ? 'Close' : 'Cancel'}
              </button>

              {!oneClickModal.results ? (
                <button
                  type="button"
                  onClick={handleExecuteOneClickBroadcast}
                  disabled={oneClickModal.isBroadcasting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${oneClickModal.isBroadcasting ? 'animate-pulse' : ''}`} />
                  <span>
                    {oneClickModal.isBroadcasting
                      ? 'Dispatching WhatsApp Messages...'
                      : `Confirm 1-Click Send to All (${getRecipientCountForRole(oneClickModal.targetRole)} Users)`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOneClickModal({ ...oneClickModal, isOpen: false });
                    setActiveTab('logs');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  View Delivery Audit Logs
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
