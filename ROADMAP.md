# ROADMAP — speclr

> The tracked backlog: features, future plans, deferred work, and pending items.
> Complements the other docs rather than repeating them —
> `CONTEXT.md` holds domain rules and **decisions already made**, `AGENTS.md`
> holds standards, `dev/` holds the checklists. **This file is the single home
> for work not yet done**, including the YAGNI list that used to sit in
> `CONTEXT.md`.
>
> Items are unordered within a section; nothing here is committed to a date.

---

## Now: the road to ready, spending nothing

Set 18 October 2026 by the founder. Launching costs about $50 a month that is
not there yet, so this is everything that can be done **before** that money
exists, in order, so that launch day is a configuration change and not a
project. It replaces adding screens: **no new page, view or restyle is built
until this list is done**, unless it unblocks a line of *What "ready" means*
below. A request that breaks that rule gets the conflict named first.

**How it runs.** The assistant works through it without stopping for approval,
under these rules:

- Commit after each green unit of work, on the current branch, never push.
  Green means `npm test`, `npx tsc --noEmit`, and `npm run test:e2e` where
  geometry moved; `npm run build` at the end of every phase.
- **Never without the founder:** legal wording on any document, money,
  numbering or immutability logic, finalizing a document, deleting real data,
  anything paid, pushing. Each of those goes on *Waiting on Shivanshu* below,
  and the work continues around it rather than stopping.
- Each phase ends with a dated line in *Progress*, so a fresh session resumes
  from the last line rather than from memory.

### Phase 0: a clean slate

1. Commit the uncommitted work in reviewable groups: the service page, the
   dialogs and shared fixes, leads, the onboarding tabs, the roadmap.
2. Apply `0019_lead_stages.sql` (data only: two rows renamed).
3. Bring `CONTEXT.md` and `docs/design.md` up to date with what changed in
   October: the description is the `blurb`, codes are typed when adding,
   overlays sit above dialogs, `Select` shows labels, leads exist, onboarding
   steps are tabs.

### Phase 1: the free half of going live

1. **Tests on every push**: a GitHub Actions workflow running `npm test` and
   `npx tsc --noEmit`. Free for a private repository at this size.
2. **Uploads over 4.5 MB**: move attachments to a client-direct Blob upload,
   as *Go-live blockers* describes. Code only.
3. **A backup that costs nothing**: a script exporting every table to dated
   JSON, plus a test that the export round-trips through the write schemas.
   This is what makes local use defensible before a paid Neon tier (see
   Phase 5).
4. **Dry-run the launch-readiness gate** (`dev/master-launch-readiness-gate.md`)
   and record every line that fails, as work or as a founder task.

### Phase 2: the format freeze audit

Per document type, the audit listed under *The format freeze*: invoice against
Rule 46 clause by clause, receipt against Rule 50, credit note against s.34
and Rule 53, the contract, the pay slip against the Code on Wages, the HR
letters. Each type gets a findings table here. A missing field or a structural
gap is fixed; a change to legal wording is written up as a proposal and goes
to *Waiting on Shivanshu*. The LUT number for export invoices lands here.

### Phase 3: every sheet at real A4

A browser fixture and a Playwright measurement for every document type not
already covered (receipt, credit note, offer, experience and exit letters,
stipend slip), at realistic and at maximum content, each confirmed to fail
before it is trusted. jsdom cannot see a page; this is the only way to know
nothing clips before the first finalize claims a number for ever.

### Phase 4: the debts this month left

The quick-edit dialog's last dead field, `quiet.ts` moving into `patterns/`
now that it is the app's style rather than the catalogue's, the shared
`EmptyState` and `RupeeInput` written into the design doc, and any rough edge
the first three phases turned up.

### Phase 5: ready to be used for real (the founder's call)

When 0 to 4 are done, the app can issue real documents from this laptop
against the free database, with the Phase 1 backup run after every finalize
and every issued PDF kept. **Only from a production build** (`npm run build &&
npm start`), never `npm run dev`: `DEV_UNLIMITED` is "not production", so under
the dev server every finalize claims a fake clock-based serial
(`db/counter.ts`) and a finalized document can be deleted (`deleteDraft`).
Found by the gate dry run on 18 October 2026. That starts *What "ready" means* without waiting for
money. Whether to do it is a decision for the founder, not the assistant.
Launch day then adds the paid tiers, the production Clerk instance and the
domain, and nothing else.

### The gate dry run, 18 October 2026

Three read-only reviews of `dev/master-launch-readiness-gate.md` against the
code, each finding checked before it was written here.

**Decisions for the founder** (numbering, immutability and money: proposals
only, nothing changed):

1. **Finalize is not atomic, and a double finalize can overwrite an issued
   document.** `saveDocument` reads the status, then upserts unconditionally
   (`db/store.ts`), and finalize is three or four separate HTTP statements
   (claim, studio read, save) because the Neon HTTP driver has no interactive
   transaction. Two finalizes racing, or a finalize racing an autosave, can
   burn a number, re-finalize under a second one, or flip an issued row back
   to draft. A failure after the claim burns the number and the message says
   it "was not used". **Proposed:** one SQL statement that claims the serial
   and writes the row `WHERE id = $1 AND status = 'draft'`, returning
   "already finalized" when it matches nothing, plus a database trigger that
   refuses any UPDATE or DELETE of a finalized row. This is the guarantee
   `CONTEXT.md` §4 already claims to make.
2. **A credit note is not checked against the invoice it reduces.** The number,
   date, rate and amount are trusted from the form, so a note can credit more
   than was billed, at a rate the invoice never charged. **Proposed:** at CRN
   finalize, when `againstInvoiceId` is set, require the same client, a
   finalized invoice, the same rate, and a credited total no greater than the
   invoice's.
3. **The money columns are 32-bit.** `total_paise` and `pay_amount_paise` cap
   at about ₹2.14 crore, while the schemas accept far more, and a larger
   document fails on insert after its number has been claimed. **Proposed:**
   move them to `bigint`, or cap the schemas at the column's range.
4. **Accepted risks to record or refuse:** no Postgres RLS (single tenant, no
   client-side database key, the gate on every action stands in for it); no
   rate limit on PDF rendering and the sitemap fetch (allowlisted users only);
   Clerk session tokens stay valid for their short life after sign-out.
5. **A privacy notice and a retention schedule** for the third-party personal
   data held (DPDP Act 2023), which can live outside the app.

**The assistant fixes** (security, error handling, accessibility, performance;
logged in *Progress* as each lands): the PDF route returning raw error text;
the print URL trusting the request's Host header; a pagination timeout that
stores a half-rendered PDF; concurrent attachment uploads losing a row; the
unbounded list queries; the resize handle's weak focus ring and two faded text
colours; an `npm run db:migrate` that backs up first; an axe scan in `e2e/`.

**Launch day:** a rehearsed rollback, a post-deploy smoke test, live header and
logged-out checks against the real domain, and a restore rehearsed into a fresh
Neon branch.

### The format freeze audit, 19 October 2026

Four read-only reviews, one per document family, each against its statute and
each finding checked in the code. Nothing here is legal advice. The items
marked *for a CA* or *for a lawyer* are questions to take to one.

**Fixed** (`5599b33`, `a060b65`), each refused before a number is claimed:

- An export's place of supply is checked at **every rate**. A zero-rated
  export stored under a domestic code used to issue as a domestic invoice,
  with no endorsement and a UPI QR.
- A zero-rated invoice must carry its Rule 46 endorsement (it is a content key
  and could be cleared).
- An invoice to a GST-registered client needs a SAC on every line (Rule 46(g),
  Notification 78/2020-CT). The sheet printed NIL.
- A contract needs the client's signatory, or it issues with the blank rule
  `CONTEXT.md` §5d removed.
