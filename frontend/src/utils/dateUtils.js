/**
 * ArchFit Date & Attendance Utility Functions
 */

export const getTodayIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getOffsetIso = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplay = (dateString, options = {}) => {
  if (!dateString) return '';
  const today = getTodayIso();
  const yesterday = getYesterdayIso();

  if (dateString === 'Today' || dateString === today) {
    if (options.withRelative) return 'Today';
  } else if (dateString === 'Yesterday' || dateString === yesterday) {
    if (options.withRelative) return 'Yesterday';
  }

  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIndex, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', {
          weekday: options.includeWeekday ? 'short' : undefined,
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          ...options
        });
      }
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        weekday: options.includeWeekday ? 'short' : undefined,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options
      });
    }
  } catch (e) {
    // fallback
  }

  return dateString;
};

export const recordMatchesDate = (recordDateOrObj, targetIso) => {
  if (!recordDateOrObj || !targetIso) return false;

  let rawDate = typeof recordDateOrObj === 'object'
    ? (recordDateOrObj.rawDate || recordDateOrObj.date)
    : recordDateOrObj;

  if (!rawDate) return false;

  const today = getTodayIso();
  const yesterday = getYesterdayIso();

  // Handle 'Today' keyword
  if (rawDate === 'Today' || rawDate === 'today') {
    return targetIso === today;
  }

  // Handle 'Yesterday' keyword
  if (rawDate === 'Yesterday' || rawDate === 'yesterday') {
    return targetIso === yesterday;
  }

  // Direct ISO match (YYYY-MM-DD)
  if (rawDate === targetIso) {
    return true;
  }

  // Check prefix or normalize
  if (typeof rawDate === 'string' && rawDate.startsWith(targetIso)) {
    return true;
  }

  // Try parsing date string (e.g. "02 Sep 2026")
  try {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      const parsedIso = `${year}-${month}-${day}`;
      return parsedIso === targetIso;
    }
  } catch (e) {
    // ignore
  }

  return false;
};

/**
 * Calculate Plan Expiry Date based on gym business rules:
 * - Every month is calculated as 30 days.
 * - Start date is inclusive:
 *   - 1st of month: 1-11-26 -> 30-11-26 (one day before 1-12-26).
 *   - Any other day: 24-11-26 -> 23-12-26 (one day before 24-12-26).
 *   - General formula: start date + (durationMonths * 30 - 1) days.
 * - Plus any bonus offer days if applicable.
 */
export const calculatePlanExpiryDate = (startDateStr, durationMonths = 1, periodStr = '', offerDays = 0) => {
  if (!startDateStr) return '';
  try {
    const cleanStr = String(startDateStr).split('T')[0];
    const parts = cleanStr.split('-');
    let start;
    if (parts.length === 3) {
      start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      start = new Date(cleanStr);
    }
    if (isNaN(start.getTime())) return '';

    let end = new Date(start.getTime());
    const matchDays = (periodStr || '').match(/(\d+)\s*Days?/i);
    if (matchDays) {
      const days = parseInt(matchDays[1], 10);
      const totalDays = Math.max(1, days);
      end.setDate(end.getDate() + (totalDays - 1));
    } else {
      const matchMonths = (periodStr || '').match(/(\d+)\s*Months?/i);
      const months = Number(durationMonths) || (matchMonths ? parseInt(matchMonths[1], 10) : 1);
      // Fixed 30 days per month count regardless of calendar month length, inclusive of start date
      // e.g. start date 1-11-2026 -> 30-11-2026 (day before 1-12-2026)
      // e.g. start date 24-11-2026 -> 23-12-2026 (day before 24-12-2026)
      const totalDays = Math.max(1, months * 30);
      end.setDate(end.getDate() + (totalDays - 1));
    }

    const bonus = Number(offerDays) || 0;
    if (bonus > 0) {
      end.setDate(end.getDate() + bonus);
    }

    const year = end.getFullYear();
    const month = String(end.getMonth() + 1).padStart(2, '0');
    const day = String(end.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.warn('calculatePlanExpiryDate error:', e);
    return '';
  }
};

/**
 * Calculate age from date of birth (DOB).
 * Correctly accounts for:
 * - Empty or invalid dates (returns '')
 * - Various date formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, ISO strings
 * - Leap years (e.g. Feb 29 on leap vs non-leap years)
 * - Whether birthday has already passed in the current/reference year
 * - Future birthdates (returns '')
 * - Age bounds (0 to 130)
 *
 * @param {string|Date} dobInput
 * @param {Date} [refDate=new Date()]
 * @returns {number|string} integer age or ''
 */
export const calculateAgeFromDob = (dobInput, refDate = new Date()) => {
  if (!dobInput) return '';

  try {
    let birthYear;
    let birthMonth;
    let birthDay;

    if (dobInput instanceof Date) {
      if (isNaN(dobInput.getTime())) return '';
      birthYear = dobInput.getFullYear();
      birthMonth = dobInput.getMonth();
      birthDay = dobInput.getDate();
    } else {
      const rawStr = String(dobInput).trim();
      if (!rawStr) return '';

      const cleanStr = rawStr.split('T')[0].trim();
      const parts = cleanStr.split(/[-/.]/);

      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);

        if (isNaN(p0) || isNaN(p1) || isNaN(p2)) return '';

        if (parts[0].length === 4) {
          // YYYY-MM-DD
          birthYear = p0;
          birthMonth = p1 - 1;
          birthDay = p2;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          birthDay = p0;
          birthMonth = p1 - 1;
          birthYear = p2;
        } else {
          return '';
        }
      } else {
        const parsed = new Date(rawStr);
        if (isNaN(parsed.getTime())) return '';
        birthYear = parsed.getFullYear();
        birthMonth = parsed.getMonth();
        birthDay = parsed.getDate();
      }
    }

    if (birthMonth < 0 || birthMonth > 11 || birthDay < 1 || birthDay > 31) {
      return '';
    }

    // Verify calendar date validity (e.g. Feb 29 on non-leap year or Apr 31)
    const testDate = new Date(birthYear, birthMonth, birthDay);
    if (
      testDate.getFullYear() !== birthYear ||
      testDate.getMonth() !== birthMonth ||
      testDate.getDate() !== birthDay
    ) {
      return '';
    }

    const ref = refDate instanceof Date ? refDate : new Date(refDate);
    if (isNaN(ref.getTime())) return '';

    // Birthdate cannot be in the future
    if (testDate.getTime() > ref.getTime()) {
      return '';
    }

    let age = ref.getFullYear() - birthYear;
    const refMonth = ref.getMonth();
    const refDay = ref.getDate();

    if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
      age--;
    }

    return age >= 0 && age <= 130 ? age : '';
  } catch {
    return '';
  }
};

