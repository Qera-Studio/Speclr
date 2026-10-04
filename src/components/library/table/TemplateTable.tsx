'use client';

import { useState } from 'react';
import { Archive, FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import RecordTable, { type RecordColumn } from '@/components/admin/RecordTable';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TEMPLATE_COLUMNS } from './columns';
import { TEMPLATE_ROWS, type TemplateRow } from './rows';

/**
 * **The template table: the call site a new table is copied from.**
 *
 * `RecordTable` is the component; this is the *shape of a correct call to it*,
 * with one of every column kind (`columns.tsx`) over rows built to exercise
 * each (`rows.ts`). Everything below is either a rule every table follows or a
 * decision each table makes for itself, and which of the two it is is said
 * beside it.
 *
 * ---
 *
 * **What is fixed. These are not props, and a new table does not get to
 * reconsider them** (`docs/design.md` §2.3, enforced by
 * `design-system.test.ts`):
 *
 * 1. **A list of records is a `RecordTable`.** Never the table primitives
 *    assembled by hand: a table body written outside `ui/` and `RecordTable`
 *    fails the build. (Stated in prose rather than in markup here, because
 *    `design-system.test.ts` greps raw source and cannot tell a rule quoted in
 *    a comment from a rule broken in a component. That is the test being blunt
 *    in the right direction, and it caught this file.)
 * 2. **Ten rows a page**, the count and the pager in the card footer.
 * 3. **An `sr-only` caption.** A table with no name is an unnamed region, and
 *    it is one string.
 * 4. **A row-select checkbox column, always**, even where nothing can act on a
 *    selection. A list where some rows tick and others do not is a list nobody
 *    trusts to be tickable. What is conditional is the *bar* underneath.
 * 5. **A reserved actions column**, whether or not a row has actions, or every
 *    other column changes width as you page.
 * 6. **An empty state.** A table that renders zero rows and nothing else looks
 *    broken.
 * 7. **The row opens its record as a real stretched `<Link>`**, never an
 *    `onClick` on the `<tr>`: middle-click, ⌘-click and the keyboard all have
 *    to work.
 * 8. **A value is formatted on the way out**, never printed as stored: money
 *    through `formatMoney`, dates through `DateValue`, phones through
 *    `formatPhoneForDisplay`.
 * 9. **No zebra striping, no row tinting by status.** Both fight the hover and
 *    selected states, which carry actual meaning. A status is a badge in its
 *    own column.
 *
 * **What each table decides for itself**, and every one of these is a visible
 * prop a reviewer can ask about:
 *
 * | Decision | Prop | The question it answers |
 * |---|---|---|
 * | Which columns | `columns` | What a row is read for. Six is the budget. |
 * | Whether it sorts | `sortable` | Only with a `SortToggle` in the same folder. |
 * | Who sorts | `sort` / `onSortChange` | This table, or the caller's own domain function. |
 * | Whether it scrolls sideways | `resizable` | See the trade below. |
 * | Whether columns can be moved | `reorderable` | Drag a heading. The order persists per table. |
 * | What is frozen | `sticky` / `actionsSticky` | Only worth it on a table that scrolls. |
 * | Column rules | `dividers` | Only worth it on a table that scrolls. |
 * | Row actions | `actions` | One menu, or nothing. |
 * | Bulk actions | `onBulkDelete` / `bulkActions` | What the bar offers. |
 * | Page size | `pageSize` | Ten unless there is a reason. |
 *
 * **The one real trade, stated once.** `resizable` switches the table to
 * `table-layout: fixed` and puts an `overflow-x: auto` container around it.
 * Three things follow and they are a package, not a menu:
 *
 * - every column must state a `size`, and content that does not fit is
 *   **clipped** rather than widening its column, so `truncate` goes on every
 *   cell;
 * - a frozen column becomes possible, because freezing needs known widths;
 * - **the sticky header is lost**, because a horizontally scrolling container
 *   becomes the scrollport for both axes, so the column names no longer follow
 *   the page down.
 *
 * A table narrow enough to read in one glance should take none of it.
 *
 * **Reordering (`reorderable`) is the one addition that is not part of that
 * package**, and it composes with any of it: press a heading and move to drag
 * the column, ctrl/alt with an arrow to do it from the keyboard. Its bounds are
 * structural rather than remembered, which is the reason it is safe to turn on
 * anywhere: the checkbox and actions columns are furniture that is not in
 * `columns`, so nothing can land outside them, and a frozen column is pinned
 * with nothing dropping before it. The order is remembered per table, keyed on
 * `caption`, which is the one thing here that outlives the page.
 */
