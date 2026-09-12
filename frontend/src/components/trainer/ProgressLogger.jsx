import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { TrendingUp, Plus, Calendar, Activity, Scale, Percent, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Modal } from '../common/Modal';

export const ProgressLogger = () => {
  const { bodyMetrics, logNewBodyMetrics, members, addToast } = useGymData();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSubmittingMetric, setIsSubmittingMetric] = useState(false);

  const [formMetric, setFormMetric] = useState({
    month: 'Sep',
    weight: 77.8,
    bodyFat: 14.2,
    muscleMass: 38.2,
    chest: 109.5,
    waist: 80.5,
    biceps: 39.0
  });

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingMetric(true);
      await logNewBodyMetrics({
        month: formMetric.month,
        weight: Number(formMetric.weight),
        bodyFat: Number(formMetric.bodyFat),
        muscleMass: Number(formMetric.muscleMass),
        chest: Number(formMetric.chest),
        waist: Number(formMetric.waist),
        biceps: Number(formMetric.biceps)
      });
      setIsLogModalOpen(false);
    } finally {
      setIsSubmittingMetric(false);
    }
  };

  const defaultMetric = { weight: 77.8, bodyFat: 14.2, muscleMass: 38.2, chest: 109.5, waist: 80.5, biceps: 39.0, month: 'Sep' };
  const latestMetric = bodyMetrics && bodyMetrics.length > 0 ? bodyMetrics[bodyMetrics.length - 1] : defaultMetric;
  const initialMetric = bodyMetrics && bodyMetrics.length > 0 ? bodyMetrics[0] : defaultMetric;
  const weightLost = (initialMetric.weight - latestMetric.weight).toFixed(1);
  const fatLost = (initialMetric.bodyFat - latestMetric.bodyFat).toFixed(1);

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold font-heading text-slate-900 tracking-tight truncate">
              Progress & Body Metrics
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Track biometric transformations, circumference measurements, and body fat composition.
          </p>
        </div>

        <button
          onClick={() => setIsLogModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Log Measurement</span>
          <span className="inline sm:hidden">Log</span>
        </button>
      </div>

      {/* Highlights Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Weight Change
            </span>
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-3xl font-black font-heading text-emerald-600 mt-1">
            -{weightLost} kg
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 block truncate">
            {initialMetric.weight} kg → {latestMetric.weight} kg
          </span>
        </div>

        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Body Fat
            </span>
            <Percent className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-lg sm:text-3xl font-black font-heading text-teal-600 mt-1">
            -{fatLost}%
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 block truncate">
            Current: {latestMetric.bodyFat}%
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Muscle Mass
            </span>
            <Activity className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg sm:text-3xl font-black font-heading text-slate-900 mt-1">
            +{(latestMetric.muscleMass - initialMetric.muscleMass).toFixed(1)} kg
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 block truncate">
            Hypertrophy on track
          </span>
        </div>
      </div>

      {/* Progress Line Chart */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">
              Weight & Body Fat Progression
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500">6-Month biometric trajectory</p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Weight (kg)
            </span>
            <span className="flex items-center gap-1.5 text-teal-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Body Fat (%)
            </span>
          </div>
        </div>

        <div className="h-48 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="weight" stroke="#059669" strokeWidth={2.5} dot={{ fill: '#059669', r: 4 }} />
              <Line type="monotone" dataKey="bodyFat" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Measurements Ledger Table */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 mb-3">
          Measurement Log History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3">Weight (kg)</th>
                <th className="py-2.5 px-3">Body Fat %</th>
                <th className="py-2.5 px-3">Muscle Mass</th>
                <th className="py-2.5 px-3">Chest (cm)</th>
                <th className="py-2.5 px-3">Waist (cm)</th>
                <th className="py-2.5 px-3">Arms/Biceps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {bodyMetrics.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{m.month}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">{m.weight} kg</td>
                  <td className="py-2.5 px-3 text-teal-700 font-semibold">{m.bodyFat}%</td>
                  <td className="py-2.5 px-3">{m.muscleMass} kg</td>
                  <td className="py-2.5 px-3">{m.chest} cm</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{m.waist} cm</td>
                  <td className="py-2.5 px-3">{m.biceps} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG MODAL */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Record New Body Measurements"
      >
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Month / Tag</label>
              <input
                type="text"
                required
                value={formMetric.month}
                onChange={(e) => setFormMetric({ ...formMetric, month: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formMetric.weight}
                onChange={(e) => setFormMetric({ ...formMetric, weight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Body Fat %</label>
              <input
                type="number"
                step="0.1"
                required
                value={formMetric.bodyFat}
                onChange={(e) => setFormMetric({ ...formMetric, bodyFat: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chest (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formMetric.chest}
                onChange={(e) => setFormMetric({ ...formMetric, chest: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Waist (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formMetric.waist}
                onChange={(e) => setFormMetric({ ...formMetric, waist: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Arms (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formMetric.biceps}
                onChange={(e) => setFormMetric({ ...formMetric, biceps: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingMetric}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmittingMetric && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingMetric ? 'Saving...' : 'Save Metrics'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
