import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { isTabAllowedForGym } from '../superadmin/packagePlans';
import { PulseFitLogo } from './PulseFitLogo';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  IndianRupee,
  Wrench,
  Settings,
  Dumbbell,
  Utensils,
  Activity,
  ShieldCheck,
  User,
  PhoneCall,
  ShoppingBag,
  TrendingUp,
  FileText,
  PauseCircle,
  Wallet,
  CalendarCheck,
  X,
  Flame,
  UserCheck,
  UserPlus,
  BarChart3,
  Coins,
  CalendarDays,
  Plus,
  Minus,
  Sparkles,
  Star,
  MessageSquare,
  Clock,
  HelpCircle,
  Shield,
  LifeBuoy
} from 'lucide-react';

export const getNavSectionsForSuperadmin = () => [
  {
    id: 'operations',
    title: 'Operations & Schedule',
    icon: Activity,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'members', label: 'Member Directory', icon: Users },
      { id: 'classes', label: 'Classes & Batches', icon: Calendar },
      { id: 'pt-sessions', label: 'PT Sessions Tracker', icon: Dumbbell },
      { id: 'enquiries', label: 'Enquiries & Leads', icon: PhoneCall },
      { id: 'attendance', label: 'Attendance Tracker', icon: CalendarCheck },
      { id: 'whatsapp-automation', label: 'WhatsApp & Templates', icon: MessageSquare },
    ]
  },
  {
    id: 'memberships',
    title: 'Memberships & Compliance',
    icon: ShieldCheck,
    items: [
      { id: 'plans', label: 'Membership Plans', icon: CreditCard },
      { id: 'membership-freeze', label: 'Freeze & Extensions', icon: PauseCircle }
    ]
  },
  {
    id: 'staff',
    title: 'Staff & Payroll',
    icon: UserCheck,
    items: [
      { id: 'staff-accounts', label: 'Create Account / Staff', icon: UserPlus },
      { id: 'shifts', label: 'Shift Timings & Slots', icon: Clock },
      { id: 'leaves', label: 'Leave Management', icon: CalendarDays },
      { id: 'advance-pay', label: 'Advance Pay Requests', icon: Coins },
      { id: 'payroll', label: 'Employee Payroll', icon: Wallet },
      { id: 'commissions', label: 'Trainer Commissions', icon: TrendingUp }
    ]
  },
  {
    id: 'finance',
    title: 'Finance & Analytics',
    icon: TrendingUp,
    items: [
      { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
      { id: 'reports', label: 'Export Reports', icon: FileText },
      { id: 'financials', label: 'Revenue & Billing', icon: IndianRupee },
      { id: 'invoices', label: 'Member Invoices', icon: CreditCard }
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory & Setup',
    icon: Settings,
    items: [
      { id: 'products', label: 'Pro Shop & Store', icon: ShoppingBag },
      { id: 'equipment', label: 'Equipment & Assets', icon: Wrench },
      { id: 'settings', label: 'Gym Settings', icon: Settings }
    ]
  },
  {
    id: 'about',
    title: 'About & Support',
    icon: HelpCircle,
    items: [
      { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
      { id: 'terms-conditions', label: 'Terms & Conditions', icon: FileText },
      { id: 'help-support', label: 'Help & Support', icon: LifeBuoy }
    ]
  }
];

// Accounts role has identical accessibility to superadmin with an [Accounts] badge
export const getNavSectionsForAccounts = () => getNavSectionsForSuperadmin();

// Manager role: Operational access ONLY - NO revenue, billing, expenses or financials
export const getNavSectionsForManager = () => [
  {
    id: 'operations',
    title: 'Operations',
    icon: Activity,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'whatsapp-automation', label: 'WhatsApp & Templates', icon: MessageSquare },
      { id: 'analytics', label: 'Gym Analytics', icon: BarChart3 },
      { id: 'members', label: 'Member Directory', icon: Users },
      { id: 'classes', label: 'Classes & Batches', icon: Calendar },
      { id: 'pt-sessions', label: 'PT Sessions Tracker', icon: Dumbbell },
      { id: 'enquiries', label: 'Enquiries & Leads', icon: PhoneCall },
      { id: 'attendance', label: 'Attendance Tracker', icon: CalendarCheck }
    ]
  },
  {
    id: 'memberships',
    title: 'Memberships',
    icon: ShieldCheck,
    items: [
      { id: 'plans', label: 'Membership Plans', icon: CreditCard },
      { id: 'membership-freeze', label: 'Freeze & Extensions', icon: PauseCircle }
    ]
  },
  {
    id: 'inventory',
    title: 'Store & Inventory',
    icon: ShoppingBag,
    items: [
      { id: 'products', label: 'Pro Shop & Store', icon: ShoppingBag },
      { id: 'equipment', label: 'Equipment & Assets', icon: Wrench }
    ]
  },
  {
    id: 'about',
    title: 'About & Support',
    icon: HelpCircle,
    items: [
      { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
      { id: 'terms-conditions', label: 'Terms & Conditions', icon: FileText },
      { id: 'help-support', label: 'Help & Support', icon: LifeBuoy }
    ]
  }
];

export const getNavSectionsForTrainer = () => [
  {
    id: 'training',
    title: 'Training & Clients',
    icon: Dumbbell,
    items: [
      { id: 'dashboard', label: 'Coach Dashboard', icon: LayoutDashboard },
      { id: 'sessions', label: '1-on-1 PT Sessions', icon: CalendarCheck },
      { id: 'clients', label: 'My Client Roster', icon: Users },
      { id: 'workout-builder', label: 'Workout Builder', icon: Dumbbell },
      { id: 'diet-builder', label: 'Diet & Macro Builder', icon: Utensils }
    ]
  },
  {
    id: 'earnings',
    title: 'Earnings & Advance Pay',
    icon: Coins,
    items: [
      { id: 'advance-request', label: 'Request Advance Pay', icon: Coins },
      { id: 'trainer-leaves', label: 'My Leaves', icon: CalendarDays },
      { id: 'commissions', label: 'My Commissions', icon: TrendingUp },
      { id: 'profile', label: 'Coach Profile', icon: UserCheck }
    ]
  },
  {
    id: 'about',
    title: 'About & Support',
    icon: HelpCircle,
    items: [
      { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
      { id: 'terms-conditions', label: 'Terms & Conditions', icon: FileText },
      { id: 'help-support', label: 'Help & Support', icon: LifeBuoy }
    ]
  }
];

export const getNavSectionsForMember = () => [
  {
    id: 'daily',
    title: 'Daily Training',
    icon: Flame,
    items: [
      { id: 'dashboard', label: "Today's Routine", icon: Flame },
      { id: 'workout', label: 'Workout Plan', icon: Dumbbell },
      { id: 'diet', label: 'Nutrition Chart', icon: Utensils },
      { id: 'classes', label: 'Group Classes', icon: Calendar },
      { id: 'coaches', label: 'Gym Coaches & Reviews', icon: Star }
    ]
  },
  {
    id: 'account',
    title: 'My Account',
    icon: User,
    items: [
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'invoices', label: 'Invoices', icon: CreditCard },
      { id: 'transformation', label: 'Body Progress', icon: TrendingUp }
    ]
  },
  {
    id: 'about',
    title: 'About & Support',
    icon: HelpCircle,
    items: [
      { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
      { id: 'terms-conditions', label: 'Terms & Conditions', icon: FileText },
      { id: 'help-support', label: 'Help & Support', icon: LifeBuoy }
    ]
  }
];

export const getNavSectionsForRole = (role) => {
  if (role === 'trainer') return getNavSectionsForTrainer();
  if (role === 'member') return getNavSectionsForMember();
  if (role === 'manager') return getNavSectionsForManager();
  if (role === 'accounts') return getNavSectionsForAccounts();
  return getNavSectionsForSuperadmin();
};

export const Sidebar = ({ activeTab, setActiveTab, isMobileOpen = false, setIsMobileOpen = () => { } }) => {
  const { currentUser, currentRole } = useAuth();
  const { gymInfo } = useGymData();

  const currentTier = gymInfo?.packageTier || gymInfo?.package || currentUser?.packageTier || currentUser?.package || 'Bronze';
  const customFeatures = gymInfo?.features || [];

  const rawSections = getNavSectionsForRole(currentRole);

  // Strict Plan-based Feature Filtering:
  // Items and entire sections not explicitly allowed in this gym's plan are completely omitted from the sidebar
  const sections = useMemo(() => {
    // If superadmin in standalone mode without gym scope, allow full access
    if (currentRole === 'superadmin' && !gymInfo?.id && !gymInfo?.name) {
      return rawSections;
    }

    return rawSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => isTabAllowedForGym(item.id, currentTier, customFeatures))
      }))
      .filter((sec) => sec.items.length > 0);
  }, [rawSections, currentRole, currentTier, customFeatures, gymInfo]);

  // Track open/collapsed state of each navigation section
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('pulsefit_sidebar_sections_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    // Default: find section with activeTab and open it
    return {};
  });

  // Auto-expand section that contains activeTab so the user never gets lost
  useEffect(() => {
    if (!activeTab) return;
    const activeSec = sections.find((sec) => sec.items.some((i) => i.id === activeTab));
    if (activeSec && !openSections[activeSec.title]) {
      setOpenSections((prev) => {
        const next = { ...prev, [activeSec.title]: true };
        try {
          localStorage.setItem('pulsefit_sidebar_sections_v3', JSON.stringify(next));
        } catch (e) { }
        return next;
      });
    }
  }, [activeTab, sections]);

  const toggleSection = (title) => {
    setOpenSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem('pulsefit_sidebar_sections_v3', JSON.stringify(next));
      } catch (e) { }
      return next;
    });
  };

  const getRoleAccent = () => {
    if (currentRole === 'trainer') {
      return {
        bg: 'from-teal-500 to-cyan-500',
        text: 'text-teal-600',
        activeMainBg: 'bg-teal-500/10',
        activeMainIconBg: 'bg-teal-600 text-white shadow-xs',
        activeToggle: 'text-teal-700',
        activeMainUnderline: 'bg-teal-500',
        activeSubBg: 'bg-teal-600 text-white shadow-sm font-bold',
        activeSubIcon: 'text-white',
        activeSubUnderline: 'bg-white',
        treeBorder: 'border-teal-300',
        label: 'Coach Portal'
      };
    }
    if (currentRole === 'member') {
      return {
        bg: 'from-cyan-500 to-blue-500',
        text: 'text-cyan-600',
        activeMainBg: 'bg-cyan-500/10',
        activeMainIconBg: 'bg-cyan-600 text-white shadow-xs',
        activeToggle: 'text-cyan-700',
        activeMainUnderline: 'bg-cyan-500',
        activeSubBg: 'bg-cyan-600 text-white shadow-sm font-bold',
        activeSubIcon: 'text-white',
        activeSubUnderline: 'bg-white',
        treeBorder: 'border-cyan-300',
        label: 'Athlete Zone'
      };
    }
    if (currentRole === 'manager') {
      return {
        bg: 'from-indigo-500 to-purple-500',
        text: 'text-indigo-600',
        activeMainBg: 'bg-indigo-500/10',
        activeMainIconBg: 'bg-indigo-600 text-white shadow-xs',
        activeToggle: 'text-indigo-700',
        activeMainUnderline: 'bg-indigo-500',
        activeSubBg: 'bg-indigo-600 text-white shadow-sm font-bold',
        activeSubIcon: 'text-white',
        activeSubUnderline: 'bg-white',
        treeBorder: 'border-indigo-300',
        label: 'Manager Operations'
      };
    }
    if (currentRole === 'accounts') {
      return {
        bg: 'from-amber-500 to-orange-500',
        text: 'text-amber-600',
        activeMainBg: 'bg-amber-500/10',
        activeMainIconBg: 'bg-amber-600 text-white shadow-xs',
        activeToggle: 'text-amber-700',
        activeMainUnderline: 'bg-amber-500',
        activeSubBg: 'bg-amber-600 text-white shadow-sm font-bold',
        activeSubIcon: 'text-white',
        activeSubUnderline: 'bg-white',
        treeBorder: 'border-amber-300',
        label: 'Accounts & Finance'
      };
    }
    // Default Owner / Superadmin
    return {
      bg: 'from-emerald-500 via-teal-500 to-lime-500',
      text: 'text-emerald-600',
      activeMainBg: 'bg-emerald-500/10',
      activeMainIconBg: 'bg-emerald-600 text-white shadow-xs',
      activeToggle: 'text-emerald-700',
      activeMainUnderline: 'bg-emerald-500',
      activeSubIcon: 'text-emerald-700',
      activeSubUnderline: 'bg-emerald-500',
      treeBorder: 'border-emerald-300',
    };
  };

  const accent = getRoleAccent();

  const renderNavList = (isMobile = false) => (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 pb-8 space-y-1.5 no-scrollbar">
      {sections.map((sec, idx) => {
        const isOpen = Boolean(openSections[sec.title]);
        const hasActiveItem = sec.items.some((item) => item.id === activeTab);
        const SecIcon = sec.icon || Activity;

        return (
          <div key={idx} className="space-y-1">
            {/* ══════════════════════════════════════════════════════════ */}
            {/* MAIN TAB (SECTION HEADER) — CLEAN, BOLD WITH ACCENT ICON   */}
            {/* ══════════════════════════════════════════════════════════ */}
            <button
              type="button"
              onClick={() => toggleSection(sec.title)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all duration-200 group select-none cursor-pointer relative ${
                hasActiveItem
                  ? `${accent.activeMainBg} font-black`
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                    hasActiveItem
                      ? accent.activeMainIconBg
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                  }`}
                >
                  <SecIcon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-[12.5px] uppercase tracking-wider font-heading truncate transition-colors ${
                    hasActiveItem
                      ? 'text-slate-950 font-black'
                      : 'text-slate-600 group-hover:text-slate-900 font-bold'
                  }`}
                >
                  {sec.title}
                </span>
              </div>

              <div className="shrink-0 ml-1.5">
                {isOpen ? (
                  <Minus
                    className={`w-3.5 h-3.5 transition-colors ${
                      hasActiveItem ? accent.activeToggle : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                ) : (
                  <Plus
                    className={`w-3.5 h-3.5 transition-colors ${
                      hasActiveItem ? accent.activeToggle : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                )}
              </div>

              {/* Crisp Underline below Active Main Tab */}
              {hasActiveItem && (
                <span className={`absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full ${accent.activeMainUnderline}`} />
              )}
            </button>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* SUBSECTIONS — INDENTED WITH DELICATE GUIDE LINE            */}
            {/* ══════════════════════════════════════════════════════════ */}
            {isOpen && (
              <div className={`ml-5 pl-3.5 my-1 space-y-1 relative border-l-2 ${hasActiveItem ? accent.treeBorder : 'border-slate-200'} transition-all duration-200 animate-fadeIn`}>
                {sec.items.map((item) => {
                  const isSubActive = activeTab === item.id;
                  const SubIcon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (isMobile) setIsMobileOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] transition-all duration-150 group cursor-pointer relative ${
                        isSubActive
                          ? `${accent.activeSubBg}`
                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SubIcon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isSubActive ? accent.activeSubIcon : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="truncate tracking-tight">{item.label}</span>
                      </div>

                      {/* Clean tasteful underline on active item */}
                      {isSubActive && (
                        <span className={`absolute bottom-0.5 left-7 right-3 h-[2px] rounded-full ${accent.activeSubUnderline}`} />
                      )}

                      {item.badge && (
                        <span
                          className={`shrink-0 ml-auto px-1.5 py-0.2 text-[9px] font-bold rounded-md ${
                            isSubActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200/70 text-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#f8f9fa] border-r border-slate-200/80 h-full min-h-0 shrink-0 select-none shadow-[1px_0_6px_rgba(0,0,0,0.02)]">
        {renderNavList(false)}

        {/* Bottom Profile / Quick Info Footer */}
        
      </aside>

      {/* 2. Mobile Slide-Out Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="drawer-overlay"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu backdrop"
          />

          {/* Drawer */}
          <div className="drawer-panel border-r border-slate-200">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 safe-top shrink-0">
              <div className="flex items-center gap-2">
                <PulseFitLogo variant="horizontal" size="sm" />
                <div className={`text-[10px] font-bold ${accent.text} uppercase tracking-wide ml-1`}>
                  {accent.label}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation */}
            {renderNavList(true)}
          </div>
        </div>
      )}
    </>
  );
};
