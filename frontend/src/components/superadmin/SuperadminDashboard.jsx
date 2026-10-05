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
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { PlansManager } from './PlansManager';
import { PagesManager } from './PagesManager';
import { PACKAGE_PLANS } from './packagePlans';
import {
  hasSqlInjection,
  sanitizePhone,
  isValidEmail,
  isValidPhone,
  sanitizeText
} from '../../utils/validation';

export const SuperadminDashboard = ({ superUser, onLogout }) => {
  const [activeMainTab, setActiveMainTab] = useState('gyms'); // 'gyms' | 'analytics'
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

  // Edit Modal Active Tab

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
      return 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-purple-300 border-purple-500/35';
    }
    if (t.includes('gold')) {
      return 'bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-300 border-amber-500/35';
    }
    if (t.includes('growth')) {
      return 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-300 border-cyan-500/35';
    }
    if (t) {
      return 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-300 border-emerald-500/35';
    }
    return 'bg-white/[0.04] text-slate-400 border-white/[0.08]';
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500 selection:text-white pb-16 overflow-x-hidden">
      {/* Background Decorative Ambient Illumination */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[450px] bg-gradient-to-b from-indigo-600/10 via-purple-600/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[400px] bg-cyan-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Subtle Micro-Grid */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '36px 36px' }}
      />

      {/* Floating System Notification Toast */}
      {toastMessage && createPortal(
        <div
          style={{ zIndex: 999999 }}
          className="fixed top-5 right-5 z-[999999] px-4 py-3 rounded-2xl bg-[#0f111a]/95 backdrop-blur-xl border border-indigo-500/30 text-white font-bold text-xs shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-2.5 animate-fadeIn"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-wide">{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Top Superadmin Command Header */}
      <header className="sticky top-0 z-40 bg-[#090a10]/85 backdrop-blur-2xl border-b border-white/[0.07] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-1.5 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <ShieldCheck className="w-full h-full text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white font-heading">
                ARCHFIT<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">CORE</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white text-xs font-black tracking-wide transition-all shadow-[0_4px_20px_rgba(99,102,241,0.35)] active:scale-95 cursor-pointer hover:shadow-indigo-500/40"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">ONBOARD FACILITY</span>
            <span className="xs:hidden">NEW</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 border border-white/[0.07] hover:border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Sign out of Superadmin"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Command Center Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-2 overflow-x-auto p-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-md">
            {[
              { id: 'gyms', label: 'Facilities Directory', icon: Building2, count: gyms.length },
              { id: 'plans', label: 'SaaS Plans Management', icon: Layers },
              { id: 'pages', label: 'About & Support Pages', icon: FileText },
              { id: 'analytics', label: 'Platform Telemetry & MRR', icon: TrendingUp }
            ].map((tab) => {
              const active = activeMainTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${active
                    ? 'bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-white border border-indigo-500/40 shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold bg-white/[0.08] text-indigo-300">
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
              className="px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
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
              <div className="bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Facilities</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
                  {stats.totalGyms}
                </div>
                <div className="text-[11px] text-cyan-400 font-semibold mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{stats.activeGyms} Active</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tenants & Owners</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
                  {stats.totalOwners}
                </div>
                <div className="text-[11px] text-indigo-400 font-semibold mt-1">
                  Provisioned Owners
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Athletes & Members</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
                  {stats.totalMembers}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                  Enrolled Across Facilities
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Platform MRR</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Real Monthly Inflow</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by facility name, owner, email, city..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#08090f]/90 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-[#08090f] p-1 rounded-xl border border-white/[0.07] text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-2">Status:</span>
                  {['All', 'Active', 'Suspended'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${statusFilter === status
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Facilities Directory List */}
            <div className="bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4.5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white font-heading flex items-center gap-2.5">
                    <span>Provisioned Facility Centers</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {filteredGyms.length} Centers
                    </span>
                  </h2>
                </div>
              </div>

              {filteredGyms.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                  <p className="text-sm font-bold text-slate-300">No Facilities Found</p>
                  <p className="text-xs text-slate-500 mt-1">Onboard a new facility using the button above.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {filteredGyms.map((gym) => {
                    const tier = gym.packageTier || gym.package || '';

                    return (
                      <div
                        key={gym.id}
                        className="p-5 sm:p-6 hover:bg-white/[0.02] transition-colors relative group"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                          {/* Facility & Owner Details */}
                          <div className="flex items-start gap-4 min-w-0">
                            {/* Logo / Monogram */}
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#151726] to-[#0c0d16] border border-white/[0.1] flex items-center justify-center text-indigo-400 font-black shrink-0 shadow-lg relative overflow-hidden group-hover:border-indigo-500/40 transition-colors">
                              {gym.logo ? (
                                <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover rounded-2xl" />
                              ) : (
                                <span className="text-base tracking-tight font-heading font-black text-transparent bg-clip-text bg-gradient-to-tr from-indigo-400 to-purple-400">
                                  {gym.name ? gym.name.slice(0, 2).toUpperCase() : 'FC'}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="font-black text-white text-base tracking-tight font-heading">
                                  {gym.name}
                                </h3>

                                {tier && (
                                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getTierBadgeStyle(tier)}`}>
                                    {tier}
                                  </span>
                                )}

                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${gym.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${gym.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                  <span>{gym.status || 'Active'}</span>
                                </span>
                              </div>

                              {gym.tagline && (
                                <div className="text-xs text-slate-400 italic">
                                  "{gym.tagline}"
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                {(gym.address || gym.city) && (
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span>{[gym.address, gym.city].filter(Boolean).join(', ')}</span>
                                  </span>
                                )}

                                {gym.owner ? (
                                  <>
                                    <span className="flex items-center gap-1 text-slate-300">
                                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                      <span>Owner: <strong className="text-white">{gym.owner.name}</strong></span>
                                    </span>

                                    {gym.owner.phone && (
                                      <span className="flex items-center gap-1 text-slate-400">
                                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <span>{gym.owner.phone}</span>
                                      </span>
                                    )}

                                    {gym.owner.email && (
                                      <span className="flex items-center gap-1 text-slate-400">
                                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <span className="font-mono text-[11px] text-slate-300">{gym.owner.email}</span>
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20 text-[11px] font-semibold">
                                    <User className="w-3.5 h-3.5 shrink-0" />
                                    <span>No Owner Account Linked</span>
                                  </span>
                                )}

                                {gym.email && (!gym.owner || gym.owner.email !== gym.email) && (
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="font-mono text-[11px] text-slate-400">Facility: {gym.email}</span>
                                  </span>
                                )}
                              </div>

                              {/* Breakdown of Accounts & Members */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                                  <Users className="w-3 h-3 text-indigo-400" />
                                  <span>Total Accounts: <strong className="text-white font-mono">{gym.accounts?.total ?? 0}</strong></span>
                                </span>

                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Members: <strong className="text-white font-mono">{gym.accounts?.members ?? 0}</strong></span>
                                </span>

                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                  <span>Trainers: <strong className="text-white font-mono">{gym.accounts?.trainers ?? 0}</strong></span>
                                </span>

                                {gym.packageAmount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium font-mono">
                                    <DollarSign className="w-3 h-3 text-amber-400" />
                                    <span>₹{Number(gym.packageAmount).toLocaleString('en-IN')}{gym.billingCycle ? `/${gym.billingCycle}` : ''}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons — Delete button available for ALL gyms */}
                          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
                            {/* Launch Owner Dashboard */}
                            <button
                              onClick={() => handleLoginAsOwner(gym)}
                              disabled={isImpersonating}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer hover:shadow-emerald-500/35"
                              title="Launch this gym's Owner Dashboard"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Login as Owner</span>
                            </button>

                            {/* Edit All Details */}
                            <button
                              onClick={() => handleOpenEdit(gym)}
                              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:border-indigo-500/50"
                              title="Edit facility details and owner credentials"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit All</span>
                            </button>

                            {/* Delete Gym Button — Available for EVERY gym */}
                            <button
                              onClick={() => handleDeleteGym(gym.id, gym.name)}
                              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
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
              <div className="p-6 rounded-3xl bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-slate-400">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Monthly MRR</h4>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white font-mono tracking-tight">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-amber-400 mt-1 font-semibold">Active SaaS recurring monthly billing rate</p>
              </div>

              <div className="p-6 rounded-3xl bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-slate-400">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Projected Annual ARR</h4>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white font-mono tracking-tight">
                  ₹{(totalMRR * 12).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-indigo-400 mt-1 font-semibold">Annualized run rate from active gyms</p>
              </div>

              <div className="p-6 rounded-3xl bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-slate-400">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total System Accounts</h4>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white font-mono tracking-tight">
                  {stats.totalAccounts}
                </div>
                <p className="text-xs text-purple-400 mt-1 font-semibold">Total owners, trainers & members across all gyms</p>
              </div>
            </div>

            {/* Real Breakdown Overview */}
            <div className="p-6 rounded-3xl bg-[#0e1017]/80 backdrop-blur-xl border border-white/[0.08] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Real Multi-Tenant Database Metrics</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#07080d] border border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Active Gyms</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">{activeGymsCount}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#07080d] border border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Suspended Gyms</span>
                  <div className="text-xl font-black text-rose-400 font-mono">{suspendedGymsCount}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#07080d] border border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Enrolled Members</span>
                  <div className="text-xl font-black text-cyan-400 font-mono">{stats.totalMembers}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#07080d] border border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Coaches & Trainers</span>
                  <div className="text-xl font-black text-indigo-400 font-mono">{stats.totalTrainers}</div>
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
        {/* TAB 4: ABOUT & LEGAL SUPPORT PAGES                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'pages' && <PagesManager />}
      </main>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: COMPREHENSIVE EDIT GYM & OWNER (MULTI-TAB)          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isEditModalOpen && createPortal(
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-[#0e1017] border border-white/[0.1] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Edit Facility & Owner: {editGymForm.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID #{editGymForm.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form - Single Unified Form (No Tabs) */}
            <form onSubmit={handleUpdateGym} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* SECTION 1: FACILITY PROFILE & PLAN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.08] text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>1. Facility Profile & SaaS Subscription</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Gym Name *</label>
                    <input
                      type="text"
                      required
                      value={editGymForm.name}
                      onChange={(e) => setEditGymForm({ ...editGymForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Tagline (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.tagline}
                      onChange={(e) => setEditGymForm({ ...editGymForm, tagline: e.target.value })}
                      placeholder="e.g. Strength & Performance Studio"
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Gym Logo & Live Preview */}
                <div className="p-3 bg-[#07080d] border border-white/[0.09] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Facility Logo (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Shown in Top Navbar & Member App</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {editGymForm.logo ? (
                      <div className="w-12 h-12 rounded-xl bg-white border border-indigo-400/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        <img src={editGymForm.logo} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base shrink-0">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Image</span>
                        </label>
                        {editGymForm.logo && (
                          <button
                            type="button"
                            onClick={() => setEditGymForm({ ...editGymForm, logo: '' })}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/20 cursor-pointer"
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
                        className="w-full px-3 py-1.5 bg-[#0e1017] border border-white/[0.08] rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Physical Address (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.address}
                      onChange={(e) => setEditGymForm({ ...editGymForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">City (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.city}
                      onChange={(e) => setEditGymForm({ ...editGymForm, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">State (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.state}
                      onChange={(e) => setEditGymForm({ ...editGymForm, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Pincode (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.pincode}
                      onChange={(e) => setEditGymForm({ ...editGymForm, pincode: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">GST Number (Optional)</label>
                    <input
                      type="text"
                      value={editGymForm.gst_number}
                      onChange={(e) => setEditGymForm({ ...editGymForm, gst_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Plan Tier & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>SaaS Plan Tier (Optional)</span>
                      {editGymForm.package_tier && (
                        <span className="text-[10px] text-indigo-400 font-normal">Active Tier</span>
                      )}
                    </label>
                    <select
                      value={editGymForm.package_tier}
                      onChange={(e) => handlePlanChangeForEditGym(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {editGymForm.billing_cycle === 'Annual' ? 'Annual Billing Amount (₹)' : 'Monthly Billing Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500"
                      value={editGymForm.package_amount}
                      onChange={(e) => setEditGymForm({ ...editGymForm, package_amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Facility Account Status</label>
                    <select
                      value={editGymForm.status}
                      onChange={(e) => setEditGymForm({ ...editGymForm, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: OWNER CREDENTIALS */}
              <div className="space-y-4 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.08] text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>2. Owner Login Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Owner Full Name</label>
                    <input
                      type="text"
                      value={editGymForm.owner_name}
                      onChange={(e) => setEditGymForm({ ...editGymForm, owner_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Owner Mobile Number (Login ID)</label>
                    <input
                      type="tel"
                      value={editGymForm.owner_phone}
                      onChange={(e) => setEditGymForm({ ...editGymForm, owner_phone: sanitizePhone(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Owner Email (Optional)</label>
                    <input
                      type="email"
                      value={editGymForm.owner_email}
                      onChange={(e) => setEditGymForm({ ...editGymForm, owner_email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Reset Security Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep unchanged"
                      value={editGymForm.new_password}
                      onChange={(e) => setEditGymForm({ ...editGymForm, new_password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: CAPACITY & LIMITS */}
              <div className="space-y-4 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.08] text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Sliders className="w-4 h-4" />
                  <span>3. Capacity Quotas & Administrative Notes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">Max Athletes</label>
                      {(!editGymForm.max_members || editGymForm.package_tier?.toLowerCase() === 'platinum') && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
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
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">Max Coaches</label>
                      {(!editGymForm.max_trainers || editGymForm.package_tier?.toLowerCase() === 'platinum') && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
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
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">Max Branches</label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {editGymForm.max_branches ? `${editGymForm.max_branches} Gyms` : '1 Gym'}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1 or 3"
                      value={editGymForm.max_branches}
                      onChange={(e) => setEditGymForm({ ...editGymForm, max_branches: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Administrative Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={editGymForm.notes}
                    onChange={(e) => setEditGymForm({ ...editGymForm, notes: e.target.value })}
                    placeholder="Notes, terms or branch details..."
                    className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white text-xs font-black tracking-wide shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer"
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
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-[#0e1017] border border-white/[0.1] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Onboard New Facility Center</h3>
                  <p className="text-xs text-slate-400">Provision facility entity and owner credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGym} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Facility Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Iron & Fitness Athletic Club"
                      value={newGymForm.gym_name}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Facility Tagline (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Strength & Performance Studio"
                      value={newGymForm.tagline}
                      onChange={(e) => setNewGymForm({ ...newGymForm, tagline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Gym Logo & Live Preview */}
                <div className="p-3 bg-[#07080d] border border-white/[0.09] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Facility Logo (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Shown in Top Navbar & Member App</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {newGymForm.logo ? (
                      <div className="w-12 h-12 rounded-xl bg-white border border-indigo-400/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        <img src={newGymForm.logo} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base shrink-0">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Image</span>
                        </label>
                        {newGymForm.logo && (
                          <button
                            type="button"
                            onClick={() => setNewGymForm({ ...newGymForm, logo: '' })}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/20 cursor-pointer"
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
                        className="w-full px-3 py-1.5 bg-[#0e1017] border border-white/[0.08] rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Facility Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Floor, Trade Center, Linking Road"
                      value={newGymForm.gym_address}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">City (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={newGymForm.gym_city}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Plan Tier & Package Amount (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>SaaS Plan Tier (Optional)</span>
                      {newGymForm.package_tier && (
                        <span className="text-[10px] text-indigo-400 font-normal">Pricing &amp; limits auto-filled</span>
                      )}
                    </label>
                    <select
                      value={newGymForm.package_tier}
                      onChange={(e) => handlePlanChangeForNewGym(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Monthly Billing Amount (₹) (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500"
                      value={newGymForm.package_amount}
                      onChange={(e) => setNewGymForm({ ...newGymForm, package_amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Capacity Limits (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Max Athletes (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 500"
                      value={newGymForm.max_members}
                      onChange={(e) => setNewGymForm({ ...newGymForm, max_members: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Max Coaches (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 10"
                      value={newGymForm.max_trainers}
                      onChange={(e) => setNewGymForm({ ...newGymForm, max_trainers: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Owner Credentials */}
                <div className="p-4.5 rounded-2xl bg-[#08090f] border border-white/[0.08] space-y-3.5">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Owner Login Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Owner Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Singhania"
                        value={newGymForm.owner_name}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#0e1017] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Owner Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9820154321"
                        value={newGymForm.owner_phone}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_phone: sanitizePhone(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-[#0e1017] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Owner Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="owner@gym.com"
                        value={newGymForm.owner_email}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#0e1017] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Password *</label>
                      <input
                        type="text"
                        required
                        placeholder="Set owner password"
                        value={newGymForm.owner_password}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_password: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#0e1017] border border-white/[0.09] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white text-xs font-black tracking-wide shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer"
                >
                  Onboard Facility & Owner
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
