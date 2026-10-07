/**
 * Default standard legal template for Gym Membership Consent Form & Liability Waiver
 */
export const DEFAULT_CONSENT_FORM = {
  title: "Gym Rules & Liability Waiver Consent Form",
  subtitle: "Review terms & physical activity declaration below before signing.",
  badgeText: "Compliance Document",
  declarationText: "I have read, understood, and accept all terms of the Health Declaration, Liability Waiver & Gym Rules.",
  declarationSubtext: "By checking this box, the athlete confirms full agreement and understanding of the above clauses.",
  allowPhysicalSign: true,
  allowEmailOtp: true,
  clauses: [
    {
      id: 1,
      title: "Physical Fitness & Medical Health Affirmation",
      text: "I declare that I am in good physical health and medically sound to engage in strenuous physical exercise, cardiovascular workouts, weight training, athletic classes, and recovery therapies. I have disclosed any pre-existing medical conditions, chronic illnesses, or recent surgeries in my profile."
    },
    {
      id: 2,
      title: "Assumption of Inherent Risk",
      text: "I understand that fitness training, weightlifting, and the use of gym facilities, saunas, and ice baths involve risks of muscle strain, fatigue, or accidental physical injury. I voluntarily participate and assume all responsibility for any such risks."
    },
    {
      id: 3,
      title: "Club Etiquette & Hygiene Rules",
      text: "I agree to abide by all club policies: wearing clean sports shoes and gym attire, sanitizing machines and benches after use, re-racking all weights and dumbbells after sets, and treating trainers and other members with courtesy."
    },
    {
      id: 4,
      title: "Release of Liability & Indemnity",
      text: "In consideration of membership, I hereby waive and release the facility management, coaches, and staff from any liability, injury claims, or losses arising from my participation on the gym premises."
    },
    {
      id: 5,
      title: "Emergency Medical Authorization",
      text: "In the event of a medical emergency during training, I authorize gym personnel to summon emergency medical care and notify my emergency contact on record."
    }
  ]
};

/**
 * Get consent form configuration for the current active gym
 */
export const getGymConsentForm = (gymId) => {
  if (typeof window === 'undefined') return DEFAULT_CONSENT_FORM;
  try {
    const key = gymId ? `pulsefit_consent_settings_${gymId}` : 'pulsefit_consent_settings';
    const raw = localStorage.getItem(key) || localStorage.getItem('pulsefit_consent_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.clauses) && parsed.clauses.length > 0) {
        return {
          ...DEFAULT_CONSENT_FORM,
          ...parsed,
          clauses: parsed.clauses
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load gym consent form settings:', err);
  }
  return DEFAULT_CONSENT_FORM;
};

/**
 * Save custom consent form configuration for the current gym
 */
export const saveGymConsentForm = (gymId, data) => {
  if (typeof window === 'undefined') return;
  try {
    const key = gymId ? `pulsefit_consent_settings_${gymId}` : 'pulsefit_consent_settings';
    const jsonStr = JSON.stringify(data);
    localStorage.setItem(key, jsonStr);
    localStorage.setItem('pulsefit_consent_settings', jsonStr);

    // Notify all active views of the change
    window.dispatchEvent(new CustomEvent('consent_settings_updated', { detail: data }));
  } catch (err) {
    console.error('Failed to save gym consent form settings:', err);
    throw err;
  }
};
