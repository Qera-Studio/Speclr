/**
 * Shared types for the internal admin document system (/kessler-admin).
 * Client-safe: no server imports — these types cross the RSC boundary.
 */

import type { AddressParts } from "./address";
import type { StudioInfo } from "./studio";
import type {
  ClientAccessRef,
  ClientAttachment,
  ClientCommercial,
  ClientContacts,
  ClientTax,
} from "./client";
// A value import, not a type: the snapshot resolves the signing contact through
// it rather than reading the group.
import { clientContact } from "./client";
import type { BlankValues } from "./contract/blanks";
import type { ContractPart } from "./contract/assembly";
import type { CurrencyCode } from "./currency";
import type { DocContent } from "./docContent";

/** Phase 2 adds 'CON'. Phase 3 adds HR docs: 'STP' | 'OFR' | 'EXP' | 'EXIT'. */
export type DocTypeCode =
  | "INV"
  | "REC"
  | "CRN"
  | "CON"
  | "STP"
  | "PAY"
  | "OFR"
  | "EXP"
  | "EXIT"
  | "QTN";

export interface ClientRecord {
  id: string;
  /**
   * The short reference name — what lists, dropdowns and the preview heading
   * show. Not what documents print.
   */
  name: string;
  /**
   * The legal entity name printed on documents ("Clayora Private Limited").
   *
   * Optional here, required by `clientInputSchema`: clients created before this
   * field existed have none, and those rows must still load. Nothing saved from
   * now on can be missing it.
   */
  companyName?: string;
  /**
   * The flat, printable address — the source of truth for rendering. When
   * `addressParts` is present this is composed from it at save time; older
   * records carry hand-typed text.
   */
  address: string;
  /**
   * Structured address, for editing and pincode autofill. Optional: records
   * created before structured addresses existed simply don't have it, and
   * `ClientSnapshot` deliberately excludes it so issued documents keep their
   * frozen shape.
   */
  addressParts?: AddressParts;
  /**
   * Where invoices are addressed, when that is not the registered address.
   *
   * Absent is the ordinary case and means the registered address. It is display
   * only: place of supply follows the client's registration, never this.
   */
  billingAddressParts?: AddressParts;
  email: string;
  /** E.164, e.g. '+919876543210'. Legacy rows may hold arbitrary text. */
  phone: string;
  /**
   * Kept as a top-level field even though `tax.gstin` now exists, because every
   * document has printed from here since the first invoice and `ClientSnapshot`
   * picks it by name. `tax.gstin` is where it is *validated*, this is where it
   * is *read*, and `db/mappers.ts` is the one place the two are reconciled, on
   * read as well as write, so rows saved before that existed correct themselves.
   * Never read `tax.gstin` directly outside onboarding.
   */
  gstin?: string;
  /**
   * What kind of legal entity this is — see `entityType.ts`. Optional: rows
   * written before onboarding existed have none.
   */
  entityType?: string;
  /** Tax registration. See `client.ts`. */
  tax?: ClientTax;
  /** The people. See `client.ts`. */
  contacts?: ClientContacts;
  /** Payment terms, engagement, and what was engaged. See `client.ts`. */
  commercial?: ClientCommercial;
  /** Uploaded documents — metadata only; the bytes live in blob storage. */
  attachments?: ClientAttachment[];
  /** Where credentials live. Never a credential. See `client.ts`. */
  access?: ClientAccessRef[];
  /**
   * Offboarded — out of the working list and out of the new-document picker.
   * Absent means active, which is every row written before this existed.
   */
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LineItem {
  description: string;
  /**
   * @deprecated A sub-line under the description, printed by no sheet and
   * collected by no editor. See `lineItemSchema` in `registry.ts`.
   */
  detail?: string;
  /** Integer paise — never floats. ₹1,500.00 === 150000. */
  ratePaise: number;
  /** Positive, up to 2 decimal places (e.g. hours). */
  qty: number;
  /**
   * The Service Accounting Code this line is classified under.
   *
   * CGST Rule 46(g) wants the HSN or SAC printed against the line, and until
   * this existed no invoice carried one at all. It is a property of *what is
   * sold*, so it arrives from the catalogue when a line is seeded from a
   * Service (`sacCode` on `ContractService`) and is typed for a custom line.
   *
   * Optional, for the same reason the six `ClientSnapshot` fields are: the
   * documents written before it have none, and they must keep loading.
   */
  sacCode?: string;
  /**
   * The heading this line prints under on a Service Quotation (e.g.
   * "Website(s)", "Social Media") — the only doc type with grouped, subtotaled
   * line items. Consecutive lines sharing a section are grouped by the sheet;
   * absent on every other document type, which prints a flat list.
   */
  section?: string;
  /**
   * A recurring (monthly) line on a Service Quotation — printed as '/m' and
   * excluded from its section subtotal and the grand total, since it is not a
   * one-time cost the quoted figure represents. Meaningless outside QTN.
   */
  recurring?: boolean;
}

/** 'void' is reserved for Phase 2 — not reachable in Phase 1 UI. */
export type DocStatus = "draft" | "finalized";

/**
 * Frozen copy of the client at finalize time.
 *
 * The `Pick` is load-bearing: it lists the fields exactly, so adding anything
 * to `ClientRecord` cannot silently widen what gets written into an issued
 * document. `addressParts` is deliberately excluded — documents print the flat
 * `address` string, and a finalized document must reprint byte-identically
 * years later. Do not add fields here without deciding what happens to every
 * snapshot already stored.
 *
 * `companyName` is optional for exactly that reason: snapshots frozen before it
 * existed don't have one, so every sheet prints `companyName || name`.
 */
export type ClientSnapshot = Pick<
  ClientRecord,
  "name" | "companyName" | "address" | "email" | "phone" | "gstin"
> & {
  /**
   * The fields onboarding added, **flattened and every one optional.**
   *
   * Flattened rather than carrying `tax` and `contacts` wholesale, because the
   * `Pick` above is the guarantee that a field cannot reach an issued document
   * by accident — freezing a whole group would hand every future field on it a
   * free ride onto every invoice. Each of these was chosen because a sheet
   * prints it.
   *
   * Optional is what makes this safe to add. Every snapshot already stored has
   * none of them, so every new sheet line is conditional and renders nothing at
   * all for a document issued before today. Deliberately **not** here:
   * attachments and access references — a document has no business freezing a
   * link to a scan of someone's PAN card — and the commercial terms, whose only
   * printed consequence, the due date, is already materialised onto the
   * document itself.
   */
  pan?: string;
  cin?: string;
  /** Whose name and designation go in a contract's signature block. */
  signatory?: { name?: string; designation?: string };
  /** For a recipient outside India — printed as their registration. */
  taxIdType?: string;
  taxId?: string;
  /** `cin`'s counterpart abroad: the number their company register issued. */
  registrationNumber?: string;
  /** What the recipient deducts, printed as a memo. Never changes the total. */
  tds?: { section?: string; ratePercent?: number };
};

/**
 * The one place a client is copied into a snapshot.
 *
 * Three callers need this shape — the two live previews and the server's
 * finalize path — and they must never drift: a field the preview shows but
 * finalize forgets to freeze would print differently once issued. Keeping it
 * here, beside the type, means adding a snapshot field is a single edit.
 */
export function clientSnapshotOf(client: ClientRecord): ClientSnapshot {
  /**
   * A section *or* a rate, not a section full stop.
   *
   * A foreign client who withholds has no section of the Income-tax Act to
   * name, so requiring one froze nothing for them and the memo explaining why
   * their remittance landed short would never have printed. The rate alone is
   * a complete statement; a section alone still is too, and either beats
   * silence.
   */
  const tds =
    client.tax?.tdsApplicable &&
    (client.tax.tdsSection || client.tax.tdsRatePercent !== undefined)
      ? {
          section: client.tax.tdsSection,
          ratePercent: client.tax.tdsRatePercent,
        }
      : undefined;

  // Through `clientContact`, never `contacts.signing` — a client who ticked
  // "same as primary" has nothing stored under `signing`, and an individual has
  // no contacts group at all. Reading the group directly would freeze a blank
  // signatory onto the contract in both cases.
  const signing = clientContact(client, "signing");
  const signatory =
    signing?.name || signing?.designation
      ? { name: signing.name, designation: signing.designation }
      : undefined;

  return {
    name: client.name,
    companyName: client.companyName,
    address: client.address,
    email: client.email,
    phone: client.phone,
    gstin: client.gstin,
    // Each is `undefined` unless there is something to say, so a
    // client with no tax section produces a snapshot byte-identical to the ones
    // written before these existed.
    pan: client.tax?.pan,
    cin: client.tax?.cin,
    signatory,
    taxIdType: client.tax?.taxIdType,
    taxId: client.tax?.taxId,
    registrationNumber: client.tax?.registrationNumber,
    tds,
  };
}

/**
 * Who performed an action, recorded at the moment they performed it.
 *
 * Both halves are load-bearing and neither replaces the other: `userId` is the
 * stable Clerk identifier that survives an email change, and `email` is the
 * human-readable label **frozen at action time** — the same reasoning as the
 * client and studio snapshots. Years later, an auditor asking "who issued this
 * invoice?" gets an answer that doesn't depend on the Clerk account still
 * existing or still carrying the same address.
 */
export interface Actor {
  userId: string;
  email: string;
}

export interface BaseDocument {
  id: string;
  type: DocTypeCode;
  status: DocStatus;
  /** e.g. 'QS-INV-2026-003' — present only once finalized. */
  number?: string;
  serial?: number;
  year?: number;
  /**
   * The billed party (invoices/receipts/contracts). Optional because HR
   * documents (stipend/letters) are about an employee instead — they carry
   * employeeId/employeeSnapshot and leave these unset.
   */
  clientId?: string;
  /** Frozen copy of the client at finalize time; drafts render live client data. */
  clientSnapshot?: ClientSnapshot;
  /**
   * Frozen copy of the studio's own identity block at finalize time.
   *
   * Absent on drafts (which render the live settings, as they should) and on
   * every document issued before this existed — sheets read
   * `studioSnapshot ?? STUDIO_INFO`. This exists because the studio details are
   * editable: an issued tax invoice must keep the supplier address it carried at
   * issue (CGST s.36 / Rule 46), so changing the settings must never rewrite it.
   */
  studioSnapshot?: StudioInfo;
  /**
   * Edited text overrides, resolved against the type's defaults by `contentOf`.
   *
   * Absent on a document nobody has edited, and complete on every finalized
   * one — finalize materialises the resolved content for the same reason
   * `studioSnapshot` exists: revising the default wording must never rewrite a
   * document already issued.
   */
  content?: DocContent;
  /** ISO date 'YYYY-MM-DD'. The numbering year derives from this, not the server clock. */
  issueDate: string;
  lineItems: LineItem[];
  /** 0–28. When 0, gstLabel renders in place of a GST amount line. */
  gstRatePercent: number;
  /**
   * 2-digit GST state code of the place of supply. Same as the studio's own
   * state (09, UP) → CGST + SGST split; anything else → IGST. Required at
   * finalize whenever gstRatePercent > 0.
   */
  placeOfSupplyStateCode?: string;
  /**
   * Why the place of supply differs from the one derived from the recipient.
   *
   * Place of supply is derived from the client (`placeOfSupply.ts`); this is
   * the record of a deliberate departure from it — CGST s.12(3) and
   * bill-to/ship-to cases genuinely diverge. Required at finalize whenever the
   * stored code is not the derived one, because `PRINCIPLES.md` rule 3 permits
   * an override only when it is explicit *and recorded*. Frozen with the
   * document like everything else on it.
   */
  placeOfSupplyOverrideReason?: string;
  /**
   * Why the tax charged is not what the client record implies.
   *
   * The same rule as the field above, applied to the rate rather than the
   * state: for an Indian recipient `gstTreatmentOf` states the treatment, and
   * departing from it at finalize requires a reason. Kept separate because the
   * two overrides are separately lawful and separately justified.
   */
  gstOverrideReason?: string;
  /** Free text shown when gstRatePercent is 0, e.g. 'not applicable - registration in process'. */
  gstLabel?: string;
  /**
   * A discount off the taxable value, expressed as a percentage of the
   * subtotal. Mutually exclusive with `discountPaise` (refused together at the
   * schema).
   *
   * **It comes off before GST, and that is not a preference.** CGST s.15(3)(a)
   * deducts a discount from the value of supply only where it is given at or
   * before the supply *and recorded in the invoice*, and Rule 46 wants the
   * taxable value stated "taking into account discount or abatement". Taking it
   * off the gross instead would charge tax on consideration nobody paid: the
   * studio remits GST it never collected and the recipient claims credit for
   * tax on a price they were never charged.
   *
   * A discount agreed *after* the invoice was issued is s.34's credit note, not
   * this field. A finalized document does not change.
   */
  discountPercent?: number;
  /** The same discount typed as a rupee figure instead. Integer paise. */
  discountPaise?: number;
  notes?: string;
  terms?: string;
  createdAt: number;
  updatedAt: number;
  finalizedAt?: number;
  /**
   * Who drafted this document. Optional: every document issued before actor
   * recording existed has none, and that gap is honest — it must never be
   * backfilled with a guess, because a fabricated audit trail is worse than an
   * absent one.
   */
  createdBy?: Actor;
  /**
   * Who finalized — i.e. *issued* — this document. The legally significant one:
   * finalizing claims a GST serial and makes the record immutable. Set only on
   * the draft → finalized transition, and never on a draft.
   */
  finalizedBy?: Actor;
}

/** Documents about a billed client always carry the client fields. */
interface ClientDocument extends BaseDocument {
  clientId: string;
  clientSnapshot: ClientSnapshot;
}

export interface InvoiceDocument extends ClientDocument {
  type: "INV";
  dueDate?: string;
}

export type PaymentMethod = "Bank Transfer" | "UPI" | "Cash" | "Card" | "Other";

export interface ReceiptDocument extends ClientDocument {
  type: "REC";
  payment: {
    date: string;
    method: PaymentMethod;
    reference?: string;
    /**
     * The invoice this receipt settles, e.g. 'QS-INV-2026-002'. This is what
     * prints on the receipt, so it stays the authoritative reference.
     */
    againstInvoiceNumber?: string;
    /**
     * Id of the same invoice, so the link survives even if the number is
     * re-typed. Kept in step with `againstInvoiceNumber`: picking an invoice
     * sets both, and hand-editing the number clears this. A stored id that
     * silently disagrees with the printed number would be worse than no id.
     */
    againstInvoiceId?: string;
  };
}

/**
 * The contract-specific payload: which Parts this agreement includes, and every
 * blank someone filled in.
 *
 * **Parts are copies, not references.** A Part is taken from the services
 * library at the moment it is ticked and detached. Editing that service next
 * year must be incapable of changing an agreement signed last year
 * (CONTEXT.md §5) — and copying at tick time also fixes the blank keys, so a
 * library edit cannot shift the fields of an open draft either.
 *
 * Ticking and unticking an exclusion or a client input edits the copied Part's
 * own id list. There is no separate selection structure: the copy *is* the
 * selection, and what the Part holds is what the contract prints.
 *
 * The Master Agreement and the Schedule bodies are not stored here. They
 * resolve from code on a draft and are frozen onto the document by
 * `materialiseContent` at finalize, exactly as every other document's wording
 * is (CONTEXT.md §5b).
 */
export interface ContractData {
  parts: ContractPart[];
  /** Blank values, keyed `msa.8#2`, `sch.build.9#1`, `part.01.limits#3`. */
  blanks: BlankValues;
  /**
   * The exclusion and client-input lines this contract prints, id → text,
   * copied in alongside the Parts that name them.
   *
   * A Part carries ids; the words live in the shared libraries, which are meant
   * to grow and be reworded. Without this map an issued contract would resolve
   * its "not included" list against a table that has moved on — which is the
   * same compliance bug as reading live studio details (CONTEXT.md §5).
   */
  library: Record<string, string>;
}

export interface ContractDocument extends ClientDocument {
  type: "CON";
  contract: ContractData;
}

/**
 * A credit note — the only lawful way to reduce or reverse an invoice that has
 * already been issued.
 *
 * This exists because finalized documents are immutable (CONTEXT.md §4) and
 * that is correct: an issued tax invoice is a record retained 72 months under
 * CGST s.36 and it may not be edited. So a mistake, a cancellation or a
 * discount agreed afterwards has nowhere to go. CGST **s.34(1)** is the answer
 * the statute gives: the supplier issues a credit note, and s.34(2) lets the
 * output tax liability be reduced by it in the return for the month it is
 * declared. Duplicating the invoice as a new draft does not do that — it
 * creates a second invoice, and leaves the first one standing in the return.
 *
 * Numbered from the same atomic per-FY claim as everything else, in its own
 * series (`QS-CRN-2627-nnn`), because s.34 wants a credit note to carry a
 * consecutive serial number of its own. A number shared with the invoice series
 * would break both.
 *
 * The tax fields are the invoice's, not new ones: a credit note reverses tax
 * that was charged, so it carries the same rate, the same place of supply and
 * the same split. `computeTotals` is untouched — the figures are stated
 * positive and the document's *nature* is what makes them a reduction, which is
 * how a credit note is read and how s.34 describes it.
 */
export interface CreditNoteDocument extends ClientDocument {
  type: "CRN";
  /**
   * The invoice being credited. Rule 53(1A)(f) requires the serial number *and
   * date* of the corresponding tax invoice, so all three are printed, and the
   * finalize schema requires the number and the date.
   *
   * `invoiceId` is the stored link and is kept in step with the number exactly
   * as the receipt's is: picking an invoice sets all of them, and hand-editing
   * the number clears the id, because a link that silently disagrees with the
   * printed number is worse than no link.
   */
  against: {
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceId?: string;
  };
  /**
   * Why the credit is being issued. Not one of Rule 53's mandatory particulars,
   * but it is what makes the note reconcilable a year later, and every
   * accounting package prints one. Editable free text rather than a fixed list:
   * "deficiency in service" and "post-supply discount agreed" are different
   * facts and neither is a dropdown Qera can enumerate honestly.
   */
  reason?: string;
}

export type EngagementType = "intern" | "employee";
export type PronounKey = "he" | "she" | "they";

/**
 * Statutory payroll identifiers, printed on a pay slip and snapshotted onto it.
 *
 * All optional: an employee record is usually created before PF/ESI
 * registration exists, and an intern has none of these at all. Validated by
 * `payrollIdsSchema` in employee.ts.
 */
export interface PayrollIds {
  /** The employer's own staff number, not a statutory one. */
  employeeCode?: string;
  pan?: string;
  /** Universal Account Number — the EPFO member id. */
  uan?: string;
  pfNumber?: string;
  esicNumber?: string;
}

/**
 * Frozen-at-finalize copy of the employee, mirroring ClientSnapshot.
 *
 * Unlike ClientSnapshot this is written out by hand, so there is no `Pick` to
 * stop a field being added by accident. Every field here is copied into issued
 * documents and must stay optional-or-present forever. Structured address
 * parts are deliberately absent: slips print the flat `address` string.
 */
export interface EmployeeSnapshot {
  name: string;
  address: string;
  email: string;
  phone: string;
  role: string;
  engagementType: EngagementType;
  pronoun: PronounKey;
  joiningDate: string;
  endDate?: string;
  bank: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    /** Filled from the IFSC lookup. Record-keeping only — no sheet prints it. */
    branch?: string;
    upiId?: string;
    /**
     * The employee's receiving UPI QR, as a compressed data URL.
     *
     * This is snapshotted on purpose — the QR prints on the stipend slip, so an
     * issued slip must keep showing the QR that was current when it was issued,
     * even if the employee later changes bank. Optional, so slips issued before
     * this existed stay valid.
     */
    upiQrDataUrl?: string;
  };
  /**
   * Statutory identifiers as at issue. Snapshotted for the same reason as the
   * bank details: a pay slip is a statutory wage record, and the PAN/UAN it was
   * issued under must not change when the employee record is later corrected.
   * Optional — slips issued before this existed, and every intern, have none.
   */
  payroll?: PayrollIds;
}

