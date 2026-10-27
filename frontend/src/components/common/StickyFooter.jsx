import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * StickyFooter
 * 
 * Sticky action footer for mobile forms (Add Member, Create Invoice, etc.):
 * - Pinned to bottom on mobile (< 640px) with safe-area padding.
 * - Always within thumb reach.
 * - Can be placed at the bottom of long scrollable pages.
 */
export const StickyFooter = ({
  primaryAction,
  secondaryAction = null,
  info = null,
  className = ''
}) => {
  if (!primaryAction) return null;

  const PrimaryIcon = primaryAction.icon;
  const SecIcon = secondaryAction?.icon;

  return (
    <div
      className={`fixed sm:static bottom-0 left-0 right-0 z-30 p-3 sm:p-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200/90 sm:border-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:shadow-none pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0 ${className}`}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {info && (
          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
            {info}
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className="flex-1 sm:flex-initial h-12 min-h-[48px] sm:h-auto sm:min-h-0 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              {SecIcon && <SecIcon className="w-4 h-4" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          <button
            type={primaryAction.type || 'submit'}
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
            className="flex-1 sm:flex-initial h-12 min-h-[48px] sm:h-auto sm:min-h-0 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 active:to-teal-700 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {primaryAction.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              PrimaryIcon && <PrimaryIcon className="w-4 h-4 stroke-[2.3]" />
            )}
            <span>{primaryAction.label}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickyFooter;
