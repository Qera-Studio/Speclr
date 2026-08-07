# Contract content

All actual text that goes into contracts. Read `contract-system.md` first for structure and rules.

Entity name is **Qera Private Limited** everywhere. Trading name Qera Studio may appear in
headings and branding, never in a party or signature block.

Blanks are written as `[value]`. Every one is editable per contract.

**Status of this file**

- Section 1 — corrections to make before anything else is templated
- Section 2 — Master agreement (not yet written, write last)
- Section 3 — Schedule 1 Build (written, ready)
- Section 4 — Service 01 Shopify storefront (written, ready)
- Section 5 — Service template (the shape all 22 follow)
- Section 6 — Exclusion library seed, 58 lines
- Section 7 — Client input library seed, 41 lines
- Sections 8+ — Schedules 2–4 and services 02–22 (not yet written)

---

## 1. Corrections — apply before templating anything

These are errors in the existing Zaib contract (12 May 2026). If templated as-is they
propagate into every contract ever generated. Do not retrofit the Zaib document itself —
it is a signed historical record. Fix the template.

### Errors

| Error | Correct |
|---|---|
| Signature blocks inverted — "Qera Studio (First party) / Name: ZaibQ Studioh" appears in all three documents | First party block carries Qera Private Limited. Second party carries the client. |
| "both Parties acknowledge that they **will** read, understood" | "have read, understood, and agreed" |
| Client name inconsistent: "ZaibQ Stuioh" vs "ZaibQ Studioh" | Single source, one blank, no free typing |
| Heading typo "CLIENT RESPONSIBILITES" | RESPONSIBILITIES |
| Heading typo "GOVERNING LAW & JURSIDICTION" | JURISDICTION |
| Entity mismatch — "Qera Studio" in PDF, "Qera Private Limited" in tool | Qera Private Limited, everywhere |
| Email mismatch — hello@qera.studio in PDF, sales@qera.studio in tool | Pick one. Recommend hello@ for contracts. |
| Schedule A says "under four (4) weeks", milestone table runs three weeks | One source. Timeline is a blank; the table derives from it. |
| Schedule B: monthly advance retainer, then "Project may follow a 100% advance completion structure" | Delete the second sentence. It contradicts the first and means nothing. |

### Gaps to add to the master agreement

Six clauses the current text does not carry:

1. **Client indemnity** — for materials the client supplied: IP claims, factual accuracy, regulatory compliance. Current text assigns responsibility but contains no true indemnity.
2. **Late payment interest** — a stated monthly rate. Without it the suspension clause has no teeth.
3. **Non-solicitation** — of Qera's team, subcontractors and specialists, for a stated period after engagement ends.
4. **Data protection** — a reference clause. Needed once customer data is handled, and UAE clients raise it.
5. **Termination for convenience** — with a defined kill fee. Current text only covers termination for breach.
6. **Credential and account return on termination** — currently absent entirely. This is the largest exposure on social and infrastructure work.

---

## 2. Master Service Agreement

Complete. Read together with the four Schedules and the Parts appended to them.

**Placement rule.** A clause belongs in this Agreement where it applies identically regardless of
the kind of work. A clause belongs in a Schedule where it differs between a one-time build, a
monthly engagement, a setup and an advisory engagement. Where the same words appear in two or
more Schedules, they move here.

---

> # MASTER SERVICE AGREEMENT
>
> This Agreement is made on `[agreement_date]`
>
> **BETWEEN**
>
> **QERA PRIVATE LIMITED**, a company incorporated under the Companies Act, 2013, having its
> registered office at C-204, MGI Gharaunda, Raj Nagar Extension, Ghaziabad 201017, Uttar Pradesh,
> India (hereinafter "**Qera**", which expression shall include its successors and permitted
> assigns), of the First Part;
>
> **AND**
>
> `[client_legal_name]`, having its principal place of business at `[client_address]`
> (hereinafter the "**Client**", which expression shall include its successors and permitted
> assigns), of the Second Part.
>
> Qera and the Client are hereinafter referred to individually as a "**Party**" and collectively
> as the "**Parties**".

### 1. Definitions and Interpretation

**1.1** In this Agreement, unless the context otherwise requires:

"**Additional Work**" means any work not expressly specified within an approved Part or Proposal.

"**Agreement**" means this Master Service Agreement together with all Schedules, Parts, Proposals
and written amendments executed by the Parties.

"**Client Inputs**" means the information, materials, assets, credentials, approvals and access
which the Client is required to supply under an applicable Part.

"**Deliverables**" means the final approved outputs specified in an applicable Part.

"**Part**" means a service specification appended to a Schedule, describing the scope of a
particular service.

"**Proposal**" means the commercial quotation setting out fees, timelines and engagement-specific
particulars provided to the Client.

"**Retained Materials**" has the meaning given at clause 11.2.

"**Revision**" has the meaning given at clause 7.1.

"**Schedule**" means any of the Build, Monthly, Setup or Advice Schedules forming part of this
Agreement.

"**Services**" means the services performed by Qera under this Agreement.

"**Third-Party Services**" means any platform, application programming interface, hosting
provider, model provider, software tool, plugin, advertising platform, infrastructure service or
technology not owned or controlled by Qera.

**1.2** Headings are for convenience only and shall not affect construction. References to a
clause are references to a clause of this Agreement. Words importing the singular include the
plural and vice versa. "Including" means including without limitation. A reference to writing
includes email.

**1.3** Any period expressed in days shall mean calendar days unless expressed as working days,
in which case Saturdays, Sundays and public holidays at the place of performance shall be
excluded.

### 2. Structure and Order of Precedence

**2.1** This Agreement establishes the legal and operational framework governing all Services
provided by Qera to the Client. It applies to every engagement between the Parties and continues
in force notwithstanding the completion of any individual engagement.

**2.2** Each engagement shall be governed by this Agreement together with the applicable Schedule,
the Parts appended to it, and any approved Proposal.

**2.3** In the event of inconsistency, the order of precedence shall be: (a) the approved
Proposal; (b) the applicable Part; (c) the applicable Schedule; and (d) this Agreement.

**2.4** No engagement shall commence, and no obligation to perform shall arise, until the Parties
have executed the applicable Schedule and Qera has received the payment and Client Inputs
required thereunder.

### 3. Mutual Obligations

**3.1** This Agreement imposes obligations upon both Parties. Each Party shall perform its
obligations in good faith and shall not unreasonably withhold or delay any approval, consent or
cooperation required of it.

**3.2** Qera shall:

(a) perform the Services with reasonable skill, care and diligence, and to the standard ordinarily
    expected of a competent professional studio in its field;

(b) deliver the Deliverables described in each applicable Part, and shall notify the Client in
    writing where any described Deliverable is not achievable, together with the reasons;

(c) notify the Client in writing without undue delay where any agreed date is at risk, stating the
    cause and a revised date;

(d) quote any Additional Work in writing and obtain the Client's written approval prior to
    commencing it, and shall not invoice the Client for work not so approved;

(e) remedy, at its own cost, any defect in the Deliverables arising from its own act or omission
    and reported within the applicable support or correction period;

(f) give the Client written notice and a reasonable opportunity to remedy the cause before
    suspending performance of the Services;

(g) treat the Client's non-public business information as confidential in accordance with clause
    13, and shall not use Client data to train artificial intelligence models;

(h) procure that every account, domain name and subscription created in connection with the
    Services is registered in the Client's name, so that the Client's ownership of its own
    infrastructure is not contingent upon the continuation of this Agreement;

(i) deliver all materials to which the Client is entitled promptly upon payment of the sums
    properly due in respect of them; and

(j) remove its own access to the Client's systems and accounts promptly upon request or upon
    termination.

**3.3** The Client shall:

(a) supply the Client Inputs specified in each applicable Part, in usable form, so as to enable
    performance of the Services;

(b) respond to submissions and requests for approval within the periods specified in the
    applicable Schedule or Part;

(c) pay each invoice in accordance with its terms;

(d) warrant that it holds all necessary rights, licences and consents in respect of any material
    it supplies to Qera;

(e) nominate a single individual with authority to approve Deliverables and give instructions on
    its behalf; and

(f) raise any concern regarding performance in writing and without undue delay, so that it may be
    addressed at the earliest practicable stage.

### 4. Scope and Additional Work

**4.1** Qera shall perform the Services specified in the approved Proposal and applicable Part.

**4.2** Any work, feature, request, integration, deliverable, modification, enhancement or
strategic expansion not expressly included within the approved written scope shall constitute
Additional Work.

**4.3** No conversation, exploratory discussion, assumption, informal message or conceptual
reference shall operate to vary the scope, fees or timelines of any engagement unless confirmed
in writing by both Parties.

**4.4** Additional Work may result in revised fees, timelines, milestones and resource
allocation. Qera may decline Additional Work which it is not appropriately placed to deliver. No
Additional Work shall commence unless approved in writing.

### 5. Communication and Notices

**5.1** Operational communication may be conducted by email, messaging platform, project
management tool or meeting, as the Parties find convenient.

**5.2** Approvals, variations to scope, commercial confirmations and formal notices shall be
confirmed by email. No instruction, representation or discussion conducted otherwise shall
operate to vary this Agreement, and neither Party shall be bound by any purported agreement not
so confirmed.

**5.3** Formal notices shall be sent to the email addresses stated in the applicable Schedule and
shall be deemed received on the next working day following transmission, absent evidence of
delivery failure.

**5.4** Qera shall not be liable for any misunderstanding arising from fragmented, inconsistent or
undocumented communication conducted otherwise than in accordance with this clause.

### 6. Feedback and Approval

**6.1** Where a Schedule or Part specifies a period for feedback, the Client shall provide
consolidated written feedback within that period.

**6.2** Where the Client does not respond within the specified period, the relevant submission
shall be deemed approved, so as to permit the Services to continue without interruption. Qera
shall issue a written reminder prior to treating any submission as approved by default.

**6.3** Either Party may request a reasonable extension of any period specified under this clause
in circumstances of genuine emergency, and such request shall not be unreasonably refused.

### 7. Revisions

**7.1** A "Revision" means the refinement of work already approved in direction, including
adjustment to spacing, sizing, wording, colour or layout, and the correction of errors.

**7.2** A Revision does not include a new concept, a change of direction, restructured navigation,
additional pages, additional functionality or a redesign. Such work constitutes Additional Work.

**7.3** The number of Revision rounds included is specified in the applicable Schedule and Part.

**7.4** The correction of any error attributable to Qera shall not be counted as a Revision round
and shall be undertaken at Qera's own cost.

**7.5** The Client acknowledges that branding, design, strategy, content, motion, visual identity
and comparable creative services involve subjective interpretation and judgment. Deliverables
shall be assessed against approved briefs, agreed objectives, approved references, technical
feasibility and commercial scope, and not against evolving personal preference alone. Qera shall
use reasonable endeavours to align with the Client's vision within the approved Revision
structure.

### 8. Fees, Invoicing and Payment

**8.1** Fees, retainers, milestone structures and commercial terms are specified in the approved
Proposal and applicable Part.

**8.2** All taxes, duties, payment gateway charges, transfer fees, international transaction fees
and government-imposed charges shall be borne by the Client, save where expressly stated
otherwise. Fees are stated exclusive of goods and services tax, which shall be charged at the
applicable rate.

**8.3** Invoices shall be payable within the period stated thereon or, where no period is stated,
within `[7 days]` of issue.

**8.4** Where any sum remains unpaid after its due date, Qera shall notify the Client in writing.
Interest shall accrue on any sum outstanding more than `[15 days]` after its due date at the rate
of `[1.5%]` per month, or the maximum rate permitted by applicable law, whichever is lower,
calculated from the due date until payment. Qera may waive such interest at its discretion.

**8.5** Suspension of performance for non-payment is governed by the applicable Schedule. Qera
shall not withhold any Deliverable, source material or access in respect of which the sums
properly due have been paid.

**8.6** All sums payable are exclusive of Third-Party Costs, which are governed by clause 9.

### 9. Third-Party Costs

**9.1** Platform subscriptions, hosting, domain fees, licences, paid applications, model and
application programming interface usage, advertising spend, stock assets, typeface licences and
comparable third-party charges are excluded from all fees payable under this Agreement, save
where a Part expressly provides otherwise. Each Part shall itemise the third-party costs
applicable to it.

**9.2** Such costs shall be paid by the Client directly to the relevant provider, using the
Client's own payment method, so that billing control and account ownership remain with the
Client.

**9.3** Where, by agreement, Qera discharges any such cost on the Client's behalf, it shall be
reimbursed at cost together with any transfer charges, upon production of evidence of the sum
paid.

**9.4** Qera shall not be obliged to fund, advance or hold any sum on the Client's behalf, and
shall bear no liability for any interruption to the Services arising from the failure,
expiry or decline of the Client's payment method.

### 10. Intellectual Property

**10.1** Title to and all intellectual property rights in the final approved Deliverables shall
pass to the Client upon payment in full of the fee for the applicable Part, and not before. Until
such payment, the Deliverables shall remain the property of Qera.

**10.2** Such transfer shall constitute an assignment of copyright within the meaning of section
19 of the Copyright Act, 1957, and shall take effect upon receipt of full payment. Qera shall
execute such further documents as the Client may reasonably require to give effect to such
assignment, at the Client's cost.

**10.3** The Client retains ownership of all material supplied by it to Qera, and grants Qera a
non-exclusive licence to use such material for the purpose of performing the Services.

**10.4** Concepts, directions and explorations presented but not selected by the Client shall
remain the property of Qera.

**10.5** Transfer of source files, editable assets, repositories, automation workflows, design
files, structured systems and operational infrastructure shall be governed by the applicable Part.

### 11. Retained Materials and Licence

**11.1** Each Part specifies the materials the Client shall receive. Where the Client requires
materials beyond those specified, Qera shall supply such materials as it reasonably can, and shall
agree terms with the Client in respect of any material incorporating Retained Materials.

**11.2** "**Retained Materials**" means Qera's internal methods, frameworks, component libraries,
naming conventions, prompt patterns, automation logic, starter templates and reusable operational
systems, together with all intellectual property rights therein, which shall remain vested in
Qera at all times.

**11.3** Where Retained Materials are incorporated into a Deliverable, Qera grants the Client,
upon payment in full for that Deliverable, a perpetual, irrevocable, worldwide, non-exclusive,
royalty-free licence to use, modify, host and maintain such Retained Materials as part of that
Deliverable within the Client's own business. Such licence shall not extend to redistribution,
resale or use in any separate project.

**11.4** The licence granted under clause 11.3 shall survive termination of this Agreement for any
reason, so that the Client's ability to operate and modify the Deliverables is not prejudiced by
termination.

### 12. Credit and Portfolio

**12.1** Qera may display completed work in its portfolio, case studies, marketing materials,
awards submissions and presentations, save where restricted by a separately executed
confidentiality agreement.

**12.2** In respect of every website, web application and digital product delivered under this
Agreement, Qera shall retain the right to display an attribution credit in the form "Made by Qera
Studio", or such other form as it may reasonably adopt, in the footer of the delivered property,
hyperlinked to Qera's own website. The Client shall not remove, obscure, alter or disable such
credit.

**12.3** The right at clause 12.2 forms part of the consideration for the fees stated in the
applicable Part. Where the Client requires that no such credit be displayed, this shall be agreed
in writing prior to commencement and shall be subject to a separately quoted fee.

**12.4** The obligation at clause 12.2 shall subsist for so long as the delivered property remains
substantially in the form delivered by Qera.

### 13. Confidentiality

**13.1** Each Party shall keep confidential all non-public business, operational, technical,
strategic and financial information of the other Party disclosed in connection with this
Agreement, and shall not disclose it to any third party save as permitted by this clause.

**13.2** Disclosure is permitted (a) to personnel, subcontractors and professional advisers who
require it for the performance of this Agreement and who are bound by equivalent obligations;
(b) where required by law, regulation or court order; and (c) where the receiving Party can
demonstrate the information was already public, already known to it, or independently developed.

**13.3** This clause shall survive termination of this Agreement for a period of `[3 years]`, save
in respect of information constituting a trade secret, in respect of which the obligation shall
subsist indefinitely.

### 14. Data Protection

**14.1** Each Party shall comply with applicable data protection law, including the Digital
Personal Data Protection Act, 2023.

**14.2** Where Qera processes personal data on the Client's behalf in the course of performing the
Services, the Client shall be the Data Fiduciary and Qera the Data Processor. Qera shall process
such data only on the Client's documented instructions and only to the extent necessary to
perform the Services.

**14.3** Qera shall implement reasonable technical and organisational measures to protect personal
data in its possession, and shall notify the Client without undue delay upon becoming aware of any
personal data breach affecting the Client's data.

**14.4** The Client warrants that it has obtained all necessary consents and provided all
necessary notices in respect of personal data supplied to Qera, and that such supply does not
contravene applicable law.

**14.5** Upon termination, Qera shall, at the Client's written election, return or securely delete
personal data in its possession, save where retention is required by law.

**14.6** Where the Services require personal data to be processed by Third-Party Services, such
processing shall be governed by the terms of the relevant provider, which Qera does not control.

### 15. Subcontracting

**15.1** Qera may subcontract any portion of the Services, engage freelancers, specialists or
external consultants, or delegate operational execution, without requiring the Client's prior
approval.

