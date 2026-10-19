import 'server-only';

import { and, desc, eq, getTableColumns, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from './index';
import {
  clauses,
  clientInputs,
  clients,
  counters,
  documents,
  employees,
  exclusions,
  leads,
  services,
  studioSettings,
} from './schema';
import { clientFromRow, clientToRow, fromRow, toRow, type DocumentRow } from './mappers';
import { DEV_UNLIMITED } from '@/lib/devMode';
import { docTypesForProfile, type Profile } from '@/lib/profile';
import { SCHEDULE_BY_KEY } from '@/lib/domain/contract/schedules';
import { STUDIO_INFO, type StudioInfo } from '@/lib/domain/studio';
import type { AdminDocument, ClientRecord, DocTypeCode } from '@/lib/domain/types';
import type { ContractService, LibraryLine } from '@/lib/domain/service';
import type { ClauseInput, MsaClause } from '@/lib/domain/contract/msa';
import type { EmployeeRecord } from '@/lib/domain/employee';
import type { Lead } from '@/lib/domain/lead';
import { localDateToISO } from '@/lib/domain/dates';

/**
 * Persistence for speclr documents, clients, employees, and service templates,
 * backed by Neon Postgres via Drizzle. Preserves the source project's store
 * contract exactly — same function names, same behaviours — so the Server
 * Actions barely change. The Redis-specific bits (whole-JSON blobs, sorted-set
 * indexes) are replaced by real rows; the guarantees are the same or stronger.
 *
 * Timestamps: the domain uses epoch-ms numbers; the DB uses timestamptz. The
 * mappers bridge the two, so callers keep working in domain time.
 */

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function saveClient(client: ClientRecord): Promise<void> {
  const row = clientToRow(client);
  await db
    .insert(clients)
    .values(row)
    .onConflictDoUpdate({ target: clients.id, set: row });
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ? clientFromRow(rows[0]) : null;
}

export async function listClients(): Promise<ClientRecord[]> {
  const rows = await db.select().from(clients).orderBy(desc(clients.createdAt));
  return rows.map(clientFromRow);
}

/**
 * Whether any document — draft or finalized — names this client.
 *
 * `documents.client_id` is a real foreign key, so deleting a referenced client
 * fails at the database anyway. This exists so the refusal reads as a sentence
 * instead of a Postgres constraint violation, and it deliberately counts
 * drafts too: a draft resolves its client live, so removing the row underneath
 * one leaves a document that cannot render.
 */
export async function clientHasDocuments(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.clientId, id))
    .limit(1);
  return rows.length > 0;
}

/**
 * The same question for an employee, and it had been missed.
 *
 * `documents.employee_id` is a foreign key with no `onDelete`, so Postgres
 * already refuses to delete an employee who has been on a slip or a letter.
 * Without this the refusal reached the operator as "Failed to delete employee",
 * which names no cause and suggests a fault. Same reason the client one exists:
 * turn a constraint violation into a sentence.
 */
export async function employeeHasDocuments(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.employeeId, id))
    .limit(1);
  return rows.length > 0;
}

/**
 * Offboard a client, or bring them back.
 *
 * A column write rather than a `saveClient` round trip: archiving is one flag
 * and re-saving the whole row to set it would re-compose the address and
 * re-write every group, which is a lot of chances to change something nobody
 * asked to change.
 */
export async function setClientArchived(id: string, archived: boolean): Promise<void> {
  await db.update(clients).set({ archived, updatedAt: new Date() }).where(eq(clients.id, id));
}

export async function deleteClient(id: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, id));
}

// ─── Studio settings ──────────────────────────────────────────────────────────

/** The single row's key. There is only ever one studio. */
const STUDIO_SETTINGS_ID = 'studio';

/**
 * The studio's live identity block, falling back to the `STUDIO_INFO` constant
 * when the row has never been saved.
 *
 * The fallback is the seeding strategy: nothing changes on day one, and the
 * settings page starts pre-filled with what documents already print. No seed
 * migration to keep in step with the constant.
 */
export async function getStudioSettings(): Promise<StudioInfo> {
  const rows = await db
    .select()
    .from(studioSettings)
    .where(eq(studioSettings.id, STUDIO_SETTINGS_ID))
    .limit(1);
  return rows[0]?.info ?? STUDIO_INFO;
}

