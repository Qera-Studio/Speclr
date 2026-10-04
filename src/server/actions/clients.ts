'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { codeSchema } from '@/lib/domain/text';
import { clientInputSchema } from '@/lib/domain/registry';
import {
  CLIENT_SECTION_SCHEMAS,
  SPREAD_SECTIONS,
  clientTaxCrossErrors,
  isClientSection,
  type ClientTax,
  type ClientTeam,
} from '@/lib/domain/client';
import { ENTITY_TYPE_VALUES } from '@/lib/domain/entityType';
import { COUNTRY_SEED } from '@/lib/domain/countries';
import { emptyAddressParts } from '@/lib/domain/address';
import type { ActionResult, ClientRecord } from '@/lib/domain/types';
import { authorized } from './authGate';
import { del } from '@vercel/blob';
import {
  clientHasDocuments,
  deleteClient,
  getClient,
  listEmployees,
  saveClient,
  setClientArchived,
} from '@/db/store';
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
 * Change where a saved client is based, and nothing else.
 *
 * The country is the most load-bearing fact on the record: it decides place
 * of supply, which registrations and legal forms are offered, what a postcode
 * is called and which documents are requested. Before the first save it rides
 * in the URL; after it, `addressParts.country` is the one place it lives
 * (`PRINCIPLES.md` rule 3), and this is that field's editor, reached from the
 * row above the step tracker on every step. The `setClientEntityType` shape:
 * one field, read-merge-write, so the rest of the row survives untouched.
 *
 * The composed `address` is rebuilt here by `withComposedAddress`, never taken
 * from the browser, so the printable line cannot disagree with its parts. A
 * legacy row with no parts keeps its hand-typed address, which is that
 * helper's rule and the right one: there is nothing to recompose from.
 *
 * Validated against the seed, never trusted: this is a two-letter string from
 * a client, and an unknown code would freeze onto every document as a country
 * that does not exist.
 */
export async function setClientCountry(id: unknown, iso2: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }
  const code = typeof iso2 === 'string' ? iso2.trim().toUpperCase() : '';
  if (!COUNTRY_SEED.some((c) => c.iso2 === code)) {
    return { success: false, error: 'Invalid input.' };
  }

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  const next = withComposedAddress({
    ...existing,
    addressParts: { ...emptyAddressParts, ...existing.addressParts, country: code },
    updatedAt: Date.now(),
  });

  try {
    await saveClient(next);
  } catch (err) {
    logger.error({ action: 'setClientCountry', event: 'save_failed', error: err });
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

  /*
    The ids have to name real people, and only the server can say so.

    `clientTeamSchema` deliberately does not check this (`CONTEXT.md` §5f: a
    field's own rule stays in the field, and a cross-record check goes where the
    whole record is in hand). Here the employee list is one call away, and this
    is a value the browser sent: an id that names nothing would sit on the row
    for ever, resolving to a blank card nobody could explain.

    The lead is refused outright. A silently dropped team member is the worse
    failure of the two, so an unknown id there is refused too rather than
    filtered: "saved" and "saved four of five" must not look the same.
  */
  if (section === 'team') {
    const team = parsed.data as ClientTeam;
    const named = [team.leadEmployeeId, ...(team.teamEmployeeIds ?? [])].filter(
      (id): id is string => Boolean(id),
    );
    if (named.length > 0) {
      const known = new Set((await listEmployees()).map((e) => e.id));
      const missing = named.find((id) => !known.has(id));
      if (missing) return { success: false, error: 'That person is no longer in the studio.' };
    }
  }

  /*
    Five of the six sections are one JSONB group and nest under their own key;
    `team` is two real columns and spreads (`SPREAD_SECTIONS`).

    A spread section names **every** field it owns, present or not, which is
    what makes clearing one work. Zod drops an absent optional, so a payload
    that unset the lead would spread to `{}` and leave the old id in place: the
    field would look uneditable once set, and only in the clearing direction.
    Writing `undefined` explicitly is what `clientToRow` turns into a null.
  */
  const patch = SPREAD_SECTIONS.includes(section)
    ? {
        leadEmployeeId: undefined,
        teamEmployeeIds: undefined,
        ...(parsed.data as Record<string, unknown>),
      }
    : { [section]: parsed.data };

  try {
    await saveClient({ ...existing, ...patch, updatedAt: Date.now() });
  } catch (err) {
    logger.error({ action: 'saveClientSection', event: 'save_failed', section, error: err });
    return { success: false, error: 'Failed to save client.' };
  }

  revalidatePath('/client/clients');
  revalidatePath(`/client/clients/${id}`);
  return { success: true, id };
}

/**
 * Add a service to a client's engaged list, from the contract builder.
 *
 * **The contract takes a copy; this is the separate, explicit act of also
 * telling the record.** Picking a service on a contract does not change who the
 * client is, so it must not write to them silently — but a service genuinely
 * agreed belongs on the record, where the next contract and every invoice seed
 * from it (`CONTEXT.md` §5i, §5d).
 *
 * **It adds and updates, and never removes.** Unticking a service on one
 * contract is a statement about that contract, not about the engagement: the
 * client may still be engaged for it under an agreement signed last year, and
 * the invoice seeds from this list. Taking something off the record is a
 * different decision with different consequences, and it belongs on the client's
 * own Services step where the whole list is in view.
 *
 * Read-then-write over the stored row, the `saveClientSection` shape, so it
 * cannot blank a field this call never saw.
 */
export async function addClientService(
  id: unknown,
  service: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = z
    .object({
      code: codeSchema(20, { required: 'A service code is required.' }),
      ratePaise: z.number().int().min(0).max(1e13).optional(),
    })
    .safeParse(service);
  if (!parsed.success) return { success: false, error: invalidInput(parsed.error) };

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  const services = existing.commercial?.services ?? [];
  const already = services.some((s) => s.code === parsed.data.code);
  const next = already
    ? services.map((s) => (s.code === parsed.data.code ? { ...s, ...parsed.data } : s))
    : [...services, parsed.data];

  try {
    await saveClient({
      ...existing,
      commercial: { ...existing.commercial, services: next },
      updatedAt: Date.now(),
    });
  } catch (err) {
    logger.error({ action: 'addClientService', event: 'save_failed', error: err });
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

/**
 * Offboard a client, or bring them back.
 *
 * Unconditional in both directions: unlike deleting, archiving takes nothing
 * away and breaks nothing that points at the row, so there is no state it has
 * to refuse. A client with an open draft can be archived — the draft still
 * resolves them, and the picker on that draft still offers them.
 */
export async function setClientArchivedAction(
  id: unknown,
  archived: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0 || typeof archived !== 'boolean') {
    return { success: false, error: 'Invalid input.' };
  }

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  try {
    await setClientArchived(id, archived);
  } catch (err) {
    logger.error({ action: 'setClientArchived', event: 'update_failed', error: err });
    return { success: false, error: 'Failed to update client.' };
  }

  revalidatePath('/client/clients');
  return { success: true, id };
}
