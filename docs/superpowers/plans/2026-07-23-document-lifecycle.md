# Phase 4b — Document Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/docs/*` placeholders with the full document lifecycle — pixel-faithful sheets, the A4 preview/print pipeline, the draft editors, and finalize/duplicate/delete — wired to the Server Actions already built in Phase 3.

**Architecture:** Sheets are pure `data → markup` (server-renderable), styled Tailwind + a shared `print.css`. Editors are client islands (react-hook-form + Base UI `Field` kit) with a live sheet preview, calling existing Server Actions. Type dispatch routes each `AdminDocument` to its sheet/editor. `/docs/[id]/print` renders the sheet full-size with `@media print`.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Tailwind v4, shadcn (Base UI), react-hook-form, zod v4, Jest + RTL.

**Source of truth:** the marketing site at `/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-admin/`. "Port from source" = read the named file there and translate faithfully.

## Stack rules (carried from 4a — apply throughout)

- shadcn primitives are **Base UI**, NOT Radix. No `@radix-ui/*`. **No `asChild`** — use the **`render` prop** (`<DropdownMenuTrigger render={<Button/>} />`). No shadcn `Form` component — forms use **react-hook-form + Base UI `Field` kit** (`@/components/ui/field`: `Field/FieldLabel/FieldError/FieldGroup`; `FieldError errors={[errors.x]}`). Enum selects → `@/components/ui/select` + RHF `Controller` (`value`/`onValueChange`). `import '@/lib/zod-config';` before any zodResolver.
- `Base UI Button` has no `asChild`; style a `Link` as a button with `buttonVariants({...})`.
- `jest.setup.ts` already stubs `PointerEvent`/pointer-capture/matchMedia/ResizeObserver. Extend `installDomStubs()` only for a NEW gap; report it.
- `@/` → `src/`. Tests in `__tests__/`. No `Co-Authored-By` trailer. No `lint` script — verify with `npm run typecheck`, `npm test`, `npm run build`. **Always `cd /Users/shivanshupareek/Developer/qera/speclr` at the start of every bash command** (the shell CWD can drift to the marketing repo).

## Sheet styling rules (pixel-faithful — the core discipline)

- Translate each sheet's source `.module.scss` to **Tailwind utility classes on the markup**, class-for-class. Preserve **every px/color/rule exactly** using arbitrary values where off-scale: `w-[794px] h-[1123px] p-[12px] text-[12px] leading-[1.5]`, etc.
- Sheets are **paper**: literal `text-black`, `bg-white`, explicit colors (`text-black/70` for the `rgba(0,0,0,0.7)` ink-soft, `border-[#d9d9d9]` for the rule). **Never theme tokens** (`text-foreground` etc.) — those bleed dark-mode into the paper.
- The Geist font is already the app font; sheets that set `font-family: $font-sans` just inherit or use `font-sans`.
- A4 sizing / `print-color-adjust: exact` / page-break / `@media print` rules that don't express as inline utilities go in **`src/styles/print.css`** (Task 1), applied via a stable className the sheet also carries.
- The source `.module.scss` is the spec. **Each sheet is verified side-by-side against the marketing original in a real browser** (the manual pass) — jsdom only checks content, not pixels.

## Backend (already built — never modify; verified signatures)

`@/server/actions/documents`:
- `createDraft(typeCode, clientId, data) → ActionResult` (`clientId` carries the employee id for HR docs)
- `updateDraft(id, clientId, data) → ActionResult`
- `finalizeDocument(id) → ActionResult`
- `duplicateDocument(id) → ActionResult` (returns `{success, id}` — the new draft)
- `deleteDraftAction(id) → ActionResult`

Store (`@/db/store`): `getDocument`, `listDocuments`, `listClients`, `listEmployees`, `listServices`.
Domain (`@/lib/domain/*`): `money` (paise/rupees, `computeTotals`, `splitGST`, `lineAmountPaise`, `formatINR`), `dates` (`formatDisplayDate`, `isISODate`), `gstStates` (`gstStateName`), `registry` (`DOC_TYPES` + schemas), `studio` (`STUDIO_INFO`), `amountInWords`, `types` (`AdminDocument` union + variants), `employee`, `hrContent`, `msaBoilerplate`, `scheduleLetter`, `serviceTemplate`.
Auth: `requireAuthorizedUser()` — copy the redirect idiom from `src/app/(admin)/page.tsx`.

