/**
 * The Master Service Agreement — 28 numbered clauses, identical for every
 * client. Transcribed from `docs/contract-content.md` §2.
 *
 * Content §2's clause 29 (Execution) is deliberately absent: it is a signature
 * block, not prose, and the sheet renders it from the contract record. Content
 * §29's own rendering note is the reason — the May 2026 document inverted the
 * two blocks because names were typed in by hand, so party names must never be
 * enterable there.
 *
 * `[bracketed]` values are blanks, left verbatim. They are filled per contract
 * (see `blanks.ts`); nothing here is pre-substituted. Content §2's drafting
 * notes list eight of them as requiring confirmation before first use — the
 * defaults written between the brackets are the drafter's proposal, not a
 * settled position.
 *
 * **This is now the seed and the fallback, not the live source.** The clauses
 * live in the `clauses` table and are edited at `/client/clauses`; this array
 * seeds that table and still resolves for documents written before the library
 * existed (`contentOf`). It was code-resident because, per content §2, the text
 * needs review as one package with the four Schedules by an Indian commercial
 * lawyer — that is still true of the *text*, and it is why the library page
 * says out loud that new and edited clauses are unreviewed. What moved is where
 * the editing happens, not the standard the words are held to.
 *
 * A contract seeds its own copy of the list when its draft is created and
 * freezes it at finalize (`materialiseContent`), so revising a clause here or
 * in the library can never rewrite an agreement already signed.
 *
 * **Numbers are identity.** Clause bodies cite each other by number ('has the
 * meaning given at clause 11.2'), so nothing may be inserted in the middle:
 * renumbering would break live cross-references in text nobody re-read. New
 * clauses append at the end.
 *
 * Client-safe: no server imports.
 */

import { z } from 'zod';
import { multilineSchema, textSchema } from '../text';

export interface MsaClause {
  number: number;
  heading: string;
  /**
   * One string per paragraph, each carrying its own sub-number ('8.4 Where any
   * sum…'). A paragraph beginning '(a) ' is a lettered sub-item and the sheet
   * indents it.
   */
  body: string[];
}

/**
 * Validates a clause on the way into the database and onto a document.
 *
 * The limits are generous because clause 1's definitions run long — they are
 * there to stop a malformed payload, not to police drafting. An empty `body` is
 * refused: a numbered clause with no text prints as a bare heading in a signed
 * agreement, which reads as something having gone missing.
 */
export const msaClauseSchema = z.object({
  number: z.number().int().min(1).max(999),
  heading: textSchema(200, { required: 'A heading is required.' }),
  body: z
    .array(multilineSchema(8000, { required: 'This paragraph is empty.' }))
    .min(1)
    .max(60),
});

/** A clause as the library edits it, plus the archive flag the table carries. */
export const clauseInputSchema = msaClauseSchema.extend({
  archived: z.boolean(),
});

export type ClauseInput = z.infer<typeof clauseInputSchema>;

/** Cover-page intro paragraph. */
export const CONTRACT_INTRO =
  'This Agreement sets out the terms upon which Qera Private Limited performs work for the Client. It applies to every engagement between the Parties. The Schedules describe how each kind of work is paid for, approved, owned and ended; the Parts appended to them describe the work itself.';

/** Sentence introducing the two-party block on the parties page. */
export const AGREEMENT_PREAMBLE =
  'This Service Agreement (“Agreement”) is entered into between:';

/** The statement printed above the signature blocks (content §2, clause 29). */
export const EXECUTION_STATEMENT =
  'IN WITNESS WHEREOF the Parties have executed this Agreement on the date first written above.';