export async function saveStudioSettings(info: StudioInfo): Promise<void> {
  const row = { id: STUDIO_SETTINGS_ID, info, updatedAt: new Date() };
  await db
    .insert(studioSettings)
    .values(row)
    .onConflictDoUpdate({ target: studioSettings.id, set: row });
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function saveEmployee(emp: EmployeeRecord): Promise<void> {
  const row = {
    id: emp.id,
    name: emp.name,
    address: emp.address,
    // Explicit null — see the note in saveClient.
    addressParts: emp.addressParts ?? null,
    email: emp.email,
    phone: emp.phone,
    role: emp.role,
    engagementType: emp.engagementType,
    pronoun: emp.pronoun,
    joiningDate: emp.joiningDate,
    endDate: emp.endDate ?? null,
    payAmountPaise: emp.payAmountPaise,
    // Explicit null — see the note in saveClient.
    annualSalaryPaise: emp.annualSalaryPaise ?? null,
    payCurrency: emp.payCurrency ?? null,
    bank: emp.bank,
    payroll: emp.payroll ?? null,
    createdAt: new Date(emp.createdAt),
    updatedAt: new Date(emp.updatedAt),
  };
  await db
    .insert(employees)
    .values(row)
    .onConflictDoUpdate({ target: employees.id, set: row });
}

function employeeFromRow(r: typeof employees.$inferSelect): EmployeeRecord {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    addressParts: r.addressParts ?? undefined,
    email: r.email,
    phone: r.phone,
    role: r.role,
    engagementType: r.engagementType as EmployeeRecord['engagementType'],
    pronoun: r.pronoun as EmployeeRecord['pronoun'],
    joiningDate: r.joiningDate,
    endDate: r.endDate ?? undefined,
    payAmountPaise: r.payAmountPaise,
    annualSalaryPaise: r.annualSalaryPaise ?? undefined,
    payCurrency: (r.payCurrency ?? undefined) as EmployeeRecord['payCurrency'],
    bank: r.bank,
    payroll: r.payroll ?? undefined,
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
  };
}

export async function getEmployee(id: string): Promise<EmployeeRecord | null> {
  const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return rows[0] ? employeeFromRow(rows[0]) : null;
}

export async function listEmployees(): Promise<EmployeeRecord[]> {
  const rows = await db.select().from(employees).orderBy(desc(employees.createdAt));
  return rows.map(employeeFromRow);
}

export async function deleteEmployee(id: string): Promise<void> {
  await db.delete(employees).where(eq(employees.id, id));
}

// ─── Services, and the two shared libraries ───────────────────────────────────

function serviceFromRow(r: typeof services.$inferSelect): ContractService {
  return {
    code: r.code,
    name: r.name,
    scheduleKey: r.scheduleKey,
    sortOrder: r.sortOrder,
    archived: r.archived,
    ...r.content,
  };
}

export async function saveService(svc: ContractService): Promise<void> {
  const { code, name, scheduleKey, sortOrder, archived, ...content } = svc;
  const row = {
    code,
    name,
    scheduleKey,
    sortOrder,
    archived,
    content,
    updatedAt: new Date(),
  };
  await db
    .insert(services)
    .values(row)
    .onConflictDoUpdate({ target: services.code, set: row });
}

/**
 * Adds a service, refusing to land on a code that already exists.
 *
 * Not `saveService`: that upserts, which is right for an edit and wrong here.
 * Two adds that resolved the same next code would have the second silently
 * replace the first, and a code is cited by every contract that used it. A
 * plain insert turns that collision into an error instead.
 */
export async function insertService(svc: ContractService): Promise<void> {
  const { code, name, scheduleKey, sortOrder, archived, ...content } = svc;
  await db.insert(services).values({ code, name, scheduleKey, sortOrder, archived, content });
}

export async function getService(code: string): Promise<ContractService | null> {
  const rows = await db.select().from(services).where(eq(services.code, code)).limit(1);
  return rows[0] ? serviceFromRow(rows[0]) : null;
}

/**
 * Every service, in canonical order — Schedule first, then position within it.
 * That order is what fixes Part numbering, so it is the store's job, not a
 * caller's.
 */
