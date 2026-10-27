import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * MobileCard
 * 
 * Standard mobile card representation for data table rows:
 * - Shows primary identity, status badge, key metrics in a 2-column grid.
 * - Supports expandable secondary details and touch-friendly action buttons.
 */
export const MobileCard = ({
  title,
  subtitle = null,
  badge = null,
  avatar = null,
  fields = [],
  expandedContent = null,
  actions = null,
  onClick = null,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5 transition-all ${
        onClick ? 'cursor-pointer active:scale-[0.99] hover:border-slate-300' : ''
      } ${className}`}
    >
      {/* Header Row: Avatar + Title/Subtitle + Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {avatar && <div className="shrink-0">{avatar}</div>}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900 text-xs truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Key Fields Grid (2 columns on mobile) */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
          {fields.map((f, i) => (
            <div key={i} className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                {f.label}
              </span>
              <div className="font-semibold text-slate-800 truncate mt-0.5 flex items-center gap-1">
                {f.icon && <span className="shrink-0">{f.icon}</span>}
                <span className="truncate">{f.value ?? '--'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expandable Section */}
      {expandedContent && (
        <>
          {isExpanded && (
            <div className="pt-1 border-t border-slate-100 space-y-2 animate-fadeIn">
              {expandedContent}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full pt-0.5 text-center text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            <span>{isExpanded ? 'Less details' : 'More details'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </>
      )}

      {/* Bottom Action Buttons (44px touch targets) */}
      {actions && (
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};

export default MobileCard;