- An exit letter needs the last working day, or it prints the joining date as
  the day they left.
- The contract prints its `QS-CON` number in the running header, and both
  parties' CIN, GSTIN and, failing those, PAN or company number. Measured in
  the browser.

**Proposals for the founder.** Each is legal wording, or a change to an
invoice whose layout is still being styled:

1. **The receipt reads as a second tax invoice.** It is only ever raised
   against an issued invoice, yet it prints "TOTAL DUE", the full tax
   computation, the reverse-charge line and the Rule 46(q) clause, from its own
   GST-style series. Proposed: the total reads "AMOUNT RECEIVED"; add "This
   acknowledges payment against the tax invoice named above. It is not a tax
   invoice; the tax shown was charged on that invoice."; drop the
   reverse-charge line on REC; and require the invoice link at finalize. Its
   Ownership term ("Payment having been received in full, all deliverables...
   transferred") also prints on a part payment. Proposed: "On receipt of
   payment in full for a Part, ownership of its deliverables passes to the
   client as provided in the parties' agreement."
2. **An IGST-paid export prints the LUT endorsement.** The default follows
   place of supply 96 alone, so an export charged IGST says "WITHOUT PAYMENT
   OF INTEGRATED TAX" beside an IGST line. Proposed: with IGST, print the
   third proviso's other sentence, "SUPPLY MEANT FOR EXPORT ON PAYMENT OF
   INTEGRATED TAX", and no LUT line.
3. **No taxable-value row when there is a discount** (Rule 46(k)). The figure
   GST is charged on has to be worked out by the reader. Proposed: one
   "Taxable value" row under the discount, re-measured in
   `e2e/invoice.spec.ts`.
4. **The retained copy reprints as ORIGINAL** (Rule 48(1)). Proposed: a
   print-time "Duplicate for supplier" option, not a stored change.
5. **Credit note checks.** Over-credit is item 2 of the gate dry run. Add:
   warn at finalize when the note falls after 30 November following the
   invoice's financial year (s.34(2)), and require `creditReason`.
6. **Contract wording.**
   - The preamble says "This Service Agreement"; the masthead says "Master
     Service Agreement". "Qera", "the Client" and "Third-Party Costs" are
     used but never defined. Proposed preamble: 'This Master Service Agreement
     ("Agreement") is entered into on [date] at Ghaziabad, Uttar Pradesh,
     between ... ("Qera") and ... ("the Client"), each a "Party".'
   - Clause 5.3 sends notices to addresses "stated in the applicable
     Schedule", and no Schedule states one. Proposed: the addresses set out
     against each Party at the head of the Agreement.
   - Clause 29's "first written above" points at a date the body never
     states.
   - MSA 8.2 says fees exclude GST, while the quotation says its prices
     include it.
   - The invoice, receipt and credit note name the Ghaziabad courts, while the
     MSA sends disputes to arbitration first. Proposed: "Subject to the
     dispute resolution clause of any agreement between the parties, and
     otherwise...".
   - Both signature blocks print the issue date, so the client appears to sign
     on the day the contract was issued.
7. **HR wording.**
   - The intern offer reads "During the first month ... a stipend of X per
     month". Proposed: "for the duration of the internship".
   - The intern offer hard-codes "three months".
   - Offers name the brand, not Qera Private Limited.
   - The employee offer's notice clause points at policies that may not
     exist.
   - The employee exit letter assumes a resignation, and "We confirm
     acceptance on the terms and conditions stipulated therein" may bind the
     company to the resignation letter's terms.
   - The experience letter seeds one real person's duties as everyone's
     default.
   - The pay slip claims it "forms part of the wage register", which speclr
     does not keep.
   - The exit masthead derives live from the snapshot while the body is prose
     seeded once, so a reclassified person gets a "RELIEVING LETTER" over
     internship text.
8. **Printed em dashes.** The signatory title puts one between "Co-founder"
   and "Qera Studio" on every letter and contract. Another appears in the
   offer subjects and in the "Execution" heading of each Schedule. Proposed: "Co-founder and Authorised
   Signatory, Qera Private Limited", "Offer of Internship as {role}" and
   "Execution of Schedule {letter}".
9. **A stipend slip may name an employee.** A test pins this as deliberate.
   `CONTEXT.md` §6a says the finalize guard is the enforcement. Keep it, or
   refuse it the way PAY refuses an intern?
10. **The pay slip** prints no rate of wages and no payment date separate from
    the issue date. It also accepts 20 rows a side at finalize, while the page
    holds about 9 against 7 and clips the rest silently. Not urgent while no
    pay slip is issued.

**For a CA:**

- Whether a computer-generated statement satisfies Rule 46(q), Rule 50(k) and
  Rule 53(1A)(h) without a DSC.
- Whether the masthead should read "TAX INVOICE".
- Whether restating tax on a payment receipt is wise.
- Whether no catalogue service is an intermediary under IGST s.13(8).
- Whether an INR-billed export still qualifies (s.2(6)).
- The e-invoicing thresholds.
- That a back-dated draft numbered out of date order is acceptable.
- The stipend slip's "no TDS" default.

**For a lawyer:**

- **Stamp duty under the UP schedule.** Nothing in the app mentions it, and an
  unstamped agreement is not admissible until duty and penalty are paid
  (Stamp Act s.35). Once the rate is known, a slot for the e-stamp
  certificate is a structural change.
- Clause 26.2 has "a competent court" appoint the arbitrator, where s.11 names
  the High Court, or the Supreme Court for a foreign client.
- Electronic execution: is a scanned signature enough, or are Aadhaar eSign or
  a DSC needed?
- UP wage-slip particulars: father's or spouse's name, Shops Act registration
  number, an overtime row.
- Offer letter probation and place of work.

### Waiting on Shivanshu

Free tasks only the founder can do, plus decisions the work needs:

- **Decide the five items under *The gate dry run* above.** Item 1 matters
  most: it is the difference between "issued documents are immutable" being
  true and being likely.
- **Answered 19 October 2026, and built the same day:**
  - Atomic finalize, plus the database rule: `f2e00bc`, migration 0022.
  - Money columns are bigint: migration 0021.
  - "Contract Agreement" everywhere: `6d0254b`, migration 0020.
  - The receipt says "amount received" and that it is not a tax invoice, takes
    the new ownership clause, and needs its invoice: `2f39076`.
  - An export that pays IGST carries the on-payment sentence and no LUT:
    `6543db0`.
  - A stipend slip cannot go to an employee: `8e39067`.
  - Offer letters name Qera Private Limited, the internship runs to the end
    date on record, and the stipend is per month throughout. The employee
    notice clause is gone, and the em dashes in the signatory title and the
    execution heading are now hyphens: `b3c0538`.
  - The pay slip prints the rate of wages: `85b7279`.
  - The privacy notice will live on the website.
- **Still open from those answers:**
  - Row-level security: the version that adds protection needs a second
    database role and a new `DATABASE_URL`.
  - Signing-out tokens: Clerk already revokes the session; the remaining
    window is up to a minute.
  - Rate limits: judged unnecessary for now.
  - The credit note checks, the taxable value row, the supplier's copy, the
    "hereinafter" definitions, the notice clause, contract acceptance in place
    of a client signature, the exit letter, the pay slip's row ceiling and a
    wage register. Each is waiting on a reply to the explanation given.
- **Two dead draft quotations** of type `QTN` (27 August, from before the
  type was renamed `SQ`) crash any query that reads every document; found by
  the store integration test. Delete them?

- **Rotate `BLOB_READ_WRITE_TOKEN`** (free, five minutes; see *Go-live
  blockers*).
- **Try one attachment upload** in onboarding, ideally a scan over 5 MB. The
  new direct upload is tested in Jest, but a real round trip writes to your
  live store and client record, which the assistant does not do unasked.
- **Create a Clerk production instance** (free plan) for `speclr.qera.studio`,
  whenever DNS access is to hand. It sits unused until launch day.
- **A compact board card was found uncommitted** in `ServiceCatalogue.tsx`,
  written outside these sessions. It brings back a second card shape for the
  board, which reverses "one card for both views" (`5b2dc25`). Parked, not
  lost: `git stash list` shows it as "foreign: compact board card". Keep it
  (`git stash pop`) or drop it (`git stash drop`).

### Progress

- 18 October 2026: plan set.
- 18 October 2026, Phase 0 done: the October work committed in four groups
  (`b8f4aaf` shared UI fixes, `96232cf` services, `1195ec2` leads, `a4d271f`
  onboarding tabs); `0019_lead_stages` applied (20 migrations recorded, both
  leads moved); `CONTEXT.md` §5h and §5m and `docs/design.md` brought up to
  date.
- 18 October 2026, Phase 1: CI workflow (`d0b5d95`, runs once pushed);
  attachments upload straight to Blob (`7a64f85`); free backup and restore,
  which found and fixed two copy-script bugs (`2d8d592`); the gate dry run
  (above). Phase 3: every document type measured at real A4 (`82f95d8`).
  Next.js 16.4.2 and a clean audit (`fcebb2b`).
- 18 October 2026, the gate fixes the assistant owns: the print URL only
  renders from hosts this app is served on (`9cf0c11`); a contract whose
  pagination timed out is never stored as the issued PDF (`28d2985`); a 2px
  focus line on the resize handle and no faded text, with a design rule
  against it (`6ba13a4`); `npm run db:migrate` backs up first (`becc50a`); an
  axe scan of six screens, all clean (`df7c090`). **Kept on purpose:** the
  PDF route's error text, which only an authorized caller entitled to that
  document can see. **Recorded, not built:** concurrent attachment uploads
  across two tabs can drop a row (every client save shares that
  read-then-write shape; one operator, uploads already queued one at a time);
  and the list queries are unbounded, which stays fast for years at about 30
  documents a month, so paging waits until a list passes roughly 2,000 rows,
  since a hard cap would hide old financial records instead.
- 19 October 2026: the branch merged into `latest` (PR #1; CI and the Vercel
  build green on GitHub). Phase 2 done as far as code can take it: four
  audits, five finalize refusals (`5599b33`), the contract's number and
  registration numbers (`a060b65`), and ten proposals plus the CA and lawyer
  questions under *The format freeze audit*. The LUT landed earlier the same
  day (`fd249f6`).

---

## The three that need thought before code

Most items below are ordinary work. These three interact with decisions already
made, and getting them wrong is expensive to undo.

**#2 Public access — isolate structurally, not conditionally.**
The two access locks are marked *"do not weaken"* in `CONTEXT.md`. The icon tool
is genuinely safe to expose (client-side, no financial data), but if public access
is built as a conditional inside the existing guard, one bad edit later exposes
documents. It must be a separate route group sharing **no layout, middleware path,
or auth surface** with `(admin)`. Structural isolation, not a flag.

**#1 Admin access — "admin" is meaningless until a non-admin tier exists.**
Every invited user currently has full access and there are no roles. A role named
admin, with nothing beneath it, is a label with no teeth. Scope the non-admin tier
first, or the work has no observable effect.

**#5 Client portal — larger than the other five, and a different security posture.**
A portal means external users, not an invite-only internal tool. It also sharpens
the snapshot pattern: if clients can edit their own details, an already-issued
invoice must still show them as they were at issue time. Probably wants its own
spec before implementation — and **#6 depends on it**.

---

## Planned features

### 1. Admin access to documents and clients
Give an admin a full view across documents and clients, distinct from ordinary
access.

- **Prerequisite:** needs the deferred *roles/permissions* work — see the note
  above on scoping a non-admin tier first.
- **Non-negotiable:** authorization is verified **server-side on every action and
  route**, never inferred from a layout or client state. A layout is not a security
  boundary (Security checklist).
- Adding roles must not require a rewrite — that was the explicit bet when roles
  were deferred. Validate that here.

### 2. Public access to tools
Expose the icon spec tool publicly, without weakening document security.

- **Hard constraint:** speclr's two access locks — Clerk invite-only sign-up and
  the fail-closed `SPECLR_ALLOWED_EMAILS` allowlist — are marked *"do not weaken"*
  in `CONTEXT.md`. This must **not** be built by relaxing either one. See the
  structural-isolation note above.
- The icon tool is entirely client-side and holds no financial/legal data, so it
  is genuinely safe to expose. The document tool is not, and never becomes public.
- Public routes still stay `noindex` unless deliberately decided otherwise.
- If the tool is public, its client-side inputs are now untrusted input from
  strangers — the `.ico`/SVG parsers must not assume well-formed files.

### 3. Full view editor
A full-screen editing surface for documents, beyond the current form + preview.

- Must not compromise the **pixel-faithful document sheets** — they reproduce
  finalized, approved legal artifacts and are not to be redesigned.
- **Finalized documents stay immutable.** A full-view editor applies to drafts
  only; it must surface no edit affordance on a finalized document.
- Keep sheets as pure `data → markup` so the future server-side PDF renderer
  stays a non-breaking, additive upgrade.

### 4. Double sidebar panel
A second sidebar panel alongside the existing resizable one.

- Builds on the shipped drag-resizable sidebar and fixed-height shell
  (commits `1b1a81c`, `20c0caf`).
- Keyboard reachable, focus order sane, collapse state obvious to assistive
  tech (WCAG 2.1 AA — Accessibility checklist).
- Watch the fixed-height shell contract: only the content area scrolls.

### 5. Client database and portal
Extend clients from an internal record into something clients themselves access.

- **Largest item here** — see the note above; likely wants its own spec first.
- **The snapshot pattern is load-bearing:** editing a client must never mutate an
  already-issued document. Finalized docs read their frozen JSONB snapshot, never
  live client data. A portal that lets clients edit their own details makes this
  sharper, not softer.
- Every table needs ownership/access enforcement; a client must never be able to
  read another client's documents (IDOR is the primary risk).
- Legal/privacy review before exposing any client data externally — data
  deletion, retention, and jurisdiction all apply (Legal checklist, highest
  precedence).

### 6. All tools and services client sync
Sync clients across tools and services so they aren't re-entered per surface.

- Depends on **#5** — define the client record and its ownership model first.
- Decide the source of truth explicitly. Bidirectional sync without one is how
  silent data corruption starts.
- If it touches money or issued documents, correctness rules apply in full:
  integer paise, atomic FY numbering, immutability.

### 7. Hiring flow — an onboarding checklist, then an employee portal

A guided hiring process: phases with a progress bar, starting at "open a role"
and ending at a confirmed employee with a code, a signed agreement and every
required document on file. Then, later, the portal both sides of it.

The reason this is worth building rather than remembering: Qera has hired twice
and neither time followed a written process. The checklist **is** the knowledge —
the app knowing what comes next is what stops a step being skipped.

**The phases, and what is asked at each.** Nothing is collected before it is
needed; asking for a PAN from someone who hasn't accepted an offer is both rude
and a data-protection liability.

| Phase | What happens | What speclr already does |
|---|---|---|
| 1 — Define the role | Title, engagement type (**employee or intern — the legal split**), pay band, start date | `/tools/ctc` prices the band |
| 2 — Select | Interviews, references. Nothing collected, nothing legal | — |
| 3 — Offer | Issue the **offer letter**; get a signed acceptance back | built (`OFR`) |
| 4 — Collect, *after* acceptance | PAN (mandatory, TDS), Aadhaar/address proof, cancelled cheque (account + IFSC), photo, degree certificates, emergency contact; from a prior employer: relieving letter, last payslips, **Form 12B** if joining mid-year; **UAN** if they are already a PF member | fields exist on the employee record; the *asking* does not |
| 5 — Day one | **Employee code assigned**; sign the appointment letter, **NDA + IP assignment** (a design studio's actual asset), policy acknowledgements (leave, conduct, **POSH**); issue laptop and accounts | code generator built; the agreements are not |
| 6 — Probation | Probation period, then a **confirmation letter** at the end of it | not built — a 9th document type |
| 7 — Ongoing | Monthly **pay slip**; TDS deposited and 24Q filed quarterly; **Form 16** by 15 June | pay slip built |
| 8 — Exit | Notice, full & final, **relieving or internship-completion letter** | built (`EXT`, and it already branches on engagement type) |

**Missing document types this implies:** appointment letter, NDA/IP assignment,
confirmation-of-probation letter. Each is a real legal artifact and gets the same
treatment as the existing eight — snapshotted content, immutable once finalized.

**Registers a company this size must keep anyway** (Payment of Wages s.13A, UP
Shops & Establishments): wage, attendance and leave. Timesheets are not a
productivity feature here — they are the attendance register, which is why they
belong in the same system as the slips rather than in a separate tool.

**Then the portal.** Employee side: their documents, slips, leave balance,
timesheet, reimbursement claims. Admin side: the same across everyone, plus
approvals. Deliberately *after* the checklist — the checklist is useful with two
people, a portal is not.

Three constraints, all of which have bitten this project's neighbours already:

- **Storing identity documents is a different legal posture.** PAN, Aadhaar and
  bank details are personal data belonging to someone who is not the account
  holder. Retention, deletion and access control are Legal-checklist concerns and
  outrank everything else here. Aadhaar in particular: store the number only if
  genuinely needed, never the image casually.
- **Employees logging in makes them external users** — the same jump `#5` makes
  for clients, and the same answer: structural isolation, ownership verified
  server-side on every action, IDOR as the primary risk. It also needs roles
  (`#1`) to exist first.
- **The snapshot pattern still governs.** An employee editing their own address
  must never alter a slip already issued to them.

### 8. The jurisdiction seam (`PRINCIPLES.md` rule 5)

~~**Derive place of supply (rule 3).**~~ **Done, 14 August 2026.** Derived from
the recipient by `placeOfSupplyOf`, read-only in the editor, override behind a
switch that requires a recorded reason and is refused at finalize without one.
Shipped with client onboarding; see `CONTEXT.md` §5d.

**The jurisdiction seam (rule 5) — still open, and now with more inside it.**
India is spelled inline across `money.ts`, `gstStates.ts`, `registry.ts`,
`types.ts`, `docNumber.ts` and `DocumentSheet.tsx`. Target:
`src/lib/domain/jurisdiction/` — one interface, one implementation in `in/`, and
core stops naming GST.

Two things changed the shape of this item:

- **A second jurisdiction now sits inline on the client record**, as a logged
  deviation (`PRINCIPLES.md` §7, 14 August 2026). Foreign tax identifiers are
  collected, validated with real check digits, snapshotted and printed — but
  nothing computes from them. `taxIds/india.ts` and `taxIds/foreign.ts` are
  already partitioned by country, which is the shape a pack wants, so this is
  groundwork rather than debt.
- **What is still missing is the computing half**: a foreign-denominated
  invoice with a parallel INR tax line, and any tax regime other than GST. That
  is the piece that touches the money core and the sheets, which is why it was
  deliberately left out.

The §4 bounds still hold and were not waived: **one interface, one
implementation.** No VAT computation, no e-invoicing. What §4's "no country
selector" meant in practice is now recorded honestly as a deviation rather than
pretended away.

### 9. The home becomes a dashboard

Agreed in discussion on 31 August 2026 and **parked deliberately**: the
document types are still being built, and a dashboard summarising flows that do
not exist yet would be a summary of nothing. It gets picked up once the
documents are done and the complete flows begin.

Today `/client` is `DocumentsBrowser` under a heading, and that is all it has
ever been. The heading already says "Documents", not "Dashboard", precisely
because it is not one yet (`nav.ts`).

**The shape agreed, in order down the page:**

| # | Block | Note |
|---|---|---|
| 1 | Page title | |
| 2 | **Document-type row** | The five types as click-targets, one row. `DocumentTypeList` already renders exactly this inside the ⌘D dialog |
| 3 | Clients heading + New client | |
| 4 | Client table, **top 5**, "view all" to `/client/clients` | |
| 5 | Documents heading + New document | |
| 6 | Document table, **top 5-8**, "view all" | |
| 7 | Services heading + New service | |

**Every table is a top slice, not the whole page.** The request was for the
full client table, the full document table and the entire service kanban, which
is three pages stacked: it never fits on a screen, it makes the three rail rows
that navigate to those pages duplicates of what is already on the home, and it
is three queries deep for content below the fold. A dashboard answers "what
needs my attention", and three complete tables answer no question. Truncating
each to its newest rows is what makes every row on the page worth reading.

**The kanban is cut** (decided in the same conversation). A four-column count
summary was offered as the middle option and was not wanted either. Services
keep their own page.

**The document-type row is the best part of this and should lead.** Creating a
document today is ⌘D or the New document button, then a dialog, then a pick —
a modal in front of a choice already made before it opened. A row of five
targets makes it one click, and it is the only block on the page that is an
*action* rather than a report, which is why it sits above the tables rather
than beside its own table. Build it as a grid that wraps: five items do not
overflow a 1600px row, and a scroller that never scrolls is a scrollbar added
for nothing.

**Two blocks to add that were not in the original request**, both agreed:

- **Drafts.** Unfinished work with no number yet, currently invisible until you
  scan the Number column for "Draft". The most actionable thing in the app.
- **Unpaid invoices, most overdue first.** `commercial.paymentTermsDays`
  already derives a due date (`CONTEXT.md` §5d) and nothing surfaces it. **This
  is blocked**: there is no payment status on a document today, and adding one
  is its own piece of work, not a homepage detail. It is the highest-value
  block on the page once it exists.

**One open question, deliberately left open.** "Last touched" per client was
raised as possibly more useful than a client table, and the user agreed it is
the more useful of the two *for clients*. Which of the two block 4 becomes is
decided when this is built, not now.

### 10. The contract is not flexible enough — two gaps found building a real one

Reported by the founder on 3 September 2026, while onboarding an actual client,
and deliberately not designed yet — noted here so the shape is not lost before
it gets picked up.

**A Service is too coarse a unit for what a contract needs to state.** "Custom
Website" is one catalogue line today, but a real engagement scopes it down into
a subset of independent capabilities: analytics, CRO, a CMS, interactivity,
static vs dynamic rendering, e-commerce, motion, graphics, security,
accessibility, initial setup, SEO/AEO/GEO, cookie consent, 3D/WebGL, booking
systems, payment gateway integration, and others. None of that is expressible
today — the contract freezes a Part per Service (`CONTEXT.md` §5c), not a
checklist of what that Service actually includes for *this* client. The shape
this wants is closer to §5h's Service editing (five fields, server reads the
row) than to a free-text scope clause: a per-engagement, per-Service list of
inclusions that the contract can freeze at draft creation exactly as it freezes
the clause library today. Needs its own design pass; do not bolt it onto
`fee`/`lines`.

**Payment phasing is three hard-coded bands, and a real client already broke
it.** `CONTEXT.md` §5l: 50/50 under ₹1 lakh, 35/35/30 to ₹3 lakh,
30/25/25/20 above it, derived from the one-time total with no input anywhere.
The case in hand is 20% every 10 days, five installments — a schedule the
current model has no way to express, because it is not derived from the total
at all; it is a negotiated cadence. This wants an arbitrary
`{ percent, dueInDays }[]` schedule, editable per contract, with the three
existing bands surviving as *defaults* offered at the size breakpoints rather
than the only three shapes a schedule can take. Whatever replaces the derived
bands must still sum to 100%, or the invoice math downstream disagrees with the
contract's own payment clause.

**A third item, not a gap but a plan:** once the invoice edge-case audit
(`COMPLIANCE.md`) is settled, run the same pass on contracts — 100 to 200 named
cases, the same severity marking. Both gaps above will very likely turn out to
be two rows in that list rather than one-off reports; this entry should be
folded into that audit's findings when it starts rather than tracked twice.

### 11. A first catalogue in minutes: bring your own AI

Proposed by the founder on 17 October 2026. A new user opens an empty service
catalogue, and building sixteen services and three hundred items by hand is
the reason they would leave. Instead, the empty state offers a ready-to-paste
prompt for any AI they already use. That AI, which knows their work and their
prices, writes a file in our format; they upload it, review it, and the
catalogue fills.

Why it is the right shape: no AI integration, no API key, no cost per user, no
client data sent anywhere by us, and the user's own AI already has the context
(their website, their old rate card, their chat history) that ours never would.

**Decided in the proposal review, before any design pass:**

- **CSV, one row per item**, not Markdown. Items are the bulk and the shape is
  flat: service columns (code, name, section, description, SAC) repeat on each
  item row, then the item's own (name, group, price, up to, unit, unit label,
  quotation description). A spreadsheet can open and fix it, and a parser
  needs no guessing. Markdown reads well and parses badly.
