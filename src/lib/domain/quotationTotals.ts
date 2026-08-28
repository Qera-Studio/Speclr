/**
 * Totals for a Service Quotation — grouped by section, with recurring lines
 * excluded and an optional flat GST estimate. Deliberately not `computeTotals`
 * (money.ts): a quotation is not a tax invoice, so there is no place of
 * supply, no CGST/SGST split and no legal GST position — just a flat 18%
 * estimate shown for an Indian prospect and disclaimed as such on the sheet.
 */

import { lineAmountPaise } from "./money";
import type { LineItem } from "./types";

/** Flat estimate rate. Not derived from anywhere — see the module note above. */
export const QUOTATION_GST_ESTIMATE_PERCENT = 18;

function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

export interface QuotationSection {
  name: string;
  lines: LineItem[];
  subtotalPaise: number;
}

export interface QuotationTotals {
  sections: QuotationSection[];
  /** Recurring lines, in document order — shown as a note, never summed in. */
  recurringLines: LineItem[];
  /** Sum of every section's subtotal — excludes recurring lines. */
  subtotalPaise: number;
  /** 0 unless `gstCountry === "IN"`. */
  gstPaise: number;
  totalPaise: number;
}

/**
 * Groups line items into consecutive same-`section` runs (an unlabelled line
 * gets its own run under an empty-string heading, which the sheet renders
 * without a heading row), excludes `recurring` lines from every subtotal, and
 * applies the flat estimate only for an Indian recipient.
 */
export function computeQuotationTotals(
  lineItems: LineItem[],
  gstCountry: "IN" | "INTL",
): QuotationTotals {
  const sections: QuotationSection[] = [];
  const recurringLines: LineItem[] = [];

  for (const item of lineItems) {
    if (item.recurring) {
      recurringLines.push(item);
      continue;
    }
    const name = item.section ?? "";
    const last = sections[sections.length - 1];
    if (last && last.name === name) {
      last.lines.push(item);
      last.subtotalPaise += lineAmountPaise(item);
    } else {
      sections.push({ name, lines: [item], subtotalPaise: lineAmountPaise(item) });
    }
  }

  const subtotalPaise = sections.reduce((sum, s) => sum + s.subtotalPaise, 0);
  const gstPaise =
    gstCountry === "IN"
      ? roundHalfUp((subtotalPaise * QUOTATION_GST_ESTIMATE_PERCENT) / 100)
      : 0;

  return {
    sections,
    recurringLines,
    subtotalPaise,
    gstPaise,
    totalPaise: subtotalPaise + gstPaise,
  };
}
