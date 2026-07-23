# Master Backend, Data & Code-Craft Checklist

> **READ THIS FIRST — what this document is, and the two things it protects.**
> This is the **keystone** of the Qera system: the layer every other doc defers *correctness* to. It protects two intertwined things:
> 1. **Correctness & data integrity** — does the system do the *right* thing with data, *every* time, including when inputs are hostile, the network fails, two things happen at once, and the data is empty/huge/weird? Data bugs are the worst bugs: they're often **silent, and sometimes irreversible** (corrupted or deleted data doesn't come back).
> 2. **Code as craft** — is the code something a senior engineer would be proud of: simple, clear, readable, and easy to change? Not clever — *clear*.
>
> **On elegance (since you asked):** elegant code is **clear, simple, and minimal — not merely short.** The senior's version is usually shorter because it's better-structured and doesn't repeat itself, *not* because it's a clever one-liner. Code golf is the opposite of craft — an unreadable one-liner is worse than five obvious lines. The real skill is **removing the unnecessary** (the wrong abstraction, the dead branch, the premature optimization) until what remains is obvious. **Readability beats brevity; the senior knows which few extra lines buy clarity and which are noise.** Write for the next person to read it — who is usually future-you at 2am.
>
> **On coding with AI (the reality this doc is built for):** AI writes *plausible* code *fast* — which makes correctness discipline **more** important, not less. The research is unambiguous: ~45% of AI-generated code ships with an OWASP Top-10 vulnerability; AI-assisted developers commit 3–4× faster but introduce security findings ~10× as often; and in a controlled trial experienced devs were **19% slower** with AI tools while *feeling* 20% faster. **The single rule:** treat AI output as *an untrusted draft from a fast, confident junior who has never seen your system* — review every line for intent and risk, and never ship code you can't read and explain. (Full discipline in Part E.)
>
> **Purpose:** the single source of truth for backend correctness, data integrity, and code craft across every Qera build — and the discipline for building *with* AI without inheriting its failure modes.
>
> **Status:** v1.2 — synthesised from data-engineering and distributed-systems fundamentals, software-craft practice, and current (2025–2026) research on AI-generated-code failure modes. Fourth-ranked document in the Qera master system; the correctness owner the other docs defer to. **v1.1 added §28 Deployment & Release Safety. v1.2 (checklist-review rev): folded in §29 Frontend Engineering (component architecture, client/server state, data fetching, rendering, code org — replaces a separate frontend doc); +AI-regex/ReDoS failure mode (§21); +system-design item (§13); +version-control workflow (§26).** **Living document — fundamentals are stable; AI-coding tooling and failure patterns move monthly. Review quarterly.**

---

## Master-Doc Precedence Protocol (replicated)

> Canonical copy with worked examples lives in the **Master Security Checklist**. Pasted here verbatim per Rule 1.

### Precedence order (highest wins on irreconcilable conflict)
1. **Legal & Compliance**
2. **Security**
3. **Accessibility**
4. **Data integrity / Backend correctness** ← *this document*
5. **Performance**
6. **SEO / AEO / GEO**
7. **Design & Brand**

### The three rules
1. **Ownership, not repetition.** Each concern's items live in its own doc; others cross-reference.
2. **Resolve before you rank.** Try the technique that satisfies both; only then does the higher-ranked doc win.
3. **Floor is never traded.**

### What rank 4 means in practice
- **Backend correctness sits *above* Performance and SEO and Design:** **correct-but-slow beats fast-but-wrong.** A cache that serves stale data, a denormalization that can drift, or an optimization that loses an update — all lose to correctness. Performance §9 explicitly hands its correctness items here; this doc owns them.
- **Backend is *below* Legal, Security, and Accessibility:** data **retention/deletion law** is owned by Legal (§6/§17) — this doc owns the *technical implementation* of real deletion and retention. **Auth, injection defence, secrets, IDOR/access-control** are owned by Security — but this doc treats "enforce auth and validation server-side" as a **correctness non-negotiable** too, because the classic AI failure (auth in the UI, not the API) is both a security hole *and* a correctness lie. Where they overlap, Security owns the *requirement*; Backend ensures the *implementation is correct and robust*. Accessibility owns accessible data states; backend must be able to *serve* the real states (empty/error/partial).
- **The boundary line, said simply:** **Security asks "can an attacker break in?"; Backend asks "is the data right, always, even with no attacker?"** Both must hold.

---

## How this document is tiered — read before using

Tiering mirrors the client-facing docs. Backend has the **strongest non-negotiable floor** in the system, because its failures are silent and sometimes irreversible: **lose or corrupt data once and no tier matters.** Floor items are marked **(non-negotiable)** and apply to every project at any budget.

> **Tier tags (on every item):**
> - `[Base]` — required for any project that stores or processes data: it's correct, it validates input, it handles errors, it doesn't lose data, and you can read every line. Items marked **(non-negotiable)** apply at any budget.
> - `[Standard]` — robust and maintainable: tests on the critical paths, types, transactions where needed, real migrations, structured logging, idempotent writes. The expected bar for anything beyond a throwaway prototype.
> - `[Premium]` — resilient and scale-ready: comprehensive tests, observability, concurrency-hardened, designed for change and for 10×. High-stakes / payment / multi-user / long-lived systems.
>
> *Prototype caveat: a true throwaway prototype can run on Base. But **"prototype that quietly became production" is the most common origin of disasters** — the moment real users or real data arrive, Standard is the floor. Decide consciously; don't drift.*

> **Verify:** backend is highly testable, so almost every item carries a **Verify:** note — tests, type-checks, lint, `EXPLAIN`, a manual adversarial test (the **"call your own API directly with Postman / curl, bypassing the UI"** test is the highest-value one in this doc). An item isn't "done" until its check passes.

> **Stack addendums:** `[NextJS/Vercel]`, `[Supabase/Postgres]`, `[TypeScript]`, `[Automation/n8n]`.

> **How to use this for a new project:**
> 1. **Model the data first (§1)** — the schema is the foundation; a wrong data model poisons everything above it and is the most expensive thing to change later.
> 2. **Floor (incl. non-negotiables) is automatic** — validate input, handle errors, enforce server-side, don't lose data, read every line.
> 3. **Correct before clever, clear before short** — make it right, make it readable, *then* make it fast (Performance owns fast).
> 4. **Treat AI output as a junior's draft** — Part E discipline applies to every generated line.
> 5. **Verify adversarially** — call your own API directly; feed it empty/huge/malformed input; pull the plug mid-operation.

---

# PART A — DATA INTEGRITY

## 1 — Data Modeling & Schema Design

> The most consequential and most expensive-to-change decisions in the whole system. AI is weakest here — it models the prompt, not the domain, and misses relationships you didn't mention.

