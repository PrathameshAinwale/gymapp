import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Dumbbell,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ChevronRight,
  ArrowLeft,
  Target,
  User,
  Calendar,
  Save,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  hasSqlInjection,
  sanitizeDecimal,
  sanitizeDigits,
  preventNonNumericKey
} from '../../utils/validation';

const DEFAULT_DAYS = [
  { day: 'Monday', title: 'Push Day (Chest, Shoulders & Triceps)', exercises: [] },
  { day: 'Tuesday', title: 'Pull Day (Back & Biceps)', exercises: [] },
  { day: 'Wednesday', title: 'Legs & Core Compound', exercises: [] },
  { day: 'Thursday', title: 'Upper Body Hypertrophy', exercises: [] },
  { day: 'Friday', title: 'Back Width & Arm Sculpt', exercises: [] },
  { day: 'Saturday', title: 'Legs & Core Volume', exercises: [] }
];

const UserAvatar = ({ src, alt, className = "w-12 h-12 rounded-full", iconClassName = "w-6 h-6 text-emerald-600" }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`${className} bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0`}>
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

export const WorkoutBuilder = () => {
  const { currentUser } = useAuth();
  const {
    initialExercises,
    members,
    updateMember,
    workoutPlans,
    saveWorkoutPlan,
    deleteWorkoutPlan,
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
    title: '6-Day Muscle Building Split',
    weight: '',
    height: '',
    goal: '',
    days: JSON.parse(JSON.stringify(DEFAULT_DAYS))
  });

  const [modalDayIdx, setModalDayIdx] = useState(0);

  // Exercise Sub-form state inside Modal
  const [newExForm, setNewExForm] = useState({
    exerciseName: initialExercises[0]?.name || 'Barbell Bench Press',
    sets: 4,
    reps: '10-12',
    weight: '60 kg',
    restSec: 90
  });

  // Open modal to create a new plan
  const handleOpenCreateModal = () => {
    const firstMember = members[0];
    setEditingPlanId(null);
    setFormData({
      memberId: firstMember?.id || '',
      memberName: firstMember?.name || '',
      title: '6-Day Custom Workout Split',
      weight: firstMember?.weight || '',
      height: firstMember?.height || '',
      goal: firstMember?.goal || 'Muscle Hypertrophy & Strength',
      days: JSON.parse(JSON.stringify(DEFAULT_DAYS))
    });
    setModalDayIdx(0);
    setIsModalOpen(true);
  };

  // Open modal to edit existing plan
  const handleOpenEditModal = (plan) => {
    const member = members.find((m) => m.id === plan.memberId);
    setEditingPlanId(plan.id);

    // Ensure Monday to Saturday exist
    const planDays = JSON.parse(JSON.stringify(DEFAULT_DAYS)).map((defDay) => {
      const existing = (plan.days || []).find((d) => d.day.toLowerCase() === defDay.day.toLowerCase());
      if (existing) {
        return {
          day: defDay.day,
          title: existing.title || existing.label || defDay.title,
          exercises: existing.exercises || []
        };
      }
      return defDay;
    });

    setFormData({
      memberId: plan.memberId || member?.id || '',
      memberName: plan.memberName || member?.name || '',
      title: plan.title || 'Custom Workout Split',
      weight: member?.weight || '',
      height: member?.height || '',
      goal: member?.goal || '',
      days: planDays
    });
    setModalDayIdx(0);
    setIsModalOpen(true);
  };

  // Handle client selection in dropdown
  const handleSelectClient = (memberId) => {
    const selected = members.find((m) => m.id === memberId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        memberId: selected.id,
        memberName: selected.name,
        weight: selected.weight || prev.weight,
        height: selected.height || prev.height,
        goal: selected.goal || prev.goal
      }));
    }
  };

  // Update day title in modal
  const handleDayTitleChange = (val) => {
    setFormData((prev) => {
      const nextDays = [...prev.days];
      nextDays[modalDayIdx] = { ...nextDays[modalDayIdx], title: val };
      return { ...prev, days: nextDays };
    });
  };

  // Add an exercise to active day in modal
  const handleAddExercise = (e) => {
    e.preventDefault();
    if (!newExForm.exerciseName.trim()) return;

    const newExercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newExForm.exerciseName,
      exerciseName: newExForm.exerciseName,
      sets: Number(newExForm.sets) || 3,
      reps: newExForm.reps || '10-12',
      weight: newExForm.weight || 'Bodyweight',
      rest: Number(newExForm.restSec) || 60,
      restSec: Number(newExForm.restSec) || 60,
      done: false
    };

    setFormData((prev) => {
      const nextDays = [...prev.days];
      const targetDay = nextDays[modalDayIdx];
      targetDay.exercises = [...(targetDay.exercises || []), newExercise];
      return { ...prev, days: nextDays };
    });

    addToast(`Added "${newExForm.exerciseName}" to ${formData.days[modalDayIdx].day}`);
  };

  // Remove exercise from active day in modal
  const handleRemoveExercise = (exId) => {
    setFormData((prev) => {
      const nextDays = [...prev.days];
      const targetDay = nextDays[modalDayIdx];
      targetDay.exercises = (targetDay.exercises || []).filter((ex) => ex.id !== exId);
      return { ...prev, days: nextDays };
    });
  };

  // Save workout plan
  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(formData.goal) || hasSqlInjection(formData.title)) {
      addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!formData.memberId) {
      addToast('Please select a client', 'error');
      return;
    }

    try {
      setIsSubmittingPlan(true);
      if (formData.memberId) {
        await updateMember(formData.memberId, {
          weight: Number(formData.weight) || undefined,
          height: Number(formData.height) || undefined,
          goal: formData.goal || undefined
        });
      }

      const planToSave = {
        id: editingPlanId || `wp-${Date.now()}`,
        memberId: formData.memberId,
        memberName: formData.memberName,
        assignedBy: currentUser?.name ? `Coach ${currentUser.name}` : 'Coach',
        title: formData.title,
        startDate: new Date().toISOString().split('T')[0],
        days: formData.days
      };

      await saveWorkoutPlan(planToSave);
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
    const activeViewDay = planDays[viewDayIdx] || planDays[0] || { day: 'Monday', exercises: [] };
    const exercises = activeViewDay.exercises || [];

    return (
      <div className="space-y-4 animate-fadeIn pb-16 max-w-xl mx-auto w-full">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedPlanForView(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Workout Plans</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEditModal(selectedPlanForView)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Edit Plan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete workout plan for ${selectedPlanForView.memberName}?`)) {
                  deleteWorkoutPlan(selectedPlanForView.id);
                  setSelectedPlanForView(null);
                }
              }}
              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
              title="Delete Plan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Client Name & Profile Header Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3.5">
          <div className="flex items-center gap-3.5">
            <UserAvatar
              src={member?.avatar}
              alt={selectedPlanForView.memberName}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-emerald-500/40"
              iconClassName="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                Athlete Workout Plan
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {selectedPlanForView.memberName}
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {selectedPlanForView.title}
              </p>
            </div>
          </div>

          {/* Vitals Strip */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Weight</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{member?.weight || '--'} kg</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Height</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{member?.height || '--'} cm</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Goal</span>
              <span className="font-bold text-emerald-600 mt-0.5 block truncate">
                {member?.goal || 'Strength & Conditioning'}
              </span>
            </div>
          </div>
        </div>

        {/* Monday to Saturday Day Selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {planDays.slice(0, 6).map((d, index) => {
            const isActive = viewDayIdx === index;
            const exCount = (d.exercises || []).length;
            return (
              <button
                key={`view-day-${d.day}-${index}`}
                type="button"
                onClick={() => setViewDayIdx(index)}
                className={`flex-1 min-w-[48px] py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold block">{d.day.substring(0, 3)}</span>
                <span className={`text-[9px] block mt-0.5 ${isActive ? 'text-white/90 font-bold' : 'text-slate-400'}`}>
                  {exCount} ex
                </span>
              </button>
            );
          })}
        </div>

        {/* Exercises for the Selected Day */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-600">
                {activeViewDay.day} Routine
              </div>
              <h2 className="font-bold text-sm text-slate-900 mt-0.5">
                {activeViewDay.title || `${activeViewDay.day} Exercises`}
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {exercises.length} Exercises
            </span>
          </div>

          {exercises.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 space-y-2">
              <Dumbbell className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No exercises configured for {activeViewDay.day}.</p>
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedPlanForView)}
                className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1 text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add exercises to this day
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {exercises.map((ex, idx) => (
                <div
                  key={`view-ex-${viewDayIdx}-${ex.id || idx}-${idx}`}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                        {ex.name || ex.exerciseName}
                      </h3>
                    </div>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {ex.rest || ex.restSec || 60}s rest
                    </span>
                  </div>

                  {/* Metrics Badges */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                      {ex.sets} sets
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-emerald-700 font-bold">
                      {ex.reps} reps
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-semibold">
                      {ex.weight}
                    </span>
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
  // VIEW 2: CARDS LIST OF ALL CLIENT PLANS
  // ==========================================
  return (
    <div className="space-y-4 animate-fadeIn pb-16 max-w-xl mx-auto w-full">
      
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Workout Plans
            </h1>
            <p className="text-xs text-slate-500">
              Assign & customize 6-day routines for clients
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-98 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Workout</span>
        </button>
      </div>

      {/* Cards of Created Workout Plans */}
      <div className="space-y-3">
        {(workoutPlans || []).length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No workout plans yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Click "Create Workout" above to assign a routine to a client.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Workout</span>
            </button>
          </div>
        ) : (
          (workoutPlans || []).map((plan, planIdx) => {
            const member = members.find((m) => m.id === plan.memberId);
            const totalExercises = (plan.days || []).reduce(
              (acc, d) => acc + (d.exercises?.length || 0),
              0
            );

            return (
              <div
                key={plan.id || `workout-card-${plan.memberId || planIdx}-${planIdx}`}
                onClick={() => {
                  setSelectedPlanForView(plan);
                  setViewDayIdx(0);
                }}
                className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50/60 border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer space-y-3.5 group shadow-sm"
              >
                {/* Client Avatar & Name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      src={member?.avatar}
                      alt={plan.memberName}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-200 group-hover:border-emerald-400 transition-colors"
                      iconClassName="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {plan.memberName}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          {member?.planName || 'Active Client'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {plan.title}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(plan)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete workout plan for ${plan.memberName}?`)) {
                          deleteWorkoutPlan(plan.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Vitals & Goal */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Weight</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{member?.weight || '--'} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Height</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{member?.height || '--'} cm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Goal</span>
                    <span className="font-bold text-emerald-600 mt-0.5 block truncate">
                      {member?.goal || 'General Fitness'}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {totalExercises} Exercises • 6 Days (Mon–Sat)
                  </span>
                  <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>View Plan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT WORKOUT PLAN MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlanId ? `Edit Workout: ${formData.memberName}` : 'Create Workout Plan'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitPlan} className="space-y-4 text-xs">
          {/* STEP 1: CLIENT SELECTION & VITALS */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wide">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Client Information & Fitness Target</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Select Client *
              </label>
              <select
                value={formData.memberId}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
                required
              >
                <option key="select-client-placeholder" value="" disabled>-- Select athlete from roster --</option>
                {members.map((m, mIdx) => (
                  <option key={`m-opt-${m.id || mIdx}`} value={m.id}>
                    {m.name} ({m.planName || 'Member'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Body Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="e.g. 78.5"
                  value={formData.weight}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setFormData({ ...formData, weight: sanitizeDecimal(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 175"
                  value={formData.height}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setFormData({ ...formData, height: sanitizeDecimal(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fitness Goal *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hypertrophy & Fat Loss"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Workout Plan Title *
              </label>
              <input
                type="text"
                placeholder="e.g. 6-Day Push-Pull-Legs Routine"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
                required
              />
            </div>
          </div>

          {/* STEP 2: MONDAY TO SATURDAY WORKOUT SPLIT */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-slate-800 font-bold text-xs uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Monday to Saturday Exercise Routine</span>
              </span>
              <span className="text-[11px] text-emerald-600 normal-case font-semibold">
                {formData.days[modalDayIdx]?.day} selected
              </span>
            </div>

            {/* 6 Days Selector Tabs */}
            <div className="grid grid-cols-6 gap-1.5">
              {formData.days.map((d, idx) => {
                const isCurrent = modalDayIdx === idx;
                const count = (d.exercises || []).length;
                return (
                  <button
                    key={`modal-day-btn-${d.day}-${idx}`}
                    type="button"
                    onClick={() => setModalDayIdx(idx)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[11px] block">{d.day.substring(0, 3)}</span>
                    <span className={`text-[9px] block ${isCurrent ? 'text-white/90 font-bold' : 'text-slate-400'}`}>
                      {count} ex
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {formData.days[modalDayIdx]?.day} Target Focus / Muscle Group
              </label>
              <input
                type="text"
                value={formData.days[modalDayIdx]?.title}
                onChange={(e) => handleDayTitleChange(e.target.value)}
                placeholder="e.g. Push Day (Chest, Shoulders & Triceps)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            {/* Exercises Already Added */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-slate-700">
                Exercises in {formData.days[modalDayIdx]?.day} ({(formData.days[modalDayIdx]?.exercises || []).length})
              </div>

              {(formData.days[modalDayIdx]?.exercises || []).length === 0 ? (
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-center text-slate-400 text-xs">
                  No exercises added to {formData.days[modalDayIdx]?.day} yet.
                </div>
              ) : (
                (formData.days[modalDayIdx]?.exercises || []).map((ex, exIdx) => (
                  <div
                    key={`modal-day-${modalDayIdx}-ex-${ex.id || exIdx}-${exIdx}`}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {exIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 text-xs block truncate">
                          {ex.name || ex.exerciseName}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {ex.sets} sets × {ex.reps} • {ex.weight} • {ex.rest || ex.restSec}s rest
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(ex.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Exercise Sub-form */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5 mt-2">
              <span className="text-[11px] font-bold text-emerald-800 block">
                + Add Exercise to {formData.days[modalDayIdx]?.day}
              </span>

              <div>
                <label className="block text-[10px] text-slate-600 mb-0.5">Exercise Name *</label>
                <select
                  value={newExForm.exerciseName}
                  onChange={(e) => setNewExForm({ ...newExForm, exerciseName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {initialExercises.map((ex, exIdx) => (
                    <option key={`modal-init-ex-${ex.id || exIdx}`} value={ex.name}>
                      {ex.name} ({ex.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Sets</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    inputMode="numeric"
                    value={newExForm.sets}
                    onKeyDown={(e) => preventNonNumericKey(e, false)}
                    onChange={(e) => setNewExForm({ ...newExForm, sets: sanitizeDigits(e.target.value, 2) })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Reps</label>
                  <input
                    type="text"
                    value={newExForm.reps}
                    onChange={(e) => setNewExForm({ ...newExForm, reps: e.target.value })}
                    placeholder="10-12"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Target Wt</label>
                  <input
                    type="text"
                    value={newExForm.weight}
                    onChange={(e) => setNewExForm({ ...newExForm, weight: e.target.value })}
                    placeholder="60 kg"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Rest (s)</label>
                  <input
                    type="number"
                    step="15"
                    value={newExForm.restSec}
                    onChange={(e) => setNewExForm({ ...newExForm, restSec: e.target.value })}
                    placeholder="90"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddExercise}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exercise to {formData.days[modalDayIdx]?.day}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPlan}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-98 cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmittingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingPlan ? 'Saving & Assigning...' : 'Save & Assign Workout Plan'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
