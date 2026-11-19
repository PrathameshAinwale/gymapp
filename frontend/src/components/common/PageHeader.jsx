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
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <h1 className="app-page-title font-bold text-slate-900 tracking-normal truncate" title={typeof title === 'string' ? title : undefined}>
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
        <p className="text-2xs text-slate-500 hidden sm:block mt-0.5 max-w-[70ch] truncate" title={typeof subtitle === 'string' ? subtitle : undefined}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
