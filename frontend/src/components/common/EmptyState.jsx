import React from 'react';
import { Plus } from 'lucide-react';

/**
 * Reusable EmptyState Component
 * Displays a clean, modern empty state card with an icon, informative message,
 * and a direct action button to create/add records.
 */
export const EmptyState = ({
  icon: Icon,
  title = 'No Data Available',
  description = 'There are currently no records for this page. Click the button below to add your first entry.',
  actionText = 'Add New Record',
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
  accentColor = 'emerald' // 'emerald' | 'indigo' | 'purple' | 'amber' | 'blue' | 'rose' | 'cyan'
}) => {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      btn: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      btn: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      btn: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
    },
    cyan: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      text: 'text-cyan-700',
      btn: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20'
    }
  }[accentColor] || {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
  };

  return (
    <div
      className={`w-full p-8 sm:p-12 text-center rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 bg-white/90 shadow-xs flex flex-col items-center justify-center animate-fadeIn ${className}`}
    >
      {/* Icon Badge */}
      {Icon && (
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${colorStyles.bg} ${colorStyles.text} border ${colorStyles.border} flex items-center justify-center mb-3.5 sm:mb-4 shadow-xs`}
        >
          <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
      )}

      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-1.5">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 sm:mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {onAction && actionText && (
          <button
            type="button"
            onClick={onAction}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${colorStyles.btn} text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span>{actionText}</span>
          </button>
        )}

        {onSecondaryAction && secondaryActionText && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </div>
  );
};
