/**
 * The Service Quotation: its shapes, its arithmetic and its fixed copy.
 *
 * A quotation is a **fixed-page** document, not a flowing one. It is one page
 * per service, an optional add-on page after each, a recurring-infrastructure
 * page carrying the summary, a details page and a contact page. That structure
 * is why a service is a record here rather than a `section` string on a flat
 * line list: the page break is the service boundary, and an add-on list has to
 * belong to the service it extends.
 *
 * Deliberately not `computeTotals` (money.ts): a quotation is not a tax
 * invoice. There is no place of supply, no CGST/SGST split and no legal GST
 * position. The listed prices are **inclusive of tax**, which is why nothing
 * here computes GST at all — 'Inclusive of Tax (GST 18%)' is a sentence the
 * sheet prints, not a figure it derives.
 */

import { formatINR, lineAmountPaise } from "./money";
import type { LineItem } from "./types";

/**
 * Money as a quotation prints it: '₹ 20,000' rather than '₹ 20,000.00'.
 *
 * A quotation is a sales document of round estimates, and '.00' on every figure
 * is noise a reader has to look past. The paise are kept whenever they are
 * non-zero, which is not a nicety — a per-message rate really is ₹ 0.15, and
 * rounding it away would print a price nobody is charged.
 */
export function formatQuote(paise: number): string {
  const full = formatINR(paise);
  return paise % 100 === 0 ? full.slice(0, -3) : full;
}

/** '₹ 4,570' when the ends agree, '₹ 4,570 - ₹ 8,070' when they do not. */
export function formatQuoteRange(minPaise: number, maxPaise: number): string {
  return minPaise === maxPaise
    ? formatQuote(minPaise)
    : `${formatQuote(minPaise)} - ${formatQuote(maxPaise)}`;
}

/** One quoted service: its own page, its deliverables, and its add-ons. */
export interface QuotationService {
  name: string;
  /** Free prose written for this prospect, printed under the service name. */
  blurb?: string;
  lines: LineItem[];
  /** Priced separately and printed on their own page. Empty means no add-on page. */
  addOns: LineItem[];
}

/**
 * A row on the recurring-infrastructure page.
 *
 * Three shapes of value have to fit here, which is why the amount is three
 * optional fields rather than one number: a flat monthly cost (₹2,870), a range
 * whose real figure depends on usage (₹1,500 - ₹5,000), and a value that is not
 * money at all ('2% + GST'). `amountNote` is the escape hatch for the third,
 * and setting it takes the row out of the fixed total, because a percentage of
 * an unknown cannot be summed.
 */
export interface RecurringLine {
  description: string;
  detail?: string;
  /** Free text; the presets are in the editor. Only 'Monthly' is summable. */
  frequency: string;
  amountPaise?: number;
  /** The top of a range. Absent means the amount is exact. */
  amountMaxPaise?: number;
  /** Printed instead of the money when set, e.g. '2% + GST'. */
  amountNote?: string;
}

/** The one frequency the fixed portion can be stated in. See `fixedPortion`. */
export const MONTHLY = "Monthly";

/** Offered by the editor's frequency picker; free text is still accepted. */
export const RECURRING_FREQUENCIES = [
  MONTHLY,
  "Quarterly",
  "Annually",
  "Per transaction",
  "Per message",
] as const;

export interface QuotationServiceTotal {
  name: string;
  basePaise: number;
  addOnPaise: number;
  totalPaise: number;
}

export interface QuotationTotals {
  services: QuotationServiceTotal[];
  /** Σ of every service's base + add-ons. What the payment phases are cut from. */
  oneTimePaise: number;
  /**
   * The summable part of the recurring page. `maxPaise` equals `minPaise`
   * unless some row carried a range, which is how the sheet knows whether to
   * print one figure or two.
   */
  recurringFixed: { minPaise: number; maxPaise: number };
  /** `oneTimePaise` plus the *low* end of the recurring estimate. */
  totalPaise: number;
}

const sum = (lines: LineItem[]) =>
  lines.reduce((total, line) => total + lineAmountPaise(line), 0);

/**
 * A row counts toward the fixed portion only if it is a flat monthly figure.
 *
 * Per-transaction and per-message rows vary with usage the studio cannot
 * predict, and a row carrying an `amountNote` is not money. Summing either
 * would put a number on the summary that no month will actually match.
 */
