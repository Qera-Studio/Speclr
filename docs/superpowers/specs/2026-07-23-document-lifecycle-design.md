# Design — Phase 4b: Document Lifecycle (sheets · preview · print · editors · finalize)

> Third and largest Phase-4 sub-project. It replaces the `/docs/[id]` and `/docs/new/[type]` placeholders with the full document lifecycle: pixel-faithful sheets, the A4 preview/print pipeline, the draft editors, and the finalize/duplicate/delete flow. **The user chose to combine what were originally 4b (sheets+view+print) and 4c (editors+finalize) into one continuous phase**, executed straight through, merged when the whole lifecycle works. ~4,700 lines of source (≈3,000 TSX + ≈1,700 SCSS).

## What this is

Everything needed to **create, edit, preview, finalize, view, and print** the five real document types. The domain core, Postgres store, and Server Actions already exist and are tested (Phase 3). 4b is the UI + the pixel-faithful print artifacts on top of them. No new domain logic, no new server actions.

## Scope (in)

- **4 sheets** (the print artifacts, pixel-faithful): `DocumentSheet` (invoice `INV` / receipt `REC`), `ContractSheet` (`CON`), `LetterSheet` (offer `OFR` / experience `EXP` / exit `EXIT`), `StipendSheet` (`STP`).
- **Preview/print pipeline:** `Paginator` (block-measuring A4 carousel, for multi-page docs like contracts), `SheetPreview` (single-/multi-page zoom wrapper), `PrintToolbar`.
- **4 editors** (draft create/edit forms): `DocumentEditor`, `ContractEditor`, `LetterEditor`, `StipendEditor`.
- **`FinalizedActions`** (finalize → immutable, duplicate-as-draft, delete-draft).
- **Routes:** `/docs/new/[type]` (create), `/docs/[id]` (edit draft OR view finalized + actions), `/docs/[id]/print` (full-size + `@media print`).
- **Asset:** copy the UPI QR (`scanToPay.png`) into speclr `public/`.
- Tests + a11y + verification (incl. real-browser pagination/print checks jsdom can't do).

## Scope (out / deferred)

- Server-side PDF renderer — print-CSS only (unchanged deferral).
- Any change to domain logic, schemas, or Server Actions.
- The `/spec` guided redesign (separate deferred item).

## Locked decisions

- **Sheets = co-located CSS Modules, translated 1:1 from the source SCSS.** (This supersedes CONTEXT.md's earlier "Tailwind + print.css" note — CONTEXT.md to be updated.) Each source `X.module.scss` → co-located `X.module.css`: drop the `@use '.../variables'` / `'.../mixins'` imports, inline `$font-sans` → the Geist family literal, convert SCSS nesting/`&` to plain CSS, keep **every px, color, and rule literally**. `@media print` blocks stay co-located in each sheet's CSS. Rationale: the sheets are approved legal artifacts (white paper, black ink, exact typography, deliberately NOT theme-aware); a near-mechanical CSS-Modules copy guarantees pixel fidelity and is trivially verifiable against source, whereas hand-converting 1,700 lines to Tailwind utilities risks silent visual drift. Plain CSS / CSS Modules work under Turbopack (globals.css already proves it).
- **All chrome stays shadcn + Tailwind** (editors, toolbars, view-page shell, actions) — consistent with 4a.
- **Forms use react-hook-form + Base UI `Field` kit** (the 4a convention; no shadcn `Form` component in this preset). The editors are the most complex forms in the app (line-item arrays, GST place-of-supply, HR engagement branching) — port their transform logic faithfully from source.
- **One phase, executed straight through**, sheets → preview/print → view → editors → finalize → create. Frequent commits; merge when the lifecycle works end-to-end.

## Architecture

```
/docs/new/[type]  ─┐
                   ├─► <XEditor> (client form)  ──createDraft──►  /docs/[id]
/docs/[id]         ─┤     └─ live preview: <SheetPreview|Paginator><XSheet doc/></...>
  (draft)          ─┘
/docs/[id]         ───► read-only <XSheet> in <SheetPreview> + <FinalizedActions>
  (finalized)              └─ finalize / duplicate / delete-draft (server actions)
/docs/[id]/print  ───► full-size <XSheet> + <PrintToolbar>  (@media print hides chrome)
```

- **Sheets** are pure `data → markup` (server-renderable). Same component instance feeds the editor's live preview, the view page, and the print route.
- **Type dispatch** (in the view and print routes): `STP` → StipendSheet/StipendEditor; `OFR|EXP|EXIT` → LetterSheet/LetterEditor; `CON` → ContractSheet/ContractEditor; else (`INV|REC`) → DocumentSheet/DocumentEditor. Sequential narrowing so each branch narrows the `AdminDocument` union.
- **Paginator vs SheetPreview:** contracts (long, multi-block) use `Paginator` (measures each block, packs into A4 pages, one-page carousel, cover-first for the black cover page). Single-page-ish docs (invoice/receipt/letter/stipend) use `SheetPreview` (measured-height zoom wrapper). Both are client components using `ResizeObserver` + transform-scale; **jsdom can't measure**, so both degrade to un-paginated/unscaled in tests and are verified in a real browser.

## Component inventory (port from source)

Source root: `/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-admin/`.

| speclr target | source | port kind |
|---|---|---|
| `src/components/docs/sheets/DocumentSheet.tsx` + `.module.css` | `_components/DocumentSheet/` | structure verbatim; SCSS→CSS-module 1:1; inline the Qera SVG mark; QR via `next/image` |
| `.../ContractSheet.tsx` + `.module.css` | `_components/ContractSheet/` | same; multi-page, black cover, MSA clauses |
| `.../LetterSheet.tsx` + `.module.css` | `_components/LetterSheet/` | same; HR letters (offer/exp/exit) |
| `.../StipendSheet.tsx` + `.module.css` | `_components/StipendSheet/` | same; stipend slip |
| `src/components/docs/Paginator.tsx` + `.module.css` | `_components/Paginator/` | lift verbatim; measuring engine unchanged |
| `src/components/docs/SheetPreview.tsx` + `.module.css` | `_components/SheetPreview/` | lift verbatim |
| `src/components/docs/PrintToolbar.tsx` | `_components/PrintToolbar/` | lift; rebuild toolbar chrome in Tailwind (it's chrome, not a sheet); keep the title-swap print trick |
| `src/components/docs/editors/DocumentEditor.tsx` | `_components/DocumentEditor/` (+ `useDocumentForm`) | rebuild form in RHF+Field; port transforms (paise, GST, line items) |
| `.../ContractEditor.tsx` | `_components/ContractEditor/` | rebuild; schedule/clauses |
| `.../LetterEditor.tsx` | `_components/LetterEditor/` | rebuild; engagement/pronoun branching |
| `.../StipendEditor.tsx` | `_components/StipendEditor/` | rebuild |
| `src/components/docs/FinalizedActions.tsx` | `_components/FinalizedActions/` | rebuild in shadcn (Button + AlertDialog for destructive) |

Domain imports re-point to `@/lib/domain/*` (already lifted). Money/dates/gst/registry/studio/amountInWords all exist there.

## Server Actions (already built — just call)

`@/server/actions/documents`: `createDraft(type, data)`, `updateDraft(id, data)`, `finalizeDocument(id)`, `duplicateDocument(id)`, `deleteDraftAction(id)` → all `ActionResult`. Store reads: `getDocument`, `listDocuments`, plus `listClients`/`listEmployees`/`listServices` (editors need these for pickers). Confirm each action's exact signature against source before wiring.

## The non-obvious rules this phase must honor (from CONTEXT.md)

- **Money is integer paise**; editors convert rupees↔paise at the boundary. Never float.
- **GST place-of-supply** required to finalize when `gstRatePercent > 0`; drives CGST/SGST (intra-state, `=== STUDIO_INFO.stateCode`) vs IGST (inter-state) in DocumentSheet.
- **Finalized = immutable**: no edit/delete controls on finalized docs; corrections via duplicate-as-draft. Finalize claims the GST number atomically.
- **Snapshot freeze** at finalize (client/employee copied into the doc) — sheets read the snapshot, never live data.
- **Intern vs employee** legal split in HR docs (exit → "Internship Completion" vs "Relieving"); letter wording branches on `engagementType`.
- **Ordinal dates** ("10th June 2026") via `dates` helpers.
- Sheets are **paper**: explicit black ink on white, `print-color-adjust: exact`, not theme-aware. Never let app/dark styles bleed in (CSS Modules scope prevents this).

## Testing

- **Sheets:** RTL renders each sheet from a fixture `AdminDocument`; asserts key content (masthead, party names, totals text, GST rows for intra/inter-state, terms, HR wording branches). Pure markup → fully testable. No pixel testing in jsdom (that's the browser pass).
- **Paginator / SheetPreview:** test the degraded (un-measured) path — renders all blocks/children without crashing; zoom buttons present and toggle `aria-pressed`; keyboard page nav wired. Measuring itself is browser-verified.
- **PrintToolbar:** renders Back + Print button; clicking print calls `window.print` (mock) and swaps/restores `document.title`.
- **Editors:** render fields; invalid submit shows validation; valid submit calls the mocked action with the correctly-transformed payload (paise, GST, arrays); server error surfaces. Live-preview updates as fields change.
- **FinalizedActions:** finalize/duplicate call their mocked actions; delete confirms via AlertDialog; no edit control shown for finalized.
- **Routes:** view page dispatches to the right editor/sheet by type and self-guards; print route renders the right sheet; both redirect when unauthorized.
- Base UI `PointerEvent` stub already in `jest.setup.ts` covers Select/Dialog/DropdownMenu. `npm test` green before done.

## Accessibility

- Sheets use semantic `<article>`/`<section>`/`<table>` with captions and `scope`; decorative SVG/QR marked `aria-hidden`/proper `alt`.
- Paginator/preview: `role="group"` + labels, `aria-pressed` zoom, `aria-live` page counter, keyboard arrows, focus-visible.
- Editors: Field-kit labels/errors, one `<h1>` per page, server error in `role="alert"`.
- Print route: sr-only `<h1>`, `@media print` hides toolbar/nav only.
- FinalizedActions: destructive delete via `AlertDialog`, not `Dialog`.

## Security / performance (per checklists)

- CSP unchanged; `z.config({ jitless: true })` already global for editors' zod.
- QR is a static `public/` image via `next/image` (`unoptimized` not needed — PNG). Add no new remote image domains.
- Sheets server-rendered; editors/preview are the client islands.
- `noindex` on every doc route.
- Immutability + snapshot enforced server-side already; UI must not offer edit/delete on finalized (defense in depth, not the boundary).

## Verification

1. `npm run typecheck` · `npm test` · `npm run build` green; routes list `/docs/new/[type]`, `/docs/[id]`, `/docs/[id]/print`.
2. Manual, real browser, signed-in, live Neon — **the pixel + pagination + print checks jsdom cannot do**:
   - Create each of the 7 doc types via `/docs/new/[type]`; live preview matches expectations; save → lands on `/docs/[id]` as a draft.
   - **Visually diff each sheet against the marketing-site original** (side-by-side): masthead, fonts, spacing, borders, totals block, GST rows (make an intra-state and an inter-state invoice), terms columns, footer strip, contract black cover + clause pagination, HR letter wording (intern vs employee exit).
   - Edit a draft → persists. Finalize → number assigned, becomes read-only (no edit/delete), snapshot frozen (edit the client after finalize → issued doc unchanged).
   - Duplicate a finalized doc → new editable draft. Delete a draft → gone (AlertDialog).
   - Print route: full A4, chrome hidden in print preview, "Save as PDF" filename is the doc number; multi-page contract breaks between clauses (no split headings).
   - Paginator carousel: Fit/100%, prev/next, page counter, keyboard arrows.
   - Auth: unauth → `/sign-in`; not-allowlisted → `/no-access` from every doc route.