- **The prompt and the importer are generated from one definition**, the same
  field list the zod schemas use, and a test pins that every column the prompt
  asks for is one the importer reads. A prompt edited by hand drifts from the
  app the first time a field is added.
- **Nothing is written until a review screen is confirmed.** Every row runs the
  write-time schemas (`serviceContentSchema`, `serviceItemsSchema`, `sacSchema`,
  money to paise via `rupeesToPaise`), and the screen lists what will be added,
  with per-row errors named and the bad rows excluded rather than the whole
  file refused.
- **Services and items only. Never contract terms.** Terms are legal text, and
  AI-written legal text reaching a contract is the risk `CONTEXT.md` §5c was
  built to contain. An imported service starts with no terms, and the existing
  "Add terms" path is where they come from.
- **SAC is treated as unverified.** An AI will produce a plausible six-digit
  code with confidence. The format check passes it; whether it is the right
  classification is a CA's call (§5h). Imported SACs are flagged on the review
  screen, or left blank so the service default applies.
- **Codes are checked, never trusted.** A code already held by any row,
  archived included, is refused on that row (the rule `createService` applies);
  a blank one is assigned.
- **Import adds, never deletes or overwrites.** Running it twice is a set of
  "already exists" rows, not a wiped catalogue.

**Worth adding alongside it:**

