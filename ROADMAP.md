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

- **Server-side PDF renderer** — print-CSS now. Sheets stay pure `data → markup`
  precisely so this lands later as a non-breaking, additive upgrade. Don't couple
  sheets to the DOM in the meantime (see §3, which touches the same surface).
- **One-click download for a finalized document** — blocked on the renderer
  above, and deferred with it. A browser cannot be made to save a PDF: the print
  dialog is the only route, and the user still has to choose "Save as PDF"
  there. So a download *icon* would be a second button doing precisely what
  Print already does at `DocumentRowActions.tsx` — worse than nothing, because
  it promises a file it cannot deliver. A real one needs
  `/api/docs/[id]/pdf`, rendering the sheet through headless Chromium. Two
  pieces of the groundwork already exist: the sheets are pure `data → markup`,
  and `PrintToolbar` (`handlePrint`) already derives the right filename per doc
  type, which that route would reuse verbatim. Raised August 2026; revisit when
  the renderer is picked up.
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

## Pending work (in flight)

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

- Rename the amber card title "Reviewed" → "Checked".
- Lint rule flagging `Upload`/`Download` lucide imports, to force `TrayArrowIcon`.
- Wire the search bar.
- Dedicated `BookmarksBarMockup` test — currently covered indirectly through the
  dispatcher in `PreviewMockup.test.tsx`. Add when the real SVG lands.
- `docs/MIGRATION_RUNBOOK.md` follow-through.

## Go-live blockers

- **Clerk is on `pk_test_` dev keys** — localhost only. Production login needs a
  Clerk *production instance* with `speclr.qera.studio` configured.
- **`SPECLR_ALLOWED_EMAILS` must be set in Vercel** and kept in sync with
  `.env.local`.
- **Run `dev/master-launch-readiness-gate.md`** before any production deploy.
