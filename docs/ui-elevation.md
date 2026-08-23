# UI elevation, phase by phase

> The working checklist for taking speclr's chrome to a 2026-27 standard. Every
> item carries the ID it had in the original review, so "A3" means the same
> thing here, in a commit message and in conversation.
>
> **This is a decision log, not a plan to execute wholesale.** We take items one
> at a time, try them, and record the verdict. A rejected item stays on the page
> with its reason, or it gets re-proposed in six months by somebody who does not
> know it was already tried.
>
> The document sheets in `src/components/docs/sheets/` are out of scope
> throughout. They are approved legal artifacts (`AGENTS.md`), and nothing in
> here touches them.

**Status key:** `[ ]` open · `[x]` shipped · `[-]` rejected (reason inline) ·
`[~]` deferred (condition inline)

---

## Phase 0 — Foundations

Nothing after this phase is safe until these exist, because every later item
either spends a token or repeats a layout that should be a component.

**Shipped 22 August 2026.** All eleven are settled. The written result lives in
[`docs/design.md`](design.md), which is now the design law and is imported by
`AGENTS.md`; this section keeps only the verdicts.

- [x] **0.1** Page inset 36px. Header `px-9`, page bodies `p-9`. *Done 21 Aug 2026.*
- [x] **B1** `PageBody` / `PageHeader` in `src/components/admin/Page.tsx`. Replaced a hand-typed inset in 13 files and a hand-typed `h1` in 9. Both **enforced**. The pass found `/client/checklist` had already drifted to `p-6` — the drift this item predicted, already happened, unreported.
- [x] **B4** Spacing frozen at **24 section / 16 card / 8 control / 6 inline**. Taken from what the tree already does (`gap-4` is the dominant card gap) rather than the 20/24 originally proposed, which would have been a wide diff for 4px.
- [x] **C5** Type capped at **24 page title / 16 card title / 14 body / 12 meta**. Note: 24px was *already* the page title everywhere. The claim in the first draft of `design.md` that pages used 16px was wrong.
- [x] **C1** Regular and medium in the chrome, semibold reserved for the page title, which `PageHeader` now owns.
- [x] **D1** Three surfaces, one direction, written into `design.md` §1.7 with "never nest a card in a card".
- [x] **D3** Chroma capped in `design.md` §1.1: colour means state, never decoration.
- [x] **O5** Nested radius rule written into `design.md` §1.3, with `calc(var(--radius-sm) + 2px)` named as the legitimate way to express it.
- [x] **H1/H2** Motion scale set to **75 state / 100 overlay / 200 panel**, one easing `ease-standard` = `cubic-bezier(.2,0,0,1)`, 75ms as the global default. **Enforced.** Three corrections to the proposal, all from the audit: overlays and panels were *already* at 100/200, so the proposed 150/250 would have made the app slower; the state tier was never written down at all, so every hover ran at Tailwind's 150ms default; and the sliding pill indicator was drawn by three components at 500/300/300ms with the tab panel sliding at **1500ms**, all unaudited shadcn defaults.
- [x] **H5** `prefers-reduced-motion` global override. **Already shipped** and predates this checklist — one blanket media query in `globals.css`, which is only safe because motion here is never information.
- [x] **D2** Borders over shadows, `shadow-*` confined to genuinely floating surfaces. Written into `design.md` §1.7.

**Enforcement:** three new rules landed in `design-system.test.ts` with the code
— hand-typed page inset, hand-typed page title, off-scale duration. Each was
confirmed to fail before the violations were fixed, and each caught real ones.
A convention with no test is a convention that lasts one sprint.

**What is not yet enforced, and why:** B4, C5, C1, D1, D3, O5 and D2 are house
rules in `design.md` rather than tests. Each is a judgement a regex reads badly
— "is this card inside another card", "is this blue decorative" — and a rule
that fires on the wrong thing gets exempted until it means nothing. They
escalate to tests the second time one is broken, which is `design.md` §0.

---

## Phase 1 — What is visibly wrong right now

