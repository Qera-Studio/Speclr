'use client';

import { CheckCheck, Copy } from 'lucide-react';
import { CopyButton, useCopy } from '@/components/ui/copy-button';
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
  const { copied, copy } = useCopy(value ?? '');

  if (!value) {
    return <TableCell className={className}>{display ?? NIL}</TableCell>;
  }

  const Icon = copied ? CheckCheck : Copy;

  return (
    // `relative` so the contents paint above a stretched row link's overlay,
    // which is absolutely positioned and would otherwise swallow the click.
    <TableCell className={cn('group/cell relative', className)}>
      {iconOnly ? (
        <span className="inline-flex max-w-full items-center gap-1">
          <span
            className="truncate"
            style={width ? { maxWidth: width } : undefined}
          >
            {display ?? value}
          </span>
          <CopyButton
            value={value}
            label={label}
            className="relative z-10 size-5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/cell:opacity-100"
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : label}
          className="group/copy relative z-10 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span
            className="truncate"
            style={width ? { maxWidth: width } : undefined}
          >
            {display ?? value}
          </span>
          <Icon
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0 transition-opacity',
              copied
                ? 'text-primary opacity-100'
                : 'text-muted-foreground opacity-0 group-hover/cell:opacity-100 group-focus-visible/copy:opacity-100',
            )}
          />
        </button>
      )}
    </TableCell>
  );
}
