import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Tag, Gift, Award, CheckCircle2, ShieldCheck, Dumbbell, Layers, X } from 'lucide-react';
import Modal from './Modal';
import { useGymData } from '../../context/GymDataContext';
import { hasSqlInjection, preventNonNumericKey, sanitizeDecimal } from '../../utils/validation';

export const PACKAGE_TYPES = [
  'Gym-Cardio',
  'Gym-Cardio-Crossfit',
  'Crossfit',
  'Locker',
  'Personal Training',
  'Massage',
  'Activities',
  'Functional Training',
  'Kids Training',
  'Club Membership',
  'Zumba',
  'General Fitness'
];

export const getPackagesForType = (type, plans = [], ptPlans = [], recoveryPlans = []) => {
  if (!type) return [];
  const normalizedType = String(type).trim().toLowerCase();

  // If type is Personal Training
  if (normalizedType === 'personal training' || normalizedType === 'pt') {
    const fromPlans = (plans || []).filter((p) => {
      const pType = String(p.packageType || p.package_type || p.category || '').trim().toLowerCase();
      return pType === 'personal training' || pType === 'pt';
    });
    const combined = [...fromPlans];
    (ptPlans || []).forEach((pt) => {
      if (!combined.some((item) => String(item.id) === String(pt.id))) {
        combined.push(pt);
      }
    });
    return combined;
  }

  // If type is Massage
  if (normalizedType === 'massage') {
    const fromPlans = (plans || []).filter((p) => {
      const pType = String(p.packageType || p.package_type || p.category || '').trim().toLowerCase();
      return pType === 'massage';
    });
    const combined = [...fromPlans];
    (recoveryPlans || []).forEach((rec) => {
      const recType = String(rec.type || rec.category || '').trim().toLowerCase();
      if ((recType === 'massage' || !recType) && !combined.some((item) => String(item.id) === String(rec.id))) {
        combined.push(rec);
      }
    });
    return combined;
  }

  // If type is Activities
  if (normalizedType === 'activities') {
    const fromPlans = (plans || []).filter((p) => {
      const pType = String(p.packageType || p.package_type || p.category || '').trim().toLowerCase();
      return pType === 'activities';
    });
    const combined = [...fromPlans];
    (recoveryPlans || []).forEach((rec) => {
      const recType = String(rec.type || rec.category || '').trim().toLowerCase();
      if (recType === 'activities' && !combined.some((item) => String(item.id) === String(rec.id))) {
        combined.push(rec);
      }
    });
    return combined;
  }

  // For all other package types (Gym-Cardio, Gym-Cardio-Crossfit, Crossfit, Locker, Functional Training, Kids Training, Club Membership, Zumba, General Fitness)
  return (plans || []).filter((p) => {
    const pType = String(p.packageType || p.package_type || p.category || '').trim().toLowerCase();
    if (pType === normalizedType) return true;
    // Fallback for legacy plans with empty or 'membership' type if Gym-Cardio or General Fitness is selected
    if ((pType === 'membership' || !pType) && (normalizedType === 'gym-cardio' || normalizedType === 'general fitness')) {
      return true;
    }
    return false;
  });
};

export const getPackageObjectFromLists = (type, id, plans = [], ptPlans = [], recoveryPlans = []) => {
  if (!id) return null;
  const foundInPlans = (plans || []).find((p) => String(p.id) === String(id));
  if (foundInPlans) return foundInPlans;
  const foundInPt = (ptPlans || []).find((p) => String(p.id) === String(id));
  if (foundInPt) return foundInPt;
  const foundInRec = (recoveryPlans || []).find((r) => String(r.id) === String(id));
  if (foundInRec) return foundInRec;
  return null;
};