The Records screenshot, item by item. Highest ratio of perceived quality to
effort in the whole document.

- [x] **A1** One name for the page. *"Clients" everywhere: the client side holds
  exactly one kind of record, so the grouping name bought nothing and cost the
  rail, the breadcrumb and the `h1` their agreement.*
- [x] **A2** One blue per viewport. *The rail's "New document" is the app's one
  blue and is on screen on every page, so the page-level creates (Add client,
  Add employee, New invoice on a type page) are `variant="outline"`. Add client
  became an `AddLink`, which it should have been already: it now gets the plus
  animation every other create action has.*
- [x] **A3** Table in a card. *`TableCard` in `components/admin/Page.tsx`, adopted
  by all three tables. No card **header**: the page `h1` is directly above it and
  a title row inside the card would be the same word twice. `overflow-clip`, not
  `overflow-hidden`, for the reason `CONTEXT.md` §5e gives for `AdminShell`.
  Enforced: a `<Table>` in a file with no `TableCard` fails the build.*
- [x] **A4** Header icons deleted. *`ColumnLabel` went with them: with the icon
  gone it wrapped a string in a span. Its docstring argued that one glyph per
  column reads as a type marker; against a word that already names the column,
  it does not.*
- [x] **A5** Phone formatted on read. *No new dependency: `formatPhoneForDisplay`
  has existed and been tested since phones were added and **nothing outside its
  own test called it**, so every list printed `+919876543210`. Enforced: a
  `{x.phone}` printed raw fails the build.*
- [-] **A6** User card name line. **Withdrawn, not a defect.** *The "N" in the
  screenshot was Next's dev-mode indicator sitting over the avatar. The card
  shows the right name and the right initials.*
- [x] **A7** Onboarding progress as a ring. *An 18px ring at the end of the row
  with no column heading: this column is scanned, not read, and the question is
  "which of these are unfinished". Nothing started draws as a **dotted** track
  with no arc, because a zero-length arc is indistinguishable from a rendering
  failure. The figures stay in the tooltip and in the accessible name, and the
  tooltip is where the moving denominator gets explained (§5d-i: a client who is
  one person has six steps).*
- [x] **A8** Card footer: count left, pager right. *`usePagedRows` and
  `Pagination` already existed at `PAGE_SIZE = 10` and already render nothing at
  a single page, so "only past ten rows" was the behaviour, not a new condition.
  Clients and employees were simply never wired to them. `rowCountLabel` gives
  the count one wording everywhere ("24 clients", "1–10 of 24 clients").*
- [x] **A9** The right-panel toggle. *Resolved in Phase 7 with **B3**, and not
  by moving it. It stays in the rail's own header, because that is the rail it
  opens and the only place it can be found once the rail is a collapsed strip;
  what was actually wrong is that the three column headers sat on three
  different centre lines. All three are `h-14` now.*
- [-] **A10** The "Template name" seed row. **Not a code defect.** *No such
  string exists in the source; it is a row in the dev database. Deleting the row
  closes it.*

---

## Phase 2 — The table

This is an internal ops tool. The table is the product.

