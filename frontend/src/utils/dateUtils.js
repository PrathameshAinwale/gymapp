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
