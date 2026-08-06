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

---

## Deliberately deferred (YAGNI — noted, not built)

Moved here from `CONTEXT.md`. Deferred on purpose, with the reasoning intact —
if one of these gets picked up, the reasoning is what to re-examine first.

- **Server-side PDF renderer** — print-CSS now. Sheets stay pure `data → markup`
  precisely so this lands later as a non-breaking, additive upgrade. Don't couple
  sheets to the DOM in the meantime (see §3, which touches the same surface).
- **Roles/permissions** — allowlist + full access now. **No longer really
  deferred:** §1 needs them, and the original bet was that adding roles "must not
  require a rewrite." §1 is where that bet gets tested.
- **Payslip document type** — until a real salaried employee exists. A stipend
  slip is *not* a payslip; they are kept separate deliberately, and the intern vs.
  employee split is a legal distinction, not a cosmetic one.
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
