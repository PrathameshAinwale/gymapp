/**
 * Centralized WhatsApp Link and Dispatch Utility for PulseFit / ArchFit
 * Ensures phone numbers are properly formatted with international country code (default 91 for India)
 * so that WhatsApp never fails with "Phone number shared via url is invalid".
 * Prevents browser popup blockers by utilizing native anchor dispatch.
 */

/**
 * Normalizes any raw phone number string to a valid international format for WhatsApp.
 * e.g. "8767227123" -> "918767227123"
 *      "+91 87672 27123" -> "918767227123"
 *      "08767227123" -> "918767227123"
 * @param {string|number} phone 
 * @returns {string} Clean digits with country code
 */
export const formatWhatsAppPhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  // 10-digit standard Indian mobile number
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // 11 digits starting with 0
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  // 12 digits starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  // Generic: return cleaned digits
  return digits;
};

/**
 * Returns a universal WhatsApp send URL (works on mobile, web, and desktop apps)
 * @param {string|number} phone 
 * @param {string} text 
 * @returns {string} URL
 */
export const getWhatsAppUrl = (phone, text = '') => {
  const clean = formatWhatsAppPhone(phone);
  const encodedText = text ? encodeURIComponent(text) : '';
  if (clean) {
    return `https://api.whatsapp.com/send?phone=${clean}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
};

/**
 * Opens WhatsApp in a new browser tab or launches the native app safely without popup-blocker issues.
 * @param {Object} options
 * @param {string|number} options.phone - Recipient mobile number
 * @param {string} options.text - Pre-filled message body
 * @param {Function} [options.onToast] - Optional toast notifier
 * @param {string} [options.recipientName] - Optional recipient display name
 * @returns {boolean} Success state
 */
export const openWhatsApp = ({ phone, text = '', onToast = null, recipientName = '' }) => {
  const clean = formatWhatsAppPhone(phone);
  if (!clean && phone) {
    if (onToast) onToast(`Invalid phone number: ${phone}`, 'error');
    return false;
  }

  const url = getWhatsAppUrl(phone, text);

  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 200);
  } catch (e) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (onToast) {
    onToast(`WhatsApp opened${recipientName ? ` for ${recipientName}` : ''}!`, 'success');
  }
  return true;
};
