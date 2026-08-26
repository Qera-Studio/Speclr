# DESIGN — speclr

> The guidebook and the rulebook. **Read this before building any new surface.**
> If you are about to type a colour, a spacing number, a radius, a duration or a
> button, the answer is already in here. If it is not, you are about to invent
> one, which means you add a row here in the same commit.
>
> This file grows as `ui-elevation.md` is worked through. Anything decided there
> that will be reused, or that changes how a whole class of thing looks, lands
> here. `ui-elevation.md` is the **to-do list**; this is the **result**.

---

## 0. How to use this file

**Building something new:** read §1 (foundations) and the §2 entry for the
primitive you need. Compose from `src/components/ui/`. If nothing fits, §5 says
what to do.

**Changing something everywhere:** change it here first, then in the code, then
add the test that stops it drifting back (§4).

**Status key**, on every rule:

| | Meaning |
|---|---|
| **enforced** | A test fails if you break it. Named in §4. |
| **house** | Agreed and applied, not yet mechanically enforced. Enforce it the day it gets broken twice. |
| **open** | Decided in principle, not built yet. Carries a `ui-elevation.md` id. |

**The escalation rule.** A house rule that gets broken a second time becomes an
enforced rule in the commit that fixes the second break. That is the §5e
mechanism from `CONTEXT.md`, and it is the only thing keeping this file from
becoming decoration.

---

## 1. Foundations

### 1.1 Colour — **enforced**

Every colour is a theme token. No Tailwind palette class (`bg-blue-500`), no
hex literal, anywhere outside `src/app/globals.css` and the document sheets.

Tokens live in `globals.css` as OKLCH, defined once for light and once for
`.dark`. To add one: add the CSS variable in both blocks, map it under
`@theme inline`, and write the comment explaining why the palette could not do
it (`--warning` is the model: amber-500 fails AA on our background, so it is a
token).

**The neutrals are taupe, hue 40, not grey.** Every neutral token is
`oklch(L C 40)` on the same lightness ramp a grey would use, and the chroma
follows the curve written at the top of the `:root` block: it peaks near 0.02
mid-ramp and tapers to almost nothing at both ends, because a near-white or a
near-black holds a hue badly and starts reading as a cast. A new neutral
interpolates from that curve. It is not a free choice per token: two surfaces
at slightly different hues is exactly the "boilerplate" look this replaced,
arrived at one token at a time.

The chromatic tokens keep their own hues, and the dark mode's `--border` /
`--input` stay a pure white overlay, which composites to a taupe hairline on
its own. A *fill* may never be an alpha white for that reason: white lends no
hue, so a wash of it over taupe composites grey however warm the ground is.
That is what `--raised` exists to stop, and it is why the active tab and the
active profile use a token rather than `bg-input/85`.

| Use | Token |
|---|---|
| Page ground | `bg-background` / `text-foreground` |
| A raised surface (card, popover, dialog) | `bg-card`, `bg-popover` |
| A pill sitting on a track (active tab, active profile) | `bg-raised` |
| Anything quieter than body text | `text-muted-foreground` |
| A resting fill (hover, selected, chip) | `bg-muted` / `bg-accent` |
| The action colour | `primary` |
| Destructive | `destructive` as a **tint** (`bg-destructive/10 text-destructive`) everywhere it sits among other controls; solid (`bg-destructive text-destructive-foreground`) only as the confirming button inside its own dialog |
| Advisory, between pass and fail | `warning` |
| Any hairline | `border-border` |
| Focus | `ring-ring` |

**Never mix a token with a palette class to get an in-between shade.** Use
`color-mix(in oklch, var(--token), …)`, as `button.tsx`'s `secondary` hover and
`raised` variant do. That keeps the derived shade tied to the theme.

**Opacity suffixes are the house way to get a lighter token** (`bg-primary/10`,
`ring-ring/30`). Prefer them to a new token; add a token only when the value has
a *meaning* that needs naming.

### 1.2 Spacing — **house**

One scale, and it is Tailwind's. The vocabulary in use, in order of how often
it should appear:

Four values carry the rhythm. Everything else is an exception that wants a
reason.

| Step | px | Where |
|---|---|---|
| `gap-6` | 24 | **Section.** Between the blocks of a page. |
| `gap-4` | 16 | **Card.** Between distinct blocks inside one surface. |
| `gap-2` | 8 | **Control.** Between sibling controls in a row. |
| `gap-1.5` | 6 | **Inline.** Icon to its label, a label to its value. |

Plus one fixed number that is not a rhythm step:

| `p-9` | 36 | **The page inset.** Header and body both. |
|---|---|---|

**Rules:**

- **The page inset is 36px and it is never typed by a page.** `PageBody` owns
  it (`src/components/admin/Page.tsx`), and it matches `AdminHeader`'s `px-9`.
  **Enforced:** a hand-typed `p-9` fails `design-system.test.ts`. A page that
  genuinely differs passes `className`, which is an override with a reason
  rather than a second inset.
- **Vertical rhythm is a gap on the parent, never a margin on the child.** A
  child with `mt-*` cannot be reordered or reused; a `flex flex-col gap-*`
  parent can. If you are typing `mt-`, you probably want a gap one level up.
- **No arbitrary spacing values.** `p-[13px]` means the scale is wrong or the
  component is. Round to the scale.
- Odd steps (`gap-5`, `p-10`) are allowed but want a reason in a comment.

### 1.3 Radius — **house**

One root (`--radius: 0.625rem`) and everything derives from it. Use the named
steps, never a raw `rounded-[6px]`:

| Class | For |
|---|---|
| `rounded-sm` | Chips, badges, the smallest icon buttons |
| `rounded-md` | **Buttons, inputs, menu rows.** The default. |
| `rounded-lg` | Cards, panels, popovers |
| `rounded-xl` and up | The inset shell frame only |

A nested corner is one step *smaller* than its parent, never equal. A button
inside a card is `rounded-md` inside `rounded-lg`. Where the maths matters,
`calc(var(--radius-sm) + 2px)` is legitimate (the sidebar's create button does
this) and is preferred to guessing a pixel.

### 1.4 Type — **house**

Geist for everything, Geist Mono for anything a human reads character by
character. There is one type scale and it is small on purpose: this is a
data-dense internal tool, not a marketing page.

Four sizes. A fifth is a mistake, not a nuance.

| Role | Class | px |
|---|---|---|
| Page title | `text-2xl font-semibold` | 24 |
| Card / section heading | `text-base font-medium` | 16 |
| Body, table cell, label | `text-sm` | 14 |
| Secondary, help, meta | `text-xs text-muted-foreground` | 12 |
| Control text (buttons, chips) | `text-xs/relaxed` | 12 |

