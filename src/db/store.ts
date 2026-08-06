import 'server-only';

import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from './index';
import { clients, documents, employees, serviceTemplates, studioSettings } from './schema';
import { fromRow, toRow, type DocumentRow } from './mappers';
import { DEV_UNLIMITED } from '@/lib/devMode';
import { STUDIO_INFO, type StudioInfo } from '@/lib/domain/studio';
import type { AdminDocument, ClientRecord, DocTypeCode } from '@/lib/domain/types';
import type { EmployeeRecord } from '@/lib/domain/employee';
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';

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
  const row = {
    id: client.id,
    name: client.name,
    companyName: client.companyName ?? null,
    address: client.address,
    // Explicitly null rather than omitted: this same object is the
    // `onConflictDoUpdate` set, so leaving the key out would keep stale parts
    // on the row after an edit that cleared them.
    addressParts: client.addressParts ?? null,
    email: client.email,
    phone: client.phone,
    gstin: client.gstin ?? null,
    createdAt: new Date(client.createdAt),
    updatedAt: new Date(client.updatedAt),
  };
  await db
    .insert(clients)
    .values(row)
    .onConflictDoUpdate({ target: clients.id, set: row });
}

function clientFromRow(r: typeof clients.$inferSelect): ClientRecord {
  return {
    id: r.id,
    name: r.name,
    companyName: r.companyName ?? undefined,
    address: r.address,
    addressParts: r.addressParts ?? undefined,
    email: r.email,
    phone: r.phone,
    gstin: r.gstin ?? undefined,
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
  };
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ? clientFromRow(rows[0]) : null;
}

export async function listClients(): Promise<ClientRecord[]> {
  const rows = await db.select().from(clients).orderBy(desc(clients.createdAt));
  return rows.map(clientFromRow);
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
    payCurrency: emp.payCurrency ?? null,
    bank: emp.bank,
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
    payCurrency: (r.payCurrency ?? undefined) as EmployeeRecord['payCurrency'],
    bank: r.bank,
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

// ─── Service templates ────────────────────────────────────────────────────────

export async function saveService(svc: ServiceTemplate): Promise<void> {
  const row = {
    id: svc.id,
    name: svc.name,
    content: {
      overview: svc.overview,
      scopeItems: svc.scopeItems,
      exclusionItems: svc.exclusionItems,
      priceNote: svc.priceNote,
      milestones: svc.milestones,
      revisionsNote: svc.revisionsNote,
      disclaimerNote: svc.disclaimerNote,
      supportNote: svc.supportNote,
    },
    createdAt: new Date(svc.createdAt),
    updatedAt: new Date(svc.updatedAt),
  };
  await db
    .insert(serviceTemplates)
    .values(row)
    .onConflictDoUpdate({ target: serviceTemplates.id, set: row });
}

function serviceFromRow(r: typeof serviceTemplates.$inferSelect): ServiceTemplate {
  return {
    id: r.id,
    name: r.name,
    overview: r.content.overview,
    scopeItems: r.content.scopeItems,
    exclusionItems: r.content.exclusionItems,
    priceNote: r.content.priceNote,
    milestones: r.content.milestones,
    revisionsNote: r.content.revisionsNote,
    disclaimerNote: r.content.disclaimerNote,
    supportNote: r.content.supportNote,
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
  };
}

export async function getService(id: string): Promise<ServiceTemplate | null> {
  const rows = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id)).limit(1);
  return rows[0] ? serviceFromRow(rows[0]) : null;
}

export async function listServices(): Promise<ServiceTemplate[]> {
  const rows = await db.select().from(serviceTemplates).orderBy(desc(serviceTemplates.createdAt));
  return rows.map(serviceFromRow);
}

export async function deleteService(id: string): Promise<void> {
  await db.delete(serviceTemplates).where(eq(serviceTemplates.id, id));
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

export async function listDocuments(): Promise<AdminDocument[]> {
  const rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
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
  services: ServiceTemplate[];
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
export async function searchEverything(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY_SEARCH;
  const pattern = `%${q}%`;

  const [clientHits, employeeHits, serviceHits] = await Promise.all([
    db
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
      .limit(SEARCH_LIMIT),
    db
      .select()
      .from(employees)
      .where(or(ilike(employees.name, pattern), ilike(employees.email, pattern)))
      .orderBy(employees.name)
      .limit(SEARCH_LIMIT),
    db
      .select()
      .from(serviceTemplates)
      .where(ilike(serviceTemplates.name, pattern))
      .orderBy(serviceTemplates.name)
      .limit(SEARCH_LIMIT),
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
    .where(or(...documentMatch))
    .orderBy(desc(documents.createdAt))
    .limit(SEARCH_LIMIT);

  return {
    documents: documentHits.map((r) => fromRow(r as DocumentRow)),
    clients: clientHits.map(clientFromRow),
    employees: employeeHits.map(employeeFromRow),
    services: serviceHits.map(serviceFromRow),
  };
}
