/**
 * Doc-type registry — the single place a document type is defined (mirrors
 * kessler-spec's ICON_SPECS pattern). The editor, sheet, numbering, and
 * validation are all driven from here; Phase 2 (contract) and Phase 3 (HR
 * letters) plug in as new entries without touching storage/auth/numbering.
 *
 * Client-safe: zod schemas are shared by client forms and Server Actions.
 */

import { z } from 'zod';
import { isISODate } from './dates';
import { addressPartsSchema } from './address';
import { contractScheduleSchema } from './serviceTemplate';
import { CURRENCY_CODES, type CurrencyCode } from './currency';
import type { ContractSchedule, DocTypeCode, LineItem, ReceiptDocument } from './types';

// ── Field schemas ─────────────────────────────────────────────────────────────

const isoDate = z
  .string()
  .refine(isISODate, { message: "Expected a date in 'YYYY-MM-DD' format." });

/** Up to 2 decimal places — quantities are things like hours or unit counts. */
const qtySchema = z
  .number()
  .max(100000)
  .refine((q) => Number.isInteger(Math.round(q * 100)) && Math.abs(q * 100 - Math.round(q * 100)) < 1e-6, {
    message: 'Quantity supports at most 2 decimal places.',
  });

export const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  detail: z.string().trim().max(300).optional(),
  ratePaise: z.number().int().min(0).max(1e13),
  qty: qtySchema.refine((q) => q > 0, { message: 'Quantity must be positive.' }),
});

/** Draft line items may be half-filled — only shape/limits are enforced. */
export const draftLineItemSchema = z.object({
  description: z.string().trim().max(300),
  detail: z.string().trim().max(300).optional(),
  ratePaise: z.number().int().min(0).max(1e13),
  qty: qtySchema.refine((q) => q >= 0, { message: 'Quantity cannot be negative.' }),
});

export const clientInputSchema = z.object({
  /** Short reference name — lists, dropdowns, the editor heading. */
  name: z.string().trim().min(1).max(200),
  /**
   * The legal name documents print. Required: an invoice addressed to a pet
   * name is not a valid tax document. `ClientRecord.companyName` stays optional
   * so the rows written before this existed still load — but they cannot be
   * saved again until one is supplied.
   */
  companyName: z.string().trim().min(1).max(200),
  /** The flat printable address; composed from `addressParts` when present. */
  address: z.string().trim().min(1).max(500),
  addressParts: addressPartsSchema.optional(),
  email: z.string().trim().email().max(200),
  /**
   * Intentionally lenient — a length check, not an E.164 regex. This schema
   * re-validates the whole record on every edit, and clients created before
   * phones were structured hold arbitrary text. A strict rule here would make
   * those rows permanently un-editable. Strict per-country validation lives in
   * the form layer (see lib/domain/phone.ts).
   */
  phone: z.string().trim().min(1).max(30),
  gstin: z.string().trim().max(20).optional(),
});

/**
 * The payment methods offered anywhere in the app. Shared by the receipt's
 * `payment.method` and the stipend slip, so the two cannot drift apart — the
 * stipend used to default to a differently-cased 'Bank transfer'.
 */
export const PAYMENT_METHODS = ['Bank Transfer', 'UPI', 'Cash', 'Card', 'Other'] as const;
export type PaymentMethodOption = (typeof PAYMENT_METHODS)[number];

const paymentSchema = z.object({
  date: isoDate,
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(100).optional(),
  /** What prints on the receipt. Authoritative. */
  againstInvoiceNumber: z.string().trim().max(40).optional(),
  /** Id of that same invoice — see ReceiptDocument['payment'] in types.ts. */
  againstInvoiceId: z.string().trim().max(64).optional(),
});

// ── Document field schemas (shared base + per-type extensions) ───────────────

const baseFieldsShape = {
  issueDate: isoDate,
  gstRatePercent: z.number().min(0).max(28),
  gstLabel: z.string().trim().max(120).optional(),
  placeOfSupplyStateCode: z
    .string()
    .regex(/^\d{2}$/, { message: 'Expected a 2-digit GST state code.' })
    .optional(),
  notes: z.string().trim().max(2000).optional(),
  // Legacy — terms are now fixed per doc type (fixedTerms below); the field
  // remains accepted so pre-existing drafts still parse.
  terms: z.string().trim().max(4000).optional(),
};