**Sentence case, never uppercase. Enforced.** Small caps was how three
surfaces said "this is a name, not a value": a table header, a search group
heading, a stat label. All-caps is the worst available way to say it. It
destroys the word shapes a reader recognises without looking, it costs about a
tenth of the reading speed of the same word in sentence case, and some screen
readers spell it out letter by letter. Hierarchy is carried by colour at one
size, which is what everything else here already does. The document sheets are
exempt and correctly so: "DESCRIPTION" is the printed artifact's own
typography, and Rule 46 wants several of those headings verbatim.

**One optical correction, at the top of the scale.** The page title takes
`tracking-[-0.01em]`; a 12px meta label that has to hold its own beside a value
takes `tracking-[0.01em]`. Nothing between the two gets tracking at all. Type
set for body text reads loose at 24px and tight at 12px, and this is the whole
of the correction, not the start of a system.

**Label and value are one size, separated by colour.** `text-sm
text-muted-foreground` over `text-sm` for the value. Making the label smaller
*as well* says the same thing twice and leaves the label unreadable at the size
it ends up.

**The page title is never typed by a page.** `PageHeader` owns the `h1`, its
optional description and where the actions sit. **Enforced:** an `h1` carrying
`text-2xl` outside `Page.tsx` fails `design-system.test.ts`. The rule is scoped
to the heading, not the type size, because 24px semibold is also what the CTC
calculator's result figure is, and a number is not a page title.

**Mono is for identity, not for decoration.** Document numbers, GSTIN, PAN,
CIN, IFSC, employee codes, uuids, amounts in a column that is scanned down.
Anything the reader compares against a certificate or a bank statement gets
`font-mono` and `tabular-nums`. Prose never does.

**Rules:**

- **Never more than two weights on one screen** (regular and medium/semibold).
  Bold is not a level; if you need a third level, use colour or size.
- **`tabular-nums` on every numeric column.** Digits that do not line up cannot
  be compared, which is most of what these tables are for.
- **Never centre body text.** Numbers are right-aligned, everything else left.
- Sentence case for labels, buttons and headings. Not Title Case, not ALL CAPS,
  with the single exception of the document sheets, whose structural labels
  ("DESCRIPTION", "TERMS") are fixed by `CONTEXT.md` §5b and are not ours to
  restyle.

### 1.5 Icons — **house**, partly enforced

Lucide only. One weight everywhere: `globals.css` sets `stroke-width: 1.5`
with `non-scaling-stroke` on `.lucide`, so the weight is screen pixels and does
not drift with size. **Do not set `strokeWidth` per icon.**

| Size | Where |
|---|---|
| `size-3` (12px) | Inside an `icon-sm` button |
| `size-3.5` (14px) | Inside a `default` button |
| `size-4` (16px) | The default. Nav rows, form fields, `form`-size buttons |
| `size-5` (20px) | A standalone icon that is the subject, not a label's companion |

Sizes come from the button/field variant, which already sets them
(`[&_svg:not([class*='size-'])]:size-…`). **Do not size an icon inside a button
by hand** unless you are deliberately overriding.

**An icon is never the only label** for anything but the most conventional
controls (close, chevron, kebab). Everything else gets a visible label or, at
minimum, an `aria-label` plus a tooltip.

**Icon colour follows text colour.** An icon does not get its own colour to
"add interest"; it gets one only when it carries state (destructive, warning,
pass).

### 1.6 Motion — **enforced**

Motion is decoration, never information. Every animated state also says itself
in text, a live region or `aria-current`. That is why `globals.css` can kill all
motion under `prefers-reduced-motion` in one blanket rule instead of per
animation, and why adding an animation never requires adding an opt-out.

**Three tiers, and a transition belongs to exactly one.** Defined in
`globals.css`, enforced by `design-system.test.ts`: a duration outside the
scale fails the build.

| Tier | Duration | For |
|---|---|---|
| **State** | **75ms — the default** | Hover, press, focus, a colour, a chevron |
| **Overlay** | `duration-100` | Popover, dropdown, select, combobox, dialog, an overlay scrim |
| **Panel** | `duration-200` | Sheet, sidebar, editor rail, a sliding pill indicator |

**75ms is the default**, set once as `--default-transition-duration` rather
than per call site. That is deliberate: the state tier was the one nobody ever
wrote, so a bare `transition-colors` silently took Tailwind's 150ms and every
hover in the app ran at twice the intended speed. Making the most-wanted tier
free is what stops that recurring. The other two are written explicitly,
because they are the exceptions.

**One easing: `ease-standard`** (`cubic-bezier(.2, 0, 0, 1)`). It leaves
immediately and settles slowly, which is what makes a control feel like it
responded to the click rather than thought about it. No `ease-linear` (reads
mechanical, and was on the sidebar collapse), no per-component curve.

Exactly two animations sit outside the scale, both one-off icon performances
rather than state changes: the tray arrow's 420ms and the reset button's 500ms
spin. They are exempted **by filename**, so a third cannot join them quietly.

**Rules:**

- **Animate `transform` and `opacity`.** Not `width`, `height`, `top`, `left`.
  Where a width must animate (the sidebar collapse), it is one place and it is
  already written.
- **Press gives physical feedback.** `active:translate-y-px` is on every button
  by default (`button.tsx`) and is excluded on menu triggers, which move their
  popover instead.
- **Nothing animates on mount.** Staggered list entrances, fade-in-on-scroll and
  skeleton-to-content crossfades are refused: this is a tool people use fifty
  times a day, and an animation you have seen fifty times is a delay.
- **Layout must not shift.** A hover state that adds a border changes size;
  reserve the space (transparent border, or `ring` which does not affect
  layout).

**One control was drawn three ways, and that is what the rule is worth.** The
sliding pill indicator exists in `Tabs`, the document browser's view toggle and
the profile switcher. They ran at 500ms, 300ms and 300ms, with the tab *panel*
sliding at 1500ms. Nobody chose those numbers: they are shadcn defaults nobody
read. All four are 200ms now.

**Open — `ui-elevation.md` F-series: icon motion on buttons.** The intent is
that an icon inside an interactive control responds to hover: a chevron rotates,
an arrow slides in its direction, a plus rotates 90° into an active state, a
trash lid tips. The rule when it lands: the motion is **on the icon only**
(`group-hover/button:` on the svg), `duration-200 ease-out`, transform only, and
never more than one moving part per control. Not built yet — do not scatter
one-off hover transforms in the meantime.

### 1.7 Elevation and borders — **house**

This is a **flat, bordered** design language. Depth comes from a hairline and a
background step, not from shadow.

- A surface is separated by `border border-border`, and if it needs to sit above
  the page, `bg-card`.
