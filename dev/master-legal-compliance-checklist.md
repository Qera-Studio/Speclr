# Master Legal & Compliance Checklist

> **READ THIS BOX FIRST — what this document is and is not.**
> This is a **compliance framework and current-state map** to help Qera (a) know which legal requirements apply to a given project, (b) handle the operational compliance an agency can manage itself, and (c) **recognise the bright lines where a qualified lawyer or professional must be engaged.**
>
> **It is NOT legal advice, and Claude is not a lawyer.** Nothing here substitutes for advice from a qualified lawyer or accountant admitted in the relevant jurisdiction. Law is jurisdiction-specific, changes constantly, and turns on facts this document cannot see. Items tagged `(counsel)` are bright lines: **stop and get professional advice before acting.** Using this doc to *avoid* a lawyer on a `(counsel)` item is a misuse of it.
>
> **Purpose:** the single source of truth for legal/regulatory requirements that bind both the **products Qera builds** and **Qera as a business** — across the jurisdictions Qera operates in and serves.
>
> **Status:** v1.1 — grounded in current law verified as of **June 2026** (see Sources & As-Of Dates at the end). First and highest-ranked document in the Qera master system. **v1.1 adds 360° coverage (§16–24): technology/library/tool licensing, AI-specific exposure, IP chain of title, content/advertising/anti-spam law, CERT-In cyber reporting, intermediary/UGC liability, website legal pages & software liability, employment/interns/contractors, and confidentiality/NDAs — all jurisdiction-verified.** **Living document — legal regimes here are actively changing (India and UAE both moved in late 2025/early 2026; Australia is mid-reform). Re-verify any item before relying on it, and review quarterly (see Maintenance).**

---

## Master-Doc Precedence Protocol (replicated)

> Canonical copy with worked examples lives in the **Master Security Checklist**. Pasted here verbatim per Rule 1.

### Precedence order (highest wins on irreconcilable conflict)
1. **Legal & Compliance** ← *this document*
2. **Security**
3. **Accessibility**
4. **Data integrity / Backend correctness**
5. **Performance**
6. **SEO / AEO / GEO**
7. **Design & Brand preference**

### The three rules
1. **Ownership, not repetition.** Each concern's items live in their own doc; others cross-reference.
2. **Resolve before you rank.** Try the technique that satisfies both; only then does the higher-ranked doc win.
3. **Floor is never traded.**

### What rank 1 means in practice
Legal sits at the top because **a control, feature, design, or optimization that breaks the law is not an option — it is removed, not balanced.** When any other doc's item would violate a legal requirement, the legal requirement wins and the other item is descoped. Example already referenced in the Security doc: a "security through obscurity" choice that hid required disclosures, or a data practice that's fast/convenient but unlawful, loses to the legal requirement every time. Legal cannot be out-prioritised by speed, ranking, aesthetics, or client preference.

---

## How this document is tagged — read before using

Legal doesn't tier by budget like SEO/Performance. It tags by **jurisdiction** and **how Qera should handle the item.**

> **Jurisdiction tags:**
> - `[All]` — a principle common to all three regimes in scope (and to GDPR-style law generally); implement as baseline
> - `[India]` — Digital Personal Data Protection Act 2023 + DPDP Rules 2025
> - `[UAE]` — Federal PDPL (Decree-Law 45/2021) **and/or** DIFC / ADGM free-zone regimes (which apply *instead* of the federal law for entities in those zones)
> - `[AU]` — Privacy Act 1988 + Australian Privacy Principles, as amended by the 2024 reforms
> - `[EU/other → escalate]` — if a client's users are in the EU/UK, US (California), or elsewhere not covered here, **that is out of this doc's scope — flag it and get jurisdiction-specific advice.** Do not assume these three regimes cover a fourth.

> **Handling tags:**
> - `(self-manage)` — Qera can implement this directly; it's operational compliance hygiene, not legal judgement
> - `(co-counsel)` — Qera prepares/drafts, a lawyer reviews before it's relied on (e.g. a privacy policy for a real business)
> - `(counsel)` — **bright line: stop and get qualified legal/professional advice.** Do not self-serve these.

> **The core operating principle of this doc:** most day-to-day compliance is `(self-manage)` hygiene — have a real privacy policy, get consent properly, secure the data, don't keep it forever. A smaller set of high-stakes items are `(counsel)` bright lines — entity structuring, enforceable contracts and liability, cross-border transfer mechanisms, anything regulated (health/financial/children's data), and any actual dispute or breach. **The doc's main job is to keep you confidently handling the first set and reliably escalating the second.**

> **"Verify" for legal = confirm current law.** Unlike the technical docs, there's no tool that proves an item passes. Where an item depends on a fast-moving or date-sensitive rule, it's marked **(verify currency)** — re-check the live position before relying on it.

---

## 0 — Pre-Work: Jurisdiction & Applicability Scoping

> Run before any compliance work. The threshold question in privacy law is always *which regime(s) apply* — and the answer depends on three locations, not one. Getting this wrong means protecting against the wrong rules.

- [ ] **Map the three locations** — (a) where is the **client's business** established? (b) where are the **client's end-users / customers**? (c) where is **Qera** established (India now, UAE on relocation)? Each can pull in a different regime. `[All]` `(self-manage)`
- [ ] **Apply extraterritorial reach** — a regime can bind you even without local presence: **India's DPDPA** applies to anyone processing personal data to offer goods/services to people *in India*; **UAE PDPL** reaches certain processing of UAE residents' data; **Australia** binds entities with an "Australian link". A client's user base, not just its address, can trigger a law. `[All]` `(self-manage)` **(verify currency)**
- [ ] **Identify the UAE layer (if UAE is in scope)** — federal PDPL **vs** DIFC **vs** ADGM are three *separate* regimes; an entity in DIFC follows DIFC law, not the federal PDPL. This is decided by where the entity is licensed. `[UAE]` `(counsel)`
- [ ] **Data sensitivity classification** — does the project touch sensitive/special-category data (health, biometric, financial/credit, religion, ethnicity, sexual life) or **children's data**? Any of these escalates obligations sharply and usually crosses into `(counsel)`. `[All]` `(self-manage)` to flag, `(counsel)` to proceed
- [ ] **Controller vs processor role** — is Qera deciding *why/how* data is processed (controller) or processing on the client's instructions (processor)? Building/hosting a client site often makes Qera a **processor**, which carries its own legal obligations and requires a data-processing agreement with the client (§14). `[All]` `(co-counsel)`
- [ ] **Out-of-scope regime check** — any EU/UK/US/other users? If yes, **this doc does not cover it** — flag and get advice for that regime. `[EU/other → escalate]` `(counsel)`
- [ ] **Regulated-sector check** — is the client in a regulated sector (finance, health, telecom, anything licensed)? Sector rules stack *on top of* privacy law. `[All]` `(counsel)`
- [ ] **Document the applicability decision** — record which regimes apply and why; this is the foundation every later item builds on, and the thing a regulator or lawyer will ask for first. `[All]` `(self-manage)`

---

## 1 — Data Protection: Universal Principles

> The shared GDPR-influenced core. India, UAE, and Australia differ in mechanics but converge on these principles, so implement them as the universal baseline, then layer jurisdiction specifics (§2–4). Security implementation of these is owned by the **Security Master §17** — this section owns the *legal* requirement, Security owns the *technical* control. Cross-reference, don't duplicate.

