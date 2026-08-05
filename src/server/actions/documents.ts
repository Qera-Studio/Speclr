'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import {
  financialYearCodeOfISODate,
  financialYearStart,
  todayISO,
} from '@/lib/domain/dates';
import { DOC_TYPES, type DocFields } from '@/lib/domain/registry';
import { computeTotals } from '@/lib/domain/money';
import { materialiseContent } from '@/lib/domain/docContent';
import {
  clientSnapshotOf,
  type ActionResult,
  type AdminDocument,
  type ClientSnapshot,
  type ContractDocument,
  type DocTypeCode,
  type EmployeeSnapshot,
  type InvoiceDocument,
  type InvoiceOption,
  type LetterDocument,
  type ReceiptDocument,
  type StipendDocument,
} from '@/lib/domain/types';
import type { EmployeeRecord } from '@/lib/domain/employee';
import { claimSerial } from '@/db/counter';
import {
  deleteDraft as storeDeleteDraft,
  getClient,
  getDocument,
  getEmployee,
  getStudioSettings,
  listFinalizedInvoicesForClient,
  saveDocument,
} from '@/db/store';
import { logger } from '@/lib/logger';
import { authorized } from './authGate';

/** True for HR documents (stipend slip + letters) — employee-based, not client. */
function isHrKind(kind: string): boolean {
  return kind === 'hr-slip' || kind === 'hr-letter';
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
    /**
     * Carries `bank.upiQrDataUrl` deliberately. The QR prints on the stipend
     * slip, so a slip issued today must keep showing the QR that was current
     * today, even if the employee changes bank next year — that is what the
     * snapshot is for. This runs at finalize and writes the permanent record,
     * so the inclusion is intentional, not incidental.
     */
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
      content: fields.content,
    };
  }
  if (base.type === 'STP') {
    // Stipend slip — financial-shaped (line items) but employee-based, and
    // never taxed: `gstRatePercent` is pinned to 0 by the schema. `base` carries
    // employeeId/employeeSnapshot (built by the caller) and omits
    // clientId/clientSnapshot, which are optional on BaseDocument now.
    return {
      ...base,
      issueDate: fields.issueDate,
      lineItems: fields.lineItems,
      gstRatePercent: 0,
      currency: fields.currency,
      stipendPeriod: fields.stipendPeriod,
      stipendPeriodStart: fields.stipendPeriodStart,
      stipendPeriodEnd: fields.stipendPeriodEnd,
      stipendMonth: fields.stipendMonth ?? '',
      paymentMethod: fields.paymentMethod ?? '',
      paymentReference: fields.paymentReference,
      deductionsNote: fields.deductionsNote ?? '',
      content: fields.content,
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
    content: fields.content,
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
    content: fields.content,
  };
}

/**
 * Name the offending field instead of returning a bare "Invalid input."
 *
 * A payload that silently fails `safeParse` used to be undiagnosable from the
 * UI — a missing `employeeId` looked identical to a malformed date. The message
 * stays terse and leaks no values, only the field path.
 */
function invalidInput(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input.';
  const path = issue.path.join('.');
  return path ? `Invalid input: ${path} — ${issue.message}` : `Invalid input: ${issue.message}`;
}

export async function createDraft(
  typeCode: unknown,
  clientId: unknown,
  data: unknown,
): Promise<ActionResult> {
  const actor = await authorized();
  if (!actor) return { success: false, error: 'Unauthorized.' };

  if (typeof typeCode !== 'string' || !(typeCode in DOC_TYPES)) {
    return { success: false, error: 'Invalid input.' };
  }
  const spec = DOC_TYPES[typeCode as DocTypeCode];

  if (typeof clientId !== 'string' || clientId.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = spec.draftSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: invalidInput(parsed.error) };

  const now = Date.now();
  // HR docs snapshot an employee (2nd param is the employeeId); financial and
  // contract docs snapshot a client (2nd param is the clientId). `spec.code` is
  // the validated discriminant, but TS can't correlate it with the subject-field
  // pairing at compile time (the correlation is runtime, via spec.kind), so the
  // base is asserted to its distributive union — see the note on DocBase.
  const identity = {
    id: randomUUID(),
    type: spec.code,
    status: 'draft' as const,
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
  };
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
      clientSnapshot: clientSnapshotOf(client),
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
  if (!parsed.success) return { success: false, error: invalidInput(parsed.error) };

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
      clientSnapshot: clientSnapshotOf(client),
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
  const actor = await authorized();
  if (!actor) return { success: false, error: 'Unauthorized.' };

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
    clientSnapshot = clientSnapshotOf(client);
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

  // Freeze the studio's own identity block too. The details are editable, so
  // without this a later address change would silently rewrite the "from:" block
  // of every invoice already filed — which CGST s.36 (72-month unaltered
  // retention) and Rule 46 (supplier address as at issue) do not allow.
  const studioSnapshot = await getStudioSettings();

  // Freeze the words too. The sheets resolve mastheads, TERMS, the MSA clauses
  // and the signatory block from defaults in code; without materialising them
  // here, revising that wording later would rewrite documents already issued.
  // Resolved against the snapshots just built, so it matches what prints.
  const content = materialiseContent(
    {
      type: existing.type,
      content: existing.content,
      studioSnapshot,
      deductionsNote: (existing as StipendDocument).deductionsNote,
      employeeSnapshot,
    },
    spec,
  );

  // `existing` is already a well-formed union member; we only refresh the one
  // subject snapshot that applies to its kind.
  const finalized = {
    ...existing,
    status: 'finalized',
    ...(number ? { number, serial, year } : {}),
    ...(hr ? { employeeSnapshot } : { clientSnapshot }),
    studioSnapshot,
    content,
    updatedAt: Date.now(),
    finalizedAt: Date.now(),
    // Who issued it. `createdBy` rides along untouched from `existing` — the
    // drafter and the issuer are two separate facts and one must not overwrite
    // the other.
    finalizedBy: actor,
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
        // A burned GST serial is an accounting event someone has to reconcile.
        // The Clerk id, never the email — the logger deliberately carries no PII.
        actor: actor.userId,
        error: err,
      });
      return { success: false, error: 'Failed to save. The claimed number was not used.' };
    }
  }

  logger.info({
    action: 'finalizeDocument',
    event: 'document_finalized',
    number,
    actor: actor.userId,
  });
  revalidatePath('/');
  return { success: true, id };
}

