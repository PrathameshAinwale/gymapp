import React from 'react';

/**
 * PageHeader
 * 
 * Consistent mobile-first page header:
 * - Desktop: Title, subtitle, and inline action buttons.
 * - Mobile: One-line title, subtitle hidden, actions collapse cleanly.
 */
export const PageHeader = ({
  title,
  subtitle = null,
  actions = null,
  badge = null,
  className = ''
}) => {
  return (
    <div className={`bg-white border border-slate-200 p-3 sm:px-4 sm:py-3 rounded-2xl shadow-xs ${className}`}>
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {badge && (
            <div className="shrink-0">
              {badge}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
