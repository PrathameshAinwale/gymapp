import React from 'react';
import { useGymData } from '../../context/GymDataContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useGymData();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let borderColor = 'border-emerald-500/40 text-emerald-400 bg-[#0e172a]/95';
        let glow = 'glow-emerald';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          borderColor = 'border-red-500/50 text-red-400 bg-[#1a0f14]/95';
          glow = 'shadow-lg shadow-red-500/20';
        } else if (toast.type === 'info') {
          Icon = Info;
          borderColor = 'border-blue-500/40 text-blue-400 bg-[#0e192f]/95';
          glow = 'glow-cyan';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all animate-slideUp ${borderColor} ${glow}`}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 shrink-0" />
              <p className="text-xs font-medium text-slate-100">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
