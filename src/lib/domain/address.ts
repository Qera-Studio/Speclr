import { z } from 'zod';
import { countryName } from './countries';
import { sanitizeText, textSchema } from './text';

/**
 * Structured address parts.
 *
 * These are an *editing aid*, not the source of truth. The flat `address`
 * string on a client or employee record stays authoritative for rendering:
 * documents print `snapshot.address` verbatim, and a finalized document must
 * reprint byte-identically years later. Composition happens once, server-side,
 * at save time — never at render time.
 *
 * Records created before structured addresses existed simply have no parts.
 * That's expected and must keep working: `addressParts` is always optional.
 */
export interface AddressParts {
  /** Building / flat / house number, e.g. 'C-204'. */
  line1: string;
  /** Street, area, landmark. Optional — plenty of addresses don't need it. */
  line2?: string;
  city: string;
  /** State or province. For India this is the full name, e.g. 'Uttar Pradesh'. */
  state: string;
  /** Postal code. India: 6 digits; other countries vary, so this isn't strict. */
  pincode: string;
  /** ISO 3166-1 alpha-2, e.g. 'IN'. Defaults to India. */
  country: string;
}

/**
 * Deliberately lenient: every field allows an empty string, so a half-filled
 * address can never be the thing that blocks saving a client. The flat
 * `address` string carries the real requirement (min 1 char) and is validated
 * separately; `composeAddress` drops whatever is blank.
 *
 * No `.default()` on purpose — a zod default makes the schema's input and
 * output types differ, which breaks react-hook-form's resolver typing. Callers
 * use `emptyAddressParts` for defaults instead.
 */
export const addressPartsSchema = z.object({
  line1: textSchema(200),
  line2: textSchema(200).optional(),
  // Free text, not the strict name rule. A house number belongs in `line1`, but
  // a numbered district or region is a real thing in enough countries that
  // blocking a digit here would refuse a legitimate foreign address.
  city: textSchema(120),
  state: textSchema(120),
  // Digits and the space or hyphen a foreign postcode uses. Not `textSchema`:
  // this one prints on a tax invoice and feeds the pincode lookup.
  pincode: z
    .string()
    .transform((v) => sanitizeText(v).toUpperCase())
    .pipe(
      z
        .string()
        .max(20)
        .regex(/^[A-Z0-9 -]*$/, 'A postcode is letters, digits, spaces and hyphens.'),
    ),
  country: z
    .string()
    .transform((v) => sanitizeText(v).toUpperCase())
    .pipe(z.string().max(2).regex(/^[A-Z]*$/, 'Expected a 2-letter country code.')),
});

export const emptyAddressParts: AddressParts = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'IN',
};

/** India's 6-digit postal code — the only format we can autofill from. */
export const INDIA_PINCODE_RE = /^\d{6}$/;

export function isIndianPincode(value: string): boolean {
  return INDIA_PINCODE_RE.test(value.trim());
}

/**
 * Parts → the flat address string that documents print.
 *
 * Mirrors the studio's own address format (see STUDIO_INFO.address):
 *
 *     C-204,
 *     MGI Gharaunda, Raj Nagar Extension,
 *     Ghaziabad - 201017
 *     Uttar Pradesh, India
 *
 * Newline-separated because the sheets render with `whitespace-pre-line`.
 * Empty parts are dropped rather than leaving stray commas or dangling
 * separators, so a partly-filled address still reads cleanly.
 */
export function composeAddress(parts: AddressParts): string {
  const clean = (value: string | undefined) => (value ?? '').trim();

  const lines: string[] = [];

  const line1 = clean(parts.line1);
  if (line1) lines.push(`${line1},`);

  const line2 = clean(parts.line2);
  if (line2) lines.push(`${line2},`);

  // 'Ghaziabad - 201017', or just whichever half is present.
  const city = clean(parts.city);
  const pincode = clean(parts.pincode);
  const cityLine = city && pincode ? `${city} - ${pincode}` : city || pincode;
  if (cityLine) lines.push(cityLine);

  // State and country share a line — 'Uttar Pradesh, India'. They used to take
  // one each, which spent two of an address block's few lines on the least
  // specific part of it.
  //
  // Country is the full name, not the ISO code — an invoice reading 'AU' is not
  // an address. Printed for India too: these documents go to overseas clients,
  // and an export invoice should say plainly which country it was issued from.
  //
  // Only once there is an address to attach it to. `country` defaults to 'IN'
  // on an untouched form, so without this guard a blank address would compose
  // to the single word "India".
  const state = clean(parts.state);
  if (lines.length > 0 || state) {
    const country = countryName(clean(parts.country));
    const regionLine = [state, country].filter(Boolean).join(', ');
    if (regionLine) lines.push(regionLine);
  }

  return lines.join('\n');
}

/**
 * A composed multi-line address collapsed onto one line — 'C-204, MGI
 * Gharaunda, …, Ghaziabad - 201017, Uttar Pradesh, India'.
 *
 * For the places a document needs the address inline rather than as a block:
 * the offer letter's registered-office line. Trailing commas are stripped
 * before joining so `composeAddress`'s line endings don't double up.
 */
export function flattenAddress(address: string): string {
  return address
    .split('\n')
    .map((line) => line.trim().replace(/,$/, '').trim())
    .filter(Boolean)
    .join(', ');
}

/** True when there's nothing worth composing — used to skip the parts path. */
export function isEmptyAddressParts(parts: AddressParts | undefined): boolean {
  if (!parts) return true;
  return composeAddress(parts).length === 0;
}
