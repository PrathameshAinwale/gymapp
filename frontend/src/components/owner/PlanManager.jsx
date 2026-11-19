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
import { SearchInput } from '../common/SearchInput';
import { MembershipPlanModal, PACKAGE_TYPES, normalizePackageType } from '../common/MembershipPlanModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

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
      const pType = normalizePackageType(p.packageType || p.package_type || p.category);
      if (counts[pType] !== undefined) {
        counts[pType]++;
      } else {
        counts[pType] = 1;
      }
    });
    return counts;
  }, [plans]);

  // All available types for filtering (presets + custom types from plans)
  const allFilterTypes = useMemo(() => {
    const customTypes = (plans || [])
      .map((p) => normalizePackageType(p.packageType || p.package_type || p.category))
      .filter(Boolean);
    const combined = [...PACKAGE_TYPES, ...customTypes];
    const seen = new Set();
    const result = [];
    combined.forEach((t) => {
      const lower = t.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(t);
      }
    });
    return result;
  }, [plans]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return (plans || []).filter((plan) => {
      const planType = normalizePackageType(plan.packageType || plan.package_type || plan.category);
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
    setPreselectedType(normalizePackageType(type || (selectedTypeFilter !== 'all' ? selectedTypeFilter : 'Gym-Cardio')));
    setIsAddOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setPreselectedType(normalizePackageType(plan.packageType || plan.package_type || plan.category));
    setIsAddOpen(true);
  };

  const [planToDelete, setPlanToDelete] = useState(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      setIsDeletingPlan(true);
      await deletePlan(planToDelete.id);
      setPlanToDelete(null);
    } catch (err) {
      console.error('Delete plan error:', err);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12 w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 bg-white border border-slate-200/90 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="app-page-title font-bold text-slate-900 tracking-normal truncate">
                Membership Plans & Packages
              </h1>
              <p className="text-2xs text-slate-500 hidden sm:block truncate max-w-[70ch]">
                Create and manage all your gym packages, training sessions, and subscriptions in one place.
              </p>
              <p className="text-2xs text-slate-400 font-medium sm:hidden truncate">
                {filteredPlans.length} {filteredPlans.length === 1 ? 'plan' : 'plans'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCreate()}
          className="h-8.5 sm:h-9 px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Create Plan"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Create Plan</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {/* Search & Dropdown Filters Bar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search plans by title or keyword..."
            mobilePlaceholder="Search plans..."
            containerClassName="flex-1 min-w-0"
          />

          {/* Filter Controls (Package Type Dropdown & Status Filter) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Package Type Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-0 sm:min-w-[180px]">
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 h-9.5 sm:h-9 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-emerald-500 focus-within:bg-white shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate"
                >
                  <option value="all">
                    All Types ({typeCounts.all || 0})
                  </option>
                  {allFilterTypes.map((type) => (
                    <option key={type} value={type}>
                      {type} ({typeCounts[type] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Dropdown / Selector */}
            <div className="relative flex-1 sm:flex-initial min-w-0 sm:min-w-[120px]">
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 h-9.5 sm:h-9 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-emerald-500 focus-within:bg-white shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                className="h-9.5 sm:h-9 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 border border-rose-200 shadow-2xs flex items-center justify-center"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
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
            const planType = normalizePackageType(plan.packageType || plan.package_type || plan.category);
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
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-2xs font-semibold uppercase tracking-widest flex items-center gap-1 shadow-xs whitespace-nowrap">
                    <Sparkles className="w-2.5 h-2.5" /> Most Popular
                  </div>
                )}

                <div>
                  {/* Top Badges: Package Type & Status */}
                  <div className="flex items-center justify-between gap-1.5 mb-2.5 flex-wrap">
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-lg border ${getPackageTypeBadgeStyle(planType)}`}>
                      {planType}
                    </span>
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
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
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug app-truncate" title={plan.name}>
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-2xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{plan.period || `${plan.durationMonths || 1} Month(s)`}</span>
                      </span>
                      {plan.sessions && (
                        <span className="flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 whitespace-nowrap">
                          <Dumbbell className="w-2.5 h-2.5 shrink-0" />
                          <span>{plan.sessions}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Box */}
                  <div className="my-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xs uppercase font-semibold tracking-wider text-slate-400">Fee</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono whitespace-nowrap shrink-0">
                          ₹{Number(plan.price || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-2xs text-slate-500 font-medium">
                          /{plan.period || `${plan.durationMonths || 1} Mo`}
                        </span>
                      </div>
                    </div>

                    {/* Max Discount Indicator */}
                    {Number(plan.maxDiscount ?? plan.max_discount ?? 0) > 0 && (
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-2xs">
                        <span className="text-slate-500 font-semibold">Max Discount:</span>
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-mono">
                          ₹{Number(plan.maxDiscount ?? plan.max_discount ?? 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {/* Active Promotional Offer & Bonus Days */}
                    {(plan.offer || plan.offerText || Number(plan.offerDays || plan.offer_days) > 0) && (
                      <div className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-2xs font-bold">
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
                      <div className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Amenities</div>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                            <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="leading-tight text-2xs">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions: Edit & Delete */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(plan)}
                    className="flex-1 h-8.5 sm:h-9 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanToDelete(plan)}
                    title="Delete Plan"
                    className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl bg-slate-50 hover:bg-rose-50 active:scale-95 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
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

      <ConfirmDeleteModal
        isOpen={Boolean(planToDelete)}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleConfirmDeletePlan}
        isDeleting={isDeletingPlan}
        title="Confirm Deletion"
        itemType="plan"
        recordName={planToDelete?.name}
        message={
          planToDelete
            ? `Are you sure you want to delete the plan "${planToDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this plan? This action cannot be undone.'
        }
      />
    </div>
  );
};

export default PlanManager;
