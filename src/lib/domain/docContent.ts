import { z } from 'zod';
import { multilineSchema, personNameSchema, textSchema } from './text';
import { flattenAddress } from './address';
import { exitMasthead, payslipTerms, stipendTerms } from './hrContent';
import { AGREEMENT_PREAMBLE, CONTRACT_INTRO, MSA_CLAUSES, type MsaClause } from './contract/msa';
import { studioOf, type StudioInfo } from './studio';
import {
  EXPORT_ENDORSEMENT,
  PLACE_OF_SUPPLY_EXPORT,
} from './placeOfSupply';
import type { DocTypeCode, EngagementType } from './types';

/**
 * The editable *content* of a document — every line whose words carry meaning,
 * as opposed to the structural labels ('DESCRIPTION', 'Subtotal', 'GSTIN:')
 * that are the document's grammar and stay fixed.
 *
 * Two rules make this safe on a financial/legal record:
 *
 * 1. **Every field is optional and falls back to the type's default.** A
 *    document that has never been edited prints exactly what it printed before
 *    this module existed. Nothing is blank by omission.
 * 2. **Finalize materialises the resolved content onto the document**, the same
 *    way `studioSnapshot` freezes the studio identity (see `CONTEXT.md` §5).
 *    Without that, revising `fixedTerms` or the MSA next year would silently
 *    rewrite invoices and contracts already issued — a document must reprint
 *    for ever as it was issued.
 *
 * Kept free of any import from `registry.ts`: the registry imports this module
 * for its schema, so the spec is passed in structurally instead.
 */

export interface TermItem {
  title: string;
  body: string;
}

const termSchema = z.object({
  title: textSchema(200),
  body: multilineSchema(4000),
});

const clauseSchema = z.object({
  number: z.number().int().min(0).max(999),
  heading: textSchema(200),
  body: z.array(multilineSchema(8000)).max(20),
});

/**
 * Stored overrides. Absent key = use the default, so this stays small on a
 * draft and complete on a finalized document.
 */
export const docContentSchema = z.object({
  masthead: textSchema(120).optional(),
  /**
   * @deprecated The green "PAID" banner these fed was removed from the receipt
   * and both slips. Kept in the schema, and only here, so documents written
   * while it existed still parse rather than failing validation on a key
   * nothing reads any more.
   */
  badgeText: textSchema(60).optional(),
  /** @deprecated See `badgeText`. */
  badgeNote: multilineSchema(1000).optional(),
  terms: z.array(termSchema).max(20).optional(),
  qrCaption: textSchema(60).optional(),
  thanksLine: textSchema(200).optional(),

  // Tax invoice, the statements Rule 46 wants in words rather than figures
  reverseChargeLine: textSchema(300).optional(),
  currencyLine: textSchema(200).optional(),
  exportEndorsement: textSchema(200).optional(),
  copyMarking: textSchema(60).optional(),

  // HR letters
  subject: textSchema(300).optional(),
  subheading: textSchema(200).optional(),
  closingLine: textSchema(500).optional(),
  acknowledgement: multilineSchema(2000).optional(),
  signatoryName: personNameSchema(120).optional(),
  signatoryTitle: textSchema(200).optional(),
  signatoryQualifier: textSchema(200).optional(),
  registeredOffice: multilineSchema(400).optional(),
  website: textSchema(200).optional(),

  // Contract
  intro: multilineSchema(4000).optional(),
  preamble: multilineSchema(2000).optional(),
  clauses: z.array(clauseSchema).max(60).optional(),
});

export type DocContent = z.infer<typeof docContentSchema>;

/** The parts of a `DocTypeSpec` this resolver needs, passed in structurally. */
export interface ContentSpec {
  masthead: string;
  fixedTerms: TermItem[];
}

/** The parts of a document this resolver reads. */
export interface ContentSource {
  type: DocTypeCode;
  content?: DocContent;
  /**
   * Read only to *default* the three Rule 46 statements below, never to compute
   * money. `contentOf` stays pure and stays free of the client record: what a
   * document says about itself is decided by what the document already carries.
   */
  gstRatePercent?: number;
  placeOfSupplyStateCode?: string;
  studioSnapshot?: StudioInfo;
  deductionsNote?: string;
  employeeSnapshot?: { engagementType: EngagementType };
}

export interface ResolvedContent {
  masthead: string;
  terms: TermItem[];
  qrCaption: string;
  thanksLine: string;
  reverseChargeLine: string;
  currencyLine: string;
  exportEndorsement: string;
  copyMarking: string;
  subject: string;
  subheading: string;
  closingLine: string;
  acknowledgement: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryQualifier: string;
  registeredOffice: string;
  website: string;
  intro: string;
  preamble: string;
  clauses: MsaClause[];
}