/** Finalize rule shared by all money docs: GST needs a place of supply. */
function requirePlaceOfSupplyWithGst(
  data: { gstRatePercent: number; placeOfSupplyStateCode?: string },
  ctx: z.RefinementCtx,
): void {
  if (data.gstRatePercent > 0 && !data.placeOfSupplyStateCode) {
    ctx.addIssue({
      code: 'custom',
      message: 'Place of supply is required when GST applies.',
      path: ['placeOfSupplyStateCode'],
    });
  }
}

/** Finalize = strict: at least one complete line item, all dates valid. */
const baseFinalizeSchema = z.object({
  ...baseFieldsShape,
  lineItems: z.array(lineItemSchema).min(1).max(50),
});

/** Draft saves accept incomplete content — only structural limits apply. */
const baseDraftSchema = z.object({
  ...baseFieldsShape,
  lineItems: z.array(draftLineItemSchema).max(50),
});

export const invoiceFinalizeSchema = baseFinalizeSchema
  .extend({
    dueDate: isoDate.optional(),
  })
  .superRefine(requirePlaceOfSupplyWithGst);
export const invoiceDraftSchema = baseDraftSchema.extend({
  dueDate: isoDate.optional(),
});

export const receiptFinalizeSchema = baseFinalizeSchema
  .extend({
    payment: paymentSchema,
  })
  .superRefine(requirePlaceOfSupplyWithGst);
export const receiptDraftSchema = baseDraftSchema.extend({
  payment: paymentSchema.extend({
    // Drafts may not have a payment date yet.
    date: z.union([isoDate, z.literal('')]),
  }),
});

// ── Contract schemas ─────────────────────────────────────────────────────────

const contractBaseShape = {
  issueDate: isoDate,
  // Max 26 — one per schedule letter A..Z (see scheduleLetter helper).
  schedules: z.array(contractScheduleSchema).max(26),
};
export const contractDraftSchema = z.object(contractBaseShape);
export const contractFinalizeSchema = z.object({
  ...contractBaseShape,
  schedules: z.array(contractScheduleSchema).min(1).max(26),
});

// ── HR schemas ────────────────────────────────────────────────────────────────

const stipendBaseShape = {
  issueDate: isoDate,
  /**
   * A stipend carries no GST, ever — it is not consideration for a supply by
   * the studio, so nothing here becomes taxable once the studio is registered.
   * The field is pinned to 0 rather than dropped so the existing NOT NULL
   * column needs no migration, while a non-zero rate stays unrepresentable.
   */
  gstRatePercent: z.literal(0).default(0),
  employeeId: z.string().min(1),
  /** Paid-in currency. Absent on slips written before currencies existed. */
  currency: z.enum(CURRENCY_CODES).optional(),
  /** Legacy free-text period ('12th – 31st May'); superseded by the ISO pair. */
  stipendPeriod: z.string().trim().max(120).optional(),
  stipendPeriodStart: isoDate.optional(),
  stipendPeriodEnd: isoDate.optional(),
  /** 'YYYY-MM'. Older slips hold free text ('May 2026'), so this stays a string. */
  stipendMonth: z.string().trim().max(60),
  paymentMethod: z.string().trim().max(60),
  paymentReference: z.string().trim().max(100).optional(),
  deductionsNote: z.string().trim().max(500),
};
export const stipendDraftSchema = z.object({
  ...stipendBaseShape,
  lineItems: z.array(draftLineItemSchema).max(10),
});
export const stipendFinalizeSchema = z.object({
  ...stipendBaseShape,
  lineItems: z.array(lineItemSchema).min(1).max(10),
});

const bulletSectionSchema = z.object({
  heading: z.string().trim().max(200),
  items: z.array(z.string().trim().max(1000)).max(30),
});
const letterBaseShape = {
  issueDate: isoDate,
  employeeId: z.string().min(1),
  bodyParagraphs: z.array(z.string().trim().max(4000)).max(40),
  bulletSections: z.array(bulletSectionSchema).max(10),
  payAmountPaise: z.number().int().min(0).max(1e13).optional(),
};
export const letterDraftSchema = z.object(letterBaseShape);
export const letterFinalizeSchema = z.object({
  ...letterBaseShape,
  bodyParagraphs: z.array(z.string().trim().min(1).max(4000)).min(1).max(40),
});