## Type dispatch (used by view + print routes)

```ts
// Sequential narrowing so each branch narrows the union:
if (doc.type === 'STP')  → Stipend
if (doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT') → Letter
if (doc.type === 'CON')  → Contract
else (INV | REC)         → Document
```

---

## File Structure

```
public/assets/admin/scanToPay.png          (copied asset)
src/styles/print.css                        (shared A4/print rules; imported in print route)
src/components/docs/
  sheets/DocumentSheet.tsx  ContractSheet.tsx  LetterSheet.tsx  StipendSheet.tsx
  Paginator.tsx  SheetPreview.tsx  PrintToolbar.tsx
  editors/DocumentEditor.tsx  ContractEditor.tsx  LetterEditor.tsx  StipendEditor.tsx
  editors/useDocumentForm.ts   (lifted form hook + toPayload)
  FinalizedActions.tsx
  __tests__/*.test.tsx
src/app/(admin)/docs/
  new/[type]/page.tsx          (create — replaces placeholder)
  [id]/page.tsx                (edit draft | view finalized — replaces placeholder)
  [id]/print/page.tsx          (print view — new)
```

---

## Task 1: Asset + print.css foundation

**Files:** `public/assets/admin/scanToPay.png`, `src/styles/print.css`

- [ ] **Step 1: Copy the QR asset**
```bash
cd /Users/shivanshupareek/Developer/qera/speclr
mkdir -p public/assets/admin
cp "/Users/shivanshupareek/Developer/qera/qerastudio/public/assets/admin/scanToPay.png" public/assets/admin/scanToPay.png
ls -la public/assets/admin/scanToPay.png   # confirm ~216KB PNG present
```

- [ ] **Step 2: Create `src/styles/print.css`** — the shared A4 + print rules. Read the source sheets' `@media print` blocks (e.g. `_components/DocumentSheet/DocumentSheet.module.scss`, `docs/[id]/print/page.module.scss`) and extract the page-level rules. Baseline:
```css
/* A4 print pipeline for document sheets. Sheets are 794×1123px @96dpi paper. */
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  html,
  body {
    background: #fff;
  }
  /* Hide app chrome in the printed output. */
  [data-print-hidden] {
    display: none !important;
  }
  /* Each sheet page breaks after itself; blocks never split mid-page. */
  .print-sheet {
    break-inside: avoid;
  }
}
/* Force exact color rendering of the paper on screen and in print. */
.print-sheet {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
```
Refine to match the source once sheets exist (Task 10 may adjust). This file is imported by the print route (Task 9).

- [ ] **Step 3: Commit**
```bash
cd /Users/shivanshupareek/Developer/qera/speclr
git add public/assets/admin/scanToPay.png src/styles/print.css
git commit -m "chore(docs): QR asset + shared print.css foundation"
```

---

## Task 2: DocumentSheet (invoice / receipt) — the reference sheet

**Files:** `src/components/docs/sheets/DocumentSheet.tsx`; Test `src/components/docs/sheets/__tests__/DocumentSheet.test.tsx`

Port from `_components/DocumentSheet/DocumentSheet.tsx` + its `.module.scss`. This is the densest sheet (GST split, party blocks, line-item table, totals, payment/QR, terms, footer). Translate SCSS→Tailwind class-for-class per the styling rules. Inline the Qera SVG mark verbatim (the `<path>` is in the source). QR via `next/image src="/assets/admin/scanToPay.png"`.

