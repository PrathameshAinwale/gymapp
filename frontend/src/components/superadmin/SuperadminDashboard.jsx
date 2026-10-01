import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PulseFitLogo } from '../common/PulseFitLogo';
import {
  Building2,
  Users,
  Shield,
  Plus,
  Search,
  Key,
  Copy,
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
  AlertTriangle,
  X,
  Lock,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Tag,
  Star,
  ChevronDown,
  Smartphone,
  Sliders,
  CheckCircle2,
  Layers,
  Globe,
  FileText,
  CreditCard,
  Zap,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldAlert,
  Activity,
  DollarSign
} from 'lucide-react';
import { api } from '../../services/api';
import {
  hasSqlInjection,
  sanitizeDecimal,
  sanitizePhone,
  preventNonNumericKey,
  preventNonPhoneKey,
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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);

  // Edit Modal Active Tab
  const [editModalTab, setEditModalTab] = useState('general'); // 'general' | 'owner' | 'limits'

  // Password visibility map: { [gymId]: boolean }
  const [visiblePasswords, setVisiblePasswords] = useState({});
  // Copied indicator map: { [fieldKey]: boolean }
  const [copiedKey, setCopiedKey] = useState(null);

  // Toast / Alert banner
  const [toastMessage, setToastMessage] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (gymId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [gymId]: !prev[gymId]
    }));
  };

  // Fetch Gyms and Platform Stats from backend
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gymsRes, statsRes] = await Promise.allSettled([
        api.superadmin.getGyms(),
        api.superadmin.getStats()
      ]);

      if (gymsRes.status === 'fulfilled' && gymsRes.value?.gyms) {
        setGyms(gymsRes.value.gyms);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        setStats(statsRes.value.stats);
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

  // Form states with Package Tier & Package Amount defaults
  const [newGymForm, setNewGymForm] = useState({
    owner_name: '',
    owner_email: '',
    owner_password: 'gym' + Math.floor(1000 + Math.random() * 9000),
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
    gym_package: 'Basic',
    package_tier: 'Basic',
    billing_cycle: 'Monthly',
    package_amount: 999,
    max_members: 150,
    max_trainers: 3,
    max_branches: 1,
    features: ['enquiry', 'members', 'plans', 'attendance', 'settings'],
    notes: ''
  });

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
    package: 'Basic',
    package_tier: 'Basic',
    billing_cycle: 'Monthly',
    package_amount: 999,
    subscription_expires_at: '',
    max_members: 150,
    max_trainers: 3,
    max_branches: 1,
    status: 'Active',
    notes: '',
    features: [],
    new_password: '',
    owner_name: '',
    owner_phone: '',
    owner_email: ''
  });

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

    if (newGymForm.owner_email && !isValidEmail(newGymForm.owner_email)) {
      alert('Please enter a valid owner email address.');
      return;
    }

    try {
      const res = await api.superadmin.createGym(newGymForm);
      if (res?.success) {
        showToast(`Gym "${newGymForm.gym_name}" and Owner ${newGymForm.owner_name} onboarded successfully!`);
        setIsAddModalOpen(false);
        setNewGymForm({
          owner_name: '',
          owner_email: '',
          owner_password: 'gym' + Math.floor(1000 + Math.random() * 9000),
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
          gym_package: 'Standard',
          package_tier: 'Standard',
          billing_cycle: 'Monthly',
          package_amount: 0,
          max_members: 1000,
          max_trainers: 20,
          max_branches: 1,
          features: [],
          notes: ''
        });
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
      name: gym.name,
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
      package: gym.packageTier || gym.package || 'Standard',
      package_tier: gym.packageTier || gym.package || 'Standard',
      billing_cycle: gym.billingCycle || 'Monthly',
      package_amount: gym.packageAmount != null ? Number(gym.packageAmount) : 0,
      subscription_expires_at: gym.subscriptionExpiresAt || gym.subscription_expires_at || '',
      max_members: gym.maxMembers ?? 1000,
      max_trainers: gym.maxTrainers ?? 20,
      max_branches: gym.maxBranches ?? 1,
      status: gym.status || 'Active',
      notes: gym.notes || '',
      features: Array.isArray(gym.features) ? gym.features : [],
      new_password: '',
      owner_name: gym.owner?.name || '',
      owner_phone: gym.owner?.phone || gym.phone || '',
      owner_email: gym.owner?.email || gym.email || ''
    });
    setEditModalTab('general');
    setIsEditModalOpen(true);
  };

  // Update Gym
  const handleUpdateGym = async (e) => {
    e.preventDefault();
    try {
      const res = await api.superadmin.updateGym(editGymForm.id, editGymForm);
      if (res?.success) {
        showToast(`Gym "${editGymForm.name}" updated successfully!`);
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
        showToast(`Switching to ${gym.name} Owner Dashboard...`);
        setTimeout(() => {
          window.location.href = '/';
        }, 600);
      }
    } catch (err) {
      alert('Unable to launch owner session: ' + (err.message || 'Server error'));
      setIsImpersonating(false);
    }
  };

  // Delete Gym
  const handleDeleteGym = async (gymId, gymName) => {
    const isDefaultGym = gymId === 1;
    if (isDefaultGym) {
      alert('Protected Action: The primary default club (ID: 1) cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${gymName}"? All owner, member, and trainer accounts associated with this gym will be purged.`)) {
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

  return (
    <div className="min-h-screen bg-[#06080f] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Toast Alert */}
      {toastMessage && typeof document !== 'undefined' && createPortal(
        <div
          style={{ zIndex: 999999 }}
          className="fixed top-5 right-5 z-[999999] px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black text-xs shadow-2xl shadow-cyan-500/30 flex items-center gap-2 animate-fadeIn"
        >
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Top Superadmin Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <PulseFitLogo variant="horizontal" size="sm" theme="dark" />
          <div className="h-5 w-px bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest">
              SUPERADMIN PORTAL
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Root Access
            </span>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black tracking-wide transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">ADD NEW GYM</span>
            <span className="xs:hidden">ADD</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Sign out of Superadmin"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Command Center Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'gyms', label: 'Gyms & Owners Directory', icon: Building2, count: gyms.length },
              { id: 'analytics', label: 'Platform Telemetry', icon: Activity }
            ].map((tab) => {
              const active = activeMainTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-300">
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
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Database'}</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: GYMS & OWNERS DIRECTORY                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'gyms' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Executive KPI Overview Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#0b101d]/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Gyms</span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {stats.totalGyms || gyms.length}
                </div>
                <div className="text-[11px] text-cyan-400 font-semibold mt-1 flex items-center gap-1">
                  <span>{stats.activeGyms || gyms.length} Active Centers</span>
                </div>
              </div>

              <div className="bg-[#0b101d]/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Gym Owners</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {stats.totalOwners || gyms.length}
                </div>
                <div className="text-[11px] text-amber-400 font-semibold mt-1">
                  Provisioned Owners
                </div>
              </div>

              <div className="bg-[#0b101d]/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Athletes & Members</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {stats.totalMembers ?? 0}
                </div>
                <div className="text-[11px] text-purple-400 font-semibold mt-1">
                  Enrolled Across All Gyms
                </div>
              </div>

              <div className="bg-[#0b101d]/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">System Health</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  100%
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                  All Systems Operational
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search gym, owner, email, city..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold px-1.5">Status:</span>
                  {['All', 'Active', 'Suspended'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                        statusFilter === status
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gyms & Owners List */}
            <div className="bg-[#0b101e]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <span>Registered Facilities & Owners</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {filteredGyms.length} Gyms
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Full end-to-end management of facilities, credentials, plans, and feature access.
                  </p>
                </div>
              </div>

              {filteredGyms.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="text-sm font-bold text-slate-400">No Gyms Found</p>
                  <p className="text-xs text-slate-500 mt-1">Adjust search or onboard a new gym facility.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {filteredGyms.map((gym) => {
                    const isPassVisible = !!visiblePasswords[gym.id];
                    const rawPass = gym.owner?.loginPassword || gym.initialPassword;
                    const ownerPassword = (!rawPass || rawPass.startsWith('$2y$') || rawPass.startsWith('$2a$') || rawPass.length >= 50) ? '••••••••' : rawPass;
                    const isDefaultGym = gym.id === 1;

                    return (
                      <div key={gym.id} className="p-4 sm:p-5 hover:bg-slate-900/40 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Facility & Owner Details */}
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold shrink-0 shadow-sm">
                              {gym.logo ? (
                                <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover rounded-2xl" />
                              ) : (
                                <Building2 className="w-5 h-5 text-cyan-400" />
                              )}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-white text-base tracking-tight">{gym.name}</h3>
                                {isDefaultGym && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    PRIMARY CLUB
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  gym.status === 'Active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {gym.status || 'Active'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{gym.address || 'Address not set'}, {gym.city || 'City not set'}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>Owner: <strong>{gym.owner?.name || 'Unassigned'}</strong></span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span className="text-slate-300 font-mono text-[11px]">{gym.owner?.email || gym.email}</span>
                                </span>
                              </div>

                              <div className="pt-1 text-[11px] text-slate-500">
                                <span>• {gym.accounts?.members ?? 0} active members enrolled</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions & Impersonation */}
                          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                            {/* Launch Owner Dashboard */}
                            <button
                              onClick={() => handleLoginAsOwner(gym)}
                              disabled={isImpersonating}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                              title="Directly launch and manage this gym's Owner Dashboard"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Login as Owner</span>
                            </button>

                            {/* Edit All Details */}
                            <button
                              onClick={() => handleOpenEdit(gym)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Edit all facility, credentials, plans, and feature settings"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit All</span>
                            </button>

                            {/* Delete Gym */}
                            {!isDefaultGym && (
                              <button
                                onClick={() => handleDeleteGym(gym.id, gym.name)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                                title="Delete Gym and accounts"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
        {/* TAB 2: PLATFORM TELEMETRY & ANALYTICS                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMainTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0b101e] border border-slate-800">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Total MRR (Monthly Run Rate)</h4>
                <div className="text-3xl font-black text-white font-mono">
                  ₹{gyms.reduce((acc, g) => acc + (Number(g.packageAmount) || 999), 0).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-emerald-400 mt-1">Platform SaaS recurring subscription value</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0b101e] border border-slate-800">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Active Member Footprint</h4>
                <div className="text-3xl font-black text-white font-mono">
                  {stats.totalMembers ?? 0}
                </div>
                <p className="text-xs text-cyan-400 mt-1">Athletes registered across all facilities</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0b101e] border border-slate-800">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Coach & Staff Roster</h4>
                <div className="text-3xl font-black text-white font-mono">
                  {stats.totalTrainers ?? 0}
                </div>
                <p className="text-xs text-purple-400 mt-1">Trainers utilizing coach builder modules</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: COMPREHENSIVE EDIT GYM & OWNER (MULTI-TAB)          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b101e] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Edit Facility & Owner: {editGymForm.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID #{editGymForm.id} • Assigned Tier: <strong>{editGymForm.package_tier}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1.5 px-4 pt-2.5 border-b border-slate-800 bg-slate-900/40 overflow-x-auto">
              {[
                { id: 'general', label: '1. Facility Profile', icon: Building2 },
                { id: 'owner', label: '2. Owner Credentials', icon: User },
                { id: 'limits', label: '3. Capacity & Notes', icon: Sliders }
              ].map((tab) => {
                const active = editModalTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEditModalTab(tab.id)}
                    className={`px-3 py-2 rounded-t-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-[#0b101e] text-cyan-400 border-t-2 border-cyan-500 border-x border-slate-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateGym} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: GENERAL & BRANDING */}
              {editModalTab === 'general' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Gym Name *</label>
                      <input
                        type="text"
                        required
                        value={editGymForm.name}
                        onChange={(e) => setEditGymForm({ ...editGymForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Tagline / Motto</label>
                      <input
                        type="text"
                        value={editGymForm.tagline}
                        onChange={(e) => setEditGymForm({ ...editGymForm, tagline: e.target.value })}
                        placeholder="e.g. Elite Athletic Club"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 mb-1">Physical Address</label>
                      <input
                        type="text"
                        value={editGymForm.address}
                        onChange={(e) => setEditGymForm({ ...editGymForm, address: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">City</label>
                      <input
                        type="text"
                        value={editGymForm.city}
                        onChange={(e) => setEditGymForm({ ...editGymForm, city: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">State / Province</label>
                      <input
                        type="text"
                        value={editGymForm.state}
                        onChange={(e) => setEditGymForm({ ...editGymForm, state: e.target.value })}
                        placeholder="e.g. Maharashtra"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Pincode / ZIP</label>
                      <input
                        type="text"
                        value={editGymForm.pincode}
                        onChange={(e) => setEditGymForm({ ...editGymForm, pincode: e.target.value })}
                        placeholder="e.g. 400050"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">GST / Business Tax ID</label>
                      <input
                        type="text"
                        value={editGymForm.gst_number}
                        onChange={(e) => setEditGymForm({ ...editGymForm, gst_number: e.target.value })}
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Facility Contact Phone</label>
                      <input
                        type="tel"
                        value={editGymForm.phone}
                        onChange={(e) => setEditGymForm({ ...editGymForm, phone: sanitizePhone(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Facility Contact Email</label>
                      <input
                        type="email"
                        value={editGymForm.email}
                        onChange={(e) => setEditGymForm({ ...editGymForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={editGymForm.website}
                        onChange={(e) => setEditGymForm({ ...editGymForm, website: e.target.value })}
                        placeholder="https://gym.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Logo URL</label>
                      <input
                        type="url"
                        value={editGymForm.logo}
                        onChange={(e) => setEditGymForm({ ...editGymForm, logo: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Operating Hours</label>
                      <input
                        type="text"
                        value={editGymForm.operating_hours}
                        onChange={(e) => setEditGymForm({ ...editGymForm, operating_hours: e.target.value })}
                        placeholder="Mon-Sun: 6:00 AM - 10:00 PM"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OWNER PROFILE & CREDENTIALS */}
              {editModalTab === 'owner' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-cyan-300">Owner Account Management</div>
                      <div className="text-[11px] text-slate-400">Update owner contact info or reset their login credentials</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoginAsOwner({ id: editGymForm.id, name: editGymForm.name })}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Launch Dashboard</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Owner Full Name *</label>
                      <input
                        type="text"
                        value={editGymForm.owner_name}
                        onChange={(e) => setEditGymForm({ ...editGymForm, owner_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Owner Phone Number</label>
                      <input
                        type="tel"
                        value={editGymForm.owner_phone}
                        onChange={(e) => setEditGymForm({ ...editGymForm, owner_phone: sanitizePhone(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Owner Email (Optional)</label>
                      <input
                        type="email"
                        value={editGymForm.owner_email}
                        placeholder="owner@example.com (optional)"
                        onChange={(e) => setEditGymForm({ ...editGymForm, owner_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Reset Password (Leave blank to keep current)</label>
                      <input
                        type="text"
                        value={editGymForm.new_password}
                        onChange={(e) => setEditGymForm({ ...editGymForm, new_password: e.target.value })}
                        placeholder="Enter new password to reset"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CAPACITY LIMITS & NOTES */}
              {editModalTab === 'limits' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Max Active Members</label>
                      <input
                        type="number"
                        min="1"
                        value={editGymForm.max_members}
                        onChange={(e) => setEditGymForm({ ...editGymForm, max_members: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Max Coaches / Trainers</label>
                      <input
                        type="number"
                        min="1"
                        value={editGymForm.max_trainers}
                        onChange={(e) => setEditGymForm({ ...editGymForm, max_trainers: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Account Status</label>
                      <select
                        value={editGymForm.status}
                        onChange={(e) => setEditGymForm({ ...editGymForm, status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="Active">Active (Fully Operational)</option>
                        <option value="Trial">Trial Period</option>
                        <option value="Suspended">Suspended (Access Blocked)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">SuperAdmin Internal Notes</label>
                    <textarea
                      rows={3}
                      value={editGymForm.notes}
                      onChange={(e) => setEditGymForm({ ...editGymForm, notes: e.target.value })}
                      placeholder="Add administrative notes, billing arrangement, etc."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black tracking-wide shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
                >
                  Save All Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD NEW GYM & OWNER                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b101e] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Onboard New Gym Facility</h3>
                  <p className="text-xs text-slate-400">Provision facility, plan tier, and owner master credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGym} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Facility Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Iron & Fitness Athletic Club"
                      value={newGymForm.gym_name}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Facility Tagline</label>
                    <input
                      type="text"
                      placeholder="e.g. Strength & Performance Studio"
                      value={newGymForm.tagline}
                      onChange={(e) => setNewGymForm({ ...newGymForm, tagline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Facility Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Floor, Trade Center, Linking Road"
                      value={newGymForm.gym_address}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={newGymForm.gym_city}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Capacity Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Max Active Members</label>
                    <input
                      type="number"
                      min="1"
                      value={newGymForm.max_members}
                      onChange={(e) => setNewGymForm({ ...newGymForm, max_members: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Max Coaches / Trainers</label>
                    <input
                      type="number"
                      min="1"
                      value={newGymForm.max_trainers}
                      onChange={(e) => setNewGymForm({ ...newGymForm, max_trainers: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Owner Credentials */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Owner Login Credentials
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Owner Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Singhania"
                        value={newGymForm.owner_name}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Owner Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9820154321"
                        value={newGymForm.owner_phone}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_phone: sanitizePhone(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Owner Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="owner@gym.com (optional)"
                        value={newGymForm.owner_email}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Initial Password *</label>
                      <input
                        type="text"
                        required
                        value={newGymForm.owner_password}
                        onChange={(e) => setNewGymForm({ ...newGymForm, owner_password: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black tracking-wide shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
                >
                  Onboard Gym & Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