// ── Registry ──────────────────────────────────────────────────────────────────

/** Editable field-set of a document (everything except identity/status). */
export interface DocFields {
  issueDate: string;
  lineItems: LineItem[];
  gstRatePercent: number;
  gstLabel?: string;
  placeOfSupplyStateCode?: string;
  notes?: string;
  /** Legacy — terms are fixed per doc type now; kept so old drafts round-trip. */
  terms?: string;
  dueDate?: string;
  payment?: ReceiptDocument['payment'];
  schedules?: ContractSchedule[];
  // HR — stipend slip
  employeeId?: string;
  currency?: CurrencyCode;
  stipendPeriod?: string;
  stipendPeriodStart?: string;
  stipendPeriodEnd?: string;
  stipendMonth?: string;
  paymentMethod?: string;
  paymentReference?: string;
  deductionsNote?: string;
  // HR — letters
  bodyParagraphs?: string[];
  bulletSections?: { heading: string; items: string[] }[];
  payAmountPaise?: number;
}

/** A fixed terms clause printed on every document of a type. */
export interface FixedTerm {
  title: string;
  body: string;
}

export interface DocTypeSpec {
  code: DocTypeCode;
  /** URL segment for /kessler-admin/docs/new/[type]. */
  slug: string;
  label: string;
  /** The big black print title, e.g. 'RECEIPT'. */
  masthead: string;
  /**
   * 'financial' = invoice/receipt (line items, GST, numbering); 'contract' = MSA
   * + schedules; 'hr-slip' = stipend slip (financial-shaped, employee-based);
   * 'hr-letter' = offer/experience/exit letters (boilerplate + editable body).
   */
  kind: 'financial' | 'contract' | 'hr-slip' | 'hr-letter';
  /** Solid status banner rendered on the sheet (receipt: green PAID). */
  badge?: { text: string; tone: 'paid'; note: string };
  hasPayment: boolean;
  hasDueDate: boolean;
  draftSchema: z.ZodTypeAny;
  finalizeSchema: z.ZodTypeAny;
  /** Initial field values for a fresh draft. */
  defaultFields: (todayIso: string) => DocFields;
  /** Fixed TERMS clauses printed on every document of this type. */
  fixedTerms: FixedTerm[];
}

