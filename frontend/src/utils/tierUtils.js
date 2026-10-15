/**
 * Utility helper to resolve the subscription tier for a gym facility.
 *
 * Rules:
 * 1. Prefers real fetched gym data from gymInfo (supports packageTier, package_tier, and package).
 * 2. Falls back to authenticated user data (user.gym.package_tier, user.gym.package, user.gym.packageTier, user.packageTier, etc.).
 * 3. Degraded fallback responses (flagged with is_fallback: true or isFallback: true) must NEVER
 *    overwrite a known plan.
 * 4. Never defaults to 'Bronze' when the plan is merely unknown, undefined, or still loading.
 *    Returns null instead so callers can show a loading state without hiding pages.
 * 5. Returns 'Bronze' only when an authentic gym object explicitly has 'Bronze' stored as its plan.
 *
 * @param {Object|null|undefined} gymInfo - Active gym info object from context or API response
 * @param {Object|null|undefined} user - Authenticated user object (typically currentUser from AuthContext)
 * @returns {string|null} Canonical subscription tier ('Platinum' | 'Gold' | 'Silver' | 'Bronze') or null if unknown/loading.
 */
export const resolveGymTier = (gymInfo, user = null) => {
  const isFallback = Boolean(gymInfo?.is_fallback || gymInfo?.isFallback);

  // Extract candidate tier from gymInfo (only from non-fallback payloads)
  let gymTier = null;
  if (gymInfo && typeof gymInfo === 'object' && !isFallback) {
    const rawGymTier = gymInfo.packageTier || gymInfo.package_tier || gymInfo.package;
    if (typeof rawGymTier === 'string' && rawGymTier.trim()) {
      gymTier = rawGymTier.trim();
    }
  }

  // Extract candidate tier from user or user.gym
  let userTier = null;
  if (user && typeof user === 'object') {
    const rawUserTier =
      user.gym?.package_tier ||
      user.gym?.package ||
      user.gym?.packageTier ||
      user.packageTier ||
      user.package_tier ||
      user.package;
    if (typeof rawUserTier === 'string' && rawUserTier.trim()) {
      userTier = rawUserTier.trim();
    }
  }

  // Priority 1: Real fetched gym tier from non-fallback gymInfo
  if (gymTier) {
    return gymTier;
  }

  // Priority 2: User / session gym tier (e.g. from /auth/me or login response)
  if (userTier) {
    return userTier;
  }

  // If gymInfo is flagged as a fallback, ignore any spoofed fallback tier
  if (isFallback) {
    return null;
  }

  // Priority 3: If gymInfo explicitly specifies a confirmed non-empty plan tier that passed through
  if (gymInfo && typeof gymInfo === 'object') {
    const raw = gymInfo.packageTier || gymInfo.package_tier || gymInfo.package;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }

  // Unknown, missing, or still loading — NEVER default to Bronze!
  return null;
};

export default resolveGymTier;