export async function listServices(includeArchived = false): Promise<ContractService[]> {
  const rows = await db
    .select()
    .from(services)
    .where(includeArchived ? undefined : eq(services.archived, false))
    .orderBy(services.scheduleKey, services.sortOrder);
  return rows.map(serviceFromRow).sort((a, b) => {
    const schedule =
      SCHEDULE_BY_KEY[a.scheduleKey].number - SCHEDULE_BY_KEY[b.scheduleKey].number;
    return schedule !== 0 ? schedule : a.sortOrder - b.sortOrder;
  });
}

/**
 * Archives rather than deletes. A service that has been on a contract must stay
 * readable for audit, and every contract holds its own copy regardless — so
 * there is no case where removing the row is the right answer.
 */
export async function archiveService(code: string): Promise<void> {
  await db
    .update(services)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(services.code, code));
}

/** Brings an archived Service back into the catalogue and the new-contract picker. */
export async function restoreService(code: string): Promise<void> {
  await db
    .update(services)
    .set({ archived: false, updatedAt: new Date() })
    .where(eq(services.code, code));
}

// ─── MSA clauses ──────────────────────────────────────────────────────────────

/**
 * The Contract Agreement's clauses, in numbered order.
 *
 * Ordering is the store's job, not a caller's: the numbers are the clause's
 * identity and the text cross-references them, so any list that showed 11 after
 * 12 would be misreading the document.
 *
 * `archived` comes back on every row, which costs nothing and the library page
 * needs: it is the one caller that asks for archived clauses, because otherwise
 * archiving would be a deletion nothing could undo. Every other caller reads
 * the three fields a `MsaClause` has and is unaffected.
 */
export async function listClauses(includeArchived = false): Promise<ClauseInput[]> {
  const rows = await db
    .select()
    .from(clauses)
    .where(includeArchived ? undefined : eq(clauses.archived, false))
    .orderBy(clauses.number);
  return rows.map((r) => ({
    number: r.number,
    heading: r.heading,
    // `?? undefined` because the column is nullable and `ClauseInput` says
    // optional: a row that has never had one and a row whose summary was
    // cleared both read as absent, which is what the field means.
    summary: r.summary ?? undefined,
    body: r.body,
    archived: r.archived,
  }));
}

/**
 * Upsert one clause by its number.
 *
 * Callers must have validated with `clauseInputSchema` first — this writes what
 * it is given. Editing here changes the *next* contract only; drafts carry
 * their own copy from creation and finalized contracts froze theirs.
 */
export async function saveClause(
  clause: MsaClause & { archived: boolean; summary?: string },
): Promise<void> {
  const row = {
    number: clause.number,
    heading: clause.heading,
    // Empty reads as absent, so clearing the field in the drawer puts the row
    // back to having none rather than storing a blank that looks written.
    summary: clause.summary?.trim() ? clause.summary.trim() : null,
    body: clause.body,
    archived: clause.archived,
    updatedAt: new Date(),
  };
  await db.insert(clauses).values(row).onConflictDoUpdate({ target: clauses.number, set: row });
}

/**
 * Where the highest clause number ever issued is remembered, so that deleting
 * the top clause does not hand its number back.
 *
 * It rides in `counters` rather than a column of its own: that table already
 * exists to answer "what is the next number in this series", which is exactly
 * the question. `fyCode` is meaningless here (a clause number is not per
 * financial year, unlike every document series), so it is a literal '-'.
 */
const CLAUSE_COUNTER = { docType: 'CLAUSE', fyCode: '-' } as const;

/**
 * The number a new clause would take: one past the highest ever issued.
 *
 * **Not one past the highest row.** Counting rows alone would reissue the
 * number of a clause that has been deleted, and the agreements citing it by
 * number ('the meaning given at clause 11.2') are already signed. Archived rows
 * are counted for the same reason and are safe on their own, because the row
 * stays; a deletion is what needs the separate mark.
 *
 * The two are read together and the higher wins, so a library seeded before the
 * mark existed still answers correctly and no backfill was needed.
 */
