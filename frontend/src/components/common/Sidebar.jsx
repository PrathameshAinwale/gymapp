import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PulseFitLogo } from './PulseFitLogo';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  ClipboardCheck,
  IndianRupee,
  Wrench,
  Settings,
  Dumbbell,
  Utensils,
  Award,
  Sparkles,
  Zap,
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
  LogOut,
  Flame,
  UserCheck
} from 'lucide-react';

export const getNavSectionsForOwner = () => [
  {
    title: 'Operations',
    items: [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
      { id: 'members', label: 'Member Directory', icon: Users },
      { id: 'enquiries', label: 'Enquiries & Leads', icon: PhoneCall },
      { id: 'attendance', label: 'Attendance Tracker', icon: CalendarCheck }
    ]
  },
  {
    title: 'Memberships & Compliance',
    items: [
      { id: 'plans', label: 'Membership Plans', icon: CreditCard },
      { id: 'membership-freeze', label: 'Freeze & Extensions', icon: PauseCircle }
    ]
  },
  {
    title: 'Staff & Payroll',
    items: [
      { id: 'trainers', label: 'Coach Roster', icon: Award },
      { id: 'commissions', label: 'Trainer Commissions', icon: TrendingUp },
      { id: 'payroll', label: 'Employee Payroll', icon: Wallet }
    ]
  },
  {
    title: 'Commerce & Inventory',
    items: [
      { id: 'products', label: 'Pro Shop & Store', icon: ShoppingBag },
      { id: 'equipment', label: 'Equipment & Assets', icon: Wrench }
    ]
  },
  {
    title: 'Finance & System',
    items: [
      { id: 'financials', label: 'Revenue & Billing', icon: IndianRupee },
      { id: 'invoices', label: 'Member Invoices', icon: FileText },
      { id: 'settings', label: 'Gym Settings', icon: Settings }
    ]
  }
];

export const getNavSectionsForTrainer = () => [
  {
    title: 'Training & Clients',
    items: [
      { id: 'dashboard', label: 'Coach Dashboard', icon: LayoutDashboard },
      { id: 'clients', label: 'My Client Roster', icon: Users },
      { id: 'workout-builder', label: 'Workout Builder', icon: Dumbbell },
      { id: 'diet-builder', label: 'Diet & Macro Builder', icon: Utensils },
      { id: 'progress-logger', label: 'Progress Logger', icon: Activity }
    ]
  },
  {
    title: 'Earnings & Account',
    items: [
      { id: 'commissions', label: 'My Commissions', icon: TrendingUp },
      { id: 'profile', label: 'Coach Profile', icon: UserCheck }
    ]
  }
];

export const getNavSectionsForMember = () => [
  {
    title: 'Daily Training',
    items: [
      { id: 'dashboard', label: 'Today\'s Routine', icon: Flame },
      { id: 'workout', label: 'Workout Plan', icon: Dumbbell },
      { id: 'diet', label: 'Nutrition Chart', icon: Utensils },
      { id: 'classes', label: 'Group Classes', icon: Calendar }
    ]
  },
  {
    title: 'My Account',
    items: [
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'invoices', label: 'Invoices', icon: CreditCard },
      { id: 'transformation', label: 'Body Progress', icon: TrendingUp }
    ]
  }
];

export const getNavSectionsForRole = (role) => {
  if (role === 'trainer') return getNavSectionsForTrainer();
  if (role === 'member') return getNavSectionsForMember();
  return getNavSectionsForOwner();
};

export const Sidebar = ({ activeTab, setActiveTab, isMobileOpen = false, setIsMobileOpen = () => {} }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const sections = getNavSectionsForRole(currentRole);

  const getRoleAccent = () => {
    if (currentRole === 'trainer') return { bg: 'from-teal-500 to-cyan-500', text: 'text-teal-600', label: 'Coach Portal' };
    if (currentRole === 'member') return { bg: 'from-cyan-500 to-blue-500', text: 'text-cyan-600', label: 'Athlete Zone' };
    return { bg: 'from-emerald-500 via-teal-500 to-lime-500', text: 'text-emerald-600', label: 'Admin Console' };
  };

  const accent = getRoleAccent();

  const NavItem = ({ item, isMobile = false }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          if (isMobile) setIsMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 rounded-xl text-[13px] font-semibold transition-all duration-150 group relative cursor-pointer active:scale-[0.98] ${
          isMobile ? 'h-12' : 'h-10'
        } ${
          isActive
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
        }`}
      >
        {isActive && (
          <span className="absolute left-0.5 top-2.5 bottom-2.5 w-1 bg-emerald-600 rounded-full"></span>
        )}

        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
            isActive
              ? 'text-emerald-600'
              : 'text-slate-400 group-hover:text-slate-700'
          }`}
        />
        <span className="truncate whitespace-nowrap">{item.label}</span>

        {item.badge && (
          <span
            className={`shrink-0 ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
              isActive
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderNavList = (isMobile = false) => (
    <div 
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 py-3 pb-8 space-y-3 no-scrollbar"
    >
      {sections.map((sec, idx) => (
        <div key={idx} className="space-y-0.5">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 px-3 pt-2 pb-1 uppercase select-none">
            {sec.title}
          </div>
          <div className="space-y-0.5">
            {sec.items.map((item) => (
              <NavItem key={item.id} item={item} isMobile={isMobile} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-60 bg-white border-r border-slate-200 h-full min-h-0 shrink-0 select-none">
        {renderNavList(false)}
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
              <div className="flex items-center gap-2.5">
                <PulseFitLogo variant="icon" size={36} />
                <div>
                  <div className="font-heading font-black tracking-tight text-sm text-slate-900 leading-tight">
                    PULSE<span className="text-emerald-600">FIT</span>
                  </div>
                  <div className={`text-[10px] font-bold ${accent.text} uppercase tracking-wide`}>
                    {accent.label}
                  </div>
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