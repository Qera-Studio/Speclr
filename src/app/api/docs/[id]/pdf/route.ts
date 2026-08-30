import { get } from '@vercel/blob';
import { authorized } from '@/server/actions/authGate';
import { getDocument } from '@/db/store';
import { docFilename } from '@/lib/domain/docFilename';
import { logger } from '@/lib/logger';
import { pdfKey, renderAndStorePdf } from '@/server/pdf/store';
import { printUrlFor } from '@/server/pdf/url';
import { headers } from 'next/headers';

/**
 * Download one finalized document as a PDF.
 *
 * **The only route to these bytes.** The blob is stored private, exactly like a
 * client attachment (`CONTEXT.md` §5d), so there is no URL that works without
 * coming through here, and here checks the session first. An invoice carries
 * the client's legal name, GSTIN, registered address and what they were
 * billed; an unguessable public link is not access control.
 *
 * **Finalized only.** A draft has no number to be called by, is not a record,
 * and is still being edited — a PDF of one would be a snapshot of nothing.
 * Drafts keep Edit and Delete; the download appears on finalized rows.
 *
 * **The bytes were rendered at finalize.** Serving a stored file is the whole
 * point: it is instant, and it is byte-identical every time it is fetched,
 * which is what a record retained 72 months (CGST s.36) requires. Rendering
 * here at all is the fallback for a finalize whose render failed (see
 * `storePdfQuietly`), and it stores the result so it happens at most once.
 *
 * Every failure returns 404, including "not authorized". Distinguishing "you
 * may not" from "it does not exist" tells an unauthenticated caller which
 * document ids are real.
 */

/** Reads the live session and a live row on every request; never cached. */
export const dynamic = 'force-dynamic';

/** Rendering is the cold path, and Chromium needs room to boot. */
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const notFound = new Response('Not found', { status: 404 });

  const { id } = await params;
  if (!id) return notFound;

  /**
   * The three lookups run together, and this is the difference between a
   * download that feels instant and one that does not.
   *
   * Serially they were ~1.5s before a byte moved, measured from Dubai:
   * `authorized()` makes an HTTP call to Clerk's API (~690ms), `getDocument()`
   * reaches Neon in us-east-1 (~220ms warm, 1.5s cold), and the blob read is
   * another 50-400ms. None of them needs another's answer — the blob key is
   * derived from the id alone — so the wall-clock cost is now the slowest one
   * rather than the sum.
   *
   * **Nothing is served before the gate.** Starting the reads early is not the
   * same as trusting them: every branch below still refuses on `!ok`, and the
   * blob stream is discarded unread if it does. The alternative, waiting for
   * auth to finish before *beginning* to look, buys no security and costs the
   * latency of the two calls it serialises.
   */
  const [ok, doc, stored] = await Promise.all([
    authorized(),
    getDocument(id),
    // Absent, or unreadable. Either way the answer is to render it below.
    get(pdfKey(id), { access: 'private' }).catch((err: unknown) => {
      logger.warn({ action: 'downloadPdf', event: 'stored_read_failed', documentId: id, error: err });
      return null;
    }),
  ]);

  if (!ok) return notFound;
  if (!doc) return notFound;
  // Not 403: a draft's PDF genuinely does not exist.
  if (doc.status !== 'finalized') return notFound;

  const filename = `${docFilename(doc)}.pdf`;

  // `attachment` rather than `inline`: this is a download, and the browser
  // saves it under this name with no dialog. That is the whole feature — a
  // print dialog cannot be skipped, but a file arriving from a server is
  // simply saved.
  const serve = (body: BodyInit) =>
    new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // The filename is built from the document number or a slugged name, so
        // it cannot break out of the header, and this stops a browser
        // second-guessing the type into something executable.
        'X-Content-Type-Options': 'nosniff',
        // A client's tax document must not sit in a shared cache.
        'Cache-Control': 'private, no-store',
      },
    });

  // `get` is null when the blob is gone and a 304 shape when nothing changed.
  if (stored && stored.statusCode === 200) return serve(stored.stream);

  // The fallback: finalize's render failed, or this document was finalized
  // before PDFs were stored at all. Render now, store it, and serve it — so
  // the next download is instant like every other.
  //
  // Chromium is already lazy without any help here: `render.ts` imports
  // `puppeteer-core` as a *type* and does the real `import()` inside `launch()`,
  // so the 66 MB browser is loaded on the path that renders and on no other.
  try {
    const cookie = (await headers()).get('cookie') ?? '';
    const bytes = await renderAndStorePdf(id, await printUrlFor(doc), cookie);
    logger.info({ action: 'downloadPdf', event: 'rendered_on_demand', documentId: id });
    return serve(new Uint8Array(bytes));
  } catch (err) {
    logger.error({ action: 'downloadPdf', event: 'render_failed', documentId: id, error: err });

    /**
     * A render failure says why, and only to a caller already past the gate.
     *
     * Every other failure here is a 404 on purpose: telling an unauthenticated
     * caller apart from a missing document leaks which ids exist. This branch is
     * different, and the difference is `ok` — auth, ownership and finalized
     * status have all passed by the time we reach it, so the reader is somebody
     * entitled to the document, and the only fact disclosed is why their own
     * document would not render.
     *
     * It exists because the alternative was worse. A bare 404 gave the operator
     * a file called `pdf.txt` reading "Not found", which says nothing about
     * whether Chromium failed to boot, the print page refused, or the blob store
     * rejected the write. Three very different problems, one indistinguishable
     * symptom, and the logs are on a machine they were not looking at.
     */
    const reason = err instanceof Error ? err.message : 'Unknown render failure';
    return new Response(`Could not render this document.\n\n${reason}\n`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