- **A starter catalogue, with no AI at all.** "Start from Qera's catalogue" for
  a design studio or freelancer: the 16 services and 293 items, prices cleared.
  For the target user this may be the faster path, and it is mostly the seed
  that already exists.
- **Export to the same CSV.** Cheap once the format exists, and it turns the
  format into a round trip: edit prices in a spreadsheet, import the changes.
  Export first is also the easiest way to test the importer.
- **A downloadable example file** with three rows from the real seed, which the
  prompt also embeds, because an AI follows an example more reliably than a
  column description.

Depends on a first-run state that does not exist yet: today the studio's own
details fall back to Qera's constants and there is no sign-up flow. This is
worth building with that, since it is the first screen a user who is not the
founder would meet (`PRINCIPLES.md` §6).

### 12. One journey: lead to quotation to contract to invoice

Proposed by the founder on 18 October 2026: the documents should stop being
separate forms and become one journey that the app follows and remembers. A
lead is quoted; the client approves the quotation and it is settled; the
contract is drafted from it, sent as a link, approved in one click and logged;
the first invoice then loads itself from phase 1 of the agreed schedule. No
AI: every step is a fact the app already holds, derived rather than retyped.
That is `PRINCIPLES.md` rule 3 applied across documents instead of within one.

**The spine is a link, not a new store.** Each document records the one before
it (`quotationId` on a contract, `contractId` and `phase` on an invoice), the
way a receipt and a credit note already record `againstInvoiceId`. A lead's
stage then stops being typed and is read off the latest fact: a finalized
quotation means "Quotation sent", an accepted one "Quotation approved", a sent
contract "Contract sent", an accepted contract turns the lead into a client.
Only New, Reached out, Discovery session and Lost stay manual, because no
document says them.

