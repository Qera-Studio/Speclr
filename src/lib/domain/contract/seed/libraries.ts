/**
 * Seed for the two shared libraries — exclusions (91 lines) and client inputs
 * (65 lines). Transcribed from `docs/contract-content.md` §6 and §7.
 *
 * These seed the database and are then owned by it: both libraries are meant to
 * grow. Contract-system.md §6 calls that growth the actual value of the system —
 * after every project, whatever the Client assumed was included but was not
 * becomes a line here, and appears on every future contract automatically.
 *
 * Two rules travel with them:
 *
 * **Exclusions are opt-out.** Every exclusion attached to a ticked service
 * renders pre-ticked as excluded; you untick to bring something into scope.
 * That inverts the failure mode — forgetting to exclude something no longer
 * means owing it.
 *
 * **Never delete, archive.** An archived line leaves new contracts but stays
 * readable, and contracts already generated hold their own copy regardless.
 */

import type { LibraryLine } from '../service';

type Entry = [id: string, text: string];

function lines(category: string, entries: Entry[]): LibraryLine[] {
  return entries.map(([id, text]) => ({ id, text, category, archived: false }));
}

export const EXCLUSIONS: LibraryLine[] = [
  ...lines('content', [
    ['E01', 'Copywriting of any kind'],
    ['E02', 'Product photography, retouching or image editing'],
    ['E03', 'Video production, filming or editing'],
    ['E04', 'Translation or multilingual content'],
    ['E05', 'Content migration from an existing site or platform'],
    ['E06', 'Sourcing or licensing of stock imagery, video or music'],
    ['E07', 'Scriptwriting or storyboarding'],
    ['E08', 'Proofreading of Client-supplied copy'],
  ]),
  ...lines('design', [
    ['E09', 'Brand identity, logo design or visual system creation'],
    ['E10', 'Print or packaging design'],
    ['E11', 'Illustration or custom iconography'],
    ['E12', 'Animation or motion beyond what the selected theme or framework provides'],
    ['E13', 'Design of pages or screens beyond the stated count'],
    ['E14', 'Presentation or pitch deck design'],
  ]),
  ...lines('technical', [
    ['E15', 'Custom app or backend development'],
    ['E16', 'Theme or template code written from scratch'],
    ['E17', "Custom checkout beyond the platform's native settings"],
    ['E18', 'Subscription, wholesale, B2B or marketplace functionality'],
    ['E19', 'Multi-currency, multi-language or multi-region setup'],
    ['E20', 'Migration of products, customers or orders from another platform'],
    ['E21', 'Data import beyond the stated record count'],
    ['E22', 'Integration with any system not named in this part'],
    ['E23', 'Server, container or infrastructure provisioning'],
    ['E24', 'Database design or migration'],
    ['E25', 'Accessibility remediation to a stated WCAG level'],
    ['E26', 'Load testing or performance guarantees under stated traffic'],
    ['E27', 'Penetration testing or security audit'],
    ['E28', 'Source code for internal frameworks, libraries or reusable systems'],
  ]),
  ...lines('platform', [
    ['E29', 'Paid plugins, apps, extensions or their configuration'],
    ['E30', 'Platform subscription costs of any kind'],
    ['E31', 'Domain registration, renewal or transfer fees'],
    ['E32', 'Account verification, badge or blue-tick outcomes'],
    ['E33', 'Payment gateway approval or merchant account approval'],
    ['E34', 'Resolution of platform bans, restrictions or policy actions'],
    ['E35', 'Compatibility with platform features released after handover'],
    ['E36', 'Commercial font licences'],
    ['E37', 'API usage costs, model costs or compute costs'],
  ]),
  ...lines('marketing', [
    ['E38', 'Advertising spend of any kind'],
    ['E39', 'Paid advertising strategy, setup or management'],
    ['E40', 'Influencer identification, outreach or fees'],
    [
      'E41',
      "SEO beyond the platform's native fields — no keyword research, backlinks, content strategy or technical audit",
    ],
    ['E42', 'Analytics, pixel or conversion tracking configuration'],
    ['E43', 'Email marketing setup, flows or templates'],
    ['E44', 'Press, PR or media outreach'],
    ['E45', 'Competitor research or market analysis'],
    ['E46', 'Guarantees of reach, followers, rankings, conversions or revenue'],
  ]),
  ...lines('support', [
    ['E47', 'Ongoing maintenance, content updates or uploads after handover'],
    ['E48', 'Training beyond the single handover walkthrough'],
    ['E49', 'Written documentation or user manuals'],
    ['E50', 'Support for issues caused by Client or third-party modifications after handover'],
    ['E51', 'Third-party app or plugin troubleshooting'],
    ['E52', 'Emergency or out-of-hours response'],
    ['E53', 'Hosting, uptime monitoring or backups'],
    ['E54', 'Legal, tax or compliance review of any deliverable'],
    ['E55', 'Community management, moderation or inbox handling'],
    ['E56', 'Response-time commitments'],
    ['E57', 'Recovery of accounts, credentials or data the Client has lost'],
    ['E58', 'Work on any platform, channel or property not named in this part'],
  ]),
  ...lines('brand', [
    ['E59', 'Naming, tagline or verbal identity development'],
    [
      'E60',
      'Formal trademark clearance, filing, registration, or any legal assurance of registrability',
    ],
    ['E61', 'Brand strategy research, workshops or stakeholder interviews'],
    ['E62', 'Code implementation of design components'],
    ['E63', 'Maintenance, versioning or extension of delivered assets after handover'],
  ]),
  ...lines('optimisation', [
    ['E64', 'Running, monitoring or analysing split tests over time'],
    ['E65', 'Copy testing, messaging research or user interviews'],
    ['E66', 'Rebuild or restructure of the underlying site, template or platform'],
  ]),
  ...lines('ai', [
    ['E67', 'Model training, fine-tuning or dataset preparation'],
    ['E68', 'Guarantee of accuracy, consistency, originality or repeatable output'],
    ['E69', 'Human review or approval of generated output before it is used'],
    ['E70', 'Continued operation where a provider changes pricing, policy, model or availability'],
    ['E71', 'Regulatory, legal, medical or financial compliance review of generated output'],
    ['E72', 'Data cleaning, labelling, structuring or migration'],
    ['E73', 'Rate limit increases, enterprise access or provider account approvals'],
  ]),
  ...lines('social', [
    [
      'E74',
      "Responding on the Client's behalf to anything requiring a commercial decision, refund, discount, order change or legal position",
    ],
    ['E75', 'Crisis communication, reputation management or public statements of fault'],
    ['E76', 'Coverage outside the stated days and hours, including weekends and real-time response'],
    ['E77', 'Any platform, channel or activity not ticked on the platform matrix'],
    ['E78', "Funding, advancing or holding advertising spend on the Client's behalf"],
    ['E79', 'Landing page, destination or funnel creation for campaigns'],
    ['E80', 'Audience list creation, purchase, enrichment or customer data supply'],
    [
      'E81',
      'Sales, order processing, payment handling or transaction support through social channels',
    ],
  ]),
  ...lines('maintenance', [
    ['E82', 'Recovery from hacking, malware, defacement or data breach'],
    ['E83', 'Migration to a different platform, host, stack or provider'],
    ['E84', 'Writing content or creating pages as part of maintenance'],
    ['E85', 'Guarantee of uptime, availability, load speed or resolution time'],
    ['E86', 'Statistically reliable results where traffic volume is insufficient to support them'],
  ]),
  ...lines('setup', [
    ['E87', 'Email deliverability, inbox placement or sender reputation outcomes'],
    ['E88', 'Cookie consent, privacy notices or data protection compliance implementation'],
    ['E89', 'Backfill or import of historic data into a newly created property'],
    ['E90', 'Recovery of accounts, handles or domains held or controlled by a third party'],
    ['E91', 'Creation of profile imagery, bio copy or launch content for new accounts'],
  ]),
];

