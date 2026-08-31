"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { storePdfQuietly } from "@/server/pdf/store";
import { invalidInput } from "./validation";
import {
  financialYearCodeOfISODate,
  financialYearStart,
  firstDayOfMonth,
  isISOMonth,
  lastDayOfMonth,
  todayISO,
} from "@/lib/domain/dates";
import {
  DOC_TYPES,
  isHrDocType,
  isSlip,
  type DocFields,
} from "@/lib/domain/registry";
import { computeTotals } from "@/lib/domain/money";
import { placeOfSupplyOf } from "@/lib/domain/placeOfSupply";
import { gstTreatmentMismatch } from "@/lib/domain/gstTreatment";
import { materialiseContent } from "@/lib/domain/docContent";
import {
  clientSnapshotOf,
  type ActionResult,
  type AdminDocument,
  type ClientSnapshot,
  type ContractDocument,
  type CreditNoteDocument,
  type DocTypeCode,
  type EmployeeSnapshot,
  type InvoiceDocument,
  type InvoiceOption,
  type LetterDocument,
  type ReceiptDocument,
  type SlipDocument,
  type Actor,
} from "@/lib/domain/types";
import type { EmployeeRecord } from "@/lib/domain/employee";
import { claimSerial } from "@/db/counter";
import {
  deleteDraft as storeDeleteDraft,
  getClient,
  getDocument,
  getEmployee,
  getStudioSettings,
  listFinalizedInvoicesForClient,
  saveDocument,
} from "@/db/store";
import { logger } from "@/lib/logger";
import { authorized } from "./authGate";

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
    /**
     * Frozen for the same reason: a pay slip is a statutory wage record, and
     * the PAN/UAN it was issued under must not change when the employee record
     * is corrected later.
     */
    payroll: employee.payroll,
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
  ? Omit<T, "lineItems" | "issueDate" | "gstRatePercent">
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
  if (base.type === "CON") {
    // Contracts carry Parts and blanks, never line items / GST / payment.
    // Empty financial defaults satisfy BaseDocument's required fields (mirrors
    // the registry's CON defaultFields).
    return {
      ...base,
      issueDate: fields.issueDate,
      lineItems: [],
      gstRatePercent: 0,
      contract: fields.contract ?? { parts: [], blanks: {}, library: {} },
      content: fields.content,
    };
  }
  // The slips — financial-shaped (line items) but employee-based, and never
  // taxed: `gstRatePercent` is pinned to 0 by the schema. `base` carries
  // employeeId/employeeSnapshot (built by the caller) and omits
  // clientId/clientSnapshot, which are optional on BaseDocument now.
  //
  // The deductions and day counts are PAY-only in practice but written
  // unconditionally: the schema is what keeps them off a stipend slip, and
  // undefined round-trips as absent either way.
  //
  const slipFields = {
    issueDate: fields.issueDate,
    lineItems: fields.lineItems,
    gstRatePercent: 0 as const,
    currency: fields.currency,
    stipendPeriod: fields.stipendPeriod,
    stipendPeriodStart: fields.stipendPeriodStart,
    stipendPeriodEnd: fields.stipendPeriodEnd,
    stipendMonth: fields.stipendMonth ?? "",
    paymentMethod: fields.paymentMethod ?? "",
    paymentReference: fields.paymentReference,
    deductionsNote: fields.deductionsNote ?? "",
    deductions: fields.deductions,
    daysInPeriod: fields.daysInPeriod,
    daysPaid: fields.daysPaid,
    lopDays: fields.lopDays,
    content: fields.content,
  };
  if (base.type === "STP" || base.type === "PAY") {
    return { ...base, ...slipFields } satisfies SlipDocument;
  }
  // INV/REC share every money field.
  const sharedMoney = {
    issueDate: fields.issueDate,
    lineItems: fields.lineItems,
    gstRatePercent: fields.gstRatePercent,
    gstLabel: fields.gstLabel,
    discountPercent: fields.discountPercent,
    discountPaise: fields.discountPaise,
    placeOfSupplyStateCode: fields.placeOfSupplyStateCode,
    placeOfSupplyOverrideReason: fields.placeOfSupplyOverrideReason,
    gstOverrideReason: fields.gstOverrideReason,
    notes: fields.notes,
    terms: fields.terms,
    content: fields.content,
  };
  if (base.type === "INV") {
    return { ...base, ...sharedMoney, dueDate: fields.dueDate };
  }
  if (base.type === "REC") {
    return {
      ...base,
      ...sharedMoney,
      payment: fields.payment ?? { date: "", method: "Bank Transfer" },
    };
  }
  if (base.type === "CRN") {
    return {
      ...base,
      ...sharedMoney,
      against: {
        invoiceNumber: fields.againstInvoiceNumber,
        invoiceDate: fields.againstInvoiceDate,
        invoiceId: fields.againstInvoiceId,
      },
      reason: fields.creditReason,
    };
  }
  // The Service Quotation — addressed to nobody in particular. `base` carries
  // neither clientId/clientSnapshot nor employeeId/employeeSnapshot (see the
  // third branch in createDraft/updateDraft below), and it prices through
  // `services` rather than `lineItems`, which stays empty only because
  // `BaseDocument` requires it. Quoted prices are inclusive of tax, so no GST
  // is computed anywhere (`quotation.ts`).
  if (base.type === "SQ") {
    return {
      ...base,
      issueDate: fields.issueDate,
      lineItems: [],
      gstRatePercent: 0,
      salutation: fields.salutation,
      recipientName: fields.recipientName,
      companyName: fields.companyName,
      city: fields.city,
      services: fields.services ?? [],
      recurring: fields.recurring ?? [],
      content: fields.content,
    };
  }
  // Letters (OFR/EXP/EXIT) — no line items or GST; zero-values satisfy
  // BaseDocument. `base` is asserted rather than narrowed because there are now
  // *two* members with a union-valued discriminant (the slips and the letters),
  // and only one of them can be the un-narrowed remainder. Every other member
  // has returned above, so this is the letters by exhaustion.
  const letterBase = base as DocBaseOf<LetterDocument>;
  return {
    ...letterBase,
    issueDate: fields.issueDate,
    lineItems: [],
    gstRatePercent: 0,
    bodyParagraphs: fields.bodyParagraphs ?? [],
    bulletSections: fields.bulletSections ?? [],
    payAmountPaise: fields.payAmountPaise,
    content: fields.content,
  };
}