**15.2** Qera shall remain responsible for the overall coordination and delivery of the Services
and shall be liable for the acts and omissions of its subcontractors as if they were its own.

**15.3** Qera shall procure that every subcontractor engaged is bound by confidentiality
obligations no less protective than those at clause 13.

### 16. Third-Party Services

**16.1** The Services may depend upon Third-Party Services. Qera does not control such services
and shall bear no liability for any outage, suspension, ban, algorithm change, interface
restriction, pricing change, discontinuation, policy update, infrastructure failure or
platform-specific issue arising from them.

**16.2** Where a Third-Party Service materially changes such that a Deliverable ceases to function
as delivered, remediation shall constitute Additional Work, save where the failure is attributable
to Qera's own act or omission.

**16.3** Qera shall not be liable for the rejection, restriction or suspension of any account,
campaign or application by any platform, nor for the outcome of any application for verification,
approval or elevated access.

### 17. Artificial Intelligence

**17.1** The Client acknowledges that artificial intelligence and automation systems may produce
inaccurate, incomplete, probabilistic or non-repeatable outputs, may alter their behaviour over
time, and depend upon third-party providers beyond Qera's control.

**17.2** Qera does not warrant factual accuracy, originality, consistency, uninterrupted
operation, permanent compatibility or deterministic output of any artificial intelligence or
automation system.

**17.3** The Client shall review and approve all artificial intelligence or automation-generated
output prior to operational or public use, and shall nominate a person accountable for such
review. Qera shall bear no liability for any consequence of output published, transmitted or
acted upon without such review.

**17.4** Qera does not use Client data to train artificial intelligence models. Third-party
providers may process submitted data in accordance with their own terms. The Client shall identify
in writing any data which must not be transmitted to a third-party provider, and is advised not to
submit sensitive or regulated information into such systems save where operationally necessary and
lawfully permissible.

**17.5** The ownership and copyright status of machine-generated output is unsettled and varies by
jurisdiction. Qera makes no representation as to whether such output attracts copyright protection,
is registrable, or is free from third-party rights. The Client shall obtain its own clearance advice
prior to commercial use.

### 18. Performance and Outcomes

**18.1** Qera does not guarantee revenue growth, conversion rates, lead volume, follower growth,
search rankings, advertising performance, virality, profitability, algorithmic reach or any other
measurable business outcome.

**18.2** All branding, marketing, automation, design, development and digital systems outcomes
depend upon factors beyond Qera's control, including market conditions, pricing, offer, competition
and platform behaviour.

**18.3** Recommendations, projections, audits and strategic guidance are provided in good faith on
the information available and do not constitute guarantees.

### 19. Warranties

**19.1** Each Party warrants that it has full power and authority to enter into and perform this
Agreement, and that doing so does not contravene any obligation binding upon it.

**19.2** Qera warrants that (a) the Services shall be performed in accordance with clause 3.2(a);
and (b) the Deliverables, excluding any material supplied by the Client and any Third-Party
Service, shall be original work and shall not to Qera's knowledge infringe the intellectual
property rights of any third party.

**19.3** The Client warrants that (a) all material it supplies is accurate, lawful and free from
third-party rights which would prevent its use as contemplated; and (b) it is solely responsible
for the legality, factual accuracy, regulatory compliance and commercial use of all submitted
materials and approved Deliverables.

**19.4** Save as expressly stated, all warranties, conditions and terms implied by statute or
common law are excluded to the maximum extent permitted by law.

### 20. Indemnities

**20.1** The Client shall indemnify Qera against all losses, damages, costs and reasonable legal
expenses arising from (a) any material supplied by the Client, including any claim that such
material infringes third-party rights; (b) any breach of the warranties at clause 19.3; (c) the
Client's use of the Deliverables in a manner not contemplated by this Agreement; and (d) any claim
arising from the Client's own business, products, services or advertising claims.

**20.2** Qera shall indemnify the Client against all losses, damages, costs and reasonable legal
expenses arising from any third-party claim that a Deliverable, excluding any material supplied by
the Client and any Third-Party Service, infringes that third party's intellectual property rights,
provided that the Client (i) notifies Qera promptly, (ii) permits Qera to conduct the defence, and
(iii) does not admit liability without Qera's written consent.

**20.3** Qera's liability under clause 20.2 shall be subject to the limitation at clause 21.

### 21. Limitation of Liability

**21.1** Neither Party shall be liable for indirect, incidental, consequential, special or punitive
damages, nor for loss of business, profits, revenue, data, goodwill, leads, platform reach or
anticipated savings, howsoever arising.

**21.2** Qera's total aggregate liability arising under or in connection with any engagement shall
not exceed the total fees actually paid by the Client to Qera in respect of that engagement in the
twelve months preceding the event giving rise to the claim.

**21.3** Liability arising from Third-Party Services, platform restrictions, infrastructure
failures, artificial intelligence systems or external providers is excluded to the maximum extent
permitted by law.

**21.4** Nothing in this Agreement excludes or limits liability for (a) fraud or fraudulent
misrepresentation; (b) death or personal injury caused by negligence; (c) any liability which
cannot lawfully be excluded; or (d) the Client's obligation to pay sums properly due.

**21.5** The limitations at this clause reflect the allocation of risk between the Parties having
regard to the fees payable, and each Party acknowledges that the fees would be materially
different absent them.

### 22. Force Majeure

**22.1** Neither Party shall be liable for any delay or failure to perform arising from events
beyond its reasonable control, including natural disaster, internet or infrastructure outage,
government restriction, cyberattack, platform outage, labour dispute, war, civil unrest, epidemic,
pandemic or regulatory change.

**22.2** The affected Party shall notify the other without undue delay and shall use reasonable
endeavours to mitigate the effect. Where such event continues for more than `[60 days]`, either
Party may terminate the affected engagement by written notice, and clause 25 shall apply.

### 23. Non-Solicitation

**23.1** During the term of this Agreement and for `[12 months]` following its termination,
neither Party shall directly solicit for employment or engagement any employee, subcontractor or
freelancer of the other Party who has been materially involved in the Services, without the other
Party's prior written consent.

**23.2** This clause shall not apply to any response to a general public advertisement not
specifically directed at such person.

**23.3** Where this clause is breached, the breaching Party shall pay the other a sum equal to
`[50%]` of the relevant person's annual remuneration, as a genuine pre-estimate of loss.

### 24. Suspension and Termination

**24.1** Either Party may terminate an engagement in accordance with the applicable Schedule.

**24.2** Either Party may terminate this Agreement or any engagement immediately by written notice
where the other Party (a) commits a material breach which is incapable of remedy, or which is not
remedied within `[15 days]` of written notice requiring remedy; (b) becomes insolvent, enters
liquidation or has a receiver appointed; or (c) ceases or threatens to cease carrying on business.

**24.3** Qera may suspend or terminate immediately where the Client's conduct is abusive or
unlawful, where the Client instructs Qera to act unlawfully, or where continued performance would
expose Qera to material reputational or legal risk.

**24.4** The Client may terminate immediately where Qera has materially and persistently failed to
perform the Services in accordance with clause 3.2(a) and has not remedied such failure within
`[15 days]` of written notice.

**24.5** Termination of one engagement shall not terminate any other engagement or this Agreement,
unless expressly stated.

### 25. Consequences of Termination

**25.1** Upon termination for any reason, Qera shall within `[14 days]`:

(a) deliver to the Client all Deliverables for which payment has been made in full;

(b) transfer or release every account, domain name, subscription and credential held on the
    Client's behalf;

(c) remove its own access from the Client's systems, accounts and platforms; and

(d) deliver a written record of the configuration of any system it has operated, sufficient to
    enable a competent third party to assume its operation.

**25.2** The Client shall pay all sums due for work performed and resources committed as at the
date of termination, calculated in accordance with the applicable Schedule.

**25.3** Any sum held by Qera in excess of the amount payable under clause 25.2 shall be refunded
to the Client within `[14 days]`.

**25.4** Clauses 10, 11, 12, 13, 14, 19, 20, 21, 23, 25, 26 and 27, together with any other
provision which by its nature is intended to survive, shall survive termination.

### 26. Dispute Resolution

**26.1** Where any dispute arises, the Parties shall first attempt to resolve it by good-faith
discussion between senior representatives within `[30 days]` of written notice of the dispute.

**26.2** Where the dispute is not so resolved, it shall be referred to and finally resolved by
arbitration under the Arbitration and Conciliation Act, 1996, before a sole arbitrator appointed
by agreement between the Parties or, failing agreement within `[30 days]`, by the competent court.
The seat of arbitration shall be Ghaziabad, Uttar Pradesh, and the language shall be English.

**26.3** Nothing in this clause shall prevent either Party from seeking urgent interim or
injunctive relief from a competent court.

### 27. Governing Law and Jurisdiction

**27.1** This Agreement and any dispute arising from it shall be governed by and construed in
accordance with the laws of India.

**27.2** Subject to clause 26, the courts at Ghaziabad, Uttar Pradesh shall have exclusive
jurisdiction.

### 28. General

**28.1 Entire agreement.** This Agreement, together with the applicable Schedules, Parts,
Proposals and written amendments, constitutes the entire agreement between the Parties and
supersedes all prior discussions, verbal understandings and representations.

**28.2 Amendment.** No amendment shall be effective unless made in writing and agreed by both
Parties.

**28.3 Assignment.** Neither Party may assign this Agreement without the other's prior written
consent, save that either Party may assign to a successor in title to substantially the whole of
its business.

**28.4 Waiver.** No failure or delay in exercising any right shall constitute a waiver of it.

**28.5 Severability.** Where any provision is held invalid or unenforceable, the remainder shall
continue in full force, and the invalid provision shall be replaced by a valid provision achieving
as nearly as possible the same commercial effect.

**28.6 Relationship.** Nothing in this Agreement creates a partnership, joint venture, agency or
employment relationship between the Parties.

**28.7 Third-party rights.** No person who is not a Party shall have any right to enforce any
provision of this Agreement.

**28.8 Counterparts and electronic execution.** This Agreement may be executed in counterparts and
by electronic signature, each of which shall constitute an original and together shall constitute
one instrument.

### 29. Execution

**IN WITNESS WHEREOF** the Parties have executed this Agreement on the date first written above.

| **For and on behalf of QERA PRIVATE LIMITED** | **For and on behalf of `[client_legal_name]`** |
|---|---|
| Name: `[qera_signatory_name]` | Name: `[client_signatory_name]` |
| Designation: `[qera_signatory_title]` | Designation: `[client_signatory_title]` |
| Date: `[agreement_date]` | Date: `[agreement_date]` |
| Signature: ____________________ | Signature: ____________________ |

> **Rendering note.** Both signature blocks are populated from the contract record. The left block
> is always Qera; the right block is always the Client. The May 2026 document inverted these — the
> renderer must not permit party names to be entered manually into either block.

---

### Drafting notes for the Master Service Agreement

The Agreement above is complete and supersedes the May 2026 document in full. The following were
defects in that document and have been corrected here; the renderer must not reintroduce them.

- Signature blocks were inverted, the first-party block carrying the Client's name. Clause 29
  renders both blocks from the contract record.
- "both Parties acknowledge that they will read, understood" is corrected throughout.
- The Client's name appeared in two spellings within one document. It is now rendered once from
  the client record.
- "RESPONSIBILITES" and "JURSIDICTION" are corrected.
- The entity is Qera Private Limited. "Qera Studio" is a trading name and appears in prose and in
  the attribution credit only, never in the parties or execution blocks.
- Contact email and telephone number must be reconciled before use. The May 2026 document and the
  current tool disagree on both. Store one of each in a single settings record.
- Schedule B of the May 2026 document stated monthly advance billing and then a "100% advance
  completion structure". The contradiction is not carried forward.

**Blanks requiring confirmation before first use:**

```
late_payment_interest      1.5% per month          verify against applicable law
confidentiality_term       3 years
non_solicit_term           12 months
non_solicit_sum            50% of annual remuneration
force_majeure_termination  60 days
cure_period                15 days
dispute_discussion_period  30 days
invoice_term               7 days
```

**Before use.** This Agreement and the four Schedules should be reviewed as a single package by an
Indian commercial lawyer. The twenty-two Parts are scope documents and do not require the same
review. Nothing in this file constitutes legal advice.

**Open question — jurisdiction.** Governing law is India and the seat is Ghaziabad, matching the
registered entity. The target market is Dubai-based. Clause 26 provides arbitration, which is
enforceable against a UAE counterparty under the New York Convention and is materially more useful
than litigation in Ghaziabad would be. Where a UAE client objects to the seat, moving the seat to
the DIFC while retaining Indian governing law is the usual middle ground and should be priced as a
negotiated concession rather than conceded by default.

**Separate from this Agreement.** Performing work from the UAE without a UAE trade licence is a
licensing question for the CA, not a contractual one. It does not affect this text.

## 3. Schedule 1 — Build

> **Schedule [letter] — Build**
>
> This Schedule forms part of the Master Service Agreement between Qera Private Limited and the
> Client, and governs work delivered as a defined project for a one-time fee.

### [letter]1. Application

**[letter]1.1** The Parts appended to this Schedule specify the work to be performed. This
Schedule specifies the terms upon which such work is paid for, approved, delivered and owned.

**[letter]1.2** This Schedule shall be read together with the Master Service Agreement, which
governs the mutual obligations of the Parties, feedback and approval, Revisions, third-party
costs, Retained Materials and attribution.

**[letter]1.3** In the event of inconsistency, the applicable Part shall prevail over this
Schedule, and this Schedule shall prevail over the Master Service Agreement.

### [letter]2. Fees and Payment

**[letter]2.1** The fee for each Part is stated in that Part. Save where otherwise agreed in
writing, payment shall be made as to `[50%]` in advance and `[50%]` upon completion. The advance
shall be paid prior to commencement. The balance shall be paid prior to deployment, launch or
handover, whichever occurs first.

**[letter]2.2** Engagements exceeding `[₹1,00,000]` may be apportioned into milestone payments as
specified in the applicable Part, so that neither Party carries a substantial unpaid balance at
any stage.

**[letter]2.3** Performance shall commence upon the later of (a) receipt of cleared advance
payment and (b) receipt of the Client Inputs specified in the applicable Part. Qera Private
Limited shall confirm the commencement date in writing, and all periods specified in the
applicable Part shall run from that date.

### [letter]3. Timelines

**[letter]3.1** All periods stated are good-faith estimates predicated upon timely approvals,
complete Client Inputs and uninterrupted third-party dependencies.

**[letter]3.2** Qera Private Limited shall notify the Client in writing where it anticipates that
any date will not be met, stating the cause and a revised date.

**[letter]3.3** Where delay arises from any act or omission of the Client, or from any
third-party platform beyond the reasonable control of either Party, the relevant period shall be
extended by not less than the duration of such delay.

### [letter]4. Revisions

**[letter]4.1** Each Part includes `[3]` rounds of Revision, as defined in the Master Service
Agreement.

**[letter]4.2** Revision rounds shall be consolidated, such that a single round addresses all
changes required by the Client at that stage. Feedback submitted piecemeal across separate
occasions shall be counted as separate rounds.

### [letter]5. Acceptance

**[letter]5.1** Work shall be treated as complete when the Deliverables specified in the
applicable Part exist and function as described therein.

**[letter]5.2** Qera Private Limited shall notify the Client in writing when the work is ready
for acceptance. The Client shall have `[5 working days]` from such notice to identify in writing
any respect in which the work does not conform to the applicable Part, and Qera Private Limited
shall remedy any such non-conformity at its own cost.

**[letter]5.3** Where no non-conformity is notified within the period specified at clause
[letter]5.2, the work shall be deemed accepted.

**[letter]5.4** Acceptance shall be assessed solely against the specification contained in the
applicable Part, and not against commercial outcomes or matters expressly excluded therein.

### [letter]6. Variation of Scope

**[letter]6.1** Each Part specifies the work included within it. Any work not so specified
constitutes Additional Work.

**[letter]6.2** Qera Private Limited shall quote Additional Work in writing prior to commencing
it, so that the Client may determine whether to proceed before any liability for cost arises.
Qera Private Limited may decline Additional Work which it is not appropriately placed to deliver.

**[letter]6.3** No variation to scope, fees or timelines shall take effect unless confirmed by
email by both Parties.

### [letter]7. Ownership and Handover

**[letter]7.1** Title to and all intellectual property rights in the final approved Deliverables
shall pass to the Client upon payment in full of the fee for the applicable Part, and not before.
Until such payment, the Deliverables shall remain the property of Qera Private Limited.

**[letter]7.2** Each Part specifies the materials the Client shall receive upon handover.
Handover shall take place promptly upon receipt of final payment.

**[letter]7.3** Retained Materials, and the licence granted to the Client in respect of them, are
governed by clause 11 of the Master Service Agreement.

### [letter]8. Support

**[letter]8.1** A support period of `[30 days]` shall apply from the date of acceptance, at no
additional cost, covering defects in the Deliverables, being any respect in which they fail to
function as specified.

**[letter]8.2** The support period shall not extend to additional features, additional content,
altered requirements, third-party failures, platform policy changes, or any modification effected
by the Client or a third party following handover. Such work shall be quoted as Additional Work.

