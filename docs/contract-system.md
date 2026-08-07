# Contract system — architecture and rules

Internal spec for Speclr's contract module. Read this before touching contract code.
Companion file: `contract-content.md` holds the actual legal text.

Company: **Qera Private Limited** (registered India). Trading name: Qera Studio.
Governing law: India. Jurisdiction: Ghaziabad, Uttar Pradesh.

---

## 1. The idea in one line

A contract is not a document you write. It is an **assembly of pre-approved parts**.

Legal terms are a fixed asset that stops growing. Services are a library that grows forever.
Keeping those two things separate is the entire point of this system. Adding a new service
must never require writing new legal text.

---

## 2. Vocabulary — locked, do not invent alternatives

| Term | Meaning |
|---|---|
| **Master agreement** | The ~10 pages that appear in every contract. One record. Never edited per client. |
| **Schedule** | One of exactly four legal frames. Carries money, ownership and approval terms. |
| **Service** | One thing Qera sells. ~22 of them. Carries technical scope only. Each belongs to exactly one schedule. |
| **Blank** | A field filled per client — fee, timeline, page count, platform list. |
| **Exclusion library** | Shared list of "not included" lines, reused across services. |
| **Client input library** | Shared list of things the client must hand over before work starts. |

Do not use: module, section, variable, token, chassis, sheet. These were earlier drafts and cause confusion.

---

## 3. Structure

```
Master agreement                          1 record   — always included
│
├── Schedule 1 — Build                    fixed fee, one-time
│   ├── 01  Shopify storefront
│   ├── 02  Custom web build
│   ├── 03  Webflow or Framer site
│   ├── 04  Landing page or funnel
│   ├── 05  Brand identity
│   ├── 06  Design system or UI kit
│   ├── 07  Conversion optimisation build
│   ├── 08  Automation build
│   ├── 09  AI assistant build
│   └── 10  Generative content system
│
├── Schedule 2 — Monthly                  recurring, paid in advance
│   ├── 11  Content production
│   ├── 12  Community management
│   ├── 13  Paid social management
│   ├── 14  Website maintenance
│   ├── 15  Conversion optimisation retainer
│   └── 16  AI system operation
│
├── Schedule 3 — Setup                    one-time, no revisions, hand over keys
│   ├── 17  Domain and DNS
│   ├── 18  Business email and workspace
│   ├── 19  Analytics and tracking
│   └── 20  Social account setup and verification
│
├── Schedule 4 — Advice                   deliverable is a document
│   ├── 21  Audit or teardown
│   └── 22  Strategy sprint
│
├── Exclusion library                     shared, ~60 lines, grows over time
└── Client input library                  shared, ~40 lines, grows over time
```

### Why four schedules and not one per service

A Shopify build and a Webflow build need **identical** legal terms — same payment split,
same revision logic, same acceptance, same handover, same support window. Only the technical
scope differs. So the legal terms live on the schedule and are inherited, never repeated.

The four schedules are distinguished by **how money and ownership behave**, not by subject matter:

- **Build** — one-time fee, milestones, revision rounds, acceptance, IP transfers on full payment
- **Monthly** — advance billing, rolling term, notice period, credential handling, content licensing
- **Setup** — no revisions concept at all, client owns the account from day one, third-party costs are the norm, outcomes depend on registrars and platforms
- **Advice** — no implementation liability, no support window, client executes at own discretion

The schedule list is **closed**. Any new service Qera invents fits one of these four.
If a genuinely new commercial shape appears, that is a deliberate decision to open a fifth
schedule — not something to do casually.

---

## 4. Assembly logic

**The user never selects a schedule.** They select services. The system routes.

1. Pick a client from Records
2. Tick services from a flat, searchable list
3. System groups ticked services by their schedule
4. A schedule is rendered **only if at least one of its services was ticked**
5. Each rendered schedule gets a cover page, a table of contents listing only its included services, then the schedule's shared terms, then each service as a numbered part
6. Fill the blanks
7. Review exclusions and client inputs
8. Pricing rolls up automatically
9. Export