export async function createDraft(
  typeCode: unknown,
  clientId: unknown,
  data: unknown,
): Promise<ActionResult> {
  const actor = await authorized();
  if (!actor) return { success: false, error: "Unauthorized." };

  if (typeof typeCode !== "string" || !(typeCode in DOC_TYPES)) {
    return { success: false, error: "Invalid input." };
  }
  const spec = DOC_TYPES[typeCode as DocTypeCode];

  // Every other document type is addressed to a client or an employee, so an
  // empty recipient is a caller error. A quotation is deliberately addressed to
  // nobody in particular — see `QuotationDocument` — so it is the one type this
  // guard admits with no id at all.
  if (
    spec.kind !== "quotation" &&
    (typeof clientId !== "string" || clientId.length === 0)
  ) {
    return { success: false, error: "Invalid input." };
  }
  // Narrowed once, for the branches below: the guard above proves this is a
  // non-empty string whenever `spec.kind !== "quotation"`, which is the only
  // case any branch below actually reads it.
  const recipientId = typeof clientId === "string" ? clientId : "";

  const parsed = spec.draftSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: invalidInput(parsed.error) };

  const now = Date.now();
  // HR docs snapshot an employee (2nd param is the employeeId); financial and
  // contract docs snapshot a client (2nd param is the clientId); a quotation
  // snapshots neither. `spec.code` is the validated discriminant, but TS can't
  // correlate it with the subject-field pairing at compile time (the
  // correlation is runtime, via spec.kind), so the base is asserted to its
  // distributive union — see the note on DocBase.
  const identity = {
    id: randomUUID(),
    type: spec.code,
    status: "draft" as const,
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
  };
  let base: DocBase;
  if (spec.kind === "quotation") {
    base = { ...identity } as DocBase;
  } else if (isHrDocType(spec.code)) {
    const employee = await getEmployee(recipientId);
    if (!employee) return { success: false, error: "Employee not found." };
    base = {
      ...identity,
      employeeId: recipientId,
      employeeSnapshot: employeeSnapshotOf(employee),
    } as DocBase;
  } else {
    const client = await getClient(recipientId);
    if (!client) return { success: false, error: "Client not found." };
    base = {
      ...identity,
      clientId: recipientId,
      clientSnapshot: clientSnapshotOf(client),
    } as DocBase;
  }

  const doc = withFields(base, parsed.data as DocFields);

  try {
    await saveDocument(doc);
  } catch (err) {
    logger.error({ action: "createDraft", event: "save_failed", error: err });
    return { success: false, error: "Failed to save draft." };
  }

  // Sledgehammer, and the right size of one: a document write can change both
  // profile homes, its type's list page and the document page itself, and after
  // the profile split '/' alone is only a redirect. Same call `studio.ts` uses.
  revalidatePath("/", "layout");
  return { success: true, id: doc.id };
}

