import { financialYearStart, isISODate } from './dates';

/**
 * The last day a credit note can reduce the tax on an invoice: 30 November
 * after the end of the invoice's financial year (CGST s.34(2)). The section
 * also says "or the date of furnishing the annual return, if earlier", which
 * depends on when the return is actually filed, so this is the latest it can
 * be, not a promise.
 *
 * A note issued after it is still a lawful commercial document; it just no
 * longer reduces output tax, so the editor warns rather than refuses
 * (founder's decision, 19 October 2026).
 */
export function creditNoteDeadline(invoiceDate: string): string | null {
  if (!isISODate(invoiceDate)) return null;
  return `${financialYearStart(invoiceDate) + 1}-11-30`;
}

/** Whether a note dated `issueDate` is past that day. */
export function creditNoteIsLate(invoiceDate: string, issueDate: string): boolean {
  const deadline = creditNoteDeadline(invoiceDate);
  return deadline !== null && isISODate(issueDate) && issueDate > deadline;
}