- [ ] **Lawful basis / valid consent before processing** — personal data isn't collected or used without a lawful basis; in all three regimes consent is central (India and UAE lean heavily on consent; Australia via the APPs). Consent must be **free, specific, informed, unambiguous** and as easy to withdraw as to give. `[All]` `(self-manage)`
- [ ] **Purpose limitation** — data used only for the specific purpose disclosed at collection; no quiet repurposing. `[All]` `(self-manage)`
- [ ] **Data minimisation** — collect only what the purpose genuinely needs; the safest data is what you never collected (cross-ref Security §6). `[All]` `(self-manage)`
- [ ] **Transparency / notice at collection** — a clear notice tells users what's collected, why, how long it's kept, who it's shared with, and their rights (the privacy policy, §5). `[All]` `(self-manage)`
- [ ] **Security safeguards** — appropriate technical and organisational measures protect the data. Australia's reformed APP 11 now *explicitly* requires both technical (MFA, encryption) and organisational (access controls, offboarding) measures; India's Rules mandate encryption/masking, access control, logging, and backups. **Implementation owned by Security Master — confirm it passes.** `[All]` `(self-manage)` **(verify currency)**
- [ ] **Breach response readiness** — a plan exists to detect, assess, and notify breaches per each regime's rules (§8). `[All]` `(co-counsel)`
- [ ] **Data subject / principal rights honoured** — mechanisms to handle access, correction, and deletion requests (§7). `[All]` `(self-manage)`
- [ ] **Retention limits & deletion** — data isn't kept indefinitely; defined retention periods, and real deletion when the purpose ends or consent is withdrawn (cross-ref Security §6 data-retention). `[All]` `(self-manage)`
- [ ] **Cross-border transfer lawfulness** — moving personal data between countries follows each regime's transfer rules (§9). Acute for Qera, whose own operations span India ↔ UAE ↔ Australia. `[All]` `(counsel)`
- [ ] **Processor agreements** — where a processor handles data on the controller's behalf, a contract mandates the same safeguards (India's Rules and all three regimes require this). `[All]` `(co-counsel)`
- [ ] **Special handling for sensitive & children's data** — heightened obligations; verifiable parental consent for children across all three regimes, with restrictions on tracking/targeted ads to minors. `[All]` `(counsel)`

---

## 2 — India: DPDPA Specifics `[India]`

> Digital Personal Data Protection Act 2023 + DPDP Rules 2025 (notified 13 Nov 2025). **Phased enforcement** — much of the substantive obligation is not yet live, but the timeline is short and preparation is expected now. **(verify currency throughout — this regime is mid-rollout.)**

