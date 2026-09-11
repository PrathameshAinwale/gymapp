import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  TrendingUp,
  Scale,
  Percent,
  Activity,
  Flame,
  Trophy,
  Layers
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { StatCard } from '../common/StatCard';

export const MemberTransformation = () => {
  const { currentUser } = useAuth();
  const { members, bodyMetrics } = useGymData();

  const currentMember = members.find((m) => String(m.id) === String(currentUser?.id)) || members[0] || {};
  const defaultMetric = { weight: 77.8, bodyFat: 14.2, muscleMass: 38.2, chest: 109.5, waist: 80.5, biceps: 39.0, month: 'Sep' };
  const latestMetric = bodyMetrics && bodyMetrics.length > 0 ? bodyMetrics[bodyMetrics.length - 1] : defaultMetric;
  const initialMetric = bodyMetrics && bodyMetrics.length > 0 ? bodyMetrics[0] : defaultMetric;

  // Calculate BMI = kg / (m^2)
  const heightInMeters = (currentMember?.height || 178) / 100;
  const bmi = ((latestMetric?.weight || 75) / (heightInMeters * heightInMeters)).toFixed(1);

  const weightChange = (latestMetric.weight - initialMetric.weight).toFixed(1);
  const fatChange = (latestMetric.bodyFat - initialMetric.bodyFat).toFixed(1);

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-16 max-w-4xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-2xl font-bold font-heading text-slate-900 tracking-tight truncate">
                Transformation & Analytics
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Metrics
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Track weight loss, body fat reduction, and muscle hypertrophy evolution over time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
            <span>Target: {currentMember.targetWeight || 70} kg</span>
          </span>
        </div>
      </div>

      {/* 2. Top KPI StatCards (Owner Dashboard Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Current Weight"
          value={`${latestMetric.weight} kg`}
          change={`${weightChange <= 0 ? weightChange : `+${weightChange}`} kg vs Start`}
          isPositive={Number(weightChange) <= 0}
          icon={Scale}
          color="emerald"
        />
        <StatCard
          title="Body Fat %"
          value={`${latestMetric.bodyFat}%`}
          change={`${fatChange <= 0 ? fatChange : `+${fatChange}`}% overall`}
          isPositive={Number(fatChange) <= 0}
          icon={Percent}
          color="cyan"
        />
        <StatCard
          title="Body Mass Index"
          value={`${bmi} BMI`}
          change="Healthy & Optimal"
          isPositive={true}
          icon={Activity}
          color="teal"
        />
        <StatCard
          title="Muscle Mass"
          value={`${latestMetric.muscleMass || 38.2} kg`}
          change="+2.8 kg Lean Gain"
          isPositive={true}
          icon={Flame}
          color="indigo"
        />
      </div>

      {/* 3. Progress Line Chart */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
              Weight Loss & Body Fat Reduction Trajectory
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Weight (kg)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Body Fat %
            </span>
          </div>
        </div>

        <div className="h-56 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyMetrics || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="bodyFat"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={{ fill: '#06b6d4', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Body Part Measurements */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
            Circumference & Hypertrophy Measurements
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chest</div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-heading">
              {latestMetric.chest || 109.5} <span className="text-xs font-normal text-slate-500">cm</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-600">+1.5 cm expanded</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waist</div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-heading">
              {latestMetric.waist || 80.5} <span className="text-xs font-normal text-slate-500">cm</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-600">-3.0 cm trimmed</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Arms / Biceps</div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-heading">
              {latestMetric.biceps || 39.0} <span className="text-xs font-normal text-slate-500">cm</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-600">+0.8 cm pumped</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thighs</div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-heading">
              {latestMetric.thighs || 58.0} <span className="text-xs font-normal text-slate-500">cm</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-600">+1.0 cm defined</div>
          </div>
        </div>
      </div>
    </div>
  );
};