- [x] **E1** Row height 44 to 48px, 12px vertical padding. No lower without a density toggle.
- [x] **E2** Row hover `bg-muted/40` at 75ms.
- [x] **E3** Whole row is a real `<a>` on documents and clients. Not employees: they are edited in a rail panel and have no URL to point at.
- [-] **E4** Keyboard navigation: arrows or `j`/`k`. Deferred: E3 makes every row a real link, so Tab and Enter already open one. Revisit when a list is long enough that Tab is the slow way.
- [x] **E5** Row actions revealed on `group-hover`, always visible on `focus-within`.
- [x] **E6** Sort on the sortable columns only. Arrow persistent when sorted, on hover otherwise.
- [-] **E7** Column filter chips. Deferred: the GSTIN column it names no longer exists, and filters are for a list you cannot see the end of.
- [x] **E8** A written empty state per table, using the existing `ui/empty`.
- [x] **E9** Skeletons that match the real row height and column widths. `TableSkeleton` in `admin/Page.tsx` is a real `TableCard` holding a real `Table` of real `TableRow`s, so the height, padding, rule and radius are the table's own and cannot drift; only the bars are fake. Column widths are the one approximation, since the real table is sized by content that has not arrived, and a route with a known column set passes its own.
- [x] **E10** One nil glyph, used everywhere. `NIL` in `lib/utils.ts`, a hyphen: the em dash is banned by the house rule and the en dash belongs to numeric ranges.
- [x] **E11** Truncation via `TruncCell`/`CopyCell`, end-truncated with the full value on `title`. Middle truncation for emails skipped: it needs per-cell measurement in JS.
- [-] **E12** Sticky first column at narrow widths. Rejected: it would mean putting horizontal scroll back inside the card, which is what pinned the sticky header to a box that never scrolled (B5). Three tables of six short columns on a tool used at desk width do not need it, and buying it back costs the header.
- [x] **E13** Row count in the card footer.
- [x] **E14** Copy on hover (`CopyCell`, wrapping the existing `ui/copy-button`) for document number, email and phone. GSTIN, PAN and employee code are not columns on any list today; the component takes them the day one is.
- [x] **B5** Sticky table header. The hairline is permanent, not scroll-conditional: that needs a scroll listener for a hairline nobody will miss. Required dropping `overflow-x-auto` from the table container, which was the scrollport pinning the header.
- [x] **C2** Tabular figures on every numeric cell.
- [x] **C3** Money right-aligned. Symbol stays in the cell: `formatINR` prints it and one column does not justify a second format.
- [x] **C8** Table cells get line-height 1, not prose line-height.
- [-] **E15** Zebra striping. Rejected up front: with a container, dividers and hover it is pure noise.
- [-] **D6** Full-row status tinting. Rejected: destroys scannability and breaks in dark mode. Tint the status cell or a 2px leading marker instead.

---

## Phase 3 — States

Where most products actually fail, and the phase most likely to expose real
bugs rather than cosmetic ones.

- [x] **I1** Every empty surface gets written copy. Never "No data". *Was already true of the six lists; the two new panels (`error.tsx`, `/no-access`) were written the same way.*
- [x] **I2** Three distinct empties: first-run, filtered-to-nothing, error. *First-run and filtered already existed and are visibly different panels. The third was missing: an `(app)/error.tsx` beside `loading.tsx`, so a thrown page keeps the rail and header, with a retry and the Next `digest` quoted so a screen can be matched against a Vercel log.*
- [x] **I3** 150ms delay before skeletons so fast responses do not flash. *CSS, not a timer: `animate-in fade-in fill-mode-backwards delay-150` on `loading.tsx`'s bars.*
- [x] **I4** Autosaving surfaces show inline "Saved HH:MM", not a toast. *`savedAt` added to `useDraftAutosave`; `AutosaveStatus` prints local 24-hour time. "Saved" alone is equally true of a write that landed before the connection dropped.*
- [x] **I5** Failed saves error inline with the reason and a retry. *`SaveError` in `draftStatus.tsx` replaces the same `Alert` re-typed in four editors, and adds the retry none of them had. Not "beside the field": this region carries finalize refusals as well as write failures, and those belong to the document, not to one input.*
- [x] **I6** A quiet bar when a mutation cannot reach the server. *`OfflineBar`, above the header. Claims exactly what `navigator.onLine` knows: false is reliable, true only means there is a network. A condition, so not a toast.*
- [x] **I7** Design `/no-access` properly rather than leaving it a redirect target. *Rebuilt on `Empty` + `Button`. It deliberately names neither the allowlist nor who is on it.*
- [x] **I8** Immutability made visible. *A lock in the status badge, and a stated line above the actions: "Finalized and sealed… correct it by duplicating it as a new draft." The edit controls were already absent, and absence reads as "still loading" as easily as "sealed".*
- [x] **D4** One status vocabulary and one badge component. *`ui/status-badge.tsx`, enforced by `design-system.test.ts`. Only the statuses that exist: `void` is reserved, overdue and blocked are not modelled, and a badge for an unreachable status is one nobody maintains.*
- [x] **N5** Every status carries a word, never colour alone. *Guaranteed by D4 rather than asserted: the word is in the component.*