**Phases, each shippable on its own:**

1. **A quotation can be addressed to a lead.** A quotation already carries no
   `clientId` (`registry.ts`), so this is a `leadId` and a snapshot of the
   lead's name and company, frozen at finalize like every other recipient.
2. **Acceptance links.** A finalized quotation gets an unguessable link the
   client opens without an account: read the document, approve in one click.
   The approval is an append-only record: when, from where, the name they
   typed, and a SHA-256 of the exact content they saw, so what was accepted
   can be proven later even though the document is already immutable.
3. **The contract drafts itself from the accepted quotation.** Its Parts are
   the quoted services, narrowed to the quoted items (`copyPart` already takes
   the agreed items), the fee blanks are the quoted prices, and the payment
   clause is the quotation's phases. Nothing is retyped, so nothing can
   disagree.
4. **The contract goes out on the same kind of link**, read in full, approved
   in one click, logged the same way. Approval converts the lead to a client.
5. **Invoices follow the schedule.** Picking the client suggests the next
   unbilled phase ("Phase 1, 35% of ₹2,40,000, per QS-CON-2627-004"), the
   invoice records which phase it bills, and a receipt against it closes it.
   The next invoice then offers phase 2.
6. **A timeline per client**, read from those same records: quoted, viewed,
   approved, contracted, invoiced, paid. Nothing written twice.

**Decided in the proposal review, before any design pass:**

- **Approval links are the first public surface this app has ever had**, and
  everything else sits behind Clerk and an allowlist (`CONTEXT.md`, access
  control). Each link is scoped to one document, read-only apart from the
  approve action, expiring, revocable, stored hashed, rate-limited and
  `noindex`. This goes through the security checklist before it ships, not
  after.
- **One-click approval is evidence of acceptance, not a digital signature.**
  An agreement accepted electronically is enforceable in India (IT Act 2000
  s.10A), and click-to-accept is the common way it is done. It is not an
  "electronic signature" under s.3A, which needs Aadhaar eSign or a DSC. The
  log above is what makes the acceptance provable. Whether contracts above
  some value should also offer a real eSign (a vendor, and a `vendors.md`
  row) is a question for the commercial lawyer the clauses already wait on.
- **The client's legal details are needed before the contract, not after.** A
  contract names the parties and the first invoice needs their GSTIN, so
  "becomes a client when signed" cannot mean "is onboarded when signed".
  Proposed: approving the quotation sends the client a link to fill in their
  own company details (they know their GSTIN better than we do, and the field
  rules check it), and the contract is drafted from that record.
- **Sending is a link to copy first.** speclr sends no email today. Emailing
  the link is a vendor, and waits until copying it has proved the flow.
- **The format freeze still gates issuing** (see *The format freeze* below):
  none of this changes what an issued document must contain.

---

## Deliberately deferred (YAGNI — noted, not built)

Moved here from `CONTEXT.md`. Deferred on purpose, with the reasoning intact —
if one of these gets picked up, the reasoning is what to re-examine first.

