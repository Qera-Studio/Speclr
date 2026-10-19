'use client';

import {
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { List, type LucideIcon } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Pagination, rowCountLabel, usePagedRows, PAGE_SIZE } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { BulkBar, useBulkSelect, type BulkSelection } from '@/components/patterns/BulkSelect';
import { SortableHead, TableCard, TruncCell } from '@/components/patterns/Page';
import { RowActions } from '@/components/patterns/RowActions';

/**
 * A list of records, with the house table behaviour already in it.
 *
 * **This is the only way to build a list of records** (`docs/design.md` §2.3),
 * and `design-system.test.ts` fails a `TableBody` written anywhere but here and
 * `ui/`. The reason is the section's own history: every rule it states was
 * already written down when a table shipped with no paging over 28 rows, no
 * caption and no sortable headings, by an author who had read the file. Prose
 * describing a default does not produce one. **A default holds only when losing
 * it takes deliberate action**, so each behaviour below is on unless the call
 * site says otherwise, and the opt-out is a visible prop a reviewer can ask
 * about.
 *
 * What a caller gets without asking: paging at ten, the count and pager in the
 * card footer, an `sr-only` caption, sortable headings, a reserved actions
 * column, and an empty state. What it adds by asking: `open` (the row opens its
 * record), `actions`, `onBulkDelete`.
 *
 * It composes rather than reimplements. `usePagedRows`, `useBulkSelect`,
 * `SortableHead`, `TableCard` and `RowActions` were already shared and already
 * right; what was missing was a single place that assembles them the same way
 * every time.
 *
 * **Sorting is in-memory and generic**, unlike `DocumentsTable`'s, which sorts
 * server-shaped data through `documentQuery`. A column sorts on `sortValue`, or
 * on what `cell` renders when that is a string or a number. A table whose sort
 * has to mean something else passes `sort` and `onSortChange` and owns it.
 */

export interface RecordColumn<T> {
  /** Identifies the column for sorting. Not rendered. */
  key: string;
  label: string;
  cell: (row: T) => React.ReactNode;
  /**
   * A Lucide icon beside the heading, for a table dense enough that the column
   * names are scanned rather than read.
   *
   * `aria-hidden` wherever it renders: the heading's text is already the
   * accessible name, and an icon that repeats it is one more thing for a screen
   * reader to read out per column. It is decoration, and it is typed as
   * `LucideIcon` rather than `ReactNode` so a call site cannot put a label in
   * here and lose it to assistive tech.
   */
  icon?: LucideIcon;
  /**
   * A starting width in pixels, for a resizable table.
   *
   * Required for a resizable column and meaningless without one: resizing needs
   * `table-layout: fixed` to hold a width at all (under `auto` the browser
   * treats every width as advisory and re-solves the whole table from its
   * content), and `fixed` needs every column to state one.
   */
  size?: number;
  /**
   * This column never shows a cut value: it is widened to fit its widest row,
   * and cannot be dragged narrower than that.
   *
   * **Opt-in per column, on request, rather than on for the whole table.** It
   * is a real trade rather than a free win, which is why it is not the default:
   * a column that always fits is a column whose width is decided by its longest
   * value, so one unusually long row widens it for every other row, and on a
   * table that already scrolls sideways that space comes out of what else can
   * be seen at once. Worth it where the value is the thing being scanned and a
   * cut one is useless (a place name, where 'Bridge of Earn, United Kingd' is
   * not a place); not worth it where the reader only needs the shape of the
   * value and can widen the column when they care.
   *
   * `size` still applies and is the *starting* width. This only ever raises it.
   *
   * Needs `resizable`, for the same reason `size` does: a width is advisory
   * under `table-layout: auto`, and `auto` already sizes a column to its
   * content, so there is nothing here to fix.
   */
  fit?: boolean;
  /**
   * A floor in pixels this column is never narrower than, whatever is in it.
   *
   * Distinct from `fit`, and the difference is where the number comes from.
   * `fit` is derived from the rows on the screen, so a column of short values
   * is left alone; this is **stated**, so it holds on a table where every value
   * is short and on a page where the data has not loaded. Use it where a column
   * has a width it should simply not go under, and `fit` where the rule is
   * "never cut a value" whatever that turns out to cost.
   *
   * They compose: with both, the floor is whichever is larger, so a stated
   * minimum cannot make a `fit` column cut a value and a long value cannot pull
   * a column under its stated minimum.
   *
   * Also the starting width when it is above `size`, for the same reason `fit`
   * is: a column that opens under its own minimum and only reaches it once
   * somebody drags is not a minimum.
   */
  minSize?: number;
  /** Frozen against the left edge while the table scrolls sideways. */
  sticky?: boolean;
  /** Right-aligned, as a money column is (§2.3). */
  right?: boolean;
  /** Width utility for the `<th>`, e.g. `w-16`. */
  width?: string;
  /**
   * Long values ellipsise rather than widening the table past the card.
   * `TruncCell`'s job; pass a CSS length to override its default.
   */
  trunc?: boolean | string;
  /** Sorting is on by default. `false` is the explicit opt-out. */
  sortable?: boolean;
  /**
   * The heading is for screen readers only, for a column that is scanned
   * rather than read: a glyph carrying its figures in its own `aria-label` and
   * tooltip (§2.3). The onboarding ring is the example. The column still has a
   * name, because a column with none is a column a screen reader cannot place.
   */
  headingHidden?: boolean;
  /** What this column sorts on, when the rendered cell is not it. */
  sortValue?: (row: T) => string | number;
  /**
   * The column renders its own `<TableCell>`, for the handful of cells that
   * are a component rather than a value: `CopyCell` and `DateCell` each bring
   * their own, because what they encapsulate is the cell's behaviour.
   *
   * `sortValue` is then required, since there is no rendered string to read.
   */
  ownCell?: boolean;
  /**
   * The column draws the row's own link itself.
   *
   * For the one case where the opener has to live *inside* another component:
   * the documents list wraps its number in a `CopyCell`, whose `display` is
   * the anchor. Without this the row would carry two links to the same place,
   * which is a duplicate tab stop and an ambiguous accessible name.
   */
  ownOpener?: boolean;
  className?: string;
}

interface OpenSpec {
  /** A URL. Preferred: the row stays a real anchor. */
  href?: string;
  /** For a row that opens something with no URL, such as a drawer. */
  onClick?: () => void;
}

