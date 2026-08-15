/**
 * Tax identifiers for clients outside India.
 *
 * **Read this before adding anything here.** `PRINCIPLES.md` §4 forbids a
 * second jurisdiction pack, and this file is a logged deviation from that rule
 * (§7, dated August 2026) — the override was requested explicitly and it was
 * bounded before it was built. The bound is the important part:
 *
 * > These identifiers are **collected, validated, snapshotted and printed as
 * > the recipient's registration. Nothing computes from them.**
 *
 * `computeTotals`, `splitGST` and `formatINR` are untouched, and invoices stay
 * denominated in INR for the reason `currency.ts` gives. So a UAE client's TRN
 * appears on their invoice as an identifier, exactly as a GSTIN does — it does
 * not make the invoice a UAE VAT invoice, and this file must not grow a rate,
 * a tax-line rule or a place-of-supply concept. That is the jurisdiction seam
 * in `ROADMAP.md` §8, still unbuilt.
 *
 * What this file *is* good for: partitioning by country now means the eventual
 * pack has its validators already sorted, rather than one `taxId` field that
 * accepts anything.
 *
 * Client-safe: pure functions, no framework imports.
 */

export interface TaxIdType {
  code: string;
  /** What the field is called in the country that issues it. */
  label: string;
  /** ISO-2 countries where this is the usual answer, for defaulting the picker. */
  countries: readonly string[];
  re: RegExp;
  placeholder: string;
  /** Only where the identifier carries a published check digit. */
  checksum?: (value: string) => boolean;
}

/** Strips the separators people paste along with the number. */
function bare(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]/g, '');
}

/**
 * UK VAT mod-97: weights 8..2 over the first seven digits; valid when the
 * remainder of `(sum + check)` mod 97 is zero, or — for numbers issued after
 * 1980 — when it is zero after also subtracting 55.
 */
function gbVatChecksum(value: string): boolean {
  const digits = bare(value).replace(/^GB/, '').slice(0, 9);
  if (digits.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 7; i += 1) sum += Number(digits[i]) * (8 - i);
  const check = Number(digits.slice(7));
  return (sum + check) % 97 === 0 || (sum + check - 55) % 97 === 0;
}

/**
 * Australian ABN mod-89: subtract 1 from the first digit, apply the published
 * weights, and the total must divide by 89.
 */
function auAbnChecksum(value: string): boolean {
  const digits = bare(value);
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const sum = digits
    .split('')
    .reduce((acc, d, i) => acc + (Number(d) - (i === 0 ? 1 : 0)) * weights[i], 0);
  return sum % 89 === 0;
}

/**
 * A US EIN has no check digit; the only real structure is the two-digit prefix,
 * which is a closed set of campus codes the IRS publishes.
 */
const EIN_PREFIXES = new Set([
  '01','02','03','04','05','06','10','11','12','13','14','15','16','20','21','22','23','24',
  '25','26','27','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44',
  '45','46','47','48','50','51','52','53','54','55','56','57','58','59','60','61','62','63',
  '64','65','66','67','68','71','72','73','74','75','76','77','80','81','82','83','84','85',
  '86','87','88','90','91','92','93','94','95','98','99',
]);

function usEinChecksum(value: string): boolean {
  return EIN_PREFIXES.has(bare(value).slice(0, 2));
}

export const TAX_ID_TYPES: readonly TaxIdType[] = [
  {
    code: 'AE_TRN',
    label: 'TRN (UAE)',
    countries: ['AE'],
    re: /^\d{15}$/,
    placeholder: '100123456700003',
  },
  {
    code: 'GB_VAT',
    label: 'VAT number (UK)',
    countries: ['GB'],
    re: /^(GB)?\d{9}(\d{3})?$/,
    placeholder: 'GB123456789',
    checksum: gbVatChecksum,
  },
  {
    code: 'EU_VAT',
    label: 'VAT number (EU)',
    countries: ['DE', 'FR', 'NL', 'IE', 'ES', 'IT', 'BE', 'PL', 'SE', 'DK', 'FI', 'AT', 'PT'],
    re: /^[A-Z]{2}[0-9A-Z]{2,12}$/,
    placeholder: 'DE123456789',
  },
  {
    code: 'US_EIN',
    label: 'EIN (US)',
    countries: ['US'],
    re: /^\d{9}$/,
    placeholder: '12-3456789',
    checksum: usEinChecksum,
  },
  {
    code: 'AU_ABN',
    label: 'ABN (Australia)',
    countries: ['AU'],
    re: /^\d{11}$/,
    placeholder: '51824753556',
    checksum: auAbnChecksum,
  },
  {
    code: 'SG_UEN',
    label: 'UEN (Singapore)',
    countries: ['SG'],
    re: /^[0-9]{8,9}[A-Z]$|^[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]$/,
    placeholder: '201912345K',
  },
  {
    code: 'CA_BN',
    label: 'Business Number (Canada)',
    countries: ['CA'],
    re: /^\d{9}(RT\d{4})?$/,
    placeholder: '123456789RT0001',
  },
  {
    /**
     * The honest option. A free-text field with no regex is better than a regex
     * invented for a country nobody here has billed — a rule that rejects a
     * valid number is worse than no rule, because it blocks a real invoice.
     */
    code: 'OTHER',
    label: 'Other registration',
    countries: [],
    re: /^.{1,40}$/,
    placeholder: 'Registration number',
  },
] as const;

export const TAX_ID_TYPE_CODES = TAX_ID_TYPES.map((t) => t.code);

export function taxIdType(code: string | undefined): TaxIdType | null {
  if (!code) return null;
  return TAX_ID_TYPES.find((t) => t.code === code) ?? null;
}

/** The identifier a country usually issues, for defaulting the picker. */
export function taxIdTypeForCountry(iso2: string | undefined): string {
  if (!iso2) return 'OTHER';
  const upper = iso2.toUpperCase();
  return TAX_ID_TYPES.find((t) => t.countries.includes(upper))?.code ?? 'OTHER';
}

/** Why this identifier is wrong for its type, or null. */
export function taxIdError(code: string | undefined, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const spec = taxIdType(code);
  if (!spec) return 'Choose which kind of registration this is.';

  const normalised = spec.code === 'OTHER' ? trimmed : bare(trimmed);
  if (!spec.re.test(normalised)) {
    return `Expected ${spec.label} like ${spec.placeholder}.`;
  }
  if (spec.checksum && !spec.checksum(normalised)) {
    return `This ${spec.label} fails its check digit — one character is mistyped.`;
  }
  return null;
}
