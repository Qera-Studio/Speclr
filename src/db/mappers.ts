import 'server-only';

import { computeTotals, slipTotals } from '@/lib/domain/money';
import { isHrDocType } from '@/lib/domain/registry';
import type {
  Actor,
  AdminDocument,
  ClientRecord,
  ClientSnapshot,
  ContractDocument,
  CreditNoteDocument,
  EmployeeSnapshot,
  InvoiceDocument,
  LetterDocument,
  ReceiptDocument,
  SlipDocument,
} from '@/lib/domain/types';
import type { clients } from './schema';
import type { DocumentData } from './schema';

/**
 * Maps between the `AdminDocument` discriminated union (the domain's source of
 * truth) and the `documents` table row shape (flat queryable columns + JSONB
 * `data`/`snapshot`).
 *
 * The row is a *projection*: the flat columns are denormalized for querying;
 * the whole doc-type-specific payload lives in `data`, and the frozen party
 * lives in `snapshot`. On read we reassemble the exact union member. This keeps
 * the domain types canonical — the DB never invents a shape the domain can't.
 */

// The subset of columns the store writes/reads. Timestamps are numbers in the
// domain (epoch ms) but timestamptz in the DB — we bridge in the store, so the
// row shape here uses the DB-facing types the Drizzle table produces.
export interface DocumentRow {
  id: string;
  type: AdminDocument['type'];
  status: AdminDocument['status'];
  number: string | null;
  serial: number | null;
  fyYear: number | null;
  issueDate: string;
  dueDate: string | null;
  clientId: string | null;
  employeeId: string | null;
  gstRatePercent: number;
  placeOfSupplyStateCode: string | null;
  totalPaise: number;
  data: DocumentData;
  snapshot: ClientSnapshot | EmployeeSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
  createdBy: string | null;
  createdByEmail: string | null;
  finalizedBy: string | null;
  finalizedByEmail: string | null;
}

/**
 * Rebuild an `Actor` from its two columns, or undefined when unrecorded.
 *
 * Requires *both* halves. A row with an id but no email (or vice versa) is a
 * half-written actor, and a partial audit record is not evidence of anything —
 * better to report "unknown" than to imply a name we can't stand behind.
 */
