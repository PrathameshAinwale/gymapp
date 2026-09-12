import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PulseFitLogo } from './PulseFitLogo';
import {
  LogOut,
  Sparkles,
  ShieldCheck,
  Award,
  UserCheck,
  Flame,
  Menu
} from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onToggleMobileMenu }) => {
  const { currentRole, currentUser, logout } = useAuth();

  const getRoleBadge = () => {
    if (currentRole === 'trainer') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1 whitespace-nowrap">
          <Award className="w-3 h-3 text-teal-600" /> Coach
        </span>
      );
    }
    if (currentRole === 'member') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1 whitespace-nowrap">
          <Flame className="w-3 h-3 text-cyan-600" /> Athlete
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
        <ShieldCheck className="w-3 h-3" /> Admin
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-header safe-top shrink-0">
      <div className="flex items-center justify-between gap-2 w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        
        {/* Left: Hamburger + Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden w-9 h-9 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
            title="Open Navigation Menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>

          {/* Brand Logo */}
          <div 
            className="flex items-center gap-2 min-w-0 cursor-pointer select-none"
            onClick={() => setActiveTab && setActiveTab('dashboard')}
          >
            <PulseFitLogo variant="horizontal" size="sm" theme="light" />
            <div className="shrink-0 ml-0.5 sm:ml-1.5">
              {getRoleBadge()}
            </div>
          </div>
        </div>

        {/* Right: Profile + Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* User Profile Pill */}
          <button
            type="button"
            onClick={() => {
              if (setActiveTab) {
                if (currentRole === 'owner') setActiveTab('settings');
                else setActiveTab('profile');
              }
            }}
            title="View Profile"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500/50 transition-all active:scale-95 cursor-pointer shadow-sm group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-[11px] shadow-md group-hover:scale-105 transition-transform shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[11px] font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors truncate max-w-[100px]">
                {currentUser?.name}
              </div>
              <div className="text-[10px] font-semibold text-emerald-600 capitalize leading-tight">
                {currentUser?.roleLabel || currentUser?.role}
              </div>
            </div>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="w-9 h-9 sm:h-auto sm:w-auto sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
