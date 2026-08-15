/**
 * The client record beyond its identity — tax registration, the people, the
 * commercial terms, and the files.
 *
 * `ClientRecord` and `clientInputSchema` (in `types.ts` and `registry.ts`) hold
 * the identity half, which every document has always printed. This file holds
 * the four groups onboarding added. They are **groups, not columns**, following
 * `PayrollIds`: nothing queries them, and a group keeps the next field
 * migration-free.
 *
 * **Every field here is optional, deliberately.** Onboarding saves one step at
 * a time against a row that already exists, so a half-filled client is a normal
 * state rather than an error, and every client written before this existed
 * must keep loading and saving. Required-ness lives in the step's own form,
 * where it can be explained, not in the record, where it would strand rows.
 *
 * Client-safe: zod schemas shared by the wizard's resolvers and the Server
 * Actions, so the two can never disagree about what is valid.
 */

import { z } from 'zod';
import { isISODate } from './dates';
import { CURRENCY_CODES, type CurrencyCode } from './currency';
import { entityTypeSpec, ENTITY_TYPE_VALUES } from './entityType';
import { gstinError, panHolderTypeError, PAN_RE, panKindOfEntityType } from './taxIds/india';
import { TAX_ID_TYPE_CODES, taxIdError } from './taxIds/foreign';
import {
  cinSchema,
  emailSchema,
  gstinSchema,
  panSchema,
  phoneSchema,
  tanSchema,
} from './fields';
import {
  codeSchema,
  httpsUrlSchema,
  multilineSchema,
  personNameSchema,
  textSchema,
} from './text';

// ─── Tax & registration ───────────────────────────────────────────────────────

/**
 * The TDS sections a studio's invoices actually meet. 194J is the usual one for
 * professional and technical services; 194C turns up when work is framed as a
 * contract for work rather than professional services.
 *
 * The rate is entered separately rather than derived from the section: it
 * varies with the payee's status (a 194J technical-services rate is 2%, not
 * 10%) and drops for a lower-deduction certificate under s.197. A derived rate
 * that is wrong half the time is worse than one the client tells you.
 */
export const TDS_SECTIONS = ['194J', '194C', '194H', '194I', '194Q', 'Other'] as const;

export interface ClientTax {
  /** Whether the client is GST-registered at all. */
  gstRegistered?: boolean;
  gstin?: string;
  pan?: string;
  /** Supplies to an SEZ unit are zero-rated — this changes the tax treatment. */
  sez?: boolean;
  /** Whether the client deducts TDS before paying. Most corporates do. */
  tdsApplicable?: boolean;
  tdsSection?: string;
  tdsRatePercent?: number;
  /** Their TAN, required on their side to deduct. */
  tan?: string;
  cin?: string;

  // ── Outside India ──
  // Collected and printed as the recipient's registration; nothing computes
  // from them. See the bound recorded at the top of `taxIds/foreign.ts`.
  taxIdType?: string;
  taxId?: string;
  /** Whether the client accounts for the tax on their side. */
  reverseCharge?: boolean;
  /** Some jurisdictions ask the supplier for a tax residency certificate. */
  requiresTaxResidencyCertificate?: boolean;
  /** US clients routinely ask an overseas supplier for a W-8BEN-E. */
  requiresW8BenE?: boolean;
}

/**
 * Blank-tolerant throughout: an empty string means "not filled in yet", and
 * every identifier is checked only once something is typed. Each `.refine`
 * defers to the validator in `taxIds/`, so the rule exists once.
 */
