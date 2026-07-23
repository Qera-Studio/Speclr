'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import {
  financialYearCodeOfISODate,
  financialYearStart,
  todayISO,
} from '@/lib/domain/dates';
import { DOC_TYPES, type DocFields } from '@/lib/domain/registry';
import type {
  ActionResult,
  AdminDocument,
  ClientRecord,
  ClientSnapshot,
  ContractDocument,
  DocTypeCode,
  EmployeeSnapshot,
  InvoiceDocument,
  LetterDocument,
  ReceiptDocument,
  StipendDocument,
} from '@/lib/domain/types';
import type { EmployeeRecord } from '@/lib/domain/employee';
import { claimSerial } from '@/db/counter';
import {
  deleteDraft as storeDeleteDraft,
  getClient,
  getDocument,
  getEmployee,
  saveDocument,
} from '@/db/store';
import { logger } from '@/lib/logger';
import { authorized } from './authGate';

/** True for HR documents (stipend slip + letters) — employee-based, not client. */
function isHrKind(kind: string): boolean {
  return kind === 'hr-slip' || kind === 'hr-letter';
}

function snapshotOf(client: ClientRecord): ClientSnapshot {
  return {
    name: client.name,
    address: client.address,
    email: client.email,
    phone: client.phone,
    gstin: client.gstin,
  };
}

function employeeSnapshotOf(employee: EmployeeRecord): EmployeeSnapshot {
  return {
    name: employee.name,
    address: employee.address,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    engagementType: employee.engagementType,
    pronoun: employee.pronoun,
    joiningDate: employee.joiningDate,
    endDate: employee.endDate,
    bank: employee.bank,
  };
}

/**
 * Identity/status fields carried into a document, plus exactly one subject:
 * client fields (financial/contract) OR employee fields (HR). BaseDocument now
 * makes all four optional, so the caller supplies the correct pair and each
 * branch below asserts the concrete union member it constructs.
 */
// Distributes over each union member instead of flattening to common keys,
// so each branch's base keeps its own required subject fields (client vs employee).
type DocBaseOf<T> = T extends AdminDocument
  ? Omit<T, 'lineItems' | 'issueDate' | 'gstRatePercent'>
  : never;
type DocBase = DocBaseOf<AdminDocument>;

/**
 * Assembles the typed union member from a base + validated fields.
 *
 * Narrows on `base.type` — the base's OWN discriminant — so each branch narrows
 * `base` to the matching `Omit<Member,…>` and the returned literal satisfies the
 * concrete union member with no cast. (Narrowing the separate `type` param would
 * not narrow `base`, since they are independent bindings.)
 *
 * Single-literal members (INV/REC/CON/STP) are checked explicitly and the
 * letters (whose `type` is itself the union 'OFR'|'EXP'|'EXIT') fall through
 * last — TS narrows a union-valued discriminant cleanly as the remaining case
 * but not via sequential `||` equality checks.
 */
function withFields(base: DocBase, fields: DocFields): AdminDocument {
  if (base.type === 'CON') {
    // Contracts carry schedules, never line items / GST / payment. Empty
    // financial defaults satisfy BaseDocument's required fields (mirrors the
    // registry's CON defaultFields).
    return {
      ...base,
      issueDate: fields.issueDate,
      lineItems: [],
      gstRatePercent: 0,
      schedules: fields.schedules ?? [],
    };
  }
  if (base.type === 'STP') {
    // Stipend slip — financial-shaped (line items + GST) but employee-based.
    // `base` carries employeeId/employeeSnapshot (built by the caller) and omits
    // clientId/clientSnapshot, which are optional on BaseDocument now.
    return {
      ...base,
      issueDate: fields.issueDate,
      lineItems: fields.lineItems,
      gstRatePercent: fields.gstRatePercent,
      gstLabel: fields.gstLabel,
      stipendPeriod: fields.stipendPeriod ?? '',
      stipendMonth: fields.stipendMonth ?? '',
      paymentMethod: fields.paymentMethod ?? '',
      paymentReference: fields.paymentReference,
      deductionsNote: fields.deductionsNote ?? '',
    };
  }
  // INV/REC share every money field.
  const sharedMoney = {
    issueDate: fields.issueDate,
    lineItems: fields.lineItems,
    gstRatePercent: fields.gstRatePercent,
    gstLabel: fields.gstLabel,
    placeOfSupplyStateCode: fields.placeOfSupplyStateCode,
    notes: fields.notes,
    terms: fields.terms,
  };
  if (base.type === 'INV') {
    return { ...base, ...sharedMoney, dueDate: fields.dueDate };
  }
  if (base.type === 'REC') {
    return {
      ...base,
      ...sharedMoney,
      payment: fields.payment ?? { date: '', method: 'Bank Transfer' },
    };
  }
  // Letters (OFR/EXP/EXIT) — no line items or GST; zero-values satisfy BaseDocument.
  return {
    ...base,
    issueDate: fields.issueDate,
    lineItems: [],
    gstRatePercent: 0,
    bodyParagraphs: fields.bodyParagraphs ?? [],
    bulletSections: fields.bulletSections ?? [],
    payAmountPaise: fields.payAmountPaise,
  };
}

