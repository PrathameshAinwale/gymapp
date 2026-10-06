import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  LogOut,
  ShieldCheck,
  Award,
  UserCheck,
  Flame,
  Menu,
  Building2,
  ChevronDown,
  Check
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export const Navbar = ({ activeTab, setActiveTab, onToggleMobileMenu }) => {
  const { currentRole, currentUser, logout } = useAuth();
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef(null);

  let gymInfo = null;
  let branches = [];
  let switchBranch = null;
  try {
    const gymContext = useGymData();
    gymInfo = gymContext?.gymInfo;
    branches = gymContext?.branches || [];
    switchBranch = gymContext?.switchBranch;
  } catch (err) {
    gymInfo = null;
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const gymName = gymInfo?.name || currentUser?.gymName || currentUser?.gym_name || '';
  const gymLogo = gymInfo?.logo || '';

  const getRoleBadge = () => {
    if (currentRole === 'owner') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 whitespace-nowrap shadow-xs">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Owner
        </span>
      );
    }
    if (currentRole === 'superadmin') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 whitespace-nowrap shadow-xs">
          <ShieldCheck className="w-3 h-3 text-purple-600" /> Superadmin
        </span>
      );
    }
    if (currentRole === 'accounts') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 whitespace-nowrap shadow-xs">
          <ShieldCheck className="w-3 h-3 text-amber-600" /> Accounts
        </span>
      );
    }
    if (currentRole === 'manager') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 whitespace-nowrap shadow-xs">
          <ShieldCheck className="w-3 h-3 text-indigo-600" /> Manager
        </span>
      );
    }
    if (currentRole === 'trainer') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1 whitespace-nowrap shadow-xs">
          <Award className="w-3 h-3 text-teal-600" /> Coach
        </span>
      );
    }
    if (currentRole === 'member') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1 whitespace-nowrap shadow-xs">
          <Flame className="w-3 h-3 text-cyan-600" /> Athlete
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 whitespace-nowrap shadow-xs">
        <UserCheck className="w-3 h-3 text-slate-600" /> Staff
      </span>
    );
  };


  return (
    <header className="sticky top-0 z-40 w-full glass-header safe-top shrink-0">
      <div className="flex items-center justify-between gap-2 w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        
        {/* Left: Hamburger + Gym Brand */}
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

          {/* Gym Brand Logo & Identity */}
          <div 
            className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none group"
            onClick={() => setActiveTab && setActiveTab('dashboard')}
            title="Go to Dashboard"
          >
            {/* Custom Gym Logo or Initial Emblem */}
            {gymLogo ? (
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0 group-hover:border-emerald-400 transition-colors">
                <img
                  src={gymLogo}
                  alt={gymName || 'Gym Logo'}
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center bg-emerald-600 text-white font-black text-xs">
                  {(gymName || 'A').charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-xs border border-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform">
                {(gymName || 'A').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Gym Name & 'powered by ARCHFIT' */}
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[260px] md:max-w-[340px] leading-tight">
                  {gymName || 'ARCHFIT CLUB'}
                </span>
                <div className="shrink-0 hidden xs:inline-flex items-center gap-1.5">
                  {getRoleBadge()}
                </div>
              </div>

              <div className="flex items-center gap-1 text-[9px] sm:text-[8px] text-slate-400 font-semibold tracking-wider uppercase leading-none mt-0.5">
                <span>powered by</span>
                <span className="font-black text-slate-800 tracking-tight">
                  ARCH<span className="text-lime-500">FIT</span>
                </span>
              </div>
            </div>

            {/* On ultra small screens (< xs), badge placed inline */}
            <div className="shrink-0 xs:hidden flex items-center gap-1">
              {getRoleBadge()}
            </div>
          </div>
        </div>

        {/* Right: Profile + Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Multi-Gym Platinum Branch Switcher */}
          {currentRole === 'owner' && branches && branches.length > 1 && (
            <div className="relative" ref={branchDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs"
                title="Switch Gym Facility"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline max-w-[120px] truncate">{gymName}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black">
                  {branches.length} Gyms
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isBranchDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                      Switch Facility Workspace
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      Platinum Multi-Gym Account
                    </div>
                  </div>

                  <div className="py-1 max-h-64 overflow-y-auto">
                    {branches.map((b) => {
                      const isCurrent = b.is_active || (b.id === gymInfo?.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={async () => {
                            setIsBranchDropdownOpen(false);
                            if (!isCurrent && switchBranch) {
                              await switchBranch(b.id);
                            }
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors cursor-pointer ${
                            isCurrent ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {b.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {b.member_count || 0} Members • {b.city || 'Active'}
                            </div>
                          </div>
                          {isCurrent && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBranchDropdownOpen(false);
                        setActiveTab?.('settings');
                      }}
                      className="w-full py-1 text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      Manage Facilities in Settings →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