- [ ] **Model the real domain, not just the current screen** — entities, relationships, and the rules that actually govern the data; design outlasts any one feature. `[Base]`
- [ ] **Right relationships and cardinality** — one-to-many, many-to-many (with join tables), one-to-one modelled correctly; foreign keys reflect real relationships. `[Base]` **(non-negotiable)**
- [ ] **Normalize by default, denormalize deliberately** — avoid duplicated data that can drift out of sync; denormalize only as a conscious, documented performance choice (and own the sync — cross-ref Performance §8). `[Standard]`
- [ ] **Choose correct data types** — money as integer-cents or decimal (never float), proper date/time with timezone (store UTC), enums for fixed sets, the right text/number sizes. A float for currency is a classic silent corruption. `[Base]` **(non-negotiable: money & time types)**
- [ ] **Stable primary keys** — UUID/ULID or surrogate keys; never key on mutable business data; (and don't expose sequential IDs — cross-ref Security §3 IDOR). `[Base]`
- [ ] **Clear, consistent naming** — tables/columns named predictably; the schema reads like documentation. `[Standard]`
- [ ] **Nullable vs required decided deliberately** — every column's nullability is a correctness decision, not a default. `[Base]`
- [ ] **`created_at` / `updated_at` and soft-delete strategy decided** — audit timestamps; and whether deletes are hard or soft (with the legal deletion requirement in mind — cross-ref Legal §7). `[Standard]`
- [ ] **Schema reviewed before building on it** — changing a data model after data exists is painful; get it right (or close) first. `[Standard]`

---

## 2 — Constraints & Referential Integrity

> Defence-in-depth at the data layer. Constraints in the database are the **last line that holds even when the application code is wrong** (and AI code often is). The DB enforcing a rule beats trusting every code path to.

- [ ] **Foreign-key constraints enforced** — the database prevents orphaned/dangling references; don't rely on app code to maintain integrity. `[Base]` **(non-negotiable)** *(Verify: try to insert a row referencing a non-existent parent — DB rejects it.)*
- [ ] **`NOT NULL` on every column that must have a value** — the DB refuses incomplete data. `[Base]`
- [ ] **`UNIQUE` constraints on what must be unique** — emails, slugs, etc.; prevents duplicates at the source, not just in app logic (which races — §8). `[Base]` **(non-negotiable)** *(Verify: try to insert a duplicate — DB rejects it.)*
- [ ] **`CHECK` constraints for value rules** — quantities ≥ 0, valid enums, sane ranges; invariants the data must always satisfy. `[Standard]`
- [ ] **Sensible defaults** — columns default to a correct value rather than null-by-accident. `[Base]`
- [ ] **Cascade behaviour chosen deliberately** — `ON DELETE CASCADE / RESTRICT / SET NULL` is a real decision; the wrong cascade silently deletes (or orphans) related data. `[Standard]` **(non-negotiable: choose consciously)**
- [ ] **Application validation mirrors DB constraints** — validate in code for good UX *and* at the DB for guaranteed integrity; both, not either. `[Standard]`

---

## 3 — Transactions & Consistency

> When one logical operation spans multiple writes, it must be **all-or-nothing**. The failure mode — half-completed operations leaving inconsistent data — is invisible until it corrupts something downstream.

- [ ] **Multi-step writes wrapped in a transaction** — money moved, related rows created together, inventory decremented + order created: either all succeed or all roll back. The half-completed state is the bug. `[Base]` **(non-negotiable for related writes)** *(Verify: force a failure mid-operation — no partial data remains.)*
- [ ] **Transactions kept short** — don't hold a transaction open across slow I/O or external calls (locks + timeouts). `[Standard]`
- [ ] **Isolation level understood for the case** — know when the default allows anomalies (lost updates, phantom reads) and raise it where correctness needs it. `[Premium]`
- [ ] **Idempotency for operations that can be retried** — a retried payment/submit doesn't double-charge or double-create; use idempotency keys / unique constraints (§8). `[Standard]` **(non-negotiable for payments)**
- [ ] **External side-effects handled carefully** — sending an email or charging a card isn't transactional with the DB; design for the "DB committed but email failed" (and reverse) cases. `[Premium]`
- [ ] **Eventual-consistency boundaries are explicit** — where data is async/eventually-consistent, that's a documented decision, not an accident. `[Premium]`

---

## 4 — Migrations & Schema Evolution

> How the schema changes safely over time. **Never edit a production schema by hand** — that's how data dies. AI agents have run migrations against production by misreading the environment; this section is the guardrail.

- [ ] **All schema changes via versioned migrations** — committed to the repo, run through tooling, never manual clicks in prod. `[Standard]` **(non-negotiable)** *(Verify: schema state is reproducible from migrations alone.)*
- [ ] **Migrations are reversible (or have a documented down path)** — you can roll back a bad change. `[Standard]`
- [ ] **Migrations tested on a copy before production** — never first-run on prod data. `[Standard]` **(non-negotiable)**
- [ ] **Backwards-compatible / expand-then-contract for zero-downtime** — add the new column, backfill, switch code, *then* drop the old — so a deploy never breaks live traffic. `[Premium]`
- [ ] **Destructive migrations gated and backed up** — dropping a column/table is confirmed, reviewed, and preceded by a backup (cross-ref Security §14). `[Standard]` **(non-negotiable)**
- [ ] **Backfills are batched and safe** — large data changes don't lock the table or blow memory. `[Premium]`
- [ ] **Environment is verified before any migration runs** — explicit check that you're pointed at the intended database, not prod-by-accident (the documented AI-agent disaster). `[Standard]` **(non-negotiable)**

---

## 5 — Validation at Boundaries

> Validate **at the edge of your system** — every place untrusted data enters. *(Security owns the security dimension — injection/sanitisation, §4 of Security; Backend owns the correctness dimension — is the data shaped and valued correctly. Both run here.)*

- [ ] **Validate all input server-side, against a schema** — type, shape, range, format; client validation is UX only and is bypassable (call the API directly — §21). Use Zod/Yup/Joi or equivalent. `[Base]` **(non-negotiable)** *(Verify: POST malformed/oversized input directly — server rejects it cleanly.)*
- [ ] **Never trust the client** — IDs, prices, roles, totals from the browser are re-checked/re-derived server-side; the classic AI failure trusts the request body (mass-assignment — cross-ref Security §3). `[Base]` **(non-negotiable)**
- [ ] **Parameterised queries / ORM only** — never string-concatenate input into SQL; AI defaults to insecure concatenation because its training data does (cross-ref Security §4). `[Base]` **(non-negotiable)**
- [ ] **Validate at the trust boundary, then trust internally** — validate once at entry so internal code works with known-good data (clear data flow). `[Standard]`
- [ ] **Reject, don't coerce, ambiguous input** — fail loudly on bad input rather than silently "fixing" it into something wrong. `[Standard]`
- [ ] **Validate external/3rd-party and webhook data too** — data from APIs, webhooks, and automations is also untrusted (cross-ref Security automation, §9 here). `[Standard]`

---

# PART B — BACKEND LOGIC & APIs

## 6 — API Design & Contracts

> The contract between frontend and backend (and between services). Consistency and predictability here prevent a thousand downstream bugs.

- [ ] **Consistent, resource-oriented design** — predictable routes, verbs, and shapes; one convention, applied everywhere. `[Base]`
- [ ] **Correct, meaningful HTTP status codes** — 200/201/204, 400/401/403/404/409/422, 500; not 200-with-an-error-body. Clients depend on these. `[Base]`
- [ ] **Consistent error-response shape** — a single error format (code + message + details); and **no stack traces or internal details leaked** to clients (cross-ref Security §15). `[Base]` **(non-negotiable: no leaked internals)** *(Verify: trigger an error — response is a clean, consistent shape.)*
- [ ] **Pagination on every list endpoint** — never return an unbounded collection; cursor or offset, with a max page size (a top scaling cliff — §25). `[Base]` **(non-negotiable)**
- [ ] **Idempotency for unsafe operations** — POST/PUT that can be retried are safe to retry (§3). `[Standard]`
- [ ] **Return only needed fields** — don't over-fetch and filter client-side (correctness + leakage + perf — cross-ref Security §9, Performance §9). `[Standard]`
- [ ] **Versioning strategy for breaking changes** — a plan so a change doesn't break existing clients. `[Standard]`
- [ ] **Input/output typed and documented** — the contract is explicit (types/OpenAPI), not tribal knowledge. `[Standard]`
- [ ] **HTTP methods semantically correct** — GET is safe/idempotent and never mutates; mutations use POST/PUT/PATCH/DELETE. `[Base]`

---

## 7 — Error Handling & Resilience

> The "bulletproof" core. AI writes the happy path; **the difference between a demo and production is everything that happens when something fails.** Most AI-generated code is missing exactly this.

- [ ] **Every failure path handled** — network errors, timeouts, null/empty results, external-service failures, validation failures; the happy path is the easy 20%. `[Base]` **(non-negotiable)** *(Verify: induce each failure — the system degrades gracefully, no crash, no corruption.)*
- [ ] **Never swallow errors silently** — no empty `catch {}`; errors are handled, logged, or surfaced — never quietly dropped (the bug that hides for months). `[Base]` **(non-negotiable)**
- [ ] **Fail loudly in dev, safely in prod** — surface detail in development; in production show a clean message to the user and log the detail server-side. `[Base]`
- [ ] **Timeouts on every external call** — no call hangs forever; a slow dependency can't take the system down (cross-ref Performance §9). `[Standard]`
- [ ] **Retries with backoff for transient failures** — and only for *idempotent* operations (§3); naive retries on a non-idempotent write double-charge. `[Standard]`
- [ ] **Graceful degradation** — when a non-critical dependency is down, the core still works (cached/fallback) rather than failing entirely (cross-ref Performance §15). `[Premium]`
- [ ] **No unhandled promise rejections / uncaught exceptions** — a process-level safety net + handled async everywhere. `[Standard]`
- [ ] **Errors are actionable** — a logged error tells you *what*, *where*, and *enough context to fix it* (§18). `[Standard]`
- [ ] **User-facing errors are honest and useful** — clear next step, no blame, no jargon, no leaked internals (cross-ref Accessibility §12, Design). `[Base]`

---

## 8 — Concurrency & Race Conditions

> **The thing new developers and AI miss most, because it's invisible in single-user testing and only appears under real load.** Two things happening at once is where "obviously correct" code corrupts data.

- [ ] **Lost-update problem handled** — two simultaneous edits don't silently overwrite each other; use atomic updates, optimistic locking (version column), or row locks. `[Standard]` **(non-negotiable for concurrent edits)** *(Verify: simulate two simultaneous writes — neither is silently lost.)*
- [ ] **Double-submit / double-click protected** — the same action fired twice (impatient user, retry, slow network) doesn't create two records or two charges; idempotency keys + unique constraints (§2/§3). `[Standard]` **(non-negotiable for create/pay)**
- [ ] **Atomic operations over read-modify-write** — `UPDATE … SET count = count + 1` atomically, not read-then-write in app code (which races). `[Standard]`
- [ ] **Check-then-act races closed** — "if not exists, create" guarded by a unique constraint, not just a prior `SELECT` (two requests both pass the check). `[Standard]`
- [ ] **Shared/global mutable state avoided** — especially in serverless where instances are reused; per-request state, no leaking between requests. `[Standard]` **(non-negotiable in serverless)**
- [ ] **Background jobs are idempotent and safe to re-run** — a job that runs twice (retry, overlap) doesn't double its effect. `[Premium]`
- [ ] **Locking used surgically** — where needed, narrowly scoped; over-locking kills throughput (cross-ref Performance). `[Premium]`

---

## 9 — State & Data Flow Correctness

> Where the data lives, who owns the truth, and how it stays consistent across the system.

- [ ] **Single source of truth for each piece of data** — one canonical home; derived/cached copies are clearly derived and have a refresh/invalidation story (cross-ref Performance §8 caching correctness). `[Standard]` **(non-negotiable)**
- [ ] **No stale-data bugs** — caches, client state, and derived values are invalidated/refreshed when the source changes; "why is it showing the old value" is a state bug. `[Standard]`
- [ ] **Optimistic UI updates reconcile with the server** — the UI's guess is corrected by the real result, and rolled back on failure (cross-ref the frontend). `[Standard]`
- [ ] **Data flow is traceable** — you can follow how a value gets from input → store → display; tangled bidirectional flow is where bugs hide. `[Standard]`
- [ ] **Server is authoritative** — the backend, not the client, holds the real state for anything that matters (prices, permissions, balances). `[Base]` **(non-negotiable)**

---

## 10 — Business Logic & Edge Cases

> Correctness lives in the edges. AI handles the typical case; the bug is in the empty, the zero, the negative, the huge, the duplicate, the boundary.

- [ ] **The "empty / zero / one / many / huge" cases handled** — empty lists, zero quantity, single item, pagination boundaries, very large inputs; each is a distinct path. `[Base]` **(non-negotiable)**
- [ ] **Null / undefined / missing handled everywhere** — the most common runtime crash; explicit handling, not optimistic access. `[Base]` **(non-negotiable)**
- [ ] **Boundary conditions checked** — off-by-one, inclusive/exclusive ranges, first/last, min/max, overflow. `[Standard]`
- [ ] **Invariants enforced and documented** — the rules that must always be true ("balance never negative", "order has ≥1 item") are checked, not assumed. `[Standard]`
- [ ] **Numbers, money, dates, timezones handled correctly** — integer/decimal money, UTC storage + local display, DST, rounding rules made explicit. `[Standard]` **(non-negotiable: money/time)**
- [ ] **Negative / malicious / nonsensical inputs rejected** — quantity of -5, a date in year 9999, a 10MB string; validated and rejected (§5). `[Base]`
- [ ] **Business rules live in one place** — not duplicated across endpoints where they drift; one source for "how is total calculated". `[Standard]`

---

# PART C — CODE QUALITY & CRAFT

> The artpiece layer. Verified by reading (review/critique), not just by tests. The goal everywhere: **the next person — usually future-you — understands it immediately.**

## 11 — Readability & Clarity
- [ ] **Names reveal intent** — `activeUsers` not `data2`; a function's name says what it does; you shouldn't need a comment to know what a thing is. `[Base]` **(non-negotiable)**
- [ ] **Functions are small and do one thing** — single responsibility; if you need "and" to describe it, split it. `[Standard]`
- [ ] **Code reads top-to-bottom like prose** — logical flow, early returns over deep nesting, no clever jumps. `[Standard]`
- [ ] **Comments explain *why*, not *what*** — the code says what; comments capture the non-obvious reason, the gotcha, the link to the requirement. Delete comments that just restate the code. `[Standard]`
- [ ] **Consistent formatting (automated)** — a formatter (Prettier/Biome) removes style as a discussion; never hand-format. `[Base]`
- [ ] **No dead code, no commented-out blocks** — delete it; git remembers. Dead code is a lie about what runs. `[Base]`
- [ ] **Magic numbers/strings named** — `MAX_RETRIES = 3`, not a bare `3` three call-sites deep. `[Standard]`

## 12 — Simplicity & Elegance
- [ ] **YAGNI — build what's needed now** — no speculative features, no "might need it later" abstraction; the simplest thing that correctly solves the real problem. `[Base]`
- [ ] **Remove the unnecessary** — the wrong abstraction, the extra layer, the unused option; elegance is what's left after deleting everything that doesn't earn its place. `[Standard]`
- [ ] **Right abstraction level — avoid premature abstraction** — don't DRY two things that are coincidentally similar; a little duplication beats the wrong abstraction. Abstract on the *third* repetition, when the pattern is real. `[Standard]`
- [ ] **Avoid premature optimization** — write it clearly and correctly first; optimise only what's measured to be slow (Performance owns *what's* slow). Clever-but-fast that isn't needed is just clever-and-unreadable. `[Standard]`
- [ ] **Prefer clarity to cleverness** — no unreadable one-liners, no showing off; if a junior can't follow it, it's not elegant, it's a liability. **Shorter only counts when it's also clearer.** `[Base]` **(non-negotiable principle)**
- [ ] **Delete code wherever you can** — the best code is no code; less code = less surface for bugs. `[Standard]`
- [ ] **Composition over inheritance / over-engineering** — flat, composable, simple structures over deep hierarchies and frameworks-for-two-cases. `[Standard]`

