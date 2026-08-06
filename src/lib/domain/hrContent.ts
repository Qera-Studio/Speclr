/**
 * Fixed HR letter boilerplate + default editable-body text, transcribed from
 * the real Qera offer / experience / relieving documents with the design-review
 * corrections applied:
 *   - Intern-correct wording is the DEFAULT (no employee "salary"/"relieved from
 *     services" language on an intern — that contradicts the stipend terms).
 *   - The exit document auto-switches: intern → "Internship Completion Letter";
 *     employee → "Relieving Letter".
 *   - Legal-assertion lines that shouldn't be blanket claims are produced as
 *     EDITABLE defaults here (the editor lets the user adjust per person).
 *   - Pronouns are filled from the employee's pronoun set ({subject}/{object}/
 *     {possessive}) rather than hard-typed.
 *
 * Client-safe: no server imports. `defaultLetterContent` seeds the editable
 * body of a fresh letter draft; once saved, the stored text is authoritative
 * (editing here does not retroactively change saved letters).
 */

import type { EngagementType } from './types';

export interface LetterContentArgs {
  role: string;
  /** Rendered pay phrase, e.g. "₹ 1,000.00 per month" (built by the caller). */
  payText: string;
  /** Ordinal start/joining date, e.g. "10th June 2026". */
  startDate: string;
  /** Ordinal end date, e.g. "10th July 2026" (exit/experience letters). */
  endDate?: string;
  pronoun: { subject: string; object: string; possessive: string };
}

export interface LetterContent {
  masthead: string;
  /** e.g. "TO WHOMSOEVER IT MAY CONCERN"; omitted on the offer letter. */
  subheading?: string;
  bodyParagraphs: string[];
  bulletSections: { heading: string; items: string[] }[];
}

/** Footer identity for HR documents (CIN + admin query email — not on invoices). */
export const HR_FOOTER = {
  cin: 'U62099UW2026PTC254312',
  queryEmail: 'admin@qera.studio',
  registeredOffice: 'C-204, MGI Gharaunda, Raj Nagar Extension, Ghaziabad - 201017',
};

// ── Offer letter ──────────────────────────────────────────────────────────────

function offerContent(engagement: EngagementType, a: LetterContentArgs): LetterContent {
  if (engagement === 'intern') {
    return {
      masthead: 'COMPANY OFFER LETTER',
      bodyParagraphs: [
        `Subject: Offer of Internship — ${a.role}`,
        `We are pleased to offer you the position of ${a.role} at Qera Studio. We are excited to have you join us and contribute to our branding, media, and digital growth initiatives.`,
        `Your internship will begin on ${a.startDate} and will initially continue for a period of three months. You will be expected to maintain professional communication, complete assigned tasks on time, and remain reasonably responsive during active work periods.`,
        `During the first month of the internship, you will receive a stipend of ${a.payText}. Future increases in stipend, incentives, extensions, or long-term opportunities may be offered based on your overall performance, consistency, communication, reliability, and contribution to the company's growth and assigned KPIs. This internship does not guarantee permanent employment.`,
        `During the course of your internship, you may have access to confidential company or client information including internal workflows, content systems, strategies, documents, and digital assets. You agree not to disclose, copy, distribute, or misuse any confidential information during or after your internship period.`,
        `Any work, content, designs, videos, graphics, captions, or creative material produced by you during the internship for Qera Studio shall remain the intellectual property of Qera Studio and may not be reused commercially without written permission.`,
        `Either party may terminate this internship by providing seven days' prior notice. However, Qera Studio reserves the right to terminate the internship immediately in cases involving misconduct, confidentiality breaches, negligence, or unprofessional behavior.`,
        `Upon successful completion of the internship and satisfactory performance, an internship certificate may be issued.`,
        `We look forward to working with you and building meaningful work together.`,
      ],
      bulletSections: [],
    };
  }
  // Employee variant — salaried framing.
  return {
    masthead: 'COMPANY OFFER LETTER',
    bodyParagraphs: [
      `Subject: Offer of Employment — ${a.role}`,
      `We are pleased to offer you the position of ${a.role} at Qera Studio. We are excited to have you join the team and contribute to our growth.`,
      `Your employment will begin on ${a.startDate}. You will be expected to maintain professional standards, deliver assigned responsibilities, and adhere to the company's policies.`,
      `You will receive a remuneration of ${a.payText}. Revisions, incentives, and benefits may be offered based on your performance, consistency, and contribution to the company's growth and assigned objectives.`,
      `During your employment, you may have access to confidential company or client information. You agree not to disclose, copy, distribute, or misuse any confidential information during or after your employment.`,
      `Any work produced by you during your employment for Qera Studio shall remain the intellectual property of Qera Studio and may not be reused commercially without written permission.`,
      `Either party may terminate this employment by providing the notice period stipulated in the company's policies. Qera Studio reserves the right to terminate immediately in cases involving misconduct, confidentiality breaches, negligence, or unprofessional behavior.`,
      `We look forward to working with you and building meaningful work together.`,
    ],
    bulletSections: [],
  };
}

