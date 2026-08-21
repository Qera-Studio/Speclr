'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { clientInputSchema } from '@/lib/domain/registry';
import {
  CLIENT_SECTION_SCHEMAS,
  clientTaxCrossErrors,
  isClientSection,
  type ClientTax,
} from '@/lib/domain/client';
import { ENTITY_TYPE_VALUES } from '@/lib/domain/entityType';
import type { ActionResult, ClientRecord } from '@/lib/domain/types';
import { authorized } from './authGate';
import { del } from '@vercel/blob';
import { clientHasDocuments, deleteClient, getClient, saveClient } from '@/db/store';
import { logger } from '@/lib/logger';
import { withComposedAddress } from './address';
import { invalidInput } from './validation';

export async function createClient(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = clientInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const now = Date.now();
  const client: ClientRecord = {
    id: randomUUID(),
    ...withComposedAddress(parsed.data),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveClient(client);
  } catch (err) {
    logger.error({ action: 'createClient', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save client.' };
  }

  revalidatePath('/client/clients');
  return { success: true, id: client.id };
}

export async function updateClient(id: unknown, data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = clientInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  try {
    await saveClient({
      ...existing,
      ...withComposedAddress(parsed.data),
      updatedAt: Date.now(),
    });
  } catch (err) {
    logger.error({ action: 'updateClient', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save client.' };
  }

  revalidatePath('/client/clients');
  return { success: true, id };
}

/**
 * Change a client's entity type, and nothing else.
 *
 * Exists because the CIN on step 2 can state the entity type outright, and the
 * only alternative for a reader who picked the wrong row on step 1 is to go
 * back, re-submit the whole identity form, and come forward again — for one
 * column. `updateClient` cannot do it: it validates a whole `clientInputSchema`
 * payload, so a caller holding only the new type would have to reconstruct the
 * name, company name and address in the browser and send them back, which is
 * three more fields that can be clobbered by a stale copy of themselves.
 *
 * Deliberately not a `ClientSection`. Sections are JSONB groups written whole;
 * `entityType` is a real column (`PRINCIPLES.md` rule 2 — it is identity, and
 * it validates the PAN), and adding it to `CLIENT_SECTION_SCHEMAS` would let
 * `[section]: parsed.data` write a bare string over it.
 *
 * The value is checked against the closed set rather than trusted, because the
 * browser is not trusted and this column decides what a PAN is checked against.
 */
export async function setClientEntityType(id: unknown, entityType: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }
  if (typeof entityType !== 'string' || !ENTITY_TYPE_VALUES.includes(entityType)) {
    return { success: false, error: 'Invalid input.' };
  }

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  try {
    await saveClient({ ...existing, entityType, updatedAt: Date.now() });
  } catch (err) {
    logger.error({ action: 'setClientEntityType', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save client.' };
  }

  revalidatePath('/client/clients');
  revalidatePath(`/client/clients/${id}`);
  return { success: true, id };
}

/**
 * Save one section of a client — the onboarding wizard's write path.
 *
 * One action rather than five, because the five differ only in which schema
 * validates them and which key they land on. `CLIENT_SECTION_SCHEMAS` pairs the
 * name with the schema in one place, so a new section cannot be added to the
 * form without a schema to check it.
 *
 * **Read-merge-write, not patch.** `saveClient` is a whole-row upsert, so the
 * existing record is spread first — otherwise saving the tax step would blank
 * the contacts saved a minute earlier, and `createdAt` with them.
 *
 * The cross-section tax rules are re-checked here and not only in the browser.
 * `clientTaxCrossErrors` needs the address and the entity type, which live on
 * the record rather than in the submitted section — so the server reads them
 * from the row it already fetched. A client that validated in the form and
 * fails here has had something changed underneath it, and the honest answer is
 * to refuse.
 */
export async function saveClientSection(
  id: unknown,
  section: unknown,
  data: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }
  if (!isClientSection(section)) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = CLIENT_SECTION_SCHEMAS[section].safeParse(data);
  if (!parsed.success) {
    return { success: false, error: invalidInput(parsed.error) };
  }

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  if (section === 'tax') {
    const cross = clientTaxCrossErrors(parsed.data as ClientTax, {
      addressState: existing.addressParts?.state,
      entityType: existing.entityType,
      country: existing.addressParts?.country,
    });
    // Whichever came back first. Naming the keys here meant a rule added to
    // that function was silently unenforced on the server until somebody
    // remembered to widen this line.
    const first = Object.values(cross)[0];
    if (first) return { success: false, error: first };
  }

  try {
    await saveClient({ ...existing, [section]: parsed.data, updatedAt: Date.now() });
  } catch (err) {
    logger.error({ action: 'saveClientSection', event: 'save_failed', section, error: err });
    return { success: false, error: 'Failed to save client.' };
  }

  revalidatePath('/client/clients');
  revalidatePath(`/client/clients/${id}`);
  return { success: true, id };
}

/**
 * Delete a client — only one that has never been on a document.
 *
 * The refusal is the interesting half. `documents.client_id` is a foreign key,
 * so a referenced client cannot be removed anyway; checking first turns a
 * Postgres constraint violation into a sentence that says what to do instead.
 * And the rule is right on its own terms: a *draft* resolves its client live,
 * so deleting the row underneath one leaves a document that cannot render, and
 * a *finalized* document is a record retained for 72 months (CGST s.36) whose
 * client row is what a correction would duplicate from.
 *
 * The snapshot pattern means an issued document survives the client's deletion
 * intact — but "survives" is not a reason to sever the link while the studio
 * still has a lawful reason to hold it.
 *
 * **The attachments go with it, blobs and all.** They are a third party's
 * identity documents (CONTEXT §5d); leaving scans of someone's PAN card in
 * storage after deleting the record that points at them is exactly the state
 * DPDP Act 2023 erasure exists to prevent. Blobs first, then the row — the
 * other order can orphan a file with nothing left pointing at it.
 */
export async function deleteClientAction(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  if (await clientHasDocuments(id)) {
    return {
      success: false,
      error: `${existing.name} has documents and cannot be deleted. Delete its drafts first; finalized documents are permanent.`,
    };
  }

  const keys = (existing.attachments ?? []).map((a) => a.key);
  if (keys.length > 0) {
    try {
      await del(keys);
    } catch (err) {
      logger.error({ action: 'deleteClient', event: 'del_failed', error: err });
      return { success: false, error: 'Failed to delete the client’s files.' };
    }
  }

  try {
    await deleteClient(id);
  } catch (err) {
    logger.error({ action: 'deleteClient', event: 'delete_failed', error: err });
    return { success: false, error: 'Failed to delete client.' };
  }

  revalidatePath('/client/clients');
  return { success: true, id };
}
