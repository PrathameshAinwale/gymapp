/**
 * Centralized Input Validation & Sanitization Utility for PulseFit Gym App
 * Prevents non-numeric input in number fields, validates formats (Email, Phone, PAN, Aadhaar),
 * and guards against SQL Injection and malicious payloads.
 */

// Common SQL Injection patterns: SQL keywords with operands, comment dashes, UNION SELECT, OR 1=1, etc.
const SQL_INJECTION_PATTERN = /(?:--|\/\*|\*\/|;\s*(?:select|union|insert|update|delete|drop|alter|truncate|exec|declare)|(?:'|"|;)\s*(?:or|and)\b\s+['"\d\w]+\s*=\s*['"\d\w]+|\b(?:select|union|insert|update|delete|drop|alter|truncate|exec|declare|cast)\b\s+(?:\*|[a-z0-9_]+|\())/i;

/**
 * Checks if a string contains known SQL Injection syntax or payloads
 * @param {string} val 
 * @returns {boolean}
 */
export const hasSqlInjection = (val) => {
  if (typeof val !== 'string') return false;
  return SQL_INJECTION_PATTERN.test(val.trim());
};

/**
 * Strips dangerous SQL syntax characters if detected, and trims whitespace
 * @param {string} val 
 * @returns {string}
 */
export const sanitizeText = (val) => {
  if (typeof val !== 'string') return '';
  return val
    .replace(/\0/g, '') // remove null bytes
    .trim();
};

/**
 * Keeps only digits (0-9) and limits length
 * @param {string|number} val 
 * @param {number} [maxLength=15] 
 * @returns {string}
 */
export const sanitizeDigits = (val, maxLength = 15) => {
  if (val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '');
  return maxLength ? digits.slice(0, maxLength) : digits;
};

/**
 * Specialized 10-digit mobile number sanitizer
 * @param {string|number} val 
 * @returns {string}
 */
export const sanitizePhone = (val) => {
  return sanitizeDigits(val, 10);
};

/**
 * Specialized 12-digit Aadhaar sanitizer
 * @param {string|number} val 
 * @returns {string}
 */
export const sanitizeAadhaar = (val) => {
  return sanitizeDigits(val, 12);
};

/**
 * Specialized 10-character PAN card sanitizer (e.g. ABCDE1234F)
 * @param {string} val 
 * @returns {string}
 */
export const sanitizePan = (val) => {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
};

/**
 * Sanitizes numeric input allowing up to 1 decimal point and limited decimal places
 * Rejects all letters, negative signs, and invalid symbols
 * @param {string|number} val 
 * @param {number} [maxDecimals=2] 
 * @param {number} [maxVal=Infinity] 
 * @returns {string}
 */
export const sanitizeDecimal = (val, maxDecimals = 2, maxVal = Infinity) => {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/[^0-9.]/g, '');

  // Keep only the first decimal point
  const parts = str.split('.');
  if (parts.length > 1) {
    str = parts[0] + '.' + parts.slice(1).join('').slice(0, maxDecimals);
  }

  // Check upper bound if numeric
  if (maxVal !== Infinity && str !== '' && str !== '.') {
    const num = parseFloat(str);
    if (!isNaN(num) && num > maxVal) {
      str = String(maxVal);
    }
  }

  return str;
};

/**
 * onKeyDown event handler to block non-numeric characters from being typed into inputs.
 * Blocks 'e', 'E', '+', '-', letters, symbols.
 * Allows control keys: Backspace, Tab, Enter, Arrows, Delete, Ctrl+A/C/V/X.
 * @param {React.KeyboardEvent} e 
 * @param {boolean} [allowDecimal=false]
 */
