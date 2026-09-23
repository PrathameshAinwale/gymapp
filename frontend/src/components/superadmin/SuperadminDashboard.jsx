import React, { useState, useEffect } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { PACKAGE_PLANS, getPlanByTier } from './packagePlans';

export const SuperadminDashboard = ({ superUser, onLogout }) => {
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Password visibility map: { [gymId]: boolean }
  const [visiblePasswords, setVisiblePasswords] = useState({});
  // Copied indicator map: { [fieldKey]: boolean }
  const [copiedKey, setCopiedKey] = useState(null);

  // Toast / Alert banner
  const [toastMessage, setToastMessage] = useState(null);

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

  // Form states with Package Tier & Package Amount defaults (from Onboarding Plan)
  const [newGymForm, setNewGymForm] = useState({
    owner_name: '',
    owner_email: '',
    owner_password: 'gym' + Math.floor(1000 + Math.random() * 9000),
    owner_phone: '',
    gym_name: '',
    tagline: '',
    gym_address: '',
    gym_city: '',
    gym_phone: '',
    gym_email: '',
    operating_hours: '',
    currency: '₹',
    gym_package: 'Growth',
    package_tier: 'Growth',
    billing_cycle: 'Monthly',
    package_amount: 1799,
    max_members: 250,
    max_trainers: 7,
    max_branches: 1
  });

  const [editGymForm, setEditGymForm] = useState({
    id: null,
    name: '',
    tagline: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    operating_hours: '',
    currency: '₹',
    package: 'Growth',
    package_tier: 'Growth',
    billing_cycle: 'Monthly',
    package_amount: 1799,
    max_members: 250,
    max_trainers: 7,
    max_branches: 1,
    status: 'Active',
    new_password: '',
    owner_name: '',
    owner_phone: ''
  });

  const handleTierSelect = (tierName, formType = 'new') => {
    const plan = getPlanByTier(tierName);
    if (formType === 'new') {
      const cycle = newGymForm.billing_cycle;
      const amount = tierName === 'Enterprise'
        ? 0
        : (cycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice);
      setNewGymForm(prev => ({
        ...prev,
        package_tier: tierName,
        gym_package: tierName,
        package_amount: amount,
        max_members: typeof plan.activeMembers === 'number' ? plan.activeMembers : 2000,
        max_trainers: typeof plan.trainers === 'number' ? plan.trainers : 50,
        max_branches: typeof plan.branches === 'number' ? plan.branches : 3
      }));
    } else {
      const cycle = editGymForm.billing_cycle;
      const amount = tierName === 'Enterprise'
        ? 0
        : (cycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice);
      setEditGymForm(prev => ({
        ...prev,
        package_tier: tierName,
        package: tierName,
        package_amount: amount,
        max_members: typeof plan.activeMembers === 'number' ? plan.activeMembers : 2000,
        max_trainers: typeof plan.trainers === 'number' ? plan.trainers : 50,
        max_branches: typeof plan.branches === 'number' ? plan.branches : 3
      }));
    }
  };

  const handleCycleSelect = (cycle, formType = 'new') => {
    if (formType === 'new') {
      const plan = getPlanByTier(newGymForm.package_tier);
      const amount = newGymForm.package_tier === 'Enterprise'
        ? (newGymForm.package_amount || 0)
        : (cycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice);
      setNewGymForm(prev => ({
        ...prev,
        billing_cycle: cycle,
        package_amount: amount
      }));
    } else {
      const plan = getPlanByTier(editGymForm.package_tier);
      const amount = editGymForm.package_tier === 'Enterprise'
        ? (editGymForm.package_amount || 0)
        : (cycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice);
      setEditGymForm(prev => ({
        ...prev,
        billing_cycle: cycle,
        package_amount: amount
      }));
    }
  };

  const handleCreateGym = async (e) => {
    e.preventDefault();
    try {
      const res = await api.superadmin.createGym(newGymForm);
      if (res?.success) {
        showToast(`Gym Owner ${newGymForm.owner_name} onboarded with ${newGymForm.package_tier} tier!`);
        setIsAddModalOpen(false);
        setNewGymForm({
          owner_name: '',
          owner_email: '',
          owner_password: 'gym' + Math.floor(1000 + Math.random() * 9000),
          owner_phone: '',
          gym_name: '',
          tagline: '',
          gym_address: '',
          gym_city: '',
          gym_phone: '',
          gym_email: '',
          operating_hours: '',
          currency: '₹',
          gym_package: 'Growth',
          package_tier: 'Growth',
          billing_cycle: 'Monthly',
          package_amount: 1799,
          max_members: 250,
          max_trainers: 7,
          max_branches: 1
        });
        loadData();
      }
    } catch (err) {
      alert('Error creating gym: ' + err.message);
    }
  };

  const handleOpenEdit = (gym) => {
    setSelectedGym(gym);
    const plan = getPlanByTier(gym.packageTier || gym.package);
    setEditGymForm({
      id: gym.id,
      name: gym.name,
      tagline: gym.tagline || '',
      address: gym.address || '',
      city: gym.city || '',
      phone: gym.phone || gym.owner?.phone || '',
      email: gym.email || gym.owner?.email || '',
      operating_hours: gym.operating_hours || gym.operatingHours || '',
      currency: gym.currency || '₹',
      package: gym.packageTier || gym.package || 'Growth',
      package_tier: gym.packageTier || gym.package || 'Growth',
      billing_cycle: gym.billingCycle || 'Monthly',
      package_amount: gym.packageAmount ?? (gym.billingCycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice),
      max_members: gym.maxMembers ?? plan.activeMembers,
      max_trainers: gym.maxTrainers ?? plan.trainers,
      max_branches: gym.maxBranches ?? plan.branches,
      status: gym.status || 'Active',
      new_password: '',
      owner_name: gym.owner?.name || '',
      owner_phone: gym.owner?.phone || gym.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateGym = async (e) => {
    e.preventDefault();
    try {
      const res = await api.superadmin.updateGym(editGymForm.id, editGymForm);
      if (res?.success) {
        showToast('Gym & Owner details updated successfully!');
        setIsEditModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert('Error updating gym: ' + err.message);
    }
  };

  const handleDeleteGym = async (gymId, gymName) => {
    if (!window.confirm(`Are you sure you want to completely delete "${gymName}" and its owner account?`)) {
      return;
    }
    try {
      await api.superadmin.deleteGym(gymId);
      showToast(`Deleted ${gymName} from platform.`);
      loadData();
    } catch (err) {
      alert('Failed to delete gym: ' + err.message);
    }
  };

  // Filtered Gyms
  const filteredGyms = gyms.filter((g) => {
    const matchesSearch =
      g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Superadmin Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#0c121e]/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <PulseFitLogo variant="horizontal" size="sm" theme="dark" />
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider shrink-0">
            SUPERADMIN
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-[11px] sm:text-xs font-black tracking-wide transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">ADD NEW GYM</span>
            <span className="xs:hidden">ADD</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Sign out of Superadmin"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        
        {/* Executive KPI Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-[#0f172a]/90 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Gyms</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-white font-heading">
              {stats.totalGyms || gyms.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold mt-0.5 sm:mt-1 flex items-center gap-1 truncate">
              <span>{stats.activeGyms || gyms.length} Active Centers</span>
            </div>
          </div>

          <div className="bg-[#0f172a]/90 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Gym Owners</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-white font-heading">
              {stats.totalOwners || gyms.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-cyan-400 font-semibold mt-0.5 sm:mt-1 truncate">
              Provisioned Accounts
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#0f172a]/90 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Accounts</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-white font-heading">
              {stats.totalAccounts != null ? stats.totalAccounts : ((stats.totalOwners || gyms.length) + (stats.totalMembers || 0) + (stats.totalTrainers || 0))}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">
              {stats.totalMembers ?? 0} Members • {stats.totalTrainers ?? 0} Trainers
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gym, owner, email, city..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {['All', 'Active', 'Suspended'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                    statusFilter === status
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Refresh Gyms"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Gyms & Owners List */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-heading">
                Registered Gyms & Owner Accounts ({filteredGyms.length})
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Manage owner login credentials and inspect accounts breakdown
              </p>
            </div>
          </div>

          {filteredGyms.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-slate-500">
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-bold text-slate-400">No Gyms Found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or click "Add New Gym".</p>
            </div>
          ) : (
            <>
              {/* MOBILE CARDS VIEW (block sm:hidden) */}
              <div className="block sm:hidden divide-y divide-slate-800/80">
                {filteredGyms.map((gym) => {
                  const isPassVisible = !!visiblePasswords[gym.id];
                  const rawPass = gym.owner?.loginPassword || gym.initialPassword;
                  const ownerPassword = (!rawPass || rawPass.startsWith('$2y$') || rawPass.startsWith('$2a$') || rawPass.length >= 50) ? '••••••••' : rawPass;
                  const isDefaultGym = gym.id === 1;
                  const planTier = gym.packageTier || gym.package || 'Growth';
                  const planConfig = getPlanByTier(planTier);
                  const cycle = gym.billingCycle || 'Monthly';
                  const amount = gym.packageAmount != null
                    ? Number(gym.packageAmount)
                    : (cycle === 'Annual' ? planConfig.annualPrice : planConfig.monthlyPrice);

                  return (
                    <div key={`m-gym-${gym.id}`} className="p-3.5 space-y-3">
                      {/* Header row: Gym name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-white text-sm truncate">{gym.name}</h3>
                            <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{gym.address || 'Main Branch'}, {gym.city || 'Mumbai'}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border shrink-0 ${
                            gym.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${gym.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {gym.status || 'Active'}
                        </span>
                      </div>

                      {/* Package & Quota */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${planConfig.badgeColor}`}>
                            <Tag className="w-2.5 h-2.5" />
                            <span>{planTier}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">• {cycle}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-white text-xs">
                            {amount ? `₹${amount.toLocaleString('en-IN')}` : 'Custom'}
                          </span>
                        </div>
                      </div>

                      {/* Owner & Credentials */}
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Owner</span>
                          <span className="font-bold text-white text-xs">{gym.owner?.name || 'Assigned Owner'}</span>
                        </div>

                        {/* Email copy */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="text-[10px] font-mono text-slate-300 truncate">{gym.owner?.email || gym.email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(gym.owner?.email || gym.email, `m-email-${gym.id}`)}
                            className="text-slate-400 hover:text-emerald-400 p-1 cursor-pointer shrink-0"
                          >
                            {copiedKey === `m-email-${gym.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Password copy */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              {isPassVisible ? ownerPassword : '••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(gym.id)}
                              className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                            >
                              {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(ownerPassword, `m-pass-${gym.id}`)}
                              className="text-slate-400 hover:text-emerald-400 p-1 cursor-pointer"
                            >
                              {copiedKey === `m-pass-${gym.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Actions & Accounts counter */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGym(gym);
                            setIsDetailsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-bold text-slate-200 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{(gym.accounts?.members ?? 0) + (gym.accounts?.trainers ?? 0)} Accounts</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(gym)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isDefaultGym && (
                            <button
                              type="button"
                              onClick={() => handleDeleteGym(gym.id, gym.name)}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                              title="Delete Gym"
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

              {/* DESKTOP TABLE VIEW (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-extrabold border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Gym Center & Branch</th>
                      <th className="px-6 py-3.5">Gym Owner</th>
                      <th className="px-6 py-3.5">Package & Subscription</th>
                      <th className="px-6 py-3.5">Assigned Login Credentials</th>
                      <th className="px-6 py-3.5">Accounts Under Gym</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredGyms.map((gym) => {
                      const isPassVisible = !!visiblePasswords[gym.id];
                      const rawPass = gym.owner?.loginPassword || gym.initialPassword;
                      const ownerPassword = (!rawPass || rawPass.startsWith('$2y$') || rawPass.startsWith('$2a$') || rawPass.length >= 50) ? '••••••••' : rawPass;
                      const isDefaultGym = gym.id === 1;

                      return (
                        <tr key={gym.id} className="hover:bg-slate-850/40 transition-colors">
                          {/* Gym Center Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-extrabold text-white text-sm">
                                  {gym.name}
                                </div>
                                <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span>{gym.address || 'Central Road'}, {gym.city || 'Mumbai'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Gym Owner */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-black">
                                {(gym.owner?.name || 'O').charAt(0)}
                              </div>
                              <span>{gym.owner?.name || 'Assigned Owner'}</span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-1 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{gym.owner?.phone || gym.phone || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Package Tier & Amount */}
                          <td className="px-6 py-4">
                            {(() => {
                              const planTier = gym.packageTier || gym.package || 'Growth';
                              const planConfig = getPlanByTier(planTier);
                              const cycle = gym.billingCycle || 'Monthly';
                              const amount = gym.packageAmount != null
                                ? Number(gym.packageAmount)
                                : (cycle === 'Annual' ? planConfig.annualPrice : planConfig.monthlyPrice);

                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${planConfig.badgeColor}`}>
                                      <Tag className="w-2.5 h-2.5" />
                                      <span>{planTier}</span>
                                      {planConfig.isPopular && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      • {cycle}
                                    </span>
                                  </div>
                                  <div className="text-xs font-black text-white font-mono">
                                    {planTier === 'Enterprise' && !amount ? (
                                      <span className="text-rose-400">Custom Enterprise</span>
                                    ) : (
                                      <>
                                        ₹{amount?.toLocaleString('en-IN')}
                                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                                          / {cycle === 'Annual' ? 'year' : 'month'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Cap: {gym.maxMembers || planConfig.activeMembers} mem • {gym.maxTrainers || planConfig.trainers} coaches
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Assigned Login Credentials */}
                          <td className="px-6 py-4">
                            <div className="space-y-1.5 max-w-xs">
                              {/* Email */}
                              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="text-[11px] font-mono text-slate-300 truncate">
                                    {gym.owner?.email || gym.email}
                                  </span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(gym.owner?.email || gym.email, `email-${gym.id}`)}
                                  className="text-slate-400 hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                                  title="Copy Email"
                                >
                                  {copiedKey === `email-${gym.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>

                              {/* Password */}
                              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="flex items-center gap-1.5">
                                  <Key className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                    {isPassVisible ? ownerPassword : '••••••••'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => togglePasswordVisibility(gym.id)}
                                    className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                                    title={isPassVisible ? 'Hide Password' : 'Show Password'}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(ownerPassword, `pass-${gym.id}`)}
                                    className="text-slate-400 hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                                    title="Copy Password"
                                  >
                                    {copiedKey === `pass-${gym.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Accounts Under That Gym */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setSelectedGym(gym);
                                setIsDetailsModalOpen(true);
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-emerald-500/50 transition-colors group cursor-pointer"
                              title="Click to view breakdown"
                            >
                              <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                              <span className="font-black text-sm text-white font-mono">
                                {(gym.accounts?.members ?? 0) + (gym.accounts?.trainers ?? 0)}
                              </span>
                            </button>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                gym.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${gym.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              {gym.status || 'Active'}
                            </span>
                          </td>

                          {/* Management Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedGym(gym);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Inspect Accounts & Details"
                              >
                                <Users className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(gym)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                                title="Edit Gym / Reset Password"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {!isDefaultGym && (
                                <button
                                  onClick={() => handleDeleteGym(gym.id, gym.name)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                                  title="Delete Gym"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* 1. ADD GYM OWNER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl my-auto">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">Add New Gym Owner</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Provision owner credentials & register club</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGym} className="p-3.5 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] sm:text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                The owner can immediately log into the application using the email and password specified below.
              </div>

              {/* Gym Info & Branding Settings */}
              <div className="space-y-2.5 sm:space-y-3">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Gym / Fitness Center Details & Settings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Gym Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IronForge Athletic Club"
                      value={newGymForm.gym_name}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Tagline / Motto</label>
                    <input
                      type="text"
                      placeholder="e.g. India's Premier Strength Hub"
                      value={newGymForm.tagline}
                      onChange={(e) => setNewGymForm({ ...newGymForm, tagline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Physical Facility Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Plot 42, Hiranandani Business Park"
                      value={newGymForm.gym_address}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">City / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Powai, Mumbai"
                      value={newGymForm.gym_city}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Facility Contact Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98201 54321"
                      value={newGymForm.gym_phone}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Facility Contact Email</label>
                    <input
                      type="email"
                      placeholder="e.g. contact@ironforge.in"
                      value={newGymForm.gym_email}
                      onChange={(e) => setNewGymForm({ ...newGymForm, gym_email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Operating Hours Schedule</label>
                  <input
                    type="text"
                    placeholder="e.g. Mon-Sat: 5:30 AM - 11:00 PM | Sun: 6:00 AM - 8:00 PM"
                    value={newGymForm.operating_hours}
                    onChange={(e) => setNewGymForm({ ...newGymForm, operating_hours: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Package Tier Dropdown Section (Requested by User) */}
              <div className="space-y-2.5 sm:space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Package Plan & Pricing</span>
                  </div>

                  {/* Monthly / Annual Toggle */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleCycleSelect('Monthly', 'new')}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        newGymForm.billing_cycle === 'Monthly'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCycleSelect('Annual', 'new')}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        newGymForm.billing_cycle === 'Annual'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Annual</span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-black">Save ~17%</span>
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu to Select Plan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Select Package Tier Plan *
                    </label>
                    <div className="relative">
                      <select
                        value={newGymForm.package_tier}
                        onChange={(e) => handleTierSelect(e.target.value, 'new')}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
                      >
                        {PACKAGE_PLANS.map((plan) => {
                          const price = newGymForm.billing_cycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice;
                          const priceText = price != null ? `₹${price.toLocaleString('en-IN')}/${newGymForm.billing_cycle === 'Annual' ? 'yr' : 'mo'}` : 'Custom Pricing';
                          return (
                            <option key={plan.tier} value={plan.tier} className="bg-slate-900 text-white py-1">
                              {plan.tier} {plan.isPopular ? '(Popular)' : ''} — {priceText}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Package Amount (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={newGymForm.package_amount}
                        onChange={(e) => setNewGymForm({ ...newGymForm, package_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                        placeholder="Package Price in ₹"
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Plan Details Banner */}
                {(() => {
                  const currentPlan = getPlanByTier(newGymForm.package_tier);

                  return (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${currentPlan.badgeColor}`}>
                          <Tag className="w-2.5 h-2.5" />
                          <span>{currentPlan.tier}</span>
                          {currentPlan.isPopular && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-300">
                          Capacity: <strong>{currentPlan.activeMembers}</strong> Members • <strong>{currentPlan.trainers}</strong> Coaches
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Owner Credentials */}
              <div className="space-y-2.5 sm:space-y-3 pt-3 border-t border-slate-800">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Gym Owner Login Credentials
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikramaditya Singhania"
                      value={newGymForm.owner_name}
                      onChange={(e) => setNewGymForm({ ...newGymForm, owner_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98201 54321"
                      value={newGymForm.owner_phone}
                      onChange={(e) => setNewGymForm({ ...newGymForm, owner_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Login Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@ironforge.in"
                      value={newGymForm.owner_email}
                      onChange={(e) => setNewGymForm({ ...newGymForm, owner_email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-300">Set Initial Password *</label>
                      <button
                        type="button"
                        onClick={() => setNewGymForm({ ...newGymForm, owner_password: 'gym' + Math.floor(1000 + Math.random() * 9000) })}
                        className="text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Auto-generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newGymForm.owner_password}
                      onChange={(e) => setNewGymForm({ ...newGymForm, owner_password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black tracking-wide shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                >
                  PROVISION GYM OWNER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT GYM & OWNER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl my-auto">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white">Edit Gym & Owner Record</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGym} className="p-3.5 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Gym Name *</label>
                  <input
                    type="text"
                    required
                    value={editGymForm.name}
                    onChange={(e) => setEditGymForm({ ...editGymForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tagline / Motto</label>
                  <input
                    type="text"
                    placeholder="e.g. Premier Strength Hub"
                    value={editGymForm.tagline}
                    onChange={(e) => setEditGymForm({ ...editGymForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={editGymForm.address}
                    onChange={(e) => setEditGymForm({ ...editGymForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">City / Branch</label>
                  <input
                    type="text"
                    value={editGymForm.city}
                    onChange={(e) => setEditGymForm({ ...editGymForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Facility Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98201 54321"
                    value={editGymForm.phone}
                    onChange={(e) => setEditGymForm({ ...editGymForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Facility Contact Email</label>
                  <input
                    type="email"
                    placeholder="e.g. contact@gym.com"
                    value={editGymForm.email}
                    onChange={(e) => setEditGymForm({ ...editGymForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Operating Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Mon-Sat: 6:00 AM - 10:30 PM"
                    value={editGymForm.operating_hours}
                    onChange={(e) => setEditGymForm({ ...editGymForm, operating_hours: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Operational Status</label>
                  <select
                    value={editGymForm.status}
                    onChange={(e) => setEditGymForm({ ...editGymForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Trial">Trial</option>
                  </select>
                </div>
              </div>

              {/* Package Tier & Amount in Edit Modal */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Package Tier & Billing</span>
                  </span>

                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleCycleSelect('Monthly', 'edit')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        editGymForm.billing_cycle === 'Monthly'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCycleSelect('Annual', 'edit')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        editGymForm.billing_cycle === 'Annual'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Annual
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Package Tier</label>
                    <select
                      value={editGymForm.package_tier}
                      onChange={(e) => handleTierSelect(e.target.value, 'edit')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      {PACKAGE_PLANS.map((p) => (
                        <option key={p.tier} value={p.tier}>
                          {p.tier} {p.isPopular ? '(Popular)' : ''} ({p.activeMembers} members)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Package Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={editGymForm.package_amount}
                        onChange={(e) => setEditGymForm({ ...editGymForm, package_amount: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                        placeholder="5999"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Billing Cycle</label>
                  <select
                    value={editGymForm.billing_cycle}
                    onChange={(e) => setEditGymForm({ ...editGymForm, billing_cycle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="Monthly">Monthly Recurring</option>
                    <option value="Annual">Annual (12 Months)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editGymForm.owner_name}
                    onChange={(e) => setEditGymForm({ ...editGymForm, owner_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Owner Phone</label>
                  <input
                    type="text"
                    value={editGymForm.owner_phone}
                    onChange={(e) => setEditGymForm({ ...editGymForm, owner_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <label className="block text-[11px] font-bold text-amber-300 mb-1">
                  Reset Owner Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter new password to overwrite..."
                  value={editGymForm.new_password}
                  onChange={(e) => setEditGymForm({ ...editGymForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-amber-500/30 rounded-xl text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave blank to retain current password ({selectedGym?.initialPassword || 'admin123'}).
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. GYM ACCOUNTS BREAKDOWN MODAL (Requested by User) */}
      {isDetailsModalOpen && selectedGym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl my-auto">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white">
                  Accounts Under {selectedGym.name}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xl sm:text-2xl font-black text-white font-heading">
                    {selectedGym.accounts?.members ?? 0}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Members
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-heading">
                    {selectedGym.accounts?.trainers ?? 0}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Coaches
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xl sm:text-2xl font-black text-cyan-400 font-heading">
                    {(selectedGym.accounts?.members ?? 0) + (selectedGym.accounts?.trainers ?? 0)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Total Accounts
                  </div>
                </div>
              </div>

              {/* Package Tier & Quotas Banner */}
              {(() => {
                const planTier = selectedGym.packageTier || selectedGym.package || 'Growth';
                const planConfig = getPlanByTier(planTier);
                const cycle = selectedGym.billingCycle || 'Monthly';
                const amount = selectedGym.packageAmount != null
                  ? Number(selectedGym.packageAmount)
                  : (cycle === 'Annual' ? planConfig.annualPrice : planConfig.monthlyPrice);
                const maxMem = selectedGym.maxMembers || planConfig.activeMembers;
                const memCount = selectedGym.accounts?.members ?? 0;
                const memPercent = typeof maxMem === 'number' ? Math.round((memCount / maxMem) * 100) : 0;

                return (
                  <div className="p-3 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-extrabold text-white">Active Subscription Plan</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border ${planConfig.badgeColor}`}>
                        {planTier} {planConfig.isPopular && <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800">
                      <span className="text-slate-400">Package Amount:</span>
                      <span className="font-mono font-black text-emerald-400">
                        {amount ? `₹${amount.toLocaleString('en-IN')} / ${cycle === 'Annual' ? 'year' : 'month'}` : 'Custom Enterprise'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800">
                      <span className="text-slate-400">Member Quota Utilization:</span>
                      <span className="font-bold text-white">
                        {memCount} / {maxMem} members ({memPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-400">Coaches & Branches:</span>
                      <span className="text-slate-300 font-semibold">
                        Max {selectedGym.maxTrainers || planConfig.trainers} Trainers • {selectedGym.maxBranches || planConfig.branches} Branch
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Gym Credentials Card */}
              <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gym Owner Master Credentials</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Owner Name:</span>
                  <span className="font-bold text-white">{selectedGym.owner?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Login Email:</span>
                  <span className="font-mono text-emerald-400 font-semibold truncate ml-2">{selectedGym.owner?.email || selectedGym.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-400">Login Password:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {(() => {
                      const p = selectedGym.owner?.loginPassword || selectedGym.initialPassword;
                      return (!p || p.startsWith('$2y$') || p.startsWith('$2a$') || p.length >= 50) ? '•••••••• (Encrypted)' : p;
                    })()}
                  </span>
                </div>
              </div>

              {/* Branch / Package Meta */}
              <div className="text-xs text-slate-400 space-y-1">
                <div><strong>Address:</strong> {selectedGym.address}, {selectedGym.city}</div>
                <div><strong>Status:</strong> <span className="text-emerald-400 font-bold">{selectedGym.status}</span></div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