### Worked examples

**Only website maintenance ticked**
→ Master agreement + Schedule B (Monthly), containing one part: B1 Website maintenance.
No Schedule A, no C, no D. Nothing empty appears anywhere.

**Shopify + brand identity + community management + domain setup ticked**
→ Master agreement
→ Schedule A (Build): A1 Shopify storefront, A2 Brand identity
→ Schedule B (Monthly): B1 Community management
→ Schedule C (Setup): C1 Domain and DNS

### Schedule lettering

Letters are assigned in fixed order of schedule number, skipping absent ones.

Build → A, Monthly → B, Setup → C, Advice → D.

If only Monthly and Setup are present, they render as **A and B**, not B and C.
Do not leave gaps in the lettering. Store the schedule's internal id separately from
the rendered letter.

### Numbering within a schedule

Parts are numbered `{letter}{index}` in the order services appear in the schedule's
canonical ordering (the order shown in section 3), not the order the user ticked them.

---

## 5. Data model

Five new tables.

### `master_agreement`
```
id, version, body, effective_from, is_current
```
Only one row is current. Editing creates a new version row.

### `schedules`
```
id, number (1–4), name, letter_order, body, version
```
Exactly four rows. `body` is the shared terms text (see contract-content.md).

### `services`
```
id, code (01–22), name, schedule_id, sort_order, version,
overview, scope, limits, acceptance, handover,
third_party_costs, access_terms, dependencies,
default_fee, default_timeline, is_archived
```

### `exclusions`
```
id, text, category, is_archived
```

### `service_exclusions`
```
service_id, exclusion_id, default_state (excluded | included)
```

### `client_inputs`
```
id, text, category, is_archived
```

### `service_client_inputs`
```
service_id, client_input_id, is_default
```

### `contracts`
```
id, client_id, agreement_date, status,
snapshot_json, rendered_html, created_at
```

**`snapshot_json` is the critical field.** See section 8.

---

## 6. The exclusion library

### What it is

A flat list of single-sentence lines, each stating one thing that is **not** included.
Not grouped by service in storage — grouped by service only through the join table.
The same line ("Copywriting of any kind") attaches to Shopify, Webflow, custom build,
landing page and brand identity. Written once, reused five times.

### The rule that makes it work

**Exclusions are opt-out, not opt-in.**

In the contract builder, every exclusion attached to a ticked service renders
**pre-ticked as excluded**. You untick to bring something into scope, and unticking
prompts you to price it.

This inverts the failure mode. Today, forgetting to exclude something means you owe it.
Under this rule, forgetting means you don't. This single design decision is worth more
than careful drafting.

### Categories

Used for grouping in the admin UI and in the rendered contract. Six:

`content` · `design` · `technical` · `platform` · `marketing` · `support`

### Rendering

In the output, exclusions for a service render as a bulleted list under a fixed heading:

> **What is not included**
> *Excluded by default. Anything moved into scope is priced and written into this part before work starts.*

Group by category only when a service has more than 12 exclusions. Below that, one flat list.

### Building and editing

- Admin → Exclusion library. A flat searchable table.
- Add: text + category. That's the whole form.
- Attach: from either side — edit a service and tick which exclusions apply, or edit an exclusion and tick which services it belongs to. Both views hit the same join table.
- **Never delete. Archive.** Archived lines disappear from new contracts but stay readable for audit.
- Editing an exclusion's text does not touch any contract already generated (see section 8).

### How it grows — this is the actual value

After every project, one ritual: **whatever the client assumed was included but wasn't, add it as a line.**

This is how institutional memory stops living in your head. Every scope argument you have
converts into a permanent asset that appears on every future contract automatically.
Target: the library grows by 3–8 lines per completed project in year one, then flattens.

Seed list of 58 lines is in `contract-content.md`.

---

## 7. The client input library

Same mechanics as exclusions, opposite purpose. A list of things the client must hand over
before work begins.

Difference: these render as a **checklist in the right-hand editor sidebar** during contract
building. Tick what applies, ticked items render into the service's "What the client provides"
section.