function actorFrom(userId: string | null, email: string | null): Actor | undefined {
  return userId && email ? { userId, email } : undefined;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

/** The `clients` row shape, as Drizzle selects it. */
export type ClientRow = typeof clients.$inferSelect;

/**
 * The client's GSTIN, from whichever of the two places holds one.
 *
 * `tax.gstin` is where onboarding writes and validates it; the top-level column
 * is what `ClientSnapshot`, `placeOfSupplyOf` and every sheet read, and what
 * queries can reach. Nothing reconciled them, so a client onboarded through the
 * Tax step read back as *unregistered*: their invoice printed a PAN where Rule
 * 46(e) wants a GSTIN, and place of supply fell back to deriving from the
 * address instead of the registration.
 *
 * Resolving it here rather than in the readers fixes every existing row on read,
 * which is why this needed no migration. The tax group wins because it is the
 * validated half; the column tail catches rows written before it existed.
 */
function gstinOf(client: Pick<ClientRecord, 'tax' | 'gstin'>): string | undefined {
  return client.tax?.gstin || client.gstin || undefined;
}

/** Split a `ClientRecord` into its row. Values are explicitly null, never omitted. */
export function clientToRow(client: ClientRecord) {
  return {
    id: client.id,
    name: client.name,
    companyName: client.companyName ?? null,
    address: client.address,
    // Explicitly null rather than omitted: this same object is the
    // `onConflictDoUpdate` set, so leaving the key out would keep stale parts
    // on the row after an edit that cleared them.
    addressParts: client.addressParts ?? null,
    billingAddressParts: client.billingAddressParts ?? null,
    email: client.email,
    phone: client.phone,
    gstin: gstinOf(client) ?? null,
    // Same rule as `addressParts` above, and it matters more here: clearing a
    // whole section must null the column, not leave the previous section's JSON
    // behind for a sheet or a derivation to read.
    entityType: client.entityType ?? null,
    tax: client.tax ?? null,
    contacts: client.contacts ?? null,
    commercial: client.commercial ?? null,
    attachments: client.attachments ?? null,
    access: client.access ?? null,
    archived: client.archived ?? false,
    createdAt: new Date(client.createdAt),
    updatedAt: new Date(client.updatedAt),
  };
}

/** Rebuild a `ClientRecord` from its row. */
export function clientFromRow(r: ClientRow): ClientRecord {
  return {
    id: r.id,
    name: r.name,
    companyName: r.companyName ?? undefined,
    address: r.address,
    addressParts: r.addressParts ?? undefined,
    billingAddressParts: r.billingAddressParts ?? undefined,
    email: r.email,
    phone: r.phone,
    gstin: gstinOf({ tax: r.tax ?? undefined, gstin: r.gstin ?? undefined }),
    entityType: r.entityType ?? undefined,
    tax: r.tax ?? undefined,
    contacts: r.contacts ?? undefined,
    commercial: r.commercial ?? undefined,
    attachments: r.attachments ?? undefined,
    access: r.access ?? undefined,
    archived: r.archived,
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
  };
}

// ─── Documents ────────────────────────────────────────────────────────────────

/** Value written for a document's insert/update (id + timestamps handled by the store). */
export type DocumentInsert = Omit<DocumentRow, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Split an AdminDocument into flat columns + JSONB for storage. */
export function toRow(doc: AdminDocument): DocumentInsert {
  const totals = computeTotals(doc.lineItems ?? [], doc.gstRatePercent);
  // `total_paise` is what the lists and amount filters read, so for a pay slip
  // it has to be the net actually paid, not the gross before deductions.
  const totalPaise =
    doc.type === 'PAY' ? slipTotals(doc.lineItems ?? [], doc.deductions).netPaise : totals.totalPaise;

  // Everything type-specific + shared-optional goes into `data`.
  const data: DocumentData = {
    lineItems: doc.lineItems,
    gstLabel: doc.gstLabel,
    notes: doc.notes,
    placeOfSupplyOverrideReason: doc.placeOfSupplyOverrideReason,
    gstOverrideReason: doc.gstOverrideReason,
    terms: doc.terms,
    studioSnapshot: doc.studioSnapshot,
    content: doc.content,
  };
  let snapshot: ClientSnapshot | EmployeeSnapshot | null = null;
  let clientId: string | null = null;
  let employeeId: string | null = null;
  let dueDate: string | null = null;

  switch (doc.type) {
    case 'INV':
      clientId = doc.clientId;
      snapshot = doc.clientSnapshot ?? null;
      dueDate = doc.dueDate ?? null;
      break;
    case 'REC':
      clientId = doc.clientId;
      snapshot = doc.clientSnapshot ?? null;
      data.payment = doc.payment;
      break;
    case 'CRN':
      clientId = doc.clientId;
      snapshot = doc.clientSnapshot ?? null;
      data.againstInvoiceNumber = doc.against.invoiceNumber;
      data.againstInvoiceDate = doc.against.invoiceDate;
      data.againstInvoiceId = doc.against.invoiceId;
      data.creditReason = doc.reason;
      break;
    case 'CON':
      clientId = doc.clientId;
      snapshot = doc.clientSnapshot ?? null;
      data.contract = doc.contract;
      break;
    case 'STP':
    case 'PAY':
      employeeId = doc.employeeId;
      snapshot = doc.employeeSnapshot ?? null;
      data.currency = doc.currency;
      data.stipendPeriod = doc.stipendPeriod;
      data.stipendPeriodStart = doc.stipendPeriodStart;
      data.stipendPeriodEnd = doc.stipendPeriodEnd;
      data.stipendMonth = doc.stipendMonth;
      data.paymentMethod = doc.paymentMethod;
      data.paymentReference = doc.paymentReference;
      data.deductionsNote = doc.deductionsNote;
      data.deductions = doc.deductions;
      data.daysInPeriod = doc.daysInPeriod;
      data.daysPaid = doc.daysPaid;
      data.lopDays = doc.lopDays;
      break;
    case 'OFR':
    case 'EXP':
    case 'EXIT':
      employeeId = doc.employeeId;
      snapshot = doc.employeeSnapshot ?? null;
      data.bodyParagraphs = doc.bodyParagraphs;
      data.bulletSections = doc.bulletSections;
      data.payAmountPaise = doc.payAmountPaise;
      break;
  }

  return {
    id: doc.id,
    type: doc.type,
    status: doc.status,
    number: doc.number ?? null,
    serial: doc.serial ?? null,
    fyYear: doc.year ?? null,
    issueDate: doc.issueDate,
    dueDate,
    clientId,
    employeeId,
    gstRatePercent: doc.gstRatePercent,
    placeOfSupplyStateCode: doc.placeOfSupplyStateCode ?? null,
    totalPaise,
    data,
    snapshot,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    finalizedAt: doc.finalizedAt ? new Date(doc.finalizedAt) : null,
    createdBy: doc.createdBy?.userId ?? null,
    createdByEmail: doc.createdBy?.email ?? null,
    finalizedBy: doc.finalizedBy?.userId ?? null,
    finalizedByEmail: doc.finalizedBy?.email ?? null,
  };
}

/** Reassemble the exact AdminDocument union member from a stored row. */
export function fromRow(row: DocumentRow): AdminDocument {
  const base = {
    id: row.id,
    status: row.status,
    number: row.number ?? undefined,
    serial: row.serial ?? undefined,
    year: row.fyYear ?? undefined,
    issueDate: row.issueDate,
    lineItems: row.data.lineItems ?? [],
    gstRatePercent: row.gstRatePercent,
    placeOfSupplyStateCode: row.placeOfSupplyStateCode ?? undefined,
    gstLabel: row.data.gstLabel,
    placeOfSupplyOverrideReason: row.data.placeOfSupplyOverrideReason,
    gstOverrideReason: row.data.gstOverrideReason,
    notes: row.data.notes,
    terms: row.data.terms,
    studioSnapshot: row.data.studioSnapshot,
    content: row.data.content,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    finalizedAt: row.finalizedAt ? row.finalizedAt.getTime() : undefined,
    createdBy: actorFrom(row.createdBy, row.createdByEmail),
    finalizedBy: actorFrom(row.finalizedBy, row.finalizedByEmail),
  };

  if (isHrDocType(row.type)) {
    const employeeId = row.employeeId ?? '';
    const employeeSnapshot = (row.snapshot ?? undefined) as EmployeeSnapshot | undefined;
    if (row.type === 'STP' || row.type === 'PAY') {
      return {
        ...base,
        type: row.type,
        employeeId,
        employeeSnapshot: employeeSnapshot as EmployeeSnapshot,
        currency: row.data.currency,
        stipendPeriod: row.data.stipendPeriod ?? '',
        stipendPeriodStart: row.data.stipendPeriodStart,
        stipendPeriodEnd: row.data.stipendPeriodEnd,
        stipendMonth: row.data.stipendMonth ?? '',
        paymentMethod: row.data.paymentMethod ?? '',
        paymentReference: row.data.paymentReference,
        deductionsNote: row.data.deductionsNote ?? '',
        deductions: row.data.deductions,
        daysInPeriod: row.data.daysInPeriod,
        daysPaid: row.data.daysPaid,
        lopDays: row.data.lopDays,
      } satisfies SlipDocument;
    }
    return {
      ...base,
      type: row.type as LetterDocument['type'],
      employeeId,
      employeeSnapshot: employeeSnapshot as EmployeeSnapshot,
      bodyParagraphs: row.data.bodyParagraphs ?? [],
      bulletSections: row.data.bulletSections ?? [],
      payAmountPaise: row.data.payAmountPaise,
    } satisfies LetterDocument;
  }

  // Client-party documents.
  const clientBase = {
    ...base,
    clientId: row.clientId ?? '',
    clientSnapshot: (row.snapshot ?? undefined) as ClientSnapshot,
  };
  if (row.type === 'INV') {
    return { ...clientBase, type: 'INV', dueDate: row.dueDate ?? undefined } satisfies InvoiceDocument;
  }
  if (row.type === 'REC') {
    return {
      ...clientBase,
      type: 'REC',
      payment: row.data.payment as ReceiptDocument['payment'],
    } satisfies ReceiptDocument;
  }
  if (row.type === 'CRN') {
    return {
      ...clientBase,
      type: 'CRN',
      against: {
        invoiceNumber: row.data.againstInvoiceNumber,
        invoiceDate: row.data.againstInvoiceDate,
        invoiceId: row.data.againstInvoiceId,
      },
      reason: row.data.creditReason,
    } satisfies CreditNoteDocument;
  }
  return {
    ...clientBase,
    type: 'CON',
    contract: row.data.contract ?? { parts: [], blanks: {}, library: {} },
  } satisfies ContractDocument;
}
