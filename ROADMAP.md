# ROADMAP — speclr

> The tracked backlog: features, future plans, and pending work not yet started.
> Complements the other docs rather than repeating them —
> `CONTEXT.md` holds domain rules and decisions already made,
> `AGENTS.md` holds standards, `dev/` holds the checklists.
>
> **A `## Deliberately deferred` list also lives in `CONTEXT.md`** (YAGNI items:
> PDF renderer, roles, payslip, analytics). When something there gets scheduled,
> move it here and leave a pointer — don't let the two lists drift.
>
> Items are unordered within a section; nothing here is committed to a date.

---

## Planned features

### 1. Admin access to documents and clients
Give an admin a full view across documents and clients, distinct from ordinary
access.

- **Prerequisite:** this is the first real test of the deferred *roles/permissions*
  decision. Today every invited user has full access and there are no roles
  (`CONTEXT.md`). "Admin" only means something once a non-admin tier exists —
  so scope the non-admin tier first, or "admin" is a label with no teeth.
- **Non-negotiable:** authorization is verified **server-side on every action and
  route**, never inferred from a layout or client state. A layout is not a security
  boundary (Security checklist).
- Adding roles must not require a rewrite — that was the explicit bet when roles
  were deferred. Validate that here.

### 2. Public access to tools
Expose the icon spec tool publicly, without weakening document security.

- **Hard constraint:** speclr's two access locks — Clerk invite-only sign-up and
  the fail-closed `SPECLR_ALLOWED_EMAILS` allowlist — are marked *"do not weaken"*
  in `CONTEXT.md`. This must **not** be built by relaxing either one.
- The icon tool is entirely client-side and holds no financial/legal data, so it
  is genuinely safe to expose. The document tool is not, and never becomes public.
- **Approach:** a separate public route group that shares **no layout, middleware
  path, or auth surface** with `(admin)`. Isolation must be structural, not a
  conditional inside a shared guard.
- Public routes still stay `noindex` unless deliberately decided otherwise.

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

- **Largest item here** — a portal means external users, which is a different
  security posture from an invite-only internal tool. Likely wants its own spec
  before implementation.
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

---

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
