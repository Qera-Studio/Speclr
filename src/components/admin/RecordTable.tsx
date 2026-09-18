'use client';

import { Fragment, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { List } from 'lucide-react';
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
import { BulkBar, useBulkSelect, type BulkSelection } from './BulkSelect';
import { SortableHead, TableCard, TruncCell } from './Page';
import { RowActions } from './RowActions';

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

/** What a column sorts on when it does not say. */
function defaultSortValue<T>(column: RecordColumn<T>, row: T): string | number {
  if (column.sortValue) return column.sortValue(row);
  const rendered = column.cell(row);
  return typeof rendered === 'string' || typeof rendered === 'number' ? rendered : '';
}

export default function RecordTable<T>({
  rows,
  id,
  columns,
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
  paging,
}: RecordTableProps<T>) {
  const [ownSort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(
    null,
  );

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

  const ownSelection = useBulkSelect({ rows: visible, id, deletable });
  const selection = controlledSelection ?? ownSelection;

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
    <div className="flex flex-col gap-2">
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
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              {/* Unconditional, on instruction: removing the column from one
                  table later is smaller and rarer work than remembering to add
                  it to each new one, and a list where some rows tick and others
                  do not is a list nobody trusts to be tickable. What varies is
                  the *bar*, which appears only where something can act. */}
              {selection.head}
              {columns.map((column) =>
                column.headingHidden ? (
                  <TableHead key={column.key} className={cn('w-0', column.width)}>
                    <span className="sr-only">{column.label}</span>
                  </TableHead>
                ) : (
                  <SortableHead
                    key={column.key}
                    column={column.key}
                    label={column.label}
                    right={column.right}
                    width={column.width}
                    sort={sort}
                    // Sorting is on unless the column opts out. Passing no
                    // handler is what `SortableHead` reads as "not sortable",
                    // and it renders identically either way.
                    onSortChange={column.sortable === false ? undefined : onSortChange}
                  />
                ),
              )}
              {/* Reserved whether or not a row has actions: a column that comes
                  and goes changes every other column's width as you page. */}
              <TableHead className="w-0 text-right">
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
                  className={cn('group/row', spec && 'relative cursor-pointer')}
                  // The house selected tint (`ui/table.tsx`), so a row a drawer
                  // is showing looks the same as a row that is ticked.
                  data-state={isActive?.(row) ? 'selected' : undefined}
                >
                  {selection.cell(row)}
                  {columns.map((column, index) => {
                    const raw = column.cell(row);
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
                    const opener =
                      index === 0 && spec && !spec.href && !column.ownOpener ? (
                        <RowOpener spec={spec} label={label} />
                      ) : null;

                    if (column.ownCell) {
                      // The column brought its own `<TableCell>`, so the
                      // opener (a bare overlay) sits beside it rather than
                      // inside it. Only reachable for a non-href row, since an
                      // href wraps the value and there is no value here.
                      return (
                        <Fragment key={column.key}>
                          {opener}
                          {content}
                        </Fragment>
                      );
                    }

                    if (column.trunc) {
                      return (
                        <TruncCell
                          key={column.key}
                          value={typeof content === 'string' ? content : ''}
                          width={typeof column.trunc === 'string' ? column.trunc : undefined}
                          className={column.className}
                        />
                      );
                    }

                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.right && 'text-right tabular-nums',
                          column.className,
                        )}
                      >
                        {opener}
                        {content}
                      </TableCell>
                    );
                  })}
                  {/* `relative` and after the overlay in DOM order, which is
                      what keeps these clickable above it. */}
                  <TableCell className="relative py-0 text-right">
                    {actions ? <RowActions>{actions(row)}</RowActions> : null}
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

/** The first column's text, which is what names a row when nothing else does. */
function firstText<T>(columns: RecordColumn<T>[], row: T): string {
  for (const column of columns) {
    const rendered = column.cell(row);
    if (typeof rendered === 'string') return rendered;
    if (typeof rendered === 'number') return String(rendered);
  }
  return '';
}
