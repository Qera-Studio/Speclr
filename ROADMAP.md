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
| **LUT number and date printed on the invoice** | Not collected anywhere. Belongs on studio settings, and therefore inside `studioSnapshot`. |
| Recipient's foreign tax ID | Collected (`taxIds/foreign.ts`), prints in the billed-to block |
| Place of supply for an export of services (IGST s.13(2), location of recipient) | `placeOfSupplyOf` covers the domestic case; the export case needs confirming |
| INR conversion at the **CBIC notified rate** (Rule 34), not a market rate | Not built. Separate from `currency.ts`, which correctly keeps invoices in INR. |
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
- **Attachments over 4.5 MB will fail on Vercel.** They upload through a Server
  Action, and Vercel's serverless functions reject a request body over 4.5 MB
  before Next runs, so `serverActions.bodySizeLimit: '26mb'` only buys the
  25 MB limit in local dev. The fix is a client-direct upload: a route that
  hands out a one-shot token, the browser PUTs to Blob, and the action records
  the resulting URL. Same private store, same `requireAuthorizedUser`, same
  byte-sniffing on the way in. Until then a large scan silently fails in
  production.
- **Run `dev/master-launch-readiness-gate.md`** before any production deploy.
