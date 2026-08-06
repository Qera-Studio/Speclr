/**
 * Drizzle schema for speclr's Postgres store.
 *
 * Design (per the extraction spec §4.3): relational columns for what we query
 * and report on; JSONB for the doc-type-specific parts that vary between
 * document types. The domain types in `@/lib/domain/types` remain the single
 * source of truth — the JSONB columns hold whole domain objects, validated by
 * the existing Zod schemas on write, while the flat columns are a denormalized
 * projection for querying/indexing.
 *
 * Money is integer paise. Dates that belong to a document (issueDate etc.) are
 * ISO 'YYYY-MM-DD' strings inside the JSONB — Postgres `date` columns are used
 * only for the queryable projections. Row lifecycle timestamps use `timestamptz`.
 */

import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AddressParts } from '@/lib/domain/address';
import type { EmployeeRecord } from '@/lib/domain/employee';
import type { StudioInfo } from '@/lib/domain/studio';
import type {
  ClientSnapshot,
  DocStatus,
  DocTypeCode,
  EmployeeSnapshot,
  ContractMilestone,
  ContractSchedule,
  LineItem,
} from '@/lib/domain/types';

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /**
   * Legal entity name printed on documents. Nullable: the rows written before
   * this column existed have none, and they must keep loading.
   */
  companyName: text('company_name'),
  /** Flat printable address — what documents render. Stays authoritative. */
  address: text('address').notNull(),
  /**
   * Structured address for editing and pincode autofill, composed into
   * `address` at save time. Nullable: rows written before this existed have no
   * parts, and that must keep working.
   */
  addressParts: jsonb('address_parts').$type<AddressParts>(),
  email: text('email').notNull(),
  /** E.164 for new writes; legacy rows may hold arbitrary text. */
  phone: text('phone').notNull(),
  gstin: text('gstin'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Employees ────────────────────────────────────────────────────────────────

export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Flat printable address — what HR documents render. */
  address: text('address').notNull(),
  /** Structured parts for editing; null on rows that predate them. */
  addressParts: jsonb('address_parts').$type<AddressParts>(),
  email: text('email').notNull(),
  /** E.164 for new writes; legacy rows may hold arbitrary text. */
  phone: text('phone').notNull(),
  role: text('role').notNull(),
  engagementType: text('engagement_type').notNull(), // 'intern' | 'employee'
  pronoun: text('pronoun').notNull(), // 'he' | 'she' | 'they'
  joiningDate: date('joining_date').notNull(),
  endDate: date('end_date'),
  payAmountPaise: integer('pay_amount_paise').notNull(),
  /** Record-keeping only — documents still print INR. Null means INR. */
  payCurrency: text('pay_currency'),
  /** { bankName, accountNo, ifsc, upiId?, upiQrDataUrl? } */
  bank: jsonb('bank').notNull().$type<EmployeeRecord['bank']>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Service templates ────────────────────────────────────────────────────────

export const serviceTemplates = pgTable('service_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // queryable projection of the template name
  /** The full ServiceTemplate record (overview, scope, milestones, notes…). */
  content: jsonb('content').notNull().$type<ServiceTemplateContent>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** The ServiceTemplate fields stored in `content` (everything except id/name/timestamps). */
export interface ServiceTemplateContent {
  overview: string;
  scopeItems: string[];
  exclusionItems: string[];
  priceNote: string;
  milestones: ContractMilestone[];
  revisionsNote: string;
  disclaimerNote: string;
  supportNote: string;
}

// ─── Studio settings ──────────────────────────────────────────────────────────

/**
 * The studio's own identity block ("from:", bank, GSTIN, CIN), editable at
 * /settings. Exactly one row, keyed by the constant `STUDIO_SETTINGS_ID`.
 *
 * One JSONB blob rather than columns: nothing here is ever queried or reported
 * on — it is read whole, rendered whole, and frozen whole onto a document at
 * finalize. Validated by `studioInputSchema` on write.
 */
export const studioSettings = pgTable('studio_settings', {
  id: text('id').primaryKey(),
  info: jsonb('info').notNull().$type<StudioInfo>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Documents ────────────────────────────────────────────────────────────────

/**
 * The doc-type-specific payload stored in `data`. A discriminated bag of the
 * fields that vary by type: line items (INV/REC/STP), receipt payment (REC),
 * contract schedules (CON), stipend fields (STP), letter body (OFR/EXP/EXIT),
 * plus the shared optional presentation fields. Validated by the registry's
 * Zod schemas on write; never trusted raw.
 */
export interface DocumentData {
  lineItems?: LineItem[];
  /**
   * The studio's identity block as at finalize. Lives here rather than in its
   * own column for the same reason as everything else in `data`: nothing queries
   * it. Absent on drafts and on documents issued before it existed.
   */
  studioSnapshot?: StudioInfo;
  gstLabel?: string;
  notes?: string;
  terms?: string;
  dueDate?: string; // INV
  payment?: unknown; // REC — ReceiptDocument['payment']
  schedules?: ContractSchedule[]; // CON
  // STP
  stipendPeriod?: string;
  stipendMonth?: string;
  paymentMethod?: string;
  paymentReference?: string;
  deductionsNote?: string;
  // Letters
  bodyParagraphs?: string[];
  bulletSections?: { heading: string; items: string[] }[];
  payAmountPaise?: number;
}

export const documents = pgTable(
  'documents',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull().$type<DocTypeCode>(),
    status: text('status').notNull().$type<DocStatus>().default('draft'),

    // Numbering — present only once finalized (financial + hr-slip docs).
    number: text('number'),
    serial: integer('serial'),
    fyYear: integer('fy_year'), // FY start, e.g. 2026 for FY 2026-27

    // Queryable projections.
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date'),
    clientId: text('client_id').references(() => clients.id),
    employeeId: text('employee_id').references(() => employees.id),
    gstRatePercent: integer('gst_rate_percent').notNull().default(0),
    placeOfSupplyStateCode: text('place_of_supply_state_code'),
    totalPaise: integer('total_paise').notNull().default(0),

    // Variable payload + frozen party snapshot (client OR employee).
    data: jsonb('data').notNull().$type<DocumentData>(),
    snapshot: jsonb('snapshot').$type<ClientSnapshot | EmployeeSnapshot>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),

    // Audit trail — who drafted and who issued. Flat columns rather than JSONB
    // because "everything Bob issued" is a query, and real columns are what the
    // queried/reported facts get (AGENTS.md). Nullable: documents written
    // before this existed have no actor, and that blank is deliberate — see
    // `Actor` in domain/types.ts. Clerk id + the email frozen at action time.
    createdBy: text('created_by'),
    createdByEmail: text('created_by_email'),
    finalizedBy: text('finalized_by'),
    finalizedByEmail: text('finalized_by_email'),
  },
  (t) => [
    index('documents_created_at_idx').on(t.createdAt.desc()),
    index('documents_finalized_by_idx').on(t.finalizedBy),
    index('documents_status_idx').on(t.status),
    index('documents_type_idx').on(t.type),
    index('documents_client_id_idx').on(t.clientId),
    index('documents_employee_id_idx').on(t.employeeId),
    // A finalized number must be unique across the whole system.
    uniqueIndex('documents_number_uniq').on(t.number),
  ],
);

// ─── Counters (atomic FY numbering) ───────────────────────────────────────────

/**
 * One row per (doc_type, fy_code) holding the last serial issued. Finalize
 * increments this atomically (row-lock / INSERT ... ON CONFLICT ... RETURNING)
 * so a number is never handed out twice. Abandoned drafts never touch it.
 */
export const counters = pgTable(
  'counters',
  {
    docType: text('doc_type').notNull(),
    fyCode: text('fy_code').notNull(), // e.g. '2627'
    lastSerial: integer('last_serial').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.docType, t.fyCode] })],
);
