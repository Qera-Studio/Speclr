/**
 * The four Schedules — Setup, Build, Retainer and Audit. Transcribed from
 * `docs/contract-content.md` §3, §3b, §3c and §3d.
 *
 * The list is closed. Per contract-system.md §3, the four are distinguished by
 * how money and ownership behave, not by subject matter, and every service Qera
 * sells fits one of them. Opening a fifth is a deliberate commercial decision,
 * not a casual one.
 *
 * ## Two conventions in this file
 *
 * **`{L}` is the schedule's rendered letter.** A Schedule's letter depends on
 * which other Schedules a given contract includes — a contract of Retainer and
 * Setup work letters them A and B, not B and C (contract-system.md §4). So the
 * letter cannot be baked in here; `{L}` is substituted at assembly time, in
 * both the clause's own number and in every cross-reference to a sibling
 * clause.
 *
 * **Schedules 2–4 are renumbered on the way in.** Content §3b–§3d number their
 * clauses `[letter]0.1`, `[letter]0.2`; Schedule 1 numbers its `[letter]1`,
 * `[letter]2`. One style has to win and it is Schedule 1's, which is the
 * ordinary form — `A0.1` reads as a typo. The words are otherwise verbatim.
 *
 * `[bracketed]` values are blanks, left as drafted. See `blanks.ts`.
 *
 * Client-safe: no server imports.
 */

/** Which Schedule a service belongs to. Closed set — see the note above. */
export type ScheduleKey = 'build' | 'retainer' | 'setup' | 'audit';

export interface ScheduleClause {
  number: number;
  heading: string;
  /**
   * One string per paragraph, each carrying its own `{L}`-prefixed sub-number.
   * A paragraph beginning '- ' is a bullet and the sheet renders it as one.
   */
  body: string[];
}

export interface Schedule {
  key: ScheduleKey;
  /**
   * Canonical order, 1–4 — the order an engagement runs in: something is set
   * up, built, then run, and looked at. It fixes the letter each Schedule
   * prints under and the order the Services are numbered in, so the whole
   * system reads in one direction.
   */
  number: number;
  name: string;
  /** The italic statement under the schedule's cover heading. */
  preamble: string;
  clauses: ScheduleClause[];
}

/**
 * The four, in the order they were transcribed. `number` is what orders them —
 * see `SCHEDULES` below. Left in transcription order so a clause can be checked
 * against `docs/contract-content.md` §3–§3d without hunting for it.
 */