export const clientTaxSchema = z.object({
  gstRegistered: z.boolean().optional(),
  gstin: gstinSchema().optional(),
  // Structure only. The holder type depends on the entity type, which is on the
  // record rather than in this section, so it is checked in
  // `clientTaxCrossErrors` below where the whole client is in hand.
  pan: panSchema({ holder: [] }).optional(),
  sez: z.boolean().optional(),
  tdsApplicable: z.boolean().optional(),
  tdsSection: codeSchema(20).optional(),
  tdsRatePercent: z.number().min(0).max(100).optional(),
  tan: tanSchema().optional(),
  cin: cinSchema().optional(),
  taxIdType: z.enum(TAX_ID_TYPE_CODES as [string, ...string[]]).optional(),
  taxId: codeSchema(40).optional(),
  reverseCharge: z.boolean().optional(),
  requiresTaxResidencyCertificate: z.boolean().optional(),
  requiresW8BenE: z.boolean().optional(),
})
  .superRefine((tax, ctx) => {
    // A rate without a section is a number nobody can act on, and a section
    // without a rate cannot be applied. Either both or neither.
    if (tax.tdsApplicable) {
      if (!tax.tdsSection) {
        ctx.addIssue({ code: 'custom', message: 'Which section do they deduct under?', path: ['tdsSection'] });
      }
      if (tax.tdsRatePercent === undefined) {
        ctx.addIssue({ code: 'custom', message: 'At what rate?', path: ['tdsRatePercent'] });
      }
      if (!tax.tan) {
        ctx.addIssue({ code: 'custom', message: 'A deductor needs a TAN.', path: ['tan'] });
      }
    }
    if (tax.gstRegistered && !tax.gstin) {
      ctx.addIssue({ code: 'custom', message: 'A registered client has a GSTIN.', path: ['gstin'] });
    }
    if (tax.taxId && !tax.taxIdType) {
      ctx.addIssue({ code: 'custom', message: 'Which kind of registration is this?', path: ['taxIdType'] });
    }
    if (tax.taxIdType && tax.taxId && taxIdError(tax.taxIdType, tax.taxId)) {
      ctx.addIssue({ code: 'custom', message: taxIdError(tax.taxIdType, tax.taxId)!, path: ['taxId'] });
    }
  });

/**
 * The checks that need facts from *outside* the tax section — the state on the
 * address, and the entity type on the record.
 *
 * Deliberately a plain function rather than zod context. Both the wizard's
 * resolver and the Server Action have the whole record in hand and call this,
 * so the rule exists once, and neither has to reshape its input to satisfy a
 * schema that wants data from a different step.
 *
 * The GSTIN↔address check is the load-bearing one: it is what makes deriving
 * place of supply from a GSTIN trustworthy (`placeOfSupply.ts`), and therefore
 * what closes `PRINCIPLES.md` rule 3 rather than merely moving it.
 */
