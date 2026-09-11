import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ title, value, change, isPositive, icon: Icon, colorScheme = 'emerald', subtext }) => {
  const colorMap = {
    emerald: {
      border: 'border-slate-200 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
      accent: 'text-emerald-600'
    },
    cyan: {
      border: 'border-slate-200 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-50 text-cyan-600 border border-cyan-200',
      accent: 'text-cyan-600'
    },
    teal: {
      border: 'border-slate-200 hover:border-teal-500/40',
      iconBg: 'bg-teal-50 text-teal-600 border border-teal-200',
      accent: 'text-teal-600'
    },
    lime: {
      border: 'border-slate-200 hover:border-lime-500/40',
      iconBg: 'bg-lime-50 text-lime-700 border border-lime-200',
      accent: 'text-lime-700'
    },
    blue: {
      border: 'border-slate-200 hover:border-sky-500/40',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-200',
      accent: 'text-sky-600'
    },
    amber: {
      border: 'border-slate-200 hover:border-amber-500/40',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
      accent: 'text-amber-600'
    },
    rose: {
      border: 'border-slate-200 hover:border-rose-500/40',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200',
      accent: 'text-rose-600'
    },
    purple: {
      border: 'border-slate-200 hover:border-purple-500/40',
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-200',
      accent: 'text-purple-600'
    }
  };

  const scheme = colorMap[colorScheme] || colorMap.emerald;

  return (
    <div
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-white p-3 sm:p-5 border ${scheme.border} group transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3 relative z-10">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block truncate leading-tight">
            {title}
          </span>
          <div className="mt-1 sm:mt-1.5 text-lg sm:text-2xl font-black font-heading text-slate-900 tracking-tight truncate flex items-baseline gap-1">
            {value}
          </div>
        </div>
        <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${scheme.iconBg} shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {(change || subtext) && (
        <div className="mt-2 sm:mt-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 sm:gap-1.5 text-xs pt-2 sm:pt-2.5 border-t border-slate-100 relative z-10">
          {change && (
            <span
              className={`inline-flex items-center font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg shrink-0 text-[10px] sm:text-[11px] ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1 inline shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1 inline shrink-0" />
              )}
              <span>{change}</span>
            </span>
          )}
          {subtext && <span className="text-slate-500 font-medium truncate text-[10px] sm:text-[11px]">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
