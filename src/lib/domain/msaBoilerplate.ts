/**
 * The fixed Master Service Agreement (MSA) boilerplate — 24 numbered sections,
 * identical for every client. Transcribed verbatim from the Qera Studio
 * contract. Rendered from these constants at display/print time (not stored
 * per-document), so the legalese stays consistent across all contracts.
 *
 * If the wording is revised here, already-finalized contracts render the new
 * text too (accepted tradeoff — see the Phase 2 design spec). Client-safe:
 * no server imports.
 */

export interface MsaSection {
  number: number;
  heading: string;
  /** One string per paragraph. */
  body: string[];
}

/** Cover-page intro paragraph. */
export const CONTRACT_INTRO =
  'This agreement outlines the scope, responsibilities, timelines, and commercial terms governing the web design and development services to be provided. Its purpose is to ensure clarity, alignment, and a smooth working relationship between both parties from the outset.';

/** Sentence introducing the two-party block on the parties page. */
export const AGREEMENT_PREAMBLE =
  'This Service Agreement (“Agreement”) is entered into between:';

export const MSA_SECTIONS: MsaSection[] = [
  {
    number: 1,
    heading: 'PARTIES',
    body: [
      'This Agreement establishes the legal and operational framework governing all services provided by Qera Studio to the Client. By executing this Agreement, both Parties acknowledge that they have read, understood, and agree to the terms contained herein.',
    ],
  },
  {
    number: 2,
    heading: 'DEFINITIONS',
    body: [
      'For the purpose of this Agreement, “Services” shall refer to any branding, strategy, social media, design, development, automation, consulting, infrastructure, maintenance, or related work performed by Qera Studio. “Deliverables” shall refer to the final approved outputs defined in the relevant Proposal or Service Schedule. “Proposal” shall refer to the commercial quotation, timelines, pricing, deliverables, and project-specific details shared with the Client. “Schedule” shall refer to any service-specific attachment forming part of this Agreement. “Revision” shall refer to a limited modification to approved work and shall not include substantial directional changes or expanded scope. “Additional Work” shall refer to any work not explicitly included in the approved Proposal or Schedule. “Third-Party Services” shall refer to external platforms, APIs, hosting providers, AI providers, software tools, plugins, ad platforms, infrastructure services, or any technology not directly owned or controlled by Qera Studio.',
    ],
  },
  {
    number: 3,
    heading: 'ENGAGEMENT STRUCTURE',
    body: [
      'All services performed under this Agreement shall be governed through this Master Service Agreement together with any applicable Service Schedules, approved Proposals, quotations, or written amendments. In the event of inconsistency, the order of precedence shall be: approved Proposal, applicable Service Schedule, and finally this Master Service Agreement.',
      'Any work, feature, request, integration, deliverable, modification, enhancement, or strategic expansion not explicitly included within the approved written scope shall be considered outside the agreed engagement. Verbal conversations, exploratory discussions, assumptions, informal messages, or conceptual references shall not automatically modify the scope, pricing, or timelines unless confirmed in writing by both Parties.',
    ],
  },
  {
    number: 4,
    heading: 'SCOPE & CHANGE MANAGEMENT',
    body: [
      'Qera Studio agrees to perform the Services described within the approved Proposal and applicable Schedule. Any request involving additional platforms, expanded deliverables, new concepts, major revisions, additional workflows, integrations, redesigns, strategic pivots, expanded content, or functionality beyond the originally approved scope may be treated as Additional Work.',
      'Additional Work may result in revised pricing, revised timelines, revised milestones, and revised resource allocation. Qera Studio reserves the right to decline requests outside the approved scope. No additional work shall commence unless approved in writing.',
    ],
  },
  {
    number: 5,
    heading: 'COMMERCIAL TERMS',
    body: [
      'Project pricing, retainers, milestone structures, and commercial terms shall be defined within the approved Proposal or applicable Schedule. Unless otherwise agreed in writing, standard projects shall follow a 50% advance and 50% final payment structure. Projects exceeding ₹1,00,000 may follow milestone-based billing.',
      'All taxes, payment gateway charges, transfer fees, international transaction fees, and government-imposed charges shall be borne by the Client unless explicitly stated otherwise.',
      'Invoices shall be payable within the agreed due period. If payment remains unpaid, a seven-day grace period shall apply, after which Qera Studio may issue a formal written notice followed by an additional seven-day cure period. If payment remains overdue after this period, Qera Studio reserves the right to pause work, suspend services, revoke access, withhold deliverables, delay deployment, terminate the engagement, or withhold source files and credentials until outstanding amounts are cleared. All project activity automatically pauses during overdue payment periods.',
    ],
  },
  {
    number: 6,
    heading: 'TIMELINES AND DELIVERY',
    body: [
      'All timelines represent good-faith estimates based on timely feedback, uninterrupted dependencies, timely approvals, and complete asset delivery from the Client. Qera Studio shall make commercially reasonable efforts to adhere to agreed schedules but does not guarantee exact completion dates where delays arise due to Client inactivity, delayed approvals, expanded scope, third-party platform dependencies, infrastructure outages, force majeure events, or operational constraints beyond reasonable control.',
      'Any delays caused by the Client may proportionally extend project timelines without liability to Qera Studio.',
    ],
  },
  {
    number: 7,
    heading: 'REVISIONS & APPROVAL',
    body: [
      'Projects include a limited number of revision rounds as defined within the approved Proposal, Schedule. A and Schedule. B. Revision refers to minor refinements within the approved direction, including spacing adjustments, reasonable visual refinements, copy edits, or similar modifications. Revisions do not include complete redesigns, strategic pivots, new concepts, or major functionality changes.',
      'Clients are expected to provide consolidated feedback within forty-eight hours of receiving revision submissions. If feedback is not received within this period, the revision round may be considered approved and closed by default. Reasonable exceptions may be considered in extraordinary circumstances such as severe medical emergencies or critical personal events.',
      'Once a milestone, concept, design direction, strategy, visual system, workflow, or deliverable has been approved by the Client, any subsequent request materially altering the approved work may be treated as Additional Work. Qera Studio reserves the right to revise pricing and timelines accordingly.',
    ],
  },
  {
    number: 8,
    heading: 'CREATIVE SUBJECTIVITY',
    body: [
      'The Client acknowledges that branding, design, strategy, content, motion, visual identity, social media, and other creative services involve subjective interpretation and judgment. Deliverables shall be evaluated against approved briefs, agreed objectives, approved references, technical feasibility, and commercial scope rather than evolving personal preference alone.',
      'Changes in subjective preference after approval may constitute Additional Work. Qera Studio shall make commercially reasonable efforts to align with the Client’s vision but does not guarantee unlimited subjective satisfaction beyond the approved revision structure.',
    ],
  },
  {
    number: 9,
    heading: 'CLIENT RESPONSIBILITIES',
    body: [
      'The Client agrees to provide accurate information, complete content, branding assets, approvals, credentials, platform access, and timely feedback necessary for project execution. The Client confirms ownership or lawful usage rights for all materials provided to Qera Studio.',
      'The Client remains solely responsible for the legality, ownership, factual accuracy, compliance, and final business usage of all submitted materials and approved deliverables. Qera Studio shall not be liable for delays, reduced quality, or operational issues arising from incomplete, inaccurate, or delayed Client inputs.',
    ],
  },
  {
    number: 10,
    heading: 'PROJECT HOLD & DORMANCY',
    body: [
      'If the Client becomes non-responsive for more than fourteen consecutive calendar days, Qera Studio may place the project on hold. Projects inactive for more than twenty-eight consecutive calendar days may lose scheduling priority and may require revival or reactivation fees before work resumes.',
      'Projects inactive for more than sixty consecutive calendar days may be considered abandoned and closed at the discretion of Qera Studio. Reactivation of abandoned projects may require revised pricing, revised timelines, updated scope assessment, or execution of a new agreement.',
    ],
  },
  {
    number: 11,
    heading: 'INTELLECTUAL PROPERTY',
    body: [
      'Ownership of final approved deliverables transfers to the Client only upon receipt of full payment. Until full payment is received, all work remains the intellectual property of Qera Studio.',
      'Transfer of source files, editable assets, repositories, automation workflows, motion project files, structured systems, design systems, Figma files, internal frameworks, reusable templates, or operational infrastructure shall be governed by the approved Proposal or applicable Schedule. Unless explicitly included, Qera Studio retains ownership of its internal methodologies, frameworks, libraries, systems, and reusable operational assets.',
      'Qera Studio retains perpetual rights to showcase completed work for portfolio usage, marketing, case studies, social proof, awards submissions, and presentations unless otherwise restricted through a separately executed NDA or written confidentiality agreement.',
    ],
  },
  {
    number: 12,
    heading: 'CONFIDENTIALITY',
    body: [
      'Both Parties agree to maintain reasonable confidentiality regarding non-public business, operational, technical, strategic, or financial information shared during the engagement. Confidential information shall not be intentionally disclosed to unrelated third parties except where legally required, operationally necessary, or approved in writing.',
      'This confidentiality obligation survives termination of the engagement.',
    ],
  },
  {
    number: 13,
    heading: 'SUBCONTRACTING',
    body: [
      'Qera Studio reserves the right to subcontract portions of work, collaborate with freelancers, engage specialists, utilize external consultants, or delegate operational execution without requiring separate Client approval. Qera Studio remains responsible for overall project coordination and delivery.',
    ],
  },
  {
    number: 14,
    heading: 'PLATFORM DISCLAIMER',
    body: [
      'Projects may rely upon Third-Party Services including but not limited to Meta, Instagram, WhatsApp, Google, OpenAI, hosting providers, payment gateways, CRMs, automation platforms, analytics tools, AI providers, plugins, APIs, cloud infrastructure, or communication platforms.',
      'Qera Studio does not control these platforms and shall not be liable for outages, bans, suspensions, algorithm changes, API restrictions, pricing changes, service discontinuations, policy updates, infrastructure failures, or platform-specific issues.',
      'Third-party subscription fees, API costs, advertising budgets, domain fees, hosting charges, software licenses, infrastructure charges, platform subscriptions, or external service costs are excluded unless explicitly stated otherwise.',
    ],
  },
  {
    number: 15,
    heading: 'AI DISCLAIMER',
    body: [
      'The Client acknowledges that AI systems, automation systems, and machine-generated outputs may produce inaccurate, incomplete, probabilistic, or unpredictable results and may require human review before usage. AI systems may change behavior over time and may depend upon third-party providers beyond Qera Studio’s control.',
      'Qera Studio does not guarantee factual perfection, uninterrupted automation behavior, permanent compatibility, deterministic AI outputs, or business outcomes arising from AI-generated systems.',
      'The Client remains responsible for reviewing and approving all AI-generated or automation-driven outputs before operational or public usage. Qera Studio does not intentionally use Client data for AI model training. However, third-party AI providers may process submitted data according to their own systems and policies. Clients are advised not to submit highly sensitive or regulated information into AI systems unless operationally necessary and legally permissible.',
    ],
  },
  {
    number: 16,
    heading: 'SUPPORT AND MAINTENANCE',
    body: [
      'Unless otherwise stated in writing, a limited thirty-day support window shall apply after final delivery. This support covers implementation issues, deployment-related corrections, and technical problems directly related to the delivered work.',
      'Support does not include new features, expanded scope, redesigns, strategic changes, third-party failures, platform policy changes, Client-caused modifications, or integrations introduced after delivery.',
      'Extended maintenance, optimization, retainership, or monitoring services may be purchased separately. Ongoing retainers may be terminated by either Party through fifteen calendar days written notice.',
    ],
  },
  {
    number: 17,
    heading: 'PERFORMANCE DISCLAIMER',
    body: [
      'Qera Studio does not guarantee revenue growth, conversion rates, lead volume, follower growth, SEO rankings, advertising performance, virality, business profitability, algorithmic reach, or measurable business outcomes.',
      'All branding, marketing, automation, design, development, and digital systems outcomes depend upon multiple external factors beyond Qera Studio’s control. Any recommendations, projections, audits, or strategic guidance are provided in good faith and do not constitute guarantees.',
    ],
  },
  {
    number: 18,
    heading: 'COMMUNICATION AND APPROVALS',
    body: [
      'Operational communication may occur through email, WhatsApp, Slack, project management tools, collaborative platforms, or scheduled meetings. However, all major approvals, contractual discussions, milestone sign-offs, scope changes, commercial confirmations, and legal communications must be confirmed through email.',
      'Qera Studio shall not be liable for misunderstandings arising from fragmented, inconsistent, or undocumented communication across multiple platforms.',
    ],
  },
  {
    number: 19,
    heading: 'SUSPENSION & TERMINATION',
    body: [
      'Either Party may terminate the engagement through written notice if the engagement becomes commercially unviable, contractual obligations are materially breached, payments remain overdue, abusive conduct occurs, or collaboration becomes operationally impossible.',
      'Upon termination, the Client agrees to compensate Qera Studio for all completed work, allocated resources, approved milestones, and operational costs incurred up to the termination date. Any advance payments covering completed work remain non-refundable.',
      'Qera Studio reserves the right to suspend services immediately in cases involving non-payment, abusive behavior, unlawful requests, reputational risk, platform misuse, or material contractual breach.',
    ],
  },
  {
    number: 20,
    heading: 'LIMITATIONS OF LIABILITY',
    body: [
      'Qera Studio shall not be liable for indirect, incidental, consequential, reputational, operational, or financial damages including loss of business, data, profits, leads, goodwill, platform reach, or future opportunity.',
      'Total liability under this Agreement shall not exceed the total fees actually paid by the Client for the relevant engagement. Liability arising from third-party services, platform restrictions, infrastructure failures, AI systems, or external providers is expressly excluded to the maximum extent permitted by law.',
    ],
  },
  {
    number: 21,
    heading: 'FORCE MAJEURE',
    body: [
      'Qera Studio shall not be liable for delays or failures arising from events beyond reasonable control including natural disasters, internet outages, government restrictions, cyberattacks, platform outages, infrastructure failures, labor disputes, war, pandemics, regulatory changes, or force majeure events.',
    ],
  },
  {
    number: 22,
    heading: 'GOVERNING LAW & JURISDICTION',
    body: [
      'This Agreement shall be governed and interpreted in accordance with the laws of India. Any disputes arising under this Agreement shall fall under the exclusive jurisdiction of the courts located in Ghaziabad, Uttar Pradesh – 201017.',
    ],
  },
  {
    number: 23,
    heading: 'ENTIRE AGREEMENT',
    body: [
      'This Agreement together with applicable Schedules, Proposals, written amendments, and approved commercial documents constitutes the complete understanding between the Parties and supersedes all prior discussions, verbal understandings, exploratory conversations, or informal representations.',
      'Any amendments to this Agreement must be made in writing and approved by both Parties.',
    ],
  },
  {
    number: 24,
    heading: 'SIGNATURES',
    body: [
      'By signing below, both Parties acknowledge that they have read, understood, and agreed to the terms contained within this Agreement.',
    ],
  },
];
