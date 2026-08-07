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
- **`src/app/(admin | spec | auth)/`** — route groups.

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