Storage, archiving and versioning behave identically to exclusions.

Note: a future client-portal upgrade will surface this same list to the client as an
onboarding checklist with upload slots. Design the table with that in mind — each line
should be able to carry a `requires_upload` boolean later. Do not build the portal now.

---

## 8. Versioning and snapshot — non-negotiable

Two separate mechanisms. Both required.

### Versioning
The master agreement, each schedule and each service carry an independent version number.
Editing any of them creates a new version row rather than mutating the existing one.

### Snapshot
**When a contract is generated, the full resolved text is copied into `snapshot_json`.**

Not referenced. Copied. The snapshot contains the master agreement body, every schedule body,
every service body, every exclusion line, every client input line, and every filled blank —
as literal text, at the moment of generation.

Editing a service next year must be incapable of changing a contract signed last year.

If Qera cannot reproduce byte-for-byte what a client signed eighteen months ago, the tool is
a liability rather than an asset. This is painful to retrofit — **build it in the first commit.**

---

## 9. Blanks

Every number, name, count and date is a blank. Never typed as prose anywhere in a service
or schedule body.

Standard blanks and their defaults:

| Blank | Default | Notes |
|---|---|---|
| `payment_split` | 50 / 50 | advance / final |
| `milestone_threshold` | ₹1,00,000 | above this, milestone billing offered |
| `revision_rounds` | 3 | Build schedule only |
| `feedback_window` | 48 hours | |
| `acceptance_window` | 5 working days | Build schedule only |
| `support_days` | 30 | Build schedule only |
| `notice_days` | 15 | Monthly schedule only |
| `dormancy_hold` | 14 days | |
| `dormancy_priority_loss` | 28 days | |
| `dormancy_abandoned` | 60 days | |

Every one of these is **editable per contract.** Defaults are a starting point, not a lock.

### Rules

- Required blanks **hard-block export.** Not a warning — a block.
- Defaults pre-fill so the common case requires zero typing.
- Any unfilled blank in the preview renders as a visible red chip, never as empty space or a placeholder that could be mistaken for real text.

That last rule is why the Zaib contract went out saying "ZaibQ Stuioh" with inverted signature
blocks. Silent blanks are how bad contracts ship.

---

## 10. UI surfaces

Mapped to the existing Speclr sidebar.

**Admin** — new
- Master agreement (single record editor, version history)
- Schedules (4 records)
- Services (22 records) — this is the existing "Services" panel, extended
- Exclusion library
- Client input library

**Records** — exists
- Clients, Employees

**Documents → Client → Contract** — extend
- Contract list
- Contract builder: left = live preview, right = editor sidebar

### Editor sidebar, in order

1. Client and date
2. **Services** — flat searchable list with schedule shown as a quiet label, not a filter
3. Blanks — grouped by service, defaults pre-filled
4. Exclusions — pre-ticked, untick to include
5. Client inputs — checklist, tick to include
6. Commercial summary — auto-calculated, read-only
7. Export

### Service editor fields

The current "Add service" panel has: Name, Overview, Scope, Exclusions, Price & payment,
Milestones, Revisions, Disclaimer, Support & ownership.

Structurally correct. Add these — they are where disputes come from:

| Field | Why |
|---|---|
| Schedule | Determines routing. Required, single-select of 4. |
| Client inputs | Largest single cause of scope arguments. |
| Limits | Quantified: page count, product count, platform count, posts per month. Numbers, not adjectives. |
| Acceptance criteria | What "done" means. Includes the deemed-accepted trigger. |
| Handover | Exactly what the client receives. Removes ambiguity around retained IP. |
| Third-party costs | Itemised per service. Client-borne by default. |
| Access and credentials | Who owns the account, who holds root, what returns on termination. |
| Dependencies | Service X requires service Y. Warns at assembly time. |

Fields that move **from the service to the schedule** and are deleted from the service editor:
Price structure, Milestones, Revisions, Support, Disclaimer, Ownership. These are inherited.
The service keeps only its own fee and timeline.

---

## 10b. Placement rule — MSA vs Schedule

