import { upload } from '@vercel/blob/client';
import { attachmentKey, type AttachmentKind } from '@/lib/domain/client';
import { recordClientAttachment } from '@/server/actions/attachments';

/**
 * Uploads a file straight from the browser to private storage, then asks the
 * server to check it and record it.
 *
 * Two legs because Vercel refuses a function body over 4.5 MB: the bytes go to
 * Blob on a token `/api/clients/[id]/files/upload` issues for exactly this
 * path, and `recordClientAttachment` reads them back, sniffs them and writes
 * the row, deleting anything that is not what it claims.
 */
export async function uploadClientAttachment(clientId: string, file: File, kind: AttachmentKind) {
  const id = crypto.randomUUID();
  await upload(attachmentKey(clientId, id), file, {
    access: 'private',
    handleUploadUrl: `/api/clients/${encodeURIComponent(clientId)}/files/upload`,
    contentType: file.type,
  });
  return recordClientAttachment(clientId, { id, kind, filename: file.name });
}
