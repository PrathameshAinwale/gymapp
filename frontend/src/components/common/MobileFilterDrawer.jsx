import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Filter, RotateCcw } from 'lucide-react';

/**
 * MobileFilterDrawer
 * 
 * Bottom sheet filter modal for mobile devices (< 640px)
 * Replaces wide filter button strips that overflow horizontally on mobile.
 */
export const MobileFilterDrawer = ({
  isOpen,
  onClose,
  title = 'Filter Records',
  activeCount = 0,
  onApply = null,
  onReset = null,
  children
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fadeIn"
      />

      {/* Sheet Container: Bottom sheet on mobile, centered modal on desktop */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 max-h-[85vh] sm:max-h-[80vh] animate-slideUp sm:animate-scaleUp pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">{title}</h3>
              {activeCount > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {activeCount} filter{activeCount === 1 ? '' : 's'} active
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center active:scale-95"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Body Controls */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Sticky Actions Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          {onReset && (
            <button
              type="button"
              onClick={() => {
                onReset?.();
                onClose?.();
              }}
              className="h-12 min-h-[48px] px-4 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onApply?.();
              onClose?.();
            }}
            className="flex-1 h-12 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileFilterDrawer;