- **Shadows are for things that float over the page only**: popover, dropdown,
  dialog, toast, tooltip. Never on a card, a table or a button.
- The one licensed exception is the `raised` button variant's two inset
  hairlines, which are on trial and either get rolled into `default` or deleted.
- **One border, not two.** A bordered card containing a bordered table produces
  a double line at the join; the inner element drops its outer border.
- **A shadow separates nothing in dark mode.** A drop shadow on a near-black
  page is invisible, so every floating surface carries `ring-1
  ring-foreground/10` as well and that hairline is what actually does the work.
  The shadow is depth for the light theme; the ring is the edge in both.
- **A pill inside a trough is raised by its fill, not by an outline.** The
  active tab, the list/card toggle and the profile switcher all sit *in* a
  recess rather than floating over the page, so what says "this one is on" is a
  fill lighter than the trough behind it, plus a slight shadow. Same rule in
  both themes, different values: light paints `bg-background` on `bg-muted`,
  dark paints a white overlay, because there `--background` is the darker of
  the two. No border in either. One `tabPillSurface` in `ui/tabs.tsx`.
- **Dark mode is its own design, not an inversion.** Text is `oklch(0.93)`, not
  white, because pure white on near-black haloes; `--border` and `--input` are
  *higher* than their light counterparts in relative terms, because a hairline
  that reads as an edge on white is nearly gone on black. Both live in
  `globals.css` with the reasoning beside them. `--input` is 16%, one step above
  `--border` rather than eight: at 22% a rail of eight fields read as a grid of
  hard boxes instead of a form. It is not held to 1.4.11, because every field
  here is identified by a visible `<Label>` — written down in `contrast.test.ts`
  rather than silently skipped.

### 1.7a Popups anchored to a control — **enforced**

Every surface that hangs off a field or a button (dropdown menu, submenu,
select list, combobox list, calendar, tooltip) obeys two rules, and both live in
`src/components/ui/popup.ts` rather than in each primitive:

- **There is always a gap.** 4px between the anchor and the popup. A submenu
  opening at zero overlapped the menu it came from, which reads as one surface
  torn rather than two stacked.
- **The popup is never narrower than its anchor.** Same width when the content
  fits, wider when it does not (a month grid under a short date field, a long
  option label in a 384px rail), never less. A list a few pixels short of the
  field above it looks like a rendering fault.

The ring is why there are two pairs of values. A focused input, combobox, select
or date trigger draws `ring-2`, a box-shadow painted 2px *outside* the border
box that both `--anchor-width` and `sideOffset` are measured from. So a ringed
anchor takes `RINGED_POPUP_GAP` (6) and `RINGED_POPUP_WIDTH`
(`min-w-[calc(var(--anchor-width)+4px)]`) to come out looking like the plain
4px gap and the flush edges. Anchors that never ring take `POPUP_GAP` and
`POPUP_WIDTH`.

A hand-written `sideOffset={n}`, a popup pinned to `w-(--anchor-width)` and a
floor lowered from the call site (`min-w-max`, `min-w-fit`) all fail `npm test`.

**Three anchors are not the box you think, and only a browser found them.** The
source rules above were green while every popup on screen was still wrong,
because a class in the right file can still land on the wrong element. What the
measurement in `e2e/popup.spec.ts` caught:

| Control | The anchor actually used | Fix |
|---|---|---|
| Combobox | the bare `<input>`, 34px short of the bordered control and inside its padding | `Combobox.InputGroup`, which Base UI resolves as `inputGroupElement ?? inputElement` |
| Submenu | the menu **row**, inset by the menu's own `p-1` | `SUBMENU_GAP` (8), so 4 survives the padding |
| Select | none: `alignItemWithTrigger` laid the list *over* the trigger, macOS-style, 30px up | `alignItemWithTrigger={false}` |

The measured resting state is now 6px offset and anchor+4px width on the three
ringed controls (a visible 4px gap and edges flush with the ring), and 4px with
equal width on the unringed menu. **The animation must be killed before
measuring**: `zoom-in-95` and `slide-in-from-*` are transforms, so a box read
inside the first 100ms is smaller than the one that settles, and the numbers
moved between runs until the spec disabled them.

### 1.8 Focus and hit targets — **house**

- Focus is `focus-visible:ring-2 ring-ring/30` plus `focus-visible:border-ring`.
  It is on the primitives already. **Never `outline-none` without replacing it.**
- Every interactive element has a **minimum 24px hit area**, and a row-level
  action (a kebab in a table row) has 28px. Padding, not size, buys this where
  the visual must stay small.
- Anything clickable is a `<button>` or an `<a>`. A `div` with an `onClick` is a
  bug, not a shortcut. Where the visual must be a box (the upload drop zone), it
  is `role="button"` with a keyboard handler and an `sr-only` real input inside.

---

## 2. Components

### 2.1 Buttons

**Never hand-roll one.** `src/components/ui/button.tsx`, always.

| Variant | Use | Rule |
|---|---|---|
| `default` | The one action a screen exists for | **At most one per screen.** |
| `outline` | The ordinary action. Most buttons are this. | |
| `secondary` | An action grouped with an outline one, slightly louder | |
| `ghost` | Toolbar, table row, nav, anywhere inside dense chrome | |
| `destructive` | Delete, void, revoke | Tinted, never a solid red slab |
| `link` | Inline in a sentence only | Never in a button row |

| Size | Use |
|---|---|
| `sm` / `default` | Chrome: toolbars, table rows, the sidebar |
| `lg` | A page-level action in a header |
| `form` | **Any button sitting inline with an Input, Combobox or DatePicker.** It is the only size that matches their height. |
| `icon-xs` / `icon-sm` / `icon` | Icon-only, sized to its neighbours |

**Rules:**

- **Order is [cancel] [confirm], confirm on the right,** in every dialog and
  every form footer. One order across the app beats being right about which
  order is better.
- **Label the verb and the object**: "Save client", not "Save"; "Delete
  invoice", not "Delete". A button that says "OK" says nothing.
- **A destructive confirmation uses `AlertDialog`, never `Dialog`.**
- **Every button that starts an async action has a pending state** and is
  disabled while pending, or double-submit is a live bug. See `ConfirmButton`
  and the confirmSwap pattern for the feedback shape.
- A disabled button must be explainable. If the reason is not obvious on the
  screen, wrap it in a tooltip that says why.

**One filled blue per viewport.** The rail's "New document" is the app's single
primary and is on screen everywhere, so a page-level create is `outline`. Two
filled blues make the viewport argue with itself about which action matters. A
create action is an `AddButton` / `AddLink` whichever variant it wears, so it
keeps the plus animation (§1.6).

### 2.2 Inputs and fields

