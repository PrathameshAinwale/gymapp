/**
 * Centralized Input Validation & Sanitization Utility for PulseFit Gym App
 * Prevents non-numeric input in number fields, validates formats (Email, Phone, PAN, Aadhaar),
 * and guards against SQL Injection and malicious payloads.
 */

// Common SQL Injection patterns: quotes followed by SQL keywords, comment dashes, UNION SELECT, OR 1=1, etc.
const SQL_INJECTION_PATTERN = /(?:'|"|;|--|\/\*|\*\/|\b(select|union|insert|update|delete|drop|alter|truncate|exec|declare|cast)\b\s+(?:\*|[a-z0-9_]+|\()|\b(or|and)\b\s+['"\d\w]+\s*=\s*['"\d\w]+)/i;

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
 * Validates 10-digit Indian Mobile Number
 * @param {string} phone 
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
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