// ── Experience letter ───────────────────────────────────────────────────────

function experienceContent(engagement: EngagementType, a: LetterContentArgs): LetterContent {
  const period = a.endDate ? `from ${a.startDate} to ${a.endDate}` : `from ${a.startDate}`;
  const engagedVerb = engagement === 'intern' ? 'interned with' : 'was employed with';
  return {
    masthead: 'EXPERIENCE LETTER',
    subheading: 'TO WHOMSOEVER IT MAY CONCERN',
    bodyParagraphs: [
      `This is to certify that {name} ${engagedVerb} Qera Private Limited as ${a.role} ${period}.`,
    ],
    bulletSections: [
      {
        heading: `During this period, ${a.pronoun.subject} was responsible for:`,
        items: [
          'Data organisation and spreadsheet management using Excel',
          'Self-directed learning in spreadsheet tools and data analysis',
          'Research support for lead generation and market analysis',
        ],
      },
      {
        heading: 'Performance & Conduct:',
        items: [
          `{name} demonstrated strong attention to detail and commitment to deadlines.`,
          `{name} collaborated effectively with the team and showed willingness to learn.`,
          `{name} maintained professional standards throughout the tenure.`,
        ],
      },
    ],
  };
}

// ── Exit letter (auto-switching) ──────────────────────────────────────────────

export function exitMasthead(engagement: EngagementType): string {
  return engagement === 'intern' ? 'INTERNSHIP COMPLETION LETTER' : 'RELIEVING LETTER';
}

function exitContent(engagement: EngagementType, a: LetterContentArgs): LetterContent {
  const effectiveDate = a.endDate ?? a.startDate;
  if (engagement === 'intern') {
    // Intern-correct: NO "salary", NO "relieved from the services", NO
    // "resignation" — this must not contradict the stipend slip's terms.
    return {
      masthead: exitMasthead('intern'),
      subheading: 'TO WHOMSOEVER IT MAY CONCERN',
      bodyParagraphs: [
        `This is to certify that {name} has successfully completed ${a.pronoun.possessive} internship as ${a.role} with Qera Private Limited, concluding with effect from ${effectiveDate}.`,
      ],
      bulletSections: [
        {
          heading: 'We confirm that:',
          items: [
            'The internship stipend for the engagement period has been disbursed in full.',
            `No amount is outstanding against ${a.pronoun.object}.`,
            'All company property and access have been returned or revoked.',
            'There are no pending claims or disputes arising from the internship.',
          ],
        },
      ],
    };
  }
  // Employee variant — proper relieving language.
  return {
    masthead: exitMasthead('employee'),
    subheading: 'TO WHOMSOEVER IT MAY CONCERN',
    bodyParagraphs: [
      `With reference to ${a.pronoun.possessive} resignation, please note that the same has been accepted and {name} is relieved from the services of the company with effect from ${effectiveDate}.`,
      // Employee variant only. "Therein" points at the resignation letter named
      // above; an intern never resigns, so the intern branch has no referent for
      // it and must not carry this line (CONTEXT §6).
      `We confirm acceptance on the terms and conditions stipulated therein.`,
    ],
    bulletSections: [
      {
        heading: 'We certify that:',
        items: [
          'All dues including salary, allowances, and benefits have been settled in full.',
          `No amount is outstanding against ${a.pronoun.object}.`,
          'All company property/assets have been returned.',
          'There are no pending legal claims or disputes.',
        ],
      },
    ],
  };
}

/**
 * Builds the default editable body for a fresh letter draft, by type and the
 * employee's engagement type. `{name}` placeholders are substituted with the
 * employee's name at render time by the sheet. The returned `bodyParagraphs`
 * and `bulletSections` seed editable fields — the user can then reword freely.
 */
export function defaultLetterContent(
  type: 'OFR' | 'EXP' | 'EXIT',
  engagement: EngagementType,
  args: LetterContentArgs,
): LetterContent {
  switch (type) {
    case 'OFR':
      return offerContent(engagement, args);
    case 'EXP':
      return experienceContent(engagement, args);
    case 'EXIT':
      return exitContent(engagement, args);
  }
}

// ── Slips ─────────────────────────────────────────────────────────────────────