export interface RecordTableProps<T> {
  rows: T[];
  /** Stable identity, for React keys and for selection. */
  id: (row: T) => string;
  columns: RecordColumn<T>[];
  /** The `sr-only` caption. A table with no name is an unnamed region. */
  caption: string;
  /** Singular; what the count and the pager call these rows. */
  noun: string;
  /** What the row opens, if anything. Omitted, the row is not a target. */
  open?: (row: T) => OpenSpec;
  /**
   * The name the row's own control announces. Defaults to the first column's
   * text where that is a string, because "Open Record 2" needs the record.
   */
  rowLabel?: (row: T) => string;
  /** The right-aligned actions column's contents. The column is always there. */
  actions?: (row: T) => React.ReactNode;
  /**
   * Bulk delete. The checkbox column is there either way; this decides
   * whether the bar under it offers a delete.
   */
  onBulkDelete?: (rows: T[]) => Promise<void> | void;
  /**
   * Anything else this table can do with a selection, such as bulk archive.
   * Each receives the ticked rows.
   */
  bulkActions?: {
    label: string;
    onAction: (rows: T[]) => Promise<void> | void;
    /** Confirm first. Omit for a reversible action. */
    confirm?: string;
  }[];
  /**
   * A selection the caller owns, for a page where the same ticks serve more
   * than this table: the documents browser shares one between the table view,
   * the cards view and the bar under both. Passing it means the caller renders
   * its own `BulkBar` too, since it is the thing that outlives the table.
   */
  selection?: BulkSelection<T>;
  /** What the bulk confirm dialog warns about. */
  bulkConsequence?: string;
  /** Whether a row may be deleted at all. Default: all of them. */
  deletable?: (row: T) => boolean;
  /** Marks the row a drawer or panel is currently showing. */
  isActive?: (row: T) => boolean;
  empty?: { title?: string; description?: string; icon?: React.ReactNode };
  /** Ten, unless this says otherwise (`PAGE_SIZE`). */
  pageSize?: number;
  /**
   * Whether this table sorts at all. **Off unless asked for**, which is the one
   * default here that runs the other way from the rest.
   *
   * The reason is a pairing rule rather than anything about sorting
   * (`docs/design.md` §2.3). Sorting's controls appear on a heading under the
   * pointer, and its only other UI is `SortToggle`, which lives in a
   * `FilterBar` that this component does not own and cannot render into. So a
   * table that sorted by default offered arrows with no way to turn them off
   * wherever its caller had no bar, which is exactly what the clause library
   * and the employees list did.
   *
   * Opt-in makes that unreachable instead of merely discouraged: a caller
   * passing this is a caller with somewhere to put the eye. Passing `sort` or
   * `onSortChange` implies it, since those callers demonstrably own one.
   */
  sortable?: boolean;
  /**
   * Sorting, where the caller owns it.
   *
   * The default is in-memory and generic, which is right for most lists. A
   * caller whose sort means something the rendered text does not say (the
   * clients list sorts through `sortClients`, a domain function that knows a
   * blank country reads as India) passes both of these and does the sorting
   * itself. **Not an opt-out of sorting**: an opt-out of this component
   * deciding what the order is.
   */
  sort?: { column: string; direction: 'asc' | 'desc' } | null;
  onSortChange?: (column: string) => void;
  /**
   * Whether the caller does its own sorting, even while the controls are
   * hidden.
   *
   * It exists for the `SortToggle` eye: hiding the controls keeps whatever
   * order was applied, so those lists pass `sort` with no `onSortChange`, and
   * without this flag that reads as "uncontrolled" and this component would
   * re-sort an already-sorted list by its rendered text.
   */
  externalSort?: boolean;
  /**
   * A hairline between every column.
   *
   * Off by default, and that is the standing house answer rather than
   * conservatism: a table whose every cell is boxed reads as a spreadsheet, and
   * the rules compete with the values for the eye. It earns its place once a
   * table is wide enough to scroll, where a row is no longer one glance and a
   * vertical rule is what stops the eye drifting a column sideways on the way
   * back. `docs/design.md` §2.3's rule is that the row separator does this job
   * alone until the table is too wide for that to be true.
   */
  dividers?: boolean;
  /**
   * The checkboxes and the row menu shown at rest, not only on hover (see
   * `useBulkSelect` and `RowActions`), for a table that asks for it.
   */
  controlsVisible?: boolean;
  /**
   * `table-layout: fixed` without resizing, for a table that must fit its card
   * and never scroll sideways.
   *
   * Under `auto` the browser treats every width as advisory, so columns given
   * percentages that add up to the whole card squeeze the checkbox and menu
   * columns to whatever is left (29px for a 40px checkbox, measured). Under
   * `fixed` the two px columns hold, each `width` share is a share of the
   * card, and a column with no `width` takes the remainder. So give every
   * column a percentage but one, and that one absorbs the difference.
   * Content that does not fit is clipped, which is why cells truncate.
   *
   * Columns that state a `size` get it in pixels, exactly as on a resizable
   * table, minus the handles: the widths are set by the call site and nobody
   * can drag them. `fit` and `minSize` still raise a column to its floor. A
   * table whose sizes add up past its card scrolls sideways, as a resizable
   * one does.
   */
  fixed?: boolean;
  /**
   * Under `fixed`: a column found cutting a value on the rows shown is widened
   * to show it; every other column keeps its `size`. Nothing here is
   * draggable: column resizing was removed from every table on 9 October 2026,
   * on request, because a handle let a column be dragged down to nothing.
   */
  fitTruncated?: boolean;
  /**
   * The actions column freezes against the **right** edge.
   *
   * Unfrozen, the actions column sits at the end of the row, which is right for
   * an ordinary table: a row is read left to right and its actions come after
   * it. On a table wide enough to scroll sideways that position stops being
   * reachable, because the end of the row is off screen exactly when the row is
   * longest. Freezing keeps it where a row's actions belong *and* keeps it on
   * screen, which pinning it to the left edge would not: there it arrives before
   * the name that says which row you are acting on.
   */
  actionsSticky?: boolean;
  /**
   * Columns can be dragged left and right by their headings.
   *
   * Press a heading and move: past a few pixels the press becomes a drag and the
   * column follows the pointer, dropping where it is released. Under that
   * threshold it is still a click, so a sortable heading still sorts.
   * Ctrl/alt with an arrow does the same from the keyboard.
   *
   * **The range is bounded at both ends, and neither bound is a rule anybody
   * has to remember.** The checkbox and actions columns are furniture this
   * component draws itself and are not in `columns`, so nothing can be dropped
   * outside them by construction. A **frozen** column is pinned and nothing may
   * be dropped before one, because freezing is what makes a column the one that
   * identifies the row, and a sticky `left` is a running sum of the frozen
   * widths before it.
   *
   * **The order is remembered per table**, keyed on `caption`. That is a
   * deliberate departure from `resizable`, whose widths are *not* persisted, and
   * the two are different in kind: a width is a momentary reading aid tied to
   * the value in front of you, while an order says which columns matter to you,
   * which does not change between visits. A stored order is always reconciled
   * against the current spec, so a column added later appears and a column
   * removed does not strand the rest.
   */
  reorderable?: boolean;
  /**
   * Paging, where the caller owns it, for the same reason: the clients list
   * pages a filtered set the manager computes. **The ten-row rule still
   * applies**; what moves is who slices.
   */
  paging?: {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    /** First row's index, for the "1-10 of 24" count. */
    start: number;
    /** How many rows there are in total, before paging. */
    total: number;
  };
}

/**
 * Column widths, and the drag that changes one.
 *
 * Pointer events rather than mouse events, so a trackpad, a pen and a touch
 * screen all work from one code path, and `setPointerCapture` so the drag
 * survives the pointer leaving the 5px handle — which it does immediately,
 * because the thing being dragged is a column edge that moves *with* the
 * pointer and the handle is narrower than a hand's jitter.
 *
 * The listeners go on the captured element rather than on `window`: capture
 * redirects every subsequent event for that pointer id to it, including the
 * `pointerup` that ends the drag, so there is nothing to clean up on unmount
 * beyond releasing capture, and a second pointer cannot start a second drag.
 *
 * **The floor is the column's own widest value, not a constant.** 64px is only
 * the fallback for a column nothing could be measured in. Dragging narrower
 * than the content is how a reader hides the data they were looking at, and
 * `truncate` then says a value was cut without saying what it was, which is the
 * worst of both: the column is unreadable *and* looks deliberate.
 *
 * It is measured off the cells already on the screen, so there is no hidden
 * measuring pass, no second render and no `ResizeObserver`, and it is read once
 * per drag rather than per frame because the content cannot change while the
 * pointer is down.
 *
 * Two things it deliberately does not do. It measures **the current page**, so
 * paging to a longer value can leave a column narrower than that value: truncation
 * stays as the backstop for exactly that, and for anything this misses. And it
 * imposes no ceiling: a wide column is a reader's choice and the table scrolls.
 */
const MIN_COLUMN_WIDTH = 64;