A clause belongs in the **Master Agreement** where it reads identically regardless of the kind of
work: liability, indemnity, confidentiality, governing law, force majeure, communication,
third-party costs, feedback windows, the definition of a revision, retained IP and the licence
over it, credit and portfolio.

A clause belongs in a **Schedule** where it genuinely differs between a one-time build, a monthly
engagement, a setup and an advisory piece: payment structure, billing cadence, revision counts,
acceptance, capacity, termination mechanics, handover timing.

**Where the same words appear in two or more Schedules, they move to the Master Agreement and the
Schedules reference them.** Enforce this on every future clause added — duplicated text drifts
apart over time and the contradiction is discovered by a Client, not by us.

## 10c. Balance requirement

Every Schedule must contain obligations that bind Qera Private Limited, not only the Client.

The Master Agreement carries the core commitments at M1. When drafting or editing any Schedule or
Part, check that consequences described are paired with a corresponding commitment or a stated
protection for the Client — notice before pausing, correction of faults at our own cost, refund
of amounts held beyond work performed, handover of anything paid for, removal of access on
request.

A document listing only the Client's obligations reads as adversarial and is commercially weaker,
not stronger. Reject any draft clause that creates a right for Qera Private Limited without
either a trigger the Client controls or a matching commitment.

## 10d. Drafting register

The Master Agreement, all four Schedules and all Parts are drafted in formal legal English.

- Use "shall" for obligations, not "will" or "must".
- Capitalise defined terms: Agreement, Schedule, Part, Services, Deliverables, Client Inputs,
  Additional Work, Revision, Retained Materials, Parties.
- Number clauses hierarchically and reference them explicitly on cross-reference.
- No second person, no contractions, no conversational asides.
- Balance is achieved through reciprocal obligations, not through informal tone. A clause may be
  fair and formal at the same time; see M1 of the content file.

## 11. Do and don't

**Do**
- Route services to schedules automatically. The user picks services only.
- Render a schedule only if it has at least one included service.
- Snapshot every generated contract as literal text.
- Pre-tick exclusions as excluded.
- Hard-block export on unfilled required blanks.
- Archive instead of deleting.
- Keep the master agreement and schedule bodies free of any client-specific string.

**Don't**
- Don't create a schedule per service. Four, forever.
- Don't repeat schedule terms inside a service. If it appears in both, delete it from the service.
- Don't let a service belong to two schedules. If it genuinely does — e.g. an AI system that is built once then operated monthly — that is **two separate services**, one under Build and one under Monthly.
- Don't reference live records from a generated contract.
- Don't leave gaps in schedule lettering.
- Don't render placeholder text that could be mistaken for real content.
- Don't add the client portal to this build.

---

## 12. Build order

Deliberately not master-agreement-first. Writing it blind means discovering later that it
doesn't carry what the schedules need.

1. **Data model and snapshot mechanism.** Nothing else works without these.
2. **Schedule 1 (Build) and Service 01 (Shopify) together.** Both written — see `contract-content.md`. Load them and confirm the schema holds with zero awkward or missing fields.
3. **Services 02 and 05** (custom web build, brand identity) under the same schedule. If both fit without adding a field, the shape is proven.
4. **Schedules 2, 3 and 4.**
5. **Remaining 19 services.** Mechanical once the shape is fixed.
6. **Master agreement**, last, once it is known exactly what the schedules handle.
7. **Single review by an Indian commercial lawyer** before the master agreement is used on a live client. A template used 200 times is the cheapest legal spend available.

---

## 13. Known open items

- **UAE licensing.** Work is performed from Dubai on a golden visa with no UAE entity or licence. Not a contract problem, but ask the CA before scaling invoicing. Contract terms are unaffected.
- **Jurisdiction vs market.** Ghaziabad courts against a Dubai-local client base is a real friction point at premium price levels. Current decision: keep it, since there is no UAE standing. Revisit if a UAE entity is ever established.
- **Master agreement gaps.** Six clauses are missing from the current text — listed in `contract-content.md` section 1.
