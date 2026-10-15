/**
 * Shared Canonical Currency Formatter
 * Supports Gym specific currency setting with canonical ₹ (U+20B9) default
 */

export const formatCurrency = (amount, currencySymbol = '₹', options = {}) => {
  const numericAmount = Number(amount) || 0;
  const formatted = numericAmount.toLocaleString('en-IN', {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });
  const symbol = (currencySymbol && !currencySymbol.includes('â')) ? currencySymbol : '₹';
  return `${symbol}${formatted}`;
};

export const getPdfCurrencySymbol = (currencySymbol = '₹') => {
  if (!currencySymbol || currencySymbol === '₹' || currencySymbol.includes('â')) {
    return 'Rs.';
  }
  return currencySymbol;
};
