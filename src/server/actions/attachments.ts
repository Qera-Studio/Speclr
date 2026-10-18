'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { del, get } from '@vercel/blob';
import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_KIND_LABELS,
  ATTACHMENT_KINDS,
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  attachmentKey,
  isSlotKind,
  type AttachmentKind,
  type ClientAttachment,
} from '@/lib/domain/client';
import type { ActionResult } from '@/lib/domain/types';
import { getClient, saveClient } from '@/db/store';
import { logger } from '@/lib/logger';
import { isEncryptedPdf, safeFilename, sniffMimeType } from '@/lib/fileSignature';
import { authorized } from './authGate';

/**
 * Client attachments — a GST certificate, a PAN card, a signed contract.
 *
 * **These are a third party's identity documents, and that decides everything
 * here.** They belong to someone who is not the account holder, so the Legal
 * checklist outranks convenience: blobs are stored **private**, read back only
 * through a route that checks the session, and deleted for real rather than
 * merely unlinked from a JSON array (DPDP Act 2023 retention and erasure).
 *
 * Three checks the browser does not get to make:
 *
 * 1. **Size**, before anything is written.
 * 2. **Type, sniffed from the bytes** — a declared `Content-Type` is a claim,
 *    and an `.svg` announced as `image/png` is script the browser will run.
 * 3. **Ownership**, by reading the client row rather than trusting the id in
 *    the request to be one the caller may touch.
 */
/**
 * Blob storage needs one env var, and without it every upload fails.
 *
 * Reported as its own message rather than folded into "failed to upload",
 * which sends whoever is standing at the form to inspect a perfectly good PDF.
 * A missing environment variable is an operator problem and should say so.
 */
/** What the browser reports after an upload: which id, which slot, its name. */
const recordInput = z.object({
  id: z.string().uuid(),
  kind: z.enum(ATTACHMENT_KINDS),
  filename: z.string().min(1).max(255),
});

const STORAGE_UNCONFIGURED =
  'File storage is not configured — BLOB_READ_WRITE_TOKEN is not set on this environment.';

/**
 * Records an attachment the browser has just uploaded to its own path.
 *
 * The bytes arrive straight from the browser to private storage (see
 * `/api/clients/[id]/files/upload`, which issued the token), because Vercel
 * refuses a function body over 4.5 MB. So the checks that used to run on the
 * way in now run on the way back: the stored bytes are read here, sized and
 * **sniffed**, and anything that is not what it claims is deleted before a row
 * ever points at it.
 *
 * `encrypted` rides back on the result because only this side has the bytes:
 * the browser would have to read the whole file again to learn the same thing,
 * and the card has to show the lock before anything refetches the row.
 */
