import React, { useState, useEffect } from 'react';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Users,
  CreditCard,
  CalendarCheck,
  Layers,
  Dumbbell,
  ShieldCheck,
  Clock,
  UserCheck,
  DollarSign,
  Briefcase,
  Activity,
  ShoppingBag,
  Settings
} from 'lucide-react';
import { subscribeToLoading } from '../../services/api';

export const TAB_LOADER_CONFIGS = {
  dashboard: {
    title: 'Loading Executive Dashboard',
    subtitle: 'Aggregating active members, daily attendance, hot leads, and revenue metrics...',
    icon: TrendingUp,
    accent: 'emerald',
    layout: 'dashboard'
  },
  members: {
    title: 'Loading Member Roster',
    subtitle: 'Fetching active memberships, validity dates, KYC statuses, and assigned coaches...',
    icon: Users,
    accent: 'emerald',
    layout: 'table'
  },
  'member-profile': {
    title: 'Loading Member Profile',
    subtitle: 'Retrieving membership history, payments, attendance logs, and workout plans...',
    icon: Users,
    accent: 'emerald',
    layout: 'table'
  },
  'add-member': {
    title: 'Initializing Member Registration',
    subtitle: 'Loading available membership packages, personal training plans, and assigned trainers...',
    icon: Users,
    accent: 'emerald',
    layout: 'dashboard'
  },
  'create-invoice': {
    title: 'Loading Billing Desk',
    subtitle: 'Fetching membership plans, pricing tiers, discounts, and payment methods...',
    icon: CreditCard,
    accent: 'emerald',
    layout: 'dashboard'
  },
  invoices: {
    title: 'Loading Invoices & Billing',
    subtitle: 'Syncing payment receipts, outstanding balances, and historical invoices...',
    icon: CreditCard,
    accent: 'emerald',
    layout: 'table'
  },
  financials: {
    title: 'Loading Financial Overview',
    subtitle: 'Calculating club inflows, operational expenses, net profit, and revenue trends...',
    icon: DollarSign,
    accent: 'emerald',
    layout: 'dashboard'
  },
  attendance: {
    title: 'Loading Attendance Tracker',
    subtitle: 'Syncing real-time turnstile QR check-ins and staff biometric logs...',
    icon: CalendarCheck,
    accent: 'blue',
    layout: 'table'
  },
  plans: {
    title: 'Loading Membership & Recovery Packages',
    subtitle: 'Fetching tiered gym memberships, PT packages, and wellness therapy options...',
    icon: CreditCard,
    accent: 'cyan',
    layout: 'grid'
  },
  enquiries: {
    title: 'Loading Leads & Enquiries CRM',
    subtitle: 'Fetching trial walk-ins, phone follow-ups, and conversion pipelines...',
    icon: Sparkles,
    accent: 'amber',
    layout: 'grid'
  },
  classes: {
    title: 'Loading Studio Classes',
    subtitle: 'Fetching group fitness schedules, capacity bookings, and studio trainers...',
    icon: Layers,
    accent: 'indigo',
    layout: 'grid'
  },
  'pt-sessions': {
    title: 'Loading Personal Training Sessions',
    subtitle: 'Fetching 1-on-1 PT allocations, remaining sessions, and client attendance...',
    icon: Dumbbell,
    accent: 'purple',
    layout: 'grid'
  },
  'membership-freeze': {
    title: 'Loading Membership Freeze Desk',
    subtitle: 'Retrieving medical pause requests, hold periods, and validity extensions...',
    icon: Clock,
    accent: 'teal',
    layout: 'table'
  },
  'consent-forms': {
    title: 'Loading Member Consent & Waivers',
    subtitle: 'Fetching signed liability waivers, PAR-Q disclosures, and safety declarations...',
    icon: ShieldCheck,
    accent: 'emerald',
    layout: 'table'
  },
  'staff-accounts': {
    title: 'Loading Staff & Trainer Accounts',
    subtitle: 'Fetching employee credentials, biometric device IDs, and assigned club roles...',
    icon: UserCheck,
    accent: 'slate',
    layout: 'grid'
  },
  trainers: {
    title: 'Loading Coach Directory',
    subtitle: 'Fetching certified personal trainers, client rosters, and session quotas...',
    icon: UserCheck,
    accent: 'slate',
    layout: 'grid'
  },
  shifts: {
    title: 'Loading Shift Management',
    subtitle: 'Fetching shift profiles, multi-slot working hours, and roster allocations...',
    icon: Clock,
    accent: 'emerald',
    layout: 'grid'
  },
  leaves: {
    title: 'Loading Leave Management',
    subtitle: 'Fetching staff leave applications, monthly quotas, and approval statuses...',
    icon: Clock,
    accent: 'purple',
    layout: 'table'
  },
  'advance-pay': {
    title: 'Loading Advance Pay Desk',
    subtitle: 'Fetching employee advance requests, salary deductions, and manager approvals...',
    icon: DollarSign,
    accent: 'emerald',
    layout: 'table'
  },
  payroll: {
    title: 'Loading Payroll Management',
    subtitle: 'Calculating base wages, commissions, biometric attendance, and net payouts...',
    icon: Briefcase,
    accent: 'indigo',
    layout: 'table'
  },
  commissions: {
    title: 'Loading Trainer Commissions',
    subtitle: 'Calculating PT session payouts, tier percentages, and monthly earnings...',
    icon: DollarSign,
    accent: 'emerald',
    layout: 'table'
  },
  analytics: {
    title: 'Loading Club Analytics',
    subtitle: 'Aggregating member retention rates, peak workout hours, and revenue metrics...',
    icon: Activity,
    accent: 'blue',
    layout: 'dashboard'
  },
  reports: {
    title: 'Loading Reports & Audit Center',
    subtitle: 'Generating financial statements, tax ledgers, and membership statistics...',
    icon: Activity,
    accent: 'indigo',
    layout: 'dashboard'
  },
  products: {
    title: 'Loading Store & Inventory',
    subtitle: 'Fetching supplements, gym merchandise, stock alerts, and wholesale pricing...',
    icon: ShoppingBag,
    accent: 'amber',
    layout: 'grid'
  },
  equipment: {
    title: 'Loading Equipment Maintenance',
    subtitle: 'Fetching strength machines, cardio gear, warranty terms, and AMC servicing...',
    icon: Dumbbell,
    accent: 'slate',
    layout: 'grid'
  },
  'whatsapp-automation': {
    title: 'Loading WhatsApp Automation',
    subtitle: 'Connecting to messaging gateway, templates, scheduled triggers, and log history...',
    icon: Sparkles,
    accent: 'emerald',
    layout: 'dashboard'
  },
  settings: {
    title: 'Loading Club Settings',
    subtitle: 'Fetching gym branding profile, operating hours, tax rules, and system configurations...',
    icon: Settings,
    accent: 'slate',
    layout: 'dashboard'
  }
};