export function clientTaxCrossErrors(
  tax: ClientTax | undefined,
  context: { addressState?: string; entityType?: string },
): Partial<Record<'gstin' | 'pan', string>> {
  const errors: Partial<Record<'gstin' | 'pan', string>> = {};
  if (!tax) return errors;

  const gstin = gstinError(tax.gstin ?? '', {
    addressState: context.addressState,
    pan: tax.pan,
  });
  if (gstin) errors.gstin = gstin;

  const pan = tax.pan?.trim().toUpperCase();
  const expectedKind = panKindOfEntityType(context.entityType);
  if (pan && PAN_RE.test(pan) && expectedKind) {
    const held = panHolderTypeError(pan, [expectedKind]);
    if (held) {
      const label = entityTypeSpec(context.entityType)?.label ?? 'this entity';
      errors.pan = `${held} This record says ${label}.`;
    }
  }

  return errors;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export interface ClientContact {
  name?: string;
  designation?: string;
  email?: string;
  /** E.164 where the form could parse one. */
  phone?: string;
}

export interface ClientContacts {
  primary?: ClientContact;
  /** Usually a different person. Invoices sent to the wrong one get paid late. */
  billing?: ClientContact;
  /** Whose name and designation go in a contract's signature block. */
  signing?: ClientContact;
  escalation?: ClientContact;
  /** Often a shared inbox rather than a person. */
  invoiceEmail?: string;
  /**
   * Which of the three secondary roles the primary contact also fills.
   *
   * A **flag, never a copy** (`PRINCIPLES.md` rule 3). At many clients one
   * person is the day-to-day contact, the one who signs, and the one accounts
   * payable chases. Storing their details three times means correcting a
   * changed email in three places and finding the third next year on a
   * contract — so the mirror is recorded and `resolveContact` performs it on
   * read.
   *
   * Only these three can mirror. `primary` is the thing being mirrored, and
   * `invoiceEmail` is an inbox rather than a person.
   */
  sameAsPrimary?: MirroredContactKey[];
}

/** The contact roles that can be "same as primary". */
export const MIRRORABLE_CONTACTS = ['billing', 'signing', 'escalation'] as const;
export type MirroredContactKey = (typeof MIRRORABLE_CONTACTS)[number];

/**
 * The contact filling a role — the primary one where that role is mirrored.
 *
 * **Every reader must go through this**, including `clientSnapshotOf`: a
 * contract whose signatory is mirrored has nothing stored under `signing`, and
 * reading the group directly would print the blank signature rule this record
 * was built to fix.
 */
export function resolveContact(
  contacts: ClientContacts | undefined,
  key: 'primary' | MirroredContactKey,
): ClientContact | undefined {
  if (!contacts) return undefined;
  if (key !== 'primary' && contacts.sameAsPrimary?.includes(key)) {
    return contacts.primary;
  }
  return contacts[key];
}

const contactSchema = z.object({
  name: personNameSchema(200).optional(),
  designation: textSchema(200).optional(),
  email: emailSchema().optional(),
  phone: phoneSchema().optional(),
});

export const clientContactsSchema = z.object({
  primary: contactSchema.optional(),
  billing: contactSchema.optional(),
  signing: contactSchema.optional(),
  escalation: contactSchema.optional(),
  invoiceEmail: emailSchema().optional(),
  sameAsPrimary: z.array(z.enum(MIRRORABLE_CONTACTS)).optional(),
});

// ─── Commercial terms, and what was engaged ───────────────────────────────────

export const ENGAGEMENT_TYPES = ['retainer', 'project', 'hourly'] as const;
export const BILLING_CYCLES = ['monthly', 'quarterly', 'annual'] as const;

export interface ClientEngagedService {
  /** The service's own code, as the library keys it. */
  code: string;
  /** What was agreed, which may differ from the catalogue. Integer paise. */
  ratePaise?: number;
}

export interface ClientCommercial {
  /** Record-keeping. Invoices print INR regardless — see `currency.ts`. */
  currency?: CurrencyCode;
  /** What the invoice's due date is derived from. */
  paymentTermsDays?: number;
  engagementType?: (typeof ENGAGEMENT_TYPES)[number];
  billingCycle?: (typeof BILLING_CYCLES)[number];
  /** Day of the month a retainer is raised on. */
  billingDay?: number;
  lateFeePercentPerMonth?: number;
  /** Some clients will not pay an invoice that arrives without a PO. */
  poRequired?: boolean;
  poNumber?: string;
  /** Enterprise clients often want invoices submitted through a portal. */
  vendorPortalUrl?: string;
  services?: ClientEngagedService[];
  startDate?: string;
  termMonths?: number;
  autoRenew?: boolean;
  noticeDays?: number;
}

const isoDate = z.string().refine(isISODate, { message: "Expected 'YYYY-MM-DD'." });

export const clientCommercialSchema = z.object({
  currency: z.enum(CURRENCY_CODES).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  engagementType: z.enum(ENGAGEMENT_TYPES).optional(),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  billingDay: z.number().int().min(1).max(31).optional(),
  lateFeePercentPerMonth: z.number().min(0).max(100).optional(),
  poRequired: z.boolean().optional(),
  poNumber: codeSchema(60).optional(),
  vendorPortalUrl: httpsUrlSchema(300).optional(),
  services: z
    .array(
      z.object({
        code: codeSchema(20, { required: 'A service code is required.' }),
        ratePaise: z.number().int().min(0).max(1e13).optional(),
      }),
    )
    .max(50)
    .optional(),
  startDate: isoDate.optional(),
  termMonths: z.number().int().min(0).max(600).optional(),
  autoRenew: z.boolean().optional(),
  noticeDays: z.number().int().min(0).max(365).optional(),
});

// ─── Attachments ──────────────────────────────────────────────────────────────

export const ATTACHMENT_KINDS = [
  'gst_certificate',
  'pan',
  'incorporation',
  'signed_contract',
  'purchase_order',
  'tax_form',
  'firc',
  'signature',
  'other',
] as const;

/**
 * What may be uploaded. Enforced **server-side** — the same list in the file
 * picker is a convenience, and a file picker is not a security control.
 */
export const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

/** 8 MB. A scan of a certificate; not a video. */
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export interface ClientAttachment {
  id: string;
  kind: (typeof ATTACHMENT_KINDS)[number];
  filename: string;
  mime: string;
  size: number;
  /**
   * The blob's pathname — **never a public URL.** Reads go through
   * `/api/clients/[id]/files/[key]`, which checks the session first. These
   * files are a third party's identity documents; a guessable public link is
   * the whole breach.
   */
  key: string;
  uploadedAt: number;
}

export const clientAttachmentSchema = z.object({
  id: textSchema(100, { required: 'An id is required.' }),
  kind: z.enum(ATTACHMENT_KINDS),
  filename: textSchema(300, { required: 'A filename is required.' }),
  mime: z.enum(ATTACHMENT_MIME_TYPES),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_BYTES),
  key: textSchema(500, { required: 'A key is required.' }),
  uploadedAt: z.number().int(),
});