/**
 * The five fixed terms printed on a **pay slip** — a statutory wage record,
 * which the stipend slip is not.
 *
 * Kept apart from `stipendTerms` rather than folded in as a third engagement
 * branch, because the difference is not the reader's status but the document's:
 * a stipend slip records a discretionary payment and spends its first clause
 * denying an employment relationship, while a pay slip is issued *under* one and
 * must point at the instrument that creates it. The word "internship" must
 * never appear here.
 *
 * The deductions clause states that only lawful deductions have been made —
 * Payment of Wages Act s.7 permits none others — and folds in `deductionsNote`
 * for the specifics (TDS u/s 192 and the like), which vary per employee.
 */
export function payslipTerms(deductionsNote: string): {
  left: { title: string; body: string }[];
  right: { title: string; body: string }[];
} {
  const note = deductionsNote.trim();

  return {
    left: [
      {
        title: 'Nature of engagement.',
        body: 'This slip records wages paid for the wage period stated, under the terms of your appointment with Qera Studio.',
      },
      {
        title: 'Confidentiality & IP.',
        body: 'All work produced during your employment is the property of Qera Studio. Confidentiality obligations survive the employment.',
      },
    ],
    right: [
      {
        title: 'Deductions.',
        body: note
          ? `Only deductions authorised by law have been made from the wages shown. ${note}`
          : 'Only deductions authorised by law have been made from the wages shown.',
      },
      {
        title: 'Record.',
        body: 'This slip is a record of wages disbursed, forms part of the wage register, and is computer-generated.',
      },
      {
        title: 'Jurisdiction.',
        body: 'Subject to the exclusive jurisdiction of the courts of Ghaziabad, Uttar Pradesh.',
      },
    ],
  };
}

// ── Stipend slip ──────────────────────────────────────────────────────────────

/**
 * The five fixed terms printed on a stipend slip, split into the two columns
 * the issued design uses.
 *
 * There is one set, not a per-engagement pair: a stipend slip is only ever
 * issued to an intern (the recipient picker offers no one else, and finalize
 * refuses the rest), and a pay slip has its own terms in `payslipTerms`. The
 * wording denies an employer–employee relationship, which is correct for an
 * intern and flatly wrong for anyone else — which is exactly why the two
 * documents are separate rather than one that branches.
 *
 * `deductionsNote` is appended to the stipend term because whether statutory
 * deductions apply depends on the individual engagement. It stays editable
 * rather than becoming fixed boilerplate here.
 */
export function stipendTerms(deductionsNote: string): {
  left: { title: string; body: string }[];
  right: { title: string; body: string }[];
} {
  const note = deductionsNote.trim();
  const withNote = (body: string) => (note ? `${body} ${note}` : body);

  return {
    left: [
      {
        title: 'Nature of engagement.',
        body: 'This is a stipend paid for an internship. It does not constitute salary, wages, or an offer or contract of employment, and creates no employer\u2013employee relationship.',
      },
      {
        title: 'Confidentiality & IP.',
        body: 'All work produced during the internship is the property of Qera Studio. Confidentiality obligations survive the engagement.',
      },
    ],
    right: [
      {
        title: 'Stipend.',
        body: withNote(
          'A fixed monthly stipend paid at Qera Studio\u2019s discretion for the period stated.',
        ),
      },
      {
        title: 'Record.',
        body: 'This slip is a record of stipend disbursed and is computer-generated.',
      },
      {
        title: 'Jurisdiction.',
        body: 'Subject to the exclusive jurisdiction of the courts of Ghaziabad, Uttar Pradesh.',
      },
    ],
  };
}

/**
 * What a slip's first line item is called — the payment itself, which is what
 * the slip is almost always for. Reimbursed expenses (and further earnings, on
 * a pay slip) are added alongside it as more items.
 *
 * Keyed on the slip type, not the recipient's engagement type: the two are the
 * same fact now that each slip only offers its own kind of recipient, and the
 * document is the one that decides what its first line is called.
 *
 * A description and nothing else. This used to seed a detail line restating the
 * period and the deductions note; neither slip prints one any more, because the
 * DETAILS block and TERMS already carry both facts where a reader looks for
 * them.
 */
export function slipLineItemSeed(type: 'STP' | 'PAY'): string {
  // A pay slip's first earning is Basic, which is what the rest of a wage
  // slip's arithmetic (and HRA, if it is ever added) is reckoned against.
  // Seeding it "Monthly Stipend" was left over from the stipend slip and is
  // simply the wrong word on a wage record.
  return type === 'PAY' ? 'Basic salary' : 'Internship Stipend';
}
