# DESIGN — speclr

> The guidebook and the rulebook. **Read this before building any new surface.**
> If you are about to type a colour, a spacing number, a radius, a duration or a
> button, the answer is already in here. If it is not, you are about to invent
> one, which means you add a row here in the same commit.
>
> The decisions behind every rule are on `/design` (the decisions section)
> and in §6 below; the test that holds each is in §4.

---

## 0. How to use this file

**The folders are the atomic ladder, and a test holds the order:**

| Level | Folder | What lives there | May import |
|---|---|---|---|
| Tokens | `src/app/globals.css` | A named value. Never a component. | |
| Atoms | `src/components/ui/` | One styled control: Button, Input, Badge, Tooltip, Sheet | `lib/`, other atoms |
| Molecules and organisms | `src/components/patterns/` | Compositions of atoms with one job, domain-free: ConfirmDialog, IconAction, RecordTable, FilterBar, FlowShell, the cells | atoms, other patterns |
| Shell | `src/components/shell/` | The frame every page sits in: AdminShell, the nav, the top panel, the editor rail, the palettes | atoms, patterns, `lib/` |
| Screens | `src/components/admin/`, `contract/`, `docs/`, `form/`, `spec/`, `tools/` | A pattern filled with real data | anything |

`design-system.test.ts` fails the build when `ui/` imports a pattern, a
pattern imports the shell or a screen, or the shell imports a screen. A type
import crosses no layer. The level is also declared in each pattern's
docstring (`@level molecule`).

**Building something new:** read §1 (foundations) and the §2 entry for the
primitive you need. Compose from `src/components/ui/`. If nothing fits, §5 says
what to do.

**Changing something everywhere:** change it here first, then in the code, then
add the test that stops it drifting back (§4).

**Every rule is enforced or it is deleted.** There used to be a "house"
status for rules agreed but not tested, with an escalation rule for the day
one was broken twice. It was retired on 16 October 2026: the audit found the
house rules were the ones that had drifted, every one. A rule that cannot be
written as a test is rewritten until it can, and until then it is a note in
§6, not a rule. Where a rule has existing violations it lands with a
shrinking allowlist (§4).

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

**The neutrals are one ramp, and a role never holds a colour of its own.**
`--gray-0` … `--gray-950` are declared once in `:root` and are the only
place a neutral value is written. Every neutral role is an *alias* onto a step,
chosen per theme:

```css
--muted-foreground: var(--gray-600);   /* :root  */
--muted-foreground: var(--gray-400);   /* .dark  */
```

So a surface is described by **where it sits on the ramp** rather than by a
lightness solved for in isolation, and "two steps darker" is a thing you can
say. **Enforced:** a raw `oklch()` on a semantic token fails
`design-tokens.test.ts`, as does a near-neutral carrying any chroma.

The values are Tailwind's neutral, verbatim: chroma 0 at every step, so the
shell is white, black and grey and only the signals (`--primary` and the rest)
carry a hue. It replaced Tailwind's slate on 4 October 2026, on request: slate's
blue sat on every surface and hairline at once and read as tinted. **`--gray-0`
is the one step that is not Tailwind's**: plain white, added when the shell
became an inset, because the card had to sit above its ground and the page and
the rails were both on gray-50. Before slate there was a warm taupe at hue 40
whose tokens were each an independent literal; the ramp replaced that.

**The ramp is deliberately not exposed as utility classes.** There is no
`bg-gray-300`; `design-tokens.test.ts` bans exactly that name. Roles are the
interface, which is what lets a surface be restated in `globals.css` without
touching a component.

**One row is not a free choice: `--ring`.** WCAG 1.4.11 wants 3:1 against the
surface behind it, and gray 400 (the step that *looks* right) is 2.51:1 on
gray 50. It is 500 in light and 400 in dark for that reason alone. A focus
ring is the one piece of UI a keyboard user has no fallback for.

The chromatic tokens keep their own hues, and the dark mode's `--border` /
`--input` stay a pure white overlay, which composites to a hairline of whatever
ground it sits on. A *fill* may never be an alpha white for that reason: white
lends no hue, so a wash of it over a coloured ground flattens toward grey.
That is what `--raised` exists to stop, and it is why the active tab and the
active profile use a token rather than `bg-input/85`.

| Use | Token |
|---|---|
| Page ground | `bg-background` / `text-foreground` |
| A raised surface (card, popover, dialog) | `bg-card`, `bg-popover` |
| A pill sitting on a track (active tab, active profile) | `bg-raised` |
| Anything quieter than body text | `text-muted-foreground` |
| Placeholder text in a field (set by the primitives, never by hand) | `placeholder:text-placeholder` |
| A resting fill (selected, chip) | `bg-muted` / `bg-accent` |
| A card or a row under the pointer | `hover:bg-hover` |
| The action colour | `primary` |
| Destructive | `destructive` as a **tint** (`bg-destructive/10 text-destructive`) everywhere it sits among other controls; solid (`bg-destructive text-destructive-foreground`) only as the confirming button inside its own dialog |
| Advisory, between pass and fail | `warning` |
| Any hairline | `border-border` |
| Focus | `ring-ring` |

`--hover` is the newest of these and the reason it exists is worth keeping: a
hover reaches for `--muted` or `--accent` by habit, and on a board a card sits
*inside* a `bg-muted` column, so that hover paints the card the colour of the
well behind it. `--hover` moves a step away from the well instead, which means
down the ramp in light (gray 200) and down to the page's own step in dark
(gray 950). The symmetrical dark answer, gray 700, fails: muted text lands on
it at 3.94:1, and most of what a card prints is muted.

**Never mix a token with a palette class to get an in-between shade.** Use
`color-mix(in oklch, var(--token), …)`, as `button.tsx`'s `secondary` hover and
`raised` variant do. That keeps the derived shade tied to the theme.

**Opacity suffixes are the house way to get a lighter token** (`bg-primary/10`,
`ring-ring/30`). Prefer them to a new token; add a token only when the value has
a *meaning* that needs naming.

### 1.2 Spacing — **enforced**

**Rule of thumb:** 4px grid. Inside a control, 8; between controls, 8; between
groups of controls, 16; between sections, 24; the page inset is 32. Nothing
else.

A grid is what makes alignment free: with one base, any two things on screen
are either aligned or an obvious multiple apart, and the eye reads
"intentional" even when nothing was individually tuned. 4 rather than 8
because a 28px control needs a 6px gap from icon to label and a 4px gap to an
adjacent chip, and 8 cannot express either.

| Step | px | Name | Where |
|---|---|---|---|
| `gap-1` | 4 | hairline | Icon to text inside a chip; stacked meta lines |
| `gap-1.5` | 6 | inline | Icon to label inside a button |
| `gap-2` | 8 | control | Between controls in a row; input padding-x |
| `gap-3` | 12 | group | Label to field; between rows of a form |
| `gap-4` | 16 | card | Between cards; card padding; between fields in a `FieldGroup` |
| `gap-6` | 24 | section | Between sections of a page |
| `gap-8` | 32 | page | The page inset (`PageBody`) |
| `pl-9` | 36 | control | Only as an inset that aligns to a form control (36px tall): the footer count under the first column, an icon inside a field |

`gap-3` was admitted on 16 October 2026: it was the second most-used value in
the app and not in the vocabulary, which is how a rulebook loses. `p-9` (36)
becomes `p-8`: 36 is off-grid.

**Rules, all enforced by `design-system.test.ts`:**

- **The page inset is never typed by a page.** `PageBody` owns it.
- **Spacing is a `gap` on the parent, never a margin on the child.** A child
  with `mt-*` carries a decision about its neighbours into every place it is
  reused. `m*-auto` is alignment, not spacing, and is allowed. `space-y-*` is
  margin in disguise and is banned with it.
- **No value off the scale, no arbitrary value.** `p-[13px]` or `gap-5` means
  the scale is wrong or the component is. Round to the scale.

Files that broke these before the rule existed are listed in
`src/__tests__/migratedLater.ts`, which only shrinks (§4).

### 1.3 Radius — **enforced**

**Rule of thumb:** a nested corner is one step tighter than its parent; a
corner is never larger than half the thing's height.

Four integers, fixed in `globals.css`. They were multipliers of one base and
landed on 3.6px and 4.8px, which anti-alias differently on every edge and read
as "slightly soft" without anyone being able to say why. 6px on a 28px control
is the ratio macOS uses on a push button.

| Class | px | For |
|---|---|---|
| `rounded-sm` | 4 | Chips, badges, kbd, checkbox, a cell highlight |
| `rounded-md` | 6 | **Default.** Buttons, inputs, menu rows, table rows, the inset shell frame |
| `rounded-lg` | 8 | Cards, panels, popovers, drawers, the tab trough |
| `rounded-xl` | 12 | `Dialog` and `AlertDialog` only |
| `rounded-full` | | Avatars, the status dot, a switch thumb |

`2xl` and up do not exist. `rounded-[Npx]` is banned. `rounded-xl` outside the
two dialog primitives fails the build.

**The inset shell frame is `rounded-md`, and it is the exception to the nesting
rule.** A frame the height of the window reads its radius as a *hint* of one,
and a visible curve on it makes the shell look like a widget floated on the
page rather than one surface with a seam in it. So it takes the smallest step
above square, and the cards inside it keep `rounded-lg`.

### 1.4 Type — **enforced**

**Rule of thumb:** a dense tool reads at 13px; a control reads one step
smaller than the prose beside it; a caption one step smaller than that;
headings grow by *weight and one step*, not by two steps.

Geist for everything, Geist Mono for anything a human reads character by
character. Eight sizes, six in routine use, each a token in `globals.css` that
carries its own line-height (a multiple of 4, so text rows sit on the spacing
grid), weight and tracking. A call site says one word.