export const clientAttachmentsSchema = z.array(clientAttachmentSchema).max(50);

// ─── Delivery & access ────────────────────────────────────────────────────────

export const ACCESS_KINDS = [
  'brand_assets',
  'domain_registrar',
  'dns',
  'hosting',
  'analytics',
  'search_console',
  'ad_account',
  'social',
  'repository',
  'deployment',
  'other',
] as const;

/**
 * Where a credential lives — **never the credential.**
 *
 * The distinction is the whole point of this group. "1Password → Clayora vault"
 * is a pointer; the password itself would turn a client record into a breach,
 * and speclr has no secret storage, no envelope encryption and no rotation. If
 * a field here ever starts holding secrets, that is a security incident and not
 * a feature request.
 */
export interface ClientAccessRef {
  id: string;
  kind: (typeof ACCESS_KINDS)[number];
  label: string;
  /** Where it lives: a vault name, an admin console, a person. */
  location: string;
  notes?: string;
}

export const clientAccessSchema = z
  .array(
    z.object({
      id: textSchema(100, { required: 'An id is required.' }),
      kind: z.enum(ACCESS_KINDS),
      label: textSchema(200, { required: 'A label is required.' }),
      location: textSchema(300, { required: 'Say where it lives.' }),
      notes: multilineSchema(1000).optional(),
    }),
  )
  .max(100);

// ─── The sections, as one addressable set ─────────────────────────────────────

/**
 * One action saves any section (`saveClientSection`), so the section name and
 * its schema are paired here rather than in a switch the two could drift apart
 * in.
 */
export const CLIENT_SECTION_SCHEMAS = {
  tax: clientTaxSchema,
  contacts: clientContactsSchema,
  commercial: clientCommercialSchema,
  attachments: clientAttachmentsSchema,
  access: clientAccessSchema,
} as const;

export type ClientSection = keyof typeof CLIENT_SECTION_SCHEMAS;

export const CLIENT_SECTIONS = Object.keys(CLIENT_SECTION_SCHEMAS) as ClientSection[];

export function isClientSection(value: unknown): value is ClientSection {
  return typeof value === 'string' && (CLIENT_SECTIONS as string[]).includes(value);
}

/** The entity-type values a client may carry, for the identity schema. */
export const CLIENT_ENTITY_TYPES = ENTITY_TYPE_VALUES;
