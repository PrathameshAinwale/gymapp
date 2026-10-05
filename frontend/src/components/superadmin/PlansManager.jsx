import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { PACKAGE_PLANS } from './packagePlans';
import {
  Sparkles,
  Check,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Layers,
  Crown,
  Zap,
  Users,
  Building,
  Dumbbell,
  CheckCircle2,
  RotateCw,
  X,
  AlertCircle,
  Smartphone,
  Shield,
  FileText
} from 'lucide-react';

const SYSTEM_FEATURE_CATEGORIES = [
  {
    category: 'Operations & Schedule',
    features: [
      { id: 'members', name: 'Member Directory & KYC', desc: 'Athlete profiles, emergency contacts, medical records & QR passes' },
      { id: 'enquiries', name: 'Enquiry & Leads CRM', desc: 'Lead capture, follow-ups, trial bookings & conversion tracking' },
      { id: 'classes', name: 'Classes & Batches Scheduling', desc: 'Batch timings, group class scheduling & attendance rosters' },
      { id: 'pt-sessions', name: 'PT Sessions Tracker', desc: '1-on-1 personal training packages, scheduling & session check-off' },
      { id: 'attendance', name: 'Daily Attendance Tracker', desc: 'Member and staff daily attendance logs & check-in heatmaps' },
      { id: 'biometric', name: 'Biometric Machine Hardware Sync', desc: 'Real-time eSSL / ZKTeco / ADMS turnstile hardware punch sync' },
    ]
  },
  {
    category: 'Memberships & Compliance',
    features: [
      { id: 'plans', name: 'Membership Admission Plans', desc: 'Flexible duration packages, discount tags & validity periods' },
      { id: 'membership-freeze', name: 'Freeze & Extensions', desc: 'Medical freeze, travel holds & membership period extensions' },
    ]
  },
  {
    category: 'Communication & WhatsApp',
    features: [
      { id: 'whatsapp-manual', name: 'Manual WhatsApp Template Sending', desc: '1-click WhatsApp broadcast templates for birthday, expiry & announcements' },
      { id: 'whatsapp-automation', name: 'Completely Automated WhatsApp', desc: '100% automated background triggers for birthday perks, expiry countdowns & dues' },
    ]
  },
  {
    category: 'Staff, HR & Payroll',
    features: [
      { id: 'staff-accounts', name: 'Staff Account Management', desc: 'Role logins for managers, receptionists & staff credentials' },
      { id: 'shifts', name: 'Shift Timings & Slots', desc: 'Staff shift duty allocation, schedules & floor slot rosters' },
      { id: 'leaves', name: 'Leave Management & Balances', desc: 'Leave requests, quota tracking & manager approval workflow' },
      { id: 'advance-pay', name: 'Advance Pay Requests', desc: 'Employee advance salary requests, approval & auto-repayment' },
      { id: 'payroll', name: 'Employee Payroll Ledger', desc: 'Salary calculations, deductions, additions & pay slips' },
      { id: 'commissions', name: 'Trainer Commission Payouts', desc: 'Automatic personal training & admission commission payouts' },
    ]
  },
  {
    category: 'Finance & Analytics',
    features: [
      { id: 'financials', name: 'Revenue & Expense Ledger', desc: 'Cash register, income collection, daily expenses & ledger' },
      { id: 'reports', name: 'Exportable Audit Reports', desc: 'Financial, member admission and attendance CSV/PDF exports' },
      { id: 'analytics', name: 'Analytics & Insights BI', desc: 'Visual retention charts, revenue growth & peak floor hours' },
      { id: 'invoices', name: 'Member Invoices & Tax Receipts', desc: 'Full tax invoicing with GST calculation & receipt downloads' },
      { id: 'daily_automated_reports', name: 'Daily Automated Reports', desc: 'Automated end-of-day summary reports delivered to the owner' },
    ]
  },
  {
    category: 'Inventory & Setup',
    features: [
      { id: 'products', name: 'Pro Shop & Supplement POS', desc: 'Inventory stock management, protein retail & barcode billing' },
      { id: 'equipment', name: 'Equipment & Assets Inventory', desc: 'Weight machines, cardio gear, maintenance logs & repair tracking' },
      { id: 'settings', name: 'Gym Setup & Logo Branding', desc: 'Operating hours, gym contact details, tax settings & logo branding' },
    ]
  },
  {
    category: 'Mobile Applications & Enterprise',
    features: [
      { id: 'owner_app', name: 'Mobile Owner Application', desc: 'Dedicated mobile web application access for gym owners' },
      { id: 'trainer_app', name: 'Trainer Mobile Application', desc: 'Dedicated mobile web app for coaches to manage client workouts & PT' },
      { id: 'member_app', name: 'Member Mobile Application', desc: 'Dedicated mobile web app for athletes to track workouts, diet & QR pass' },
      { id: 'multi_branch', name: 'Multi-Gym Support (Up to 3 Gyms)', desc: 'Manage up to 3 facility locations from one master account' },
      { id: 'about_pages', name: 'About, Privacy & Help Pages', desc: 'Official Privacy Policy, Terms & Conditions, and Help & Support desk' },
      { id: 'white_label', name: 'White-Label Branding', desc: 'Full custom gym logo branding and bespoke theme personalization' },
      { id: 'priority_support', name: 'Dedicated VIP Support', desc: 'Direct WhatsApp phone hotline & priority engineering turnaround' },
    ]
  }
];

