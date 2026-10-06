import React, { useState, useEffect, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  CreditCard,
  Check,
  Plus,
  Sparkles,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Tag,
  Search,
  Filter,
  Dumbbell,
  Clock,
  Gift,
  CheckCircle2,
  XCircle,
  Activity,
  Award
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { MembershipPlanModal, PACKAGE_TYPES } from '../common/MembershipPlanModal';

const safeFeatures = (features) => {
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return features.split('\n').map((f) => f.trim()).filter(Boolean);
  }
  return [];
};

export const getPackageTypeBadgeStyle = (type) => {
  switch (type) {
    case 'Gym-Cardio':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Gym-Cardio-Crossfit':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'Crossfit':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Locker':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'Personal Training':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Massage':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Activities':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Functional Training':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Kids Training':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Club Membership':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Zumba':
      return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    case 'General Fitness':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
};

export const PlanManager = () => {
  const {
    plans = [],
    fetchPlans,
    deletePlan,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchPlans?.();
  }, [fetchPlans]);

  // Filtering & Modal State
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [preselectedType, setPreselectedType] = useState('Gym-Cardio');

  // Count plans per package type
  const typeCounts = useMemo(() => {
    const counts = { all: (plans || []).length };
    PACKAGE_TYPES.forEach((t) => {
      counts[t] = 0;
    });
    (plans || []).forEach((p) => {
      const pType = p.packageType || p.package_type || p.category || 'General Fitness';
      if (counts[pType] !== undefined) {
        counts[pType]++;
      } else {
        counts[pType] = 1;
      }
    });
    return counts;
  }, [plans]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return (plans || []).filter((plan) => {
      const planType = plan.packageType || plan.package_type || plan.category || 'General Fitness';
      if (selectedTypeFilter !== 'all' && planType !== selectedTypeFilter) {
        return false;
      }
      const status = (plan.status || 'Active').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (plan.name || '').toLowerCase().includes(q);
        const typeMatch = planType.toLowerCase().includes(q);
        const periodMatch = (plan.period || '').toLowerCase().includes(q);
        if (!nameMatch && !typeMatch && !periodMatch) {
          return false;
        }
      }
      return true;
    });
  }, [plans, selectedTypeFilter, statusFilter, searchQuery]);

  const handleOpenCreate = (type = null) => {
    setEditingPlan(null);
    setPreselectedType(type || (selectedTypeFilter !== 'all' ? selectedTypeFilter : 'Gym-Cardio'));
    setIsAddOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setPreselectedType(plan.packageType || plan.package_type || plan.category || 'Gym-Cardio');
    setIsAddOpen(true);
  };

  const handleDeletePlan = async (plan) => {
    if (confirm(`Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`)) {
      try {
        await deletePlan(plan.id);
      } catch (err) {
        console.error('Delete plan error:', err);
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Membership Plans & Packages
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Create and manage all your gym packages, training sessions, and subscriptions in one place.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleOpenCreate()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      {/* Search & Dropdown Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans by title or keyword..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Filter Controls (Package Type Dropdown & Status Filter) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Package Type Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-[220px]">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-emerald-500 focus-within:bg-white shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">
                  All Package Types ({typeCounts.all || 0})
                </option>
                {PACKAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type} ({typeCounts[type] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Dropdown / Selector */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-emerald-500 focus-within:bg-white shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Reset Filters button if any filter is active */}
          {(selectedTypeFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTypeFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 border border-rose-200 shadow-2xs"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Plans Display Grid */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={selectedTypeFilter === 'all' ? 'No Plans Created Yet' : `No "${selectedTypeFilter}" Plans Found`}
          description={
            selectedTypeFilter === 'all'
              ? 'Click below to create your first membership or service package.'
              : `There are currently no plans under "${selectedTypeFilter}". You can create one right now.`
          }
          actionText={`+ Create ${selectedTypeFilter === 'all' ? 'Plan' : selectedTypeFilter} Plan`}
          onAction={() => handleOpenCreate(selectedTypeFilter !== 'all' ? selectedTypeFilter : 'Gym-Cardio')}
          accentColor="emerald"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {filteredPlans.map((plan) => {
            const planType = plan.packageType || plan.package_type || plan.category || 'Gym-Cardio';
            const isActive = (plan.status || 'Active').toLowerCase() === 'active';
            const features = safeFeatures(plan.features);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-4 bg-white border flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                  plan.popular
                    ? 'border-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Most Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs whitespace-nowrap">
                    <Sparkles className="w-2.5 h-2.5" /> Most Popular
                  </div>
                )}

                <div>
                  {/* Top Badges: Package Type & Status */}
                  <div className="flex items-center justify-between gap-1.5 mb-2.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${getPackageTypeBadgeStyle(planType)}`}>
                      {planType}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>

                  {/* Title & Duration */}
                  <div className="mb-3">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug line-clamp-2">
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{plan.period || `${plan.durationMonths || 1} Month(s)`}</span>
                      </span>
                      {plan.sessions && (
                        <span className="flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                          <Dumbbell className="w-2.5 h-2.5" />
                          <span>{plan.sessions}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Box */}
                  <div className="my-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Fee</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                          ₹{Number(plan.price || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          /{plan.period || `${plan.durationMonths || 1} Mo`}
                        </span>
                      </div>
                    </div>

                    {/* Max Discount Indicator */}
                    {Number(plan.maxDiscount ?? plan.max_discount ?? 0) > 0 && (
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-semibold">Max Discount:</span>
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-mono">
                          ₹{Number(plan.maxDiscount ?? plan.max_discount ?? 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {/* Active Promotional Offer & Bonus Days */}
                    {(plan.offer || plan.offerText || Number(plan.offerDays || plan.offer_days) > 0) && (
                      <div className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                        <Gift className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {plan.offer || plan.offerText || 'Special Offer'}
                          {Number(plan.offerDays || plan.offer_days) > 0 ? ` (+${plan.offerDays || plan.offer_days}d bonus)` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Plan Features / Amenities */}
                  {features.length > 0 && (
                    <div className="space-y-1.5 text-xs mb-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amenities</div>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                            <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="leading-tight text-[11px]">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions: Edit & Delete */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(plan)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlan(plan)}
                    title="Delete Plan"
                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 active:scale-95 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unified Membership & Service Plan Creation/Edit Modal */}
      {isAddOpen && (
        <MembershipPlanModal
          isOpen={isAddOpen}
          onClose={() => {
            setIsAddOpen(false);
            setEditingPlan(null);
          }}
          plan={editingPlan}
          defaultPackageType={preselectedType}
          onSuccess={() => {
            fetchPlans?.();
          }}
        />
      )}
    </div>
  );
};

export default PlanManager;
