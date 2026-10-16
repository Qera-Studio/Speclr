'use client';

import { useCallback, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableHead } from '@/components/ui/table';

/**
 * Row selection and bulk delete, shared by every list in the admin.
 *
 * One hook and two cells, rather than a component that owns the table: the
 * three lists here have different columns, different sorting and different
 * delete rules, and the only thing they share is *this*. Wrapping the table
 * would have meant three sets of props threaded through a wrapper to reach the
 * table underneath it.
 *
 * **The checkbox column is always in the layout, never only on hover.** It is
 * `opacity-0` until the row is hovered or focused, or the row is selected, or
 * anything is selected at all — the same mechanism `RowActions` uses at the
 * other end of the row. The header's select-all follows the same rule, hovering
 * on its own cell. Adding a column on hover would reflow every other
 * column sideways as the pointer moved down the list, and a list that shifts
 * under the cursor is a list where the wrong row gets clicked.
 *
 * **Only deletable rows get a checkbox.** A finalized document is immutable
 * (`CONTEXT.md` §4) and a client that has been on a document is refused
 * server-side, so `deletable` decides per row whether the cell is a control or
 * empty space. Offering a checkbox on a row that cannot be deleted is offering
 * an action the server will refuse, one confirm dialog later.
 *
 * **Deletes run one at a time and report what was refused.** There is no batch
 * server action, and adding one would mean a second delete path per record type
 * that has to re-derive the ownership and immutability checks the single one
 * already makes. Sequential calls reuse the checked path; the count that comes
 * back is what the bar reports.
 */
export interface BulkSelection<T> {
  /** The ids currently ticked, in no particular order. */
  selected: Set<string>;
  /** How many are ticked. Zero means the bar renders nothing. */
  count: number;
  /** The header cell: select-all across the rows currently shown. */
  head: React.ReactNode;
  /** One row's cell. Empty (but present) when the row cannot be deleted. */
  cell: (row: T) => React.ReactNode;
  /** Drop every tick, e.g. after a delete or when the filters change. */
  clear: () => void;
  /** The rows behind the ticked ids, for the bar's own delete. */
  chosen: T[];
}