The pair rule (`CONTEXT.md` §5f) is the law here: the **rule** lives in
`src/lib/domain/fields.ts` or `text.ts`, the **input** in
`src/components/form/fields.tsx`, named to match. Every schema imports the
first, every form the second.

**Two heights, and 32px is the floor.** The compact `default` is **32px**
(`h-8`) and the roomy `form` is 38px (`h-9.5`). Nothing typed into goes under 32
in any variant: input, textarea, select trigger, combobox and date trigger all
declare the same number, so a field row cannot come out three heights. Pinned in
`ui/__tests__/control-size.test.tsx`.

**Enforced** (`design-system.test.ts` fails the build):

- No `<FieldDescription>` outside `ui/`. Use `FieldInfo` / `InfoTip`, or a
  placeholder.
- No native date input. `DatePicker`.
- No *visible* `<input type="file">`. `form/UploadDropzone`; the input is
  `sr-only`.
- No `register('pan'|'gstin'|'tan'|'cin')`. Use the matching field component.
- No `.email(` in a component, no hand-written `z.string().trim()` outside
  `text.ts`/`fields.ts`, no hand-written phone rule.
- No date read out of a UTC slice. `domain/dates.ts`.
- No `formatDisplayDate` in a file that renders `<TableCell>`. `DateCell` from
  `admin/Page.tsx` owns the format *and* the weight, so the same fact cannot
  look like two different facts on two lists.
- No quoted em or en dash as a nil glyph. `NIL` from `lib/utils.ts`, which is a
  hyphen. Same reason as the row above, and the house rule on dashes.
- No `status === 'finalized' ? …` label written in a component. `StatusBadge`
  from `ui/status-badge.tsx` owns the word and the fill, and every status
  carries a word so colour is never the message.
- No `size="icon"` button without a name to announce: `aria-label`, an
  `sr-only` span, or a `label` prop on one of the wrappers that renders both.
- No `(optional)` in a label and no `placeholder="Optional"`. `FieldInfo`'s
  `optional` prop, which renders `OptionalMark`.
- Every colour pair the app puts text on clears 4.5:1 in **both** themes, and
  the focus ring clears 3:1. `src/__tests__/contrast.test.ts` parses the tokens
  out of `globals.css` and does the arithmetic.

**Controls, settled:**

- **Three heights.** 28 (`default`, the dense height this tool is built at),
  32 (`lg`, a form's own submit), 38 (`form`, which is `Input`'s height, for a
  button sitting inline with one). `sm` (24) and `icon-xs` (20) were deleted:
  neither said anything the survivors do not, and a fourth height is a fourth
  decision every call site has to get right.
- **Destructive is quiet, then loud.** Tinted (`bg-destructive/10`) everywhere
  it sits among other controls; solid red only as the confirming button inside
  its own dialog, where the destruction is the only thing on screen. Its text
  colour is `--destructive-foreground`, not white: white is 2.89:1 on the dark
  fill.
- **An async button keeps its label and gains a spinner** (`pending` on
  `Button`), never swaps 'Save' for 'Saving…'. A control that resizes under the
  cursor is one you can miss on the way down. `pending` disables it too, so the
  double submit cannot happen.
- **Row action targets are 28×40**, the extra height from a pseudo-element so
  nothing moves. Vertical only: these sit 2px apart and a wider target would
  overlap its neighbour, turning "hard to hit" into "hit the wrong one".
- **Every shortcut says itself** in the tooltip or palette row that offers it
  (`Shortcut` from `ui/kbd.tsx`). ⌘B on the rail toggle, ⌘K on search, ⌘D and
  the ⌥ letters in the new-document palette.

**Icons, settled:**

- **Lucide, one stroke (1.5), and the control chooses the size.** A button's
  size variant sets its glyph (14 in `default`, 12 in `icon-sm`, 16 in `lg` and
  `form`); the nav sets 16; only a bare icon with no control around it picks
  its own. "Two sizes everywhere" was considered and rejected: it would mean 87
  hand-made decisions replacing one decision per control size, in a tool whose
  density is the point.
- **No icon that does not disambiguate.** Column headers, card titles and
  section labels carry none, and none were found to remove. Nav rows and the
  view switcher keep theirs, which is what the rule is for.
- Icons in the rail take the rail's own foreground and change with it. A second
  level of muting *inside* an already-muted surface was rejected: the active
  row is already marked by a fill, which is the louder signal anyway.

**Forms, settled:**

