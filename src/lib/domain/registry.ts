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
import { CLIENT_ENTITY_TYPES } from './client';
import { contractComplete } from './contract/completeness';
import { serviceInputSchema } from './contract/service';
import { docContentSchema, type DocContent, type TermItem } from './docContent';
import { CURRENCY_CODES, type CurrencyCode } from './currency';
import { slipTotals } from './money';
import type { ContractData, AdminDocument, DocTypeCode, LineItem, ReceiptDocument } from './types';

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
  /**
   * Optional here even though onboarding's first step requires it: clients
   * created before entity types existed have none, and a required field would
   * make those rows permanently un-editable — the same reasoning as `phone`
   * above. The step form is where it is required, because that is where it can
   * be explained.
   */
  entityType: z.enum(CLIENT_ENTITY_TYPES as [string, ...string[]]).optional(),
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
  /**
   * Why the place of supply is not the one derived from the client. Stored in
   * the document's JSONB rather than a column: nothing queries it, and it is
   * meaningful only alongside the code it explains.
   */
  placeOfSupplyOverrideReason: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  // Legacy — terms are now fixed per doc type (fixedTerms below); the field
  // remains accepted so pre-existing drafts still parse.
  terms: z.string().trim().max(4000).optional(),
  content: docContentSchema.optional(),
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

/**
 * A blank value. Empty is representable and meaningful — clearing a blank is an
 * override, and it is what `contractComplete` then refuses at finalize.
 */
const blankValuesSchema = z.record(z.string().max(80), z.string().trim().max(500));

const contractBaseShape = {
  issueDate: isoDate,
  contract: z.object({
    parts: z.array(serviceInputSchema).max(22),
    blanks: blankValuesSchema,
    library: z.record(z.string().max(10), z.string().trim().max(500)),
  }),
  content: docContentSchema.optional(),
};

export const contractDraftSchema = z.object(contractBaseShape);

/**
 * Finalize demands a Part and every blank filled.
 *
 * The unfilled-blank check is a refinement rather than a field rule because a
 * blank's *existence* comes from the text, not from the stored values — an
 * untouched blank has no entry in `blanks` at all and is perfectly valid until
 * the moment someone tries to issue the contract. See `contractComplete`.
 */
export const contractFinalizeSchema = z
  .object({
    ...contractBaseShape,
    contract: z.object({
      parts: z.array(serviceInputSchema).min(1).max(22),
      blanks: blankValuesSchema,
      library: z.record(z.string().max(10), z.string().trim().max(500)),
    }),
  })
  .refine((doc) => contractComplete(doc.contract).length === 0, {
    message: 'Fill every blank before issuing this contract.',
    path: ['contract'],
  });

// ── HR schemas ────────────────────────────────────────────────────────────────

const slipBaseShape = {
  issueDate: isoDate,
  /**
   * Neither slip carries GST, ever — neither is consideration for a supply by
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
  content: docContentSchema.optional(),
};
export const stipendDraftSchema = z.object({
  ...slipBaseShape,
  lineItems: z.array(draftLineItemSchema).max(10),
});
export const stipendFinalizeSchema = z.object({
  ...slipBaseShape,
  lineItems: z.array(lineItemSchema).min(1).max(10),
});

/**
 * A pay slip is a stipend slip plus the parts a statutory wage record needs:
 * itemised deductions (TDS u/s 192 &c.) and the days the wage period covers.
 * Both stay optional — a slip with nothing withheld is normal, and days are not
 * prescribed by every state's rules.
 */
const payslipExtraShape = {
  deductions: z.array(lineItemSchema).max(20).optional(),
  daysInPeriod: z.number().int().min(0).max(31).optional(),
  daysPaid: z.number().int().min(0).max(31).optional(),
  lopDays: z.number().int().min(0).max(31).optional(),
};
export const payslipDraftSchema = z.object({
  ...slipBaseShape,
  ...payslipExtraShape,
  lineItems: z.array(draftLineItemSchema).max(20),
});
export const payslipFinalizeSchema = z
  .object({
    ...slipBaseShape,
    ...payslipExtraShape,
    lineItems: z.array(lineItemSchema).min(1).max(20),
  })
  /**
   * No lawful set of deductions leaves an employee owing wages back — the
   * Payment of Wages Act permits deductions *from* wages, not beyond them — so
   * a negative net is always a mistyped figure. The draft may hold one while it
   * is being corrected; issuing it is refused, because a finalized slip is
   * immutable and would have to be re-issued as a duplicate.
   */
  .superRefine((data, ctx) => {
    const { netPaise } = slipTotals(data.lineItems, data.deductions);
    if (netPaise < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Deductions exceed gross earnings — net pay cannot be negative.',
        path: ['deductions'],
      });
    }
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
  content: docContentSchema.optional(),
};
export const letterDraftSchema = z.object(letterBaseShape);
export const letterFinalizeSchema = z.object({
  ...letterBaseShape,
  bodyParagraphs: z.array(z.string().trim().min(1).max(4000)).min(1).max(40),
});

