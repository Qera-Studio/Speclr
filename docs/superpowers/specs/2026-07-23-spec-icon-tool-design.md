# Design — Phase 4d: Icon Tool (`spec`)

> Part of the Phase 4 UI rebuild. Phase 4 was decomposed into four independent sub-projects (4a shell/dashboard, 4b sheets/print, 4c editors, 4d icon tool). This spec covers **4d only** — chosen first as a low-risk, fully self-contained warm-up that settles the shadcn + Tailwind conventions before the larger admin build.

## What this is

The **icon/favicon spec checklist** tool, extracted from the marketing site's `/kessler-spec` and rebuilt on speclr's stack (shadcn + Tailwind, no SCSS). It is a **client-only** tool: upload each favicon/OG asset variant, validate it against a spec (dimensions, format, transparency) entirely in the browser, judge visual quality in realistic mockups, and export/import review progress as JSON. No database, no server actions, no network — pure client-side canvas/Image analysis.

It lives inside the authenticated speclr app, so its route sits behind the same `requireAuthorizedUser()` gate as everything else.

## Scope

**In scope:**
- Route `/spec` (authenticated, `noindex`), with a thin Server Component page enforcing authorization and rendering the client tool.
- Portable logic lifted ~verbatim into `src/lib/spec/`.
- UI rebuilt in shadcn primitives + Tailwind (no SCSS modules).
- A temporary link from the placeholder home page so the tool is reachable before 4a builds real nav.
- Full test coverage (Jest + RTL); lifted-logic tests port verbatim.

**Out of scope (other sub-projects):** app shell, nav, dashboard, CRUD, document sheets, editors, print pipeline.

## Route & placement

- **Path:** `/spec` (short, matches the "Icon tool (spec)" naming in `CONTEXT.md`).
- `src/app/(admin)/spec/page.tsx` — Server Component:
  - `export const metadata` with `title: 'Icon Spec — speclr'`, `robots: { index: false, follow: false }`.
  - `export const dynamic = 'force-dynamic'` (reads the Clerk session cookie).
  - Calls `requireAuthorizedUser()`; on throw, redirect `UNAUTHORIZED → /no-access`, else `/sign-in` (identical pattern to `src/app/page.tsx`).
  - Renders `<IconSpecTool />` (client).
- Route group `(admin)` is introduced here as the home for authenticated tool routes; 4a will add a shared layout to it. For 4d, no group layout is required — the page self-enforces auth.

## Portable logic — lift ~verbatim into `src/lib/spec/`

These files have zero imports outside their own folder and no framework/marketing coupling. Copy them unchanged (only the file location moves):

| File | Responsibility |
|---|---|
| `types.ts` | `IconSpec`, `ValidationResult`, `SlotState`, `ExportedProgress`, tri-state types. |
| `imageAnalysis.ts` | `loadImageDimensions`, `isIcoFile`, `isSvgFile`, `detectTransparency` (canvas alpha scan). |
| `iconSpecData.ts` | `ICON_SPECS` — the array of icon spec definitions (favicon.ico, PNGs, SVG, OG, maskable, etc.). |
| `useImageValidation.ts` | `useImageValidation()` hook — per-file async validation → `ValidationResult`. |
| `useIconSpecState.ts` | `useIconSpecState()` hook — slot state, localStorage persistence, export/import with schema-version validation. |

Their existing test files port verbatim into `src/lib/spec/__tests__/` and **must pass unchanged** — they are the correctness guarantee for the lifted logic. The `localStorage` key stays `qs_kessler_spec_progress` (an internal cache key; not user-visible, no reason to churn it and break any in-flight local progress the founder may have — though this is a fresh app, so a rename is harmless if preferred; keep as-is for zero risk).

## UI — rebuild in shadcn + Tailwind

New files under `src/components/spec/`. Each source SCSS-module component maps to a shadcn/Tailwind rebuild:

