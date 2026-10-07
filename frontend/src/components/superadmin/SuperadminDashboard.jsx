import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Users,
  Shield,
  Plus,
  Search,
  Check,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Edit2,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Award,
  Calendar,
  X,
  Lock,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Sliders,
  Zap,
  DollarSign,
  TrendingUp,
  Server,
  Database,
  Upload,
  Image as ImageIcon,
  Layers,
  FileText,
  KeyRound,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { api } from '../../services/api';
import { PlansManager } from './PlansManager';
import { PagesManager } from './PagesManager';
import { SuperadminCredentialsManager } from './SuperadminCredentialsManager';
import { SuperadminWhatsAppManager } from './SuperadminWhatsAppManager';
import { PACKAGE_PLANS } from './packagePlans';
import {
  hasSqlInjection,
  sanitizePhone,
  isValidEmail,
  isValidPhone,
  sanitizeText
} from '../../utils/validation';

export const SuperadminDashboard = ({ superUser, setSuperUser, onLogout }) => {
  const [activeMainTab, setActiveMainTab] = useState('gyms'); // 'gyms' | 'analytics' | 'plans' | 'pages' | 'credentials'
  const [gyms, setGyms] = useState([]);
  const [stats, setStats] = useState({
    totalGyms: 0,
    totalOwners: 0,
    totalMembers: 0,
    totalTrainers: 0,
    totalAccounts: 0,
    activeGyms: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [saasPlans, setSaasPlans] = useState([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [stopAccessModalGym, setStopAccessModalGym] = useState(null);
  const [isProcessingAccess, setIsProcessingAccess] = useState(false);

  // Toast / Alert banner
  const [toastMessage, setToastMessage] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Gyms, SaaS Plans and Platform Stats from backend
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gymsRes, statsRes, plansRes] = await Promise.allSettled([
        api.superadmin.getGyms(),
        api.superadmin.getStats(),
        api.superadmin.getPlans()
      ]);

      if (gymsRes.status === 'fulfilled' && gymsRes.value?.gyms) {
        setGyms(gymsRes.value.gyms);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        setStats(statsRes.value.stats);
      }
      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value?.plans)) {
        setSaasPlans(plansRes.value.plans);
      }
    } catch (err) {
      console.error('Error loading superadmin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Form states with strictly empty defaults for optional fields (NO dummy or random data)
  const initialNewGymState = {
    owner_name: '',
    owner_email: '',
    owner_password: '',
    owner_phone: '',
    gym_name: '',
    tagline: '',
    logo: '',
    gym_address: '',
    gym_city: '',
    state: '',
    pincode: '',
    gym_phone: '',
    gym_email: '',
    website: '',
    gst_number: '',
    operating_hours: '',
    currency: '₹',
    gym_package: '',
    package_tier: '',
    billing_cycle: 'Monthly',
    package_amount: '',
    max_members: '',
    max_trainers: '',
    max_branches: '',
    features: [],
    notes: ''
  };

  const [newGymForm, setNewGymForm] = useState(initialNewGymState);

  const [editGymForm, setEditGymForm] = useState({
    id: null,
    name: '',
    tagline: '',
    logo: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    gst_number: '',
    operating_hours: '',
    currency: '₹',
    package: '',
    package_tier: '',
    billing_cycle: 'Monthly',
    package_amount: '',
    subscription_expires_at: '',
    max_members: '',
    max_trainers: '',
    max_branches: '',
    status: 'Active',
    notes: '',
    features: [],
    new_password: '',
    owner_name: '',
    owner_phone: '',
    owner_email: ''
  });

  // Dynamic available plans computed from SaaS Plan Management or built-in packagePlans fallback
  const availablePlans = useMemo(() => {
    if (Array.isArray(saasPlans) && saasPlans.length > 0) {
      const active = saasPlans.filter(p => p.is_active !== false);
      return active.length > 0 ? active : saasPlans;
    }
    return PACKAGE_PLANS;
  }, [saasPlans]);

  // Handle plan selection when onboarding a new gym
  const handlePlanChangeForNewGym = (selectedVal) => {
    if (!selectedVal) {
      setNewGymForm(prev => ({
        ...prev,
        package_tier: '',
        gym_package: '',
        package_amount: '',
        max_members: '',
        max_trainers: '',
        max_branches: '',
        features: []
      }));
      return;
    }

    const plan = availablePlans.find(
      p => (p.tier && p.tier.toLowerCase() === selectedVal.toLowerCase()) ||
           (p.name && p.name.toLowerCase() === selectedVal.toLowerCase()) ||
           (String(p.id) === String(selectedVal))
    );

    if (plan) {
      const planPrice = plan.annual_price != null
        ? plan.annual_price
        : (plan.annualPrice != null ? plan.annualPrice : (plan.monthly_price != null ? plan.monthly_price : (plan.monthlyPrice != null ? plan.monthlyPrice : '')));
      const maxMembers = plan.max_members != null ? plan.max_members : (plan.quotas?.maxMembers != null ? plan.quotas.maxMembers : '');
      const maxTrainers = plan.max_trainers != null ? plan.max_trainers : (plan.quotas?.maxTrainers != null ? plan.quotas.maxTrainers : '');
      const maxBranches = plan.max_branches != null ? plan.max_branches : (plan.quotas?.maxBranches != null ? plan.quotas.maxBranches : 1);
      const features = Array.isArray(plan.features) ? plan.features : [];

      setNewGymForm(prev => ({
        ...prev,
        package_tier: plan.tier || plan.name,
        gym_package: plan.tier || plan.name,
        package_amount: planPrice,
        billing_cycle: plan.annual_price ? 'Annual' : (plan.monthly_price ? 'Monthly' : prev.billing_cycle),
        max_members: maxMembers,
        max_trainers: maxTrainers,
        max_branches: maxBranches,
        features: features
      }));
    } else {
      setNewGymForm(prev => ({
        ...prev,
        package_tier: selectedVal,
        gym_package: selectedVal
      }));
    }
  };

  // Handle plan selection when editing an existing gym
  const handlePlanChangeForEditGym = (selectedVal) => {
    if (!selectedVal) {
      setEditGymForm(prev => ({
        ...prev,
        package_tier: '',
        package: '',
        package_amount: '',
        max_members: '',
        max_trainers: '',
        max_branches: '',
        features: []
      }));
      return;
    }

    const plan = availablePlans.find(
      p => (p.tier && p.tier.toLowerCase() === selectedVal.toLowerCase()) ||
           (p.name && p.name.toLowerCase() === selectedVal.toLowerCase()) ||
           (String(p.id) === String(selectedVal))
    );

    if (plan) {
      const planPrice = plan.annual_price != null
        ? plan.annual_price
        : (plan.annualPrice != null ? plan.annualPrice : (plan.monthly_price != null ? plan.monthly_price : (plan.monthlyPrice != null ? plan.monthlyPrice : '')));
      const maxMembers = plan.max_members != null ? plan.max_members : (plan.quotas?.maxMembers != null ? plan.quotas.maxMembers : '');
      const maxTrainers = plan.max_trainers != null ? plan.max_trainers : (plan.quotas?.maxTrainers != null ? plan.quotas.maxTrainers : '');
      const maxBranches = plan.max_branches != null ? plan.max_branches : (plan.quotas?.maxBranches != null ? plan.quotas.maxBranches : 1);
      const features = Array.isArray(plan.features) ? plan.features : [];

      setEditGymForm(prev => ({
        ...prev,
        package_tier: plan.tier || plan.name,
        package: plan.tier || plan.name,
        package_amount: planPrice !== '' ? planPrice : prev.package_amount,
        billing_cycle: plan.annual_price ? 'Annual' : (plan.monthly_price ? 'Monthly' : prev.billing_cycle),
        max_members: maxMembers !== null && maxMembers !== undefined ? maxMembers : '',
        max_trainers: maxTrainers !== null && maxTrainers !== undefined ? maxTrainers : '',
        max_branches: maxBranches !== null && maxBranches !== undefined ? maxBranches : 1,
        features: features
      }));
    } else {
      setEditGymForm(prev => ({
        ...prev,
        package_tier: selectedVal,
        package: selectedVal
      }));
    }
  };

  const handleNewGymLogoUpload = (e) => {
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
      setNewGymForm((prev) => ({ ...prev, logo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditGymLogoUpload = (e) => {
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
      setEditGymForm((prev) => ({ ...prev, logo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Create Gym
  const handleCreateGym = async (e) => {
    e.preventDefault();
    if (
      hasSqlInjection(newGymForm.gym_name) ||
      hasSqlInjection(newGymForm.tagline) ||
      hasSqlInjection(newGymForm.gym_address) ||
      hasSqlInjection(newGymForm.owner_name) ||
      hasSqlInjection(newGymForm.owner_email) ||
      hasSqlInjection(newGymForm.owner_password)
    ) {
      alert('Security Warning: Disallowed characters or potential SQL injection detected.');
      return;
    }

    if (!newGymForm.owner_phone || !isValidPhone(newGymForm.owner_phone)) {
      alert('Please enter a valid 10-digit owner mobile number.');
      return;
    }

    if (!newGymForm.owner_password || newGymForm.owner_password.trim().length < 4) {
      alert('Please provide an initial owner password (minimum 4 characters).');
      return;
    }

    if (newGymForm.owner_email && !isValidEmail(newGymForm.owner_email)) {
      alert('Please enter a valid owner email address.');
      return;
    }

    try {
      const res = await api.superadmin.createGym(newGymForm);
      if (res?.success) {
        showToast(`Gym "${newGymForm.gym_name}" onboarded successfully.`);
        setIsAddModalOpen(false);
        setNewGymForm(initialNewGymState);
        loadData();
      }
    } catch (err) {
      alert('Error creating gym: ' + (err.message || 'Server error'));
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (gym) => {
    setSelectedGym(gym);

    setEditGymForm({
      id: gym.id,
      name: gym.name || '',
      tagline: gym.tagline || '',
      logo: gym.logo || '',
      address: gym.address || '',
      city: gym.city || '',
      state: gym.state || '',
      pincode: gym.pincode || '',
      phone: gym.phone || gym.owner?.phone || '',
      email: gym.email || gym.owner?.email || '',
      website: gym.website || '',
      gst_number: gym.gstNumber || gym.gst_number || '',
      operating_hours: gym.operating_hours || gym.operatingHours || '',
      currency: gym.currency || '₹',
      package: gym.packageTier || gym.package || '',
      package_tier: gym.packageTier || gym.package || '',
      billing_cycle: gym.billingCycle || 'Monthly',
      package_amount: gym.packageAmount != null ? gym.packageAmount : '',
      subscription_expires_at: gym.subscriptionExpiresAt || gym.subscription_expires_at || '',
      max_members: gym.maxMembers != null ? gym.maxMembers : '',
      max_trainers: gym.maxTrainers != null ? gym.maxTrainers : '',
      max_branches: gym.maxBranches != null ? gym.maxBranches : '',
      status: gym.status || 'Active',
      notes: gym.notes || '',
      features: Array.isArray(gym.features) ? gym.features : [],
      new_password: '',
      owner_name: gym.owner?.name || '',
      owner_phone: gym.owner?.phone || '',
      owner_email: gym.owner?.email || ''
    });
    setIsEditModalOpen(true);
  };

  // Update Gym
  const handleUpdateGym = async (e) => {
    e.preventDefault();
    try {
      const res = await api.superadmin.updateGym(editGymForm.id, editGymForm);
      if (res?.success) {
        showToast(`Gym "${editGymForm.name}" updated successfully.`);
        setIsEditModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert('Error updating gym: ' + (err.message || 'Server error'));
    }
  };

  // Impersonate / Launch Owner Dashboard
  const handleLoginAsOwner = async (gym) => {
    setIsImpersonating(true);
    try {
      const res = await api.superadmin.impersonateGym(gym.id);
      if (res?.success && res.token && res.user) {
        localStorage.setItem('pulsefit_token', res.token);
        localStorage.setItem('pulsefit_user', JSON.stringify(res.user));
        localStorage.setItem('pulsefit_impersonating_from_superadmin', 'true');
        showToast(`Launching ${gym.name} Owner Dashboard...`);
        setTimeout(() => {
          window.location.href = '/';
        }, 600);
      }
    } catch (err) {
      alert('Unable to launch owner session: ' + (err.message || 'Server error'));
      setIsImpersonating(false);
    }
  };

  // Delete Gym — available for ALL gyms
  const handleDeleteGym = async (gymId, gymName) => {
    if (!confirm(`Are you sure you want to permanently delete "${gymName}"? All owner, member, trainer accounts, and data associated with this gym will be purged immediately.`)) {
      return;
    }

    try {
      await api.superadmin.deleteGym(gymId);
      showToast(`Gym "${gymName}" deleted successfully.`);
      loadData();
    } catch (err) {
      alert('Failed to delete gym: ' + err.message);
    }
  };

  // Stop Access for Gym Owner & All Sub-Accounts
  const handleInitiateStopAccess = (gym) => {
    setStopAccessModalGym(gym);
  };

  const handleConfirmStopAccess = async () => {
    if (!stopAccessModalGym) return;
    setIsProcessingAccess(true);
    try {
      const res = await api.superadmin.stopGymAccess(stopAccessModalGym.id);
      if (res?.success) {
        showToast(`Access stopped for "${stopAccessModalGym.name}". Owner & all accounts blocked.`);
        setStopAccessModalGym(null);
        await loadData();
      } else {
        showToast(res?.message || 'Failed to stop access.');
      }
    } catch (err) {
      alert('Error stopping access: ' + (err.message || 'Server error'));
    } finally {
      setIsProcessingAccess(false);
    }
  };

  // Restore Access for Gym Owner & All Sub-Accounts
  const handleRestoreAccess = async (gym) => {
    setIsProcessingAccess(true);
    try {
      const res = await api.superadmin.restoreGymAccess(gym.id);
      if (res?.success) {
        showToast(`Access restored for "${gym.name}". Owner & all accounts can now log in.`);
        await loadData();
      } else {
        showToast(res?.message || 'Failed to restore access.');
      }
    } catch (err) {
      alert('Error restoring access: ' + (err.message || 'Server error'));
    } finally {
      setIsProcessingAccess(false);
    }
  };

  // Filtered Gyms
  const filteredGyms = useMemo(() => {
    return gyms.filter((g) => {
      const matchesSearch =
        !searchQuery ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.city?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || g.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [gyms, searchQuery, statusFilter]);

  // Real Total MRR calculation (pure database values, zero random fallbacks)
  const totalMRR = useMemo(() => {
    return gyms.reduce((acc, g) => acc + (Number(g.packageAmount) || 0), 0);
  }, [gyms]);

  // Real count of active vs suspended gyms
  const activeGymsCount = useMemo(() => {
    return gyms.filter((g) => (g.status || 'Active') === 'Active').length;
  }, [gyms]);

  const suspendedGymsCount = useMemo(() => {
    return gyms.filter((g) => g.status === 'Suspended').length;
  }, [gyms]);

  // Helper for tier badges
  const getTierBadgeStyle = (tier) => {
    const t = (tier || '').toLowerCase();
    if (t.includes('platinum')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (t.includes('gold')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (t.includes('growth') || t.includes('silver')) {
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    if (t) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative selection:bg-indigo-500 selection:text-white pb-16 overflow-x-hidden">
      {/* Background Decorative Ambient Illumination */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[450px] bg-gradient-to-b from-indigo-100/60 via-purple-100/40 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[400px] bg-sky-100/50 rounded-full blur-[130px] pointer-events-none" />

      {/* Subtle Micro-Grid */}
      <div
        className="fixed inset-0 opacity-[0.035] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)', backgroundSize: '36px 36px' }}
      />

      {/* Floating System Notification Toast */}
      {toastMessage && createPortal(
        <div
          style={{ zIndex: 999999 }}
          className="fixed top-5 right-5 z-[999999] px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-900 font-bold text-xs shadow-xl flex items-center gap-2.5 animate-fadeIn"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-wide text-slate-800">{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Top Superadmin Command Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-full h-full text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 font-heading">
                ARCHFIT<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600">CORE</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setActiveMainTab('credentials')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeMainTab === 'credentials'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Manage Superadmin login credentials & security"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline font-mono text-[11px]">{superUser?.email || 'Admin Security'}</span>
            <span className="sm:hidden">Security</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-black tracking-wide transition-all shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">ONBOARD FACILITY</span>
            <span className="xs:hidden">NEW</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold transition-all cursor-pointer"
            title="Sign out of Superadmin"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Command Center Container */}
      <main className="flex-1 w-full px-4 sm:px-8 py-6 space-y-6">

        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-3.5">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100/80 border border-slate-200/80 rounded-2xl backdrop-blur-md">
            {[
              { id: 'gyms', label: 'Facilities Directory', icon: Building2, count: gyms.length },
              { id: 'plans', label: 'SaaS Plans Management', icon: Layers },
              { id: 'whatsapp', label: 'WhatsApp Gateway & Automation', icon: MessageSquare },
              { id: 'pages', label: 'About & Support Pages', icon: FileText },
              { id: 'credentials', label: 'Admin Credentials & Security', icon: KeyRound },
              { id: 'analytics', label: 'Platform Telemetry & MRR', icon: TrendingUp }
            ].map((tab) => {
              const active = activeMainTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${active
                    ? 'bg-white text-indigo-700 border border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${active ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-400'}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Database'}</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: FACILITIES DIRECTORY                                */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'gyms' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Real Executive KPI Overview Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Metric 1 */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Facilities</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                  {stats.totalGyms}
                </div>
                <div className="text-[11px] text-cyan-600 font-semibold mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span>{stats.activeGyms} Active</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tenants & Owners</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                  {stats.totalOwners}
                </div>
                <div className="text-[11px] text-indigo-600 font-semibold mt-1">
                  Provisioned Owners
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Athletes & Members</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                  {stats.totalMembers}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                  Enrolled Across Facilities
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Platform MRR</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Real Monthly Inflow</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by facility name, owner, email, city..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-2">Status:</span>
                  {['All', 'Active', 'Suspended'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${statusFilter === status
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Facilities Directory List */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2.5">
                    <span>Provisioned Facility Centers</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {filteredGyms.length} Centers
                    </span>
                  </h2>
                </div>
              </div>

              {filteredGyms.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                  <p className="text-sm font-bold text-slate-700">No Facilities Found</p>
                  <p className="text-xs text-slate-500 mt-1">Onboard a new facility using the button above.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredGyms.map((gym) => {
                    const tier = gym.packageTier || gym.package || '';

                    return (
                      <div
                        key={gym.id}
                        className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors relative group"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                          {/* Facility & Owner Details */}
                          <div className="flex items-start gap-4 min-w-0">
                            {/* Logo / Monogram */}
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-indigo-600 font-black shrink-0 shadow-xs relative overflow-hidden group-hover:border-indigo-300 transition-colors">
                              {gym.logo ? (
                                <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover rounded-2xl" />
                              ) : (
                                <span className="text-base tracking-tight font-heading font-black text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-purple-600">
                                  {gym.name ? gym.name.slice(0, 2).toUpperCase() : 'FC'}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="font-black text-slate-900 text-base tracking-tight font-heading">
                                  {gym.name}
                                </h3>

                                {tier && (
                                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getTierBadgeStyle(tier)}`}>
                                    {tier}
                                  </span>
                                )}

                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${gym.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${gym.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <span>{gym.status || 'Active'}</span>
                                </span>
                              </div>

                              {gym.tagline && (
                                <div className="text-xs text-slate-500 italic">
                                  "{gym.tagline}"
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                {(gym.address || gym.city) && (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{[gym.address, gym.city].filter(Boolean).join(', ')}</span>
                                  </span>
                                )}

                                {gym.owner ? (
                                  <>
                                    <span className="flex items-center gap-1 text-slate-700">
                                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>Owner: <strong className="text-slate-900">{gym.owner.name}</strong></span>
                                    </span>

                                    {gym.owner.phone && (
                                      <span className="flex items-center gap-1 text-slate-600">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{gym.owner.phone}</span>
                                      </span>
                                    )}

                                    {gym.owner.email && (
                                      <span className="flex items-center gap-1 text-slate-600">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="font-mono text-[11px] text-slate-700">{gym.owner.email}</span>
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px] font-semibold">
                                    <User className="w-3.5 h-3.5 shrink-0" />
                                    <span>No Owner Account Linked</span>
                                  </span>
                                )}

                                {gym.email && (!gym.owner || gym.owner.email !== gym.email) && (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono text-[11px] text-slate-600">Facility: {gym.email}</span>
                                  </span>
                                )}
                              </div>

                              {/* Breakdown of Accounts & Members */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                                  <Users className="w-3 h-3 text-indigo-600" />
                                  <span>Total Accounts: <strong className="text-slate-900 font-mono">{gym.accounts?.total ?? 0}</strong></span>
                                </span>

                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Members: <strong className="text-slate-900 font-mono">{gym.accounts?.members ?? 0}</strong></span>
                                </span>

                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  <span>Trainers: <strong className="text-slate-900 font-mono">{gym.accounts?.trainers ?? 0}</strong></span>
                                </span>

                                {gym.packageAmount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 font-medium font-mono">
                                    <DollarSign className="w-3 h-3 text-amber-600" />
                                    <span>₹{Number(gym.packageAmount).toLocaleString('en-IN')}{gym.billingCycle ? `/${gym.billingCycle}` : ''}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0 flex-wrap">
                            {/* Stop Access / Restore Access Admin Rights */}
                            {gym.status === 'Suspended' ? (
                              <button
                                onClick={() => handleRestoreAccess(gym)}
                                disabled={isProcessingAccess}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Restore platform access for owner and all accounts"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Restore Access</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleInitiateStopAccess(gym)}
                                disabled={isProcessingAccess}
                                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                                title="Stop all access for this owner and all created accounts"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Stop Access</span>
                              </button>
                            )}

                            {/* Launch Owner Dashboard */}
                            <button
                              onClick={() => handleLoginAsOwner(gym)}
                              disabled={isImpersonating || gym.status === 'Suspended'}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                gym.status === 'Suspended'
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                              }`}
                              title={gym.status === 'Suspended' ? 'Access is currently stopped. Restore access to login as owner.' : "Launch this gym's Owner Dashboard"}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Login as Owner</span>
                            </button>

                            {/* Edit All Details */}
                            <button
                              onClick={() => handleOpenEdit(gym)}
                              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                              title="Edit facility details and owner credentials"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Edit All</span>
                            </button>

                            {/* Delete Gym Button — Available for EVERY gym */}
                            <button
                              onClick={() => handleDeleteGym(gym.id, gym.name)}
                              className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                              title="Permanently delete this gym and its accounts"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 2: REAL PLATFORM TELEMETRY                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-slate-500">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Monthly MRR</h4>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-amber-600 mt-1 font-semibold">Active SaaS recurring monthly billing rate</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-slate-500">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Projected Annual ARR</h4>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  ₹{(totalMRR * 12).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-indigo-600 mt-1 font-semibold">Annualized run rate from active gyms</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-slate-500">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Total System Accounts</h4>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.totalAccounts}
                </div>
                <p className="text-xs text-purple-600 mt-1 font-semibold">Total owners, trainers & members across all gyms</p>
              </div>
            </div>

            {/* Real Breakdown Overview */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Real Multi-Tenant Database Metrics</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Active Gyms</span>
                  <div className="text-xl font-black text-emerald-600 font-mono">{activeGymsCount}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Suspended Gyms</span>
                  <div className="text-xl font-black text-rose-600 font-mono">{suspendedGymsCount}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Enrolled Members</span>
                  <div className="text-xl font-black text-cyan-600 font-mono">{stats.totalMembers}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Coaches & Trainers</span>
                  <div className="text-xl font-black text-indigo-600 font-mono">{stats.totalTrainers}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 3: SAAS PLANS MANAGEMENT                              */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'plans' && <PlansManager onPlansUpdated={loadData} />}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB: WHATSAPP GATEWAY & AUTOMATION CONTROL                 */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'whatsapp' && (
          <SuperadminWhatsAppManager showToast={showToast} />
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 4: ABOUT & LEGAL SUPPORT PAGES                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'pages' && <PagesManager />}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 5: ADMIN CREDENTIALS & MASTER SECURITY                 */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'credentials' && (
          <SuperadminCredentialsManager
            superUser={superUser}
            onSuperUserUpdated={setSuperUser}
            showToast={showToast}
          />
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: COMPREHENSIVE EDIT GYM & OWNER (MULTI-TAB)          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isEditModalOpen && createPortal(
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Edit Facility & Owner: {editGymForm.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID #{editGymForm.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form - Single Unified Form (No Tabs) */}
            <form onSubmit={handleUpdateGym} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* SECTION 1: FACILITY PROFILE & PLAN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>1. Facility Profile & SaaS Subscription</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Gym Name *</label>
                    <input
                      type="text"
                      required
                      value={editGymForm.name}
                      onChange={(e) => setEditGymForm({ ...editGymForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Tagline (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.tagline}
                      onChange={(e) => setEditGymForm({ ...editGymForm, tagline: e.target.value })}
                      placeholder="e.g. Strength & Performance Studio"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Gym Logo & Live Preview */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Facility Logo (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Shown in Top Navbar & Member App</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {editGymForm.logo ? (
                      <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        <img src={editGymForm.logo} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-base shrink-0">
                        {(editGymForm.name || 'G').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="edit-gym-logo-file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleEditGymLogoUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="edit-gym-logo-file"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Image</span>
                        </label>
                        {editGymForm.logo && (
                          <button
                            type="button"
                            onClick={() => setEditGymForm({ ...editGymForm, logo: '' })}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold border border-rose-200 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Or enter image URL (https://...)"
                        value={editGymForm.logo.startsWith('data:') ? '' : editGymForm.logo}
                        onChange={(e) => setEditGymForm({ ...editGymForm, logo: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Physical Address (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.address}
                      onChange={(e) => setEditGymForm({ ...editGymForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">City (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.city}
                      onChange={(e) => setEditGymForm({ ...editGymForm, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">State (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.state}
                      onChange={(e) => setEditGymForm({ ...editGymForm, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.pincode}
                      onChange={(e) => setEditGymForm({ ...editGymForm, pincode: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">GST Number (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.gst_number}
                      onChange={(e) => setEditGymForm({ ...editGymForm, gst_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Plan Tier & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>SaaS Plan Tier (Optional)</span>
                      {editGymForm.package_tier && (
                        <span className="text-[10px] text-indigo-600 font-normal">Active Tier</span>
                      )}
                    </label>
                    <select
                      value={editGymForm.package_tier}
                      onChange={(e) => handlePlanChangeForEditGym(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">No Plan Tier Assigned (Custom / Free)</option>
                      {availablePlans.map((p) => {
                        const priceText = p.annual_price != null
                          ? `₹${Number(p.annual_price).toLocaleString('en-IN')}/yr`
                          : (p.annualPrice != null ? `₹${Number(p.annualPrice).toLocaleString('en-IN')}/yr` : (p.monthly_price != null ? `₹${Number(p.monthly_price).toLocaleString('en-IN')}/mo` : ''));
                        const memberText = p.max_members != null
                          ? `${p.max_members} Athletes`
                          : (p.quotas?.maxMembers != null ? `${p.quotas.maxMembers} Athletes` : 'Unlimited');
                        return (
                          <option key={p.id || p.tier} value={p.tier || p.name}>
                            {p.name || `${p.tier} Plan`} {priceText ? `— ${priceText}` : ''} ({memberText})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {editGymForm.billing_cycle === 'Annual' ? 'Annual Billing Amount (₹)' : 'Monthly Billing Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500"
                      value={editGymForm.package_amount}
                      onChange={(e) => setEditGymForm({ ...editGymForm, package_amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Facility Account Status</label>
                    <select
                      value={editGymForm.status}
                      onChange={(e) => setEditGymForm({ ...editGymForm, status: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none cursor-pointer ${
                        editGymForm.status === 'Suspended'
                          ? 'bg-rose-50 border border-rose-300 text-rose-700 font-bold'
                          : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                      }`}
                    >
                      <option value="Active">Active (Normal Access)</option>
                      <option value="Suspended">Suspended (Stop All Access)</option>
                    </select>
                    {editGymForm.status === 'Suspended' && (
                      <p className="mt-1.5 text-[11px] text-rose-700 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-200">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Warning: Saving as Suspended will terminate all active sessions and block login for owner & all accounts.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: OWNER CREDENTIALS */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>2. Owner Login Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Full Name</label>
                    <input
                      type="text"
                      value={editGymForm.owner_name}
                      onChange={(e) => setEditGymForm({ ...editGymForm, owner_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Mobile Number (Login ID)</label>
                    <input
                      type="tel"
                      value={editGymForm.owner_phone}
                      onChange={(e) => setEditGymForm({ ...editGymForm, owner_phone: sanitizePhone(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Email (Optional)</label>
                    <input
                      type="email"
                      value={editGymForm.owner_email}
                      onChange={(e) => setEditGymForm({ ...editGymForm, owner_email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Reset Security Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep unchanged"
                      value={editGymForm.new_password}
                      onChange={(e) => setEditGymForm({ ...editGymForm, new_password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: CAPACITY & LIMITS */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  <Sliders className="w-4 h-4" />
                  <span>3. Capacity Quotas & Administrative Notes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Max Athletes</label>
                      {(!editGymForm.max_members || editGymForm.package_tier?.toLowerCase() === 'platinum') && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Unlimited
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={editGymForm.max_members}
                      onChange={(e) => setEditGymForm({ ...editGymForm, max_members: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Max Coaches</label>
                      {(!editGymForm.max_trainers || editGymForm.package_tier?.toLowerCase() === 'platinum') && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Unlimited
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="Unlimited"
                      value={editGymForm.max_trainers}
                      onChange={(e) => setEditGymForm({ ...editGymForm, max_trainers: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Max Branches</label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {editGymForm.max_branches ? `${editGymForm.max_branches} Gyms` : '1 Gym'}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1 or 3"
                      value={editGymForm.max_branches}
                      onChange={(e) => setEditGymForm({ ...editGymForm, max_branches: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Administrative Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={editGymForm.notes}
                    onChange={(e) => setEditGymForm({ ...editGymForm, notes: e.target.value })}
                    placeholder="Notes, terms or branch details..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-black tracking-wide shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer"
                >
                  Save Facility Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD NEW GYM & OWNER (ZERO DUMMY DATA)               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isAddModalOpen && createPortal(
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Onboard New Facility Center</h3>
                  <p className="text-xs text-slate-500">Provision facility entity and owner credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGym} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Facility Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Iron & Fitness Athletic Club"
                      value={newGymForm.gym_name}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Facility Tagline (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Strength & Performance Studio"
                      value={newGymForm.tagline}
                      onChange={(e) => setNewGymForm({ ...newGymForm, tagline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Gym Logo & Live Preview */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Facility Logo (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Shown in Top Navbar & Member App</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {newGymForm.logo ? (
                      <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        <img src={newGymForm.logo} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-base shrink-0">
                        {(newGymForm.gym_name || 'G').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="new-gym-logo-file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleNewGymLogoUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="new-gym-logo-file"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Image</span>
                        </label>
                        {newGymForm.logo && (
                          <button
                            type="button"
                            onClick={() => setNewGymForm({ ...newGymForm, logo: '' })}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold border border-rose-200 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Or enter image URL (https://...)"
                        value={newGymForm.logo.startsWith('data:') ? '' : newGymForm.logo}
                        onChange={(e) => setNewGymForm({ ...newGymForm, logo: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Facility Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Floor, Trade Center, Linking Road"
                      value={newGymForm.gym_address}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">City (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={newGymForm.gym_city}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Plan Tier & Package Amount (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>SaaS Plan Tier (Optional)</span>
                      {newGymForm.package_tier && (
                        <span className="text-[10px] text-indigo-600 font-normal">Pricing &amp; limits auto-filled</span>
                      )}
                    </label>
                    <select
                      value={newGymForm.package_tier}
                      onChange={(e) => handlePlanChangeForNewGym(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">No Plan Tier Assigned (Custom / Free)</option>
                      {availablePlans.map((p) => {
                        const priceText = p.annual_price != null
                          ? `₹${Number(p.annual_price).toLocaleString('en-IN')}/yr`
                          : (p.annualPrice != null ? `₹${Number(p.annualPrice).toLocaleString('en-IN')}/yr` : (p.monthly_price != null ? `₹${Number(p.monthly_price).toLocaleString('en-IN')}/mo` : ''));
                        const memberText = p.max_members != null
                          ? `${p.max_members} Athletes`
                          : (p.quotas?.maxMembers != null ? `${p.quotas.maxMembers} Athletes` : 'Unlimited');
                        return (
                          <option key={p.id || p.tier} value={p.tier || p.name}>
                            {p.name || `${p.tier} Plan`} {priceText ? `— ${priceText}` : ''} ({memberText})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Monthly Billing Amount (₹) (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500"
                      value={newGymForm.package_amount}
                      onChange={(e) => setNewGymForm({ ...newGymForm, package_amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Capacity Limits (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Max Athletes (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 500"
                      value={newGymForm.max_members}
                      onChange={(e) => setNewGymForm({ ...newGymForm, max_members: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Max Coaches (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 10"
                      value={newGymForm.max_trainers}
                      onChange={(e) => setNewGymForm({ ...newGymForm, max_trainers: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Owner Credentials */}
                <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Owner Login Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Singhania"
                        value={newGymForm.owner_name}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9820154321"
                        value={newGymForm.owner_phone}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_phone: sanitizePhone(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="owner@gym.com"
                        value={newGymForm.owner_email}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Password *</label>
                      <input
                        type="text"
                        required
                        placeholder="Set owner password"
                        value={newGymForm.owner_password}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_password: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-black tracking-wide shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer"
                >
                  Onboard Facility & Owner
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: STOP ACCESS CONFIRMATION MODAL                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {stopAccessModalGym && createPortal(
        <div
          style={{ zIndex: 999999 }}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white border border-rose-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-scaleIn">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-block">
                  Master Access Revocation
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1 font-heading">
                  Stop Access for {stopAccessModalGym.name}?
                </h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="leading-relaxed">
                You are exercising master Superadmin rights to <strong className="text-rose-700 font-bold">terminate and suspend all platform access</strong> for this facility.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Facility Owner:</span>
                  <span className="font-bold text-slate-900 font-mono">{stopAccessModalGym.owner?.name || 'No Owner'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Owner Contact:</span>
                  <span className="font-mono text-slate-800">{stopAccessModalGym.owner?.phone || stopAccessModalGym.owner?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Affected Total Accounts:</span>
                  <span className="font-black text-rose-700 font-mono bg-rose-100/70 px-2.5 py-0.5 rounded border border-rose-200">
                    {stopAccessModalGym.accounts?.total ?? 0} accounts
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 pl-2 border-l-2 border-slate-300 space-y-0.5">
                  <div>• Owner: <strong className="text-slate-800">{stopAccessModalGym.accounts?.owners ?? (stopAccessModalGym.owner ? 1 : 0)}</strong></div>
                  <div>• Members: <strong className="text-slate-800">{stopAccessModalGym.accounts?.members ?? 0}</strong></div>
                  <div>• Trainers / Staff: <strong className="text-slate-800">{stopAccessModalGym.accounts?.trainers ?? 0}</strong></div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] leading-relaxed">
                ⚠️ <strong>Immediate Suspension Effects:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-rose-700">
                  <li>All active sessions for this facility are revoked immediately.</li>
                  <li>Login attempts for the owner, members, and trainers will be denied.</li>
                  <li>You can restore full access at any time using the <strong>Restore Access</strong> button.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStopAccessModalGym(null)}
                disabled={isProcessingAccess}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer"
              >
                Cancel (Keep Active)
              </button>
              <button
                type="button"
                onClick={handleConfirmStopAccess}
                disabled={isProcessingAccess}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black tracking-wide shadow-md shadow-rose-600/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isProcessingAccess ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Stopping Access...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Yes, Stop Access & Block Accounts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