/**
 * The two pay slips — financial-shaped (line items, totals) but for an employee.
 *
 * `STP` is a **stipend slip**: a voluntary record of a discretionary payment to
 * an intern, whose terms deny an employer–employee relationship.
 * `PAY` is a **pay slip**: a statutory wage record under the Code on Wages 2019
 * and Payment of Wages Act s.13A, which is why it alone carries `deductions`
 * and the day counts. They are separate types rather than one type branching on
 * `engagementType` because that lives in the *frozen snapshot* — converting an
 * intern to an employee would otherwise change the legal identity of an open
 * draft — and because a wage register wants its own consecutive series.
 *
 * Neither carries GST: neither is consideration for a supply, so `gstRatePercent`
 * (inherited from BaseDocument) is pinned to 0 and the sheet prints no tax line.
 * That is also what makes a slip safe to pay in a currency other than INR.
 */
export interface SlipDocument extends BaseDocument {
  type: "STP" | "PAY";
  employeeId: string;
  employeeSnapshot: EmployeeSnapshot;
  /** Paid-in currency. Absent on slips issued before currencies existed → INR. */
  currency?: CurrencyCode;
  /** Legacy free-text period ('12th – 31st May'), kept so issued slips render. */
  stipendPeriod?: string;
  stipendPeriodStart?: string;
  stipendPeriodEnd?: string;
  /** 'YYYY-MM' on new slips; free text ('May 2026') on older ones. */
  stipendMonth: string;
  paymentMethod: string;
  paymentReference?: string;
  deductionsNote: string;
  /**
   * Statutory deductions — TDS u/s 192 and anything else withheld. PAY only; a
   * stipend slip carries none, and net equals gross.
   *
   * ponytail: reuses `LineItem`, so rate × qty is expressible but meaningless
   * here — qty is pinned to 1 and its column hidden. Give deductions their own
   * { label, amountPaise } shape if that ever confuses anyone.
   */
  deductions?: LineItem[];
  /** Days in the wage period, and how many were paid. PAY only. */
  daysInPeriod?: number;
  daysPaid?: number;
  /** Loss-of-pay days. PAY only. */
  lopDays?: number;
}

