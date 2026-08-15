'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import {
  ATTACHMENT_KINDS,
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  type ClientAttachment,
} from '@/lib/domain/client';
import type { ActionResult } from '@/lib/domain/types';
import { getClient, saveClient } from '@/db/store';
import { logger } from '@/lib/logger';
import { safeFilename, sniffMimeType } from '@/lib/fileSignature';
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
const STORAGE_UNCONFIGURED =
  'File storage is not configured — BLOB_READ_WRITE_TOKEN is not set on this environment.';

export async function uploadClientAttachment(
  clientId: unknown,
  formData: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { success: false, error: STORAGE_UNCONFIGURED };
  }

  if (typeof clientId !== 'string' || clientId.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }
  if (!(formData instanceof FormData)) {
    return { success: false, error: 'Invalid input.' };
  }

  const file = formData.get('file');
  const kind = String(formData.get('kind') ?? '');
  if (!(file instanceof File)) return { success: false, error: 'No file was attached.' };
  if (!(ATTACHMENT_KINDS as readonly string[]).includes(kind)) {
    return { success: false, error: 'Invalid input.' };
  }

  if (file.size === 0) return { success: false, error: 'That file is empty.' };
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      success: false,
      error: `That file is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffMimeType(bytes.slice(0, 16));
  if (!sniffed || !(ATTACHMENT_MIME_TYPES as readonly string[]).includes(sniffed)) {
    return { success: false, error: 'Only PDF, PNG and JPEG files can be attached.' };
  }

  const client = await getClient(clientId);
  if (!client) return { success: false, error: 'Client not found.' };

  const id = randomUUID();
  const filename = safeFilename(file.name);
  // The id is in the path so two uploads of "pan.pdf" cannot collide, and
  // `addRandomSuffix` is off so the stored key is exactly what we can delete.
  const key = `clients/${clientId}/${id}-${filename}`;

  try {
    await put(key, Buffer.from(bytes), {
      access: 'private',
      addRandomSuffix: false,
      contentType: sniffed,
    });
  } catch (err) {
    logger.error({ action: 'uploadClientAttachment', event: 'put_failed', error: err });
    return { success: false, error: 'Failed to upload the file.' };
  }

  const attachment: ClientAttachment = {
    id,
    kind: kind as ClientAttachment['kind'],
    filename,
    mime: sniffed,
    size: file.size,
    key,
    uploadedAt: Date.now(),
  };

  try {
    await saveClient({
      ...client,
      attachments: [...(client.attachments ?? []), attachment],
      updatedAt: Date.now(),
    });
  } catch (err) {
    // The blob is written but the row is not. Remove it rather than leaving an
    // orphaned identity document in storage that nothing references and nobody
    // can find to delete.
    await del(key).catch(() => undefined);
    logger.error({ action: 'uploadClientAttachment', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save the attachment.' };
  }

  revalidatePath(`/client/clients/${clientId}`);
  return { success: true, id };
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