export async function updateDraft(
  id: unknown,
  clientId: unknown,
  data: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: "Unauthorized." };

  if (typeof id !== "string") {
    return { success: false, error: "Invalid input." };
  }

  const existing = await getDocument(id);
  if (!existing) return { success: false, error: "Document not found." };
  if (existing.status === "finalized") {
    return { success: false, error: "Finalized documents cannot be edited." };
  }

  const spec = DOC_TYPES[existing.type];

  // As in createDraft, a quotation is the one type addressed to nobody — see
  // the note there.
  if (
    spec.kind !== "quotation" &&
    (typeof clientId !== "string" || clientId.length === 0)
  ) {
    return { success: false, error: "Invalid input." };
  }
  // Narrowed once, for the branches below: the guard above proves this is a
  // non-empty string whenever `spec.kind !== "quotation"`, which is the only
  // case any branch below actually reads it.
  const recipientId = typeof clientId === "string" ? clientId : "";

  const parsed = spec.draftSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: invalidInput(parsed.error) };

  // As in createDraft, the subject-field pairing is correlated to the type only
  // at runtime (via spec.kind), so the rebuilt base is asserted to DocBase.
  let base: DocBase;
  if (spec.kind === "quotation") {
    base = { ...existing, updatedAt: Date.now() } as DocBase;
  } else if (isHrDocType(spec.code)) {
    const employee = await getEmployee(recipientId);
    if (!employee) return { success: false, error: "Employee not found." };
    base = {
      ...existing,
      employeeId: recipientId,
      employeeSnapshot: employeeSnapshotOf(employee),
      updatedAt: Date.now(),
    } as DocBase;
  } else {
    const client = await getClient(recipientId);
    if (!client) return { success: false, error: "Client not found." };
    base = {
      ...existing,
      clientId: recipientId,
      clientSnapshot: clientSnapshotOf(client),
      updatedAt: Date.now(),
    } as DocBase;
  }

  const doc = withFields(base, parsed.data as DocFields);

  try {
    await saveDocument(doc);
  } catch (err) {
    logger.error({ action: "updateDraft", event: "save_failed", error: err });
    return { success: false, error: "Failed to save draft." };
  }

  // Sledgehammer, and the right size of one: a document write can change both
  // profile homes, its type's list page and the document page itself, and after
  // the profile split '/' alone is only a redirect. Same call `studio.ts` uses.
  revalidatePath("/", "layout");
  return { success: true, id };
}

