import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ActionBar
 * 
 * Consistent mobile-first action buttons:
 * - Mobile (< 640px): Full-width primary button (48px height) with secondary actions
 *   in a 2-column grid below it (no horizontal clipping).
 * - Desktop (>= 640px): Clean inline action row.
 */
export const ActionBar = ({
  primaryAction,
  secondaryActions = [],
  className = ''
}) => {
  if (!primaryAction && secondaryActions.length === 0) return null;

  const PrimaryIcon = primaryAction?.icon;

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop View (Inline row) */}
      <div className="hidden sm:flex items-center gap-2">
        {secondaryActions.map((sec, idx) => {
          const SecIcon = sec.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={sec.onClick}
              disabled={sec.disabled}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                sec.variant === 'danger'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {SecIcon && <SecIcon className="w-3.5 h-3.5" />}
              <span>{sec.desktopLabel || sec.label}</span>
            </button>
          );
        })}

        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {primaryAction.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              PrimaryIcon && <PrimaryIcon className="w-3.5 h-3.5" />
            )}
            <span>{primaryAction.desktopLabel || primaryAction.label}</span>
          </button>
        )}
      </div>

      {/* Mobile View (Stacked: Full-width primary + 2-col secondary grid) */}
      <div className="sm:hidden space-y-2">
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
            className="w-full h-12 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 active:to-teal-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {primaryAction.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              PrimaryIcon && <PrimaryIcon className="w-4 h-4 stroke-[2.3]" />
            )}
            <span>{primaryAction.mobileLabel || primaryAction.label}</span>
          </button>
        )}

        {secondaryActions.length > 0 && (
          <div className={`grid gap-2 ${secondaryActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {secondaryActions.map((sec, idx) => {
              const SecIcon = sec.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={sec.onClick}
                  disabled={sec.disabled}
                  className={`h-12 min-h-[48px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all shadow-2xs ${
                    sec.variant === 'danger'
                      ? 'bg-rose-50 active:bg-rose-100 text-rose-700 border-rose-200'
                      : sec.variant === 'primary-outline'
                      ? 'bg-emerald-50 active:bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-white active:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  {SecIcon && <SecIcon className="w-4 h-4" />}
                  <span className="truncate">{sec.mobileLabel || sec.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionBar;
