/**
 * What each figure in a contract is called, and what it does.
 *
 * A blank carries only what the drafter typed between the brackets. That is
 * enough to print it and nothing like enough to edit it: the form used the whole
 * sentence as a heading, which gave three-line labels that would not line up,
 * and a Limits row like "Deployment surfaces — site, WhatsApp, internal tool" is
 * a label only in the sense that it is a string.
 *
 * So every figure gets two authored strings — a title of two or three words, and
 * one line saying what it governs *and what changes if you change it*. The
 * second is the part a label cannot carry: that going past a Limit is Additional
 * Work, that a Timeline runs from the Client's inputs rather than from signature,
 * that a support period covers faults and not changes of mind.
 *
 * ## Why this lives beside the text rather than inside it
 *
 * The drafted paragraphs are transcribed from `docs/contract-content.md` and are
 * checked against it. A title spliced into a clause — `[5|Preferred names]` —
 * would make that comparison impossible and put editor copy one bad regex away
 * from printing inside a Client's contract. Keeping it out here costs drift, and
 * `blankMeta.test.ts` is what pays for it: the keys here must match the keys
 * `contractScopes` yields, exactly, in both directions.
 *
 * ## Two maps, on purpose
 *
 * Limits and Fee rows are keyed by their **label**, because 220 of the 328
 * figures are table rows reusing only 120 distinct labels — "Revision rounds"
 * means the same thing in Part 05 and Part 12, and `disagreeingRows` already
 * treats identical labels as the same figure. A new Service reusing one needs no
 * new copy. Figures inside prose are keyed by blank key, because each one is a
 * different sentence.
 *
 * Pure, client-safe, no framework imports.
 */

import { blankLabel } from './blanks';

export interface BlankMeta {
  /** Two or three words. What the input is called. */
  title: string;
  /** One line. What it governs, and the consequence of changing it. */
  help: string;
}