export async function duplicateDocument(id: unknown): Promise<ActionResult> {
  const actor = await authorized();
  if (!actor) return { success: false, error: 'Unauthorized.' };

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
    // A duplicate is a fresh draft: it should show the studio's current details
    // and freeze them again when it is finalized in its own right.
    studioSnapshot: undefined,
    issueDate: todayISO(),
    createdAt: now,
    updatedAt: now,
    // Spreading `existing` would otherwise inherit the original's audit trail,
    // crediting this new draft to whoever wrote the document it was copied from
    // and marking an unissued draft as already-issued. The duplicator drafted
    // this one; nobody has issued it.
    createdBy: actor,
    finalizedBy: undefined,
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

/**
 * Starts a receipt draft that settles an already-issued invoice.
 *
 * The one-click path behind "Receipt for QS-INV-…" on the receipt list. It
 * carries across exactly what the editor's own invoice picker carries (see
 * `applyInvoice` in `DocumentEditor`) — line items, GST rate, GST label, place
 * of supply — and links the receipt to the invoice by *both* id and printed
 * number, which must always be set together.
 *
 * Finalized invoices only. A draft has no number, so there is nothing for a
 * receipt to reference; and everything stays editable afterwards, because a
 * receipt may settle part of an invoice.
 */
export async function createReceiptForInvoice(invoiceId: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof invoiceId !== 'string') return { success: false, error: 'Invalid input.' };

  const invoice = await getDocument(invoiceId);
  if (!invoice) return { success: false, error: 'Invoice not found.' };
  if (invoice.type !== 'INV' || invoice.status !== 'finalized' || !invoice.number) {
    return { success: false, error: 'Only a finalized invoice can be receipted.' };
  }

  // Delegated rather than assembled here: `createDraft` owns validation, the
  // client snapshot, the save, and the revalidate. One path, one set of rules.
  return createDraft('REC', invoice.clientId, {
    issueDate: todayISO(),
    lineItems: invoice.lineItems,
    gstRatePercent: invoice.gstRatePercent,
    gstLabel: invoice.gstLabel,
    placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
    notes: invoice.notes,
    payment: {
      date: todayISO(),
      method: 'Bank Transfer',
      againstInvoiceId: invoice.id,
      againstInvoiceNumber: invoice.number,
    },
  });
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

/**
 * Finalized invoices for a client, newest first.
 *
 * Auth-gated like every other action — the list of a client's invoices is not
 * public just because the caller knows a client id.
 */
export async function listInvoicesForClient(clientId: unknown): Promise<InvoiceOption[]> {
  if (!(await authorized())) return [];
  if (typeof clientId !== 'string' || clientId.length === 0) return [];

  try {
    const docs = await listFinalizedInvoicesForClient(clientId);
    return docs.flatMap((doc) => {
      // A finalized invoice always has a number; skip anything that somehow
      // doesn't rather than offering an unidentifiable row.
      if (doc.type !== 'INV' || !doc.number) return [];
      return [
        {
          id: doc.id,
          number: doc.number,
          issueDate: doc.issueDate,
          totalPaise: computeTotals(doc.lineItems, doc.gstRatePercent).totalPaise,
          lineItems: doc.lineItems,
          gstRatePercent: doc.gstRatePercent,
          placeOfSupplyStateCode: doc.placeOfSupplyStateCode,
          gstLabel: doc.gstLabel,
        },
      ];
    });
  } catch (err) {
    logger.error({ action: 'listInvoicesForClient', event: 'query_failed', error: err });
    return [];
  }
}