- [ ] **Step 1: Write the failing test** — render from a fixture invoice + receipt; assert content, not pixels.
```tsx
import { render, screen } from '@testing-library/react';
import DocumentSheet from '../DocumentSheet';
import type { InvoiceDocument, ReceiptDocument } from '@/lib/domain/types';

const baseInvoice = {
  type: 'INV', status: 'finalized', number: 'QS-INV-2627-001', issueDate: '2026-06-10',
  gstRatePercent: 18, placeOfSupplyStateCode: '09',
  clientSnapshot: { name: 'Acme Co.', address: 'Road', phone: '9', email: 'a@b.com', gstin: '' },
  lineItems: [{ description: 'Design', detail: 'logo', ratePaise: 100000, qty: 2 }],
  gstLabel: null, notes: '',
} as unknown as InvoiceDocument;

describe('DocumentSheet', () => {
  it('renders the invoice masthead, client, and total', () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText(/billed to/i)).toBeInTheDocument();
    expect(screen.getByText('#QS-INV-2627-001')).toBeInTheDocument();
  });

  it('shows CGST+SGST for an intra-state (state 09) GST invoice', () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText(/CGST \(9%\)/)).toBeInTheDocument();
    expect(screen.getByText(/SGST \(9%\)/)).toBeInTheDocument();
  });

  it('shows a single IGST row for an inter-state invoice', () => {
    render(<DocumentSheet doc={{ ...baseInvoice, placeOfSupplyStateCode: '07' } as InvoiceDocument} />);
    expect(screen.getByText(/IGST \(18%\)/)).toBeInTheDocument();
  });
});
```
Confirm `STUDIO_INFO.stateCode` is `'09'` when writing (read `@/lib/domain/studio`); adjust the intra/inter fixtures if it differs. Confirm `LineItem` fields (`ratePaise`, `qty`) and `InvoiceDocument`/`ReceiptDocument` shapes against `@/lib/domain/types`.

- [ ] **Step 2: Run → FAIL.** `cd /Users/shivanshupareek/Developer/qera/speclr && npx jest src/components/docs/sheets/__tests__/DocumentSheet.test.tsx`

- [ ] **Step 3: Implement DocumentSheet.tsx** — port the source structure verbatim, re-pointing imports to `@/lib/domain/*`, translating each `styles.x` className to the exact Tailwind equivalent from the SCSS. Add the `print-sheet` className to the root `<article>`. READ both source files (`.tsx` + `.module.scss`) and translate faithfully. Keep the `<svg>` mark and semantic table/sections.

- [ ] **Step 4: Run → PASS (3).** Also `npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /Users/shivanshupareek/Developer/qera/speclr
git add src/components/docs/sheets/DocumentSheet.tsx src/components/docs/sheets/__tests__/DocumentSheet.test.tsx
git commit -m "feat(docs): DocumentSheet (invoice/receipt), pixel-faithful Tailwind"
```

---

## Task 3: StipendSheet

**Files:** `src/components/docs/sheets/StipendSheet.tsx`; Test alongside.
Port from `_components/StipendSheet/StipendSheet.tsx` + `.module.scss`. Reads `employeeSnapshot`, stipend amount (paise→INR), period, ordinal dates.

- [ ] **Step 1: Failing test** — fixture `StipendDocument`; assert masthead ("STIPEND"), employee name, formatted amount present.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — port structure + SCSS→Tailwind; `print-sheet` root; re-point domain imports. READ source.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): StipendSheet`.

---

## Task 4: LetterSheet (offer / experience / exit)

**Files:** `src/components/docs/sheets/LetterSheet.tsx`; Test alongside.
Port from `_components/LetterSheet/LetterSheet.tsx` + `.module.scss`. **Branches on engagement type** (intern vs employee) and letter type (OFR/EXP/EXIT); wording comes from `@/lib/domain/hrContent` + the doc's own fields. Exit doc title differs: intern → "Internship Completion Letter", employee → "Relieving Letter".

- [ ] **Step 1: Failing test** — three fixtures (offer, experience, exit); assert the exit letter shows the right title for `engagementType: 'intern'` vs `'employee'`; assert employee name + body render.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — port branching logic verbatim from source; SCSS→Tailwind; `print-sheet`. READ source + `@/lib/domain/hrContent`.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): LetterSheet (HR letters, engagement branching)`.

---

## Task 5: ContractSheet (multi-page, black cover, MSA clauses)

**Files:** `src/components/docs/sheets/ContractSheet.tsx`; Test alongside.
Port from `_components/ContractSheet/ContractSheet.tsx` + `.module.scss`. The longest sheet: a black **cover** page, party/schedule sections, and the 24-clause MSA body from `@/lib/domain/msaBoilerplate` + `scheduleLetter`/`serviceTemplate`. Emits its content as **atomic blocks** for the Paginator (Task 6) — preserve the block structure exactly (each clause a block) so pagination breaks between clauses.

