/**
 * Shared types for the internal admin document system (/kessler-admin).
 * Client-safe: no server imports — these types cross the RSC boundary.
 */

/** Phase 2 adds 'CON'. Phase 3 adds HR docs: 'STP' | 'OFR' | 'EXP' | 'EXIT'. */
export type DocTypeCode = 'INV' | 'REC' | 'CON' | 'STP' | 'OFR' | 'EXP' | 'EXIT';

export interface ClientRecord {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  gstin?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LineItem {
  description: string;
  /** Optional smaller sub-detail line under the description. */
  detail?: string;
  /** Integer paise — never floats. ₹1,500.00 === 150000. */
  ratePaise: number;
  /** Positive, up to 2 decimal places (e.g. hours). */
  qty: number;
}

/** 'void' is reserved for Phase 2 — not reachable in Phase 1 UI. */
export type DocStatus = 'draft' | 'finalized';

export type ClientSnapshot = Pick<
  ClientRecord,
  'name' | 'address' | 'email' | 'phone' | 'gstin'
>;

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
  /** Free text shown when gstRatePercent is 0, e.g. 'not applicable - registration in process'. */
  gstLabel?: string;
  notes?: string;
  terms?: string;
  createdAt: number;
  updatedAt: number;
  finalizedAt?: number;
}

/** Documents about a billed client always carry the client fields. */
interface ClientDocument extends BaseDocument {
  clientId: string;
  clientSnapshot: ClientSnapshot;
}

export interface InvoiceDocument extends ClientDocument {
  type: 'INV';
  dueDate?: string;
}

export type PaymentMethod = 'Bank Transfer' | 'UPI' | 'Cash' | 'Card' | 'Other';

export interface ReceiptDocument extends ClientDocument {
  type: 'REC';
  payment: {
    date: string;
    method: PaymentMethod;
    reference?: string;
    /** The invoice this receipt settles, e.g. 'QS-INV-2026-002'. */
    againstInvoiceNumber?: string;
  };
}

export interface ContractMilestone {
  label: string;
  scope: string;
}

export interface ContractSchedule {
  /** Which service template this was copied from (provenance only). */
  sourceServiceId?: string;
  title: string;
  overview: string;
  scopeItems: string[];
  exclusionItems: string[];
  priceNote: string;
  milestones: ContractMilestone[];
  revisionsNote: string;
  disclaimerNote: string;
  supportNote: string;
}

export interface ContractDocument extends ClientDocument {
  type: 'CON';
  schedules: ContractSchedule[];
}

export type EngagementType = 'intern' | 'employee';
export type PronounKey = 'he' | 'she' | 'they';

/** Frozen-at-finalize copy of the employee, mirroring ClientSnapshot. */
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
  bank: { bankName: string; accountNo: string; ifsc: string; upiId?: string };
}

/** Stipend slip — financial-shaped (line items, totals) but for an employee. */
export interface StipendDocument extends BaseDocument {
  type: 'STP';
  employeeId: string;
  employeeSnapshot: EmployeeSnapshot;
  stipendPeriod: string;
  stipendMonth: string;
  paymentMethod: string;
  paymentReference?: string;
  deductionsNote: string;
}

/** Letters (offer/experience/exit) — boilerplate + editable body. */
export interface LetterDocument extends BaseDocument {
  type: 'OFR' | 'EXP' | 'EXIT';
  employeeId: string;
  employeeSnapshot: EmployeeSnapshot;
  bodyParagraphs: string[];
  bulletSections: { heading: string; items: string[] }[];
  payAmountPaise?: number;
}

export type AdminDocument =
  | InvoiceDocument
  | ReceiptDocument
  | ContractDocument
  | StipendDocument
  | LetterDocument;

export interface DocTotals {
  subtotalPaise: number;
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
