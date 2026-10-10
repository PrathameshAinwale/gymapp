// Official SaaS Tiered Plans for Gyms and Strict Feature Gating
// Tiers: Bronze, Silver, Gold, Platinum

export const ALL_SYSTEM_FEATURES = [
  // Bronze Features
  { id: 'members', name: 'Member Directory & Profiles', category: 'Operations', minTier: 'Bronze', description: 'Complete athlete management, profiles, notes & emergency contacts' },
  { id: 'enquiries', name: 'Enquiry & Leads CRM', category: 'Operations', minTier: 'Bronze', description: 'Lead capture, follow-ups, trial bookings & conversion tracking' },
  { id: 'plans', name: 'Membership Admission Plans', category: 'Memberships', minTier: 'Bronze', description: 'Configurable admission plans, pricing, durations & offer tags' },
  { id: 'membership-freeze', name: 'Freeze & Extensions', category: 'Memberships', minTier: 'Bronze', description: 'Medical freeze, travel holds & membership period extensions' },
  { id: 'classes', name: 'Classes & Batches', category: 'Operations', minTier: 'Bronze', description: 'Batch timings, group class scheduling & attendance rosters' },
  { id: 'financials', name: 'Revenue & Billing', category: 'Finance', minTier: 'Bronze', description: 'Cash register, income collection & billing ledger' },
  { id: 'settings', name: 'Gym Setup & Settings', category: 'Setup', minTier: 'Bronze', description: 'Operating hours, gym contact details, tax settings & logo branding' },
  { id: 'equipment', name: 'Equipment & Assets', category: 'Setup', minTier: 'Bronze', description: 'Weight machines, cardio gear, maintenance logs & repair tracking' },
  { id: 'about_pages', name: 'About, Privacy & Help Pages', category: 'Support', minTier: 'Bronze', description: 'Official Privacy Policy, Terms & Conditions, and Help & Support desk' },

  // Silver Additions
  { id: 'reports', name: 'Export Reports', category: 'Analytics', minTier: 'Silver', description: 'Export financial, member, and audit summaries to Excel / CSV / PDF' },
  { id: 'owner_app', name: 'Mobile Owner App', category: 'Mobile', minTier: 'Silver', description: 'Dedicated mobile web application access for gym owners' },

  // Gold Additions
  { id: 'pt-sessions', name: 'PT Sessions Tracker', category: 'Operations', minTier: 'Gold', description: '1-on-1 personal training packages, scheduling & session check-off' },
  { id: 'attendance', name: 'Daily Attendance Tracker', category: 'Operations', minTier: 'Gold', description: 'Member and staff daily attendance logs & check-in heatmaps' },
  { id: 'biometric', name: 'Biometric Attendance Tracking', category: 'Hardware', minTier: 'Gold', description: 'Direct eSSL / ZKTeco / ADMS turnstile hardware attendance punch integration' },
  { id: 'whatsapp-manual', name: 'Manual WhatsApp Template Sending', category: 'Communication', minTier: 'Gold', description: '1-click WhatsApp broadcast templates for birthday, expiry & announcements (manual send)' },
  { id: 'staff-accounts', name: 'Create Account / Staff (Up to 10)', category: 'Staff', minTier: 'Gold', description: 'Create up to 10 staff & coach logins with role permissions' },
  { id: 'shifts', name: 'Shift Timings & Slots', category: 'Staff', minTier: 'Gold', description: 'Staff duty shifts, schedules & floor slot allocations' },
  { id: 'leaves', name: 'Leave Management', category: 'Staff', minTier: 'Gold', description: 'Employee leave requests, quota tracking & manager approval' },
  { id: 'advance-pay', name: 'Advance Pay Requests', category: 'Staff', minTier: 'Gold', description: 'Staff salary advance requests, status approval & repayment records' },
  { id: 'payroll', name: 'Employee Payroll', category: 'Staff', minTier: 'Gold', description: 'Salary calculations, deductions, additions & pay slips' },
  { id: 'commissions', name: 'Trainer Commissions', category: 'Staff', minTier: 'Gold', description: 'Automated personal training & admission commission payouts' },
  { id: 'products', name: 'Pro Shop & POS Store', category: 'Inventory', minTier: 'Gold', description: 'Supplement inventory, energy drinks, retail barcode billing & stock alerts' },
  { id: 'trainer_app', name: 'Trainer Mobile Application', category: 'Mobile', minTier: 'Gold', description: 'Dedicated mobile web app for coaches to manage client workouts and PT' },

  // Platinum Additions
  { id: 'analytics', name: 'Analytics & Insights', category: 'Analytics', minTier: 'Platinum', description: 'Deep business intelligence, member retention curves & peak hours' },
  { id: 'invoices', name: 'Member Invoices & Tax Receipts', category: 'Finance', minTier: 'Platinum', description: 'Full tax invoicing with GST calculation, PDF downloads & receipt history' },
  { id: 'whatsapp-automated', name: 'Completely Automated WhatsApp', category: 'Communication', minTier: 'Platinum', description: '100% automated background triggers for birthday perks, expiry countdowns & dues' },
  { id: 'member_app', name: 'Member Mobile Application', category: 'Mobile', minTier: 'Platinum', description: 'Dedicated mobile web application for athletes to track workouts, diet & digital QR pass' },
  { id: 'multi_branch', name: 'Multi-Gym Support (Up to 3 Gyms)', category: 'Enterprise', minTier: 'Platinum', description: 'Manage up to 3 facility locations from one master account' },
  { id: 'daily_automated_reports', name: 'Daily Automated Reports', category: 'Analytics', minTier: 'Platinum', description: 'Automated end-of-day summary reports delivered directly to the owner' },
  { id: 'white_label', name: 'White-Label Branding', category: 'Enterprise', minTier: 'Platinum', description: 'Custom gym logo branding across all portals and apps' },
  { id: 'priority_support', name: 'VIP Priority Support Desk', category: 'Support', minTier: 'Platinum', description: 'Direct phone hotline & priority engineering support' }
];