- [ ] **Step 1: Failing test** — fixture `ContractDocument`; assert cover title, client name, at least one MSA clause heading render.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — port structure + block layout + SCSS→Tailwind (incl. the black cover styles); `print-sheet`. READ source + `@/lib/domain/msaBoilerplate`.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): ContractSheet (cover + MSA clauses)`.

---

## Task 6: Paginator (block-measuring A4 carousel)

**Files:** `src/components/docs/Paginator.tsx`; Test `src/components/docs/__tests__/Paginator.test.tsx`
Lift from `_components/Paginator/Paginator.tsx` + `.module.scss` — the measuring engine is pure and **lifts verbatim**; only translate the `styles.x` classNames to Tailwind/`print.css` equivalents. Keep the two-phase measure (renders un-paginated, `ResizeObserver` reads `offsetHeight`, packs into pages), the cover-first option, and the Fit/100% + prev/next + keyboard controls.

- [ ] **Step 1: Failing test** — jsdom can't measure (heights 0), so it stays un-paginated: render several `<div>` blocks as children; assert all block text is present (un-paginated fallback), the Fit/100% buttons exist with `aria-pressed`, and the page counter renders. Assert no crash.
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Paginator from '../Paginator';

describe('Paginator (un-measured jsdom fallback)', () => {
  it('renders all blocks and the zoom/pager controls', () => {
    render(<Paginator>{[<div key="a">Block A</div>, <div key="b">Block B</div>]}</Paginator>);
    expect(screen.getByText('Block A')).toBeInTheDocument();
    expect(screen.getByText('Block B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fit$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /100%/ })).toBeInTheDocument();
    expect(screen.getByText(/page 1 \//i)).toBeInTheDocument();
  });

  it('toggles zoom to 100%', async () => {
    const u = userEvent.setup();
    render(<Paginator>{[<div key="a">A</div>]}</Paginator>);
    await u.click(screen.getByRole('button', { name: /100%/ }));
    expect(screen.getByRole('button', { name: /100%/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — lift the source logic verbatim; translate SCSS classNames (`wrapper/toolbar/viewportFit/viewportFull/sheetSizer/sheetHolder/page/flow/coverPage/measure/...`) to Tailwind arbitrary values matching the source SCSS dims, or add the few needed rules to `print.css`. Keep `SHEET_WIDTH/HEIGHT`, `PAGE_CONTENT_HEIGHT`, the signature memo, both `ResizeObserver`s. READ source `.tsx` + `.module.scss`.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): Paginator (A4 block-measuring carousel)`.

---

## Task 7: SheetPreview + PrintToolbar

**Files:** `src/components/docs/SheetPreview.tsx`, `src/components/docs/PrintToolbar.tsx`; Tests alongside.

- [ ] **Step 1: SheetPreview test** — un-measured fallback: renders children, Fit/100% buttons with `aria-pressed`, no crash. (Mirror the Paginator test shape.)
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement SheetPreview** — lift from `_components/SheetPreview/SheetPreview.tsx` verbatim; translate SCSS classNames to Tailwind. Keep the measured-height zoom wrapper.
- [ ] **Step 4: PrintToolbar test** — renders a Back link (to `backHref`) and a "Print / Save as PDF" button; clicking it calls `window.print` (mock it) and sets then restores `document.title` to `fileName`.
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrintToolbar from '../PrintToolbar';

it('prints and swaps the document title', async () => {
  const print = jest.fn();
  Object.defineProperty(window, 'print', { writable: true, value: print });
  const u = userEvent.setup();
  render(<PrintToolbar backHref="/docs/x" fileName="QS-INV-2627-001" />);
  expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/docs/x');
  await u.click(screen.getByRole('button', { name: /print/i }));
  expect(print).toHaveBeenCalled();
});
```
- [ ] **Step 5: Implement PrintToolbar** — port from source; it's chrome, so rebuild the toolbar in Tailwind (Button + Link). Keep the title-swap trick and the `afterprint` restore. Mark the toolbar `data-print-hidden` so `print.css` hides it.
- [ ] **Step 6: Run both → PASS; typecheck.**
- [ ] **Step 7: Commit** `feat(docs): SheetPreview + PrintToolbar`.

---

## Task 8: FinalizedActions

**Files:** `src/components/docs/FinalizedActions.tsx`; Test alongside.
Port from `_components/FinalizedActions/FinalizedActions.tsx`. Rebuild in shadcn. Actions: **Open print view** (Link to `/docs/[id]/print`), **Duplicate as new draft** (`duplicateDocument(id)` → push to the new draft), and **Delete draft is NOT here** (finalized docs are immutable — no delete). Add a destructive **Delete** only on the *draft* path (that lives in the editor/view — Task 11), not here.

- [ ] **Step 1: Failing test** — renders print link + duplicate button; clicking duplicate calls the mocked `duplicateDocument` and (on `{success,id}`) pushes via mocked router; error surfaces in `role="alert"`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `duplicateDocument` from `@/server/actions/documents`; `useRouter().push(`/docs/${result.id}`)`; Button + `buttonVariants` Link. Port the error/loading states.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): FinalizedActions`.

