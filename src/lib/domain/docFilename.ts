import { DOC_TYPES, isSlip } from './registry';
import type { AdminDocument, LetterDocument } from './types';

/**
 * What a document is called when it leaves the app.
 *
 * One home, because three callers need the same answer and a filename that
 * differs between them is the same document arriving under two names: the
 * print view's tab title (which is what the browser's Save-as-PDF offers), the
 * stored PDF's download header, and anything later that mails one out.
 * `PRINCIPLES.md` rule 1 — used by more than one caller, so it gets its own
 * home rather than living in whichever surface reached for it first.
 *
 * A finalized numbered document is called by its number, which is the whole
 * point of the number: `QS-INV-2627-001` is how it is filed, referenced in a
 * return, and found again in 2032. Everything else falls back to a description,
 * because a draft has no number to be called by.
 */

const slug = (s: string) => s.replace(/\s+/g, '-');

function isLetter(doc: AdminDocument): doc is LetterDocument {
  return doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT';
}

/** The filename for a document, without extension. */
export function docFilename(doc: AdminDocument): string {
  const spec = DOC_TYPES[doc.type];

  // Sequential, each branch narrowing `doc` — the same order as `PrintRoute`,
  // which is where this logic used to live.
  if (isSlip(doc)) {
    return (
      doc.number ?? `${slug(spec.label)}-${slug(doc.employeeSnapshot.name)}-${doc.issueDate}`
    );
  }
  if (isLetter(doc)) {
    // Letters are never numbered: nothing files them by reference.
    return `${slug(spec.label)}-${slug(doc.employeeSnapshot.name)}-${doc.issueDate}`;
  }
  if (doc.type === 'CON') {
    // `doc.number` first, which the print route did not do. A contract *is*
    // numbered (`QS-CON-2627-nnn`, claimed from the same atomic counter as
    // everything else), so a finalized one was leaving as
    // 'Contract-Clayora-2026-08-29' while every other finalized document left
    // under its number. Same rule everywhere: numbered means called by it.
    return doc.number ?? `Contract-${slug(doc.clientSnapshot.name)}-${doc.issueDate}`;
  }
  if (doc.type === 'QTN') {
    return doc.number ?? `Quotation-${slug(doc.recipientName ?? doc.issueDate)}`;
  }
  return doc.number ?? `${spec.code}-draft`;
}