- **A live contact card on the Contacts step.** An empty card beside the fields
  that fills as the primary contact is typed, standing in for the line that used
  to echo "name · designation · email · phone" back underneath them. The echo was
  removed 21 August 2026 as clutter: it repeated four values already on screen a
  few rows up. A card is a different thing, showing what the *contract's
  signature block* will look like rather than restating the inputs, and it is a
  component rather than a paragraph, which is why it is here and not in that
  commit. `RoleSummary` in `ContactsStep.tsx` is where it would live; the one
  line still printed there (billing's "marked for the attention of") is the
  behaviour to keep, because it states a consequence rather than an echo.

- ~~**Server-side PDF renderer**~~ and ~~**one-click download**~~ — **both
  built, 29 August 2026.** They were one item, and the note here said a download
  icon would be "worse than nothing, because it promises a file it cannot
  deliver". That was right about the print dialog and wrong about the
  conclusion: a browser cannot be *made* to save a PDF, but a browser saves any
  file a server sends it, so the missing piece was always the renderer rather
  than the button. `@sparticuz/chromium` + `puppeteer-core` at finalize
  (`server/pdf/render.ts`), stored private in Blob (`server/pdf/store.ts`),
  served by `/api/docs/[id]/pdf`. The predicted reuse happened: the filename
  logic moved out of `PrintRoute` into `domain/docFilename.ts` and both callers
  share it, which is where a real bug turned up (a finalized contract was named
  for its client and date while carrying a perfectly good `QS-CON-2627-nnn`).

  Three decisions worth not re-litigating. **Rendered at finalize, not on
  download**: the content is already frozen by `studioSnapshot` /
  `materialiseContent`, but the rendering was not, so generating per click let a
  Tailwind or font change quietly produce a different-looking PDF of a record
  CGST s.36 keeps unaltered for 72 months. Storing the bytes also makes the
  download instant, which is the whole feature. **The render cannot fail a
  finalize** (`storePdfQuietly`): the serial is claimed atomically and a burned
  one is an accounting event somebody reconciles by hand, so a cold Chromium
  must never be able to stop an invoice being issued; the download route renders
  on demand if the bytes are missing. **A hosted renderer was refused on
  security grounds**, not cost: it would receive the entire document. See
  `docs/vendors.md` §2.5, which also records that the intended next step is
  self-hosted Gotenberg rather than anyone else's API.

  Still open on this surface: Chromium's ~66 MB sits against Vercel's 250 MB
  function limit and `@sparticuz/chromium` tracks Chrome majors, so a bump can
  break it. That is the trigger for the Gotenberg move, not a reason to
  pre-empt it.
- **Roles/permissions** — allowlist + full access now. **No longer really
  deferred:** §1 needs them, and the original bet was that adding roles "must not
  require a rewrite." §1 is where that bet gets tested.
- ~~**Payslip document type**~~ — **built.** Shipped as `PAY`, a separate doc type
  sharing `SlipSheet`/`SlipEditor` with the stipend slip. The original note held:
  they are separate deliberately, because a pay slip is a *statutory* wage record
  (Code on Wages 2019, Payment of Wages Act s.13A) and a stipend slip is a
  voluntary one, so a pay slip carries itemised deductions, day counts and
  statutory identifiers that a stipend slip must not. Still deferred within it:
  no payroll *engine* — deductions are a free list, because EPF (20+ employees),
  ESI (10+ and gross ≤ ₹21,000) and Professional Tax (none in UP) do not yet
  apply to Qera. Build one when any of those thresholds is crossed. What *is*
  built is the CTC calculator at `/tools/ctc` — the structure arithmetic (basic,
  HRA, the balancing allowance, capped PF) that a slip's earnings need, which is
  the useful half without being an engine. It deliberately does not compute TDS.
- **Reporting/analytics dashboards** — the schema already enables them; not built
  during the migration.
- **A per-country adaptive address form.** Asked for 19 August 2026: the address
  block would change its *fields* by country, adding a district, a county, a
  neighbourhood where that country has one. Not built, for three reasons in
  order of weight.

  **What actually varies is the words, not the slots.** The canonical dataset is
  Google's libaddressinput metadata (behind Chrome autofill, Stripe and
  Shopify): ~200 countries, each with a field order, a required-field set and a
  local label. Read it and every one of them reduces to line 1, line 2, a
  locality, an administrative area, a postal code and a country, which is
  exactly what `AddressParts` already holds. `line2` absorbs the locality,
  district and sublocality; `state` absorbs county, region, province, prefecture
  and emirate. The countries that genuinely need a seventh slot are a handful
  (Brazil's neighbourhood, China's dependent locality) and speclr bills none of
  them. So the payoff is the right *labels*, which `addressWords(country)` in
  `AddressFields.tsx` already delivers for the two cases that exist.

  **A variable field set is a variable shape in a column finalized documents
  depend on.** `composeAddress` flattens `AddressParts` into the flat `address`
  string, and that string is what sheets print and what the snapshot freezes
  byte-identically for 72 months. Extra parts would have to be
  additive-optional for ever, which is most of the complexity and none of the
  tidiness.

  **Per-country field sets and per-country required-ness are `PRINCIPLES.md`
  rule 5** — jurisdiction pack, which §4 forbids by name. This would be the
  second pack arriving through the address form instead of the tax layer.

  **The compliant version, when a country earns it:** widen `addressWords` from
  two branches to a small table keyed by ISO2, holding label, placeholder and
  input mode per field. Same six fields, better words, one object literal, no
  schema change and no migration. Add a row the day a client from that country
  exists, not before.

- **A client profile page.** Raised 19 August 2026. There is no read-only view
  of a client: everything on the record is visible only inside the onboarding
  route, so "what did we agree with them, and where does their DNS live" is a
  question answered by walking six form steps. The record now holds enough to
  be worth reading on one page (identity, tax, terms, services, documents,
  access), and the delivery & access rows in particular are reference material
  that nobody wants to reach through a form. Deferred by the user's own call
  while onboarding is still being finished; the shape when it lands is a read
  view per group with an edit link into the step that owns it, so there is still
  exactly one surface that writes each group.

## Pending work (in flight)

**Founder's list, 13 October 2026.** Recorded as given; each wants its scope
confirmed before work starts.

- [x] Implement the change for the documents page.
- [ ] Fix the tabs.
- [ ] Turn the process pages into tabs.
- [ ] Remove the Magic Mouse effect.
- [ ] Implement the changes already in the prompt.
- [ ] Improve the drag animation in the table columns.
- [ ] Archive the custom cursors (all of them).
- [ ] The contract process for the service quotation.
- [ ] Connect the quotation to onboarding.
- [ ] Add a leads form.
- [ ] Add a leads page.
- [ ] Connect leads to the service quotation.
- [ ] Take the service section icons from the contract and add them to the
      edit dropdown.
- [ ] Clicking a client's row should not open the onboarding process.

- **Make the invoice honour the billing block.** Onboarding now collects two
  things the sheets do not yet read, deliberately: a **separate billing address**
  (`clients.billing_address_parts`, page 1) and a **named billing contact**
  (`contacts.roles.billing`, page 3, where the default is the company itself and
  naming a person means "mark it for their attention"). Both are recorded,
  validated and shown in the form; neither prints. Three things have to happen
  together in that change, and the order matters:
  1. `ClientSnapshot` widens to carry them, and `clientSnapshotOf` freezes them
     at finalize. A finalized document reading either one live is a compliance
     bug, not a preference (`PRINCIPLES.md` rule 4, `CONTEXT.md` §5).
  2. `DocumentSheet`'s billed-to block prints the billing address when one is
     present, and an `Attn:` line when `resolveContact(contacts, 'billing')`
     returns a person. Both are additions to a finished legal artifact, so they
     want checking in a browser rather than only in jsdom.
  3. **Place of supply must not move.** It follows the recipient's registration,
     never where the invoice is posted, so `placeOfSupplyOf` keeps reading the
     GSTIN and the registered address. Guarded by a test in
     `placeOfSupply.test.ts`; do not "fix" it to use the billing address.