export const PACKAGE_PLANS = [
  {
    id: 'bronze',
    tier: 'Bronze',
    name: 'Bronze Plan',
    isPopular: false,
    activeMembers: 200,
    trainers: 0,
    branches: 1,
    monthlyPrice: 999,
    annualPrice: 9999,
    description: 'Essential core operations: Member directory, enquiries, admission plans, freeze & extensions, classes, revenue & billing, gym settings, equipment & assets, and about pages.',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    accentColor: 'text-amber-400',
    ringColor: 'focus:border-amber-500',
    features: [
      'members',
      'enquiries',
      'plans',
      'membership-freeze',
      'classes',
      'financials',
      'settings',
      'equipment',
      'privacy-policy',
      'terms-conditions',
      'help-support'
    ],
    featureHighlights: [
      'Member Management in Member Directory',
      'Enquiry & Leads CRM',
      'Membership Plans & Pricing',
      'Freeze & Extensions',
      'Classes & Batches Scheduling',
      'Revenue & Billing',
      'Gym Settings & Branding',
      'Equipment & Assets Inventory',
      'All 3 About & Support Pages'
    ],
    quotas: {
      maxMembers: 200,
      maxBranches: 1,
      multiGym: false
    }
  },
  {
    id: 'silver',
    tier: 'Silver',
    name: 'Silver Plan',
    isPopular: false,
    activeMembers: 500,
    trainers: 0,
    branches: 1,
    monthlyPrice: 1799,
    annualPrice: 18000,
    description: 'All Bronze Plan features PLUS Export Reports and Mobile Owner App. Up to 500 members.',
    badgeColor: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
    accentColor: 'text-slate-300',
    ringColor: 'focus:border-slate-400',
    features: [
      'members',
      'enquiries',
      'plans',
      'membership-freeze',
      'classes',
      'financials',
      'settings',
      'equipment',
      'privacy-policy',
      'terms-conditions',
      'help-support',
      'reports',
      'owner_app'
    ],
    featureHighlights: [
      'Everything in Bronze Plan',
      'Export Reports (Excel / CSV / PDF)',
      'Mobile Owner Application',
      'Up to 500 Members Capacity'
    ],
    quotas: {
      maxMembers: 500,
      maxBranches: 1,
      multiGym: false
    }
  },
  {
    id: 'gold',
    tier: 'Gold',
    name: 'Gold Plan',
    isPopular: true,
    activeMembers: 1000,
    trainers: 10,
    branches: 1,
    monthlyPrice: 2499,
    annualPrice: 24000,
    description: 'All Bronze & Silver features PLUS all Operations & Schedule, manual WhatsApp templates, all Staff & Payroll (up to 10 staff), all Inventory & Setup, Biometric attendance, and Owner & Trainer apps.',
    badgeColor: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
    accentColor: 'text-yellow-400',
    ringColor: 'focus:border-yellow-400',
    features: [
      'members',
      'enquiries',
      'plans',
      'membership-freeze',
      'classes',
      'financials',
      'settings',
      'equipment',
      'privacy-policy',
      'terms-conditions',
      'help-support',
      'reports',
      'owner_app',
      'pt-sessions',
      'attendance',
      'whatsapp-automation',
      'staff-accounts',
      'shifts',
      'leaves',
      'advance-pay',
      'payroll',
      'commissions',
      'products',
      'trainer_app',
      'biometric'
    ],
    featureHighlights: [
      'Everything in Bronze & Silver Plans',
      'All Operations & Schedule (PT Tracker, Attendance, etc.)',
      'Biometric Machine Attendance Hardware Sync',
      'Manual WhatsApp Template Sending (No automated sending)',
      'All Staff & Payroll Management (Up to 10 Staff creation)',
      'Shifts, Leaves, Advance Pay, Payroll & Commissions',
      'All Inventory & Setup (Pro Shop & Supplements Store)',
      'Owner & Trainer Mobile Applications',
      'Up to 1,000 Members Capacity'
    ],
    quotas: {
      maxMembers: 1000,
      maxTrainers: 10,
      maxBranches: 1,
      multiGym: false
    }
  },
  {
    id: 'platinum',
    tier: 'Platinum',
    name: 'Platinum Plan',
    isPopular: false,
    activeMembers: 'Unlimited',
    trainers: 'Unlimited',
    branches: 3,
    monthlyPrice: null,
    annualPrice: 30000,
    description: 'Flat ₹30,000 for 1 year: All Gold features PLUS all Finance & Analytics (analytics, invoices), completely automated WhatsApp, Member, Owner & Trainer apps, multi-gym (up to 3 gyms), daily automated reports, and full access to everything.',
    badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    accentColor: 'text-purple-400',
    ringColor: 'focus:border-purple-500',
    features: [
      'members',
      'enquiries',
      'plans',
      'membership-freeze',
      'classes',
      'financials',
      'settings',
      'equipment',
      'privacy-policy',
      'terms-conditions',
      'help-support',
      'reports',
      'owner_app',
      'pt-sessions',
      'attendance',
      'whatsapp-automation',
      'staff-accounts',
      'shifts',
      'leaves',
      'advance-pay',
      'payroll',
      'commissions',
      'products',
      'trainer_app',
      'biometric',
      'analytics',
      'invoices',
      'whatsapp-automated',
      'member_app',
      'multi_branch',
      'daily_automated_reports',
      'white_label',
      'priority_support'
    ],
    featureHighlights: [
      'Everything in Gold Plan',
      'All Finance & Analytics (Analytics & Insights, Member Invoices)',
      'Completely Automated WhatsApp Triggers (Auto background delivery)',
      'Mobile Applications for Member, Owner, and Trainer',
      'Multi-Gym Support (Up to 3 Facilities)',
      'Daily Automated Reports of all completed operations',
      'Unlimited Members & Unlimited Staff Accounts',
      'Full Access to All Features Across the Entire Application'
    ],
    quotas: {
      maxMembers: null, // Unlimited
      maxTrainers: null, // Unlimited
      maxBranches: 3,
      multiGym: true
    }
  }
];