**[letter]8.3** Support beyond the support period is available under a separate engagement.

### [letter]9. Late Payment

**[letter]9.1** Where any invoice remains unpaid after its due date, Qera Private Limited shall
notify the Client in writing before taking any step under this clause.

**[letter]9.2** A grace period of `[7 days]` shall apply from the due date. Where the sum remains
outstanding thereafter, Qera Private Limited may serve written notice and, where the sum remains
outstanding `[7 days]` following such notice, may suspend performance until payment is received.

**[letter]9.3** Any period specified in the applicable Part shall be extended by the duration of
any suspension under clause [letter]9.2.

**[letter]9.4** Qera Private Limited shall not withhold any Deliverable, source material or
access in respect of which the sums properly due have been paid.

### [letter]10. Termination

**[letter]10.1** Either Party may terminate an engagement under this Schedule by written notice.

**[letter]10.2** Where the Client terminates, the Client shall pay for the work performed and the
resources committed as at the date of termination. Such sum shall be assessed in good faith by
reference to the stage the work has reached, and Qera Private Limited shall provide a written
statement of the basis upon which it has been calculated.

**[letter]10.3** Where the work is substantially complete as at the date of termination, being
where the effort remaining is minor relative to that already performed, the full fee for the
applicable Part shall be payable.

**[letter]10.4** Sums received in advance shall be applied against any amount payable under
clauses [letter]10.2 or [letter]10.3, and any excess shall be refunded to the Client within
`[14 days]`.

**[letter]10.5** Where Qera Private Limited terminates otherwise than for non-payment or material
breach by the Client, the Client shall pay only for work performed as at the date of termination,
and any advance held in excess of that amount shall be refunded within `[14 days]`.

**[letter]10.6** Upon termination for any reason, Qera Private Limited shall deliver to the
Client all Deliverables for which payment has been made in full, together with any account,
domain name or credential held on the Client's behalf.

## 3b. Schedule 2 — Monthly

> **Schedule [letter] — Monthly**
>
> This Schedule forms part of the Master Service Agreement between Qera Private Limited and
> the Client. It governs all work delivered on a recurring monthly basis for a recurring fee.

### [letter]0.1 What this schedule covers

The parts attached to this Schedule describe what is delivered each month. This Schedule
describes how that work is billed, approved, paused, owned and ended.

This Schedule shall be read together with the Master Service Agreement, which governs the mutual
obligations of the Parties, feedback and approval, Revisions, third-party costs, Retained
Materials and attribution.

In the event of inconsistency, the applicable Part shall prevail over this Schedule, and this
Schedule shall prevail over the Master Service Agreement.

### [letter]0.2 Fee and billing

The monthly fee for each part is stated within that part. Fees are payable in advance, before
the cycle they cover begins.

The first cycle begins on the date the first payment is received. Each subsequent cycle begins
on the same date of the following month. Where that date does not exist in a given month, the
cycle begins on the last day of that month.

An alternative billing date may be agreed in writing. Where a billing date is changed, the
first affected cycle is charged pro rata.

### [letter]0.3 Term and renewal

The engagement runs month to month from the first cycle and renews automatically unless ended
under [letter]0.11.

There is no minimum term unless stated in the part.

### [letter]0.4 Late payment and pause

Where payment is not received by the cycle start date, a grace period of `[7 days]` applies.

Where payment remains outstanding following the grace period, Qera Private Limited shall notify
the Client in writing prior to suspending performance. Where the sum remains outstanding, work
under this Schedule may be suspended. During any such suspension no work shall be performed, no
content shall be published, and no monitoring or response obligation shall subsist.

Work resumes on receipt of payment. Where a pause has occurred, the billing anniversary moves
to the date work resumed.

### [letter]0.5 Monthly capacity

Each part states the volume included in a cycle — items, posts, hours, or another stated unit.

Capacity is scoped per cycle. Where capacity is unused because the Client did not supply
inputs or approvals in time, the unused portion carries forward for up to `[2]` further
cycles and then lapses.

Carried-forward capacity is delivered subject to available scheduling and does not create an
obligation to exceed normal monthly output in any single cycle.

Unused and carried-forward capacity shall lapse upon termination. Where capacity has gone unused
by reason of any act or omission of Qera Private Limited, the Client may elect to take delivery
of such capacity during the notice period or to receive a credit in respect of it.

Capacity is not transferable between parts.

### [letter]0.6 Planning, approval and turnaround

Work under this Schedule follows an agreed monthly cycle of planning, production, review and
delivery. The Client provides a named approver.

The Client provides consolidated written feedback within `[48 hours]` of receiving any
submission. Where no feedback is received in that window, the submission is treated as
approved.

Where approvals are delayed, delivery within that cycle may be reduced accordingly and the
undelivered portion is treated under [letter]0.5.

### [letter]0.7 Revisions

Each Part includes reasonable Revision within the approved direction and plan, as defined in the
Master Service Agreement.

The reworking of any item following publication shall constitute Additional Work, the original
having been delivered and used. Where any item has been published containing an error
attributable to Qera Private Limited, such error shall be corrected at Qera Private Limited's own
cost.

### [letter]0.8 Credentials and account access

The Client provides access to each platform in scope, and retains ownership of every account.

Qera Private Limited holds access only for the duration of the engagement and for the purpose
of performing the Services. Access is not shared outside the engagement team.

Where an account is created by Qera Private Limited on the Client's behalf, it is created in
the Client's name and belongs to the Client from creation.

The Client remains responsible for maintaining its own recovery access to every platform,
including recovery email, recovery phone number and any second-factor method.

Qera Private Limited is not liable for account restriction, suspension, loss of access or
enforcement action taken by a platform.

### [letter]0.9 Ownership of content

Final approved content delivered under this Schedule may be used by the Client for its
business and marketing purposes, from the cycle in which it was paid for.

Working files, project files, raw and unused assets, internal templates, planning systems and
operational frameworks remain the property of Qera Private Limited unless the part states
otherwise.

### [letter]0.10 What is handed over on ending

Within `[14 days]` of the engagement ending, Qera Private Limited will:

- remove its own access from every platform in scope
- deliver all final approved content produced and paid for under the engagement, including
  content produced but not yet published
- deliver the final assets connected to those deliverables

Where the Client requires working files, unused concepts or planning material, Qera Private
Limited shall supply such materials as it reasonably can. Materials incorporating Retained
Materials shall be governed by clause 11 of the Master Service Agreement, and in no circumstances
shall the Client be left without the materials necessary to continue its own operations.

### [letter]0.11 Ending the engagement

Either Party may end the engagement by giving `[15 days]` written notice.

Notice takes effect at the end of the cycle in which the notice period expires. Fees for that
cycle remain payable in full and are not refundable.

Qera Private Limited may suspend or end the engagement immediately in cases of non-payment,
abusive conduct, unlawful instruction, or material breach.

### [letter]0.12 No guarantee of outcome

Qera Private Limited does not guarantee reach, engagement, follower growth, virality,
conversions, revenue, lead volume, search ranking, verification or monetisation.

Platforms change their algorithms, policies and behaviour without notice. Qera Private Limited
commits to consistent execution against the agreed plan, not to a business outcome.

---

## 3c. Schedule 3 — Setup

> **Schedule [letter] — Setup**
>
> This Schedule forms part of the Master Service Agreement between Qera Private Limited and
> the Client. It governs configuration of accounts, domains and infrastructure that are set up
> once and then operated by the Client.

### [letter]0.1 What this schedule covers

The parts attached to this Schedule describe what is set up. This Schedule describes how that
work is paid for, who owns the resulting accounts, when access transfers, and the limits of
responsibility.

This Schedule shall be read together with the Master Service Agreement.

In the event of inconsistency, the applicable Part shall prevail over this Schedule, and this
Schedule shall prevail over the Master Service Agreement.

This Schedule covers configuration only. It does not create any ongoing administration,
monitoring or support obligation.

### [letter]0.2 Fee and payment

The fee for each part is stated within that part and covers configuration work only.

Where setup work accompanies a Build engagement, the setup fee may be collected within the
Build advance. Where setup is engaged on its own, the fee is payable in full in advance.

### [letter]0.3 Third-party costs

Third-party costs are governed by clause 9 of the Master Service Agreement. For the avoidance
of doubt, domain registration and renewal, platform subscriptions and licences shall be paid by
the Client.

Where the Client's own payment method is required for a subscription — including any service
requiring ongoing payment, such as a workspace or email plan — the Client provides it before
setup begins. Qera Private Limited does not hold or maintain a payment method on the Client's
behalf.

Where Qera Private Limited pays a third-party cost on the Client's behalf, it is reimbursed at
cost plus any transfer charges. Any such cost included within a Build advance is stated in the
approved Proposal.

### [letter]0.4 Ownership of accounts

**Every account, domain and subscription created under this Schedule is created in the
Client's name and is owned by the Client from the moment it is created.**

Qera Private Limited does not register, hold or retain ownership of any Client domain,
account or subscription.

Where a domain is purchased by Qera Private Limited on the Client's behalf, it is registered
to the Client as registrant.

### [letter]0.5 Administrative access during a project

Where setup forms part of a wider engagement, Qera Private Limited holds administrative and
technical access — including DNS control — for as long as that access is operationally
required.

Access is released to the Client at the earlier of:

- completion of the engagement to which the setup relates and receipt of full payment, or
- `[30 days]` after the Client requests release in writing

Where a part states that access transfers earlier — for example, an email or workspace service
the Client needs in daily use — the part governs and access transfers on completion of that
part.

Release of administrative access does not, on its own, transfer ownership of any Build
deliverable. Ownership of Build work remains governed by Schedule 1.

### [letter]0.6 What the Client receives

On release, the Client receives full administrative access, all credentials, and a record of
the configuration applied.

Where a part includes a walkthrough, the walkthrough is delivered once. Further training is
additional work.

### [letter]0.7 Client responsibility after release

Upon release of access, the Client shall be solely responsible for the account, including
renewals, payment, user administration, security, multi-factor authentication and recovery
access. Qera Private Limited shall provide a written record of the configuration applied, so as
to enable the Client to assume such responsibility.

Qera Private Limited is not responsible for expiry, non-renewal, loss of access, service
interruption or data loss occurring after release.

The Client is advised to record its own recovery details for every account at the point of
release.

### [letter]0.8 No revisions

Setup work is configuration, not creative work. It does not include revision rounds.

Where configuration does not match what this Schedule and the part describe, it is corrected
as a fault under [letter]0.10 at no charge. Changes to what was agreed are additional work.

### [letter]0.9 Third-party approval and availability

Qera Private Limited does not guarantee the availability of any domain name, username or
handle, nor the outcome of any application for verification, approval, reinstatement or
elevated access.

Where a platform declines, delays, restricts or reverses a request, the work performed remains
payable.

### [letter]0.10 Acceptance and correction window

Setup is complete when the configuration described in the part exists and functions as
described.

A `[14-day]` correction window applies from completion, covering faults in the configuration
delivered. It does not cover changes of requirement, third-party failures, platform policy
changes, or anything modified by the Client or a third party after completion.

### [letter]0.11 Ending

Where the engagement ends before setup is complete, work performed to that date is payable.

Accounts already created remain the Client's property. Any administrative access held by Qera
Private Limited is released, subject to any outstanding payment under Schedule 1.

---

## 3d. Schedule 4 — Advice

> **Schedule [letter] — Advice**
>
> This Schedule forms part of the Master Service Agreement between Qera Private Limited and
> the Client. It governs engagements where the deliverable is analysis, recommendation or
> strategy rather than implementation.

### [letter]0.1 What this schedule covers

The parts attached to this Schedule describe what is analysed and what is delivered. This
Schedule describes how that work is paid for, what it is and is not, and the limits of
responsibility.

This Schedule shall be read together with the Master Service Agreement.

In the event of inconsistency, the applicable Part shall prevail over this Schedule, and this
Schedule shall prevail over the Master Service Agreement.

### [letter]0.2 The deliverable is a document

Work under this Schedule is delivered as a written document, a recorded walkthrough, a working
session, or a combination of these, as stated in the part.

**This Schedule includes no implementation.** Building, changing, configuring or operating
anything identified in the deliverable is separate work under Schedule 1, 2 or 3.

### [letter]0.3 Fee and payment

The fee for each part is stated within that part and is payable in full in advance.

The fee covers the analysis and the deliverable, not the outcome of acting on it.

### [letter]0.4 Scope of analysis

Analysis is limited to the material, access and information listed in the part and supplied by
the Client, and to what is publicly observable.

Where access or information is not supplied, findings are limited accordingly and this is
stated in the deliverable.

### [letter]0.5 Delivery and questions

The deliverable is issued once. The part states whether a walkthrough or question session is
included and its length.

Reasonable clarifying questions on the content of the deliverable are answered for `[14 days]`
after delivery. Extending, re-running or updating the analysis is additional work.

### [letter]0.6 No revisions

The deliverable reflects findings at the date of analysis. It is not revised to reflect a
different opinion, a changed brief or subsequent events.

Factual errors are corrected at no charge.

### [letter]0.7 Recommendations are not guarantees

Recommendations are given in good faith on the information available and represent
professional opinion, not a prediction of outcome.

The Client decides what to act on. Qera Private Limited is not responsible for the results of
implementation, whether carried out by the Client, by Qera Private Limited under another
Schedule, or by any third party.

Nothing in a deliverable under this Schedule is legal, tax, financial, medical or regulatory
advice.

### [letter]0.8 Ownership and use

Ownership of the deliverable passes to the Client on receipt of full payment.

The Client may use it internally and share it with its own advisers. It may not be published,
resold or distributed as a commercial product without written agreement.

Qera Private Limited retains ownership of the methods, frameworks, scoring systems and
templates used to produce it. These are not part of the deliverable.

### [letter]0.9 Confidentiality

Findings relating to the Client's business are treated as confidential and are not shared
outside the engagement.

Anonymised, non-identifying observations may be used in Qera Private Limited's own writing and
marketing.

### [letter]0.10 Ending

Where the engagement is terminated prior to delivery, the Client shall receive the analysis
completed as at that date in its then-current state, and shall pay only for the work performed.
Any balance held in excess of that amount shall be refunded within `[14 days]`.

---

## 4. Service 01 — Shopify storefront

**Schedule:** Build
**Dependencies:** none
**Recommended pairings:** 17 Domain and DNS, 19 Analytics and tracking, 05 Brand identity

### Overview

Setup, customisation and deployment of a Shopify storefront, built on a selected Shopify theme
and adapted to the Client's brand. The result is a live, responsive store ready to take orders.

### What is included

- Store setup and configuration
- Selection and customisation of one Shopify theme
- Homepage build
- Collection page and product page templates
- Navigation and menu structure
- Cart and checkout configuration within Shopify's native settings
- Shipping zones, tax settings and payment method setup using the Client's accounts
- Policy pages populated with Client-supplied copy
- Mobile and tablet responsiveness
- Shopify-native SEO fields — titles, descriptions, alt text, URL structure
- Upload and organisation of up to `[50]` products
- Testing across current versions of major browsers
- Deployment to the Client's domain
- One handover walkthrough

### Account and ownership arrangement

The store is built either on the Client's own Shopify account, or on a development store that
is transferred to the Client's account before launch. Either way, **the Client owns the store
from launch and holds the account.**

Qera Private Limited holds staff access during the build and for the support window. Access is
removed on request or at the end of the support window, whichever occurs first.

The Shopify subscription is paid by the Client directly. Where a paid theme is used, the licence
is purchased in the Client's name and belongs to the Client.

### Limits

| | |
|---|---|
| Page templates customised | `[8]` |
| Products uploaded | `[50]` |
| Collections | `[10]` |
| Themes | `[1]`, selected before start |
| Revision rounds | `[3]` |
| Languages | `[1]` |
| Currencies | `[1]` |

Anything beyond these is additional work.

**Page templates are the counted unit for design and build.** Products and collections are
counted separately because they use an existing template and represent upload rather than
design. Fifty products is one product template, not fifty pages.

A page that cannot be produced from an approved template counts as a new template.

Product upload beyond the stated count is quoted per additional block of `[25]` products.

### Completion criteria

The store is live on the Client's domain, orders can be placed end to end through a test
transaction, all pages listed above exist and display correctly on current desktop and mobile
browsers, and the stated number of products are uploaded and organised.

Small rendering differences between browsers, devices and operating systems are normal and do
not indicate incomplete work.

### What the Client receives

- Full ownership of the Shopify store and account
- All customisations, which live inside the store and transfer with it
- The theme licence, in the Client's name
- Any Figma design file produced for this project, as a `.fig` file
- All final image and graphic assets produced by Qera Private Limited for this store
- A handover walkthrough covering how to add products, edit pages and manage orders

There is no separate code repository for this engagement. Theme customisations exist within the
Shopify store and are handed over with it.

> **Standing rule:** Qera Private Limited shares the editable `.fig` file on every engagement
> where a Figma design was produced. This is not negotiated per client. Encode it as a default
> handover line, not a blank.

### Costs the Client pays directly

Shopify subscription · domain registration and renewal · paid theme, if used · any paid apps ·
payment gateway and transaction fees · fonts requiring a commercial licence · stock imagery, if used

### Exclusions attached

