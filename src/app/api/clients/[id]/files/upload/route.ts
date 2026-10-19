import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { z } from 'zod';
import { authorized } from '@/server/actions/authGate';
import { getClient } from '@/db/store';
import {
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  attachmentKey,
} from '@/lib/domain/client';
import { logger } from '@/lib/logger';

/**
 * Issues the one-shot token a browser needs to upload an attachment straight
 * to Blob storage.
 *
 * **Why the bytes skip this server.** Vercel rejects a function request body
 * over 4.5 MB before Next runs, so a scan sent through a Server Action failed
 * in production at a fifth of the 25 MB this app allows. The browser now PUTs
 * to the private store directly, and this route decides whether it may.
 *
 * The token is the gate, so it is narrow: a signed-in, allowlisted caller; a
 * client that exists; a path that is exactly that client's prefix and a uuid
 * (`attachmentKey`), so there is nothing to traverse; the size cap and the
 * three types; and no overwrite. The bytes are still sniffed after upload, by
 * `recordClientAttachment`, which deletes anything that is not what it claims.
 */
export const dynamic = 'force-dynamic';

const attachmentId = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const refused = Response.json({ error: 'Upload refused.' }, { status: 400 });

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return refused;
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await authorized())) throw new Error('unauthorized');
        const fileId = pathname.slice(`clients/${id}/`.length);
        if (pathname !== attachmentKey(id, fileId) || !attachmentId.safeParse(fileId).success) {
          throw new Error('bad pathname');
        }
        if (!(await getClient(id))) throw new Error('no client');
        return {
          allowedContentTypes: [...ATTACHMENT_MIME_TYPES],
          maximumSizeInBytes: MAX_ATTACHMENT_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    logger.error({ action: 'attachmentUploadToken', event: 'token_refused', error: err });
    return refused;
  }
}
