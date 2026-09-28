import React from 'react';
import {
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Smartphone,
  MessageSquare,
  ShoppingBag,
  IndianRupee,
  Layers,
  PhoneCall,
  Crown
} from 'lucide-react';
import { PACKAGE_PLANS, getPlanByTier, ALL_SYSTEM_FEATURES, getTabRequiredFeature } from '../superadmin/packagePlans';
import { useGymData } from '../../context/GymDataContext';

export const PlanUpgradeLockView = ({ tabId, setActiveTab }) => {
  const { gymInfo } = useGymData();
  const currentTier = gymInfo?.packageTier || 'Basic';
  const currentPlan = getPlanByTier(currentTier);
  const requiredFeatureId = getTabRequiredFeature(tabId);
  const requiredFeature = ALL_SYSTEM_FEATURES.find((f) => f.id === requiredFeatureId);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-indigo-500/30 p-8 sm:p-10 shadow-2xl text-white">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Feature Gated by SaaS Subscription</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{requiredFeature?.name || 'Advanced Module'}</span>
              <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Requires {requiredFeature?.minTier || 'Gold'} Plan
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {requiredFeature?.description || 'This management module is part of the higher SaaS subscription tiers.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>Your Gym: <strong className="text-white">{gymInfo?.name || 'PulseFit Club'}</strong></span>
              <span>•</span>
              <span>Current Plan: <span className="text-cyan-400 font-bold">{currentPlan.name}</span></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all text-center"
            >
              Return to Dashboard
            </button>
            <a
              href="mailto:archdevops360@gmail.com?subject=Upgrade%20Gym%20Plan%20Request"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Crown className="w-4 h-4" />
              <span>Contact Superadmin to Upgrade</span>
            </a>
          </div>
        </div>
      </div>

      {/* Plan Comparison Grid */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Choose the Right PulseFit Tier for Your Gym</h2>
          <p className="text-xs text-slate-500">Contact the Superadmin console anytime to upgrade features or adjust gym capacity limits.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {PACKAGE_PLANS.map((plan) => {
            const isCurrent = currentTier.toLowerCase() === plan.tier.toLowerCase();
            const isTop = plan.tier === 'Platinum';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-md'
                    : isTop
                    ? 'border-purple-300 bg-gradient-to-b from-purple-50/50 to-white shadow-lg shadow-purple-500/5'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                    Current Plan
                  </div>
                )}
                {isTop && !isCurrent && (
                  <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Top Plan</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">₹{plan.monthlyPrice.toLocaleString()}</span>
                      <span className="text-xs text-slate-400 font-medium">/month</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      or ₹{plan.annualPrice.toLocaleString()}/year (billed annually)
                    </div>
                  </div>

                  {/* Highlights list */}
                  <div className="space-y-2 pt-3">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Included Capabilities:</div>
                    <ul className="space-y-1.5 text-xs">
                      {plan.featureHighlights.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