function fixedPortion(recurring: RecurringLine[]) {
  let minPaise = 0;
  let maxPaise = 0;
  for (const row of recurring) {
    if (row.frequency !== MONTHLY) continue;
    if (row.amountNote || row.amountPaise === undefined) continue;
    minPaise += row.amountPaise;
    maxPaise += row.amountMaxPaise ?? row.amountPaise;
  }
  return { minPaise, maxPaise };
}

export function computeQuotationTotals(
  services: QuotationService[],
  recurring: RecurringLine[],
): QuotationTotals {
  const perService = services.map((service) => {
    const basePaise = sum(service.lines);
    const addOnPaise = sum(service.addOns);
    return {
      name: service.name,
      basePaise,
      addOnPaise,
      totalPaise: basePaise + addOnPaise,
    };
  });

  const oneTimePaise = perService.reduce((total, s) => total + s.totalPaise, 0);
  const recurringFixed = fixedPortion(recurring);

  return {
    services: perService,
    oneTimePaise,
    recurringFixed,
    totalPaise: oneTimePaise + recurringFixed.minPaise,
  };
}

export interface PaymentPhase {
  label: string;
  percent: number;
}

/** ₹1,00,000 and ₹3,00,000, in paise — the two band boundaries below. */
const ONE_LAKH_PAISE = 100_00_000;
const THREE_LAKH_PAISE = 300_00_000;

/**
 * The payment schedule, cut from the **one-time** figure rather than the grand
 * total: recurring tooling is billed monthly at cost as it is incurred, so it
 * is never phased.
 *
 * Three bands, each a fixed template. Nothing here is editable per document —
 * a schedule the operator retypes per quote is a schedule that drifts, and the
 * band the total lands in is derived (`PRINCIPLES.md` rule 3).
 *
 * The four-phase band exists because at this size the build phase alone runs
 * for months, and a single 30% tail means carrying a third of the project
 * through its longest stretch. Splitting it keeps unpaid exposure at or under
 * 25% at every point, while the client still pays no more than 30% before
 * seeing work.
 */
export function paymentPhases(oneTimePaise: number): PaymentPhase[] {
  if (oneTimePaise < ONE_LAKH_PAISE) {
    return [
      { label: "Advance on signing contract", percent: 50 },
      { label: "Balance prior launch", percent: 50 },
    ];
  }
  if (oneTimePaise < THREE_LAKH_PAISE) {
    return [
      { label: "Advance on signing contract", percent: 35 },
      { label: "Design delivery", percent: 35 },
      { label: "Balance prior launch", percent: 30 },
    ];
  }
  return [
    { label: "Advance on signing contract", percent: 30 },
    { label: "Design delivery", percent: 25 },
    { label: "Build handover (staging)", percent: 25 },
    { label: "Balance prior launch", percent: 20 },
  ];
}

// ── Fixed copy ────────────────────────────────────────────────────────────
//
// Studio wording, the same on every quotation, so it lives here rather than in
// `content` (`CONTEXT.md` §5b covers what is per-document and editable; none of
// this is). Changing a sentence here changes it on the next quotation and on
// nothing already finalized, because finalize materialises what it printed.

export const QUOTATION_COVER_BLURB =
  "This document contains a list of services and respective quotation estimates for web design and development. A tailored scope and pricing for the work discussed, prepared by Qera Studio.";

export const QUOTATION_OFFER_LINE =
  "We are pleased to submit our offer for the above mentioned project.";

/** Printed under every deliverables table's One-time Total. */
export const QUOTATION_TAX_NOTE = "Inclusive of Tax (GST 18%)";

/** Four clauses, printed in a 2×2 grid. Not editable per document. */
export const QUOTATION_TERMS = [
  "This quote covers exactly what's listed above. Anything extra we scope and price separately, together.",
  "Feedback within 3 working days at each stage keeps us on schedule.",
  "Ongoing tools (hosting, WhatsApp automation, etc.) are billed at actual cost and continue on a simple monthly basis after launch.",
  "This quote is valid for 14 days.",
] as const;

/** Salutations offered on the cover. A person, not a company, is addressed. */
export const SALUTATIONS = ["Mr", "Mrs", "Miss", "Mx"] as const;
export type Salutation = (typeof SALUTATIONS)[number];