/** Keyed by the Limits/Fee row label, lowercased and trimmed. */
export const ROW_META: Record<string, BlankMeta> = {
  'ad accounts': {
    title: 'Ad accounts',
    help: 'How many advertising accounts are created and configured. Each further account is Additional Work.',
  },
  'additional domains': {
    title: 'Additional domains',
    help: 'Extra domains pointed at the same site or inbox. Each one beyond this count is Additional Work.',
  },
  'adjustment hours per cycle': {
    title: 'Adjustment hours',
    help: 'Hours of tuning and configuration change included each cycle. Work beyond them is quoted separately.',
  },
  'advertising pixels': {
    title: 'Advertising pixels',
    help: 'How many advertising platforms get a tracking pixel installed. Each further platform is Additional Work.',
  },
  'aliases or groups': {
    title: 'Aliases or groups',
    help: 'Shared addresses such as hello@ or a team group. Beyond this count is Additional Work.',
  },
  'analytics platforms': {
    title: 'Analytics platforms',
    help: 'How many analytics tools are configured. Each further tool is Additional Work.',
  },
  'analytics platforms reviewed': {
    title: 'Platforms reviewed',
    help: 'How many analytics tools the review examines. Anything further is Additional Work.',
  },
  'analytics properties': {
    title: 'Analytics properties',
    help: 'How many measurement properties are created and configured. Beyond this count is Additional Work.',
  },
  'applications or mockups': {
    title: 'Applications or mockups',
    help: 'How many store listings or mockups are produced. Each further one is Additional Work.',
  },
  assistants: {
    title: 'Assistants',
    help: 'How many distinct assistants are built. A second assistant is a second Part, not a larger one.',
  },
  'backup frequency': {
    title: 'Backup frequency',
    help: 'How often a full backup is taken. Written as it should print — "weekly", "daily".',
  },
  'backup retention': {
    title: 'Backup retention',
    help: 'How many days a backup is kept before it is overwritten.',
  },
  breakpoints: {
    title: 'Breakpoints',
    help: 'How many screen widths responsive behaviour is defined at. Between them, layout is best-effort.',
  },
  'business portfolios': {
    title: 'Business portfolios',
    help: 'How many business or advertising portfolios are created. Each further one is Additional Work.',
  },
  'cms collections': {
    title: 'CMS collections',
    help: 'How many content collections are set up. Beyond this count is Additional Work.',
  },
  'campaigns built per cycle': {
    title: 'Campaigns per cycle',
    help: 'How many campaigns are built and launched each cycle. Beyond this is Additional Work.',
  },
  'change and repair hours per cycle': {
    title: 'Repair hours',
    help: 'Hours each cycle covering breakage and minor changes. Beyond them is Additional Work.',
  },
  'changes implemented': {
    title: 'Changes implemented',
    help: 'How many agreed changes are carried out. Further changes are quoted separately.',
  },
  'changes implemented per cycle': {
    title: 'Changes per cycle',
    help: 'How many agreed changes are carried out each cycle. Beyond this is Additional Work.',
  },
  'clarification period': {
    title: 'Clarification period',
    help: 'How long after delivery questions about the document are answered at no cost. Re-running the analysis is Additional Work.',
  },
  'clarification period following delivery': {
    title: 'Clarification period',
    help: 'How long after delivery questions about the document are answered at no cost. Re-running the analysis is Additional Work.',
  },
  'client participants per session': {
    title: 'Client participants',
    help: 'How many people from the Client may attend each session.',
  },
  collections: {
    title: 'Collections',
    help: 'How many product or content collections are created. Beyond this count is Additional Work.',
  },
  'comparable operators reviewed': {
    title: 'Operators reviewed',
    help: 'How many comparable businesses the analysis is measured against.',
  },
  'competitors compared': {
    title: 'Competitors compared',
    help: 'How many competitors the comparison covers.',
  },
  components: {
    title: 'Components',
    help: 'How many components the library holds, with their variants and states. Beyond this count is Additional Work.',
  },
  'concurrent split tests': {
    title: 'Concurrent tests',
    help: 'How many split tests may run at once. More at a time makes attribution unreliable.',
  },
  'connected services configured': {
    title: 'Connected services',
    help: 'How many services are pointed at the domain — mail, site, verification records. Beyond this count is Additional Work.',
  },
  'connected systems': {
    title: 'Connected systems',
    help: 'How many named systems are wired in for lookup or action. Each further system is Additional Work.',
  },
  'conversion events': {
    title: 'Conversion events',
    help: 'How many actions are tracked as conversions. Beyond this count is Additional Work.',
  },
  'conversion goals': {
    title: 'Conversion goals',
    help: 'How many goals the work is aimed at. A second goal usually means a second engagement.',
  },
  'conversion goals analysed': {
    title: 'Goals analysed',
    help: 'How many conversion goals the analysis covers.',
  },
  'conversion goals tracked': {
    title: 'Goals tracked',
    help: 'How many conversion goals are set up for measurement.',
  },
  'correction window': {
    title: 'Correction window',
    help: 'How many days after completion faults in what was delivered are put right at no cost. It does not cover changes of requirement.',
  },
  'coverage days': {
    title: 'Coverage days',
    help: 'The days cover is provided on. Written as it should print — "Monday to Friday".',
  },
  'coverage hours': {
    title: 'Coverage hours',
    help: 'The hours cover is provided in, with the time zone. Written as it should print.',
  },
  'creatives used per cycle': {
    title: 'Creatives per cycle',
    help: 'How many creatives are put to work each cycle. Producing them is a separate Part.',
  },
  currencies: {
    title: 'Currencies',
    help: 'How many currencies the storefront sells in. Each further currency is Additional Work.',
  },
  'dashboards or report views': {
    title: 'Dashboards',
    help: 'How many report views are built. Each further view is Additional Work.',
  },
  'deployment surfaces — site, whatsapp, internal tool': {
    title: 'Deployment surfaces',
    help: 'How many places the assistant is deployed — the site, WhatsApp, an internal tool. Each further surface is Additional Work.',
  },
  'design variants for testing': {
    title: 'Design variants',
    help: 'How many alternative designs are produced for testing. Zero means testing copy and layout only.',
  },
  'destination integrations': {
    title: 'Destinations',
    help: 'How many destinations output is delivered to. Each further destination is Additional Work.',
  },
  'directions developed to completion': {
    title: 'Directions developed',
    help: 'How many of the presented directions are taken through to a finished identity.',
  },
  'domains connected': {
    title: 'Domains connected',
    help: 'How many domains are pointed at the site or inbox.',
  },
  'domains registered': {
    title: 'Domains registered',
    help: "How many domains are bought in the Client's name. The registration fee itself is paid by the Client.",
  },
  'editable content types, where a cms is in scope': {
    title: 'Editable content types',
    help: 'How many kinds of content the Client can edit themselves, where a CMS is in scope. Beyond this count is Additional Work.',
  },
  'example screens': {
    title: 'Example screens',
    help: 'How many screens are assembled from the library to show correct use.',
  },
  'failure response target': {
    title: 'Failure response',
    help: 'How many working days a detected failure is responded to within. It is a response target, not a fix target.',
  },
  fee: {
    title: 'Fee',
    help: 'The price of this Part, as it prints in the contract. When and how it is paid is the Payment row.',
  },
  'form fields': {
    title: 'Form fields',
    help: 'How many fields the form carries. Beyond this count is Additional Work.',
  },
  forms: {
    title: 'Forms',
    help: 'How many forms are built and wired to a destination. Each further form is Additional Work.',
  },
  'generation templates': {
    title: 'Generation templates',
    help: 'How many prompt or generation templates are built, tested and documented.',
  },
  'hypotheses per cycle': {
    title: 'Hypotheses per cycle',
    help: 'How many prioritised ideas are documented and tested each cycle.',
  },
  'initial directions presented': {
    title: 'Initial directions',
    help: 'How many identity directions are presented together at the first stage.',
  },
  'interactions handled per cycle': {
    title: 'Interactions per cycle',
    help: 'How many conversations are handled each cycle. Beyond this is Additional Work.',
  },
  'knowledge base documents at build': {
    title: 'Knowledge documents',
    help: "How many documents the assistant's knowledge base is built from at the outset.",
  },
  languages: {
    title: 'Languages',
    help: 'How many languages the build ships in. Each further language is Additional Work.',
  },
  'logo variants': {
    title: 'Logo variants',
    help: 'How many variants accompany the primary logo — typically horizontal, stacked and icon-only.',
  },
  'mailbox migrations': {
    title: 'Mailbox migrations',
    help: 'How many existing mailboxes are moved across. Zero means new mailboxes only.',
  },
  'mailboxes created': {
    title: 'Mailboxes created',
    help: "How many mailboxes are set up on the Client's domain.",
  },
  'managed spend ceiling': {
    title: 'Spend ceiling',
    help: 'The most advertising spend that may be managed under this fee. Above it the fee is renegotiated.',
  },
  'maximum video length': {
    title: 'Video length',
    help: 'The longest a supplied clip may be, in seconds.',
  },
  'monthly fee': {
    title: 'Monthly fee',
    help: 'What the Client pays each cycle, as it prints. When it is paid is the Payment row.',
  },
  'monthly management fee': {
    title: 'Management fee',
    help: 'What the Client pays each cycle to have the spend managed. It does not include the spend itself.',
  },
  'monthly spend managed, up to': {
    title: 'Spend managed',
    help: 'The most advertising spend covered by this fee. Above it the fee is renegotiated.',
  },
  'names checked for availability': {
    title: 'Names checked',
    help: 'How many preferred names are checked before one is registered.',
  },
  notice: {
    title: 'Notice',
    help: 'How many days written notice either Party gives to end the engagement.',
  },
  'notification destinations': {
    title: 'Alert destinations',
    help: 'How many places failures and alerts are sent to.',
  },
  'output types': {
    title: 'Output types',
    help: 'How many kinds of output the system produces.',
  },
  'page templates': {
    title: 'Page templates',
    help: 'How many distinct page layouts are designed and built. Beyond this count is Additional Work.',
  },
  'page templates customised': {
    title: 'Templates customised',
    help: "How many of the theme's page layouts are adapted to the Client's brand.",
  },
  'page templates reviewed': {
    title: 'Templates reviewed',
    help: 'How many page layouts the heuristic review covers.',
  },
  'page templates, screens or workflows examined': {
    title: 'Templates examined',
    help: 'How many page templates, screens or workflows the audit examines.',
  },
  pages: {
    title: 'Pages',
    help: 'How many pages are designed and built, including any thank-you page.',
  },
  'pages or templates in scope': {
    title: 'Pages in scope',
    help: 'How many pages the maintenance covers. Pages added later are Additional Work.',
  },
  payment: {
    title: 'Payment',
    help: 'How the fee is split and when each part falls due, as it prints.',
  },
  platforms: {
    title: 'Platforms',
    help: 'How many platforms are covered. Each further platform is Additional Work.',
  },
  'platforms — web, ios, android': {
    title: 'Platforms',
    help: 'Which platforms the design system covers — web, iOS, Android. Each further platform is Additional Work.',
  },
  'products uploaded': {
    title: 'Products uploaded',
    help: 'How many products are uploaded and organised. Beyond this count they are quoted per further block.',
  },
  'profile revision rounds': {
    title: 'Profile revisions',
    help: 'How many rounds of changes to the profiles are included.',
  },
  properties: {
    title: 'Properties',
    help: 'How many properties or systems are covered.',
  },
  'properties or systems reviewed': {
    title: 'Properties reviewed',
    help: 'How many properties the review covers — a site, a storefront, a social presence, an automation system.',
  },
  'providers in scope': {
    title: 'Providers in scope',
    help: 'How many providers the work covers.',
  },
  'providers or tools configured': {
    title: 'Providers configured',
    help: 'How many providers or tools are set up and connected.',
  },
  'records across all collections': {
    title: 'Records',
    help: 'How many records may exist across every collection. Beyond this count is Additional Work.',
  },
  'records across all content types': {
    title: 'Records',
    help: 'How many records may exist across every content type. Beyond this count is Additional Work.',
  },
  'redirected domains or subdomains': {
    title: 'Redirected domains',
    help: 'How many extra domains or subdomains are pointed at the main one.',
  },
  'response time target': {
    title: 'Response time',
    help: 'How many working days a request is first responded to within.',
  },
  'response time to a reported fault': {
    title: 'Response time',
    help: 'How many working days a reported fault is responded to within. It is a response target, not a fix target.',
  },
  'revision of the recommendation document': {
    title: 'Document revisions',
    help: 'How many rounds of changes to the delivered document are included.',
  },
  'revision rounds': {
    title: 'Revision rounds',
    help: 'How many rounds of changes are included before further work is billed as Additional Work.',
  },
  'revision rounds on the selected direction': {
    title: 'Revision rounds',
    help: 'How many rounds of changes are included on the direction chosen for development.',
  },
  'revision rounds per change': {
    title: 'Revisions per change',
    help: 'How many rounds of changes each implemented change carries.',
  },
  'revision rounds per item': {
    title: 'Revisions per item',
    help: 'How many rounds of changes each delivered item carries.',
  },
  'rollover of unused capacity': {
    title: 'Capacity rollover',
    help: 'How many further cycles unused capacity carries into before it lapses.',
  },
  'rollover of unused hours': {
    title: 'Hours rollover',
    help: 'How many further cycles unused hours carry into before they lapse.',
  },
  'sample outputs produced at build': {
    title: 'Sample outputs',
    help: 'How many example outputs are produced during the build, as demonstration.',
  },
  'short-form video edits': {
    title: 'Video edits',
    help: 'How many short videos are edited each cycle from footage the Client supplies.',
  },
  'signature formats': {
    title: 'Signature formats',
    help: 'How many email signature formats the template is produced in.',
  },
  'sites maintained': {
    title: 'Sites maintained',
    help: 'How many sites this fee maintains. A second site is a second Part.',
  },
  'slides per carousel': {
    title: 'Slides per carousel',
    help: 'The most slides a carousel may hold and still count as a single post.',
  },
  'static posts or carousels': {
    title: 'Posts or carousels',
    help: 'How many static posts or carousels are produced each cycle.',
  },
  stories: {
    title: 'Stories',
    help: 'How many stories are produced each cycle.',
  },
  'strategic questions addressed': {
    title: 'Strategic questions',
    help: 'How many questions the sprint sets out to answer. One is the point of a sprint.',
  },
  support: {
    title: 'Support',
    help: 'How many days after acceptance defects are fixed at no cost. It covers faults, not changes of requirement.',
  },
  'supporting brand elements': {
    title: 'Brand elements',
    help: 'How many supporting elements accompany the identity — pattern, texture, graphic device.',
  },
  'systems monitored': {
    title: 'Systems monitored',
    help: 'How many systems are watched for failure and interruption.',
  },
  'territories or markets': {
    title: 'Territories or markets',
    help: 'How many markets the work covers.',
  },
  'test cases': {
    title: 'Test cases',
    help: 'How many representative cases the build is tested against before handover.',
  },
  themes: {
    title: 'Themes',
    help: 'How many themes are set up. The theme is chosen before work begins; changing it afterwards is Additional Work.',
  },
  'themes, including dark mode': {
    title: 'Themes',
    help: 'How many themes the design system defines, dark mode included.',
  },
  'third-party embeds or integrations': {
    title: 'Third-party embeds',
    help: 'How many outside tools are embedded or connected. Their subscription costs are the Client’s.',
  },
  'third-party integrations': {
    title: 'Integrations',
    help: 'How many outside services are connected. Each further one is Additional Work.',
  },
  timeline: {
    title: 'Timeline',
    help: "How long the work takes, as it prints. It runs from receipt of the Client's inputs, not from signature.",
  },
  'trigger types per workflow': {
    title: 'Trigger types',
    help: 'How many kinds of event may start each workflow.',
  },
  typefaces: {
    title: 'Typefaces',
    help: 'How many typefaces the identity selects, with weights and usage rules.',
  },
  'verification applications': {
    title: 'Verification applications',
    help: 'How many verification applications are submitted, where the Client qualifies. The outcome is the platform’s.',
  },
  'walkthrough sessions': {
    title: 'Walkthrough sessions',
    help: 'How many live sessions are held to talk through what was delivered.',
  },
  workflows: {
    title: 'Workflows',
    help: 'How many workflows are designed and built. Each further workflow is Additional Work.',
  },
  'working sessions': {
    title: 'Working sessions',
    help: 'How many live working sessions the sprint includes.',
  },
};