## 13 — Structure & Architecture
- [ ] **Separation of concerns** — data access, business logic, and presentation are distinct; logic isn't tangled into UI or route handlers. `[Standard]`
- [ ] **No god-files / god-functions** — large files and 200-line functions are split along real seams. `[Standard]`
- [ ] **Dependencies point in one sensible direction** — stable core, volatile edges; no circular dependencies. `[Premium]`
- [ ] **Predictable project structure** — a newcomer can guess where a thing lives; convention over surprise. `[Standard]`
- [ ] **System designed before built (for non-trivial systems)** — the components, their responsibilities, and how data flows between them are thought through before coding; AI models the prompt, not the system, so the architecture is *yours* to own (the pieces it fills in are only as good as the design they sit in). A quick design sketch (entities, boundaries, data flow, failure points) prevents the expensive rewrite. `[Standard]`
- [ ] **Business logic isolated from framework/vendor** — the core logic isn't so welded to Next/Supabase that it can't be tested or moved. `[Premium]`
- [ ] **One way to do common things** — shared helpers for the recurring patterns (fetching, error handling, auth checks), not re-invented per file. `[Standard]`

## 14 — Maintainability & Adaptability
- [ ] **Loose coupling** — changing one module doesn't ripple unpredictably through others. `[Standard]`
- [ ] **Easy to change** — the most important property; adding the next feature shouldn't require rewriting the last one. `[Standard]`
- [ ] **Configuration over hardcoding** — values that vary (limits, URLs, flags) are config, not buried literals (§23). `[Standard]`
- [ ] **No hidden coupling / spooky action** — behaviour is local and explicit, not dependent on far-away global state. `[Standard]`
- [ ] **The codebase tells a newcomer how to work in it** — patterns are consistent enough to copy correctly. `[Standard]`