export async function nextClauseNumber(): Promise<number> {
  const [rows, marks] = await Promise.all([
    db.select({ number: clauses.number }).from(clauses).orderBy(desc(clauses.number)).limit(1),
    db
      .select({ lastSerial: counters.lastSerial })
      .from(counters)
      .where(
        and(eq(counters.docType, CLAUSE_COUNTER.docType), eq(counters.fyCode, CLAUSE_COUNTER.fyCode)),
      )
      .limit(1),
  ]);
  return Math.max(rows[0]?.number ?? 0, marks[0]?.lastSerial ?? 0) + 1;
}

/**
 * Archives a clause: the row stays, so its number stays taken, and it simply
 * leaves the default list. The same removal services and clients use, and the
 * one to reach for by default.
 */
export async function archiveClause(number: number): Promise<void> {
  await db
    .update(clauses)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(clauses.number, number));
}

/**
 * Deletes a clause outright, **retiring its number on the way out.**
 *
 * The row really goes, which archiving does not do, and that is the whole
 * reason this exists: a clause typed by mistake should be removable rather than
 * sitting in the library's history forever. What must not go with it is the
 * number. So the high-water mark is raised first, and only then is the row
 * removed, because the other order leaves a window in which a concurrent
 * `nextClauseNumber` sees neither the row nor the mark and reissues.
 */
export async function deleteClause(number: number): Promise<void> {
  await db
    .insert(counters)
    .values({ ...CLAUSE_COUNTER, lastSerial: number })
    .onConflictDoUpdate({
      target: [counters.docType, counters.fyCode],
      // `greatest`, not the new value: deleting clause 3 out of 28 must not
      // lower a mark already standing at 28.
      set: { lastSerial: sql`greatest(${counters.lastSerial}, ${number})`, updatedAt: new Date() },
    });
  await db.delete(clauses).where(eq(clauses.number, number));
}

function libraryFromRow(r: { id: string; text: string; category: string; archived: boolean }) {
  return { id: r.id, text: r.text, category: r.category, archived: r.archived };
}

export async function listExclusions(includeArchived = false): Promise<LibraryLine[]> {
  const rows = await db
    .select()
    .from(exclusions)
    .where(includeArchived ? undefined : eq(exclusions.archived, false))
    .orderBy(exclusions.id);
  return rows.map(libraryFromRow);
}

export async function listClientInputs(includeArchived = false): Promise<LibraryLine[]> {
  const rows = await db
    .select()
    .from(clientInputs)
    .where(includeArchived ? undefined : eq(clientInputs.archived, false))
    .orderBy(clientInputs.id);
  return rows.map(libraryFromRow);
}

export async function saveExclusion(line: LibraryLine): Promise<void> {
  const row = { ...line, updatedAt: new Date() };
  await db.insert(exclusions).values(row).onConflictDoUpdate({ target: exclusions.id, set: row });
}

export async function saveClientInput(line: LibraryLine): Promise<void> {
  const row = { ...line, updatedAt: new Date() };
  await db
    .insert(clientInputs)
    .values(row)
    .onConflictDoUpdate({ target: clientInputs.id, set: row });
}

// ─── Documents ────────────────────────────────────────────────────────────────

/**
 * Writes a document. Refuses to overwrite an already-finalized document —
 * finalized docs are immutable (corrections happen via duplicate-as-draft).
 * The finalize transition itself (stored draft → finalized) passes this check
 * because the *existing* row is still a draft at that point.
 */
/**
 * Write a draft. **Only a draft**, and the condition is in the statement.
 *
 * This used to read the status and then upsert, two round trips with a gap
 * between them, so an autosave racing a finalize could write a finalized row
 * back to draft (gate dry run, 18 October 2026). The update now carries
 * `where status = 'draft'`, so it simply does not happen to a finalized row,
 * and `0022_documents_immutable` refuses it again underneath. Issuing goes
 * through `finalizeStoredDocument`, never here.
 */
export async function saveDocument(doc: AdminDocument): Promise<void> {
  if (doc.status !== 'draft') {
    throw new Error(`Document ${doc.id}: only a draft is saved here; finalize issues it.`);
  }
  const row = toRow(doc);
  const written = await db
    .insert(documents)
    .values(row)
    .onConflictDoUpdate({ target: documents.id, set: row, where: eq(documents.status, 'draft') })
    .returning({ id: documents.id });
  if (written.length === 0) {
    throw new Error(`Document ${doc.id} is finalized and immutable.`);
  }
}

