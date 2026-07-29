/**
 * Date helpers for admin documents. Dates are stored as ISO 'YYYY-MM-DD'
 * strings and parsed by parts — never via `new Date(isoString)` — so document
 * dates can never shift across timezones.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** Local calendar date as 'YYYY-MM-DD' — the default issueDate for new drafts. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 'YYYY-MM-DD' → a local-midnight Date, for handing to a calendar widget.
 * Returns null for empty or malformed input so optional date fields work.
 *
 * Built from parts on purpose: `new Date('2026-07-21')` parses as UTC midnight,
 * which is the *previous day* anywhere west of Greenwich. On a document that
 * would silently shift the issue date — and the issue date decides which
 * financial year the document numbers into (see financialYearStart).
 */
export function isoToLocalDate(isoDate: string): Date | null {
  if (!isoDate || !isISODate(isoDate)) return null;
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const date = new Date(year, month - 1, day);
  // Reject impossible dates that the regex lets through, e.g. '2026-02-31'
  // (which JS would roll forward to 3rd March).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * A Date → 'YYYY-MM-DD', read off its *local* calendar fields.
 * Never use `toISOString().slice(0, 10)` here — that converts to UTC first and
 * shifts the day for anyone in a negative-offset timezone.
 */
export function localDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** '2026-07-21' → '21 Jul 2026'. Throws on malformed input (caller bug). */
export function formatDisplayDate(isoDate: string): string {
  const match = ISO_DATE_RE.exec(isoDate);
  if (!match || !isISODate(isoDate)) {
    throw new Error(`formatDisplayDate expects 'YYYY-MM-DD', got: ${isoDate}`);
  }
  const day = Number(match[3]);
  const month = MONTHS[Number(match[2]) - 1];
  return `${day} ${month} ${match[1]}`;
}

/** '2026-07-21' → 2026. The numbering year comes from the document's issueDate. */
export function yearOfISODate(isoDate: string): number {
  if (!isISODate(isoDate)) {
    throw new Error(`yearOfISODate expects 'YYYY-MM-DD', got: ${isoDate}`);
  }
  return Number(isoDate.slice(0, 4));
}

/**
 * Indian financial-year start year for a given date. The FY runs April→March,
 * so Apr–Dec belong to the calendar year they fall in, and Jan–Mar belong to
 * the previous calendar year's FY. '2026-05-01' → 2026 (FY 2026-27);
 * '2026-02-01' → 2025 (FY 2025-26). Used for GST-compliant invoice numbering.
 */
export function financialYearStart(isoDate: string): number {
  if (!isISODate(isoDate)) {
    throw new Error(`financialYearStart expects 'YYYY-MM-DD', got: ${isoDate}`);
  }
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  return month >= 4 ? year : year - 1;
}

/**
 * Compact financial-year code from the FY start year, e.g. 2025 → '2526'
 * (FY 2025-26). This is the year token used in document numbers.
 */
export function financialYearCode(fyStart: number): string {
  if (!Number.isInteger(fyStart) || fyStart < 2000 || fyStart > 9998) {
    throw new Error(`financialYearCode expects a 4-digit start year, got: ${fyStart}`);
  }
  const start = String(fyStart).slice(-2);
  const end = String(fyStart + 1).slice(-2);
  return `${start}${end}`;
}

/** '2026-05-01' → '2627', '2026-02-01' → '2526'. Convenience for numbering. */
export function financialYearCodeOfISODate(isoDate: string): string {
  return financialYearCode(financialYearStart(isoDate));
}
