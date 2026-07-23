/**
 * Money math for admin documents. All amounts are integer paise end-to-end —
 * floats only ever appear transiently (qty multiplication, GST percentage) and
 * are rounded half-up back to integer paise immediately.
 */

import type { DocTotals, LineItem } from './types';

function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

export function lineAmountPaise(item: LineItem): number {
  return roundHalfUp(item.ratePaise * item.qty);
}

export function computeTotals(lineItems: LineItem[], gstRatePercent: number): DocTotals {
  const subtotalPaise = lineItems.reduce((sum, item) => sum + lineAmountPaise(item), 0);
  const gstPaise = roundHalfUp((subtotalPaise * gstRatePercent) / 100);
  return { subtotalPaise, gstPaise, totalPaise: subtotalPaise + gstPaise };
}

/**
 * Splits a GST amount into CGST + SGST halves for intra-state supplies.
 * CGST takes the floor so the two always sum exactly to the original.
 */
export function splitGST(gstPaise: number): { cgstPaise: number; sgstPaise: number } {
  if (!Number.isInteger(gstPaise) || gstPaise < 0) {
    throw new Error(`splitGST expects a non-negative integer paise amount, got: ${gstPaise}`);
  }
  const cgstPaise = Math.floor(gstPaise / 2);
  return { cgstPaise, sgstPaise: gstPaise - cgstPaise };
}

const inrIntegerFormat = new Intl.NumberFormat('en-IN');

/** 12345678 → '₹ 1,23,456.78' (Indian digit grouping, always 2 decimals). */
export function formatINR(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`formatINR expects a non-negative integer paise amount, got: ${paise}`);
  }
  const rupees = Math.floor(paise / 100);
  const fraction = String(paise % 100).padStart(2, '0');
  return `₹ ${inrIntegerFormat.format(rupees)}.${fraction}`;
}

/**
 * Parse a form input of decimal rupees ('1500', '1500.5', '1500.50') into
 * integer paise via string math — no float parsing, no drift.
 * Returns null for anything invalid (empty, negative, >2 decimals, non-numeric).
 */
export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** 150050 → '1500.50' — plain decimal string for form inputs (no grouping/symbol). */
export function paiseToRupees(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`paiseToRupees expects a non-negative integer paise amount, got: ${paise}`);
  }
  const rupees = Math.floor(paise / 100);
  const fraction = String(paise % 100).padStart(2, '0');
  return `${rupees}.${fraction}`;
}
