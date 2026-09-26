import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Flame,
  Clock,
  CheckCircle2,
  Circle,
  Calendar,
  ArrowRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const MemberDashboard = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const { members, workoutPlan, dietPlan } = useGymData();

  const currentMember = members.find((m) => m.id === currentUser?.id) || members[0];

  // Get current day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  const todayWorkout = workoutPlan?.days?.find((d) => d.day === todayName);
  const isSunday = todayName === 'Sunday';

  // Local state for completed exercises
  const [completedExercises, setCompletedExercises] = useState(new Set());

  const toggleExercise = (exId) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  const exercises = todayWorkout?.exercises || [];
  const completedCount = completedExercises.size;
  const totalCount = exercises.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn pb-10 max-w-2xl mx-auto">

      {/* Greeting & Streak Header */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/20">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                {currentMember?.attendanceStreak || 14} Day Streak 🔥
              </span>
              <h1 className="text-base sm:text-xl font-black font-heading text-slate-900 truncate">
                Hey, {currentMember?.name?.split(' ')[0] || 'Athlete'}
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {currentMember?.planName || 'Unassigned Plan'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Quick Daily Metric Badges */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Focus</span>
          <div className="text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5 truncate">
            {isSunday ? 'Rest' : todayWorkout?.label?.split(':')[0] || 'Strength'}
          </div>
          <span className="text-[9px] sm:text-[10px] text-emerald-600 font-medium">{todayName}</span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Calories</span>
          <div className="text-[11px] sm:text-xs font-bold text-amber-600 mt-0.5">
            {dietPlan?.dailyCaloriesTarget || 2400}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-500">kcal/day</span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Coach</span>
          <div className="text-[11px] sm:text-xs font-bold text-teal-600 mt-0.5 truncate">
            {currentMember?.trainerName ? currentMember.trainerName.split(' ')[0] : 'Alex'}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-500">Assigned</span>
        </div>
      </div>

      {/* Today's Workout Card */}
      {isSunday ? (
        <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm text-center space-y-2 sm:space-y-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Sunday Rest & Recovery</h2>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Stretch, hydrate, and recover. Muscles build during rest!
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('workout')}
            className="mt-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <span>Preview Week Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {todayName} Workout
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                {todayWorkout?.label || 'Today\'s Exercises'}
              </h2>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-emerald-600">{progressPct}%</div>
              <div className="text-[10px] text-slate-500">{completedCount} of {totalCount} Done</div>
            </div>
          </div>

          {/* Simple Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Exercise Checklist */}
          <div className="space-y-2">
            {exercises.map((ex, idx) => {
              const isDone = completedExercises.has(ex.id);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => toggleExercise(ex.id)}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all flex items-center gap-2.5 sm:gap-3 cursor-pointer active:scale-[0.98] ${isDone
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-bold block truncate ${isDone ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                      {idx + 1}. {ex.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{ex.sets} sets × {ex.reps}</span>
                      {ex.weight && <span className="text-emerald-600 font-semibold">• {ex.weight}</span>}
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {ex.rest}s
                  </span>
                </button>
              );
            })}
          </div>

          {/* Workout Completed Celebration */}
          {completedCount === totalCount && totalCount > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-emerald-700">Workout Finished!</h3>
              <p className="text-[11px] text-slate-600">Great session! Now check your post-workout meal.</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('workout')}
          className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.98]"
        >
          <div>
            <span className="text-xs font-bold text-slate-900 block">Full Routines</span>
            <span className="text-[10px] text-slate-500">All week workouts</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diet')}
          className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.98]"
        >
          <div>
            <span className="text-xs font-bold text-slate-900 block">Diet Plan</span>
            <span className="text-[10px] text-slate-500">Meals & nutrition</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

    </div>
  );
};
