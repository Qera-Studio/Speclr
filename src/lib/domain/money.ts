/**
 * Money math for admin documents. All amounts are integer paise end-to-end —
 * floats only ever appear transiently (qty multiplication, GST percentage) and
 * are rounded half-up back to integer paise immediately.
 */

import { currencyByCode, type CurrencyCode } from "./currency";
import type { DocTotals, LineItem } from "./types";

function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

export function lineAmountPaise(item: LineItem): number {
  return roundHalfUp(item.ratePaise * item.qty);
}

/**
 * A discount off the taxable value, however it was typed.
 *
 * Both forms land on the same figure, because they are the same thing: a
 * percentage is a faster way to write an amount. Whichever is set, GST is
 * charged on what is left (CGST s.15(3)(a)), which is why there is no way to
 * express one that comes off the gross.
 */
export interface Discount {
  discountPercent?: number;
  discountPaise?: number;
}

/**
 * What the discount comes to in paise, clamped to the subtotal.
 *
 * The clamp is not defensive tidiness: a taxable value below zero would put a
 * negative through the GST arithmetic and print a tax invoice charging tax on
 * less than nothing. A discount larger than the bill is a typo, and the honest
 * reading of it is "the whole bill".
 */
export function discountPaiseOf(
  subtotalPaise: number,
  discount?: Discount,
): number {
  if (!discount) return 0;
  const raw =
    discount.discountPercent !== undefined
      ? roundHalfUp((subtotalPaise * discount.discountPercent) / 100)
      : (discount.discountPaise ?? 0);
  return Math.min(Math.max(raw, 0), subtotalPaise);
}

export function computeTotals(
  lineItems: LineItem[],
  gstRatePercent: number,
  discount?: Discount,
): DocTotals {
  const subtotalPaise = lineItems.reduce(
    (sum, item) => sum + lineAmountPaise(item),
    0,
  );
  const discountPaise = discountPaiseOf(subtotalPaise, discount);
  const taxablePaise = subtotalPaise - discountPaise;
  const gstPaise = roundHalfUp((taxablePaise * gstRatePercent) / 100);
  return {
    subtotalPaise,
    discountPaise,
    taxablePaise,
    gstPaise,
    totalPaise: taxablePaise + gstPaise,
  };
}

/**
 * A slip's gross, total deductions and net.
 *
 * A pay slip is `gross − deductions = net`, which is the shape a statutory wage
 * slip has to print (Payment of Wages Rules Form IV). A stipend slip passes no
 * deductions and its net equals its gross, so the same helper serves both.
 *
 * Net can legitimately reach zero — a full loss-of-pay month with a recovery —
 * but never goes below it: no lawful set of deductions leaves an employee owing
 * wages back, so a negative net is a data-entry error, and clamping would hide
 * it. It is surfaced instead, and the editor is what stops it being saved.
 */
export function slipTotals(
  lineItems: LineItem[],
  deductions: LineItem[] = [],
): { grossPaise: number; deductionsPaise: number; netPaise: number } {
  const grossPaise = lineItems.reduce(
    (sum, item) => sum + lineAmountPaise(item),
    0,
  );
  const deductionsPaise = deductions.reduce(
    (sum, item) => sum + lineAmountPaise(item),
    0,
  );
  return {
    grossPaise,
    deductionsPaise,
    netPaise: grossPaise - deductionsPaise,
  };
}

/**
 * Splits a GST amount into CGST + SGST halves for intra-state supplies.
 * CGST takes the floor so the two always sum exactly to the original.
 */
export function splitGST(gstPaise: number): {
  cgstPaise: number;
  sgstPaise: number;
} {
  if (!Number.isInteger(gstPaise) || gstPaise < 0) {
    throw new Error(
      `splitGST expects a non-negative integer paise amount, got: ${gstPaise}`,
    );
  }
  const cgstPaise = Math.floor(gstPaise / 2);
  return { cgstPaise, sgstPaise: gstPaise - cgstPaise };
}

const inrIntegerFormat = new Intl.NumberFormat("en-IN");

/** 12345678 → '₹ 1,23,456.78' (Indian digit grouping, always 2 decimals). */
export function formatINR(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(
      `formatINR expects a non-negative integer paise amount, got: ${paise}`,
    );
  }
  const rupees = Math.floor(paise / 100);
  const fraction = String(paise % 100).padStart(2, "0");
  return `₹ ${inrIntegerFormat.format(rupees)}.${fraction}`;
}

/**
 * Format a minor-unit integer in `currency`, e.g. 250000 + 'USD' → '$ 2,500.00'.
 *
 * INR delegates to `formatINR` so its output stays byte-identical (Indian digit
 * grouping, the '₹ ' prefix); everything else uses the locale's own grouping
 * with the currency's symbol. Only the stipend slip is currency-aware —
 * invoices and receipts call `formatINR` directly. See `currency.ts`.
 */
export function formatMoney(
  minor: number,
  currency: CurrencyCode = "INR",
): string {
  if (currency === "INR") return formatINR(minor);
  if (!Number.isInteger(minor) || minor < 0) {
    throw new Error(
      `formatMoney expects a non-negative integer minor amount, got: ${minor}`,
    );
  }
  const spec = currencyByCode(currency);
  if (!spec) return formatINR(minor);

  const whole = Math.floor(minor / 100);
  const fraction = String(minor % 100).padStart(2, "0");
  // Group the integer part only, then append the fraction from string math —
  // never divide by 100 into a float.
  const grouped = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(whole);
  return `${spec.symbol} ${grouped}.${fraction}`;
}

/**
 * Parse a form input of decimal rupees ('1500', '1500.5', '1500.50') into
 * integer paise via string math — no float parsing, no drift.
 * Returns null for anything invalid (empty, negative, >2 decimals, non-numeric).
 */
export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/**
 * Keeps only what `rupeesToPaise` can parse: digits and a single decimal point,
 * capped at two decimal places. The transform-on-keystroke rule from
 * `normalizeIfscInput` — never hold a value the parser will reject.
 */
export function normalizeRupeeInput(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

/**
 * '1234567.5' → '12,34,567.5' — display grouping for a rupee input.
 *
 * Indian grouping, matching `formatINR` above: the same amount must not be
 * punctuated one way in a filter and another way in the table beside it. Only
 * the whole part is grouped, and the string is otherwise passed through — a
 * half-typed '12.' stays '12.' so the decimal point survives being typed.
 */
export function groupRupeeInput(input: string): string {
  const [whole, fraction] = input.split(".");
  const grouped = whole ? inrIntegerFormat.format(Number(whole)) : "";
  return input.includes(".") ? `${grouped}.${fraction ?? ""}` : grouped;
}

/** 150050 → '1500.50' — plain decimal string for form inputs (no grouping/symbol). */
export function paiseToRupees(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(
      `paiseToRupees expects a non-negative integer paise amount, got: ${paise}`,
    );
  }
  const rupees = Math.floor(paise / 100);
  const fraction = String(paise % 100).padStart(2, "0");
  return `${rupees}.${fraction}`;
}