## 15 — Consistency
- [ ] **Match the existing codebase** — new code follows established patterns, naming, and structure; consistency beats individual preference (this is also the #1 way to keep AI-generated code from fragmenting the codebase). `[Base]` **(non-negotiable)**
- [ ] **One convention per concern** — one way to fetch, to handle errors, to validate, to name; documented so AI and humans both follow it. `[Standard]`
- [ ] **Consistent patterns are enforced, not hoped** — lint rules / templates / a documented style encode the conventions. `[Premium]`

---

# PART D — VERIFICATION & RESILIENCE

## 16 — Type Safety
- [ ] **TypeScript in strict mode** — `strict: true`; types catch a whole class of bugs before runtime and document intent. `[Base]` **(non-negotiable for TS projects)**
- [ ] **No `any` escape hatches** — `unknown` + narrowing, or a real type; `any` disables the safety you turned on. `[Standard]` *(Verify: lint flags stray `any`.)*
- [ ] **Types generated from the source of truth** — DB types generated (e.g. from Supabase/Prisma), API types shared FE↔BE; types that can't drift from reality. `[Standard]`
- [ ] **Validation and types aligned** — runtime validation (Zod) and static types derived from one schema, so they can't disagree. `[Standard]`
- [ ] **Types model the domain, not just the shape** — distinct types for distinct concepts (a `UserId` isn't just a `string`) where it prevents real mistakes. `[Premium]`

## 17 — Testing
- [ ] **Critical paths have tests** — the flows where a bug costs real money/data/trust (auth, payments, core writes) are covered. `[Standard]` **(non-negotiable for critical paths)** *(Verify: tests exist and pass for the money/data paths.)*
- [ ] **Test the edge cases, not just the happy path** — empty/null/boundary/error cases (§10) are exactly what tests should pin down. `[Standard]`
- [ ] **Tests are meaningful, not vanity** — they assert real behaviour and would actually fail on a real bug; coverage % is not the goal. `[Standard]`
- [ ] **Integration tests for data correctness** — the pieces work *together* (DB + logic + API), where unit tests miss the real bugs. `[Premium]`
- [ ] **E2E tests for critical user journeys** — the whole flow works from the user's side (Playwright/Cypress). `[Premium]`
- [ ] **Tests run in CI and block merge on failure** — automated, not "ran it once locally"; a regression fails the build (mirrors Performance/Accessibility CI gates). `[Standard]`
- [ ] **AI-generated code is tested, not trusted** — since AI writes plausible-but-wrong code, tests are how you *verify* it does what you think (Part E). `[Standard]`

## 18 — Observability & Debugging
- [ ] **Structured, leveled logging** — meaningful logs (not `console.log('here')`) with levels and context; you can reconstruct what happened. `[Standard]`
- [ ] **No secrets / PII in logs** — redact credentials, tokens, personal data (cross-ref Security §6, Legal). `[Base]` **(non-negotiable)**
- [ ] **Error tracking in production** — Sentry or equivalent captures real errors with stack + context; you learn about bugs from the tool, not the customer. `[Standard]`
- [ ] **Enough context to debug** — logs/errors carry request id, user (non-PII), and the inputs needed to reproduce. `[Standard]`
- [ ] **The system is debuggable** — you can answer "what happened to this record at 14:32?" — the difference between a 5-minute fix and a 5-hour one (and AI-generated code you didn't read is *harder* to debug — the skill-erosion trap, Part E). `[Premium]`
- [ ] **Health checks / key metrics where it matters** — know the system is alive and behaving (cross-ref Performance §14). `[Premium]`

## 19 — Defensive Programming
- [ ] **Assume inputs are hostile or malformed** — guard every boundary; the input *will* eventually be weird (§5/§10). `[Base]`
- [ ] **Fail-safe defaults** — on the unexpected, default to the *safe* state (deny, empty, error) not the permissive one (cross-ref Security deny-by-default). `[Base]` **(non-negotiable)**
- [ ] **Null safety throughout** — optional chaining/guards; never assume a fetch returned, a field exists, an array is non-empty. `[Base]`
- [ ] **Assertions / invariant checks on critical assumptions** — fail fast and loudly when an "impossible" state occurs, rather than corrupting onward. `[Standard]`
- [ ] **Resource cleanup guaranteed** — connections, files, listeners closed even on the error path (no leaks). `[Standard]`

---

# PART E — CODING WITH AI

> The distinctive layer, grounded in current research. **AI is the most powerful tool you have and the fastest way to ship a disaster — both are true.** This part is how you keep the speed without inheriting the failure modes.

## 20 — The AI-Coding Operating Discipline

> The mental model that prevents most of the damage below.

- [ ] **Treat AI output as an untrusted draft from a fast, confident junior** — who has never seen your system, mimics patterns from a training set full of insecure code, and is wrong ~half the time on security. Review every line for **intent and risk**, not just "does it run". `[Base]` **(non-negotiable)**
- [ ] **Never ship code you can't read and explain** — if you don't understand it, you can't debug it, secure it, or maintain it. The Moltbook/Enrichlead breaches happened because no human understood the code. **Understanding the code is the job; generating it is the easy part.** `[Base]` **(non-negotiable)**
- [ ] **Spend the saved time on verification (the "recheck-to-code ratio")** — AI saved you four hours of typing? Reinvest it in reviewing, testing, and reasoning about the code — not in shipping four hours more unreviewed features. Velocity without verification is debt, not progress. `[Base]`
- [ ] **Mind the perception-reality gap** — studies show developers *feel* ~20% faster with AI while sometimes being ~19% *slower* once debugging is counted. Don't mistake the feeling of speed for being done. `[Standard]`
- [ ] **Read code to build the skill, don't just generate it** — comprehension is what lets you debug under pressure; generating-without-reading erodes exactly the skill you'll need when it breaks. As a new dev, **this is how you actually become senior** — read and understand every line the AI writes. `[Base]`
- [ ] **Prompt for the standard, not just the feature** — ask explicitly for parameterised queries, input validation, error handling, server-side auth; AI defaults to "make it work", so you must request "make it correct and secure". `[Standard]`
- [ ] **Give the AI the context and the rules** — point it at this system's conventions (the master docs, the codebase patterns) so generated code fits instead of fragmenting (§15). `[Standard]`
- [ ] **Have AI review its own and other code** — a second self-reflection pass ("what's wrong with this, security and correctness?") catches a meaningful share of issues. Use it — then still verify yourself. `[Standard]`
- [ ] **Keep a human approval gate on anything irreversible** — migrations, deletes, deploys, money, permissions. AI agents have dropped production databases and run prod migrations by misreading context; a human reads the command before it runs. `[Base]` **(non-negotiable)**

## 21 — The AI-Coding Failure Modes (the catalogue)

> Each is a real, documented pattern. Check generated code against this list specifically.

- [ ] **Auth/logic on the client, not the server** — the single most common and most dangerous AI pattern: the UI checks permission but the API doesn't. Passes every manual/UI test; fails the instant someone calls the API directly. **(Test: call your own endpoints with Postman/curl, logged out and as the wrong user — §21 of nothing here, the Postman test.)** `[Base]` **(non-negotiable)** *(Verify: direct API call enforces auth/ownership — cross-ref Security §3.)*
- [ ] **Hardcoded secrets / exposed keys** — AI scatters API keys and puts privileged keys in frontend code; AI-assisted commits leak secrets at ~2× the human rate. Check every key's placement (cross-ref Security §7). `[Base]` **(non-negotiable)**
- [ ] **Exposed database / public key with no row-level security** — the "public DB key in the frontend + RLS off = whole database public" pattern (cross-ref Security [Supabase]). `[Base]` **(non-negotiable)** *(Verify: RLS on, anon key can't read others' data.)*
- [ ] **Missing input validation / sanitisation** — the most frequent AI vuln; happy-path code trusts input (§5). `[Base]` **(non-negotiable)**
- [ ] **Insecure-by-default patterns** — string-concatenated SQL, weak/legacy crypto, `eval`, disabled checks — because the training data is full of them. `[Base]` **(non-negotiable)**
- [ ] **Happy-path only — no error handling** — generated code omits the failure paths (§7); the demo works, production breaks. `[Base]`
- [ ] **Hallucinated APIs, methods, and packages** — AI invents functions that don't exist and imports packages that don't exist — and attackers register those hallucinated names ("slopsquatting"); **verify every unfamiliar import is a real, trusted, maintained package before installing** (cross-ref Security §12, §24 here). `[Base]` **(non-negotiable)** *(Verify: each new dependency exists, is reputable, and is the one you meant.)*
- [ ] **Dependency bloat** — AI adds packages liberally; each is attack surface and weight (cross-ref §24, Performance §12). Prefer native; justify each install. `[Standard]`
- [ ] **"Function-level" thinking, missing the whole** — AI writes one correct piece but misses how sessions, permissions, transactions, and environments fit together; **you own the architecture**, AI fills in pieces. `[Standard]`
- [ ] **"Hallucinated bypass" — silently removing a check** — a regenerated block quietly drops an `auth` check or a validation; diff every AI change, don't just accept it. `[Standard]` **(non-negotiable: review diffs)**
- [ ] **Deprecated / outdated patterns** — AI suggests old APIs and superseded approaches from its training data; verify against current docs (cross-ref the verify-don't-assume discipline). `[Standard]`
- [ ] **Vulnerable AI-generated regexes (ReDoS)** — AI frequently emits regexes with catastrophic backtracking (nested quantifiers, overlapping alternation) that a crafted input can hang the CPU on; check generated patterns, prefer linear-time engines (RE2), and cap input length before matching (cross-ref Security §4 ReDoS). `[Standard]`
- [ ] **Over-engineering or under-engineering** — AI builds a cathedral for a shed, or naive code for a hard problem; apply §12 judgement. `[Standard]`
- [ ] **Scaling cliffs** — loads everything into memory, no pagination, N+1 queries; works for 10 rows, dies at 10,000 (§25, Performance §9). `[Standard]`
- [ ] **Inconsistent patterns fragmenting the codebase** — each generation invents its own style; enforce consistency (§15). `[Standard]`
- [ ] **Confident wrong answers** — AI states wrong things with total confidence; **its confidence is not evidence** — verify against reality (docs, tests, the actual run). `[Base]` **(non-negotiable mindset)**

## 22 — What New / Non-Technical Coders Don't Know to Look For

> The invisible concerns — the "you don't know what you don't know" list. These are the gaps between "it works in the demo" and "it works in production", which is *the* gap that closes shut on people.

- [ ] **"Works on my machine / in the demo" ≠ correct** — single-user, happy-path, small-data testing hides concurrency, scale, edge-case, and failure bugs. The demo is the easy 20%. `[Base]`
- [ ] **Data is sacred and often irreversible** — a UI bug is annoying; a data bug corrupts or deletes things that don't come back. Backups, transactions, and constraints exist for this (§2/§3/§4, Security §14). `[Base]`
- [ ] **Two users at once changes everything** — race conditions are invisible solo and corrupt data under real use (§8). `[Standard]`
- [ ] **The frontend is not a security boundary** — anything the browser enforces, the user can bypass; the server is the only authority (§9, Security §3). `[Base]` **(non-negotiable)**
- [ ] **Everything that can fail, will** — networks drop, services time out, inputs are malformed; production is hostile (§7/§19). `[Base]`
- [ ] **Scale breaks naive code** — the query/loop/load that's fine at 10 rows is a disaster at 100,000 (§25). `[Standard]`
- [ ] **State and caching cause "ghost" bugs** — "why is it showing the old value" is a real, common, confusing class of bug (§9). `[Standard]`
- [ ] **Secrets in code = compromised** — a key in the repo (or shipped to the browser) is public; assume leaked (§ Security §7). `[Base]` **(non-negotiable)**
- [ ] **You're responsible for what the AI wrote** — "the AI did it" is not a defence to a breach, a data-loss, or a maintenance nightmare; ownership is yours (§20). `[Base]`
- [ ] **The cost is in maintenance, not the first build** — code is read and changed far more than written; the easy-to-ship-but-unreadable choice is paid back with interest (Part C). `[Standard]`

---

# PART F — OPERATIONS & FUTURE-PROOFING

## 23 — Configuration & Environments
- [ ] **Config separated from code** — environment-specific values in env/config, not literals (§14); 12-factor-style. `[Base]`
- [ ] **Secrets in env / a secrets manager, never in code** — (cross-ref Security §7). `[Base]` **(non-negotiable)**
- [ ] **Distinct dev / staging / prod environments** — with distinct credentials and data; you never test on prod (§4). `[Standard]` **(non-negotiable: separate prod)**
- [ ] **Environment parity** — dev resembles prod enough that "works locally" means something. `[Standard]`
- [ ] **Config validated on startup** — missing/invalid env fails fast and loudly at boot, not mysteriously at runtime. `[Standard]`

## 24 — Dependencies & Supply Chain
- [ ] **Minimal, justified dependencies** — each package is attack surface, weight, and a maintenance liability; prefer the platform/standard library (counters AI's add-everything tendency). `[Standard]`
- [ ] **Every dependency is real, reputable, and maintained** — verified before install (defeats hallucinated-package / slopsquatting — §21); check downloads, maintenance, and that it's the name you meant. `[Base]` **(non-negotiable)**
- [ ] **Lockfile committed** — reproducible installs (cross-ref Performance §12). `[Base]`
- [ ] **Vulnerability scanning + update process** — `npm audit`/Snyk/Dependabot (cross-ref Security §12). `[Standard]`
- [ ] **License compatibility checked** — (cross-ref Legal §16). `[Standard]`

## 25 — Scalability Foundations
> Don't *prematurely* scale — but don't build **scaling cliffs** that force a rewrite at the first sign of success. The cheap foundations below cost nothing now and save you later.
- [ ] **Pagination / limits everywhere** — never load or return an unbounded set (§6); the #1 cliff. `[Base]` **(non-negotiable)**
- [ ] **No N+1 queries** — fetch in batches/joins, not in loops (§ Performance §9 owns the speed; correctness/clarity here). `[Standard]`
- [ ] **Indexes on what you query** — (cross-ref Performance §9). `[Standard]`
- [ ] **Stateless request handling** — no per-user state in process memory (breaks in serverless/multi-instance — §8). `[Standard]` **(non-negotiable in serverless)**
- [ ] **Don't load everything into memory** — stream/paginate large datasets; the "read the whole table into an array" pattern dies at scale. `[Standard]`
- [ ] **Heavy/slow work moved off the request path** — queues/jobs for the expensive stuff (cross-ref Performance §9/§15). `[Premium]`
- [ ] **Scale is designed for, not over-built** — the foundations above, not a premature microservices/k8s cathedral for a site with 100 users (right-size — Consultant Layer). `[Standard]`

## 26 — Documentation & Reproducibility
> Ties to the solo-to-team goal: the system must be runnable by someone who isn't you.
- [ ] **README that actually gets a newcomer running** — setup, env, run, test, deploy; the difference between onboarding in an hour vs a week. `[Standard]`
- [ ] **The non-obvious decisions documented** — *why* this architecture, *why* this trade-off; the context that's lost otherwise (future-you forgets). `[Standard]`
- [ ] **Setup is reproducible** — one documented path from clone to running; no tribal "oh you also need to…". `[Standard]`
- [ ] **API/contract documented** — so the frontend (and future devs) don't reverse-engineer it (§6). `[Standard]`
- [ ] **Runbooks for the scary operations** — deploy, rollback, restore-from-backup, rotate-secrets written down before you need them at 2am (cross-ref Security §13/§14). `[Premium]`
- [ ] **Version-control workflow that scales past one person** — meaningful commits (small, focused, message says *why*), a branching model (feature branches off main; no committing straight to prod), and **pull-request review before merge** — even solo, a PR is where the CI gates and AI-diff review (§17, Part E) run. The discipline that lets a future team contribute without chaos. `[Standard]`
- [ ] **Never commit secrets or large binaries; `.gitignore` from commit one** — (cross-ref Security §7); git history is forever. `[Base]` **(non-negotiable)**

## 27 — Technical Debt Management
- [ ] **Debt taken on consciously and noted** — a `TODO`/issue with the *why*, not silent corner-cutting; conscious debt is fine, hidden debt compounds. `[Standard]`
- [ ] **Boy-scout rule** — leave touched code a little better than you found it; counters the entropy AND the AI-fragmentation drift. `[Standard]`
- [ ] **Refactoring is part of the work, not a someday** — (industry refactoring rates dropped sharply as AI velocity rose — that's the debt crisis; don't join it). `[Standard]`
- [ ] **Dead code and abandoned experiments removed** — (§11); they rot and mislead. `[Standard]`
- [ ] **"Prototype → production" is a conscious promotion** — when a prototype gains real users/data, it gets the Standard-tier pass it skipped (the most common disaster origin). `[Standard]` **(non-negotiable: don't let prototypes drift into prod)**

## 28 — Deployment & Release Safety

> Every deploy can fail in ways your tests didn't catch — config drift, an unmigrated table, a dependency that behaves differently in prod. The goal is to make **a bad deploy a load-balancer flip, not a fix-forward-under-pressure scramble** — that's how a 5-minute outage stays 5 minutes instead of becoming 5 hours.

- [ ] **A tested rollback path exists before you deploy** — you can revert to the last good version quickly and have *actually verified it works*; "we'll fix forward" is not a rollback plan. `[Standard]` **(non-negotiable)** *(Verify: perform a rollback in staging — it works.)*
- [ ] **Safe deployment strategy chosen** — blue-green (two environments, flip the load balancer), canary (route a slice of traffic first), or rolling with a tested rollback; pick one appropriate to the stakes, don't deploy in-place with no escape. `[Standard]`
- [ ] **Deploy is gated on the CI checks passing** — lint, types, tests, and security/perf gates are green before a deploy can happen (§17, Consultant Layer); a red build never reaches prod. `[Standard]` **(non-negotiable)**
- [ ] **Migrations and code deploy compatibly** — expand-then-contract so the new code and old schema (and vice-versa) coexist during the rollout; a deploy never depends on an instantaneous schema+code swap (§4). `[Premium]`
- [ ] **Post-deploy smoke test** — an automated or quick manual check that the critical paths actually work in prod immediately after deploy, so you catch a bad release in minutes, not from a customer tweet. `[Standard]`
- [ ] **Deploys are observable** — error-rate, latency, and 5xx are watched right after a release so a regression triggers a rollback decision fast (§18, Performance §14). `[Standard]`
- [ ] **Feature flags for risky changes** — decouple deploy from release; ship dark, enable gradually, kill instantly without a redeploy. `[Premium]`
- [ ] **Database changes are backed up before destructive deploys** — (§4, Security §14). `[Standard]` **(non-negotiable for destructive changes)**
- [ ] **Rollback runbook written and reachable** — the steps to revert (code + data) are documented before you need them at 2am (§26). `[Standard]`

---

## 29 — Frontend Engineering

> *Folded in here rather than given its own doc.* Frontend's **quality attributes** are already owned elsewhere — speed by Performance, a11y by Accessibility, UI/brand by Design, and general code craft by Part C above. This section owns the **engineering core** that those don't: component architecture, client state, data fetching, rendering boundaries, and frontend code organization. Framework specifics live in the `[React/NextJS]` addendum below.

### Component architecture
- [ ] **Small, single-responsibility, composable components** — a component does one thing; "god components" with 300 lines and ten responsibilities get split (§11/§12 applied to UI). `[Standard]`
- [ ] **Separate logic from presentation** — business/data logic lives in hooks/utilities, not tangled into JSX; presentational components stay dumb and reusable. `[Standard]`
- [ ] **Reusable logic extracted into custom hooks** — shared behaviour (fetching, forms, subscriptions) is a hook, not copy-pasted across components. `[Standard]`
- [ ] **Props are typed and minimal** — clear contracts, no prop-drilling five levels deep (lift state or use context/a store instead). `[Standard]`

### Client state management (the most-misused area)
- [ ] **Pick the right state location deliberately** — local (`useState`) → lifted → context → global store; reach for the *smallest* scope that works. Over-globalised state is a top frontend smell. `[Standard]`
- [ ] **Server state is not client state** — data from the backend (lists, records) belongs in a server-cache library (React Query / SWR / RTK Query), **not** dumped into a global UI store; conflating the two causes stale-data and sync bugs (cross-ref §9 single-source-of-truth). `[Standard]` **(non-negotiable distinction)**
- [ ] **Loading, error, and empty states handled for every async view** — not just the success path (cross-ref §7, §10, Accessibility §12, Design §18). `[Base]` **(non-negotiable)**
- [ ] **Cache invalidation is intentional** — server-cache is refreshed/invalidated on mutation so the UI doesn't show stale data (cross-ref §9, Performance §8). `[Standard]`
- [ ] **A global store (Zustand/Redux/Jotai) only when justified** — genuinely shared cross-tree UI state; not as a dumping ground. Don't reach for Redux for what `useState` solves. `[Standard]`

### Data fetching & rendering
- [ ] **Fetch on the right side of the server/client boundary** — server-render/server-fetch what should be server (secrets, heavy data, SEO content); client-fetch what's interactive. Understand RSC/SSR/CSR for the framework (cross-ref Performance §6, Security/Backend server-client boundary). `[Standard]`
- [ ] **No fetch waterfalls; parallelize independent requests** — (cross-ref Performance §6). `[Standard]`
- [ ] **Optimistic updates reconcile with the server and roll back on failure** — (cross-ref §9). `[Standard]`
- [ ] **Hydration is correct** — no server/client markup mismatch; interactive state survives hydration (cross-ref Accessibility React addendum). `[Standard]`

### Forms & frontend code organization
- [ ] **Client validation for UX, server validation for truth** — never trust client validation as the security/correctness boundary (cross-ref §5, Accessibility §12). `[Base]` **(non-negotiable)**
- [ ] **Feature-based code organization** — colocate component + hook + styles + test by feature, not scattered by file-type, once the app grows. `[Standard]`
- [ ] **Quality attributes deferred to their owners** — performance (Performance), accessibility (Accessibility), visual/brand (Design) are not re-litigated here; this section assumes you apply those docs to the frontend too. `[Base]`

---

## Stack Addendums

### [NextJS/Vercel]
- [ ] **Server/client boundary correct** — secrets and privileged logic in Server Components / Route Handlers / Server Actions, never shipped to the client (cross-ref Security/Performance). `[Base]` **(non-negotiable)**
- [ ] **Server Actions & Route Handlers each enforce auth + validation themselves** — they're public endpoints; don't assume the calling page checked (the "auth in UI not API" trap — §21). `[Base]` **(non-negotiable)** *(Verify: call the action/route directly.)*
- [ ] **Data fetching parallelised, not waterfalled; cached intentionally** — (cross-ref Performance §6/§8); understand Next's caching so you don't serve stale data. `[Standard]`
- [ ] **No leaking server data into the client bundle / RSC payload** — return only what's needed. `[Standard]`
- [ ] **Environment checked before destructive ops** — esp. with any agentic/CLI tooling (§4). `[Standard]` **(non-negotiable)**

### [Supabase/Postgres]
- [ ] **RLS enabled on every table + ownership policies** — the correctness *and* security backbone; without it the anon key reads everything (cross-ref Security [Supabase]). `[Base]` **(non-negotiable)** *(Verify: as user A, can't read B's rows.)*
- [ ] **`service_role` key server-side only** — it bypasses RLS (cross-ref Security). `[Base]` **(non-negotiable)**
- [ ] **Migrations versioned; types generated from the schema** — schema reproducible, types can't drift (§4/§16). `[Standard]`
- [ ] **Constraints + FKs used (don't rely on app code or RLS alone for integrity)** — (§2). `[Base]`
- [ ] **Connection pooling (Supavisor) for serverless** — (cross-ref Performance §9). `[Standard]`
- [ ] **DB functions/RPC are `security definer`-audited and transactional** — (cross-ref Security [Supabase], §3 here). `[Premium]`

### [TypeScript]
- [ ] **Strict mode; no `any`; types from source of truth** (§16). `[Base]` **(non-negotiable: strict)**
- [ ] **Runtime validation (Zod) at boundaries, inferring static types** — one schema, both guarantees (§5/§16). `[Standard]`
- [ ] **No unsafe casts (`as`) papering over real type errors** — fix the type, don't silence it. `[Standard]`

### [Automation/n8n]
- [ ] **Workflow data validated like any untrusted input** — webhook/automation payloads are untrusted (§5, Security automation). `[Base]` **(non-negotiable)**
- [ ] **Idempotent workflow steps** — re-runs/retries don't double-effect (§8). `[Standard]`
- [ ] **Error handling + alerting on failed runs** — a silently failed automation is a silent data bug. `[Standard]`
- [ ] **No secrets in nodes/logs; least-privilege connections** — (cross-ref Security [Automation]). `[Base]` **(non-negotiable)**
- [ ] **Loop/cost guards** — a runaway workflow can't hammer an API or rack up cost (§7). `[Standard]`

---

## Consultant Layer — Tooling & Right-Sizing

> Core principle, like the others: **right-size.** A throwaway prototype doesn't need E2E tests and observability; a payment system does. Under-engineering a real system and over-engineering a toy are both failures.

### Adopt now (free, foundational)
- **Formatter + linter:** Prettier/Biome + ESLint (with rules) — style and a class of bugs, automated. `[Floor]`
- **TypeScript strict** + **Zod** (validation↔types). `[Floor]`
- **Git + lockfile + `npm audit`/Dependabot** (cross-ref Security/Performance). `[Floor]`
- **An ORM/query builder** (Prisma/Drizzle) for parameterised, typed queries. `[Floor]`
- **Error tracking:** Sentry (errors + context). `[Floor]`

### Adopt when the project is real (`[Growth]`)
- **Testing:** Vitest/Jest (unit/integration) + Playwright (E2E on critical journeys); run in **CI** as a merge gate.
- **Migration tooling** (Prisma Migrate / Supabase migrations) — versioned, reviewed.
- **CI/CD** with the lint + type + test + (security/perf) gates wired in.
- **SAST/secret-scanning in CI** (catches the AI-velocity vulns before prod — gitleaks, Snyk; cross-ref Security).
- **Staging environment** mirroring prod.

### Adopt at scale / high stakes (`[Enterprise]`)
- **Observability/APM** (Datadog/Grafana), **load testing** (k6), **read replicas / queues**, **feature flags**, **DB monitoring** — only when scale or stakes justify operating them (cross-ref Performance Consultant Layer).

### The AI-coding toolchain specifically
- **A project rules/standards file** the AI assistant reads (point it at these master docs + codebase conventions) so generated code fits and follows the security/correctness baseline.
- **Diff review discipline** — read every AI diff; never bulk-accept.
- **Self-review prompts** — have the model critique its own output for security/correctness before you review.
- **The Postman/curl adversarial test** — the cheapest, highest-value check you own (below).

**Bottom line:** AI makes the *generation* of code nearly free, which moves all the value to the parts it's bad at — **architecture, correctness, verification, and judgement.** That's where a real engineer's time goes now, and it's the moat. Use AI to write more; spend the saved time making sure it's *right*.

---

## Maintenance Schedule

> Code and data systems rot: dependencies age, debt accrues, AI-generated drift fragments the codebase, prototypes silently become production.

### Per-project (build → ship)
- [ ] Data model reviewed before building on it (§1)
- [ ] Critical-path tests + types + lint green in CI (§16/§17)
- [ ] The adversarial pass run (direct API calls, empty/huge/malformed inputs, induced failures)
- [ ] Every AI-generated line read, understood, and diff-reviewed (Part E)
- [ ] "Prototype → production" promotion done consciously if it gained real users/data (§27)

### Monthly
- [ ] Dependency vulnerability scan + updates (§24, Security §12)
- [ ] Error-tracker review — what's actually failing in prod (§18)
- [ ] New code matches conventions; AI-drift caught (§15)
- [ ] Backup restore spot-check for anything holding real data (Security §14)

### Quarterly
- [ ] **Refactoring pass** — pay down the noted debt; don't let it compound (§27)
- [ ] **Schema & data-integrity review** — constraints still match the rules; no drift in denormalized data (§2/§9)
- [ ] **Test suite health** — still meaningful, still green, still covering the critical paths (§17)
- [ ] **This checklist + the AI-failure-mode list reviewed** — the AI-coding patterns move fast; update them (Part E)
- [ ] **Documentation currency** — README/runbooks still get a newcomer running (§26)

### Annually
- [ ] **Architecture review** — does the structure still fit the system as it grew (§13)?
- [ ] **Dependency / stack currency** — prune, update, retire (§24)
- [ ] **Disaster drill** — actually restore from backup; run the runbook (§26, Security §13/§14)

---

## Notes

### Verification Toolbox
| Need | Tool / method |
|---|---|
| Style + a class of bugs | Prettier/Biome + ESLint |
| Type correctness | TypeScript strict + `tsc` |
| Runtime validation | Zod/Yup/Joi at boundaries |
| Unit/integration | Vitest/Jest |
| E2E critical journeys | Playwright/Cypress |
| Query plans / N+1 | `EXPLAIN ANALYZE`, query logs |
| **Adversarial API test** | **Postman/curl — call your own endpoints directly, logged-out and as the wrong user** |
| Errors in prod | Sentry |
| Dependency CVEs / secrets | `npm audit`/Snyk, gitleaks |
| AI-code review | Diff review + self-critique prompt + tests |
| Reference | the other six master docs (Security/Performance/Legal/etc.) |

### The 6 tests that catch the most real-world damage
> If a deadline forces triage, run these — they map to the failure modes that actually take systems down.
1. **Call your own API directly (Postman/curl), logged out and as the wrong user** — does auth/ownership hold without the UI? (Catches the #1 AI security hole.)
2. **Swap an ID** — request another user's record by changing the ID (IDOR — Security §3).
3. **Feed it the edges** — empty, null, zero, negative, huge, duplicate, malformed input.
4. **Pull the plug mid-operation** — kill a multi-step write; is the data consistent (transaction) or half-done?
5. **Fire it twice fast** — double-submit; one record or two?
6. **Read every line the AI wrote** — can you explain what it does and why? If not, you can't ship it.

### Deprecated & Anti-Patterns (do NOT do)
| Practice | Why it's wrong | Instead |
|---|---|---|
| Auth/permission logic only in the UI | Bypassed by calling the API directly; the #1 AI breach pattern | Enforce server-side on every endpoint |
| Shipping AI code you don't understand | Can't debug/secure/maintain it; caused real breaches | Read every line; treat as a junior's draft |
| Float for money | Silent rounding corruption | Integer cents / decimal |
| String-concatenated SQL | Injection (AI's default) | Parameterised queries / ORM |
| Trusting client input (prices, roles, IDs) | Mass-assignment, tampering | Re-validate/derive server-side |
| Empty `catch {}` / swallowed errors | Bugs hide for months | Handle, log, or surface — never drop |
| Happy-path-only code | Breaks in production | Handle every failure path |
| No transaction on related writes | Half-completed, inconsistent data | Wrap in a transaction |
| Read-modify-write in app code | Race conditions, lost updates | Atomic DB updates / locking |
| Unbounded queries / load-all-into-memory | Scaling cliff | Pagination + limits + streaming |
| Hardcoded secrets / keys in frontend | Public = compromised | Env / secrets manager, server-side |
| Hand-editing the production schema | Data death | Versioned, tested migrations |
| Installing AI-suggested packages unverified | Hallucinated/slopsquatted deps | Verify each is real, reputable, intended |
| Bulk-accepting AI diffs | Hides silently-removed checks | Read every diff |
| Coverage-% as the goal | Vanity tests that don't catch bugs | Meaningful tests on critical paths/edges |
| Clever one-liners for their own sake | Unreadable = unmaintainable | Clear over short; readability wins |
| Premature abstraction / over-engineering | The wrong abstraction is costly | YAGNI; abstract on the third repetition |
| Prototype quietly becoming production | Skips every safety net | Conscious promotion to Standard tier |

### The elegance manifesto (the craft bar, in one place)
Elegant code is **correct, then clear, then minimal — in that order.** It does one thing per function, names things so comments are rarely needed, has no dead code, no clever tricks, and no abstraction that isn't earned. It's shorter than the junior's version not because it's compressed but because the unnecessary has been *removed*. The test: **could a competent stranger read it once and understand it, and change it without fear?** If yes, it's elegant — regardless of line count. If a one-liner fails that test, it's not elegant, it's a liability.

### Scope, honesty & the point
- **Correctness is the floor everything else stands on.** A beautiful, fast, accessible, well-marketed product that loses data is a failed product. This doc ranks above Performance/SEO/Design for that reason.
- **AI changes the economics, not the requirements.** It makes writing code nearly free, which moves all the value to architecture, correctness, verification, and judgement — the parts it's worst at. Use it heavily; verify relentlessly; own the result.
- **You are a new dev using a power tool — that's the ideal time to build the right reflexes.** Read every line, understand every line, run the adversarial tests. That discipline is what turns "can prompt an app" into "is actually an engineer."
- **Right-size everything.** Don't ship a toy with enterprise scaffolding; don't ship a payment system as a toy. Tier consciously.
- **Living document.** Fundamentals are stable; the AI-failure-mode catalogue (Part E) moves monthly — keep it current. v1 reflects research and practice as of June 2026.
