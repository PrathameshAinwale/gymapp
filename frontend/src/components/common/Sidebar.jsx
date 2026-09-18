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
  UserCheck,
  UserPlus,
  BarChart3,
  Coins,
  Star,
  CheckSquare
} from 'lucide-react';

export const getNavSectionsForSuperadmin = () => [
  {
    title: 'Operations & Schedule',
    items: [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
      { id: 'members', label: 'Member Directory', icon: Users },
      { id: 'classes', label: 'Classes & Batches', icon: Calendar },
      { id: 'pt-sessions', label: 'PT Sessions Tracker', icon: Dumbbell },
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
      { id: 'staff-accounts', label: 'Create Account / Staff', icon: UserPlus },
      { id: 'trainers', label: 'Coach Roster', icon: Award },
      { id: 'advance-pay', label: 'Advance Pay Requests', icon: Coins },
      { id: 'payroll', label: 'Employee Payroll', icon: Wallet },
      { id: 'commissions', label: 'Trainer Commissions', icon: TrendingUp }
    ]
  },
  {
    title: 'Finance & Analytics',
    items: [
      { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
      { id: 'reports', label: 'Export Reports', icon: FileText },
      { id: 'financials', label: 'Revenue & Billing', icon: IndianRupee },
      { id: 'invoices', label: 'Member Invoices', icon: CreditCard }
    ]
  },
  {
    title: 'Inventory & Setup',
    items: [
      { id: 'products', label: 'Pro Shop & Store', icon: ShoppingBag },
      { id: 'equipment', label: 'Equipment & Assets', icon: Wrench },
      { id: 'settings', label: 'Gym Settings', icon: Settings }
    ]
  }
];

// Accounts role has identical accessibility to superadmin with an [Accounts] badge
export const getNavSectionsForAccounts = () => getNavSectionsForSuperadmin();

// Manager role: Operational access ONLY - NO revenue, billing, expenses or financials
export const getNavSectionsForManager = () => [
  {
    title: 'Operations',
    items: [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
      { id: 'analytics', label: 'Gym Analytics', icon: BarChart3 },
      { id: 'members', label: 'Member Directory', icon: Users },
      { id: 'classes', label: 'Classes & Batches', icon: Calendar },
      { id: 'pt-sessions', label: 'PT Sessions Tracker', icon: Dumbbell },
      { id: 'enquiries', label: 'Enquiries & Leads', icon: PhoneCall },
      { id: 'attendance', label: 'Attendance Tracker', icon: CalendarCheck }
    ]
  },
  {
    title: 'Memberships',
    items: [
      { id: 'plans', label: 'Membership Plans', icon: CreditCard },
      { id: 'membership-freeze', label: 'Freeze & Extensions', icon: PauseCircle }
    ]
  },
  {
    title: 'Store & Inventory',
    items: [
      { id: 'products', label: 'Pro Shop & Store', icon: ShoppingBag },
      { id: 'equipment', label: 'Equipment & Assets', icon: Wrench }
    ]
  }
];

export const getNavSectionsForTrainer = () => [
  {
    title: 'Training & Clients',
    items: [
      { id: 'dashboard', label: 'Coach Dashboard', icon: LayoutDashboard },
      { id: 'sessions', label: '1-on-1 PT Sessions', icon: CalendarCheck },
      { id: 'clients', label: 'My Client Roster', icon: Users },
      { id: 'workout-builder', label: 'Workout Builder', icon: Dumbbell },
      { id: 'diet-builder', label: 'Diet & Macro Builder', icon: Utensils }
    ]
  },
  {
    title: 'Earnings & Advance Pay',
    items: [
      { id: 'advance-request', label: 'Request Advance Pay', icon: Coins },
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
      { id: 'classes', label: 'Group Classes', icon: Calendar },
      { id: 'coaches', label: 'Gym Coaches & Reviews', icon: Star }
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
  if (role === 'manager') return getNavSectionsForManager();
  if (role === 'accounts') return getNavSectionsForAccounts();
  return getNavSectionsForSuperadmin();
};

export const Sidebar = ({ activeTab, setActiveTab, isMobileOpen = false, setIsMobileOpen = () => {} }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const sections = getNavSectionsForRole(currentRole);

  const getRoleAccent = () => {
    if (currentRole === 'trainer') return { bg: 'from-teal-500 to-cyan-500', text: 'text-teal-600', label: 'Coach Portal' };
    if (currentRole === 'member') return { bg: 'from-cyan-500 to-blue-500', text: 'text-cyan-600', label: 'Athlete Zone' };
    if (currentRole === 'manager') return { bg: 'from-indigo-500 to-purple-500', text: 'text-indigo-600', label: 'Manager Operations' };
    if (currentRole === 'accounts') return { bg: 'from-amber-500 to-orange-500', text: 'text-amber-600', label: 'Accounts & Finance' };
    return { bg: 'from-emerald-500 via-teal-500 to-lime-500', text: 'text-emerald-600', label: 'Superadmin Console' };
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