`E01 E02 E03 E04 E05 E06 E12 E13 E14 E15 E16 E17 E18 E19 E20 E21 E22 E33 E34 E35 E41 E42`

### Client inputs attached

`I01 I02 I03 I04 I05 I06 I07 I08 I09 I10`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before launch |
| Timeline | `[3]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4b. Service 02 — Custom web build

**Schedule:** Build
**Dependencies:** none
**Recommended pairings:** 17 Domain and DNS, 18 Business email and workspace, 19 Analytics and tracking, 05 Brand identity

### Overview

Design and development of a custom website built in code rather than on a visual builder or
storefront platform. The Client receives a live site, the repository containing it, and the
ability to have it maintained by any competent developer.

Use this part where the work involves writing code. Where the site is assembled on a visual
builder, use Part 03. Where the site is a storefront, use Part 01.

### What is included

- Technical architecture and stack selection
- Page design for up to `[10]` page templates
- Front-end development of all designed templates
- Responsive implementation across mobile, tablet and desktop
- Content management setup for up to `[3]` editable content types, where a CMS is in scope
- Navigation, routing and URL structure
- Contact or enquiry form with delivery to `[1]` named destination
- Standard technical SEO — metadata, sitemap, robots file, semantic markup, canonical URLs
- Basic performance optimisation — image handling, code splitting, caching headers
- Deployment to the Client's hosting account
- Repository handover
- One handover walkthrough

### Account and ownership arrangement

**Hosting takes one of two forms, selected before start.**

Where the Client hosts, the site is deployed to a hosting account in the Client's name. Where
the account is created by Qera Private Limited, it is created in the Client's name and belongs
to the Client from creation.

Where Qera Private Limited hosts — available only alongside Part 14 — the site runs on
infrastructure managed by Qera Private Limited, and hosting cost is included in the Part 14 fee.
The Client is not locked in by this arrangement: on request or on ending, Qera Private Limited
will migrate the deployment to an account of the Client's choosing, or provide a complete export
and configuration record sufficient for any competent developer to redeploy it, within
`[14 days]` and at no charge.

The repository is created in a Qera Private Limited organisation during development and
transferred to the Client on receipt of full payment.

**Qera Private Limited retains ownership of its internal starter framework, component library
and reusable systems.** Where these form part of the delivered site, the Client receives a
perpetual, non-exclusive, royalty-free licence to use, modify and host them as part of this
site. The Client does not receive the right to redistribute, resell or reuse them in a separate
project. This licence is granted on full payment and cannot be revoked.

Administrative access to hosting and DNS is held by Qera Private Limited through the build and
support window, and released under Schedule 3.

### Limits

| | |
|---|---|
| Page templates | `[10]` |
| Editable content types, where a CMS is in scope | `[3]` |
| Records across all content types | `[50]` |
| Forms | `[1]` |
| Third-party integrations | `[2]`, named before start |
| Revision rounds | `[3]` |
| Languages | `[1]` |

Anything beyond these is additional work.

**Page templates are the counted unit.** A template is a layout designed and built once. The
number of pages or records using an existing template is not limited and is not additional work.

A page that cannot be produced from an approved template counts as a new template.

The default ten templates are: home, about, contact, service listing, single service, technical
or specification, process, terms, privacy, and 404. Where a Client needs a different set, agree
the list before start and record it here.

**Content types are kinds of repeatable content** — blog posts, case studies, team members,
projects — where the Client adds and edits entries itself. Three content types means three such
kinds, with an unlimited number of entries in each. Pages that exist only once, such as the home
or contact page, are built directly and are editable where the part states so.

### Completion criteria

The site is live on the Client's domain, every page template listed above exists and functions
as described, forms deliver to the named destination, the site displays correctly on current
desktop and mobile browsers, and the repository has been transferred.

Small rendering differences between browsers, devices and operating systems are normal and do
not indicate incomplete work.

Performance, ranking and traffic outcomes are not acceptance criteria.

### What the Client receives

- The repository, transferred to an account the Client controls
- A licence to the internal framework components used in the site, as set out above
- Full ownership of the hosting account and deployment
- Environment variables and configuration required to run and deploy the site
- Any Figma design file produced for this project, as a `.fig` file
- All final image and graphic assets produced by Qera Private Limited for this site
- A handover walkthrough covering deployment, content editing and routine changes

### Costs the Client pays directly

Hosting · domain registration and renewal · CMS subscription, where a hosted CMS is used ·
commercial font licences · stock imagery, if used · any paid third-party service used by the
site · email delivery service for forms, where volume requires one

### Exclusions attached

`E01 E02 E03 E04 E05 E06 E09 E11 E13 E21 E22 E23 E24 E25 E26 E27 E28 E36 E41 E42 E43 E47 E48 E49 E50 E52 E53`

### Client inputs attached

`I01 I02 I03 I09 I12 I14 I15 I16 I17 I18 I19 I20 I26 I27 I28 I31 I33 I35 I36 I37`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before launch |
| Timeline | `[6]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4c. Service 03 — Webflow or Framer site

**Schedule:** Build
**Dependencies:** none
**Recommended pairings:** 17 Domain and DNS, 19 Analytics and tracking, 05 Brand identity

### Overview

Design and build of a website on a visual development platform — Webflow or Framer — adapted to
the Client's brand. The Client receives a live site and full ownership of the project inside
their own platform account, editable without a developer.

Use this part where the site is assembled on a visual builder. Where the work involves writing
an application in code, use Part 02.

### What is included

- Platform and plan selection
- Design and build of up to `[10]` page templates
- Responsive implementation across the platform's breakpoints
- Collection or CMS setup for up to `[3]` content types, where the plan supports it
- Navigation, routing and URL structure
- Contact or enquiry form using the platform's native form handling
- Platform-native SEO fields — page titles, descriptions, alt text, URL slugs, sitemap
- Native interactions and transitions available within the platform
- Domain connection and publishing
- Project transfer to the Client's account
- One handover walkthrough

### Account and ownership arrangement

The site is built in a Qera Private Limited workspace during development and transferred to the
Client's own platform account on receipt of full payment. **The Client owns the project from
transfer.**

The platform subscription is paid by the Client directly. Where a paid template is used, it is
licensed in the Client's name.

Qera Private Limited holds collaborator access during the build and for the support window.
Access is removed on request or at the end of the support window, whichever occurs first.

### Limits

| | |
|---|---|
| Page templates | `[10]` |
| CMS collections | `[3]` |
| Records across all collections | `[50]` |
| Forms | `[1]` |
| Third-party embeds or integrations | `[2]`, named before start |
| Revision rounds | `[3]` |
| Languages | `[1]` |

Anything beyond these is additional work.

**Page templates are the counted unit.** A template is a layout designed and built once. The
number of pages or collection records using an existing template is not limited and is not
additional work.

A page that cannot be produced from an approved template counts as a new template.

The default ten templates are: home, about, contact, service listing, single service, technical
or specification, process, terms, privacy, and 404. Where a Client needs a different set, agree
the list before start and record it here.

Functionality not natively supported by the selected platform and plan is outside this part.
Where the Client requires it, the work moves to Part 02 or is quoted as additional work.

### Completion criteria

The site is published on the Client's domain, every page template listed above exists and
functions as described, forms deliver to the named destination, the site displays correctly at
the platform's standard breakpoints on current browsers, and the project has been transferred to
the Client's account.

Small rendering differences between browsers, devices and operating systems are normal and do
not indicate incomplete work.

### What the Client receives

- Full ownership of the project within their own platform account
- Editor and designer access under their own subscription
- Any Figma design file produced for this project, as a `.fig` file
- All final image and graphic assets produced by Qera Private Limited for this site
- A handover walkthrough covering editing, publishing and CMS management

There is no code repository for this engagement. The site exists within the platform and is
handed over with the project.

### Costs the Client pays directly

Platform subscription and site plan · domain registration and renewal · paid templates, if used ·
commercial font licences · stock imagery, if used · any paid third-party embed or service

### Exclusions attached

`E01 E02 E03 E04 E05 E06 E09 E11 E13 E15 E16 E21 E22 E25 E26 E28 E29 E30 E31 E35 E36 E41 E42 E43 E47 E48 E49 E50 E51 E53`

### Client inputs attached

`I01 I02 I09 I12 I14 I15 I16 I17 I18 I19 I20 I26 I27 I28 I31 I33 I35 I36 I37`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before launch |
| Timeline | `[4]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4d. Service 04 — Landing page or funnel

**Schedule:** Build
**Dependencies:** none
**Recommended pairings:** 19 Analytics and tracking, 07 Conversion optimisation build, 13 Paid social management

### Overview

Design and build of a small set of pages aimed at a single conversion goal — a campaign page, a
lead capture page, or a short sequence leading to one action. Built for speed of delivery and
measurable response rather than as a full site.

Use this part where the scope is a single conversion goal and a small page count. Where the
Client needs a full site with navigation, multiple sections and ongoing content, use Part 02 or
Part 03.

### What is included

- One conversion goal, defined and agreed before start
- Design and build of up to `[3]` pages, including any thank-you or confirmation page
- Responsive implementation across mobile, tablet and desktop
- One lead capture or enquiry form with delivery to `[1]` named destination
- Connection to `[1]` named email or CRM destination, where the Client's account is provided
- Conversion event setup on the Client's existing analytics, where access is provided
- Page-level SEO fields
- Deployment to the Client's domain or subdomain
- One handover walkthrough

### Account and ownership arrangement

Pages are deployed to a hosting or platform account in the Client's name. Where the account is
created by Qera Private Limited, it is created in the Client's name and belongs to the Client
from creation.

Where pages are built in code, the repository is transferred on full payment and the framework
licence described in Part 02 applies on the same terms. Where pages are built on a visual
platform, the project is transferred on full payment.

### Limits

| | |
|---|---|
| Pages | `[3]` |
| Conversion goals | `[1]` |
| Forms | `[1]` |
| Form fields | `[6]` |
| Destination integrations | `[1]`, named before start |
| Revision rounds | `[2]` |
| Design variants for testing | `[0]` |

Anything beyond these is additional work.

This part does not include navigation systems, content management, blog structures or
multi-section site architecture. Where those are required, the work moves to Part 02 or Part 03.

### Completion criteria

The pages are live at the agreed address, the form submits successfully to the named
destination through a test submission, the conversion event fires where analytics access was
provided, and the pages display correctly on current desktop and mobile browsers.

**Conversion rate, lead volume, cost per lead and campaign performance are not acceptance
criteria and are not guaranteed.**

### What the Client receives

- The repository or platform project, transferred as set out above
- Full ownership of the hosting or platform account
- Any Figma design file produced for this project, as a `.fig` file
- All final image and graphic assets produced by Qera Private Limited for these pages
- A handover walkthrough covering editing, publishing and where submissions arrive

### Costs the Client pays directly

Hosting or platform subscription · domain or subdomain costs · CRM or email platform
subscription · commercial font licences · stock imagery, if used · advertising spend

### Exclusions attached

`E01 E02 E03 E04 E06 E09 E11 E13 E15 E19 E22 E25 E26 E30 E31 E36 E38 E39 E40 E41 E43 E46 E47 E48 E49 E50 E52 E53`

### Client inputs attached

`I01 I02 I07 I09 I12 I14 I16 I17 I18 I19 I26 I27 I28 I31 I33 I35 I37 I38`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before launch |
| Timeline | `[2]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4e. Boundary rules — parts 01 to 04

These four overlap in the Client's mind and must not overlap in the contract. Encode as
selection guidance in the builder.

| Question | Answer | Part |
|---|---|---|
| Does it sell products through a cart and checkout? | yes | 01 Shopify storefront |
| Is code being written for it? | yes | 02 Custom web build |
| Is it assembled on Webflow or Framer? | yes | 03 Webflow or Framer site |
| Is it 1–3 pages aimed at one conversion goal? | yes | 04 Landing page or funnel |

Applied in order — the first yes wins. A Shopify store is Part 01 even though code may be
touched. A three-page campaign site in Webflow is Part 04, not Part 03, because the conversion
goal and page count define the engagement.

### Counting rule — all four parts

Page templates are the unit that carries cost. A template is a layout designed and built once.
Every page or record that uses an approved template is unlimited and free, because it is data
entry rather than design.

The guard against abuse is not a page limit. It is the definition: **a page that cannot be
produced from an approved template counts as a new template**, and new templates are additional
work. This lets a Client add forty case studies at no charge, while a request for one page with
a layout nobody has designed is correctly priced.

Do not add a content page limit to any part. It creates arguments over work that costs nothing.

Where a part involves a catalogue — products, collections, posts — count those separately, since
upload volume is real time even though it is not design time.

**Do not attach two of these parts to one contract for the same property.** Where a Client wants
a full site and a separate campaign page, that is two properties and two parts, each with its
own fee and page count.


---

## 4f. Service 05 — Brand identity

**Schedule:** Build
**Dependencies:** none
**Recommended pairings:** 06 Design system, 01/02/03 any web build, 11 Content production

### Overview

Creation of a visual identity for the Client's business — logo, typography, colour and the rules
governing their use. The Client receives a complete identity they own outright, in every file
format needed to apply it across print, screen and third-party suppliers.

This part covers visual identity only. Naming, tagline and verbal identity are not included.

### What is included

- Discovery session and written direction, agreed before design begins
- `[2]` initial identity directions, presented together
- Development of `[1]` selected direction to completion
- Primary logo plus `[3]` variants — typically horizontal, stacked and icon-only
- Monochrome and reversed versions of every variant
- Typography selection — `[2]` typefaces, with weights and usage rules
- Colour palette with primary, secondary and neutral values, in HEX, RGB and CMYK
- Clear space, minimum size and misuse rules
- `[2]` supporting brand elements — pattern, texture, graphic device or similar
- Brand guidelines document covering all of the above
- Full file export in vector and raster formats
- One handover walkthrough

### Account and ownership arrangement

Ownership of the final approved identity transfers to the Client on receipt of full payment.
This includes the logo, its variants, the palette, the layouts and the guidelines document.

Unselected directions, exploratory work and rejected concepts remain the property of Qera
Private Limited and may be developed for other purposes.

**Originality and trademark.** Every identity is designed as original work. Before presenting
any direction, Qera Private Limited carries out reasonable checks — public trademark register
searches in the Client's primary market, general and image-based web searches, and domain and
social handle availability — and will not knowingly present a mark that conflicts with something
already in use. Where a check raises a concern, the Client is told before the direction goes
further.

These checks are professional diligence, not legal clearance. Qera Private Limited is not a
trademark attorney and cannot search every register, class or territory, and cannot guarantee
that a mark is registrable or free from third-party rights. **Before commercial use or filing,
the Client should obtain formal clearance from a trademark attorney**, and Qera Private Limited
will supply whatever the Client's attorney needs to carry that out. Responsibility for the
decision to adopt and register a mark, and for any claim arising from it, rests with the
Client.

Typefaces are licensed, not owned. Where a commercial typeface is selected, the licence is
purchased in the Client's name and the Client is responsible for its terms and renewal.
Qera Private Limited will identify a freely licensable alternative on request.

### Limits

| | |
|---|---|
| Initial directions presented | `[2]` |
| Directions developed to completion | `[1]` |
| Logo variants | `[3]` |
| Typefaces | `[2]` |
| Supporting brand elements | `[2]` |
| Revision rounds on the selected direction | `[3]` |
| Applications or mockups | `[3]` |

Anything beyond these is additional work. A request to develop a second direction to completion,
or to restart from new directions after a selection has been made, is a new engagement.

### Completion criteria

The selected direction has been approved in writing, all variants and formats listed above have
been produced, and the guidelines document has been delivered.

Subjective preference expressed after written approval of a direction is not grounds for
rejection and is addressed under the additional work terms of this Schedule.

### What the Client receives

- Logo files in vector format — AI or SVG, plus EPS and PDF
- Logo files in raster format — PNG with transparency, at standard sizes
- Favicon and app icon exports
- Full colour specification in HEX, RGB and CMYK
- The brand guidelines document as a PDF
- The editable Figma file containing the identity, as a `.fig` file
- A handover walkthrough covering correct application

### Costs the Client pays directly

Commercial typeface licences · stock imagery used in mockups, if any · trademark search or
filing costs · print or production costs

### Exclusions attached

`E02 E03 E06 E07 E10 E14 E38 E39 E44 E45 E48 E49 E54 E59 E60 E61 E63`

### Client inputs attached