- **Browser-verify the icon spec previews** — `.ico` bookmarks-bar and `32px PNG`
  browser-tab templates, light + dark, empty then filled. jsdom cannot validate
  preview layout. *(Committed as of `c9b102d`; verification still outstanding.)*
- **Accurate bookmarks-bar illustration** — `BookmarksBarMockup` is deliberately a
  first-pass HTML/Tailwind placeholder. Replace with an accurate SVG, wired the
  same way `BrowserTabMockup` was.
- **Roll remaining mockups onto the persistent-centered pattern** —
  `iosHomeScreen`, `maskableSafeZone`, `googleSerp`, `socialCard`.
- **Push `feature/spec-and-shell` and open a PR** — branch is local only.

## Smaller / unapproved

- **No persistent notification history.** Raised 3 September 2026 alongside the
  client-delete-refusal toast fix (below, and see `sonner.tsx`): the app has
  toast notifications (transient, four seconds, three visible at once) but
  nothing that keeps a record of them once they clear. "Have the badge in the
  notifications" was the ask; there is currently no notifications surface to
  put it in — only the live toast stack. Deliberately not built yet: the
  founder confirmed this is additional, not the main ask, so it should get a
  design pass of its own (what counts as a notification, how long it is kept,
  whether it is per-record-type or global) rather than being bolted onto the
  toast fix.
- **A natural-person client's primary contact can be someone other than the
  legal person, and onboarding has no field for them.** Reported 3 September
  2026, real case: a sole proprietorship (dad's business, e.g. "Yash Metal and
  Alloys" as the trading name) where the daughter is the actual point of
  contact and the contract signatory, not the proprietor named on the identity
  step. `proprietorship`, `sole_trader` and `individual` all carry
  `naturalPerson: true` (`entityType.ts`), which skips the Contacts step
  entirely (`CONTEXT.md` §5d-i) on the assumption that the identity fields
  (`client.name`/`.email`/`.phone`) already name the one person who matters.
  `clientContact` (`client.ts:333`) derives primary/signing contact from those
  same identity fields with no override, so there is nowhere to record that a
  *different* person is who Qera actually talks to and who signs. The billing
  contact override already exists (`contacts.billing` can point elsewhere);
  primary and signing have no equivalent for a natural-person client. Fix is
  likely a small, optional "primary contact differs from the account holder"
  toggle inside step 1 for natural-person kinds specifically — not a return of
  the full Contacts step, which was correctly removed for the common case
  where the two are the same person.
- **Postcode autofill won't overwrite a city field that already holds text,
  even when that text is the pincode itself, mistyped into the wrong box.**
  Reported 3 September 2026 during client onboarding: pincode typed into the
  city field first, then the same pincode pasted into the postcode field
  afterward without clearing the city — state field updates correctly,
  city does not. `AddressFields.tsx` (`ours`/`filled` logic around line 226-290)
  treats any non-empty city as manually typed and therefore off-limits to
  overwrite, which is the right call for a real city name but not for the case
  where what's sitting in the city field is itself the postcode. Not fixed;
  noted so the "don't clobber what the operator typed" rule gets revisited
  against this case specifically.
- List/Cards drag pill (`DocumentsBrowser`'s view toggle, top of the dashboard
  table) reported as still overflowing/misbehaving after the 26 August 2026
  drag fix (`docs/design.md` §2.7, commit `3255aa2`) that fixed the identical
  bug in `ProfileSwitcher` and the Base UI tab strips. Investigated at length:
  `useTabDrag` is the shared hook both controls use, the border/pill classes
  are the same shared exports, and a real signed-in Chromium session (mouse,
  synthetic single-jump drag past the edge, squeezed with filter chips, at
  1024px/1440px, light/dark) could not reproduce any overflow or missing
  border on the pushed code — the pill clamped to the pixel every time. User
  confirmed a hard refresh first. Left open because the discrepancy is
  unexplained, not because it's dismissed: candidates not yet ruled out are the
  user's actual browser/input device (Safari, trackpad — untested; only
  Chromium synthetic mouse events were tried) and a build/deploy target other
  than local `localhost:3000`. Revisit by asking which browser and pointer
  device reproduces it, ideally with screen recording rather than a static
  screenshot (the bug, if real, is transient — "mid-drag, briefly").
- Rename the amber card title "Reviewed" → "Checked".
- Lint rule flagging `Upload`/`Download` lucide imports, to force `TrayArrowIcon`.
- Wire the search bar.
- Dedicated `BookmarksBarMockup` test — currently covered indirectly through the
  dispatcher in `PreviewMockup.test.tsx`. Add when the real SVG lands.
- `docs/MIGRATION_RUNBOOK.md` follow-through.

## What "ready" means

**Set 17 August 2026 by the founder. This is the definition, and it does not
move.** speclr is not offered to anyone outside Qera until every line below has
happened *officially*, with real people and real money, not a rehearsal:

- A client onboarded end to end through all seven steps.
- A contract issued to that client, signed, received back, and the signed copy
  stored here as an attachment.
- Three invoices issued to that client.
- A receipt issued against each of those three.
- An employee actually hired through the admin side, with no legal error in the
  offer or the engagement wording.
- A salary slip issued to that employee.
- **Every document type in the registry used at least once, officially.**

Until then it is an internal tool being tested by the person who wrote it. The
reasoning is in the next section, and it is the stronger half of the argument.

## The format freeze (the real gate, ahead of everything below)

**Nothing may be finalized until each document type has been audited against its
governing rule and the format declared closed.** This came from a concrete near
miss on 16 August 2026: the `Attn:` line and the separate billing address were
about to be added to `DocumentSheet` *after* invoices could already have been
issued. Two consequences, both bad, and neither reversible:

1. **A finalized document is immutable.** An invoice issued under an incomplete
   format stays incomplete for the 72 months CGST s.36 requires it be retained.
   There is no edit. A correction is a *new* document, which means the flawed one
   is still in the sequence.
2. **Layout stability is itself a trust signal.** Sending one client an invoice
   in March and a visibly different one in April makes the issuer look
   improvised. The document is the only artifact most clients ever see, and its
   consistency is doing quiet work that a feature list cannot replace.

So the format is a **release**, not a rolling edit. Audit, fix everything found,
freeze, then issue.

### Found already, by inspection on 17 August 2026; closed 23 August 2026

Both were hard requirements of CGST Rule 46 and both were absent. A third,
46(q), turned out to be missing too and was found while closing them.

- **HSN/SAC.** Rule 46(g). ~~`grep -i 'hsn\|sac'` returns nothing.~~ `LineItem`
  carries `sacCode`, `DocumentSheet` prints a SAC column, and a line seeded from
  a Service arrives with the catalogue's code (`PRINCIPLES.md` rule 3). It is on
  the line rather than only on the Service because a custom line has no Service
  to derive from, and it is frozen with the document like every other line field
  (rule 4). Notification 78/2020-CT wants at least 4 digits under ₹5 crore
  turnover; all 22 catalogue codes are the full 6.
- **The reverse-charge declaration.** Rule 46(p). `reverseChargeLine` in
  `docContent.ts`, defaulted from the document's own place of supply and printed
  under the totals. **`ClientTax.reverseCharge` is still not read by any sheet**,
  and that is deliberate: the field records the *recipient's* regime, which is a
  different question from India's, and the printed line is editable where it
  needs to say so. Wiring the flag to the default is a small change and is left
  until a client actually has it set.
- **The signature statement.** Rule 46(q) wants the supplier's signature or DSC;
  the proviso excuses an electronically issued invoice, and settled practice is
  to say so on the face of it. Neither was present. It is now the last TERMS
  clause on both tax documents (`CONTEXT.md` §5i), not a line of its own.