- [ ] **Know the phase timeline** — Board & procedural provisions live since **Nov 2025**; consent-manager registration from **Nov 2026**; the substantive obligations (notice, consent, security, breach notification, data-principal rights, children's data, cross-border, Significant Data Fiduciary duties) from **13 May 2027**. Build toward the 2027 date now. `(self-manage)` **(verify currency)**
- [ ] **Determine if the client/Qera is a "Data Fiduciary"** (decides purpose/means) or "Data Processor" — obligations differ. `(co-counsel)`
- [ ] **Consent notice meets DPDPA form** — clear, itemised, available in English and (the Rules contemplate) Indian languages; consent specific and withdrawable. `(self-manage)`
- [ ] **Children's data** — verifiable parental consent for under-18s; no behavioural monitoring or targeted advertising directed at children. This is a hard, separately-penalised obligation. `(counsel)`
- [ ] **Breach notification to the Data Protection Board and affected individuals** — required once Phase 3 is live; have the process ready. `(co-counsel)`
- [ ] **Significant Data Fiduciary (SDF) check** — high-volume/high-risk processors face extra duties (Indian-resident DPO, DPIAs, audits). SDF and MSME-exemption provisions are not yet notified (expected ~May 2027). Flag if the client looks high-volume. `(counsel)` **(verify currency)**
- [ ] **Penalty awareness** — failures can reach **₹250 crore** (security) and **₹200 crore** (breach-notification / children's-data violations); these are organisational, not nominal. `(self-manage)` to understand, `(counsel)` if exposed
- [ ] **Cross-border** — DPDPA takes a relatively permissive "negative list" approach (transfers allowed except to government-restricted countries), but confirm the current list and any sector overrides. `(counsel)` **(verify currency)**

---

## 3 — UAE: PDPL / DIFC / ADGM Specifics `[UAE]`

> **Threshold step: identify the layer.** Federal PDPL (Decree-Law 45/2021) governs mainland and non-financial free zones; **DIFC** (DP Law No. 5/2020, amended July 2025) and **ADGM** (DP Regulations 2021) are *separate* regimes for entities licensed there. This choice is tied to where Qera incorporates. **(verify currency — federal executive regulations were still unpublished as of mid-2026.)**

- [ ] **Identify which UAE regime applies** — federal vs DIFC vs ADGM, by entity licensing. Don't apply federal rules to a DIFC entity or vice-versa. `(counsel)`
- [ ] **Federal PDPL status awareness** — in force since Jan 2022 but its **executive regulations remain unpublished**; once published, compliance is required within **6 months**. Align with PDPL principles now; treat the regulations' publication as a countdown trigger to watch. `(self-manage)` **(verify currency)**
- [ ] **DIFC entities: the July 2025 amendments bite** — DIFC now has a **private right of action** (individuals sue in DIFC courts), a **reversed burden of proof** on breach claims, mandatory **documented adequacy assessments** before cross-border transfers, and fines up to **USD 50,000/violation**. DIFC is the more mature, actively-enforced regime — material to the entity-location decision (§13). `(counsel)`
- [ ] **DPO appointment trigger** — required for high-risk processing, large-scale or systematic processing of sensitive data. `(co-counsel)`
- [ ] **Cross-border transfer** — federal PDPL allows transfers to "adequate" jurisdictions or via binding contractual safeguards; **DIFC publishes its own adequacy list** (EU/EEA, UK, Switzerland, Japan, South Korea, California) and SCCs. Use the right mechanism for the right layer. `(counsel)` **(verify currency)**
- [ ] **Sectoral carve-outs** — federal PDPL excludes health and banking/credit data (own sectoral laws) and DIFC/ADGM entities. Don't assume PDPL covers everything. `(counsel)`
- [ ] **Child Digital Safety** — Federal Decree-Law 26/2025 adds age-verification, parental-consent, and no-behavioural-advertising obligations for minors; full enforcement from Jan 2027. Relevant if any client targets/reaches minors. `(counsel)` **(verify currency)**

---

## 4 — Australia: Privacy Act / APPs Specifics `[AU]`

> Privacy Act 1988 + 13 Australian Privacy Principles, as reshaped by the Privacy and Other Legislation Amendment Act 2024 (Royal Assent 10 Dec 2024). **The pottery-class client lives here.** **(verify currency — Australia is mid-reform, tranche 2 pending.)**

- [ ] **Small-business-exemption check (with three big caveats)** — businesses under **AUD 3M turnover** are *currently* mostly exempt, BUT: (1) the exemption is **expected to be removed in tranche 2** (2026/27); (2) it **never applied** to those handling health data, trading in personal information, government contractors, or credit reporting; and (3) the **statutory tort below applies regardless of the exemption.** Treat the exemption as a shrinking, unreliable shield — build compliant practice now. `(co-counsel)` **(verify currency)**
- [ ] **Statutory tort for serious invasions of privacy** — live since **10 June 2025**; individuals can sue directly for serious privacy invasions, **exemption or not**. This is the single biggest reason a small Australian client should not be cavalier about data. `(counsel)`
- [ ] **Compliant privacy policy is itself an obligation** — the OAIC can issue infringement notices up to **AUD 66,000 per contravention** for failures like not maintaining a compliant policy. A stale or missing policy is now a direct, quantifiable risk. `(self-manage)` (the policy) / `(co-counsel)` (review)
- [ ] **APP 11 "reasonable steps" = technical + organisational** — security must demonstrably include both (MFA, encryption + access controls, offboarding). Cross-ref Security Master + Internal Ops. `(self-manage)` **(verify currency)**
- [ ] **Notifiable Data Breaches (NDB) scheme** — eligible breaches must be assessed and notified to the OAIC and affected individuals; have the process ready. `(co-counsel)` **(verify currency)**
- [ ] **Automated Decision-Making transparency (from 10 Dec 2026)** — if the site uses ADM that significantly affects individuals, the privacy policy must disclose it. Flag for any client using automated scoring/decisioning. `(self-manage)` **(verify currency)**
- [ ] **Children's Online Privacy Code (registered by 10 Dec 2026)** + under-16 social-media restrictions — relevant for any service reaching minors. `(counsel)` **(verify currency)**
- [ ] **Penalty scale awareness** — serious/repeated breaches reach **AUD 50M / 3× benefit / 30% of adjusted turnover**; the OAIC began its first compliance sweep in Jan 2026 — enforcement is now active, not theoretical. `(self-manage)`

---

## 5 — Privacy Policy & Notices

- [ ] **Every site that collects any personal data has a privacy policy** — including a contact-form-only brochure site (a name + email is personal data). `[All]` `(self-manage)`
- [ ] **Policy is bespoke and accurate to what the site actually does** — not a copy-pasted template describing data flows the site doesn't have. An inaccurate policy is worse than none — it's a misrepresentation. `[All]` `(co-counsel)`
- [ ] **Policy states: what's collected, purpose, lawful basis, retention, third parties/processors, user rights, and contact** — the universal content set across all three regimes. `[All]` `(co-counsel)`
- [ ] **Policy names every third party that receives data** — analytics, payment gateway, chat, hosting, email, automation tools; each integration that touches user data is disclosed (cross-ref Security §17 third-party sharing). `[All]` `(self-manage)`
- [ ] **Jurisdiction-specific clauses present** — DPDPA rights & grievance contact `[India]`; PDPL/DIFC rights `[UAE]`; APP-compliant content incl. ADM disclosure from Dec 2026 `[AU]`. `(co-counsel)` **(verify currency)**
- [ ] **Policy reviewed by counsel for any real business / sensitive data** — generators are a starting draft, not a final legal document for anything beyond the simplest brochure site. `[All]` `(counsel)` for sensitive/regulated, `(co-counsel)` otherwise
- [ ] **Policy versioned and dated** — changes tracked; users notified of material changes. `[All]` `(self-manage)`
- [ ] **Terms of Service / Terms of Use present where the site is interactive/transactional** — separate from privacy; governs use, liability, IP. `[All]` `(counsel)` for transactional

---

## 6 — Consent, Cookies & Tracking

> **Accuracy note:** none of India/UAE/Australia *currently* mandates an EU-style cookie consent banner the way GDPR/ePrivacy does. **But** all three treat data collected via tracking as personal data needing a lawful basis and transparency, and **if a client has EU/UK users, GDPR cookie-consent rules apply and this is out of scope → escalate.** Don't over-apply GDPR cookie law where it doesn't bind; don't under-apply transparency where it does.

- [ ] **Consent mechanisms are genuine** — no pre-ticked boxes, no bundled consent, no "dark patterns"; consent is opt-in, specific, and withdrawable. Australia's reforms explicitly target dark patterns and bundled consent. `[All]` `(self-manage)`
- [ ] **Tracking/analytics disclosed and lawful-based** — Google Analytics etc. disclosed in the policy; where the regime requires consent for non-essential tracking, obtain it before firing. `[All]` `(self-manage)` **(verify currency)**
- [ ] **Cookie/consent banner where a regime or a client's user base requires it** — mandatory for EU users `[EU/other → escalate]`; for India/UAE/AU, implement transparency + consent proportionate to the data, defaulting to the privacy-preserving option (cross-ref Security §17). `[All]` `(self-manage)`
- [ ] **Consent records kept** — log what was consented to, when, and the version of the notice (DPDPA's consent framework expects reliable records). `[All]` `(self-manage)` **(verify currency)**
- [ ] **Withdrawal is easy and honoured** — a clear path to withdraw consent / opt out, and it actually stops the processing. `[All]` `(self-manage)`
- [ ] **Marketing consent separate** — email/SMS marketing consent is distinct from service consent; note Australia's Spam Act and similar anti-spam rules govern electronic marketing separately. `[All]` `(co-counsel)` **(verify currency)**

---

## 7 — Data Subject / Principal Rights

- [ ] **A working channel to receive rights requests** — a monitored email/route published in the policy; you can't honour rights you can't receive. `[All]` `(self-manage)`
- [ ] **Access** — provide a copy of the individual's personal data on request. `[All]` `(self-manage)`
- [ ] **Correction** — fix inaccurate/outdated data on request. `[All]` `(self-manage)`
- [ ] **Deletion / erasure** — delete on request where the basis is met; deletion must be **real and propagate** to processors and backups (cross-ref Security §6), not a soft-delete flag. `[All]` `(self-manage)` / `(co-counsel)` on scope
- [ ] **Withdrawal of consent → stop processing** — withdrawal triggers cessation and often deletion. `[All]` `(self-manage)`
- [ ] **Grievance / complaint path** — DPDPA expects a grievance mechanism; UAE/AU provide regulator-complaint routes. Publish how to complain. `[All]` `(co-counsel)` **(verify currency)**
- [ ] **Response within the regime's timeframe** — confirm and meet the applicable deadline per regime. `[All]` `(self-manage)` **(verify currency)**
- [ ] **Identity verification before fulfilling a request** — don't hand someone's data to an impersonator (a request channel is also an attack surface — cross-ref Security). `[All]` `(self-manage)`

---

## 8 — Data Breach Response

> A breach is a `(counsel)` event the moment it's real — but the *readiness* is `(self-manage)`. Cross-ref Security §13 (incident response) for the technical side; this section owns the legal/notification obligations.

- [ ] **Written incident-response plan exists** before any incident — who's contacted, how it's contained, who notifies whom (cross-ref Security §13). `[All]` `(co-counsel)`
- [ ] **Know each regime's notification trigger and clock** — India (Board + individuals, once Phase 3 live), UAE (Data Office + individuals), Australia (OAIC + individuals under the NDB scheme). The thresholds and timelines differ — confirm per regime. `[All]` `(counsel)` **(verify currency)**
- [ ] **Breach assessment process** — a way to assess whether an incident is notifiable and to whom. `[All]` `(co-counsel)`
- [ ] **Engage counsel immediately on a real breach** — notification wording, regulator interaction, and liability are legal decisions, not operational ones. `[All]` `(counsel)`
- [ ] **Breach log maintained** — record incidents and responses; regulators expect a record. `[All]` `(self-manage)`
- [ ] **Client contract specifies breach roles** — if Qera is a processor, the contract states Qera's notification duty to the client (§14). `[All]` `(co-counsel)`

---

## 9 — Cross-Border Data Transfer

> **Acute for Qera specifically** — your own operations move data across India, the UAE, and Australia, and your clients' data may too. Cross-border is consistently the most legally technical area and is `(counsel)` by default.

- [ ] **Map every cross-border flow** — where does personal data physically go (hosting region, processor locations, your own team across India/UAE)? You can't make a transfer lawful you haven't identified. `[All]` `(self-manage)` to map, `(counsel)` to validate
- [ ] **Use the correct transfer mechanism per origin regime** — India (negative-list approach, confirm current restricted list); UAE federal (adequacy or binding contracts) and DIFC (its own adequacy list + SCCs); Australia (APP 8 accountability for overseas disclosure). `[All]` `(counsel)` **(verify currency)**
- [ ] **Hosting/region choices documented against transfer rules** — picking a data-centre region is a transfer decision; document the basis. `[All]` `(co-counsel)`
- [ ] **Processor chain transfers covered** — sub-processors in other countries are onward transfers needing their own basis. `[All]` `(counsel)`
- [ ] **Qera's own India↔UAE data movement assessed** — as Qera relocates and operates across both, its internal handling of client data across borders needs its own basis. `[India]` `[UAE]` `(counsel)`

---

## 10 — Accessibility as a Legal Requirement

> Accessibility ranks 3rd in the precedence order as a *quality* concern (a future Accessibility master will own the technical standard, WCAG). This section owns only the **legal** dimension: where failing accessibility is unlawful, not merely poor craft.

- [ ] **Check whether accessibility is legally mandated for the project** — e.g. Australia's Disability Discrimination Act has been read to cover websites; government/public-sector and some sectors carry explicit obligations; a client's own market may impose more (US ADA, EU EAA → escalate). `[AU]` `[EU/other → escalate]` `(co-counsel)` **(verify currency)**
- [ ] **Meet WCAG to the legally-relevant level where mandated** — implementation owned by the future Accessibility master / Security & quality docs; this item is the legal trigger to *require* it. `[All]` `(self-manage)` to flag
- [ ] **Don't sacrifice legally-required accessibility for performance or design** — accessibility outranks both (precedence). `[All]` `(self-manage)`

---

## 11 — IP, Licensing & Digital Assets

> Applies to both the products Qera builds and Qera's own exposure. Using an unlicensed font or image, or shipping AI-generated assets with unclear rights, is a real liability that lands on the agency.

- [ ] **Every font properly licensed for the use** — web-embedding licences differ from desktop; commercial use confirmed; client or Qera holds the right licence. Self-hosting a font you're not licensed to embed is infringement (cross-ref Performance §3 self-hosting — license first). `[All]` `(self-manage)` / `(counsel)` if unclear
- [ ] **Every image/video/audio licensed or owned** — stock licences cover the actual use (web, commercial, modification); no scraped or "found on Google" assets. `[All]` `(self-manage)`
- [ ] **Open-source licences complied with** — dependencies' licences (MIT/Apache/GPL etc.) are compatible with the project and their terms met; copyleft (GPL) implications understood before shipping in client work (cross-ref Security §12 dependency inventory). `[All]` `(co-counsel)`
- [ ] **AI-generated assets' rights understood** — for the Kling AI hero images and similar: confirm the tool's commercial-use terms, output-ownership, and indemnity position; AI-output copyright status is unsettled and varies by jurisdiction — document the basis and disclose where required. `[All]` `(counsel)` **(verify currency)**
- [ ] **Client IP ownership clearly assigned by contract** — who owns the delivered work, source, and assets is set in writing (§14); ambiguity here is a common agency dispute. `[All]` `(counsel)`
- [ ] **Qera's reusable IP / components carved out** — if Qera reuses its own framework/components across clients, the contract reserves those rights rather than assigning them away. `[All]` `(counsel)`
- [ ] **Trademark clearance for brand/name work** — branding deliverables don't infringe existing marks; clearance is a `(counsel)` step, not a Google search. `[All]` `(counsel)`
- [ ] **No reproduction of others' copyrighted content** — including text/code lifted into client sites. `[All]` `(self-manage)`

---

## 12 — E-commerce & Consumer Law

> Applies when a client sells goods/services online. Consumer-protection law is separate from privacy and is jurisdiction-specific.

- [ ] **Consumer-protection rules met for the selling jurisdiction** — Australian Consumer Law (consumer guarantees, no misleading conduct), India's consumer/e-commerce rules, UAE consumer protection — confirm per where the client sells. `[All]` `(counsel)` **(verify currency)**
- [ ] **Clear terms of sale, pricing, refund & returns policy** — published, accurate, and compliant with the selling jurisdiction's mandatory rights. `[All]` `(co-counsel)`
- [ ] **Payment handling is PCI-compliant via the gateway** — card data never touches your/the client's server; use hosted/tokenised checkout (cross-ref Security §6/§17). `[All]` `(self-manage)`
- [ ] **No misleading claims / dark patterns at checkout** — pricing, urgency, and consent are honest; AU reforms specifically target dark patterns. `[All]` `(self-manage)`
- [ ] **Tax handling correct** — GST/VAT/sales tax collected and shown per jurisdiction (overlaps §15; accountant territory). `[All]` `(counsel)`

---

## 13 — Qera as a Business: Entity & Structure

> The business-side legal foundation. Almost entirely `(counsel)` — these are structuring decisions with tax, liability, and data-law consequences that compound for years. This section's job is to list what to take to your lawyer/accountant, not to answer it.

- [ ] **India entity properly constituted and compliant** — correct structure, registrations, and ongoing filings (GST already in hand per Qera's invoicing system). `[India]` `(counsel)`
- [ ] **UAE entity decision: mainland vs free zone (incl. DIFC) — and its data-law consequence** — this isn't only tax/ownership; **it decides whether federal PDPL or DIFC/ADGM law governs Qera** (§3). Factor data-regime maturity and the DIFC private right of action into the structuring decision, with counsel. `[UAE]` `(counsel)`
- [ ] **India ↔ UAE structure for a business operating across both** — how the two entities relate, where contracts sit, where revenue lands, and how data flows between them (§9) — coordinated legal + tax advice across both jurisdictions. `[India]` `[UAE]` `(counsel)`
- [ ] **Banking and payment-processor setup matched to the entity** — (Stripe/UAE availability already researched); ensure the processor terms and the entity align. `[UAE]` `(co-counsel)`
- [ ] **Co-founder arrangement documented** — equity, roles, decision rights, and what happens on exit, in writing — especially with founders in different countries. `[All]` `(counsel)`
- [ ] **Required business licences/permits held** — for the activities and jurisdictions Qera operates in. `[All]` `(counsel)`
- [ ] **Insurance considered** — professional indemnity / cyber liability appropriate to agency work holding client data and shipping code. `[All]` `(co-counsel)`

---

## 14 — Qera as a Business: Client Contracts & Liability

> The contract is the single most important risk-management instrument an agency has. Most disputes trace to something a contract should have said. Drafting/finalising enforceable terms is `(counsel)`; Qera can prepare and standardise the inputs.

- [ ] **Written agreement (MSA/SOW) for every engagement** — scope, deliverables, timelines, payment, and what's *out* of scope, in writing before work starts. `[All]` `(counsel)` to draft the template, `(self-manage)` to apply it
- [ ] **Liability cap and exclusions** — limit Qera's liability (typically to fees paid) and exclude indirect/consequential loss; uncapped liability on a small project can be existential. This is the clause that protects the business. `[All]` `(counsel)`
- [ ] **IP ownership & assignment terms** — who owns delivered work vs Qera's reusable components (§11); assignment on full payment. `[All]` `(counsel)`
- [ ] **Data Processing Agreement where Qera is a processor** — required across all three regimes when Qera handles personal data for a client; sets security obligations, breach-notification duty, sub-processor terms, and deletion-on-termination (cross-ref §0 role check, §8). `[All]` `(counsel)`
- [ ] **Security baseline & its limits stated in the contract** — what security Qera provides at each tier, and the limits of liability (this is the Security Master's "security baseline in proposals" item — it lives here legally). Both a selling point and a shield. `[All]` `(co-counsel)`
- [ ] **Scope-change / variation process** — how out-of-scope requests are priced and agreed, so scope creep is contractual, not a fight. `[All]` `(self-manage)`
- [ ] **Payment terms, late fees, and suspension rights** — when payment is due and what happens if it isn't. `[All]` `(co-counsel)`
- [ ] **Warranties, disclaimers, and indemnities calibrated** — don't warrant outcomes you can't control (e.g. specific SEO rankings, or "unbreachable" security — cross-ref the honesty notes in both docs); disclaim appropriately. `[All]` `(counsel)`
- [ ] **Termination & handover terms** — how either side exits, what's handed over, and access/credential transfer (cross-ref Security Internal Ops offboarding). `[All]` `(co-counsel)`
- [ ] **Governing law & dispute resolution** — which jurisdiction's law governs and where disputes are resolved — matters acutely for cross-border (India entity, UAE entity, Australian client). `[All]` `(counsel)`

---

## 15 — Qera as a Business: Tax & Financial Compliance

> Accountant/tax-advisor territory, not lawyer-only and definitely not self-serve. Listed so it's on the radar and routed to the right professional.

- [ ] **India GST compliance** — registration, correct invoicing (in hand per Qera's GST-compliant invoice system), returns, and input credits. `[India]` `(counsel)` (accountant)
- [ ] **UAE corporate tax & VAT** — UAE corporate tax and VAT obligations for the chosen entity/structure; confirm current thresholds and registration duties. `[UAE]` `(counsel)` **(verify currency)**
- [ ] **Cross-border invoicing & revenue recognition** — invoicing Australian/other foreign clients from an India and/or UAE entity, FX, and where revenue is recognised and taxed. `[All]` `(counsel)`
- [ ] **Transfer pricing / inter-entity flows** — if the India and UAE entities transact, transfer-pricing rules may apply. `[India]` `[UAE]` `(counsel)`
- [ ] **Withholding tax on cross-border payments** — inbound/outbound payments may carry withholding obligations; confirm per corridor. `[All]` `(counsel)`
- [ ] **Withholding tax on cross-border payments** is handled above; **record-keeping for the required retention period per jurisdiction** — financial records kept as long as law requires (interacts with data-retention, §1). `[All]` `(self-manage)` to keep, `(counsel)` for periods

---

## 16 — Technology, Tooling & Library Licensing (what you use)

> The layer most agencies never audit: **every library, framework, API, SaaS tool, and asset you use carries a licence or Terms of Service that binds you** — and often disclaims all liability *to* you. "Protection" here is diligence + compliance + contractual pass-through, not a shield. This is inbound IP (what you consume); §11 and §18 cover outbound (what you create/own).

- [ ] **Every dependency's open-source licence reviewed for the use** — MIT/Apache/BSD are permissive; **copyleft (GPL/AGPL) can require you to open-source derivative work** — a real risk when shipping client code. Know each licence before it ships. *(cross-ref Security §12 dependency inventory.)* `[All]` `(co-counsel)`
- [ ] **Licence obligations met on distribution** — required attribution/NOTICE files included; copyleft source-availability honoured; no stripping of licence headers. `[All]` `(self-manage)`
- [ ] **Every SaaS tool / API Terms of Service permits the actual use** — commercial use, client/agency use, redistribution, rate limits, and data-handling terms confirmed (e.g. can you use this API in a paid client product? does its ToS allow processing the client's user data?). `[All]` `(self-manage)` / `(co-counsel)` if unclear
- [ ] **Attribution / branding requirements honoured** — "powered by", logo, or backlink requirements in free-tier tools complied with or upgraded out of. `[All]` `(self-manage)`
- [ ] **Indemnity & liability position understood per tool** — most tools disclaim liability to you; know which (if any) indemnify you if their output infringes, and where the risk lands if they don't. `[All]` `(co-counsel)`
- [ ] **Asset licences depth-checked** — stock image/video/audio licence covers the *actual* use (web, commercial, modification, client handoff); **music/sync licensing for video work** (e.g. the launch video) is distinct and often missed; icon libraries (Lucide, Font Awesome) and CC-licensed assets have attribution terms. `[All]` `(self-manage)`
- [ ] **Client handoff of licences resolved** — when work ships, is the licence held by Qera or transferred to the client? Mismatch means the client is using assets they aren't licensed for. `[All]` `(co-counsel)`
- [ ] **Template/theme/boilerplate licences cleared** — any purchased template or starter has a licence governing resale/client use. `[All]` `(self-manage)`

---

## 17 — AI-Specific Legal Exposure

> Acute and fast-moving — Qera uses AI for assets, copy, automation, and may build AI features (chatbots) for clients. Three distinct risk surfaces: feeding data *into* AI, the rights/quality of AI *output*, and disclosure obligations. **(verify currency — this is the fastest-changing area in the doc.)**

- [ ] **No client/confidential data fed into AI tools without authorisation** — pasting a client's customer data, credentials, or confidential material into a public AI tool can breach **confidentiality (§24/NDA) and data-protection law** simultaneously, and may violate the tool's data-use terms. Use enterprise/zero-retention tiers and the client's written permission. `[All]` `(co-counsel)`
- [ ] **AI tool commercial-use & output-ownership terms confirmed** — the tool's ToS governs whether you can use the output commercially and who owns it; AI-output copyright status is unsettled and varies by jurisdiction (§11). `[All]` `(counsel)` **(verify currency)**
- [ ] **AI-generated content labelled where required `[India]`** — India's IT Rules amendments on **Synthetically Generated Information (in force Feb 2026)** plus the India AI Governance Guidelines push labelling of AI-generated content; ASCI requires AI disclosure in advertising. Label AI media; disclose AI use in ad creative. `[India]` `(self-manage)` **(verify currency)**
- [ ] **AI chatbots disclose they are AI `[India]`** — customer-facing AI assistants should be identifiable as AI from the start of the interaction (India governance guidance; platform policies). Build the disclosure in. `[India]` `(self-manage)` **(verify currency)**
- [ ] **AI content meets media/advertising standards `[UAE]`** — UAE's media law framework (Decree-Law 55/2023) covers AI content; promotional AI content sits inside the Advertiser-Permit regime (§19). `[UAE]` `(counsel)` **(verify currency)**
- [ ] **AI output not misleading `[AU]` `[India]`** — AI-enhanced product imagery or claims that create a false impression breach consumer law (AU ACL; India CPA/CCPA). Don't let AI assets misrepresent the real product. `[AU]` `[India]` `(self-manage)`
- [ ] **No dedicated AI statute assumption** — none of the three has a single binding "AI Act" as of mid-2026; AI must comply with *existing* law (data protection, consumer, media, IP). Don't wait for an AI law to apply diligence. `[All]` `(self-manage)` **(verify currency)**
- [ ] **AI features that make significant automated decisions trigger transparency `[AU]`** — Australia's ADM disclosure (from Dec 2026) requires the privacy policy to explain automated decision-making (§4). `[AU]` `(co-counsel)` **(verify currency)**

---

## 18 — IP Chain of Title & Qera's Own IP

> You can only give a client clean title to work that *you* hold clean title to. If an intern, freelancer, or AI tool contributed and the rights weren't secured, the chain is broken — and you may be assigning rights you don't own. This is the outbound-IP counterpart to §16.

- [ ] **Written IP assignment from every contributor** — interns, freelancers, and contractors assign their IP in the work to Qera in writing; without it, the contributor may retain rights and the client's assignment (§14) is defective. **The single most common silent IP failure in agencies.** `[All]` `(counsel)` to template, `(self-manage)` to apply
- [ ] **Contributor confidentiality bound** — the same agreements bind confidentiality over client data and Qera's work (§24). `[All]` `(co-counsel)`
- [ ] **AI-tool contributions accounted for in the chain** — where AI generated part of the deliverable, the ownership/licence position (§17) is resolved before assigning to the client. `[All]` `(counsel)`
- [ ] **Qera's own trademark cleared and (where worth it) registered** — the "Qera" name/mark cleared against existing marks and registered in key jurisdictions (India, UAE) as the brand scales. `[India]` `[UAE]` `(counsel)`
- [ ] **Domains and brand handles secured & protected** — core domains held in Qera's control (not a personal/ex-contractor account); watch for cybersquatting on key variants. `[All]` `(self-manage)`
- [ ] **Reusable Qera IP/components documented & reserved** — the framework/components Qera reuses across clients are identified and carved out of client assignment (§14). `[All]` `(counsel)`
- [ ] **Portfolio / case-study rights secured** — the right to publicly show client work is granted in the contract; don't assume it. `[All]` `(co-counsel)`

---

## 19 — Content, Advertising & Marketing Law

> Qera writes copy, runs social, and builds automation that sends messages — every one of those is regulated. Liability often lands on **both** the brand and the agency. Verified current rules below. **(verify currency throughout.)**

### Advertising & endorsement
- [ ] **No misleading or unsubstantiated claims** — advertising must be truthful and substantiated; AU's ACL (misleading/deceptive conduct, penalties to AUD 50M / 30% turnover, enforced by ACCC), India's CPA 2019 / CCPA, and UAE consumer/media rules all bite. Health/finance/eco ("greenwashing") claims are enforcement hot-spots. `[All]` `(co-counsel)` **(verify currency)**
- [ ] **Influencer / sponsored content disclosed `[All]`** — material connections disclosed clearly (#ad, #sponsored, upfront, not buried). **India:** ASCI guidelines (updated 2025), backed by CPA/CCPA, apply to every influencer regardless of follower count. **AU:** under the ACL, **both the influencer and the brand can be liable**; AANA codes apply. **Both** brand and agency carry exposure. `[India]` `[AU]` `(co-counsel)` **(verify currency)**
- [ ] **UAE Advertiser Permit obligations `[UAE]`** — under Federal Decree-Law 55/2023 (Advertiser Permit regime, effective **1 Feb 2026**, penalties via Cabinet Resolution 42/2025), anyone publishing promotional content from within the UAE — **including agencies, brands, and in-house marketing teams, paid or unpaid, any follower count** — needs a permit, and engaging unlicensed creators exposes the agency. If Qera runs promotional/social content from the UAE, **this is Qera's own obligation**, not just the client's. `[UAE]` `(counsel)` **(verify currency)**
- [ ] **Finfluencer / health credentials `[India]` `[UAE]`** — financial or health promotional content carries credential/qualification requirements (India ASCI Addendum 2 + SEBI; UAE finfluencer licensing). Don't produce regulated-advice content without them. `[India]` `[UAE]` `(counsel)` **(verify currency)**
- [ ] **Testimonials/reviews genuine** — no fake or incentivised-undisclosed reviews; consumer-law exposure across all three. `[All]` `(self-manage)`

### Electronic marketing / anti-spam
- [ ] **Consent before commercial email/SMS `[All]`** — **AU Spam Act 2003** (consent + sender ID + functional unsubscribe; enforced by ACMA; multi-million-dollar fines; burden of proof on sender); India's TRAI/commercial-communication rules; UAE anti-spam. The agency's automation work (n8n/Make sending mail) sits squarely here. `[All]` `(co-counsel)` **(verify currency)**
- [ ] **Agency liability for messages sent on a client's behalf `[AU]`** — the Spam Act makes the business responsible even when a third party (Qera) sends on its behalf, and **the outsourced provider must maintain consent records.** Build consent-record-keeping into every campaign Qera runs. `[AU]` `(co-counsel)` **(verify currency)**
- [ ] **Functional unsubscribe + honoured promptly** — working opt-out in every message, actioned fast (AU: within 5 business days); no re-contacting after opt-out. `[All]` `(self-manage)`
- [ ] **Sender identification & (AU) Sender ID registration** — messages identify the sender; **AU SMS Sender ID Register from 1 July 2026** for branded SMS. `[AU]` `(self-manage)` **(verify currency)**
- [ ] **No purchased/scraped marketing lists** — consent can't be bought; scraped lists breach both anti-spam and data-protection law. `[All]` `(self-manage)`

### Content liability
- [ ] **Copy doesn't defame, infringe, or mislead** — written content checked for defamation, IP infringement, and false claims before publishing. `[All]` `(self-manage)`

---

## 20 — Cyber-Incident Reporting (CERT-In) & Sector Cyber Rules

> **Separate from, and tighter than, DPDPA breach notification.** India's CERT-In regime is a standalone obligation most teams miss, and it applies to almost any entity operating digitally in India. Cross-ref Security §13 (incident response) for the technical side. **(verify currency.)**

- [ ] **CERT-In 6-hour incident reporting `[India]`** — specified cyber incidents (unauthorised access, data breach, ransomware, website defacement, DDoS, etc.) must be reported to CERT-In **within 6 hours** of noticing — far tighter than any privacy-law clock. Have the reporting process and contacts ready *before* an incident. `[India]` `(co-counsel)` **(verify currency)**
- [ ] **180-day log retention within India `[India]`** — ICT system logs retained for 180 days, stored in India; plus NTP clock synchronisation to NIC/NPL servers. `[India]` `(self-manage)` **(verify currency)**
- [ ] **CERT-In applicability assumed, not assumed-away `[India]`** — the directions apply broadly (service providers, intermediaries, body corporates) with a presumption of inclusion; treat Qera and most Indian clients as in scope. `[India]` `(co-counsel)`
- [ ] **Annual cyber-audit awareness `[India]`** — 2025 CERT-In audit guidelines push annual third-party security audits and SBOMs for a widening set of entities; track applicability as it expands. `[India]` `(counsel)` **(verify currency)**
- [ ] **Sector cyber rules stack on top** — finance (RBI), health, telecom, etc. carry their own incident/security rules above the baseline. `[All]` `(counsel)`
- [ ] **Reporting duties wired into contracts** — where Qera is a processor/host, the contract states who reports to CERT-In and within what time (§14). `[India]` `(co-counsel)`

---

## 21 — Intermediary Liability & User-Generated Content

> Triggered whenever a build lets users post content (reviews, comments, uploads, listings, forums, messaging). The site becomes an "intermediary" with both **protection** (safe harbour) and **obligations** to keep it. **(verify currency.)**

- [ ] **Safe-harbour conditions met `[India]`** — under IT Act §79 + IT Rules 2021, an intermediary hosting third-party content is shielded from liability **only if** it observes due diligence: publish rules/privacy/user agreement, a **grievance mechanism with a named grievance officer**, and act on valid takedown orders. Losing safe harbour exposes the platform to liability for user content. `[India]` `(counsel)` **(verify currency)**
- [ ] **36-hour takedown on valid order `[India]`** — unlawful content removed within 36 hours of a court/government order (or as platform policy on valid grievances). `[India]` `(co-counsel)` **(verify currency)**
- [ ] **AI/synthetic-content duties for platforms `[India]`** — IT Rules amendments (in force Feb 2026) add labelling/diligence duties where a platform hosts or enables synthetic/AI-generated content. `[India]` `(counsel)` **(verify currency)**
- [ ] **UGC moderation & notice-and-takedown across regimes** — a process to receive complaints and remove unlawful/infringing user content; users bound by content rules in the terms (§22). `[All]` `(co-counsel)`
- [ ] **Liability for user IP infringement & defamation managed** — the platform isn't a publisher of user content where safe harbour holds, but must act on notice; copyright/defamation takedown process exists. `[All]` `(co-counsel)`
- [ ] **High-risk UGC escalates to counsel** — marketplaces, anything with minors, or sensitive content categories need tailored legal design. `[All]` `(counsel)`

---

## 22 — Website Legal Pages & Product / Software Liability

> Beyond the privacy policy: the documents that govern *use* of the site/product and allocate risk for the software itself.

- [ ] **Terms of Service / Use present on interactive or transactional sites** — governs acceptable use, IP, disclaimers, and liability between the site and its users (distinct from privacy). `[All]` `(counsel)` for transactional, `(co-counsel)` otherwise
- [ ] **Liability disclaimer on the website** — appropriate "as-is"/limitation language for the site's content and availability. `[All]` `(co-counsel)`
- [ ] **Acceptable Use Policy for platforms/SaaS** — what users may not do; ties to UGC moderation (§21). `[All]` `(co-counsel)`
- [ ] **EULA for any licensed software product** — where a software product is licensed (not just a site), an end-user licence agreement governs the grant. `[All]` `(counsel)`
- [ ] **Software delivered with calibrated warranty terms** — the build contract (§14) states warranty scope, "as-is" beyond it, defect-handling, and that Qera doesn't warrant uninterrupted/error-free operation or specific outcomes (cross-ref the honesty notes — no "unbreachable"/guaranteed-result claims). `[All]` `(counsel)`
- [ ] **Security-breach liability allocated** — contract states responsibility split if a vulnerability is exploited post-handover, especially after the maintenance window ends (§14, Security Internal Ops). `[All]` `(counsel)`
- [ ] **Open-source attributions surfaced where required** — some licences require an attributions/licences page in the shipped product (§16). `[All]` `(self-manage)`

---

## 23 — People: Employment, Interns & Contractors

> Qera-as-employer legal. Covers the team (interns, contractors, future hires) and feeds the IP chain of title (§18). Employment law is jurisdiction-specific and `(counsel)`-heavy.

- [ ] **Worker classification correct** — employee vs independent contractor vs intern classified correctly per jurisdiction; misclassification carries tax, benefits, and penalty exposure (India and UAE differ significantly). `[India]` `[UAE]` `(counsel)`
- [ ] **Written agreements for every team member** — interns and contractors have written agreements covering scope, pay/stipend, confidentiality, and **IP assignment** (§18). `[All]` `(counsel)` to template, `(self-manage)` to apply
- [ ] **Stipend / wage compliance** — intern stipends and wages meet applicable minimum/labour rules and are documented (cross-ref Qera's stipend-slip system). `[India]` `(co-counsel)` **(verify currency)**
- [ ] **Statutory employer obligations met** — where workers are employees, statutory contributions/registrations/leave per jurisdiction apply (India PF/ESI thresholds, UAE labour law / WPS). `[India]` `[UAE]` `(counsel)` **(verify currency)**
- [ ] **Confidentiality & data-access bound** — team members handling client data are bound to confidentiality and to the Security Internal-Ops access/offboarding rules. `[All]` `(co-counsel)`
- [ ] **Offboarding revokes access & rotates secrets** — legal + security offboarding aligned (cross-ref Security Internal Ops). `[All]` `(self-manage)`
- [ ] **Cross-border team arrangements** — founders/team across India and UAE: which entity employs whom, and the tax/immigration consequences. `[India]` `[UAE]` `(counsel)`

---

## 24 — Confidentiality & NDAs

> A first-class item: Qera holds client secrets and client data, and shares its own with partners. Confidentiality is contractual protection in both directions.

- [ ] **Mutual NDA available and used** — for client engagements and partner/vendor discussions involving confidential information, before sensitive exchange. `[All]` `(counsel)` to template, `(self-manage)` to apply
- [ ] **Confidentiality clauses in every contributor agreement** — team and contractors bound (§18/§23). `[All]` `(co-counsel)`
- [ ] **Client-data confidentiality flows to sub-processors/tools** — any tool or sub-processor touching client data is bound to equivalent confidentiality (§16/§17 — no client data into un-bound AI tools). `[All]` `(co-counsel)`
- [ ] **Trade-secret hygiene for Qera's own IP** — Qera's reusable frameworks/processes treated as confidential where they're a competitive asset. `[All]` `(self-manage)`

---

## Consultant Layer — Tooling & the Counsel-Escalation Map

> The legal analogue of the other docs' consultant layers: what you can tool/template, and **the bright lines where only a qualified professional will do.** The core principle inverts the others' "don't over-buy": here it's **don't under-engage counsel on the items that carry real liability.** A template is cheap; an unenforceable contract or an unlawful data practice is not.

### What you can tool or template (lowers cost, doesn't remove judgement)
- **Privacy policy / terms generators** — Termly, iubenda, CookieYes (policy + consent) — a *starting draft* for simple sites; `(co-counsel)` before relying for any real business.
- **Consent management platforms (CMPs)** — CookieYes, Osano, Cookiebot — for consent capture/records and (where needed) banners; necessary if a client has EU users.
- **DSAR / rights-request handling** — a simple monitored inbox + tracked process suffices at Qera's scale; dedicated tools only at volume.
- **Contract templates** — a lawyer-drafted MSA/SOW/DPA template set that Qera reuses is the high-leverage investment: pay once for good templates, apply many times. `(counsel)` to create, `(self-manage)` to apply.
- **Compliance trackers** — a simple register of which regime applies per client, policy versions, and consent records.

### The bright lines — only a qualified professional (`(counsel)`)
- **Entity structuring** (India/UAE, mainland vs DIFC) and the tax that flows from it.
- **Any enforceable contract clause that allocates risk** — liability caps, indemnities, IP assignment, DPAs.
- **Cross-border transfer mechanisms** — getting the legal basis wrong is a regulatory exposure.
- **Anything touching sensitive or children's data**, or a **regulated sector**.
- **A live dispute, regulator contact, or actual data breach** — engage counsel immediately.
- **A jurisdiction not covered here** (EU/UK/US/other) — get advice for that regime; do not extrapolate from these three.

### When each professional
- **Privacy/tech lawyer** — policies for real businesses, DPAs, breach response, cross-border, regulated sectors.
- **Corporate lawyer** — entity, contracts, IP, co-founder terms.
- **Accountant/tax advisor** — GST, UAE CT/VAT, cross-border invoicing, transfer pricing.
- **Specialist (per jurisdiction)** — admitted in India / UAE / Australia respectively; a lawyer in one is not automatically right for another.

### Sequencing for Qera
1. **Now (foundational):** a lawyer-drafted MSA/SOW/DPA template set + a bespoke privacy-policy baseline; the §0 applicability process; correct GST/invoicing (done).
2. **On UAE relocation:** entity + UAE data-regime decision (mainland vs DIFC) with coordinated legal + tax advice across both countries.
3. **As clients/data grow:** CMP where EU users appear; DSAR tooling at volume; PI/cyber insurance; counsel review cadence on the highest-data clients.

---

## Maintenance Schedule

> Legal decays *and advances by fixed dates* faster than any other concern here — there are known commencement dates coming. This is genuine reg-watch, and a legitimate "compliance retainer" offering. **A privacy policy or contract written once and never revisited is the most common compliance failure practitioners report.**

### Quarterly (reg-watch — the volatile dates are near)
- [ ] **India DPDPA phase check** — track progress toward consent-manager rules (Nov 2026) and substantive compliance (13 May 2027); confirm MSME/SDF exemption notifications as they land `[India]`
- [ ] **UAE federal PDPL executive-regulations watch** — publication starts a 6-month compliance clock; monitor the UAE Data Office `[UAE]`
- [ ] **Australia tranche-2 watch** — small-business-exemption removal, ADM obligations (Dec 2026), Children's Code (Dec 2026), SMS Sender ID Register (Jul 2026) `[AU]`
- [ ] **UAE Advertiser Permit watch** — permit regime live since Feb 2026; confirm Qera's own permit status if running promotional content from the UAE, and licensed-creator due diligence `[UAE]`
- [ ] **India digital-rules watch** — CERT-In audit-guideline expansion, IT Rules synthetic-content/AI amendments, ASCI guideline updates `[India]`
- [ ] **AI-law watch (all)** — track movement toward binding AI rules in any jurisdiction; re-check AI labelling/disclosure obligations
- [ ] **Out-of-scope creep** — has any client gained EU/US/other users, pulling in a new regime?
- [ ] **Sensitive-data creep** — has any client's data grown into sensitive/children's territory (escalates to `(counsel)`)?

### Per-project (at kickoff and launch)
- [ ] §0 applicability scoping completed and documented
- [ ] Privacy policy / terms current and accurate to the build
- [ ] Contract (MSA/SOW) + DPA in place before work and before launch
- [ ] Consent + rights mechanisms working

### Annually
- [ ] **Privacy policies reviewed for every active client** — updated to current law and current data practices
- [ ] **Contract templates reviewed by counsel** — against new law and lessons from the year
- [ ] **Entity/tax review** with accountant + lawyer (esp. as India/UAE structure matures)
- [ ] **This checklist re-verified** — every `(verify currency)` item re-checked against live law; update as-of dates
- [ ] **Insurance review** — PI/cyber cover still matches the work and data held

---

## Notes

### The "stop and get counsel now" bright-line list (the most important list in this doc)
Engage a qualified professional **before acting** whenever the project involves: entity structuring · any enforceable risk-allocating contract clause · cross-border transfer mechanisms · sensitive or children's data · a regulated sector · an actual breach, dispute, or regulator contact · a jurisdiction not covered here (EU/UK/US/other). If you're unsure whether an item is on this list, treat it as if it is.

### How to "verify" legal items
There's no tool that proves compliance. To verify: (a) check the relevant **regulator's site** (India: Data Protection Board / MeitY; UAE: UAE Data Office, DIFC Commissioner, ADGM; Australia: OAIC); (b) confirm the **current commencement status** of any phased law; (c) for anything `(counsel)`, get written advice. Re-verify before relying — these regimes are moving.

### Deprecated & Anti-Patterns (do NOT do)
| Practice | Why it's wrong | Instead |
|---|---|---|
| Copy-pasting another site's privacy policy | Inaccurate = misrepresentation; describes data flows you don't have | Bespoke policy to the actual build, counsel-reviewed for real businesses |
| Pre-ticked / bundled consent, dark patterns | Invalid consent across all three regimes; AU targets it directly | Opt-in, specific, withdrawable consent |
| Relying on AU's small-business exemption as a permanent shield | Shrinking; doesn't cover the statutory tort; likely removed in tranche 2 | Build compliant practice now |
| "We are GDPR/PDPL compliant" or "unbreachable" claims | Warranting outcomes you can't guarantee = liability | Describe practices, not guarantees (cross-ref Security/SEO honesty notes) |
| Indefinite data retention "just in case" | Breaches data-minimisation & retention rules | Defined retention + real deletion |
| Storing card numbers yourself | Consumer/PCI exposure | Gateway tokenisation (cross-ref Security §6) |
| Self-serving a `(counsel)` item to save cost | The items on that list are where mistakes are existential | Engage the right professional |
| Extrapolating these 3 regimes to a 4th (EU/US) | Each regime differs; assumptions are wrong and risky | Get advice for that jurisdiction |
| Treating a one-time policy/contract as permanent | Law changes by fixed dates; stale docs are the #1 reported gap | Quarterly reg-watch + annual review |

### Scope, honesty & as-of dates
- **Not legal advice; Claude is not a lawyer.** This is a framework and a current-state map to help Qera self-manage routine compliance and escalate the rest correctly. Every `(counsel)` item needs a qualified professional.
- **Jurisdiction-specific.** Built for India, UAE, and Australia only. Any other jurisdiction (EU/UK/US especially) is out of scope and must be handled with its own advice.
- **As-of June 2026, and moving.** Key current-state facts this doc relies on: India's DPDP Rules notified 13 Nov 2025 with phased enforcement to 13 May 2027; CERT-In 6-hour reporting + 180-day in-India logs (Directions 2022, audit guidelines 2025); IT Rules 2021 intermediary safe-harbour with 36-hour takedown and synthetic-content/AI labelling amendments in force Feb 2026; ASCI influencer-disclosure (updated 2025) backed by CPA/CCPA. UAE federal PDPL executive regulations still unpublished (6-month clock on publication), DIFC law amended July 2025 (private right of action); UAE Advertiser Permit (Federal Decree-Law 55/2023, Cabinet Resolution 42/2025) effective 1 Feb 2026 and reaching agencies/brands. Australia's POLA Act 2024 in force, statutory tort live since 10 June 2025, small-business exemption intact-but-shrinking, ADM & Children's Code from Dec 2026; Spam Act 2003 consent/ID/unsubscribe with agency liability for outsourced sending; ACL misleading-conduct exposure for brand and influencer; SMS Sender ID Register from 1 July 2026. No jurisdiction has a single binding AI statute as of mid-2026 — AI is governed by existing data-protection, consumer, media, and IP law. **All of these are dated and changing — re-verify before relying.**
- **Precedence:** this doc ranks 1st and supersedes all others. A lawful requirement is never traded for security, accessibility, performance, SEO, or design — it's met, or the conflicting feature is removed.
- **Living document.** Reg-watch quarterly; re-verify every `(verify currency)` item; update the as-of dates each review.