/**
 * Calculate the latest permitted payment promise date:
 * Must be strictly before the membership expiry date (i.e. Expiry Date - 1 day).
 * The expiry date itself is not permitted.
 */
export const calculateMaxPromiseDate = (expiryDateStr) => {
  if (!expiryDateStr) return '';
  try {
    const cleanStr = String(expiryDateStr).split('T')[0].trim();
    const parts = cleanStr.split('-');
    let exp;
    if (parts.length === 3) {
      exp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      exp = new Date(cleanStr);
    }
    if (isNaN(exp.getTime())) return '';
    exp.setDate(exp.getDate() - 1);
    const yr = exp.getFullYear();
    const mo = String(exp.getMonth() + 1).padStart(2, '0');
    const da = String(exp.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  } catch {
    return '';
  }
};

/**
 * Validate payment promise date according to the business rule:
 * Membership Start Date <= Promise Date < Membership Expiry Date
 *
 * @param {string} promiseDate - YYYY-MM-DD
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} expiryDate - YYYY-MM-DD
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validatePromiseDate = (promiseDate, startDate, expiryDate) => {
  if (!promiseDate) {
    return { isValid: false, error: 'Promised due date is required when there is a remaining balance due.' };
  }
  const cleanPromise = String(promiseDate).split('T')[0].trim();
  const cleanStart = startDate ? String(startDate).split('T')[0].trim() : '';
  const cleanExpiry = expiryDate ? String(expiryDate).split('T')[0].trim() : '';

  if (!cleanStart || !cleanExpiry) {
    return { isValid: true };
  }

  if (cleanStart >= cleanExpiry) {
    return {
      isValid: false,
      error: 'Membership date range contains no permitted promise date (start date must be before expiry date).'
    };
  }

  if (cleanPromise < cleanStart) {
    return {
      isValid: false,
      error: `Promised due date (${formatDateDisplay(cleanPromise)}) cannot be earlier than membership start date (${formatDateDisplay(cleanStart)}).`
    };
  }

  if (cleanPromise >= cleanExpiry) {
    return {
      isValid: false,
      error: `Promised due date (${formatDateDisplay(cleanPromise)}) must be strictly before membership expiry date (${formatDateDisplay(cleanExpiry)}). The expiry date itself is not permitted.`
    };
  }

  return { isValid: true };
};

export const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }
  const cleanStr = String(dateInput).split('T')[0].split(' ')[0].trim();
  const parts = cleanStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Calculate member status according to date-driven rules and validity boundaries:
 * - Administrative states (Frozen, Frozen (Paused), On Hold, Suspended, Cancelled) are preserved.
 * - If start date is in the future (> today), returns 'Upcoming'.
 * - If today > expiry date, returns 'Expired'.
 * - If 0 <= diffDays <= 10, returns 'Expiring Soon' (membership is valid through end of expiry date!).
 * - Otherwise returns 'Active'.
 *
 * @param {string|Date} expiryDate
 * @param {string} currentStatus
 * @param {string|Date} startDate
 * @param {Date} [referenceDate] - Optional reference date for deterministic testing
 * @returns {string}
 */
export const calculateMemberStatus = (expiryDate, currentStatus = 'Active', startDate = null, referenceDate = null) => {
  // Preserve legitimate administrative overriding states
  if (
    currentStatus === 'Frozen' ||
    currentStatus === 'Frozen (Paused)' ||
    currentStatus === 'On Hold' ||
    currentStatus === 'Suspended' ||
    currentStatus === 'Cancelled'
  ) {
    return currentStatus;
  }

  try {
    const today = referenceDate ? parseLocalDate(referenceDate) : new Date();
    today.setHours(0, 0, 0, 0);

    // 1. If start date is in the future, membership is Upcoming
    if (startDate) {
      const start = parseLocalDate(startDate);
      if (start && start.getTime() > today.getTime()) {
        return 'Upcoming';
      }
    }

    if (!expiryDate) {
      return (currentStatus && currentStatus !== 'Active') ? currentStatus : 'Unassigned';
    }

    const exp = parseLocalDate(expiryDate);
    if (!exp) return currentStatus || 'Active';

    // Membership is valid THROUGH its expiry date.
    // It becomes Expired only after the expiry date has ended (diffDays < 0).
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays <= 10) {
      return 'Expiring Soon';
    } else {
      return 'Active';
    }
  } catch {
    return currentStatus || 'Active';
  }
};

