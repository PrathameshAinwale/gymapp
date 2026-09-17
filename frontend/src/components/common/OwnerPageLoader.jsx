import React from 'react';
import {
  Loader2,
  Users,
  CreditCard,
  CalendarCheck,
  TrendingUp,
  Receipt,
  UserCheck,
  Clock,
  Sparkles,
  ShoppingBag,
  Dumbbell,
  ShieldCheck,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  Settings,
  Activity,
  HeartPulse
} from 'lucide-react';

const TAB_CONFIGS = {
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
  enquiries: {
    title: 'Loading Leads & Enquiries CRM',
    subtitle: 'Fetching trial walk-ins, phone follow-ups, and conversion pipelines...',
    icon: Sparkles,
    accent: 'amber',
    layout: 'grid'
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
  'membership-freeze': {
    title: 'Loading Membership Freeze Desk',
    subtitle: 'Retrieving medical pause requests, hold periods, and validity extensions...',
    icon: Clock,
    accent: 'teal',
    layout: 'table'
  },
  'consent-forms': {
    title: 'Loading Member Consent & Waivers',
    subtitle: 'Fetching signed liability waivers, PAR-Q medical health disclosures, and safety declarations...',
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
    title: 'Loading Certified Trainers',
    subtitle: 'Fetching personal coaches, specializations, client counts, and commission rates...',
    icon: Dumbbell,
    accent: 'indigo',
    layout: 'grid'
  },
  'advance-pay': {
    title: 'Loading Salary Advance Requests',
    subtitle: 'Fetching pending trainer advance disbursements and repayment deductions...',
    icon: DollarSign,
    accent: 'rose',
    layout: 'table'
  },
  payroll: {
    title: 'Loading Payroll & Salary Register',
    subtitle: 'Calculating base wages, logged shifts, attendance hours, and trainer commissions...',
    icon: Briefcase,
    accent: 'emerald',
    layout: 'table'
  },
  commissions: {
    title: 'Loading Trainer Commissions',
    subtitle: 'Calculating PT incentives, package commission splits, and monthly ledger payouts...',
    icon: TrendingUp,
    accent: 'amber',
    layout: 'table'
  },
  analytics: {
    title: 'Loading Business Analytics',
    subtitle: 'Generating retention charts, monthly recurring revenue, and member growth trends...',
    icon: Activity,
    accent: 'blue',
    layout: 'dashboard'
  },
  reports: {
    title: 'Compiling Operations Reports',
    subtitle: 'Generating financial statements, tax breakdown summaries, and audit ledgers...',
    icon: FileText,
    accent: 'indigo',
    layout: 'dashboard'
  },
  financials: {
    title: 'Loading Financial Ledger',
    subtitle: 'Calculating gross collections, operational expenditures, and net gym profit...',
    icon: DollarSign,
    accent: 'emerald',
    layout: 'dashboard'
  },
  invoices: {
    title: 'Loading Invoices & Billing',
    subtitle: 'Fetching GST tax invoices, payment histories, and outstanding collections...',
    icon: Receipt,
    accent: 'emerald',
    layout: 'table'
  },
  products: {
    title: 'Loading Pro Shop Inventory',
    subtitle: 'Fetching supplements, whey protein stock, fitness gear, and merchandise...',
    icon: ShoppingBag,
    accent: 'cyan',
    layout: 'grid'
  },
  equipment: {
    title: 'Loading Gym Equipment Registry',
    subtitle: 'Fetching strength machines, cardio units, maintenance cycles, and service logs...',
    icon: Dumbbell,
    accent: 'slate',
    layout: 'grid'
  },
  settings: {
    title: 'Loading Club Settings',
    subtitle: 'Fetching gym branding profile, operating hours, tax rules, and system configurations...',
    icon: Settings,
    accent: 'slate',
    layout: 'dashboard'
  }
};

export const OwnerPageLoader = ({ activeTab = 'dashboard' }) => {
  const config = TAB_CONFIGS[activeTab] || {
    title: 'Loading Data',
    subtitle: 'Please wait a moment while we synchronize your gym records...',
    icon: Sparkles,
    accent: 'emerald',
    layout: 'dashboard'
  };

  const Icon = config.icon;

  return (
    <div className="w-full space-y-5 animate-fadeIn">
      {/* Top Banner Notice with Glowing Spinner & Dynamic Badge */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
        {/* Animated accent gradient top line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-xs">
                <Icon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {config.title}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  <span>Fetching Live Data...</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xl">
                {config.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-500 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Data is getting fetched, please wait...</span>
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

        {/* Layout Dependent Content Skeleton */}
        {config.layout === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Table Search Header Skeleton */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="h-9 w-64 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-9 w-32 bg-slate-100 rounded-xl animate-pulse" />
            </div>

            {/* Table Rows Skeleton */}
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 bg-slate-200/80 rounded animate-pulse" />
                      <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse hidden sm:block" />
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse hidden md:block" />
                  <div className="h-5 w-16 bg-slate-200/60 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {config.layout === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((card) => (
              <div
                key={card}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-14 bg-emerald-50 rounded-full animate-pulse" />
                </div>
                <div className="h-12 w-full bg-slate-50 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-2.5 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-2.5 w-1/2 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-7 w-20 bg-slate-200/70 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {config.layout === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-56 bg-slate-50/80 rounded-xl animate-pulse flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="h-2 w-16 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
