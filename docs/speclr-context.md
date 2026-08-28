# speclr — full project context

> Combined export of this repo's four Claude context files (CLAUDE.md, AGENTS.md, CONTEXT.md, PRINCIPLES.md), for handing to another Claude conversation that has no access to this repo. Generated 2026-08-27.
>
> **This is a snapshot, not a live import.** The four source files change as the project evolves; this file does not update itself. Regenerate it (concatenate the four files again) before sharing it if it's more than a few days old, rather than trusting it as current.

---

# 1. CLAUDE.md

@AGENTS.md
@CONTEXT.md
@PRINCIPLES.md

# speclr — Claude Context

## What this project is
speclr is Qera Studio's **internal operations tool** — it issues real financial/legal documents (invoices, receipts, contracts, stipend slips, HR letters) and validates icon specs. It was extracted from the qera.studio marketing site into its own standalone app. **`CONTEXT.md` has the domain rules; `AGENTS.md` has the standards; `dev/` has the 8 master checklists (the law).**

This is a **data-dense internal tool**, not a marketing surface. Its design language is shadcn (dark, Geist, Lucide, neutral + blue) — deliberately *not* the marketing site's calm-pastel aesthetic. Different product, different values.

---

## Core stakes
These documents are **real** — issued to real clients and a real intern, and potentially produced years later for tax or legal reasons. That framing drives everything:
- **Correctness is non-negotiable.** Money in integer paise, atomic FY numbering, immutability of finalized docs, the snapshot pattern — a silent bug here is a real-world incident, not a cosmetic glitch.
- **The legal content matters.** Intern-vs-employee wording, GST place-of-supply, editable legal-assertion lines — these have legal weight. Confirm before changing any of them.

---

## Collaboration style

- **Principal engineer, permanently.** Operate as a principal engineer with deep ownership of this project. Guide architecture and long-term vision; flag issues, anti-patterns, and tech debt even outside the immediate task; propose improvements before making them.
- **Push back firmly.** If a request risks correctness, security, accessibility, performance, or the legal integrity of a document, say so clearly and propose a better path *before* writing code. Don't perform agreement.
- **One change at a time.** Implement and verify each change before the next. Small, meaningful commits.
- **Ask before acting** when a request is ambiguous or has multiple valid interpretations — especially anything touching money, numbering, immutability, auth, or document legal content. Never guess; confirm.
- **Verify with evidence.** Don't claim something works until tests pass / the build is green / it's confirmed in a real browser. jsdom can't validate print/pagination — use the browser for those.
- **Commit on approval.** When the user says it looks good, commit (and push if asked) without waiting to be told again.
- **Flag regressions proactively.** Before a change, check whether it could break an already-working surface; if so, flag it first.

---

## Non-negotiables (from the checklist system)
- **Never trust the client; verify ownership server-side.** (Security floor.)
- **Secrets never in code or git**; never `NEXT_PUBLIC_`.
- **Every table has ownership/access enforcement.**
- **Task not done until `npm test` passes.**
- **Run the launch-readiness gate before any production deploy.**

---

## User context
Solo founder (Shivanshu) building Qera alone — no team. Uses AI as the engineering partner. Values clean architecture, scalability, and doing things properly the first time. Relies on you to hold the line on standards he might not catch himself.

---

# 2. AGENTS.md

# Agent Instructions — speclr

> speclr is Qera Studio's internal document + icon tool: it issues invoices, receipts, contracts, stipend slips, and HR letters (real financial/legal documents), and validates favicon/OG icon specs. Extracted from the qera.studio marketing site into a standalone app. **Read `CONTEXT.md` before your first task** — it holds the non-obvious domain rules (GST numbering, immutability, snapshots, the intern-vs-employee legal split) that the code alone won't tell you.

## This is NOT the Next.js you know

This is **Next.js 16** (App Router, React 19, Turbopack). APIs and conventions may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code. Heed deprecation notices.

---

## The master checklists are the law (read this first)

This project ships under Qera's **8 master checklists** in [`dev/`](dev/). They are not suggestions — they are the production standard, built on OWASP ASVS / Top-10 and multi-domain synthesis. Every task is held to them.

**Precedence order (when two docs conflict, higher wins):**
**Legal → Security → [`PRINCIPLES.md`](PRINCIPLES.md) → Accessibility → Backend → Performance → SEO → Design.**

[`PRINCIPLES.md`](PRINCIPLES.md) is the **domain-modelling law**: the three layers
(core / jurisdiction pack / presentation) and the five rules that decide where a
piece of data lives. It is enforced the same way the checklists are — a request
that breaks a rule gets the conflict named and a compliant path proposed before
any code is written.

| Checklist | Owns |
|---|---|
| [`master-legal-compliance-checklist.md`](dev/master-legal-compliance-checklist.md) | Privacy, data-deletion, licensing, dark patterns, jurisdiction. **High stakes here — these are financial/legal documents.** |
| [`master-security-checklist.md`](dev/master-security-checklist.md) | Auth, IDOR/ownership, secrets, RLS, input validation, headers, rate limiting. *The one rule: never trust the client; verify ownership server-side.* |
| [`master-accessibility-checklist.md`](dev/master-accessibility-checklist.md) | WCAG 2.1 AA — semantic HTML, keyboard, focus, ARIA. |
| [`master-backend-checklist.md`](dev/master-backend-checklist.md) | Correctness, data integrity, code craft, and **coding-with-AI discipline**. The correctness owner. |
| [`master-performance-checklist.md`](dev/master-performance-checklist.md) | Core Web Vitals, bundle, loading. |
| [`master-seo-checklist.md`](dev/master-seo-checklist.md) | Mostly moot — speclr is a `noindex` internal tool — but retained as the standing set. |
| [`master-design-brand-checklist.md`](dev/master-design-brand-checklist.md) | Adapted to the shadcn design language (see below). |
| [`master-launch-readiness-gate.md`](dev/master-launch-readiness-gate.md) | The go/no-go ritual before every production deploy — aggregates the non-negotiable floor of the seven docs. **Run it before shipping.** |

Two measured companions sit in `docs/`: [`vendors.md`](docs/vendors.md) records
every third party speclr depends on and what replacing it would cost, and
[`maturity.md`](docs/maturity.md) records where the codebase stands against
industry practice, with the commands to reproduce every number.

These checklists travel to every Qera project. When one's floor changes, update it here too.

---

## Stack

| Concern | Tech |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript (strict) |
| Styling | **Tailwind CSS v4** — no SCSS |
| Components | **shadcn/ui** (`new-york`/base-mira, preset `b1ZzrZeYC`), owned in `src/components/ui/` |
| Icons | **Lucide** (`h-4 w-4` / `h-5 w-5`, quiet and consistent) |
| Database | **Neon Postgres** |
| DB access | **Drizzle ORM** (`src/db/`) |
| Auth | **Clerk** (email allowlist, all invited users full access, no roles) |
| Validation | **Zod** (validates JSONB payloads on write) |
| Testing | **Jest + React Testing Library** |

---

## Coding rules

- **Server Components by default.** Add `'use client'` only when the component genuinely needs browser APIs or interactivity.
- **[`docs/design.md`](docs/design.md) is the design law.** Read it before
  building any new surface: colour, spacing, radius, type, icons, motion,
  elevation, and the rules per primitive. A value it does not cover is a value
  you are inventing, which means a new row there in the same commit. Where a
  rule is mechanically enforced, breaking it fails `npm test`.