/**
 * The widest content in a column, from the cells the browser has already laid
 * out, in pixels including the cell's own padding.
 *
 * `data-col` is on every `<th>` and `<td>` this table draws. The header is
 * included on purpose: a heading with an icon, a word and a sort arrow is
 * routinely wider than the values under it, and a column dragged narrower than
 * its own name is no more readable than one dragged narrower than its data.
 *
 * **It measures the ink, and the two easier ways are both wrong.** Both were
 * tried and both look right in the one case anybody checks, so they are
 * recorded rather than merely avoided:
 *
 * - `scrollWidth` **floors at `clientWidth`**, so a cell whose text does not
 *   overflow reports the width it currently *has* rather than the width it
 *   needs. Measured here: a 119px cell holding 31px of text answered 119. Every
 *   column would have been pinned at whatever width it happened to have, and
 *   nothing could shrink at all. Only the one truncated cell answered honestly.
 * - A `Range` over the **cell's contents** measures the union of its children's
 *   boxes, and a block-level child fills its column, so a `<th>` answered its
 *   own width: 115 at 120px wide and 258 at 263px. That is a *ratchet* rather
 *   than a floor, since each measurement is taken from the width the last one
 *   produced, and a column would grow every time it was dragged.
 *
 * So the range is taken over the **text nodes**, whose rects are the glyphs
 * themselves, plus any `<svg>`, which is an icon with a real box and no text.
 * That number does not move when the column does (45.8 at both 120px and
 * 263px), which is the property the floor actually needs.
 *
 * Returns `null` where nothing could be measured (jsdom, an unmounted table),
 * which is what keeps the 64px fallback meaningful rather than clamping every
 * column to zero.
 */
function widestIn(table: HTMLElement | null, key: string): number | null {
  if (!table || typeof document.createRange !== 'function') return null;
  const range = document.createRange();
  // jsdom has `createRange` but no `getClientRects` on the result, so testing
  // for the constructor alone passes and then throws on the first row. Found by
  // `ClientManager.test.tsx` rather than reasoned about, which is the argument
  // for the check being on the method that is actually called.
  if (typeof range.getClientRects !== 'function') return null;
  let widest = 0;

  for (const cell of table.querySelectorAll<HTMLElement>(`[data-col="${CSS.escape(key)}"]`)) {
    // Left and right edges rather than a sum of widths: the parts of a cell sit
    // beside each other with gaps between them, and adding their widths would
    // lose the gaps while adding their rects would double-count nothing.
    let left = Infinity;
    let right = -Infinity;
    const note = (rect: DOMRect) => {
      if (rect.width === 0) return;
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
    };

    const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      // `sr-only` text is a real glyph box off in the corner of the screen, so
      // skipping blank nodes is not enough on its own; what saves this is that
      // an `sr-only` box is 1px and never the widest thing in a column.
      if (!node.textContent?.trim()) continue;
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) note(rect);
    }
    for (const icon of cell.querySelectorAll('svg')) note(icon.getBoundingClientRect());

    if (right <= left) continue;
    // The ink is a content figure and a width sets the border box, so the
    // padding and border come back on. Read per cell rather than assumed: a
    // heading and a body cell need not share a padding, and a caller's
    // `className` can change either.
    const box = getComputedStyle(cell);
    widest = Math.max(
      widest,
      right -
        left +
        parseFloat(box.paddingLeft) +
        parseFloat(box.paddingRight) +
        parseFloat(box.borderLeftWidth) +
        parseFloat(box.borderRightWidth),
    );
  }

  range.detach();
  // Rounded up, because a fractional pixel lost here is the one that
  // re-ellipsises the value this floor exists to protect.
  return widest > 0 ? Math.ceil(widest) : null;
}

/**
 * The two cells this component draws itself, in pixels.
 *
 * These are the **furniture columns**: the checkbox at the start of a row and
 * the actions at the end. Both are a fixed width on every table, and neither
 * resizes.
 *
 * They are written here rather than measured in the browser for the reason
 * `TableSkeleton` gives about geometry: a value read after layout is a value
 * that is wrong for the first frame, and the first frame is the one where a
 * frozen column visibly jumps into place. The numbers are what the content
 * resolves to: a 28px icon button with the cell's `px-2` either side, and a
 * checkbox with its `pl-3 pr-4`.
 *
 * **They used to be `w-0` and that was a bug under `table-layout: fixed`.**
 * `w-0` means "as narrow as the content allows" under `auto`, which is what
 * these columns want, and **zero** under `fixed`, where the browser sizes every
 * column from the header row's declared widths and never looks at the content.
 * So on a resizable table both columns collapsed and the first data cell
 * painted over the ticks.
 *
 * The width had been reaching them only through `actionsSticky` and the sticky
 * checkbox, which state it in pixels because a frozen column's `left` is a
 * running sum of known widths. That made it an accident of freezing rather than
 * a decision, which is why the clients list looked right and the items list did
 * not.
 *
 * **Stating it unconditionally is the rule, not just the smaller fix.** Neither
 * column holds a *value*: one holds a checkbox and one holds an icon button,
 * both of a size this component sets. There is nothing in either that can be
 * too long to read, so there is nothing for a reader to widen and no width for
 * them to prefer. A drag handle on a column whose contents cannot overflow
 * offers a choice with no outcome, and dragging it narrower only hides a
 * control. Neither is in `columns`, which is what `ResizeHandle` is rendered
 * from, so this is already true by construction and is recorded here so it
 * stays that way.
 */
const ACTIONS_WIDTH = 44;
const CHECKBOX_WIDTH = 40;