export const CLIENT_INPUTS: LibraryLine[] = [
  ...lines('access', [
    [
      'I01',
      "Platform account access, or written authority to create an account on the Client's behalf",
    ],
    ['I02', 'Domain registrar access, or written authority to purchase'],
    ['I03', 'Hosting or DNS access'],
    ['I04', 'Payment gateway account details'],
    ['I05', 'Social platform account access for each named platform'],
    ['I06', 'Email or workspace admin access'],
    ['I07', 'Analytics and advertising account access'],
    ['I08', 'Access to any existing system being integrated with'],
  ]),
  ...lines('content', [
    ['I09', 'All written copy for every page or asset in scope'],
    ['I10', 'Product images at usable resolution'],
    ['I11', 'Product names, descriptions, prices, variants and stock quantities'],
    ['I12', 'Brand photography or approved image library'],
    ['I13', 'Video or raw footage where video is in scope'],
    ['I14', 'Testimonials, reviews or case study material'],
    ['I15', 'Team names, roles, photos and biographies'],
    ['I16', 'Pricing, packages or service descriptions'],
  ]),
  ...lines('brand', [
    ['I17', 'Logo files in vector format'],
    ['I18', 'Font files or commercial font licences'],
    ['I19', 'Colour references'],
    ['I20', 'Existing brand guidelines, where they exist'],
    ['I21', 'Tone of voice reference or examples'],
  ]),
  ...lines('legal', [
    ['I22', 'Shipping policy copy'],
    ['I23', 'Returns and refunds policy copy'],
    ['I24', 'Privacy policy copy'],
    ['I25', 'Terms and conditions copy'],
    ['I26', 'Registered business name, address and tax details'],
    ['I27', 'Confirmation of ownership or usage rights for all supplied materials'],
  ]),
  ...lines('operational', [
    ['I28', 'A single named person with authority to approve'],
    ['I29', 'A named backup approver'],
    ['I30', 'Preferred communication channel'],
    ['I31', 'Any fixed launch date and the reason for it'],
    ['I32', 'List of stakeholders who must review before approval'],
  ]),
  ...lines('strategic', [
    ['I33', 'Target audience description'],
    ['I34', 'Named competitors or reference brands'],
    ['I35', 'Visual references — sites, brands or work the Client likes'],
    ['I36', 'Visual anti-references — work the Client explicitly does not want'],
    ['I37', 'Business goal for this engagement, stated in one sentence'],
    ['I38', 'Existing performance data, where available'],
    ['I39', 'Named platforms in scope, where the service covers multiple'],
    ['I40', 'Posting frequency and content mix, where content is in scope'],
    ['I41', 'Escalation contact for anything time-sensitive'],
  ]),
  ...lines('existing', [
    ['I42', 'Existing logo files and prior brand work, where this is a redesign'],
    ['I43', "Written confirmation that trademark clearance is the Client's responsibility"],
    ['I44', 'Administrative access to the existing site or platform being modified'],
    ['I45', 'Historic analytics data covering at least the stated period'],
    ['I46', 'Existing component library or design files, where they exist'],
  ]),
  ...lines('ai', [
    ['I47', 'Provider account access and a billing method for usage costs'],
    ['I48', 'Written list of systems and data sources the build may access'],
    ['I49', 'Sample data representative of live conditions'],
    ['I50', 'A named person accountable for reviewing output before it is used'],
    [
      'I51',
      'Written identification of any data that must not be sent to a third-party provider',
    ],
  ]),
  ...lines('social', [
    ['I52', 'Completed platform matrix — platforms and activities in scope'],
    [
      'I53',
      "Approved response set covering common questions and the Client's position on each",
    ],
    ['I54', "Advertising payment method registered on the Client's own ad account"],
    ['I55', 'Coverage days and hours for community response'],
    ['I56', 'Escalation path for complaints, refunds and sensitive messages'],
    ['I57', 'Campaign objective and budget for the cycle, confirmed in writing before it begins'],
  ]),
  ...lines('maintenance', [
    ['I58', 'Hosting, platform and CMS administrative access for maintenance'],
    ['I59', 'Preferred backup location and retention period'],
    ['I60', 'Current monthly traffic figures for the pages in scope'],
  ]),
  ...lines('setup', [
    ['I61', 'Preferred domain names, in priority order'],
    ['I62', 'List of mailboxes, aliases and groups to be created'],
    ['I63', 'Existing DNS records that must be preserved'],
    ['I64', 'Preferred handles for each platform, in priority order'],
    ['I65', 'Business documentation required for verification, where applicable'],
  ]),
];
