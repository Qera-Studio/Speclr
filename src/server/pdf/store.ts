import 'server-only';

import { put } from '@vercel/blob';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';
import type { AdminDocument } from '@/lib/domain/types';
import { renderPdf } from './render';
import { printUrlFor } from './url';

/**
 * Where a finalized document's PDF lives, and the one rule about it.
 *
 * **Rendered once, at finalize, and never again.** A finalized document is
 * immutable (`CONTEXT.md` §4) and retained 72 months (CGST s.36). The content
 * is already frozen by `studioSnapshot` / `materialiseContent`, but the
 * *rendering* was not: generating on every download means a Tailwind or font
 * change quietly produces a different-looking PDF of the same legal record.
 * Storing the bytes makes the PDF the record.
 *
 * **Private, like every other blob here.** Same rule as client attachments
 * (`CONTEXT.md` §5d): there is no public URL, and the only route to these bytes
 * checks the session first. A tax invoice carries the client's legal name,
 * GSTIN, registered address and what they were billed.
 *
 * **The key is derived, never stored.** `documents/{id}.pdf` follows from the
 * document id, so a column holding it would be a second place for the same
 * fact to live and disagree (`PRINCIPLES.md` rule 3).
 */

/** The blob key for one document's PDF. Derived from the id; never stored. */
export function pdfKey(documentId: string): string {
  return `documents/${documentId}.pdf`;
}

/**
 * Render one document to PDF and store it.
 *
 * `cookie` is the caller's own session cookie, forwarded to the headless
 * browser so it may fetch the print page exactly as that caller could. See
 * `render.ts` for why a real browser is required at all.
 *
 * Throws on failure. Both callers deliberately treat that differently:
 * finalize swallows it (the serial is already claimed and the document is the
 * record), and download retries it.
 */
export async function renderAndStorePdf(
  documentId: string,
  printUrl: string,
  cookie: string,
): Promise<Buffer> {
  const bytes = await renderPdf(printUrl, cookie);
  await put(pdfKey(documentId), bytes, {
    access: 'private',
    // The key must be exactly what we can read back and delete.
    addRandomSuffix: false,
    contentType: 'application/pdf',
    // Overwrite rather than fail: a re-render of the same finalized document
    // produces the same document, and the alternative is a stuck retry.
    allowOverwrite: true,
  });
  return bytes;
}

/**
 * Render and store, but never throw.
 *
 * The finalize path. A burned GST serial is an accounting event somebody
 * reconciles by hand, so a renderer that is cold, out of memory, or broken by
 * a Chrome bump must not be able to fail a finalize. The document is the
 * record; the PDF is a rendering of it, and the download route renders it on
 * demand if it is missing.
 */
export async function storePdfQuietly(doc: AdminDocument): Promise<void> {
  try {
    // The request context is read here rather than by the caller: finalize is
    // about what a document records, and which cookie a headless browser needs
    // is this module's problem.
    const cookie = (await headers()).get('cookie') ?? '';
    await renderAndStorePdf(doc.id, await printUrlFor(doc), cookie);
  } catch (err) {
    logger.error({
      action: 'storePdf',
      event: 'render_failed',
      documentId: doc.id,
      error: err,
    });
  }
}