const normalizeFeatureIds = (features) => {
  if (!Array.isArray(features)) return [];
  const aliasMap = {
    enquiry: 'enquiries',
    finance: 'financials',
    pos: 'products',
    trainers: 'pt-sessions',
    staff: 'staff-accounts',
    advance_pay: 'advance-pay',
    whatsapp: 'whatsapp-manual',
    mobile_app: 'owner_app',
    'privacy-policy': 'about_pages',
    'terms-conditions': 'about_pages',
    'help-support': 'about_pages'
  };
  return Array.from(new Set(features.map(f => aliasMap[f] || f)));
};

export const PlansManager = ({ onPlansUpdated }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState('details'); // 'details' | 'features'
  const modalScrollRef = useRef(null);

  const initialForm = {
    name: '',
    tier: 'Bronze',
    monthly_price: '',
    annual_price: '',
    max_members: '',
    max_trainers: '',
    max_branches: 1,
    features: ['members', 'enquiries', 'plans', 'membership-freeze', 'classes', 'financials', 'settings', 'equipment', 'about_pages'],
    description: '',
    badge_color: 'amber',
    is_popular: false,
    is_active: true
  };

  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await api.superadmin.getPlans();
      if (res?.success && Array.isArray(res.plans)) {
        setPlans(res.plans);
      }
    } catch (err) {
      console.warn('Error fetching SaaS plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isModalOpen]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData(initialForm);
    setModalActiveTab('details');
    setIsModalOpen(true);
    setTimeout(() => {
      if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
    }, 50);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      tier: plan.tier || 'Bronze',
      monthly_price: plan.monthly_price != null ? plan.monthly_price : '',
      annual_price: plan.annual_price != null ? plan.annual_price : '',
      max_members: plan.max_members != null ? plan.max_members : '',
      max_trainers: plan.max_trainers != null ? plan.max_trainers : '',
      max_branches: plan.max_branches != null ? plan.max_branches : 1,
      features: normalizeFeatureIds(plan.features),
      description: plan.description || '',
      badge_color: plan.badge_color || 'indigo',
      is_popular: Boolean(plan.is_popular),
      is_active: plan.is_active !== undefined ? Boolean(plan.is_active) : true
    });
    setModalActiveTab('details');
    setIsModalOpen(true);
    setTimeout(() => {
      if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
    }, 50);
  };

  const applyTierPreset = (tierName) => {
    const norm = (tierName || '').toLowerCase();
    const pkg = PACKAGE_PLANS.find(p => p.tier.toLowerCase() === norm);
    if (!pkg) return;

    setFormData(prev => ({
      ...prev,
      tier: pkg.tier,
      name: prev.name || pkg.name,
      monthly_price: pkg.monthlyPrice != null ? pkg.monthlyPrice : '',
      annual_price: pkg.annualPrice != null ? pkg.annualPrice : '',
      max_members: pkg.quotas.maxMembers != null ? pkg.quotas.maxMembers : '',
      max_trainers: pkg.quotas.maxTrainers != null ? pkg.quotas.maxTrainers : (pkg.trainers === 0 ? 0 : ''),
      max_branches: pkg.quotas.maxBranches || 1,
      description: pkg.description || prev.description,
      features: normalizeFeatureIds(pkg.features)
    }));
  };

  const handleToggleFeature = (featureId) => {
    setFormData(prev => {
      const exists = prev.features.includes(featureId);
      const nextFeatures = exists
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId];
      return { ...prev, features: nextFeatures };
    });
  };

  const handleSelectAllFeatures = () => {
    const all = SYSTEM_FEATURE_CATEGORIES.flatMap(c => c.features.map(f => f.id));
    setFormData(prev => ({ ...prev, features: all }));
  };

  const handleClearFeatures = () => {
    setFormData(prev => ({ ...prev, features: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a plan name.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPlan) {
        const res = await api.superadmin.updatePlan(editingPlan.id, formData);
        if (res?.success) {
          setIsModalOpen(false);
          await loadPlans();
          if (typeof onPlansUpdated === 'function') onPlansUpdated();
        }
      } else {
        const res = await api.superadmin.createPlan(formData);
        if (res?.success) {
          setIsModalOpen(false);
          await loadPlans();
          if (typeof onPlansUpdated === 'function') onPlansUpdated();
        }
      }
    } catch (err) {
      alert('Error saving plan: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to remove the plan "${plan.name}"?`)) {
      return;
    }

    try {
      const res = await api.superadmin.deletePlan(plan.id);
      if (res?.success) {
        await loadPlans();
        if (typeof onPlansUpdated === 'function') onPlansUpdated();
      }
    } catch (err) {
      alert('Failed to delete plan: ' + (err.message || 'Server error'));
    }
  };

  const getTierTheme = (tier) => {
    const lower = (tier || '').toLowerCase();
    if (lower.includes('bronze')) {
      return {
        badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        card: 'border-amber-500/30 hover:border-amber-500/60',
        accent: 'text-amber-400',
        ring: 'focus:border-amber-500'
      };
    }
    if (lower.includes('silver')) {
      return {
        badge: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
        card: 'border-slate-500/30 hover:border-slate-400/60',
        accent: 'text-slate-300',
        ring: 'focus:border-slate-400'
      };
    }
    if (lower.includes('gold')) {
      return {
        badge: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
        card: 'border-yellow-500/40 hover:border-yellow-400/70',
        accent: 'text-yellow-400',
        ring: 'focus:border-yellow-400'
      };
    }
    if (lower.includes('platinum')) {
      return {
        badge: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
        card: 'border-purple-500/40 hover:border-purple-400/80 shadow-lg shadow-purple-950/20',
        accent: 'text-purple-400',
        ring: 'focus:border-purple-500'
      };
    }
    return {
      badge: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
      card: 'border-white/[0.08] hover:border-indigo-500/50',
      accent: 'text-indigo-400',
      ring: 'focus:border-indigo-500'
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#0e1017] border border-white/[0.08] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>SaaS Subscription Plans Management</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure Bronze, Silver, Gold, Platinum tiers and create customized SaaS plans with modular feature access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadPlans}
            disabled={loading}
            title="Reload plans"
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-indigo-500/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-[#0e1017] border border-white/[0.08] flex flex-col items-center justify-center gap-3">
          <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs font-bold text-slate-400">Loading subscription plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0e1017] border border-white/[0.08]">
          <p className="text-sm text-slate-400">No SaaS plans configured yet.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            Create Initial Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const theme = getTierTheme(plan.tier);
            const planFeatures = Array.isArray(plan.features) ? plan.features : [];

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl bg-[#0e1017] border ${theme.card} p-5 transition-all shadow-md`}
              >
                {/* Popular Pill */}
                {plan.is_popular && (
                  <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <div>
                  {/* Tier Badge & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${theme.badge}`}>
                      {plan.tier || 'Plan'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        title="Edit Plan"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        title="Delete Plan"
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Plan Name & Price */}
                  <h3 className="text-base font-extrabold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                    {plan.description || 'Custom tailored SaaS plan for gym management.'}
                  </p>

                  {/* Pricing Box */}
                  <div className="mt-4 p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                    {plan.annual_price != null && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">
                          ₹{Number(plan.annual_price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">/ year</span>
                      </div>
                    )}
                    {plan.monthly_price != null ? (
                      <div className="text-[11px] font-semibold text-slate-400">
                        ₹{Number(plan.monthly_price).toLocaleString('en-IN')} / month
                      </div>
                    ) : (
                      <div className="text-[10px] font-semibold text-purple-400">
                        Flat Annual Package
                      </div>
                    )}
                  </div>

                  {/* Quotas & Capacity */}
                  <div className="mt-3.5 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Athletes</div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {plan.max_members ? plan.max_members : 'Unlimited'}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Coaches</div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {plan.max_trainers ? plan.max_trainers : 'Unlimited'}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Branches</div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {plan.max_branches || 1}
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                      Included Modules ({planFeatures.length})
                    </span>
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {planFeatures.map((fId) => {
                        const featObj = SYSTEM_FEATURE_CATEGORIES.flatMap(c => c.features).find(f => f.id === fId);
                        return (
                          <li key={fId} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="truncate">{featObj?.name || fId}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleOpenEdit(plan)}
                    className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Edit Tier Settings
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {isModalOpen && createPortal(
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-[#0e1017] border border-white/[0.12] rounded-3xl w-full max-w-3xl h-[90vh] max-h-[780px] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Modal Header (Pinned) */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  {editingPlan ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-base">
                      {editingPlan ? `Edit SaaS Plan: ${editingPlan.name}` : 'Create New SaaS Subscription Plan'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {formData.tier} Tier
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure tier pricing, member capacity, limits, and modular feature access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tab Switcher (Pinned) */}
            <div className="px-5 sm:px-6 py-2.5 bg-[#090b10] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalActiveTab('details');
                    if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    modalActiveTab === 'details'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>1. Plan Details &amp; Limits</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalActiveTab('features');
                    if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    modalActiveTab === 'features'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. Modular Features</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-white/20 text-white">
                    {formData.features.length}
                  </span>
                </button>
              </div>

              {/* Quick Tier Preset loader */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Load Preset:</span>
                {['Bronze', 'Silver', 'Gold', 'Platinum'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => applyTierPreset(t)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                      formData.tier.toLowerCase() === t.toLowerCase()
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div ref={modalScrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
                {modalActiveTab === 'details' ? (
                  <>
                    {/* Plan Name & Tier */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Plan Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Platinum Enterprise Plan"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Tier Classification *</label>
                        <select
                          value={formData.tier}
                          onChange={(e) => {
                            const newTier = e.target.value;
                            setFormData({ ...formData, tier: newTier });
                            applyTierPreset(newTier);
                          }}
                          className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="Bronze">Bronze Tier</option>
                          <option value="Silver">Silver Tier</option>
                          <option value="Gold">Gold Tier</option>
                          <option value="Platinum">Platinum Tier</option>
                          <option value="Custom">Custom Enterprise</option>
                        </select>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Annual Price (₹) <span className="text-slate-400 font-normal">(e.g. 30000 for Platinum)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 30000"
                          value={formData.annual_price}
                          onChange={(e) => setFormData({ ...formData, annual_price: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Monthly Billing Price (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Leave blank if annual only"
                          value={formData.monthly_price}
                          onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Quotas & Capacity */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                        Capacity &amp; Resource Limits
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Max Athletes / Members
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="e.g. 200, 500, 1000..."
                            value={formData.max_members}
                            onChange={(e) => setFormData({ ...formData, max_members: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {formData.tier === 'Bronze' ? 'Bronze standard: 200' : formData.tier === 'Silver' ? 'Silver standard: 500' : formData.tier === 'Gold' ? 'Gold standard: 1000' : 'Platinum: Unlimited / custom'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Max Staff / Trainers
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 10"
                            value={formData.max_trainers}
                            onChange={(e) => setFormData({ ...formData, max_trainers: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {formData.tier === 'Gold' ? 'Gold standard: 10 staff limit' : 'Empty = Unlimited'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Max Branches
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.max_branches}
                            onChange={(e) => setFormData({ ...formData, max_branches: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {formData.tier === 'Bronze' ? 'Bronze: 1 single gym' : 'Multi-branch allowance'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Plan Description</label>
                      <textarea
                        rows={2}
                        placeholder="Short summary of target facility audience and key value proposition..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Toggles: Most Popular & Active */}
                    <div className="flex flex-wrap items-center gap-6 p-3.5 rounded-xl bg-[#07080d] border border-white/[0.06]">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_popular}
                          onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-transparent border-white/20 cursor-pointer"
                        />
                        <span>Mark as "Most Popular" Plan</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-0 bg-transparent border-white/20 cursor-pointer"
                        />
                        <span>Active &amp; Selectable for Onboarding</span>
                      </label>
                    </div>

                    {/* Quick jump to features button */}
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span>Feature Permissions ({formData.features.length} enabled)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Switch to the Modular Features tab to customize exact module access for this plan.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setModalActiveTab('features');
                          if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Configure Features →
                      </button>
                    </div>
                  </>
                ) : (
                  /* FEATURES TAB */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                      <div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span>Modular Feature Checklist ({formData.features.length} Selected)</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Check each module that will be unlocked for gyms on this tier. Unchecked modules will not appear in their sidebar or navigation.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={handleSelectAllFeatures}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-[11px] font-bold border border-indigo-500/30 cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={handleClearFeatures}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 text-[11px] font-bold border border-white/[0.08] cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {SYSTEM_FEATURE_CATEGORIES.map((cat, catIdx) => (
                        <div key={catIdx} className="space-y-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 block">
                            {cat.category}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cat.features.map((feat) => {
                              const isSelected = formData.features.includes(feat.id);
                              return (
                                <div
                                  key={feat.id}
                                  onClick={() => handleToggleFeature(feat.id)}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                    isSelected
                                      ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                                      : 'bg-[#07080d] border-white/[0.06] text-slate-400 hover:border-white/[0.15]'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                                      isSelected
                                        ? 'bg-indigo-600 border-indigo-500 text-white'
                                        : 'border-white/20 bg-black/40'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold leading-tight truncate">
                                      {feat.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                      {feat.desc}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions - PINNED FOOTER */}
              <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#090b10] flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span className="font-semibold text-slate-300">{formData.name || 'Unnamed Plan'}</span>
                  <span className="text-slate-500">•</span>
                  <span>{formData.tier} Tier</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-indigo-400 font-bold">{formData.features.length} Features Active</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white text-xs font-black tracking-wide shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Saving Plan...</span>
                      </>
                    ) : (
                      <span>{editingPlan ? 'Save Plan Changes' : 'Create SaaS Plan'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default PlansManager;
