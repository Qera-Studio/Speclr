import { z } from 'zod';
import { flattenAddress } from './address';
import { exitMasthead, payslipTerms, stipendTerms } from './hrContent';
import { AGREEMENT_PREAMBLE, CONTRACT_INTRO, MSA_SECTIONS, type MsaSection } from './msaBoilerplate';
import { studioOf, type StudioInfo } from './studio';
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
  title: z.string().trim().max(200),
  body: z.string().trim().max(4000),
});

const clauseSchema = z.object({
  number: z.number().int().min(0).max(999),
  heading: z.string().trim().max(200),
  body: z.array(z.string().trim().max(8000)).max(20),
});

/**
 * Stored overrides. Absent key = use the default, so this stays small on a
 * draft and complete on a finalized document.
 */
export const docContentSchema = z.object({
  masthead: z.string().trim().max(120).optional(),
  /**
   * @deprecated The green "PAID" banner these fed was removed from the receipt
   * and both slips. Kept in the schema, and only here, so documents written
   * while it existed still parse rather than failing validation on a key
   * nothing reads any more.
   */
  badgeText: z.string().trim().max(60).optional(),
  /** @deprecated See `badgeText`. */
  badgeNote: z.string().trim().max(1000).optional(),
  terms: z.array(termSchema).max(20).optional(),
  qrCaption: z.string().trim().max(60).optional(),
  thanksLine: z.string().trim().max(200).optional(),

  // HR letters
  subject: z.string().trim().max(300).optional(),
  subheading: z.string().trim().max(200).optional(),
  closingLine: z.string().trim().max(500).optional(),
  acknowledgement: z.string().trim().max(2000).optional(),
  signatoryName: z.string().trim().max(120).optional(),
  signatoryTitle: z.string().trim().max(200).optional(),
  signatoryQualifier: z.string().trim().max(200).optional(),
  registeredOffice: z.string().trim().max(400).optional(),
  website: z.string().trim().max(200).optional(),

  // Contract
  intro: z.string().trim().max(4000).optional(),
  preamble: z.string().trim().max(2000).optional(),
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
  studioSnapshot?: StudioInfo;
  deductionsNote?: string;
  employeeSnapshot?: { engagementType: EngagementType };
}

export interface ResolvedContent {
  masthead: string;
  terms: TermItem[];
  qrCaption: string;
  thanksLine: string;
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
  clauses: MsaSection[];
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
    clauses: c.clauses ?? MSA_SECTIONS,
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
