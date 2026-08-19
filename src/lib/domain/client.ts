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
import {
  entityTypeSpec,
  ENTITY_TYPE_VALUES,
  isNaturalPerson,
  type ClientKind,
} from './entityType';
import {
  cinEntityTypeError,
  gstinError,
  panHolderTypeError,
  PAN_RE,
  panKindOfEntityType,
} from './taxIds/india';
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
): Partial<Record<'gstin' | 'pan' | 'cin', string>> {
  const errors: Partial<Record<'gstin' | 'pan' | 'cin', string>> = {};
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

  // The same question asked of the other identifier that answers it. A CIN's
  // ownership triple says what kind of company it belongs to, so it agrees with
  // the entity type or one of the two is wrong.
  const cin = cinEntityTypeError(tax.cin ?? '', context.entityType);
  if (cin) {
    const label = entityTypeSpec(context.entityType)?.label ?? 'this entity';
    errors.cin = `${cin} This record says ${label}.`;
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

/**
 * Two roles, because two roles are read.
 *
 * `signing` fills a contract's signature block (`clientSnapshotOf`), and
 * `billing` is where an invoice goes. There was an `escalation` contact and a
 * separate `invoiceEmail` as well; nothing read either, speclr sends no mail,
 * and `billing.email` accepts a shared inbox as happily as a person. They come
 * back the day something here actually delivers a document.
 */
export interface ClientContacts {
  primary?: ClientContact;
  /**
   * Where the invoice goes: usually someone in their accounts payable rather
   * than the person the work is discussed with, and often a shared inbox.
   */
  billing?: ClientContact;
  /** Whose name and designation go in a contract's signature block. */
  signing?: ClientContact;
  /**
   * Who fills a role when it is not a person of its own.
   *
   * A **flag, never a copy** (`PRINCIPLES.md` rule 3). At many clients one
   * person is the day-to-day contact, the one who signs, and the one accounts
   * payable chases. Storing their details twice over means correcting a changed
   * email in three places and finding the third next year on a contract, so the
   * choice is recorded and `resolveContact` performs it on read.
   *
   * A key absent from this map means the role has details of its own, stored
   * under `billing` / `signing`. `primary` never appears: it is the thing the
   * others point at.
   *
   * **`'company'` is billing's only, and the default.** An invoice is addressed
   * to the entity, not to a person, so naming nobody is the ordinary case and a
   * blank section should not have to stand for it. Signing cannot be
   * `'company'` because a company does not hold a pen: somebody signs, and the
   * signature block prints their name.
   */
  roles?: { billing?: ContactSource; signing?: Extract<ContactSource, 'primary'> };
}

/** Where a role's details come from when it has none of its own. */
export type ContactSource = 'company' | 'primary';

/** The contact roles that can point at somebody else. */
export const MIRRORABLE_CONTACTS = ['billing', 'signing'] as const;
export type MirroredContactKey = (typeof MIRRORABLE_CONTACTS)[number];

/**
 * The person filling a role, or nobody where the role is the company itself.
 *
 * **Every reader must go through this**, including `clientSnapshotOf`: a
 * contract whose signatory points at the primary contact has nothing stored
 * under `signing`, and reading the group directly would print the blank
 * signature rule this record was built to fix.
 *
 * `undefined` from a `'company'` billing role is the correct answer, not a
 * missing one: the invoice is addressed to the entity and there is no person to
 * mark it for the attention of.
 */
export function resolveContact(
  contacts: ClientContacts | undefined,
  key: 'primary' | MirroredContactKey,
): ClientContact | undefined {
  if (!contacts) return undefined;
  if (key === 'primary') return contacts.primary;
  const source = contacts.roles?.[key];
  if (source === 'company') return undefined;
  if (source === 'primary') return contacts.primary;
  return contacts[key];
}

/**
 * The person filling a role, for a client of either kind.
 *
 * **This is the reader every caller wants**, and `resolveContact` is the half
 * of it that only knows about the `contacts` group.
 *
 * An individual has no Contacts step: they are their own contact, and their
 * name, email and phone are on the record already. Copying them into
 * `contacts.primary` would be storing a fact twice (`PRINCIPLES.md` rule 3) and
 * would go stale the first time the identity step was edited, so only the
 * designation is stored and the rest is overlaid here.
 *
 * That matters most for `signing`. Without this, a contract for a freelancer
 * would freeze a signatory carrying a job title and no name — the blank
 * signature rule this record was built to remove, back again in a new place.
 */
export function clientContact(
  client: Pick<ClientPerson, 'name' | 'email' | 'phone' | 'entityType' | 'contacts'>,
  key: 'primary' | MirroredContactKey,
): ClientContact | undefined {
  const resolved = resolveContact(client.contacts, key);
  if (!isNaturalPerson(client.entityType)) return resolved;

  // A billing role pointing at the company is still "nobody", the same answer
  // as for a company client: there is no person to mark the invoice for.
  if (key !== 'primary' && client.contacts?.roles?.[key] === 'company') return undefined;
  // A role with its own person named keeps them. Only the roles that point at
  // the primary contact, and the primary contact itself, resolve to the client.
  if (resolved && resolved.name) return resolved;

  return {
    name: client.name,
    designation: resolved?.designation ?? client.contacts?.primary?.designation,
    email: resolved?.email ?? client.email,
    phone: resolved?.phone ?? client.phone,
  };
}

/** The parts of a client `clientContact` reads. Kept structural to avoid a
 *  cycle: `types.ts` imports this file. */
interface ClientPerson {
  name: string;
  email: string;
  phone: string;
  entityType?: string;
  contacts?: ClientContacts;
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
  roles: z
    .object({
      billing: z.enum(['company', 'primary']).optional(),
      // Narrower than billing on purpose: a company cannot sign.
      signing: z.literal('primary').optional(),
    })
    .optional(),
});

// ─── Commercial terms, and what was engaged ───────────────────────────────────

export const ENGAGEMENT_TYPES = ['retainer', 'project', 'hourly'] as const;

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
  /**
   * How often a retainer is billed, in months. Monthly, quarterly and annual
   * are 1, 3 and 12; anything else is simply another number, so a client billed
   * every two months needs no new concept. Stored as the interval rather than
   * as a name plus an interval, which are two facts that can disagree.
   */
  billingIntervalMonths?: number;
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

// Empty is absent, not malformed: the date picker's own "nothing chosen" value
// is '', and the field is optional, so a step with no start date must save. It
// is pruned before it reaches the record.
const isoDate = z
  .string()
  .refine((value) => value === '' || isISODate(value), { message: "Expected 'YYYY-MM-DD'." });

export const clientCommercialSchema = z.object({
  currency: z.enum(CURRENCY_CODES).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  engagementType: z.enum(ENGAGEMENT_TYPES).optional(),
  billingIntervalMonths: z.number().int().min(1).max(24).optional(),
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
  'nda',
  'sow',
  'purchase_order',
  'tds_certificate',
  'msme',
  'cancelled_cheque',
  'vendor_form',
  'tax_form',
  'firc',
  'signature',
  // Last, and it stays last: the picker pins it to the end of the list as the
  // answer for a document none of the others name.
  'other',
] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/** What each kind is called, wherever one is named. */
export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  gst_certificate: 'GST registration certificate',
  pan: 'PAN card',
  incorporation: 'Certificate of incorporation',
  signed_contract: 'Signed contract or MSA',
  nda: 'Non-disclosure agreement',
  sow: 'Statement of work',
  purchase_order: 'Purchase order',
  tds_certificate: 'TDS certificate (Form 16A)',
  msme: 'MSME / Udyam certificate',
  cancelled_cheque: 'Cancelled cheque or bank letter',
  vendor_form: 'Vendor onboarding form',
  tax_form: 'W-8 / W-9 or foreign tax registration',
  firc: 'FIRC / FIRA — proof of export realisation',
  signature: 'Signature',
  other: 'Other',
};

/**
 * One line saying what a document is, for whoever is holding the scan.
 *
 * The picker used to print the accepted formats under every card, which were
 * the same three on all but one of them, so the row said nothing. What the
 * reader actually needs is which of two similar-looking certificates this is.
 * The exception earns its mention: a signature is an image, not a PDF.
 */
export const ATTACHMENT_KIND_DESCRIPTIONS: Record<AttachmentKind, string> = {
  gst_certificate: 'Form REG-06, issued on registration',
  pan: 'The permanent account number card',
  incorporation: 'The certificate the registrar issued',
  signed_contract: 'The agreement both sides have signed',
  nda: 'Confidentiality terms, signed',
  sow: 'The scope and deliverables for a piece of work',
  purchase_order: 'The order the client raised against us',
  tds_certificate: 'Proof of tax the client deducted and paid',
  msme: 'Udyam registration, if the client holds one',
  cancelled_cheque: 'Bank details, for payments and refunds',
  vendor_form: "The client's own supplier form, filled in",
  tax_form: 'Foreign tax registration or a W-8 / W-9',
  firc: 'Bank proof that an export payment landed',
  signature: 'An image of the signature, PNG or JPEG',
  other: 'Anything the list does not name',
};

/**
 * The longer answer: what a document is, who issues it, why it is worth asking
 * a client for, and what is inside it.
 *
 * Separate from `ATTACHMENT_KIND_DESCRIPTIONS`, which is the one line printed
 * under a card. This is what sits behind the info icon, for the person deciding
 * whether to chase a client for something. The foreign ones earn it most: a
 * W-8BEN-E and an FIRC are unfamiliar until the first export invoice, and the
 * cost of not knowing is finding out from an accountant a year later.
 *
 * Kept here rather than in the step, because it is a fact about the document
 * and the request checklist asks for the same things.
 */
export const ATTACHMENT_KIND_NOTES: Record<AttachmentKind, string> = {
  gst_certificate:
    'Form REG-06, issued by the GST portal on registration. It carries the GSTIN, the legal and trade names, the registered address and the date of registration. Worth having: it is what confirms the GSTIN typed on the record is theirs, and Rule 46 requires that number on every invoice to them.',
  pan: 'The income-tax department’s permanent account number card, showing the number, the holder’s name and date of birth or incorporation. Needed whenever tax is deducted at source: TDS credit is matched by PAN, and a wrong one means the client cannot claim it.',
  incorporation:
    'The certificate the Registrar of Companies issued when the company was formed, carrying the CIN, the incorporated name and the date. Confirms the entity actually exists under the name a contract will be signed in.',
  signed_contract:
    'The agreement both sides have signed, as executed. The one document to keep above all others: it is what a dispute is decided on, and an unsigned draft has no standing.',
  nda: 'Confidentiality terms, signed. Usually the first thing signed and the easiest to lose track of, because it is often agreed before the engagement has a folder.',
  sow: 'The scope, deliverables and dates for one piece of work, usually under a master agreement. What "out of scope" is argued against.',
  purchase_order:
    'The order the client raised in their own system, carrying a PO number their accounts payable will match the invoice against. At larger clients an invoice with no PO number is not paid, whatever it says.',
  tds_certificate:
    'Form 16A, issued quarterly by a client who deducted tax at source. It states the amount deducted and deposited against Qera’s PAN, and it is the proof that lets that tax be claimed on the annual return. Chase it: without it the deduction is money simply gone.',
  msme: 'The Udyam registration certificate, if the client holds one. Relevant because the MSMED Act sets payment deadlines between registered enterprises, and because some clients ask for ours.',
  cancelled_cheque:
    'A cheque marked cancelled, or a bank letter. It shows the account number, IFSC and the name on the account, and it is what a client’s finance team wants before setting Qera up as a payee.',
  vendor_form:
    'The client’s own supplier onboarding form, filled in and returned. Purely their process, but nothing gets paid until it is done.',
  tax_form:
    'A foreign client’s tax paperwork: their own registration certificate, or the W-8 / W-9 that goes the other way. A US client asks Qera for a W-8BEN-E, certifying we are not a US person, so they withhold at the India-US treaty rate rather than a flat 30%. Ask before the first invoice, not after the first short payment.',
  firc: 'The Foreign Inward Remittance Certificate (or the FIRA a bank issues instead), confirming money arrived from abroad and in which currency. It is the evidence that an export of services was realised, which is what an LUT zero-rating and any GST refund rest on. Ask the bank once a foreign payment lands; it is far harder to obtain a year later.',
  signature:
    'An image of a signature, lifted off a page, used to sign a document rendered here. Sensitive in its own right: it is reusable by anyone holding the file.',
  other: 'Anything the list does not name. The kind and the filename are all that will say what it was.',
};

/**
 * The formats a kind accepts, where it is narrower than the rest.
 *
 * Sparse on purpose. Nearly every document arrives as a scan or a PDF, so a
 * full table would be a row per kind restating `ATTACHMENT_MIME_TYPES` and one
 * more place to forget when that list changes. A signature is the exception:
 * it is lifted off a page as an image, and a PDF of one is a page, not a
 * signature.
 */
export const ATTACHMENT_KIND_FORMATS: Partial<Record<AttachmentKind, readonly string[]>> = {
  signature: ['image/png', 'image/jpeg'],
};

/** What a kind accepts, as the `accept` attribute wants it. */
export function attachmentAcceptFor(kind: AttachmentKind): string {
  return (ATTACHMENT_KIND_FORMATS[kind] ?? ATTACHMENT_MIME_TYPES).join(',');
}

/**
 * Where a document kind applies. Absent on either axis means everywhere.
 *
 * Scoped the same way `ClientRequestChecklist` scopes what to ask a client
 * for: an Indian client has a GSTIN and a PAN, an overseas one has a W-8/W-9
 * and an FIRC to prove the export was realised, and a freelancer has no
 * certificate of incorporation because no registrar ever issued one. Neither
 * is offered the other's paperwork.
 *
 * Both axes are **derived** from the record — the country from the address and
 * the kind from the entity type — so there is nothing here to keep in step
 * (`PRINCIPLES.md` rule 3).
 */
interface AttachmentScope {
  place?: 'india' | 'foreign';
  who?: ClientKind;
}

const ATTACHMENT_SCOPES: Partial<Record<AttachmentKind, AttachmentScope>> = {
  gst_certificate: { place: 'india' },
  pan: { place: 'india' },
  incorporation: { place: 'india', who: 'company' },
  tds_certificate: { place: 'india' },
  msme: { place: 'india' },
  tax_form: { place: 'foreign' },
  firc: { place: 'foreign' },
  // Both of these are an accounts-payable apparatus. A person engaging a studio
  // does not raise a purchase order or run a supplier onboarding process, and
  // the commercial step hides the matching fields for the same reason.
  purchase_order: { who: 'company' },
  vendor_form: { who: 'company' },
};

/** Which client a document is being asked of. Both halves are derived. */
export interface AttachmentContext {
  /** ISO-2 from `addressParts.country`. Absent reads as India. */
  country?: string;
  /** From `clientKindOf(entityType)`. Absent reads as a company. */
  clientKind?: ClientKind;
}

/**
 * Whether a kind is worth offering for this client.
 *
 * Only ever filters what is *offered*. A document already on a record keeps its
 * label and keeps rendering, whatever the record later says — the alternative
 * is a file nobody can name because the client moved country.
 */
export function attachmentKindApplies(kind: AttachmentKind, ctx: AttachmentContext): boolean {
  const scope = ATTACHMENT_SCOPES[kind];
  if (!scope) return true;
  const place = !ctx.country || ctx.country === 'IN' ? 'india' : 'foreign';
  if (scope.place && scope.place !== place) return false;
  return !scope.who || scope.who === (ctx.clientKind ?? 'company');
}

/**
 * The documents a client has exactly one of, each with its own upload slot.
 *
 * A slot is a *label*, where the old picker was a *mode*: the operator set a
 * type, then uploaded, and forgetting to change it filed a PAN card as a GST
 * certificate with nothing to catch it. Naming the slot removes the step that
 * could be skipped.
 *
 * Signature is not here. It is not a registration document, it is not one of
 * the things a client is asked for at onboarding, and a client can have more
 * than one of them. It stays an "anything else" kind.
 */
export const ATTACHMENT_SLOTS: readonly AttachmentKind[] = [
  'gst_certificate',
  'pan',
  'incorporation',
  'tax_form',
  'firc',
];

/** The slots for a client, from where they are and what they are. */
export function attachmentSlotsFor(ctx: AttachmentContext): readonly AttachmentKind[] {
  return ATTACHMENT_SLOTS.filter((kind) => attachmentKindApplies(kind, ctx));
}

/** Whether a kind is a one-per-client slot, as opposed to a repeatable extra. */
export function isSlotKind(kind: AttachmentKind): boolean {
  return ATTACHMENT_SLOTS.includes(kind);
}

/**
 * The kinds offered in the "anything else" picker: everything that is not a
 * slot *for this client*, scoped the same way the slots are.
 *
 * Note that a slot removed by its scope does **not** reappear here — the same
 * rule removed it, and it is the same answer either way. `other` is always on
 * offer, which is where a document nothing else names goes.
 */
export function attachmentExtraKindsFor(ctx: AttachmentContext): readonly AttachmentKind[] {
  const slots = attachmentSlotsFor(ctx);
  return ATTACHMENT_KINDS.filter(
    (kind) => !slots.includes(kind) && attachmentKindApplies(kind, ctx),
  );
}

/**
 * What may be uploaded. Enforced **server-side** — the same list in the file
 * picker is a convenience, and a file picker is not a security control.
 */
export const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

/** The extension each accepted type is stored under. */
export const ATTACHMENT_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

/** 25 MB. A signed MSA scanned at full resolution is tens of pages. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

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
  /**
   * A password-protected PDF. Recorded because nothing can render one: the
   * preview shows a lock instead of the browser viewer's own "Password
   * required" panel, which reads as a broken card rather than a locked file.
   */
  encrypted?: boolean;
}

export const clientAttachmentSchema = z.object({
  id: textSchema(100, { required: 'An id is required.' }),
  kind: z.enum(ATTACHMENT_KINDS),
  filename: textSchema(300, { required: 'A filename is required.' }),
  mime: z.enum(ATTACHMENT_MIME_TYPES),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_BYTES),
  key: textSchema(500, { required: 'A key is required.' }),
  uploadedAt: z.number().int(),
  encrypted: z.boolean().optional(),
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
