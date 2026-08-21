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
  /**
   * How the number is conventionally written, applied as it is typed.
   *
   * An EIN is `83-0000000` on the IRS letter that carries it, and a field that
   * shows that as a placeholder and then accepts `830000000` is telling the
   * reader two different things about one value. See the input rules in
   * `AGENTS.md`.
   *
   * Sparse on purpose. Only the identifiers with a **published** grouping get
   * one; a UAE TRN and a Singapore UEN are written as a run of characters, and
   * inventing a grouping for them would be the same mistake as inventing a
   * check digit. EU VAT is left alone for a stronger reason: the grouping
   * differs per member state, so one rule here would be wrong in 26 of 27
   * countries.
   *
   * Must be **idempotent and prefix-safe**: it runs on every keystroke against
   * a value it has already formatted, and against half a number. Every one
   * below strips its own separators first, which is also why `bare()` in
   * `taxIdError` makes a formatted value and a pasted bare one the same value.
   */
  format?: (value: string) => string;
}

/** Groups digits by the given run lengths, dropping empty trailing groups. */
function group(digits: string, sizes: number[], sep = ' '): string {
  const out: string[] = [];
  let rest = digits;
  for (const size of sizes) {
    if (!rest) break;
    out.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  // Anything past the last group stays put rather than being dropped: the
  // format decorates, it never truncates, and the length check is the rule's
  // job.
  if (rest) out.push(rest);
  return out.join(sep);
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
    placeholder: 'GB 123 4567 89',
    checksum: gbVatChecksum,
    // HMRC prints it 3-4-2, with or without the country prefix. The prefix is
    // kept when it was typed and never added, because plenty of clients quote
    // the number without it.
    format: (value) => {
      const bared = bare(value);
      const prefixed = bared.startsWith('GB');
      const digits = (prefixed ? bared.slice(2) : bared).replace(/\D/g, '');
      const grouped = group(digits, [3, 4, 2]);
      return prefixed ? `GB ${grouped}`.trimEnd() : grouped;
    },
  },
  {
    code: 'EU_VAT',
    label: 'VAT number (EU)',
    // All 27, not the dozen that were here. A half-listed union is a client in
    // Greece being offered "Other registration" for a number the EU issues in
    // one documented format, and the picker now filters on this list, so a
    // missing member state is a missing option rather than a missing default.
    countries: [
      'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
      'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
    ],
    re: /^[A-Z]{2}[0-9A-Z]{2,12}$/,
    placeholder: 'DE123456789',
  },
  {
    code: 'US_EIN',
    label: 'EIN (US)',
    countries: ['US'],
    re: /^\d{9}$/,
    placeholder: '83-0000000',
    checksum: usEinChecksum,
    // Two digits, a hyphen, seven digits. It is on the IRS letter that way and
    // on every W-9 that way.
    format: (value) => group(bare(value).replace(/\D/g, ''), [2], '-'),
  },
  {
    code: 'AU_ABN',
    label: 'ABN (Australia)',
    countries: ['AU'],
    re: /^\d{11}$/,
    placeholder: '51 824 753 556',
    checksum: auAbnChecksum,
    // The ATO's own 2-3-3-3.
    format: (value) => group(bare(value).replace(/\D/g, ''), [2, 3, 3, 3]),
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

/**
 * The types worth offering for a country: its own, then the honest fallback.
 *
 * A client in Australia has an ABN. Listing a UAE TRN, a US EIN and a Canadian
 * Business Number beside it is not a choice anybody makes — it is seven ways to
 * file the number wrongly, and the wrong one silently changes which check digit
 * runs against it. The country is already on the record, so this follows from
 * it (`PRINCIPLES.md` rule 3).
 *
 * `OTHER` is always last and always there. It is what a country this table does
 * not name answers with, and it is the escape hatch for a client who really
 * does hold a registration from somewhere else — a UK company registered for
 * VAT in Ireland, say. Nothing is hidden that cannot be reached.
 */
export function taxIdTypesForCountry(iso2: string | undefined): readonly TaxIdType[] {
  const upper = (iso2 ?? '').toUpperCase();
  const own = TAX_ID_TYPES.filter((t) => t.countries.includes(upper));
  const other = TAX_ID_TYPES.filter((t) => t.code === 'OTHER');
  return [...own, ...other];
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