/** @deprecated Use `SlipDocument`. Kept so existing imports keep compiling. */
export type StipendDocument = SlipDocument;

/** Letters (offer/experience/exit) — boilerplate + editable body. */
export interface LetterDocument extends BaseDocument {
  type: "OFR" | "EXP" | "EXIT";
  employeeId: string;
  employeeSnapshot: EmployeeSnapshot;
  bodyParagraphs: string[];
  bulletSections: { heading: string; items: string[] }[];
  payAmountPaise?: number;
}

/**
 * A pre-sale Service Quotation — the one document type addressed to nobody in
 * particular. Every other client document carries `clientId` +
 * `clientSnapshot` (`ClientDocument`), because it is billed to a client record
 * that already exists. A quotation is routinely sent *before* a prospect is
 * onboarded at all, so it extends `BaseDocument` directly and never sets
 * `clientId` — the recipient is free text, decoupled from the `clients` table.
 *
 * `gstCountry` is an explicit operator choice, not derived from any client
 * record (there may be none) — see `CONTEXT.md`'s note on this type for why
 * that is deliberate rather than a gap. `gstRatePercent` (inherited from
 * `BaseDocument`) is pinned to 0, the same way a `SlipDocument`'s is: the
 * estimate this type shows is computed by `computeQuotationTotals`, not the
 * shared GST machinery, since there is no place-of-supply to derive.
 */