---

## Task 9: Print route `/docs/[id]/print`

**Files:** `src/app/(admin)/docs/[id]/print/page.tsx` (new)
Port from source `docs/[id]/print/page.tsx`. Server Component; self-guard; `getDocument(id)` → `notFound()` if missing; type-dispatch to the right sheet; wrap in a shell with `PrintToolbar` (marked `data-print-hidden`) + sr-only `<h1>`; import `@/styles/print.css`. Filename logic per source (`slug()` of party + date, or the number).

- [ ] **Step 1: Implement the route** — READ source; re-point imports; use the speclr auth redirect idiom; `import '@/styles/print.css'`. The sheet renders full-size (no SheetPreview/Paginator scaling in print — the source prints the raw sheet; contracts rely on CSS page breaks). Dispatch: STP→Stipend, OFR/EXP/EXIT→Letter, CON→Contract, else→Document.
- [ ] **Step 2: Route test** `src/app/(admin)/docs/[id]/print/__tests__/page.test.tsx` — mock `requireAuthorizedUser` + `getDocument` + `next/navigation`; assert an authorized request with an invoice renders the sheet (a known bit of sheet text) and the Back link; unauthorized → redirect. (Mirror the 4a `/spec` page test pattern.)
- [ ] **Step 3: Run → PASS; typecheck; `npm run build`** (confirms `/docs/[id]/print` route compiles).
- [ ] **Step 4: Commit** `feat(docs): print route`.

---

## Task 10: useDocumentForm hook (lift) + DocumentEditor (invoice/receipt)

**Files:** `src/components/docs/editors/useDocumentForm.ts`, `src/components/docs/editors/DocumentEditor.tsx`; Tests alongside.

