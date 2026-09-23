import React, { useState, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  CreditCard,
  Check,
  Plus,
  Users,
  Sparkles,
  Edit2,
  Trash2,
  ShieldCheck,
  IndianRupee,
  Calendar,
  Layers,
  Save,
  CheckCircle2,
  Dumbbell,
  Flame,
  HeartPulse,
  Activity,
  Award,
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

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

export const PlanManager = () => {
  const {
    plans,
    classes,
    fetchPlans,
    fetchClasses,
    addPlan,
    updatePlan,
    deletePlan,
    ptPlans,
    addPTPlan,
    deletePTPlan,
    fetchPtPlans,
    recoveryPlans,
    addRecoveryPlan,
    deleteRecoveryPlan,
    fetchRecoveryPlans,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchPlans?.();
    fetchClasses?.();
    fetchRecoveryPlans?.();
    fetchPtPlans?.();
  }, [fetchPlans, fetchClasses, fetchRecoveryPlans, fetchPtPlans]);

  const [activeTab, setActiveTab] = useState('memberships'); // memberships | pt | classes | recovery
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group Classes state populated from backend database
  const [classPlans, setClassPlans] = useState([]);

  useEffect(() => {
    if (classes && classes.length > 0) {
      setClassPlans(
        classes.map((cls) => ({
          id: `cls-p-${cls.id}`,
          name: cls.name || cls.title || 'Studio Class',
          sessions: `${cls.capacity || 20} Capacity Pass`,
          price: cls.price || 1999,
          instructor: cls.trainerName || cls.instructor || 'Lead Trainer',
          schedule: `${Array.isArray(cls.days) ? cls.days.join(', ') : cls.days || 'Mon, Wed, Fri'} • ${cls.time || '07:00 AM'}`,
          popular: !!cls.popular,
          features: [
            `${cls.category || 'Group Fitness'} sessions`,
            `${cls.room || 'Main Studio'} access`,
            'Online seat booking via Member App',
            'Locker & shower facilities'
          ]
        }))
      );
    } else {
      setClassPlans([]);
    }
  }, [classes]);

  // Form State for Add Plan
  const [formData, setFormData] = useState({
    name: '',
    price: 1999,
    period: 'Monthly (1 Month)',
    durationMonths: 1,
    popular: false,
    featuresText: 'Access to gym floor & cardio machines\nLocker, steam room & shower access\nArchFit Mobile App Access\n1 Free Fitness & BMI Assessment'
  });

  // Form State for Add PT / Recovery / Class
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    price: 4999,
    sessions: '12 Sessions',
    validityDays: 30,
    instructorOrType: 'Head Coach',
    description: 'Personalized training with dedicated 1-on-1 technique assessment, workout programming, and diet coaching.'
  });

  // Open Edit Modal for a membership plan
  const handleOpenEdit = (plan) => {
    setEditingPlan({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      period: plan.period,
      durationMonths: plan.durationMonths || 1,
      popular: plan.popular || false,
      featuresText: safeFeatures(plan.features).join('\n')
    });
  };

  // Handle Submit New Plan
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSubmitting(true);
    try {
      const features = formData.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      await addPlan({
        name: formData.name,
        price: Number(formData.price),
        period: formData.period,
        durationMonths: Number(formData.durationMonths),
        popular: formData.popular,
        features
      });

      setIsAddOpen(false);
      setFormData({
        name: '',
        price: 1999,
        period: 'Monthly (1 Month)',
        durationMonths: 1,
        popular: false,
        featuresText: 'Access to gym floor & cardio machines\nLocker, steam room & shower access\nArchFit Mobile App Access\n1 Free Fitness & BMI Assessment'
      });
      addToast('New gym membership package published successfully!', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create PT / Class / Recovery Service
  const handleCreateServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceFormData.name) return;

    setIsSubmitting(true);
    try {
      if (activeTab === 'pt') {
        await addPTPlan({
          name: serviceFormData.name,
          sessions: Number(serviceFormData.sessions) || 12,
          validityDays: Number(serviceFormData.validityDays) || 30,
          price: Number(serviceFormData.price),
          trainerLevel: serviceFormData.instructorOrType || 'Master Coach',
          description: serviceFormData.description
        });
        addToast('Personal Training package added!', 'success');
      } else if (activeTab === 'classes') {
        const newClass = {
          id: `cls-p-${Date.now()}`,
          name: serviceFormData.name,
          sessions: `${serviceFormData.sessions} Classes / Month`,
          price: Number(serviceFormData.price),
          instructor: serviceFormData.instructorOrType || 'Master Coach',
          schedule: 'Flexible Timings',
          popular: false,
          features: serviceFormData.description.split('. ').filter(Boolean)
        };
        setClassPlans((prev) => [...prev, newClass]);
        addToast('Group Class package added!', 'success');
      } else if (activeTab === 'recovery') {
        await addRecoveryPlan({
          name: serviceFormData.name,
          duration: `${serviceFormData.sessions} Mins`,
          sessions: 1,
          price: Number(serviceFormData.price),
          type: serviceFormData.instructorOrType || 'Therapy',
          description: serviceFormData.description
        });
        addToast('Recovery & Therapy package added!', 'success');
      }

      setIsAddOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Edited Plan
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPlan || !editingPlan.name) return;

    setIsSubmitting(true);
    try {
      const features = editingPlan.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      await updatePlan(editingPlan.id, {
        name: editingPlan.name,
        price: Number(editingPlan.price),
        period: editingPlan.period,
        durationMonths: Number(editingPlan.durationMonths),
        popular: editingPlan.popular,
        features
      });

      setEditingPlan(null);
      addToast('Plan package updated successfully!', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Plans & Pricing
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Configure gym memberships, 1-on-1 PT packages, Zumba/Yoga classes, and massage & recovery pricing.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">
            {activeTab === 'memberships'
              ? 'Add Gym Plan'
              : activeTab === 'pt'
              ? 'Add PT Package'
              : activeTab === 'classes'
              ? 'Add Group Class'
              : 'Add Recovery Therapy'}
          </span>
          <span className="inline sm:hidden">Add Plan</span>
        </button>
      </div>

      {/* Category Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm overflow-x-auto no-scrollbar flex-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab('memberships')}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'memberships'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Memberships ({plans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pt')}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'pt'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>PT Packages ({ptPlans?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'classes'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Classes ({classPlans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recovery')}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'recovery'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Recovery ({recoveryPlans?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: GYM MEMBERSHIPS */}
      {activeTab === 'memberships' && (
        plans.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No Membership Plans Created"
            description="There are currently no gym membership tiers configured. Click below to add monthly, quarterly, or annual plans to enroll members."
            actionText="Add Membership Plan"
            onAction={() => setIsAddOpen(true)}
            accentColor="emerald"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 bg-white border flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                  plan.popular
                    ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-slate-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Most Popular Tier
                  </div>
                )}

                <div>
                  {/* Title & Subscribers */}
                  <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">{plan.name}</h3>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">{plan.period}</div>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-600 flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg border border-slate-200 shrink-0 font-semibold">
                      <Users className="w-3 h-3 text-emerald-600" />
                      {plan.activeSubscribers ?? 0}
                    </span>
                  </div>

                  {/* Price in INR */}
                  <div className="my-2 sm:my-4 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400">Package Fee</div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl sm:text-3xl font-black text-emerald-600">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-500 font-medium">/{plan.durationMonths || 1}mo</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs mb-3 sm:mb-6">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan Inclusions</div>
                    {safeFeatures(plan.features).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 sm:gap-2 text-slate-700">
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="leading-tight text-[11px] sm:text-xs">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2.5 sm:pt-4 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(plan)}
                    className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${plan.name}"?`)) {
                        deletePlan(plan.id);
                      }
                    }}
                    title="Delete Plan"
                    className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 2: PERSONAL TRAINING (PT) PACKAGES */}
      {activeTab === 'pt' && (
        (!ptPlans || ptPlans.length === 0) ? (
          <EmptyState
            icon={Dumbbell}
            title="No Personal Training Packages Created"
            description="You have not added any 1-on-1 personal training packages yet. Create packages with session allotments and trainer tier levels."
            actionText="Add PT Package"
            onAction={() => setIsAddOpen(true)}
            accentColor="purple"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6">
            {ptPlans.map((pt) => (
              <div
                key={pt.id}
                className="rounded-xl sm:rounded-2xl p-3.5 sm:p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {pt.trainerLevel}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                      Validity: {pt.validityDays} Days
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-lg text-slate-900 mt-2 sm:mt-3">{pt.name}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{pt.description}</p>

                  <div className="my-2.5 sm:my-5 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Package Price ({pt.sessions} Sessions)
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl sm:text-3xl font-black text-purple-700">
                        ₹{pt.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                        (~₹{Math.round(pt.price / pt.sessions)}/session)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 shrink-0" />
                      <span>Dedicated 1-on-1 coach attention</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 shrink-0" />
                      <span>Body fat & weekly logs</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 shrink-0" />
                      <span>Customized nutrition plan</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 sm:pt-4 mt-3 sm:mt-6 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${pt.name}"?`)) {
                          deletePTPlan(pt.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete PT Package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] sm:text-[11px] text-emerald-600 font-bold">Commission: 40%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToast(`PT Package "${pt.name}" ready for member enrollment!`, 'info')}
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] sm:text-xs font-bold cursor-pointer transition-colors active:scale-95"
                  >
                    Enroll Member
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 3: ZUMBA & YOGA CLASSES */}
      {activeTab === 'classes' && (
        classPlans.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="No Group Class Packages Configured"
            description="There are currently no studio class passes or fitness batches configured. Click below to add Zumba, Yoga, or HIIT class tiers."
            actionText="Add Class Package"
            onAction={() => setIsAddOpen(true)}
            accentColor="amber"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
            {classPlans.map((cls) => (
              <div
                key={cls.id}
                className="rounded-xl sm:rounded-2xl p-3.5 sm:p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Group Studio
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">Coach: {cls.instructor}</span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1.5 sm:mt-2">{cls.name}</h3>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">{cls.schedule}</div>

                  <div className="my-2.5 sm:my-4 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {cls.sessions}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                      ₹{cls.price.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs">
                    {safeFeatures(cls.features).map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-slate-700">
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <span className="leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 sm:pt-4 mt-2.5 sm:mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => addToast(`Class pass for "${cls.name}" activated!`, 'success')}
                    className="w-full py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer active:scale-95"
                  >
                    Book Class Pass
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 4: MASSAGE & RECOVERY THERAPIES */}
      {activeTab === 'recovery' && (
        (!recoveryPlans || recoveryPlans.length === 0) ? (
          <EmptyState
            icon={HeartPulse}
            title="No Recovery Therapies Configured"
            description="There are currently no recovery or therapy packages created. Click below to add ice bath, sauna, or physio therapy services."
            actionText="Add Recovery Service"
            onAction={() => setIsAddOpen(true)}
            accentColor="cyan"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6">
            {recoveryPlans.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl sm:rounded-2xl p-3.5 sm:p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                      {rec.type || 'Therapy'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                      Session: {rec.duration || '45 Mins'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-lg text-slate-900 mt-2 sm:mt-3">{rec.name}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {rec.description || (Array.isArray(rec.features) ? rec.features.join('. ') : '') || 'Full recovery & therapy session.'}
                  </p>

                  <div className="my-2.5 sm:my-5 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Therapy Fee / Session
                    </div>
                    <div className="text-xl sm:text-3xl font-black text-cyan-700 mt-0.5">
                      ₹{Number(rec.price).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs">
                    {Array.isArray(rec.features) && rec.features.length > 0 ? (
                      rec.features.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-slate-700">
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 shrink-0" />
                          <span>Reduces DOMS & accelerates repair</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 shrink-0" />
                          <span>Locker, dry towels & robe included</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 sm:pt-4 mt-3 sm:mt-6 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => deleteRecoveryPlan(rec.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Package"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => addToast(`Therapy session booked for "${rec.name}"!`, 'success')}
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] sm:text-xs font-bold cursor-pointer transition-colors active:scale-95"
                  >
                    Schedule Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* EDIT MEMBERSHIP PLAN MODAL */}
      <Modal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title={`Edit Plan Package: ${editingPlan?.name}`}
      >
        {editingPlan && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plan Package Name *</label>
              <input
                type="text"
                required
                value={editingPlan.name}
                onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹ INR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    required
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                    className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Duration (Months) *</label>
                  <span className="text-[10px] text-emerald-600 font-semibold">{editingPlan.durationMonths} Mo Validity</span>
                </div>
                <input
                  type="number"
                  min="0.5"
                  step="any"
                  required
                  placeholder="e.g. 1, 2, 3, 5, 9, 12"
                  value={editingPlan.durationMonths}
                  onChange={(e) => {
                    const months = parseFloat(e.target.value) || 1;
                    const periodLabel = months === 1 ? 'Monthly (1 Month)' : months === 3 ? 'Quarterly (3 Months)' : months === 6 ? 'Half-Yearly (6 Months)' : months === 12 ? 'Annual (12 Months)' : `${months} Months`;
                    setEditingPlan({ ...editingPlan, durationMonths: months, period: periodLabel });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>

            {/* Quick Duration Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Duration Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { m: 1, label: '1 Month' },
                  { m: 2, label: '2 Months' },
                  { m: 3, label: '3 Months (Quarterly)' },
                  { m: 6, label: '6 Months (Half-Yearly)' },
                  { m: 9, label: '9 Months' },
                  { m: 12, label: '1 Year (Annual)' }
                ].map((preset) => (
                  <button
                    key={preset.m}
                    type="button"
                    onClick={() => {
                      const periodLabel = preset.m === 1 ? 'Monthly (1 Month)' : preset.m === 3 ? 'Quarterly (3 Months)' : preset.m === 6 ? 'Half-Yearly (6 Months)' : preset.m === 12 ? 'Annual (12 Months)' : `${preset.m} Months`;
                      setEditingPlan({
                        ...editingPlan,
                        durationMonths: preset.m,
                        period: periodLabel
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      Number(editingPlan.durationMonths) === preset.m
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cycle Label</label>
              <input
                type="text"
                value={editingPlan.period}
                onChange={(e) => setEditingPlan({ ...editingPlan, period: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Included Features & Perks (One per line)
              </label>
              <textarea
                rows={5}
                value={editingPlan.featuresText}
                onChange={(e) => setEditingPlan({ ...editingPlan, featuresText: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="editPopular"
                checked={editingPlan.popular}
                onChange={(e) => setEditingPlan({ ...editingPlan, popular: e.target.checked })}
                className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="editPopular" className="text-xs text-slate-700 font-semibold cursor-pointer">
                Highlight as "Most Popular Tier" on gym pricing boards
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* CREATE PACKAGE MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={
          activeTab === 'memberships'
            ? 'Create New Membership Package (₹ INR)'
            : activeTab === 'pt'
            ? 'Create Personal Training (PT) Package'
            : activeTab === 'classes'
            ? 'Create Group Class Pass'
            : 'Create Massage & Recovery Therapy'
        }
      >
        {activeTab === 'memberships' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Package Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Student Flex Pass / Couple Annual"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹ INR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="2499"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Duration (Months) *</label>
                  <span className="text-[10px] text-emerald-600 font-semibold">{formData.durationMonths} Mo Validity</span>
                </div>
                <input
                  type="number"
                  min="0.5"
                  step="any"
                  required
                  placeholder="e.g. 1, 2, 3, 5, 9, 12"
                  value={formData.durationMonths}
                  onChange={(e) => {
                    const months = parseFloat(e.target.value) || 1;
                    const periodLabel = months === 1 ? 'Monthly (1 Month)' : months === 3 ? 'Quarterly (3 Months)' : months === 6 ? 'Half-Yearly (6 Months)' : months === 12 ? 'Annual (12 Months)' : `${months} Months`;
                    setFormData({ ...formData, durationMonths: e.target.value, period: periodLabel });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>

            {/* Quick Duration Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Duration Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { m: 1, label: '1 Month' },
                  { m: 2, label: '2 Months' },
                  { m: 3, label: '3 Months (Quarterly)' },
                  { m: 6, label: '6 Months (Half-Yearly)' },
                  { m: 9, label: '9 Months' },
                  { m: 12, label: '1 Year (Annual)' }
                ].map((preset) => (
                  <button
                    key={preset.m}
                    type="button"
                    onClick={() => {
                      const periodLabel = preset.m === 1 ? 'Monthly (1 Month)' : preset.m === 3 ? 'Quarterly (3 Months)' : preset.m === 6 ? 'Half-Yearly (6 Months)' : preset.m === 12 ? 'Annual (12 Months)' : `${preset.m} Months`;
                      setFormData({
                        ...formData,
                        durationMonths: preset.m,
                        period: periodLabel
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      Number(formData.durationMonths) === preset.m
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cycle Label</label>
              <input
                type="text"
                placeholder="e.g. Monthly, Quarterly, Annual"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Included Features & Perks (One per line)
              </label>
              <textarea
                rows={4}
                value={formData.featuresText}
                onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="newPopular"
                checked={formData.popular}
                onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="newPopular" className="text-xs text-slate-700 font-semibold cursor-pointer">
                Mark as "Most Popular Tier"
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Package</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateServiceSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {activeTab === 'pt'
                  ? 'PT Package Title'
                  : activeTab === 'classes'
                  ? 'Group Class Pass Title'
                  : 'Massage / Therapy Name'} *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 12-Session Transformation Tier"
                value={serviceFormData.name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹ INR) *</label>
                <input
                  type="number"
                  required
                  value={serviceFormData.price}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeTab === 'recovery' ? 'Duration (Mins)' : 'Sessions Count'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12 / 60 Mins"
                  value={serviceFormData.sessions}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, sessions: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeTab === 'pt'
                    ? 'Trainer Level'
                    : activeTab === 'classes'
                    ? 'Lead Instructor'
                    : 'Therapy Category'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Trainer / Elena Rostova"
                  value={serviceFormData.instructorOrType}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, instructorOrType: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Validity Period</label>
                <input
                  type="text"
                  placeholder="e.g. 30 Days / 60 Days"
                  value={serviceFormData.validityDays}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, validityDays: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description & Perks</label>
              <textarea
                rows={3}
                placeholder="Details of the package, benefits, and instructions..."
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Package</span>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
