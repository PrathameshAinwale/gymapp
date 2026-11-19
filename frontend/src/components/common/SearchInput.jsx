import React, { forwardRef, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchInput
 * 
 * App-wide standard search bar:
 * - Height 40px (h-10) on mobile & desktop
 * - Rounded-xl, white background, slate-200 border, emerald focus ring
 * - Text: text-sm font-medium text-slate-900
 * - Placeholder: text-sm font-normal text-slate-400
 * - 16px search icon at left-3, pl-9
 * - Uniform clear (X) button at right-1.5
 * - Auto-compact mobile placeholder when `mobilePlaceholder` is provided
 * - Supports `containerRef` and `children` for attached autocomplete dropdowns
 */
export const SearchInput = forwardRef(function SearchInput({
  value = '',
  onChange,
  onClear,
  onFocus,
  onBlur,
  placeholder = 'Search...',
  mobilePlaceholder,
  className = '',
  containerClassName = '',
  containerRef,
  id,
  name,
  disabled = false,
  autoFocus = false,
  autoComplete = 'off',
  children,
  showClear = true,
  ...rest
}, ref) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!mobilePlaceholder) return;
    try {
      const mql = window.matchMedia('(max-width: 640px)');
      const update = (e) => setIsMobile(e.matches);
      setIsMobile(mql.matches);
      if (mql.addEventListener) {
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
      } else if (mql.addListener) {
        mql.addListener(update);
        return () => mql.removeListener(update);
      }
    } catch {
      // fallback if matchMedia is unavailable
    }
  }, [mobilePlaceholder]);

  const activePlaceholder = (isMobile && mobilePlaceholder) ? mobilePlaceholder : placeholder;

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '', name: name || id || '' } });
    }
  };

  const hasValue = Boolean(value && String(value).length > 0);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${containerClassName}`}
    >
      <div className="relative w-full flex items-center">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={activePlaceholder}
          className={`w-full h-10 pl-9 ${hasValue && showClear ? 'pr-9' : 'pr-3'} bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''} ${className}`}
          {...rest}
        />
        {hasValue && showClear && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
});

export default SearchInput;
