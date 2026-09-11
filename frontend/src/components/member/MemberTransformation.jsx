import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { TrendingUp, Scale, Percent, Activity, Award, Flame, Target } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const MemberTransformation = () => {
  const { currentUser } = useAuth();
  const { members, bodyMetrics } = useGymData();

  const currentMember = members.find((m) => m.id === currentUser.id) || members[0];
  const latestMetric = bodyMetrics[bodyMetrics.length - 1];
  const initialMetric = bodyMetrics[0];

  // Calculate BMI = kg / (m^2)
  const heightInMeters = (currentMember.height || 178) / 100;
  const bmi = (latestMetric.weight / (heightInMeters * heightInMeters)).toFixed(1);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span>Body Transformation & Analytics</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Track your personal weight loss, body fat reduction, and muscle hypertrophy over time.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500">Weight</span>
            <Scale className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800">
            {latestMetric.weight} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Target: {currentMember.targetWeight} kg
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500">Body Fat</span>
            <Percent className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800">
            {latestMetric.bodyFat}%
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Initial: {initialMetric.bodyFat}%
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500">BMI</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800">
            {bmi}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            Normal & Healthy Range
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500">Muscle Mass</span>
            <Flame className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800">
            {latestMetric.muscleMass} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            +2.8 kg lean gain
          </span>
        </div>
      </div>

      {/* Progress Line Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-sm sm:text-base text-slate-800">
            Weight Loss & Fat Reduction Trajectory
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Weight (kg)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Fat %
            </span>
          </div>
        </div>

        <div className="h-52 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="bodyFat" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Body Circumference Measurements */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-bold text-sm sm:text-base text-slate-800">
          Circumference Measurements (cm)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500">Chest</span>
            <div className="text-xl font-black text-slate-800 mt-1">{latestMetric.chest} cm</div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">+5 cm expansion</span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500">Waist</span>
            <div className="text-xl font-black text-slate-800 mt-1">{latestMetric.waist} cm</div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">-8.5 cm trimmed</span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500">Arms / Biceps</span>
            <div className="text-xl font-black text-slate-800 mt-1">{latestMetric.biceps} cm</div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">+2.5 cm peak</span>
          </div>
        </div>
      </div>

    </div>
  );
};
