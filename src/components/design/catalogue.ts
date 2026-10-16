/**
 * The index of the component library: what it holds, and what a URL calls it.
 *
 * Deliberately data rather than a folder of files the page globs. A component
 * earns a row here by being described — where it lives, which section of
 * `docs/design.md` rules it, and what its variants actually are — and that
 * description is the thing the library exists to show. A page that discovered
 * its own contents would list components with nothing said about them, which
 * is the gallery this is meant to replace.
 *
 * **Nothing here declares how a component looks.** The library imports the real
 * primitive from `src/components/ui/`, so the row is a pointer and the
 * component is the component. There is no second copy to keep in step and no
 * way for this page to show something the app does not have.
 */

/** One thing worth seeing about a component: a state, a length, a shape. */
export interface Variant {
  /** Short, and unique within its component. Reads as a heading. */
  name: string;
  /** Why this one is here, in a sentence. What it proves, or when it appears. */
  note: string;
}

export type Section =
  | 'overview'
  | 'foundations'
  | 'atoms'
  | 'patterns'
  | 'shell'
  | 'states'
  | 'writing'
  | 'decisions';

export const SECTIONS: Array<{ key: Section; name: string }> = [
  { key: 'overview', name: 'Overview' },
  { key: 'foundations', name: 'Foundations' },
  { key: 'atoms', name: 'Atoms' },
  { key: 'patterns', name: 'Patterns' },
  { key: 'shell', name: 'Shell' },
  { key: 'states', name: 'States' },
  { key: 'writing', name: 'Writing' },
  { key: 'decisions', name: 'Decisions' },
];

export type Level = 'token' | 'atom' | 'molecule' | 'organism' | 'template' | 'page';

/**
 * A decision, written once, with what was rejected and the test that holds
 * it. `docs/design.md` §6 is the same history as prose; this is the version
 * the page renders, so a reader standing on a component can see why it is
 * the way it is without opening the repo. `catalogue.test.ts` checks that
 * every `test` names an `it(…)` that exists.
 */
export interface Decision {
  slug: string;
  /** ISO date. */
  date: string;
  area: Section;
  title: string;
  decided: string;
  why: string;
  rejected: Array<{ option: string; why: string }>;
  /** The design.md section, e.g. '§2.1'. */
  rule: string;
  /** The `it(...)` title in the enforcement tests, verbatim. */
  test: string;
}

export interface LibraryEntry {
  /** The URL's `?item=`. Lowercase, hyphenated. */
  slug: string;
  section: Section;
  level: Level;
  /** The heading, and the rail's label. */
  name: string;
  /** One line under the heading: what the component is for. */
  blurb: string;
  /** Repo-relative path to the primitive or the stylesheet, so the reader can go read it. */
  source: string;
  /** The section of `docs/design.md` that rules it, e.g. '§2.10'. */
  rule: string;
  variants: Variant[];
}

