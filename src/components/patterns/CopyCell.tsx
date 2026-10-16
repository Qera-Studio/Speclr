'use client';

import { CheckCheck, Copy } from 'lucide-react';
import { CopyAction as CopyButton } from '@/components/patterns/IconAction';
import { useCopy } from '@/lib/useCopy';
import { TableCell } from '@/components/ui/table';
import { NIL, cn } from '@/lib/utils';

/**
 * A table cell whose value is one somebody retypes into something else.
 *
 * An invoice number goes into a bank transfer reference, a phone number into a
 * dialler, an email into a mail client. Every one of those is a transcription,
 * and a transcribed identifier is a wrong identifier eventually.
 *
 * **The value itself is the button.** Clicking the phone number copies the
 * phone number, which is what anybody tries first; the icon is the affordance
 * saying so, not the only target. It is revealed on hovering *this cell*, not
 * the row, so a row under the cursor does not sprout a copy icon in every
 * column at once.
 *
 * Reveal is `opacity`, never `display: none`, so the control stays in the tab
 * order for anyone not using a mouse, and it holds its slot either way so the
 * cell does not change width under the cursor. Same rule as `RowActions`.
 *
 * No `title`. The browser's native tooltip would repeat the text it is sitting
 * on, in the operating system's styling rather than the app's, half a second
 * after the cursor stops. The icon already says what the click does, and the
 * accessible name says it to a screen reader.
 *
 * `iconOnly` is for the one case where the printed value already has a job when
 * clicked: the documents list prints a link that opens the document. There the
 * icon is the copy target and the value keeps its own behaviour. `display` on
 * its own does *not* mean that — a phone number printed grouped while E.164 is
 * copied is still click-to-copy, and reading `display` as "not clickable" is
 * exactly the bug this note exists to stop coming back.
 */
export function CopyCell({
  value,
  label,
  display,
  width,
  iconOnly = false,
  className,
}: {
  value: string | null | undefined;
  /** Tooltip and accessible name, e.g. "Copy invoice number". */
  label: string;
  /** What to print, when that differs from what to copy. */
  display?: React.ReactNode;
  /** Cap the printed value at this CSS length and ellipsise it. See `TruncCell`. */
  width?: string;
  /** The printed value is itself interactive, so only the icon copies. */
  iconOnly?: boolean;
  className?: string;
}) {
  if (!value) {
    return <TableCell className={className}>{display ?? NIL}</TableCell>;
  }

  return (
    /*
      Deliberately *not* `relative`, and that is a bug fix rather than a tidy-up.

      A stretched row link is an `::after` with `inset-0`, and an absolutely
      positioned box resolves against its nearest *positioned* ancestor. The
      documents list prints its link inside this cell, so a `relative` here made
      the cell the containing block and the overlay covered one column instead
      of the row: clicking the number opened the document and clicking anywhere
      else on the row did nothing. Confirmed in a browser, where the Type and
      Date cells hit-tested to themselves rather than to the anchor.

      Nothing is lost by dropping it. `CopyValue` carries its own `relative
      z-10`, which is what actually keeps it above the overlay, and every table
      using this cell puts `relative` on the row.
    */
    <TableCell className={cn('group/cell', className)}>
      <CopyValue
        value={value}
        label={label}
        display={display}
        width={width}
        iconOnly={iconOnly}
      />
    </TableCell>
  );
}

/**
 * The same control, without the cell around it.
 *
 * `CopyCell` brings its own `<TableCell>`, which is right for most tables and
 * impossible for two of them: a **frozen** or **resized** column needs the
 * width, the `left` and the divider on that `<td>`, and a cell the column did
 * not render is a cell it cannot put them on (`RecordTable`'s `ownCell` note).
 * The clients table wanted both a copyable email and a resizable one, and that
 * is the rule-1 second consumer, so the control moved out.
 *
 * The click-to-copy form reveals against its own button, which covers the cell.
 * Only `iconOnly` still needs `group/cell` on whoever renders the cell.
 */
export function CopyValue({
  value,
  label,
  display,
  width,
  iconOnly = false,
}: {
  value: string;
  label: string;
  display?: React.ReactNode;
  width?: string;
  iconOnly?: boolean;
}) {
  const { copied, copy } = useCopy(value);

  if (iconOnly) {
    return (
      <span className="inline-flex max-w-full items-center gap-1">
        <span className="truncate" style={width ? { maxWidth: width } : undefined}>
          {display ?? value}
        </span>
        <CopyButton
          value={value}
          label={label}
          className="relative z-10 size-5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/cell:opacity-100"
        />
      </span>
    );
  }

  const Icon = copied ? CheckCheck : Copy;

  return (
    /*
      Full width, with the icon pushed to the far end rather than sitting
      against the text.

      Beside the value the icon lands at a different x on every row, because it
      follows the length of whatever it is copying, so a column of them is a
      ragged edge that the eye has to re-find per row. At the cell's edge they
      line up, which is what makes "this column is copyable" readable as a
      property of the column instead of a thing that happens to each value.

      It also stops the icon *moving the text*: appearing beside a value that
      fills its column used to push the truncation point left, so the value
      re-ellipsised under the cursor.
    */
    /*
      The reveal keys on this button's own hover, not the cell's, and the
      button is grown to the cell's edges so the whole cell is still the hover
      and click target. Sideways it takes over `TableCell`'s `px-2` with a
      negative margin, on its own box: a pseudo-element hanging off the sides
      reads as overflow to `RecordTable`'s `fitTruncated`, which then widens
      the column. Vertically the `before:` box covers half of what the 44px
      row (`h-11`) leaves around the button, since `100%` on an inset is the
      button's own height. Exact, so it never reaches into the next row.

      `group-hover/cell` was the bug. When the first column is frozen,
      `RecordTable` puts the row's stretched overlay *inside the next cell*, so
      hovering anywhere on the row hovers a descendant of that cell, and the
      icon lit up on every hover of the row. The pseudo-element sits on the
      button's `z-10`, above the overlay, so the cell's own geometry wins.
    */
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className="group/copy relative z-10 -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-1 rounded-md px-2 text-left before:absolute before:inset-x-0 before:-inset-y-[calc((2.75rem-100%)/2)] before:content-[''] focus-ring focus-visible:outline-none"
    >
      <span className="truncate" style={width ? { maxWidth: width } : undefined}>
        {display ?? value}
      </span>
      <Icon
        aria-hidden="true"
        className={cn(
          // `ml-auto` is what puts it at the edge; `shrink-0` keeps it from
          // being squeezed out by a long value, which is the case it is most
          // needed in.
          'ml-auto size-3.5 shrink-0 transition-opacity',
          copied
            ? 'text-primary opacity-100'
            : 'text-muted-foreground opacity-0 group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100',
        )}
      />
    </button>
  );
}
