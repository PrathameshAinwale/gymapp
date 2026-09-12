import React from 'react';
import pulseFitIconImg from '../../assets/pulsefit-icon.png';

/**
 * PulseFitLogo Component
 * Uses the official PulseFit logo mark with clean, balanced typography and proportional sizing.
 * 
 * Variants:
 * - 'horizontal': Compact layout (Icon badge + "PULSEFIT" text) for Navbar and Sidebar
 * - 'full': Centered hero layout (Icon badge + "PULSEFIT" title + subtitle) for Login & Landing screens
 * - 'icon': Standalone icon badge
 */
export const PulseFitLogo = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = false,
  theme = 'light', // 'light' | 'dark'
  animate = false,
  onClick
}) => {
  // Size presets
  const sizeMap = {
    xs: { badge: 28, text: 'text-sm', title: 'text-lg', sub: 'text-[9px]' },
    sm: { badge: 34, text: 'text-base sm:text-lg', title: 'text-xl sm:text-2xl', sub: 'text-[10px]' },
    md: { badge: 42, text: 'text-lg sm:text-xl', title: 'text-2xl sm:text-3xl', sub: 'text-xs' },
    lg: { badge: 60, text: 'text-2xl sm:text-3xl', title: 'text-3xl sm:text-4xl', sub: 'text-xs sm:text-sm' },
    xl: { badge: 76, text: 'text-3xl sm:text-4xl', title: 'text-4xl sm:text-5xl', sub: 'text-sm' }
  };

  const currentSize = typeof size === 'string' ? (sizeMap[size] || sizeMap.md) : { badge: size, text: 'text-lg', title: 'text-2xl', sub: 'text-xs' };
  const isDark = theme === 'dark';

  // Standalone Icon using the exact user-uploaded mark
  const IconElement = ({ dimension = currentSize.badge }) => (
    <div 
      className={`relative shrink-0 flex items-center justify-center rounded-2xl bg-[#050811] border border-emerald-500/30 overflow-hidden shadow-md shadow-emerald-950/20 select-none ${animate ? 'hover:scale-105 transition-transform duration-200' : ''}`}
      style={{ width: dimension, height: dimension }}
    >
      <img
        src={pulseFitIconImg}
        alt="PulseFit Icon"
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  );

  // Variant 1: ICON ONLY
  if (variant === 'icon') {
    return (
      <div 
        className={`inline-flex items-center justify-center ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        <IconElement />
      </div>
    );
  }

  // Variant 2: FULL HERO BRANDING (Icon + Wordmark + Tagline)
  if (variant === 'full') {
    return (
      <div 
        className={`flex flex-col items-center justify-center text-center select-none ${className}`}
        onClick={onClick}
      >
        {/* Glowing Compact Icon */}
        <div className="relative mb-2 flex items-center justify-center">
          <div className="absolute -inset-3 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />
          <IconElement dimension={currentSize.badge || 56} />
        </div>

        {/* Wordmark */}
        <div className="flex items-center tracking-tight font-black font-heading mt-0.5">
          <span className={`tracking-widest ${currentSize.title} font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            PULSE
          </span>
          <span className={`tracking-widest ${currentSize.title} font-black ml-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-400`}>
            FIT
          </span>
        </div>

        {/* Tagline 1 */}
        <div className={`flex items-center gap-2 mt-1 text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          <span>MANAGE</span>
          <span className="text-emerald-500 font-black">|</span>
          <span>MOTIVATE</span>
          <span className="text-emerald-500 font-black">|</span>
          <span>GROW</span>
        </div>

        {/* Tagline 2 */}
        <div className="mt-0.5 text-[8px] sm:text-[9px] font-bold tracking-[0.18em] text-slate-400 uppercase">
          Gym Management App &amp; Website
        </div>
      </div>
    );
  }

  // Variant 3: HORIZONTAL (Standard Navbar / Sidebar header with exact icon badge + text)
  return (
    <div 
      className={`flex items-center gap-2.5 select-none min-w-0 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <IconElement dimension={currentSize.badge} />

      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center leading-none">
          <span className={`font-heading font-black tracking-tight ${currentSize.text} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            PULSE
          </span>
          <span className={`font-heading font-black tracking-tight ${currentSize.text} ml-0.5 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500`}>
            FIT
          </span>
        </div>

        {showTagline && (
          <span className="text-[9px] font-extrabold tracking-widest text-emerald-600 uppercase mt-0.5 truncate">
            MANAGE • MOTIVATE • GROW
          </span>
        )}
      </div>
    </div>
  );
};