---

## Phase 4 — Controls and icons

- [x] **F1** Three button tiers, strictly assigned. Destructive is ghost-red, promoted to filled only inside its confirmation. *`AlertDialogAction` solidifies when `variant="destructive"`, and only there. The fill uses the new `--destructive-foreground`, because white on the dark destructive was 2.89:1.*
- [x] **F2** Two button heights: 32 default, 28 dense. Delete the rest. *`sm` (24) and `icon-xs` (20) deleted, and TypeScript is the enforcement. Three heights survive, not two: `form` (38) is `Input`'s height and exists so a button beside a field matches it, which is the mismatch it was added to stop.*
- [x] **F3** Every icon-only button carries a tooltip and an `aria-label`. *All 21 already did. Now enforced in `design-system.test.ts`, since the next one is written in a hurry and nothing on screen looks wrong when it is missed.*
- [x] **F4** Async buttons: disable, swap icon for spinner, keep label and width fixed. *One `pending` prop on `Button`, replacing seven hand-written label swaps. A control that resizes under the cursor is one you can miss on the way down.*
- [x] **F5** Confirmations name the object and the consequence. Reversible actions get undo instead of a dialog. *Already true via `RemoveButton` and `ConfirmActionButton`; archiving got its undo in Phase 6. The remaining wording work is P2, in Phase 10.*
- [x] **F6** `:focus-visible` rings, consistent, never removed. *Audited: `buttonVariants` owns the ring, and the app contains exactly one `outline-hidden`, on the autofocused palette input where focus cannot move and the popup is the boundary. No test: a file-level heuristic here would pass on any file that mentions `focus-visible` anywhere, which is false confidence, not enforcement.*
- [x] **F8** Shortcut hints in tooltips for anything with a shortcut. *Already true. ⌘B on the rail toggle, ⌘K on search, ⌘D and the ⌥ letters in the new-document palette, all through `Shortcut`.*
- [x] **G1** One icon library, one stroke, two sizes (16 in rows, 20 in nav). *Library and stroke yes. **Two sizes rejected**: the control's size variant already chooses the glyph size, which is one decision per control rather than 87 hand-made ones, and 12px inside a 24px button is right in a tool this dense. Recorded in `design.md` §1.5.*
- [-] **G2** Icons muted; they match the label colour only when the row is active. *Rejected. The rail is already deliberately muted as a whole (`--sidebar-foreground` is 0.44), and the active row is already marked by a fill, which is the louder signal. A second level of muting inside an already-muted surface buys nothing and costs contrast.*
- [x] **G3** No icon that does not disambiguate. Column headers, card titles and section labels lose theirs. *Audited: none to remove. Nav rows and the view switcher keep theirs, which is what the rule is for.*
- [x] **G4** Optical alignment pass on the Lucide outliers. *Done in Phase 2; `design.md` §1.5 holds the three exceptions.*
- [x] **F7** Segmented controls instead of dropdowns for binary and ternary choices. Done as it stands: the view switcher is already tabs, and the audit found no binary or ternary dropdown left to convert.

---

## Phase 5 — Forms and onboarding

The deepest flow in the app, and the one a real user would meet first.

