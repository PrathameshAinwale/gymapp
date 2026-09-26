import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Utensils,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ChevronRight,
  ArrowLeft,
  User,
  Calendar,
  Save,
  Droplets,
  Flame,
  X,
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  hasSqlInjection,
  sanitizeDigits,
  preventNonNumericKey
} from '../../utils/validation';

const DEFAULT_DIET_DAYS = [
  { day: 'Monday', meals: [] },
  { day: 'Tuesday', meals: [] },
  { day: 'Wednesday', meals: [] },
  { day: 'Thursday', meals: [] },
  { day: 'Friday', meals: [] },
  { day: 'Saturday', meals: [] }
];

const UserAvatar = ({ src, alt, className = "w-12 h-12 rounded-full", iconClassName = "w-6 h-6 text-amber-600" }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`${className} bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0`}>
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

export const DietBuilder = () => {
  const { currentUser } = useAuth();
  const {
    members,
    dietPlans,
    saveDietPlan,
    deleteDietPlan,
    addToast
  } = useGymData();

  // Master-Detail Navigation State
  const [selectedPlanForView, setSelectedPlanForView] = useState(null);
  const [viewDayIdx, setViewDayIdx] = useState(0);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    dailyCaloriesTarget: 2600,
    proteinGramsTarget: 175,
    carbsGramsTarget: 290,
    fatsGramsTarget: 65,
    waterGlassesTarget: 10,
    days: JSON.parse(JSON.stringify(DEFAULT_DIET_DAYS))
  });

  const [modalDayIdx, setModalDayIdx] = useState(0);

  // Meal Sub-form state inside Modal
  const [newMealForm, setNewMealForm] = useState({
    name: 'Power Breakfast',
    time: '08:30 AM',
    items: '4 Boiled Eggs + 2 Multigrain Rotis with Curd + 1 Banana',
    calories: 550,
    protein: 34,
    carbs: 65,
    fats: 16
  });

  // Open create modal
  const handleOpenCreateModal = () => {
    const firstMember = members[0];
    setEditingPlanId(null);
    setFormData({
      memberId: firstMember?.id || '',
      memberName: firstMember?.name || '',
      dailyCaloriesTarget: 2600,
      proteinGramsTarget: 175,
      carbsGramsTarget: 290,
      fatsGramsTarget: 65,
      waterGlassesTarget: 10,
      days: JSON.parse(JSON.stringify(DEFAULT_DIET_DAYS))
    });
    setModalDayIdx(0);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (plan) => {
    const member = members.find((m) => m.id === plan.memberId);
    setEditingPlanId(plan.id);

    const planDays = JSON.parse(JSON.stringify(DEFAULT_DIET_DAYS)).map((defDay) => {
      const existing = (plan.days || []).find((d) => d.day.toLowerCase() === defDay.day.toLowerCase());
      if (existing) {
        return {
          day: defDay.day,
          meals: existing.meals || []
        };
      }
      return defDay;
    });

    setFormData({
      memberId: plan.memberId || member?.id || '',
      memberName: plan.memberName || member?.name || '',
      dailyCaloriesTarget: plan.dailyCaloriesTarget || plan.dailyTargetCalories || 2600,
      proteinGramsTarget: plan.proteinGramsTarget || plan.macros?.protein || 175,
      carbsGramsTarget: plan.carbsGramsTarget || plan.macros?.carbs || 290,
      fatsGramsTarget: plan.fatsGramsTarget || plan.macros?.fats || 65,
      waterGlassesTarget: plan.waterGlassesTarget || 10,
      days: planDays
    });
    setModalDayIdx(0);
    setIsModalOpen(true);
  };

  // Select client in dropdown
  const handleSelectClient = (memberId) => {
    const selected = members.find((m) => m.id === memberId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        memberId: selected.id,
        memberName: selected.name
      }));
    }
  };

  // Add meal to active day in modal
  const handleAddMeal = (e) => {
    e.preventDefault();
    if (!newMealForm.name.trim() || !newMealForm.items.trim()) {
      addToast('Please enter meal name and items', 'error');
      return;
    }

    const newMeal = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newMealForm.name,
      time: newMealForm.time || '12:00 PM',
      items: newMealForm.items,
      calories: Number(newMealForm.calories) || 0,
      protein: Number(newMealForm.protein) || 0,
      carbs: Number(newMealForm.carbs) || 0,
      fats: Number(newMealForm.fats) || 0,
      completed: false
    };

    setFormData((prev) => {
      const nextDays = [...prev.days];
      const targetDay = nextDays[modalDayIdx];
      targetDay.meals = [...(targetDay.meals || []), newMeal];
      return { ...prev, days: nextDays };
    });

    addToast(`Added "${newMealForm.name}" to ${formData.days[modalDayIdx].day}`);
  };

  // Remove meal from active day in modal
  const handleRemoveMeal = (mealId) => {
    setFormData((prev) => {
      const nextDays = [...prev.days];
      const targetDay = nextDays[modalDayIdx];
      targetDay.meals = (targetDay.meals || []).filter((m) => m.id !== mealId);
      return { ...prev, days: nextDays };
    });
  };

  // Submit plan
  const handleSubmitDiet = async (e) => {
    e.preventDefault();
    if (!formData.memberId) {
      addToast('Please select a client', 'error');
      return;
    }

    try {
      setIsSubmittingPlan(true);
      const planToSave = {
        id: editingPlanId || `dp-${Date.now()}`,
        memberId: formData.memberId,
        memberName: formData.memberName,
        assignedBy: currentUser?.name ? `Coach ${currentUser.name}` : 'Coach',
        dailyCaloriesTarget: Number(formData.dailyCaloriesTarget) || 2600,
        proteinGramsTarget: Number(formData.proteinGramsTarget) || 175,
        carbsGramsTarget: Number(formData.carbsGramsTarget) || 290,
        fatsGramsTarget: Number(formData.fatsGramsTarget) || 65,
        waterGlassesTarget: Number(formData.waterGlassesTarget) || 10,
        days: formData.days
      };

      await saveDietPlan(planToSave);
      if (selectedPlanForView && selectedPlanForView.id === planToSave.id) {
        setSelectedPlanForView(planToSave);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  // ==========================================
  // VIEW 1: SEPARATE DETAIL PAGE FOR A CLIENT
  // ==========================================
  if (selectedPlanForView) {
    const member = members.find((m) => m.id === selectedPlanForView.memberId);
    const planDays = selectedPlanForView.days || [];
    const activeViewDay = planDays[viewDayIdx] || planDays[0] || { day: 'Monday', meals: [] };
    const meals = activeViewDay.meals || [];

    const dayCalories = meals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
    const dayProtein = meals.reduce((acc, m) => acc + (Number(m.protein) || 0), 0);
    const dayCarbs = meals.reduce((acc, m) => acc + (Number(m.carbs) || 0), 0);
    const dayFats = meals.reduce((acc, m) => acc + (Number(m.fats) || 0), 0);

    return (
      <div className="space-y-4 animate-fadeIn pb-16 max-w-xl mx-auto w-full">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedPlanForView(null)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Diet Plans</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEditModal(selectedPlanForView)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-all"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Edit Plan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete diet plan for ${selectedPlanForView.memberName}?`)) {
                  deleteDietPlan(selectedPlanForView.id);
                  setSelectedPlanForView(null);
                }
              }}
              className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all"
              title="Delete Plan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Client Name & Header Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center gap-3.5">
            <UserAvatar
              src={member?.avatar}
              alt={selectedPlanForView.memberName}
              className="w-14 h-14 rounded-full border-2 border-amber-400/40"
              iconClassName="w-7 h-7 text-amber-600"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                Athlete Nutrition Plan
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {selectedPlanForView.memberName}
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Assigned by {selectedPlanForView.assignedBy || 'Coach'}
              </p>
            </div>
          </div>

          {/* Daily Target Summary Grid */}
          <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs">
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-bold block">Calories</span>
              <span className="font-bold text-emerald-600 mt-0.5 block">
                {selectedPlanForView.dailyCaloriesTarget || 2600}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-bold block">Protein</span>
              <span className="font-bold text-blue-600 mt-0.5 block">
                {selectedPlanForView.proteinGramsTarget || 175}g
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-bold block">Carbs</span>
              <span className="font-bold text-amber-600 mt-0.5 block">
                {selectedPlanForView.carbsGramsTarget || 290}g
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-bold block">Fats</span>
              <span className="font-bold text-rose-600 mt-0.5 block">
                {selectedPlanForView.fatsGramsTarget || 65}g
              </span>
            </div>
          </div>
        </div>

        {/* Monday to Saturday Day Selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {planDays.slice(0, 6).map((d, index) => {
            const isActive = viewDayIdx === index;
            const mealCount = (d.meals || []).length;
            return (
              <button
                key={`view-diet-day-${d.day}-${index}`}
                type="button"
                onClick={() => setViewDayIdx(index)}
                className={`flex-1 min-w-[48px] py-2.5 px-1.5 rounded-xl border text-center transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold block">{d.day.substring(0, 3)}</span>
                <span className={`text-[10px] block mt-0.5 ${isActive ? 'text-white/90 font-medium' : 'text-slate-400'}`}>
                  {mealCount} meals
                </span>
              </button>
            );
          })}
        </div>

        {/* Meals for Selected Day */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-600">
                {activeViewDay.day} Timetable
              </div>
              <h2 className="font-bold text-sm text-slate-900 mt-0.5">
                Daily Meal Schedule
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {meals.length} Meal Slots
            </span>
          </div>

          {meals.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 space-y-2">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No meals configured for {activeViewDay.day}.</p>
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedPlanForView)}
                className="text-amber-600 font-bold hover:underline inline-flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add meals to this day
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {meals.map((meal, idx) => (
                <div
                  key={`view-meal-${viewDayIdx}-${meal.id || idx}-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {meal.name}
                      </span>
                      {meal.time && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {meal.time}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 shrink-0">
                      {meal.calories} kcal
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {meal.items}
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-[10px]">
                    <span className="text-blue-600 font-semibold">P: {meal.protein}g</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-amber-600 font-semibold">C: {meal.carbs}g</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-rose-600 font-semibold">F: {meal.fats}g</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: CARDS LIST OF ALL CLIENT DIET PLANS
  // ==========================================
  return (
    <div className="space-y-4 animate-fadeIn pb-16 max-w-xl mx-auto w-full">
      
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Diet & Nutrition Plans
            </h1>
            <p className="text-xs text-slate-500">
              Assign customized meal schedules for clients
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-98 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Diet Plan</span>
        </button>
      </div>

      {/* Cards of Created Diet Plans */}
      <div className="space-y-3">
        {(dietPlans || []).length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No diet plans yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Click "Create Diet Plan" above to configure meals for an athlete.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Diet Plan</span>
            </button>
          </div>
        ) : (
          (dietPlans || []).map((plan, planIdx) => {
            const member = members.find((m) => m.id === plan.memberId);
            const totalMeals = (plan.days || []).reduce(
              (acc, d) => acc + (d.meals?.length || 0),
              0
            );

            return (
              <div
                key={plan.id || `diet-card-${plan.memberId || planIdx}-${planIdx}`}
                onClick={() => {
                  setSelectedPlanForView(plan);
                  setViewDayIdx(0);
                }}
                className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-all cursor-pointer space-y-3.5 group shadow-sm"
              >
                {/* Client Avatar & Name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      src={member?.avatar}
                      alt={plan.memberName}
                      className="w-12 h-12 rounded-full border border-slate-200 group-hover:border-amber-400 transition-colors"
                      iconClassName="w-6 h-6 text-amber-600"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                          {plan.memberName}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          {member?.planName || 'Active Client'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        Assigned by {plan.assignedBy || 'Coach'}
                      </p>
                    </div>
                  </div>

                  {/* Actions (stopPropagation prevents card click) */}
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(plan)}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete diet plan for ${plan.memberName}?`)) {
                          deleteDietPlan(plan.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Macro Target Summary Strip */}
                <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Calories</span>
                    <span className="font-bold text-emerald-600 mt-0.5 block">
                      {plan.dailyCaloriesTarget || 2600}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Protein</span>
                    <span className="font-bold text-blue-600 mt-0.5 block">
                      {plan.proteinGramsTarget || 175}g
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Carbs</span>
                    <span className="font-bold text-amber-600 mt-0.5 block">
                      {plan.carbsGramsTarget || 290}g
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Fats</span>
                    <span className="font-bold text-rose-600 mt-0.5 block">
                      {plan.fatsGramsTarget || 65}g
                    </span>
                  </div>
                </div>

                {/* Footer: Click to view details */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-600" />
                    {plan.waterGlassesTarget || 10} Glasses Water • {totalMeals} Meals (Mon–Sat)
                  </span>
                  <span className="text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>View Plan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT DIET PLAN MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlanId ? `Edit Diet Plan: ${formData.memberName}` : 'Create Diet Plan'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitDiet} className="space-y-4 text-xs">
          {/* STEP 1: CLIENT SELECTION & MACRO TARGETS */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wide">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Client & Daily Macro Targets</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Select Client *
              </label>
              <select
                value={formData.memberId}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                required
              >
                <option key="diet-select-placeholder" value="" disabled>-- Select athlete from roster --</option>
                {members.map((m, mIdx) => (
                  <option key={`diet-mem-${m.id || mIdx}`} value={m.id}>
                    {m.name} ({m.planName || 'Member'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Calories (kcal) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.dailyCaloriesTarget}
                  onKeyDown={(e) => preventNonNumericKey(e, false)}
                  onChange={(e) => setFormData({ ...formData, dailyCaloriesTarget: sanitizeDigits(e.target.value, 5) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Protein (g) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.proteinGramsTarget}
                  onKeyDown={(e) => preventNonNumericKey(e, false)}
                  onChange={(e) => setFormData({ ...formData, proteinGramsTarget: sanitizeDigits(e.target.value, 4) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Carbs (g) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.carbsGramsTarget}
                  onKeyDown={(e) => preventNonNumericKey(e, false)}
                  onChange={(e) => setFormData({ ...formData, carbsGramsTarget: sanitizeDigits(e.target.value, 4) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fats (g) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.fatsGramsTarget}
                  onKeyDown={(e) => preventNonNumericKey(e, false)}
                  onChange={(e) => setFormData({ ...formData, fatsGramsTarget: sanitizeDigits(e.target.value, 4) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Daily Water Target (Glasses / Liters)
              </label>
              <input
                type="number"
                value={formData.waterGlassesTarget}
                onChange={(e) => setFormData({ ...formData, waterGlassesTarget: e.target.value })}
                placeholder="10 glasses"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* STEP 2: MONDAY TO SATURDAY MEALS TIMETABLE */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-slate-900 font-bold text-xs uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Monday to Saturday Meals Schedule</span>
              </span>
              <span className="text-[11px] text-amber-600 normal-case font-semibold">
                {formData.days[modalDayIdx]?.day} selected
              </span>
            </div>

            {/* 6 Days Selector Tabs */}
            <div className="grid grid-cols-6 gap-1.5">
              {formData.days.map((d, idx) => {
                const isCurrent = modalDayIdx === idx;
                const count = (d.meals || []).length;
                return (
                  <button
                    key={`modal-diet-day-btn-${d.day}-${idx}`}
                    type="button"
                    onClick={() => setModalDayIdx(idx)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[11px] block">{d.day.substring(0, 3)}</span>
                    <span className={`text-[9px] block ${isCurrent ? 'text-white/90 font-semibold' : 'text-slate-400'}`}>
                      {count} meals
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Meals in Selected Day */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-slate-600">
                Scheduled Meals in {formData.days[modalDayIdx]?.day} ({(formData.days[modalDayIdx]?.meals || []).length})
              </div>

              {(formData.days[modalDayIdx]?.meals || []).length === 0 ? (
                <div className="p-3 rounded-xl bg-white border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                  No meals added to {formData.days[modalDayIdx]?.day} yet.
                </div>
              ) : (
                (formData.days[modalDayIdx]?.meals || []).map((meal, mIdx) => (
                  <div
                    key={`modal-diet-meal-${modalDayIdx}-${meal.id || mIdx}-${mIdx}`}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-800 text-xs truncate">
                          {meal.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {meal.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                          {meal.calories} kcal
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove meal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {meal.items}
                    </p>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-blue-600 font-semibold">P: {meal.protein}g</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-600 font-semibold">C: {meal.carbs}g</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-600 font-semibold">F: {meal.fats}g</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Meal Sub-form */}
            <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-2.5 mt-2">
              <span className="text-[11px] font-bold text-amber-700 block">
                + Add Meal to {formData.days[modalDayIdx]?.day}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Meal Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Power Breakfast"
                    value={newMealForm.name}
                    onChange={(e) => setNewMealForm({ ...newMealForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Time</label>
                  <input
                    type="text"
                    placeholder="08:30 AM"
                    value={newMealForm.time}
                    onChange={(e) => setNewMealForm({ ...newMealForm, time: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-600 mb-0.5">Food Items & Portions *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 4 Boiled Eggs, 2 Multigrain Parathas, 1 Banana"
                  value={newMealForm.items}
                  onChange={(e) => setNewMealForm({ ...newMealForm, items: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Calories</label>
                  <input
                    type="number"
                    value={newMealForm.calories}
                    onChange={(e) => setNewMealForm({ ...newMealForm, calories: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Protein (g)</label>
                  <input
                    type="number"
                    value={newMealForm.protein}
                    onChange={(e) => setNewMealForm({ ...newMealForm, protein: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Carbs (g)</label>
                  <input
                    type="number"
                    value={newMealForm.carbs}
                    onChange={(e) => setNewMealForm({ ...newMealForm, carbs: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Fats (g)</label>
                  <input
                    type="number"
                    value={newMealForm.fats}
                    onChange={(e) => setNewMealForm({ ...newMealForm, fats: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddMeal}
                className="w-full py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Meal to {formData.days[modalDayIdx]?.day}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPlan}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all active:scale-98 cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmittingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingPlan ? 'Saving & Assigning...' : 'Save & Assign Diet Plan'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
