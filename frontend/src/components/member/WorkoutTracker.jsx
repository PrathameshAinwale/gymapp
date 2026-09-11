import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

export const WorkoutTracker = () => {
  const { workoutPlan } = useGymData();

  const days = workoutPlan?.days || [];
  const [expandedDay, setExpandedDay] = useState(null);

  const toggleDay = (dayName) => {
    setExpandedDay((prev) => (prev === dayName ? null : dayName));
  };

  return (
    <div className="space-y-3 sm:space-y-5 animate-fadeIn pb-10 max-w-2xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-base sm:text-xl font-bold font-heading text-slate-900 flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-emerald-600" />
          Weekly Workout Plan
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {workoutPlan?.title || 'Assigned training program'} • By {workoutPlan?.assignedBy || 'Coach'}
        </p>
      </div>

      {/* Program Info Card */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Active Program</div>
          <div className="text-sm font-bold text-slate-900 font-heading mt-0.5">{workoutPlan?.title || '6-Day PPL'}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Training Days</div>
          <div className="text-lg font-black text-emerald-600 font-heading">{days.length} Days</div>
        </div>
      </div>

      {/* Day-by-Day Accordion */}
      <div className="space-y-2">
        {days.map((day) => {
          const isExpanded = expandedDay === day.day;
          return (
            <div key={day.day} className="rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              {/* Day Header */}
              <button
                type="button"
                onClick={() => toggleDay(day.day)}
                className="w-full flex items-center justify-between p-3 sm:p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] sm:text-xs font-black">
                    {day.day.substring(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{day.day}</div>
                    <div className="text-[11px] text-slate-500">{day.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">{day.exercises.length} exercises</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Exercise List */}
              {isExpanded && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2 border-t border-slate-100 pt-2.5 sm:pt-3 bg-slate-50/50">
                  {day.exercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs"
                    >
                      <div className="text-xs font-bold text-slate-900">
                        {idx + 1}. {ex.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {ex.sets} sets
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {ex.reps} reps
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {ex.weight}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {ex.rest}s rest
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sunday Rest Note */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 mb-1">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs font-bold text-slate-800 mt-1">Sunday — Rest & Recovery</div>
        <div className="text-[11px] text-slate-500">No workout scheduled. Focus on stretching, hydration, and sleep.</div>
      </div>
    </div>
  );
};