export function useBulkSelect<T>({
  rows,
  id,
  deletable = () => true,
  alwaysVisible = false,
}: {
  /** The rows currently on screen. Select-all means these, not every row. */
  rows: T[];
  id: (row: T) => string;
  /** Whether this row may be deleted at all. Default: all of them. */
  deletable?: (row: T) => boolean;
  /**
   * Show every checkbox at rest rather than on approach. For a table where
   * selecting is the expected first move, not an occasional one.
   */
  alwaysVisible?: boolean;
}): BulkSelection<T> {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligible = useMemo(() => rows.filter(deletable), [rows, deletable]);

  // Ticks survive paging and filtering, so a selection is checked against the
  // rows in hand rather than trusted: an id ticked on page 1 and then filtered
  // away must not be deleted by a button the reader can no longer see the row
  // for.
  const chosen = useMemo(
    () => eligible.filter((row) => selected.has(id(row))),
    [eligible, selected, id],
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  const toggle = useCallback((key: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const allTicked = eligible.length > 0 && chosen.length === eligible.length;
  const someTicked = chosen.length > 0 && !allTicked;

  // `w-0` so the column takes exactly its content: this is furniture, and every
  // pixel it claims comes off the columns that carry the data.
  const head =
    eligible.length === 0 ? (
      <TableHead className="w-0" />
    ) : (
      /* `group/head` on the cell rather than `group/row` on the header row:
         the row lives in three different files and this is one. The hover
         target is the cell, so the box lights as the pointer arrives at it. */
      <TableHead className="group/head w-0 pl-3 pr-4">
        <Checkbox
          // `indeterminate` rather than a third visual state of our own: the
          // primitive already announces it as `aria-checked="mixed"`.
          checked={allTicked}
          indeterminate={someTicked}
          onCheckedChange={(on) =>
            setSelected(on ? new Set(eligible.map(id)) : new Set())
          }
          aria-label={allTicked ? 'Clear selection' : 'Select all rows'}
          className={
            // Same rule as a row: quiet until approached, and lit for as long
            // as a selection is under way, since at that point the column is
            // the thing being read and select-all is the next likely move.
            alwaysVisible || someTicked || allTicked
              ? 'align-middle'
              : 'align-middle opacity-0 transition-opacity group-hover/head:opacity-100 focus-visible:opacity-100'
          }
        />
      </TableHead>
    );

  const cell = (row: T) => {
    const key = id(row);
    if (!deletable(row)) {
      // Present, empty, and the same width: the column has to line up whether
      // or not this particular row offers the control.
      return <TableCell className="w-0 pl-3 pr-4" />;
    }
    const ticked = selected.has(key);
    return (
      <TableCell
        // `relative` with a stacking context of its own. The row is a stretched
        // link whose `after` overlay covers every cell; without this the
        // checkbox is under it and a click opens the document instead of
        // ticking the row. `z-10` rather than DOM order, because this cell is
        // the *first* one and the overlay is painted from a later sibling.
        className="relative z-10 w-0 pl-3 pr-4"
      >
        <Checkbox
          checked={ticked}
          onCheckedChange={(on) => toggle(key, on)}
          aria-label={ticked ? 'Deselect row' : 'Select row'}
          className={
            // Quiet until approached, lit once ticked or once a selection is
            // under way — at that point the column is the thing being read.
            alwaysVisible || ticked || selected.size > 0
              ? 'align-middle'
              : 'align-middle opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100'
          }
        />
      </TableCell>
    );
  };

  return { selected, count: chosen.length, head, cell, clear, chosen };
}

/**
 * The bar that appears once something is ticked: the count on the left, the
 * delete on the right, outside the table.
 *
 * It renders nothing at zero rather than sitting there empty, and it is not
 * absolutely positioned: a bar that floats over the last rows hides the very
 * things being deleted.
 */
/**
 * Something a table can do with a selection, besides delete.
 *
 * Delete keeps its own slot in the bar because it is the destructive one and
 * is drawn as such. Everything else is an ordinary button: bulk archive on the
 * clause library is the first, and it deliberately does *not* look like
 * delete, because archiving is reversible.
 */
export interface BulkAction {
  label: string;
  onAction: () => Promise<void> | void;
  /**
   * What a confirm dialog should warn about, or absent for an action that
   * needs no confirming. Reversible actions should generally omit it:
   * confirming one teaches people to click through the dialog that guards the
   * irreversible one.
   */
  confirm?: string;
}

export function BulkBar({
  count,
  noun,
  onDelete,
  onClear,
  consequence,
  actions = [],
}: {
  count: number;
  /** Singular; pluralised here. */
  noun: string;
  /** Absent for a table whose selection does something other than delete. */
  onDelete?: () => Promise<void> | void;
  onClear: () => void;
  /** What the confirm dialog warns about, per record type. */
  consequence?: string;
  /** Anything else this table can do with a selection. */
  actions?: BulkAction[];
}) {
  const [busy, setBusy] = useState(false);
  if (count === 0) return null;
  // Nothing can act on the selection, so there is nothing to put in a bar.
  if (!onDelete && actions.length === 0) return null;

  const label = `${count} ${noun}${count === 1 ? '' : 's'} selected`;
  const counted = `${count} ${noun}${count === 1 ? '' : 's'}`;

  return (
    <div
      // `role="status"` so the count is announced as it changes: a keyboard
      // user ticking rows gets no other signal that the bar exists.
      role="status"
      className="flex items-center justify-end gap-3 text-meta text-muted-foreground"
    >
      <span>{label}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
      {actions.map((action) => (
        <BulkActionButton
          key={action.label}
          action={action}
          counted={counted}
          busy={busy}
          setBusy={setBusy}
        />
      ))}
      {onDelete ? (
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" size="sm" disabled={busy}>
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </Button>
          }
          title={`Delete ${counted}`}
          consequence={consequence}
          confirmLabel={`Delete ${counted}`}
          destructive
          onConfirm={async () => {
            setBusy(true);
            await onDelete();
            setBusy(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** One non-destructive bulk action, confirmed only where it asks to be. */
function BulkActionButton({
  action,
  counted,
  busy,
  setBusy,
}: {
  action: BulkAction;
  counted: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) {
  const run = async () => {
    setBusy(true);
    await action.onAction();
    setBusy(false);
  };

  if (!action.confirm) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={run}>
        {action.label}
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="secondary" size="sm" disabled={busy}>
          {action.label}
        </Button>
      }
      title={`${action.label} ${counted}`}
      consequence={action.confirm}
      confirmLabel={`${action.label} ${counted}`}
      onConfirm={run}
    />
  );
}