`useDocumentForm.ts` lifts nearly verbatim from `_components/DocumentEditor/useDocumentForm.ts` (it's already RHF + `useFieldArray` + `toPayload` for paise conversion) — re-point domain imports to `@/lib/domain/*`. `toPayload`/`emptyLineItem` are pure; keep them.

`DocumentEditor` rebuilds the source editor's markup in **Field kit + Tailwind**, keeping the transform/wiring: client picker (`listClients`), line-item field array (rupees↔paise via `toPayload`), GST rate + place-of-supply select, notes; a live `<SheetPreview><DocumentSheet doc={previewDoc}/></SheetPreview>`; Save → `doc ? updateDraft(doc.id, clientId, payload) : createDraft(typeCode, clientId, payload)` → on success `router.push(`/docs/${id}`)` (create) or `router.refresh()` (edit).

- [ ] **Step 1: useDocumentForm** — lift the file; adjust imports; no test needed beyond typecheck (it's exercised via the editor test). Confirm it compiles.
- [ ] **Step 2: DocumentEditor failing test** — mock actions + `listClients` + router; render for a new invoice (`typeCode='INV'`, clients passed as prop or mocked); assert the client field, a line-item row (description/rate/qty), GST field render; typing + Save calls `createDraft('INV', <clientId>, expect.objectContaining({ lineItems: [...] }))` with paise-converted amounts. Confirm how the editor receives clients (prop vs. fetched) by reading source — pass as prop if the source page fetches and passes.
- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Implement** — READ source `DocumentEditor.tsx`; port field structure + `toPayload` wiring into Field kit; live preview via SheetPreview + DocumentSheet. Place-of-supply + GST rate as selects (Controller). Server error in `Alert`.
- [ ] **Step 5: Run → PASS; typecheck.**
- [ ] **Step 6: Commit** `feat(docs): useDocumentForm + DocumentEditor`.

---

## Task 11: View/edit route `/docs/[id]` (draft editor | finalized view)

**Files:** `src/app/(admin)/docs/[id]/page.tsx` (replaces placeholder)
Port dispatch from source `docs/[id]/page.tsx`. Server Component; self-guard; `getDocument(id)` → `notFound()`. If **draft** → render the matching editor (with the doc + any needed lists: `listClients`/`listEmployees`/`listServices`) + a **Delete draft** control (`deleteDraftAction` via a small client `AlertDialog` component — build `DeleteDraftButton` if not already). If **finalized** → render read-only sheet in `SheetPreview` (or Paginator for contract) + `FinalizedActions`. Heading per source.

- [ ] **Step 1: Build `DeleteDraftButton`** (`src/components/docs/DeleteDraftButton.tsx`) — client; `AlertDialog` confirm → `deleteDraftAction(id)` → `router.push('/')`. Test: confirms via dialog, calls mocked action.
- [ ] **Step 2: Implement the page** — dispatch by type + status; only DocumentEditor is wired yet (Tasks 12–14 add the others); for now route CON/HR types to their editors too if built, else a temporary "editor coming" note is NOT acceptable — sequence Tasks 12–14 BEFORE finishing this page, OR implement the page dispatch now referencing editors added in 12–14 and complete the page after them. **Order: do Steps here that don't depend on the other editors (draft-delete, finalized-view for INV/REC, the dispatch skeleton), then finish the editor branches after Tasks 12–14.**
- [ ] **Step 3: Route test** — draft invoice → editor renders; finalized invoice → sheet + FinalizedActions (no edit control); unauthorized → redirect; missing → notFound. Mock store + actions.
- [ ] **Step 4: Run → PASS; typecheck; build.**
- [ ] **Step 5: Commit** `feat(docs): /docs/[id] view+edit dispatch (INV/REC wired)`.

---

## Task 12: StipendEditor

**Files:** `src/components/docs/editors/StipendEditor.tsx`; Test alongside.
Port from `_components/StipendEditor/StipendEditor.tsx`. Employee picker (`listEmployees`), stipend amount (rupees→paise), period/dates, notes; live `SheetPreview` + `StipendSheet`; Save → `createDraft('STP', employeeId, payload)` / `updateDraft(id, employeeId, payload)`.

- [ ] **Step 1: Failing test** — render for new stipend; assert employee picker + amount field; Save calls `createDraft('STP', <employeeId>, objectContaining({...paise...}))`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — READ source; Field kit + Tailwind; port transforms.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): StipendEditor`.

---

## Task 13: LetterEditor

**Files:** `src/components/docs/editors/LetterEditor.tsx`; Test alongside.
Port from `_components/LetterEditor/LetterEditor.tsx`. Employee picker; **engagement/letter-type branching** (OFR/EXP/EXIT); editable legal-assertion lines; live `SheetPreview` + `LetterSheet`; Save → `createDraft(type, employeeId, payload)` / `updateDraft(id, employeeId, payload)`.

- [ ] **Step 1: Failing test** — render for offer letter; assert employee picker + a body/assertion field; Save calls `createDraft('OFR', <employeeId>, objectContaining)`. Assert exit-letter type wiring if trivially testable.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — READ source; port branching + Field kit.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): LetterEditor`.

---

## Task 14: ContractEditor

**Files:** `src/components/docs/editors/ContractEditor.tsx`; Test alongside.
Port from `_components/ContractEditor/ContractEditor.tsx`. Client picker; service/schedule selection (`listServices`, `serviceToSchedule`); clause/schedule fields; live preview via **Paginator** + `ContractSheet` (coverFirst); Save → `createDraft('CON', clientId, payload)` / `updateDraft(id, clientId, payload)`.

- [ ] **Step 1: Failing test** — render for new contract; assert client picker + schedule/service control; Save calls `createDraft('CON', <clientId>, objectContaining)`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — READ source; port; live preview uses Paginator (`coverFirst`) + ContractSheet.
- [ ] **Step 4: Run → PASS; typecheck.**
- [ ] **Step 5: Commit** `feat(docs): ContractEditor`.

---

## Task 15: Create route `/docs/new/[type]` + finish `/docs/[id]` dispatch

**Files:** `src/app/(admin)/docs/new/[type]/page.tsx` (replaces placeholder); finish `src/app/(admin)/docs/[id]/page.tsx` editor branches.

- [ ] **Step 1: Implement `/docs/new/[type]`** — Server Component; self-guard; validate `type` param → `DOC_TYPES` slug → typeCode (read source for the slug→code map, e.g. `invoice`→`INV`); fetch the lists the editor needs; render the matching editor with no `doc` (create mode). Invalid type → `notFound()`.
- [ ] **Step 2: Finish `/docs/[id]`** — now that all 4 editors exist, wire the draft branch to dispatch CON/HR/STP to their editors (not just INV/REC).
- [ ] **Step 3: Route test** for `/docs/new/[type]` — `/docs/new/invoice` renders DocumentEditor in create mode; invalid type → notFound; unauthorized → redirect.
- [ ] **Step 4: Run → PASS; typecheck; build** (all `/docs/*` routes compile).
- [ ] **Step 5: Commit** `feat(docs): create route + complete view dispatch`.

---

## Task 16: Full verification

- [ ] **Step 1: Full suite** — `cd /Users/shivanshupareek/Developer/qera/speclr && npm test` → all green (4a's 208 + all new docs tests), no console errors.
- [ ] **Step 2: Typecheck** — `npm run typecheck` → clean.
- [ ] **Step 3: Build** — `npm run build` → succeeds; routes list `/docs/new/[type]`, `/docs/[id]`, `/docs/[id]/print`.
- [ ] **Step 4: Manual browser (record results)** — the pixel/pagination/print checks jsdom cannot do. Per the spec's Verification §2:
  - Create each of the 7 doc types; live preview correct; save → draft at `/docs/[id]`.
  - **Side-by-side pixel diff each sheet vs the marketing original**: masthead, fonts, spacing, borders, totals, GST rows (make one intra-state + one inter-state invoice), terms columns, footer; contract black cover + clause pagination; HR exit wording (intern vs employee).
  - Edit draft → persists. Finalize → number assigned, read-only (no edit/delete), snapshot frozen (edit client after finalize → issued doc unchanged). Duplicate → new draft. Delete draft → gone.
  - Print route: full A4, chrome hidden, "Save as PDF" filename = number; contract breaks between clauses.
  - Paginator: Fit/100%, prev/next, counter, keyboard.
  - Auth redirects from every doc route.
- [ ] **Step 5: Final commit** (only if manual surfaced fixes) `fix(docs): manual verification findings`.

---

## Self-review checklist (completed during authoring)

- **Spec coverage:** print.css+asset (T1); 4 sheets (T2–T5); Paginator (T6); SheetPreview+PrintToolbar (T7); FinalizedActions (T8); print route (T9); useDocumentForm+DocumentEditor (T10); view/edit route + DeleteDraftButton (T11); Stipend/Letter/Contract editors (T12–14); create route + dispatch completion (T15); verification (T16). Every spec component + route covered.
- **No placeholders:** sheets/editors say "READ source + translate/port faithfully" with the pinned contracts (action signatures `createDraft(typeCode, clientId, data)` etc., payload via `toPayload`, type-dispatch order, styling rules) — the ~4,700-line source is the authoritative spec, deliberately not transcribed; the load-bearing wiring and the tricky bits (GST intra/inter rows, engagement branching, paise conversion, cover pagination) are pinned by tests and explicit instructions.
- **Type/contract consistency:** `ActionResult`, `AdminDocument` union + variants, `createDraft`/`updateDraft` 3-arg signatures, `duplicateDocument` returns `{id}`, `DOC_TYPES` dispatch, Field-kit + `render`-prop + Controller conventions — all consistent and matching verified backend signatures.
- **Ordering risk flagged:** T11 (view page) depends on editors from T12–14; the plan sequences DocumentEditor (T10) → view page skeleton wired for INV/REC (T11) → other editors (T12–14) → finish dispatch (T15). Called out explicitly in T11 Step 2.
- **CWD hazard flagged:** every bash step reminds to `cd` to speclr (the shell drifts to the marketing repo).