export const PLAN_ALLOWED_TABS = {
  bronze: [
    'dashboard',
    'members',
    'member-profile',
    'enquiries',
    'plans',
    'membership-freeze',
    'classes',
    'financials',
    'settings',
    'equipment',
    'privacy-policy',
    'terms-conditions',
    'help-support',
    // Member / Athlete self-service (No invoices on Bronze)
    'profile',
    'workout',
    'diet',
    'transformation',
    'coaches'
  ],
  silver: [
    'dashboard',
    'members',
    'member-profile',
    'enquiries',
    'plans',
    'membership-freeze',
    'classes',
    'financials',
    'settings',
    'equipment',
    'privacy-policy',
    'terms-conditions',
    'help-support',
    'profile',
    'workout',
    'diet',
    'transformation',
    'coaches',
    'reports' // Export reports
  ],
  gold: [
    'dashboard',
    'members',
    'member-profile',
    'enquiries',
    'plans',
    'membership-freeze',
    'classes',
    'financials',
    'settings',
    'equipment',
    'privacy-policy',
    'terms-conditions',
    'help-support',
    'reports',
    'profile',
    'workout',
    'diet',
    'transformation',
    'coaches',
    // All Operations & Schedule:
    'pt-sessions',
    'sessions',
    'attendance',
    'whatsapp-automation',
    'clients',
    'workout-builder',
    'diet-builder',
    // All Staff & Payroll:
    'staff-accounts',
    'shifts',
    'leaves',
    'trainer-leaves',
    'advance-pay',
    'advance-request',
    'payroll',
    'commissions',
    // All Inventory & Setup:
    'products'
  ],
  platinum: [
    // Everything in Gold PLUS all Finance & Analytics (analytics, invoices):
    'dashboard',
    'members',
    'member-profile',
    'enquiries',
    'plans',
    'membership-freeze',
    'classes',
    'financials',
    'settings',
    'equipment',
    'privacy-policy',
    'terms-conditions',
    'help-support',
    'reports',
    'profile',
    'workout',
    'diet',
    'transformation',
    'coaches',
    'pt-sessions',
    'sessions',
    'attendance',
    'whatsapp-automation',
    'clients',
    'workout-builder',
    'diet-builder',
    'staff-accounts',
    'shifts',
    'leaves',
    'trainer-leaves',
    'advance-pay',
    'advance-request',
    'payroll',
    'commissions',
    'products',
    'analytics',
    'invoices'
  ]
};