export async function recordClientAttachment(
  clientId: unknown,
  input: unknown,
): Promise<ActionResult & { encrypted?: boolean }> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { success: false, error: STORAGE_UNCONFIGURED };
  }

  const parsed = recordInput.safeParse(input);
  if (typeof clientId !== 'string' || clientId.length === 0 || !parsed.success) {
    return { success: false, error: 'Invalid input.' };
  }
  const { id, kind, filename: uploadedName } = parsed.data;
  const key = attachmentKey(clientId, id);

  const client = await getClient(clientId);
  if (!client) {
    await del(key).catch(() => undefined);
    return { success: false, error: 'Client not found.' };
  }
  // Recording the same upload twice would put two rows on one blob, and
  // deleting either would strand the other.
  if (client.attachments?.some((a) => a.id === id)) {
    return { success: false, error: 'That file is already attached.' };
  }

  let bytes: Uint8Array;
  try {
    const stored = await get(key, { access: 'private' });
    if (!stored || stored.statusCode !== 200) {
      return { success: false, error: 'The upload did not arrive. Try again.' };
    }
    bytes = new Uint8Array(await new Response(stored.stream).arrayBuffer());
  } catch (err) {
    logger.error({ action: 'recordClientAttachment', event: 'get_failed', error: err });
    return { success: false, error: 'Failed to read the upload.' };
  }

  // Refused files are deleted, not left: an identity document nothing points
  // at is one nobody can find to erase.
  const refuse = async (error: string) => {
    await del(key).catch(() => undefined);
    return { success: false as const, error };
  };
  if (bytes.length === 0) return refuse('That file is empty.');
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    return refuse(`That file is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`);
  }
  const sniffed = sniffMimeType(bytes.slice(0, 16));
  if (!sniffed || !(ATTACHMENT_MIME_TYPES as readonly string[]).includes(sniffed)) {
    return refuse('Only PDF, PNG and JPEG files can be attached.');
  }

  // A slot document is named by the slot, not by whatever the scanner called
  // it: "Clayora - GST registration certificate.pdf" is the same shape for
  // every client, which is what makes a folder of these readable three years
  // later. The extension comes from the sniffed type, so the name cannot
  // disagree with the bytes. Extras keep their own name, since several
  // purchase orders would otherwise all be called the same thing.
  const filename = isSlotKind(kind)
    ? safeFilename(
        `${client.companyName || client.name} - ${ATTACHMENT_KIND_LABELS[kind]}${ATTACHMENT_EXTENSIONS[sniffed] ?? ''}`,
      )
    : safeFilename(uploadedName);

  const encrypted = sniffed === 'application/pdf' && isEncryptedPdf(bytes);

  const attachment: ClientAttachment = {
    id,
    kind,
    filename,
    mime: sniffed,
    size: bytes.length,
    key,
    uploadedAt: Date.now(),
    ...(encrypted ? { encrypted } : {}),
  };

  // A slot holds one document, so uploading into a full one replaces it. The
  // row is rewritten first and the old blob deleted after: the other order
  // leaves the record pointing at bytes that are already gone if the save then
  // fails, and an orphaned blob is the recoverable half of that pair.
  const superseded = isSlotKind(kind)
    ? (client.attachments ?? []).filter((a) => a.kind === kind)
    : [];

  try {
    await saveClient({
      ...client,
      attachments: [
        ...(client.attachments ?? []).filter((a) => !superseded.includes(a)),
        attachment,
      ],
      updatedAt: Date.now(),
    });
  } catch (err) {
    await del(key).catch(() => undefined);
    logger.error({ action: 'recordClientAttachment', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save the attachment.' };
  }

  for (const old of superseded) {
    // Logged rather than surfaced: the replacement is stored and recorded, and
    // failing now would be a lie about what happened. A blob nothing points at
    // is a cleanup job, not an error for whoever is standing here.
    await del(old.key).catch((err) =>
      logger.error({ action: 'recordClientAttachment', event: 'replace_del_failed', error: err }),
    );
  }

  revalidatePath(`/client/clients/${clientId}`);
  return { success: true, id, encrypted };
}

/**
 * Remove an attachment — the blob first, then the row.
 *
 * That order matters. Dropping the row first and failing on the blob would
 * leave a file in storage that nothing points at, which is exactly the state a
 * deletion request is supposed to eliminate.
 */
export async function deleteClientAttachment(
  clientId: unknown,
  attachmentId: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { success: false, error: STORAGE_UNCONFIGURED };
  }

  if (typeof clientId !== 'string' || typeof attachmentId !== 'string') {
    return { success: false, error: 'Invalid input.' };
  }

  const client = await getClient(clientId);
  if (!client) return { success: false, error: 'Client not found.' };

  // Ownership: the attachment must be one of *this* client's, not merely an id
  // that exists somewhere.
  const attachment = client.attachments?.find((a) => a.id === attachmentId);
  if (!attachment) return { success: false, error: 'Attachment not found.' };

  try {
    await del(attachment.key);
  } catch (err) {
    logger.error({ action: 'deleteClientAttachment', event: 'del_failed', error: err });
    return { success: false, error: 'Failed to delete the file.' };
  }

  try {
    await saveClient({
      ...client,
      attachments: (client.attachments ?? []).filter((a) => a.id !== attachmentId),
      updatedAt: Date.now(),
    });
  } catch (err) {
    logger.error({ action: 'deleteClientAttachment', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save the client.' };
  }

  revalidatePath(`/client/clients/${clientId}`);
  return { success: true, id: attachmentId };
}
