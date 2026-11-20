/**
 * Shared Indian Financial Year (FY) Code helper.
 * Indian FY starts 1 April and ends 31 March.
 * Calculated strictly in Asia/Kolkata (IST) timezone (+05:30).
 *
 * 1 Apr 2026 to 31 Mar 2027:
 * - standard (2-digit): '26'
 * - fourDigitSpan (4-digit): '2627'
 *
 * 1 Apr 2027 to 31 Mar 2028:
 * - standard (2-digit): '27'
 * - fourDigitSpan (4-digit): '2728'
 */
export function getFinancialYearCode(dateVal = null, fourDigitSpan = false) {
  let dateObj;
  if (!dateVal) {
    dateObj = new Date();
  } else if (dateVal instanceof Date) {
    dateObj = dateVal;
  } else {
    dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
  }

  // Format in Asia/Kolkata timezone
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const parts = istFormatter.formatToParts(dateObj);
  let year = 0;
  let month = 0;
  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
  }

  const fyStartYear = month >= 4 ? year : year - 1;
  const start2 = String(fyStartYear).slice(-2);

  if (fourDigitSpan) {
    const end2 = String(fyStartYear + 1).slice(-2);
    return `${start2}${end2}`;
  }

  return start2;
}

/**
 * Checks if a string conforms to the sequential ID pattern for invoices, members, or enquiries.
 * Pattern: (INV|MEM|ENQ) + 2 or 4 digit FY + 4+ digit sequence.
 * Examples: INV26270001, INV260001, MEM260005, ENQ260012
 */
export function isSequentialId(idStr) {
  if (typeof idStr !== 'string') return false;
  return /^(INV|MEM|ENQ)\d{2,4}\d{4,}$/i.test(idStr.trim());
}
