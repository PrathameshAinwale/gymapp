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
  Unlock,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Sliders,
  Zap,
  TrendingUp,
  Server,
  Database,
  Upload,
  Image as ImageIcon,
  Layers,
  FileText,
  KeyRound,
  ShieldAlert,
  MessageSquare,
  Ban,
  ChevronDown,
  Menu,
  RotateCcw,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { api } from '../../services/api';
import { PlansManager } from './PlansManager';
import { PagesManager } from './PagesManager';
import { SuperadminCredentialsManager } from './SuperadminCredentialsManager';
import { SuperadminWhatsAppManager } from './SuperadminWhatsAppManager';
import { GymWhatsAppModal } from './GymWhatsAppModal';
import { AddAdminModal } from './AddAdminModal';
import { PACKAGE_PLANS } from './packagePlans';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  hasSqlInjection,
  sanitizePhone,
  isValidEmail,
  isValidPhone,
  sanitizeText
} from '../../utils/validation';

export const SuperadminDashboard = ({ superUser, setSuperUser, onLogout }) => {
  const [activeMainTab, setActiveMainTab] = useState('gyms'); // 'gyms' | 'analytics' | 'plans' | 'pages' | 'credentials'
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
  const [whatsAppModalGym, setWhatsAppModalGym] = useState(null);
  const [clearDataModalGym, setClearDataModalGym] = useState(null);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
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
  const [gymToDelete, setGymToDelete] = useState(null);
  const [isDeletingGym, setIsDeletingGym] = useState(false);

  const handleConfirmDeleteGym = async () => {
    if (!gymToDelete) return;
    try {
      setIsDeletingGym(true);
      await api.superadmin.deleteGym(gymToDelete.id);
      showToast(`Gym "${gymToDelete.name}" deleted successfully.`);
      setGymToDelete(null);
      loadData();
    } catch (err) {
      alert('Failed to delete gym: ' + (err.message || 'Server error'));
    } finally {
      setIsDeletingGym(false);
    }
  };

  // Clear Member & Operational Data for Gym (keeps gym and owner)
  const handleConfirmClearData = async () => {
    if (!clearDataModalGym) return;
    setIsClearingData(true);
    try {
      const res = await api.superadmin.clearGymData(clearDataModalGym.id);
      if (res?.success) {
        showToast(res.message || `All member & trainer data cleared for "${clearDataModalGym.name}".`);
        setClearDataModalGym(null);
        await loadData();
      } else {
        showToast(res?.message || 'Failed to clear data.');
      }
    } catch (err) {
      alert('Error clearing gym data: ' + (err.message || 'Server error'));
    } finally {
      setIsClearingData(false);
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

  const superadminNavTabs = [
    { id: 'gyms', label: 'Facilities Directory', icon: Building2, count: gyms.length },
    { id: 'plans', label: 'SaaS Plans', icon: Layers },
    { id: 'whatsapp', label: 'WhatsApp Gateway', icon: MessageSquare },
    { id: 'pages', label: 'About & Support', icon: FileText },
    { id: 'credentials', label: 'Admin Credentials', icon: KeyRound },
    { id: 'analytics', label: 'Platform Telemetry', icon: TrendingUp }
  ];

  const currentTabMeta = superadminNavTabs.find((t) => t.id === activeMainTab) || superadminNavTabs[0];

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col lg:flex-row font-sans relative selection:bg-indigo-600 selection:text-white overflow-x-hidden">
      {/* Subtle Precision Micro-Grid */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)', backgroundSize: '28px 28px' }}
      />

      {/* Floating System Notification Toast */}
      {toastMessage && createPortal(
        <div
          style={{ zIndex: 999999 }}
          className="fixed top-5 right-5 z-[999999] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs shadow-xl flex items-center gap-2.5 animate-fadeIn"
        >
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-wide text-slate-200">{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 p-1 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-full h-full" />
          </div>
          <span className="text-sm font-black text-slate-900 font-heading tracking-tight">ARCHFIT</span>
          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full uppercase">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddAdminModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            title="Create a new Superadmin administrator account"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ADMIN</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW</span>
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 transition-opacity"
        />
      )}

      {/* Left Sidebar (Desktop Fixed Sticky + Mobile Slide-over Drawer) - Compact Width w-60 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:h-screen lg:sticky lg:top-0 shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Brand Header */}
          <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 p-1 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                <ShieldCheck className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-slate-900 font-heading">
                    ARCHFIT
                  </span>
                  <span className="text-[8px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded uppercase">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">Superadmin Console</p>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Navigation Links List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Platform Modules
            </div>
            {superadminNavTabs.map((tab) => {
              const active = activeMainTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveMainTab(tab.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer text-left ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold shrink-0 ${
                        active
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300/60'
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

          {/* Sidebar Footer Controls */}
          
        </div>
      </aside>

      {/* Main Right Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Command Bar */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 py-3.5 items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <currentTabMeta.icon className="w-5 h-5 text-indigo-600" />
            <h1 className="text-base font-bold text-slate-900">{currentTabMeta.label}</h1>
            {currentTabMeta.count !== undefined && (
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentTabMeta.count}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAddAdminModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Create a new Superadmin administrator account"
            >
              <UserPlus className="w-4 h-4" />
              <span>ADD ADMIN</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ONBOARD FACILITY</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Sign out of Superadmin"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 w-full px-4 sm:px-8 py-5 space-y-5">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: FACILITIES DIRECTORY                                */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'gyms' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Real Executive KPI Overview Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Metric 1 */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 relative overflow-hidden group hover:border-slate-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Facilities</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-950 font-heading tracking-tight">
                  {stats.totalGyms}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{stats.activeGyms} Active Facilities</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 relative overflow-hidden group hover:border-slate-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tenants & Owners</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-950 font-heading tracking-tight">
                  {stats.totalOwners}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  Provisioned Owners
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 relative overflow-hidden group hover:border-slate-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Athletes & Members</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-950 font-heading tracking-tight">
                  {stats.totalMembers}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  Enrolled Across Facilities
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 relative overflow-hidden group hover:border-emerald-400 transition-all shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform MRR</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-xs">
                    ₹
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-950 font-heading tracking-tight">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Real Monthly Inflow</span>
                </div>
              </div>
            </div>

            {/* Facilities Directory List */}
            <div className="space-y-3">
              {/* Unified Toolbar: Title, Search Bar & Status Dropdown */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                {/* Title & Badge */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-950 font-heading flex items-center gap-2">
                    <span>Provisioned Facility Centers</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 border border-indigo-200/80 text-indigo-700">
                    {filteredGyms.length} Centers
                  </span>
                </div>

                {/* Search Bar & Status Dropdown */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-72 md:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by facility name, owner, email, city..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full sm:w-auto appearance-none pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
                    >
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {filteredGyms.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-white border border-slate-200/90 rounded-xl shadow-xs">
                  <Building2 className="w-10 h-10 mx-auto mb-2.5 opacity-30 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">No Facilities Found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Onboard a new facility using the button above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGyms.map((gym) => {
                    const tier = gym.packageTier || gym.package || '';

                    return (
                      <div
                        key={gym.id}
                        className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all space-y-3 relative group"
                      >
                        {/* Card Top: Monogram, Name, Badges & Top Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          {/* Facility Monogram & Main Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0 shadow-2xs overflow-hidden">
                              {gym.logo ? (
                                <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm tracking-tight font-heading font-black text-indigo-700">
                                  {gym.name ? gym.name.slice(0, 2).toUpperCase() : 'FC'}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-slate-950 text-base tracking-tight font-heading">
                                  {gym.name}
                                </h3>

                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                                  gym.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${gym.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <span>{gym.status || 'Active'}</span>
                                </span>
                              </div>

                              {gym.tagline && (
                                <p className="text-xs text-slate-500 italic mt-0.5">"{gym.tagline}"</p>
                              )}
                            </div>
                          </div>

                          {/* Top Quick Actions (Login as Owner & Stop/Restore Access) */}
                          <div className="flex items-center gap-2 self-start lg:self-center shrink-0 flex-wrap">
                            {gym.status === 'Suspended' ? (
                              <button
                                onClick={() => handleRestoreAccess(gym)}
                                disabled={isProcessingAccess}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Restore platform access for owner and all accounts"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Restore Access</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleInitiateStopAccess(gym)}
                                disabled={isProcessingAccess}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                                title="Stop all access for this owner and all created accounts"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Stop Access</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleLoginAsOwner(gym)}
                              disabled={isImpersonating || gym.status === 'Suspended'}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                gym.status === 'Suspended'
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-2xs'
                              }`}
                              title={gym.status === 'Suspended' ? 'Access stopped' : "Launch this gym's Owner Dashboard"}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Login as Owner</span>
                            </button>
                          </div>
                        </div>

                        {/* Card Middle: Detailed Structured Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                          {/* Box 1: Owner Details */}
                          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                              Owner Contact
                            </span>
                            {gym.owner ? (
                              <>
                                <div className="flex items-center gap-1.5 text-slate-950 font-bold">
                                  <User className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                                  <span>{gym.owner.name}</span>
                                </div>
                                {gym.owner.phone && (
                                  <div className="flex items-center gap-1.5 text-slate-600">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono">{gym.owner.phone}</span>
                                  </div>
                                )}
                                {gym.owner.email && (
                                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono text-[11px] truncate">{gym.owner.email}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-amber-800 font-semibold text-[11px]">No Owner Account Linked</span>
                            )}
                          </div>

                          {/* Box 2: Facility Location & Contact */}
                          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                              Facility Location
                            </span>
                            {(gym.address || gym.city) ? (
                              <div className="flex items-start gap-1.5 text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{[gym.address, gym.city].filter(Boolean).join(', ')}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No address provided</span>
                            )}
                            {gym.email && (!gym.owner || gym.owner.email !== gym.email) && (
                              <div className="flex items-center gap-1.5 text-slate-600 truncate pt-0.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono text-[11px] truncate">{gym.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Box 3: Subscription Plan & Rate */}
                          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                              SaaS Subscription
                            </span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-950 text-xs sm:text-sm">{tier || 'Standard Plan'}</span>
                              {gym.packageAmount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-[11px]">
                                  ₹{Number(gym.packageAmount).toLocaleString('en-IN')}{gym.billingCycle ? `/${gym.billingCycle}` : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Billing Cycle: <strong className="text-slate-700 font-medium capitalize">{gym.billingCycle || 'Monthly'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom: Metrics Ribbon & Management Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
                          {/* Accounts & Members Metrics Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-medium text-[11px]">
                              <Users className="w-3 h-3 text-slate-600" />
                              <span>Total: <strong className="font-mono font-bold text-slate-950">{gym.accounts?.total ?? 0}</strong></span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Members: <strong className="font-mono font-bold text-slate-950">{gym.accounts?.members ?? 0}</strong></span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>Trainers: <strong className="font-mono font-bold text-slate-950">{gym.accounts?.trainers ?? 0}</strong></span>
                            </span>
                          </div>

                          {/* Action Buttons: WhatsApp Automation, Clear Data, Edit All, Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* WhatsApp Automation Setup Button */}
                            <button
                              onClick={() => setWhatsAppModalGym(gym)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                              title={`Configure WhatsApp Gateway & Automation for ${gym.name}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-white" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Clear Gym Data Button */}
                            <button
                              onClick={() => setClearDataModalGym(gym)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 hover:border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                              title={`Clear all member data, trainer data, invoices & records for ${gym.name} (keeps gym and owner)`}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>Clear Data</span>
                            </button>

                            {/* Edit All Details Button */}
                            <button
                              onClick={() => handleOpenEdit(gym)}
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                              title="Edit facility details and owner credentials"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                              <span>Edit All</span>
                            </button>

                            {/* Delete Gym Button */}
                            <button
                              onClick={() => setGymToDelete(gym)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer active:scale-95"
                              title="Permanently delete this gym and its accounts"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 text-slate-500">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Monthly MRR</h4>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-xs">
                    ₹
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-amber-600 mt-1 font-semibold">Active SaaS recurring monthly billing rate</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 text-slate-500">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Projected Annual ARR</h4>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  ₹{(totalMRR * 12).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-indigo-600 mt-1 font-semibold">Annualized run rate from active gyms</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 text-slate-500">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total System Accounts</h4>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.totalAccounts}
                </div>
                <p className="text-[11px] text-purple-600 mt-1 font-semibold">Total owners, trainers & members across all gyms</p>
              </div>
            </div>

            {/* Real Breakdown Overview */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Real Multi-Tenant Database Metrics</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">Active Gyms</span>
                  <div className="text-lg font-black text-emerald-600 font-mono">{activeGymsCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">Suspended Gyms</span>
                  <div className="text-lg font-black text-rose-600 font-mono">{suspendedGymsCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">Enrolled Members</span>
                  <div className="text-lg font-black text-cyan-600 font-mono">{stats.totalMembers}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">Coaches & Trainers</span>
                  <div className="text-lg font-black text-indigo-600 font-mono">{stats.totalTrainers}</div>
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
          <SuperadminWhatsAppManager showToast={showToast} initialGyms={gyms} />
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
      </div>

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

      {/* Clear Gym Data Confirmation Modal */}
      {clearDataModalGym && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-5 sm:p-7 relative overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base font-heading">
                    Clear Gym Member & Operational Data
                  </h3>
                  <p className="text-xs text-slate-500">
                    Purge all records for <strong className="text-slate-800">{clearDataModalGym.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClearDataModalGym(null)}
                disabled={isClearingData}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="leading-relaxed">
                You are about to <strong className="text-amber-800 font-bold">wipe all member, trainer, and invoice data</strong> for this facility. The gym itself and its owner account will be preserved.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Facility:</span>
                  <span className="font-bold text-slate-900 font-mono">{clearDataModalGym.name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Facility Owner (Preserved):</span>
                  <span className="font-bold text-emerald-700 font-mono">{clearDataModalGym.owner?.name || 'No Owner'} (Kept Active)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Members to be Deleted:</span>
                  <span className="font-black text-rose-700 font-mono bg-rose-100/70 px-2.5 py-0.5 rounded border border-rose-200">
                    {clearDataModalGym.accounts?.members ?? 0} members
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Trainers & Staff to be Deleted:</span>
                  <span className="font-black text-rose-700 font-mono bg-rose-100/70 px-2.5 py-0.5 rounded border border-rose-200">
                    {clearDataModalGym.accounts?.trainers ?? 0} accounts
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 pl-2 border-l-2 border-amber-300 space-y-0.5 mt-2">
                  <div>• Invoices, billing history & payments will be purged.</div>
                  <div>• Member profiles, attendance logs & body metrics will be deleted.</div>
                  <div>• Trainer profiles, reviews, payroll & commissions will be cleared.</div>
                  <div>• Gym pricing packages & facility settings will remain untouched.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Permanent Action:</strong> Once cleared, member and financial history cannot be recovered. The gym owner can immediately start registering new members on a clean slate.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearDataModalGym(null)}
                disabled={isClearingData}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer"
              >
                Cancel (Keep Data)
              </button>
              <button
                type="button"
                onClick={handleConfirmClearData}
                disabled={isClearingData}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black tracking-wide shadow-md shadow-amber-600/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isClearingData ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing Data...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Yes, Clear Member Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(gymToDelete)}
        onClose={() => setGymToDelete(null)}
        onConfirm={handleConfirmDeleteGym}
        isDeleting={isDeletingGym}
        title="Confirm Deletion"
        itemType="gym"
        recordName={gymToDelete?.name}
        description="All owner, member, trainer accounts, and data associated with this gym will be purged immediately."
        message={
          gymToDelete
            ? `Are you sure you want to permanently delete "${gymToDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this gym? This action cannot be undone.'
        }
      />

      {/* Dedicated per-Gym WhatsApp Automation Modal */}
      {whatsAppModalGym && (
        <GymWhatsAppModal
          gym={whatsAppModalGym}
          onClose={() => setWhatsAppModalGym(null)}
          showToast={showToast}
          onSaved={loadData}
        />
      )}

      {/* Add Superadmin Modal */}
      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        onAdminCreated={(newAdmin) => {
          showToast(`Superadmin "${newAdmin.name}" created! They can now log in at /superadmin.`);
        }}
        showToast={showToast}
      />
    </div>
  );
};