export const DURATION_PRESETS = [
  { label: '1 Mo', months: 1, period: '1 Month' },
  { label: '2 Mo', months: 2, period: '2 Months' },
  { label: '3 Mo', months: 3, period: '3 Months' },
  { label: '6 Mo', months: 6, period: '6 Months' },
  { label: '9 Mo', months: 9, period: '9 Months' },
  { label: '12 Mo (1 Yr)', months: 12, period: '12 Months' }
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
  defaultPackageType = 'Gym-Cardio',
  onSuccess,
  isNested = false
}) {
  const { addPlan, updatePlan, addToast } = useGymData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(plan && plan.id);
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const [formData, setFormData] = useState({
    packageType: defaultPackageType || 'Gym-Cardio',
    name: '',
    period: '1 Month',
    durationMonths: 1,
    sessions: '',
    price: 1999,
    discount: 0,
    maxDiscount: 0,
    offer: '',
    offerDays: 0,
    status: 'Active',
    popular: false,
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

        const hasPreset = DURATION_PRESETS.some(
          (p) => p.period === plan.period || p.months === Number(plan.durationMonths ?? plan.duration_months)
        );
        setIsCustomDuration(!hasPreset && Boolean(plan.period));

        setFormData({
          packageType: plan.packageType || plan.package_type || plan.category || defaultPackageType || 'Gym-Cardio',
          name: plan.name || '',
          period: plan.period || '1 Month',
          durationMonths: plan.durationMonths ?? plan.duration_months ?? 1,
          sessions: plan.sessions || '',
          price: plan.price ?? 1999,
          discount: plan.discount ?? 0,
          maxDiscount: plan.maxDiscount ?? plan.max_discount ?? 0,
          offer: plan.offer || plan.offerText || '',
          offerDays: Number(plan.offerDays ?? plan.offer_days ?? 0),
          status: plan.status ? (plan.status.toLowerCase() === 'active' ? 'Active' : 'Inactive') : 'Active',
          popular: Boolean(plan.popular ?? plan.is_popular),
          featuresText: features.filter(Boolean).join('\n')
        });
      } else {
        setIsCustomDuration(false);
        setFormData({
          packageType: defaultPackageType || 'Gym-Cardio',
          name: '',
          period: '1 Month',
          durationMonths: 1,
          sessions: '',
          price: 1999,
          discount: 0,
          maxDiscount: 0,
          offer: '',
          offerDays: 0,
          status: 'Active',
          popular: false,
          featuresText: DEFAULT_FEATURES.join('\n')
        });
      }
    }
  }, [isOpen, plan, defaultPackageType]);

  // Handle duration preset selection
  const handleDurationPresetSelect = (preset) => {
    setFormData((prev) => ({
      ...prev,
      durationMonths: preset.months,
      period: preset.period
    }));
  };

  // Handle typing inside duration text input
  const handlePeriodTextChange = (text) => {
    let parsedMonths = 1;
    const match = text.match(/(\d+(\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (text.toLowerCase().includes('day')) {
        parsedMonths = Math.max(0.2, Math.round((num / 30) * 10) / 10);
      } else if (text.toLowerCase().includes('year') || text.toLowerCase().includes('yr')) {
        parsedMonths = num * 12;
      } else {
        parsedMonths = num;
      }
    }

    setFormData((prev) => ({
      ...prev,
      period: text,
      durationMonths: parsedMonths || 1
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
      addToast('Please enter a package title.', 'warning');
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
        package_type: formData.packageType,
        packageType: formData.packageType,
        category: formData.packageType,
        period: formData.period || '1 Month',
        duration_months: Number(formData.durationMonths) || 1,
        durationMonths: Number(formData.durationMonths) || 1,
        sessions: formData.sessions.trim() || null,
        price: Number(formData.price) || 0,
        discount: Number(formData.discount) || 0,
        max_discount: Number(formData.maxDiscount) || 0,
        maxDiscount: Number(formData.maxDiscount) || 0,
        offer: formData.offer.trim() || null,
        offer_days: Number(formData.offerDays) || 0,
        offerDays: Number(formData.offerDays) || 0,
        status: formData.status || 'Active',
        popular: Boolean(formData.popular),
        is_popular: Boolean(formData.popular),
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
      title={isEditing ? `Edit Plan: ${formData.name || 'Plan'}` : 'Create New Membership Plan'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* 1. Package Type Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Package Type <span className="text-rose-500">*</span></span>
          </label>
          <select
            value={formData.packageType}
            onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
          >
            {PACKAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Package Title Field */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Package Title / Plan Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Standard Cardio Monthly / Elite Crossfit 3 Mo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* 3. Duration Field (Dropdown Selector Only) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>Duration <span className="text-rose-500">*</span></span>
            </label>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {formData.durationMonths || 1} Month(s) Validity
            </span>
          </div>

          <select
            value={
              isCustomDuration
                ? '__custom__'
                : DURATION_PRESETS.find((p) => p.period === formData.period)?.period ||
                  DURATION_PRESETS.find((p) => p.months === Number(formData.durationMonths))?.period ||
                  '1 Month'
            }
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setIsCustomDuration(true);
              } else {
                setIsCustomDuration(false);
                const preset = DURATION_PRESETS.find((p) => p.period === e.target.value);
                if (preset) {
                  setFormData((prev) => ({
                    ...prev,
                    period: preset.period,
                    durationMonths: preset.months
                  }));
                }
              }
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
          >
            {DURATION_PRESETS.map((p) => (
              <option key={p.period} value={p.period}>
                {p.period}
              </option>
            ))}
            <option value="__custom__">Custom Duration (Type Manually)...</option>
          </select>

          {/* Typeable input shown only if custom duration is selected */}
          {isCustomDuration && (
            <div className="mt-2">
              <input
                type="text"
                autoFocus
                placeholder="Type custom duration (e.g. 45 Days, 18 Months)"
                value={formData.period}
                onChange={(e) => handlePeriodTextChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* 4. Sessions Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-emerald-600" />
              <span>Sessions</span>
            </label>
            <span className="text-[10px] text-slate-400">e.g. 12 Sessions, or Unlimited</span>
          </div>
          <input
            type="text"
            placeholder="e.g. Unlimited, 12 Sessions, or 1"
            value={formData.sessions}
            onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* 5. Amount & Max Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount (₹ INR) <span className="text-rose-500">*</span>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Max Discount (₹)
            </label>
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
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* 6. Bonus / Offer Field (to add extra days to plan if offer is going on) */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-500" />
              <span>Bonus / Offer Extra Days</span>
            </span>
            {Number(formData.offerDays) > 0 && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                +{formData.offerDays} Days Extra Validity
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Offer Title / Banner (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. FESTIVE 10% OFF / NEW YEAR"
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Bonus Extra Days Added
              </label>
              <input
                type="number"
                min="0"
                max="365"
                placeholder="e.g. 7, 15, 30"
                value={formData.offerDays || ''}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setFormData({ ...formData, offerDays: sanitizeDecimal(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* 7. Plan Status (Active / Inactive) & Popular toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Plan Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'Active' })}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formData.status?.toLowerCase() === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'Inactive' })}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formData.status?.toLowerCase() === 'inactive'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mt-5 sm:mt-0">
            <input
              type="checkbox"
              id="popular-plan-toggle"
              checked={formData.popular}
              onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="popular-plan-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
              Highlight as "Most Popular" / Best Value badge
            </label>
          </div>
        </div>

        {/* 8. Included Plan Amenities / Features (One per line) */}
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
            placeholder="Access to gym floor & cardio machines&#10;Locker & shower access&#10;Free monthly fitness assessment"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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
