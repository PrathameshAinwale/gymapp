import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  Utensils,
  Clock,
  ChevronDown,
  ChevronUp,
  Flame,
  Droplets
} from 'lucide-react';

export const DietTracker = () => {
  const { dietPlan } = useGymData();

  const days = dietPlan?.days || [];
  
  // Default expanded to today's day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  const [expandedDay, setExpandedDay] = useState(todayName);

  const toggleDay = (dayName) => {
    setExpandedDay((prev) => (prev === dayName ? null : dayName));
  };

  return (
    <div className="space-y-3 sm:space-y-5 animate-fadeIn pb-10 max-w-2xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-base sm:text-xl font-bold font-heading text-slate-900 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-emerald-600" />
          Weekly Diet & Nutrition Plan
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Assigned by {dietPlan?.assignedBy || 'Coach Alex'} • Indian Macro Nutrition Chart
        </p>
      </div>

      {/* Day-by-Day Meal Accordion */}
      <div className="space-y-2">
        {days.map((day) => {
          const isExpanded = expandedDay === day.day;
          const isToday = day.day === todayName;
          const totalCal = day.meals.reduce((acc, m) => acc + m.calories, 0);
          const totalProtein = day.meals.reduce((acc, m) => acc + m.protein, 0);

          return (
            <div
              key={day.day}
              className={`rounded-xl sm:rounded-2xl border overflow-hidden shadow-sm transition-all ${
                isToday ? 'border-emerald-400 bg-white ring-1 ring-emerald-300/50' : 'border-slate-200 bg-white'
              }`}
            >
              {/* Day Header */}
              <button
                type="button"
                onClick={() => toggleDay(day.day)}
                className="w-full flex items-center justify-between p-3 sm:p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-black border ${
                    isToday
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {day.day.substring(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {day.day}
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{totalCal} kcal • {totalProtein}g protein</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">{day.meals.length} meals</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Meals List */}
              {isExpanded && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 border-t border-slate-100 pt-2.5 sm:pt-3 bg-slate-50/50">
                  {day.meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white border border-slate-200 space-y-1.5 sm:space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">{meal.name}</div>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-slate-400" /> {meal.time}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {meal.items}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          <Flame className="w-2.5 h-2.5 inline mr-0.5 text-amber-500" />{meal.calories} kcal
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          P: {meal.protein}g
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          C: {meal.carbs}g
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          F: {meal.fats}g
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

      {/* Hydration Reminder */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center gap-2.5 sm:gap-3">
        <Droplets className="w-6 h-6 text-cyan-600 shrink-0" />
        <div>
          <div className="text-xs font-bold text-cyan-900">Stay Hydrated!</div>
          <div className="text-[11px] text-cyan-700">Target: {dietPlan?.waterGlassesTarget || 10} glasses of water daily</div>
        </div>
      </div>
    </div>
  );
};
