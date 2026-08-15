import {
  AsYouType,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js/min';
import { COUNTRY_SEED } from './countries';

/**
 * Phone numbers are stored as a single E.164 string, e.g. '+919876543210'.
 *
 * Why one string and not a dial-code column plus a number column: finalized
 * documents freeze a snapshot of the client or employee, and `phone` is part of
 * that frozen shape. Splitting the field would change the shape of every
 * snapshot already written, forcing a compatibility branch on every reader
 * forever. One string keeps issued documents reprinting byte-identically.
 *
 * The country is derived from the number when editing, so it can never drift
 * out of sync with the number the way a duplicated column would.
 *
 * Uses the `/min` metadata build (~82KB raw): it validates length and the broad
 * national pattern, which is what a contact field on an internal tool needs.
 * The fuller builds cost 2x the metadata without changing any answer we rely on.
 */

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2. */
  iso2: CountryCode;
  name: string;
  /** Dial code without the '+', e.g. '91'. */
  dialCode: string;
  flag: string;
}

/** Dial codes layered onto the shared country list — see countries.ts. */
export const COUNTRIES: PhoneCountry[] = COUNTRY_SEED.map(({ iso2, name, flag }) => ({
  iso2: iso2 as CountryCode,
  name,
  dialCode: getCountryCallingCode(iso2 as CountryCode),
  flag,
}));

export const DEFAULT_COUNTRY: CountryCode = 'IN';

export function countryByIso2(iso2: string): PhoneCountry | undefined {
  return COUNTRIES.find((c) => c.iso2 === iso2);
}

/**
 * Indian mobile numbers start 6–9. libphonenumber accepts some other 10-digit
 * ranges because India's numbering plan does allocate them, but every number
 * anyone actually types into this tool is a mobile — so we hold the tighter
 * line the user asked for and reject the rest.
 */
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

/** National digits + country → E.164, or null when the number isn't valid. */
export function toE164(national: string, iso2: CountryCode): string | null {
  const digits = national.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(digits, iso2);
  if (!parsed || !parsed.isValid()) return null;
  if (iso2 === 'IN' && !INDIAN_MOBILE_RE.test(digits)) return null;
  return parsed.number;
}

/**
 * Split a stored value back into country + national digits for editing.
 *
 * Must never throw. Records predate this field's structure — fixtures contain
 * values as bare as '9' — and a legacy value has to stay editable rather than
 * crashing the form. Anything unparseable falls back to India with the digits
 * preserved so the user can fix it in place.
 */
export function parsePhone(value: string): { iso2: CountryCode; national: string } {
  const raw = (value ?? '').trim();
  if (!raw) return { iso2: DEFAULT_COUNTRY, national: '' };

  const parsed = parsePhoneNumberFromString(raw.startsWith('+') ? raw : raw, DEFAULT_COUNTRY);
  if (parsed?.country && parsed.nationalNumber) {
    return { iso2: parsed.country, national: String(parsed.nationalNumber) };
  }

  return { iso2: DEFAULT_COUNTRY, national: raw.replace(/\D/g, '') };
}

/**
 * Trim what was typed to the most national digits that country could hold.
 *
 * India is exact — 10, because every number typed into this tool is a mobile,
 * which is the same tighter line `INDIAN_MOBILE_RE` holds. Everywhere else the
 * cap is the country's own possible lengths, inside E.164's absolute ceiling of
 * 15 digits including the country code.
 *
 * It takes the digits rather than returning a number on purpose: possible
 * lengths differ by number type, so a country's maximum depends on what is
 * actually being typed. Probing a synthetic '999…' would answer for whichever
 * type that pattern happens to match, which is not necessarily this one.
 *
 * `isValidPhone` is still what decides validity; this only stops the keystroke
 * that could not possibly help.
 */
export function capNationalDigits(value: string, iso2: CountryCode): string {
  let digits = (value ?? '').replace(/\D/g, '').slice(0, 15 - getCountryCallingCode(iso2).length);
  if (iso2 === 'IN') return digits.slice(0, 10);
  while (digits.length > 1 && validatePhoneNumberLength(digits, iso2) === 'TOO_LONG') {
    digits = digits.slice(0, -1);
  }
  return digits;
}

/**
 * Group national digits the way that country writes them, as they are typed —
 * '9876543210' → '98765 43210' for India, '561235678' → '56 123 5678' for the
 * UAE. Display only; the stored value stays E.164.
 *
 * Formatted through a `+<dial code>` prefix that is then sliced off, because
 * `AsYouType` only applies a country's grouping once it knows which country it
 * is in — fed bare national digits it hands most of them straight back.
 *
 * The digits are re-checked after formatting: this feeds a controlled input
 * whose `onChange` strips the separators again, so a grouping that dropped or
 * invented a digit would quietly rewrite the number. Falls back to the raw
 * digits if that ever happens.
 */
export function formatNationalDigits(value: string, iso2: CountryCode): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const prefix = `+${getCountryCallingCode(iso2)}`;
  const formatted = new AsYouType(iso2).input(`${prefix}${digits}`);
  if (!formatted.startsWith(prefix)) return digits;
  const national = formatted.slice(prefix.length).trimStart();
  return national.replace(/\D/g, '') === digits ? national : digits;
}

/** Is this national number valid for that country? Drives the form error. */
export function isValidPhone(national: string, iso2: CountryCode): boolean {
  const digits = (national ?? '').replace(/\D/g, '');
  if (!digits) return false;
  if (iso2 === 'IN') return INDIAN_MOBILE_RE.test(digits);
  return isValidPhoneNumber(digits, iso2);
}

/**
 * Is this a *stored* phone value? The server-side half of `isValidPhone`.
 *
 * `PhoneField` writes `toE164(...) ?? national`, so an acceptable value is
 * always full E.164 and a rejected one is the bare digits it fell back to.
 * Checking the stored form is therefore the same check the field makes, done
 * where it counts: the schema behind it was `z.string().max(30)`, so anything
 * that reached a Server Action directly was never validated at all.
 *
 * Applies the same India-specific narrowing as `toE164` — libphonenumber
 * accepts landline and service ranges that we do not want on a document.
 */
export function isStoredPhone(value: string): boolean {
  const parsed = parsePhoneNumberFromString((value ?? '').trim());
  if (!parsed?.isValid()) return false;
  if (parsed.country === 'IN') return INDIAN_MOBILE_RE.test(parsed.nationalNumber);
  return true;
}

/**
 * '+919876543210' → '+91 98765 43210', for tables and form summaries.
 *
 * NOT for document sheets — those print the stored string verbatim so a
 * reprint of an issued document matches the original character for character.
 */
export function formatPhoneForDisplay(value: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const parsed = parsePhoneNumberFromString(raw);
  return parsed?.isValid() ? parsed.formatInternational() : raw;
}

/** Human-readable requirement for a country, used in form error messages. */
export function phoneHintFor(iso2: CountryCode): string {
  if (iso2 === 'IN') return 'Enter a 10-digit mobile number starting 6–9.';
  const country = countryByIso2(iso2);
  return `Enter a valid ${country?.name ?? iso2} phone number.`;
}
