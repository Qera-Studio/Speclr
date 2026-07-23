# speclr — Migration Runbook

> The ordered, executable steps for extracting the admin + icon tools from the marketing site into speclr. Five phases, each with a verifiable checkpoint. This is the "how"; the design spec (in the source project's `docs/superpowers/specs/`) is the "why".
>
> **Legend:** 👤 = a human step (GitHub / Vercel / Neon / Clerk dashboards). 🤖 = agent-driven. ✓ = checkpoint.

---

## Phase 1 — Scaffold + handoff docs

- [x] 👤 Create `Speclr` repo in the **Qera-Studio** GitHub org; grant personal account access.
- [x] 👤 Clone to `~/Developer/qera/speclr`; set repo commit identity (`git config user.name/email`).
- [x] 🤖 `create-next-app` — Next.js 16, TypeScript, Tailwind v4, App Router, `src/`, alias `@/*`.
- [x] 🤖 `shadcn init --preset b1ZzrZeYC -f` → **fix the Geist-font gotcha** (literal font names in `@theme inline`; font vars already on `<html>`).
- [x] 🤖 Verify production build clean; confirm shadcn registry works (`add button`).
- [x] 👤 Deploy to Vercel (repo made **public** to avoid the private-org Pro requirement on Hobby).
- [x] 🤖 Copy the **8 master checklists** into `dev/`.
- [x] 🤖 Write `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, this runbook.
- [x] 👤 `npx vercel link` — linked to `qerastudios-projects/speclr` (company Vercel); `.env.local` + `.vercel/` created and gitignored (verified).
- [x] 🤖 Set up **Jest + React Testing Library** — config + jsdom stubs (ResizeObserver/IntersectionObserver/matchMedia) matching the source project so lifted tests run unchanged; `test`/`typecheck` scripts added; smoke-verified.
- [ ] 👤 Later: add the `speclr.qera.studio` custom domain in Vercel (not needed until go-live).

**✓ Checkpoint:** blank app builds and deploys; docs + checklists committed; testing harness runs.

---

## Phase 2 — Lift the portable core (no UI yet) — ✅ DONE

- [x] 🤖 Installed `zod@^4` (the only external dep of the domain core; v4's stricter `.email()` is relied on by the schemas).
- [x] 🤖 Copied all 12 domain files + 9 test files from `kessler-admin/_lib/` into `src/lib/domain/` **verbatim** — **zero import changes needed** (the `_lib` island imports only `zod` + its own relative files; no cross-boundary imports).
- [x] 🤖 `npm run typecheck` clean; `npm test` green.

> Note the source's `lib/admin/` split: `store`, `counter`, `docNumber`, `employeeStore`, `serviceStore` are the persistence layer — their *interfaces* are reused but *bodies* rewritten in Phase 3. `session.ts` is **replaced by Clerk** (not lifted).

**✓ Checkpoint MET:** `npm test` → **9 suites, 114 tests, all passing, untouched.** The brain works before any UI/DB is built on it.

---

## Phase 3 — Postgres + auth (the plumbing)

## Phase 3 — Postgres + auth — ✅ DONE

- [x] 👤 Provisioned **Neon Postgres** (Vercel) → `DATABASE_URL` pulled.
- [x] 👤 Provisioned **Clerk** (Vercel) → keys pulled; reconciled the duplicate app; branding configured.
- [x] 🤖 Drizzle + drizzle-kit + Neon driver; `drizzle.config.ts`; `src/db/index.ts` (server-only client).
- [x] 🤖 `src/db/schema.ts` — 5 tables (clients, employees, service_templates, documents, counters); relational cols + JSONB `data`/`snapshot`; UNIQUE index on `documents.number`. Migrated + verified live.
- [x] 🤖 Store + mappers + atomic counter (Postgres upsert-returning) — same contract as the source; immutability + snapshot preserved. Server Actions (documents/clients/employees/services) ported faithfully; only imports + auth call changed.
- [x] 🤖 Clerk wired: minimal middleware (plumbing), ClerkProvider, `/sign-in`, `SPECLR_ALLOWED_EMAILS` allowlist, resource-level `requireAuthorizedUser()` on every action/protected page (NOT middleware path-matching — Clerk's current guidance + Security checklist).
- [x] 🤖 Integration tests (live Neon, `npm run test:int`, self-cleaning): 6/6 — client/doc round-trip, atomic numbering, 10 concurrent → 10 unique serials, finalize+snapshot+immutability.
- [x] 👤 `SPECLR_ALLOWED_EMAILS` added to Vercel (project-scoped, all environments).

**✓ Checkpoint MET:** create→finalize→immutability verified against real Postgres; documents round-trip; unauthenticated `/` → 307 → branded Clerk sign-in (verified in browser). Default suite 119 green; build compiles.

> Action-level end-to-end (with a live Clerk session) is deferred to the Phase 4 browser flow; the correctness-critical store/counter are already covered by the integration tests.

---

## Phase 4 — Rebuild the admin UI (shadcn)

- [ ] 🤖 Add shadcn primitives as needed (table, form, input, select, command, dialog, alert-dialog, dropdown-menu, badge, sheet, tabs…).
- [ ] 🤖 Dashboard (shadcn **Table**), forms (**Form/Input/Select**), doc-type picker (**Command**), nav, editors, the **Paginator** carousel — fresh shadcn.
- [ ] 🤖 Port the document **sheets pixel-faithful** (Tailwind + `src/styles/print.css`).
- [ ] 🤖 Rewrite component tests; verify each surface in a real browser.

**✓ Checkpoint:** full create → finalize → print flow works in-browser; sheets match the current design; tests green.

---

## Phase 5 — Rebuild the icon tool (shadcn)

- [ ] 🤖 Lift the client-only logic verbatim (image analysis, validation, state hooks) from `kessler-spec/`.
- [ ] 🤖 Rebuild its UI + 6 preview mockups in shadcn.

**✓ Checkpoint:** icon tool works end-to-end; full suite green; final review; run the launch-readiness gate.

---

## Post-migration (separate, deferred)

- [ ] 👤 Add `speclr.qera.studio` domain; decide repo private-vs-public + Vercel plan for go-live.
- [ ] 🤖 **Only after speclr is fully live and verified:** remove `kessler-admin` + `kessler-spec` (and `lib/admin`, `actions/admin`) from the marketing site as a final cleanup PR. The marketing site is untouched until then — it is the working fallback throughout.

---

## Git & account reference

**GitHub (one account, two orgs):** the personal GitHub account is a full member of the **Qera-Studio** org → one GitHub login covers both personal and company repos. Commit identity is set per-repo (`git config user.name/email` inside speclr → `ops@qera.studio`) so attribution is correct without affecting personal projects. Connection chain: local `.git` → `origin` (Qera-Studio/Speclr) → VS Code Source Control reads it automatically.

**Vercel (TWO separate accounts — important):**
- **Personal Vercel** — holds `qerastudio` (the marketing site, still to be migrated), `clayora`, `sunholdings`.
- **Company Vercel** — tied to the Qera-Studio company GitHub; **this is where speclr is deployed and linked.**

These are distinct accounts, not teams under one login. The Vercel CLI must be logged into the **company** account to see/link speclr (`vercel logout` then `vercel login` as the company account — this is local-token-only and never touches projects on either account). Verify with `vercel whoami` (should show the company account). This is why `vercel link` from the personal account did not list speclr.