export async function finalizeDocument(id: unknown): Promise<ActionResult> {
  const actor = await authorized();
  if (!actor) return { success: false, error: "Unauthorized." };

  if (typeof id !== "string")
    return { success: false, error: "Invalid input." };

  const existing = await getDocument(id);
  if (!existing) return { success: false, error: "Document not found." };
  if (existing.status === "finalized") {
    return { success: false, error: "Document is already finalized." };
  }

  // Drafts may be half-filled; finalize demands completeness.
  const spec = DOC_TYPES[existing.type];
  const parsed = spec.finalizeSchema.safeParse(existing);
  if (!parsed.success) {
    return {
      success: false,
      error: "Document is incomplete — fill every required field first.",
    };
  }

  // Refresh the frozen subject snapshot from the live record: HR docs snapshot
  // the employee; financial/contract docs snapshot the client. A quotation
  // snapshots neither — it is addressed to nobody in particular.
  const hr = isHrDocType(spec.code);
  const quotation = spec.kind === "quotation";
  let clientSnapshot: ClientSnapshot | undefined;
  let employeeSnapshot: EmployeeSnapshot | undefined;
  if (hr) {
    const employeeId = (existing as SlipDocument | LetterDocument).employeeId;
    const employee = await getEmployee(employeeId);
    if (!employee) return { success: false, error: "Employee not found." };

    /**
     * A pay slip asserts wages paid under a contract of employment, and it is a
     * wage-register entry. Issued to an intern it would contradict every other
     * document in their file — the stipend slip, the offer letter and the
     * internship completion letter all state there is no employment. An intern
     * gets a stipend slip. This lives here rather than in the Zod schema
     * because engagement type comes from the employee record, not the payload.
     */
    if (existing.type === "PAY" && employee.engagementType === "intern") {
      return {
        success: false,
        error: `${employee.name} is engaged as an intern — issue a stipend slip, not a pay slip.`,
      };
    }

    employeeSnapshot = employeeSnapshotOf(employee);
  } else if (!quotation) {
    const clientId = (
      existing as
        | InvoiceDocument
        | ReceiptDocument
        | CreditNoteDocument
        | ContractDocument
    ).clientId;
    const client = await getClient(clientId);
    if (!client) return { success: false, error: "Client not found." };

    /**
     * An overridden place of supply has to say why.
     *
     * Place of supply is derived from the recipient (`placeOfSupply.ts`), and
     * `PRINCIPLES.md` rule 3 permits departing from a derived value on one
     * condition: the override is explicit *and recorded*. CGST s.12(3) and
     * bill-to/ship-to cases genuinely diverge, so the override stays — but an
     * override leaving no trace of why is the same bug the derivation replaced,
     * wearing a different hat. Enforced here rather than in the Zod schema
     * because the derived answer comes from the client record, which the
     * payload cannot see.
     */
    if (existing.gstRatePercent > 0) {
      const derived = placeOfSupplyOf(client);
      const stored = existing.placeOfSupplyStateCode;
      if (
        stored &&
        derived.code &&
        stored !== derived.code &&
        !existing.placeOfSupplyOverrideReason
      ) {
        return {
          success: false,
          error: `This document's place of supply (${stored}) is not the one derived from ${client.name} (${derived.code}). Record why before finalizing.`,
        };
      }
    }

    /**
     * A departure from the client's own tax treatment has to say why.
     *
     * Same rule as the place of supply above, applied to the rate. For an
     * Indian recipient the treatment is derived (`gstTreatmentOf`), and it is
     * not the operator's to choose: GST on a domestic supply is charged under
     * CGST s.9 whether or not the invoice says so, and the rate follows the
     * classification of the service. So an invoice that drops or changes it is
     * either a genuine exemption, which can be stated, or a mistake, and this
     * is where the two are told apart.
     *
     * **This is the enforcement.** The rail renders the fields read-only, but a
     * read-only input is a convenience for the person typing; the document is
     * reached by other paths and the client record is not in the payload's
     * sight, which is why the check cannot live in the Zod schema.
     */
    const gstMismatch = gstTreatmentMismatch(existing, client);
    if (gstMismatch && !existing.gstOverrideReason) {
      return {
        success: false,
        error: `${gstMismatch} Record why before finalizing.`,
      };
    }

    /**
     * Some clients will not process an invoice that arrives without a PO
     * number, so one issued without it is simply an invoice that waits. Refused
     * rather than warned: the number is claimed at finalize and a finalized
     * document is immutable, so the correction is a fresh document and a burnt
     * number, not an edit.
     */
    if (
      existing.type === "INV" &&
      client.commercial?.poRequired &&
      !client.commercial.poNumber
    ) {
      return {
        success: false,
        error: `${client.name} requires a PO number before invoicing, and none is recorded on their client record.`,
      };
    }

    clientSnapshot = clientSnapshotOf(client);
  }

  // Numbered docs: financial (invoices/receipts), hr-slip (stipend and pay) and
  // contracts. Only the HR letters are unnumbered — nothing files them by
  // reference. A contract's number is internal rather than statutory, but the
  // same atomic claim gives it the one guarantee that matters: two agreements
  // can never share a reference. Number per Indian financial year (Apr–Mar),
  // not calendar year, so each FY's sequence stays consecutive as GST Rule 46
  // expects. `year` stores the FY start (e.g. 2025 for FY 2025-26); the number
  // carries the compact FY code (e.g. '2526').
  let number: string | undefined;
  let serial: number | undefined;
  let year: number | undefined;
  if (
    spec.kind === "financial" ||
    spec.kind === "hr-slip" ||
    spec.kind === "contract" ||
    spec.kind === "quotation"
  ) {
    year = financialYearStart(existing.issueDate);
    const fyCode = financialYearCodeOfISODate(existing.issueDate);

    // Atomic claim — INCR can never hand out the same number twice. Claimed
    // only now, so abandoned drafts never burn a serial.
    try {
      ({ serial, number } = await claimSerial(existing.type, fyCode));
    } catch (err) {
      logger.error({
        action: "finalizeDocument",
        event: "serial_claim_failed",
        error: err,
      });
      return {
        success: false,
        error: "Failed to claim a document number. Try again.",
      };
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
      deductionsNote: (existing as SlipDocument).deductionsNote,
      employeeSnapshot,
    },
    spec,
  );

  // `existing` is already a well-formed union member; we only refresh the one
  // subject snapshot that applies to its kind.
  const finalized = {
    ...existing,
    status: "finalized",
    ...(number ? { number, serial, year } : {}),
    ...(hr ? { employeeSnapshot } : quotation ? {} : { clientSnapshot }),
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
        action: "finalizeDocument",
        event: "serial_claimed_but_save_failed",
        number,
        // A burned GST serial is an accounting event someone has to reconcile.
        // The Clerk id, never the email — the logger deliberately carries no PII.
        actor: actor.userId,
        error: err,
      });
      return {
        success: false,
        error: "Failed to save. The claimed number was not used.",
      };
    }
  }

  logger.info({
    action: "finalizeDocument",
    event: "document_finalized",
    number,
    actor: actor.userId,
  });

  /**
   * Render the PDF once, here, and store it.
   *
   * The document is now immutable and retained 72 months (CGST s.36), so its
   * *rendering* is frozen with it: generating on each download would let a
   * Tailwind or font change quietly produce a different-looking PDF of the
   * same record. Storing the bytes also makes the download instant, because
   * nothing is generated on the click.
   *
   * **Deliberately after the save and deliberately unable to fail it.** The
   * serial is already claimed, and a burned GST serial is an accounting event
   * somebody reconciles by hand. A cold Chromium, an out-of-memory function or
   * a Chrome bump must not be able to stop an invoice being issued. The
   * document is the record; the PDF is a rendering of it, and the download
   * route renders it on demand if it is missing.
   */
  await storePdfQuietly(finalized);

  // Sledgehammer, and the right size of one: a document write can change both
  // profile homes, its type's list page and the document page itself, and after
  // the profile split '/' alone is only a redirect. Same call `studio.ts` uses.
  revalidatePath("/", "layout");
  return { success: true, id };
}