export const CATALOGUE: LibraryEntry[] = [
  {
    slug: 'overview',
    section: 'overview',
    level: 'page',
    name: 'How this is built',
    blurb:
      'The five properties a tool has when it feels right, the ladder the folders follow, and the one procedure for adding anything.',
    source: 'docs/design.md',
    rule: '§0',
    variants: [
      { name: 'The five properties', note: 'Rhythm, restraint, response, legibility, predictability. Every rule in the foundations exists to produce one of them.' },
      { name: 'The ladder', note: 'Tokens, atoms, patterns, shell, screens. A test holds the order of imports.' },
      { name: 'Adding something', note: 'Token, then doc row, then test, in one commit. A rule that is prose loses; a rule that is a test holds.' },
    ],
  },
  {
    slug: 'colour',
    section: 'foundations',
    level: 'token',
    name: 'Colour',
    blurb:
      'One neutral ramp, aliased into roles per theme; four signals with a hue of their own. Read from the stylesheet, so the page cannot show a value the app lacks.',
    source: 'src/app/globals.css',
    rule: '§1.1',
    variants: [
      { name: 'The roles', note: 'Every neutral role, light and dark side by side.' },
      { name: 'The signals', note: 'Primary, destructive, warning, success: the only tokens that carry a hue.' },
    ],
  },
  {
    slug: 'type',
    section: 'foundations',
    level: 'token',
    name: 'Type',
    blurb:
      'Eight sizes, each carrying its line-height, weight and tracking. 13px body because this is a tool people sit in for hours.',
    source: 'src/app/globals.css',
    rule: '§1.4',
    variants: [
      { name: 'The scale', note: 'Each token at its real size, with the role it is for.' },
    ],
  },
  {
    slug: 'spacing',
    section: 'foundations',
    level: 'token',
    name: 'Spacing',
    blurb:
      'A 4px grid: inside a control 8, between controls 8, between groups 16, between sections 24, the page inset 32. Gap on the parent, never margin on the child.',
    source: 'src/app/globals.css',
    rule: '§1.2',
    variants: [
      { name: 'The steps', note: 'Each step at its size, with what it separates.' },
    ],
  },
  {
    slug: 'radius',
    section: 'foundations',
    level: 'token',
    name: 'Radius',
    blurb:
      'Four integers. A nested corner is one step tighter than its parent; a corner is never more than half the height of the thing it is on.',
    source: 'src/app/globals.css',
    rule: '§1.3',
    variants: [
      { name: 'The steps', note: '4, 6, 8, 12 and full, each on the control it belongs to.' },
    ],
  },
  {
    slug: 'elevation',
    section: 'foundations',
    level: 'token',
    name: 'Elevation',
    blurb:
      'Flat and bordered on the page; a shadow only on what floats, and the higher it floats the softer the shadow. Three levels, which is all a reader can tell apart.',
    source: 'src/app/globals.css',
    rule: '§1.7',
    variants: [
      { name: 'The three', note: 'Raised, overlay, modal, each on the ground it sits on.' },
    ],
  },
  {
    slug: 'motion',
    section: 'foundations',
    level: 'token',
    name: 'Motion',
    blurb:
      'Three tiers and one easing, and motion only where it connects two states the reader caused. Nothing moves on its own.',
    source: 'src/app/globals.css',
    rule: '§1.6',
    variants: [
      { name: 'The tiers', note: 'State at 75ms, overlay at 100, panel at 200. Hover each square.' },
    ],
  },
  {
    slug: 'icons',
    section: 'foundations',
    level: 'token',
    name: 'Icons',
    blurb:
      'Every icon the app imports, generated from the source tree, so the page cannot fall behind what ships. None of them moves.',
    source: 'src/components/design/iconInventory.generated.ts',
    rule: '§1.5',
    variants: [
      {
        name: 'Still',
        note: 'Generated by scripts/icon-inventory.ts and pinned by a test, with how many files import each. One weight everywhere: stroke-width is set once in globals.css and never per icon.',
      },
    ],
  },
  {
    slug: 'button',
    section: 'atoms',
    level: 'atom',
    name: 'Button',
    blurb:
      'Every clickable thing in the app: the fills, the heights, the four states each takes, and the components built on top of it for actions that need more than a click.',
    source: 'src/components/ui/button.tsx',
    rule: '§2.1',
    variants: [
      {
        name: 'The fills',
        note: 'Five, and the order is the hierarchy: one primary per view, everything else quieter. `secondary` is the default. `raised` and `neutral` were deleted on 16 October 2026: one was on trial for a year in one place, the other existed for a row with two solid buttons, which the one-primary rule forbids.',
      },
      {
        name: 'The heights',
        note: 'Three: 28 for a toolbar or a row action, 32 as the default and the height of a rail input, 36 as a form field’s height. `icon` makes any of them square. 24 was deleted: nothing needed it.',
      },
      {
        name: 'The four states',
        note: 'Rest, hover, focus and disabled, side by side so they can be compared rather than described. Focus is a ring plus a border, never a colour change alone; disabled drops to 50% and takes its pointer events with it, so a disabled button cannot be clicked or hovered.',
      },
      {
        name: 'Working',
        note: 'A spinner appears in front of the label and the button disables itself. The label never changes: swapping "Save" for "Saving…" resizes the control mid-click, which is how a click gets missed on the way down.',
      },
      {
        name: 'With an icon',
        note: 'Leading or trailing, sized from the height. The side is marked with data-icon so the padding tightens on that edge only: an icon is narrower than a word and even padding leaves it looking pushed in.',
      },
      {
        name: 'Icon only',
        note: '`icon` on any height, and all of them are silent without help. An icon button with no accessible name is the one rule the design-system test enforces by failing the build, because it is invisible in review and total for a screen reader.',
      },
      {
        name: 'Grouped',
        note: 'Buttons joined into one control, with the shared edges collapsed so the seam is a single hairline rather than two borders meeting. For actions that are alternatives to each other, never a row of unrelated ones.',
      },
      {
        name: 'Add',
        note: 'The page-level create action: a plus and a verb. Two components rather than one polymorphic one, because a create that opens a panel and a create that navigates are different elements.',
      },
      {
        name: 'Confirmed',
        note: 'An action that cannot be undone asks first, in the app’s own dialog rather than the browser’s grey OS box. The dialog names the thing and states the consequence; the confirm takes the destructive fill.',
      },
      {
        name: 'Remove a row',
        note: 'The one way a repeatable row leaves a list. A bare "Remove" read as heavily as the fields beside it and warned about nothing, so this is a quiet icon that still asks before it acts.',
      },
      {
        name: 'Copy',
        note: 'The confirm swap at its smallest, on the one action that happens entirely off screen. Nothing on the page changes when a value reaches the clipboard, so the button is the only thing that can say it worked.',
      },
      {
        name: 'In a toolbar',
        note: 'Icon-only, muted until hovered, with a tooltip naming what it acts on. The row in a drawer’s header is built from these, and the label is what assistive tech reads rather than the tooltip.',
      },
    ],
  },
  {
    slug: 'pagination',
    section: 'atoms',
    level: 'atom',
    name: 'Pagination',
    blurb:
      'The pages as a tab group: a trough with the page you are on raised on it. Three shapes by length, and the arithmetic that decides which is in ui/pageGroups.ts.',
    source: 'src/components/ui/pagination.tsx',
    rule: '§2.10',
    variants: [
      {
        name: 'Single page',
        note: 'Renders nothing at all. A pager whose every control is disabled is noise under a short table.',
      },
      {
        name: 'Short list',
        note: 'Up to six pages: every page in one trough, no arrows, no box. Each is already one click away, so the machinery would be answering a question nobody asked.',
      },
      {
        name: 'Windowed',
        note: 'Past six: the first page, a sliding window of four and the last, in one container with a hairline standing where numbers are missing. The arrow still means "next page"; the window turns a batch at a time behind it.',
      },
      {
        name: 'Merged at the ends',
        note: 'On the first or last pages the anchor is part of the window, so the two are drawn as one run with no separator between them. A rule between neighbours would claim something is elided when nothing is.',
      },
    ],
  },
  {
    slug: 'field',
    section: 'atoms',
    level: 'atom',
    name: 'Field',
    blurb:
      'Label, control, help behind an icon, error below. Two heights, 32 and 36, which are Button’s md and lg, so a button beside a field is never a different height.',
    source: 'src/components/ui/input.tsx',
    rule: '§2.2',
    variants: [
      { name: 'Two heights', note: 'Compact for the editor rail, form for a form, with a button beside each.' },
      { name: 'The states', note: 'Rest, invalid, disabled, and a value the app filled in with its note.' },
      { name: 'The family', note: 'Input, textarea, select, date picker, checkbox, switch: one ring, one border, one height.' },
    ],
  },
  {
    slug: 'badge',
    section: 'atoms',
    level: 'atom',
    name: 'Badge',
    blurb:
      'A rectangle in caption text. Carries a document status by word, never by colour alone, and an accent hue only to group.',
    source: 'src/components/ui/badge.tsx',
    rule: '§2.1',
    variants: [
      { name: 'Status', note: 'Draft, finalized, void. The word is the whole badge.' },
      { name: 'Grouping', note: 'The eight accent hues say which bucket a thing is in and never what state it is in.' },
    ],
  },
  {
    slug: 'overlays',
    section: 'atoms',
    level: 'atom',
    name: 'Overlays',
    blurb:
      'Tooltip, popover, menu, dialog: 4px from the anchor, never narrower than it, fading in at the overlay tier, with the shadow its height earns.',
    source: 'src/components/ui/dropdown-menu.tsx',
    rule: '§1.7a',
    variants: [
      { name: 'Anchored', note: 'A tooltip, a popover and a menu off the same kind of button.' },
      { name: 'Modal', note: 'The one confirmation, with its wording rules beside it.' },
    ],
  },
  {
    slug: 'tabs',
    section: 'atoms',
    level: 'atom',
    name: 'Tabs',
    blurb:
      'A trough with the chosen segment raised on it by fill. The pill moves in a frame and can be dragged.',
    source: 'src/components/ui/tabs.tsx',
    rule: '§2.7',
    variants: [
      { name: 'Segmented', note: 'Two sizes: the 40px trough and the 28px toolbar one.' },
    ],
  },
  {
    slug: 'table',
    section: 'patterns',
    level: 'organism',
    name: 'Table',
    blurb:
      'Every list of records in this app, and the template a new one is copied from: one of every column kind over rows built to exercise each. RecordTable brings the behaviour; the column spec brings the decisions.',
    // The primitive, as every other row here points at one. The template that
    // is copied from is `library/table/columns.tsx` beside it, and the page
    // says so; this field names the component the library is showing.
    source: 'src/components/patterns/RecordTable.tsx',
    rule: '§2.3',
    variants: [
      {
        name: 'Every column',
        note: 'One of each of the eleven kinds, and the package that makes that many readable: fixed layout, sideways scroll inside the card, a frozen name and actions column, dividers, and every cell truncating. It buys reachability at any scroll position and gives up the sticky header, which is not recoverable. Drag a heading to move a column (columns do not resize): the frozen Name column is pinned and the checkbox and actions columns bound the range by not being columns. The absences are here too, on the row with no amount, owner, team or note.',
      },
      {
        name: 'Empty',
        note: 'Zero rows: no header, no footer, no pager, only the empty state. A table that drew its chrome around nothing would read as broken rather than as a list with nothing in it. Drawn at five columns, because an empty table should be the width a real one would be.',
      },
    ],
  },
  {
    slug: 'drawer',
    section: 'patterns',
    level: 'organism',
    name: 'Drawer',
    blurb:
      'A panel over the inset card: a header that stays, a body that scrolls, a footer that does not move. Three layers, so a drawer takes only the part it needs.',
    source: 'src/components/ui/drawer-sheet.tsx',
    rule: '§2.11',
    variants: [
      {
        name: 'The drawer',
        note: 'One frame, opened over the page it would really cover. The toolbar walks the list without closing the panel and expands it to nine tenths of the card; the body is the only part that scrolls; the footer is a row of controls or a quiet status line, and the switch below shows both on the same frame rather than as two drawers.',
      },
    ],
  },
  {
    slug: 'actions',
    section: 'patterns',
    level: 'molecule',
    name: 'Actions',
    blurb:
      'The molecules built on Button: an icon action with its tooltip, a copy action, a create action, a confirmed action and the row remove.',
    source: 'src/components/patterns/IconAction.tsx',
    rule: '§2.6',
    variants: [
      { name: 'In a toolbar', note: 'Icon-only, 28px, muted until hovered, named for assistive tech, one word for the pointer.' },
      { name: 'Copy', note: 'The icon action for the one thing that happens off screen.' },
      { name: 'Create', note: 'A plus and a verb, as a button or as a link.' },
      { name: 'Confirmed', note: 'A button that asks first, in the one dialog, with the fixed wording.' },
    ],
  },
  {
    slug: 'cells',
    section: 'patterns',
    level: 'molecule',
    name: 'Cells',
    blurb:
      'One component decides how each kind of value looks, so the same fact cannot come to look like two kinds of fact a page apart.',
    source: 'src/components/patterns/AmountCell.tsx',
    rule: '§2.3',
    variants: [
      { name: 'Date', note: 'Ordinal, full strength.' },
      { name: 'Amount', note: 'Tabular, right-aligned, with its currency chip.' },
      { name: 'Identity', note: 'Mono with tabular figures, and copyable.' },
    ],
  },
  {
    slug: 'page',
    section: 'patterns',
    level: 'template',
    name: 'Page',
    blurb:
      'The frame every screen sits in: a 32px inset, one title, the one primary action at its right, then the content. Seven templates fill it.',
    source: 'src/components/patterns/Page.tsx',
    rule: '§2.4',
    variants: [
      { name: 'Header', note: 'The title, an optional line under it, and the actions.' },
      { name: 'The seven templates', note: 'List, list with drawer, document workspace, flow, detail, form, index: which screens are which and where each puts its primary action.' },
    ],
  },
  {
    slug: 'specimen',
    section: 'patterns',
    level: 'molecule',
    name: 'Specimen',
    blurb:
      'The frame every example on this page sits in: a tinted card holding the name, and a stage inset on the fill the component really ships on. The card is furniture; the stage is the subject.',
    source: 'src/components/design/Specimen.tsx',
    rule: '§2.13',
    variants: [
      { name: 'The card and the stage', note: 'The default: one control pushed right, on `--background`, which is where nearly everything stands.' },
      { name: 'Fill', note: 'A set of examples that wants the whole stage, laid out from the left like the prose above it.' },
      { name: 'On the sidebar band', note: 'A pager lives in a table footer on `--sidebar`, so it is judged there. Signed off on any other fill, it is signed off on a band it never sits on.' },
      { name: 'An absence', note: 'A component declining to render gets no stage at all. An empty inset among full ones reads as something that broke.' },
    ],
  },
  {
    slug: 'flow',
    section: 'patterns',
    level: 'organism',
    name: 'Flow',
    blurb:
      'Every multi-step form: a step row, the step, and a footer that holds the submit. The step lives in the URL, because this is a task people get pulled away from.',
    source: 'src/components/patterns/flow/steps.ts',
    rule: '§2.12',
    variants: [
      { name: 'The step row', note: 'Done, current and locked steps, as the real step row draws them.' },
    ],
  },
  {
    slug: 'shell',
    section: 'shell',
    level: 'template',
    name: 'The shell',
    blurb:
      'The frame every page sits in, with its regions and their sizes. Every number is a multiple of four.',
    source: 'src/components/shell/nav.ts',
    rule: '§2.4',
    variants: [
      { name: 'The regions', note: 'Nav, top panel, header row, inset card, editor rail, with their sizes.' },
    ],
  },
  {
    slug: 'empty',
    section: 'states',
    level: 'atom',
    name: 'The six states',
    blurb:
      'Loading, none yet, no matches, error, not found, pending. The copy for the empties is written once, in EmptyState.',
    source: 'src/components/ui/empty.tsx',
    rule: '§2.5',
    variants: [
      { name: 'Loading', note: 'A table skeleton and a form skeleton: the shape of what is coming, never a spinner.' },
      { name: 'None yet', note: 'With the button that creates the first one.' },
      { name: 'No matches', note: 'With the button that clears the filters.' },
      { name: 'Error', note: 'With retry.' },
      { name: 'Not found', note: 'Inside the shell, with the way back.' },
      { name: 'Pending', note: 'A spinner in front of a label that never changes.' },
    ],
  },
  {
    slug: 'writing',
    section: 'writing',
    level: 'page',
    name: 'Writing',
    blurb:
      'Sentence case, no em dash, no exclamation mark, name the object, never a question in a title.',
    source: 'docs/design.md',
    rule: '§3',
    variants: [
      { name: 'Good and bad', note: 'Each rule with the sentence it forbids beside the one it wants.' },
    ],
  },
  {
    slug: 'decisions',
    section: 'decisions',
    level: 'page',
    name: 'Decisions',
    blurb:
      'Every decision this system is made of, newest first: what was chosen, what was rejected and why, the rule that records it and the test that holds it.',
    source: 'src/components/design/catalogue.ts',
    rule: '§6',
    variants: [
      { name: 'The record', note: 'One card per decision.' },
    ],
  },
];