function useColumnWidths<T>(
  columns: RecordColumn<T>[],
  enabled: boolean,
  /** The rows actually on the screen, so paging re-measures what it shows. */
  rows: T[],
  /** Widen a column that cuts a value until it shows it (`fitTruncated`). */
  autoFit = false,
) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  // The table element, so a floor can be measured off the cells already drawn.
  const table = useRef<HTMLTableElement | null>(null);

  /**
   * The narrowest this column may go.
   *
   * Three things can set it, and the largest wins, because each is a separate
   * promise and satisfying one by breaking another is not satisfying it:
   *
   * - `minSize`, a width the call site states outright;
   * - `fit`, the column's own widest value, so a drag cannot cut a value the
   *   column has promised to show;
   * - `MIN_COLUMN_WIDTH`, the flat 64px below which a column can show neither a
   *   value nor its own resize handle.
   */
  const floorFor = (column: RecordColumn<T>) =>
    Math.max(
      MIN_COLUMN_WIDTH,
      column.minSize ?? 0,
      (column.fit ? widestIn(table.current, column.key) : null) ?? 0,
    );

  // A column removed from the spec keeps a stale width otherwise, and it comes
  // back the day a column of the same key returns with a different meaning.
  useEffect(() => {
    if (!enabled) return;
    setWidths((prev) => {
      const keys = new Set(columns.map((c) => c.key));
      const next = Object.fromEntries(
        Object.entries(prev).filter(([key]) => keys.has(key)),
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [columns, enabled]);

  /*
    A column that *starts* under its floor is raised to it, after layout.

    The drag floor alone does not cover this and the gap is the one actually
    seen: a `size` is a guess written at the call site against data the caller
    has not got, so a 190px Location column met "Bridge of Earn, United
    Kingdom" and clipped it before anybody touched a handle. Clamping only a
    drag protects a column the reader narrowed and leaves the one that arrived
    narrow, which is backwards, since the second is the one nobody chose. The
    same argument makes a `minSize` that only applied to dragging not a
    minimum at all.

    Measured rather than derived for the `fit` half, because the width of a
    string is a property of the font, and after paint rather than before,
    because there is nothing to measure until the cells exist. It is a layout
    effect so the correction lands in the same frame the reader sees:
    `useEffect` would paint the too-narrow column first and widen it visibly.

    Two things keep it from fighting the reader. It only ever *widens*, so a
    column dragged wider is untouched (and one dragged narrower cannot be under
    its floor already). And it runs on the rows, so paging to a longer value
    re-measures and grows a `fit` column rather than cutting it, which is the
    page-scope limit the measurement by itself has.
  */
  const floored = columns.some((column) => column.fit || column.minSize);
  useLayoutEffect(() => {
    if (!enabled || !floored) return;
    setWidths((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const column of columns) {
        if (!column.fit && !column.minSize) continue;
        const floor = floorFor(column);
        const current = next[column.key] ?? column.size;
        if (current !== undefined && current >= floor) continue;
        next[column.key] = floor;
        changed = true;
      }
      return changed ? next : prev;
    });
    // `floorFor` closes over refs only, so it is stable enough to leave out;
    // what this actually depends on is the columns and the rows under them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, enabled, floored, rows]);

  /*
    A column that cuts a value is widened by exactly what it cut; a column
    that fits is left alone.

    Measured as overflow rather than as text width (`widestIn`), because what
    clips is not always the cell: a badge or a copy control truncates inside
    its own padding, and the cell's overflow alone would miss it. So every
    element in the column is asked how much wider its content is than its box,
    and the largest answer is the shortfall. It runs again after it widens,
    since a nested box can need a second pass, and stops once nothing
    overflows. jsdom measures everything as zero, so it never fires there.
  */
  // Passes since the rows last changed. Bounded so that a box whose overflow
  // does not shrink as its column widens can cost a few pixels, never a render
  // loop. ponytail: three passes, enough for one nested box; raise if a cell
  // nests deeper.
  const fitPasses = useRef({ rows: null as T[] | null, count: 0 });
  useLayoutEffect(() => {
    if (!enabled || !autoFit || !table.current) return;
    if (fitPasses.current.rows !== rows) fitPasses.current = { rows, count: 0 };
    if (fitPasses.current.count >= 3) return;
    fitPasses.current.count += 1;
    const grow: Record<string, number> = {};
    for (const column of columns) {
      let short = 0;
      for (const cell of table.current.querySelectorAll<HTMLElement>(
        `[data-col="${CSS.escape(column.key)}"]`,
      )) {
        // A heading's own box is skipped: it positions things against itself
        // (a sort affordance, a drag mark), so the `<th>` can report overflow
        // that widening never removes. The label inside it is still measured.
        const boxes = cell.tagName === 'TH' ? [] : [cell];
        for (const el of [...boxes, ...cell.querySelectorAll<HTMLElement>('*')]) {
          const position = getComputedStyle(el).position;
          if (position === 'absolute' || position === 'fixed') continue;
          const over = el.scrollWidth - el.clientWidth;
          if (over > short) short = over;
        }
      }
      // A pixel of rounding is not a cut value.
      if (short > 1) grow[column.key] = Math.ceil(short);
    }
    const keys = Object.keys(grow);
    if (keys.length === 0) return;
    setWidths((prev) => {
      const next = { ...prev };
      for (const column of columns) {
        if (grow[column.key] === undefined) continue;
        next[column.key] = (prev[column.key] ?? column.size ?? MIN_COLUMN_WIDTH) + grow[column.key];
      }
      return next;
    });
  }, [columns, enabled, autoFit, rows, widths]);

  const width = (column: RecordColumn<T>) => widths[column.key] ?? column.size;


  return { width, table };
}

/**
 * How far a pointer travels before a press on a heading becomes a *drag*.
 *
 * A sortable heading is already a button, so the press that starts a reorder is
 * the same press that sorts. The threshold is what tells them apart: under it
 * the pointer-up is a click and the column sorts, over it the sort is suppressed
 * and the column moves. Five pixels is the usual figure and it is forgiving
 * enough that a hand shaking on a click does not reorder a table by accident.
 */
const DRAG_THRESHOLD = 5;

/** Where a reordered table remembers its order. One key per table. */
const ORDER_KEY = 'speclr:column-order';

/**
 * The order of the columns, and the drag that changes one.
 *
 * **What can move, and what cannot.** The checkbox and the actions columns are
 * *furniture*: this component draws them itself, they are not in `columns`, and
 * they bound the reorderable range at both ends by construction rather than by a
 * rule anybody has to remember. A **frozen** column does not move either, and
 * nothing may be dropped before one: freezing is what makes a column the one
 * that says which row you are on (see `sticky`), and a `left` offset is a
 * running sum of the frozen widths to its left, so a scrolled column landing
 * among them would break both the meaning and the arithmetic. So the moveable
 * range is "after the last frozen column, before the actions column", and
 * `firstMovable` is where it starts.
 *
 * **The order is remembered per table**, under the `caption` — which every table
 * already has, is required, and is unique by construction, since it is the
 * table's accessible name. That is the one departure from column *widths*, which
 * are deliberately not persisted; it was asked for, and it is defensible on
 * different grounds: a width is a momentary reading aid tied to the value you
 * are looking at now, while an order is a statement about which columns matter
 * to you, which does not change between visits.
 *
 * Three things follow from persisting it, and all three are failure modes rather
 * than features:
 *
 * - **A stored order is reconciled against the spec, never trusted.** Keys that
 *   no longer exist are dropped and keys that are new are appended, so a column
 *   added in a later release appears rather than vanishing for everyone who has
 *   ever dragged one. Same rule as the `?country=` parameter in onboarding: a
 *   stored value is somebody else's text.
 * - **Every storage access is wrapped.** Private browsing throws on read *and*
 *   on write, and a table that cannot remember an order must still draw one.
 * - **It is read on mount, not during render.** These lists server-render, and
 *   reading `localStorage` in a render would mismatch hydration. Same pattern,
 *   and the same reason, as `useShowSort`.
 */
function useColumnOrder<T>(
  columns: RecordColumn<T>[],
  enabled: boolean,
  /** The table's accessible name, which is what the stored order is keyed on. */
  caption: string,
) {
  /*
    `null` means "not yet read from storage", which is different from "no stored
    order" (an empty array would be). Until it is read the spec's own order is
    what renders, so the first paint is the server's and hydration matches.
  */
  const [stored, setStored] = useState<string[] | null>(null);
  /** The column being dragged, and whether the pointer has travelled far enough. */
  const [dragging, setDragging] = useState<{ key: string; over: string | null } | null>(
    null,
  );
  const drag = useRef<{ key: string; at: number; moved: boolean } | null>(null);
  /*
    **There is no drag-suppression flag here, and that is a measured decision
    rather than an oversight.**

    A reorderable heading is also a sort button, so the obvious worry is that a
    drag ends in a click that also sorts. One was built, and then probed in a
    real browser, which is the only place the answer exists:

    - a drag that ends on a *different* heading fires **no click at all**; the
      browser suppresses it when the pointer moves between elements;
    - a drag that is picked up and returned to its origin *does* fire a click,
      but on the `<th>`, never on the button inside it, because
      `setPointerCapture` retargets it.

    The sort handler is on that button. So in both cases it is never called, and
    a flag guarding it was a branch that could not be reached. It was removed
    rather than kept "for safety": an unreachable guard is one more thing to
    read, and its presence would have implied that this hazard is live when the
    capture already answers it. `e2e/record-table.spec.ts` pins both halves, so
    the day a browser changes its mind this goes red rather than silent.
  */

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(`${ORDER_KEY}:${caption}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setStored(JSON.parse(raw) as string[]);
    } catch {
      // Storage disabled, or a value some other version wrote. The spec's own
      // order is a correct answer, so there is nothing to recover from.
    }
  }, [caption, enabled]);

  /**
   * The first index a column may be dropped at: after every frozen column.
   *
   * Frozen columns are always the leading run, because `stickyLeft` sums their
   * widths in spec order, so this is a count rather than a search.
   */
  const firstMovable = useMemo(() => {
    let i = 0;
    while (i < columns.length && columns[i].sticky) i += 1;
    return i;
  }, [columns]);

  /**
   * The columns in the order they are drawn.
   *
   * Reconciled rather than applied: the stored list is filtered to keys that
   * still exist, and anything the spec has that the stored list does not is
   * appended. A frozen column is put back at the front whatever the stored order
   * says, so an order saved before a column became frozen cannot strand it.
   */
  const ordered = useMemo(() => {
    if (!enabled || !stored) return columns;
    const byKey = new Map(columns.map((column) => [column.key, column]));
    const seen = new Set<string>();
    const out: RecordColumn<T>[] = [];
    for (const key of stored) {
      const column = byKey.get(key);
      if (!column || seen.has(key)) continue;
      seen.add(key);
      out.push(column);
    }
    for (const column of columns) {
      if (!seen.has(column.key)) out.push(column);
    }
    // Frozen first, in the spec's own order, whatever was stored.
    return [...out.filter((c) => c.sticky), ...out.filter((c) => !c.sticky)];
  }, [columns, enabled, stored]);

  const commit = (next: RecordColumn<T>[]) => {
    const keys = next.map((column) => column.key);
    setStored(keys);
    try {
      localStorage.setItem(`${ORDER_KEY}:${caption}`, JSON.stringify(keys));
    } catch {
      // As above: the order still applies for this session, it just will not
      // survive a reload.
    }
  };

  /** Move `key` to where `over` currently sits, clamped past the frozen run. */
  const move = (key: string, over: string) => {
    const from = ordered.findIndex((column) => column.key === key);
    const to = ordered.findIndex((column) => column.key === over);
    if (from < 0 || to < 0 || from === to) return;
    if (from < firstMovable || to < firstMovable) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const onPointerDown = (column: RecordColumn<T>) => (event: React.PointerEvent) => {
    // Left button only, never a frozen column, and never the resize handle,
    // which stops the event before it reaches here.
    if (!enabled || event.button !== 0 || column.sticky) return;
    /*
      **Capture is deliberately not taken here**, and that is a bug fix rather
      than an omission. `setPointerCapture` redirects every subsequent event for
      that pointer to the captured element, and `click` is one of them: taking
      it on pointer-down meant the click landed on the `<th>` instead of the
      sort button inside it, so a plain click stopped sorting entirely. It
      looked like the drag-suppression flag misfiring and was not.

      So the press only *records* itself, and capture waits until the pointer
      has travelled far enough to be a drag (see `onPointerMove`), which is also
      the exact moment it starts being needed.
    */
    drag.current = { key: column.key, at: event.clientX, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const current = drag.current;
    if (!current) return;
    if (!current.moved) {
      if (Math.abs(event.clientX - current.at) < DRAG_THRESHOLD) return;
      current.moved = true;
      // Capture now, for the reason `onPointerDown` records: a drag needs the
      // pointer to keep reporting to this heading once it leaves it, and a
      // click does not need to be stolen from the button inside it.
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      setDragging({ key: current.key, over: null });
    }
    /*
      What is under the pointer, found by hit-testing rather than by arithmetic.

      `elementFromPoint` reads the layout the browser already has, so it is
      correct through a horizontal scroll, a frozen column painting over its
      neighbours and columns of unequal width, none of which a sum of widths
      would get right. `releasePointerCapture` is not needed for it because the
      capture redirects *events*, not hit-testing.
    */
    const under = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-col]');
    const over = under?.dataset.col ?? null;
    setDragging((prev) =>
      prev && prev.over !== over ? { ...prev, over } : prev,
    );
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const current = drag.current;
    drag.current = null;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    if (!current) return;
    /*
      **The flag outlives the drag, and it has to.** The browser fires `click`
      *after* `pointerup`, so a suppression read from `drag.current` would
      always be false by the time the sort handler asks: the drag it is asking
      about has just been cleared. So the answer is parked here and consumed by
      the click that follows, which is the only thing that reads it.
    */
    if (current.moved && dragging?.over) move(current.key, dragging.over);
    setDragging(null);
  };

  /**
   * The keyboard's way to do the same thing.
   *
   * A reorder that only answers a pointer is a reorder half the people using
   * this app cannot reach (WCAG 2.1.1), and unlike the resize handle there is no
   * separate control to hang it on: the heading *is* the control. So
   * ctrl/alt with an arrow moves the column, which keeps the bare arrows free
   * for the caret and the modifier free of the browser's own bindings.
   */
  const onKeyDown = (column: RecordColumn<T>) => (event: React.KeyboardEvent) => {
    if (!enabled || column.sticky) return;
    if (!event.altKey && !event.ctrlKey) return;
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const from = ordered.findIndex((c) => c.key === column.key);
    const to = from + step;
    // Clamped at both ends: past the frozen run on the left, past the last
    // column on the right. The furniture columns bound it by not being here.
    if (to < firstMovable || to >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  /** Whether a drag is in flight, so the header can say so. */
  const active = dragging?.key ?? null;
  const over = dragging?.over ?? null;
  return {
    ordered,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    active,
    over,
  };
}

/** What a column sorts on when it does not say. */
function defaultSortValue<T>(column: RecordColumn<T>, row: T): string | number {
  if (column.sortValue) return column.sortValue(row);
  const rendered = column.cell(row);
  return typeof rendered === 'string' || typeof rendered === 'number' ? rendered : '';
}

export default function RecordTable<T>({
  rows,
  id,
  columns: spec,
  caption,
  noun,
  open,
  rowLabel,
  actions,
  onBulkDelete,
  bulkActions,
  selection: controlledSelection,
  bulkConsequence = 'This cannot be undone.',
  deletable,
  isActive,
  empty,
  pageSize = PAGE_SIZE,
  sortable,
  sort: controlledSort,
  onSortChange: controlledSortChange,
  externalSort,
  dividers,
  controlsVisible,
  fixed,
  fitTruncated,
  actionsSticky,
  reorderable,
  paging,
}: RecordTableProps<T>) {
  const [ownSort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(
    null,
  );

  /*
    The order the columns are drawn in, which is the caller's spec until a
    reader drags one. **Everything below reads `columns` rather than the prop**,
    so the reorder is invisible to the rest of this component: the header, the
    cells, the sticky offsets and the resize measurement all walk one list.
  */
  const reorder = useColumnOrder(spec, reorderable ?? false, caption);
  const columns = reorder.ordered;

  const ownSortChange = useCallback((column: string) => {
    // Third press clears, rather than cycling between two orders forever: the
    // order the list arrived in is a real answer and has to be reachable.
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  }, []);

  // The caller's, where it has one. `controlledSortChange` is the tell: a
  // caller passing a handler is doing the sorting.
  const external = externalSort || controlledSortChange !== undefined;
  // Asking for sorting, or demonstrating you already own some, is the same
  // answer: a caller that passes an order has a control for it somewhere.
  const sorts = sortable || external || controlledSort !== undefined;
  const sort = external ? (controlledSort ?? null) : sorts ? ownSort : null;
  const onSortChange = external
    ? controlledSortChange
    : sorts
      ? ownSortChange
      : undefined;

  const sorted = useMemo(() => {
    // Already sorted by whoever owns it.
    if (external || !sort) return rows;
    const column = columns.find((c) => c.key === sort.column);
    if (!column) return rows;
    // A copy: sorting the caller's array in place would mutate their state.
    const next = [...rows].sort((a, b) => {
      const av = defaultSortValue(column, a);
      const bv = defaultSortValue(column, b);
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      // `localeCompare` with `numeric` so 'Record 9' sorts before 'Record 10',
      // which plain lexicographic order gets backwards on every numbered list.
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
    return sort.direction === 'asc' ? next : next.reverse();
  }, [rows, sort, columns, external]);

  const owned = usePagedRows(sorted, pageSize);
  // `paging` means the caller has already sliced `rows` to the page.
  const { page, pageCount, visible, setPage, start, total } = paging
    ? { ...paging, visible: sorted, setPage: paging.onPageChange }
    : { ...owned, total: rows.length };

  const ownSelection = useBulkSelect({
    rows: visible,
    id,
    deletable,
    alwaysVisible: controlsVisible,
  });
  const selection = controlledSelection ?? ownSelection;

  // `visible`, not `rows`: the measurement can only see the cells on the
  // screen, so the page turning is exactly when it has to run again.
  // Pixel widths from `size`, with or without the handles to change them.
  const sized = Boolean(fixed);
  const resize = useColumnWidths(columns, sized, visible, fitTruncated);

  /**
   * Where each frozen column sits, measured from the left edge.
   *
   * A sticky cell needs an absolute `left`, not "after the one before it": every
   * sticky cell in a row resolves against the same scrollport, so they would all
   * stack at 0 and overlap. So the offsets are a running sum of the widths of
   * the frozen columns to the left, which means **a frozen column must have a
   * known width** — under `table-layout: auto` there is no such thing, and this
   * is the second reason freezing and resizing travel together.
   *
   * The furniture columns come first and are measured rather than declared:
   * `ACTIONS_WIDTH` and `CHECKBOX_WIDTH` are the two cells this component draws
   * itself, so their widths are its to know.
   */
  const stickyLeft = useMemo(() => {
    const offsets: Record<string, number> = {};
    let running = CHECKBOX_WIDTH;
    for (const column of columns) {
      if (!column.sticky) continue;
      offsets[column.key] = running;
      running += resize.width(column) ?? MIN_COLUMN_WIDTH;
    }
    return offsets;
  }, [columns, resize]);

  /** Whether anything is frozen at all, which is what the row needs a fill for. */
  const frozen = actionsSticky || columns.some((c) => c.sticky);

  /**
   * Which column carries the row's click overlay: the first one that is not
   * frozen, since a sticky cell would trap it, and not truncating, since
   * `TruncCell` draws its own cell and hosts nothing. See the note at the call
   * site.
   *
   * Falls back to 0 where every column is one or the other, which is a table
   * with nothing to scroll and therefore nothing for the overlay to be clipped
   * away from.
   */
  const openerAt = Math.max(
    0,
    columns.findIndex((column) => !column.sticky && !column.trunc),
  );

  /*
    A frozen cell's own fill, and the one thing about freezing that is not
    obvious: a sticky cell has no background of its own, so the scrolled columns
    pass *underneath* it and read straight through the text.

    `bg-inherit` alone is not enough, and the failure is invisible at rest. The
    row's state tints are **translucent** (`hover:bg-muted/40`,
    `data-[state=selected]:bg-muted`), so inheriting one inherits its alpha: the
    frozen cell is opaque white until the pointer lands on the row and 40%
    opaque the moment it does, at which point every scrolled column reads
    straight through it. On a hovered row the email of that row appeared to sit
    on top of the frozen Name column, which is exactly backwards.

    The fix is a pseudo-element painting an opaque ground behind the cell's
    content, and **the tint has to ride on that same layer**. This is the part
    that took two goes. A negative-z pseudo-element paints above its parent's
    own background, so `before:bg-background` over `bg-inherit` covers the
    row's tint rather than sitting under it: the frozen columns came out flat
    white while the rest of the row lit up under the pointer, which is one row
    looking like two.

    So it takes two pseudo-elements, one per layer:

      ::before   bg-background, always      the opaque ground
      ::after    the row's tint, on state   composited over it

    which is exactly what the `<tr>` does for an unfrozen cell, performed one
    element down because that is where the opacity has to stop. A single layer
    cannot do both jobs: the tint is translucent by design, so painting it
    *instead of* the ground brings the bleed-through back, and painting the
    ground over it loses the tint.

    Both are `-z-10`, which keeps them below the cell's text and still above the
    scrolled columns, because they are inside this cell's own stacking context
    rather than the row's. `::after` is declared second, so it wins the tie.
  */
  const frozenCell = cn(
    'sticky z-20',
    "before:absolute before:inset-0 before:-z-10 before:bg-background before:content-['']",
    "after:absolute after:inset-0 after:-z-10 after:content-['']",
    'group-hover/row:after:bg-muted/40',
    'group-data-[state=selected]/row:after:bg-muted',
  );
  const frozenHead = 'sticky z-30 bg-sidebar';

  /** The divider, as one class, so the header and the body cannot disagree. */
  const divider = dividers ? 'border-r border-border/60 last:border-r-0' : undefined;

  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">{empty?.icon ?? <List />}</EmptyMedia>
          <EmptyTitle>{empty?.title ?? `No ${noun}s yet`}</EmptyTitle>
          {empty?.description ? (
            <EmptyDescription>{empty.description}</EmptyDescription>
          ) : null}
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    /*
      `min-w-0`, and it is the property that keeps a wide table inside whatever
      is holding it.

      A flex item's `min-width` is **`auto`**, not zero, so a box whose content
      cannot shrink floors the box around it. This root is routinely a flex item
      (the library's specimen stage, and any page laying a table out in a flex
      column), and `resizable` makes its content as wide as the columns add up
      to. Without this, a 1824px table in a 924px stage pushed the *stage* to
      1842 and every ancestor with it: the table ran out past its card, past the
      pane and under the edge of the window, which is the opposite of what
      `overflow-x-auto` on the container was asked to do. The container can only
      scroll what it is allowed to be narrower than.

      Same one-property lesson as `overflow-clip` on `AdminShell` and `min-h-0`
      on `UploadDropzone`'s preview (`CONTEXT.md` §5e), on the other axis. It
      costs a table that already fits nothing at all.
    */
    <div className="flex min-w-0 flex-col gap-2">
      <TableCard
        count={rowCountLabel(total, noun, start, visible.length)}
        pagination={
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            label={`${noun}s`}
          />
        }
      >
        <Table
          // What the resize floor is measured against. React 19 passes `ref`
          // through an ordinary props spread, so this lands on the `<table>`
          // itself rather than on the container `<div>` around it, which is
          // what `data-col` is queried within.
          ref={resize.table}
          className={cn(fixed && 'table-fixed')}
          // The sideways scrollport, and it only exists where a table is
          // actually wider than its card. `TableHeader` is `sticky top-0`
          // against the page's own scroll area (`AdminShell`), and an ancestor
          // with `overflow-x: auto` computes `overflow-y: auto` too, which makes
          // *this* the scrollport and pins the header to a box that never
          // scrolls vertically. So the header stops following the page. That is
          // the bug `ui/table.tsx` records having already been fixed once by
          // removing exactly this, and the reason it is opt-in rather than
          // standing: a table that needs sideways scroll trades a sticky header
          // for it, knowingly, at one call site.
          containerClassName={cn(sized && 'overflow-x-auto')}
        >
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              {/* Unconditional, on instruction: removing the column from one
                  table later is smaller and rarer work than remembering to add
                  it to each new one, and a list where some rows tick and others
                  do not is a list nobody trusts to be tickable. What varies is
                  the *bar*, which appears only where something can act. */}
              {frozen ? (
                <FrozenHead
                  className={cn(divider, frozenHead)}
                  left={0}
                  width={CHECKBOX_WIDTH}
                >
                  {selection.head}
                </FrozenHead>
              ) : (
                /*
                  The divider belongs on the checkbox column too, and it was
                  missing here: a dividered table drew a rule between every
                  pair of columns except the first, so the ticks and the first
                  value read as one cell. It only showed on an unfrozen table,
                  because the frozen branch above was already cloning the
                  class in.

                  Cloned rather than passed, for `FrozenHead`'s own reason:
                  `useBulkSelect` returns a finished `<TableHead>`, and a
                  wrapper `<td>` inside a `<td>` is invalid markup the browser
                  hoists out, silently adding a column.
                */
                addClass(selection.head, divider, CHECKBOX_WIDTH)
              )}
              {columns.map((column) => {
                const style = {
                  width: sized ? resize.width(column) : undefined,
                  left: column.sticky ? stickyLeft[column.key] : undefined,
                };
                /*
                  What a reorderable heading looks like while it is being moved.

                  Two marks, and they say different things. The column being
                  dragged goes translucent, which is the usual "this is the thing
                  in your hand". The column under the pointer takes a rule down
                  the edge the dragged column would land on, because a *fill*
                  there would read as a second selection and this is an insertion
                  point rather than a target. It is the `--primary` blue, which
                  is the one colour in this app that already means "this is where
                  your action goes" and is measured in `contrast.test.ts`.
                */
                const moving = reorderable && !column.sticky;
                const isDragged = reorder.active === column.key;
                const isOver =
                  reorder.active !== null &&
                  reorder.over === column.key &&
                  !isDragged &&
                  !column.sticky;
                const className = cn(
                  divider,
                  column.sticky && frozenHead,
                  // A frozen column's right edge is the seam the scrolled
                  // columns disappear under, and a hairline there is easily lost
                  // against a column rule of the same weight. A shadow is what
                  // says "there is more, that way", and it is drawn only on the
                  // last frozen column because two of them side by side would
                  // read as two seams.
                  column.sticky && isLastSticky(columns, column) && 'edge-r',
                  // `grab`, not `move`: the heading is picked up, and `move`
                  // is the four-way arrow, which promises a vertical axis this
                  // has none of.
                  // `touch-none` is what stops the browser claiming the gesture
                  // for a scroll before any `pointermove` arrives, which is the
                  // trap `ResizeHandle` records having fallen into.
                  moving && 'cursor-grab touch-none select-none',
                  isDragged && 'opacity-50',
                  isOver && 'edge-selected',
                );
                /*
                  The drag lives on the `<th>` rather than on the sort button
                  inside it, so the whole heading is the grip and a column with
                  sorting off is still draggable. `touch-none` is what stops the
                  browser claiming the gesture for a scroll before any
                  `pointermove` arrives, the same trap `ResizeHandle` records.
                */
                const dragProps = moving
                  ? {
                      onPointerDown: reorder.onPointerDown(column),
                      onPointerMove: reorder.onPointerMove,
                      onPointerUp: reorder.onPointerUp,
                      onKeyDown: reorder.onKeyDown(column),
                      /*
                        **Focusable, because otherwise the keyboard path does
                        not exist.** A `<th>` takes no focus by default, so the
                        key handler above would never fire and a reorderable
                        table would be a pointer-only control (WCAG 2.1.1). This
                        was caught by the browser test rather than reasoned
                        about: the handler was written, looked right, and was
                        unreachable.

                        `-1` rather than `0`: the heading already contains a sort
                        button and a resize handle, both of which are real tab
                        stops, and a third stop per column would triple the
                        length of a tab through the header for everyone,
                        including people who never reorder anything. `-1` keeps
                        it focusable programmatically and by click, which is
                        what the arrow shortcut needs, without adding to the tab
                        order.
                      */
                      tabIndex: -1,
                      // What the shortcut is, said where it applies. Without it
                      // the affordance is invisible: nothing on a heading says
                      // it can be moved.
                      title: `${column.label}: drag to move, or ctrl/alt with the arrow keys`,
                    }
                  : {};

                return column.headingHidden ? (
                  <TableHead
                    key={column.key}
                    data-col={column.key}
                    className={cn('w-0', column.width, className)}
                    style={style}
                    {...dragProps}
                  >
                    <span className="sr-only">{column.label}</span>
                  </TableHead>
                ) : (
                  <SortableHead
                    key={column.key}
                    column={column.key}
                    label={column.label}
                    icon={column.icon}
                    right={column.right}
                    width={column.width}
                    className={className}
                    style={style}
                    sort={sort}
                    // Sorting is on unless the column opts out. Passing no
                    // handler is what `SortableHead` reads as "not sortable",
                    // and it renders identically either way.
                    onSortChange={column.sortable === false ? undefined : onSortChange}
                    {...dragProps}
                  >
                  </SortableHead>
                );
              })}
              {/* The spare width, under `fixed`: a blank column with no width
                  of its own, so when the columns add up to less than the card
                  this takes the rest and every real column keeps its stated
                  size. Without it the browser stretches all of them in
                  proportion, the 40px checkbox included. When they add up to
                  more, it collapses to nothing and the table scrolls. */}
              {fixed ? <TableHead aria-hidden="true" className="p-0" /> : null}
              {/* Reserved whether or not a row has actions: a column that comes
                  and goes changes every other column's width as you page.

                  Frozen against the *right* edge when asked. The seam it casts
                  points the other way from a left-frozen column's, because what
                  disappears under it is to its left.

                  The width is stated always, never dragged. See the note on
                  `ACTIONS_WIDTH`: this column holds one icon button of a size
                  this component sets, so there is nothing in it that can be too
                  long to read and nothing for a reader to widen. */}
              <TableHead
                className={cn(
                  'text-right',
                  divider,
                  actionsSticky && frozenHead,
                  actionsSticky && 'edge-l',
                )}
                style={{ ...(actionsSticky ? { right: 0 } : {}), width: ACTIONS_WIDTH }}
              >
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const spec = open?.(row);
              const label = rowLabel?.(row) ?? firstText(columns, row);

              return (
                <TableRow
                  key={id(row)}
                  /*
                    `relative` whenever the row opens something, and it is
                    load-bearing twice over (§2.3). An absolutely positioned
                    overlay resolves against its nearest *positioned* ancestor:
                    a `relative` on a cell in between shrinks the target to that
                    column, and none at all lets it escape to the card and cover
                    every row, so a click on row 4 opens row 6. Both have
                    happened in this app. jsdom sees neither, so the real check
                    is `e2e/record-table.spec.ts`.
                  */
                  className={cn(
                    'group/row',
                    spec && 'relative cursor-pointer',
                    // What a frozen cell's `bg-inherit` resolves to at rest. A
                    // `<tr>` is transparent by default, so without this the
                    // frozen columns are transparent too and the scrolled ones
                    // read straight through them.
                    frozen && 'bg-background',
                  )}
                  // The house selected tint (`ui/table.tsx`), so a row a drawer
                  // is showing looks the same as a row that is ticked.
                  data-state={isActive?.(row) ? 'selected' : undefined}
                >
                  {frozen ? (
                    <FrozenCell
                      className={cn(divider, frozenCell)}
                      left={0}
                      width={CHECKBOX_WIDTH}
                    >
                      {selection.cell(row)}
                    </FrozenCell>
                  ) : (
                    addClass(selection.cell(row), divider, CHECKBOX_WIDTH)
                  )}
                  {columns.map((column, index) => {
                    const raw = column.cell(row);
                    const style = {
                      width: sized ? resize.width(column) : undefined,
                      left: column.sticky ? stickyLeft[column.key] : undefined,
                    };
                    const extra = cn(
                      divider,
                      column.sticky && frozenCell,
                      column.sticky &&
                        isLastSticky(columns, column) &&
                        'edge-r',
                      // `table-fixed` clips rather than widening, so a value
                      // longer than its column needs somewhere to stop. Every
                      // cell truncates under resizing, not only the ones that
                      // asked to: the alternative is a value sliced mid-glyph
                      // with no ellipsis to say it was.
                      sized && 'truncate',
                      // The hover scope an `iconOnly` `CopyValue` reveals
                      // against. Not safe for the click-to-copy form: the cell
                      // at `openerAt` holds the row's overlay, so it is
                      // "hovered" from anywhere on the row.
                      'group/cell',
                    );
                    /*
                      The row's own control lives in the first cell, so the
                      overlay it stretches covers the row from the start.

                      A link *wraps* that cell's value rather than sitting
                      beside it: rendering both printed the first column twice
                      ("AlphaAlpha"), which every role-based query missed
                      because the link's accessible name was right either way.
                      A button has no text of its own and is a bare overlay.
                    */
                    const content =
                      index === 0 && spec?.href && !column.ownOpener ? (
                        <RowOpener spec={spec} label={label}>
                          {raw}
                        </RowOpener>
                      ) : (
                        raw
                      );
                    /*
                      The overlay goes in the first **unfrozen** cell, not
                      simply the first one.

                      `position: sticky` is a positioned value, so a sticky cell
                      establishes the containing block for anything absolute
                      inside it. An overlay stretched from there is clipped to
                      that one column instead of spanning the row, which is the
                      "too small" half of the bug `e2e/record-table.spec.ts`
                      documents, reintroduced by freezing rather than by a stray
                      `relative`. Measured on the items table: a 100px frozen id
                      column left the other 1,200px of every row dead.

                      **That is true of the link's overlay too**, and it was
                      believed not to be. The named link stays in the first cell
                      wrapping its text, but its own `after:inset-0` resolves
                      against that cell the moment the cell is frozen, so it
                      covers the frozen cell and nothing else: with a frozen
                      first column every cell after it was dead, and
                      `e2e/documents-row.spec.ts` caught it. So a frozen table
                      gets a second, pointer-only anchor here in the first
                      unfrozen cell: the same href, out of the tab order and
                      hidden from assistive tech, because the row already has
                      one link to announce and two would be a duplicate tab
                      stop with one name. It is still a real anchor, so
                      middle-click and "copy link" work from any cell.
                    */
                    const opener =
                      index === openerAt && spec && !spec.href && !column.ownOpener ? (
                        <RowOpener spec={spec} label={label} />
                      ) : null;
                    // After the cell's value in DOM order, not before it: the
                    // overlay paints above in-flow content either way, and a
                    // measurement of the cell's ink that starts from its first
                    // child (`e2e/record-table.spec.ts` takes one) must find
                    // the value there, not an empty anchor.
                    const twin =
                      index === openerAt && openerAt > 0 && spec?.href ? (
                        <Link
                          href={spec.href}
                          aria-hidden="true"
                          tabIndex={-1}
                          className="absolute inset-0"
                        />
                      ) : null;

                    if (column.ownCell) {
                      /*
                        The column brought its own `<TableCell>`, so the
                        opener (a bare overlay) sits beside it rather than
                        inside it. Only reachable for a non-href row, since an
                        href wraps the value and there is no value here.

                        **This branch cannot be frozen or resized**, and the
                        reason is structural rather than an omission: the width,
                        the `left` and the divider all belong on the `<td>`, and
                        here the `<td>` is `CopyCell`'s or `DateCell`'s.

                        Under `table-layout: fixed` that is not a missing border,
                        it is a broken column: a cell with no width takes
                        whatever is left over and, having no `truncate` either,
                        paints its value across the column beside it. So it is
                        refused rather than merely documented. Both cells this
                        applies to have a value-only twin for exactly this case
                        (`CopyValue`, `DateValue`), which is the fix at the call
                        site.
                      */
                      if (process.env.NODE_ENV !== 'production' && sized) {
                        console.error(
                          `RecordTable: column "${column.key}" is ownCell on a fixed-width table, so it has no width and will paint over the column beside it. Use the value-only form (CopyValue, DateValue) in a plain cell instead.`,
                        );
                      }
                      return (
                        <Fragment key={column.key}>
                          {opener}
                          {content}
                          {twin}
                        </Fragment>
                      );
                    }

                    if (column.trunc) {
                      return (
                        <TruncCell
                          key={column.key}
                          data-col={column.key}
                          value={typeof content === 'string' ? content : ''}
                          width={typeof column.trunc === 'string' ? column.trunc : undefined}
                          className={cn(column.className, extra)}
                          style={style}
                        />
                      );
                    }

                    return (
                      <TableCell
                        key={column.key}
                        data-col={column.key}
                        className={cn(
                          column.right && 'text-right tabular-nums',
                          column.className,
                          extra,
                        )}
                        style={style}
                      >
                        {opener}
                        {content}
                        {twin}
                      </TableCell>
                    );
                  })}
                  {/* `relative` and after the overlay in DOM order, which is
                      what keeps these clickable above it.

                      When frozen, `relative` is what `sticky` already is, so
                      the two do not fight: `position: sticky` is itself a
                      positioned value and establishes the same containing
                      block, which is why `frozenCell` replaces it rather than
                      being added to it. */}
                  {fixed ? <TableCell aria-hidden="true" className="p-0" /> : null}
                  <TableCell
                    className={cn(
                      'py-0 text-right',
                      divider,
                      actionsSticky
                        ? cn(frozenCell, 'edge-l')
                        : 'relative',
                    )}
                    style={{ ...(actionsSticky ? { right: 0 } : {}), width: ACTIONS_WIDTH }}
                  >
                    {actions ? <RowActions alwaysVisible={controlsVisible}>{actions(row)}</RowActions> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>

      {/* Only for a selection this table owns. A caller that brought its own
          renders the bar itself, because the bar outlives the table.

          `BulkBar` renders nothing when nothing can act on the selection, so
          a table with neither a delete nor an action still ticks rows and
          simply has no bar. */}
      {controlledSelection ? null : (
        <BulkBar
          count={selection.count}
          noun={noun}
          onClear={selection.clear}
          onDelete={
            onBulkDelete
              ? async () => {
                  await onBulkDelete(selection.chosen);
                  selection.clear();
                }
              : undefined
          }
          consequence={bulkConsequence}
          actions={bulkActions?.map((action) => ({
            label: action.label,
            confirm: action.confirm,
            onAction: async () => {
              await action.onAction(selection.chosen);
              selection.clear();
            },
          }))}
        />
      )}
    </div>
  );
}

/**
 * The control that opens a row: a stretched `<Link>` where there is a URL, a
 * stretched `<button>` where there is not.
 *
 * Never a handler on the `<tr>`. A row is not a control, so a click handler
 * there is invisible to the keyboard and announces nothing, and an anchor is
 * what makes middle-click, cmd-click and "copy link address" work.
 */
function RowOpener({
  spec,
  label,
  children,
}: {
  spec: OpenSpec;
  label: string;
  /** The cell's own value, which the link wraps rather than duplicating. */
  children?: React.ReactNode;
}) {
  const stretch = "after:absolute after:inset-0 after:content-['']";

  if (spec.href) {
    return (
      <Link href={spec.href} className={stretch}>
        {children ?? label}
      </Link>
    );
  }

  /*
    The button *is* the overlay, rather than carrying one as a pseudo-element.
    A link wraps the cell's text, so `after:absolute inset-0` stretches from a
    box that exists; a button has no children, so the same classes left it
    `position: static` at 0x0, present in the DOM and impossible to click. It
    passed every unit test (jsdom dispatches at the element it was handed) and
    hung Playwright, which waits for a stable box that never arrives.
  */
  return (
    <button
      type="button"
      aria-label={`Open ${label}`}
      onClick={spec.onClick}
      className="absolute inset-0 cursor-pointer rounded-none focus-visible:-outline-offset-2"
    />
  );
}

/** Whether this is the rightmost frozen column, which is the one that casts the seam. */
function isLastSticky<T>(columns: RecordColumn<T>[], column: RecordColumn<T>): boolean {
  const sticky = columns.filter((c) => c.sticky);
  return sticky[sticky.length - 1]?.key === column.key;
}

/**
 * A frozen wrapper around a cell another component rendered.
 *
 * `useBulkSelect` returns a finished `<TableHead>` / `<TableCell>`, and freezing
 * it means putting `position: sticky`, a `left` and a width *on that element*,
 * which a parent cannot do. So this clones it. A wrapper `<td>` is not an
 * option: a `<td>` inside a `<td>` is invalid table markup and the browser
 * hoists it out, which silently adds a column.
 *
 * `cloneElement` is the honest tool for "add a class to an element I was
 * handed". The alternative is `useBulkSelect` growing props for a layout
 * concern that belongs to the table, and every other caller paying for it.
 */
function FrozenHead({
  children,
  className,
  left,
  width,
}: {
  children: React.ReactNode;
  className: string;
  left: number;
  width: number;
}) {
  return cloneCell(children, className, left, width);
}

function FrozenCell({
  children,
  className,
  left,
  width,
}: {
  children: React.ReactNode;
  className: string;
  left: number;
  width: number;
}) {
  return cloneCell(children, className, left, width);
}

/**
 * A class, and optionally a width, onto a cell another component rendered.
 *
 * `cloneCell`'s unfrozen half: the same reason it has to clone rather than
 * wrap, without the `left` that only a frozen cell needs. Passing neither
 * returns the node untouched, so a table with no dividers does not re-create an
 * element per row for the sake of an empty class.
 *
 * The width is for `table-layout: fixed`, where the `w-0` these cells carry
 * resolves to zero rather than to "as narrow as the content allows". See
 * `furnitureWidth`.
 */
function addClass(
  node: React.ReactNode,
  className: string | undefined,
  width?: number,
): React.ReactNode {
  if ((!className && width === undefined) || !isValidElement<{
    className?: string;
    style?: React.CSSProperties;
  }>(node)) {
    return node;
  }
  return cloneElement(node, {
    className: cn(node.props.className, className),
    ...(width === undefined ? {} : { style: { ...node.props.style, width } }),
  });
}

function cloneCell(
  node: React.ReactNode,
  className: string,
  left: number,
  width: number,
): React.ReactNode {
  if (!isValidElement<{ className?: string; style?: React.CSSProperties }>(node)) {
    return node;
  }
  return cloneElement(node, {
    className: cn(node.props.className, className),
    style: { ...node.props.style, left, width },
  });
}

/** The first column's text, which is what names a row when nothing else does. */
function firstText<T>(columns: RecordColumn<T>[], row: T): string {
  for (const column of columns) {
    const rendered = column.cell(row);
    if (typeof rendered === 'string') return rendered;
    if (typeof rendered === 'number') return String(rendered);
  }
  return '';
}
