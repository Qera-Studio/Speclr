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

import { sql } from 'drizzle-orm';
import {
  boolean,
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
import type { ScheduleKey } from '@/lib/domain/contract/schedules';
import type { ServiceContent } from '@/lib/domain/contract/service';
import type { CurrencyCode } from '@/lib/domain/currency';
import type { DocContent } from '@/lib/domain/docContent';
import type {
  ClientAccessRef,
  ClientAttachment,
  ClientCommercial,
  ClientContacts,
  ClientTax,
} from '@/lib/domain/client';
import type { EmployeeRecord } from '@/lib/domain/employee';
import type { StudioInfo } from '@/lib/domain/studio';
import type {
  ClientSnapshot,
  ContractData,
  DocStatus,
  DocTypeCode,
  EmployeeSnapshot,
  LineItem,
  PayrollIds,
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
  /**
   * Where invoices are addressed, when that is not the registered address.
   *
   * Null means "the registered address", which is the ordinary case. A client
   * registered in one state whose accounts department sits in another is the
   * case this exists for.
   *
   * **It never decides tax.** GST place of supply follows the recipient's
   * registration, not where the envelope goes, so `placeOfSupplyOf` reads the
   * GSTIN and `addressParts` and must keep doing so. Parts only, with no flat
   * twin: there are no rows predating it, so the printable line is composed on
   * read.
   */
  billingAddressParts: jsonb('billing_address_parts').$type<AddressParts>(),
  email: text('email').notNull(),
  /** E.164 for new writes; legacy rows may hold arbitrary text. */
  phone: text('phone').notNull(),
  gstin: text('gstin'),
  /**
   * What kind of legal entity this is — see `lib/domain/entityType.ts`.
   *
   * A real column rather than part of `tax`: it is identity, not tax
   * (`PRINCIPLES.md` rule 2), and it is the one identity fact that validates
   * another — an Indian entity's PAN encodes its own kind in the 4th character.
   * Nullable, like every column added after the first invoice.
   */
  entityType: text('entity_type'),
  /**
   * The four groups onboarding added, and the reason they are groups rather
   * than thirty columns: nothing queries them, and a group keeps the next field
   * migration-free. The same call `bank` and `payroll` make on `employees`.
   *
   * Each is Zod-validated on write by its schema in `lib/domain/client.ts` —
   * `saveClientSection` refuses a payload that does not parse, so what lands in
   * these columns is never merely "whatever the browser sent".
   */
  tax: jsonb('tax').$type<ClientTax>(),
  contacts: jsonb('contacts').$type<ClientContacts>(),
  commercial: jsonb('commercial').$type<ClientCommercial>(),
  /**
   * File *metadata* only. The bytes live in blob storage and are read back
   * through an authenticated route — these are a third party's identity
   * documents, so there is no public URL anywhere in this column.
   */
  attachments: jsonb('attachments').$type<ClientAttachment[]>(),
  /** Where credentials live. Never a credential — see `client.ts`. */
  access: jsonb('access').$type<ClientAccessRef[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Employees ────────────────────────────────────────────────────────────────

export const employees = pgTable(
  'employees',
  {
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
    /** Monthly. Derived from `annual_salary_paise` when there is one. */
    payAmountPaise: integer('pay_amount_paise').notNull(),
    /**
     * An employee's salary as quoted. A real column, not part of a JSONB group:
     * "what do we pay out a year" is a question worth asking of the table.
     * Null for interns, who are paid a monthly stipend, and for rows written
     * before this existed.
     */
    annualSalaryPaise: integer('annual_salary_paise'),
    /** Record-keeping only — documents still print INR. Null means INR. */
    payCurrency: text('pay_currency'),
    /** { bankName, accountNo, ifsc, upiId?, upiQrDataUrl? } */
    bank: jsonb('bank').notNull().$type<EmployeeRecord['bank']>(),
    /**
     * Statutory identifiers printed on a pay slip — { employeeCode?, pan?, uan?,
     * pfNumber?, esicNumber? }. Nullable: nothing queries these, interns have
     * none, and rows written before pay slips existed have no group at all.
     */
    payroll: jsonb('payroll').$type<PayrollIds>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * An employee code identifies one person and is frozen onto every pay slip
     * issued to them, so two people holding the same one makes an issued wage
     * record ambiguous about who it belongs to. Codes are claimed from a
     * counter (`claimEmployeeCode`), which is what makes a collision impossible
     * — this index is what makes it *unrepresentable*, including against a hand
     * -written UPDATE. Partial, because a record without a code yet is normal.
     */
    uniqueIndex('employees_employee_code_uniq')
      .on(sql`(${t.payroll} ->> 'employeeCode')`)
      .where(sql`${t.payroll} ->> 'employeeCode' is not null`),
  ],
);

// ─── Services, and the two shared libraries ───────────────────────────────────

/**
 * The 22 Services — one row per thing Qera sells, each appended to exactly one
 * Schedule as a Part.
 *
 * Keyed by its two-digit code rather than a uuid: the code is what the specs,
 * the Parts and the cross-references all use, it is stable, and there is no
 * second Shopify storefront. `schedule_key` and `sort_order` are real columns
 * because assembly reads them on every render; everything else is the Part's
 * text and lives in `content`, validated by `serviceContentSchema` on write.
 */
export const services = pgTable(
  'services',
  {
    code: text('code').primaryKey(), // '01'–'22'
    name: text('name').notNull(),
    scheduleKey: text('schedule_key').notNull().$type<ScheduleKey>(),
    sortOrder: integer('sort_order').notNull(),
    content: jsonb('content').notNull().$type<ServiceContent>(),
    /** Archived services leave new contracts but stay readable for audit. */
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('services_schedule_key_idx').on(t.scheduleKey)],
);

/**
 * The exclusion library — shared "not included" lines, attached to services
 * through the id arrays in `services.content`.
 *
 * Deliberately not a join table. Nothing queries "which services carry E01"
 * except one admin screen; lines are archived rather than deleted, so an id
 * cannot dangle; and it removes two tables from the write path.
 * ponytail: id arrays over join tables — promote to joins if attachment ever
 * needs querying from the exclusion side at scale.
 */
export const exclusions = pgTable('exclusions', {
  id: text('id').primaryKey(), // 'E01'–
  text: text('text').notNull(),
  category: text('category').notNull(),
  archived: boolean('archived').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The Master Service Agreement's clauses, editable at `/client/clauses`.
 *
 * These lived in code (`domain/contract/msa.ts`) until the library was built,
 * on the argument that they change ~never and need review as one package by a
 * commercial lawyer. That argument still holds for the *text*; what changed is
 * where it is edited. The code copy is now the seed and the fallback, and the
 * library page warns that new and edited clauses are unreviewed.
 *
 * **`number` is the primary key, and it is load-bearing.** Clause bodies cite
 * each other by number ('has the meaning given at clause 11.2'), so inserting a
 * clause in the middle would silently break live cross-references in text
 * nobody re-read. New clauses append at the next number; there is no reorder.
 *
 * Editing here changes the *next* contract only. A contract seeds its own copy
 * of the clause list when its draft is created and freezes it at finalize
 * (`materialiseContent`) — the same rule `seed/services.ts` states for
 * Services, and CONTEXT.md §5b for document content generally.
 */
export const clauses = pgTable('clauses', {
  number: integer('number').primaryKey(),
  heading: text('heading').notNull(),
  /** One entry per paragraph, each carrying its own sub-number ('8.4 Where…'). */
  body: jsonb('body').notNull().$type<string[]>(),
  /** Archived clauses leave new contracts but stay readable for audit. */
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** The client-input library. Same mechanics as `exclusions`, opposite purpose. */
export const clientInputs = pgTable('client_inputs', {
  id: text('id').primaryKey(), // 'I01'–
  text: text('text').notNull(),
  category: text('category').notNull(),
  archived: boolean('archived').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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
  /**
   * The document's edited wording — sparse on a draft, and the whole resolved
   * set once finalize materialises it. Stored for the same reason as
   * `studioSnapshot`: without it, revising a default in code would silently
   * rewrite documents already issued. Absent on documents written before the
   * content layer existed, which correctly fall back to today's defaults.
   */
  content?: DocContent;
  gstLabel?: string;
  /** Why place of supply departs from the client-derived one. */
  placeOfSupplyOverrideReason?: string;
  notes?: string;
  terms?: string;
  dueDate?: string; // INV
  payment?: unknown; // REC — ReceiptDocument['payment']
  /** CON — the included Parts, copied, plus every filled blank. */
  contract?: ContractData;
  // STP
  currency?: CurrencyCode;
  stipendPeriod?: string;
  stipendPeriodStart?: string;
  stipendPeriodEnd?: string;
  stipendMonth?: string;
  paymentMethod?: string;
  paymentReference?: string;
  deductionsNote?: string;
  // PAY
  deductions?: LineItem[];
  daysInPeriod?: number;
  daysPaid?: number;
  lopDays?: number;
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