/** Keyed by blank key, for figures written into a sentence. */
export const PROSE_META: Record<string, BlankMeta> = {
  // Master Service Agreement
  'msa.8#0': {
    title: 'Payment period',
    help: 'How long the Client has to pay an invoice that states no period of its own.',
  },
  'msa.8#1': {
    title: 'Interest-free days',
    help: 'How long a sum may stay unpaid past its due date before interest begins to accrue.',
  },
  'msa.8#2': {
    title: 'Interest rate',
    help: 'The monthly rate charged on an overdue sum, capped by law and waivable at Qera’s discretion.',
  },
  'msa.13#0': {
    title: 'Confidentiality term',
    help: 'How long confidentiality survives the end of the Agreement. Trade secrets are excluded and last indefinitely.',
  },
  'msa.22#0': {
    title: 'Force majeure limit',
    help: 'How long a force-majeure event may continue before either Party may terminate the affected engagement.',
  },
  'msa.23#0': {
    title: 'Non-solicit period',
    help: "How long after termination neither Party may solicit the other's people.",
  },
  'msa.23#1': {
    title: 'Non-solicit penalty',
    help: "The share of the person's annual remuneration payable if the non-solicitation clause is breached, as a pre-estimate of loss.",
  },
  'msa.24#0': {
    title: 'Breach cure period',
    help: 'How long a Party has to remedy a curable material breach before the other may terminate.',
  },
  'msa.24#1': {
    title: 'Performance cure period',
    help: 'How long Qera has to put right persistent failure to perform before the Client may terminate immediately.',
  },
  'msa.25#0': {
    title: 'Handover deadline',
    help: "How long Qera has, after termination, to deliver paid-for work and return the Client's materials.",
  },
  'msa.25#1': {
    title: 'Refund deadline',
    help: 'How long Qera has to refund any sum held above what was payable at termination.',
  },
  'msa.26#0': {
    title: 'Discussion period',
    help: 'How long the Parties must try to settle a dispute between senior representatives before arbitration.',
  },
  'msa.26#1': {
    title: 'Arbitrator agreement',
    help: 'How long the Parties have to agree a sole arbitrator before the court appoints one.',
  },

  // Schedule A — Setup
  'sch.setup.5#0': {
    title: 'Access release',
    help: "How long after the Client's written request Qera gives up its administrative access.",
  },
  'sch.setup.10#0': {
    title: 'Correction window',
    help: 'How long after completion faults in the configuration are put right at no cost. Not changes of requirement, not third-party failures.',
  },

  // Schedule B — Build
  'sch.build.2#0': {
    title: 'Advance share',
    help: 'The share of each Build fee payable before work starts.',
  },
  'sch.build.2#1': {
    title: 'Balance share',
    help: 'The share payable on completion, before deployment, launch or handover.',
  },
  'sch.build.2#2': {
    title: 'Milestone threshold',
    help: 'The engagement size above which the fee may be split into milestones, so neither Party carries a large unpaid balance.',
  },
  'sch.build.4#0': {
    title: 'Revision rounds',
    help: 'How many rounds of Revision every Build Part includes by default. A Part may state its own.',
  },
  'sch.build.5#0': {
    title: 'Acceptance window',
    help: 'How long the Client has, after notice, to say in writing where the work does not conform.',
  },
  'sch.build.8#0': {
    title: 'Support period',
    help: 'How long after acceptance defects are fixed at no cost.',
  },
  'sch.build.9#0': {
    title: 'Grace period',
    help: 'How long a sum may stay unpaid past its due date before Qera may serve written notice.',
  },
  'sch.build.9#1': {
    title: 'Suspension notice',
    help: 'How long after that notice the sum may remain outstanding before work is suspended.',
  },
  'sch.build.10#0': {
    title: 'Excess refund',
    help: 'How long Qera has to refund an advance held above what was payable on termination.',
  },
  'sch.build.10#1': {
    title: 'Refund on exit',
    help: 'How long Qera has to refund the excess where it terminates for a reason other than non-payment or breach.',
  },

  // Schedule C — Retainer
  'sch.retainer.4#0': {
    title: 'Grace period',
    help: 'How long a cycle may run unpaid before the terms on late payment and pausing apply.',
  },
  'sch.retainer.5#0': {
    title: 'Capacity rollover',
    help: 'How many further cycles capacity unused through the Client carries into before it lapses.',
  },
  'sch.retainer.6#0': {
    title: 'Feedback window',
    help: 'How long the Client has to send consolidated feedback before a submission counts as approved.',
  },
  'sch.retainer.10#0': {
    title: 'Handover period',
    help: 'How long after the engagement ends Qera has to hand over what is owed.',
  },
  'sch.retainer.11#0': {
    title: 'Notice period',
    help: 'How much written notice either Party gives to end a retainer.',
  },

  // Schedule D — Audit
  'sch.audit.5#0': {
    title: 'Clarification period',
    help: 'How long after delivery questions on the deliverable are answered at no cost. Re-running the analysis is Additional Work.',
  },
  'sch.audit.10#0': {
    title: 'Refund period',
    help: 'How long Qera has to refund any balance held above the work performed, where the engagement ends before delivery.',
  },

  // 01 Domain and DNS
  'part.01.included#0': {
    title: 'Names checked',
    help: 'How many preferred names are checked for availability before one is registered.',
  },
  'part.01.included#1': {
    title: 'Domains registered',
    help: "How many domains are bought in the Client's name.",
  },
  'part.01.included#2': {
    title: 'Redirected domains',
    help: 'How many extra domains or subdomains are pointed at the main one, where the Client supplies them.',
  },

  // 02 Business email and workspace
  'part.02.included#0': {
    title: 'Mailboxes',
    help: "How many mailboxes are created on the Client's domain.",
  },
  'part.02.included#1': {
    title: 'Aliases or groups',
    help: 'How many shared addresses or team groups are created.',
  },
  'part.02.included#2': {
    title: 'Signature formats',
    help: 'How many formats the email signature template is applied to.',
  },

  // 03 Analytics and tracking
  'part.03.included#0': {
    title: 'Conversion events',
    help: 'How many actions are configured as tracked conversions.',
  },
  'part.03.included#1': {
    title: 'Advertising pixels',
    help: 'How many advertising platforms get a tracking pixel installed.',
  },
  'part.03.included#2': {
    title: 'Cross-domain setup',
    help: 'How many additional domains cross-domain tracking is configured for.',
  },
  'part.03.included#3': {
    title: 'Report views',
    help: 'How many dashboards or report views cover the configured events.',
  },

  // 04 Social account setup and verification
  'part.04.included#0': {
    title: 'Handles checked',
    help: 'How many platforms the handle availability check covers.',
  },
  'part.04.included#1': {
    title: 'Accounts created',
    help: 'How many platforms accounts are created on.',
  },
  'part.04.included#2': {
    title: 'Verification applications',
    help: "How many verification applications are submitted per platform, where the Client qualifies. The outcome is the platform's.",
  },

  // 05 Shopify storefront
  'part.05.included#0': {
    title: 'Products uploaded',
    help: 'How many products are uploaded and organised. Further products are quoted per block.',
  },
  'part.05.limitsNotes#0': {
    title: 'Extra product block',
    help: 'The block size further products are quoted in, once the included count is used up.',
  },

  // 06 Custom web build
  'part.06.included#0': {
    title: 'Page templates',
    help: 'How many distinct page layouts are designed.',
  },
  'part.06.included#1': {
    title: 'Editable content types',
    help: 'How many kinds of content the Client can edit themselves, where a CMS is in scope.',
  },
  'part.06.included#2': {
    title: 'Form destinations',
    help: 'How many named destinations the contact or enquiry form delivers to.',
  },
  'part.06.account#0': {
    title: 'Migration window',
    help: 'How long Qera has to migrate the deployment or hand over a complete export once asked. This is the anti-lock-in promise — shortening it weakens it.',
  },

  // 07 Webflow or Framer site
  'part.07.included#0': {
    title: 'Page templates',
    help: 'How many page layouts are designed and built on the visual platform.',
  },
  'part.07.included#1': {
    title: 'Content types',
    help: 'How many collection or CMS content types are set up, where the plan supports it.',
  },

  // 08 Landing page or funnel
  'part.08.included#0': {
    title: 'Pages',
    help: 'How many pages are built, including any thank-you or confirmation page.',
  },
  'part.08.included#1': {
    title: 'Form destinations',
    help: 'How many named destinations the lead capture form delivers to.',
  },
  'part.08.included#2': {
    title: 'CRM destinations',
    help: "How many named email or CRM destinations are connected, where the Client's account is provided.",
  },

  // 09 Brand identity
  'part.09.included#0': {
    title: 'Initial directions',
    help: 'How many identity directions are presented together at the first stage.',
  },
  'part.09.included#1': {
    title: 'Directions developed',
    help: 'How many of the presented directions are taken through to completion.',
  },
  'part.09.included#2': {
    title: 'Logo variants',
    help: 'How many variants accompany the primary logo — typically horizontal, stacked and icon-only.',
  },
  'part.09.included#3': {
    title: 'Typefaces',
    help: 'How many typefaces are selected, with their weights and usage rules.',
  },
  'part.09.included#4': {
    title: 'Brand elements',
    help: 'How many supporting elements accompany the identity — pattern, texture, graphic device.',
  },

  // 10 Design system
  'part.10.included#0': {
    title: 'Components',
    help: 'How many components the library holds, with their variants and states.',
  },
  'part.10.included#1': {
    title: 'Breakpoints',
    help: 'How many screen widths responsive behaviour is defined at.',
  },
  'part.10.included#2': {
    title: 'Example screens',
    help: 'How many screens are assembled from the library to demonstrate correct use.',
  },

  // 11 Conversion optimisation build
  'part.11.included#0': {
    title: 'Months of data',
    help: 'How many months of existing analytics the review covers.',
  },
  'part.11.included#1': {
    title: 'Templates reviewed',
    help: 'How many key page templates the heuristic review covers.',
  },
  'part.11.included#2': {
    title: 'Changes implemented',
    help: 'How many agreed changes are carried out.',
  },

  // 12 Automation build
  'part.12.included#0': {
    title: 'Workflows',
    help: 'How many workflows are designed and documented before build.',
  },
  'part.12.included#1': {
    title: 'Connected systems',
    help: 'How many named systems the workflows connect to.',
  },
  'part.12.included#2': {
    title: 'Alert destinations',
    help: 'How many named destinations failure notifications are sent to.',
  },

  // 13 AI assistant build
  'part.13.included#0': {
    title: 'Knowledge documents',
    help: 'How many documents or pages the knowledge base is built from.',
  },
  'part.13.included#1': {
    title: 'Connected systems',
    help: 'How many named systems the assistant can look up or act on.',
  },
  'part.13.included#2': {
    title: 'Test cases',
    help: 'How many representative cases the assistant is tested against.',
  },

  // 14 Generative content system
  'part.14.included#0': {
    title: 'Generation templates',
    help: 'How many prompt or generation templates are built, tested and documented.',
  },
  'part.14.included#1': {
    title: 'Sample outputs',
    help: 'How many example outputs are produced during the build.',
  },

  // 15 Content production
  'part.15.included#0': {
    title: 'Posts or carousels',
    help: 'How many static posts or carousels are produced each cycle.',
  },
  'part.15.included#1': {
    title: 'Stories',
    help: 'How many stories are produced each cycle.',
  },
  'part.15.included#2': {
    title: 'Video edits',
    help: 'How many short videos are edited each cycle from Client-supplied footage.',
  },
  'part.15.limitsNotes#0': {
    title: 'Posts per carousel',
    help: 'How many posts one carousel counts as against the static post allowance.',
  },
  'part.15.limitsNotes#1': {
    title: 'Slides per carousel',
    help: 'The most slides a carousel may hold and still count as a single post.',
  },

  // 16 Community management
  'part.16.included#0': {
    title: 'Response time',
    help: 'How many working days a message is responded to within, during the agreed days and hours.',
  },
  'part.16.included#1': {
    title: 'Interactions',
    help: 'How many interactions are handled each cycle.',
  },

  // 17 Paid social management
  'part.17.included#0': {
    title: 'Campaigns',
    help: 'How many campaigns are built and launched each cycle.',
  },
  'part.17.included#1': {
    title: 'Creatives used',
    help: 'How many creatives are put to work each cycle. Producing them is a separate Part.',
  },

  // 18 Website maintenance
  'part.18.included#0': {
    title: 'Backups per week',
    help: 'How many full backups are taken each week.',
  },
  'part.18.included#1': {
    title: 'Backup retention',
    help: 'How many days a backup is kept before it is overwritten.',
  },
  'part.18.included#2': {
    title: 'Alert destinations',
    help: 'How many named destinations uptime alerts are sent to.',
  },
  'part.18.included#3': {
    title: 'Change hours',
    help: 'Hours of content or minor change work included each cycle.',
  },
  'part.18.account#0': {
    title: 'Repair hours',
    help: 'Hours each cycle covering breakage caused by a plugin, dependency or platform update. Beyond that it is Additional Work.',
  },

  // 19 Conversion optimisation retainer
  'part.19.included#0': {
    title: 'Hypotheses',
    help: 'How many prioritised ideas are documented before work begins each cycle.',
  },
  'part.19.included#1': {
    title: 'Changes implemented',
    help: 'How many changes are carried out each cycle.',
  },
  'part.19.account#0': {
    title: 'Traffic floor',
    help: 'The visitors per cycle below which results cannot be attributed with confidence and reporting is directional. The Client acknowledges this before starting.',
  },

  // 20 AI system operation
  'part.20.included#0': {
    title: 'Systems monitored',
    help: 'How many systems are watched for failure and interruption.',
  },
  'part.20.included#1': {
    title: 'Response time',
    help: 'How many working days a failure is responded to within, from detection or report.',
  },
  'part.20.included#2': {
    title: 'Adjustment hours',
    help: 'Hours of tuning or configuration change included each cycle.',
  },

  // 21 Audit or teardown
  'part.21.included#0': {
    title: 'Properties reviewed',
    help: 'How many properties the audit covers — a site, storefront, social presence, automation system or brand presence.',
  },
  'part.21.included#1': {
    title: 'Templates examined',
    help: 'How many page templates, screens or workflows the audit examines.',
  },
  'part.21.included#2': {
    title: 'Months of data',
    help: 'How many months of analytics the review covers, where access is provided.',
  },
  'part.21.included#3': {
    title: 'Competitors',
    help: 'How many competitors or comparable operators the comparison covers.',
  },
  'part.21.included#4': {
    title: 'Walkthrough sessions',
    help: 'How many live sessions are held to talk through the findings.',
  },
  'part.21.included#5': {
    title: 'Session length',
    help: 'How long each walkthrough session runs, in minutes.',
  },
  'part.21.receives#0': {
    title: 'Clarification period',
    help: 'How long after delivery questions about the document are answered at no cost.',
  },

  // 22 Strategy sprint
  'part.22.included#0': {
    title: 'Strategic questions',
    help: 'How many questions the sprint sets out to answer, agreed in writing before it starts.',
  },
  'part.22.included#1': {
    title: 'Working sessions',
    help: 'How many live working sessions the sprint includes.',
  },
  'part.22.included#2': {
    title: 'Session length',
    help: 'How long each working session runs, in minutes.',
  },
  'part.22.included#3': {
    title: 'Client participants',
    help: 'How many people from the Client may attend each session.',
  },
  'part.22.included#4': {
    title: 'Comparable operators',
    help: 'How many comparable operators the market and competitor context covers.',
  },
  'part.22.receives#0': {
    title: 'Clarification period',
    help: 'How long after delivery questions about the document are answered at no cost.',
  },
};

/** The subject of a label, dropping whatever qualifies it after a dash or comma. */
function subject(label: string): string {
  return label.split(/[—,(]/)[0].trim();
}

/**
 * The title and explanation for one figure.
 *
 * Falls back rather than throwing: a Service seeded with a label nobody has
 * written copy for still renders an editable field, labelled as best it can be.
 * `blankMeta.test.ts` is what stops that happening — a runtime crash here would
 * take out a real contract over a missing sentence.
 */
export function blankMeta(key: string, rowLabel?: string, text = ''): BlankMeta {
  if (rowLabel !== undefined) {
    return ROW_META[rowLabel.trim().toLowerCase()] ?? { title: subject(rowLabel), help: rowLabel };
  }
  return PROSE_META[key] ?? { title: 'Figure', help: blankLabel(text) };
}
