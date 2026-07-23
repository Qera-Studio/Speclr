import 'server-only';

import { computeTotals } from '@/lib/domain/money';
import type {
  AdminDocument,
  ClientSnapshot,
  ContractDocument,
  EmployeeSnapshot,
  InvoiceDocument,
  LetterDocument,
  ReceiptDocument,
  StipendDocument,
} from '@/lib/domain/types';
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
}

/** Value written for a document's insert/update (id + timestamps handled by the store). */
export type DocumentInsert = Omit<DocumentRow, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

const HR_TYPES = new Set(['STP', 'OFR', 'EXP', 'EXIT']);

/** Split an AdminDocument into flat columns + JSONB for storage. */
export function toRow(doc: AdminDocument): DocumentInsert {
  const totals = computeTotals(doc.lineItems ?? [], doc.gstRatePercent);

  // Everything type-specific + shared-optional goes into `data`.
  const data: DocumentData = {
    lineItems: doc.lineItems,
    gstLabel: doc.gstLabel,
    notes: doc.notes,
    terms: doc.terms,
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
    case 'CON':
      clientId = doc.clientId;
      snapshot = doc.clientSnapshot ?? null;
      data.schedules = doc.schedules;
      break;
    case 'STP':
      employeeId = doc.employeeId;
      snapshot = doc.employeeSnapshot ?? null;
      data.stipendPeriod = doc.stipendPeriod;
      data.stipendMonth = doc.stipendMonth;
      data.paymentMethod = doc.paymentMethod;
      data.paymentReference = doc.paymentReference;
      data.deductionsNote = doc.deductionsNote;
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
    totalPaise: totals.totalPaise,
    data,
    snapshot,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    finalizedAt: doc.finalizedAt ? new Date(doc.finalizedAt) : null,
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
    notes: row.data.notes,
    terms: row.data.terms,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    finalizedAt: row.finalizedAt ? row.finalizedAt.getTime() : undefined,
  };

  if (HR_TYPES.has(row.type)) {
    const employeeId = row.employeeId ?? '';
    const employeeSnapshot = (row.snapshot ?? undefined) as EmployeeSnapshot | undefined;
    if (row.type === 'STP') {
      return {
        ...base,
        type: 'STP',
        employeeId,
        employeeSnapshot: employeeSnapshot as EmployeeSnapshot,
        stipendPeriod: row.data.stipendPeriod ?? '',
        stipendMonth: row.data.stipendMonth ?? '',
        paymentMethod: row.data.paymentMethod ?? '',
        paymentReference: row.data.paymentReference,
        deductionsNote: row.data.deductionsNote ?? '',
      } satisfies StipendDocument;
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
  return {
    ...clientBase,
    type: 'CON',
    schedules: row.data.schedules ?? [],
  } satisfies ContractDocument;
}