/** How a document is numbered as it is issued. */
export type Numbering =
  /** The real series: claimed in the same statement that issues the document. */
  | { claim: { code: DocTypeCode; fyCode: string } }
  /** A number already decided: the dev server's obviously fake serial. */
  | { fixed: { serial: number; number: string } }
  /** Unnumbered: the HR letters. */
  | null;

/**
 * Issue a document: claim its number and write it as finalized, **in one
 * statement**, and only while it is still a draft.
 *
 * Finalize was a claim, then a read, then an upsert, three round trips with
 * no transaction (the Neon HTTP driver has none that can span them). Two
 * clicks, or two tabs, could burn two numbers, issue the document under the
 * second and overwrite the first, and a failure after the claim burned a
 * number for nothing (gate dry run, 18 October 2026; fixed on the founder's
 * instruction the next day).
 *
 * Now the claim is a data-modifying CTE gated on the draft row, which it locks
 * (`for update`). A second finalize waits on that lock, finds the row issued
 * when it gets it, claims nothing and updates nothing. Either the whole thing
 * happens or none of it does, so a number is burnt by nothing short of a
 * database that loses a committed write.
 *
 * The number is formatted in SQL as `formatDocNumber` formats it, padded to
 * three digits and growing past 999; `store.integration.test.ts` holds the two
 * to the same answer.
 *
 * Returns the number and serial written, or null when the row was not a draft
 * (already issued, or gone).
 */
export async function finalizeStoredDocument(
  doc: AdminDocument,
  numbering: Numbering,
): Promise<{ number?: string; serial?: number } | null> {
  const row = toRow({ ...doc, status: 'finalized' });
  const columns = getTableColumns(documents);
  const skip = new Set<string>(['id', 'createdAt', ...(numbering && 'claim' in numbering ? ['number', 'serial'] : [])]);
  const assignments = Object.entries(columns)
    .filter(([key]) => !skip.has(key))
    .map(([key, column]) => {
      const value =
        numbering && 'fixed' in numbering && (key === 'number' || key === 'serial')
          ? numbering.fixed[key]
          : (row as Record<string, unknown>)[key];
      return sql`${sql.identifier(column.name)} = ${sql.param(value ?? null, column)}`;
    });

  if (!numbering || 'fixed' in numbering) {
    const rows = await db.execute<{ number: string | null; serial: number | null }>(sql`
      update documents set ${sql.join(assignments, sql`, `)}
      where id = ${doc.id} and status = 'draft'
      returning number, serial`);
    const issued = rows.rows[0];
    return issued ? { number: issued.number ?? undefined, serial: issued.serial ?? undefined } : null;
  }

  const { code, fyCode } = numbering.claim;
  const rows = await db.execute<{ number: string; serial: number }>(sql`
    with claimed as (
      insert into counters (doc_type, fy_code, last_serial)
      select ${code}, ${fyCode}, 1
      where exists (select 1 from documents where id = ${doc.id} and status = 'draft' for update)
      on conflict (doc_type, fy_code)
        do update set last_serial = counters.last_serial + 1, updated_at = now()
      returning last_serial
    )
    update documents set
      ${sql.join(assignments, sql`, `)},
      serial = claimed.last_serial,
      number = 'QS-' || ${code} || '-' || ${fyCode} || '-'
        || lpad(claimed.last_serial::text, greatest(3, length(claimed.last_serial::text)), '0')
    from claimed
    where documents.id = ${doc.id} and documents.status = 'draft'
    returning documents.number, documents.serial`);
  const issued = rows.rows[0];
  return issued ? { number: issued.number, serial: Number(issued.serial) } : null;
}

export async function getDocument(id: string): Promise<AdminDocument | null> {
  const rows = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return rows[0] ? fromRow(rows[0] as DocumentRow) : null;
}

/**
 * Every document, both profiles, newest first.
 *
 * Deliberately left unscoped now that the app is split in two: this is the
 * cross-profile backdoor `src/lib/profile.ts` describes. The profile homes call
 * `listDocumentsByProfile`; anything that genuinely needs both sides at once
 * calls this and says why.
 */
export async function listDocuments(): Promise<AdminDocument[]> {
  const rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
  return rows.map((r) => fromRow(r as DocumentRow));
}

