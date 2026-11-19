/**
 * Text formatting and normalization utilities.
 * Includes Title-Case helper for auto-capitalizing first letter of each word
 * while preserving acronyms, uppercase characters, and cursor position.
 */

/**
 * Capitalizes the first letter of each word in a string,
 * preserving existing uppercase characters and acronyms.
 * Delimiters: spaces, hyphens, slashes, brackets, quotes.
 *
 * Examples:
 * - "rahul sharma" -> "Rahul Sharma"
 * - "123 main street, apt 4b" -> "123 Main Street, Apt 4b"
 * - "pt session with vip coach" -> "Pt Session With Vip Coach"
 */
export function toTitleCase(str) {
  if (typeof str !== 'string' || !str) return str;
  return str.replace(/(^|[\s\-/([{'\"“‘])([a-z])/gi, (match, prefix, char) => {
    return prefix + char.toUpperCase();
  });
}

/**
 * Handles onChange event for text inputs to auto-capitalize the first letter
 * of each word while preserving the cursor position across typing, backspacing,
 * pasting, and mobile keyboards.
 *
 * @param {Event} e - Input change event
 * @param {Function} onChange - Original onChange callback
 */
export function handleTitleCaseChange(e, onChange) {
  if (!e || !e.target) return;
  const input = e.target;
  const rawValue = input.value;
  const capitalizedValue = toTitleCase(rawValue);

  if (rawValue !== capitalizedValue) {
    const cursor = input.selectionStart;
    input.value = capitalizedValue;
    if (onChange) {
      onChange(e);
    }
    if (input.setSelectionRange && typeof cursor === 'number') {
      const scheduleRaf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 0);
      scheduleRaf(() => {
        try {
          input.setSelectionRange(cursor, cursor);
        } catch {}
      });
    }
  } else {
    if (onChange) onChange(e);
  }
}

/**
 * Higher-order function wrapping an onChange handler with auto title-casing.
 *
 * Usage:
 * <input ... onChange={withTitleCase((e) => setForm({ ...form, name: e.target.value }))} />
 */
export function withTitleCase(onChange) {
  return (e) => {
    handleTitleCaseChange(e, onChange);
  };
}