`I17 I20 I21 I26 I27 I28 I29 I33 I34 I35 I36 I37 I42 I43`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before final file release |
| Timeline | `[4]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4g. Service 06 — Design system

**Schedule:** Build
**Dependencies:** 05 Brand identity, or an existing identity the Client already owns
**Recommended pairings:** 02 Custom web build, 03 Webflow or Framer site

### Overview

Creation of a reusable component library and design foundation in Figma, so that future screens
and pages can be assembled consistently without redesigning from scratch each time.

This part produces design files. It does not produce code. Where components are to be built in
code, that work sits under Part 02.

### What is included

- Audit of existing design files or interfaces, where they exist
- Design tokens — colour, typography, spacing, radius, elevation, breakpoints
- Component library of up to `[30]` components, with variants and states
- Interactive and disabled states for every component where applicable
- Responsive behaviour defined at `[3]` breakpoints
- Layout grid and spacing system
- Usage documentation within the Figma file
- `[3]` example screens assembled from the library, to demonstrate correct use
- Figma library published for Client use
- One handover walkthrough

### Account and ownership arrangement

The system is built in a Qera Private Limited Figma workspace and delivered as a file the Client
owns. Ownership transfers on receipt of full payment.

**Qera Private Limited retains ownership of its internal component library, naming conventions
and system methodology.** Where these form the basis of the delivered system, the Client receives
a perpetual, non-exclusive, royalty-free licence to use, modify and extend the delivered system
within their own business. The Client does not receive the right to redistribute or resell it as
a product. This licence is granted on full payment and cannot be revoked.

Where a Figma organisation licence is required for library publishing, it is held on the
Client's subscription.

### Limits

| | |
|---|---|
| Components | `[30]` |
| Breakpoints | `[3]` |
| Example screens | `[3]` |
| Themes, including dark mode | `[1]` |
| Platforms — web, iOS, Android | `[1]` |
| Revision rounds | `[3]` |

Anything beyond these is additional work.

A component is a reusable element with defined variants and states. Instances of an existing
component are unlimited. An element that cannot be produced from an existing component counts as
a new component.

### Completion criteria

Every component listed in the agreed inventory exists in the library with its defined variants
and states, tokens are applied throughout rather than hardcoded, the example screens are
assembled entirely from library components, and the library is published and accessible to the
Client.

### What the Client receives

- The complete Figma file, as a `.fig` file and as a published library
- A licence to the underlying system as set out above
- Token values in a portable format for developer handoff
- Usage documentation within the file
- A handover walkthrough covering extension and maintenance

### Costs the Client pays directly

Figma subscription and seats · commercial typeface licences · any paid Figma plugin used in the
delivered file

### Exclusions attached

`E02 E03 E06 E09 E11 E15 E16 E25 E28 E48 E49 E50 E62 E63`

### Client inputs attached

`I17 I18 I19 I20 I26 I27 I28 I33 I35 I36 I37 I46`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before file release |
| Timeline | `[4]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4h. Service 07 — Conversion optimisation build

**Schedule:** Build
**Dependencies:** 19 Analytics and tracking, or existing analytics with historic data
**Recommended pairings:** 04 Landing page or funnel, 15 Conversion optimisation retainer

### Overview

Analysis of an existing site and implementation of a defined set of changes intended to improve
conversion. Delivered once, against a fixed list of changes agreed before work begins.

This part is a one-time implementation. Ongoing testing, iteration and monitoring over successive
months sit under Part 15.

### What is included

- Review of existing analytics covering at least `[3]` months of data
- Review of the conversion path from entry to completion
- Heuristic review of up to `[5]` key page templates
- A written findings document with prioritised recommendations
- Implementation of up to `[10]` agreed changes
- Conversion event and funnel setup, where analytics access is provided
- Before and after measurement setup, so results can be observed by the Client
- One walkthrough of findings and changes made

### Account and ownership arrangement

Work is performed on the Client's existing site, platform and analytics accounts, which remain
under the Client's ownership throughout.

Qera Private Limited requires administrative access for the duration of the engagement. Access
is removed at the end of the support window or on request.

**The Client is responsible for maintaining a working backup before changes are made.** Where the
platform does not provide version history, Qera Private Limited will take a copy of the affected
templates before modification.

### Limits

| | |
|---|---|
| Page templates reviewed | `[5]` |
| Changes implemented | `[10]` |
| Conversion goals analysed | `[1]` |
| Analytics platforms | `[1]` |
| Revision rounds per change | `[1]` |

Anything beyond these is additional work.

A change is a discrete modification to copy, layout, form, flow or component. Rebuilding a page,
restructuring navigation or replacing a template is not a change and sits under Part 02, 03
or 04.

### Completion criteria

The findings document has been delivered, the agreed list of changes has been implemented and is
live, conversion tracking fires correctly where access was provided, and the walkthrough has been
delivered.

**Conversion rate, revenue, lead volume and any improvement over the prior period are not
acceptance criteria.** Conversion outcomes depend on traffic quality, offer, pricing, market
conditions and seasonality, none of which are within Qera Private Limited's control. This part
delivers analysis and implementation, not a result.

Where a change reduces measured performance, reverting it is included within the support window.

### What the Client receives

- The findings document as a PDF
- A written record of every change made, with the reasoning for each
- Conversion tracking and funnel configuration in the Client's analytics account
- Any Figma file produced for redesigned sections, as a `.fig` file
- A walkthrough of findings and changes

### Costs the Client pays directly

Analytics, heatmap or session recording subscriptions · testing tool subscriptions ·
platform subscriptions · any paid app required to implement an agreed change

### Exclusions attached

`E01 E02 E03 E22 E25 E26 E38 E39 E43 E45 E46 E47 E50 E52 E56 E64 E65 E66`

### Client inputs attached

`I01 I03 I07 I09 I26 I28 I31 I33 I37 I38 I44 I45`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before changes go live |
| Timeline | `[3]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4i. Boundary rules — parts 05, 06 and 07

**05 and 06 are the pair Clients confuse most.** Brand identity is what the business looks like —
logo, colour, type, applied anywhere including print and packaging. A design system is how
interfaces get built — components, states, tokens, applied only to screens.

A Client asking for "brand guidelines" usually means 05. A Client asking for "a UI kit",
"components" or "so our developers stay consistent" means 06. A Client who wants both should buy
both, and 05 runs first because 06 depends on it.

Never deliver 06 without an identity in place. If the Client has no identity and does not want
one, the engagement produces components with no foundation and will be reworked later.

**07 against 15.** Part 07 is a fixed list of changes delivered once. Part 15 is continuous
testing and iteration billed monthly. A Client who wants to "keep improving it" is buying 15, not
a larger 07. Do not scale 07 past its change limit to avoid selling a retainer — an unbounded
one-time engagement is the worst commercial shape available.

**07 against 02, 03 and 04.** Part 07 modifies what exists. The moment the work becomes a
rebuild, a restructure or a new template, it belongs to a build part with its own fee.


---

## 4j. Service 08 — Automation build

**Schedule:** Build
**Dependencies:** none
**Recommended pairings:** 16 AI system operation, 19 Analytics and tracking, 02 Custom web build

### Overview

Design and build of automated workflows that move data and trigger actions between the Client's
existing systems — forms, spreadsheets, CRMs, messaging platforms, storefronts and internal
tools. Delivered as working automations the Client owns and can operate.

This part covers rule-based automation. Where a workflow depends on a language model to
interpret, generate or decide, use Part 09.

### What is included

- Mapping of the current process before automation
- Design of up to `[3]` workflows, documented before build
- Build and configuration of those workflows on the agreed platform
- Connection to up to `[5]` named systems
- Error handling and failure notification to `[1]` named destination
- Testing against sample data supplied by the Client
- Written documentation of what each workflow does and how to pause it
- One handover walkthrough

### Account and ownership arrangement

Workflows are built in accounts held in the Client's name. Where an account is created by Qera
Private Limited, it is created in the Client's name and belongs to the Client from creation.

Platform subscriptions and usage costs are paid by the Client directly, on the Client's own
billing method.

Qera Private Limited holds access for the build and support window, released under Schedule 3.

**Qera Private Limited retains ownership of its internal automation patterns, templates and
reusable logic.** The Client receives a perpetual, non-exclusive, royalty-free licence to use and
modify the delivered workflows within their own business, granted on full payment and
irrevocable. The Client does not receive the right to redistribute or resell them.

### Limits

| | |
|---|---|
| Workflows | `[3]` |
| Connected systems | `[5]` |
| Trigger types per workflow | `[2]` |
| Notification destinations | `[1]` |
| Revision rounds | `[2]` |

Anything beyond these is additional work.

Automation is built against the systems, data formats and platform behaviour existing at the
date of build. Where a connected system changes its interface, pricing, permissions or
availability, repair is additional work.

### Completion criteria

Each workflow triggers correctly, completes its defined actions against test data, and reports
failures to the named destination. Documentation has been delivered.

**Volume of leads, time saved, error rate and business outcome are not acceptance criteria.**

### What the Client receives

- The workflows, in accounts the Client owns
- A licence to the underlying patterns as set out above
- Written documentation for each workflow, including how to pause or disable it
- A handover walkthrough covering monitoring, editing and failure response

### Costs the Client pays directly

Automation platform subscription · connected system subscriptions · task, operation or execution
costs · messaging or email delivery costs

### Exclusions attached

`E22 E23 E24 E27 E30 E37 E47 E48 E50 E51 E52 E53 E56 E57 E67 E70 E72 E73`

### Client inputs attached

`I01 I08 I26 I27 I28 I30 I37 I47 I48 I49`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before workflows go live |
| Timeline | `[3]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4k. Service 09 — AI assistant build

**Schedule:** Build
**Dependencies:** none
**Recommended pairings:** 16 AI system operation, 08 Automation build, 02 Custom web build

### Overview

Design and build of an assistant powered by a third-party language model — a support responder,
an internal knowledge assistant, a lead qualifier or similar — configured against the Client's
own content and connected to the Client's systems.

### What is included

- Definition of the assistant's purpose, scope and refusal boundaries
- Model and provider selection
- System instruction design and iteration
- Knowledge base setup from up to `[100]` documents or pages supplied by the Client
- Retrieval configuration, where the assistant answers from Client content
- Connection to up to `[2]` named systems for lookup or action
- Escalation path to a human for anything outside scope
- Testing against `[30]` representative cases supplied or agreed with the Client
- Written documentation covering scope, limits and how to disable the assistant
- One handover walkthrough

### Account and ownership arrangement

The assistant runs on provider accounts held in the Client's name, on the Client's own billing
method. Usage costs are paid by the Client directly.

**Outputs are probabilistic and are not guaranteed to be accurate, consistent or repeatable.**
The same input may produce different output. The assistant may state something incorrect in a
confident tone.

**The Client is responsible for reviewing output before it is relied upon, published or acted
on**, and names a person accountable for that review. Qera Private Limited is not liable for any
consequence of output that was published, sent or acted upon without review.

The assistant must not be deployed for medical, legal, financial, employment, credit,
insurance or safety decisions, or any use where an incorrect output causes regulatory exposure
or physical harm, unless that use is expressly named in this part and the Client has obtained its
own compliance advice.

Qera Private Limited does not use Client data to train models. Third-party providers process
submitted data under their own terms, which Qera Private Limited does not control. The Client
identifies any data that must not be sent to a third-party provider before build begins.

Qera Private Limited retains ownership of its internal prompt patterns, evaluation methods and
system architecture, licensed to the Client on the same terms as Part 08.

### Limits

| | |
|---|---|
| Assistants | `[1]` |
| Knowledge base documents at build | `[100]` |
| Connected systems | `[2]` |
| Deployment surfaces — site, WhatsApp, internal tool | `[1]` |
| Languages | `[1]` |
| Test cases | `[30]` |
| Revision rounds | `[2]` |

Anything beyond these is additional work.

### Completion criteria

The assistant is deployed on the agreed surface, responds within its defined scope, escalates
outside it, answers the agreed test cases acceptably as judged against the approved definition,
and documentation has been delivered.

**Accuracy rate, resolution rate, deflection rate and customer satisfaction are not acceptance
criteria and are not guaranteed.** A model that answers a test case correctly at handover may
answer it differently later.

### What the Client receives

- The deployed assistant, on accounts the Client owns
- System instructions and configuration, in a portable format
- Knowledge base in its source form
- A licence to the underlying patterns as set out above
- Documentation covering scope, known limits and how to disable it
- A handover walkthrough

### Costs the Client pays directly

Model and API usage costs · vector or retrieval infrastructure · hosting · platform
subscriptions · messaging channel costs

### Exclusions attached

`E22 E23 E27 E30 E37 E47 E48 E50 E52 E53 E54 E56 E67 E68 E69 E70 E71 E72 E73`

### Client inputs attached