- **shadcn first.** Never hand-roll a `button`/`input`/`select`/`dialog`/`table` when a shadcn primitive exists. Compose from `src/components/ui/`. Use `AlertDialog` (not `Dialog`) for destructive confirmations. Style with theme tokens (`bg-background`, `text-foreground`, `border-border`), not ad-hoc hex.
- **The document sheets are pixel-faithful artifacts.** They reproduce the finalized designs exactly. Do not redesign them. They use Tailwind + `src/styles/print.css` (the print-specific rules Tailwind can't express: A4 sizing, `break-before: page`, `print-color-adjust`).
- **Keep components small and focused** — one clear responsibility. Split when a file grows unwieldy.
- Avoid unnecessary dependencies — every one is an attack surface (`npm audit` before adding; see Security checklist).
- **Every vendor gets a row in [`docs/vendors.md`](docs/vendors.md), in the same
  commit that introduces it.** A vendor is anything that is somebody else's: a
  hosted platform, a third-party API, a data source, a framework, a library.
  Five answers, no exceptions: what we use, why, the industry substitute, what
  that costs, and why it beats its two closest competitors. Removing a vendor
  means moving its row to §7 with the reason, not deleting it. This exists so
  that the day a free tier stops being good enough, the decision is a purchase
  rather than a research project.

---

## Input rules

- **A field types the way the value is written.** If a value conventionally
  carries separators, spacing or a case, the input applies them **as the
  operator types**, not on blur and not only in the placeholder. An EIN is
  `83-0000000`, a UK VAT number is `GB 123 4567 89`, an IFSC is uppercase. A
  field that shows a formatted placeholder and then accepts an unformatted
  string is telling the reader two different things about the same value, and
  the one they end up looking at is the wrong one.

  Cosmetic is not a reason to skip it. The separator is what lets somebody
  check a number against a certificate at a glance, and the reassurance that
  the field understood what was typed is most of what a form is for.

  The pair rule from `CONTEXT.md` §5f applies: the format lives beside its
  validator in `src/lib/domain/`, and the input in
  `src/components/form/fields.tsx` applies it. Never write the mask inline in a
  step. Validators must go on **stripping separators before checking**, so a
  formatted value and a pasted bare one are the same value.

- **Never show a validity tick on a field with no rule.** `FieldCheck` says
  "this was checked and it passed". On a field that accepts anything, it says
  that about a check that never ran, which is worse than showing nothing:
  it is the app claiming to have verified a number it cannot verify.

- **Numeric inputs reject non-digits** rather than accepting and complaining.
  Use `numericField` from `components/form/inputFilters`, and sanitise on the
  way in, before react-hook-form stores it.

- **No format invented for a country nobody has billed.** A rule that rejects a
  valid number blocks a real invoice, which is worse than no rule at all. Where
  the format genuinely varies (a company registration number, whose register
  differs per country and, in the US, per state), the honest answer is a plain
  field, no mask and no tick. See `taxIds/foreign.ts`'s `OTHER` row.

---

## Writing rules

- **Never use an em dash (`—`).** Not in chat, not in code comments, not in
  documentation, not in UI copy, not in commit messages, not in a document's
  printed wording. Use a comma, a colon, parentheses, or two sentences. If a
  sentence only works with an em dash, it wants rewriting.
- The same goes for the en dash (`–`) as a punctuation mark. It stays only in
  numeric ranges where it is the correct character (`April–March`, `2026–27`).
- Existing files are full of em dashes from before this rule. Do not sweep them
  out wholesale; fix the ones in any block you are already editing.

---

## Database rules (Drizzle + Neon)

- Schema lives in `src/db/schema.ts`. Changes go through **migrations** (`drizzle-kit`) — never edit the DB by hand.
- **Real columns** for what is queried/reported (number, status, dates, totals, FKs); **JSONB** for doc-type-specific parts (line items, letter body, the frozen snapshot). **Zod-validate every JSONB payload on write** — never trust the shape.
- **Every table gets ownership/access enforcement** (Security checklist floor: "RLS on + ownership policies"). Even though all authed users have full access today, access is always verified server-side.
- Money is **integer paise**, never floats. Dates are **ISO strings**; display via the domain `dates` helpers (ordinal format, e.g. "10th June 2026").
- **Finalized documents are immutable** — the persistence layer must refuse to overwrite or delete them. Numbering is claimed atomically at finalize (Postgres, per FY). These are correctness-critical (Backend checklist) and money-critical — test them first.

---

## Auth rules (Clerk)

- **Every Server Action and protected route verifies the Clerk session server-side.** A layout is not a security boundary (Security checklist, non-negotiable).
- Access is gated by an **email allowlist**. Signed-in users have full access; there are no roles yet (adding them later must not require a rewrite).
- Secrets (Clerk/Neon keys) live in env vars, **never** `NEXT_PUBLIC_`-prefixed, never in git.

---

## Metadata & rendering

- Every page exports its own `metadata`. Internal tool pages are **`robots: { index: false, follow: false }`** and absent from any sitemap — nothing here should be indexed.
- Default to Server Components (static/dynamic as needed). Use `export const dynamic = 'force-dynamic'` only when a route must read the live session/DB every request — and document why.

---

## Testing rules (mandatory)

Two halves, and the split is what each can see. **Jest + React Testing Library**
(`npm test`) owns behaviour; **Playwright** (`npm run test:e2e`) owns geometry.

- Every component and every non-trivial module has tests in a `__tests__/` dir beside it.
- Prefer `screen.getByRole` over `getByTestId` — roles reflect real accessibility.
- Use `userEvent.setup()` (imported statically at the top), not `fireEvent`.
- Test **behaviour visible to users and assistive tech**, not implementation details.
- **Domain-logic tests are lifted verbatim from the source project and must pass unchanged** — they prove the core survived the move. Do not weaken them.
- **jsdom measures every box as zero**, so it cannot see a page break, a clipped
  row or a column that does not fit. That is not a gap in the tests; it is a
  property of the renderer. Anything that is a *measurement* goes in `e2e/`,
  against a fixture served by the dev-only `/preview/<fixture>` route.
- **A Playwright test that has never been seen to fail proves nothing.** Break
  the thing it guards, watch it go red, then put it back. The suite exists
  because a clipping bug shipped through 1,900 green tests.

**A task is not complete until:** the code is implemented, tests are written, and `npm test` passes with no failures. If tests fail, fix them before proceeding. **A task that changed a sheet, a page frame or the print pipeline is not complete until `npm run test:e2e` passes too.**

---

## Git workflow

- Never commit directly to `main`. Branch first: `feature/<name>`.
- Commit in small, meaningful steps. Commit/push only when the user asks.
- Commits are authored as the configured repo identity (Qera org member).

---

## When unsure

Ask for clarification instead of guessing. For anything touching money, numbering, immutability, auth, or the legal content of a document — **confirm before changing**. These are the parts where a silent bug becomes a real-world incident.

---

# 3. CONTEXT.md

# CONTEXT — speclr

> The warm-start brief. If you are a fresh session, read this before touching code. It captures what speclr *is*, the domain rules that aren't obvious from the code, and the decisions already made — so you don't re-derive or re-litigate them. Pair it with `AGENTS.md` (the standards) and the checklists in `dev/`.

---

## What speclr is

Qera Studio's **internal operations tool**, used by the founder (and a few trusted people). Two tools in one app:

1. **Document tool** — creates, finalizes, and prints real **financial/legal documents**: invoices, receipts, contracts, stipend slips, and HR letters (offer / experience / exit). Backed by Postgres.
2. **Icon tool** (`spec`) — validates favicon/OG icon specs with live previews (browser tab, iOS home screen, Google SERP, social card, maskable safe-zone). Entirely client-side.

It was **extracted from the qera.studio marketing site** (where it lived as `/kessler-admin` and `/kessler-spec`) into this standalone project, rebuilt on Postgres + Clerk + shadcn. The marketing site keeps its own copy until speclr is fully live; the design spec for the extraction is the source of truth for *why* things are shaped this way.

**Audience & tone:** this is a **data-dense internal tool**, not a marketing surface. Dark mode, shadcn, Geist, Lucide. It does NOT follow the marketing site's "calm pastel, low-density" aesthetic — different product, different values.

---

## The non-obvious domain rules

These are the things that will bite a fresh session if not known. **They are correctness- and legally-load-bearing.**

### 1. Money is integer paise
All amounts are stored and computed as **integer paise** (₹1 = 100 paise), never floating point. Helpers: `rupeesToPaise`, `paiseToRupees`, `formatINR`, `amountInWords`. Floats would silently corrupt totals — never introduce them.

### 2. GST financial-year numbering (India-specific, legally required)
Finalized numbered documents get a number like `QS-INV-2627-001`:
- Per **Indian financial year (April–March)**, *not* calendar year. FY 2026-27 → code `2627`.
- Sequential per (doc-type, FY), starting at `001`.
- **Claimed atomically at finalize** (Postgres row-lock/sequence via the `counters` table). A number is only taken when a document is finalized — abandoned drafts never burn a number. A gap is acceptable; a **duplicate is never** (GST Rule 46 requires consecutive, unique invoice numbers).
- **Financial** docs (invoice, receipt), **hr-slip** (stipend, pay) and **contracts** are numbered. Only the HR letters are not — nothing files them by reference. A contract's `QS-CON-2627-nnn` is an internal filing reference rather than a statutory one, but it comes from the same atomic claim, which is what guarantees two agreements can never share one.

### 3. "Place of supply" is required when GST applies
An invoice/receipt with `gstRatePercent > 0` **cannot be finalized without a place-of-supply state code**. This drives the CGST/SGST-vs-IGST split (same state as the studio → CGST+SGST; different state → IGST). This is a hard validation guard, not a nicety — issuing a GST document without it is legally incomplete. If finalize fails with "Document is incomplete," this is the usual cause.

### 3a. A document follows the *supplier's* law, not the recipient's
The single most useful thing to know before anyone plans "global compatibility"
work. Qera is an Indian company, so an invoice to a client in Scotland is an
**Indian export invoice** governed by CGST Rule 46 and IGST s.16. Nothing in UK
law binds what it prints. A foreign recipient may want particular details to
satisfy their own accountant; that is a courtesy, never a legal requirement on
the issuer.

So "valid for a client anywhere in the world" is **not** N jurisdictions. It is
India's rules plus a short set of export-specific fields, listed in
`ROADMAP.md` under the format freeze. The HR documents have **no** global
dimension at all: the employees are in India.

N jurisdictions becomes real only when speclr is sold to suppliers who are not
Indian, because then the customer's own country governs. That is
`PRINCIPLES.md` rule 5, and it is a different problem with a different budget.
**Do not conflate the two.** Making Qera's invoices work worldwide is a week;
making other people's invoices work worldwide is the product.

### 4. Finalized documents are immutable
Once finalized, a document **cannot be edited, overwritten, or deleted** — enforced in the persistence layer and surfaced in the UI (no edit/delete controls appear). Corrections happen by **duplicating as a new draft**. This is the audit-trail guarantee for issued financial records. Drafts, by contrast, are freely editable and deletable.

### 5. The snapshot pattern
At finalize, the document **freezes a copy** of the client (or employee, for HR docs) into a JSONB `snapshot` column. Editing that client/employee later **must never mutate an already-issued document** — the issued invoice reflects the client as they were *at issue time*. Never resolve client/employee data live for a finalized doc; always read its snapshot.

**The studio side is snapshotted too.** Qera's own identity block (the "from:" address, bank, GSTIN, CIN) is editable at `/settings`, so finalize freezes a `studioSnapshot` onto the document as well. Sheets read it via `studioOf(doc)` — snapshot if present, else the `STUDIO_INFO` constant — never the live settings row. This is not a nicety: CGST s.36 requires a tax invoice to be retained unaltered for 72 months, and Rule 46 wants the supplier address *as at issue*. Moving office must not silently rewrite invoices already filed. **If you ever make studio details live again, you have created a compliance bug.**

### 5a. Client `name` vs `companyName`
Two different jobs, deliberately split: `name` is the short reference ("Clayora") used in lists, the client picker and the editor heading; `companyName` is the legal entity name ("Clayora Private Limited") that **documents print**. The form requires `companyName`; the record and the snapshot keep it **optional** so clients and snapshots written before it existed still load, and every sheet prints `companyName || name`.

### 5b. Document text is content, and it is snapshotted too
Every printed *word* that carries meaning — mastheads, the letter subject and acknowledgement, TERMS clauses, the MSA's 24 sections, the signatory block, footer identity lines — is editable per document via `content` (`src/lib/domain/docContent.ts`). Structural labels ("DESCRIPTION", "Subtotal", "GSTIN:", "Queries:") are **not**: they are the document's grammar and Rule 46 expects several of them verbatim.

Two rules keep this safe. **Drafts store only what was edited** — sheets call `contentOf(doc, spec)`, which lays a document's overrides over the type's defaults, so an untouched document prints exactly what it always did and still follows things like the intern/employee wording split. **Finalize materialises the resolved content onto the document** (`materialiseContent`), exactly as `studioSnapshot` freezes the studio identity. Without that, revising `fixedTerms` or `MSA_SECTIONS` next year would silently rewrite documents already issued. Same compliance rule as §5 — if you ever make the sheets read the constants directly again, you have created that bug.

Clearing a content field to empty is an **override**, not a reset: the document prints nothing there. That is the honest reading of an empty input.

### 5c. The MSA clauses live in the database now — and the seam is what keeps that safe

The Master Agreement's clauses moved out of `domain/contract/msa.ts` into a `clauses` table, edited at `/client/clauses`. `MSA_CLAUSES` is now the **seed and the fallback**, not the live source. This was a deliberate, logged deviation (see `PRINCIPLES.md` §7): the text was code-resident *because* content §2 wants it reviewed as one package by an Indian commercial lawyer, and a UI that adds clauses is a way for unreviewed legal text to reach a contract. The library page says so on the page.

Three things hold the line, and none may be quietly undone:

- **A contract copies the library once, when its draft is created.** `NewDocumentRoute` passes `clauseLibrary` to `ContractEditor`, which seeds `content.clauses`. `DocumentRoute` deliberately does **not** pass it — an existing document already carries its own copy, and its test mocks `@/db/store` *without* `listClauses` so a future edit that reaches for the live library fails loudly.
- **`contentOf` is unchanged and must stay pure.** Every sheet calls it per render; it never reads the database. Documents written before the library have no `clauses` override and keep resolving `MSA_CLAUSES` exactly as they always did.
- **Numbers are identity.** Clause bodies cite each other ("has the meaning given at clause 11.2"), so a new clause appends at the next number — claimed server-side, counting past archived rows — and nothing is ever inserted, renumbered or deleted. Archiving is the only removal.

### 5d. The client record is the source of truth, and documents derive from it

A client is onboarded once, through seven steps at `/client/clients/new`, and
every document then reads from that record instead of asking the operator to
remember. The steps are identity, tax & registration, contacts, commercial
terms, services & term, attachments, and delivery & access.

**One form per step, and step 1 creates the row.** Every later step is an
ordinary update through one action (`saveClientSection`), so an interrupted
onboarding needs no draft column and no "resume" concept: whatever was saved is
simply on the client already. The active step is in the URL, because this is a
task people get pulled away from.

**What is typed but not yet saved lives in `sessionStorage`, and the storage
choice is a rule, not a preference** (`src/lib/draft.ts`). A refresh used to
empty the step. It now restores, keyed on the step rather than the section
because Commercial and Services both write `commercial` and would otherwise
share one draft. The draft is cleared the moment its step saves, or the record
would be overwritten by a stale copy of itself the next time the step opened.

`localStorage` was refused for this. These forms hold a third party's PAN,
GSTIN, CIN, registered address and their staff's names, emails and phone
numbers. `localStorage` writes that to disk in plain text, keeps it after
sign-out and on a shared machine, keeps it after `deleteClient` performs the
DPDP Act 2023 erasure, and hands it to any XSS that ever reaches this origin.
`sessionStorage` survives a refresh, the back button and a profile switch,
which is all that was asked for, and dies with the tab. **Do not "upgrade" it.**

**What actually derives from it** — this is the payoff, and the reason the
record exists at all:

| Derived | From | Was |
|---|---|---|
| Place of supply | GSTIN's first two digits, else the address state | Typed per document |
| Invoice due date | `commercial.paymentTermsDays` + issue date | Hand-picked |
| Zero-rating label | SEZ flag, or a recipient outside India | Typed, or forgotten |
| Contract signatory | `contacts.signing` | Printed as a blank rule |

**The identifiers are checked properly, not shape-checked.** `taxIds/india.ts`
verifies the GSTIN's mod-36 check character, agrees its state prefix with the
client's address, agrees its embedded PAN with the PAN on the record, and
matches the PAN's holder-type character against the entity type (a Private
Limited's PAN is a `C`; an individual's on that record is as wrong as a
company's on a person). `taxIds/foreign.ts` does the same for UK VAT (mod-97),
ABN (mod-89) and EIN prefixes. The GSTIN↔address agreement is the load-bearing
one: it is what makes deriving place of supply from a GSTIN safe.

**Three things that are deliberately *not* how they look:**

- **`entityType` is a real column; the four groups are JSONB.** Entity type is
  identity (rule 2) and it validates the PAN. `tax`, `contacts`, `commercial`
  and the two lists follow the `payroll` precedent — nothing queries them, and a
  group keeps the next field migration-free.
- **There is no `country` column and no `onboardingStep` column.**
  `addressParts.country` already says where a client is, and completeness is
  derived from which groups are present (rule 3, both times).
- **The snapshot widened by exactly six optional fields** — `pan`, `cin`,
  `signatory`, `taxIdType`, `taxId`, `tds` — each because a sheet prints it.
  `ClientSnapshot` stays an explicit list rather than freezing whole groups, so
  a future field on `tax` cannot get a free ride onto every invoice. Attachments
  and access references are **not** snapshotted: a document has no business
  freezing a link to a scan of someone's PAN card.

**TDS prints as a memo and never changes the amount billed.** The taxable value
on a GST document is the full consideration; netting the deduction off would
understate the GST return. The memo exists so the smaller payment that arrives
reconciles against the invoice instead of looking short.

**Attachments are a third party's identity documents, and that governs.** Blobs
are stored **private** in Vercel Blob, read back only through
`/api/clients/[id]/files/[fileId]` behind `requireAuthorizedUser`, and the URL
names an attachment id rather than a path — so there is nothing to traverse and
an attachment only resolves for the client it belongs to. The type is **sniffed
from the bytes**, never taken from the browser's claim. Deleting one deletes the
blob, not just the row (DPDP Act 2023 erasure). **Never make these public URLs.**

**A client is deletable only until it has been on a document.** The list offers
delete on every row and the server refuses any client `documents.client_id`
points at — a foreign key already forbids it, so the check exists to turn a
constraint violation into a sentence. It is also right on its own terms: a draft
resolves its client live, and a finalized document is a record retained 72
months (CGST s.36) that a correction duplicates from. The snapshot means an
issued document would *survive* the deletion, but surviving is not a reason to
sever the link. **The attachments go with the row, blobs first** — same erasure
rule as above, and the other order orphans a file nothing points at.

**So offboarding is archiving, and it is the only way a finished client leaves
the list.** `clients.archived` follows the `services` and `clauses` precedent: a
boolean, reversible, hiding the row from the default list and from the **new**
document picker. Three things it deliberately is not. It is **not a soft
delete**: delete still exists, still refuses a client with documents, and still
erases the attachments, because DPDP Act 2023 erasure means the bytes are gone,
not flagged. It **never touches an open document** — `DocumentRoute` passes
every client to the editor while `NewDocumentRoute` filters, so a draft whose
client was archived afterwards still finds them in its own picker rather than
losing the client it was written for (the §5d-ii rule, one level up). And it
**prints nothing**: a finalized document reads its snapshot, and `archived` is
not in `ClientSnapshot`, which is rule 4 working as intended.

**Delivery & access records where a credential lives, never the credential.**
speclr has no secret storage, no envelope encryption and no rotation. A password
typed into that step would sit in plain text in Postgres and in every backup. If
a field there ever starts holding secrets, that is an incident, not a feature.

**The rail form is gone.** `ClientForm` was deleted and both adding and editing
go to the route. Two surfaces writing the same row is how a section quietly goes
missing — a short form that doesn't know about tax registration saves the record
without it. (The rail's own regressions moved to `EmployeeManager.test.tsx`,
which is where `useRecordPanel` still lives.)

**A role stores a choice, never a copy of a person.** At most clients one person
is the day-to-day contact, the one who signs and the one accounts payable
chases. `contacts.roles` records where each secondary role points and
`resolveContact(contacts, key)` performs it on read: rule 3 again, because the
details are derivable. A key **absent** from that map is how the record says
"this role names its own person", stored under `contacts.billing` / `.signing`.
**Every reader must go through `resolveContact`**, and the one that matters is
`clientSnapshotOf`: it used to read `contacts.signing` directly, which is empty
for a role that points at the primary contact, so the contract would have frozen
the blank signature rule this record exists to fix. Tested in
`ContactsStep.test.tsx`.

The two roles do not offer the same choices, and that asymmetry is the domain
rather than an oversight. **Billing may be `'company'`, and that is its
default**: an invoice is addressed to the entity, so naming nobody is the
ordinary case, and it should not have to be expressed as a blank section that
reads like an unfinished form. Naming a person there does not change who is
billed; it means the invoice is *marked for their attention*, which is why
`resolveContact` returning `undefined` for a `'company'` billing role is the
correct answer rather than a missing one. **Signing may not be `'company'`,**
because a company does not hold a pen: somebody signs, and the signature block
prints their name. Its default is the primary contact, which is also the safe
one, since a forgotten signatory prints an empty rule.

There were four roles here once, plus a standalone `invoiceEmail`. Nothing read
`escalation` or that inbox, speclr sends no mail at all, and a billing contact's
email takes `accounts@` as happily as a person's address. A field nobody reads
is a field nobody maintains, so they went. They come back the day something here
actually delivers a document.

**Where invoices are addressed is a company fact, not a contact's.**
`clients.billing_address_parts` (page 1, behind a checkbox) holds the address to
bill when that is not the registered office, and null means the registered one,
which is what most clients will always mean. Two rules hold it: it is **complete
or absent**, because half an address on a tax invoice goes nowhere, and it
**never decides tax**. GST place of supply follows the recipient's registration,
so a client registered in Karnataka whose accounts department sits in Maharashtra
is still a Karnataka supply. `placeOfSupplyOf` reads the GSTIN and the registered
address and must keep doing so.

Neither the billing address nor the Attn line prints yet: they are collected,
validated and frozen-ready, and `ROADMAP.md` holds the change that teaches the
sheets to read them, snapshot included.

### 5d-i. A client is a person or a company, and both are derived

Onboarding assumed every client was incorporated. A freelancer was asked for a
legal entity name, a CIN, an entity type from fourteen company forms, three
contact people and a vendor portal, and was offered a certificate of
incorporation to upload. The flow now has two shapes, and the important thing
is how little of that is stored.

**Two axes, both derived, no new column.**

| Axis | Derived from | Predicate |
|---|---|---|
| Individual vs company | `entityType` | `clientKindOf` / `isNaturalPerson` |
| Domestic vs international | `addressParts.country` | already in use everywhere |

`individual`, `proprietorship` and `sole_trader` carry `naturalPerson: true` in
`ENTITY_TYPES`; everything else is an organisation. A `client_kind` column would
be a second place for a record to say what it is, and a second place for it to
disagree (rule 3, the same reason there is no `country` column). The chooser
screen before step 1 writes `?kind=` into the URL only while there is no row to
derive from; once step 1 saves, the entity type is the answer, and an existing
client never sees the chooser.

**Both choosers are reachable again, and the kind axis is editable after step 1.**
Added 23 August 2026, because a wrong choice was unrecoverable. An Indian sole
proprietor entered as "a company" was stuck: proprietorship is a natural-person
form so the company dropdown never offers it, every move in the flow is a
`router.replace` so the browser's back button leaves the wizard rather than
stepping through it, and the kind is derived from the entity type, so there was
no control anywhere that could change it. The record had to be abandoned and
re-typed. Two fixes, in the two states:

- **Before the first save**, the back arrow renders on step 1 and goes to the
  country chooser, which now has its own back to the kind chooser. Nothing
  unwinds because nothing has been written: both answers live only in the URL.
- **After it**, `IdentityStep` offers `entityTypesForCountry` rather than
  `entityTypesForClient`, so both kinds are listed, and the resolver judges the
  *submitted* entity type instead of the arriving prop. The layout follows the
  selection immediately (`isNaturalPerson` on the field, not the prop), or
  picking Sole Proprietorship would still ask for a legal entity name.

**The country filter is not relaxed with it.** A person is a person anywhere; a
UK sole trader on an Indian address is the wrong record this check exists to
catch. Pinned in `IdentityStep.test.tsx`.

**Six steps, not seven.** `onboardingSteps(kind)` drops Contacts for an
individual: a person is the contact they discuss the work with, the one who
signs and, unless they say otherwise, the one an invoice goes to. What that step
collected which the identity fields do not already say is a **designation** and
an optional **separate billing person**, and both moved to step 1 and are stored
in the existing `contacts` group, so nothing downstream learned a new shape.

**Their name, email and phone are not copied into `contacts.primary`.** They are
on the record already, and a copy goes stale the first time identity is edited.
`clientContact(client, key)` derives them on read and is now what
`clientSnapshotOf` calls. That last part is load-bearing: `resolveContact` alone
would have returned a designation with no name for an individual, and a contract
would have frozen the blank signature rule §5d exists to fix. Tested in
`domain/__tests__/types.test.ts`.

**`companyName` is derived too.** It is required and it is what every sheet
prints (`companyName || name`). A plain individual never sees the field and it
is filled from `name`; a proprietorship or a sole trader types a **trading
name**, and only while the entity type still says they trade under one.

**Three corrections to the original brief, taken deliberately:**

- **The tax step is shrunk, not removed.** Every individual has a PAN (and their
  PAN card is asked for at step 6, so the number belongs on the record); a
  freelancer over ₹20 lakh is GST-registered, at which point Rule 46 requires
  their GSTIN on our invoice and `placeOfSupplyOf` reads it; a client subject to
  tax audit deducts TDS under s.194J. **Only CIN goes** — there is no registrar
  and no certificate.
- **No Aadhaar, anywhere.** Aadhaar Act s.29 and the UIDAI rules restrict who
  may store the number or a copy and for what purpose, and a design studio has
  no authorised purpose. PAN is the appropriate KYC document. Do not add it.
- **Purchase orders and vendor portals are hidden, not deleted.** They are an
  enterprise accounts-payable apparatus. The fields stay on the record, so a
  client reclassified later keeps whatever was saved.

### 5d-ii. What the record knows, the form stops asking

The same rule as §5d-i, applied to four places the international flow was still
offering every country's answer at once. Each one is `PRINCIPLES.md` rule 3 read
as "the country is on the record": the filtering is not a preference, it is the
record deciding.

- **Registration types follow the address** (`taxIdTypesForCountry`). An
  Australian client is offered an ABN and "Other registration", not seven
  identifiers of which six run the wrong check digit against the number typed
  beside them. The EU list is now all 27 member states rather than the dozen
  that were written down; a half-listed union is a client in Greece being told
  their VAT number is "other". **A saved type is always kept in the list**, or a
  record whose address was corrected afterwards would open with the picker blank
  and drop the number on the next save.
- **The requirements follow it too.** A W-8BEN-E is a US IRS form asked for by a
  US payer, and reverse charge is a VAT/GST concept the US does not have. Both
  filter on country, and a box **already ticked always shows**: a client who
  moved country did not stop having asked.
- **A postcode with no town says so.** `readWorld` returns the localities when a
  code covers several (AU 2155 is four suburbs), and the field prints "This
  postcode covers 4 localities" with each as a one-click fill. The old behaviour
  was correct and unreadable: it filled the region, left the town blank, and
  gave the operator no way to tell a postcode with no town from an app that
  dropped one. Capped at twelve, beyond which the code is a district.
- **The town/postcode separator is India's, and only India's.**
  `composeAddress` writes 'Ghaziabad - 201017' but 'Rouse Hill 2155'. A blank
  country still reads as India. That is as far as it goes: line *order* per
  country would be a jurisdiction pack.

**Each document explains itself behind an icon** (`ATTACHMENT_KIND_NOTES`). What
it is, who issues it, why to chase it, what is in it. The foreign two earn it:
an FIRC is the evidence an export was realised and is far harder to obtain a
year after the payment landed, and a W-8BEN-E is what stops a US client
withholding 30%. The icon is a **sibling** of the drop zone, never a child: the
box is already a `role="button"`.

**An access row names itself from the account typed into it**, then its kind,
then its position. Renaming one means editing "What it is" — there is no second
title field to keep in step. Its note is a ghost button until asked for, because
most rows are a name and a vault and nothing else.

**Attachment scoping is one table on two axes** (`ATTACHMENT_SCOPES`), and it
only ever filters what is **offered**. A document already on a record keeps its
label whatever the record later says, which is why nothing was removed from
`ATTACHMENT_KINDS`. Every filter above follows that same rule.

### 5d-iii. A company abroad is the same company, minus the Indian apparatus

The fourth quadrant (company, international) turned out to be mostly already
built: the individual/company axis and the domestic/international axis were
written as independent predicates, so they compose. What was left were five
places where "foreign" had been read as "not a company" or where an Indian
artefact had leaked past the border.

- **Entity types now follow the country, not just the jurisdiction.**
  `entityTypesForCountry` filtered on `jurisdiction` alone, so a client in
  London was offered a US corporation, a UAE free zone and a Singapore private
  limited in one dropdown. That is the §5d-ii bug one field up, and the fix is
  the same shape as `taxIdTypesForCountry`: a `countries` list per row, absent
  meaning everywhere. **The table is deliberately not exhaustive.** A country
  with no row is offered "Other", which is a truer record than a form from the
  wrong register, and adding a row per country would grow this into the
  jurisdiction pack `PRINCIPLES.md` §4 forbids. Nothing computes from a foreign
  entity type: it validates a PAN, and only Indian entities have one.
- **A saved form is kept on offer, but only across the country axis.** A
  Delaware corporation really can be addressed in London. The `keep` parameter
  passes through the country filter and stops at the kind and jurisdiction
  filters, because a person saved as a private limited is the wrong record this
  check exists to catch, and keeping it would be keeping the mistake.
- **The certificate of incorporation crossed the border.** It was scoped
  `{ place: 'india', who: 'company' }` while `ClientRequestChecklist` asked a
  foreign client for "Certificate of incorporation, or local equivalent": two
  files in the repo disagreeing. Every company was incorporated somewhere and
  only the register's name changes, so it is scoped by kind alone now. The
  **cancelled cheque** went the other way and is India-only: it carries an IFSC,
  and a foreign client's remittance runs the other direction anyway.
- **Withholding is one concept in two regimes, and it reuses the TDS fields.**
  A US client withholding under the India-US treaty leaves exactly the TDS
  problem behind, the payment arrives short of the invoice and nothing on the
  invoice says why. So `tdsApplicable` and `tdsRatePercent` serve both, freeze
  into the same `ClientSnapshot.tds` and keep the rule that they never change
  the amount billed. What does **not** travel is the apparatus: `tdsSection`
  names a section of the Income-tax Act 1961 and `tan` is a number the Indian
  department issues to a deductor. Both moved out of `clientTaxSchema`, which
  only ever sees the tax group, and into `clientTaxCrossErrors`, which has the
  country in hand. Both call sites now map over whatever that function returns
  instead of naming three keys, which is how a rule added there had gone
  unenforced on the server until somebody widened a line.
- **`clientSnapshotOf` had a latent bug that branch would have shipped.** `tds`
  froze only when `tdsSection` was set, so a foreign client's withholding memo
  would have frozen as `undefined` and never printed. A section *or* a rate is
  now enough.

**One new field, and it prints.** `tax.registrationNumber` is `cin`'s
counterpart abroad, a separate field from `taxId` because they are separate
numbers: a UK company's Companies House number is not its VAT number, and
typing one into the other runs mod-97 against a value that was never going to
pass. Singapore's UEN happens to be both, so it is typed once into each. It has
**no format rule**, for the reason `taxIds/foreign.ts` gives for its `OTHER`
row, and it prints in the billed-to block as "Company no." because a CIN prints
there and identifying a foreign company by less would be the asymmetry.

**Two things the request checklist asks for that were deliberately not added.**
Governing law and courts is contract content, and the clauses live in the
`clauses` table already, per document and editable, so a `commercial` column
for it would be a second place to disagree with the clause it contradicts. Who
bears the conversion and bank charges is a sentence in a contract, not a fact
about who the client is. Both fail rule 2.

### 5d-iv. The country is asked first, from the whole world

Two changes, and the second is what made the first honest.

**The list is every country now, not a shortlist.** `COUNTRY_SEED` held the
twenty-five Qera might plausibly bill, which is a rule that holds until the
twenty-sixth client and meanwhile means a client in Norway cannot be added at
all. It is the 243 officially assigned ISO 3166-1 codes libphonenumber carries
metadata for, so every row has a working dial code behind it and the address
picker and the phone picker offer the same world. **The names are the ISO short
names, not CLDR's**: these strings compose into the `address` line that prints
on a tax invoice and freezes into a snapshot for 72 months (CGST s.36), so
"Congo - Kinshasa" and "Hong Kong SAR China" are not acceptable spellings of a
recipient's country, ampersands are spelled out and "St." is written "Saint".
`COUNTRIES_BY_CONTINENT` is built from the seed rather than from `phone.ts`, or
a country with no phone metadata would silently vanish from an address form.

**`CountryChooser` asks it on its own page, after the kind and before step 1.**
The country was buried two thirds of the way down step 1 while deciding five
things above and after it: which legal forms `entityTypesForClient` offers,
which registrations `taxIdTypesForCountry` offers, whether a W-8BEN-E and
reverse charge are asked about, which documents are requested, and what the
postcode field is even called. A field that decides that much cannot sit below
most of it.

Three rules, matching the kind chooser's:

- **Nothing is stored.** It rides in the URL as `?country=` until step 1 saves,
  and from then on `addressParts.country` is the answer (rule 3, the same
  reason there is no `client_kind` column). `addressParts.country` is still
  where the value lives; the chooser only seeds it, and an existing client never
  sees the screen.
- **Step 1's country field renders only once there is a record.** On the create
  path the chooser has just asked, so the field would be the same question
  twice, pre-answered, one screen apart. It is **not** removed, because an
  existing client never reaches the chooser and this is the only editor for a
  fact that decides place of supply, which registrations and legal forms are
  offered, what a postcode is called and which documents are requested. A client
  entered under the wrong country has to be fixable.
- **The parameter is validated against the seed, never trusted.** It is a URL
  value that seeds a form field; an unknown code reads as unanswered.
- **Choosing does not advance, and that is the opposite call from
  `KindChooser`.** Two hundred and forty-three targets a click apart is a page
  where the wrong one gets hit, and a wrong click that also changes the page is
  a wrong click nobody notices. Two options are not mis-clicked.

The selection is component state rather than the URL, because a URL that
changed on every click would be a history entry per country looked at, and it
survives the search filter hiding it: narrowing a list must not take back an
answer already given.


### 5e. The design system is enforced by tests, not by convention

`src/__tests__/design-tokens.test.ts` polices colour — no raw Tailwind palette
classes, no hex literals. Its sibling `design-system.test.ts` polices **which
primitive was reached for**, and exists because the failure that actually
happened was not a stray hex code: `ui/date-picker.tsx` says in its own
docstring that it replaces the browser's native date input, and an onboarding
step used `type="date"` anyway. Every rule below is one that was actually
broken:

| Banned outside `ui/` | Use instead |
|---|---|
| `<FieldDescription>` | `FieldInfo` / `InfoTip`, or a placeholder |
| a native date input | `DatePicker` |
| a *visible* `<input type="file">` | `form/UploadDropzone` (the input must be `sr-only`) |
| `register('pan' / 'gstin' / 'tan' / 'cin')` | the matching component in `form/fields.tsx` |
| `.email(` in a component | `emailSchema()` from `domain/fields.ts` |
| `formatDisplayDate` in a file with a `<TableCell>` | `DateCell` from `admin/Page.tsx` |
| a quoted em or en dash used as "no value" | `NIL` from `lib/utils.ts` |
| `status === 'finalized' ? …` as a label | `StatusBadge` from `ui/status-badge.tsx` |
| a `size="icon"` button with no name to announce | `aria-label`, an `sr-only` span, or a wrapper's `label` |

**The last row is the one a person caught before the suite did**, and it is the
general lesson rather than a rule about dates. The dashboard printed a
document's date at full strength; the clients list printed a client's muted, one
page apart. Neither weight was chosen: the second table had nothing to copy
from, so it decided for itself, and the same fact came to look like two
different kinds of fact. **A value that appears in more than one place gets one
component that decides how it looks**, and the rule banning the hand-written
version lands in the same commit. That is `PRINCIPLES.md` rule 1 (used by more
than one caller, so it gets its own home) applied to presentation instead of
data.

Both walk the tree through `src/__tests__/policedSource.ts`, so their exemption
lists cannot drift apart. **When a primitive becomes the house answer for
something, ban the thing it replaced in the same commit** — that is the whole
mechanism, and it is cheap.

The same pass consolidated the two hand-rolled drop zones (the icon tool's and
the UPI QR upload's, whose comment said it "mirrors the icon tool's
UploadDropzone") into one shared `form/UploadDropzone`, which now also serves
client attachments. Its `<input type="file">` is `sr-only` rather than absent:
the styled box is a `role="button"`, but the input is what carries the accept
filter, the file dialog and the change event.

**One layout note that is a real bug fix, not a preference.** `AdminShell` uses
`overflow-clip`, not `overflow-hidden`. A hidden box is still a *scroll
container* — the user cannot scroll it but the browser can, and focusing
anything inside triggers a scroll-into-view that walks up every ancestor scroll
box. That pushed the header off the top of the shell with no way to bring it
back. `clip` creates no scroll container at all. Don't change it back.

**Two more of the same kind, both fixed 23 August 2026, both one property.**
`UploadDropzone`'s preview box needed `min-h-0`: a flex item's `min-height` is
`auto`, so the box was floored at its content's height, a tall scan pushed the
card past `min-h-56`, `h-full` below it resolved to auto, and `overflow-hidden`
never had a definite box to clip against. And `Calendar` needed `relative` on its
root: react-day-picker renders `Nav` as a sibling of the month, and its own
stylesheet, which is never imported here, is what would normally give
`.rdp-months` a positioning context. Without one the arrows resolved against the
popover and sat above and outside the calendar. Both look cosmetic and both are
the same lesson as `overflow-clip`: a layout bug here is usually one property
resolving against the wrong box.

**One rule of the same kind lives in its own file, because it is arithmetic
rather than a grep.** `src/__tests__/contrast.test.ts` parses the OKLCH tokens
out of `globals.css`, converts them and measures every foreground against every
background the app actually puts it on, in both themes. It exists because a
contrast audit performed once is a contrast audit that *was* true once, and
every one of these is a number somebody can change in a single line without
anything looking wrong afterwards.

It found three failures on the day it was written, and all three have the same
shape: **a colour was checked against the wrong background.**
`--muted-foreground` cleared 4.5:1 on white and missed it on `--muted`, which is
where it most often lands (hovered rows, tooltips, muted panels).  `--ring` was
2.59:1 on the light background, under 1.4.11's 3:1 floor, on the one piece of UI
a keyboard user has no fallback for. And white on `--destructive` was 2.89:1 in
dark mode, on the offline bar and on the confirm button of every destructive
dialog, which is what `--destructive-foreground` was added for.

`--border` and `--input` are 1.26:1 on the light background and are deliberately
**not** asserted: 1.4.11 governs boundaries required to *identify* a control,
and every input here is identified by a visible `<Label>` above it. Raising them
would redraw every form as a grid of hard boxes, which is a design decision, not
a compliance one. It is written down in the test rather than silently skipped.

**A field must read its own error whether or not it is about to show it.** That
sentence is a bug fix and the bug was silent. `formState` is a proxy that
subscribes a component to the keys it *reads*, so `errors={showError ?
[fieldState.error] : []}` never subscribed a field that had not yet been left
or filled, and afterwards rendered off a snapshot taken before its error
existed. What that looked like on the tax step: once **any** identifier was
showing an error, none of the others would ever show theirs. React Hook Form
had them all and the form still refused to submit; the reader was simply never
told which field was wrong. Pinned in `form/__tests__/fields.test.tsx`, which
was confirmed to fail without the fix. The general form of the rule is that a
conditional read of a tracked proxy is a conditional *subscription*, and the
condition is almost never the one you meant.

### 5f. A field is declared twice, and only twice

The last two rows of the table above are the same lesson as the first three,
learned on validation instead of layout. The *validators* were already shared:
`PAN_RE`, `gstinError`, `cinError` and `tanError` each existed in exactly one
place. Everything wrapped around them was not, and it had drifted.

**The pair.** `src/lib/domain/fields.ts` holds the rule (`panSchema`,
`gstinSchema`, `tanSchema`, `cinSchema`, `emailSchema`); `src/components/form/fields.tsx`
holds the input, named to match. Rules run on both sides of the wire, so they
stay framework-free next to the validators they call; the inputs are client-only
and own the label, placeholder, length cap, upper-casing, tick and error slot.
Every schema in the app imports the first, every form the second. `IfscField`
and `PhoneField` were already built this way; this is the pattern reaching the
identifiers.

**What the drift had already cost**, in the order it matters:

- **Qera's own GSTIN and CIN were not validated at all.** `studioInputSchema`
  had `z.string().min(1).max(20)` while a *client's* GSTIN was held to its
  mod-36 check character. Ours is the one `studioSnapshot` freezes onto every
  invoice and CGST s.36 keeps unaltered for 72 months, so a transposed pair of
  characters would have been wrong on every document issued until someone
  noticed. Both now run the shared rule.
- PAN's rule was written three times, two different messages, one length cap
  between them.
- Email was written seven times, three different messages.

**Three deliberate shapes, so they are not mistaken for oversights.**

- **Blank-tolerant by default; `required` is passed by the form.** Onboarding
  saves one step at a time against a row that already exists, so a half-filled
  client is a normal state. Required-ness is a property of the form, which can
  explain it, not of the identifier, which would strand rows.
- **`superRefine`, not `.refine`.** The old schemas collapsed every failure into
  one generic line, discarding the specific finding the validator had already
  made. A reader told "the check character does not match" fixes a character; a
  reader told "this GSTIN is not valid" retypes the same fifteen.
- **Cross-record checks stay out.** A PAN's holder type needs the entity type, a
  GSTIN needs the address state and the PAN. Those are on the record, not in the
  field, so they stay in `clientTaxCrossErrors` where the whole client is in
  hand. A client passes `panSchema({ holder: [] })` and that empty array is the
  deliberate half of the split, not an omission.

**What is deliberately *not* a component.** A "Name" or "Notes" input has no
rule to share, and wrapping it would be an abstraction with one behaviour and
one caller. The line is whether the field knows something the caller would
otherwise have to remember.

### 5g. Every text field has a rule now, and the rule is not what stops XSS

§5f closed the *identifiers*. This closed everything else: roughly ninety
fields that were `z.string().trim().max(n)`, which is length and presence and
nothing about content. `src/lib/domain/text.ts` holds the replacements
(`textSchema`, `multilineSchema`, `personNameSchema`, `orgNameSchema`,
`codeSchema`, `httpsUrlSchema`), and `fields.ts` gained the three rules that
were still missing (`phoneSchema`, `ifscSchema`, `upiSchema`).

**Start with what this is not, because the inverse belief is dangerous.**
Neither SQL injection nor XSS is prevented by any of it. Both are already
structurally impossible: Drizzle parameterises every query, and React escapes
every interpolation. A `<script>` typed into a field is stored as those
characters and printed as those characters. **Validation is the second lock.**
If it were the first, the architecture would already be wrong, and a session
that starts "tighten validation so nobody can inject SQL" has the model
backwards and should be told so.

**Invisible is stripped, visible is refused.** That split is the whole design.
A right-to-left override (U+202E) reorders how a line *renders* while leaving
the bytes alone, so an invoice can display one payee and hold another (Trojan
Source, CVE-2021-42574); a zero-width space makes one client into two; a soft
hyphen copied out of a PDF breaks the GSTIN it lands in. None of those are
visible in an input, so none can be found by whoever has to fix them, and they
are removed rather than rejected. A digit in a person's name or a bracket in a
company's *is* visible, so it is refused, with the offending character named.
**U+200C and U+200D are deliberately kept** — ZWNJ and ZWJ are load-bearing in
Devanagari, and stripping them would corrupt a name written in Hindi.

`textSchema` and `multilineSchema` keep every visible character including `<`,
because they back notes and terms clauses where "amounts < ₹5,000" is ordinary,
and React escapes it anyway. Narrow the set where the field has a known shape;
leave prose alone.

**Three gaps this closed that were real, not theoretical:**

- **`phone` was validated only in `PhoneField`.** Every schema behind it was
  `z.string().max(30)`, so a number reaching a Server Action any other way was
  never checked, and it prints on an invoice. The old note called a strict rule
  impossible because it would strand legacy rows; that was wrong on the facts.
  These schemas run on **write, never on read**, so a bad value surfaces an
  error on the field and the save proceeds once it is fixed.
- **`vendorPortalUrl` accepted `javascript:`.** `z.url()` does. Nothing renders
  it as a link *today*, which is the only reason it was not live.
  `httpsUrlSchema` means the obvious next change cannot introduce it.
- **The studio's UPI ID had no rule.** It is the handle a client pays into.

**Autofill is off unless a field asks for it,** defaulted in `ui/input.tsx` and
`ui/textarea.tsx`. Left unset a browser guesses from the field name and offers
the **operator's own** saved profile, and almost every form here describes
somebody else. The exception is `/admin/settings`, which really is Qera's own
organization and passes real tokens. `AddressFields` and `PhoneField` say `off`
explicitly, because a reader would otherwise expect `address-line1` there.

**Headers exist now, and they did not before** (`next.config.ts`): CSP, HSTS,
`nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP/CORP,
and `poweredByHeader: false`. **The CSP has no nonce, and that was measured
rather than assumed.** A nonce policy with `'strict-dynamic'` was built and
tested against a real server: Clerk's script tag carries no nonce (Clerk emits
it, not Next), and `'strict-dynamic'` makes browsers *ignore* the host
allowlist, so enforcing it blocks Clerk and breaks sign-in. `next-themes` emits
a second un-nonced inline script. A nonce also cannot coexist with
`'unsafe-inline'`. So `script-src` allows inline, which gives up a primitive
nothing in this app can reach, and keeps the ones that matter: a host allowlist,
`connect-src` (exfiltration has nowhere to go), and `base-uri 'self'`.

**Enforced by tests, the same mechanism as §5e.** `design-system.test.ts` gained
two rules — a hand-written `z.string().trim()` outside `text.ts`/`fields.ts`, and
a hand-written phone rule — and the walker now polices `.ts` as well as `.tsx`.
`security-headers.test.ts` reads the real config, and `ui/__tests__/autofill.test.tsx`
pins the default. Both were confirmed to fail when the thing they guard is
removed; a rule that matches nothing is a test that passes forever.

### 5h. A Service carries its SAC and its list price

The catalogue at `/client/services` is editable now: a pencil on each card opens
a dialog of five fields (section, title, description, rate, SAC). Four things
about it are decisions rather than defaults.

**The dialog posts five fields; the server reads the row.** A Service also
carries sixty-odd lines of scope, exclusions and client inputs that this screen
never shows, and a form that posted the whole record back would be a form that
could blank what it did not render. `updateServiceDetails` loads the stored row
and overwrites exactly the five. This is safe for the same reason the clause
library is safe: a contract copies a Part when the Service is ticked and freezes
it at finalize, so an edit reaches the *next* contract and nothing already open
or signed (§5c).

**`sacCode` closed the Rule 46 gap on 23 August 2026.** It used to say the code
went nowhere, because invoice lines were free text that no Service fed. They are
not any more: see §5i. All 22 seeded codes sit in the 9983 group, so every one is
18% and the choice between them moves no money, only the heading the supply is
filed under. They are still a proposal for a CA to sign off, and
`seed/services.ts` records the reasoning and names 15 to 17 as the arguable ones.

**`ratePaise` is not the contract's Fee, and it does now reach a document.** The `fee` rows on a Service are
blanks a specific contract fills after a specific negotiation; the rate is what
the studio quotes *from* before there is a contract. Nothing reads it into a
document. What it is *per* is `rateUnitOf(scheduleKey)` and is derived, not
stored: a Retainer is the Schedule under which work recurs monthly (rule 3).

**Re-running `scripts/seed-contract.ts` clears every rate.** Its upsert replaces
`content` wholesale, so anything typed into the dialog goes with it. Always true
of that script; it only started mattering when the screen began to write. That is
also why no rate is written into the seed file.

**One unrelated bug fell out of it.** `service.ts` importing `domain/fields.ts`
put `domain/phone.ts` in the seed script's import graph, and libphonenumber's CJS
build fails its own metadata check on load under `tsx`, taking the process with
it. `COUNTRIES[].dialCode` is a cached getter now, so nothing outside the browser
touches libphonenumber at all.


### 5i. The invoice states its own tax, and does not ask

The last of `PRINCIPLES.md` rule 3's live violations, plus the three CGST Rule
46 statements that were simply absent. Everything here was built on 23 August
2026, before the first invoice was issued, which is what the format freeze in
`ROADMAP.md` is for.

**The bug underneath it all.** `tax.gstin` and the top-level `clients.gstin`
column both held the GSTIN, and nothing reconciled them. Onboarding's Tax step
wrote only the group; `placeOfSupplyOf`, `clientSnapshotOf` and every sheet read
only the column. So a client onboarded through the form read back as
**unregistered**: their invoice printed a PAN where Rule 46(e) requires a GSTIN,
and place of supply silently derived from the address instead of the
registration. `db/mappers.ts` now resolves the two on read as well as write, so
every existing row corrects itself and no migration was needed, and `gstin` was
**removed from `clientInputSchema`** so the identity form stops being a second
writer of a field the Tax step owns. **Never read `tax.gstin` directly outside
onboarding.**

**A domestic supply's tax treatment is not editable.** `gstTreatmentOf`
(`domain/gstTreatment.ts`) composes `placeOfSupplyOf` and `zeroRatingLabel` into
one answer: does GST apply, at what rate, at which place of supply, and is that
the record's to state or the operator's to choose. For an Indian recipient it is
the record's, because none of the three is a preference. Tax on a domestic
supply is charged under CGST s.9 whether or not the invoice says so; the rate
follows how the service is classified, and every catalogue Service is in the
9983 group at 18%; the state follows the recipient's registration. Three fields
each legally wrong to change, left changeable, is the same gap that produced the
wrong place of supply.

Three things about the lock:

- **An SEZ unit is locked; an export is not.** A supply to an SEZ is zero-rated
  *because the client record says the client is an SEZ unit*, so it is as
  derived as a taxed one. An export is not locked because nothing in Indian law
  fixes what a foreign invoice charges, and the recipient's own regime may want
  a line this derivation cannot know about.
- **The override is one switch and it demands a reason** (`gstOverrideReason`).
  Rule 3's stated exception, implemented as written: derived by default,
  override explicit and recorded.
- **The server check is the enforcement.** `gstTreatmentMismatch` refuses the
  finalize; the read-only inputs are a convenience for whoever is typing. A
  read-only input has never stopped anything.

**Line items come from the client record.** Picking a client fills the invoice
with their **retainer** services at their agreed rate (else the catalogue's list
price, since a blank rate on the record means "the catalogue rate" and
deliberately not zero), each carrying the Service's SAC. Only retainers: those
are the lines that are identical every month. A build or an audit is billed
once, on a date nothing here knows, so it is offered on the Add-line menu
instead of assumed onto the document, along with the rest of the catalogue and a
custom row. **The seed only ever fires onto an untouched list**, so changing the
client on an invoice already written cannot throw the writing away.

This is what fired `PRINCIPLES.md` rule 1 on the Service: `contract/service.ts`
moved to `domain/service.ts` in the same commit, before the second consumer was
written. It is also the one place this diverges from the clause library (§5c):
`DocumentRoute` **does** get the catalogue, unlike `ContractEditor`. A contract
freezes a copy of a Part, so a live library there would rewrite a signed
agreement; an invoice line is plain text the operator owns the moment it lands,
and nothing on the document points back at a Service.

**Three Rule 46 statements that were not on the sheet at all**, now content keys
in `docContent.ts` and therefore editable per document and frozen at finalize
(§5b), printing nothing when cleared:

| Key | Rule | Default |
|---|---|---|
| `sacCode` on each `LineItem` | 46(g) | The Service's, or typed |
| `reverseChargeLine` | 46(p) | 'Tax payable on reverse charge: No.', plus an export sentence |
| the last `fixedTerms` clause | 46(q) proviso | 'This is a computer-generated document...' |
| `currencyLine` | not Rule 46 | 'All amounts are in Indian Rupees (INR).' |

Rule 46(q)'s statement is a **TERMS clause** rather than a content key of its
own: a clause with the whole sentence as its `title` and an empty `body`, which
is what prints it bold. It was a line above the footer first, which put a
standing declaration somewhere nobody looks for one and gave it a second route
to being edited. It replaced the invoice's *Suspension* clause, the one term
whose remedy the payment clause and the contract already carry.

The reverse-charge answer is No on everything Qera issues: s.9(3) applies to
notified supplies and design services are not among them, and s.9(4) is a
registered recipient's liability on an *unregistered* supplier's supply, while
Qera is registered. **`ClientTax.reverseCharge` is still read by no sheet**, and
that is deliberate: it records the recipient's own regime, which is a different
question from India's.

**A foreign recipient gets wire details instead of the UPI QR.** `StudioInfo.bank`
gained `accountName`, `swift`, `iban` and `bankAddress`, all optional, all
printed only when `placeOfSupplyStateCode` is '96'. The QR is a UPI intent: no
foreign banking app reads it and the handle cannot receive an inward remittance,
so printing it there would be an instruction that cannot be followed. The IFSC
goes with it. `ibanSchema` verifies the mod-97 check digits for the same reason
the GSTIN's mod-36 is verified: this is where money is being sent.

**The invoice sheet is a fixed A4 frame that clips**, exactly like the slips, and
everything above made it taller. `e2e/invoice.spec.ts` measures both the
domestic and the export case with `worstClip`, and it was confirmed to go red
before it was trusted. Verify any further change to this sheet in a real
browser: jsdom renders every box as zero.

**Jurisdiction stays Ghaziabad for every client, foreign ones included.** Raised
and decided by the user on 23 August 2026, with the trade-off stated: an Indian
court's judgment is difficult to enforce against a company with no assets in
India, which is why exclusive-arbitration clauses are the norm for foreign
clients. The decision is that flying to another country to litigate is the worse
outcome. `DOC_TYPES.INV.fixedTerms` is unchanged; this note exists so the choice
does not read as an oversight later.

### 5j. The credit note is how an immutable invoice gets corrected

Added 24 August 2026, with the two Rule 46/48 markings below it, closing the
last of the compliance gaps found by reading the rules clause by clause.

**The gap it fills is the immutability rule's own consequence.** A finalized
document cannot be edited (§4), and that is right: an issued tax invoice is a
record retained 72 months under CGST s.36. So a mistake, a cancellation, or a
discount agreed after the fact had nowhere to go. "Duplicate it as a new draft"
does not fix an invoice, it issues a *second* one and leaves the first standing
in the return. CGST **s.34(1)** is what the statute provides instead: the
supplier issues a credit note, and s.34(2) lets output tax liability be reduced
by it in the period it is declared.

Four things about `CRN` are decisions, not defaults:

- **Its own series, `QS-CRN-2627-nnn`,** claimed from the same atomic per-FY
  counter as everything else. s.34 wants a credit note to carry a consecutive
  serial number of its own, and Rule 46(b) wants the same of the invoice series,
  so sharing one would break both.
- **It names the invoice it reduces, by number *and* date** (Rule 53(1A)(f)),
  and finalize refuses without both. Picking the invoice copies its lines and
  its whole tax position, because a credit note reverses tax that was actually
  charged: a rate invented here would put a figure in the return that matches
  nothing. Its `defaultFields` start at **0%**, not the studio's usual 18, for
  the same reason.
- **The `againstInvoiceId` is the app's link, never the statute's.** It is kept
  in step with the number exactly as the receipt's is, and it is deliberately
  *not* required: a credit note may lawfully be raised against an invoice issued
  before speclr existed.
- **The figures are positive and "TOTAL CREDITED" is what makes them a
  reduction.** That is how s.34 describes it and how a return reads it. Storing
  negatives would put a negative through `computeTotals`, which is money code
  that has never had to consider one.

Not built, deliberately: a **debit note** (s.34(3), for an increase). It is the
credit note's mirror, Qera has never raised one, and a document type nobody
issues is a document type nobody checks.

**Two markings that were simply missing from the invoice**, both content keys in
`docContent.ts` and therefore editable per document and frozen at finalize (§5b),
printing nothing when cleared:

| Key | Rule | Default |
|---|---|---|
| `exportEndorsement` | 46, third proviso | The prescribed sentence, in capitals |
| `copyMarking` | 48(1) | 'ORIGINAL FOR RECIPIENT' on the invoice; nothing on the receipt |

**The endorsement and `zeroRatingLabel` are two jobs and both print.** The rule
does not ask for a description of the position, it asks for these words:
'SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF
INTEGRATED TAX'. `zeroRatingLabel` explains the position in a sentence a reader
can follow, which is the right thing in the totals column; the endorsement is
what a refund claim under IGST s.16(3) is checked against. Only the **export**
case can be defaulted by `contentOf`, because place of supply 96 is a fact the
document carries: an SEZ supply is zero-rated because the *client record* says
so, and content resolution never reads the client, so `DocumentEditor` seeds
that wording when the client is picked, exactly as it already seeds `gstLabel`.
`zeroRatingEndorsement` and `zeroRatingLabel` branch identically and a test pins
that they agree case for case, because two functions answering "which zero-rated
case is this" is exactly the shape rule 3 exists to stop.

The **receipt gets no copy marking**: Rule 48 governs the tax invoice, and Rule
50's receipt voucher prescribes none.

### 5k. A discount comes off before the tax, and it prints

Added 25 August 2026. The request was for two of them: one off the total
including GST, and one off the subtotal, with neither shown on the invoice.
Both halves of that are refused, and the reasons are the whole of this section.

**Off the gross is not a discount, it is a shortfall.** CGST s.15(3)(a) deducts
a discount from the value of supply only where it is given at or before the
supply *and recorded in the invoice*. Knock 10% off ₹23,600 and the document
still declares ₹3,600 of tax on a sale that collected ₹21,240: the studio remits
tax it never received, and the recipient claims input credit on a price they
were never charged. So `computeTotals` takes the discount off first and charges
GST on `taxablePaise`, and **there is no field anywhere that would take one off
the gross.** The lawful way to discount a document already issued is s.34's
credit note (§5j), which exists.

**Not printing it is the same mistake in a different place.** Rule 46 wants the
taxable value stated "taking into account discount or abatement". A discount the
invoice does not record did not legally happen, and without the row the figure
GST was charged on cannot be arrived at from what the document says. One row
prints between Subtotal and the tax line, carrying the percentage when that is
how it was typed.

**Two fields, one figure.** `discountPercent` and `discountPaise` are two ways
of writing the same thing, so the schema (`oneDiscount`) refuses a document
carrying both and the editor clears one as the other is typed. Both are in the
document's JSONB rather than a column, because nothing queries a discount: what
the lists sort and filter on is `total_paise`, which is already net of it. The
percentage is capped at 100 in the input as well as the schema, and
`discountPaiseOf` clamps to the subtotal, because a negative taxable value would
put a negative through money code that has never had to consider one.

**Three things that follow it.** TDS is computed on the taxable value, so it
follows the discount down: what is withheld is a percentage of what is payable.
A receipt raised from an invoice carries the discount with the lines it
discounted. And a credit note picking an invoice copies it for the same reason
it copies the rate: it reverses tax that was actually charged, and a note
crediting the undiscounted figure would credit more than the invoice ever
billed.

### 6. Intern vs. employee is a legal distinction (not cosmetic)
HR documents branch on `engagementType`:
- The **exit document auto-switches**: an intern gets an **"Internship Completion Letter"**; an employee gets a **"Relieving Letter"**. These are legally different — an intern is never "relieved from services," never "resigned," and internship docs must not contain salary/employment language.
- Offer-letter and other HR wording similarly varies by engagement type.
- Legal-assertion lines (e.g. "no TDS applicable," "dues settled") are **editable**, not fixed boilerplate — because their truth depends on the specific case.

### 6a. The stipend slip and the pay slip are different documents
Two doc types (`STP`, `PAY`), one sheet and one editor (`SlipSheet` / `SlipEditor`), branching on `doc.type` — **not** on `engagementType`.

- A **stipend slip** is a *voluntary* record of a discretionary payment to an intern. Its first clause exists to **deny** an employment relationship.
- A **pay slip** is a *statutory* wage record — Code on Wages 2019, Payment of Wages Act s.13A, and the state Shops & Establishments rules require the employer to keep a wage register and issue a wage slip. So it alone carries **itemised deductions** (`gross − deductions = net`, the Form IV shape), **days worked/paid/LOP**, the **designation**, and the **statutory identifiers** (employee code, PAN, UAN, PF, ESIC) — which are snapshotted onto the slip like everything else in §5.

Why separate types rather than one that adapts: `engagementType` lives in the **frozen snapshot**, so converting an intern to an employee would silently change the legal identity of an open draft. And a wage register wants its own consecutive series — `QS-PAY-2627-nnn`, never interleaved with `QS-STP-…`.

**Each slip offers only its own kind of recipient** — the pay slip picker lists employees, the stipend picker lists interns. That is why neither sheet branches on `engagementType` any more: the slip type *is* the distinction, so `stipendTerms` has one set of (internship) clauses and `payslipTerms` has its own, and the ACCOUNT heading follows `doc.type`. Filtering is the convenience; the finalize guard is the enforcement.

Three guards, all load-bearing:
- **A pay slip cannot be finalized for an intern.** Refused in `finalizeDocument` (the schema can't see the engagement type), warned in the editor.
- **Net pay cannot be negative** at finalize — no lawful deduction leaves an employee owing wages back. The *sheet* still renders a negative net as a signed amount rather than throwing, because the editor previews it live on every keystroke.
- **The pay slip's `deductionsNote` defaults to empty.** The stipend slip's "No statutory deductions (PF, ESI, TDS) are applicable." is a claim about the employee's tax position, and it stops being true the moment TDS u/s 192 does.

**Prescribed figures always print**, even when nil: the deductions table shows a `Nil` row rather than vanishing, and Days paid / Loss of pay always appear (defaulting to the month's length and 0). A blank where a required figure belongs reads as an omission; "0 days" is a statement. A count that was genuinely never recorded prints "—", never a fabricated one.

**PAN is structure-checked, not verified.** Its 4th character encodes holder type (must be `P`, an individual — blocking) and its 5th is the surname's initial (a hint only; real PANs mismatch honestly). We deliberately call **no** verification API: official access is restricted to entity categories a design studio is not in, resellers need business KYC and per-call billing, and none return an address. See `panHolderTypeError` / `panSurnameMismatch`.

**Employee codes are assigned, never typed — and only to employees.** `QS-EMP-001` upward, claimed from the same `counters` table as document numbers (`claimEmployeeCode`), with a partial unique index on `payroll->>'employeeCode'` behind it. **Interns get none**: they are not on the payroll, are never issued a pay slip, and the stipend slip does not print a code, so claiming one would burn a number in the employee series for someone outside it. An intern hired properly gets their first code on that save. **No financial year and no engagement letter in the code**, because a code once held is never reassigned or removed — not on an update, not on reclassification — it is frozen onto every slip already issued to that person (`withEmployeeCode`). This replaced free text, under which two employees came to share `000001`; migrations `0005`/`0006` sorted the existing rows out.

**Pay is quoted the way each engagement is actually quoted.** An employee has an `annualSalaryPaise` (what the offer letter names, what a raise is discussed in); an intern has only `payAmountPaise`, a monthly stipend. `payAmountPaise` is always monthly and is what every *document* reads — **derived server-side** from the annual figure (`withDerivedPay`) so the pair can never drift, with whatever the form sent for it discarded. "Salary" means what the employee is paid, not a CTC inflated by employer contributions: Qera has none to add (PF needs 20+ employees, gratuity five years), so gross and CTC are the same number today. The offer letter follows suit — an employee is offered "a gross annual salary of ₹X, payable in equal monthly instalments and subject to deductions required by law", an intern "a stipend of ₹X per month". Calling a stipend an annual package would frame the internship as employment.

**A slip line prints its description and nothing else.** The free-text `detail` an invoice line carries is collected on invoices and receipts only. On a slip it merely restated the wage period and the deductions note — both of which DETAILS and TERMS already state — and a second copy is one more thing that can disagree with the first. The single exception is the rate × qty working on a line billed by quantity, which is arithmetic the reader needs to check the amount.

**Not built, deliberately**: any payroll *engine*. EPF needs 20+ employees, ESI 10+ and gross ≤ ₹21,000, and UP has no Professional Tax — so for Qera today the only live statutory deduction is TDS. Deductions are a free list of lines.

**The pay slip is not paginated.** It shares the stipend slip's fixed single A4 frame, which *clips*. Earnings and deductions print side by side (the conventional Indian form) precisely so a realistic run fits — roughly 6 earnings against 5 deductions. Beyond that a row is silently cut. If a slip ever needs a second page, flow it through the `Paginator` as the contract and letters already do. **Verify any change to this sheet in a real browser** — jsdom cannot see clipping, and this bug got through the test suite once already.

**That verification has a home now: `npm run test:e2e`.** `e2e/payslip.spec.ts`
pins both sides of the ceiling — 6 earnings against 5 deductions must fit with
nothing hidden, and a crowded slip must still be seen to clip, because that
limit is deliberate and the day it stops being true is the day the slip should
have gone through the `Paginator`. The measurement is `worstClip` in
`e2e/paper.ts`: it walks every `overflow: hidden` ancestor rather than the page
frame alone, because the slip clips at an inner flex column a long way above
the edge of the paper, and measuring the sheet finds nothing at all. The
fixtures render at `/preview/<fixture>`, a route that `notFound()`s in
production.

Worth knowing when the sheet next changes: the real ceiling measured at 9
earnings against 7 deductions, not 6 against 5. The written figure is
conservative, which is the right direction for it to be wrong in.

### 7. Ordinal dates everywhere
Documents show dates as **"10th June 2026"** (ordinal), never `10/06/2026`. Use the `dates` domain helpers; don't format dates ad hoc.

---

## Architecture at a glance

```
form → Zod validate → Server Action → Drizzle → Postgres
```

- **`src/lib/domain/`** — the portable core, lifted ~verbatim from the source project: `money`, `dates`, `amountInWords`, `gstStates`, `registry` (the doc-type spec table + Zod schemas + numbering format), `studio` (Qera's legal constants — CIN, GSTIN, bank, address), `employee`, `hrContent`, `msaBoilerplate` (the 24-clause contract text), `scheduleLetter`, `serviceTemplate`, `types`. **Pure TypeScript, zero UI, zero framework coupling.** Its tests are lifted verbatim and must pass unchanged.
- **`src/db/`** — Drizzle schema + queries + migrations. Relational tables (`clients`, `employees`, `service_templates`, `documents`, `counters`) with JSONB for the doc-type-specific parts. Zod validates JSONB on write.
- **`src/server/actions/`** — Server Actions (documents, clients, employees, services). Each verifies the Clerk session server-side.
- **`src/components/docs/sheets/`** — the **pixel-faithful document sheets**. Pure `data → markup`. Tailwind + `src/styles/print.css` for A4/print. Do not redesign.
- **`src/components/`** — everything else, fresh shadcn (dashboard Table, forms, nav, editors, the Paginator).
- **`src/app/(app)/{client,admin}/`** — the two profiles (see below). `_routes/` holds the route bodies both profiles share; the page files under each profile are thin wrappers that say which one they are.
- **`src/lib/profile.ts`** — which side a thing belongs to, and the one documented seam between them.

---

## The two profiles

speclr is **two applications in one shell**: `/client/…` (contracts, invoices,
receipts, the clients who receive them) and `/admin/…` (the slips and HR
letters, the employees they are about, settings, and every tool). Only one is
live at a time. A switcher under the wordmark moves between them, and so does a
horizontal swipe over the rail. Each profile has its own home, its own nav, its
own ⌘D palette and its own ⌘K search.

**A profile is derived, never stored.** `profileOfDocType` is a rename of the
existing `isHrDocType` — every document type already names either a client or an
employee. So there is no `profile` column, no migration, and no way for a
document to disagree with the side it is filed under (`PRINCIPLES.md` rule 3).

Three things follow, and none of them should be quietly undone:

- **`src/lib/profile.ts` is the backdoor.** The halves are otherwise sealed.
  Anything that ever needs to cross routes through that file, so the seam is one
  place to find rather than a rule scattered through the UI. `listDocuments()`
  is deliberately left unscoped for the same reason; the homes call
  `listDocumentsByProfile`.
- **Wrong-profile URLs behave differently by kind.** `/client/docs/pay-slip`
  404s — a slug under the wrong prefix names nothing and never did.
  `/client/docs/<uuid-of-a-pay-slip>` *redirects* — that names something real
  that merely moved, and these links get emailed and bookmarked.
- **Every pre-split URL still works.** The static ones are declared in
  `next.config.ts`; `/docs/<id>` and friends resolve through
  `_routes/legacyDocs.ts` because only the database knows a document's type. A
  dead link to an issued invoice is not an acceptable cost of a nav change.

The profile you land on is remembered in a `speclr_profile` cookie, and so is
the **exact page** on each side, in `speclr_last_client` / `speclr_last_admin`.
Switching sides and coming back resumes rather than resetting to the dashboard,
search string included, because that is where onboarding keeps its active step.

Three things about that memory:

- **One writer, `RememberLocation`**, from wherever you actually landed. Not the
  switcher's click: the swipe, the Settings link, a legacy redirect and a pasted
  URL all move you too. It is its own component only because it needs
  `useSearchParams`, which must sit under a Suspense boundary.
- **The path is validated on the way in and again on the way out**
  (`isProfilePath`). A cookie is client-writable and `/` feeds this value
  straight to `redirect()`, so without the check it is an open redirect. The
  boundary-character test is the load-bearing half: `/clientele.evil.com`
  passes a naive `startsWith('/client')`.
- **The side you are already on still links to its own home.** That is the
  ordinary "back to the top" affordance; only the side you are not on resumes.

---

## How the Paginator / print pipeline works

The document preview shows **one A4 page at a time in a carousel** (prev/next arrows, page counter, Fit/100% zoom). Under the hood:
- Each sheet exposes its content as a **flat list of atomic blocks** (cover, parties, each clause, signatures…).
- The `Paginator` **measures each block and packs them into fixed A4 page frames**, breaking only *between* blocks — so a clause heading never separates from its body.
- On screen it's a carousel (one page visible); for print/PDF the same blocks flow via real CSS page breaks in `print.css`.
- Sheets stay pure `data → markup`, which keeps a future **server-side PDF renderer** a non-breaking, additive upgrade (deferred — see below).

**jsdom cannot validate this layout** — always verify pagination/print in a real browser.

---

## Decisions already made (do not re-litigate)

- **Next.js, not TanStack Start** — maturity + Vercel + existing Server Actions.
- **Postgres (Neon) + Drizzle, not Redis** — the source used Upstash Redis; Postgres is the right spine for queryable financial records.
- **Clerk, not a shared password** — email allowlist, all invited users full access, **no roles yet** (addable later without rewrite).
- **Documents pixel-faithful; all other UI fresh shadcn** — the sheets are finished, approved, legal artifacts; only their styling system changed (SCSS → Tailwind + print.css). The chrome is where shadcn shines.
- **Sheet styling = Tailwind + a small `print.css` layer** (not a PDF renderer yet).
- **The app is split into two profiles, with the profile in the URL** — see *The two profiles* above. The alternative considered was deriving the profile from the route without changing any URL, which would have been a far smaller diff; carrying it in the path was chosen so a shared link states which side it belongs to.
- **No data migration** — fresh Postgres. The old Upstash test data (incl. a test invoice `QS-INV-2627-001`) was **not** carried over. speclr's first real document starts a clean FY sequence.

## Deferred work → `ROADMAP.md`

The YAGNI list that used to live here (PDF renderer, roles/permissions, payslip
document type, analytics dashboards) now lives in [`ROADMAP.md`](ROADMAP.md)
under *Deliberately deferred*, alongside every other piece of unbuilt work.

This file records **decisions already made**; the roadmap records **work not yet
done**. Keeping deferred items in one place stops the two lists drifting apart.

## Access control (two independent locks — do not weaken)

speclr holds sensitive financial/legal documents. Access is defence-in-depth:

1. **Clerk sign-up is Restricted (invite-only).** The public cannot self-register — accounts exist only if invited/created from the Clerk dashboard. (Set in Clerk → Restrictions. Do not switch back to public sign-up.)
2. **App-level allowlist.** `SPECLR_ALLOWED_EMAILS` (comma-separated) — every protected page/action calls `requireAuthorizedUser()` = valid Clerk session AND allowlisted email. **Fail-closed**: empty allowlist admits nobody. A signed-in but non-allowlisted user lands on `/no-access` (sees zero documents).

**To add a person:** invite them in Clerk *and* add their email to `SPECLR_ALLOWED_EMAILS` (both `.env.local` locally and Vercel for prod). Both locks must pass.

> Verified: a signed-in user whose email is not allowlisted is blocked at `/no-access` with no data access — confirmed in-browser during Phase 3.

## Known issues / watch-list

- **npm audit** flags transitive `postcss`/`sharp` advisories bundled inside Next.js. **Do NOT `audit fix --force`** — it downgrades Next 16 → 9.3.3 (catastrophic). Resolve by upgrading Next when a patch lands.
- **Clerk keys are `pk_test_` (dev instance)** — they only work on `localhost`. Production login needs a Clerk *production instance* + the `speclr.qera.studio` domain configured. A go-live task, not done yet.
- **`SPECLR_ALLOWED_EMAILS` in Vercel** must be kept in sync with `.env.local` (currently `shivanshu@qera.studio,ops@qera.studio`).

---

## Where to look first

- Domain rules unclear? → `src/lib/domain/registry.ts` (the doc-type spec table) and this file.
- Standards / how to work? → `AGENTS.md` + `dev/` checklists.
- Why is it shaped this way? → the extraction design spec (in the source project's `docs/superpowers/specs/`).

---

# 4. PRINCIPLES.md

# PRINCIPLES — speclr

> **This file is enforced, not advisory.** `CLAUDE.md` imports it, so it is in
> context for every session. Where a request contradicts a rule here, the
> assistant states the conflict and proposes the compliant path *before* writing
> code. The user can override — but the override is explicit, and gets recorded.
>
> Relationship to the other docs: `dev/` holds the eight master checklists (the
> production floor). `CONTEXT.md` holds domain rules and decisions already made.
> `AGENTS.md` holds standards. **This file holds the domain-modelling law** — how
> data is shaped, where a fact lives, and what gets separated from what. It sits
> above `AGENTS.md` and below the Legal and Security checklists.

---

## 0. Two corrections that gate everything below

### Bugs are not evidence of insufficient architecture

The place-of-supply invoice bug was **a domain modelling gap, not a scalability
failure**. Place of supply was operator-entered when it was derivable from the
recipient. A globally-architected system with the same operator-entered field
produces the same wrong invoice.

This is load-bearing because the inverse belief — "every bug means not
architected enough" — architects forever and ships nothing. When a bug appears,
the first question is *which of the five rules below was broken*, not *what
layer is missing*.

### Nav churn is a data-model symptom

Repeatedly rearranging the sidebar is the symptom. The cause is that the data
model is still forming, so the navigation has nothing stable to reflect and gets
redecorated instead.

**Nav follows data.** When the graph settles, the moving stops on its own. A
request to rearrange navigation for the third time is a signal to go look at the
model, and the assistant should say so.

---

## 1. The three layers

Everything in the document tool belongs to exactly one of these. The seam
between them is the whole point: **the layering that makes a second country
cheap later is the same layering that makes the India fixes cheap now.** There
is no trade-off being made — the seam is paid for once and serves both.

### Layer 1 — Core. Never changes anywhere on earth.

An issuer. A recipient. A date. A number. Line items with description, quantity
and rate. A total. A lifecycle: draft → finalized → void. Immutability at
finalize. Snapshotting.

That is every invoice in every country. speclr already has most of it, and it is
the part that was built well — integer paise, atomic FY numbering, the snapshot
pattern, the persistence layer's refusal to overwrite a finalized row.

**Core must never mention GST, CGST, SGST, IGST, GSTIN, or a state code.**

### Layer 2 — Jurisdiction pack. Swappable, one per country.

- Which tax fields exist
- How tax is computed
- Which identifier each party needs (GSTIN / TRN / VAT / EIN)
- What must be printed for the document to be legally valid
- Numbering rules (India's April–March financial year is a *jurisdiction* fact,
  not a core one)

### Layer 3 — Presentation. Swappable.

Templates and layout. **Layout knows nothing about tax.** A sheet renders the
tax lines the pack hands it; it does not decide that there are two of them
because the states matched.

---

## 2. The five rules

The decision procedure. Run it in order; the first rule that matches decides.

| # | Question | Answer |
|---|---|---|
| **1** | Used by more than one document type? | Its own library, top level |
| **2** | A fact about *who someone is*? | On the party record |
| **3** | Derivable from other data? | Compute it — never store it as editable |
| **4** | On a finalized document? | Snapshot it, frozen forever |
| **5** | Varies by country? | Jurisdiction pack — never inline |

Rules 3 and 4 are not in conflict. Derive it while the document is a draft;
freeze the derived result at finalize. The frozen copy is the record; the
derivation is how it got there.

### Rule 3 has one legitimate exception, and it must be explicit

Some derivable values have lawful overrides — place of supply genuinely differs
from the recipient's state under CGST s.12(3) (immovable property) and in
bill-to/ship-to cases. The rule is therefore **derived by default, override
explicit and recorded**, never a blank field the operator fills from memory. An
override that leaves no trace of *why* is the same bug wearing a different hat.

---

## 3. The rules applied to speclr — current state

Audited 13 August 2026. This section is the enforcement target; update it when a
row changes.

### Rule 1 — shared records

| Thing | Where it lives | Verdict |
|---|---|---|
| `money`, `dates`, `amountInWords`, `address`, `phone`, `party` | `src/lib/domain/` | Compliant |
| Identifier rules (PAN, GSTIN, TAN, CIN, email, phone, IFSC, UPI) | `src/lib/domain/fields.ts` | Compliant, 15 August 2026 |
| Text rules (name, org, prose, code, URL) | `src/lib/domain/text.ts` | Compliant, 15 August 2026 |
| **Service** | `src/lib/domain/service.ts` | Compliant, 23 August 2026 |

The field rules were the rule fired late rather than broken: the *validators*
were shared from the start, but the zod fragment, message, length cap and
blank-tolerance around each were re-typed per schema, and Qera's own GSTIN was
the one that ended up with none of them. Rule 1 covers the whole rule, not the
predicate at the centre of it. See `CONTEXT.md` §5f.

The second pass found the same shape one layer out, and worse, because here
there was no shared predicate to begin with. Roughly ninety fields were
`z.string().trim().max(n)` — length and presence, nothing about content — so a
person's name accepted a digit, a `<script>` tag and a bidi override that
reorders a printed invoice. Three rules were missing outright rather than
duplicated: **phone** existed only inside `PhoneField`, so every schema behind
it accepted any thirty characters and the number on an invoice was never
checked server-side; **IFSC** had its wrapper written twice with different
blank-tolerance; **UPI** had none at all, on the handle a client pays into.

Both files are now policed by `design-system.test.ts`, which is the §5e
mechanism applied to schemas: writing the rule by hand fails the build. See
`CONTEXT.md` §5g, which also records why none of this is what stops XSS.

A Service was namespaced under `contract/` while contracts were its only
consumer, with the note that rule 1 would fire "the moment a quote, an invoice,
or anything else references a Service". **The invoice is that second consumer**,
and the move was made in the same commit, before the reference was written. It
cost a file rename and six import lines, which is the whole argument for doing
it then rather than later.

Anything referenced by multiple document types is a shared record, not a child
of whichever document type happened to touch it first.

### Rule 2 — party identity

`clients` carries `name`, `companyName`, `address`, `addressParts` (including
`state` and `country`), `email`, `phone`, `gstin`. The identity facts are
present. What is missing is that nothing *normalises* them into the GST state
code the tax layer needs — `addressParts.state` is a display name
('Uttar Pradesh') and `gstin`'s first two digits are the code, and neither is
resolved to one canonical answer.

### Rule 3 — derivation

**Closed, 14 August 2026.** `placeOfSupplyStateCode` was a per-document
`Combobox` the operator picked from memory, when it is derivable from the
recipient — `gstin.slice(0, 2)` for a registered client, `addressParts.state`
through `GST_STATES` for an unregistered one. Two sources of truth for one fact
is what produced a wrong invoice; the constrained picker made it *look* safe,
and a validated wrong answer is still a wrong answer.

It is now derived by [`placeOfSupplyOf`](src/lib/domain/placeOfSupply.ts),
displayed read-only in the editor, and overridable only behind an explicit
switch that **requires a recorded reason** — refused at finalize otherwise
([documents.ts](src/server/actions/documents.ts)). That is the rule 3 exception
implemented as written.

Two supports make the derivation trustworthy rather than merely automatic: the
GSTIN's state prefix is cross-checked against the client's address at
onboarding ([`gstinError`](src/lib/domain/taxIds/india.ts)), and the GSTIN's
own mod-36 check character is verified, so a transposed pair of characters
cannot pass as a different state.

The same pass derived two more: an invoice's **due date** from the client's
payment terms, and the **zero-rating label** for an SEZ or overseas recipient.

**16 August 2026 — the same rule at field scale.** A GSTIN carries the holder's
PAN verbatim at characters 3–12, so a registered client types their PAN whether
they mean to or not, and asking for it twice is asking for the transposition
that makes the two disagree. `TaxStep` now fills PAN from a GSTIN that fully
passes, with the `fill-flash` a pincode already uses, and the field is
**read-only while that GSTIN stands**. That went further than the first pass,
which filled an empty field only and left a typed PAN alone to be reported as a
disagreement. There is no reading of that disagreement where the typed half
wins: characters 3–12 of a GSTIN that passes mod-36 *are* the holder's PAN, so
the honest fix is always to the GSTIN. Break or clear it and the field is
typeable again, keeping what it held. `panHolderTypeError` still runs on the
result, so a company's GSTIN on a record marked individual is still caught.

**17 August 2026 — a fifth derivation, and the request that would have been a
fourth form.** Onboarding was asked to split into four flows: individual or
company, crossed with domestic or international. Rule 3 says otherwise, and it
turned four forms into two predicates. **Individual vs company is already in
`entityType`** — three of its rows are one human being — and **domestic vs
international was already derived** from `addressParts.country` and already
driving `TaxStep`, `entityTypesForCountry` and the attachment slots. So there is
no `client_kind` column, no migration, and nothing that can disagree with the
record about what the record is. `onboardingSteps(kind)` returns six steps or
seven; `clientContact` derives a person as their own contact instead of storing
a copy of their name in `contacts.primary`; `companyName` is filled from `name`
for a person who does not trade under a business name. See `CONTEXT.md` §5d-i.

**16 August 2026 — and one place the rule deliberately does not fire.**
`entityType` is derivable: a CIN's ownership triple states it outright for the
three company forms, and a PAN's 4th character narrows it to a group. Rule 3
read alone says derive it and drop the field. It stays, because deriving it
would cost more than it saves: `entityType` is what `panHolderTypeError` and
`cinEntityTypeError` check *against*, so a type derived from those same
characters agrees with them by construction, and a company's PAN pasted onto an
individual's record stops being detectable. Rule 3 governs a fact the system
knows from *another* source. It does not authorise collapsing two independent
answers into one and calling the agreement a check.

What was built instead is the offer. `entityTypeOfCin` reads the certificate's
answer, `TaxStep` shows it beside the disagreement that already blocks the save,
and `setClientEntityType` writes it only when a person accepts. The stronger
evidence wins by default and still passes through a human, which is the
place-of-supply override run the other way round.

**23 August 2026, the rest of the tax answer and the line items.** Place of
supply was derived; the two fields beside it were not. Whether GST applied was a
switch and the rate was a free number, and for an Indian recipient neither is a
choice: the tax is charged under CGST s.9 whatever the invoice says, and the
rate follows how the service is classified. `gstTreatmentOf`
([gstTreatment.ts](src/lib/domain/gstTreatment.ts)) composes `placeOfSupplyOf`
and `zeroRatingLabel` into one answer, the rail renders it read-only, and
`gstTreatmentMismatch` refuses a finalize that departs from it without a
recorded reason. An **export is deliberately not locked**: nothing in Indian law
fixes what a foreign invoice charges. Same pass, same rule: an invoice's
**retainer line items** now come from `commercial.services` and the catalogue,
where they were re-typed from memory every month, and each carries the Service's
**SAC**.

**And one bug that was rule 3 broken in the other direction.** `tax.gstin` and
the top-level `clients.gstin` column both held the GSTIN and nothing reconciled
them, so a client onboarded through the Tax step read back as *unregistered*:
their invoice printed a PAN where Rule 46(e) wants a GSTIN, and place of supply
silently fell back to the address. Two places holding one fact is the shape this
rule exists to stop; the fix is `db/mappers.ts` resolving them on read as well as
write, and the identity form no longer submitting a field the Tax step owns.

### Rule 4 — snapshotting

Compliant, and the strongest part of the codebase. `snapshot` (client or
employee), `studioSnapshot` (Qera's own identity — CGST s.36 requires the
supplier address *as at issue*, retained 72 months), and `materialiseContent`
(the resolved document wording). See `CONTEXT.md` §5 and §5b.

**Do not weaken.** Making studio details, client details, or document content
read live again on a finalized document is a compliance bug, not a refactor.

### Rule 5 — jurisdiction

**Not built. India is spelled inline through the domain layer.**

| Inline today | File |
|---|---|
| `splitGST` — the CGST/SGST halving | `src/lib/domain/money.ts` |
| `computeTotals(lineItems, gstRatePercent)` | `src/lib/domain/money.ts` |
| GST state codes | `src/lib/domain/gstStates.ts` |
| `requirePlaceOfSupplyWithGst` | `src/lib/domain/registry.ts` |
| `gstRatePercent`, `placeOfSupplyStateCode`, `gstLabel` | `src/lib/domain/types.ts` |
| Tax-line rendering | `src/components/docs/sheets/DocumentSheet.tsx` |
| April–March financial-year numbering | `src/lib/domain/docNumber.ts` |

Two pieces of groundwork already exist and were built with the right instinct:
`countries.ts` is plain data, and `currency.ts` documents honestly *why*
invoices stay INR (a GST document must show tax in INR regardless of billing
currency, and the split is rupee-shaped).

**Target shape:** `src/lib/domain/jurisdiction/` — one interface, one
implementation in `in/`. Core calls the interface and never names GST.

---

## 4. What is explicitly NOT built

Writing India as a pack is roughly 15% more work than writing it inline. That is
the entire budget. It does not authorise any of the following, and a request
that reaches for one should be met with this list:

- **No country selector UI**
- **No second pack** — one interface, one implementation
- **No multi-currency engine** for invoices (see `currency.ts` for why)
- **No VAT or sales-tax logic**
- **No e-invoicing**
- **No payroll engine** — EPF needs 20+ employees, ESI 10+ and gross ≤ ₹21,000,
  UP has no Professional Tax. Deductions stay a free list.

Adding UAE later becomes writing `packs/ae/`. Not a remodel. That is the whole
return on the seam, and it is collected later, not now.

---

## 5. The promise

**Not promisable:** "trust it to be legally compliant" in any country. Rates
change, e-invoicing mandates arrive, formats get revised. Xero and Zoho staff
compliance teams per market. A solo founder underwriting legal correctness
across jurisdictions is a liability, not a feature.

**Promisable, and worth more than it sounds:** the document contains every field
that country requires, correctly computed, with the issuer's own details
verified once at setup.

Marketing copy, UI text, and documentation use the second promise. The assistant
pushes back on the first wherever it appears.

---

## 6. The risk that actually decides this

speclr has zero external users. **The architecture will not kill this project;
the absence of someone other than the founder who wants it might.**

Build the seam because it is cheap. Then go find one person who isn't you.

The assistant is expected to say this out loud when a session drifts into a
third consecutive week of internal refinement with no user on the other end.

---

## 7. How this is enforced

When a request, a plan, or a piece of code conflicts with the above:

1. **Name the rule** and the specific conflict, in one or two sentences.
2. **Propose the compliant path** — usually a smaller diff, not a larger one.
3. **If the user reaffirms, build it** and record the deviation here or in
   `ROADMAP.md`. A logged exception beats a silent one.

Specific standing pushbacks:

- A new tax field, rate, identifier or validity rule written outside the
  jurisdiction seam → rule 5.
- A value the operator types that the system already knows → rule 3.
- A record parented under the first document type that used it → rule 1.
- A finalized document reading anything live → rule 4, and it is a compliance
  bug, not a preference.
- "This bug means we need to re-architect" → §0, first correction.
- A third pass at rearranging navigation → §0, second correction.

### Logged deviations

**23 August 2026 — the place-of-supply override was removed, on instruction.**
Rule 3's stated exception is *derived by default, override explicit and
recorded*, and this was the reference implementation of it: a switch, a
required reason, and a finalize that refused without one. The user asked for it
gone, on the grounds that the code comes from the recipient's registration and
an invoice naming another state is a wrong return rather than a preference.

The conflict was named and the request stands, so it is built and bounded:

- **What it gives up is real but not ours.** CGST s.12(3) genuinely puts a
  supply relating to immovable property in the state the property is in, and
  bill-to/ship-to under s.10(1)(b) does the same. Qera makes neither: it sells
  design services from Ghaziabad. The day it does, this field comes back rather
  than being typed over quietly.
- **The derivation is unchanged and still the only writer.**
  `placeOfSupplyOf` still runs, the field is still read-only, and the effect
  that keeps the stored code equal to it now also **clears any stale
  `placeOfSupplyOverrideReason`** on a draft, or a reason for a departure that
  no longer exists would freeze onto the document at finalize.
- **The column stays.** `placeOfSupplyOverrideReason` is still on
  `baseFieldsShape` and still refused-without at finalize, because documents
  written while the switch existed carry it and a finalized one may not change.

The GST-treatment override (`gstOverrideReason`) is untouched: a supply really
can be exempt, and that is a question about the *supply* rather than about
where the recipient is registered.


**14 August 2026 — a second jurisdiction now sits inline on the client record.**
§4 forbids a country selector, a second pack, multi-currency invoices and VAT
logic by name. Client onboarding asked for all of it. The conflict was raised
with the three reasons behind §4 — the 15% budget, the §5 liability of implying
compliance a field is not wired to, and §6's zero foreign clients — and the user
reaffirmed the request. So it was built, and then bounded:

- **Collected, validated, snapshotted and printed. Nothing computes from it.**
  `taxIds/foreign.ts` holds per-country formats with real check digits (UK VAT
  mod-97, ABN mod-89, EIN prefixes). A foreign client's registration prints in
  the billed-to block exactly where a GSTIN would.
- **The money core is untouched.** `computeTotals`, `splitGST` and `formatINR`
  never learned a second regime, and invoices stay INR for the reason
  `currency.ts` gives. The agreed billing currency is recorded as a commercial
  term and prints nothing.
- **A foreign recipient is treated as India's own rule for one** — a zero-rated
  export of services under an LUT (IGST Act s.16), which is what
  `zeroRatingLabel` prefills into the existing `gstLabel`. No new tax concept
  reached a sheet.

What remains outstanding is unchanged: `ROADMAP.md` §8's jurisdiction seam. The
honest statement of today's position is that a UAE client's TRN is on the record
and no invoice honours it, and making it honoured is that seam's job.

**14 August 2026 — rule 3's live violation is closed.** `placeOfSupplyStateCode`
is now derived from the recipient (`placeOfSupply.ts`) and shown read-only, with
an override that **requires a recorded reason** — enforced in the editor and
refused at finalize. That is rule 3's stated exception implemented as written:
derived by default, override explicit and recorded. The GSTIN's first two digits
are cross-checked against the client's address at onboarding, which is what
makes the derivation trustworthy rather than merely automatic.


**13 August 2026 — the MSA clauses moved into the database.** `msa.ts` said the
28 clauses lived in code *because* content §2 wants them reviewed as one package
with the four Schedules by an Indian commercial lawyer, and a UI that adds
clauses is a way for unreviewed legal text to reach a contract. That was raised
and the user reaffirmed the request, so it was built with the objection carried
into the product rather than dropped:

- The library page states on the page that nothing there has been reviewed.
- New clauses append at the next number, claimed server-side and counting past
  archived rows. Nothing is inserted, renumbered or deleted, because clause
  bodies cite each other by number.
- Rule 4 is untouched and was the condition of building it: a contract copies
  the library once at draft creation and freezes it at finalize, so an edit
  reaches the next contract and nothing already open or already signed. See
  `CONTEXT.md` §5c for the three mechanisms and where each is tested.
