/**
 * Format currency as Indian Rupee (₹)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '₹0.00';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency without symbol (just number with commas)
 */
export function formatCurrencyNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0.00';
  }

  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

