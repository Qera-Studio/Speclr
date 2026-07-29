/**
 * Currency codes for employee pay.
 *
 * Scope note: this is a **record-keeping field only**. Stipend slips and every
 * other document still print rupees, because the money core (integer paise,
 * amountInWords, the CGST/SGST/IGST split) is rupee-shaped, and a GST document
 * from an Indian entity must show its tax amount in INR regardless of the
 * billing currency. Making documents currency-aware needs an exchange rate, an
 * INR tax line, and per-currency amount-in-words — its own piece of work, not a
 * label swap. See ROADMAP.md.
 */

export const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [
  CurrencyCode,
  ...CurrencyCode[],
];

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

export function currencyByCode(code: string) {
  return CURRENCIES.find((c) => c.code === code);
}

/** 'USD' → 'USD — US Dollar ($)', for the picker. */
export function currencyLabel(code: CurrencyCode): string {
  const currency = currencyByCode(code);
  return currency ? `${currency.code} — ${currency.name} (${currency.symbol})` : code;
}
