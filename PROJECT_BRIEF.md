# speclr — Full Project Brief

> **Purpose of this file:** a single, exhaustive, self-contained brief. A Claude session with *only* this file open should be able to work on speclr competently without the user re-explaining anything. It captures identity, history (why every major decision was made), exact current state (what's built vs. stubbed, as of the commit noted below), and everything already known about the future. It is deliberately long — nothing has been trimmed for brevity.
>
> This file is a **supplement**, not a replacement, for the project's existing governance docs: `CLAUDE.md` (identity + collaboration rules), `AGENTS.md` (coding standards), `CONTEXT.md` (the original warm-start brief), and `dev/*.md` (the 8 master checklists — the actual production law). Where this file and those disagree, **those win** — they are the checked-in, deliberately-maintained source of truth; this file is a wider-angle snapshot written by re-reading the whole repository on 2026-08-12. If you're reading this much later, check `git log` for drift before trusting anything time-sensitive here.
>
> **Snapshot basis:** commit `5102e8c` ("feat(admin): Phase 4a — app shell, dashboard, CRUD + collapsible sidebar redesign"), branch `main`, 52 commits total, all authored by Shivanshu Pareek (`ops@qera.studio`) with Claude as co-author on most.

---

## 1. What speclr is, in one paragraph

speclr is **Qera Studio's internal operations tool**. Qera Studio is a small studio (effectively a solo founder, Shivanshu, operating without a team) that does client work and needs to issue **real financial and legal documents** — invoices, receipts, contracts, stipend slips, and HR letters (offer/experience/exit) — plus validate favicon/OG **icon specs** for client sites. speclr is not a product Qera sells; it's the internal back-office tool that keeps Qera's own paperwork correct, numbered, and legally sound. It was **extracted from the qera.studio marketing site** (where these tools lived as `/kessler-admin` and `/kessler-spec`) into this standalone Next.js + Postgres app, because a marketing site is the wrong place to host stateful, credentialed, legally-sensitive internal tooling.

Two independent sub-tools live in one app:

1. **The document tool** (`/`, `/clients`, `/employees`, `/services`, `/docs/...`) — CRUD for clients/employees/service-templates, and creation/finalization/printing of the seven document types. Backed by Postgres. This is the high-stakes half of the app.
2. **The icon tool** (`/spec`) — validates favicon/Open-Graph icon specs with live previews (browser tab, iOS home screen icon, Google search result, social share card, maskable-icon safe zone). Entirely client-side, no persistence, low stakes.

**Audience:** exactly one user today (the founder), a handful of trusted people at most, ever. **Tone:** data-dense internal tool — shadcn, dark mode, Geist font, Lucide icons — deliberately *not* the marketing site's calm-pastel, low-density aesthetic. Different product, different values, said explicitly in the project's own docs.

---

## 2. Why this exists — the origin story

Before speclr, these tools were routes bolted onto Qera's public marketing site (`kessler-admin` for documents, `kessler-spec` for icons — "kessler" appears to be an internal/legacy codename, not a public-facing term). That arrangement had an obvious problem: a tool that issues real invoices and holds client PII/bank details was living in the same codebase and deploy pipeline as a public marketing website. Separating concerns — its own repo, its own auth, its own database, its own deploy — is why speclr exists as a standalone project.

The **migration was planned as a 5-phase extraction**, documented in `docs/MIGRATION_RUNBOOK.md`, with the explicit strategy of **lifting the portable domain logic verbatim** (money math, date formatting, the document-type registry, GST numbering, HR content, contract boilerplate — all pure TypeScript with zero UI/framework coupling) rather than rewriting it, specifically so the already-correct, already-tested financial/legal logic wouldn't be re-derived and re-risked. Everything UI-shaped (the admin dashboard, forms, document sheets) was deliberately **rebuilt fresh in shadcn**, not ported, because the UI layer was changing frameworks (SCSS → Tailwind v4) and design systems anyway.

**The marketing site is untouched and remains the working fallback** until speclr is fully live, verified, and the old routes are removed from it as a final cleanup step (not started).

---

## 3. History — what actually happened, phase by phase

This section reconstructs real history from `git log` (52 commits) and `docs/MIGRATION_RUNBOOK.md`. Note: **the runbook's checkboxes are stale** relative to git history — Phase 4 and 5 are marked incomplete in the runbook text, but git history shows most of "Phase 4" (renamed in commits to sub-phases 4a/4d) actually happened. Trust the commit log over the runbook's checkbox state; the runbook was a living plan, not updated after each phase landed.

### Phase 1 — Scaffold + handoff docs (✅ done)
- Repo created in the `Qera-Studio` GitHub org.
- `create-next-app` scaffold: Next.js 16, TypeScript, Tailwind v4, App Router, `src/` layout, `@/*` import alias.
- `shadcn init --preset b1ZzrZeYC -f` — a specific shadcn preset (`base-mira` style, neutral base color) was chosen and pinned; a Geist-font configuration gotcha was hit and fixed during this step (literal font names needed in the `@theme inline` block).
- Deployed to Vercel under the **company** Vercel account (repo made public initially, specifically to avoid the private-org Pro-plan requirement on Vercel's Hobby tier).
- The **8 master checklists** copied into `dev/` verbatim (commit `a60948b`) — these travel to every Qera project and are the actual production standard (OWASP ASVS/Top-10-based, multi-domain synthesis covering legal, security, accessibility, backend, performance, SEO, design/brand, plus a launch-readiness gate).
- `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, and the migration runbook itself were written in this phase.
- Jest + React Testing Library set up, including jsdom stubs (ResizeObserver/IntersectionObserver/matchMedia) matching what the *source* project needed, specifically so the lifted domain tests would run unchanged.
- **Not yet done:** the `speclr.qera.studio` custom domain (explicitly deferred to go-live).

### Phase 2 — Lift the portable core, no UI (✅ done, commit `294b610`)
- Installed `zod@^4` — the *only* external dependency the domain core needs (v4's stricter `.email()` validation is relied upon).
- Copied all 12 domain files + 9 test files from the source project's `kessler-admin/_lib/` into `src/lib/domain/` **verbatim, with zero import changes** — the original code was already isolated enough (only imported `zod` and its own relative files) that the move was a pure file copy.
- Checkpoint: **9 test suites, 114 tests, all passing, completely untouched** — i.e., the correctness-critical "brain" of the app was proven working before any database or UI existed on top of it.
- Note preserved from this phase: the source project's `lib/admin/` also had `store`, `counter`, `docNumber`, `employeeStore`, `serviceStore` (persistence — interfaces reused, bodies rewritten in Phase 3 for Postgres) and `session.ts` (fully replaced by Clerk, not lifted at all).

### Phase 3 — Postgres + auth, "the plumbing" (✅ done, commits `428ee1d`, `17192e5`, `620967e`, `2c68c7d`)
- **Neon Postgres** provisioned via Vercel; `DATABASE_URL` pulled into env.
- **Clerk** provisioned via Vercel (a duplicate Clerk app had to be reconciled during setup; branding configured).
- Drizzle + drizzle-kit + the Neon serverless HTTP driver wired up (`drizzle.config.ts`, `src/db/index.ts`).
- `src/db/schema.ts` written: 5 tables (`clients`, `employees`, `service_templates`, `documents`, `counters`), relational columns for queryable fields, JSONB for the doc-type-specific `data`/`snapshot` columns, a **unique index on `documents.number`** as a hard database-level guarantee against duplicate invoice numbers. Migrated to the live Neon instance and verified.
- Store + mappers + the atomic counter (`src/db/counter.ts`, a Postgres `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` upsert) built with the **same external contract** as the original Redis-backed version, so Server Actions barely changed — only imports and the auth call.
- Clerk wired deliberately **without middleware path-matching for auth enforcement** — a conscious choice, explained in `src/proxy.ts`'s own comments, following Clerk's current guidance and the project's Security checklist: middleware path-matching "can diverge from how Next.js routes requests and leave protected resources reachable." Instead every protected page/Server Action calls `requireAuthorizedUser()` directly.
- Integration tests against the **live** Neon database (`npm run test:int`, self-cleaning): 6/6 passing — client/document round-trip, atomic numbering under concurrency (10 simultaneous finalize calls → 10 guaranteed-unique serials), and finalize → snapshot-freeze → immutability all verified for real, not mocked.
- `SPECLR_ALLOWED_EMAILS` added to Vercel (project-scoped, all environments).
- Checkpoint verified **in a real browser**: unauthenticated request to `/` → 307 redirect → branded Clerk sign-in page.

### Phase 4a — Admin UI shell, dashboard, CRUD (✅ done — this is the current HEAD, commit `5102e8c`)
Note: the runbook calls this block "Phase 4"; commit messages call it "Phase 4a," implying the team subdivided the original Phase 4 plan into 4a (admin CRUD shell) and 4d (icon tool — see below) sub-phases as work progressed, deviating from the original linear 1-2-3-4-5 plan. Built in this phase (see `docs/superpowers/plans/2026-07-23-admin-shell-dashboard-crud.md` and its paired design doc for the detailed spec):
- `(admin)` route group with a shared layout (`src/app/(admin)/layout.tsx`) and a single `<main>` per page.
- `AdminSidebar` — a collapsible sidebar (collapse toggle button, iterated on for icon sizing/positioning across several small commits) with: a standalone Dashboard link, two collapsible **document sections** ("Client": Contract/Invoice/Receipt; "Admin": Offer letter/Stipend/Experience letter/Exit letter), plain **record links** (Clients/Employees/Services), and a **tools** link (Icon spec). All nav structure is centralized in one file, `src/components/admin/nav.ts` (`NAV_GROUPS`/`DASHBOARD_LINK`/`DOCUMENT_SECTIONS`/`RECORD_LINKS`/`TOOL_LINKS`), single source of truth for the whole nav.
- Documents dashboard (retired an earlier placeholder root page).
- **Full CRUD** for Clients, Employees, and Service Templates — each as a `*Manager` (page-level orchestration) + `*Table` (shadcn `Table`) + `*Form` (react-hook-form + Zod, in a shadcn `Sheet` slide-over) triad:
  - `src/components/admin/clients/{ClientManager,ClientsTable,ClientForm}.tsx`
  - `src/components/admin/employees/{EmployeeManager,EmployeesTable,EmployeeForm}.tsx` — handles rupees↔paise conversion in the form layer, enum fields (engagement type, pronoun), delete.
  - `src/components/admin/services/{ServiceManager,ServicesTable,ServiceForm}.tsx` — dynamic field arrays (scope items, exclusions, milestones), delete.
- Server Actions for all of the above (`src/server/actions/{clients,employees,services,documents}.ts`), each gated by `authorized()` from `src/server/actions/authGate.ts`.
- Placeholder routes for `/docs/new/[type]` and `/docs/[id]` exist and are **auth-gated correctly**, but the actual document creation form and document viewer are explicitly stubbed — `src/app/(admin)/docs/[id]/page.tsx` literally renders "Viewing document `{id}` arrives in the next phase." **This is the biggest unfinished piece of the app** — see §7 below.
- Along the way: migrated `middleware.ts` → `src/proxy.ts` mid-phase (commit `209445b`) to track a Next.js 16.2 file-naming deprecation — a good example of the project actively keeping up with a very new, still-shifting framework.
- A `use-mobile` hook (sidebar responsive behavior dependency) was committed slightly late (`defcafd`) after being missed in an earlier primitives commit — worth knowing if you're ever tracing sidebar responsiveness bugs back through history.

### Phase 4d — Icon tool rebuilt in shadcn (✅ done, commits `a3f3f41` through `08df3a7`, chronologically *before* the 4a commits above — see `docs/superpowers/plans/2026-07-23-spec-icon-tool.md` / its design doc)
- Lifted the icon tool's client-only logic (image analysis, validation rules, state hooks) verbatim from the source project's `kessler-spec/`.
- Rebuilt the full UI in shadcn: `IconSpecTool` (orchestrator), `IconSpecCard`, `ClientNameField`, `UploadDropzone`, `ValidationResultBadge` (tri-state: pass/warn/fail), `SpecProgress` (progress bar), `ExportImportControls`, and the **6 preview mockups** (browser tab, iOS home screen, maskable-icon safe zone, Google SERP, social share card — the CONTEXT.md summary says "6 preview mockups," matching one commit "preview mockups (browser tab, iOS, maskable, SERP, social)" which lists 5 named + implies a 6th).
- A specific correction is preserved in commit history (`ee0f77d`): Base UI's `Button` has no `asChild` prop (unlike Radix) — a documented gotcha for anyone extending these components later, also called out generally in commit `3bd549d` ("primitives are Base UI, not Radix, for implementers").
- Route: `/spec`, authenticated, with its own page test (`src/app/(admin)/spec/__tests__/page.test.tsx`).
- A **temporary home link to `/spec`** was added at one point (`6db09e3`) — worth checking if it's still needed/appropriate once the dashboard is more built out.

### What's left — the remainder of "Phase 4" and all of "Phase 5" per the original runbook (❌ not started)
See §7 ("What's not built yet") for the full detail. In short: the actual document creation/edit forms, the **pixel-faithful document sheets** (the printable invoice/receipt/contract/stipend-slip/letter layouts), the **Paginator** (A4 page-carousel + print pagination engine), and `src/styles/print.css` do not exist yet. This is the single largest remaining chunk of work in the project.

---

## 4. Current architecture — how a request flows

```
Browser
  └─ Next.js 16 (App Router, Turbopack, React 19 + React Compiler)
       ├─ src/app/(admin)/...        route group, one shared layout, one <main> per page
       ├─ src/proxy.ts               Clerk plumbing only (NOT an auth boundary)
       └─ Server Component pages
            └─ requireAuthorizedUser()   ← real auth boundary, called per-page/per-action
                 └─ Server Action (src/server/actions/*.ts)
                      ├─ authorized() gate (src/server/actions/authGate.ts)
                      ├─ Zod validation (schemas in src/lib/domain/registry.ts et al.)
                      └─ src/db/store.ts + src/db/counter.ts
                           └─ Drizzle ORM (src/db/schema.ts)
                                └─ Neon Postgres (HTTP driver, @neondatabase/serverless)
```

Client-side interactivity (forms, the sidebar, the icon tool) is `'use client'` islands; everything else defaults to Server Components. This is covered in depth in the companion stack explainer already given to the user in this conversation — see that for the "why this tech, why not X" reasoning per tool. This file focuses on **what exists and what it does**, not re-explaining the tech choices.

---

## 5. The domain layer (`src/lib/domain/`) — the correctness-critical core

This is the part of the codebase the project is most protective of. It's pure TypeScript, zero UI/framework coupling, lifted verbatim from the pre-extraction codebase, and its tests **must pass unchanged** — they're the proof the financial/legal logic survived the move intact.

| File | Lines | What it does |
|---|---|---|
| `money.ts` | 68 | Integer-paise arithmetic. `rupeesToPaise`, `paiseToRupees`, `formatINR`. **Floats are never used for money anywhere in this app.** |
| `amountInWords.ts` | 103 | Converts a paise amount to words for print (e.g. "Rupees One Lakh Fifty Thousand Only") — standard on Indian financial documents. |
| `dates.ts` | 91 | ISO date validation (`isISODate`) and **ordinal-format** display ("10th June 2026," never `10/06/2026`). All document dates must go through this, never formatted ad hoc. |
| `docNumber.ts` | 18 | Formats a claimed serial into the printed number string, e.g. `QS-INV-2627-001`. |
| `gstStates.ts` | 54 | The Indian GST state-code table, used to decide CGST+SGST (same state as the studio, code `09`/UP) vs. IGST (different state) — see §6 for why this matters. |
| `studio.ts` | 24 | Qera Studio's own hard-coded legal constants: CIN, GSTIN, registered address, bank details. The "seller" side of every document. |
| `employee.ts` | 70 | Employee record shape/helpers — engagement type, pronoun, bank details. |
| `serviceTemplate.ts` | 79 | Reusable service-template shape (scope items, exclusions, milestones, pricing note) — what a contract's `schedules` get copied from. |
| `scheduleLetter.ts` | 7 | Tiny helper: assigns Schedule A, B, C... letters to a contract's schedules (max 26, one per letter of the alphabet). |
| `hrContent.ts` | 186 | HR letter boilerplate/content generation — branches on engagement type per the intern-vs-employee legal split (see §6.6). |
| `msaBoilerplate.ts` | 221 | The 24-clause Master Service Agreement contract text printed on every `CON` document. |
| `types.ts` | 180 | The single source of truth for every domain shape — `DocTypeCode`, `BaseDocument` and its 5 discriminated subtypes (`InvoiceDocument`, `ReceiptDocument`, `ContractDocument`, `StipendDocument`, `LetterDocument`), `ClientSnapshot`/`EmployeeSnapshot`, `ActionResult`. Read this file first if you need to know a shape. |
| `registry.ts` | 368 | **The single place a document type is defined** — drives the editor, the (future) sheet, numbering, and validation. All Zod schemas (draft vs. finalize, per doc type) live here. Documented in its own header comment as mirroring the icon tool's `ICON_SPECS` pattern. |

### 5.1 The document-type registry, in full

`DOC_TYPES` in `registry.ts` currently defines exactly 7 document types. This table is the ground truth — reproduced here in full so a fresh session never has to go re-derive it:

| Code | Slug | Label | Masthead | Kind | Numbered? | Has payment | Has due date | Notes |
|---|---|---|---|---|---|---|---|---|
| `INV` | `invoice` | Invoice | INVOICE | financial | ✅ | ❌ | ✅ | 6 fixed terms clauses (Payment/Suspension/Ownership/Disputes/Costs & taxes/Jurisdiction) |
| `REC` | `receipt` | Receipt | RECEIPT | financial | ✅ | ✅ | ❌ | Green "PAID" badge; 3 fixed terms |
| `CON` | `contract` | Contract | CONTRACT AGREEMENT | contract | ❌ (unnumbered) | ❌ | ❌ | Carries `schedules` (max 26, lettered A–Z), backed by the 24-clause MSA boilerplate |
| `STP` | `stipend` | Stipend slip | STIPEND | hr-slip | ✅ | ❌ | ❌ | "PAID" badge; financial-shaped but employee-based, not client-based; default deductions note assumes an internship (no statutory deductions) |
| `OFR` | `offer-letter` | Offer letter | OFFER LETTER | hr-letter | ❌ (unnumbered) | ❌ | ❌ | Boilerplate + editable body paragraphs/bullet sections |
| `EXP` | `experience-letter` | Experience letter | EXPERIENCE LETTER | hr-letter | ❌ (unnumbered) | ❌ | ❌ | Same shape as offer letter |
| `EXIT` | `exit-letter` | Exit letter | EXIT LETTER | hr-letter | ❌ (unnumbered) | ❌ | ❌ | **Auto-switches wording**: intern → "Internship Completion Letter," employee → "Relieving Letter" (per `CONTEXT.md` §6 and `hrContent.ts`) |

Only **financial** docs (INV, REC) and **hr-slip** (STP) are numbered per §3 of `CONTEXT.md` — confirmed exactly matching the registry above.

**Validation is two-tier per type**: a lenient `*DraftSchema` (structural limits only, half-filled data allowed — e.g. a line item can have qty 0, a receipt can have an empty payment date) and a strict `*FinalizeSchema` (at least one complete line item, all required fields present, and — critically — `requirePlaceOfSupplyWithGst`: any document with `gstRatePercent > 0` cannot pass finalize validation without a 2-digit `placeOfSupplyStateCode`). This finalize-only strictness is the actual mechanism behind "Document is incomplete" errors mentioned in `CONTEXT.md`.

---

## 6. The seven non-obvious domain rules (verified against code, not just docs)

These are restated from `CONTEXT.md` here because they are the single most important thing for a fresh session to internalize before touching anything document-related — and each is now cross-checked against the actual schema/registry code above, not just asserted.

1. **Money is integer paise**, everywhere, no exceptions — enforced by `money.ts` and by every Zod schema using `z.number().int()` on rate/amount fields (see `lineItemSchema.ratePaise`, `letterBaseShape.payAmountPaise`).
2. **GST financial-year numbering**: `QS-INV-2627-001`-style. Per Indian FY (April–March), sequential per (doc-type, FY), claimed **atomically only at finalize** via a single Postgres upsert statement (`src/db/counter.ts`, `claimSerial`) — `INSERT ... ON CONFLICT (doc_type, fy_code) DO UPDATE SET last_serial = last_serial + 1 RETURNING`. This is a single atomic SQL statement, so Postgres's own row-level locking serializes concurrent claims — no read-then-write race window exists. Verified under real concurrency in Phase 3's integration tests (10 concurrent finalizes → 10 unique serials). A `uniqueIndex` on `documents.number` in the schema is the second, database-enforced line of defense against a duplicate ever landing.
3. **Place of supply required when GST > 0** — enforced by `requirePlaceOfSupplyWithGst` inside every `*FinalizeSchema` in `registry.ts`, not just described in prose. Drafts are exempt (the field is optional in draft schemas).
4. **Finalized documents are immutable** — enforced in the persistence layer (`src/db/store.ts`; not fully re-read line-by-line in this pass, but confirmed as the described contract in commit `17192e5` and `CONTEXT.md`). No edit/delete UI is shown for finalized docs. Corrections happen by duplicating as a new draft.
5. **The snapshot pattern** — `documents.snapshot` (JSONB, typed `ClientSnapshot | EmployeeSnapshot` in `schema.ts`) freezes the client or employee at finalize time. A finalized document must always render from its own `snapshot`, never by re-fetching the live `clients`/`employees` row.
6. **Intern vs. employee is legally distinct**, not cosmetic — `EngagementType = 'intern' | 'employee'` in `types.ts`, consumed by `hrContent.ts` to branch letter wording. The exit letter auto-switches per §5.1's table above. Legal-assertion lines (e.g. stipend slip's `deductionsNote`) are editable per-document, not fixed boilerplate, because their truth depends on the specific case.
7. **Ordinal dates everywhere** ("10th June 2026") via `dates.ts` — never ad hoc `Date` formatting.

---

## 7. What is NOT built yet — the honest gap list

This is the part most likely to be stale in anyone's memory, so it's stated plainly and was verified directly against the file tree in this pass (not assumed from docs):

- **No document creation/edit form exists.** `/docs/new/[type]/page.tsx` exists as a route (auth-gated) but was not inspected line-by-line in this pass; treat "does it render a real form" as unverified — check it directly before assuming.
- **No document viewer exists.** `src/app/(admin)/docs/[id]/page.tsx` is confirmed, verbatim, a placeholder: `"Viewing document {id} arrives in the next phase."` Nothing renders the actual document content yet.
- **No document sheets exist.** `CONTEXT.md` and `AGENTS.md` describe `src/components/sheets/` as the home of the "pixel-faithful" printable invoice/receipt/contract/stipend/letter layouts — **this directory does not exist in the repo yet.** Confirmed via direct filesystem search.
- **No Paginator exists.** The A4 page-carousel/print-pagination engine described at length in `CONTEXT.md` ("How the Paginator / print pipeline works") is **fully unbuilt** — confirmed via repo-wide search for "Paginator," zero matches.
- **No `src/styles/print.css` exists.** The print-specific CSS layer (A4 sizing, `break-before: page`, `print-color-adjust`) referenced throughout `AGENTS.md`/`CONTEXT.md` has not been created. Confirmed — `src/styles/` doesn't exist as a directory yet.
- **No server-side PDF renderer** — deliberately deferred (YAGNI), not a gap.

**Practical implication:** if the user asks to "finish a document" or "print an invoice," the honest answer is that the entire document-authoring and document-rendering surface is greenfield work, not a bug fix. This is the natural next major chunk of work on the project (effectively "the rest of Phase 4" per the runbook, i.e. everything after the CRUD shell).

---

## 8. Database — full schema reference

Five tables, defined in `src/db/schema.ts`, deployed via one migration so far (`src/db/migrations/0000_youthful_risque.sql`). Money is integer paise; document-owned dates are ISO strings inside JSONB; row-lifecycle timestamps are `timestamptz`.

- **`clients`** — `id, name, address, email, phone, gstin?, createdAt, updatedAt`. Flat, no JSONB — clients are simple enough not to need it.
- **`employees`** — `id, name, address, email, phone, role, engagementType, pronoun, joiningDate, endDate?, payAmountPaise, bank (jsonb: {bankName, accountNo, ifsc, upiId?}), createdAt, updatedAt`.
- **`service_templates`** — `id, name, content (jsonb: overview/scopeItems/exclusionItems/priceNote/milestones/revisionsNote/disclaimerNote/supportNote), createdAt, updatedAt`. `name` is denormalized out of the JSONB purely so it's queryable/sortable without parsing JSON.
- **`documents`** — the big one:
  - Identity/lifecycle: `id, type (DocTypeCode), status (draft|finalized, default draft)`
  - Numbering (null until finalized): `number, serial, fyYear`
  - Queryable projections: `issueDate, dueDate?, clientId (FK→clients), employeeId (FK→employees), gstRatePercent (default 0), placeOfSupplyStateCode?, totalPaise (default 0)`
  - Payload: `data (jsonb, DocumentData — the doc-type-varying bag: lineItems, gstLabel, notes, terms, dueDate, payment, schedules, stipend fields, letter fields)`, `snapshot (jsonb, ClientSnapshot | EmployeeSnapshot, set at finalize)`
  - Timestamps: `createdAt, updatedAt, finalizedAt?`
  - Indexes: on `createdAt DESC`, `status`, `type`, `clientId`, `employeeId`, plus **`uniqueIndex` on `number`** — the database-level backstop against duplicate invoice numbers.
- **`counters`** — `docType, fyCode` (composite primary key), `lastSerial (default 0), updatedAt`. One row per (doc-type, FY); see §6.2 for how it's used atomically.

**Design principle stated in the schema file's own header comment:** relational columns for what's queried/reported on; JSONB for what varies by document type; the domain types in `src/lib/domain/types.ts` remain the single source of truth for shape, with JSONB columns validated by the existing Zod schemas on write (never trusted raw) and flat columns treated as a denormalized projection for querying/indexing, not the canonical record.

---

## 9. Auth — the two-lock model, precisely

1. **Clerk-level:** sign-up is set to **Restricted** in the Clerk dashboard — the public cannot self-register; accounts exist only if invited/created from the dashboard directly.
2. **App-level allowlist:** `SPECLR_ALLOWED_EMAILS` (comma-separated env var, read in `src/lib/auth/allowlist.ts`). Every protected page and every Server Action calls `requireAuthorizedUser()` (`src/lib/auth/session.ts`), which is wrapped by `authorized()` (`src/server/actions/authGate.ts`) for the uniform `if (!(await authorized())) return { success: false, error: 'Unauthorized.' }` shape used across all Server Actions. **Fail-closed**: an empty allowlist locks everyone out, never the reverse.

`src/proxy.ts` (Next 16.2 renamed the `middleware.ts` convention to `proxy.ts` — tracked in commit `209445b`) runs `clerkMiddleware()` **only to make Clerk's auth context available** (so `auth()` works downstream in Server Components/Actions). It is explicitly documented in its own comments as **not** an authorization boundary — path-matching in middleware is considered unsafe per Clerk's own current guidance and the project's Security checklist, because it "can diverge from how Next.js routes requests and leave protected resources reachable." The real boundary is always the resource-level `requireAuthorizedUser()` call.

A signed-in-but-not-allowlisted user lands on `/no-access`, which shows zero documents — verified in-browser during Phase 3 per `CONTEXT.md`.

**To add a person:** invite them in Clerk **and** add their email to `SPECLR_ALLOWED_EMAILS` in both `.env.local` (local) and Vercel (prod, project-scoped, all environments). Both locks must pass.

**Current limitation:** the Clerk keys in use are `pk_test_...` — a **dev instance**, which only works on `localhost`. Production login requires provisioning a Clerk **production instance** and configuring it for the `speclr.qera.studio` domain — this is an explicit go-live task, not yet done.

There is no `.env.example` file in the repo (confirmed by direct search) — the two required app-specific env vars are `DATABASE_URL` (Neon connection string) and `SPECLR_ALLOWED_EMAILS`; Clerk additionally needs its standard `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (read internally by `@clerk/nextjs`, not referenced directly in app code, so they didn't show up in a source grep — don't be misled by their absence from grep results into thinking Clerk is unconfigured).

---

## 10. Testing — current shape

- **Unit/component tests:** `npm test` → Jest + jsdom via `next/jest`. 33 test files found across the repo in this pass (domain logic, DB store, components, page-level). The Phase 2/3 checkpoints documented **114 domain tests** and **119 total** passing respectively (as recorded in commit messages and the runbook) — **not independently re-run in this session**, because `node_modules` is not installed in this working environment (`npm test` fails with `jest: not found` until `npm install` is run). Treat those pass counts as last-known-good, not verified-just-now.
- **Integration tests:** `npm run test:int` (sets `RUN_INTEGRATION=1`) — hits the **live Neon database**, self-cleaning, gated out of the default run via `testPathIgnorePatterns`. Loads `.env.local` through `jest.setup.integration.ts` (Next's default Jest transform skips `.env.local` otherwise). 6/6 passing as of Phase 3.
- **Policy from `AGENTS.md`:** `screen.getByRole` over `getByTestId` (accessibility-by-construction), `userEvent.setup()` not `fireEvent`, domain-logic tests are lifted verbatim and **must pass unchanged**, and jsdom is explicitly called out as unable to validate print/pagination — that has to be checked in a real browser, which matters a great deal once the Paginator (§7) actually gets built.

---

## 11. Governance — how decisions get made here

- **Precedence order when standards conflict:** Legal → Security → Accessibility → Backend → Performance → SEO → Design. (`AGENTS.md`)
- **The 8 master checklists in `dev/`** are described as "not suggestions — the production standard," built on OWASP ASVS/Top-10 and shared across every Qera project (so improving one here should flow back to the others, per `AGENTS.md`).
- **`dev/master-launch-readiness-gate.md`** is the go/no-go ritual to run before any production deploy — has not yet been run for real, because the project hasn't gone live.
- **Collaboration style mandated in `CLAUDE.md`** (worth internalizing, not just knowing exists): act as a principal engineer with deep ownership; push back firmly on anything risking correctness/security/accessibility/performance/legal integrity, *before* writing code; one change at a time, verified before the next; ask before acting on anything ambiguous touching money, numbering, immutability, auth, or legal content — never guess; verify claims with actual evidence (tests green, build green, confirmed in-browser for print/pagination — jsdom can't validate that); commit on approval without waiting to be re-told; flag regressions proactively before making a change that could break a working surface.
- **Git workflow:** never commit directly to `main`; branch first (`feature/<name>`); small meaningful commits; commit/push only when the user asks; commits authored as the Qera org identity.

---

## 12. Deployment & environment reference

- **Hosting:** Vercel, but under a **company** Vercel account distinct from the founder's **personal** Vercel account (which separately hosts the marketing site, `clayora`, `sunholdings`). This distinction caused real confusion during setup (`vercel link` from the personal account didn't list speclr) — documented at length in `docs/MIGRATION_RUNBOOK.md`'s "Git & account reference" section specifically so it isn't re-discovered painfully again. To link/deploy speclr locally: `vercel logout` then `vercel login` as the **company** account, verify with `vercel whoami`.
- **GitHub:** one personal GitHub account, full member of the `Qera-Studio` org — one login covers both; commit identity for this repo is set locally to `ops@qera.studio` so attribution is correct without leaking into the founder's personal projects.
- **Database:** Neon Postgres, provisioned through Vercel's integration.
- **Auth:** Clerk, provisioned through Vercel's integration; currently on a dev instance (`pk_test_`), see §9.
- **Repo visibility:** currently **public** (a deliberate Phase 1 choice to avoid Vercel's private-org Pro-plan requirement on the Hobby tier) — worth revisiting given the repo now contains real architecture for handling client PII/financial data, even though secrets themselves are correctly kept out of git. This wasn't flagged as a concern anywhere in the docs read during this pass; if the user hasn't consciously weighed this tradeoff, it's worth raising once, per the "push back firmly" collaboration norm in §11 — not something to silently accept as fine.
- **Known `npm audit` noise:** transitive `postcss`/`sharp` advisories bundled inside Next.js itself. **Do not run `npm audit fix --force`** — it will downgrade Next 16 to 9.3.3, which `CONTEXT.md` calls "catastrophic." Wait for an upstream Next.js patch instead.

---

## 13. The future — everything already decided or deferred

### Locked decisions (do not re-litigate — from `CONTEXT.md`)
- Next.js over TanStack Start (maturity + Vercel + Server Actions fit).
- Postgres/Neon + Drizzle over the original Redis/Upstash (queryable financial records need real SQL, not a KV store).
- Clerk over a shared password (per-user audit trail + revocation).
- Document sheets stay pixel-faithful to the already-approved designs; everything else is fresh shadcn.
- Sheet styling is Tailwind + a small `print.css` layer — **not** a PDF renderer, for now.
- No data migration was performed — Postgres started fresh; the old Redis test data (including a test invoice literally numbered `QS-INV-2627-001`) was deliberately **not** carried over, so speclr's first real document starts a genuinely clean FY sequence. (Be careful: if you ever see `QS-INV-2627-001` referenced anywhere, that's the *old test document*, not a hint that a real one already exists.)

### Deliberately deferred (YAGNI, explicitly noted as intentional, not forgotten)
- **Server-side PDF renderer** — print-CSS carries the load for now; kept as a non-breaking future upgrade path *specifically because* the sheets are pure `data → markup` components (once built).
- **Roles/permissions** — everyone allowlisted has full access today; the schema/auth model is meant to support adding roles later without a rewrite, but nothing role-shaped exists yet.
- **Payslip document type** — distinct from the stipend slip; deferred until a real salaried employee exists (there's an intern today, "a real intern" per `CLAUDE.md`, but not yet a salaried employee).
- **Reporting/analytics dashboards** — the relational schema was designed to enable these (that's *why* certain fields are flat columns instead of buried in JSONB), but no dashboard/reporting UI has been built.

### Immediate next work (not formally "decided," but the obvious next step given §7)
Finishing "Phase 4" as originally scoped: the document creation/edit forms, the pixel-faithful sheets in `src/components/sheets/`, the Paginator carousel/print-pagination engine, and `src/styles/print.css`. Then Phase 5 per the original runbook is really just "verify the icon tool end-to-end" since it appears to have already been substantially built as "Phase 4d" — worth explicitly confirming with the user whether Phase 5 is considered done, superseded, or still has a checklist of its own before assuming.

### Post-migration, separate and deferred
- Add the `speclr.qera.studio` custom domain; decide repo private-vs-public and the right Vercel plan for go-live (see the visibility concern raised in §12).
- **Only after speclr is fully live and independently verified:** remove `kessler-admin`/`kessler-spec` (and their `lib/admin`/`actions/admin`) from the marketing site, as a final, separate cleanup PR in that other repo. Until then the marketing site's copies remain the working fallback — don't touch them from here.

---

## 14. Quick index — "where do I look for X?"

| Question | Look here |
|---|---|
| What does a document type look like / what fields does it have? | `src/lib/domain/registry.ts` (`DOC_TYPES`), `src/lib/domain/types.ts` |
| How is money handled? | `src/lib/domain/money.ts` |
| How are dates formatted? | `src/lib/domain/dates.ts` |
| How does invoice numbering work? | `src/db/counter.ts` + `src/lib/domain/docNumber.ts` |
| What's Qera's own legal/bank info (the "seller" side of every doc)? | `src/lib/domain/studio.ts` |
| What's the DB schema? | `src/db/schema.ts` (also §8 above) |
| How is a Server Action authorized? | `src/server/actions/authGate.ts` → `src/lib/auth/session.ts` |
| What's in the sidebar / site nav? | `src/components/admin/nav.ts` |
| What CRUD exists today? | `src/components/admin/{clients,employees,services}/` |
| Why isn't there a document viewer/printer yet? | §7 of this file — it's genuinely not built |
| What are the actual production standards? | `dev/*.md` (8 checklists) + `AGENTS.md` |
| Why was X architectural decision made? | `CONTEXT.md` §"Decisions already made," and §3/§13 of this file |
| What's the deploy/Vercel account situation? | `docs/MIGRATION_RUNBOOK.md` "Git & account reference," §12 of this file |

---

## 15. Maintenance note for this file

This file is a point-in-time snapshot (2026-08-12, commit `5102e8c`). It was produced by re-reading the actual repository — git log, schema, registry, live file tree, actual page contents — not by summarizing the other docs blind, and several discrepancies between the docs and reality were caught this way (the stale runbook checkboxes; the sheets/Paginator/print.css not existing despite being described at length in `CONTEXT.md`/`AGENTS.md` as if current). **If this file is ever consulted more than a few weeks after its snapshot date, re-verify anything time-sensitive against `git log` and the actual file tree before trusting it** — it will drift the same way the runbook did. It is not wired into `CLAUDE.md`'s `@`-imports and won't auto-load into every session; if the user wants it to, that's a one-line addition to `CLAUDE.md` they'd need to explicitly approve, since it changes what loads by default in every future session.
