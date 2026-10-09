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
 * - If starting on the 1st of the month:
 *   Plan ends on the last day of the target month (e.g. 1-10-26 ends on 31-10-26 for 31-day month,
 *   or 30-11-26 for 30-day month).
 * - Otherwise (if starting on any different date):
 *   Membership expires after 30 days (or durationMonths * 30 days).
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

    let end;
    const matchDays = (periodStr || '').match(/(\d+)\s*Days?/i);
    if (matchDays) {
      end = new Date(start.getTime());
      end.setDate(end.getDate() + parseInt(matchDays[1], 10));
    } else {
      const matchMonths = (periodStr || '').match(/(\d+)\s*Months?/i);
      const months = Number(durationMonths) || (matchMonths ? parseInt(matchMonths[1], 10) : 1);
      // Fixed 30 days per month count regardless of calendar month length
      end = new Date(start.getTime());
      end.setDate(end.getDate() + (months * 30));
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