/**
 * The stipend slip's opening position on deductions. True for an intern paid a
 * genuine stipend, and editable because whether it stays true depends on the
 * individual engagement. The pay slip deliberately has no equivalent default —
 * see the note on the PAY entry below.
 *
 * Exported so the editor's default and this one cannot drift; they used to be
 * two separately-typed copies of the same sentence.
 */
export const DEFAULT_STIPEND_DEDUCTIONS_NOTE =
  'No statutory deductions (PF, ESI, TDS) are applicable.';

// ── Registry ──────────────────────────────────────────────────────────────────

/** Editable field-set of a document (everything except identity/status). */
export interface DocFields {
  issueDate: string;
  lineItems: LineItem[];
  gstRatePercent: number;
  gstLabel?: string;
  placeOfSupplyStateCode?: string;
  placeOfSupplyOverrideReason?: string;
  notes?: string;
  /** Legacy — terms are fixed per doc type now; kept so old drafts round-trip. */
  terms?: string;
  dueDate?: string;
  payment?: ReceiptDocument['payment'];
  contract?: ContractData;
  // HR — the slips (stipend + pay)
  employeeId?: string;
  currency?: CurrencyCode;
  stipendPeriod?: string;
  stipendPeriodStart?: string;
  stipendPeriodEnd?: string;
  stipendMonth?: string;
  paymentMethod?: string;
  paymentReference?: string;
  deductionsNote?: string;
  // HR — pay slip only
  deductions?: LineItem[];
  daysInPeriod?: number;
  daysPaid?: number;
  lopDays?: number;
  // HR — letters
  bodyParagraphs?: string[];
  bulletSections?: { heading: string; items: string[] }[];
  payAmountPaise?: number;
  /**
   * Editable text overrides. Absent keys resolve to the defaults below via
   * `contentOf`; finalize materialises the lot onto the document so an issued
   * one reprints unchanged whatever these defaults later become.
   */
  content?: DocContent;
}

/**
 * A terms clause. `fixedTerms` below is the *default* set for a type — the
 * document's own `content.terms` wins when it has been edited.
 */
export type FixedTerm = TermItem;