export async function createDraft(
  typeCode: unknown,
  clientId: unknown,
  data: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof typeCode !== 'string' || !(typeCode in DOC_TYPES)) {
    return { success: false, error: 'Invalid input.' };
  }
  const spec = DOC_TYPES[typeCode as DocTypeCode];

  if (typeof clientId !== 'string' || clientId.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = spec.draftSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const now = Date.now();
  // HR docs snapshot an employee (2nd param is the employeeId); financial and
  // contract docs snapshot a client (2nd param is the clientId). `spec.code` is
  // the validated discriminant, but TS can't correlate it with the subject-field
  // pairing at compile time (the correlation is runtime, via spec.kind), so the
  // base is asserted to its distributive union — see the note on DocBase.
  const identity = { id: randomUUID(), type: spec.code, status: 'draft' as const, createdAt: now, updatedAt: now };
  let base: DocBase;
  if (isHrKind(spec.kind)) {
    const employee = await getEmployee(clientId);
    if (!employee) return { success: false, error: 'Employee not found.' };
    base = {
      ...identity,
      employeeId: clientId,
      employeeSnapshot: employeeSnapshotOf(employee),
    } as DocBase;
  } else {
    const client = await getClient(clientId);
    if (!client) return { success: false, error: 'Client not found.' };
    base = {
      ...identity,
      clientId,
      clientSnapshot: snapshotOf(client),
    } as DocBase;
  }

  const doc = withFields(base, parsed.data as DocFields);

  try {
    await saveDocument(doc);
  } catch (err) {
    logger.error({ action: 'createDraft', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save draft.' };
  }

  revalidatePath('/');
  return { success: true, id: doc.id };
}

export async function updateDraft(
  id: unknown,
  clientId: unknown,
  data: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || typeof clientId !== 'string' || clientId.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const existing = await getDocument(id);
  if (!existing) return { success: false, error: 'Document not found.' };
  if (existing.status === 'finalized') {
    return { success: false, error: 'Finalized documents cannot be edited.' };
  }

  const spec = DOC_TYPES[existing.type];
  const parsed = spec.draftSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  // As in createDraft, the subject-field pairing is correlated to the type only
  // at runtime (via spec.kind), so the rebuilt base is asserted to DocBase.
  let base: DocBase;
  if (isHrKind(spec.kind)) {
    const employee = await getEmployee(clientId);
    if (!employee) return { success: false, error: 'Employee not found.' };
    base = {
      ...existing,
      employeeId: clientId,
      employeeSnapshot: employeeSnapshotOf(employee),
      updatedAt: Date.now(),
    } as DocBase;
  } else {
    const client = await getClient(clientId);
    if (!client) return { success: false, error: 'Client not found.' };
    base = {
      ...existing,
      clientId,
      clientSnapshot: snapshotOf(client),
      updatedAt: Date.now(),
    } as DocBase;
  }

  const doc = withFields(base, parsed.data as DocFields);

  try {
    await saveDocument(doc);
  } catch (err) {
    logger.error({ action: 'updateDraft', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save draft.' };
  }

  revalidatePath('/');
  return { success: true, id };
}

export async function finalizeDocument(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string') return { success: false, error: 'Invalid input.' };

  const existing = await getDocument(id);
  if (!existing) return { success: false, error: 'Document not found.' };
  if (existing.status === 'finalized') {
    return { success: false, error: 'Document is already finalized.' };
  }

  // Drafts may be half-filled; finalize demands completeness.
  const spec = DOC_TYPES[existing.type];
  const parsed = spec.finalizeSchema.safeParse(existing);
  if (!parsed.success) {
    return { success: false, error: 'Document is incomplete — fill every required field first.' };
  }

  // Refresh the frozen subject snapshot from the live record: HR docs snapshot
  // the employee; financial/contract docs snapshot the client.
  const hr = isHrKind(spec.kind);
  let clientSnapshot: ClientSnapshot | undefined;
  let employeeSnapshot: EmployeeSnapshot | undefined;
  if (hr) {
    const employeeId = (existing as StipendDocument | LetterDocument).employeeId;
    const employee = await getEmployee(employeeId);
    if (!employee) return { success: false, error: 'Employee not found.' };
    employeeSnapshot = employeeSnapshotOf(employee);
  } else {
    const clientId = (existing as InvoiceDocument | ReceiptDocument | ContractDocument).clientId;
    const client = await getClient(clientId);
    if (!client) return { success: false, error: 'Client not found.' };
    clientSnapshot = snapshotOf(client);
  }

  // Numbered docs: financial (invoices/receipts) and hr-slip (stipend). Letters
  // and contracts are unnumbered. Number per Indian financial year (Apr–Mar),
  // not calendar year, so each FY's sequence stays consecutive as GST Rule 46
  // expects. `year` stores the FY start (e.g. 2025 for FY 2025-26); the number
  // carries the compact FY code (e.g. '2526').
  let number: string | undefined;
  let serial: number | undefined;
  let year: number | undefined;
  if (spec.kind === 'financial' || spec.kind === 'hr-slip') {
    year = financialYearStart(existing.issueDate);
    const fyCode = financialYearCodeOfISODate(existing.issueDate);

    // Atomic claim — INCR can never hand out the same number twice. Claimed
    // only now, so abandoned drafts never burn a serial.
    try {
      ({ serial, number } = await claimSerial(existing.type, fyCode));
    } catch (err) {
      logger.error({ action: 'finalizeDocument', event: 'serial_claim_failed', error: err });
      return { success: false, error: 'Failed to claim a document number. Try again.' };
    }
  }

  // `existing` is already a well-formed union member; we only refresh the one
  // subject snapshot that applies to its kind.
  const finalized = {
    ...existing,
    status: 'finalized',
    ...(number ? { number, serial, year } : {}),
    ...(hr ? { employeeSnapshot } : { clientSnapshot }),
    updatedAt: Date.now(),
    finalizedAt: Date.now(),
  } as AdminDocument;

  // The serial is already reserved — retry the save once before giving up,
  // and log loudly if the number ends up burned (gap, never a duplicate).
  try {
    await saveDocument(finalized);
  } catch {
    try {
      await saveDocument(finalized);
    } catch (err) {
      logger.error({
        action: 'finalizeDocument',
        event: 'serial_claimed_but_save_failed',
        number,
        error: err,
      });
      return { success: false, error: 'Failed to save. The claimed number was not used.' };
    }
  }

  logger.info({ action: 'finalizeDocument', event: 'document_finalized', number });
  revalidatePath('/');
  return { success: true, id };
}

export async function duplicateDocument(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string') return { success: false, error: 'Invalid input.' };

  const existing = await getDocument(id);
  if (!existing) return { success: false, error: 'Document not found.' };

  const now = Date.now();
  const copy: AdminDocument = {
    ...existing,
    id: randomUUID(),
    status: 'draft',
    number: undefined,
    serial: undefined,
    year: undefined,
    finalizedAt: undefined,
    issueDate: todayISO(),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveDocument(copy);
  } catch (err) {
    logger.error({ action: 'duplicateDocument', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to duplicate.' };
  }

  revalidatePath('/');
  return { success: true, id: copy.id };
}

export async function deleteDraftAction(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string') return { success: false, error: 'Invalid input.' };

  try {
    await storeDeleteDraft(id);
  } catch (err) {
    logger.error({ action: 'deleteDraft', event: 'delete_failed', error: err });
    return { success: false, error: 'Failed to delete draft.' };
  }

  revalidatePath('/');
  return { success: true };
}