export const DOC_TYPES: Record<DocTypeCode, DocTypeSpec> = {
  INV: {
    code: 'INV',
    slug: 'invoice',
    label: 'Invoice',
    masthead: 'INVOICE',
    kind: 'financial',
    hasPayment: false,
    hasDueDate: true,
    draftSchema: invoiceDraftSchema,
    finalizeSchema: invoiceFinalizeSchema,
    defaultFields: (todayIso) => ({
      issueDate: todayIso,
      lineItems: [{ description: '', ratePaise: 0, qty: 1 }],
      gstRatePercent: 18,
    }),
    fixedTerms: [
      {
        title: 'Payment.',
        body: 'Due within 7 days of invoice date. Overdue balances accrue interest at 1.5% per month.',
      },
      {
        title: 'Suspension.',
        body: 'Qera may pause all work and withhold deliverables on any overdue payment.',
      },
      {
        title: 'Ownership.',
        body: 'All deliverables, designs, code and IP remain the property of Qera Studio until payment is received in full.',
      },
      {
        title: 'Disputes.',
        body: 'Raise any disputes in writing within 7 days; otherwise this invoice is deemed accepted.',
      },
      {
        title: 'Costs & taxes.',
        body: 'Fees exclude applicable taxes and third-party costs (hosting, domains, fonts, stock, ad spend) unless stated.',
      },
      {
        title: 'Jurisdiction.',
        body: 'Subject to the exclusive jurisdiction of the courts of Ghaziabad, Uttar Pradesh.',
      },
    ],
  },
  REC: {
    code: 'REC',
    slug: 'receipt',
    label: 'Receipt',
    masthead: 'RECEIPT',
    kind: 'financial',
    badge: {
      text: 'PAID',
      tone: 'paid',
      note: 'This receipt confirms payment has been received in full. No further amount is due against the referenced invoice.',
    },
    hasPayment: true,
    hasDueDate: false,
    draftSchema: receiptDraftSchema,
    finalizeSchema: receiptFinalizeSchema,
    defaultFields: (todayIso) => ({
      issueDate: todayIso,
      lineItems: [{ description: '', ratePaise: 0, qty: 1 }],
      gstRatePercent: 18,
      payment: { date: '', method: 'Bank Transfer', reference: '' },
    }),
    fixedTerms: [
      {
        title: 'Ownership.',
        body: 'Payment having been received in full, all deliverables, designs, code and IP are hereby transferred to the client.',
      },
      {
        title: 'Costs & taxes.',
        body: 'Fees exclude applicable taxes and third-party costs (hosting, domains, fonts, stock, ad spend) unless stated.',
      },
      {
        title: 'Jurisdiction.',
        body: 'Subject to the exclusive jurisdiction of the courts of Ghaziabad, Uttar Pradesh.',
      },
    ],
  },
  CON: {
    code: 'CON',
    slug: 'contract',
    label: 'Contract',
    masthead: 'CONTRACT AGREEMENT',
    kind: 'contract',
    hasPayment: false,
    hasDueDate: false,
    draftSchema: contractDraftSchema,
    finalizeSchema: contractFinalizeSchema,
    defaultFields: (todayIso) => ({ issueDate: todayIso, lineItems: [], gstRatePercent: 0, schedules: [] }),
    fixedTerms: [],
  },
  STP: {
    code: 'STP', slug: 'stipend', label: 'Stipend slip', masthead: 'STIPEND',
    kind: 'hr-slip',
    badge: { text: 'PAID', tone: 'paid', note: 'This document confirms stipend disbursed in full for the period stated.' },
    hasPayment: false, hasDueDate: false,
    draftSchema: stipendDraftSchema, finalizeSchema: stipendFinalizeSchema,
    defaultFields: (todayIso) => ({
      issueDate: todayIso, lineItems: [{ description: '', ratePaise: 0, qty: 1 }], gstRatePercent: 0,
      employeeId: '', stipendMonth: '', paymentMethod: 'Bank Transfer',
      deductionsNote: 'No statutory deductions (PF, ESI, TDS) are applicable.',
    }),
    fixedTerms: [],
  },
  OFR: {
    code: 'OFR', slug: 'offer-letter', label: 'Offer letter', masthead: 'OFFER LETTER',
    kind: 'hr-letter', hasPayment: false, hasDueDate: false,
    draftSchema: letterDraftSchema, finalizeSchema: letterFinalizeSchema,
    // letters carry no line items or GST — these are structural zero-values to satisfy DocFields.
    defaultFields: (todayIso) => ({ issueDate: todayIso, lineItems: [], gstRatePercent: 0, employeeId: '', bodyParagraphs: [], bulletSections: [] }),
    fixedTerms: [],
  },
  EXP: {
    code: 'EXP', slug: 'experience-letter', label: 'Experience letter', masthead: 'EXPERIENCE LETTER',
    kind: 'hr-letter', hasPayment: false, hasDueDate: false,
    draftSchema: letterDraftSchema, finalizeSchema: letterFinalizeSchema,
    defaultFields: (todayIso) => ({ issueDate: todayIso, lineItems: [], gstRatePercent: 0, employeeId: '', bodyParagraphs: [], bulletSections: [] }),
    fixedTerms: [],
  },
  EXIT: {
    code: 'EXIT', slug: 'exit-letter', label: 'Exit letter', masthead: 'EXIT LETTER',
    kind: 'hr-letter', hasPayment: false, hasDueDate: false,
    draftSchema: letterDraftSchema, finalizeSchema: letterFinalizeSchema,
    defaultFields: (todayIso) => ({ issueDate: todayIso, lineItems: [], gstRatePercent: 0, employeeId: '', bodyParagraphs: [], bulletSections: [] }),
    fixedTerms: [],
  },
};

export const DOC_TYPE_LIST: DocTypeSpec[] = Object.values(DOC_TYPES);

export const DOC_TYPE_BY_SLUG: Record<string, DocTypeSpec> = Object.fromEntries(
  DOC_TYPE_LIST.map((spec) => [spec.slug, spec]),
);
