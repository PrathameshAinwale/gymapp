// Pricing and Onboarding Plans defined for Gyms
export const PACKAGE_PLANS = [
  {
    id: 'starter',
    tier: 'Starter',
    isPopular: false,
    activeMembers: 100,
    trainers: 3,
    branches: 1,
    monthlyPrice: 999,
    annualPrice: 9999,
    monthlyCostPerMember: '₹9.99',
    annualCostPerMember: '₹99.99',
    description: 'Perfect for boutique gyms & solo fitness studios',
    badgeColor: 'border-slate-700 bg-slate-800/80 text-slate-300',
    accentColor: 'text-slate-400',
    ringColor: 'focus:border-slate-500'
  },
  {
    id: 'growth',
    tier: 'Growth',
    isPopular: true,
    activeMembers: 250,
    trainers: 7,
    branches: 1,
    monthlyPrice: 1799,
    annualPrice: 17999,
    monthlyCostPerMember: '₹7.20',
    annualCostPerMember: '₹72.00',
    description: 'Most popular choice for thriving local athletic clubs',
    badgeColor: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    accentColor: 'text-amber-400',
    ringColor: 'focus:border-amber-500'
  },
  {
    id: 'professional',
    tier: 'Professional',
    isPopular: false,
    activeMembers: 500,
    trainers: 15,
    branches: 1,
    monthlyPrice: 2999,
    annualPrice: 29999,
    monthlyCostPerMember: '₹6.00',
    annualCostPerMember: '₹60.00',
    description: 'Comprehensive tier for large health and wellness centers',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    accentColor: 'text-emerald-400',
    ringColor: 'focus:border-emerald-500'
  },
  {
    id: 'business',
    tier: 'Business',
    isPopular: false,
    activeMembers: 1000,
    trainers: 30,
    branches: 2,
    monthlyPrice: 4499,
    annualPrice: 44999,
    monthlyCostPerMember: '₹4.50',
    annualCostPerMember: '₹45.00',
    description: 'Ideal for multi-branch gym networks & fitness chains',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
    accentColor: 'text-cyan-400',
    ringColor: 'focus:border-cyan-500'
  },
  {
    id: 'premium',
    tier: 'Premium',
    isPopular: false,
    activeMembers: 2000,
    trainers: 50,
    branches: 3,
    monthlyPrice: 6999,
    annualPrice: 69999,
    monthlyCostPerMember: '₹3.50',
    annualCostPerMember: '₹35.00',
    description: 'Maximum performance for elite clubs & enterprise franchises',
    badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    accentColor: 'text-purple-400',
    ringColor: 'focus:border-purple-500'
  },
  {
    id: 'enterprise',
    tier: 'Enterprise',
    isPopular: false,
    activeMembers: '2,000+',
    trainers: 'Custom',
    branches: 'Custom',
    monthlyPrice: null, // Custom
    annualPrice: null,  // Custom
    monthlyCostPerMember: 'Custom',
    annualCostPerMember: 'Custom',
    description: 'Tailored enterprise SLAs & unlimited infrastructure',
    badgeColor: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    accentColor: 'text-rose-400',
    ringColor: 'focus:border-rose-500'
  }
];

export const getPlanByTier = (tierName) => {
  if (!tierName) return PACKAGE_PLANS[1]; // default Growth
  const normalized = tierName.toLowerCase();
  return PACKAGE_PLANS.find(p => p.tier.toLowerCase() === normalized) || PACKAGE_PLANS[1];
};