/**
 * An existing document as an unissued draft — everything a copy must shed.
 *
 * Shared by `duplicateDocument` and `copySlipForNextMonth` so the two cannot
 * drift into shedding different things. Getting this wrong is not cosmetic: a
 * copy that kept the number would collide with an issued document, and one that
 * kept the audit trail would credit a fresh draft to whoever issued the
 * original and mark it as already-issued.
 */
function asFreshDraft(existing: AdminDocument, actor: Actor): AdminDocument {
  const now = Date.now();
  return {
    ...existing,
    id: randomUUID(),
    status: "draft",
    number: undefined,
    serial: undefined,
    year: undefined,
    finalizedAt: undefined,
    // A copy is a fresh draft: it should show the studio's current details and
    // freeze them again when it is finalized in its own right.
    studioSnapshot: undefined,
    issueDate: todayISO(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    finalizedBy: undefined,
  };
}

export async function duplicateDocument(id: unknown): Promise<ActionResult> {
  const actor = await authorized();
  if (!actor) return { success: false, error: "Unauthorized." };

  if (typeof id !== "string")
    return { success: false, error: "Invalid input." };

  const existing = await getDocument(id);
  if (!existing) return { success: false, error: "Document not found." };

  const copy = asFreshDraft(existing, actor);

  try {
    await saveDocument(copy);
  } catch (err) {
    logger.error({
      action: "duplicateDocument",
      event: "save_failed",
      error: err,
    });
    return { success: false, error: "Failed to duplicate." };
  }

  // Sledgehammer, and the right size of one: a document write can change both
  // profile homes, its type's list page and the document page itself, and after
  // the profile split '/' alone is only a redirect. Same call `studio.ts` uses.
  revalidatePath("/", "layout");
  return { success: true, id: copy.id };
}

/** '2026-06' → '2026-07', rolling the year over in December. */
function monthAfter(month: string): string | null {
  if (!isISOMonth(month)) return null;
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return index === 12
    ? `${year + 1}-01`
    : `${year}-${String(index + 1).padStart(2, "0")}`;
}

/**
 * Next month's slip, from this month's.
 *
 * Distinct from `duplicateDocument`, which exists to *correct* an issued
 * document and therefore keeps its wage month. This one moves forward, and the
 * distinction is the whole point — a correction that silently landed in the
 * following month, or a July slip that still said June, would both be wrong in
 * a way nobody would notice until it was filed.
 *
 * What carries over is the salary itself: the earnings lines, the deductions,
 * the payment method and any edited wording. That makes the run of issued slips
 * the salary's own history — each one dated, each one stating what was actually
 * paid that month — which is why a raise needs no effective-date field
 * anywhere. Give someone a raise, edit the figures once on the next copy, and
 * every copy after that carries the new ones.
 *
 * Three things deliberately do not carry:
 *  - **The payment reference.** Last month's bank reference on this month's
 *    slip is a false statement about a transfer that has not happened.
 *  - **The day counts**, which reset to a full new month. Someone's absence in
 *    June is not their absence in July, and carrying "22 of 30" forward is the
 *    kind of error that reads as deliberate.
 *  - **The issue date**, which becomes the last day of the new wage month
 *    rather than today — so a slip prepared in advance is not dated before the
 *    period it covers.
 */
export async function copySlipForNextMonth(id: unknown): Promise<ActionResult> {
  const actor = await authorized();
  if (!actor) return { success: false, error: "Unauthorized." };

  if (typeof id !== "string")
    return { success: false, error: "Invalid input." };

  const existing = await getDocument(id);
  if (!existing) return { success: false, error: "Document not found." };
  if (!isSlip(existing)) {
    return { success: false, error: "Only a slip covers a month." };
  }

  const month = monthAfter(existing.stipendMonth);
  if (!month)
    return { success: false, error: "This slip has no wage month to move." };

  const start = firstDayOfMonth(month);
  const end = lastDayOfMonth(month);
  const days = end ? Number(end.slice(8, 10)) : undefined;

  const copy: SlipDocument = {
    ...(asFreshDraft(existing, actor) as SlipDocument),
    stipendMonth: month,
    stipendPeriodStart: start ?? undefined,
    stipendPeriodEnd: end ?? undefined,
    issueDate: end ?? todayISO(),
    paymentReference: undefined,
    // Only the pay slip states day counts; leaving them undefined on a stipend
    // slip is what it already does.
    daysInPeriod: existing.daysInPeriod === undefined ? undefined : days,
    daysPaid: existing.daysPaid === undefined ? undefined : days,
    lopDays: existing.lopDays === undefined ? undefined : 0,
  };

  try {
    await saveDocument(copy);
  } catch (err) {
    logger.error({
      action: "copySlipForNextMonth",
      event: "save_failed",
      error: err,
    });
    return { success: false, error: "Failed to copy." };
  }

  // Sledgehammer, and the right size of one: a document write can change both
  // profile homes, its type's list page and the document page itself, and after
  // the profile split '/' alone is only a redirect. Same call `studio.ts` uses.
  revalidatePath("/", "layout");
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
export async function createReceiptForInvoice(
  invoiceId: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: "Unauthorized." };

  if (typeof invoiceId !== "string")
    return { success: false, error: "Invalid input." };

  const invoice = await getDocument(invoiceId);
  if (!invoice) return { success: false, error: "Invoice not found." };
  if (
    invoice.type !== "INV" ||
    invoice.status !== "finalized" ||
    !invoice.number
  ) {
    return {
      success: false,
      error: "Only a finalized invoice can be receipted.",
    };
  }

  // Delegated rather than assembled here: `createDraft` owns validation, the
  // client snapshot, the save, and the revalidate. One path, one set of rules.
  return createDraft("REC", invoice.clientId, {
    issueDate: todayISO(),
    lineItems: invoice.lineItems,
    gstRatePercent: invoice.gstRatePercent,
    gstLabel: invoice.gstLabel,
    // The receipt acknowledges what was actually charged, so it carries the
    // invoice's discount with the lines it discounted.
    discountPercent: invoice.discountPercent,
    discountPaise: invoice.discountPaise,
    placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
    notes: invoice.notes,
    payment: {
      date: todayISO(),
      method: "Bank Transfer",
      againstInvoiceId: invoice.id,
      againstInvoiceNumber: invoice.number,
    },
  });
}

export async function deleteDraftAction(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: "Unauthorized." };

  if (typeof id !== "string")
    return { success: false, error: "Invalid input." };

  try {
    await storeDeleteDraft(id);
  } catch (err) {
    logger.error({ action: "deleteDraft", event: "delete_failed", error: err });
    return { success: false, error: "Failed to delete draft." };
  }

  // Sledgehammer, and the right size of one: a document write can change both
  // profile homes, its type's list page and the document page itself, and after
  // the profile split '/' alone is only a redirect. Same call `studio.ts` uses.
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Finalized invoices for a client, newest first.
 *
 * Auth-gated like every other action — the list of a client's invoices is not
 * public just because the caller knows a client id.
 */
export async function listInvoicesForClient(
  clientId: unknown,
): Promise<InvoiceOption[]> {
  if (!(await authorized())) return [];
  if (typeof clientId !== "string" || clientId.length === 0) return [];

  try {
    const docs = await listFinalizedInvoicesForClient(clientId);
    return docs.flatMap((doc) => {
      // A finalized invoice always has a number; skip anything that somehow
      // doesn't rather than offering an unidentifiable row.
      if (doc.type !== "INV" || !doc.number) return [];
      return [
        {
          id: doc.id,
          number: doc.number,
          issueDate: doc.issueDate,
          totalPaise: computeTotals(doc.lineItems, doc.gstRatePercent, doc)
            .totalPaise,
          lineItems: doc.lineItems,
          gstRatePercent: doc.gstRatePercent,
          placeOfSupplyStateCode: doc.placeOfSupplyStateCode,
          gstLabel: doc.gstLabel,
          discountPercent: doc.discountPercent,
          discountPaise: doc.discountPaise,
        },
      ];
    });
  } catch (err) {
    logger.error({
      action: "listInvoicesForClient",
      event: "query_failed",
      error: err,
    });
    return [];
  }
}
