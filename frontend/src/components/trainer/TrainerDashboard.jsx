import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Users,
  Dumbbell,
  Utensils,
  Award,
  ArrowRight,
  ChevronRight,
  Target,
  TrendingUp,
  IndianRupee
} from 'lucide-react';

export const TrainerDashboard = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const { members, commissions } = useGymData();

  // Assigned clients
  const assignedClients = members.filter(
    (m) => m.trainerId === currentUser?.id || !m.trainerId
  );

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn pb-10 max-w-2xl mx-auto">
      
      {/* Coach Header Card */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">
                Coach Portal
              </span>
              <h1 className="text-base sm:text-xl font-black font-heading text-slate-900 truncate">
                {currentUser?.name || 'Coach Alex Rivers'}
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {currentUser?.specialty || 'Hypertrophy & Powerlifting'}
              </p>
            </div>
          </div>

          <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
            {assignedClients.length} Clients
          </span>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('workout-builder')}
            className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer active:scale-95"
          >
            <Dumbbell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Workouts</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('diet-builder')}
            className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] sm:text-xs font-bold border border-slate-200 transition-all cursor-pointer active:scale-95"
          >
            <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Diet Plans</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('commissions')}
            className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] sm:text-xs font-bold border border-teal-200 transition-all cursor-pointer active:scale-95"
          >
            <TrendingUp className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="truncate">Commissions</span>
          </button>
        </div>
      </div>

      {/* Assigned Clients List */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Clients</h2>
            <p className="text-xs text-slate-500">Members under your active coaching supervision</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5 pt-1">
          {assignedClients.slice(0, 4).map((client) => (
            <div
              key={client.id}
              onClick={() => setActiveTab('clients')}
              className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-200 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={client.avatar}
                  alt={client.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">{client.name}</h3>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <Target className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{client.goal}</span>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-emerald-600">
                  {client.weight} kg
                </div>
                <div className="text-[10px] text-slate-400">
                  {client.attendanceStreak || 14}d streak
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Routine & Diet Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          onClick={() => setActiveTab('workout-builder')}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all cursor-pointer space-y-2 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Dumbbell className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Workout Routines</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Edit exercises, sets, reps & rest periods</p>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('diet-builder')}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all cursor-pointer space-y-2 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Utensils className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Diet & Nutrition</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Manage daily meals & Indian macro charts</p>
          </div>
        </div>
      </div>

    </div>
  );
};