/**
 * 1. TopProgressBar: Non-blocking thin gradient bar across the top of the viewport
 * Driven directly by api.js global network request counter
 */
export const TopProgressBar = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer = null;
    let minTimer = null;
    let shownAt = 0;

    const unsubscribe = subscribeToLoading((isLoading) => {
      if (isLoading) {
        // Debounce by 150ms to prevent flicker on rapid responses
        if (!showTimer && !visible) {
          showTimer = setTimeout(() => {
            shownAt = Date.now();
            setVisible(true);
            showTimer = null;
          }, 150);
        }
      } else {
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = null;
        }
        if (visible) {
          const elapsed = Date.now() - shownAt;
          const remaining = Math.max(0, 300 - elapsed);
          minTimer = setTimeout(() => {
            setVisible(false);
            minTimer = null;
          }, remaining);
        }
      }
    });

    return () => {
      unsubscribe();
      if (showTimer) clearTimeout(showTimer);
      if (minTimer) clearTimeout(minTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-1 bg-transparent overflow-hidden">
      <div className="h-full w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 animate-progressBar" />
    </div>
  );
};

/**
 * 2. Full-Page / Screen Variant: Branded skeleton & loading notice
 * Reuses and extends existing OwnerPageLoader aesthetic
 */
export const PageLoader = ({
  activeTab = 'dashboard',
  title,
  subtitle,
  error = null,
  onRetry = null
}) => {
  const config = TAB_LOADER_CONFIGS[activeTab] || {
    title: title || 'Loading Data',
    subtitle: subtitle || 'Please wait a moment while we synchronize records...',
    icon: Sparkles,
    accent: 'emerald',
    layout: 'dashboard'
  };

  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displaySubtitle = subtitle || config.subtitle;

  // Error State with Retry Button
  if (error) {
    return (
      <div className="w-full p-6 sm:p-8 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-4 text-center my-4 animate-fadeIn">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900">
            Failed to Load Data
          </h3>
          <p className="text-xs text-slate-500">
            {error?.message || (typeof error === 'string' ? error : 'Unable to connect to backend server. Please verify network.')}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-fadeIn">
      {/* Top Banner Notice with Glowing Spinner & Dynamic Badge */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 animate-pulse" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-xs">
                <Icon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {displayTitle}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  <span>Fetching Live Data...</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xl">
                {displaySubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-500 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Synchronizing records...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Realistic Skeleton UI Previews (Prevents Empty/Blank Screen Flash) */}
      <div className="space-y-4">
        {/* Stat Cards Skeleton Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-slate-200/80 rounded-md animate-pulse" />
                <div className="w-7 h-7 rounded-xl bg-slate-100 animate-pulse" />
              </div>
              <div className="h-7 w-28 bg-slate-200/90 rounded-lg animate-pulse" />
              <div className="h-2 w-36 bg-slate-100 rounded-md animate-pulse" />
            </div>
          ))}
        </div>

        {/* Dynamic Skeleton Content: Table vs Grid vs Dashboard layout */}
        {config.layout === 'table' ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="h-9 w-64 bg-slate-100 rounded-xl animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-9 w-32 bg-emerald-100/60 rounded-xl animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="flex items-center justify-between py-2.5 border-b border-slate-50 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-36 bg-slate-200 rounded-md animate-pulse" />
                      <div className="h-2.5 w-24 bg-slate-100 rounded-md animate-pulse" />
                    </div>
                  </div>
                  <div className="hidden sm:block h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
                  <div className="h-6 w-20 bg-emerald-50 rounded-full animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : config.layout === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((card) => (
              <div key={card} className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-slate-200 rounded-md animate-pulse" />
                  <div className="w-6 h-6 rounded-lg bg-slate-100 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-100 rounded-md animate-pulse" />
                  <div className="h-3 w-4/5 bg-slate-100 rounded-md animate-pulse" />
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-5 w-20 bg-slate-200 rounded-md animate-pulse" />
                  <div className="h-7 w-20 bg-emerald-100/60 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="h-4 w-40 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-4 w-20 bg-slate-100 rounded-md animate-pulse" />
              </div>
              <div className="h-64 bg-slate-50/70 rounded-xl flex items-center justify-center border border-dashed border-slate-200 animate-pulse">
                <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3.5 shadow-xs">
              <div className="h-4 w-28 bg-slate-200 rounded-md animate-pulse pb-2 border-b border-slate-100" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="h-3 w-28 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 3. Inline / Section Variant: Non-intrusive container loader
 * Ideal for tab content refreshing, table re-filtering, pull-to-refresh
 */
export const InlineLoader = ({
  message = 'Updating records...',
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-800 text-xs font-semibold animate-fadeIn ${className}`}>
      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
      <span>{message}</span>
    </div>
  );
};

/**
 * 4. Button Variant: Small spinner for submit/action buttons
 */
export const ButtonLoader = ({
  text = 'Processing...',
  className = ''
}) => {
  return (
    <span className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      <span>{text}</span>
    </span>
  );
};

/**
 * Main AppLoader component uniting all variants
 */
export const AppLoader = ({
  variant = 'page',
  activeTab = 'dashboard',
  title,
  subtitle,
  message,
  error = null,
  onRetry = null,
  className = '',
  text = 'Saving...'
}) => {
  if (variant === 'button') {
    return <ButtonLoader text={text} className={className} />;
  }

  if (variant === 'inline' || variant === 'section') {
    return <InlineLoader message={message || 'Refreshing data...'} className={className} />;
  }

  return (
    <PageLoader
      activeTab={activeTab}
      title={title}
      subtitle={subtitle}
      error={error}
      onRetry={onRetry}
    />
  );
};

AppLoader.Page = PageLoader;
AppLoader.Inline = InlineLoader;
AppLoader.Button = ButtonLoader;
AppLoader.TopBar = TopProgressBar;

export default AppLoader;
