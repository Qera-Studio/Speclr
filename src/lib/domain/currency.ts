/**
 * Currency codes for employee pay and stipend slips.
 *
 * Scope note — read before widening this:
 *
 * **Stipend slips are currency-aware.** A stipend is not consideration for a
 * supply, so the slip carries no GST line at all; paying an overseas intern in
 * their own currency needs no exchange rate and no INR tax line. It prints the
 * amount, and the words, in the currency it was paid in.
 *
 * **Invoices and receipts stay INR, deliberately.** A GST document from an
 * Indian entity must show its tax amount in INR regardless of the billing
 * currency, and the CGST/SGST/IGST split is rupee-shaped. Making *those*
 * currency-aware needs an exchange rate and a parallel INR tax line — its own
 * piece of work, not a label swap. See ROADMAP.md.
 *
 * Every currency here is a 2-decimal (minor-unit) currency, which is why
 * `money.ts` can assume a ×100 minor unit throughout. Adding a 0- or
 * 3-decimal currency (JPY, KWD) breaks that assumption — it needs a per-entry
 * exponent and a pass over `rupeesToPaise` / `paiseToRupees` first.
 */

export const CURRENCIES = [
  // `major` / `minor` are the unit words used by `amountInWords`; `indian`
  // selects lakh/crore grouping over thousand/million/billion.
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', major: 'Rupee', minor: 'Paisa', minorPlural: 'Paise', indian: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', major: 'Dollar', minor: 'Cent', minorPlural: 'Cents', indian: false },
  { code: 'EUR', name: 'Euro', symbol: '€', major: 'Euro', minor: 'Cent', minorPlural: 'Cents', indian: false },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', major: 'Pound', minor: 'Penny', minorPlural: 'Pence', indian: false },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', major: 'Dirham', minor: 'Fils', minorPlural: 'Fils', indian: false },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', major: 'Dollar', minor: 'Cent', minorPlural: 'Cents', indian: false },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', major: 'Dollar', minor: 'Cent', minorPlural: 'Cents', indian: false },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', major: 'Dollar', minor: 'Cent', minorPlural: 'Cents', indian: false },
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