const TRANSCRIBED: Schedule[] = [
  {
    key: 'build',
    number: 2,
    name: 'Build',
    preamble:
      'This Schedule forms part of the Master Service Agreement between Qera Private Limited and the Client, and governs work delivered as a defined project for a one-time fee.',
    clauses: [
      {
        number: 1,
        heading: 'Application',
        body: [
          '{L}1.1 The Parts appended to this Schedule specify the work to be performed. This Schedule specifies the terms upon which such work is paid for, approved, delivered and owned.',
          '{L}1.2 This Schedule shall be read together with the Master Service Agreement, which governs the mutual obligations of the Parties, feedback and approval, Revisions, third-party costs, Retained Materials and attribution.',
          '{L}1.3 In the event of inconsistency, the applicable Part shall prevail over this Schedule, and this Schedule shall prevail over the Master Service Agreement.',
        ],
      },
      {
        number: 2,
        heading: 'Fees and Payment',
        body: [
          '{L}2.1 The fee for each Part is stated in that Part. Save where otherwise agreed in writing, payment shall be made as to [50%] in advance and [50%] upon completion. The advance shall be paid prior to commencement. The balance shall be paid prior to deployment, launch or handover, whichever occurs first.',
          '{L}2.2 Engagements exceeding [₹1,00,000] may be apportioned into milestone payments as specified in the applicable Part, so that neither Party carries a substantial unpaid balance at any stage.',
          '{L}2.3 Performance shall commence upon the later of (a) receipt of cleared advance payment and (b) receipt of the Client Inputs specified in the applicable Part. Qera Private Limited shall confirm the commencement date in writing, and all periods specified in the applicable Part shall run from that date.',
        ],
      },
      {
        number: 3,
        heading: 'Timelines',
        body: [
          '{L}3.1 All periods stated are good-faith estimates predicated upon timely approvals, complete Client Inputs and uninterrupted third-party dependencies.',
          '{L}3.2 Qera Private Limited shall notify the Client in writing where it anticipates that any date will not be met, stating the cause and a revised date.',
          '{L}3.3 Where delay arises from any act or omission of the Client, or from any third-party platform beyond the reasonable control of either Party, the relevant period shall be extended by not less than the duration of such delay.',
        ],
      },
      {
        number: 4,
        heading: 'Revisions',
        body: [
          '{L}4.1 Each Part includes [3] rounds of Revision, as defined in the Master Service Agreement.',
          '{L}4.2 Revision rounds shall be consolidated, such that a single round addresses all changes required by the Client at that stage. Feedback submitted piecemeal across separate occasions shall be counted as separate rounds.',
        ],
      },
      {
        number: 5,
        heading: 'Acceptance',
        body: [
          '{L}5.1 Work shall be treated as complete when the Deliverables specified in the applicable Part exist and function as described therein.',
          '{L}5.2 Qera Private Limited shall notify the Client in writing when the work is ready for acceptance. The Client shall have [5 working days] from such notice to identify in writing any respect in which the work does not conform to the applicable Part, and Qera Private Limited shall remedy any such non-conformity at its own cost.',
          '{L}5.3 Where no non-conformity is notified within the period specified at clause {L}5.2, the work shall be deemed accepted.',
          '{L}5.4 Acceptance shall be assessed solely against the specification contained in the applicable Part, and not against commercial outcomes or matters expressly excluded therein.',
        ],
      },
      {
        number: 6,
        heading: 'Variation of Scope',
        body: [
          '{L}6.1 Each Part specifies the work included within it. Any work not so specified constitutes Additional Work.',
          '{L}6.2 Qera Private Limited shall quote Additional Work in writing prior to commencing it, so that the Client may determine whether to proceed before any liability for cost arises. Qera Private Limited may decline Additional Work which it is not appropriately placed to deliver.',
          '{L}6.3 No variation to scope, fees or timelines shall take effect unless confirmed by email by both Parties.',
        ],
      },
      {
        number: 7,
        heading: 'Ownership and Handover',
        body: [
          '{L}7.1 Title to and all intellectual property rights in the final approved Deliverables shall pass to the Client upon payment in full of the fee for the applicable Part, and not before. Until such payment, the Deliverables shall remain the property of Qera Private Limited.',
          '{L}7.2 Each Part specifies the materials the Client shall receive upon handover. Handover shall take place promptly upon receipt of final payment.',
          '{L}7.3 Retained Materials, and the licence granted to the Client in respect of them, are governed by clause 11 of the Master Service Agreement.',
        ],
      },
      {
        number: 8,
        heading: 'Support',
        body: [
          '{L}8.1 A support period of [30 days] shall apply from the date of acceptance, at no additional cost, covering defects in the Deliverables, being any respect in which they fail to function as specified.',
          '{L}8.2 The support period shall not extend to additional features, additional content, altered requirements, third-party failures, platform policy changes, or any modification effected by the Client or a third party following handover. Such work shall be quoted as Additional Work.',
          '{L}8.3 Support beyond the support period is available under a separate engagement.',
        ],
      },
      {
        number: 9,
        heading: 'Late Payment',
        body: [
          '{L}9.1 Where any invoice remains unpaid after its due date, Qera Private Limited shall notify the Client in writing before taking any step under this clause.',
          '{L}9.2 A grace period of [7 days] shall apply from the due date. Where the sum remains outstanding thereafter, Qera Private Limited may serve written notice and, where the sum remains outstanding [7 days] following such notice, may suspend performance until payment is received.',
          '{L}9.3 Any period specified in the applicable Part shall be extended by the duration of any suspension under clause {L}9.2.',
          '{L}9.4 Qera Private Limited shall not withhold any Deliverable, source material or access in respect of which the sums properly due have been paid.',
        ],
      },
      {
        number: 10,
        heading: 'Termination',
        body: [
          '{L}10.1 Either Party may terminate an engagement under this Schedule by written notice.',
          '{L}10.2 Where the Client terminates, the Client shall pay for the work performed and the resources committed as at the date of termination. Such sum shall be assessed in good faith by reference to the stage the work has reached, and Qera Private Limited shall provide a written statement of the basis upon which it has been calculated.',
          '{L}10.3 Where the work is substantially complete as at the date of termination, being where the effort remaining is minor relative to that already performed, the full fee for the applicable Part shall be payable.',
          '{L}10.4 Sums received in advance shall be applied against any amount payable under clauses {L}10.2 or {L}10.3, and any excess shall be refunded to the Client within [14 days].',
          '{L}10.5 Where Qera Private Limited terminates otherwise than for non-payment or material breach by the Client, the Client shall pay only for work performed as at the date of termination, and any advance held in excess of that amount shall be refunded within [14 days].',
          "{L}10.6 Upon termination for any reason, Qera Private Limited shall deliver to the Client all Deliverables for which payment has been made in full, together with any account, domain name or credential held on the Client's behalf.",
        ],
      },
    ],
  },
  {
    key: 'retainer',
    number: 3,
    name: 'Retainer',
    preamble:
      'This Schedule forms part of the Master Service Agreement between Qera Private Limited and the Client. It governs all work delivered on a recurring monthly basis for a recurring fee.',
    clauses: [
      {
        number: 1,
        heading: 'What this Schedule covers',
        body: [
          '{L}1.1 The Parts appended to this Schedule describe what is delivered each month. This Schedule describes how that work is billed, approved, paused, owned and ended.',
          '{L}1.2 This Schedule shall be read together with the Master Service Agreement, which governs the mutual obligations of the Parties, feedback and approval, Revisions, third-party costs, Retained Materials and attribution.',
          '{L}1.3 In the event of inconsistency, the applicable Part shall prevail over this Schedule, and this Schedule shall prevail over the Master Service Agreement.',
        ],
      },
      {
        number: 2,
        heading: 'Fee and Billing',
        body: [
          '{L}2.1 The monthly fee for each Part is stated within that Part. Fees are payable in advance, before the cycle they cover begins.',
          '{L}2.2 The first cycle begins on the date the first payment is received. Each subsequent cycle begins on the same date of the following month. Where that date does not exist in a given month, the cycle begins on the last day of that month.',
          '{L}2.3 An alternative billing date may be agreed in writing. Where a billing date is changed, the first affected cycle is charged pro rata.',
        ],
      },
      {
        number: 3,
        heading: 'Term and Renewal',
        body: [
          '{L}3.1 The engagement runs month to month from the first cycle and renews automatically unless ended under clause {L}11.',
          '{L}3.2 There is no minimum term unless stated in the Part.',
        ],
      },
      {
        number: 4,
        heading: 'Late Payment and Pause',
        body: [
          '{L}4.1 Where payment is not received by the cycle start date, a grace period of [7 days] applies.',
          '{L}4.2 Where payment remains outstanding following the grace period, Qera Private Limited shall notify the Client in writing prior to suspending performance. Where the sum remains outstanding, work under this Schedule may be suspended. During any such suspension no work shall be performed, no content shall be published, and no monitoring or response obligation shall subsist.',
          '{L}4.3 Work resumes on receipt of payment. Where a pause has occurred, the billing anniversary moves to the date work resumed.',
        ],
      },
      {
        number: 5,
        heading: 'Monthly Capacity',
        body: [
          '{L}5.1 Each Part states the volume included in a cycle — items, posts, hours, or another stated unit.',
          '{L}5.2 Capacity is scoped per cycle. Where capacity is unused because the Client did not supply inputs or approvals in time, the unused portion carries forward for up to [2] further cycles and then lapses.',
          '{L}5.3 Carried-forward capacity is delivered subject to available scheduling and does not create an obligation to exceed normal monthly output in any single cycle.',
          '{L}5.4 Unused and carried-forward capacity shall lapse upon termination. Where capacity has gone unused by reason of any act or omission of Qera Private Limited, the Client may elect to take delivery of such capacity during the notice period or to receive a credit in respect of it.',
          '{L}5.5 Capacity is not transferable between Parts.',
        ],
      },
      {
        number: 6,
        heading: 'Planning, Approval and Turnaround',
        body: [
          '{L}6.1 Work under this Schedule follows an agreed monthly cycle of planning, production, review and delivery. The Client provides a named approver.',
          '{L}6.2 The Client provides consolidated written feedback within [48 hours] of receiving any submission. Where no feedback is received in that window, the submission is treated as approved.',
          '{L}6.3 Where approvals are delayed, delivery within that cycle may be reduced accordingly and the undelivered portion is treated under clause {L}5.',
        ],
      },
      {
        number: 7,
        heading: 'Revisions',
        body: [
          '{L}7.1 Each Part includes reasonable Revision within the approved direction and plan, as defined in the Master Service Agreement.',
          "{L}7.2 The reworking of any item following publication shall constitute Additional Work, the original having been delivered and used. Where any item has been published containing an error attributable to Qera Private Limited, such error shall be corrected at Qera Private Limited's own cost.",
        ],
      },
      {
        number: 8,
        heading: 'Credentials and Account Access',
        body: [
          '{L}8.1 The Client provides access to each platform in scope, and retains ownership of every account.',
          '{L}8.2 Qera Private Limited holds access only for the duration of the engagement and for the purpose of performing the Services. Access is not shared outside the engagement team.',
          "{L}8.3 Where an account is created by Qera Private Limited on the Client's behalf, it is created in the Client's name and belongs to the Client from creation.",
          '{L}8.4 The Client remains responsible for maintaining its own recovery access to every platform, including recovery email, recovery phone number and any second-factor method.',
          '{L}8.5 Qera Private Limited is not liable for account restriction, suspension, loss of access or enforcement action taken by a platform.',
        ],
      },
      {
        number: 9,
        heading: 'Ownership of Content',
        body: [
          '{L}9.1 Final approved content delivered under this Schedule may be used by the Client for its business and marketing purposes, from the cycle in which it was paid for.',
          '{L}9.2 Working files, project files, raw and unused assets, internal templates, planning systems and operational frameworks remain the property of Qera Private Limited unless the Part states otherwise.',
        ],
      },
      {
        number: 10,
        heading: 'What is Handed Over on Ending',
        body: [
          '{L}10.1 Within [14 days] of the engagement ending, Qera Private Limited shall:',
          '- remove its own access from every platform in scope;',
          '- deliver all final approved content produced and paid for under the engagement, including content produced but not yet published; and',
          '- deliver the final assets connected to those deliverables.',
          '{L}10.2 Where the Client requires working files, unused concepts or planning material, Qera Private Limited shall supply such materials as it reasonably can. Materials incorporating Retained Materials shall be governed by clause 11 of the Master Service Agreement, and in no circumstances shall the Client be left without the materials necessary to continue its own operations.',
        ],
      },
      {
        number: 11,
        heading: 'Ending the Engagement',
        body: [
          '{L}11.1 Either Party may end the engagement by giving [15 days] written notice.',
          '{L}11.2 Notice takes effect at the end of the cycle in which the notice period expires. Fees for that cycle remain payable in full and are not refundable.',
          '{L}11.3 Qera Private Limited may suspend or end the engagement immediately in cases of non-payment, abusive conduct, unlawful instruction, or material breach.',
        ],
      },
      {
        number: 12,
        heading: 'No Guarantee of Outcome',
        body: [
          '{L}12.1 Qera Private Limited does not guarantee reach, engagement, follower growth, virality, conversions, revenue, lead volume, search ranking, verification or monetisation.',
          '{L}12.2 Platforms change their algorithms, policies and behaviour without notice. Qera Private Limited commits to consistent execution against the agreed plan, not to a business outcome.',
        ],
      },
    ],
  },
  {
    key: 'setup',
    number: 1,
    name: 'Setup',
    preamble:
      'This Schedule forms part of the Master Service Agreement between Qera Private Limited and the Client. It governs configuration of accounts, domains and infrastructure that are set up once and then operated by the Client.',
    clauses: [
      {
        number: 1,
        heading: 'What this Schedule covers',
        body: [
          '{L}1.1 The Parts appended to this Schedule describe what is set up. This Schedule describes how that work is paid for, who owns the resulting accounts, when access transfers, and the limits of responsibility.',
          '{L}1.2 This Schedule shall be read together with the Master Service Agreement.',
          '{L}1.3 In the event of inconsistency, the applicable Part shall prevail over this Schedule, and this Schedule shall prevail over the Master Service Agreement.',
          '{L}1.4 This Schedule covers configuration only. It does not create any ongoing administration, monitoring or support obligation.',
        ],
      },
      {
        number: 2,
        heading: 'Fee and Payment',
        body: [
          '{L}2.1 The fee for each Part is stated within that Part and covers configuration work only.',
          '{L}2.2 Where setup work accompanies a Build engagement, the setup fee may be collected within the Build advance. Where setup is engaged on its own, the fee is payable in full in advance.',
        ],
      },
      {
        number: 3,
        heading: 'Third-Party Costs',
        body: [
          '{L}3.1 Third-party costs are governed by clause 9 of the Master Service Agreement. For the avoidance of doubt, domain registration and renewal, platform subscriptions and licences shall be paid by the Client.',
          "{L}3.2 Where the Client's own payment method is required for a subscription — including any service requiring ongoing payment, such as a workspace or email plan — the Client provides it before setup begins. Qera Private Limited does not hold or maintain a payment method on the Client's behalf.",
          "{L}3.3 Where Qera Private Limited pays a third-party cost on the Client's behalf, it is reimbursed at cost plus any transfer charges. Any such cost included within a Build advance is stated in the approved Proposal.",
        ],
      },
      {
        number: 4,
        heading: 'Ownership of Accounts',
        body: [
          "{L}4.1 Every account, domain and subscription created under this Schedule is created in the Client's name and is owned by the Client from the moment it is created.",
          '{L}4.2 Qera Private Limited does not register, hold or retain ownership of any Client domain, account or subscription.',
          "{L}4.3 Where a domain is purchased by Qera Private Limited on the Client's behalf, it is registered to the Client as registrant.",
        ],
      },
      {
        number: 5,
        heading: 'Administrative Access during a Project',
        body: [
          '{L}5.1 Where setup forms part of a wider engagement, Qera Private Limited holds administrative and technical access — including DNS control — for as long as that access is operationally required.',
          '{L}5.2 Access is released to the Client at the earlier of:',
          '- completion of the engagement to which the setup relates and receipt of full payment; or',
          '- [30 days] after the Client requests release in writing.',
          '{L}5.3 Where a Part states that access transfers earlier — for example, an email or workspace service the Client needs in daily use — the Part governs and access transfers on completion of that Part.',
          '{L}5.4 Release of administrative access does not, on its own, transfer ownership of any Build deliverable. Ownership of Build work remains governed by the Build Schedule.',
        ],
      },
      {
        number: 6,
        heading: 'What the Client Receives',
        body: [
          '{L}6.1 On release, the Client receives full administrative access, all credentials, and a record of the configuration applied.',
          '{L}6.2 Where a Part includes a walkthrough, the walkthrough is delivered once. Further training is Additional Work.',
        ],
      },
      {
        number: 7,
        heading: 'Client Responsibility after Release',
        body: [
          '{L}7.1 Upon release of access, the Client shall be solely responsible for the account, including renewals, payment, user administration, security, multi-factor authentication and recovery access. Qera Private Limited shall provide a written record of the configuration applied, so as to enable the Client to assume such responsibility.',
          '{L}7.2 Qera Private Limited is not responsible for expiry, non-renewal, loss of access, service interruption or data loss occurring after release.',
          '{L}7.3 The Client is advised to record its own recovery details for every account at the point of release.',
        ],
      },
      {
        number: 8,
        heading: 'No Revisions',
        body: [
          '{L}8.1 Setup work is configuration, not creative work. It does not include revision rounds.',
          '{L}8.2 Where configuration does not match what this Schedule and the Part describe, it is corrected as a fault under clause {L}10 at no charge. Changes to what was agreed are Additional Work.',
        ],
      },
      {
        number: 9,
        heading: 'Third-Party Approval and Availability',
        body: [
          '{L}9.1 Qera Private Limited does not guarantee the availability of any domain name, username or handle, nor the outcome of any application for verification, approval, reinstatement or elevated access.',
          '{L}9.2 Where a platform declines, delays, restricts or reverses a request, the work performed remains payable.',
        ],
      },
      {
        number: 10,
        heading: 'Acceptance and Correction Window',
        body: [
          '{L}10.1 Setup is complete when the configuration described in the Part exists and functions as described.',
          '{L}10.2 A [14-day] correction window applies from completion, covering faults in the configuration delivered. It does not cover changes of requirement, third-party failures, platform policy changes, or anything modified by the Client or a third party after completion.',
        ],
      },
      {
        number: 11,
        heading: 'Ending',
        body: [
          '{L}11.1 Where the engagement ends before setup is complete, work performed to that date is payable.',
          "{L}11.2 Accounts already created remain the Client's property. Any administrative access held by Qera Private Limited is released, subject to any outstanding payment under the Build Schedule.",
        ],
      },
    ],
  },
  {
    key: 'audit',
    number: 4,
    name: 'Audit',
    preamble:
      'This Schedule forms part of the Master Service Agreement between Qera Private Limited and the Client. It governs engagements where the deliverable is analysis, recommendation or strategy rather than implementation.',
    clauses: [
      {
        number: 1,
        heading: 'What this Schedule covers',
        body: [
          '{L}1.1 The Parts appended to this Schedule describe what is analysed and what is delivered. This Schedule describes how that work is paid for, what it is and is not, and the limits of responsibility.',
          '{L}1.2 This Schedule shall be read together with the Master Service Agreement.',
          '{L}1.3 In the event of inconsistency, the applicable Part shall prevail over this Schedule, and this Schedule shall prevail over the Master Service Agreement.',
        ],
      },
      {
        number: 2,
        heading: 'The Deliverable is a Document',
        body: [
          '{L}2.1 Work under this Schedule is delivered as a written document, a recorded walkthrough, a working session, or a combination of these, as stated in the Part.',
          '{L}2.2 This Schedule includes no implementation. Building, changing, configuring or operating anything identified in the deliverable is separate work under the Build, Retainer or Setup Schedule.',
        ],
      },
      {
        number: 3,
        heading: 'Fee and Payment',
        body: [
          '{L}3.1 The fee for each Part is stated within that Part and is payable in full in advance.',
          '{L}3.2 The fee covers the analysis and the deliverable, not the outcome of acting on it.',
        ],
      },
      {
        number: 4,
        heading: 'Scope of Analysis',
        body: [
          '{L}4.1 Analysis is limited to the material, access and information listed in the Part and supplied by the Client, and to what is publicly observable.',
          '{L}4.2 Where access or information is not supplied, findings are limited accordingly and this is stated in the deliverable.',
        ],
      },
      {
        number: 5,
        heading: 'Delivery and Questions',
        body: [
          '{L}5.1 The deliverable is issued once. The Part states whether a walkthrough or question session is included and its length.',
          '{L}5.2 Reasonable clarifying questions on the content of the deliverable are answered for [14 days] after delivery. Extending, re-running or updating the analysis is Additional Work.',
        ],
      },
      {
        number: 6,
        heading: 'No Revisions',
        body: [
          '{L}6.1 The deliverable reflects findings at the date of analysis. It is not revised to reflect a different opinion, a changed brief or subsequent events.',
          '{L}6.2 Factual errors are corrected at no charge.',
        ],
      },
      {
        number: 7,
        heading: 'Recommendations are not Guarantees',
        body: [
          '{L}7.1 Recommendations are given in good faith on the information available and represent professional opinion, not a prediction of outcome.',
          '{L}7.2 The Client decides what to act on. Qera Private Limited is not responsible for the results of implementation, whether carried out by the Client, by Qera Private Limited under another Schedule, or by any third party.',
          '{L}7.3 Nothing in a deliverable under this Schedule is legal, tax, financial, medical or regulatory advice.',
        ],
      },
      {
        number: 8,
        heading: 'Ownership and Use',
        body: [
          '{L}8.1 Ownership of the deliverable passes to the Client on receipt of full payment.',
          '{L}8.2 The Client may use it internally and share it with its own advisers. It may not be published, resold or distributed as a commercial product without written agreement.',
          '{L}8.3 Qera Private Limited retains ownership of the methods, frameworks, scoring systems and templates used to produce it. These are not part of the deliverable.',
        ],
      },
      {
        number: 9,
        heading: 'Confidentiality',
        body: [
          "{L}9.1 Findings relating to the Client's business are treated as confidential and are not shared outside the engagement.",
          "{L}9.2 Anonymised, non-identifying observations may be used in Qera Private Limited's own writing and marketing.",
        ],
      },
      {
        number: 10,
        heading: 'Ending',
        body: [
          '{L}10.1 Where the engagement is terminated prior to delivery, the Client shall receive the analysis completed as at that date in its then-current state, and shall pay only for the work performed. Any balance held in excess of that amount shall be refunded within [14 days].',
        ],
      },
    ],
  },
];

/**
 * The four in canonical order — Setup, Build, Retainer, Audit.
 *
 * This is the order everything else follows: the letters `assemble()` hands
 * out, the Service codes (01–04 Setup, 05–14 Build, …), and the tabs on both
 * screens that list the library. One order, so the document and the tool cannot
 * come to disagree about which Schedule comes first.
 */
export const SCHEDULES: Schedule[] = [...TRANSCRIBED].sort(
  (a, b) => a.number - b.number,
);

/** The Schedules in canonical order, keyed. */
export const SCHEDULE_BY_KEY: Record<ScheduleKey, Schedule> = Object.fromEntries(
  SCHEDULES.map((s) => [s.key, s]),
) as Record<ScheduleKey, Schedule>;