export const DECISIONS: Decision[] = [
  {
    slug: '2026-10-16-type-scale',
    date: '2026-10-16',
    area: 'foundations',
    title: '13px body, 12px controls, eight tokens that carry their own line-height',
    decided:
      'Eight text tokens (caption 11, meta 12, control 12 at 500, body 13, lead 14, section 16, title 20, display 24), each with line-height, weight and tracking inside the token. Tailwind sizes, pixel sizes, leading, tracking and the semibold weight are banned outside the definitions.',
    why: 'Ten distinct sizes were in use against a rulebook that said four, because the rule was prose. 13px is where a tool people sit in for hours sits (Linear, Figma, Finder, the macOS HIG body): it clears the legibility floor and fits eight percent more rows than 14. A token that carries its line-height is a token nobody can pair wrongly.',
    rejected: [
      { option: '14px body, the shadcn default', why: 'The web default because browsers default to 16 and shadcn scaled down once. Roomier, fewer rows.' },
      { option: 'One size for prose and controls', why: 'A label is read once, not read through; a control one step quieter than the prose lets the prose lead.' },
    ],
    rule: '§1.4',
    test: 'takes every text size from the type scale, never Tailwind’s or a pixel value',
  },
  {
    slug: '2026-10-16-button-heights',
    date: '2026-10-16',
    area: 'atoms',
    title: 'Three button heights, 28, 32 and 36, and icon as a shape',
    decided: 'sm 28 for toolbars and row actions, md 32 as the default and the height of a rail input, lg 36 as a form field’s height. icon makes any of them square. 24 deleted.',
    why: '28 is the smallest thing that reads as a control rather than a chip and is what the toolbar already used. 32 and 36 are the two input heights, so a button beside a field is never a different height. 24 was only ever icon-only row actions, and a 28 square sits in a 40 row with 6px each side.',
    rejected: [
      { option: '24 / 28 / 36 with inputs at 32 / 36', why: 'A 28 button beside a 32 rail input is the mismatch the scale exists to stop.' },
      { option: 'icon-sm and icon as sizes', why: 'Square is a shape, not a fourth height, and two icon sizes were two decisions every call site had to make correctly.' },
    ],
    rule: '§2.1',
    test: 'writes every button in the five-fill, three-height API',
  },
  {
    slug: '2026-10-16-five-fills',
    date: '2026-10-16',
    area: 'atoms',
    title: 'Five fills, secondary as the default, one primary per view',
    decided: 'primary, secondary (bordered, the default), ghost, destructive (a tint; solid only inside its own dialog), link.',
    why: 'raised had been on trial on one button for a year; neutral existed for a row with two solid buttons, which the one-primary rule forbids; the grey secondary fill was a worse secondary than a border. Fewer fills is fewer wrong choices.',
    rejected: [{ option: 'Keep neutral for a row with three solid actions', why: 'A row that needs two solid buttons has the wrong hierarchy.' }],
    rule: '§2.1',
    test: 'writes every button in the five-fill, three-height API',
  },
  {
    slug: '2026-10-16-motion',
    date: '2026-10-16',
    area: 'foundations',
    title: 'Functional motion only: three tiers, one easing, nothing decorative',
    decided: 'The motion package, animated icons, the sliding menu highlight, the sliding tab pill, the fill-flash ring and every mount animation were removed. 75ms state, 100ms overlay fade, 200ms panel slide, the spinner and the skeleton pulse remain.',
    why: 'An icon that moves delays recognising which icon it is by the length of the move; a highlight that follows the pointer makes a menu feel like it is reacting rather than waiting; springs ignored reduced-motion. None carried information. macOS does almost none of this.',
    rejected: [
      { option: 'Keep the sliding tab pill', why: 'Decoration on a control that already says which segment is on by fill.' },
      { option: 'Keep fill-flash on auto-filled fields', why: 'The field is read-only with a note, which is information; the pulse was not.' },
    ],
    rule: '§1.6',
    test: 'has no decorative motion: no spring library, no sliding pill, no icon that moves on hover',
  },
  {
    slug: '2026-10-16-confirm-dialog',
    date: '2026-10-16',
    area: 'patterns',
    title: 'One confirmation, with fixed wording',
    decided: 'ConfirmDialog: a title that is the verb and the object with no question mark, one sentence of consequence, Cancel always Cancel, the confirm repeating the verb, solid red when destructive.',
    why: 'Nine hand-written dialogs had Cancel, Stay and Keep editing between them, and in one the button that threw work away was the one the eye landed on.',
    rejected: [{ option: 'A wording guideline in the doc', why: 'The nine were written under one.' }],
    rule: '§2.6',
    test: 'builds every confirmation on ConfirmDialog, with a title that states rather than asks',
  },
  {
    slug: '2026-10-16-folders',
    date: '2026-10-16',
    area: 'overview',
    title: 'The folders follow the atomic ladder, and a test holds the order',
    decided: 'ui/ is atoms, patterns/ is molecules and organisms, shell/ is the frame, the rest are screens. ui imports no pattern, a pattern imports no shell or screen, the shell imports no screen. A type import crosses no layer.',
    why: 'Shared compositions sat beside domain screens in admin/ and nothing stopped a pattern reaching into a screen. The folder now says the level, and the import rule keeps it true.',
    rejected: [
      { option: 'Literal atoms/molecules/organisms/templates folders', why: 'Moves 120 files and breaks the shadcn CLI convention for a distinction that is argued more than it is used.' },
      { option: 'Declare the level in docstrings only', why: 'A folder that tells you nothing.' },
    ],
    rule: '§0',
    test: 'keeps the layers in order: ui imports no pattern, patterns import no shell or screen',
  },
  {
    slug: '2026-10-16-radius',
    date: '2026-10-16',
    area: 'foundations',
    title: 'Four integer radii',
    decided: '4, 6, 8, 12 and full. xl belongs to the two dialogs.',
    why: 'The old multipliers landed on 3.6 and 4.8px, which anti-alias differently on every edge and read as slightly soft without anyone being able to say why.',
    rejected: [{ option: 'One base with multipliers', why: 'Fractional pixels.' }],
    rule: '§1.3',
    test: 'keeps every corner on the radius scale; xl is the dialogs’ alone',
  },
  {
    slug: '2026-10-16-elevation',
    date: '2026-10-16',
    area: 'foundations',
    title: 'Three shadows, twice the weight in dark',
    decided: 'raised, overlay, modal. Fourteen hand-written shadows, two of them in rgba where the colour test could not see them, became three tokens.',
    why: 'A shadow says this is above that; three levels are all a reader can tell apart. A shadow on a dark ground is mostly invisible at the light values.',
    rejected: [{ option: 'Tailwind’s six named shadows', why: 'Six levels nobody can tell apart, and no dark values.' }],
    rule: '§1.7',
    test: 'takes every shadow from the three elevation tokens',
  },
  {
    slug: '2026-10-16-allowlists',
    date: '2026-10-16',
    area: 'overview',
    title: 'A rule lands with a shrinking allowlist, never a regex exemption',
    decided: 'When a new rule has existing violations, the files are listed on the day the rule is written and nothing else changes in that commit. A listed file that stops violating must leave the list; an empty list is deleted.',
    why: 'A rule and ninety unrelated edits is a diff nobody can review. A list that only shrinks, checked by a test, is a migration with a visible end.',
    rejected: [{ option: 'Fix every violation in the rule’s commit', why: 'The type rule alone touched 128 files.' }],
    rule: '§4',
    test: 'keeps every migration allowlist honest: a listed file still violates, or it leaves the list',
  },
];

/** Where the rail lands when the URL names nothing. */
export const FIRST_ENTRY: LibraryEntry = CATALOGUE[0];

/**
 * The entry a `?item=` names, else the first entry of the `?section=` named,
 * else the overview.
 *
 * A URL is somebody else's text: a stale bookmark, a typo, a slug that was
 * renamed. None of those are a reason to show an empty pane the reader cannot
 * get out of, so an unknown name reads exactly as no name at all. Same rule as
 * the `?country=` parameter in onboarding (`CONTEXT.md` §5d-iv): validated
 * against the list, never trusted.
 */
export function entryOf(item: string | undefined, section?: string | undefined): LibraryEntry {
  const byItem = CATALOGUE.find((entry) => entry.slug === item);
  if (byItem) return byItem;
  return CATALOGUE.find((entry) => entry.section === section) ?? FIRST_ENTRY;
}

export function entriesIn(section: Section): LibraryEntry[] {
  return CATALOGUE.filter((entry) => entry.section === section);
}
