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

/** India's 6-digit postal code. */
export const INDIA_PINCODE_RE = /^\d{6}$/;

/**
 * A postcode anywhere else, loosely: letters, digits, one internal space or
 * hyphen. Deliberately not a per-country format: that would be a jurisdiction
 * rule (`PRINCIPLES.md` rule 5) for sixty countries, to gate a lookup whose
 * failure costs nothing. It exists to keep caller-controlled text out of an
 * upstream URL, not to tell anyone their postcode is wrong.
 */
export const POSTCODE_RE = /^[A-Z0-9][A-Z0-9 -]{1,11}$/;

export function isIndianPincode(value: string): boolean {
  return INDIA_PINCODE_RE.test(value.trim());
}

/**
 * A complete UK postcode, ignoring the space. One or two letters, a digit, an
 * optional letter or digit, then the inward code: a digit and two letters.
 *
 * The point of matching the *whole* shape rather than counting characters is
 * that it says when the code is finished. 'PH28A' is five characters and could
 * still become 'PH2 8AL', so splitting it at three from the end would produce
 * 'PH 28A' under the typist's cursor.
 */
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;

/**
 * A postcode written the way its country writes it.
 *
 * Only the UK, and deliberately so. Its postcode is the one whose canonical
 * form has a *mandatory* internal space, and the one whose lookup depends on
 * finding it. So 'PH28AL' typed in one run reached the upstream as a code that
 * does not exist, with no hint that a space was what it wanted. The inward half
 * is always the last three characters, which is what makes this a rule and not
 * a guess.
 *
 * Everywhere else the code is uppercased and its runs of whitespace collapsed,
 * and nothing is inserted. Sixty countries' postcode formats would be a
 * jurisdiction pack (`PRINCIPLES.md` rule 5) to save one keystroke.
 */
export function formatPostcode(value: string, country: string): string {
  const code = value.trim().toUpperCase().replace(/\s+/g, ' ');
  if (country !== 'GB') return code;

  const bare = code.replace(/[^A-Z0-9]/g, '');
  if (!UK_POSTCODE_RE.test(bare)) return code;
  return `${bare.slice(0, -3)} ${bare.slice(-3)}`;
}

/** Worth a lookup? India is strict because we can be; elsewhere is a guess. */
export function isLookupPostcode(value: string, country: string): boolean {
  const code = value.trim().toUpperCase();
  return country === 'IN' ? INDIA_PINCODE_RE.test(code) : POSTCODE_RE.test(code);
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
  //
  // The hyphen is India's own convention and is wrong everywhere else: an
  // Australian address is 'Rouse Hill 2155' and a British one 'Windermere LA23
  // 1AB'. A space is what the rest of the world writes, and it is as far as
  // this goes — a line order per country would be a jurisdiction pack
  // (`PRINCIPLES.md` rule 5) for a block that is already legible without one.
  const city = clean(parts.city);
  const pincode = clean(parts.pincode);
  // A blank country reads as India, as it does everywhere else on the record.
  const iso = clean(parts.country).toUpperCase();
  const join = !iso || iso === 'IN' ? ' - ' : ' ';
  const cityLine = city && pincode ? `${city}${join}${pincode}` : city || pincode;
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