### Found and closed on 24 August 2026

Three more, from the same audit read further:

- **The export endorsement was a paraphrase.** Rule 46's third proviso
  prescribes the sentence in capitals and `zeroRatingLabel` was printing "Export
  of services under LUT, zero rated, IGST not charged (IGST Act s.16)."
  Correct in substance, not in form, and the form is what a refund claim under
  IGST s.16(3) is checked against. `EXPORT_ENDORSEMENT` and `SEZ_ENDORSEMENT` in
  `placeOfSupply.ts` hold the two prescribed sentences; `exportEndorsement` is a
  content key so it is editable and frozen at finalize, and it prints on its own
  line. `zeroRatingLabel` is unchanged and still explains the position in the
  totals column: the two are different jobs.
- **No copy marking.** Rule 48(1): an invoice for services is made in duplicate,
  the original for the recipient and the duplicate for the supplier, each marked
  as such. `copyMarking`, defaulting to 'ORIGINAL FOR RECIPIENT' on the invoice
  and to nothing on the receipt, because Rule 50's receipt voucher prescribes no
  marking.
- **No credit note.** The largest of the three, and structural rather than a
  line of text. A finalized document is immutable, correctly, so there was no
  lawful way to reduce or reverse an issued invoice at all: duplicating it as a
  new draft creates a *second* invoice and leaves the first standing in the
  return. CGST **s.34** is the mechanism, and `CRN` is now a document type with
  its own consecutive series (`QS-CRN-2627-nnn`). See `CONTEXT.md` §5j.

Still open, and deliberately: **a debit note** (s.34(3), for an *increase*) is
not built. Qera has never had to raise one, the shape is the credit note's
mirror, and a document type nobody issues is one nobody checks.

Still open on the SAC: **the 22 seeded codes want a CA's sign-off.**
`seed/services.ts` records the reasoning and names 15 to 17 as the arguable
ones. Every one is in the 9983 group and therefore 18%, so the choice between
them moves no money, only the heading the supply is filed under. Not a blocker
for the freeze; a correction is an edit to the catalogue and reaches the next
invoice.

### The audit still to run, per document type

**Run on 19 October 2026**: the findings, the fixes and the open questions are
under *The format freeze audit* at the top of this file. The list below is kept
as what was checked.

Nobody should assume the list above is complete. It is what one grep found.

- **Invoice** against **Rule 46** in full, clause by clause: supplier name,
  address and GSTIN; consecutive unique serial; date; recipient name, address and
  GSTIN; the unregistered-recipient rule above ₹50,000; HSN/SAC; description;
  quantity and unit; total and taxable value; rate and amount per tax head; place
  of supply with state name; delivery address where it differs; the reverse
  charge declaration; and **signature or DSC of the supplier or an authorised
  representative** (46(q)). Confirm which of these the sheet prints today rather
  than trusting that it does.
- **Receipt** against **Rule 50** (receipt voucher), which has its own field list
  and is not an invoice with a different masthead.
- ~~**Export invoice** against Rule 46's export endorsement: the LUT wording must
  be the prescribed sentence, not a paraphrase.~~ Closed 24 August 2026. The rest
  of **IGST Act s.16** still wants reading: the LUT number and date are still not
  collected anywhere.
- **Contract** for the things an Indian commercial agreement needs that are not
  in the MSA: stamp duty (state-specific, and UP's schedule applies), the
  jurisdiction clause, and execution formalities.
- **Pay slip** against the **Code on Wages 2019**, **Payment of Wages Act s.13A**
  and the **UP Shops & Establishments** wage-register rules.
- **Offer, experience and exit letters** for the intern-versus-employee wording
  split, which `CONTEXT.md` §6 already treats as legally load-bearing.

### The export invoice, which is what "global" actually means here

Read `CONTEXT.md` §3a first: **a document follows the supplier's law, not the
recipient's.** Qera is Indian, so an invoice to a client anywhere on earth is an
Indian export invoice. This is not N jurisdictions. It is six additions:

| Needed | Status today |
|---|---|
| The prescribed export endorsement, **verbatim** | Done, 24 August 2026. `EXPORT_ENDORSEMENT` in `placeOfSupply.ts`, printed through the `exportEndorsement` content key. |
| **LUT number and date printed on the invoice** | Done 19 October 2026: on studio settings, inside `studioSnapshot`, printed on every zero-rated invoice, and finalize refuses one dated after it lapses. |
| Recipient's foreign tax ID | Collected (`taxIds/foreign.ts`), prints in the billed-to block |
| Place of supply for an export of services (IGST s.13(2), location of recipient) | `placeOfSupplyOf` covers the domestic case; the export case needs confirming |
| INR conversion at a GAAP rate on the date of supply (Rule 34(2), for services; the CBIC notified rate is Rule 34(1), for goods), not a market rate | Done 19 October 2026: an export is billed in the client's currency, the bank's TT buying rate is typed per invoice, and the INR equivalent prints at it. No API: none publishes a compliant rate for AUD. |
| FIRC / BRC as proof of realisation | Already an attachment kind |

The **contract** has a global dimension that is commercial rather than
formatting: governing law, jurisdiction and arbitration seat, which a foreign
client will negotiate. Plus stamp duty, which is state law (UP's schedule) and
applies whoever the counterparty is. The **HR documents have none at all.**

**This wants an Indian CA and a commercial lawyer, not a grep and not an LLM.**
The grep found two gaps; it cannot tell you what it did not think to look for.
`PRINCIPLES.md` §5 is explicit that legal compliance is not something this
project promises, and that applies with most force to its own documents.

### After the freeze

Formats will still change one day, because the law changes. When that happens the
answer is **not** to edit the sheets in place: it is to record which format
version a document was issued under, the same way `studioSnapshot` and
`materialiseContent` already freeze the studio identity and the wording. Then
"why does this invoice look different from that one" has an answer with a date on
it. Do not build that now. Build it the first time a format has to change after
real documents exist.

## Go-live blockers

- **Clerk is on `pk_test_` dev keys** — localhost only. Production login needs a
  Clerk *production instance* with `speclr.qera.studio` configured.
- **`SPECLR_ALLOWED_EMAILS` must be set in Vercel** and kept in sync with
  `.env.local`.
- **Vercel Pro.** Hobby excludes commercial use, and issuing real invoices is
  commercial use.
- **A paid Neon tier.** The free tier keeps 24 hours of point-in-time recovery on
  records the law requires be retained for 72 months.
- **One browser pass over every sheet at real A4**, before the first finalize.
  jsdom cannot see print, pagination or clipping, and the pay slip already
  shipped a clipping bug through a green suite. This one is not recoverable
  afterwards: the first finalize claims a number atomically and freezes.
- **`npm test` running in CI.** Free, an afternoon, and the standard already says
  a task is not done until it passes.
- **Rotate `BLOB_READ_WRITE_TOKEN`.** The token issued when the
  `speclr-attachments` store was created on 17 August 2026 was pasted into an
  assistant chat transcript, so it must be treated as disclosed. It is
  read-write on the store holding clients' PAN cards, GST certificates and
  incorporation documents. Regenerate it on the store's page, re-run
  `vercel env pull .env.local`, and restart dev. Nothing is exposed until the
  store holds real client files, which is why this is a blocker rather than an
  incident.
- ~~**Attachments over 4.5 MB will fail on Vercel.**~~ Closed 18 October 2026.
  The browser now uploads straight to the private Blob store on a token from
  `/api/clients/[id]/files/upload` (signed-in caller, a client that exists, a
  path that is that client's prefix and a uuid, the size cap and three types,
  no overwrite), and `recordClientAttachment` reads the bytes back, sniffs
  them, and deletes anything that is not what it claims before writing the
  row.
- **Run `dev/master-launch-readiness-gate.md`** before any production deploy.