export const getPlanByTier = (tierName) => {
  const norm = (tierName || '').toLowerCase().trim();
  if (norm.includes('bronze') || norm === 'basic') return PACKAGE_PLANS[0];
  if (norm.includes('silver') || norm === 'growth') return PACKAGE_PLANS[1];
  if (norm.includes('gold')) return PACKAGE_PLANS[2];
  if (norm.includes('platinum')) return PACKAGE_PLANS[3];
  return PACKAGE_PLANS[3]; // Default to full access
};

export const isTabAllowedForGym = (tabId, packageTier, customFeatures = null) => {
  if (!tabId) return true;

  // Universal core tabs and views always accessible to all gyms
  const universalAllowedTabs = [
    'dashboard',
    'member-profile',
    'add-member',
    'upgrade-renew',
    'create-invoice',
    'privacy-policy',
    'terms-conditions',
    'help-support'
  ];
  if (universalAllowedTabs.includes(tabId)) return true;

  // Normalize tier name
  const norm = (packageTier || 'platinum').toLowerCase().trim();
  let resolvedTier = 'platinum';
  if (norm.includes('bronze') || norm === 'basic') resolvedTier = 'bronze';
  else if (norm.includes('silver') || norm === 'growth') resolvedTier = 'silver';
  else if (norm.includes('gold')) resolvedTier = 'gold';
  else if (norm.includes('platinum')) resolvedTier = 'platinum';

  // If customFeatures is specifically assigned and non-empty
  if (Array.isArray(customFeatures) && customFeatures.length > 0) {
    if (customFeatures.includes(tabId)) return true;
    const reverseAliasMap = {
      enquiries: 'enquiry',
      financials: 'finance',
      products: 'pos',
      'pt-sessions': 'trainers',
      'staff-accounts': 'staff',
      'advance-pay': 'advance_pay',
      'whatsapp-automation': 'whatsapp',
      reports: 'reports',
      analytics: 'analytics'
    };
    if (reverseAliasMap[tabId] && customFeatures.includes(reverseAliasMap[tabId])) {
      return true;
    }
  }

  const allowedTabs = PLAN_ALLOWED_TABS[resolvedTier] || PLAN_ALLOWED_TABS.platinum;
  return allowedTabs.includes(tabId);
};

export const TAB_TO_FEATURE_MAP = {
  dashboard: 'dashboard',
  members: 'members',
  enquiries: 'enquiries',
  plans: 'plans',
  'membership-freeze': 'membership-freeze',
  classes: 'classes',
  financials: 'financials',
  settings: 'settings',
  equipment: 'equipment',
  reports: 'reports',
  'pt-sessions': 'pt-sessions',
  attendance: 'attendance',
  'whatsapp-automation': 'whatsapp-automation',
  'staff-accounts': 'staff-accounts',
  shifts: 'shifts',
  leaves: 'leaves',
  'advance-pay': 'advance-pay',
  payroll: 'payroll',
  commissions: 'commissions',
  products: 'products',
  analytics: 'analytics',
  invoices: 'invoices',
  'privacy-policy': 'privacy-policy',
  'terms-conditions': 'terms-conditions',
  'help-support': 'help-support'
};

export default PACKAGE_PLANS;