- [x] **J1** One column, always. *Already true. The only grids in onboarding are the kind and country choosers, the attachment slots and a day picker, none of which are field columns.*
- [x] **J2** Labels above inputs. No placeholder-as-label. *Above and 14px in `size="form"`, which is the data-entry scale. **Muted was refused**: the visible `<Label>` is what identifies every input here, and is the stated reason `--border`/`--input` are not held to 1.4.11 (`contrast.test.ts`). Muting the one thing carrying that job to save a shade is a trade in the wrong direction.*
- [x] **J3** Help below the field. *Satisfied by a different vehicle, deliberately. `<FieldDescription>` is banned outside `ui/` and the ban is enforced; standing helper text under every field pushes the layout around and shouts at somebody who has done nothing wrong. What genuinely needed to be *in place* rather than behind the icon was a **derived value's provenance**, which is now `DerivedNote`. Explanation stays in `InfoTip`; provenance is inline.*
- [x] **J4** Validate on blur, revalidate on change. *Already true in onboarding under `mode: 'onTouched'`, which is exactly this and was chosen over `onBlur` for the lag it removes. `StudioForm` and `EmployeeForm` had missed it and now match.*
- [x] **J7** Visible step progress with the step name. *Already true: `StepNav` is the whole indicator, and the bar, the "Step 3 of 7" and the counter were removed because they said what it already showed.*
- [x] **J8** Save and close on every step. *A real submit, not a link: it writes the current step first, so the claim in the label is true for what was typed thirty seconds ago. A ref carries "leave instead of advance", and any other submit clears it, so a failed save-and-close cannot turn the next ordinary save into an exit.*
- [x] **J9** Autofocus the first empty field. *In `StepForm`, so all seven get it. Nothing is focused when the step is already filled, which is what going back looks like. Inputs and textareas only: focusing a combobox button offers nothing to type into.*
- [-] **J10** Enter submits. **Refused in the wizard, with the reason already in the code.** `blockImplicitSubmit` exists because a browser submits on Enter in a single-line input, which on a seven-step wizard advances the step from a half-filled form. Advancing is a deliberate act. Escape already cancels everywhere: every dialog is Base UI's, which handles it natively.
- [x] **J11** Mark the minority, which here is usually not the optional ones. *`FieldInfo`'s `optional` prop and `OptionalMark`, enforced. On four of six steps **every** field is optional, so marking each marks nothing and the step says it once (`allOptional`). Three ad-hoc spellings removed.*
- [x] **J12** Group with a hairline and a small label. *Already true: `FieldSet` + `LegendInfo` + `FieldSeparator` throughout, and no `<Card>` appears anywhere in onboarding.*
- [x] **J5** Field-level findings preserved rather than collapsed to "Invalid". *Already true via `superRefine`, `CONTEXT.md` §5f.*
- [x] **J6** Format as the operator types; tick only where a check ran. *Already a house rule in `AGENTS.md`.*

---

## Phase 6 — Feedback

- [x] **K1** Toasts bottom-right, 4s, max three stacked. *`ui/sonner.tsx`, mounted once in the `(app)` layout, outside the shell so `overflow-clip` cannot cut one off. `richColors` off: the house palette already says success and destructive.*
- [x] **K2** Undo in the toast for anything reversible. *Which today is exactly one action: archiving a client. The undo calls the real inverse, not a dismiss.*
- [x] **K3** Optimistic list mutations with rollback. *`useOptimistic` in `ClientManager` for archive and delete. React reverts it when the transition ends, so a refusal needs no rollback code at all, because the row comes back and the reason is in the alert above it.*
- [x] **K4** No toast for a success that is already visible on screen. *Deleting a client, saving a draft and saving an onboarding step all show themselves and stay silent. Errors are never toasted either: four seconds is not long enough to read a reason and act on it.*

---

## Phase 7 — Navigation, keyboard, density

The phase that most reads as "expert software" for the least code.

