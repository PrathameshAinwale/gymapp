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

  // Variant 2: FULL HERO BRANDING (Hero Banner + Glowing Effect + Tagline)
  if (variant === 'full') {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center select-none ${className}`}
        onClick={onClick}
      >
        {/* Glowing Logo Banner */}
        <div className="relative mb-3 flex items-center justify-center">
          <div className="absolute -inset-4 bg-lime-500/20 rounded-2xl blur-xl pointer-events-none" />
          <div className="relative px-4 py-2 rounded-2xl bg-black border border-lime-500/40 shadow-xl shadow-lime-950/40">
            <img
              src={archFitLogoImg}
              alt="ArchFit"
              className={`${currentSize.heroH} w-auto object-contain drop-shadow-[0_0_12px_rgba(132,204,22,0.4)]`}
              loading="eager"
            />
          </div>
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
      className={`inline-flex items-center gap-2 select-none min-w-0 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className={`relative px-2.5 py-1 rounded-xl bg-black border border-lime-500/35 shadow-xs shadow-lime-950/20 flex items-center shrink-0 ${animate ? 'hover:scale-102 transition-transform duration-200' : ''}`}>
        <img
          src={archFitLogoImg}
          alt="ArchFit"
          className={`${currentSize.h} w-auto object-contain`}
          loading="eager"
        />
      </div>

      {showTagline && (
        <span className="text-[9px] font-black tracking-widest text-lime-600 uppercase truncate hidden sm:inline">
          MANAGE • MOTIVATE • GROW
        </span>
      )}
    </div>
  );
};

// Aliased for seamless backwards-compatibility across the app
export const PulseFitLogo = ArchFitLogo;
export default ArchFitLogo;
