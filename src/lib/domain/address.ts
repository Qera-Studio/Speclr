import { z } from 'zod';

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
  line1: z.string().trim().max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120),
  state: z.string().trim().max(120),
  pincode: z.string().trim().max(20),
  country: z.string().trim().max(2),
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

  // State and a non-India country are only worth printing when they aren't
  // already implied by the city line.
  const state = clean(parts.state);
  if (state) lines.push(state);

  const country = clean(parts.country).toUpperCase();
  if (country && country !== 'IN') lines.push(country);

  return lines.join('\n');
}

/** True when there's nothing worth composing — used to skip the parts path. */
export function isEmptyAddressParts(parts: AddressParts | undefined): boolean {
  if (!parts) return true;
  return composeAddress(parts).length === 0;
}