- **One marker, and it marks the minority.** On a form where most fields are
  required, the few that are not carry `optional` on `FieldInfo`. On a form
  where **every** field is optional, which is four of the six onboarding steps
  (`domain/client.ts` says so and means it), marking each one marks nothing, so
  the step says it once in a line at the top (`StepForm`'s `allOptional`).
  Never both ways in one app, and never a required asterisk.
- **Validate on first blur, then on every keystroke** (`mode: 'onTouched'`).
  `onBlur` alone lags the value by a whole blur, which showed a tick on a wrong
  value and held a red error over a correction being typed.
- **The caret starts in the first empty field** on arriving at a step, and
  nowhere at all when the step is already filled in. Focus is a claim that
  something needs attention.
- **A derived value says where it came from, under the field**
  (`ui/derived-note.tsx`). The info icon holds the *rule*, which is the same on
  every document; the note holds *this* document's answer, which is the thing
  being checked. A derivation with no explanation reads as a guess.
- **A field reads its own error on every render**, never behind the condition
  that decides whether to show it. React Hook Form subscribes on read, so a
  conditional read means a field that has never shown an error is never told it
  has one. See `form/fields.tsx`.
- **A document's *wording* is not in the rail.** It was marked instead, with an
  accent rule and a "Prints as written" tag on every section that held it, which
  put a label on three of five cards and still left four collapsed rows above
  the fields people actually edit. The rule and the tag are gone and the wording
  lives behind one row and an eye (`WordingDialog`). The distinction the mark
  carried is real (`CONTEXT.md` §5b: both wording and data print, only wording
  changes what the document *says*) and it is now carried by the separation
  itself.

**Accessibility, settled:**

- A **skip link** is the first thing in the tab order, landing on the content
  region rather than on `SidebarInset` (which is the `<main>`, and holds the
  header the link exists to skip).
- Tables are real tables: `<th scope="col">` by default on `TableHead`, and an
  `sr-only` `<caption>` naming each one.
- **A live region is always mounted**, and only its text changes.
  `AutosaveStatus` used to `return null` when idle, which meant the first save
  of every session was the one nobody heard.
- Contrast is measured, not eyeballed. See the Enforced list above.

**States, settled:**

- Three empties, and they are three different panels, never one: **first-run**
  ("add your first client"), **filtered-to-nothing** (with a Clear filters
  button), and **error** (`(app)/error.tsx`, with a retry and the digest). All
  three are built from `ui/empty.tsx`.
- Skeletons are held back **150ms** so a fast route never flashes one. CSS
  delay, not a timer.
- An autosaving surface says **"Saved HH:MM"**, not "Saved". A refused write
  keeps the server's own reason and offers **Try again** (`SaveError`).
- No connection means a bar across the top of the shell, not a toast: it is a
  condition, and it stays as long as it is true.
- **Finalized looks sealed:** a lock chip on the badge, a stated line in the
  actions rail, and "Duplicate as new draft" as the primary action. Absence of
  an edit control is not a message.

**Feedback, settled:** toasts are bottom-right, 4s, three at a time
(`ui/sonner.tsx`). A toast fires only when the success is **not** already
visible, or when it carries an **undo**; list mutations apply optimistically
via `useOptimistic` and revert themselves on refusal, with the reason inline.
Errors are never a toast: four seconds is not long enough to read a reason.

**The table, settled:** rows are 44px (`h-11` on the row, 12px cell padding,
`leading-none`), hover is `bg-muted/40`, the header is sticky, the whole row is
one stretched anchor, row actions and copy buttons reveal on `group-hover/row`
and on `focus-within`, every figure is `tabular-nums`, money is right-aligned,
a sort arrow is permanent on the sorted column and appears on hover elsewhere,
and long values truncate with the full string on `title`. All of it lives in
`ui/table.tsx` and `admin/Page.tsx`, so a new table inherits it by existing.

**House rules on top:**

- **A field types the way the value is written** (`AGENTS.md`): separators,
  spacing and case are applied as the operator types, and the validator strips
  them before checking.
- **Never a validity tick on a field with no rule.** `FieldCheck` claims a check
  ran.
- **Numeric inputs reject non-digits** via `numericField`, sanitised before
  react-hook-form stores the value.
- **Autofill is off unless the field asks for it.** Defaulted in `ui/input.tsx`
  and `ui/textarea.tsx`; almost every form here describes somebody else.
- **A label is always visible.** Placeholder-as-label is refused: it disappears
  exactly when the reader needs it, and it breaks autofill and a11y.
- **Help text is an `InfoTip`, not a standing muted line.** A permanent
  paragraph under every field doubles the height of a dense form. If the help is
  needed *every* time, it belongs in the placeholder.
- **Errors sit under the field, in `text-destructive`, and name the specific
  finding.** "The check character does not match" beats "Invalid GSTIN"; the
  validator already knows which, so `superRefine`, not `.refine`.
- **Required is marked on the optional ones.** Where most fields are required,
  mark "Optional" instead of starring the majority.

### 2.3 Tables

The primary surface of this app. Rules, most of them open against
`ui-elevation.md` Phase 2:

- **Every table sits in a `TableCard`** (`components/admin/Page.tsx`):
  `rounded-md border bg-background`, `overflow-clip`. **Enforced.** The fill is
  `bg-background`, not `bg-card`: the two are the same white in light mode, so
  the card fill drew nothing there and drew a grey slab in dark mode, and one
  component cannot be two different design decisions depending on the theme.
  The border is the edge. The fill is opaque rather than absent only because
  the header is sticky and rows scroll under it. There is no card
  *header*: the page `h1` is directly above it, and a title inside the card
  would be the same word twice. A table drawn on the page background has no
  edges, and its last row, its header and the page all run into each other.
- **The card footer is the row count on the left and the pager on the right**,
  and nothing else. The count is `rowCountLabel` so its wording is the same
  everywhere; the pager is `ui/pagination`, which shows nothing at a single
  page, so "paginate past ten rows" needs no condition written anywhere.
- **Header row:** `text-xs font-medium text-muted-foreground`, sticky when the
  body scrolls, one hairline below.
- **No icons in column headers.** A glyph beside a word that already names the
  column decorates rather than disambiguates (§1.5). `ColumnLabel` was deleted
  when the icons went.
- **A value is formatted on the way out, never printed as stored.** Phones go
  through `formatPhoneForDisplay`, money through `formatINR`, dates through
  `formatDisplayDate`. **The phone half is enforced**, because that is the one
  that had silently never been done.
- **Numeric columns right-aligned, `tabular-nums`, `font-mono` where the value
  is an identifier.**
- **No zebra striping and no row tinting by status.** Refused: it fights the
  hover and selected states, which carry actual meaning. A status is a badge in
  its own column.
- **Row hover is a background step only.** No scale, no shadow, no border
  change (see §1.6, layout must not shift).
- **The whole row is the link** where a row navigates, not the first cell.
- **Row actions live in a right-aligned column** and may reveal on hover, but
  must remain keyboard-focusable when hidden (`opacity-0
  group-focus-within:opacity-100`, not `hidden`).
- **Empty, loading and error each have a real state** (§2.5). A table that
  renders zero rows and nothing else looks broken.
- **Column count is a budget.** If a row needs more than six columns to be
  useful, the extra ones belong on the detail page.
- **A column that is scanned rather than read may be a glyph with no heading**,
  provided it carries its figures in an `aria-label` and a tooltip. The
  onboarding ring is the example. **Nothing-yet draws as a dotted track**, never
  as a zero-length arc, which is indistinguishable from a rendering failure.

### 2.4 Cards and page layout

- **A page is: header (title, description, primary action), then content.** One
  component owns that (`PageHeader`, `ui-elevation.md` B1), so the inset,
  the title size and the action placement cannot drift per page.
- A card is `border border-border rounded-lg bg-card`, no shadow, and its own
  padding is `p-4` (dense) or `p-6` (a form).
- **Content is width-capped where it is read, uncapped where it is scanned.**
  Prose and forms get a `max-w-*`; tables get the full width *of the body*,
  which `PageBody` caps at 1400px and centres. Past about that, a six-column row
  puts the number at one edge and the status at the other and reading it becomes
  a head movement. The cap is on the body, never on the shell: the chrome
  belongs to the window, the content belongs to the reader.
- **Never nest a card in a card.** If a section inside a card needs separating,
  a hairline and a heading do it.

### 2.5 The four states

Every surface that loads data declares all four. This is not optional polish;
three of them are what the screen looks like when something goes wrong.

| State | Rule |
|---|---|
| **Loading** | A skeleton in the shape of the content, not a spinner, and it must not shift layout when real content lands. For a list that means `TableSkeleton`, which is a real `Table` of real `TableRow`s so its geometry cannot drift from the table it stands in for. |
| **Empty** | One line saying what would be here, and **the button that creates the first one**. Never just "No results". |
| **Error** | What failed, in a sentence, plus a retry. Never a raw error string. |
| **Filtered-empty** | Different from empty: says which filter is hiding things, and offers to clear it. |

### 2.6 Feedback

- **A toast is for something that happened out of sight.** An action whose
  result is visible on screen (a row appearing, a field saving) does not toast.
- **Destructive actions confirm before, not undo after** — these are financial
  records; there is no undo to offer.
- **Never a toast for a validation error.** Errors belong on the field.

### 2.7 Tabs and segmented pills

Anything shaped like a pill sliding along a trough gets **both** ways in: click
a segment, or pick the pill up and drop it. It is one hook, `useTabDrag` in
`ui/tabs.tsx`, and `TabsList` calls it for you, so an ordinary strip built from
`Tabs` / `TabsList` / `TabsTrigger` has the gesture without asking.

A control that is *not* built from `Tabs` (there is one: the list/cards toggle
in `DocumentsBrowser`, which has no panels to reveal and so must not claim tab
roles) spreads the hook onto its container and marks its parts:
`data-drag-pill` on the sliding surface, `data-drag-segment` on each choice. The
pill's transform then adds `var(--tab-drag, 0px)`, which is 0 at rest.

Container and pill both carry `border border-border` — the same light stroke,
never one without the other. `tabPillSurface` (the pill's fill + shadow +
border) is the one export every pill draws from, hand-rolled ones included, so
none of them can drift back apart the way they had before it existed.

Six rules, each of which is a thing that broke while it was being built:

| Rule | Why |
|---|---|
| The click is the control; the drag is an accelerator | A gesture cannot be tabbed to, described or discovered. Every segment stays a real button or link, keyboard included. |
| Mouse and pen only, never touch | A touch drag across a strip is how the page under it scrolls. |
| The release commits to the **nearest segment centre**, measured | Tabs are rarely equal widths, so "one width per step" quietly mis-selects on a strip whose middle label is longer. |
| The pill does not transition while it is held | The offset is already per-frame; a transition on top of it lags the hand. |
| Tracked on `window` from the moment the pointer goes down, not through the strip's own bubbling handlers | See below — a narrow strip's first move sample routinely lands outside it. |
| A release that travelled swallows the click it lands on | Otherwise the segment under the mouse activates too, which is frequently the one being dragged away from. Stopped in the capture phase; `preventDefault` alone does not reach a React handler. |

**The tracking rule replaced pointer capture, and the reason is a bug that
shipped and was found live.** Capture used to be taken on the first *move*
past a slop threshold rather than on the way down, because capturing
immediately retargets the click that follows to the capturing element and a
plain tap stops selecting anything. That traded one failure for another: a
synthetic React event only fires when the native event's target is inside the
listening element's own subtree, and without capture already active, a
pointermove whose first sample has already left that subtree — an
ordinary-speed drag on the 152px-wide list/card toggle clears it in a single
native sample — never reaches the handler at all. Capture was then never
taken, no later move fared any better, and the pill sat dead at rest for the
rest of the gesture: `data-dragging` stuck true, the cursor stuck `grabbing`,
until the next pointerdown reset it. `ProfileSwitcher`'s own copy of the
gesture had the identical hole, just harder to hit on its wider control.
`window` sees every pointer event in the document regardless of what is
currently under the cursor, so tracking there needs no capture and the
plain-tap case it was protecting stays protected for free.

The one control deliberately outside the hook is `ProfileSwitcher`, which
carries its own copy: committing there is a *navigation*, so the pill must latch
where it landed until the route arrives rather than springing home and sliding
across a second time when it does.

Verified in `e2e/tabs.spec.ts` against `/preview/tabs` and in
`ProfileSwitcher.test.tsx`, both confirmed red before the `window`-tracking fix:
a single un-interpolated jump past the strip's own edge in the first case, a
`pointermove` fired on `document.body` (outside the render root's ancestor
chain, so React's delegated listener cannot see it either) in the second.

---

## 3. Writing

`AGENTS.md` owns this and it is enforced socially, not mechanically:

- **No em dash. Anywhere.** No en dash except in a numeric range.
- Sentence case for every label, button and heading.
- Second person for instructions, never "please".
- Name the object: "Delete client", "3 clients", not "3 items".
- **Nouns for labels, verbs for buttons.** Audited across the admin and the
  editors: already held everywhere.
- **Never "Are you sure?". Name the consequence**, and name the part that is
  *not* a consequence where that is what the reader is weighing:
  `DELETE_DRAFT_CONSEQUENCE` says the typing goes and the issued numbering does
  not move, because a number is claimed at finalize and a draft never held one.
- **Middot between the halves of a joined label** (`33 · Tamil Nadu`), never a
  hyphen and never an em dash.
- No exclamation marks and no cheerfulness. This tool issues tax invoices.

---

## 4. What is mechanically enforced

Everything in this table fails `npm test` if broken. This is the list to add to
when a house rule gets broken twice.

| Rule | Test |
|---|---|
| Theme tokens only, no palette classes | `src/__tests__/design-tokens.test.ts` |
| No hex literals | `src/__tests__/design-tokens.test.ts` |
| The seven primitive/field rules in §2.2 | `src/__tests__/design-system.test.ts` |
| Page inset comes from `PageBody` (§1.2) | `src/__tests__/design-system.test.ts` |
| Page title comes from `PageHeader` (§1.4) | `src/__tests__/design-system.test.ts` |
| Every duration is on the three-tier scale (§1.6) | `src/__tests__/design-system.test.ts` |
| Every table is in a `TableCard` (§2.3) | `src/__tests__/design-system.test.ts` |
| No phone printed in its stored form (§2.3) | `src/__tests__/design-system.test.ts` |
| Optional is marked by `OptionalMark`, never by hand (§3) | `src/__tests__/design-system.test.ts` |
| Labels are sentence case, never `uppercase` (§1.4) | `src/__tests__/design-system.test.ts` |
| Popup gap and width come from `ui/popup.ts` (§1.7a) | `src/__tests__/design-system.test.ts` |
| Security headers exist and are correct | `src/__tests__/security-headers.test.ts` |
| Autofill defaults off | `src/components/ui/__tests__/autofill.test.tsx` |

Both design walkers share `src/__tests__/policedSource.ts`, so their exemption
lists cannot drift apart, and each one asserts it matched some files — a rule
that matches nothing is a test that passes forever.

**To add a rule:** add the regex and its `it(…)` to `design-system.test.ts`,
confirm it **fails** when the thing it guards is removed, then fix the
violations. A rule never lands without seeing it go red once.

---

## 5. When nothing here fits

In order:

1. **Is there a shadcn primitive?** Use it. Compose, do not fork.
2. **Is there something in `src/components/` doing this already?** Reuse it.
   Two components rendering the same thing is how they drift apart.
3. **Is this needed more than once?** If no, build it inline in the one place
   and leave it there. A component with one caller is an abstraction tax.
4. **If yes:** build it in `src/components/`, add its entry to §2 here, and add
   the rule that stops the old way coming back.

**And the standing refusals**, so they do not come back as suggestions:

- No gradients, no glassmorphism, no blur-behind except the header's existing
  `backdrop-blur`.
- No decorative illustration or empty-state artwork.
- No second font family.
- No colour used for decoration. Colour means state.
- No animation on mount, ever (§1.6).
- No dark-mode-only or light-mode-only design. Both are first class.

---

## 6. Change log

Append a line when a rule here changes. Keep it to one line and name the
`ui-elevation.md` id where there is one.

- **22 August 2026** — File created. Foundations documented from the code as it
  stands; rules from `ui-elevation.md` Phases 0-2 recorded as **open** where not
  yet built. Page inset settled at 36px (`p-9`), header and body.
- **22 August 2026** — **B1.** `PageBody` / `PageHeader` in
  `src/components/admin/Page.tsx`, replacing a hand-typed inset in 13 files and
  a hand-typed `h1` in 9. Both enforced. The pass found `/client/checklist` had
  already drifted to `p-6`.
- **22 August 2026** — **B4, C5, C1.** Spacing frozen at 24/16/8/6, type at
  24/16/14/12, weights at regular and medium with semibold reserved for the page
  title. §1.4's page-title row corrected: it was recorded as 16px, the app has
  always used 24px.
- **22 August 2026** — **H1/H2, H5.** Motion scale set to 75 state / 100 overlay
  / 200 panel, with `ease-standard` everywhere and 75ms as the global default;
  enforced. The audit found the state tier was never written down (so every
  hover ran at Tailwind's 150ms), the sliding pill indicator ran at three
  different speeds across three components, and the tab panel slid at 1500ms.
  H5 was already shipped and predates the checklist.
- **22 August 2026** — **A1-A8.** `TableCard` with a count-and-pager footer,
  adopted by all three tables and enforced; column-header icons and
  `ColumnLabel` deleted; phones formatted on read and enforced; page-level
  creates demoted to outline so the rail keeps the only blue; the client rail,
  breadcrumb and `h1` all say "Clients"; onboarding progress drawn as a ring
  with a dotted not-started state. **A6 withdrawn** (the "N" was Next's dev
  indicator over the avatar), **A9 deferred** to Phase 7 with the header
  geometry, **A10** was a dev-database row, not code.
- **22 August 2026.** **Phase 2, E-series and B5/C2/C3/C8.** Row height, cell
  padding, sticky header, stretched-anchor rows, hover-revealed sort arrows,
  `tabular-nums`, right-aligned money, `TruncCell`, `NIL`, and `CopyCell` (the
  value itself is the copy target, revealed per cell). `NIL` and `DateCell`
  enforced. B5's cost is recorded in `ui-elevation.md`: the table container no
  longer scrolls horizontally, because a box that scrolls in one axis becomes
  the scrollport and defeats the sticky header. E12 owns putting it back.
- **22 August 2026.** **Phases 4 and 8, controls and accessibility.** Two
  button heights deleted, one `pending` prop replacing every label swap, and
  destructive split into a quiet tier and a loud one with its own foreground
  token. On the accessibility side the wins were measured rather than reviewed:
  a contrast test over the real tokens found `--muted-foreground` failing on
  `--muted`, `--ring` under 1.4.11's floor on white, and white text at 2.89:1
  on the dark destructive fill, all three of which had been checked once
  against the wrong background. Plus a skip link, `scope="col"`, a save status
  region that stays mounted, and 40px-tall row action targets.
- **22 August 2026.** **Phases 3 and 6, states and feedback.** Three distinct
  empties (`(app)/error.tsx` was the missing one), a 150ms CSS delay on
  skeletons, "Saved HH:MM" and a `SaveError` retry in the editors, an
  `OfflineBar`, a rebuilt `/no-access`, and `StatusBadge` (enforced), which is a
  word and a fill and nothing else: the lock glyph it shipped with was noise
  beside a word that already said it. Toasts arrive with sonner, capped at 4s
  and three at a time, and
  fire only where the success is not already visible or where they carry an
  undo; archive and delete apply optimistically and revert themselves.
- **22 August 2026** — **J4, J8, J9, J11, P1-P4, O8, O9.** Forms and copy. One
  optional marker, marking the minority and enforced; a "Save and close" on
  every onboarding step, which submits the step first so its claim is true; the
  caret starts in the first empty field; `onTouched` reached the two forms that
  had missed it; `DerivedNote` puts a derived value's provenance under the
  field, on place of supply, the due date, the zero-rating label and a PAN read
  out of a GSTIN; `DELETE_DRAFT_CONSEQUENCE` replaced five copies of "This
  cannot be undone."; joined labels take a middot. Two bugs fell out of it: a
  field read its error only when it was about to show it, so once one
  identifier on a form was wrong none of the others would ever report; and an
  employee with documents was refused by a foreign key with no sentence to
  explain it, which the client side has had since onboarding.
- **22 August 2026.** **Phases 7 and 9, chrome and craft.** `g` then a letter to
  jump, `?` for the list of every binding (both derived from the nav, so a page
  that moves takes its shortcut with it); the wordmark and the breadcrumb put on
  one centre line; the body capped at 1400px; the table's fill dropped to
  `bg-background` after it turned out to be drawing a grey slab in dark mode and
  nothing at all in light; dark mode retuned as its own design (0.93 text,
  higher borders, `color-scheme`); `::selection`, thin themed scrollbars, and a
  print stylesheet for the chrome as opposed to the sheets. `uppercase` banned
  and enforced. `TotalsPanel` made `tabular-nums`, which is the one place in the
  app where digits change on every keystroke. **Refused with reasons in
  `ui-elevation.md`:** merging ⌘K into ⌘D (L1), a recents list (L2), a density
  toggle (M1), the route-change fade (H4), and a digit-roll animation (H6).
- **22 August 2026.** **E9, and the last two open items closed.** `TableSkeleton`
  built from the real table primitives, replacing the stack of full-width bars
  that was neither a row's height nor a column's width. **E12 rejected** (a
  sticky first column means horizontal scroll back inside the card, which is
  what pinned the sticky header to a box that never scrolled), **F7 closed** as
  already satisfied. Every item in `ui-elevation.md` now carries a mark.
- **22 August 2026.** **The active tab pill.** Stroke dropped in dark mode and
  the shadow softened, so both themes raise the pill the same way: a fill
  lighter than the trough, plus a slight shadow. The border was compensating
  for a fill that did not read (`bg-input/30` on an L .269 trough); the fill is
  `bg-input/85` now and carries it. One `tabPillSurface`, so the tabs, the
  list/card toggle, the profile switcher and the spec tabs all moved together.
- **22 August 2026.** **The service catalogue became editable.** A pencil on
  each card, revealed on `group-hover/card` and on `group-focus-within` and
  named `Edit <service>`, opening a dialog of five fields: section, title,
  description, rate and SAC. The reveal rule is the table's, applied to a card
  rather than a row, which is why it is not a new rule: `opacity-0` keeps the
  button in the tab order the whole time and focus is what makes it visible for
  anyone not using a pointer. The card gained a third line, the SAC, shown only
  when there is one.
- **24 August 2026.** **The edit rail gets one step of extra ink, scoped.** It
  is the densest surface in the app: 352px of labelled fields, section rules and
  card edges, read while looking at the preview beside it. At the app's ordinary
  weights the rules between sections and the labels on top of them both went
  quiet. `[data-editor-rail]` in `globals.css` redefines four tokens for that
  subtree only — `--border`, `--sidebar-border`, `--muted-foreground`,
  `--sidebar-foreground` — each one step along the hue-40 ramp in that file's
  own table, in both themes. **Scoped rather than global on purpose:** the fault
  is the density, not the palette, and raising `--border` app-wide would redraw
  every table and card as a harder grid to fix a problem one column has.
  Contrast only ever moves up, so `contrast.test.ts`'s floors still hold.
- **24 August 2026.** **The wording drawer, and what a dialog was costing.**
  Every field behind the eye changes a word printed a few centimetres to the
  left, and a dialog covered the document it was editing. It is a second pane
  over the rail now: the form slides out left as the drawer slides in from the
  right, on the 200ms panel tier, with a back arrow and the drawer's name at the
  top. Two rules came out of building it. `visibility` is in the transition, or
  the closed drawer is off-screen and still in the tab order. And the pane that
  scrolls is each pane, not `SidebarContent`: an `inset-0` overlay inside a
  scrolling box is positioned against the content and scrolls away with it.
- **24 August 2026.** **The compact control is 32px, and that is a floor.** It
  was 28, which the wording drawer made unarguable: thirty of them stacked read
  as an unfinished form rather than a dense one. Input, select, combobox and the
  date trigger all moved together, because a row of three heights is worse than
  a row of one wrong one. `Select`'s unused `sm` variant (24px) went with them.
  Buttons are untouched at 28: a toolbar is not a form, and nothing is typed
  into one.
- **24 August 2026.** **The drawer replaces the whole rail, not its middle.**
  The first build slid only the content, which left a fixed header above a pane
  that had gone somewhere else: one sidebar with a moving middle rather than one
  sidebar replaced by another. The track now holds header, form and footer, and
  the drawer carries its own `h-14` header on the same centre line, with its
  back arrow where the rail's was and the collapse toggle where the rail's was.
  The leaving pane fades as it goes, because two panes at full strength crossing
  each other read as two things rather than as a handover. Whichever pane is off
  screen is `inert` and `aria-hidden`, which is what keeps one back arrow and
  one collapse toggle reachable rather than two of each.
- **24 August 2026.** **A one-page document shows no pager.** Every invoice,
  receipt, credit note and slip is one page, so two dead arrows and a counter
  that counts to one were the ordinary case rather than the edge one. The
  autosave line took the space instead, which also moved it off the foot of a
  rail that scrolls — the one place it could be while the document was being
  typed *and* out of sight.
- **24 August 2026.** **A lock is only ever on something somebody else owns.**
  Line items lock the description and the SAC of a row seeded from a Service,
  because that is the description its rate was agreed against. A row typed by
  hand or chosen off the Add menu carries no padlock at all: a control whose
  only function is to be turned off again is not a control. This is the general
  rule, not one about invoices.
- **24 August 2026.** **A popup keeps its distance and never comes out narrower
  than what it hangs from.** §1.7a, and both numbers now live in
  `ui/popup.ts`. Four primitives had each answered the two questions separately:
  a submenu sat at `sideOffset={0}` and overlapped its parent menu, the
  combobox and select lists were pinned to the anchor's border box and so came
  out 4px inside the focus ring of the field above them, and the dropdown menu
  was pinned to `w-(--anchor-width)` and truncated any label wider than its
  trigger. The rule found two more on the way in: the user card's width class
  was `w-(--radix-dropdown-menu-trigger-width)`, a Radix variable in a Base UI
  app that had never resolved to anything, and the ⌘K result list, which is
  anchored by hand, had the same two faults as the primitives.

  **And then a browser showed that none of it had worked.** The source rules
  passed, `npm test` was green at 1,989, and on screen every popup was still
  wrong: the combobox anchored to its bare `<input>`, the submenu's offset was
  eaten by the menu's padding, and the select was laying its list over the
  trigger by 30px. All three are the same mistake as the ring, one level down,
  and a class rule cannot see any of them because it checks which file a string
  is in, not which element it lands on. `e2e/popup.spec.ts` measures the five
  popups in Chromium; it was written against the broken build and watched to
  fail on each one first. §1.7a carries the table. The general lesson is the
  one the pay slip already taught: **anything that is a measurement belongs in
  `e2e/`, and a green jsdom suite is not evidence about geometry.**
- **25 August 2026.** **§2.7.** Every pill-shaped strip is draggable as well as
  clickable, from one hook (`useTabDrag`) that `TabsList` calls for you; the
  list/cards toggle opts in with two data attributes. Five browser tests on
  `/preview/tabs`, each watched failing first, and one of them earned its keep
  immediately: the release was landing a whole gesture further along than the
  hand, because the pill's measured box already carries the drag and the offset
  was being added to it twice. `ProfileSwitcher` stays outside the hook, because
  committing there is a navigation and its pill has to latch until the route
  lands.
- **26 August 2026.** **§2.7.** Two fixes, found from one screenshot. The
  container and every pill now carry the same light `border-border` stroke —
  `tabPillSurface` gained it, `ProfileSwitcher`'s own copy lost the duplicate it
  had been carrying alone since before the surface was shared. And the drag
  itself was silently breaking on an ordinary-speed gesture across the list/card
  toggle (152px, narrower than most): pointer capture taken lazily on the first
  move past the slop threshold never engaged, because that first move had
  already landed outside the strip before the handler saw it. The pill stuck
  dead at rest, cursor stuck `grabbing`, for the rest of the gesture.
  `ProfileSwitcher`'s own copy had the identical hole. Both now track on
  `window` from pointerdown, which needs no capture at all. New tests in
  `e2e/tabs.spec.ts` and `ProfileSwitcher.test.tsx`, both confirmed red first.