- [-] **L1** Merge ⌘K search and ⌘D new-document into one palette with modes. *Refused, and `NewDocumentCommand`'s own docstring already said why: ⌘K finds a document that exists, ⌘D makes one that doesn't, and merging them makes both vaguer. Both are bound, both are discoverable (⌘K prints its cap in the field, ⌘D in the rail, and `?` now lists both). This is a rewrite of two working surfaces to arrive at a mode prefix nobody asked for.*
- [-] **L2** Recent items in the palette's empty state. *Refused on what it would have to store. A recents list is a cache of client and employee names sitting outside the record, and `CONTEXT.md` §5d's storage rule then puts it in `sessionStorage`, where it dies with the tab and is useless. Reopen it the day there is a server-side place for it.*
- [-] **L3** Breadcrumbs truncate in the middle, never wrap. *Refused on measurement. The trail is never deeper than three, every crumb already `truncate`s and the row is `min-w-0`, so it cannot wrap today. Middle-truncating a **label** is not a CSS operation: it needs a measure pass per crumb per resize. Reopen it if a fourth level ever lands.*
- [-] **L4** Split "New document" button remembering the last-used type. *Refused. "Consider" was the right word and the answer is no: ⌘D and the rail already list every type one keystroke away, and a button that remembers is a button that is wrong the second time you use it and gives no sign of it.*
- [x] **L6** `g` then a letter to jump between sections. *`nav.ts` gains `jump`, `KeyboardShortcuts` performs it. Letters are unique across both profiles for the reason `shortcut` already was, with `h` the one deliberate exception because "home" means the side you are on. Derived from the nav, so a page that moves takes its binding with it.*
- [x] **L7** `?` opens a shortcut cheatsheet. *The other half of L6, and the reason it was worth doing: five ⌥ letters were visible only if you happened to open the ⌘D palette. The list is built from the same nav, so it cannot go stale.*
- [-] **M1** Density toggle (comfortable / compact), stored per user. *Refused. Two row heights is two layouts to keep in step and a second thing every table has to be verified in, for a preference one operator has not asked for. The 44px row was chosen deliberately in Phase 2; if it is wrong, the fix is to change it, not to ship both.*
- [x] **M2** Remember sort and column widths per table. *Half done already and half not applicable. `DocumentsBrowser` persists the "show sorting" preference in `localStorage`, which is the durable choice; the **order** is deliberately not persisted, because a list that silently reorders itself next visit is a list nobody can explain. No table has resizable columns, so there are no widths.*
- [x] **M3** Verify no theme flash on load. *`suppressHydrationWarning` plus next-themes' pre-paint script were already right for the app's own colours. What was missing is the part the app does not paint: `color-scheme` is now declared per theme, so the canvas, the native controls and the scrollbar are dark before the first stylesheet lands.*
- [x] **B2** Cap content width. *1400px, centred, on `PageBody` and not on the shell: the chrome belongs to the window, the content belongs to the reader.*
- [x] **B3** Align the sidebar wordmark row and the header. *They were six pixels apart. Both columns start 8px down, the header is `h-14`, so the wordmark row is `h-10` under the header block's own padding and the two now sit on one centre line. They are the first two things anybody reads.*
- [x] **B6** Sticky page header on long pages. *Already true, by a better mechanism than sticky: the app header is pinned outside the scrolling region and names the page, and onboarding is a flex column with a fixed header, a fixed footer and a scrolling middle, so nothing it needs ever leaves the screen.*
- [x] **L5** Tooltips survive the collapsed rail. *Already true.*

---

## Phase 8 — Accessibility

Non-negotiable per `dev/master-accessibility-checklist.md`; listed as its own
phase so it is verified rather than assumed.

- [x] **N1** Measure every muted grey against its surface, both themes. Light neutral palettes fail 4.5:1 exactly here. *And they did. `src/__tests__/contrast.test.ts` does the arithmetic on the real tokens and found three failures, each one a colour checked against the wrong background: `--muted-foreground` on `--muted` (4.34), `--ring` on white (2.59, under 1.4.11), white on the dark `--destructive` (2.89). All three fixed; the test is what keeps them fixed.*
- [x] **N2** Real `<table>`, `<th scope="col">`, visually hidden `<caption>`. *Captions were already there. `scope="col"` is now the `TableHead` default, so a row heading overrides rather than every column heading remembering.*
- [x] **N3** Focus trapped in dialogs and sheets, restored to the trigger on close. *Base UI's own behaviour, on every dialog, sheet and popover in the app. Not re-implemented and not re-tested: testing a dependency's contract in jsdom tests jsdom.*
- [x] **N4** Live regions for save status and toasts. *Toasts come with sonner's. The save status had `role="status"` and a real bug behind it: it returned `null` when idle, and a live region that mounts carrying its message announces nothing, so the first save of every session was the one nobody heard. It is always mounted now.*
- [x] **N6** 40px minimum hit targets in rows. *28×40, the height from a pseudo-element so nothing moves. **Vertical only**: row actions sit 2px apart and a wider target would overlap its neighbour, which turns "hard to hit" into "deleted the row instead of editing it". 40 not 44 because the row is 44 and a taller target spills into the row above.*
- [x] **N7** Skip-to-content link. *First in the tab order, landing on the scrolling content region. Not on `SidebarInset`: that is the `<main>` and it holds the header the link exists to skip.*

