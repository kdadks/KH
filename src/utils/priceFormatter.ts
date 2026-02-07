/**
 * Price formatting utilities
 * Handles formatting of numeric prices with currency symbols
 */

/**
 * Formats a price value (number or string) with € symbol
 * @param price - The price value (number, string, null, or undefined)
 * @returns Formatted price string with € symbol (e.g., "€120") or em dash for null/undefined
 */
export function formatPrice(price: string | number | undefined | null): string {
  if (price === null || price === undefined || price === '') return '—';
  
  const numPrice = typeof price === 'number' ? price : parseFloat(price.toString().replace(/[^0-9.]/g, ''));
  
  if (isNaN(numPrice)) return '—';
  
  // Show whole numbers without decimals, but keep decimals if they exist and are non-zero
  return numPrice % 1 === 0 ? `€${Math.round(numPrice)}` : `€${numPrice.toFixed(2)}`;
}

/**
 * Parses a price string (with or without currency symbols) to a number
 * @param priceString - The price string to parse (e.g., "€120", "120.50", etc.)
 * @returns Numeric price value or null if invalid
 */
export function parsePrice(priceString: string | undefined | null): number | null {
  if (!priceString || priceString.toString().trim() === '') return null;
  
  // Remove all non-numeric characters except decimal point
  const cleaned = priceString.toString().replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}