/** The one signatory Qera has. Move to `StudioInfo` when there is a second. */
const SIGNATORY = {
  name: 'Shivanshu Pareek',
  title: 'Co-founder — Qera Studio',
  qualifier: '(Authorised Signatory)',
};

const ACKNOWLEDGEMENT =
  'I, {name}, confirm that I have read and agreed to the terms mentioned in this letter.';

/**
 * The valediction printed after a letter's listed sections, above the rule.
 * The experience letter closes on a good wish; the offer and exit letters have
 * no equivalent, so they default to nothing and print nothing.
 */
const CLOSING_LINE: Partial<Record<DocTypeCode, string>> = {
  EXP: 'We wish you continued success for your future endeavours.',
};

/**
 * The masthead a letter prints, which is not `spec.masthead`: the exit letter
 * switches between 'Internship Completion Letter' and 'Relieving Letter' on the
 * engagement type, and that distinction is legally load-bearing
 * (`CONTEXT.md` §6).
 */
function defaultMasthead(doc: ContentSource, spec: ContentSpec): string {
  switch (doc.type) {
    case 'OFR':
      return 'COMPANY OFFER LETTER';
    case 'EXP':
      return 'EXPERIENCE LETTER';
    case 'EXIT':
      return exitMasthead(doc.employeeSnapshot?.engagementType ?? 'intern');
    default:
      return spec.masthead;
  }
}

/**
 * A slip's terms as one flat list. Both term builders return two columns
 * because that is how a slip prints them; the sheet re-splits the list at the
 * same point, so an unedited slip is unchanged and an edited one still balances.
 *
 * The pay slip gets its own set rather than a third engagement branch — see the
 * note on `payslipTerms`.
 */
function defaultTerms(doc: ContentSource, spec: ContentSpec): TermItem[] {
  const note = doc.deductionsNote ?? '';
  if (doc.type === 'PAY') {
    const { left, right } = payslipTerms(note);
    return [...left, ...right];
  }
  if (doc.type !== 'STP') return spec.fixedTerms;
  const { left, right } = stipendTerms(note);
  return [...left, ...right];
}

/** Only a tax invoice and its receipt carry the Rule 46 statements. */
function isTaxDocument(doc: ContentSource): boolean {
  return doc.type === 'INV' || doc.type === 'REC';
}

/**
 * CGST Rule 46(p): a tax invoice must state *whether tax is payable on reverse
 * charge*. Nothing printed it, on any invoice, domestic or foreign.
 *
 * The answer is No on everything Qera issues today: reverse charge under s.9(3)
 * applies to notified supplies, and design services are not among them, while
 * s.9(4) is a registered recipient's liability on an *unregistered* supplier's
 * supply and Qera is registered. An export adds a sentence rather than changing
 * the answer, because the recipient's own regime is a separate question from
 * India's and their accountant is the one who has to see it stated.
 *
 * Editable, like every other line here: it is a claim about a specific supply,
 * and the day one of them is notified this is where it gets corrected.
 */
function defaultReverseChargeLine(doc: ContentSource): string {
  if (!isTaxDocument(doc)) return '';
  if (doc.placeOfSupplyStateCode === PLACE_OF_SUPPLY_EXPORT) {
    return 'Tax payable on reverse charge: No. Zero-rated export of services; the recipient may be liable to account for tax in their own jurisdiction.';
  }
  return 'Tax payable on reverse charge: No.';
}

/**
 * What currency the figures are in, said once in words.
 *
 * Every amount on the sheet is already an INR-formatted string, which is
 * unambiguous to an Indian reader and not to anyone else: '₹' and a lakh-grouped
 * number are exactly what a foreign accounts department has to guess at. This
 * says it. It is not a conversion and there is no second currency in the
 * arithmetic — see `currency.ts` for why a GST document stays in rupees.
 */
function defaultCurrencyLine(doc: ContentSource): string {
  return isTaxDocument(doc) ? 'All amounts are in Indian Rupees (INR).' : '';
}

/**
 * CGST Rule 46, third proviso: an invoice for a zero-rated supply carries a
 * prescribed endorsement, in those words.
 *
 * Only the **export** case can be defaulted here, and that is not an oversight.
 * `contentOf` is pure and sees the document, never the client record, so the
 * one zero-rated case the document states about itself is the one it can
 * default: place of supply 96 is an export. An SEZ supply is zero-rated because
 * the *client* is an SEZ unit, which is a fact the record holds, so
 * `DocumentEditor` seeds that wording when the client is picked, exactly as it
 * already seeds `gstLabel` from `zeroRatingLabel`.
 */