| Token | px / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-caption` | 11 / 16 | 400 | +0.01em | Badge text, kbd, a timestamp inside a cell. Never for anything that must be read to act. |
| `text-meta` | 12 / 16 | 400 | +0.01em | Field labels, column headers, help, secondary cell text. Always `text-muted-foreground`. |
| `text-control` | 12 / 16 | 500 | | Button, chip, tab and menu labels; input text at `md`. |
| `text-body` | 13 / 20 | 400 | | Prose, table cells, input text at `lg`, descriptions, dialog bodies. **The default on `body`.** |
| `text-lead` | 14 / 20 | 500 | | Row titles, card titles, drawer titles, the name column. |
| `text-section` | 16 / 24 | 500 | | Section headings inside a page, dialog titles, `h2`. |
| `text-title` | 20 / 28 | 600 | -0.01em | The page `h1`. One per page, owned by `PageHeader`. |
| `text-display` | 24 / 32 | 600 | -0.02em | A figure that is the page's result (the CTC total). Never a heading. |

**Why 13 and not 14.** 14 is the web default because browsers default to 16
and shadcn scaled down once. Tools people sit in for hours (Linear, Figma,
Finder, Notion's sidebar; macOS HIG body is 13pt) sit at 13 because at a
desk's viewing distance 13px Geist clears the x-height floor where reading
speed stops dropping, and it fits about eight percent more rows than 14.
**12 for controls** because a label is read once, not read through, and a
control one step quieter than the prose lets the prose lead. **11 is the
floor**: below it Geist's counters close at 1x and the contrast test cannot
save it.

**Enforced** (`design-system.test.ts`): `text-xs` … `text-2xl`, `text-[N]`,
`leading-*`, `tracking-*`, `text-x/y` and `font-semibold` / `font-bold` are
banned outside the token definitions. Two weights per screen is therefore
mechanical: 400 and 500 everywhere, 600 only where `text-title` and
`text-display` apply it.

**Sentence case, never uppercase. Enforced.** All-caps destroys the word shapes
a reader recognises without looking, costs about a tenth of reading speed, and
some screen readers spell it out letter by letter. Hierarchy is carried by
colour at one size. The document sheets are exempt: "DESCRIPTION" is the
printed artifact's own typography, and Rule 46 wants several of those headings
verbatim.

**Label and value are one size, separated by colour.** `text-body
text-muted-foreground` over `text-body` for the value. Making the label smaller
*as well* says the same thing twice.

**The page title is never typed by a page.** `PageHeader` owns the `h1`.

**Mono is for identity, not for decoration.** Document numbers, GSTIN, PAN,
CIN, IFSC, UPI, employee codes, uuids, amounts in a column that is scanned
down: anything compared against a certificate or a bank statement gets
`font-mono tabular-nums`. Prose never does.

- **`tabular-nums` on every numeric column.** Digits that do not line up cannot
  be compared, which is most of what these tables are for.
- **Never centre body text.** Numbers are right-aligned, everything else left.

### 1.5 Icons — **enforced**, except the stroke width

Lucide only. One weight everywhere: `globals.css` sets `stroke-width: 1.75`
with `non-scaling-stroke` on `.lucide`, so the weight is screen pixels and does
not drift with size. 1.75 because 2 is heavy at 14px and 1.5 breaks at 12, and
the doc and the stylesheet had disagreed (1.5 and 2) for a month without
anyone noticing. **Do not set `strokeWidth` per icon.**

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

**The two are not the same string, and the difference is the context each is
read in.** A tooltip is read by somebody who can already see which icon they are
pointing at and which row it sits in, so one word is the whole of what it adds:
"Expand", "Archive", "Download as MD". An `aria-label` is reached out of that
context, in a list where "Expand" could be about anything on the page, so it
keeps its object: "Expand this clause". Where one string genuinely serves both,
pass one; a helper that takes `tooltip` should default it to `label`.

**Every icon in a row of icons gets one, including the one that is not an
`IconAction`.** The clause drawer's control row is five icons, and the only one
with no tooltip was `ConfirmActionButton`, which names its button with an
`sr-only` span instead. It was also the only irreversible control in the row.
A row where four controls explain themselves and the fifth is the dangerous one
is worse than a row where none do.

**Icon colour follows text colour.** An icon does not get its own colour to
"add interest"; it gets one only when it carries state (destructive, warning,
pass).

### 1.6 Motion — **enforced**

**Rule of thumb:** motion exists only to connect two states the reader caused.
If removing it loses no information, remove it.

Motion is decoration, never information. Every animated state also says itself
in text, a live region or `aria-current`. That is why `globals.css` can kill all
motion under `prefers-reduced-motion` in one blanket rule.

**Three tiers, one easing, and a transition belongs to exactly one tier.**

| Tier | Duration | Property | For |
|---|---|---|---|
| **State** | **75ms, the default** | colour, opacity | Hover, press, focus, selected |
| **Overlay** | `duration-100` | opacity, a 2px translate | Popover, menu, tooltip, dialog, scrim |
| **Panel** | `duration-200` | transform | Sheet, drawer, sidebar collapse, editor rail |

**75ms is the default**, set once as `--default-transition-duration` rather
than per call site: the state tier was the one nobody ever wrote, so a bare
`transition-colors` silently took Tailwind's 150ms and every hover ran at
twice the intended speed. The other two are written explicitly, because they
are the exceptions. The fourth tier (400ms, one member) and the two
"signature" exemptions (a 420ms tray arrow, a 500ms spin) were removed on 16
October 2026 with the rest of the decorative motion (§6).

**One easing: `ease-standard`** (`cubic-bezier(.2, 0, 0, 1)`). It leaves
immediately and settles slowly, which is what makes a control feel like it
responded to the click rather than thought about it. It is the default, so
nothing names an easing; `ease-*` anything else fails the build, and so does a
duration written inside a `style` string.

**What stays:** `animate-spin` (a spinner says "working"), `animate-pulse` (a
skeleton says "loading, not empty"), `progress-slide` (indeterminate
progress), the overlay fade, the panel slide, and `active:translate-y-px`
(one frame: how a button says the click landed).

**What does not exist here, by decision:** animated icons (a chevron that
rotates, a plus that turns, an arrow that slides), a highlight that follows
the pointer through a menu, a pill that slides between tabs, a spring
library, a ring that pulses when a field auto-fills. Each delays recognising
*which* control this is by the length of its animation, none carries
information, and together they made the tool feel like it was reacting to
the reader rather than waiting for them. macOS does almost none of this: a
button changes colour in no frames, a menu appears in one, a sheet slides
because it *is* arriving from somewhere.

**Rules:**

- **Animate `transform` and `opacity`.** Not `width`, `height`, `top`, `left`.
  The nav rail is the one exception: collapsing is a change of *box*, so it
  animates width and radius together in one declaration in `ui/sidebar.tsx`.
  **Both endpoints of an animated `height` must be lengths.**
- **Nothing animates on mount.** This is a tool people use fifty times a day,
  and an animation seen fifty times is a delay.
- **Layout must not shift.** A hover state that adds a border changes size;
  reserve the space (transparent border, or `ring`).

### 1.7 Elevation and borders — **enforced**

**Rule of thumb:** flat and bordered on the page; shadow only on things that
float; the higher it floats, the softer and larger the shadow.

A shadow says "this is above that". On a flat page nothing is above anything,
so a card gets a border, not a shadow. A popover is above the page; a dialog is
above everything and gets a scrim too. Three levels are all a reader can tell
apart, and they are the only shadows that exist.

| Token | Light | For |
|---|---|---|
| `shadow-raised` | `0 1px 2px` at 6% | The inset shell frame, the selected tab pill, a dragged row |
| `shadow-overlay` | `0 4px 12px` at 10% + a 1px edge | Popover, dropdown, combobox, tooltip, toast |
| `shadow-modal` | `0 16px 48px` at 18% + a 2px edge | Dialog, drawer, sheet |

Dark theme: same geometry at about twice the alpha, because a shadow on a dark
ground is mostly invisible at the light values. Values live in `:root` /
`.dark` as `--elevation-*` and are mapped in `@theme`. `shadow-[…]` and
Tailwind's `shadow-sm` … `shadow-2xl` fail the build.

- **One border, not two.** A bordered card containing a bordered table produces
  a double line at the join; the inner element drops its outer border.
- **A shadow separates nothing in dark mode on its own.** Every floating
  surface also carries `ring-1 ring-foreground/10`; the ring is the edge in
  both themes, the shadow is depth.
- **A pill inside a trough is raised by its fill, not by an outline.** Light
  paints `bg-background` on `bg-muted`; dark paints a step up the ramp. No
  border in either. One `tabPillSurface` in `ui/tabs.tsx`.
- **Dark mode is its own design, not an inversion.** Text is `--gray-200`, not
  white, because pure white on near-black haloes; `--border` and `--input` are
  a 10% white overlay, which composites to a hairline of whatever ground it
  sits on. Neither is held to 1.4.11, because every field is identified by a
  visible `<Label>`; that is written down in `contrast.test.ts` rather than
  silently skipped.

**Layers** (`--z-*` in `globals.css`): sticky 10, rail 20, modal 30,
overlay 40, toast 50. **Overlay sits above modal**, because a select, menu or
tooltip is opened from something already on screen, which is often a dialog
or a drawer. The other order hid every dropdown in every dialog behind the
dialog itself until 16 October 2026; `e2e/popup.spec.ts` measures it.

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
measuring**: `slide-in-from-*` is a transform, so a box read
inside the first 100ms is smaller than the one that settles, and the numbers
moved between runs until the spec disabled them.

**The highlighted row is painted, not slid.** A menu, select or combobox row
under the pointer or the keyboard cursor takes `bg-accent` in the frame it is
reached, the nav rail's row takes `bg-sidebar-hover`, and the ⌘D palette's
card takes `bg-foreground/8`. There was a travelling highlight once
(`MagicMove`, removed 16 October 2026 with the rest of the decorative motion,
§1.6): one surface that slid between rows at 200ms. It cost a hook, a
`MutationObserver`, three e2e specs that sampled `transform` per frame, and a
rule that rows must *not* paint their own fill so the slide had something to
be seen against. A row reached by keyboard still had to answer in the frame
it was reached, which meant the text colour switched instantly while the fill
arrived 200ms later. Painting the fill in that same frame is what every
reader actually wanted.

Two fills were never the highlight and still are not: a **destructive** menu
row is a different colour, and a combobox's **selected** tint marks a standing
fact several rows can carry at once. On the rail, **hover and active are two
fills**, one step apart on the gray ramp (`globals.css`), because the active
one says which page you are on; hovering the current page leaves it in its
active colour.

### 1.8 Focus and hit targets — **enforced**

- **One focus indicator, `focus-ring`** (`@utility` in `globals.css`): a 2px
  ring of `--ring` at 30% plus `border-ring`, visible only on
  `focus-visible`. Every interactive atom applies it; a component drawing
  its own `ring-ring` or `focus-visible:ring-*` fails the build. The audit
  found rings at 30%, 40%, 50% and solid, and one control with none, and the
  keyboard user is the one reader with no other cue. **Never `outline-none`
  without `focus-ring`.**
- **Hit targets:** 28px minimum (a `sm` button), 32 standard, 36 in forms.
  Nothing clickable is under 28 on either axis.
- Anything clickable is a `<button>` or an `<a>`. A `div` with an `onClick` is a
  bug, not a shortcut. Where the visual must be a box (the upload drop zone), it
  is `role="button"` with a keyboard handler and an `sr-only` real input inside.

### 1.9 Cursors

The platform cursors are black with a white outline whatever the theme, and on
a gray shell they sat like strangers. Five are drawn in-house, as inline SVG
data URIs on custom properties in `globals.css`, each with the platform cursor
as its fallback. The I-beam is the one native cursor kept: a field is where
text is typed, and nothing about that glyph is a colour choice.

| Cursor | Glyph | Light | Dark | Applied by |
|---|---|---|---|---|
| `--cursor-default` | Lucide `mouse-pointer-2`, filled | gray-800 | gray-200 | `body`, inherited; the `cursor-default` utility |
| `--cursor-pointer` | A filled hand, index raised, hotspot at the fingertip | gray-800 | gray-200 | `a[href]`; the `cursor-pointer` utility |
| `--cursor-grab` | The same hand, open, hotspot at the palm | gray-800 | gray-200 | the `cursor-grab` utility |
| `--cursor-grabbing` | The same hand, closed | gray-800 | gray-200 | the `cursor-grabbing` utility |
| `--cursor-col-resize` | A spine with a head each way | gray-700 | gray-300 | the nav resize handle, and `body[data-resizing]` |

- **The four utilities are redefined at the foot of `globals.css`**, so an
  existing `cursor-pointer` resolves to the themed hand without the call site
  changing. A new cursor gets a variable per theme, a `@utility` override, and
  a row here.
- **An SVG data URI cannot read a custom property**, so each fill is the
  token's oklch value written out. The comment beside each says which token
  it must equal; a gray token that changes changes these too.
- **The hand is one silhouette in three poses.** The pointer, the open hand
  and the fist share a palm and a thumb, so a drag reads as the same hand
  closing rather than as three icons from three sets. Outlined and heavier
  versions were tried and rejected: at 20px an outline fills in, and a bulkier
  fill reads as a glove.
- **The col-resize glyph is one step lighter** than the hands (gray-700, not
  800). Gray-900 was tried first and read as too heavy against the shell.

---

## 2. Components

### 2.1 Buttons

**Rule of thumb:** one filled button per view; everything else is quiet; the
height of a button is the height of whatever sits beside it.

**Five fills**, and the order is the hierarchy:

| Variant | Looks | When |
|---|---|---|
| `primary` | `bg-primary` | The one action the page exists for. **One per view.** |
| `secondary` | border, no fill | **Default.** Every ordinary action. |
| `ghost` | nothing until hovered | A row of icons, a toolbar, "Cancel": anything that must not compete |
| `destructive` | red tint | Delete, remove, discard. Solid red only on the confirm inside its own dialog |
| `link` | text, underline on hover | Inline in prose |

`raised` and `neutral` were deleted on 16 October 2026: one was on trial on
one button for a year, the other existed for a row with two solid buttons,
which the one-primary rule forbids. A row that needs two solid buttons is a
row with the wrong hierarchy.

**Three heights:**

| Size | px | Text | Where |
|---|---|---|---|
| `sm` | 28 | control | Toolbars (filter, sort, columns), row actions, the drawer toolbar, icon-only anywhere, inside a 40px table row |
| `md` | 32 | control | **Default.** Page actions, dialog actions, drawer footer, beside a rail Input (also 32) |
| `lg` | 36 | body, medium | Beside a form Input (also 36); a form's own submit |

28 is the smallest thing that reads as a control rather than a chip. 32 is
the height of an action on the page and of an Input in the editor rail. 36 is
a form field's height, and a button beside a field is the field's height. 24
was deleted: it was only ever icon-only row actions, and a 28 square sits in a
40 row with 6px above and below. Inside a `FieldGroup size="form"` an `md`
button grows to `lg` on its own.

**`icon`** makes the button square at its height. It is a shape, not a fourth
size. An icon-only button still names itself (`aria-label` or an `sr-only`
span); **enforced**, it fails the build otherwise.

**Six states, defined once in `buttonVariants`:** rest; hover (fill one step,
75ms); active (`translate-y-px`, one frame); focus-visible (the one
`focus-ring`); disabled (`opacity-50`, pointer events off, never hidden);
pending (`Spinner` in front of a label that never changes, `aria-busy`).

**Rules:**

- **`[Cancel] [Confirm]` order**, and Cancel is `ghost`.
- **Label the verb and the object**: "Save client", not "Save"; "Delete
  invoice", not "Delete". A button that says "OK" says nothing.
- **A destructive confirmation uses `AlertDialog`, never `Dialog`.**
- **Every button that starts an async action passes `pending`**, or
  double-submit is a live bug.
- A disabled button must be explainable. If the reason is not obvious on the
  screen, wrap it in a tooltip that says why.
- **Every control in one horizontal row is the same height.**
- **One filled blue per viewport.** The rail's "New document" is on screen
  everywhere, so a page-level create is `secondary`. A create action is an
  `AddButton` / `AddLink`: a plus and a verb.

**Enforced:** the old API (`variant="default|outline|raised|neutral"`,
`size="icon|icon-sm|default|form"`) fails `design-system.test.ts` on any
button tag, and cva rejects it at the type level.

### 2.2 Inputs and fields

The pair rule (`CONTEXT.md` §5f) is the law here: the **rule** lives in
`src/lib/domain/fields.ts` or `text.ts`, the **input** in
`src/components/form/fields.tsx`, named to match. Every schema imports the
first, every form the second.

**Two heights, and 32px is the floor.** The compact `default` is **32px**
(`h-8`) and the roomy `form` is **36px** (`h-9`), which are Button's `md` and
`lg`, so a button beside a field is never a different height. The 36px `md`
rung that sat between them (one caller) was folded into `form` on 16 October
2026.
Nothing typed into goes under 32 in any variant: input, textarea, select
trigger, combobox and date trigger all declare the same number, so a field row
cannot come out three heights. Pinned in `ui/__tests__/control-size.test.tsx`.

**A rung is declared by every typed-into control or by none of them**, which is
the rule rather than the list. `md` was added 17 September 2026 for the clause
drawer, where 32 read as cramped under a full-width body editor and 38 made the
two fields the largest thing on the panel. Adding it to `Input` alone would have
been the smaller diff and the broken one: the moment a select or a date trigger
joined that form, the row would come out two heights and the sentence above
would stop being true. Note two of the five are cva variants and three declare
every size at once as `data-[size=…]` selectors, so the test asserts the rung
*exists and is 36px* rather than that no other number appears in the class
string.

**A textarea's height is its content's, never a number and never a drag.**
`ui/textarea.tsx` carries `field-sizing-content` and `resize-none`, so a field
starts at its rung and grows as lines are added. Two things override that and
both are bugs rather than options: **`rows`** is a height, so `rows={2}` floors
an empty field at two lines whatever field-sizing says, and **`resize-y`** puts
a drag corner in the corner of every field, which is visual noise at this
density and a second answer to how tall a field is, one the content decides and
one somebody dragged to. The clause body editor had both and looked deliberate:
28 rows of half-empty box, each with a grab handle nobody used. Measured in
`e2e/clause-library.spec.ts`, against a row added during the test, because
every stored clause holds enough prose to wrap and only an empty field shows
the floor.

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
  `patterns/Page.tsx` owns the format *and* the weight, so the same fact cannot
  look like two different facts on two lists.
- No quoted em or en dash as a nil glyph. `NIL` from `lib/utils.ts`, which is a
  hyphen. Same reason as the row above, and the house rule on dashes.
- No `status === 'finalized' ? …` label written in a component. `StatusBadge`
  from `ui/badge.tsx`'s `status` prop owns the word and the fill, and every status
  carries a word so colour is never the message.
- No `size="icon"` button without a name to announce: `aria-label`, an
  `sr-only` span, or a `label` prop on one of the wrappers that renders both.
- No `(optional)` in a label and no `placeholder="Optional"`. `FieldInfo`'s
  `optional` prop, which renders `OptionalMark`.
- Every colour pair the app puts text on clears 4.5:1 in **both** themes, and
  the focus ring clears 3:1. `src/__tests__/contrast.test.ts` parses the tokens
  out of `globals.css` and does the arithmetic.

**Controls, settled:**

- **Three heights.** 28 (`sm`, toolbars and row actions), 32 (`md`, the
  default and a rail input's height), 36 (`lg`, a form field's height, for a
  button sitting inline with one). 24 was deleted:
  it said nothing the survivors do not, and a fourth height is a fourth
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

**Feedback, settled:** toasts are bottom-center, 4s, three at a time
(`ui/sonner.tsx`). A toast fires only when the success is **not** already
visible, or when it carries an **undo**; list mutations apply optimistically
via `useOptimistic` and revert themselves on refusal, with the reason inline.

A field-level validation error is still never a toast (§2.6): it belongs
under the field, where the operator is already looking. What toasts instead
is a **server-side refusal with nowhere on the page to attach to** ("Qera has
documents and cannot be deleted"), and that one class gets its own styling:
`toast.error(...)` prints in `--destructive`/`--destructive-foreground`, the
same red `StatusBadge`'s danger variant uses, holds for **10 seconds** rather
than 4, and every toast (this class included) carries a manual close. Four
seconds was never enough to read a reason; it was enough for a confirmation.

**The table, settled:** rows are 40px (`h-10` on the row, 8px cell padding, the 20px line with one control gap each side,
`leading-none`), hover is `bg-muted/40`, the header is sticky, the whole row is
one stretched anchor, row actions and copy buttons reveal on `group-hover/row`
and on `focus-within`, every figure is `tabular-nums`, money is right-aligned,
a sort arrow is permanent on the sorted column and appears on hover elsewhere,
and long values truncate with the full string on `title`. All of it lives in
`ui/table.tsx` and `patterns/Page.tsx`, so a new table inherits it by existing.

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

The primary surface of this app, and the one place where "every instance
behaves the same" is not a preference but the product working.

**The rule above all the others: a list of records is a `RecordTable`**
(`components/patterns/RecordTable.tsx`). Not a `<Table>` you assemble. You pass
rows and a column spec; it brings paging, the caption, the actions column, row
selection and the row that opens its record. **Enforced:
`design-system.test.ts` fails a `TableBody` outside `ui/` and `RecordTable`.**

The reason is this section's own history. Every rule below was already written
here, in this file, in these words, and the clause library was built in
September 2026 with no paging over 28 rows, no caption and no sortable heads,
by an author who had read the file. Prose describing a default is not a default.
**The only defaults that hold are the ones you would have to take deliberate
action to lose**, so the behaviours are the component's and departing from one
is an explicit prop at the call site, where a reader can see it and ask why.

`DocumentsTable` is the reference: where this section and that file disagree,
that file is right and this section is stale.

**What every table does, without being asked.** Each is a `RecordTable` default;
the opt-out is named beside it and is the *only* way to lose the behaviour.

| Behaviour | Opt out with | Why it is the default |
|---|---|---|
| Pages at ten rows | `pageSize` | A list longer than a screen buries whatever follows it. Ten is `PAGE_SIZE`, one number for the whole app. |
| Row count and pager in the card footer | not optional | The answer to "is this all of them", asked at the end of a list. |
| An `sr-only` `<TableCaption>` | not optional | A table with no caption is an unnamed region. It is one string. |
| Column headings sort | **opt-in: pass `sortable`** | The one default that runs the other way. See below. |
| A right-aligned actions column | `actions` omitted | The column exists whether or not a row has actions, or rows jump width. |
| The whole row opens the record | `open` omitted | See below: it is one stretched link, not an `onClick`. |
| A row-select checkbox column | **not optional** | See below. |
| A bulk delete in the bar | `onBulkDelete` omitted | |
| Empty state | `empty` | A table that renders zero rows and nothing else looks broken (§2.5). |

**Selection is unconditional; the bar is not.** Every table draws the checkbox
column, whether or not anything can act on a selection. That is a deliberate
asymmetry with the rest of this table: the column is cheap to remove from one
table later and expensive to remember to add to each new one, and a list where
some rows tick and others do not is a list nobody trusts to be tickable. What
*is* conditional is the bar underneath, which renders nothing until the table
passes `onBulkDelete` or a `bulkActions` entry, so a tick never implies an
action that does not exist.

Three rules follow it:

- **Only rows that can be acted on get a control.** `useBulkSelect`'s
  `deletable` decides per row; a finalized document is immutable (CONTEXT §4)
  and gets an empty cell of the same width. Offering a checkbox on a row the
  server will refuse is offering an action one confirm dialog later.
- **The checkbox cell paints above the row's overlay** (`relative z-10`), and
  it is the first cell, so DOM order alone loses to the stretched link. Without
  it, ticking a row opens the record instead. **Enforced in the browser**, and
  confirmed red on removing the `z-10`.
- **Delete keeps the bar's destructive slot; everything else is an ordinary
  button.** The clause library carries both: bulk archive is reversible and
  keeps each clause's number, so it is an outline button, while bulk delete
  retires those numbers for good and is drawn as the destructive action it is.
  A reversible action generally skips its confirm, because confirming one
  teaches people to click through the dialog guarding the irreversible one.

**The geometry rules, which are the ones that break silently.**

- **A row that opens a record is `relative`, and the link is stretched**
  (`after:absolute after:inset-0`). Both halves are load-bearing and neither is
  obvious. An absolutely positioned overlay resolves against its nearest
  *positioned* ancestor, so a `relative` on any cell between row and overlay
  shrinks the hit area to that column, and **no `relative` anywhere lets the
  overlay escape to the card and cover every row at once**, which makes a click
  on row 4 open row 6. Both have happened here: `CopyCell` carried a `relative`
  once, and the clause library shipped with neither. **Enforced in the browser**
  (`e2e/clause-library.spec.ts` asserts *which* record opened, not that one
  did), because jsdom does no hit-testing and reports both bugs as working.
- **It is a real `<Link>`, never a row `onClick`.** Middle-click, ⌘-click,
  "copy link address" and the keyboard all have to work, and the table stays
  server-rendered. Where the row opens something that is not a URL (a drawer),
  it is a `<button>` spanning the row, never a handler on the `<tr>`: a `tr` is
  not a control, so a handler there is invisible to the keyboard and announces
  nothing.
- **What must sit above the overlay is positioned and later in DOM order**: the
  actions cell, and the copy button's own `relative z-10`.

**Everything else, unchanged and still true:**

- **Every table sits in a `TableCard`** (`components/patterns/Page.tsx`):
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
  `RecordTable` supplies both; nothing else should be constructing them.
- **Header row:** sticky, one hairline below, and **filled `bg-sidebar`**, not
  the `bg-background` the rows are on. **Enforced** (`ui/__tests__/table.test.tsx`).
  That value is the shell's own ground, so a table's header band matches the
  page's header band and the margin the card floats in: the card reads as data
  held inside the chrome rather than as a box whose first row happens to be
  bold. Before it, the header and the rows were the same fill and a hairline
  carried the whole distinction, which in dark mode is close to carrying
  nothing. Subtle in light (gray-50 on white) and strong in dark (gray-950
  against the card), which is the right way round. Opaque either way, because
  `sticky` means rows scroll under it.
- **The footer's padding is asymmetric: 36px left, 8px right.** The left holds
the row count, which is prose and lines up with the first column's text. The
right holds the pager, whose ghost icon buttons carry their own padding inside
the hit target, so the glyph already sits well inside the box and 36px on top
of it pushed the last arrow off the card's corner. Padding to a control is not
padding to a letterform. **Enforced** (`ui/__tests__/table.test.tsx`, and
measured in `e2e/shell-sheets.spec.ts`).

**Sorting is opt-in, and the reason is a rule about pairs.** Every other
behaviour here is on by default; this one is off until a caller passes
`sortable` (or passes an order of its own, which demonstrates the same thing).

Sorting's controls only appear on a heading under the pointer, so the one piece
of UI that advertises them is `SortToggle`, the eye. That eye lives in a
`FilterBar`, which `RecordTable` does not own and cannot render into. So a table
that sorted by default put arrows on hover wherever its caller had no bar, with
nothing anywhere on the page to turn them off. The clause library and the
employees list both shipped that way.

**A control and the thing that governs it are one unit.** Where a component
cannot carry both halves, the half it does carry is the one that waits to be
asked for. **Enforced** (`design-system.test.ts`): a file that turns sorting on
with no `SortToggle` rendered in its own folder fails the build.

**The card *footer* carries the same fill**, so the data sits between two
  bands of chrome rather than under one. **Enforced** in the same file. It was
  left plain for an hour on the argument that sinking the pager would make it
  harder to find; seeing it decided the other way, since the pager is a control
  with its own hover and focus states and the asymmetry read as an unfinished
  card. Its text is `muted-foreground`, and that pair on `sidebar` is asserted
  in `contrast.test.ts`: it is the token that file's own header records as
  having failed twice on a background nobody had checked.
- **No icons in column headers.** A glyph beside a word that already names the
  column decorates rather than disambiguates (§1.5). `ColumnLabel` was deleted
  when the icons went.
- **A value is formatted on the way out, never printed as stored.** Phones go
  through `formatPhoneForDisplay`, money through `formatINR`, dates through
  `formatDisplayDate`. **The phone half is enforced**, because that is the one
  that had silently never been done.
- **Numeric columns `tabular-nums`, `font-mono` where the value is an
  identifier.** Money is the exception to right alignment: it is left-aligned
  behind its currency chip (§2.3, Money).
- **No zebra striping and no row tinting by status.** Refused: it fights the
  hover and selected states, which carry actual meaning. A status is a badge in
  its own column.
- **Row hover is a background step only.** No scale, no shadow, no border
  change (see §1.6, layout must not shift).
- **The whole row is the link** where a row navigates, not the first cell. See
  the geometry rules above for the two ways this breaks.
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

**The template: where a new table is copied from.**

Everything above is a rule; `library/table/` is that rule made into something
you can copy. It is one `RecordTable` call site (`TemplateTable.tsx`) over a
column spec holding **one of every kind of column this app has**
(`columns.tsx`), over rows built to exercise each (`rows.ts`), shown live under
`/design?section=patterns&item=table`. Build a new table by taking the column
definitions it needs and deleting the rest.

It is a **reference, not a second component.** There is exactly one table
component here and it is `RecordTable`; a wrapper over it with one real shape is
how every table's differences become props on a layer nobody can change. What
the template holds is *column* definitions, which is the part that genuinely
repeats. The spec is an array rather than JSX inside a component so that
promoting it later is a move rather than a rewrite.

**The eleven kinds, and the one decision each carries.**

| Kind | The rule it exists to state |
|---|---|
| Identity | Frozen where the table scrolls, and the only column that says *which row you are on*. Returns a string, because the row's link and its accessible name are read from it. |
| Copyable | A value somebody retypes elsewhere. The value *is* the button. `CopyValue` in the table's own cell, never `CopyCell`, which brings a cell no column can put a width on. |
| Status | `StatusBadge`, never a ternary. Every status carries a word; the fill is the second reading. |
| Money | `AmountCell`: integer minor units through `formatMoney`, the currency symbol in a `RaisedChip`, the digits beside it, `tabular-nums`, and **absent is `NIL`, never a zero**. **Left-aligned, under a `Banknote` heading**, as the library's template table draws it: the chip is what lines the figures up, and a right-aligned column would put the chip on the ragged side. `sortValue` is the number, or '₹1,200' sorts above '₹12,00,000'. |
| Category | An accent hue that **means nothing**, with the word always beside it. A hash is right only while the set is unenumerated; a real enum names its hue per value. |
| Person | A tinted disc of initials, never a photograph. `NIL` where there is none. |
| People | Three discs then a count; the names go to the tooltip and the label. Not sortable, because a set of people has no order. |
| Place | A flag is **never the only carrier** of a country. `minSize` is stated and `fit` is measured; the floor is whichever is larger. |
| Date | `DateValue` at full strength, `tabular-nums`. A date is a value the list is read for, not a caption. |
| Prose | The column that truncates, with the whole value on its `title`. `trunc` requires a plain-string cell. |
| Glyph | The one kind allowed no *visible* heading. It still has a `label`, it carries its figures in an accessible name, and nothing-yet draws as a track. |

Eleven is over the six-column budget on purpose: the template is a catalogue,
not a table anybody reads.

**Reordering is `reorderable`, and its bounds are structural.** Press a heading
and move: past ~5px the press becomes a drag and the column follows the pointer,
dropping where it is released. Under that it is still a click, so a sortable
heading still sorts. Ctrl/alt with an arrow does the same from the keyboard, and
that path is not optional (WCAG 2.1.1): a `<th>` takes no focus by default, so
a reorderable heading is given `tabIndex={-1}`, which keeps it reachable without
adding a second tab stop per column to a header that already has a sort
button.

Both bounds hold without anyone remembering them. The **checkbox and actions**
columns are furniture `RecordTable` draws itself and are not in `columns`, so
nothing can be dropped outside them by construction. A **frozen** column is
pinned and nothing drops before one, because freezing is what makes a column the
one that identifies the row and a sticky `left` is a running sum of the frozen
widths before it.

Two marks during the drag, and they say different things: the column in hand
goes translucent, and the column under the pointer takes a `--primary` rule on
the edge the dragged column would land on. A *fill* there would read as a second
selection; this is an insertion point.

**The order persists, per table, keyed on `caption`**, and that is the one place
this departs from column widths, which are set by the call site and are not
the reader's. An order says which columns matter to you, which does not change
between visits. A stored order is always reconciled against the current spec, so a
column added later appears rather than vanishing and a column removed does not
strand the rest.

**There is no drag-suppression flag, and that was measured rather than assumed.**
The obvious worry is a drag ending in a click that also sorts. In a real browser
it does not: a drag onto another heading fires no click at all, and a drag
returned to its origin fires one on the `<th>`, never on the button inside it,
because pointer capture retargets it. Capture is therefore taken *when the drag
starts*, not on pointer-down. Taking it early stole the click that sorts, which
is one of the two bugs `e2e/record-table.spec.ts` now pins.

**The wide package is one decision, not five.** `fixed` switches the table
to `table-layout: fixed` and wraps it in a horizontal scrollport. Three things
follow and they arrive together: every column must state a `size` and content is
**clipped** rather than widening (so every cell truncates); frozen columns become
possible, because freezing needs known widths; and **the sticky header is lost**,
because a horizontally scrolling container is the scrollport for both axes.
`dividers` and `sticky` earn their place only here, where a row is no longer one
glance. A table narrow enough to read at once takes none of it.

**Columns do not resize.** The drag handles were removed from every table on
9 October 2026, on request: a handle let a column be dragged down to almost
nothing, and widths are a decision for the call site, not a control. Two
things stand in for it. `fitTruncated` widens a column that cuts a value on
the rows shown, by exactly what it cut; and when the columns add up to less
than the card, a blank column takes the rest so every real column keeps its
stated `size` instead of being stretched in proportion.

### 2.4 Cards and page layout

- **A page is: header (title, description, primary action), then content.** One
  component owns that (`PageHeader`), so the inset,
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

### 2.5 The six states

Every surface that loads data declares all of them, from one component:
`EmptyState` in `ui/empty.tsx` carries the copy for the four empties, so
"No clients match these filters" is written once. Enforced: the sentence
written anywhere else fails the build.

| State | Rule |
|---|---|
| **Loading** | A skeleton in the shape of what is arriving, held back 150ms so a fast route never flashes one. `TableSkeleton` for a list, `FormSkeleton` for a form (`clients/new` and `clients/[id]` carry their own `loading.tsx`). Never a spinner, never layout shift. |
| **Empty** | `preset="none-yet"`: what would be here, and **the button that creates the first one**. Never just "No results". |
| **Filtered-empty** | `preset="no-matches"`: says the filters are hiding things and offers to clear them. |
| **Error** | `preset="error"` or `(app)/error.tsx`: what failed, in a sentence, plus retry, plus the digest in `Mono`. |
| **Not found** | `(app)/not-found.tsx`, inside the shell: a dead link lands on a page that still has the nav and the way back. |
| **Pending** | `Button pending`: a spinner in front of a label that never changes. Enforced on every submit, primary and destructive. |

The empty panel is lifted by `shadow-raised`, carries a 40px icon, and sets
its one action 48px below the copy, at `lg`, so the button reads as the next
step rather than a fourth line of text (17 October 2026).

### 2.6 Feedback

**The ladder, lowest to highest:** a field error (inline, `FieldError`, on
blur) → a form error (`Alert destructive` at the top of the form) → a toast
(only for something that happened out of view: "Archived", "Copied") → a
dialog (only when the reader must decide). A validation error is never a
toast. Confirm before anything destructive.

**One confirmation, `patterns/ConfirmDialog`.** Enforced: an `AlertDialog`
written outside `ui/` and `patterns/` fails the build. There were nine of
them, with "Cancel", "Stay" and "Keep editing" between them, and the dialog
that threw work away was the one the eye landed on. The wording is the
component's, not the call site's:

| Part | Rule | Example |
|---|---|---|
| Title | Verb and object, no question mark | "Delete draft", "Leave page", "Archive service" |
| Consequence | One sentence: what cannot be undone | "The draft and its line items are removed." |
| Cancel | Always "Cancel", always `ghost` | |
| Confirm | Repeats the verb and the object; solid red when destructive | "Delete draft" |
| `extra` | A third action only where there is a better answer than either | "Save and leave" |

Enforced: a `ConfirmDialog` title ending in `?` fails the build.
`ConfirmAction` is a button that opens one; `RemoveButton` is its preset for
a repeatable row.

**The other molecules in `patterns/`, and what each replaced:**

| Molecule | Replaces | Rule it holds |
|---|---|---|
| `IconAction` | a ghost icon `Button` + `Tooltip` written per site | Every icon-only control is 28px square, muted until hovered, named, with a one-word tooltip |
| `CopyAction` | `copy-button.tsx` (a raw `<button>`) | Copy shows a tick for 1.5s; `useCopy` lives in `lib/` |
| `AddButton` / `AddLink` | `ui/add-button.tsx` | A create action is a plus and a verb |
| `Mono` | `font-mono` by hand | Identity strings are mono with tabular figures (§1.4); `font-mono` elsewhere fails the build |
| `DrawerToolbar` | `ui/drawer-toolbar.tsx` | Back, expand, pager and actions in one row of `IconAction`s |
| `Spinner` (`ui/`) | `Loader2` imported per site | One spinner; `Button pending` uses it; `Loader2` elsewhere fails the build |

**Working buttons say so.** `disabled={pending}` on a `Button` fails the
build (allowlisted until the screen migration); `pending={pending}` is the
spelling, and it draws the spinner.

### 2.7 Tabs and segmented pills

Anything shaped like a pill sliding along a trough gets **both** ways in: click
a segment, or pick the pill up and drop it. It is one hook, `useTabDrag` in
`ui/tabs.tsx`, and `TabsList` calls it for you, so an ordinary strip built from
`Tabs` / `TabsList` / `TabsTrigger` has the gesture without asking.

A control that is *not* built from `Tabs` (there is one: the list/cards/board
toggle in `DocumentsBrowser`, which has no panels to reveal and so must not
claim tab roles) spreads the hook onto its container and marks its parts:
`data-drag-pill` on the sliding surface, `data-drag-segment` on each choice. The
pill's transform then adds `var(--tab-drag, 0px)`, which is 0 at rest.

**The look is one set of three exports** in `ui/tabs.tsx`, adopted for every
strip on 10 October 2026 from a reference design (`library/tabs`):
`segmentTrough` (a `--muted` fill, `--radius` corners, **no stroke**),
`tabPillSurface` (white with a soft shadow, one ramp step up in dark mode,
`rounded-sm` so it stays concentric inside the trough's padding, **no
stroke**), and `segmentLabel` (`--tab-label` at rest, full ink when
chosen or hovered). Every strip draws from them, hand-rolled ones included:
`TabsList`, `ProfileSwitcher`, the documents view toggle, `ThemeToggle` and
`SpecDetailsTabs`'s Motion pill, and the pager (§2.10). `--tab-label` is a
shade quieter than muted text and as light as AA allows on the trough
(4.64:1 light, 4.58:1 dark, asserted in `contrast.test.ts`); the reference's
paler grey fails 4.5:1 there.

**Three sizes, the button heights** (16 October 2026): `sm` 28, `md` 32
(the default), `lg` 36. One 2px inset at every size, so the pill is the strip
minus 4px and its 6px corner stays concentric with the trough's 8px. Labels
follow the button scale: 12px at `sm` and `md`, 13px at `lg`.

**A caller passes a size and its triggers, nothing else.** `TabsList` draws
the pill itself. It used to be a separate `TabsIndicator` each screen had to
add, and four of six did not, so their drag committed on release with nothing
moving under the pointer. The indicator is no longer exported.

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

### 2.8 Boards

Two: `services/ServiceCards` (the catalogue, one column per Schedule) and
`DocumentsKanban` (the third view of the documents list). **They are the same
board.** The first was built and tuned; the second copies its chrome rather than
deciding any of it again, and a change to one is a change to both.

- **The column is a well, not a bare list.** `rounded-md border border-border
  bg-muted`, one step up the neutral ramp from the page, with the cards on their
  own fill inside it. That is what makes a column read as a container rather
  than as three stacks that happen to be side by side.
- **Its header is `px-3 py-2`**, the name at `text-sm font-medium` on the left
  and the count at `text-xs text-muted-foreground tabular-nums` on the right.
  Anything else the column offers (the catalogue's add button) joins the count.
- **The scroll is the column's, not the page's**, so the header stays put and
  one busy column cannot push the others off the bottom. That needs a height all
  the way up: the page passes `PageBody className="h-full min-h-0"` and every
  box between it and the column's list is `flex-1 min-h-0`. A board on a page
  that scrolls normally is a board whose columns are as tall as their contents,
  which is a list with headings in it.
- **A board reuses its list's card.** `DocumentCard` is exported for it. Three
  views drawing a document three ways is exactly the drift `StatusBadge` and
  `DateCell` exist to stop (§4).
- **A column is one quarter of the page, whatever the count.** Four is what the
  catalogue grids to (`xl:grid-cols-4`) and it is the width both boards use: a
  variable count writes it out as
  `auto-cols-[max(15rem,calc((100%_-_3rem)/4))]` on a `grid-flow-col` row, so
  two columns are two quarters and fourteen scroll sideways at the same size.
  `gap-4` between them either way. Stretching two columns to half the page each
  would draw the same card at two widths a page apart.
- **An empty column is still a column.** This is the opposite of the rule filter
  choices follow (§2.6), and deliberately: an unmatched filter value is a click
  that does nothing, while an empty column is an answer, and a board whose
  columns came and went with the data would change shape under every keystroke.
  So a board draws every value its axis *can* hold: both statuses, every
  document type the profile can contain, every month between the first and the
  last on screen, gaps included.
- **Busiest column first, and recency breaks a tie.** The fullest column should
  not be somewhere in the middle, so the count orders them and the newest
  document *made* in each separates two that are level: the one still being
  added to leads. The per-axis order (the lifecycle, the registry, the calendar)
  is what a genuine tie falls back on, which is also what keeps the empty
  columns still. `sort` being stable is load-bearing here, not incidental.
- **An empty column that names something creatable is the create control.** Only
  the type axis qualifies, and there the whole column body becomes one dashed
  target reading "New credit note", so the emptiness is an invitation rather than
  an absence. Not a button in the corner: at a quarter-page wide the column is
  already the right size for the gesture. The other two axes get nothing, because
  a month is past and a status is what finalizing produces, so both offers would
  be ones the app cannot honour.
- **The board shows every filtered row rather than one page of them.** A board
  is read for how much sits in each column, so a pager would misreport the only
  thing it is for.
- **Nothing drags between columns unless the move it implies is lawful and
  reversible.** Today none is: type and issue month cannot be changed by
  dropping, and a drop into "Finalized" would finalize a document, which claims
  an FY number and makes it immutable for 72 months. Finalizing is a decision
  taken in the editor.
- **The grouping control is a row of its own, under the filters, with all three
  cuts on it.** The filter row answers "which rows"; this answers "how are they
  arranged", and the two read as one question when they share a line. Three
  options are also too few to hide: a menu cost a click to see two of them and
  saved no space, so all three are on the row, drawn as a tab strip. No strokes
  and no visible group label, each cut a glyph and a word, and the one in force
  on `bg-raised` with `aria-pressed` — the surface `TabsIndicator` and the view
  toggle's pill already use, because the app should have one way of saying
  "this one". **Type leads and is where the board opens**: it is what a list of
  documents is mostly read for, and the one axis whose empty columns offer to
  fill themselves. A full-width `Separator` closes the row, which a strip with
  no strokes of its own needs: the pill says which cut is in force, the rule
  says where the controls stop and the board starts. Only the view that has an
  arrangement to change is shown any of it.

### 2.10 Pagination

**One pager, `ui/pagination.tsx`, and the pages are a tab group.** A trough
with the page you are on raised on it, which is the shape the app already uses
for tabs and profiles. It replaced a "Page 3 / 9" label between two arrows: a
readout rather than a control, where every page but the two either side of you
took a click each to reach, and whose one piece of information was already in
the row count beside it.

**Three shapes, by length.** One page renders nothing. Up to six, every page is
a button, with no arrows and no box, because each is already one click away.
Past six it becomes **three runs** — the first page, a sliding window of four,
the last page — 8px apart with a hairline between them.

**Everything is in one container**: both arrows, both anchors, the window and
the go-to box. It was three troughs with the arrows and the box loose outside
them, which drew six separate objects to say one thing and made a reader work
out that they were one control. Only the container carries a stroke; nothing
inside it does.

- **A short rule says numbers are missing.** `1 7 8 9 10 23` run together would
  be a lie about which numbers are adjacent. The gap alone carried this while
  each run had its own trough, since the space between two backgrounds is a
  boundary; with one container the background groups everything *together*, and
  8px became indistinguishable from loose tracking. The rule is what the trough
  edges used to be. It sits between runs, never after the last, or it would
  claim pages beyond the last page, and it is `aria-hidden`: it speaks about
  numbers a screen reader is already reading one at a time.
- **It is drawn in the text ramp at 40%, not in `--border`, and it is half a
  button tall.** `--border` bounds a box, and in dark it is white at 10%, about
  as faint as a line gets here; this one is the only thing left carrying that
  meaning, and a mark that means something cannot be quieter than the frame
  around it. Height and weight are separate knobs and only weight should be
  doing the work: at a full 18px it read as a structural divider cutting the
  control into sections, so it is 12px against 24px buttons, a tick between
  groups rather than a wall.
- **Runs that touch are merged, and get no separator.** Near either end the
  honest answer is two runs, not three: an anchor beside its own window would
  print `1 … 1 2 3 4`, and a rule between neighbours claims something is elided
  when nothing is.
- **The arrow steps one page; the window turns in batches.** Inside a window it
  moves the pill, and stepping off the last slot starts the next four. The
  arrow's meaning stays constant while the numbers turn a page at a time rather
  than crawling a column per click.
- **Four, because the window serves neighbours rather than distance.** A sliding
  window covers a rounding error of a long list at any width (on 23 pages, four
  slots have the page you want 24% of the time, one slot 13%); reaching a
  distant page is the box's job, in one interaction whatever this number is.
  What the width decides is how often your *immediate* neighbours are already
  there, which is the motion people actually make: next, next, back one. Within
  two of where you are, W=1 shows 1%, W=2 26%, **W=4 63%**, W=6 76%. At one slot
  the numbers stop being a control and become a readout of where you are, which
  is the `Page 3 / 9` label this replaced. Six costs two more slots for 13
  points, and on a 23-page list is the whole list minus the anchors. Four is
  also the widest that still elides something at the six-page threshold, without
  which the simple and windowed forms would be the same shape.
- All of that arithmetic is `ui/pageGroups.ts`, pure and separately tested,
  because every hard case here is a number rather than a box.

**The box you type a page into** was the original rule here: it existed only in
the document preview, so a nine-page document went to page 9 in one keystroke
while a nine-page table took eight clicks. Neither surface decided that. The
second one simply had nothing to copy from, which is §2.3's lesson about a value
that appears twice, applied to a control.

- **`usePagedRows`** holds the page and slices the rows. It clamps during
  render, so filtering or deleting under the page you are on shows the last real
  page rather than an empty table.
- **Nothing renders at a single page.** A pager whose every control is disabled
  is noise under a short table.
- **The box is local state until it is committed**, on Enter or on blur, because
  typing "1" on the way to "12" must not visit page 1. It re-syncs whenever the
  page changes underneath, or it is a box lying about where you are. An empty or
  out-of-range value returns to the current page rather than moving anybody.
- **Digits only, sanitised on the way in** (`AGENTS.md`, input rules), and not a
  shadcn `Input`: this is a two-character box in a card footer beside two ghost
  buttons, so it carries a fill and no border.
- **The box is filled one shade off whatever it sits on, never transparent.** It
  was transparent until hovered once, which made the one control you can *type*
  into look like the counter printed beside it; a field that takes input should
  say so before it is touched. It is a well one step below the trough it sits
  in: `--hover` in light (gray-200 on gray-100) and `--background` in dark
  (gray-900 on gray-800), because dark's `--hover` is the ramp's floor and two
  steps down. The rule is the step, not the token. It stays borderless: the fill identifies
  it, and a stroke as well would make a form field of it. **Enforced in a
  browser** (`e2e/shell-sheets.spec.ts`, both themes, bounded above as well as
  below), because a computed colour is what jsdom cannot see, and because this
  started at two shades and was brought down: a test asking only "different
  from its surroundings" would pass against the value that was too strong.
- **The container is the tab strip's trough** (11 October 2026):
  `segmentTrough` from `ui/tabs.tsx`, grey and borderless. From 18 September
  it had a stroke and no fill, which left a white pill nothing to read against
  on a white card. The pager now is the tab group it always behaved as, spelled
  in one place, and the spec asserts the trough is filled.
- **The active page is the tabs' white pill** (`tabPillSurface`), white with
  the tab shadow in light and gray-700 in dark, no stroke. It replaced a
  bordered `--page-active` pill, and `--page-active` and `--sidebar-field` were
  deleted with it. What the spec rules out is the active page having neither a
  fill step nor a painted stroke against the trough, which is the invisible
  pill described below.
- **Inactive numbers are `--tab-label`**, the inactive tab colour, and step
  down to `--hover` under the pointer, so a hovered page never looks chosen.
- **An inactive page is bare until hovered.** A resting fill on every number
  would rebuild the per-page box the container replaced, and leave the active
  one nothing to be raised from.
- **The pill is rounded tighter than the container** (`rounded-sm` inside
  `rounded-lg`). Two boxes at one radius read as a single shape with a line
  through it; a tighter inner corner is what says the pill is *in* the box.
- **A measurement, not a preference, and the history is the argument.** The
  trough was `bg-muted` once, borrowed from the tab list, and `--raised` and
  `--muted` are the same ramp step in dark: the active page was invisible but
  for its border, found only in a browser. The tab group escapes this because
  its trough sits on `--card`; the pager's sits in a footer on `--sidebar`, the
  ramp's floor. Measured in both themes in `e2e/shell-sheets.spec.ts` and
  `e2e/component-library.spec.ts`.
- **One way in: `onPageChange`.** `DocumentPager` used to pass `onPrev`/`onNext`
  as well, because the preview scrolls a continuous strip where a table swaps a
  slice. **That distinction was never real** — the box already went through
  `onGoToPage`, and every caller pointed all three props at one `goToPage`, so
  typing a page scrolled and the arrow beside it also scrolled, through two
  props doing one job. Clicking a number scrolls for the same reason, and the
  extra props are gone. `DocumentPager` is `Pagination` with the document's
  vocabulary and no control of its own.

**Enforced** (`design-system.test.ts`): a hand-written `Page {n} / {total}`
counter outside the primitive fails the build.

### 2.11 Sheets and where they open

**Every sheet opens inside the inset card, and no caller says so.** `AdminShell`
publishes the card through `InsetProvider` and `SheetContent` reads it from
context.

A sheet is `fixed`, so left alone it resolves against the viewport whatever DOM
it is portalled into, and covers the whole window: the nav, the header band and
the margin the card floats in all dim to report something happening inside the
card. The scrim belongs to the surface being covered. Containing the sheet swaps
the panel **and its backdrop** to `absolute`, which resolve against the card,
which is `relative` and already carries `overflow-clip`, so the panel is clipped
to its own corners.

**Why context and not a prop.** `Notifications` was handed the ref and worked,
because it is a direct child of the shell. The clause library's drawer is four
levels into a page and could not be handed anything, so it spilled over the
inset: the drawer was contained where the plumbing reached and not where it did
not. A prop chain from the shell down to every page that might open a drawer is
the rule being remembered rather than held.

- **The backdrop is never removed**, only un-darkened. It is what closes the
  sheet on an outside click and what keeps the page behind it inert.
  `ClauseLibrary` passes `overlayClassName` to make it transparent, because its
  drawer opens on a row whose neighbouring rows are the context being consulted.
- **Outside the shell a sheet falls back to the window.** The `PageHeaderSlot`
  degradation: every production route renders inside `AdminShell`, and a
  component on its own in a test must still open.

**How wide: one of three sizes, never a number at the call site.**

| Size | Share of the card | Floor | For |
|---|---|---|---|
| `sm` | 30% | `min-w-sm` | A feed read down one column: notifications, activity |
| `md` | 48% | `min-w-md` | Something worked through beside the list it opened from: a clause, a service's scope |
| `lg` | 90% | `min-w-2xl` | A record consulted rather than edited, wide enough for columns, still a drawer because it is a glance rather than a page |

There were three drawers in the app and three unrelated answers: the feed took
the base `sm:max-w-sm`, the clause drawer overrode it to `sm:max-w-xl`, the
mobile nav set a CSS variable. None of those was a decision about drawers; each
was a number typed once at one call site.

**Percentages, not fixed maxima**, because a contained sheet is positioned
against the inset card and that card's width moves with the sidebar. A fixed
`max-w` reads as one proportion with the nav open and another with it collapsed.

- **The floors are measured, not named after their size.** A floor above the
  percentage at ordinary widths is not a floor, it is the width, and the
  percentage beside it is decoration. `md` was `min-w-2xl` (672px) first, which
  is the obvious pairing and wrong: the card is 1028px at a 1280 viewport, so
  60% was 617px and the floor governed the whole laptop range. **The same trap
  caught the next change**: when `md` came down to 48%, `min-w-lg` (512px) is
  again the obvious pairing and again sits above what the share yields (493px).
  The test is what caught it both times. Re-measure if the shell's margins
  change.
- **A drawer is under half the card, not most of it.** `md` was 60% until 17
  September 2026, at which width the panel and its scrim left the list it
  opened from unreadable, which defeats the point of a drawer that opens on a
  row. If a surface needs more than half the card, it wants `lg` and the
  dimming that goes with it, or it wants a page.
- **`sm` is the exception and its floor does bind on a laptop.** 30% of that
  card is 308px against the 384px the feed had before, and a notification list
  narrower than the one it replaces would be this rule making something worse.
- **Only a side drawer takes a width.** A top or bottom sheet spans the card and
  is sized by its content.

**Flush or floating, and the scrim is what decides.** A drawer defaults to
flush: full height, hard against the card's edge, square where it meets it. It
reads as a *region* of the card, and what tells you the page has receded is the
scrim over the page. `float` insets it from all four edges instead, with
`rounded-sm` (one step under the card's own `rounded-md`, per §1.3) and a ring,
so it reads as an *object* resting on the page.

**The two travel together.** A floating panel needs its own edge, because
nothing behind it is reporting that it is on top. That is why the clause drawer
carries a ring as well as its shadow: flush, in dark mode, its surface and the
inset behind it are close enough in lightness that the shadow alone does not
read and there is no boundary anywhere.

**How much the scrim darkens follows how much of the card the panel covers**,
because they answer the same question: how much of what is behind is still
being read. The clause drawer is `bg-black/10` as a drawer, with the table
beside it still in use, and `bg-black/40` expanded, where the panel covers nine
tenths of the card and the list is not usable anyway. Both are well under the
app's default `bg-black/80`, which is right for a notification feed (chrome
over the app, so the app recedes) and wrong for a panel opened from a row whose
neighbours are the context.

**Never blurred.** Blur destroys text where dimming only mutes it, and on this
drawer being able to *read* the neighbouring clause numbers is the requirement
the weight exists to protect.

**The backdrop element is never removed**, whatever its weight. It is what
catches the click outside and keeps the page inert, so a click on a neighbouring
row closes the drawer rather than opening that row underneath it. Un-painting it
entirely was tried on the clause drawer and reverted the same day: with nothing
at all behind it, the panel read as floating in the page rather than over it.

**A floating drawer at `lg` centres itself.** Tucked to the right at `md`,
centred when expanded, because a panel that detaches from the edge on one side
only is a wide drawer rather than the window that expanding is for. The height
comes off the edges with it: inset on two sides and flush on the other two is a
shape nobody chose.

**Enforced** (`design-system.test.ts`): a `<SheetContent container=…>` outside
the primitive fails the build, and so does one whose `className` names a width.
The floating geometry is `sheet.test.tsx` for the classes and
`e2e/clause-library.spec.ts` for the four gaps and the centring, which were
each confirmed red against a panel with `float` removed.

---

### 2.12 Multi-step flows

**Every multi-step flow is built on `FlowShell`** (`src/components/patterns/flow/`).
There were two coming (client onboarding, the contract builder), and a second
hand-built step row is a second set of answers about what a locked step looks
like, whether the current one is announced, and where the submit sits. None of
that is visible as a bug in either flow alone; it shows up as the two drifting.

**Three bands, and which band a thing is in is the whole layout rule: what
belongs to the wizard is pinned, what belongs to the step moves.** The step row
and the button are the same on every step and the button is pressed once per
step in a row, so neither travels with the fields sliding in and out between
them. Only the middle band scrolls.

- **The step is in the URL.** These are tasks people get pulled away from, and a
  wizard whose back button leaves the flow entirely is a wizard people lose work
  in.
- **One form per step, each saving its own section.** That is what makes an
  interrupted flow survivable without a draft column or a "resume" concept:
  whatever was saved is simply on the record already.
- **The submit is portalled into the footer**, so it sits in the pinned band
  while keeping the step's own `submitting` and label. Lifting it into the shell
  would mean a second copy of that state kept in step with the first.
- **Completeness is derived, never stored** (`PRINCIPLES.md` rule 3). A column
  recording which step somebody stopped on disagrees with the record the first
  time a step is revisited and left empty.
- **A step that needs a saved record is disabled until there is one**, which is
  the honest state rather than a link that fails on arrival.
- **`fill` drops the centred column** for a phase that is its own layout: a
  preview beside a rail, a ledger of cards.
- **`nav="tabs"` draws the steps as the shared tab strip** instead of the
  spread track, left-aligned to the form panel's edge, with the step anchored
  directly under it. Client onboarding uses it (17 October 2026); the
  contract flow keeps the track.

**Enforced** (`design-system.test.ts`): `aria-current="step"` outside
`components/patterns/flow/` fails the build. It is the attribute that marks which step of
a sequence you are on, so a file carrying one has built its own row.

### 2.13 The design page

**`/design` is where a component is decided**, and it is the catalogue this
document describes: every token, atom, pattern, template and state, live and
drivable, with the decisions behind them. Profile-neutral, like settings; both
rails link to it. A change to a primitive is made, looked at and tried here
first.

**There is no second step where it ships.** The page imports the real
primitive from `ui/` or `patterns/`, so this page and every caller are one
import of one file. The tokens are read back from the stylesheet at runtime,
so the page cannot show a value the app lacks.

Eight sections, in the rail's order: overview (the five properties, the
ladder, how to add something), foundations (colour, type, spacing, radius,
elevation, motion, icons), atoms, patterns, shell, states, writing, decisions.
`?section=` and `?item=` carry what is showing, validated against the
catalogue; an unknown item falls back to its section, an unknown section to
the overview. `replace`, not `push`.

- **Every variant is named and explained**, and the specimens are wired to
  real state: the pager pages, the drawer opens, the dialog asks.
- **A specimen is drawn on the band the component actually lives on**, never a
  neutral backdrop chosen to flatter it.
  `Specimen` (`design/Specimen.tsx`) is that frame: a tinted card for the
  name, a stage inset on the real fill for the component, `fill` for a row of
  examples, `stage="sidebar"` for a pager, `empty` for an absence. It is on
  the page as its own entry, so the frame is decided where everything else is.
- **A decision is a record, not a paragraph.** `DECISIONS` in `catalogue.ts`
  holds each one with what was rejected and the test that holds it; the
  decisions section renders them newest first. §6 below is the same history
  as prose.
- **Experiments do not live in the product.** The three that did (a segmented
  tab, an item drawer, a clause drawer) and the archived rich table were
  deleted with `/admin/kit` and `/client/library` on 16 October 2026.

**Enforced** (`design/__tests__/catalogue.test.ts`): every entry sits in a
listed section and every section has an entry; every `source` exists; every
`rule` names a heading in this document; every atom and pattern file is
imported by the page or sits on `KNOWN_GAPS`, which only shrinks; every
decision names an `it(…)` that exists in the enforcement tests.
**`e2e/design.spec.ts`** owns the half only a browser can see: that a
specimen's surfaces match the real table footer's, byte for byte, in both
themes.

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
| Every duration is on the three-tier scale; one easing; no inline transition (§1.6) | `src/__tests__/design-system.test.ts` |
| Every text size is a type token; no `leading`/`tracking`; two weights (§1.4) | `src/__tests__/design-system.test.ts` |
| Every gap and inset is on the spacing scale; no margin (§1.2) | `src/__tests__/design-system.test.ts` |
| Every corner is on the radius scale; `xl` is the dialogs' (§1.3) | `src/__tests__/design-system.test.ts` |
| Every shadow is one of three elevation tokens (§1.7) | `src/__tests__/design-system.test.ts` |
| The focus ring is `focus-ring`, never drawn by hand (§1.8) | `src/__tests__/design-system.test.ts` |
| Every z-index is a named layer; breakpoints stay in the shell | `src/__tests__/design-system.test.ts` |
| No `[var(--gray-N)]`, `[oklch()]` or `rgba()` escape past the tokens (§1.1) | `src/__tests__/design-tokens.test.ts` |
| Every token the system is built on exists in `globals.css` | `src/__tests__/design-tokens.test.ts` |
| Every text pair clears 4.5:1 in both themes and in the editor rail (§1.1) | `src/__tests__/contrast.test.ts` |
| Every table is in a `TableCard` (§2.3) | `src/__tests__/design-system.test.ts` |
| Every pager is `Pagination` (§2.10) | `src/__tests__/design-system.test.ts` |
| A sorting table has a `SortToggle` (§2.3) | `src/__tests__/design-system.test.ts` |
| The pager's box is one step off the band it sits on, the footer `pr-2` (§2.3, §2.10) | `src/components/ui/__tests__/table.test.tsx`, `e2e/shell-sheets.spec.ts` |
| No sheet names its own container (§2.11) | `src/__tests__/design-system.test.ts` |
| No sheet names its own width; it takes a size (§2.11) | `src/__tests__/design-system.test.ts` |
| Each size resolves to its share of the card (§2.11) | `src/components/ui/__tests__/sheet.test.tsx`, `e2e/shell-sheets.spec.ts` |
| Every multi-step flow is built on `FlowShell` (§2.12) | `src/__tests__/design-system.test.ts` |
| Every catalogued component points at a real file and a real section; every atom and pattern is on the page; every decision names a real test (§2.13) | `src/components/design/__tests__/catalogue.test.ts` |
| The page imports each primitive, never copies it (§2.13) | `src/components/design/__tests__/catalogue.test.ts` |
| A specimen's surfaces match the real footer's, both themes (§2.13) | `e2e/design.spec.ts` |
| No phone printed in its stored form (§2.3) | `src/__tests__/design-system.test.ts` |
| Optional is marked by `OptionalMark`, never by hand (§3) | `src/__tests__/design-system.test.ts` |
| Labels are sentence case, never `uppercase` (§1.4) | `src/__tests__/design-system.test.ts` |
| Popup gap and width come from `ui/popup.ts` (§1.7a) | `src/__tests__/design-system.test.ts` |
| Security headers exist and are correct | `src/__tests__/security-headers.test.ts` |
| Autofill defaults off | `src/components/ui/__tests__/autofill.test.tsx` |

Both design walkers share `src/__tests__/policedSource.ts`, so their exemption
lists cannot drift apart, and each one asserts it matched some files: a rule
that matches nothing is a test that passes forever.

**Rules land with a shrinking allowlist, never a regex exemption.** When a new
rule has existing violations, the files that break it are listed in
`src/__tests__/migratedLater.ts` on the day the rule is written, and nothing
else changes in that commit. A file added to a list fails the build; a file
that stops violating must leave the list in the same commit (a test checks
every entry still earns its place); an empty list is deleted and the rule
stands bare. Every list from 16 October 2026 empties in the screen migration.

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

- **17 October 2026, the quiet style reaches forms and a second page.** The
  service dialog, the item panel and the leads pages take it: labels muted
  once at the form (`**:data-[slot=field-label]:text-muted-foreground`) so a
  shared field cannot come out darker; white surfaces for a dialog and a
  panel; quiet Cancel, ink primary, buttons at the foot. Prices are typed into
  `RupeeInput` (₹ inside the field, a unit in the label where one matters).
  `Select` now shows an option's label rather than its stored value, fixed in
  the atom for all eight callers. `quiet.ts` still lives under
  `admin/services/` and should move to `patterns/` now that other pages use it.

- **16 October 2026, the quiet style, on the service catalogue first.** A
  trial approved on a preview page replaced the services board
  (`admin/services/ServiceCatalogue`). What it introduces, on that page only
  until another page takes it: a centred 980px column; hairlines at half
  strength (`border-border/50`); controls that strengthen ink and hairline on
  hover instead of filling (`hover:border-muted-foreground`); an ink primary
  (`bg-foreground`) instead of the blue one; colour only on the code chip, from
  the Schedule's own accent; prices in muted ink, "Quoted" one shade quieter.
  The card is the link to its Service's page and the corner square is its
  menu. Two views of one list, cards by section and a board by column. The
  documents board still carries the old look and should follow it.

- **16 October 2026, `/design`.** The component library grew into the design
  system's own page: eight sections, the tokens read from the stylesheet, a
  specimen for every foundation, the atoms and patterns, the states, the
  writing rules, and the decisions as records. `/admin/kit`, `/client/library`,
  the three experiments and the archived rich table were deleted.

- **16 October 2026, the states, the row, and the last raw buttons.**
  `EmptyState` with four presets replaces the two copied "no matches"
  blocks; `not-found.tsx` inside the shell; `FormSkeleton` and a
  `loading.tsx` for the two client form routes. Table rows are 40px, which
  is the body line plus a control gap each side, and the footer band
  matches. A rule bans `<button>` outside `ui/` and `patterns/`, with the
  32 screens that still write one on a shrinking list.

- **16 October 2026, the folders follow the ladder.** `shell/` (25 files
  out of `admin/`: the frame, nav, rail, palettes, and the record panel that
  renders into the rail) and `patterns/` (the page frame, the record table
  and its toolbar and cells, the flow shell, the field info and check). Pure
  moves; the layering rule above is the new test and was seen red.

- **16 October 2026, the atoms and the molecules.** Button: five fills
  (`primary`, `secondary` as the default, `ghost`, `destructive`, `link`),
  three heights (28/32/36), `icon` as a shape; `raised`, `neutral`, the grey
  `secondary` fill and the 24px size deleted. Inputs: 32 and 36, equal to
  Button's `md` and `lg`. One `focus-ring`. `Badge` carries status and
  retires `status-badge`. `Empty` gains four presets. New `patterns/`
  folder for the molecules: `ConfirmDialog` (nine hand-written dialogs
  moved onto it, wording fixed), `ConfirmAction` with `RemoveButton`,
  `IconAction` with `CopyAction`, `AddButton`/`AddLink`, `Mono`,
  `DrawerToolbar`. Eight rules added, each red on a probe.

- **16 October 2026, decorative motion removed.** The `motion` package and
  its four callers, `MagicMove` and the five surfaces that used it, the
  sliding tab pill and the two Motion pills, the tray and cycle arrow icons
  (static Lucide `Download` / `Upload` / `ArrowRight` now), every hover
  transform on an icon, the reset spin, the chevron rotation transition, the
  `fill-flash` ring, every mount animation (the flow step slide, the finish
  ticks, the tax step's reveals, the field tick's zoom) and the `zoom-in-95`
  on every popup. What stays is in §1.6. The three e2e blocks that sampled
  the glide per frame went with it. `ConfirmButton` (the confirm-swap) was
  deleted; its one caller is a plain button, because the browser's download
  bar already says the file arrived.

- **16 October 2026, foundations as tokens and tests.** The type scale
  (`text-caption` … `text-display`, with line-height, weight and tracking in
  the token), fixed-pixel radii (4/6/8/12), three elevation tokens, five named
  z-index layers, a `success` token, and the one `focus-ring` utility. Motion
  tightened to three tiers with no exemptions. Stroke width settled at 1.75.
  `@theme` reads next/font's variables rather than naming Geist by string, so
  the metrics-matched fallback is finally used. Ten new enforcement rules,
  each with a shrinking allowlist in `migratedLater.ts`; the screen migration
  that empties them is a later phase. The design-system plan this is the first
  phase of is at `/design` once Phase 6 lands.

Append a line when a rule here changes. Keep it to one line and name the
`ui-elevation.md` id where there is one.

- **11 October 2026**: The pager takes the tab strip's look (§2.10): the
  trough, the white pill and `--tab-label` for inactive numbers. Its bordered
  container and `--page-active` / `--sidebar-field` tokens are gone. Inactive
  tab labels move to the new, lighter `--tab-label` (§2.7).
- **4 October 2026**: §2.10 catches up with the pager that ships. The
  container lost its fill on 18 September (it existed in light only), and the
  rules still measured the box and the active page against it. Both are now
  measured against the `--sidebar` band they sit on: the box is
  `--sidebar-field`, one step off it in either direction, and the active page
  is told apart by its border where, in light, it shares the box's fill. The
  component library's Pagination specimen is staged on `--sidebar`, so what is
  signed off there is the band it ships on.
- **21 September 2026**: The documents list takes the wide-table arrangement
  the clients list settled on (frozen row number and Title, dividers,
  resizable columns, one row menu in place of the hover-revealed icons), with
  a row-number column first and the number column retitled "Title", where a
  draft is the gray `StatusBadge` rather than the word. Every document type
  names a hue in `DOC_TYPES.accent`, drawn as one solid 12px swatch of it
  before the type (`accentSwatch`): the full-strength token as the fill, the
  `ring-foreground` hairline inset as its edge, and `RaisedChip`'s one-pixel
  drop, not a chip holding a tinted box holding a square.
  `StatusBadge` is `rounded-sm`: §1.3 always said a badge was, and the
  primitive's pill had been the one exception.
- **21 September 2026**: The documents list gains a Services column, one
  `accentBadge` per Schedule a contract's Parts run under, up to all four;
  `Schedule.accent` names the hue (Setup cyan, Build violet, Retainer green,
  Audit orange). A contract's Total is the fee its Parts state, read back from
  the fee blank (`contract/listing.ts`), with a retainer's marked "/mo" and
  kept apart from a one-off fee. `DocumentTotal` is the one component that
  draws a document's figure, in the table and on a card, and it fixed a
  quotation printing ₹0.00 in the list while storing its real total. The
  figure is `AmountCell`'s, left-aligned behind its currency chip under a
  `Banknote` heading, which the library's template table had already settled
  and §2.3's Money row now records; the documents list also takes
  `reorderable` from it. The Services column reads every type, not only a
  contract: a line seeded from the catalogue now carries the Service's code
  (`LineItem.serviceCode`, beside its SAC), and `documentSchedules` turns the
  codes on an invoice, receipt, credit note or quotation into Schedules
  through the catalogue the page passes down.
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
- **31 August 2026.** **§2.6.** **The collapsed nav rail detaches into a
  floating pill**, and hovering it grows it back to full width without
  re-docking. `collapsible="float"` in `ui/sidebar.tsx`, a new variant so
  `collapsible="icon"` keeps its exact behaviour for the editor rail, which
  shares the same provider.

  Three things about it are decisions rather than defaults.

  **A float reports itself as `data-collapsible="icon"`.** Roughly a dozen
  rules — the label hiding, the tooltips, the `size-8` buttons — already key
  off that attribute, so the variant is a *position* layered on the collapse
  rather than a second copy of those selectors. The detachment rides on
  `data-float` instead. **Peeking then clears `data-collapsible` and nothing
  else**, which restores every label, width and tooltip in one move while the
  box stays where it is.

  **The strip's width stays reserved.** The content card keeps a left margin of
  the icon width plus its gutter, so nothing is ever behind the floating rail —
  which would defeat the point of floating it. It reclaims the other ~172px.
  Growing on hover overlays the card and reflows nothing, and that is asserted:
  `e2e/sidebar-float.spec.ts` measures the card's box before and after.

  **The toggle is inside the rail, so collapsing with the mouse leaves the
  pointer on the pill it just made** — which peeked it straight back open and
  meant the collapse never visibly happened. A toggle now arms a suppression
  that only the pointer *leaving* lifts. Not a timer: a timer picks a number
  out of the air and still re-opens under a stationary mouse. Focus is exempt,
  because a keyboard user has no pointer to move away.

  **The pill is as tall as the profile on screen.** Both profiles' navs are
  rendered side by side in the swipe track, and flex siblings stretch to the
  taller of the two, so the admin rail's four rows sat in a box sized for the
  client rail's six. The off-screen copy is `h-0 overflow-hidden p-0` and the
  track is `items-start`; all three are needed, and `h-0` alone leaves 16px of
  padding behind, since padding sits outside `height`.

  Not `position: absolute`, which was tried and emptied the pill: taking one
  child out of flow stops the other being the second column, while the track's
  `translateX(-50%)` still assumes it is. A zero-height item is still in flow.

  jsdom cannot see any of the geometry, and it could not even reproduce the
  suppression bug (`userEvent.click` fires no `pointerenter` on the container),
  so that test was deleted rather than left passing vacuously. The three
  measurements live in `e2e/sidebar-float.spec.ts`, each confirmed red first —
  including the travel test, whose first version passed with the transition
  deleted because it sampled too late. It samples one frame in now.

- **1 September 2026.** **§2.8, new.** A board view on the documents list, cut
  by status, type or issue month. Its card is the card view's, exported for it.
  The two rules worth having written down are that nothing drags between
  columns (a drop into "Finalized" would finalize a document) and that the board
  shows every filtered row with no pager. Same pass: the view toggle's geometry
  now reads off `VIEW_TABS`, so a fourth view is a row in that table and not
  three hand-counted numbers.

  **Rewritten the same day, and the reason is the section's point.** The first
  version was drawn from scratch — bare columns, a hairline under each heading,
  cards on the page ground — while `services/ServiceCards` had been a tuned
  board for weeks. Nobody had written the board down, so the second one decided
  everything again and landed somewhere else, which is the §4 failure one level
  up from a component: **a surface that exists twice needs its rules in here, not
  just its code in the repo.** §2.8 now describes the shared board and names both
  callers, and the documents board is that chrome with one departure (a variable
  column count) and the reason for it.

  **And a third pass, which is where the copy actually finished.** Matching the
  chrome was not matching the board: the columns were still full-width and
  page-height, so the same card was drawn at 700px here and 340px on the
  catalogue. Four things landed together, and three are now rules in §2.8 rather
  than facts about one component. A column is a **quarter of the page in both
  boards**, written out as `max(15rem,calc((100%_-_3rem)/4))` where the count
  varies, and the row scrolls past the fourth. The board runs **full height**,
  which took `h-full min-h-0` on the two pages that host the documents list, the
  same thing the catalogue's page has always passed. And an **empty column is
  still a column** (both statuses, every type the profile can hold, every month
  in the span), which is the inverse of the filter rule and needed saying,
  because the old behaviour was deliberate and tested.

  The fourth is `--hover`, a new token, added because the card's
  `hover:bg-muted/40` composited to within a hair of the `bg-muted` column it
  now sits in: hovering a card made it *vanish into the well*. §1 carries the
  value and why the symmetrical dark answer fails its contrast check.

  **A fourth pass ordered the columns by how full they are**, with the newest
  document made in each breaking a tie. That demotes the three per-axis orders
  to the base a tie falls back on, which is a smaller change than it sounds for
  status and type and a real one for month: a quiet January now files behind a
  busy December rather than between its neighbours. Noted in §2.8 as a rule for
  both boards.

- **1 September 2026.** The account card comes back into the floating rail. It
  was hidden for the whole float on the grounds that a pill carries
  destinations and the card is not one, which was the right observation and the
  wrong fix: with it gone the pill had no route to settings, the theme or
  sign-out without docking first. What the card needed was air, not absence.
  `SidebarContent`'s `pb-2` plus the footer's `group-data-float:pt-4` put 24px
  between the last icon and the avatar, which is exactly what the header leaves
  above the first one, and its `p-2` keeps the pill's bottom margin equal to
  the 8px either side of the icon column. The wordmark still goes: that one
  really is a masthead. Both halves and the gap are measured in
  `e2e/sidebar-float.spec.ts`, the gap confirmed red first.

- **1 September 2026.** The floating pill's height is a measured length now,
  not `fit-content`, and that single change fixes two pieces of motion that
  looked unrelated. Expanding the rail left everything inside it pinned at the
  collapsed height for the whole 200ms and then dropped it ~310px in the
  closing frame, which read as the account card arriving late and glitching
  into place; and switching profile in the pill resized the box in one frame,
  mid-swipe, because the two navs have different row counts. One cause:
  **`height: fit-content` does not animate.** Its computed value never changes
  when its content changes, only its used value, and transitions fire on
  computed values. `interpolate-size` does not reach it, nor does
  `transition-behavior: allow-discrete`, nor a grid track; animating the two
  nav copies instead is worse, because they are flex siblings, so the box is
  `max(a, b)` and mid-flight both are partial, dipping the pill under both
  endpoints whatever the easing. So `AdminSidebar` measures the live nav plus
  the chrome around it and publishes `--rail-height`, which the float's
  `height` reads with `fit-content` as the fallback. Both are measured in
  `e2e/sidebar-float.spec.ts` by sampling mid-transition, which is the only
  way to see either: the endpoints were always right. Both confirmed red on
  the one-line revert.
- **12 September 2026. H1.** The collapsed nav rail is a full-height floating
  column, not a pill shrunk to its rows: it runs the window less an 8px gutter
  at each end, so collapsing changes the width and nothing else. That retires
  the entry above it rather than contradicting it. The measured `--rail-height`,
  the `ResizeObserver` behind it and the `max-height` that kept a content-sized
  box inside the viewport are all gone, along with the `flex-initial`, `pb-2`
  and `pt-4` that held the account card off the rows in a box with nothing
  stretching between them. `SidebarContent` stretches in both states now, so
  the card rests on the foot of the box either way. The finding under the old
  entry still stands and is kept in §1.6 for the next thing sized to its
  content: **`height: fit-content` does not animate.** Four tests in
  `e2e/sidebar-float.spec.ts` were rewritten around the new shape and confirmed
  red on the one-line revert to `h-fit`.
- **15 September 2026** — **§1.9 added.** The arrow, hand, open hand, fist and
  col-resize cursors are drawn in gray rather than the platform's black on
  white, one variable per theme in `globals.css` and the four Tailwind
  utilities redefined to resolve to them. The section records the arrow and
  hand built earlier this month, which had no row until now.
- **16 September 2026** — **A row may open a drawer, and a drawer need not
  dim.** The clause library became a table whose whole row opens a `Sheet` on
  the right. Two rules fall out. A row's open target is one absolutely
  positioned button, and the **row** carries `relative`: resolving against the
  cell covers the number alone, and resolving against the table card lays one
  tall target over every row, which opened clause 6 from row 4. And
  `SheetContent` takes `overlayClassName`, so a caller may make the backdrop
  transparent while keeping it (it is what closes the sheet on an outside click
  and keeps the page inert). A drawer dims what it is *about*: `Notifications`
  is about the app, so the app recedes, while a clause is one row of the list
  still being read, whose neighbours it cites by number. Both are geometry, so
  both are pinned in `e2e/clause-library.spec.ts` against
  `/preview/clause-library` and were each confirmed red on a one-line revert.
- **16 September 2026** — **§2.3 rewritten around `RecordTable`, and the table
  rules became defaults rather than prose.** Every rule that section stated was
  already written down when the clause library shipped with no paging over 28
  rows, no caption and no sortable headings, by an author who had read the
  file. So the behaviours moved into `components/admin/RecordTable.tsx`, all
  five lists were migrated onto it (documents, clients, employees, clauses),
  and `design-system.test.ts` now fails a `TableBody` outside `ui/table.tsx`,
  `RecordTable` and `Page.tsx`'s skeleton. Paging at ten, the count and pager,
  the caption, sortable headings, the reserved actions column and the empty
  state are on unless a named prop turns them off. Two geometry rules went with
  it into `e2e/record-table.spec.ts`, which asserts *which* record a click
  reaches rather than that one does, and was confirmed red on removing the
  single word `relative`.
- **16 September 2026** — **The row-select checkbox column became
  unconditional.** Every `RecordTable` draws it, on instruction, on the grounds
  that removing a column from one table is smaller and rarer work than
  remembering to add it to each new one. The *bar* stays conditional and
  renders nothing where neither `onBulkDelete` nor a `bulkActions` entry is
  passed, so a tick never implies an action that does not exist. `BulkBar`
  gained non-destructive actions for it, and the clause library gained bulk
  archive beside bulk delete, drawn differently because one is reversible and
  the other retires clause numbers for good. `e2e/record-table.spec.ts` gained
  a hit test proving the checkbox cell paints above the row's stretched link,
  confirmed red on removing its `z-10`.
- **16 September 2026** — **The table header sits on `bg-sidebar`.** Tried on
  the documents table first and kept: the header band of a table now matches
  the page's header band and the margin its card floats in, so the card reads
  as data held inside the chrome. It went into `ui/table.tsx` rather than a
  call site, so every table has it and none can miss it, and it is pinned in
  `ui/__tests__/table.test.tsx`, confirmed red on reverting the fill. The
  contrast pair `foreground` on `sidebar` was added to `contrast.test.ts` and
  clears 4.5:1 in both themes.
- **16 September 2026** — **The card footer took the same fill**, reversing the
  line written an hour earlier in this log. Both bands of furniture are now
  `bg-sidebar` and the rows sit between them. The argument for leaving it plain
  (that a sunk pager is harder to find) did not survive looking at it. Pinned
  alongside the header and confirmed red on revert; `muted-foreground` on
  `sidebar` added to `contrast.test.ts`.
- **16 September 2026** — **There is one pager, and it has the number box.**
  `ui/pagination.tsx` gained the go-to-page control the document preview had
  been the only surface to carry, and `DocumentPager` became a thin wrapper
  over it rather than a second copy. Two implementations of one control is how
  it came to be true that a nine-page document went to page 9 in a keystroke
  and a nine-page table took eight clicks. The preview keeps its own arrows,
  through `onPrev`/`onNext`, because it scrolls a strip rather than swapping a
  slice. All thirteen of `DocumentPager`'s existing behaviours pass unchanged
  against the shared component, which is what says the move lost nothing. New
  rule in `design-system.test.ts`, confirmed red on a hand-written counter in a
  policed file. §2.10.
- **16 September 2026** — **Every sheet opens inside the inset card, from
  context.** `AdminShell` publishes the card through `InsetProvider` and
  `SheetContent` reads it, so the `container`/`contained` pair that
  `Notifications` was handed as props is gone from all three files that passed
  it down. The clause library's drawer spilled over the inset for the reason a
  prop chain always eventually fails: it was four levels into a page and could
  not be handed anything. The drawer was fixed by deleting plumbing rather than
  by extending it. New rule banning a hand-named `container`, confirmed red.
  §2.11.
- **16 September 2026** — **Magic move.** The house name for one highlight that
  slides between rows rather than each row painting its own; adopted as the
  term for the tab pill and the profile switcher's fill too, which were the
  same idea by other names. Also extended to the nav rail in `hover` mode, with
  the active fill left untouched. Four new tests in `e2e/header.spec.ts`, each
  confirmed red: the transition removed, the fill painted in the active colour,
  and the rows' own hover restored. Two more followed once it was in use: the
  rail's 8px inter-row gap went, because the fill was crossing dead space on
  every move and the gaps broke the column into seven plates, and the chevron and ⌘D keycap gained a
  500ms delay so running the pointer down the column stops flashing a hint
  on every row. Then the gap went entirely rather than moving inside the
  rows and came back as the same 8px expressed as padding inside them, and the
  hover text darkening was removed so the fill is the only thing a hover
  changes. Two shapes were tried and reverted on the way: 36px rows, and 4px
  of spacing. The rail ends up looking as it always did, with the hole gone.
  All confirmed red, including that the original `gap-[8px]` fails the
  contiguity half while being pixel-identical. One unrelated fix fell out
  of it, in two parts. `e2e/popup.spec.ts`'s frame recorder counted a fixed 30
  frames from when it was installed, so under five competing workers the move
  could begin after they were spent; it records until the value settles now.
  That was not the whole of it: the real failure was `goto` resolving before
  hydration, so a click reached a trigger with no handler and the popup never
  opened. The block waits for a control to be interactive first. Measured at
  roughly one full-suite run in three before, and twelve of thirteen green
  after. Note for anyone editing those: a synthetic `pointerover` moves the
  rail's highlight but *not* a select's or combobox's, which track the pointer
  internally, so those must be driven by a real hover.
- **16 September 2026** — **The menu highlight moves.** One fill per popup,
  translated between rows instead of painted on each: `useMagicMove` /
  `MagicMove` in `ui/magic-move.tsx`, wired into the dropdown menu, the select
  and the combobox, on the Panel tier. §1.7a carries the four rules and the
  three endpoint-invisible causes; `e2e/popup.spec.ts` counts the frames in
  between, confirmed red on removing the transition and again on swapping the
  callback ref for a plain one.
- **16 September 2026** — **Two table rules, both on the footer.** Its right
  padding is 8px against the left's 36px, because the pager's ghost buttons
  carry their own padding and 36px on top of it pushed the last arrow off the
  card's corner: padding to a control is not padding to a letterform. And the
  go-to-page box is filled `bg-raised`, two steps off the band, where it had
  been transparent until hovered and so read as the counter beside it rather
  than as something you can type into. The fill is a role and not a step
  because the ramp runs opposite ways per theme, which is what §1.1 exists to
  let us say. Both measured in the browser in both themes and confirmed red on
  reverting each independently.
- **16 September 2026** — **The pager's box came down to one shade.** Two was
  too strong on the footer. `--sidebar-field` is a new token rather than a
  reused role, because "one step off `--sidebar`" is not a value any existing
  role holds in both themes: `--muted` is one step in light and three in dark.
  gray-100 in light, gray-900 in dark, stepping up rather than down because
  gray-950 is the ramp's floor. The browser check gained an upper bound with
  it, since the rule it now guards is a value that was already once too dark.
- **16 September 2026** — **Sorting became opt-in, and the clause library lost
  it.** The clause library showed sort arrows on hover with no eye anywhere on
  the page to hide them, and so did the employees list: `RecordTable` sorted by
  default while `SortToggle` lives in a `FilterBar` neither of them has. A
  control and the thing that governs it are one unit, so the half `RecordTable`
  can carry is now the half that waits to be asked for. Documents and clients
  are unaffected, since passing an order implies the opt-in and both already
  render the eye. Enforced per feature folder, and the first version of that
  rule was **wrong in a way worth recording**: it let a table fall back to its
  parent folder's toggle, so removing the clients eye left it green. Folder-only
  now, and confirmed red on both real tables.
- **17 September 2026.** **A body row grows with its text, and drags by a
  grip.** The clause body editor's rows were `rows={2}` plus `resize-y`: a
  two-line floor on every row whatever it held, and a drag corner in each
  corner. Both are answers to a question `field-sizing-content` had already
  answered on the primitive, so the fix was deleting two overrides rather than
  adding anything. Rows start at the 36px rung and grow (§2.2), and the rule is
  now enforced, with the nine files that already broke it grandfathered rather
  than swept: that judgement wants making per form, with the form on screen.

  **The rule's first version was wrong in a way worth recording.**
  `<Textarea[^>]*rows=` cannot cross a `>`, so it stopped at the first arrow
  function in the props and read as passing on the very file it was written
  for, catching only the tags whose attributes came in a lucky order. It is
  matched per tag then per attribute now. A rule confirmed red against *some*
  violation is not confirmed: it has to be the one in front of you.

  Same pass: the two move chevrons became one `GripVertical` that drags with a
  pointer **and** moves on the arrow keys, because a handle alone is unreachable
  by keyboard and this is the form for editing the words of an agreement. The
  drawer's title became the clause's heading (the number says nothing about
  which clause is open and now sits in the pager), the standing line under it
  went, and a **clause pager** took the centre of the control row: previous,
  the number, next, walking by position rather than by number because a number
  is never reissued and arithmetic would page into a gap. Paging flushes the
  autosave first, like archive and delete do.

  **A panel's state belongs to the panel, not to what is inside it.** The pager
  shipped with a bug that is worth keeping written down: `expanded` sat in the
  drawer, and the drawer is keyed by clause number so that a new clause arrives
  with its own draft and its own parsed body. Paging therefore remounted it, and
  expanding then paging dropped the reader out of the full panel and back into a
  side drawer, mid-read. The key is correct and stays; the state moved up to the
  list, which owns which clause is open and now also owns how the panel is
  shown. The general form: **a remount key is a statement about identity, so any
  state that should outlive a change of identity has to live above it.** Cleared
  on close, or state lifted up outlives the thing it described.

  Then the title took `text-base` and the header lost its rule. "About 4px
  bigger" is 18px by arithmetic and there is no 18px: §1.4 is four sizes and
  says a fifth is a mistake rather than a nuance, so it lands on 16, the
  card/section heading rung, which is what a panel title is. **A size request
  resolves to the nearest rung, not to the number**; where the gap is too wide
  for that to satisfy the request, the scale is what wants revisiting, in its
  own change.
- **17 September 2026.** **A drawer can float, and the clause drawer does**
  (§2.11). `SheetContent` gained `float`: inset from all four of the card's
  edges, `rounded-sm`, ringed, and centred at `lg` rather than merely wider.
  Flush stays the default, because a feed dropping from the edge belongs
  against it.

  **The scrim and the float are one decision, not two.** The clause drawer's
  backdrop went 80% to 25% to transparent to a weight that follows the panel's
  size, all in one day, each step for the same reason: a clause is read against
  its neighbours, which cite it by number. What the passes kept discovering is
  that an undimmed page leaves a flush panel with no edge at all, worst in dark
  mode where the sheet's surface and the inset behind it are close in lightness
  and the shadow does not read. Floating answers that, so the panel carries its
  own boundary; fully transparent then proved a step too far, because a panel
  over an entirely untouched page reads as being *in* it. It settled at 10% as
  a drawer and 40% expanded (§2.11). **The backdrop element is never deleted**,
  whatever its weight: it catches the outside click and keeps the page inert.

  Confirmed red with `float` removed: the panel measured flush on three edges
  and 128px off centre when expanded. Also this pass: the control row lost its
  bottom border, expand took Lucide's `Maximize`, and each control's tooltip
  became one word while its `aria-label` kept its object, the two being read in
  different contexts (§1.5). **`ConfirmActionButton` gained `tooltip`** for the
  one control in that row that had none, which was also the only irreversible
  one.
- **17 September 2026** — **A sheet takes one of three sizes.** There were three
  drawers and three unrelated answers to how wide a drawer is: the notifications
  feed took the base `sm:max-w-sm`, the clause drawer overrode it to
  `sm:max-w-xl`, the mobile nav set a CSS variable. `size` is 30/60/90% of the
  inset card, percentages rather than maxima because a contained sheet resolves
  against a card whose width moves with the sidebar. A hand-typed width now
  fails the build. **The floors were the part that had to be measured**: `md`
  was set to `min-w-2xl` from the size's name, and since the card is 1028px at a
  1280 viewport, that 672px floor sat above 60% and silently governed the whole
  laptop range. Each floor is now under what its share yields on the narrowest
  real screen, except `sm`, which deliberately holds 384px so the feed never
  gets narrower than the fixed width it replaced.
- **17 September 2026** — **`devIndicators: false`.** Next's dev-tools portal
  pins itself to the viewport corner the header's last control sits in: at
  1280px the notifications bell is at x=1240 and `elementFromPoint` on its
  centre answered `NEXTJS-PORTAL`, so three sheet specs timed out on a button
  they could see, that was enabled and stable, and that nothing would let them
  click. Dev-only, so nothing a user meets changes; in the config rather than
  worked around in Playwright, because the collision is with the page.
- **17 September 2026** — **`components/flow/` extracted from onboarding**, with
  no behaviour change: the three-band layout, the step row, the submit portal,
  the finish moment and the four form helpers. Onboarding was the only wizard in
  the app, so all of it lived inside `ClientOnboarding`; the contract builder
  needed the same frame, and copying it would have been two sets of answers
  about locking, announcing and where the button sits. 555 lines left that file
  against 93 added, and **its twelve test files were not touched**, which is what
  proves the move: 135 assertions passing against code they never mention. The
  shell gained two props onboarding does not use, `fill` and `rightAction`, for
  a phase that is its own layout. Enforced: `aria-current="step"` outside
  `components/flow/` fails the build, seen red while `StepNav` was still in the
  onboarding file.
- **17 September 2026** — **The contract is built in five phases, not a rail.**
  `ContractEditor` (686 lines, three stages in local state) became
  `contract/flow/` on `FlowShell`: client, services, scope, terms, preview, with
  the phase in the URL. The old file argued against that ("a remount would throw
  it away"), which held for a component whose stages shared one unsaved
  `useState` and does not here: autosave writes on every change and
  `router.replace` does not remount. Services now seed from the client record
  (`PRINCIPLES.md` rule 3, the invoice's precedent at `CONTEXT.md` §5i), and
  telling the record about a service added on a contract is a separate explicit
  act that never removes.
- **17 September 2026** — **A door guard became a ledger, and it needed two
  signals.** `ServiceDialog` refused to commit a Part until every blank was
  filled, which made "complete or not at all" true by construction; seeded Parts
  never pass through that button, so the guarantee moved to phase 3 and the form
  (now a 60% sheet beside the list it came from) saves what is in front of it.
  The count is derived from `contractScopes`, the enumeration finalize reads, so
  the ledger can never disagree with the guard. **Measured while building it: 21
  of the 22 seeded Services have no blank outside their fee**, so a derived count
  alone would have waved almost every service straight through — which is why a
  Part is also confirmed by hand, the one piece of stored state here, gating the
  phase and never finalize.
- **17 September 2026** — **The standing terms lost their dividers.** Thirteen
  figures sat in seven sections, two of which spent a heading, a separator and a
  whole row on one input. One grid per group instead: 28 figures land in 9 rows
  on a two-Schedule contract. The clause headings were checked before they went
  rather than assumed redundant — all thirteen `blankMeta` titles already name
  their own clause and none collide.
- **17 September 2026** — **The pager's pages became a tab group.** A trough
  with the current page raised on it, replacing a "Page 3 / 9" readout between
  two arrows where every page but the two either side of you took a click each.
  Up to six pages every page is a button and there are no arrows and no box;
  past six it is three runs (first, a sliding window of four, last) gapped 8px,
  with runs merged where they touch so no number is ever drawn twice and no gap
  ever falls between neighbours. The arrow still means "next page" and the
  window turns in batches behind it. The arithmetic is `ui/pageGroups.ts`, pure
  and separately tested, because every hard case here is a number rather than a
  box. **Two things fell out of it:** the trough had to be `bg-sidebar-field`
  rather than the tab list's `bg-muted`, since `--raised` and `--muted` are the
  same ramp step in dark and the active page was invisible but for its border
  (caught in a browser, now measured in both themes); and `onPrev`/`onNext` are
  gone, because the box already went through `onGoToPage` and every caller
  pointed all three at one function, so the "the preview scrolls where a table
  swaps" distinction they existed for was never real.
- **17 September 2026** — **The component library, at `/client/library`.** The
  place a component is decided: a rail of components, and one component's
  variants live and drivable beside it. It imports the real primitive, so there
  is no second step where a change ships and no second copy to disagree with the
  app. Pagination is its first and only entry, with the four shapes it takes at
  the lengths that produce them. It supersedes `/admin/kit`, a flat scroll of
  static examples with no way to drive any of them, which stays until its six
  sections are re-homed one at a time. **Three things the page itself taught,
  all in the browser:** the trailing merge was invisible until a specimen opened
  on the last page, since every long list shows the leading one on open; an
  empty stage reads as a broken render unless it says it is empty on purpose;
  and a specimen must be drawn on the band the component ships onto, which is a
  mistake only dark mode can show, because `--card` and `--sidebar` are
  indistinguishable in light. **The e2e spec was vacuous when written** and is
  recorded as such in its own header: it compared each element's own
  `background-color`, the pager's `<nav>` has none, so transparent matched
  transparent and it passed against a specimen moved to the wrong surface
  entirely.
- **17 September 2026** — **The pager became one control rather than five.**
  Both arrows, both anchors and the window now sit in a single container, and
  nothing inside it carries a stroke: it was three troughs with the arrows loose
  outside them, five separate objects saying one thing. The active page moved to
  `--card` (gray-50 in light, as specified) with its border kept, an inactive
  one is bare until hovered, and the pill is rounded tighter than the box so the
  nesting reads. **One thing fell out of it and needed its own fix:** the 8px
  gap between runs stopped meaning anything. It worked while each run had a
  trough, because the space between two backgrounds is a boundary; with one
  container the background groups everything together and the gap became
  indistinguishable from loose tracking, so `‹ 1 9 10 11 12 23 ›` read as one
  continuous list. That is §2.10's own lie, arrived at from the opposite
  direction. A hairline now stands in each gap, never after the last run, and
  none is drawn where two runs are merged. Caught in a browser; the Jest tests
  were all green.
- **17 September 2026** — **The go-to box joined the container, and the dark
  pill got its fill back.** Three corrections to the pass above, each from
  looking at the thing rather than at the numbers. The box was left outside on
  the reasoning that a field you type into is a different kind of thing from a
  page you can be on: true of the control, false of the layout, since it moves
  with the pager and floating beside it read as a second widget that happened to
  be adjacent. It is `--hover`, a step *down* from the container while every
  other filled thing steps up, which is the difference between a well and a
  pill. The active page was `--card` in both themes, and `--card` is the
  container's own value in dark, so its fill separated by **0.000** and the
  border alone was drawing it; `dark:bg-raised` restores +0.91 while light keeps
  gray-50 as specified. And the run separator moved off `--border` (white at
  10% in dark, fainter than the frame around it) onto the text ramp at 40%,
  then came *down* from 18px to 12px: weight and height are separate knobs and
  only weight should have been doing the work, since a full-height rule read as
  a structural divider cutting the control into sections.
- **17 September 2026** — **The pager's active page got its own token, and dark
  went two steps up.** `--page-active` (gray-50 / gray-700) replaces the
  `bg-card` plus `dark:bg-raised` pair that was describing one surface with two
  names. Dark is gray-700 rather than the symmetrical gray-800, on request:
  3.04 against the container where gray-800 gave 0.91, and 0.000 before that
  when both were `--card`. The note in `globals.css` refusing gray-700 for
  `--hover` was checked rather than assumed to apply: it is about
  `--muted-foreground` at 3.94:1 on a hovered card, and this pill prints
  `--foreground` at 9.71:1. Added to `contrast.test.ts` and seen red against a
  value pushed up the ramp until the text stopped clearing AA.
- **17 September 2026** — **The ⌘D palette's cards share one moving fill**, the
  magic move's third caller and the first that is a grid. Two rules came out of
  the shape rather than out of the colour. **One fill serves the pointer and
  the keyboard cursor**, the opposite of the nav rail, because a rail's active
  fill says which page you are on while a palette's selection is only a cursor:
  hovering a card selects it, and Enter opens whatever the fill sits on.
  **And the focus ring had to be taken off `focus-visible:`.** Selecting a card
  focuses it, which is what makes Enter work, but a programmatic `.focus()`
  inherits the modality the dialog was entered with, so Chromium painted the
  keyboard ring for a mouse move: measured in both themes, with the ring
  chasing the pointer across the grid. The card records what moved the
  selection and the ring follows that instead. Two e2e tests in
  `e2e/popup.spec.ts`, both confirmed red, and the second catches something no
  existing caller could: pinning `left` to 0 in the hook leaves all four popup
  tests green and fails only the palette's landing test, because every other
  caller is a list of full-width rows where the horizontal axis never moves.
  Then the grid's own scrolling had to be fixed to match: five cards do not
  fit, so hovering the clipped bottom row lifted it into view with a hard snap
  under a fill that was gliding. `scroll-behavior: smooth` does not fix that,
  which was measured rather than assumed, because a focus scroll ignores the
  property; `focus({ preventScroll: true })` plus `scrollIntoView` does. Two
  more tests, both seen red. The second exists because the blanket
  reduced-motion rule in `globals.css` cannot reach a behavior passed as an
  argument, so this scroll kept animating for somebody who asked it not to
  while every CSS transition in the app correctly stopped. One test was wrong
  before the code was: `hover()` scrolls its own target into view, so it was
  measuring Playwright rather than the palette, and failed against a fix that
  worked.
- **17 September 2026** — **A 36px rung, and the clause drawer resized around
  it.** The drawer's Heading and Description were the compact 32px under a
  full-width body editor and the three add-a-paragraph buttons were `form`
  (36px), which is the size for a button sitting *inline with* an Input: these
  sit in a row of their own with no field beside them, so it only made them the
  largest thing on the panel. Fields to 36, buttons to 28 (`default`, the dense
  height this tool is built at). The conflict was named before it was built,
  because §2.2 fixed the ladder at two values on purpose, and the answer chosen
  was a real rung rather than a one-off class. So `md` exists on all five
  typed-into primitives, not on the `Input` that needed it: a height declared by
  one control is how a field row comes out two heights the day a select joins
  the form. `control-size.test.tsx` holds the five together and was confirmed
  red with one of them missing the rung; the drawer's own measurements are in
  `e2e/clause-library.spec.ts`, since jsdom resolves no stylesheet and any size
  would pass there. The citations and those three buttons then joined one band,
  "Refers to" at the left and the buttons at the right end, which also recovered
  a row of the drawer's height. Two things it is worth knowing the shape of:
  the buttons became their own export rather than moving into `ClauseLibrary`,
  so the `add` logic stays where the parts are and only the layout moved, and
  they are deliberately **not** nested inside `ClauseCitations`, which renders
  `null` for a clause that cites nothing and would have taken them with it. The
  row uses `mr-auto` on an always-rendered left slot rather than
  `justify-between`, because `justify-between` with one child pushes that child
  left: on the clauses that cite nothing the buttons landed at x=806 against a
  right edge of 1262, caught by the test written for exactly that case.
- **17 September 2026** — **The clause drawer lost its Save button and gained a
  control row.** Five controls above the title, ordered by what each acts on:
  leaving (back), then the panel (expand), then, pushed right, the clause in
  rising order of consequence (download, archive, delete). Four things about it
  are decisions rather than defaults. **Autosave is debounced at 800ms, and the
  debounce is the safety mechanism rather than a tweak**: this file said
  "saved explicitly, not autosaved" on the argument that a clause is the source
  text for every contract drafted afterwards, and waiting for the typing to stop
  is what answers that argument rather than discarding it. The conflict was
  raised before it was built. **Delete keeps its confirmation**, and needs it
  more than before: an icon in a row is easier to hit by accident than the
  labelled button it replaced. **Expand is one toggle, not two buttons**, taking
  the sheet's existing `lg` (90% of the inset), so there is never an inert
  control and no second component to keep in step. **The sheet's own close X is
  off**, because the back arrow does that job. That last one was a real bug
  caught by eye in a screenshot: left on, the X sat *over* the delete icon, two
  controls in one corner and one of them irreversible. Pinned by hit-testing the
  delete button rather than by counting buttons, which would pass with the two
  stacked, and confirmed red against the overlap. The Markdown download is
  `domain/contract/clauseMarkdown.ts`, pure and tested there, with three lines
  of Blob plumbing in the drawer.
