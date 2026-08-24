import 'server-only';

import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from './index';
import {
  clauses,
  clientInputs,
  clients,
  documents,
  employees,
  exclusions,
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
import type { MsaClause } from '@/lib/domain/contract/msa';
import type { EmployeeRecord } from '@/lib/domain/employee';

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

// ─── MSA clauses ──────────────────────────────────────────────────────────────

/**
 * The Master Agreement's clauses, in numbered order.
 *
 * Ordering is the store's job, not a caller's: the numbers are the clause's
 * identity and the text cross-references them, so any list that showed 11 after
 * 12 would be misreading the document.
 */
export async function listClauses(includeArchived = false): Promise<MsaClause[]> {
  const rows = await db
    .select()
    .from(clauses)
    .where(includeArchived ? undefined : eq(clauses.archived, false))
    .orderBy(clauses.number);
  return rows.map((r) => ({ number: r.number, heading: r.heading, body: r.body }));
}

/**
 * Upsert one clause by its number.
 *
 * Callers must have validated with `clauseInputSchema` first — this writes what
 * it is given. Editing here changes the *next* contract only; drafts carry
 * their own copy from creation and finalized contracts froze theirs.
 */
export async function saveClause(clause: MsaClause & { archived: boolean }): Promise<void> {
  const row = {
    number: clause.number,
    heading: clause.heading,
    body: clause.body,
    archived: clause.archived,
    updatedAt: new Date(),
  };
  await db.insert(clauses).values(row).onConflictDoUpdate({ target: clauses.number, set: row });
}

/**
 * The number a new clause would take: one past the highest that exists,
 * archived rows included.
 *
 * Counting only live rows would reissue an archived clause's number, and the
 * agreements that cite it by number are already signed.
 */
export async function nextClauseNumber(): Promise<number> {
  const rows = await db
    .select({ number: clauses.number })
    .from(clauses)
    .orderBy(desc(clauses.number))
    .limit(1);
  return (rows[0]?.number ?? 0) + 1;
}

/**
 * Archives rather than deletes, for the same reason services do — and one
 * more: the number must stay taken, or a later clause would inherit a number
 * that signed agreements use to mean something else.
 */
export async function archiveClause(number: number): Promise<void> {
  await db
    .update(clauses)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(clauses.number, number));
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
export async function saveDocument(doc: AdminDocument): Promise<void> {
  const existing = await getDocument(doc.id);
  if (existing?.status === 'finalized') {
    throw new Error(`Document ${doc.id} is finalized and immutable.`);
  }
  const row = toRow(doc);
  await db.insert(documents).values(row).onConflictDoUpdate({ target: documents.id, set: row });
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
  await db.delete(documents).where(eq(documents.id, id));
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
