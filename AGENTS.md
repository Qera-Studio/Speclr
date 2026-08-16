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

Stack: **Jest + React Testing Library** (`npm test`).

- Every component and every non-trivial module has tests in a `__tests__/` dir beside it.
- Prefer `screen.getByRole` over `getByTestId` — roles reflect real accessibility.
- Use `userEvent.setup()` (imported statically at the top), not `fireEvent`.
- Test **behaviour visible to users and assistive tech**, not implementation details.
- **Domain-logic tests are lifted verbatim from the source project and must pass unchanged** — they prove the core survived the move. Do not weaken them.
- **jsdom cannot validate print/pagination layout** — verify those in a real browser.

**A task is not complete until:** the code is implemented, tests are written, and `npm test` passes with no failures. If tests fail, fix them before proceeding.

---

## Git workflow

- Never commit directly to `main`. Branch first: `feature/<name>`.
- Commit in small, meaningful steps. Commit/push only when the user asks.
- Commits are authored as the configured repo identity (Qera org member).

---

## When unsure

Ask for clarification instead of guessing. For anything touching money, numbering, immutability, auth, or the legal content of a document — **confirm before changing**. These are the parts where a silent bug becomes a real-world incident.