| Source component | Rebuild | Primitives |
|---|---|---|
| `IconSpecTool` (orchestrator) | `IconSpecTool.tsx` | page header + controls bar + responsive card grid (`grid gap-6 md:grid-cols-2 xl:grid-cols-3`) |
| `ClientNameField` | `ClientNameField.tsx` | shadcn `Input` + `Label` |
| `ProgressBar` | `SpecProgress.tsx` | shadcn `Progress` + count label (keep `role="progressbar"` semantics / `aria-label`) |
| `ExportImportControls` | `ExportImportControls.tsx` | shadcn `Button` (export), hidden file `<input>` + `Button asChild`-style label (import), shadcn `Alert` (`variant="destructive"`) for `importError` |
| `IconSpecCard` | `IconSpecCard.tsx` | shadcn `Card` (Header/Content), `Badge` (priority), `dl` spec list, `Textarea` (notes), `Checkbox` + `Label` (mark reviewed) |
| `UploadDropzone` | `UploadDropzone.tsx` | file `<input>` (visually hidden) + `Button`-styled label; accept map by format; keyboard-reachable |
| `ValidationResultBadge` | `ValidationResultBadge.tsx` | tri-state rows using `Badge` variants (pass/fail/unknown/warning) + descriptive text; renders `result.note` |
| `PreviewMockups/*` (5 + dispatcher) | `PreviewMockups/*` | Tailwind-styled preview frames; keep plain `<img>` with `blob:` URLs (documented: object URLs aren't `next/image`-optimizable) |

### Behavior preserved exactly (do not change)
- Client-side dimension read + canvas transparency scan; `.ico` and SVG return tri-state `'unknown'` with honest explanatory notes.
- Auto-pass derivation in the card: `passed = dimensionsOk !== false && formatOk !== false && !transparencyIsWarning` on upload, setting `reviewed: true`.
- `localStorage` persistence on every change; JSON export (download blob, filename `${slug}-icon-spec-progress.json`) and import (FileReader → schema-version validation → merge onto defaults).
- The 5 mockups (browser tab, iOS home screen, maskable safe-zone, Google SERP, social card) stay visually faithful; only the styling system changes (SCSS → Tailwind tokens).

### Aesthetic
Dark-mode, Geist, shadcn tokens (`bg-card`, `text-muted-foreground`, `border-border`). Data-dense internal-tool look per `CONTEXT.md` — not the marketing site's pastel style. One accent via `--color-primary`. Lucide icons at `h-4 w-4`.

## shadcn primitives to install

`card`, `badge`, `input`, `label`, `textarea`, `checkbox`, `progress`, `alert`. (`button` already present.) Installed non-interactively via `npx shadcn@latest add ...`.

## Temporary home link

`src/app/page.tsx` (the placeholder dashboard) gains a single temporary link to `/spec` (e.g. a shadcn `Button asChild` wrapping `<Link href="/spec">`), clearly marked as temporary in a comment. 4a replaces this with real navigation.

## Testing

- Every rebuilt component gets `src/components/spec/**/__tests__/*.test.tsx` (Jest + RTL): renders without errors, correct content, keyboard reachability of interactive controls, `onUpdate`/`onChange` fire on interaction, correct ARIA roles.
- Lifted logic tests port verbatim into `src/lib/spec/__tests__/`.
- Canvas/Image/URL mocking follows the source approach: `URL.createObjectURL`/`revokeObjectURL` stubbed in `beforeEach`; `useImageValidation`/`imageAnalysis` tests mock `Image` + canvas `getContext` as the source tests already do.
- `npm test` must pass with no failures before the sub-project is complete.
- A route/page test asserts the page is a server component that renders the tool for an authorized user (auth mocked).

## Accessibility

- Semantic headings (one `h1` for the tool title, `h3` per card via `Card` heading).
- Every `Input`/`Textarea`/`Checkbox` has an associated `Label`.
- Upload and import controls reachable and operable by keyboard (the label-wraps-hidden-input pattern must keep the input focusable, not `tabindex=-1`).
- Progress bar keeps `role="progressbar"` + `aria-valuenow/min/max` + `aria-label`.
- Import errors surfaced via `Alert` with `role="alert"`.
- Decorative mockup chrome marked `aria-hidden` where appropriate; the safe-zone circle stays `aria-hidden`.

## Non-goals / deferred

- No drag-and-drop upload (source uses click-to-upload; keep parity — DnD is a future nicety).
- No nav/shell (4a).
- No persistence beyond `localStorage` + JSON export (by design — the exported file is the authoritative store).

## Verification

1. `npm run typecheck` · `npm test` · `npm run lint` · `npm run build` all green.
2. Manual (real browser): navigate to `/spec` while signed in as an allowlisted user → tool renders; unauthenticated → `/sign-in`; signed-in-not-allowlisted → `/no-access`.
3. Upload a 32×32 PNG to the small-favicon slot → Pass badges; upload a wrong-size PNG → dimensions Fail; upload a `.ico` → dimensions/transparency Unknown with note; upload a transparent PNG to an opaque-required slot → transparency Warning.
4. Export progress → JSON downloads with slug filename; reload → localStorage restores; import the file → state restored; import garbage → destructive `Alert`.
5. Keyboard-only pass through one card: tab reaches upload, mark-reviewed, notes.
