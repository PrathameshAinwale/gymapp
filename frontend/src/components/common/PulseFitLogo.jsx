import React from 'react';
import archFitLogoImg from '../../assets/archfit-logo.png';

/**
 * ArchFitLogo / PulseFitLogo Component
 * Official ArchFit logo branding featuring sleek ARCH wordmark and glowing neon-green FIT barbell.
 *
 * Variants:
 * - 'horizontal': Compact horizontal banner layout for Navbar and Sidebar
 * - 'full': Centered hero layout for Login & Landing screens with neon glow & taglines
 * - 'icon': Compact emblem badge
 */
export const ArchFitLogo = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = false,
  theme = 'light', // 'light' | 'dark'
  animate = false,
  onClick
}) => {
  const sizeMap = {
    xs: { h: 'h-6', maxW: 'max-w-[100px]', heroH: 'h-10', heroW: 'w-28' },
    sm: { h: 'h-7', maxW: 'max-w-[125px]', heroH: 'h-12', heroW: 'w-36' },
    md: { h: 'h-8 sm:h-9', maxW: 'max-w-[155px]', heroH: 'h-16', heroW: 'w-48' },
    lg: { h: 'h-10 sm:h-12', maxW: 'max-w-[190px]', heroH: 'h-20', heroW: 'w-60' },
    xl: { h: 'h-14 sm:h-16', maxW: 'max-w-[240px]', heroH: 'h-24', heroW: 'w-72' }
  };

  const currentSize = typeof size === 'string' ? (sizeMap[size] || sizeMap.md) : sizeMap.md;
  const isDark = theme === 'dark';

  // Variant 1: ICON ONLY / BADGE
  if (variant === 'icon') {
    return (
      <div
        className={`relative inline-flex items-center justify-center p-1.5 rounded-xl bg-black border border-lime-500/40 shadow-sm shadow-lime-950/30 overflow-hidden select-none cursor-pointer ${animate ? 'hover:scale-105 transition-transform duration-200' : ''} ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        <img
          src={archFitLogoImg}
          alt="ArchFit Logo"
          className="h-7 w-auto object-contain"
          loading="eager"
        />
      </div>
    );
  }

  // Variant 2: FULL HERO BRANDING (Hero Emblem + Glowing Effect + ARCHFIT Wordmark + Tagline)
  if (variant === 'full') {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center select-none ${className}`}
        onClick={onClick}
      >
        {/* Glowing Logo Card */}
        <div className="relative mb-2 flex items-center justify-center">
          <div className="absolute -inset-3 bg-lime-500/25 rounded-2xl blur-xl pointer-events-none" />
          <div className="relative p-2.5 rounded-2xl bg-black border border-lime-500/40 shadow-xl shadow-lime-950/40">
            <img
              src={archFitLogoImg}
              alt="ArchFit Logo"
              className="h-20 sm:h-24 w-20 sm:w-24 object-contain drop-shadow-[0_0_12px_rgba(132,204,22,0.4)]"
              loading="eager"
            />
          </div>
        </div>

        {/* Brand Wordmark */}
        <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1">
          ARCH<span className="text-lime-500">FIT</span>
        </div>

        {/* Tagline 1 */}
        <div className={`flex items-center gap-2 mt-1 text-[10px] sm:text-[11px] font-black tracking-[0.22em] uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <span>MANAGE</span>
          <span className="text-lime-500 font-black">|</span>
          <span>MOTIVATE</span>
          <span className="text-lime-500 font-black">|</span>
          <span>GROW</span>
        </div>

        {/* Tagline 2 */}
        <div className="mt-1 text-[9px] sm:text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
          Gym Management App &amp; Website
        </div>
      </div>
    );
  }

  // Variant 3: HORIZONTAL (Navbar & Sidebar layout)
  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none min-w-0 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className={`relative p-1 rounded-xl bg-black border border-lime-500/35 shadow-xs shadow-lime-950/20 flex items-center justify-center shrink-0 ${animate ? 'hover:scale-102 transition-transform duration-200' : ''}`}>
        <img
          src={archFitLogoImg}
          alt="ArchFit"
          className={`${currentSize.h} w-auto object-contain`}
          loading="eager"
        />
      </div>

      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center text-sm sm:text-base font-black tracking-tight text-slate-900">
          <span>ARCH</span><span className="text-lime-500">FIT</span>
        </div>
      </div>

      {showTagline && (
        <span className="text-[9px] font-black tracking-widest text-lime-600 uppercase truncate hidden sm:inline ml-2 pl-2 border-l border-slate-200">
          MANAGE • MOTIVATE • GROW
        </span>
      )}
    </div>
  );
};

// Aliased for seamless backwards-compatibility across the app
export const PulseFitLogo = ArchFitLogo;
export default ArchFitLogo;