export interface QuotationDocument extends BaseDocument {
  type: "QTN";
  /** Free text — a prospect's name or company, independent of any client record. */
  recipientName?: string;
  /** "Kind Attention" — the contact person named on the quotation. */
  attentionName?: string;
  /** One line addressing the attention name, printed just under it — e.g.
   * "We are pleased to submit our offer for the above mentioned project." */
  offerLine?: string;
  subjectLine?: string;
  /** ISO date — after which the quoted figures are no longer held. */
  validUntil?: string;
  /** India shows an estimated 18% GST line; International shows none. */
  gstCountry: "IN" | "INTL";
  /** A free payment-milestone schedule, e.g. Advance 35% / Final 10%. Percentages are not enforced to sum to 100 — this is not a binding contract. */
  milestones?: { label: string; percent: number }[];
  /** Freeform terms/notes, printed as-is — not the clause-library machinery invoices/contracts use. */
  termsNote?: string;
}

export type AdminDocument =
  | InvoiceDocument
  | ReceiptDocument
  | CreditNoteDocument
  | ContractDocument
  | SlipDocument
  | LetterDocument
  | QuotationDocument;

/**
 * Slim view of a finalized invoice, for the receipt's "against invoice" picker.
 * Carries just enough to identify the invoice and to autofill a receipt from
 * it — never the whole document.
 */
export interface InvoiceOption {
  id: string;
  /** e.g. 'QS-INV-2627-001'. Always present: only finalized invoices qualify. */
  number: string;
  issueDate: string;
  totalPaise: number;
  lineItems: LineItem[];
  gstRatePercent: number;
  placeOfSupplyStateCode?: string;
  gstLabel?: string;
  /** Carried so a credit note reverses the tax that was actually charged. */
  discountPercent?: number;
  discountPaise?: number;
}

export interface DocTotals {
  subtotalPaise: number;
  /** What the discount came to, 0 when there is none. Taken off before GST. */
  discountPaise: number;
  /** `subtotalPaise - discountPaise`. What GST is charged on, and what Rule 46 calls the taxable value. */
  taxablePaise: number;
  gstPaise: number;
  totalPaise: number;
}

/** Standard Server Action result shape (mirrors contact.ts). */
export interface ActionResult {
  success: boolean;
  error?: string;
  /** Set on success where the caller needs the created/affected id. */
  id?: string;
}
