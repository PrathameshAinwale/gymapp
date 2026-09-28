// SaaS Tiered Plans for Gyms and Feature Gating
export const ALL_SYSTEM_FEATURES = [
  { id: 'enquiry', name: 'Enquiry & Leads CRM', category: 'Operations', minTier: 'Basic', description: 'Lead capture, follow-ups, trial bookings & conversion tracking' },
  { id: 'members', name: 'Member Directory', category: 'Operations', minTier: 'Basic', description: 'Complete athlete directory, KYC, profiles, medical notes & emergency contacts' },
  { id: 'plans', name: 'Membership Plans', category: 'Memberships', minTier: 'Basic', description: 'Configurable admission plans, durations, discount codes & offer tags' },
  { id: 'attendance', name: 'Attendance Tracker', category: 'Operations', minTier: 'Basic', description: 'Manual daily check-in, turnstile log, attendance heatmap & alerts' },
  { id: 'settings', name: 'Gym Setup & Settings', category: 'Operations', minTier: 'Basic', description: 'Operating hours, gym contact details, tax settings & general preferences' },
  { id: 'whatsapp', name: 'WhatsApp Automation', category: 'Automation', minTier: 'Gold', description: 'Auto birthday wishes, expiry reminder triggers & 1-click broadcast templates' },
  { id: 'pos', name: 'Pro Shop & POS Store', category: 'Commerce', minTier: 'Gold', description: 'Supplement inventory, energy drinks, retail barcode billing & stock alerts' },
  { id: 'finance', name: 'Revenue, Billing & Expenses', category: 'Finance', minTier: 'Gold', description: 'GST billing, member invoice receipts, expense tracker & P&L statements' },
  { id: 'trainers', name: 'Trainers & PT Commissions', category: 'Staff', minTier: 'Gold', description: 'Coach assignment, 1-on-1 personal training packages & commission payouts' },
  { id: 'staff', name: 'Staff Accounts & Payroll', category: 'Staff', minTier: 'Gold', description: 'Role-based manager/receptionist accounts, leave management & salary slips' },
  { id: 'biometric', name: 'Biometric Machine Sync', category: 'Hardware', minTier: 'Gold', description: 'Direct eSSL / ZKTeco / ADMS turnstile hardware attendance punch integration' },
  { id: 'analytics', name: 'Analytics & Export Reports', category: 'Analytics', minTier: 'Gold', description: 'Retention graphs, peak hours, Excel/PDF financial data exports' },
  { id: 'mobile_app', name: 'Mobile App for Members & Trainers', category: 'Mobile & Cloud', minTier: 'Platinum', isTopPlanOnly: true, description: 'Dedicated iOS/Android app access for members (workout, QR card) and trainers (client coaching)' },
  { id: 'multi_branch', name: 'Multi-Branch Management', category: 'Enterprise', minTier: 'Platinum', description: 'Manage multiple gym locations under one central master account' },
  { id: 'white_label', name: 'White-Label Custom Branding', category: 'Enterprise', minTier: 'Platinum', description: 'Custom gym logo on member app, personalized splash screen & custom domain' }
];