/**
 * One profile's documents, newest first — what each profile home shows.
 *
 * Filtered on `type` rather than on `client_id is null`: the type is what
 * *decides* the profile (`profileOfDocType`), while the two id columns merely
 * follow from it, and a draft can be saved before either is set. Uses
 * `documents_type_idx`.
 */
export async function listDocumentsByProfile(profile: Profile): Promise<AdminDocument[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(inArray(documents.type, docTypesForProfile(profile)))
    .orderBy(desc(documents.createdAt));
  return rows.map((r) => fromRow(r as DocumentRow));
}

/**
 * One document type, newest first — what each per-type list page shows.
 * Both drafts and finalized documents: the list is the working surface for a
 * type, not an archive of issued ones. Uses `documents_type_idx`.
 */
export async function listDocumentsByType(type: DocTypeCode): Promise<AdminDocument[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.type, type))
    .orderBy(desc(documents.createdAt));
  return rows.map((r) => fromRow(r as DocumentRow));
}

/**
 * The most recently issued invoice, or null if none has been.
 *
 * Backs the receipt list's one-click "receipt for the latest invoice". Finalized
 * only — a draft has no number, so nothing can be receipted against it.
 */
export async function getLatestFinalizedInvoice(): Promise<AdminDocument | null> {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.type, 'INV'), eq(documents.status, 'finalized')))
    .orderBy(desc(documents.issueDate), desc(documents.createdAt))
    .limit(1);
  return rows[0] ? fromRow(rows[0] as DocumentRow) : null;
}

/**
 * Finalized invoices for one client, newest first — the source for the
 * receipt's "against invoice" picker.
 *
 * Drafts are excluded on purpose: a draft has no number yet, so it isn't
 * something a receipt can reference. Uses the existing client_id/type/status
 * indexes. Capped because a picker never needs more than a page of history.
 */
export async function listFinalizedInvoicesForClient(
  clientId: string,
): Promise<AdminDocument[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.clientId, clientId),
        eq(documents.type, 'INV'),
        eq(documents.status, 'finalized'),
      ),
    )
    .orderBy(desc(documents.issueDate), desc(documents.createdAt))
    .limit(100);
  return rows.map((r) => fromRow(r as DocumentRow));
}

/**
 * Drafts only — finalized documents are part of the permanent record.
 * `DEV_UNLIMITED` lifts that while speclr is pre-launch, so sample finalizes
 * can be cleared out; in production the guard always holds.
 */
export async function deleteDraft(id: string): Promise<void> {
  const existing = await getDocument(id);
  if (!existing) return;
  if (existing.status === 'finalized' && !DEV_UNLIMITED) {
    throw new Error(`Document ${id} is finalized and cannot be deleted.`);
  }
  if (existing.status === 'finalized') {
    // Dev only: a sample finalize under a fake serial. The database refuses
    // to delete a finalized row (`0022_documents_immutable`) unless this
    // transaction says it is a purge, and nothing else in the app says so.
    await db.batch([
      db.execute(sql`select set_config('speclr.purge_finalized', 'on', true)`),
      db.delete(documents).where(eq(documents.id, id)),
    ]);
    return;
  }
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.status, 'draft')));
}

// ─── Search ───────────────────────────────────────────────────────────────────

/** How many hits of each kind the palette shows. */
const SEARCH_LIMIT = 5;