`I01 I08 I09 I26 I27 I28 I30 I37 I47 I48 I49 I50 I51`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before deployment |
| Timeline | `[4]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4l. Service 10 — Generative content system

**Schedule:** Build
**Dependencies:** 05 Brand identity, or an existing identity the Client already owns
**Recommended pairings:** 11 Content production, 16 AI system operation

### Overview

Build of a repeatable system for producing content at volume using generative tools — templates,
prompt sets, brand constraints and a defined workflow, so that the Client or Qera Private Limited
can generate consistent output without starting from nothing each time.

The deliverable is the system, not a content library. Content produced on an ongoing basis sits
under Part 11 or Part 16.

### What is included

- Definition of output types and formats in scope
- Brand constraint set — tone, visual rules, prohibited language and subjects
- `[5]` prompt or generation templates, tested and documented
- Reference examples showing acceptable and unacceptable output
- Review checklist for output before publication
- `[10]` sample outputs produced during build, as demonstration
- Written documentation covering operation and limits
- One handover walkthrough

### Account and ownership arrangement

The system runs on provider accounts held in the Client's name, on the Client's own billing
method.

**Generated output is not guaranteed to be original, accurate or free from resemblance to
existing work.** Generative tools produce output derived from training data whose composition and
licensing Qera Private Limited does not control and cannot audit.

**Ownership and copyright status of generated output is unsettled and varies by jurisdiction.**
Qera Private Limited makes no assurance that generated output attracts copyright protection, that
it can be registered, or that it does not infringe third-party rights. The Client is responsible
for its own clearance before commercial use, and for compliance with each provider's terms
including any attribution or disclosure requirement.

**Every output must be reviewed by a named person before publication.** The Client accepts that
publishing unreviewed generative output carries reputational and legal risk that sits with the
Client.

Qera Private Limited retains ownership of its internal prompt patterns, constraint frameworks and
review methods, licensed to the Client on the same terms as Part 08.

### Limits

| | |
|---|---|
| Output types | `[2]` |
| Generation templates | `[5]` |
| Sample outputs produced at build | `[10]` |
| Providers or tools configured | `[2]` |
| Languages | `[1]` |
| Revision rounds | `[2]` |

Anything beyond these is additional work.

### Completion criteria

Every template produces output within the agreed brand constraints across the sample set, the
review checklist has been delivered, and documentation is complete.

**Volume, engagement, reach and commercial performance of generated content are not acceptance
criteria.**

### What the Client receives

- All generation templates in a portable format
- The brand constraint set as a written document
- The review checklist
- The sample outputs produced during build
- A licence to the underlying patterns as set out above
- A handover walkthrough

### Costs the Client pays directly

Generative tool subscriptions · model and API usage costs · stock or reference assets ·
commercial typeface licences

### Exclusions attached

`E01 E02 E03 E06 E07 E38 E40 E44 E46 E47 E48 E54 E60 E67 E68 E69 E70 E71 E73`

### Client inputs attached

`I17 I19 I20 I21 I26 I27 I28 I33 I35 I36 I37 I47 I50 I51`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | `[50%]` on signing, `[50%]` before handover |
| Timeline | `[3]` weeks from start date |
| Support | `[30]` days from acceptance |

---

## 4m. Service 16 — AI system operation

**Schedule:** Monthly
**Dependencies:** 08, 09 or 10, or an existing system the Client already owns
**Recommended pairings:** 08, 09, 10

### Overview

Ongoing operation of automations, assistants or generative systems already built — monitoring
that they are running, responding when they fail, adjusting them as the Client's business
changes, and keeping them working when providers change underneath them.

Without this part, a delivered system is the Client's to operate from the end of its support
window.

### What is included each cycle

- Monitoring of `[3]` systems for failure and interruption
- Response to failures within `[2]` working days of detection or report
- Up to `[4]` hours of adjustment, tuning or configuration change
- Review of provider changes affecting the systems in scope
- Review of usage costs against the prior cycle
- A written monthly summary covering failures, changes made and cost movement

### Account and ownership arrangement

All systems, accounts and provider billing remain in the Client's name throughout. Qera Private
Limited holds operational access only, and only for systems named in this part.

**Qera Private Limited does not guarantee uptime, availability, accuracy or continuity of any
third-party model, platform or provider.** Providers change pricing, deprecate models, alter
behaviour, restrict access and discontinue services without notice and without Qera Private
Limited's involvement.

Where a provider change requires rebuilding rather than adjusting a system, that work is quoted
separately as a Build engagement.

**Review of output before use remains the Client's responsibility** on the same terms as the part
under which the system was built. This part does not add a review or approval obligation.

Usage costs are paid by the Client directly. Qera Private Limited monitors and reports cost
movement but does not control it and is not liable for cost increases caused by usage, provider
pricing or the Client's own configuration changes.

### Limits

| | |
|---|---|
| Systems monitored | `[3]` |
| Adjustment hours per cycle | `[4]` |
| Failure response target | `[2]` working days |
| Providers in scope | `[2]` |

Anything beyond these is additional work.

This part does not include out-of-hours response, a guaranteed resolution time, or continuous
real-time monitoring. Monitoring means scheduled checks and automated failure alerts, not
constant human supervision.

Adjustment means change within the system's existing design. Building a new workflow, adding a
new connected system, extending an assistant's scope or adding an output type is a Build
engagement.

### Completion criteria

Not applicable. Delivery under this part is measured by cycle, against the included items above.

### What the Client receives

- Continued operation of the named systems
- A written monthly summary
- Any configuration changes made, reflected in the Client's own accounts

On ending, all access held by Qera Private Limited is removed and configuration is left in
working order as at the final cycle.

### Costs the Client pays directly

Model and API usage · platform and provider subscriptions · infrastructure · messaging costs

### Exclusions attached

`E22 E27 E37 E48 E49 E52 E53 E56 E57 E67 E68 E69 E70 E71 E72 E73`

### Client inputs attached

`I01 I08 I26 I28 I30 I41 I47 I50 I51`

### Fee and cycle

| | |
|---|---|
| Monthly fee | `[ ]` |
| Billing | in advance, on the anniversary of first payment |
| Notice | `[15]` days |
| Rollover of unused capacity | `[2]` cycles |

---

## 4n. Boundary rules — parts 08, 09, 10 and 16

**08 against 09.** If the workflow follows fixed rules, it is 08. If any step requires a model to
interpret, generate, summarise or decide, it is 09. A form that routes a lead by dropdown value
is 08. A form that routes a lead by reading the message is 09.

**09 against 10.** Part 09 answers. Part 10 produces. An assistant responding to a person is 09.
A system generating captions, images or descriptions at volume is 10.

**Anything built is 08, 09 or 10. Anything operated is 16.** These are separate services with
separate fees and they are never the same line item. A Client who wants the system run for them
buys the build once and the operation monthly.

**Do not sell 16 without a build part, unless the system already exists.** Where the Client owns a
system built elsewhere, an audit under Part 21 runs first — taking operational responsibility for
something never inspected is uncosted risk.

**Where a provider deprecates a model or changes behaviour**, 16 covers adjustment within the
existing design. It does not cover rebuilding. That line is the commercial protection in this
cluster and must not be blurred to keep a Client happy.


---

## 4o. Platform matrix — shared by parts 11, 12 and 13

Clients want different platforms and different activities on each. Rather than a service per
platform, all three social parts read from one matrix agreed before the cycle begins.

Rows are platforms. Columns are activities. Ticked cells are in scope. Everything untocked is
outside the engagement.

| Platform | Feed posts | Stories | Reels or video | Comment replies | Direct messages | Paid campaigns |
|---|---|---|---|---|---|---|
| Instagram | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Facebook | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| TikTok | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| LinkedIn | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| X | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| YouTube | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Pinterest | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| WhatsApp | — | ☐ | — | — | ☐ | ☐ |
| Google Business | ☐ | — | — | ☐ | ☐ | — |

Rules for the matrix:

- The first three columns are produced under Part 11. The next two are handled under Part 12.
  The last is managed under Part 13. A ticked cell with no corresponding part attached to the
  contract is an error and must be caught before export.
- **A platform not listed on the matrix is not in scope**, including a platform launched or
  adopted after the engagement begins.
- Adding a platform or a column mid-engagement is a fee change, not a request. Volume is set per
  part and does not stretch to cover new platforms.
- Store the matrix on the contract, not on the service. Two clients buying Part 12 will have
  different matrices.

In the builder, render the matrix once and let each attached part read its own columns from it.
In the generated contract, render it once inside the first attached social part and reference it
from the others.

---

## 4p. Service 11 — Content production

**Schedule:** Monthly
**Dependencies:** 05 Brand identity, or an existing identity the Client already owns
**Recommended pairings:** 12 Community management, 13 Paid social management, 10 Generative content system

### Overview

Monthly planning, design and delivery of social content — static posts, carousels, stories and
short-form video edits — produced against an agreed calendar and the platforms ticked on the
matrix.

This part produces and publishes content. It does not include replying to the audience, which is
Part 12.

### What is included each cycle

- A content calendar for the cycle, delivered for approval before production
- `[12]` static posts or carousels
- `[8]` stories
- `[4]` short-form video edits from Client-supplied footage
- Caption writing for every delivered item
- Hashtag and keyword selection
- Scheduling and publishing to the platforms ticked on the matrix
- A written summary at cycle end covering what was published

Carousel slides count toward the static post allowance at `[1]` post per carousel of up to
`[6]` slides.

### Account and ownership arrangement

All platform accounts remain owned by and registered to the Client throughout. Qera Private
Limited holds access only for the engagement and only for platforms on the matrix.

The Client maintains its own recovery email, recovery phone and second-factor access on every
account. Qera Private Limited is not liable for loss of access, restriction, suspension or
enforcement action taken by a platform.

Final approved content delivered in a cycle may be used by the Client for its business from the
cycle in which it was paid for. Working files, unused concepts, raw footage and project files
remain the property of Qera Private Limited, as set out in Schedule 2.

Content is produced from footage and assets supplied by the Client. Shooting, filming and
photography are not included.

### Limits

| | |
|---|---|
| Static posts or carousels | `[12]` |
| Stories | `[8]` |
| Short-form video edits | `[4]` |
| Maximum video length | `[60]` seconds |
| Slides per carousel | `[6]` |
| Platforms | as ticked on the matrix |
| Revision rounds per item | `[1]` |
| Rollover of unused capacity | `[2]` cycles |

Anything beyond these is additional work.

The same item published to more than one platform counts once, provided no separate resizing or
re-editing beyond standard format adaptation is required.

### Completion criteria

Not applicable. Delivery under this part is measured by cycle, against the included items above.

### What the Client receives

- All final approved content for the cycle, in delivery formats
- The content calendar for the cycle
- A written summary at cycle end

### Costs the Client pays directly

Scheduling tool subscriptions · stock imagery, video or music licensing · commercial typeface
licences · advertising spend · production or shoot costs

### Exclusions attached

`E02 E03 E06 E07 E38 E39 E40 E44 E46 E52 E55 E56 E58 E76 E77 E81`

### Client inputs attached

`I05 I12 I13 I14 I16 I17 I18 I19 I20 I21 I26 I27 I28 I29 I36 I37 I40 I52`

### Fee and cycle

| | |
|---|---|
| Monthly fee | `[ ]` |
| Billing | in advance, on the anniversary of first payment |
| Notice | `[15]` days |
| Rollover of unused capacity | `[2]` cycles |

---

## 4q. Service 12 — Community management

**Schedule:** Monthly
**Dependencies:** existing accounts on the platforms in scope
**Recommended pairings:** 11 Content production, 13 Paid social management

### Overview

Monitoring and responding to the Client's audience across the platforms ticked on the matrix —
comments, direct messages, mentions and reviews — within an agreed tone and an agreed set of
approved responses.

This part handles conversation. It does not produce content, which is Part 11.

### What is included each cycle

- Monitoring of comments, direct messages and mentions on platforms ticked on the matrix
- Responses within `[1]` working day, during the agreed days and hours
- Response handling for up to `[200]` interactions
- Use of an approved response set for common questions
- Escalation of anything outside the approved set to the Client's named contact
- Flagging and hiding of spam and abusive comments
- A written summary at cycle end covering volume, themes and escalations

### Account and ownership arrangement

All accounts remain owned by and registered to the Client. Qera Private Limited responds on the
Client's behalf using access granted for the engagement, and only on platforms on the matrix.

**Qera Private Limited does not make commercial decisions on the Client's behalf.** Refunds,
discounts, order changes, complaint resolutions, pricing statements, delivery commitments, legal
positions and public statements of fault are escalated, not answered. The Client provides a named
contact and an escalation path for these.

Responses are made using the approved response set and tone supplied by the Client. Where a
question falls outside it, the response is escalated rather than improvised.

The Client remains publisher of everything appearing on its own channels and remains responsible
for the accuracy of information the Client supplied for use in responses.

Coverage is limited to the agreed days and hours. This part does not include out-of-hours,
weekend or real-time coverage unless stated.

### Limits

| | |
|---|---|
| Interactions handled per cycle | `[200]` |
| Response time target | `[1]` working day |
| Coverage days | `[Monday to Friday]` |
| Coverage hours | `[09:00 to 18:00 GST]` |
| Platforms | as ticked on the matrix |
| Languages | `[1]` |
| Rollover of unused capacity | `[0]` cycles |

Anything beyond these is additional work.

Unused interaction volume does not roll over, because capacity in this part is standby time
rather than production output.

### Completion criteria

Not applicable. Delivery under this part is measured by cycle, against the included items above.

### What the Client receives

- Responses issued on its channels within the agreed scope
- A written cycle summary covering volume, recurring themes and escalations
- A record of anything escalated and left unanswered

### Costs the Client pays directly

Inbox or social management tool subscriptions · translation services, where a second language is
agreed · any paid platform feature required for messaging

### Exclusions attached

`E01 E38 E40 E44 E46 E52 E56 E58 E74 E75 E76 E77 E81`

### Client inputs attached

`I05 I21 I26 I27 I28 I29 I30 I41 I52 I53 I55 I56`

### Fee and cycle

| | |
|---|---|
| Monthly fee | `[ ]` |
| Billing | in advance, on the anniversary of first payment |
| Notice | `[15]` days |
| Rollover of unused capacity | `[0]` cycles |

---

## 4r. Service 13 — Paid social management

**Schedule:** Monthly
**Dependencies:** 19 Analytics and tracking, or existing conversion tracking
**Recommended pairings:** 11 Content production, 04 Landing page or funnel

### Overview

Planning, setup and ongoing management of paid campaigns on the platforms ticked on the matrix —
audience structure, campaign build, budget pacing and reporting.

The management fee covers the work. Advertising spend is separate and is paid by the Client.

### What is included each cycle

- Campaign strategy for the cycle, against an objective agreed in writing
- Build and launch of up to `[3]` campaigns
- Audience and targeting setup
- Ad set structure and budget pacing
- Use of up to `[6]` creatives supplied under Part 11 or by the Client
- Ongoing optimisation — budget shifts, audience adjustment, pausing underperformers
- Conversion tracking review, where access is provided
- A written performance report at cycle end

### Account and ownership arrangement

**Advertising spend is paid by the Client directly, on the Client's own payment method,
registered on the Client's own ad account.** Qera Private Limited does not fund, advance or
hold spend on the Client's behalf under any circumstance. Where a Client's payment method fails
or is declined, campaigns stop and Qera Private Limited bears no liability for the interruption.

The ad account and business portfolio are owned by and registered to the Client. Qera Private
Limited operates as a partner with assigned access, which is revoked on request or at the end of
the engagement. Qera Private Limited does not run Client campaigns from its own ad account.

**The Client is responsible for the legality and accuracy of every claim, offer, price and
representation in its advertising**, and for compliance with advertising law and platform policy
in every territory it targets.

Platform enforcement — ad rejection, account restriction, spend limits, policy strikes and
suspension — is outside Qera Private Limited's control. Work performed remains payable where a
campaign is rejected or an account is restricted.

### Limits

| | |
|---|---|
| Campaigns built per cycle | `[3]` |
| Creatives used per cycle | `[6]` |
| Platforms | as ticked on the matrix |
| Monthly spend managed, up to | `[ ]` |
| Territories or markets | `[1]` |
| Rollover of unused capacity | `[0]` cycles |

Anything beyond these is additional work. Where managed spend exceeds the stated ceiling, the
management fee is renegotiated for the following cycle.

### Completion criteria

Not applicable. Delivery under this part is measured by cycle, against the included items above.

**Return on ad spend, cost per acquisition, cost per lead, reach and revenue are not deliverables
and are not guaranteed**, on the terms set out in Schedule 2.

### What the Client receives

- Campaigns built and running in the Client's own ad account
- A written performance report each cycle
- Full retention of all campaign structures, audiences and learning within its own account on
  termination

### Costs the Client pays directly

**All advertising spend** · platform fees · analytics or attribution tool subscriptions ·
creative production beyond what Part 11 supplies · landing page or destination costs

### Exclusions attached

`E01 E02 E03 E38 E40 E44 E46 E52 E54 E56 E58 E65 E76 E77 E78 E79 E80 E81`

### Client inputs attached

`I05 I07 I14 I16 I26 I27 I28 I31 I33 I34 I37 I38 I52 I54 I57`

### Fee and cycle

| | |
|---|---|
| Monthly management fee | `[ ]` |
| Managed spend ceiling | `[ ]` |
| Billing | in advance, on the anniversary of first payment |
| Notice | `[15]` days |
| Rollover of unused capacity | `[0]` cycles |

---

## 4s. Boundary rules — parts 11, 12 and 13

**Three parts, one matrix.** Part 11 owns the production columns, Part 12 owns the conversation
columns, Part 13 owns the paid column. A ticked cell without its part attached is a scope gap the
Client will discover before you do — validate this on export.

**11 against 12.** Producing a post is 11. Replying to what people say underneath it is 12. A
Client buying only 11 gets content published into silence, and should be told so at the point of
sale rather than in month two.

**12 against 13.** Comments on an organic post are 12. Comments on a paid ad are also 12, and
volume on ads runs far higher than organic. Where 13 is attached, set the interaction limit in 12
against expected paid volume, not organic.

**Rollover differs by part deliberately.** Part 11 rolls over because unused capacity is
undelivered production the Client paid for. Parts 12 and 13 do not, because the Client bought
availability and management time, which is consumed whether or not volume arrived.

**Never fund ad spend.** Not as a favour, not to bridge a payment gap, not for a good client. It
converts a service engagement into an unsecured loan with no recovery mechanism and no upside.


---

## 4t. Service 14 — Website maintenance

**Schedule:** Monthly
**Dependencies:** an existing site, built under Part 01, 02, 03 or 04 or by a third party
**Recommended pairings:** 15 Conversion optimisation retainer, 19 Analytics and tracking

### Overview

Keeping an existing site working — applying platform and dependency updates, taking backups,
monitoring availability, fixing faults and making small content changes each cycle.

This part maintains what exists. Adding pages, features or templates is a Build engagement.

### What is included each cycle

- Platform, framework, theme and plugin updates, applied and tested
- Security patch application
- `[1]` backup per week, retained for `[30]` days
- Uptime monitoring with alerting to `[1]` named destination
- Fault diagnosis and repair, within the hours below
- Up to `[3]` hours of content or minor change work
- Broken link and form delivery checks
- A written summary each cycle covering updates applied, faults fixed and work used

### Account and ownership arrangement

Hosting, platform and domain accounts remain owned by and registered to the Client. Qera Private
Limited holds administrative access only for the duration of the engagement.

**Uptime and availability are not guaranteed.** Monitoring means automated checks and alerting,
not continuous human supervision and not a commitment that the site stays online. Hosting
performance, platform outages, DNS failures and provider incidents sit with the providers
concerned.

Backups are taken as an additional safeguard and do not replace the Client's own responsibility
to hold an independent copy. Where a backup fails or is incomplete, liability is limited to
taking a fresh backup.

Where a third-party plugin, dependency or platform update breaks existing functionality, repair
within `[3]` hours per cycle is included. Beyond that it is additional work.

Where the site was built by a third party, Qera Private Limited maintains it as found. Pre-
existing defects, insecure code and unsupported dependencies are reported, not repaired, unless
quoted separately.

### Limits

| | |
|---|---|
| Change and repair hours per cycle | `[3]` |
| Backup frequency | `[weekly]` |
| Backup retention | `[30]` days |
| Response time to a reported fault | `[1]` working day |
| Coverage days | `[Monday to Friday]` |
| Sites maintained | `[1]` |
| Rollover of unused hours | `[1]` cycle |

Anything beyond these is additional work.

Change work means editing existing content, swapping images, adjusting copy, updating prices and
similar. It does not mean new pages, new templates, new features, redesigns or restructures.

### Completion criteria

Not applicable. Delivery under this part is measured by cycle, against the included items above.

### What the Client receives

- A maintained site with updates and patches applied
- Backups held for the stated retention period, restorable on request
- A written cycle summary
- On ending, a final backup and removal of Qera Private Limited access

### Costs the Client pays directly

Hosting · domain renewal · platform and CMS subscriptions · paid plugins, themes and licence
renewals · monitoring or backup tool subscriptions · SSL, where not provided by the host

### Exclusions attached

`E01 E02 E13 E15 E16 E22 E25 E26 E27 E38 E43 E48 E49 E52 E56 E58 E66 E76 E82 E83 E84 E85`

### Client inputs attached

`I01 I02 I03 I26 I28 I30 I41 I58 I59`

### Fee and cycle

| | |
|---|---|
| Monthly fee | `[ ]` |
| Billing | in advance, on the anniversary of first payment |
| Notice | `[15]` days |
| Rollover of unused hours | `[1]` cycle |

---

## 4u. Service 15 — Conversion optimisation retainer

**Schedule:** Monthly
**Dependencies:** 19 Analytics and tracking, or existing conversion tracking with historic data
**Recommended pairings:** 14 Website maintenance, 13 Paid social management, 04 Landing page or funnel

### Overview

Continuous improvement of an existing site or funnel — forming a hypothesis each cycle, making a
change, measuring what happened and deciding what to do next.

This part is iterative and ongoing. A fixed list of changes delivered once is Part 07.

### What is included each cycle

- Review of the prior cycle's changes against measured outcome
- `[2]` prioritised hypotheses, documented before work begins
- Implementation of up to `[4]` changes
- Measurement setup for each change, so its effect can be observed
- Review of the conversion funnel for new friction points
- A written cycle report covering what changed, what moved and what is recommended next

### Account and ownership arrangement

Work is performed on the Client's site, platform and analytics accounts, which remain under the
Client's ownership throughout.

**Improvement is not guaranteed.** Some changes reduce measured performance. This is a normal
outcome of testing, not a defect, and reverting a change is included within the cycle.

**Meaningful measurement requires traffic.** Where a page receives fewer than `[1,000]` relevant
visitors per cycle, results cannot be attributed with confidence and reporting is presented as
directional observation rather than measured effect. The Client acknowledges this before the
engagement begins.

Outcomes depend on traffic quality, offer, pricing, competition, seasonality and market
conditions, none of which are within Qera Private Limited's control.

Where a change requires rebuilding a page, restructuring navigation or creating a new template,
that work is a Build engagement.

### Limits

| | |
|---|---|
| Hypotheses per cycle | `[2]` |
| Changes implemented per cycle | `[4]` |
| Pages or templates in scope | `[5]` |
| Conversion goals tracked | `[1]` |
| Concurrent split tests | `[1]` |
| Properties | `[1]` |
| Rollover of unused capacity | `[0]` cycles |

Anything beyond these is additional work.

### Completion criteria

Not applicable. Delivery under this part is measured by cycle, against the included items above.

**Conversion rate, revenue, lead volume and any improvement over a prior period are not
deliverables and are not guaranteed**, on the terms set out in Schedule 2.

### What the Client receives

- Changes implemented and live on its own property
- Measurement configuration in its own analytics account
- A written cycle report, including changes that did not work and why
- A cumulative record of everything tested across the engagement

### Costs the Client pays directly

Testing, heatmap and session recording tool subscriptions · analytics subscriptions · platform
subscriptions · any paid app required to implement an agreed change · advertising spend

### Exclusions attached

`E01 E02 E03 E22 E25 E26 E38 E39 E43 E45 E46 E52 E56 E65 E66 E76 E85 E86`

### Client inputs attached

`I01 I03 I07 I26 I28 I31 I33 I37 I38 I44 I45 I60`

### Fee and cycle

| | |
|---|---|
| Monthly fee | `[ ]` |
| Billing | in advance, on the anniversary of first payment |
| Notice | `[15]` days |
| Rollover of unused capacity | `[0]` cycles |

---

## 4v. Boundary rules — parts 14 and 15

**14 against 07 and 15.** Part 14 keeps a site working. Part 07 improves it once. Part 15
improves it continuously. A Client asking to "keep the site fresh" is buying 14. A Client asking
to "make it convert better" is buying 07 or 15.

**14 against any Build part.** Change work under 14 is editing what exists. The moment a request
needs a page that does not exist, a template that has not been designed, or a feature that has
not been built, it leaves 14 entirely. This is the boundary that erodes fastest, because each
individual request sounds small. Hold it per request, not per cycle.

**15 requires traffic.** Below roughly a thousand relevant visitors per cycle on the pages being
tested, no honest conclusion can be drawn from a change. Selling 15 to a low-traffic Client
produces monthly reports full of noise and a Client who cancels in month four believing the work
failed. Where traffic is thin, sell Part 07 once and revisit later, or sell traffic acquisition
first.

**Do not attach 07 and 15 to the same contract.** They are the same work at different cadences.
Pick one.

**Rollover.** Part 14 rolls unused hours for one cycle, because unused hours are undelivered work.
Part 15 does not, because the Client bought a cycle of thinking and measurement rather than a
quantity of output.


---

## 4w. Service 17 — Domain and DNS

**Schedule:** Setup
**Dependencies:** none
**Recommended pairings:** 18 Business email and workspace, any Build part

### Overview

Purchase and configuration of a domain, and setup of the DNS records needed to point it at the
Client's site, email and connected services.

### What is included

- Availability check against up to `[5]` preferred names supplied by the Client
- Registration of `[1]` domain in the Client's name
- DNS configuration — A, CNAME, MX, TXT and any records required by connected services
- Email authentication records — SPF, DKIM and DMARC, where email is in scope
- SSL provisioning through the host or registrar
- Redirect configuration for `[2]` additional domains or subdomains, where supplied
- Written record of every record created
- Transfer of registrar access under Schedule 3

### Account and ownership arrangement

The domain is registered in the Client's name, with the Client as registrant, from purchase.
Qera Private Limited does not hold or retain ownership of any Client domain.

**Administrative and DNS access is held by Qera Private Limited during any related Build
engagement**, because DNS changes are required throughout development, and is released under
Schedule 3 on completion and full payment.

Where the domain cost is included within a Build advance, it is stated in the approved Proposal.
Renewal is the Client's responsibility from the first renewal date onward.

Availability of any given name cannot be guaranteed. Premium pricing, registry restrictions and
prior registration are outside Qera Private Limited's control.

### Limits

| | |
|---|---|
| Domains registered | `[1]` |
| Names checked for availability | `[5]` |
| Redirected domains or subdomains | `[2]` |
| Connected services configured | `[4]` |

Anything beyond these is additional work.

### Completion criteria

The domain is registered to the Client, every record listed above resolves correctly, SSL is
active, and the record documentation has been delivered.

Propagation delays of up to forty-eight hours are normal and do not indicate incomplete work.

### What the Client receives

- The domain, registered in its own name
- Registrar access and credentials, on release
- A written record of every DNS record created
- Email authentication records, where email is in scope

### Costs the Client pays directly

Domain registration and renewal · premium domain pricing, where applicable · privacy
protection · SSL, where the host charges separately

### Exclusions attached

`E30 E31 E48 E49 E52 E53 E57 E83 E85 E87 E90`

### Client inputs attached

`I02 I26 I27 I28 I61 I63`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | in full in advance, or within a Build advance |
| Timeline | `[3]` working days from receipt of inputs |
| Correction window | `[14]` days |

---

## 4x. Service 18 — Business email and workspace

**Schedule:** Setup
**Dependencies:** 17 Domain and DNS, or an existing domain the Client controls
**Recommended pairings:** 17 Domain and DNS

### Overview

Setup of a business email and productivity workspace on the Client's own domain — mailboxes,
aliases, groups and the authentication records that keep mail deliverable.

### What is included

- Workspace creation on the Client's domain
- Domain verification and connection
- Creation of up to `[5]` mailboxes
- Creation of up to `[5]` aliases or groups
- SPF, DKIM and DMARC configuration
- Email signature template, applied to `[1]` format
- Basic security configuration — two-factor enforcement and recovery settings
- One handover walkthrough covering the admin console

### Account and ownership arrangement

**The workspace is created in the Client's name and the subscription is paid by the Client on
the Client's own payment method**, provided before setup begins. Qera Private Limited does not
hold a payment method for any Client subscription.

**Administrative access transfers to the Client on completion of this part**, not at the end of
any wider engagement. This is the carve-out permitted under Schedule 3, and exists because the
Client needs its email in daily use immediately.

DNS records for mail remain under Qera Private Limited's administration during any related Build
engagement, and are released with the domain under Schedule 3. Release of the workspace does not
release the domain.

From transfer, the Client is solely responsible for user administration, billing, security,
recovery access and second-factor methods.

**Deliverability is not guaranteed.** Inbox placement depends on sending behaviour, list quality,
recipient filtering and sender reputation built over time, none of which are set at configuration.

### Limits

| | |
|---|---|
| Mailboxes created | `[5]` |
| Aliases or groups | `[5]` |
| Signature formats | `[1]` |
| Domains connected | `[1]` |
| Mailbox migrations | `[0]` |

Anything beyond these is additional work.

### Completion criteria

The workspace is active on the Client's domain, every mailbox listed sends and receives
successfully through a test message, authentication records pass validation, and administrative
access has been transferred.

### What the Client receives

- Full administrative access to the workspace
- All mailbox credentials, for onward distribution by the Client
- A record of the authentication records configured
- A handover walkthrough covering the admin console

### Costs the Client pays directly

Workspace subscription and per-seat charges · additional storage · any paid add-on ·
domain renewal

### Exclusions attached

`E30 E31 E48 E49 E52 E53 E57 E72 E82 E83 E85 E87`

### Client inputs attached

`I02 I06 I26 I27 I28 I62`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | in full in advance, or within a Build advance |
| Timeline | `[3]` working days from receipt of inputs |
| Correction window | `[14]` days |

---

## 4y. Service 19 — Analytics and tracking

**Schedule:** Setup
**Dependencies:** an existing site or property to measure
**Recommended pairings:** 07 Conversion optimisation build, 13 Paid social management, 15 Conversion optimisation retainer

### Overview

Setup of analytics and conversion tracking so the Client can see what people do on its property —
property creation, tag deployment, event configuration and a working report view.

### What is included

- Analytics property creation on the Client's account
- Tag manager container setup and deployment
- Configuration of up to `[6]` conversion events
- Advertising pixel installation for up to `[2]` platforms
- Ecommerce or form-submission tracking, where applicable
- Cross-domain configuration, where `[1]` additional domain is in scope
- Verification that every event fires correctly
- `[1]` report view or dashboard covering the configured events
- One handover walkthrough

### Account and ownership arrangement

All analytics, tag and advertising accounts are created in the Client's name and owned by the
Client from creation. Qera Private Limited holds access only for setup and, where a related
retainer is attached, for its duration.

**Measurement is approximate.** Ad blockers, browser tracking restrictions, cookie consent
choices, device switching and platform attribution models all cause undercounting and
discrepancy between platforms. Figures from two platforms will not match and neither is wrong.

**Privacy and consent compliance is the Client's responsibility.** Cookie consent, privacy
notices, data processing agreements and compliance with applicable data protection law are not
included in this part and require the Client's own legal advice.

Historic data cannot be backfilled into a newly created property. Measurement begins from the
date of installation.

### Limits

| | |
|---|---|
| Analytics properties | `[1]` |
| Conversion events | `[6]` |
| Advertising pixels | `[2]` |
| Additional domains | `[1]` |
| Dashboards or report views | `[1]` |

Anything beyond these is additional work.

### Completion criteria

Every configured event fires correctly under test, tags are live on the property, pixels report
receiving data, and the dashboard displays the configured events.

**Data accuracy against any other platform's figures is not an acceptance criterion.**

### What the Client receives

- Full ownership of every analytics and tag account
- A written record of every event and tag configured
- The dashboard or report view
- A handover walkthrough covering where to find each figure

### Costs the Client pays directly

Analytics platform subscriptions, where a paid tier is used · consent management tool
subscriptions · any paid tag or tracking service

### Exclusions attached

`E22 E25 E27 E30 E38 E39 E45 E46 E48 E49 E52 E54 E56 E64 E85 E86 E88 E89`

### Client inputs attached

`I01 I03 I07 I26 I27 I28 I37`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | in full in advance, or within a Build advance |
| Timeline | `[5]` working days from receipt of inputs |
| Correction window | `[14]` days |

---

## 4z. Service 20 — Social account setup and verification

**Schedule:** Setup
**Dependencies:** 05 Brand identity, or existing brand assets
**Recommended pairings:** 11 Content production, 12 Community management, 13 Paid social management

### Overview

Creation and configuration of social accounts on the platforms the Client needs — handles,
profile setup, business account conversion, and the business portfolio structure required to run
advertising.

### What is included

- Handle availability check across up to `[5]` platforms
- Account creation on up to `[5]` platforms
- Conversion to business or professional account type
- Profile setup — image, banner, bio, links and contact details, from Client-supplied assets
- Business portfolio or business manager creation, in the Client's name
- Ad account creation and linking, where advertising is in scope
- Linking of accounts to each other and to the Client's site
- Two-factor and recovery configuration, on the Client's own details
- Submission of `[1]` verification application per platform, where the Client qualifies
- Credential handover and one walkthrough

### Account and ownership arrangement

**Every account, business portfolio and ad account is created in the Client's name and owned by
the Client from creation.** Where advertising is in scope, the ad account sits inside the
Client's own business portfolio, and Qera Private Limited operates as an assigned partner rather
than as owner. Qera Private Limited does not create Client accounts under its own portfolio.

Two-factor authentication and recovery are configured against the Client's own phone number and
recovery email. The Client is responsible for retaining these. Qera Private Limited cannot
recover an account for which the Client has lost recovery access.

**Handle availability is not guaranteed.** A preferred name may already be taken, reserved or
restricted. Alternatives are agreed from the Client's priority list.

**Verification outcomes are not guaranteed.** Approval, badge issuance, reinstatement and
eligibility are decided entirely by the platform against criteria it does not publish and may
change. A declined application does not reduce the fee, and reapplication is additional work.

### Limits

| | |
|---|---|
| Platforms | `[5]` |
| Verification applications | `[1]` per platform |
| Business portfolios | `[1]` |
| Ad accounts | `[1]` |
| Profile revision rounds | `[1]` |

Anything beyond these is additional work.

### Completion criteria

Every account listed is created, converted to the correct type, configured with the supplied
profile assets, secured with two-factor authentication, linked as agreed, and credentials have
been delivered to the Client.

Submission of a verification application completes that item. The platform's decision does not.

### What the Client receives

- Full ownership of every account created
- All credentials and recovery configuration details
- Business portfolio and ad account under its own ownership
- A written record of every account, handle and link created
- A handover walkthrough

### Costs the Client pays directly

Any paid verification or subscription tier · advertising spend · profile photography or asset
production · business documentation costs required for verification

### Exclusions attached

`E01 E02 E03 E32 E34 E38 E39 E40 E44 E46 E48 E52 E55 E57 E58 E75 E76 E77 E85 E90 E91`

### Client inputs attached

`I05 I17 I19 I21 I26 I27 I28 I52 I64 I65`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | in full in advance, or within a Build advance |
| Timeline | `[5]` working days from receipt of inputs |
| Correction window | `[14]` days |

---

## 4aa. Boundary rules — parts 17 to 20

**Setup parts are configuration, not operation.** Each ends when the thing is working and access
has been handed over. Nothing in this Schedule creates a monitoring, administration or support
obligation. A Client who wants ongoing administration is buying a Monthly part.

**17 and 18 release at different moments, deliberately.** The workspace transfers on completion of
Part 18, because the Client needs email immediately. The domain releases at the end of the Build
engagement, because DNS is required throughout development. Both are correct and both must be
explained at the point of sale, or the Client will assume the domain came with the email.

**18 requires 17 or an existing domain.** Never sell Part 18 alone against a domain the Client
does not control.

**19 before 07, 13 and 15.** All three depend on measurement that already exists and has history.
Selling optimisation or paid management into a property with no tracking produces a first month
spent installing analytics under a fee meant for something else.

**20 before 11, 12 and 13.** Accounts must exist before anything can be published, answered or
promoted. Where accounts already exist, Part 20 is not required — but check ownership of the
business portfolio before starting, because a previous agency owning it is a problem that
surfaces on the first ad launch.

**Nothing in Part 20 promises an outcome.** Handles may be taken and verification may be refused.
Both are stated in the part because both will happen.


---

## 4ab. Service 21 — Audit or teardown

**Schedule:** Advice
**Dependencies:** none
**Recommended pairings:** 07 Conversion optimisation build, 02/03 any web build, 16 AI system operation

### Overview

Structured review of an existing property, system or presence, delivered as a written document
setting out findings, their commercial significance and prioritised recommendations.

This Part delivers analysis. Implementation of any recommendation constitutes a separate
engagement under Schedule 1, 2 or 3.

### What is included

- Review of `[1]` property or system, being a website, storefront, social presence, automation
  system or brand presence as specified
- Examination of up to `[5]` page templates, screens or workflows
- Review of available analytics covering not less than `[3]` months, where access is provided
- Comparison against `[3]` competitors or comparable operators
- Written findings document setting out each finding, its likely commercial effect and a
  recommended course of action
- Prioritisation of recommendations by expected impact and implementation effort
- `[1]` walkthrough session of up to `[45]` minutes

### Account and ownership arrangement

Analysis is conducted upon material and access supplied by the Client together with information
publicly observable. Where access or information is not supplied, the findings shall be limited
accordingly and such limitation shall be recorded in the findings document.

Findings represent professional opinion formed on the information available as at the date of
analysis. They do not constitute a prediction of outcome, a guarantee of improvement, or legal,
tax, financial or regulatory advice.

The Client shall determine which recommendations, if any, to implement. Qera Private Limited
shall bear no responsibility for the consequences of implementation, whether effected by the
Client, by Qera Private Limited under another Schedule, or by any third party.

Where the property examined was produced by a third party, findings are recorded as observations
and shall not constitute an allegation of professional deficiency against any person.

### Limits

| | |
|---|---|
| Properties or systems reviewed | `[1]` |
| Page templates, screens or workflows examined | `[5]` |
| Competitors compared | `[3]` |
| Walkthrough sessions | `[1]`, up to `[45]` minutes |
| Analytics platforms reviewed | `[1]` |
| Clarification period following delivery | `[14 days]` |

Anything beyond these limits constitutes Additional Work.

### Completion criteria

The findings document has been delivered in the form specified above and the walkthrough session
has been held or has been offered and declined.

The Client's agreement with any finding, and the commercial outcome of acting upon any
recommendation, are not criteria of completion.

### What the Client receives

- The findings document in PDF format
- A prioritised list of recommendations, each with an indicative implementation route
- A recording of the walkthrough session, where the Client requests one
- Answers to reasonable clarifying questions on the content of the document for `[14 days]`
  following delivery

### Costs the Client pays directly

Analytics or research tool subscriptions, where a paid tier is required · access costs for any
platform under review

### Exclusions attached

`E25 E38 E39 E45 E46 E52 E56 E63 E64 E65 E66 E85 E86 E89`

### Client inputs attached

`I01 I03 I07 I26 I28 I31 I37 I44 I45 I60`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | in full in advance |
| Timeline | `[7]` working days from receipt of inputs |
| Clarification period | `[14]` days from delivery |

---

## 4ac. Service 22 — Strategy sprint

**Schedule:** Advice
**Dependencies:** none
**Recommended pairings:** any Build Part, 11 Content production, 13 Paid social management

### Overview

A time-boxed engagement addressing a defined strategic question, delivered through working
sessions and a written recommendation document.

This Part delivers a recommended course of action. Execution of that course of action constitutes
a separate engagement under Schedule 1, 2 or 3.

### What is included

- Definition of `[1]` strategic question, agreed in writing prior to commencement
- Review of material and data supplied by the Client
- `[2]` working sessions of up to `[90]` minutes each, with up to `[3]` Client participants
- Market and competitor context covering `[3]` comparable operators
- Written recommendation document setting out the recommended course of action, the principal
  alternatives considered, and the reasons for the recommendation
- Outline implementation sequence, with indicative effort and dependencies
- Identification of the assumptions upon which the recommendation depends

### Account and ownership arrangement

The recommendation is formed upon information supplied by the Client and upon publicly available
information. Its soundness depends upon the accuracy and completeness of the information
supplied, and the Client warrants that information supplied is accurate to the best of its
knowledge.

The recommendation represents professional opinion formed as at the date of delivery. It does not
constitute a guarantee of commercial outcome, and does not constitute legal, tax, financial,
employment or regulatory advice. The Client shall obtain its own professional advice in respect of
any such matter.

Qera Private Limited shall have no responsibility for any decision taken by the Client, whether
consistent with the recommendation or otherwise, nor for any outcome arising from it.

Where Qera Private Limited is subsequently engaged to implement any part of the recommendation,
such engagement shall be governed by the applicable Schedule and shall be separately quoted. This
Part shall not be construed as a commitment by either Party to any subsequent engagement.

### Limits

| | |
|---|---|
| Strategic questions addressed | `[1]` |
| Working sessions | `[2]`, up to `[90]` minutes each |
| Client participants per session | `[3]` |
| Comparable operators reviewed | `[3]` |
| Revision of the recommendation document | `[1]`, for factual correction only |
| Clarification period following delivery | `[14 days]` |

Anything beyond these limits constitutes Additional Work.

Where the strategic question is materially altered following commencement, the engagement shall
be re-scoped and re-quoted.

### Completion criteria

The working sessions have been held or have been offered and declined, and the recommendation
document has been delivered in the form specified above.

The Client's agreement with the recommendation, and the commercial outcome of adopting it, are
not criteria of completion.

### What the Client receives

- The recommendation document in PDF format
- Recordings of the working sessions, where the Client requests them
- The outline implementation sequence
- Answers to reasonable clarifying questions on the content of the document for `[14 days]`
  following delivery

### Costs the Client pays directly

Research or data subscriptions, where a paid tier is required · any third-party report procured
at the Client's request

### Exclusions attached

`E01 E45 E46 E52 E56 E61 E63 E65 E71 E85`

### Client inputs attached

`I01 I26 I28 I31 I33 I34 I37 I45`

### Fee and timeline

| | |
|---|---|
| Fee | `[ ]` |
| Payment | in full in advance |
| Timeline | `[10]` working days from commencement |
| Clarification period | `[14]` days from delivery |

---

## 4ad. Boundary rules — Parts 21 and 22

**21 against 22.** Part 21 examines something that exists and reports upon its condition. Part 22
addresses a decision that has not yet been taken. A Client asking "what is wrong with this"
requires Part 21. A Client asking "what should we do" requires Part 22.

**Advice against implementation.** Neither Part includes implementation, and neither creates any
obligation upon either Party to proceed to an implementation engagement. Where a Client expects
changes to be made, the engagement is not an advisory engagement and the applicable Build,
Monthly or Setup Part shall be quoted instead.

**Part 21 as a qualifying instrument.** Where a Client seeks operation of a system Qera Private
Limited did not build, or optimisation of a property it has not examined, Part 21 shall be
performed first. Assuming operational responsibility for an uninspected system constitutes
uncosted risk.

**Advisory work shall not be given away.** Where an audit is performed without charge as a
business development measure, it is not performed under this Schedule and no contractual
obligation, warranty or liability arises in respect of it. Advisory work performed under this
Schedule is paid work and shall be treated as such.


---

## 5. Service template

Every one of the 22 services follows this shape. If a service needs a heading not on this list,
stop and reconsider — either it belongs on the schedule, or the template needs to change for
all 22.

```markdown
## Service NN — [name]