function defaultExportEndorsement(doc: ContentSource): string {
  if (!isTaxDocument(doc)) return '';
  return doc.placeOfSupplyStateCode === PLACE_OF_SUPPLY_EXPORT
    ? EXPORT_ENDORSEMENT
    : '';
}

/**
 * CGST Rule 48(1): an invoice for a *supply of services* is prepared in
 * duplicate, the original for the recipient and the duplicate for the supplier,
 * and each copy is marked as such. (Goods want triplicate; Qera supplies
 * neither goods nor a transporter's copy.)
 *
 * speclr issues one PDF, which is the recipient's, so the marking it prints is
 * "ORIGINAL FOR RECIPIENT". The duplicate is the record retained under CGST
 * s.36, and the same document reprinted from this app is that record.
 *
 * The receipt gets none: Rule 48 governs the tax invoice, and a receipt voucher
 * is Rule 50's, which prescribes no copy marking.
 */
function defaultCopyMarking(doc: ContentSource): string {
  return doc.type === 'INV' ? 'ORIGINAL FOR RECIPIENT' : '';
}

/*
 * Rule 46(q)'s statement is not here. It is a TERMS clause on the invoice and
 * the receipt (`DOC_TYPES.<code>.fixedTerms`), which makes it editable and
 * snapshotted by the same route as every other printed clause, and puts it
 * where a reader looks for the document's standing statements rather than
 * alone on a line above the footer.
 */

/** Where the sheet breaks a term list into its two printed columns. */
export function splitTerms(terms: TermItem[]): { left: TermItem[]; right: TermItem[] } {
  const at = Math.floor(terms.length / 2);
  return { left: terms.slice(0, at), right: terms.slice(at) };
}

/**
 * Resolved content: the document's overrides over the type's defaults.
 *
 * Pure and cheap — sheets call it per render, and it must stay free of side
 * effects so the same document always resolves to the same words.
 */
export function contentOf(doc: ContentSource, spec: ContentSpec): ResolvedContent {
  const c = doc.content ?? {};
  const studio = studioOf(doc);

  return {
    masthead: c.masthead ?? defaultMasthead(doc, spec),
    terms: c.terms ?? defaultTerms(doc, spec),
    qrCaption: c.qrCaption ?? 'Scan to pay',
    thanksLine: c.thanksLine ?? studio.thanksLine,
    reverseChargeLine: c.reverseChargeLine ?? defaultReverseChargeLine(doc),
    currencyLine: c.currencyLine ?? defaultCurrencyLine(doc),
    exportEndorsement: c.exportEndorsement ?? defaultExportEndorsement(doc),
    copyMarking: c.copyMarking ?? defaultCopyMarking(doc),

    subject: c.subject ?? '',
    subheading: c.subheading ?? (doc.type === 'OFR' ? '' : 'TO WHOMSOEVER IT MAY CONCERN'),
    closingLine: c.closingLine ?? CLOSING_LINE[doc.type] ?? '',
    acknowledgement: c.acknowledgement ?? ACKNOWLEDGEMENT,
    signatoryName: c.signatoryName ?? SIGNATORY.name,
    signatoryTitle: c.signatoryTitle ?? SIGNATORY.title,
    signatoryQualifier: c.signatoryQualifier ?? SIGNATORY.qualifier,
    registeredOffice:
      c.registeredOffice ??
      `${studio.legalName.toUpperCase()}. Registered office: ${flattenAddress(studio.address)}`,
    website: c.website ?? 'www.qera.studio',

    intro: c.intro ?? CONTRACT_INTRO,
    preamble: c.preamble ?? AGREEMENT_PREAMBLE,
    clauses: c.clauses ?? MSA_CLAUSES,
  };
}

/**
 * The full resolved content as a stored override — what finalize writes onto
 * the document so it reprints unchanged for ever, whatever the defaults become.
 */
export function materialiseContent(doc: ContentSource, spec: ContentSpec): DocContent {
  const r = contentOf(doc, spec);
  return {
    masthead: r.masthead,
    terms: r.terms,
    qrCaption: r.qrCaption,
    thanksLine: r.thanksLine,
    reverseChargeLine: r.reverseChargeLine,
    currencyLine: r.currencyLine,
    exportEndorsement: r.exportEndorsement,
    copyMarking: r.copyMarking,
    subject: r.subject,
    subheading: r.subheading,
    closingLine: r.closingLine,
    acknowledgement: r.acknowledgement,
    signatoryName: r.signatoryName,
    signatoryTitle: r.signatoryTitle,
    signatoryQualifier: r.signatoryQualifier,
    registeredOffice: r.registeredOffice,
    website: r.website,
    intro: r.intro,
    preamble: r.preamble,
    clauses: r.clauses,
  };
}
