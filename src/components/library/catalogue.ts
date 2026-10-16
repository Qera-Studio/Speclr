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

export interface LibraryEntry {
  /** The URL's `?component=`. Lowercase, hyphenated. */
  slug: string;
  /** The heading, and the rail's label. */
  name: string;
  /** One line under the heading: what the component is for. */
  blurb: string;
  /** Repo-relative path to the primitive, so the reader can go read it. */
  source: string;
  /** The section of `docs/design.md` that rules it, e.g. '§2.10'. */
  rule: string;
  variants: Variant[];
}

export const CATALOGUE: LibraryEntry[] = [
  {
    slug: 'pagination',
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
    slug: 'button',
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
    slug: 'icons',
    name: 'Icons',
    blurb:
      'Every icon the app imports, generated from the source tree, so the page cannot fall behind what ships. None of them moves.',
    source: 'src/components/library/iconInventory.generated.ts',
    rule: '§1.5',
    variants: [
      {
        name: 'Still',
        note: 'Generated by scripts/icon-inventory.ts and pinned by a test, with how many files import each. One weight everywhere: stroke-width is set once in globals.css and never per icon.',
      },
    ],
  },
  {
    slug: 'table',
    name: 'Table',
    blurb:
      'Every list of records in this app, and the template a new one is copied from: one of every column kind over rows built to exercise each. RecordTable brings the behaviour; the column spec brings the decisions.',
    // The primitive, as every other row here points at one. The template that
    // is copied from is `library/table/columns.tsx` beside it, and the page
    // says so; this field names the component the library is showing.
    source: 'src/components/admin/RecordTable.tsx',
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
    slug: 'segmented-tabs',
    name: 'Segmented tabs (experiment)',
    blurb:
      'Tabs as a soft grey trough with a white pill under the chosen one, every tab the same width, after a reference design with the app’s own corners. Built on ui/tabs, so the keys, the slide and the drag are the house ones.',
    source: 'src/components/library/tabs/SegmentedTabs.tsx',
    rule: '§2.7',
    variants: [
      {
        name: 'Two choices',
        note: 'The smallest strip: a setting with two answers, where the pill is the answer.',
      },
      {
        name: 'Icons, with more',
        note: 'Four views with icons, and "All" opening the rest. The menu sits outside the tablist, because a menu button inside role="tablist" would be announced as a tab.',
      },
      {
        name: 'Words only',
        note: 'Four sections of a settings panel. Equal widths, so "Publishing" does not make its tab the biggest target.',
      },
    ],
  },
  {
    slug: 'item-drawer',
    name: 'Item drawer (experiment)',
    blurb:
      'A copy of the service catalogue’s item drawer, for trying a new design on. Nothing in the app imports it: a design that wins goes back into the real drawer, and this is deleted either way.',
    source: 'src/components/library/drawer/ExperimentDrawer.tsx',
    rule: '§2.11',
    variants: [
      {
        name: 'The item drawer',
        note: 'The Custom Website items, all 52, with the same table, toolbar and form as the services page. Open a row to edit it. Saving, archiving and removing a group change this page only, until it is reloaded.',
      },
    ],
  },
  {
    slug: 'clause-drawer',
    name: 'Clause drawer (experiment)',
    blurb:
      'A copy of the clause library’s drawer, on the same forked frame as the item drawer. Nothing in the app imports it, and nothing it saves reaches the clauses table.',
    source: 'src/components/library/drawer/ClauseDrawerSpecimens.tsx',
    rule: '§2.11',
    variants: [
      {
        name: 'The clause drawer',
        note: 'The 31 seeded clauses with the real drawer: paging, expand, download, archive and delete in the toolbar, the row-by-row body editor, and the debounced save with its quiet status line. Everything changes this page only, until it is reloaded.',
      },
    ],
  },
];

/**
 * Where the rail lands when the URL names nothing.
 *
 * Non-null by construction: the catalogue is a literal with at least one row,
 * and `catalogue.test.ts` fails if a variant-less or duplicate entry reaches it.
 */
export const FIRST_ENTRY: LibraryEntry = CATALOGUE[0];

/**
 * The entry a `?component=` names, or the first one.
 *
 * A URL is somebody else's text: a stale bookmark, a typo, a slug that was
 * renamed. None of those are a reason to show an empty pane the reader cannot
 * get out of, so an unknown slug reads exactly as no slug at all. Same rule as
 * the `?country=` parameter in onboarding (`CONTEXT.md` §5d-iv): validated
 * against the list, never trusted.
 */
export function entryOf(slug: string | undefined): LibraryEntry {
  return CATALOGUE.find((entry) => entry.slug === slug) ?? FIRST_ENTRY;
}
