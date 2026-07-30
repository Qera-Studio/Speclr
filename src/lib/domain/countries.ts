/**
 * The country list, as plain data.
 *
 * Kept separate from `phone.ts` on purpose: `address.ts` needs country names to
 * print on documents and is imported by `db/schema.ts`, so it must not drag
 * libphonenumber's metadata into the server import graph. `phone.ts` layers
 * dial codes on top of this same seed — one list, two consumers.
 *
 * India first: it's the default and by far the common case.
 */
export const COUNTRY_SEED: Array<{ iso2: string; name: string; flag: string }> = [
  { iso2: 'IN', name: 'India', flag: '🇮🇳' },
  { iso2: 'US', name: 'United States', flag: '🇺🇸' },
  { iso2: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { iso2: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { iso2: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { iso2: 'AU', name: 'Australia', flag: '🇦🇺' },
  { iso2: 'CA', name: 'Canada', flag: '🇨🇦' },
  { iso2: 'DE', name: 'Germany', flag: '🇩🇪' },
  { iso2: 'FR', name: 'France', flag: '🇫🇷' },
  { iso2: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { iso2: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { iso2: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { iso2: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { iso2: 'ES', name: 'Spain', flag: '🇪🇸' },
  { iso2: 'IT', name: 'Italy', flag: '🇮🇹' },
  { iso2: 'JP', name: 'Japan', flag: '🇯🇵' },
  { iso2: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { iso2: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { iso2: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { iso2: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { iso2: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { iso2: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { iso2: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { iso2: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { iso2: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
];

/**
 * 'AU' → 'Australia'. Falls back to the code itself for anything not listed, so
 * an unknown value still prints something rather than vanishing off a document.
 */
export function countryName(iso2: string): string {
  const code = (iso2 ?? '').trim().toUpperCase();
  if (!code) return '';
  return COUNTRY_SEED.find((c) => c.iso2 === code)?.name ?? code;
}
