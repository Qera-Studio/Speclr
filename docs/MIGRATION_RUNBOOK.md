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
- [ ] 👤 `npx vercel link` — link local folder to the Vercel project (creates `.vercel/`, enables `vercel env pull`).
- [ ] 🤖 Set up **Jest + React Testing Library** (config, jsdom, scripts).
- [ ] 👤 Later: add the `speclr.qera.studio` custom domain in Vercel (not needed until go-live).

**✓ Checkpoint:** blank app builds and deploys; docs + checklists committed; testing harness runs.

---

## Phase 2 — Lift the portable core (no UI yet)

- [ ] 🤖 Copy `src/lib/domain/` from the source project's `kessler-admin/_lib/`: `money`, `dates`, `amountInWords`, `gstStates`, `registry`, `studio`, `employee`, `hrContent`, `msaBoilerplate`, `scheduleLetter`, `serviceTemplate`, `types` — **and their tests** — verbatim; fix import paths only.
- [ ] 🤖 Adjust any `zod` import differences; run typecheck.

> Note the source's `lib/admin/` split: `store`, `counter`, `docNumber`, `employeeStore`, `serviceStore` are the persistence layer — their *interfaces* are reused but *bodies* rewritten in Phase 3. `session.ts` is **replaced by Clerk** (not lifted).

**✓ Checkpoint:** `npm test` — all lifted domain tests pass, untouched.

---

## Phase 3 — Postgres + auth (the plumbing)

- [ ] 👤 Provision **Neon Postgres** (Vercel Marketplace *or* neon.tech directly — free tier). Get `DATABASE_URL`.
- [ ] 👤 Provision **Clerk** (Vercel Marketplace *or* clerk.com directly — free tier). Get the Clerk keys.
- [ ] 👤 `vercel env pull .env.local` (or paste keys into `.env.local` — gitignored).
- [ ] 🤖 Install Drizzle + drizzle-kit + the Neon driver; configure `drizzle.config.ts`.
- [ ] 🤖 Write `src/db/schema.ts` — `clients`, `employees`, `service_templates`, `documents` (relational cols + JSONB `data`/`snapshot`), `counters`. Generate + run the first migration.
- [ ] 🤖 Rewrite the store + Server Actions against Postgres: atomic FY numbering (counters + row-lock/sequence), immutability guards, snapshot freeze. Zod-validate JSONB on write.
- [ ] 🤖 Wire Clerk: middleware, sign-in route, email allowlist; every action/route verifies the session server-side.
- [ ] 🤖 Tests for the persistence layer (round-trip, atomic numbering, immutability).

**✓ Checkpoint:** create → finalize → immutability pass in tests; a document round-trips through Postgres; sign-in gated by Clerk.

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