export interface DocTypeSpec {
  code: DocTypeCode;
  /** URL segment for /kessler-admin/docs/new/[type]. */
  slug: string;
  label: string;
  /** The big black print title, e.g. 'RECEIPT'. */
  masthead: string;
  /**
   * 'financial' = invoice/receipt (line items, GST, numbering); 'contract' = MSA
   * + schedules; 'hr-slip' = the stipend and pay slips (financial-shaped,
   * employee-based, numbered); 'hr-letter' = offer/experience/exit letters
   * (boilerplate + editable body).
   */
  kind: 'financial' | 'contract' | 'hr-slip' | 'hr-letter';
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
    // What the cover prints. Editable per document like every other masthead —
    // the sheet reads `content.masthead`, it does not hardcode the title.
    masthead: 'Master Service Agreement',
    kind: 'contract',
    hasPayment: false,
    hasDueDate: false,
    draftSchema: contractDraftSchema,
    finalizeSchema: contractFinalizeSchema,
    defaultFields: (todayIso) => ({
      issueDate: todayIso,
      lineItems: [],
      gstRatePercent: 0,
      contract: { parts: [], blanks: {}, library: {} },
    }),
    fixedTerms: [],
  },
  STP: {
    code: 'STP', slug: 'stipend', label: 'Stipend slip', masthead: 'STIPEND',
    kind: 'hr-slip',
    hasPayment: false, hasDueDate: false,
    draftSchema: stipendDraftSchema, finalizeSchema: stipendFinalizeSchema,
    defaultFields: (todayIso) => ({
      issueDate: todayIso, lineItems: [{ description: '', ratePaise: 0, qty: 1 }], gstRatePercent: 0,
      employeeId: '', stipendMonth: '', paymentMethod: 'Bank Transfer',
      deductionsNote: DEFAULT_STIPEND_DEDUCTIONS_NOTE,
    }),
    fixedTerms: [],
  },
  PAY: {
    code: 'PAY', slug: 'pay-slip', label: 'Pay slip', masthead: 'PAY SLIP',
    kind: 'hr-slip',
    hasPayment: false, hasDueDate: false,
    draftSchema: payslipDraftSchema, finalizeSchema: payslipFinalizeSchema,
    defaultFields: (todayIso) => ({
      issueDate: todayIso, lineItems: [{ description: '', ratePaise: 0, qty: 1 }], gstRatePercent: 0,
      employeeId: '', stipendMonth: '', paymentMethod: 'Bank Transfer',
      /**
       * Empty, unlike the stipend slip. Asserting "no statutory deductions
       * apply" on a wage record is a statement about the employee's tax
       * position, and it stops being true the moment TDS u/s 192 does — an
       * untrue assertion in a statutory record is worse than a blank one.
       */
      deductionsNote: '',
      deductions: [],
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

/**
 * True for documents about an employee rather than a client — the slips and the
 * letters. They snapshot the employee, resolve their party from it, and are
 * listed under "Employee" rather than "Client".
 *
 * Derived from `kind` rather than a list of codes on purpose. This answer used
 * to be written out by hand in four places (the finalize action, the row
 * mapper, `partyName`, and the type list's party label) with nothing keeping
 * them in step, so a new document type could be HR in three of them and a
 * client document in the fourth — with nothing failing to say so.
 */
export function isHrDocType(code: DocTypeCode): boolean {
  const kind = DOC_TYPES[code].kind;
  return kind === 'hr-slip' || kind === 'hr-letter';
}

/** An HR document — one that names an employee rather than a client. */
export type HrDocument = Extract<AdminDocument, { employeeId: string }>;

/**
 * The same answer as `isHrDocType`, narrowing the document itself so callers
 * reach `employeeSnapshot` without a cast.
 */
export function isHrDocument(doc: AdminDocument): doc is HrDocument {
  return isHrDocType(doc.type);
}

/** A slip — the stipend slip or the pay slip. */
export type SlipDoc = Extract<AdminDocument, { type: 'STP' | 'PAY' }>;

/**
 * A type predicate rather than an inline `doc.type === 'STP' || …`, because a
 * member whose discriminant is itself a union (`'STP' | 'PAY'`, like the
 * letters' `'OFR' | 'EXP' | 'EXIT'`) is not narrowed *out* by sequential
 * equality checks — the dispatch trees that fall through to the financial
 * sheets need it excluded, not just matched. Mirrors the routes' `isLetter`.
 */
export function isSlip(doc: AdminDocument): doc is SlipDoc {
  return doc.type === 'STP' || doc.type === 'PAY';
}

export const DOC_TYPE_BY_SLUG: Record<string, DocTypeSpec> = Object.fromEntries(
  DOC_TYPE_LIST.map((spec) => [spec.slug, spec]),
);