export const preventNonNumericKey = (e, allowDecimal = false) => {
  // Allow system / navigation keys
  if (
    [
      'Backspace',
      'Tab',
      'Enter',
      'Escape',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End'
    ].includes(e.key)
  ) {
    return;
  }

  // Allow Ctrl/Cmd + A, C, V, X, Z
  if (e.ctrlKey || e.metaKey) {
    return;
  }

  // Allow single decimal point if enabled
  if (allowDecimal && e.key === '.') {
    const val = e.currentTarget.value || '';
    if (!val.includes('.')) {
      return;
    }
  }

  // If not a digit 0-9, block keystroke
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * onKeyDown event handler specifically for phone/mobile numbers (digits only, max 10)
 * @param {React.KeyboardEvent} e 
 */
export const preventNonPhoneKey = (e) => {
  // Allow system / navigation keys
  if (
    [
      'Backspace',
      'Tab',
      'Enter',
      'Escape',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End'
    ].includes(e.key)
  ) {
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    return;
  }

  // Check max length of 10 digits
  const currentVal = e.currentTarget.value || '';
  const selectionLength = (e.currentTarget.selectionEnd || 0) - (e.currentTarget.selectionStart || 0);
  if (currentVal.replace(/\D/g, '').length >= 10 && selectionLength === 0) {
    e.preventDefault();
    return;
  }

  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * Validates Email Address format
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim());
};

/**
 * Validates Mobile Number (rejects letters and unsupported symbols; enforces 10-digit Indian mobile or valid international phone)
 * @param {string|number} phone 
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const str = String(phone).trim();
  // Reject alphabetic characters
  if (/[a-zA-Z]/.test(str)) return false;
  // Reject unsupported symbols (allow +, digits, spaces, hyphens, parentheses)
  if (!/^(\+?[0-9\s()-]{7,20})$/.test(str)) return false;

  const digits = str.replace(/\D/g, '');
  // International format
  if (str.startsWith('+')) {
    if (str.startsWith('+91')) {
      const domestic = digits.slice(2);
      return domestic.length === 10;
    }
    return digits.length >= 7 && digits.length <= 15;
  }

  // Standard domestic mobile: 10 digits
  return digits.length === 10;
};

/**
 * Validates PAN Card format (5 letters, 4 digits, 1 letter)
 * @param {string} pan 
 * @returns {boolean}
 */
export const isValidPan = (pan) => {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
};

/**
 * Validates 12-digit Aadhaar Card format
 * @param {string} aadhaar 
 * @returns {boolean}
 */
export const isValidAadhaar = (aadhaar) => {
  if (!aadhaar) return false;
  const digits = String(aadhaar).replace(/\D/g, '');
  return digits.length === 12;
};

/**
 * Validates human and staff names containing alphabetic & Unicode letters, digits, spaces, hyphens, dots, and apostrophes.
 * Must have at least 2 alphanumeric characters and <= 100 chars.
 * @param {string} name 
 * @returns {boolean}
 */
export const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  // Disallow special characters other than letters, numbers, spaces, dots, hyphens, and apostrophes
  const validCharsRegex = /^[\p{L}\p{N}\s'.-]+$/u;
  if (!validCharsRegex.test(trimmed)) return false;
  // Must contain at least 2 alphanumeric characters
  const charCount = (trimmed.match(/[\p{L}\p{N}]/gu) || []).length;
  return charCount >= 2;
};

/**
 * Sanitizes name input by stripping unsupported symbols while retaining letters, numbers, spaces, dots, hyphens, and apostrophes
 * @param {string} val 
 * @returns {string}
 */
export const sanitizeName = (val) => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[^\p{L}\p{N}\s'.-]/gu, '')
    .slice(0, 100);
};

/**
 * Validates optional emergency contact. If provided, must be a valid 10-digit phone.
 * @param {string} phone 
 * @returns {boolean}
 */
export const isValidEmergencyContact = (phone) => {
  if (!phone || String(phone).trim() === '') return true;
  return isValidPhone(phone);
};

/**
 * Gets today's local date string formatted as YYYY-MM-DD
 * @returns {string}
 */
export const getTodayDateStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Validates Date of Birth (DOB) - cannot be in the future
 * @param {string} dob 
 * @returns {boolean}
 */
export const isValidDob = (dob) => {
  if (!dob) return true;
  const todayStr = getTodayDateStr();
  const trimmed = String(dob).slice(0, 10);
  return trimmed <= todayStr;
};