---

## Phase 9 — Craft

Individually invisible, collectively the difference between competent and
expensive.

- [x] **O1** Explicit `::selection` colour. *`--primary/25` with `color: inherit`. The default is the OS accent, which lands on top of our own blue half the time; a fixed selection foreground is how selected text in a destructive dialog comes out unreadable.*
- [x] **O2** Styled thin scrollbars. *`scrollbar-width` and `scrollbar-color`, the standard properties, inherited from `html`. No `::-webkit-scrollbar` block: it is the non-standard spelling of the same thing and has to restate the track, the thumb, the corner and the buttons to avoid drawing a default one. The thumb is `--border`, so a scrollbar reads as an edge.*
- [x] **O3** Caret colour in dark mode. *Already correct: the browser takes it from `color`. The one place it is overridden is the autofill rule, which sets `-webkit-text-fill-color` (Chrome takes the caret from the fill, not from `color`) and already sets `caret-color` for exactly that reason. Written down so the next reader knows it was considered.*
- [x] **O4** No layout shift on hover. *Audited: all three `hover:border` sites already carry a border at rest. Nothing to fix, and §1.6 already bans the class of change.*
- [x] **O6** Hairlines are borders, never shadows. *Already true and now written down in §1.7: every floating surface carries `shadow-md ring-1 ring-foreground/10`, and the **ring** is the edge. The shadow is depth for the light theme, where it can be seen.*
- [x] **O10** Reserve the title's space. *`min-h-9` on `PageHeader`'s row. The app header sits outside the scrolling region and never moved; what moved was everything under a title that arrived a beat after its neighbours.*
- [-] **O11** speclr passes its own icon spec. *Half done, half not mine to do. `appleWebApp.title` is set, so a pinned tab is not named after whichever page was open. **`src/app/favicon.ico` is still Next.js's default**, byte for byte, which means the tool that validates favicons ships someone else's. Fixing that is choosing a mark, which is a design decision the founder owns, not one to invent in a craft pass. No OG image: the app is `noindex` and never shared. `themeColor` refused in `layout.tsx`, with the reason in place: it takes a colour string rather than a variable, so it means a second copy of the background in hex with nothing keeping it in step.*
- [x] **O12** Print stylesheet for the chrome. *In `globals.css`, separate from the sheets' `print.css`, which is loaded by the sheets alone. Rails, header, toasts and anything `data-print-hidden` go; the shell is unpinned so content flows past one page; the sticky table header is made static, since there is no scrolling on paper for it to answer.*
- [x] **C4** Label/value hierarchy by colour at one size. *Two offenders: `IconSpecCard`'s definition lists set the label 12px against a 14px value, and the ⌘D palette footer was on an off-scale 11px. Making the label smaller **as well** as muted says it twice and leaves the label unreadable at the size it lands on.*
- [x] **C6** Optical letter-spacing. *`-0.01em` on the page title, `+0.01em` on the two 12px meta labels that had to hold their own beside a value. Nothing in between gets tracking: this is a correction at the ends of the scale, not the start of a system.*
- [x] **C7** Sentence case, never uppercase. **Enforced.** *Two sites, neither of them a table header (those were already sentence case): the search's group headings and the CTC calculator's stat labels. The rule bans `uppercase` outside `ui/` and the sheets, where "DESCRIPTION" is the printed artifact's own typography and Rule 46 wants several headings verbatim.*
- [x] **D5** Dark mode as its own design. *Text 0.985 → 0.93 (pure white on near-black haloes; still 13:1), every foreground that shared that value moved with it or a popover would sit brighter than the page behind it; `--border` 10% → 14% and `--input` 15% → 22%, because a hairline that reads as an edge on white is nearly gone on black **and** the table's fill has just been removed, so the row rules are now the only structure a list has. Shadows-become-borders was already true (O6).*
- [-] **H3** Animate opacity and transform only. *Refused as a sweep. The `transition-all` instances are shadcn's own on `button`, `badge` and `tabs`, animating a handful of declared properties that are cheap in practice; the two `transition-[width]` are the rail collapse and a progress bar, where width **is** the animation and a transform would break the reflow of everything beside it. Rewriting library defaults for a rule none of them breaks in effect is churn with a real regression surface.*
- [-] **H4** 150ms fade on the content region at route change. *Refused on its cost. Restarting a CSS animation on navigation means remounting the content subtree, which throws away scroll position, focus and any uncommitted form state to buy a fade. The chrome already stays nailed down, which was the half that mattered.*
- [x] **H6** Changing totals do not jitter. *The roll animation is refused (a digit that animates is a digit you cannot read while it moves, and §1.6 says motion is never information). What the item was really about is real: `TotalsPanel` was the one figure in the app recomputed on **every keystroke** and the one that was not `tabular-nums`, so its digits changed width as they changed value and the column shifted under the cursor.*
- [x] **O7** Number and date formatting owned by `domain/dates` and `domain/money`. *Already true.*
- [-] **H7** Staggered list entrance animations. Rejected: dated, and slows perceived load.

