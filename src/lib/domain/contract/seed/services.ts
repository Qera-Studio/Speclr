/**
 * Seed for the Services library. Transcribed from `docs/contract-content.md`
 * §4, §4b and §4f.
 *
 * Three of the twenty-two, deliberately: contract-system.md §12 loads Parts 01,
 * 02 and 05 first to prove the schema holds. All three sit under the Build
 * Schedule, and if all three fit without adding a field, the shape is right and
 * the remaining nineteen are mechanical. `sortOrder` follows the canonical
 * ordering in §3 — gaps here are the services not yet loaded, not an error.
 *
 * These seed the database and are then owned by it. Editing a Service in admin
 * afterwards must never change a contract already generated; a contract holds
 * its own copy of every Part it includes.
 *
 * `[bracketed]` values are blanks and are left exactly as drafted.
 */

import type { ContractService } from '../service';

export const SERVICES: ContractService[] = [
  {
    code: '01',
    name: 'Shopify storefront',
    scheduleKey: 'build',
    sortOrder: 1,
    archived: false,
    dependencies: [],
    pairings: ['17', '19', '05'],
    overview: [
      "Setup, customisation and deployment of a Shopify storefront, built on a selected Shopify theme and adapted to the Client's brand. The result is a live, responsive store ready to take orders.",
    ],
    included: [
      'Store setup and configuration',
      'Selection and customisation of one Shopify theme',
      'Homepage build',
      'Collection page and product page templates',
      'Navigation and menu structure',
      "Cart and checkout configuration within Shopify's native settings",
      "Shipping zones, tax settings and payment method setup using the Client's accounts",
      'Policy pages populated with Client-supplied copy',
      'Mobile and tablet responsiveness',
      'Shopify-native SEO fields — titles, descriptions, alt text, URL structure',
      'Upload and organisation of up to [50] products',
      'Testing across current versions of major browsers',
      "Deployment to the Client's domain",
      'One handover walkthrough',
    ],
    accountTerms: [
      "The store is built either on the Client's own Shopify account, or on a development store that is transferred to the Client's account before launch. Either way, the Client owns the store from launch and holds the account.",
      'Qera Private Limited holds staff access during the build and for the support window. Access is removed on request or at the end of the support window, whichever occurs first.',
      "The Shopify subscription is paid by the Client directly. Where a paid theme is used, the licence is purchased in the Client's name and belongs to the Client.",
    ],
    limits: [
      { label: 'Page templates customised', value: '[8]' },
      { label: 'Products uploaded', value: '[50]' },
      { label: 'Collections', value: '[10]' },
      { label: 'Themes', value: '[1], selected before start' },
      { label: 'Revision rounds', value: '[3]' },
      { label: 'Languages', value: '[1]' },
      { label: 'Currencies', value: '[1]' },
    ],
    limitsNotes: [
      'Anything beyond these is Additional Work.',
      'Page templates are the counted unit for design and build. Products and collections are counted separately because they use an existing template and represent upload rather than design. Fifty products is one product template, not fifty pages.',
      'A page that cannot be produced from an approved template counts as a new template.',
      'Product upload beyond the stated count is quoted per additional block of [25] products.',
    ],
    completion: [
      "The store is live on the Client's domain, orders can be placed end to end through a test transaction, all pages listed above exist and display correctly on current desktop and mobile browsers, and the stated number of products are uploaded and organised.",
      'Small rendering differences between browsers, devices and operating systems are normal and do not indicate incomplete work.',
    ],
    receives: [
      'Full ownership of the Shopify store and account',
      'All customisations, which live inside the store and transfer with it',
      "The theme licence, in the Client's name",
      'Any Figma design file produced for this project, as a .fig file',
      'All final image and graphic assets produced by Qera Private Limited for this store',
      'A handover walkthrough covering how to add products, edit pages and manage orders',
    ],
    receivesNotes: [
      'There is no separate code repository for this engagement. Theme customisations exist within the Shopify store and are handed over with it.',
    ],
    thirdPartyCosts:
      'Shopify subscription · domain registration and renewal · paid theme, if used · any paid apps · payment gateway and transaction fees · fonts requiring a commercial licence · stock imagery, if used',
    exclusionIds: [
      'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E12', 'E13', 'E14', 'E15', 'E16',
      'E17', 'E18', 'E19', 'E20', 'E21', 'E22', 'E33', 'E34', 'E35', 'E41', 'E42',
    ],
    clientInputIds: ['I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08', 'I09', 'I10'],
    fee: [
      { label: 'Fee', value: '[ ]' },
      { label: 'Payment', value: '[50%] on signing, [50%] before launch' },
      { label: 'Timeline', value: '[3] weeks from start date' },
      { label: 'Support', value: '[30] days from acceptance' },
    ],
  },
  {
    code: '02',
    name: 'Custom web build',
    scheduleKey: 'build',
    sortOrder: 2,
    archived: false,
    dependencies: [],
    pairings: ['17', '18', '19', '05'],
    overview: [
      'Design and development of a custom website built in code rather than on a visual builder or storefront platform. The Client receives a live site, the repository containing it, and the ability to have it maintained by any competent developer.',
      'Use this Part where the work involves writing code. Where the site is assembled on a visual builder, use Part 03. Where the site is a storefront, use Part 01.',
    ],
    included: [
      'Technical architecture and stack selection',
      'Page design for up to [10] page templates',
      'Front-end development of all designed templates',
      'Responsive implementation across mobile, tablet and desktop',
      'Content management setup for up to [3] editable content types, where a CMS is in scope',
      'Navigation, routing and URL structure',
      'Contact or enquiry form with delivery to [1] named destination',
      'Standard technical SEO — metadata, sitemap, robots file, semantic markup, canonical URLs',
      'Basic performance optimisation — image handling, code splitting, caching headers',
      "Deployment to the Client's hosting account",
      'Repository handover',
      'One handover walkthrough',
    ],
    accountTerms: [
      'Hosting takes one of two forms, selected before start.',
      "Where the Client hosts, the site is deployed to a hosting account in the Client's name. Where the account is created by Qera Private Limited, it is created in the Client's name and belongs to the Client from creation.",
      "Where Qera Private Limited hosts — available only alongside Part 14 — the site runs on infrastructure managed by Qera Private Limited, and hosting cost is included in the Part 14 fee. The Client is not locked in by this arrangement: on request or on ending, Qera Private Limited shall migrate the deployment to an account of the Client's choosing, or provide a complete export and configuration record sufficient for any competent developer to redeploy it, within [14 days] and at no charge.",
      'The repository is created in a Qera Private Limited organisation during development and transferred to the Client on receipt of full payment.',
      'Qera Private Limited retains ownership of its internal starter framework, component library and reusable systems. Where these form part of the delivered site, the Client receives a perpetual, non-exclusive, royalty-free licence to use, modify and host them as part of this site. The Client does not receive the right to redistribute, resell or reuse them in a separate project. This licence is granted on full payment and cannot be revoked.',
      'Administrative access to hosting and DNS is held by Qera Private Limited through the build and support window, and released under the Setup Schedule.',
    ],
    limits: [
      { label: 'Page templates', value: '[10]' },
      { label: 'Editable content types, where a CMS is in scope', value: '[3]' },
      { label: 'Records across all content types', value: '[50]' },
      { label: 'Forms', value: '[1]' },
      { label: 'Third-party integrations', value: '[2], named before start' },
      { label: 'Revision rounds', value: '[3]' },
      { label: 'Languages', value: '[1]' },
    ],
    limitsNotes: [
      'Anything beyond these is Additional Work.',
      'Page templates are the counted unit. A template is a layout designed and built once. The number of pages or records using an existing template is not limited and is not Additional Work.',
      'A page that cannot be produced from an approved template counts as a new template.',
      'The default ten templates are: home, about, contact, service listing, single service, technical or specification, process, terms, privacy, and 404. Where a Client needs a different set, agree the list before start and record it here.',
      'Content types are kinds of repeatable content — blog posts, case studies, team members, projects — where the Client adds and edits entries itself. Three content types means three such kinds, with an unlimited number of entries in each. Pages that exist only once, such as the home or contact page, are built directly and are editable where the Part states so.',
    ],
    completion: [
      "The site is live on the Client's domain, every page template listed above exists and functions as described, forms deliver to the named destination, the site displays correctly on current desktop and mobile browsers, and the repository has been transferred.",
      'Small rendering differences between browsers, devices and operating systems are normal and do not indicate incomplete work.',
      'Performance, ranking and traffic outcomes are not acceptance criteria.',
    ],
    receives: [
      'The repository, transferred to an account the Client controls',
      'A licence to the internal framework components used in the site, as set out above',
      'Full ownership of the hosting account and deployment',
      'Environment variables and configuration required to run and deploy the site',
      'Any Figma design file produced for this project, as a .fig file',
      'All final image and graphic assets produced by Qera Private Limited for this site',
      'A handover walkthrough covering deployment, content editing and routine changes',
    ],
    receivesNotes: [],
    thirdPartyCosts:
      'Hosting · domain registration and renewal · CMS subscription, where a hosted CMS is used · commercial font licences · stock imagery, if used · any paid third-party service used by the site · email delivery service for forms, where volume requires one',
    exclusionIds: [
      'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E09', 'E11', 'E13', 'E21', 'E22',
      'E23', 'E24', 'E25', 'E26', 'E27', 'E28', 'E36', 'E41', 'E42', 'E43', 'E47',
      'E48', 'E49', 'E50', 'E52', 'E53',
    ],
    clientInputIds: [
      'I01', 'I02', 'I03', 'I09', 'I12', 'I14', 'I15', 'I16', 'I17', 'I18', 'I19',
      'I20', 'I26', 'I27', 'I28', 'I31', 'I33', 'I35', 'I36', 'I37',
    ],
    fee: [
      { label: 'Fee', value: '[ ]' },
      { label: 'Payment', value: '[50%] on signing, [50%] before launch' },
      { label: 'Timeline', value: '[6] weeks from start date' },
      { label: 'Support', value: '[30] days from acceptance' },
    ],
  },
  {
    code: '05',
    name: 'Brand identity',
    scheduleKey: 'build',
    sortOrder: 5,
    archived: false,
    dependencies: [],
    pairings: ['06', '01', '02', '03', '11'],
    overview: [
      "Creation of a visual identity for the Client's business — logo, typography, colour and the rules governing their use. The Client receives a complete identity they own outright, in every file format needed to apply it across print, screen and third-party suppliers.",
      'This Part covers visual identity only. Naming, tagline and verbal identity are not included.',
    ],
    included: [
      'Discovery session and written direction, agreed before design begins',
      '[2] initial identity directions, presented together',
      'Development of [1] selected direction to completion',
      'Primary logo plus [3] variants — typically horizontal, stacked and icon-only',
      'Monochrome and reversed versions of every variant',
      'Typography selection — [2] typefaces, with weights and usage rules',
      'Colour palette with primary, secondary and neutral values, in HEX, RGB and CMYK',
      'Clear space, minimum size and misuse rules',
      '[2] supporting brand elements — pattern, texture, graphic device or similar',
      'Brand guidelines document covering all of the above',
      'Full file export in vector and raster formats',
      'One handover walkthrough',
    ],
    accountTerms: [
      'Ownership of the final approved identity transfers to the Client on receipt of full payment. This includes the logo, its variants, the palette, the layouts and the guidelines document.',
      'Unselected directions, exploratory work and rejected concepts remain the property of Qera Private Limited and may be developed for other purposes.',
      "Originality and trademark. Every identity is designed as original work. Before presenting any direction, Qera Private Limited carries out reasonable checks — public trademark register searches in the Client's primary market, general and image-based web searches, and domain and social handle availability — and shall not knowingly present a mark that conflicts with something already in use. Where a check raises a concern, the Client is told before the direction goes further.",
      "These checks are professional diligence, not legal clearance. Qera Private Limited is not a trademark attorney and cannot search every register, class or territory, and cannot guarantee that a mark is registrable or free from third-party rights. Before commercial use or filing, the Client should obtain formal clearance from a trademark attorney, and Qera Private Limited shall supply whatever the Client's attorney needs to carry that out. Responsibility for the decision to adopt and register a mark, and for any claim arising from it, rests with the Client.",
      "Typefaces are licensed, not owned. Where a commercial typeface is selected, the licence is purchased in the Client's name and the Client is responsible for its terms and renewal. Qera Private Limited shall identify a freely licensable alternative on request.",
    ],
    limits: [
      { label: 'Initial directions presented', value: '[2]' },
      { label: 'Directions developed to completion', value: '[1]' },
      { label: 'Logo variants', value: '[3]' },
      { label: 'Typefaces', value: '[2]' },
      { label: 'Supporting brand elements', value: '[2]' },
      { label: 'Revision rounds on the selected direction', value: '[3]' },
      { label: 'Applications or mockups', value: '[3]' },
    ],
    limitsNotes: [
      'Anything beyond these is Additional Work. A request to develop a second direction to completion, or to restart from new directions after a selection has been made, is a new engagement.',
    ],
    completion: [
      'The selected direction has been approved in writing, all variants and formats listed above have been produced, and the guidelines document has been delivered.',
      'Subjective preference expressed after written approval of a direction is not grounds for rejection and is addressed under the Additional Work terms of this Schedule.',
    ],
    receives: [
      'Logo files in vector format — AI or SVG, plus EPS and PDF',
      'Logo files in raster format — PNG with transparency, at standard sizes',
      'Favicon and app icon exports',
      'Full colour specification in HEX, RGB and CMYK',
      'The brand guidelines document as a PDF',
      'The editable Figma file containing the identity, as a .fig file',
      'A handover walkthrough covering correct application',
    ],
    receivesNotes: [],
    thirdPartyCosts:
      'Commercial typeface licences · stock imagery used in mockups, if any · trademark search or filing costs · print or production costs',
    exclusionIds: [
      'E02', 'E03', 'E06', 'E07', 'E10', 'E14', 'E38', 'E39', 'E44', 'E45', 'E48',
      'E49', 'E54', 'E59', 'E60', 'E61', 'E63',
    ],
    clientInputIds: [
      'I17', 'I20', 'I21', 'I26', 'I27', 'I28', 'I29', 'I33', 'I34', 'I35', 'I36',
      'I37', 'I42', 'I43',
    ],
    fee: [
      { label: 'Fee', value: '[ ]' },
      { label: 'Payment', value: '[50%] on signing, [50%] before final file release' },
      { label: 'Timeline', value: '[4] weeks from start date' },
      { label: 'Support', value: '[30] days from acceptance' },
    ],
  },
];