export interface SearchResults {
  documents: AdminDocument[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
  services: ContractService[];
}

const EMPTY_SEARCH: SearchResults = { documents: [], clients: [], employees: [], services: [] };

/**
 * The header palette's one query: documents, clients, employees and services.
 *
 * Plain `ilike '%q%'` rather than full-text search — this is a single studio's
 * records, a few hundred rows at most, and a substring match is what someone
 * typing half an invoice number actually wants. Revisit if the tables grow.
 *
 * Documents match on their number, or on the party they concern. The party's
 * name lives inside the JSONB snapshot, so rather than reach into it, the
 * matching clients/employees are resolved first and their documents pulled by
 * foreign key — the indexed path, and it keeps snapshot shape out of SQL.
 */
/**
 * The longest search worth running. Nobody types a hundred characters into a
 * palette; a request that does is either a paste accident or someone probing,
 * and either way Postgres should not be asked to scan for it.
 */
const MAX_SEARCH_LENGTH = 100;

/**
 * `%` and `_` are wildcards inside a LIKE pattern, so a literal one has to be
 * escaped or the user's search means something other than what they typed.
 *
 * Not an injection — Drizzle parameterises the value, so it can never become
 * SQL. It is a correctness and cost problem: a bare `%` matches every row, and
 * a query of nothing but wildcards makes the database scan all four tables to
 * return the whole set. The backslash goes first, or it would escape the
 * escapes added after it.
 */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function searchEverything(
  query: string,
  profile: Profile,
): Promise<SearchResults> {
  const q = query.trim().slice(0, MAX_SEARCH_LENGTH);
  if (q.length < 2) return EMPTY_SEARCH;
  const pattern = `%${likeLiteral(q)}%`;

  // Scoped in SQL, not filtered afterwards. `SEARCH_LIMIT` is applied by the
  // database, so a post-hoc filter would let five pay slips fill the window and
  // hide the invoice that was actually being looked for.
  const isClient = profile === 'client';

  const [clientHits, employeeHits, serviceHits] = await Promise.all([
    isClient
      ? db
          .select()
          .from(clients)
          .where(
            or(
              ilike(clients.name, pattern),
              ilike(clients.companyName, pattern),
              ilike(clients.email, pattern),
            ),
          )
          .orderBy(clients.name)
          .limit(SEARCH_LIMIT)
      : [],
    isClient
      ? []
      : db
          .select()
          .from(employees)
          .where(or(ilike(employees.name, pattern), ilike(employees.email, pattern)))
          .orderBy(employees.name)
          .limit(SEARCH_LIMIT),
    isClient
      ? db
          .select()
          .from(services)
          .where(and(eq(services.archived, false), ilike(services.name, pattern)))
          .orderBy(services.sortOrder)
          .limit(SEARCH_LIMIT)
      : [],
  ]);

  const clientIds = clientHits.map((c) => c.id);
  const employeeIds = employeeHits.map((e) => e.id);

  const documentMatch = [
    ilike(documents.number, pattern),
    ...(clientIds.length ? [inArray(documents.clientId, clientIds)] : []),
    ...(employeeIds.length ? [inArray(documents.employeeId, employeeIds)] : []),
  ];

  const documentHits = await db
    .select()
    .from(documents)
    .where(
      and(
        // Without this, a search for "2627" in the client profile returns
        // `QS-PAY-2627-001` — the number match doesn't care which side a
        // document is on, and the party joins can't exclude it.
        inArray(documents.type, docTypesForProfile(profile)),
        or(...documentMatch),
      ),
    )
    .orderBy(desc(documents.createdAt))
    .limit(SEARCH_LIMIT);

  return {
    documents: documentHits.map((r) => fromRow(r as DocumentRow)),
    clients: clientHits.map(clientFromRow),
    employees: employeeHits.map(employeeFromRow),
    services: serviceHits.map(serviceFromRow),
  };
}

// ─── Leads ────────────────────────────────────────────────────────────────────

/** Every lead, newest first. */
export async function listLeads(): Promise<Lead[]> {
  return listLeadsWhere();
}

async function listLeadsWhere(where?: ReturnType<typeof eq>): Promise<Lead[]> {
  const rows = await db.select().from(leads).where(where).orderBy(desc(leads.createdAt));
  return rows.map((r) => ({
    ...r.details,
    id: r.id,
    name: r.name,
    stage: r.stage,
    createdAt: localDateToISO(r.createdAt),
  }));
}

/** One lead by id, or null. */
export async function getLead(id: string): Promise<Lead | null> {
  return (await listLeadsWhere(eq(leads.id, id)))[0] ?? null;
}

/** Inserts or replaces one lead; `createdAt` is kept from the first insert. */
export async function saveLead(lead: Omit<Lead, 'createdAt'>): Promise<void> {
  const { id, name, stage, ...details } = lead;
  await db
    .insert(leads)
    .values({ id, name, stage, details })
    .onConflictDoUpdate({ target: leads.id, set: { name, stage, details, updatedAt: new Date() } });
}

/** Removes the row outright: a lead's contact details are erased, not flagged. */
export async function deleteLead(id: string): Promise<void> {
  await db.delete(leads).where(eq(leads.id, id));
}