---

## Phase 10 — Copy

- [x] **P1** Nouns for labels, verbs for buttons. *Audited across the admin and the editors. Already held; nothing to change.*
- [x] **P2** Name the consequence. *"Are you sure?" appeared nowhere; "This cannot be undone." appeared five times, which is true of most buttons and weighs nothing. `DELETE_DRAFT_CONSEQUENCE` says the typing goes **and the numbering does not move**, which is what somebody hesitating is actually weighing. The client delete already named the attachment erasure; the employee one now names its own refusal, and the server learned to give it.*
- [x] **P3** Derived fields explain themselves inline. *`ui/derived-note.tsx`, on all four: place of supply, the invoice due date, the zero-rating label and a PAN read out of a GSTIN. The split is deliberate, the rule stays in the info icon (same on every document), the answer goes under the field (not).*
- [x] **P4** Legal wording gets a distinct treatment. *`printed` on `EditorSection`: an accent rule down the section and a "Prints as written" tag. The line is `CONTEXT.md` §5b's, content versus data, because both print and only one changes what the document **says**. `ContractEditor` is not sectioned this way and is left as it is; its whole surface is the clauses.*
- [x] **O8** Middot in joined labels. *Six sites were on an em dash, which the writing rule forbids outright; `taxIds/decode.ts` was already on the middot and is the precedent followed.*
- [x] **O9** Sentence case in the chrome. *Audited: one violation, shadcn's own "Toggle Sidebar".*

---

## Standing refusals

Not open items. These were considered and rejected; re-proposing one needs a
reason, not a preference.

- **Q1** No gradients, glassmorphism, or mesh backgrounds. The header's `backdrop-blur` is the maximum dose.
- **Q2** No animating the sidebar rail width on route change.
- **Q3** No illustrations in empty states. This is an internal tool.
- **Q4** No redesign of the document sheets.
- **Q5** No second font.
- **Q6** No colour added to make something "pop". If it needs to pop, remove something near it.

---

## The five that matter most

If the run stalls, these are the ones that carry the screenshot: **A3**, **A4**,
**A2**, **E2 + E3 + E5**, **C2**. None is more than an hour.