**Schedule:** Build | Monthly | Setup | Advice
**Dependencies:** [service codes, or none]
**Recommended pairings:** [service codes]

### Overview
[2–3 sentences. What this is and what the client ends up with.]

### What is included
[Bulleted. Concrete deliverables only. No adjectives.]

### Account and ownership arrangement
[Who holds what account, who has access, when access is removed.
Omit only where no account or credential is involved.]

### Limits
[Table. Every quantifiable boundary as a blank. Numbers, not words.]

### Completion criteria
[Acceptance criteria specific to this service.]

### What the Client receives
[Exact handover artifacts.]

### Costs the Client pays directly
[Itemised, inline, separated by middots.]

### Exclusions attached
[Exclusion IDs]

### Client inputs attached
[Client input IDs]

### Fee and timeline
[Table of blanks. Monthly parts use "Fee and cycle" instead: monthly fee, billing date,
notice period, rollover. Monthly parts also replace "What finished means" with a statement
that delivery is measured per cycle.]
```

### Do not put these in a service

They live on the schedule and are inherited:
payment structure · milestone thresholds · revision definition · feedback windows ·
acceptance windows · support duration · notice periods · ownership transfer trigger ·
portfolio rights · additional-work definition · early termination

---

## 6. Exclusion library — seed

91 lines. `attaches to` is a starting suggestion, editable in admin.

### Content — `content`

| ID | Text |
|---|---|
| E01 | Copywriting of any kind |
| E02 | Product photography, retouching or image editing |
| E03 | Video production, filming or editing |
| E04 | Translation or multilingual content |
| E05 | Content migration from an existing site or platform |
| E06 | Sourcing or licensing of stock imagery, video or music |
| E07 | Scriptwriting or storyboarding |
| E08 | Proofreading of Client-supplied copy |

### Design — `design`

| ID | Text |
|---|---|
| E09 | Brand identity, logo design or visual system creation |
| E10 | Print or packaging design |
| E11 | Illustration or custom iconography |
| E12 | Animation or motion beyond what the selected theme or framework provides |
| E13 | Design of pages or screens beyond the stated count |
| E14 | Presentation or pitch deck design |

### Technical — `technical`

| ID | Text |
|---|---|
| E15 | Custom app or backend development |
| E16 | Theme or template code written from scratch |
| E17 | Custom checkout beyond the platform's native settings |
| E18 | Subscription, wholesale, B2B or marketplace functionality |
| E19 | Multi-currency, multi-language or multi-region setup |
| E20 | Migration of products, customers or orders from another platform |
| E21 | Data import beyond the stated record count |
| E22 | Integration with any system not named in this part |
| E23 | Server, container or infrastructure provisioning |
| E24 | Database design or migration |
| E25 | Accessibility remediation to a stated WCAG level |
| E26 | Load testing or performance guarantees under stated traffic |
| E27 | Penetration testing or security audit |
| E28 | Source code for internal frameworks, libraries or reusable systems |

### Platform — `platform`

| ID | Text |
|---|---|
| E29 | Paid plugins, apps, extensions or their configuration |
| E30 | Platform subscription costs of any kind |
| E31 | Domain registration, renewal or transfer fees |
| E32 | Account verification, badge or blue-tick outcomes |
| E33 | Payment gateway approval or merchant account approval |
| E34 | Resolution of platform bans, restrictions or policy actions |
| E35 | Compatibility with platform features released after handover |
| E36 | Commercial font licences |
| E37 | API usage costs, model costs or compute costs |

### Marketing — `marketing`

| ID | Text |
|---|---|
| E38 | Advertising spend of any kind |
| E39 | Paid advertising strategy, setup or management |
| E40 | Influencer identification, outreach or fees |
| E41 | SEO beyond the platform's native fields — no keyword research, backlinks, content strategy or technical audit |
| E42 | Analytics, pixel or conversion tracking configuration |
| E43 | Email marketing setup, flows or templates |
| E44 | Press, PR or media outreach |
| E45 | Competitor research or market analysis |
| E46 | Guarantees of reach, followers, rankings, conversions or revenue |

### Support — `support`

| ID | Text |
|---|---|
| E47 | Ongoing maintenance, content updates or uploads after handover |
| E48 | Training beyond the single handover walkthrough |
| E49 | Written documentation or user manuals |
| E50 | Support for issues caused by Client or third-party modifications after handover |
| E51 | Third-party app or plugin troubleshooting |
| E52 | Emergency or out-of-hours response |
| E53 | Hosting, uptime monitoring or backups |
| E54 | Legal, tax or compliance review of any deliverable |
| E55 | Community management, moderation or inbox handling |
| E56 | Response-time commitments |
| E57 | Recovery of accounts, credentials or data the Client has lost |
| E58 | Work on any platform, channel or property not named in this part |

### Brand and system — `brand`

| ID | Text |
|---|---|
| E59 | Naming, tagline or verbal identity development |
| E60 | Formal trademark clearance, filing, registration, or any legal assurance of registrability |
| E61 | Brand strategy research, workshops or stakeholder interviews |
| E62 | Code implementation of design components |
| E63 | Maintenance, versioning or extension of delivered assets after handover |

### Optimisation — `optimisation`

| ID | Text |
|---|---|
| E64 | Running, monitoring or analysing split tests over time |
| E65 | Copy testing, messaging research or user interviews |
| E66 | Rebuild or restructure of the underlying site, template or platform |

### AI and automation — `ai`

| ID | Text |
|---|---|
| E67 | Model training, fine-tuning or dataset preparation |
| E68 | Guarantee of accuracy, consistency, originality or repeatable output |
| E69 | Human review or approval of generated output before it is used |
| E70 | Continued operation where a provider changes pricing, policy, model or availability |
| E71 | Regulatory, legal, medical or financial compliance review of generated output |
| E72 | Data cleaning, labelling, structuring or migration |
| E73 | Rate limit increases, enterprise access or provider account approvals |

### Social and paid — `social`

| ID | Text |
|---|---|
| E74 | Responding on the Client's behalf to anything requiring a commercial decision, refund, discount, order change or legal position |
| E75 | Crisis communication, reputation management or public statements of fault |
| E76 | Coverage outside the stated days and hours, including weekends and real-time response |
| E77 | Any platform, channel or activity not ticked on the platform matrix |
| E78 | Funding, advancing or holding advertising spend on the Client's behalf |
| E79 | Landing page, destination or funnel creation for campaigns |
| E80 | Audience list creation, purchase, enrichment or customer data supply |
| E81 | Sales, order processing, payment handling or transaction support through social channels |

### Maintenance and testing — `maintenance`

| ID | Text |
|---|---|
| E82 | Recovery from hacking, malware, defacement or data breach |
| E83 | Migration to a different platform, host, stack or provider |
| E84 | Writing content or creating pages as part of maintenance |
| E85 | Guarantee of uptime, availability, load speed or resolution time |
| E86 | Statistically reliable results where traffic volume is insufficient to support them |

### Setup and infrastructure — `setup`

| ID | Text |
|---|---|
| E87 | Email deliverability, inbox placement or sender reputation outcomes |
| E88 | Cookie consent, privacy notices or data protection compliance implementation |
| E89 | Backfill or import of historic data into a newly created property |
| E90 | Recovery of accounts, handles or domains held or controlled by a third party |
| E91 | Creation of profile imagery, bio copy or launch content for new accounts |

### Growth ritual

After every completed project, add a line for anything the Client assumed was included but
was not. This is the mechanism by which the library becomes an asset. Do not skip it.

---

## 7. Client input library — seed

65 lines. Render as a checklist in the right-hand editor sidebar.

### Access — `access`

| ID | Text |
|---|---|
| I01 | Platform account access, or written authority to create an account on the Client's behalf |
| I02 | Domain registrar access, or written authority to purchase |
| I03 | Hosting or DNS access |
| I04 | Payment gateway account details |
| I05 | Social platform account access for each named platform |
| I06 | Email or workspace admin access |
| I07 | Analytics and advertising account access |
| I08 | Access to any existing system being integrated with |

### Content — `content`

| ID | Text |
|---|---|
| I09 | All written copy for every page or asset in scope |
| I10 | Product images at usable resolution |
| I11 | Product names, descriptions, prices, variants and stock quantities |
| I12 | Brand photography or approved image library |
| I13 | Video or raw footage where video is in scope |
| I14 | Testimonials, reviews or case study material |
| I15 | Team names, roles, photos and biographies |
| I16 | Pricing, packages or service descriptions |

### Brand — `brand`

| ID | Text |
|---|---|
| I17 | Logo files in vector format |
| I18 | Font files or commercial font licences |
| I19 | Colour references |
| I20 | Existing brand guidelines, where they exist |
| I21 | Tone of voice reference or examples |

### Legal and policy — `legal`

| ID | Text |
|---|---|
| I22 | Shipping policy copy |
| I23 | Returns and refunds policy copy |
| I24 | Privacy policy copy |
| I25 | Terms and conditions copy |
| I26 | Registered business name, address and tax details |
| I27 | Confirmation of ownership or usage rights for all supplied materials |

### Operational — `operational`

| ID | Text |
|---|---|
| I28 | A single named person with authority to approve |
| I29 | A named backup approver |
| I30 | Preferred communication channel |
| I31 | Any fixed launch date and the reason for it |
| I32 | List of stakeholders who must review before approval |

### Strategic — `strategic`

| ID | Text |
|---|---|
| I33 | Target audience description |
| I34 | Named competitors or reference brands |
| I35 | Visual references — sites, brands or work the Client likes |
| I36 | Visual anti-references — work the Client explicitly does not want |
| I37 | Business goal for this engagement, stated in one sentence |
| I38 | Existing performance data, where available |
| I39 | Named platforms in scope, where the service covers multiple |
| I40 | Posting frequency and content mix, where content is in scope |
| I41 | Escalation contact for anything time-sensitive |

### Existing assets — `existing`

| ID | Text |
|---|---|
| I42 | Existing logo files and prior brand work, where this is a redesign |
| I43 | Written confirmation that trademark clearance is the Client's responsibility |
| I44 | Administrative access to the existing site or platform being modified |
| I45 | Historic analytics data covering at least the stated period |
| I46 | Existing component library or design files, where they exist |

### AI and automation — `ai`

| ID | Text |
|---|---|
| I47 | Provider account access and a billing method for usage costs |
| I48 | Written list of systems and data sources the build may access |
| I49 | Sample data representative of live conditions |
| I50 | A named person accountable for reviewing output before it is used |
| I51 | Written identification of any data that must not be sent to a third-party provider |

### Social and paid — `social`

| ID | Text |
|---|---|
| I52 | Completed platform matrix — platforms and activities in scope |
| I53 | Approved response set covering common questions and the Client's position on each |
| I54 | Advertising payment method registered on the Client's own ad account |
| I55 | Coverage days and hours for community response |
| I56 | Escalation path for complaints, refunds and sensitive messages |
| I57 | Campaign objective and budget for the cycle, confirmed in writing before it begins |

### Maintenance and testing — `maintenance`

| ID | Text |
|---|---|
| I58 | Hosting, platform and CMS administrative access for maintenance |
| I59 | Preferred backup location and retention period |
| I60 | Current monthly traffic figures for the pages in scope |

### Setup and infrastructure — `setup`

| ID | Text |
|---|---|
| I61 | Preferred domain names, in priority order |
| I62 | List of mailboxes, aliases and groups to be created |
| I63 | Existing DNS records that must be preserved |
| I64 | Preferred handles for each platform, in priority order |
| I65 | Business documentation required for verification, where applicable |

---

## 8. Not yet written

- Master agreement: general terms (liability, indemnity, confidentiality, force majeure,
  governing law, data protection, non-solicitation, late payment interest, termination for
  convenience, credential return). Shared clauses M1–M7 are written.

Written: Master Agreement shared clauses M1–M7, all four Schedules, Parts 01–22.
Platform matrix in §4o. Boundary rules in §4e, §4i, §4n, §4s, §4v, §4aa and §4ad.

**All four Schedules and all twenty-two Parts are complete.**

Remaining: the general terms of the Master Agreement, to be drafted last, together with the
corrections listed in §1. Once drafted, the Master Agreement and the four Schedules should be
reviewed as a single package by an Indian commercial lawyer before use.

Note on build order: `contract-system.md` §12 places services 02 and 05 before the remaining
schedules. That order has been superseded — the four schedules were written together so their
boundaries could be checked against each other. Update §12 to match.
