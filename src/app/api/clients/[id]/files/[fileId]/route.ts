import { get } from '@vercel/blob';
import { authorized } from '@/server/actions/authGate';
import { getClient } from '@/db/store';
import { logger } from '@/lib/logger';

/**
 * Read one client attachment back.
 *
 * **The only route to these bytes.** The blobs are stored private, so there is
 * no URL that works without coming through here, and here checks the session
 * first. These are a third party's identity documents — a PAN card, a
 * certificate of incorporation — and an unguessable public link is not access
 * control, it is a link that has not been shared yet.
 *
 * The URL names an **attachment id, never a path.** The stored key is looked up
 * from the client's own row, which does two things at once: there is no path
 * for a caller to traverse, and an attachment only resolves for the client it
 * actually belongs to. Ownership is verified against the record, not inferred
 * from the request (the Security checklist's one rule).
 *
 * Every failure returns 404, including "not authorized". Distinguishing
 * "you may not" from "it does not exist" tells an unauthenticated caller which
 * client ids are real.
 */

/** Reads the live session and a live row on every request; never cached. */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
): Promise<Response> {
  const notFound = new Response('Not found', { status: 404 });

  if (!(await authorized())) return notFound;

  const { id, fileId } = await params;
  if (!id || !fileId) return notFound;

  const client = await getClient(id);
  const attachment = client?.attachments?.find((a) => a.id === fileId);
  if (!attachment) return notFound;

  try {
    const result = await get(attachment.key, { access: 'private' });
    // `get` is null when the blob is gone and a 304 shape when nothing changed.
    // Neither carries a body, and neither is worth distinguishing to a caller.
    if (!result || result.statusCode !== 200) return notFound;

    return new Response(result.stream, {
      headers: {
        'Content-Type': attachment.mime,
        // `inline` so a PDF opens in the viewer rather than downloading, but the
        // filename is still stated for when it is saved. The name was sanitised
        // at upload, so it cannot break out of this header.
        'Content-Disposition': `inline; filename="${attachment.filename}"`,
        // The type here was sniffed from the bytes at upload, so it is accurate
        // — and this stops the browser second-guessing it into something
        // executable anyway.
        'X-Content-Type-Options': 'nosniff',
        // A client's identity document must not sit in a shared cache.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    logger.error({ action: 'readClientAttachment', event: 'read_failed', error: err });
    return notFound;
  }
}
