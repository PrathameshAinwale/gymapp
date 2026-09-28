import React, { useState, useEffect } from 'react';
import { Sparkles, DollarSign, Calendar, Tag, Gift, Award, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import Modal from './Modal';
import { useGymData } from '../../context/GymDataContext';
import { hasSqlInjection, preventNonNumericKey, sanitizeDecimal } from '../../utils/validation';

const DURATION_PRESETS = [
  { label: '1 Mo', months: 1, period: 'Monthly (1 Month)' },
  { label: '2 Mo', months: 2, period: '2 Months' },
  { label: '3 Mo', months: 3, period: 'Quarterly (3 Months)' },
  { label: '6 Mo', months: 6, period: 'Half-Yearly (6 Months)' },
  { label: '9 Mo', months: 9, period: '9 Months' },
  { label: '12 Mo / 1 Yr', months: 12, period: 'Annual (12 Months)' }
];

const DEFAULT_FEATURES = [
  'Access to gym floor & cardio machines',
  'Locker, steam room & shower access',
  'ArchFit Mobile App Access',
  '1 Free Fitness & BMI Assessment'
];

export function MembershipPlanModal({
  isOpen,
  onClose,
  plan = null,
  onSuccess,
  isNested = false
}) {
  const { addPlan, updatePlan, addToast } = useGymData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(plan && plan.id);

  const [formData, setFormData] = useState({
    name: '',
    price: 1999,
    period: 'Monthly (1 Month)',
    durationMonths: 1,
    popular: false,
    discount: 0,
    maxDiscount: 0,
    offer: '',
    offerDays: 0,
    status: 'active',
    featuresText: DEFAULT_FEATURES.join('\n')
  });

  // Sync state when plan changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (plan) {
        const features = Array.isArray(plan.features)
          ? plan.features
          : typeof plan.features === 'string'
            ? plan.features.split('\n')
            : DEFAULT_FEATURES;

        setFormData({
          name: plan.name || '',
          price: plan.price ?? 1999,
          period: plan.period || 'Monthly (1 Month)',
          durationMonths: plan.durationMonths ?? plan.duration_months ?? 1,
          popular: Boolean(plan.popular ?? plan.is_popular),
          discount: plan.discount ?? 0,
          maxDiscount: plan.maxDiscount ?? plan.max_discount ?? 0,
          offer: plan.offer || plan.offerText || '',
          offerDays: Number(plan.offerDays ?? plan.offer_days ?? 0),
          status: plan.status || 'active',
          featuresText: features.filter(Boolean).join('\n')
        });
      } else {
        setFormData({
          name: '',
          price: 1999,
          period: 'Monthly (1 Month)',
          durationMonths: 1,
          popular: false,
          discount: 0,
          maxDiscount: 0,
          offer: '',
          offerDays: 0,
          status: 'active',
          featuresText: DEFAULT_FEATURES.join('\n')
        });
      }
    }
  }, [isOpen, plan]);

  const handleDurationSelect = (preset) => {
    setFormData((prev) => ({
      ...prev,
      durationMonths: preset.months,
      period: preset.period
    }));
  };

  const handleCustomDurationChange = (val) => {
    const cleanVal = sanitizeDecimal(val);
    const months = parseFloat(cleanVal) || 1;
    let periodLabel = `${months} Months`;
    const matchedPreset = DURATION_PRESETS.find((p) => p.months === months);
    if (matchedPreset) {
      periodLabel = matchedPreset.period;
    }
    setFormData((prev) => ({
      ...prev,
      durationMonths: cleanVal,
      period: periodLabel
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      hasSqlInjection(formData.name) ||
      hasSqlInjection(formData.period) ||
      hasSqlInjection(formData.offer) ||
      hasSqlInjection(formData.featuresText)
    ) {
      addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }

    if (!formData.name.trim()) {
      addToast('Please enter a plan name.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const features = formData.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        price: Number(formData.price) || 0,
        period: formData.period,
        durationMonths: Number(formData.durationMonths) || 1,
        duration_months: Number(formData.durationMonths) || 1,
        popular: Boolean(formData.popular),
        is_popular: Boolean(formData.popular),
        discount: Number(formData.discount) || 0,
        max_discount: Number(formData.maxDiscount) || 0,
        maxDiscount: Number(formData.maxDiscount) || 0,
        offer: formData.offer.trim() || null,
        offerDays: Number(formData.offerDays) || 0,
        offer_days: Number(formData.offerDays) || 0,
        status: formData.status || 'active',
        features
      };

      let result;
      if (isEditing) {
        result = await updatePlan(plan.id, payload);
      } else {
        result = await addPlan(payload);
      }

      if (onSuccess) {
        onSuccess(result || payload);
      }
      onClose();
    } catch (err) {
      console.error('Plan save error:', err);
      addToast(err.message || 'Failed to save membership plan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isNested={isNested}
      title={isEditing ? `Edit Plan Package: ${formData.name || 'Plan'}` : 'Create New Membership Package (₹ INR)'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Plan Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Plan Package Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Standard 3 Months / Annual VIP Elite"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Price & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Price (₹ INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                required
                min="0"
                inputMode="decimal"
                placeholder="2499"
                value={formData.price}
                onKeyDown={(e) => preventNonNumericKey(e, true)}
                onChange={(e) => setFormData({ ...formData, price: sanitizeDecimal(e.target.value) })}
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Duration (Months) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {formData.durationMonths} Mo Validity
              </span>
            </div>
            <input
              type="number"
              min="0.5"
              step="any"
              required
              inputMode="decimal"
              placeholder="e.g. 1, 2, 3, 6, 12"
              value={formData.durationMonths}
              onKeyDown={(e) => preventNonNumericKey(e, true)}
              onChange={(e) => handleCustomDurationChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>
        </div>

        {/* Quick Duration Preset Chips */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
            Quick Duration Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((preset) => {
              const isSelected = Number(formData.durationMonths) === preset.months;
              return (
                <button
                  key={preset.months}
                  type="button"
                  onClick={() => handleDurationSelect(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Discount & Max Discount Ceiling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Discount (₹ INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder="0"
                value={formData.discount}
                onKeyDown={(e) => preventNonNumericKey(e, true)}
                onChange={(e) => setFormData({ ...formData, discount: sanitizeDecimal(e.target.value) })}
                className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Standard flat discount applied on plan price</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Max Allowed Discount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder="0 (Unlimited)"
                value={formData.maxDiscount || ''}
                onKeyDown={(e) => preventNonNumericKey(e, true)}
                onChange={(e) => setFormData({ ...formData, maxDiscount: sanitizeDecimal(e.target.value) })}
                className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Maximum concession staff can offer at checkout</p>
          </div>
        </div>

        {/* Promotional Offer & Bonus Days */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            <span>Promotional Tag & Bonus Validity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Offer Tag / Banner</label>
              <input
                type="text"
                placeholder="e.g. SUMMER 10% OFF / NEW YEAR"
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bonus Extra Days</label>
              <input
                type="number"
                min="0"
                max="365"
                placeholder="e.g. 7, 15, 30"
                value={formData.offerDays || ''}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setFormData({ ...formData, offerDays: sanitizeDecimal(e.target.value) })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Status and Popular Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Plan Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="active">Active (Available for Enrollment)</option>
              <option value="inactive">Inactive (Hidden from Registration)</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="popular-plan-toggle"
              checked={formData.popular}
              onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="popular-plan-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
              Mark as "Most Popular" / Best Value badge
            </label>
          </div>
        </div>

        {/* Plan Features */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Included Plan Amenities / Features (One per line)
            </label>
            <span className="text-[10px] text-slate-400">Shown in member receipt & card</span>
          </div>
          <textarea
            rows={4}
            value={formData.featuresText}
            onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
            placeholder="Access to gym floor & cardio machines&#10;Locker & shower facilities&#10;ArchFit Mobile App Access"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isEditing ? 'Save Changes' : 'Publish Plan Package'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default MembershipPlanModal;