export default function TemplateTable({
  columns = TEMPLATE_COLUMNS,
  rows = TEMPLATE_ROWS,
  ...table
}: {
  /** The columns this specimen shows. Defaults to all eleven. */
  columns?: RecordColumn<TemplateRow>[];
  rows?: TemplateRow[];
  /** The wide package: fixed layout, sideways scroll, frozen edges, rules. */
  resizable?: boolean;
  dividers?: boolean;
  actionsSticky?: boolean;
  sortable?: boolean;
  /** Headings can be dragged left and right to reorder the columns. */
  reorderable?: boolean;
  /** Whether rows carry a menu. Off shows the reserved-but-empty column. */
  withActions?: boolean;
  /** Whether the bar offers anything. Off shows selection with no bar. */
  withBulk?: boolean;
  pageSize?: number;
}) {
  /*
    **`sortable` defaults to off, and that is the template teaching the rule
    rather than a conservative choice.** A copied table that sorted out of the
    box would put arrows on hover wherever its caller had no `SortToggle`, which
    is the pairing §2.3 forbids and exactly what the clause library and the
    employees list shipped. The specimen turns it on from a real eye.
  */
  const {
    withActions = true,
    withBulk = true,
    sortable = false,
    ...rest
  } = table;

  return (
    <RecordTable
      rows={rows}
      /*
        Stable identity. React keys and the selection both read it, so it has to
        be the record's own id and never an array index: an index moves when the
        list is sorted or filtered, and a ticked row then follows the position
        rather than the record.
      */
      id={(row) => row.id}
      /*
        Singular. The count and the pager pluralise it themselves
        (`rowCountLabel`), so "records" here would print "24 recordss".
      */
      noun="record"
      /*
        The `sr-only` caption: what this table *is*, not what page it is on. It
        is the table's accessible name, so "Saved records" is right and "Table"
        is not.
      */
      caption="Template records"
      /*
        What the row opens. A URL wherever there is one, because that is what
        keeps the row a real anchor. `onClick` is for a row that opens something
        with no URL, such as a drawer, and `RecordTable` draws a stretched
        `<button>` for it rather than a handler on the `<tr>`.

        Omitting this entirely is a valid answer: a table whose rows go nowhere
        simply is not a target.
      */
      open={(row) => ({ href: `/preview/record-table#${row.id}` })}
      sortable={sortable}
      columns={columns}
      /*
        Row actions: **one menu, not three icon buttons.** Three targets 2px
        apart where the difference between "archive" and "delete" is a glyph at
        16px is a mis-hit that deletes the wrong row. One trigger and a menu of
        named items replaces a guess with a word.

        What it costs, stated: every action is two clicks instead of one, and
        the icons no longer say at a glance which actions a row has. That is the
        right trade on a table wide enough to scroll, where the actions column
        is frozen and narrow, and arguably the wrong one on a short table with a
        single action.
      */
      actions={withActions ? (row) => <TemplateRowMenu row={row} /> : undefined}
      onBulkDelete={withBulk ? async () => {} : undefined}
      bulkConsequence="This permanently removes these records. This cannot be undone."
      /*
        The empty state, which is a real state rather than an absence (§2.5). An
        icon, what is not here, and what to do about it. A table that renders
        zero rows and nothing else looks broken.
      */
      empty={{
        icon: <FileText />,
        title: 'No records yet',
        description: 'Add your first record to see it listed here.',
      }}
      {...rest}
    />
  );
}

/**
 * The row's actions, behind one button.
 *
 * Three things about it are rules rather than this table's taste:
 *
 * - **The trigger names the row, not just the action.** A screen reader reaches
 *   this button out of the table's visual context, where "More" could be about
 *   anything on the page. `design-system.test.ts` fails an icon-only button
 *   that announces nothing, and it scans a window of source around each one,
 *   so the rule is described here in prose rather than quoted as markup.
 * - **The dialog is a sibling of the menu, never inside it.** An `AlertDialog`
 *   rendered within a `DropdownMenuItem` unmounts with the menu the instant the
 *   item is chosen, so it never opens. Hoisting it to component state is what
 *   makes it survive.
 * - **`AlertDialog`, not `Dialog`, for anything destructive** (`AGENTS.md`),
 *   and `variant="destructive"` rather than a red class: the primitive already
 *   carries the token, the focus tint and the icon colour.
 *
 * **Delete confirms and archive does not.** Archiving takes nothing away and
 * the menu offers the way back on the next open; confirming a reversible action
 * is how people learn to click through the dialog guarding the irreversible one.
 */
function TemplateRowMenu({ row }: { row: TemplateRow }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`More actions for ${row.name}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            />
          }
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        {/* Below the trigger and aligned to its right edge, so the menu grows
            inward from the edge rather than off the card, and does not cover
            the row's own data on the way. */}
        <DropdownMenuContent align="end" side="bottom" className="min-w-40">
          <DropdownMenuItem>
            <Pencil aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Archive aria-hidden />
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {row.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