export const MSA_CLAUSES: MsaClause[] = [
  {
    number: 1,
    heading: 'Definitions and Interpretation',
    body: [
      '1.1 In this Agreement, unless the context otherwise requires:',
      '"Additional Work" means any work not expressly specified within an approved Part or Proposal.',
      '"Agreement" means this Master Service Agreement together with all Schedules, Parts, Proposals and written amendments executed by the Parties.',
      '"Client Inputs" means the information, materials, assets, credentials, approvals and access which the Client is required to supply under an applicable Part.',
      '"Deliverables" means the final approved outputs specified in an applicable Part.',
      '"Part" means a service specification appended to a Schedule, describing the scope of a particular service.',
      '"Proposal" means the commercial quotation setting out fees, timelines and engagement-specific particulars provided to the Client.',
      '"Retained Materials" has the meaning given at clause 11.2.',
      '"Revision" has the meaning given at clause 7.1.',
      '"Schedule" means any of the Build, Retainer, Setup or Audit Schedules forming part of this Agreement.',
      '"Services" means the services performed by Qera under this Agreement.',
      '"Third-Party Services" means any platform, application programming interface, hosting provider, model provider, software tool, plugin, advertising platform, infrastructure service or technology not owned or controlled by Qera.',
      '1.2 Headings are for convenience only and shall not affect construction. References to a clause are references to a clause of this Agreement. Words importing the singular include the plural and vice versa. "Including" means including without limitation. A reference to writing includes email.',
      '1.3 Any period expressed in days shall mean calendar days unless expressed as working days, in which case Saturdays, Sundays and public holidays at the place of performance shall be excluded.',
    ],
  },
  {
    number: 2,
    heading: 'Structure and Order of Precedence',
    body: [
      '2.1 This Agreement establishes the legal and operational framework governing all Services provided by Qera to the Client. It applies to every engagement between the Parties and continues in force notwithstanding the completion of any individual engagement.',
      '2.2 Each engagement shall be governed by this Agreement together with the applicable Schedule, the Parts appended to it, and any approved Proposal.',
      '2.3 In the event of inconsistency, the order of precedence shall be: (a) the approved Proposal; (b) the applicable Part; (c) the applicable Schedule; and (d) this Agreement.',
      '2.4 No engagement shall commence, and no obligation to perform shall arise, until the Parties have executed the applicable Schedule and Qera has received the payment and Client Inputs required thereunder.',
    ],
  },
  {
    number: 3,
    heading: 'Mutual Obligations',
    body: [
      '3.1 This Agreement imposes obligations upon both Parties. Each Party shall perform its obligations in good faith and shall not unreasonably withhold or delay any approval, consent or cooperation required of it.',
      '3.2 Qera shall:',
      '(a) perform the Services with reasonable skill, care and diligence, and to the standard ordinarily expected of a competent professional studio in its field;',
      '(b) deliver the Deliverables described in each applicable Part, and shall notify the Client in writing where any described Deliverable is not achievable, together with the reasons;',
      '(c) notify the Client in writing without undue delay where any agreed date is at risk, stating the cause and a revised date;',
      "(d) quote any Additional Work in writing and obtain the Client's written approval prior to commencing it, and shall not invoice the Client for work not so approved;",
      '(e) remedy, at its own cost, any defect in the Deliverables arising from its own act or omission and reported within the applicable support or correction period;',
      '(f) give the Client written notice and a reasonable opportunity to remedy the cause before suspending performance of the Services;',
      "(g) treat the Client's non-public business information as confidential in accordance with clause 13, and shall not use Client data to train artificial intelligence models;",
      "(h) procure that every account, domain name and subscription created in connection with the Services is registered in the Client's name, so that the Client's ownership of its own infrastructure is not contingent upon the continuation of this Agreement;",
      '(i) deliver all materials to which the Client is entitled promptly upon payment of the sums properly due in respect of them; and',
      "(j) remove its own access to the Client's systems and accounts promptly upon request or upon termination.",
      '3.3 The Client shall:',
      '(a) supply the Client Inputs specified in each applicable Part, in usable form, so as to enable performance of the Services;',
      '(b) respond to submissions and requests for approval within the periods specified in the applicable Schedule or Part;',
      '(c) pay each invoice in accordance with its terms;',
      '(d) warrant that it holds all necessary rights, licences and consents in respect of any material it supplies to Qera;',
      '(e) nominate a single individual with authority to approve Deliverables and give instructions on its behalf; and',
      '(f) raise any concern regarding performance in writing and without undue delay, so that it may be addressed at the earliest practicable stage.',
    ],
  },
  {
    number: 4,
    heading: 'Scope and Additional Work',
    body: [
      '4.1 Qera shall perform the Services specified in the approved Proposal and applicable Part.',
      '4.2 Any work, feature, request, integration, deliverable, modification, enhancement or strategic expansion not expressly included within the approved written scope shall constitute Additional Work.',
      '4.3 No conversation, exploratory discussion, assumption, informal message or conceptual reference shall operate to vary the scope, fees or timelines of any engagement unless confirmed in writing by both Parties.',
      '4.4 Additional Work may result in revised fees, timelines, milestones and resource allocation. Qera may decline Additional Work which it is not appropriately placed to deliver. No Additional Work shall commence unless approved in writing.',
    ],
  },
  {
    number: 5,
    heading: 'Communication and Notices',
    body: [
      '5.1 Operational communication may be conducted by email, messaging platform, project management tool or meeting, as the Parties find convenient.',
      '5.2 Approvals, variations to scope, commercial confirmations and formal notices shall be confirmed by email. No instruction, representation or discussion conducted otherwise shall operate to vary this Agreement, and neither Party shall be bound by any purported agreement not so confirmed.',
      '5.3 Formal notices shall be sent to the email addresses stated in the applicable Schedule and shall be deemed received on the next working day following transmission, absent evidence of delivery failure.',
      '5.4 Qera shall not be liable for any misunderstanding arising from fragmented, inconsistent or undocumented communication conducted otherwise than in accordance with this clause.',
    ],
  },
  {
    number: 6,
    heading: 'Feedback and Approval',
    body: [
      '6.1 Where a Schedule or Part specifies a period for feedback, the Client shall provide consolidated written feedback within that period.',
      '6.2 Where the Client does not respond within the specified period, the relevant submission shall be deemed approved, so as to permit the Services to continue without interruption. Qera shall issue a written reminder prior to treating any submission as approved by default.',
      '6.3 Either Party may request a reasonable extension of any period specified under this clause in circumstances of genuine emergency, and such request shall not be unreasonably refused.',
    ],
  },
  {
    number: 7,
    heading: 'Revisions',
    body: [
      '7.1 A "Revision" means the refinement of work already approved in direction, including adjustment to spacing, sizing, wording, colour or layout, and the correction of errors.',
      '7.2 A Revision does not include a new concept, a change of direction, restructured navigation, additional pages, additional functionality or a redesign. Such work constitutes Additional Work.',
      '7.3 The number of Revision rounds included is specified in the applicable Schedule and Part.',
      "7.4 The correction of any error attributable to Qera shall not be counted as a Revision round and shall be undertaken at Qera's own cost.",
      "7.5 The Client acknowledges that branding, design, strategy, content, motion, visual identity and comparable creative services involve subjective interpretation and judgment. Deliverables shall be assessed against approved briefs, agreed objectives, approved references, technical feasibility and commercial scope, and not against evolving personal preference alone. Qera shall use reasonable endeavours to align with the Client's vision within the approved Revision structure.",
    ],
  },
  {
    number: 8,
    heading: 'Fees, Invoicing and Payment',
    body: [
      '8.1 Fees, retainers, milestone structures and commercial terms are specified in the approved Proposal and applicable Part.',
      '8.2 All taxes, duties, payment gateway charges, transfer fees, international transaction fees and government-imposed charges shall be borne by the Client, save where expressly stated otherwise. Fees are stated exclusive of goods and services tax, which shall be charged at the applicable rate.',
      '8.3 Invoices shall be payable within the period stated thereon or, where no period is stated, within [7 days] of issue.',
      '8.4 Where any sum remains unpaid after its due date, Qera shall notify the Client in writing. Interest shall accrue on any sum outstanding more than [15 days] after its due date at the rate of [1.5%] per month, or the maximum rate permitted by applicable law, whichever is lower, calculated from the due date until payment. Qera may waive such interest at its discretion.',
      '8.5 Suspension of performance for non-payment is governed by the applicable Schedule. Qera shall not withhold any Deliverable, source material or access in respect of which the sums properly due have been paid.',
      '8.6 All sums payable are exclusive of Third-Party Costs, which are governed by clause 9.',
    ],
  },
  {
    number: 9,
    heading: 'Third-Party Costs',
    body: [
      '9.1 Platform subscriptions, hosting, domain fees, licences, paid applications, model and application programming interface usage, advertising spend, stock assets, typeface licences and comparable third-party charges are excluded from all fees payable under this Agreement, save where a Part expressly provides otherwise. Each Part shall itemise the third-party costs applicable to it.',
      "9.2 Such costs shall be paid by the Client directly to the relevant provider, using the Client's own payment method, so that billing control and account ownership remain with the Client.",
      "9.3 Where, by agreement, Qera discharges any such cost on the Client's behalf, it shall be reimbursed at cost together with any transfer charges, upon production of evidence of the sum paid.",
      "9.4 Qera shall not be obliged to fund, advance or hold any sum on the Client's behalf, and shall bear no liability for any interruption to the Services arising from the failure, expiry or decline of the Client's payment method.",
    ],
  },
  {
    number: 10,
    heading: 'Intellectual Property',
    body: [
      '10.1 Title to and all intellectual property rights in the final approved Deliverables shall pass to the Client upon payment in full of the fee for the applicable Part, and not before. Until such payment, the Deliverables shall remain the property of Qera.',
      "10.2 Such transfer shall constitute an assignment of copyright within the meaning of section 19 of the Copyright Act, 1957, and shall take effect upon receipt of full payment. Qera shall execute such further documents as the Client may reasonably require to give effect to such assignment, at the Client's cost.",
      '10.3 The Client retains ownership of all material supplied by it to Qera, and grants Qera a non-exclusive licence to use such material for the purpose of performing the Services.',
      '10.4 Concepts, directions and explorations presented but not selected by the Client shall remain the property of Qera.',
      '10.5 Transfer of source files, editable assets, repositories, automation workflows, design files, structured systems and operational infrastructure shall be governed by the applicable Part.',
    ],
  },
  {
    number: 11,
    heading: 'Retained Materials and Licence',
    body: [
      '11.1 Each Part specifies the materials the Client shall receive. Where the Client requires materials beyond those specified, Qera shall supply such materials as it reasonably can, and shall agree terms with the Client in respect of any material incorporating Retained Materials.',
      '11.2 "Retained Materials" means Qera\'s internal methods, frameworks, component libraries, naming conventions, prompt patterns, automation logic, starter templates and reusable operational systems, together with all intellectual property rights therein, which shall remain vested in Qera at all times.',
      "11.3 Where Retained Materials are incorporated into a Deliverable, Qera grants the Client, upon payment in full for that Deliverable, a perpetual, irrevocable, worldwide, non-exclusive, royalty-free licence to use, modify, host and maintain such Retained Materials as part of that Deliverable within the Client's own business. Such licence shall not extend to redistribution, resale or use in any separate project.",
      "11.4 The licence granted under clause 11.3 shall survive termination of this Agreement for any reason, so that the Client's ability to operate and modify the Deliverables is not prejudiced by termination.",
    ],
  },
  {
    number: 12,
    heading: 'Credit and Portfolio',
    body: [
      '12.1 Qera may display completed work in its portfolio, case studies, marketing materials, awards submissions and presentations, save where restricted by a separately executed confidentiality agreement.',
      '12.2 In respect of every website, web application and digital product delivered under this Agreement, Qera shall retain the right to display an attribution credit in the form "Made by Qera Studio", or such other form as it may reasonably adopt, in the footer of the delivered property, hyperlinked to Qera\'s own website. The Client shall not remove, obscure, alter or disable such credit.',
      '12.3 The right at clause 12.2 forms part of the consideration for the fees stated in the applicable Part. Where the Client requires that no such credit be displayed, this shall be agreed in writing prior to commencement and shall be subject to a separately quoted fee.',
      '12.4 The obligation at clause 12.2 shall subsist for so long as the delivered property remains substantially in the form delivered by Qera.',
    ],
  },
  {
    number: 13,
    heading: 'Confidentiality',
    body: [
      '13.1 Each Party shall keep confidential all non-public business, operational, technical, strategic and financial information of the other Party disclosed in connection with this Agreement, and shall not disclose it to any third party save as permitted by this clause.',
      '13.2 Disclosure is permitted (a) to personnel, subcontractors and professional advisers who require it for the performance of this Agreement and who are bound by equivalent obligations; (b) where required by law, regulation or court order; and (c) where the receiving Party can demonstrate the information was already public, already known to it, or independently developed.',
      '13.3 This clause shall survive termination of this Agreement for a period of [3 years], save in respect of information constituting a trade secret, in respect of which the obligation shall subsist indefinitely.',
    ],
  },
  {
    number: 14,
    heading: 'Data Protection',
    body: [
      '14.1 Each Party shall comply with applicable data protection law, including the Digital Personal Data Protection Act, 2023.',
      "14.2 Where Qera processes personal data on the Client's behalf in the course of performing the Services, the Client shall be the Data Fiduciary and Qera the Data Processor. Qera shall process such data only on the Client's documented instructions and only to the extent necessary to perform the Services.",
      "14.3 Qera shall implement reasonable technical and organisational measures to protect personal data in its possession, and shall notify the Client without undue delay upon becoming aware of any personal data breach affecting the Client's data.",
      '14.4 The Client warrants that it has obtained all necessary consents and provided all necessary notices in respect of personal data supplied to Qera, and that such supply does not contravene applicable law.',
      "14.5 Upon termination, Qera shall, at the Client's written election, return or securely delete personal data in its possession, save where retention is required by law.",
      '14.6 Where the Services require personal data to be processed by Third-Party Services, such processing shall be governed by the terms of the relevant provider, which Qera does not control.',
    ],
  },
  {
    number: 15,
    heading: 'Subcontracting',
    body: [
      "15.1 Qera may subcontract any portion of the Services, engage freelancers, specialists or external consultants, or delegate operational execution, without requiring the Client's prior approval.",
      '15.2 Qera shall remain responsible for the overall coordination and delivery of the Services and shall be liable for the acts and omissions of its subcontractors as if they were its own.',
      '15.3 Qera shall procure that every subcontractor engaged is bound by confidentiality obligations no less protective than those at clause 13.',
    ],
  },
  {
    number: 16,
    heading: 'Third-Party Services',
    body: [
      '16.1 The Services may depend upon Third-Party Services. Qera does not control such services and shall bear no liability for any outage, suspension, ban, algorithm change, interface restriction, pricing change, discontinuation, policy update, infrastructure failure or platform-specific issue arising from them.',
      "16.2 Where a Third-Party Service materially changes such that a Deliverable ceases to function as delivered, remediation shall constitute Additional Work, save where the failure is attributable to Qera's own act or omission.",
      '16.3 Qera shall not be liable for the rejection, restriction or suspension of any account, campaign or application by any platform, nor for the outcome of any application for verification, approval or elevated access.',
    ],
  },
  {
    number: 17,
    heading: 'Artificial Intelligence',
    body: [
      "17.1 The Client acknowledges that artificial intelligence and automation systems may produce inaccurate, incomplete, probabilistic or non-repeatable outputs, may alter their behaviour over time, and depend upon third-party providers beyond Qera's control.",
      '17.2 Qera does not warrant factual accuracy, originality, consistency, uninterrupted operation, permanent compatibility or deterministic output of any artificial intelligence or automation system.',
      '17.3 The Client shall review and approve all artificial intelligence or automation-generated output prior to operational or public use, and shall nominate a person accountable for such review. Qera shall bear no liability for any consequence of output published, transmitted or acted upon without such review.',
      '17.4 Qera does not use Client data to train artificial intelligence models. Third-party providers may process submitted data in accordance with their own terms. The Client shall identify in writing any data which must not be transmitted to a third-party provider, and is advised not to submit sensitive or regulated information into such systems save where operationally necessary and lawfully permissible.',
      '17.5 The ownership and copyright status of machine-generated output is unsettled and varies by jurisdiction. Qera makes no representation as to whether such output attracts copyright protection, is registrable, or is free from third-party rights. The Client shall obtain its own clearance advice prior to commercial use.',
    ],
  },
  {
    number: 18,
    heading: 'Performance and Outcomes',
    body: [
      '18.1 Qera does not guarantee revenue growth, conversion rates, lead volume, follower growth, search rankings, advertising performance, virality, profitability, algorithmic reach or any other measurable business outcome.',
      "18.2 All branding, marketing, automation, design, development and digital systems outcomes depend upon factors beyond Qera's control, including market conditions, pricing, offer, competition and platform behaviour.",
      '18.3 Recommendations, projections, audits and strategic guidance are provided in good faith on the information available and do not constitute guarantees.',
    ],
  },
  {
    number: 19,
    heading: 'Warranties',
    body: [
      '19.1 Each Party warrants that it has full power and authority to enter into and perform this Agreement, and that doing so does not contravene any obligation binding upon it.',
      "19.2 Qera warrants that (a) the Services shall be performed in accordance with clause 3.2(a); and (b) the Deliverables, excluding any material supplied by the Client and any Third-Party Service, shall be original work and shall not to Qera's knowledge infringe the intellectual property rights of any third party.",
      '19.3 The Client warrants that (a) all material it supplies is accurate, lawful and free from third-party rights which would prevent its use as contemplated; and (b) it is solely responsible for the legality, factual accuracy, regulatory compliance and commercial use of all submitted materials and approved Deliverables.',
      '19.4 Save as expressly stated, all warranties, conditions and terms implied by statute or common law are excluded to the maximum extent permitted by law.',
    ],
  },
  {
    number: 20,
    heading: 'Indemnities',
    body: [
      "20.1 The Client shall indemnify Qera against all losses, damages, costs and reasonable legal expenses arising from (a) any material supplied by the Client, including any claim that such material infringes third-party rights; (b) any breach of the warranties at clause 19.3; (c) the Client's use of the Deliverables in a manner not contemplated by this Agreement; and (d) any claim arising from the Client's own business, products, services or advertising claims.",
      "20.2 Qera shall indemnify the Client against all losses, damages, costs and reasonable legal expenses arising from any third-party claim that a Deliverable, excluding any material supplied by the Client and any Third-Party Service, infringes that third party's intellectual property rights, provided that the Client (i) notifies Qera promptly, (ii) permits Qera to conduct the defence, and (iii) does not admit liability without Qera's written consent.",
      "20.3 Qera's liability under clause 20.2 shall be subject to the limitation at clause 21.",
    ],
  },
  {
    number: 21,
    heading: 'Limitation of Liability',
    body: [
      '21.1 Neither Party shall be liable for indirect, incidental, consequential, special or punitive damages, nor for loss of business, profits, revenue, data, goodwill, leads, platform reach or anticipated savings, howsoever arising.',
      "21.2 Qera's total aggregate liability arising under or in connection with any engagement shall not exceed the total fees actually paid by the Client to Qera in respect of that engagement in the twelve months preceding the event giving rise to the claim.",
      '21.3 Liability arising from Third-Party Services, platform restrictions, infrastructure failures, artificial intelligence systems or external providers is excluded to the maximum extent permitted by law.',
      "21.4 Nothing in this Agreement excludes or limits liability for (a) fraud or fraudulent misrepresentation; (b) death or personal injury caused by negligence; (c) any liability which cannot lawfully be excluded; or (d) the Client's obligation to pay sums properly due.",
      '21.5 The limitations at this clause reflect the allocation of risk between the Parties having regard to the fees payable, and each Party acknowledges that the fees would be materially different absent them.',
    ],
  },
  {
    number: 22,
    heading: 'Force Majeure',
    body: [
      '22.1 Neither Party shall be liable for any delay or failure to perform arising from events beyond its reasonable control, including natural disaster, internet or infrastructure outage, government restriction, cyberattack, platform outage, labour dispute, war, civil unrest, epidemic, pandemic or regulatory change.',
      '22.2 The affected Party shall notify the other without undue delay and shall use reasonable endeavours to mitigate the effect. Where such event continues for more than [60 days], either Party may terminate the affected engagement by written notice, and clause 25 shall apply.',
    ],
  },
  {
    number: 23,
    heading: 'Non-Solicitation',
    body: [
      "23.1 During the term of this Agreement and for [12 months] following its termination, neither Party shall directly solicit for employment or engagement any employee, subcontractor or freelancer of the other Party who has been materially involved in the Services, without the other Party's prior written consent.",
      '23.2 This clause shall not apply to any response to a general public advertisement not specifically directed at such person.',
      "23.3 Where this clause is breached, the breaching Party shall pay the other a sum equal to [50%] of the relevant person's annual remuneration, as a genuine pre-estimate of loss.",
    ],
  },
  {
    number: 24,
    heading: 'Suspension and Termination',
    body: [
      '24.1 Either Party may terminate an engagement in accordance with the applicable Schedule.',
      '24.2 Either Party may terminate this Agreement or any engagement immediately by written notice where the other Party (a) commits a material breach which is incapable of remedy, or which is not remedied within [15 days] of written notice requiring remedy; (b) becomes insolvent, enters liquidation or has a receiver appointed; or (c) ceases or threatens to cease carrying on business.',
      "24.3 Qera may suspend or terminate immediately where the Client's conduct is abusive or unlawful, where the Client instructs Qera to act unlawfully, or where continued performance would expose Qera to material reputational or legal risk.",
      '24.4 The Client may terminate immediately where Qera has materially and persistently failed to perform the Services in accordance with clause 3.2(a) and has not remedied such failure within [15 days] of written notice.',
      '24.5 Termination of one engagement shall not terminate any other engagement or this Agreement, unless expressly stated.',
    ],
  },
  {
    number: 25,
    heading: 'Consequences of Termination',
    body: [
      '25.1 Upon termination for any reason, Qera shall within [14 days]:',
      '(a) deliver to the Client all Deliverables for which payment has been made in full;',
      "(b) transfer or release every account, domain name, subscription and credential held on the Client's behalf;",
      "(c) remove its own access from the Client's systems, accounts and platforms; and",
      '(d) deliver a written record of the configuration of any system it has operated, sufficient to enable a competent third party to assume its operation.',
      '25.2 The Client shall pay all sums due for work performed and resources committed as at the date of termination, calculated in accordance with the applicable Schedule.',
      '25.3 Any sum held by Qera in excess of the amount payable under clause 25.2 shall be refunded to the Client within [14 days].',
      '25.4 Clauses 10, 11, 12, 13, 14, 19, 20, 21, 23, 25, 26 and 27, together with any other provision which by its nature is intended to survive, shall survive termination.',
    ],
  },
  {
    number: 26,
    heading: 'Dispute Resolution',
    body: [
      '26.1 Where any dispute arises, the Parties shall first attempt to resolve it by good-faith discussion between senior representatives within [30 days] of written notice of the dispute.',
      '26.2 Where the dispute is not so resolved, it shall be referred to and finally resolved by arbitration under the Arbitration and Conciliation Act, 1996, before a sole arbitrator appointed by agreement between the Parties or, failing agreement within [30 days], by the competent court. The seat of arbitration shall be Ghaziabad, Uttar Pradesh, and the language shall be English.',
      '26.3 Nothing in this clause shall prevent either Party from seeking urgent interim or injunctive relief from a competent court.',
    ],
  },
  {
    number: 27,
    heading: 'Governing Law and Jurisdiction',
    body: [
      '27.1 This Agreement and any dispute arising from it shall be governed by and construed in accordance with the laws of India.',
      '27.2 Subject to clause 26, the courts at Ghaziabad, Uttar Pradesh shall have exclusive jurisdiction.',
    ],
  },
  {
    number: 28,
    heading: 'General',
    body: [
      '28.1 Entire agreement. This Agreement, together with the applicable Schedules, Parts, Proposals and written amendments, constitutes the entire agreement between the Parties and supersedes all prior discussions, verbal understandings and representations.',
      '28.2 Amendment. No amendment shall be effective unless made in writing and agreed by both Parties.',
      "28.3 Assignment. Neither Party may assign this Agreement without the other's prior written consent, save that either Party may assign to a successor in title to substantially the whole of its business.",
      '28.4 Waiver. No failure or delay in exercising any right shall constitute a waiver of it.',
      '28.5 Severability. Where any provision is held invalid or unenforceable, the remainder shall continue in full force, and the invalid provision shall be replaced by a valid provision achieving as nearly as possible the same commercial effect.',
      '28.6 Relationship. Nothing in this Agreement creates a partnership, joint venture, agency or employment relationship between the Parties.',
      '28.7 Third-party rights. No person who is not a Party shall have any right to enforce any provision of this Agreement.',
      '28.8 Counterparts and electronic execution. This Agreement may be executed in counterparts and by electronic signature, each of which shall constitute an original and together shall constitute one instrument.',
    ],
  },
];