export const PACKAGE_PLANS = [
  {
    id: 'basic',
    tier: 'Basic',
    name: 'Basic Starter Plan',
    isPopular: false,
    activeMembers: 150,
    trainers: 3,
    branches: 1,
    monthlyPrice: 999,
    annualPrice: 9999,
    monthlyCostPerMember: '₹6.66',
    annualCostPerMember: '₹66.60',
    description: 'Essential core tools for boutique gyms, studio boxes & newly launched fitness clubs.',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    accentColor: 'text-cyan-400',
    ringColor: 'focus:border-cyan-500',
    features: ['enquiry', 'members', 'plans', 'attendance', 'settings'],
    featureHighlights: [
      'Enquiry & Leads CRM',
      'Member Directory & Profiles',
      'Membership Plans & Pricing',
      'Daily Manual Attendance Tracker',
      'Standard Gym Settings'
    ],
    lockedHighlights: [
      'WhatsApp Automation & Triggers',
      'Pro Shop & POS Inventory',
      'Revenue & Invoicing Module',
      'Biometric Machine Hardware Sync',
      'Mobile Application for Members & Trainers'
    ]
  },
  {
    id: 'gold',
    tier: 'Gold',
    name: 'Gold Professional Plan',
    isPopular: true,
    activeMembers: 500,
    trainers: 12,
    branches: 1,
    monthlyPrice: 2499,
    annualPrice: 24999,
    monthlyCostPerMember: '₹4.99',
    annualCostPerMember: '₹49.99',
    description: 'Complete automation suite for established commercial gyms looking to scale operations.',
    badgeColor: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    accentColor: 'text-amber-400',
    ringColor: 'focus:border-amber-500',
    features: [
      'enquiry',
      'members',
      'plans',
      'attendance',
      'settings',
      'whatsapp',
      'pos',
      'finance',
      'trainers',
      'staff',
      'biometric',
      'analytics'
    ],
    featureHighlights: [
      'Everything in Basic Plan',
      'WhatsApp Automation & Templates (Auto Birthday & Expiry)',
      'Pro Shop & Supplement POS Store',
      'Financials, Invoices & Expense Tracker',
      'Trainer Commissions & PT Tracker',
      'Staff Accounts & Payroll Manager',
      'Biometric Attendance Machine Integration (eSSL/ZKTeco)',
      'Detailed Analytics & Reports'
    ],
    lockedHighlights: [
      'Mobile Application Access for Members & Trainers',
      'Multi-Branch Network Chain',
      'White-Label Custom App Branding'
    ]
  },
  {
    id: 'platinum',
    tier: 'Platinum',
    name: 'Platinum Top Plan (Enterprise)',
    isPopular: false,
    activeMembers: 'Unlimited',
    trainers: 'Unlimited',
    branches: 'Multi-Branch (5)',
    monthlyPrice: 4999,
    annualPrice: 49999,
    monthlyCostPerMember: 'Unlimited',
    annualCostPerMember: 'Unlimited',
    description: 'Top-tier enterprise power featuring dedicated Mobile Application access for members and coaches.',
    badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    accentColor: 'text-purple-400',
    ringColor: 'focus:border-purple-500',
    features: [
      'enquiry',
      'members',
      'plans',
      'attendance',
      'settings',
      'whatsapp',
      'pos',
      'finance',
      'trainers',
      'staff',
      'biometric',
      'analytics',
      'mobile_app',
      'multi_branch',
      'white_label'
    ],
    featureHighlights: [
      'Everything in Gold Plan',
      '📱 Mobile Application Access for Members & Trainers',
      'Athlete Workout Logs & In-App QR Scanner',
      'Trainer Client Coaching & PT Mobile App',
      'Multi-Branch Chain Management',
      'Custom White-Label Gym Logo & Subdomain',
      'Dedicated Priority WhatsApp API Gateway',
      '24/7 VIP Concierge & SLA Support'
    ],
    lockedHighlights: []
  }
];

export const getPlanByTier = (tierName) => {
  const norm = (tierName || '').toLowerCase().trim();
  if (norm.includes('platinum') || norm.includes('enterprise') || norm.includes('top')) {
    return PACKAGE_PLANS[2];
  }
  if (norm.includes('gold') || norm.includes('pro') || norm.includes('growth')) {
    return PACKAGE_PLANS[1];
  }
  return PACKAGE_PLANS[0]; // Default Basic
};

export const isFeatureEnabledForTier = (featureId, tierName, customFeatures = null) => {
  if (Array.isArray(customFeatures) && customFeatures.length > 0) {
    return customFeatures.includes(featureId);
  }
  const plan = getPlanByTier(tierName);
  return plan.features.includes(featureId);
};

export const TAB_TO_FEATURE_MAP = {
  dashboard: null,
  members: 'members',
  enquiries: 'enquiry',
  plans: 'plans',
  attendance: 'attendance',
  classes: 'attendance',
  'membership-freeze': 'members',
  'consent-forms': 'members',
  settings: 'settings',
  equipment: 'settings',

  // Gold Plan Features
  'whatsapp-automation': 'whatsapp',
  products: 'pos',
  financials: 'finance',
  invoices: 'finance',
  'staff-accounts': 'staff',
  trainers: 'trainers',
  leaves: 'staff',
  'advance-pay': 'staff',
  payroll: 'staff',
  commissions: 'trainers',
  analytics: 'analytics',
  reports: 'analytics',
  'pt-sessions': 'trainers'
};

export const getTabRequiredFeature = (tabId) => {
  return TAB_TO_FEATURE_MAP[tabId] || null;
};

export const isTabAllowedForGym = (tabId, packageTier, customFeatures = null) => {
  const reqFeature = getTabRequiredFeature(tabId);
  if (!reqFeature) return true;
  return isFeatureEnabledForTier(reqFeature, packageTier, customFeatures);
};
