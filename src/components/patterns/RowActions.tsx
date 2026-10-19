'use client';

import { Archive, ArchiveRestore, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * The per-row action cluster, shared by every list in the admin.
 *
 * Quiet until you approach the row, then revealed — the tables are dense, and
 * a column of always-lit icons competes with the data. Never `display:none`,
 * so the buttons stay in the tab order; `focus-within` on the row reveals them
 * for anyone arriving by keyboard.
 *
 * Requires `group/row` on the owning `TableRow`.
 *
 * **The buttons are 28px and their targets are 28×40.** The extra height is an
 * absolutely-positioned pseudo-element, so it costs no layout and nothing
 * moves. It grows upward and downward only, because that is the axis with room:
 * these sit 2px apart, and a target widened sideways would overlap its
 * neighbour, which turns "hard to hit" into "hits the wrong one" (deleting a
 * row instead of editing it). Vertical is also the axis you approach a row from
 * in a list.
 *
 * 40 rather than 44: the row is 44px tall and a taller target would spill into
 * the row above. WCAG 2.1 AA sets no target size at all (2.5.5 is AAA); 2.2's
 * AA floor is 24px, which this clears with room.
 */
export function RowActions({
  children,
  alwaysVisible = false,
}: {
  children: React.ReactNode;
  /** Lit at rest, for a table that asks for it (`controlsVisible`). */
  alwaysVisible?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-0.5',
        !alwaysVisible &&
          'opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100',
        "[&_button]:relative [&_button]:before:absolute [&_button]:before:inset-x-0 [&_button]:before:-inset-y-1.5 [&_button]:before:content-['']",
      )}
    >
      {children}
    </div>
  );
}

/**
 * The edit action, sized and worded the same way in every table.
 *
 * `label` names the row ("Edit Ria Pareek") because that is what a screen
 * reader needs; the tooltip stays short because on screen the row is right
 * there.
 */
export function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm" icon
            onClick={onClick}
            aria-label={label}
            className="text-muted-foreground transition-colors hover:text-foreground"
          />
        }
      >
        {/* size-4 to match the sidebar's icons — the size variants stop at 3.5. */}
        <Pencil className="size-4" />
      </TooltipTrigger>
      <TooltipContent>Edit</TooltipContent>
    </Tooltip>
  );
}

/**
 * The archive action, and its own undo.
 *
 * Beside `EditButton` rather than in whichever folder needed it first, for the
 * reason `CONTEXT.md` §5e gives about `DateCell`: a value that appears in more
 * than one place gets one component that decides how it looks. Archiving is
 * already the standing removal for a service, a clause and a client, so the
 * second caller is a matter of time.
 *
 * **One button, two directions**, because restoring is not a different action:
 * it is this one run backwards, and it has to be offered by whatever offered
 * the archiving, or a row can be retired with no way back. The icon and both
 * strings follow `archived`, and the caller passes the row-naming `label` that
 * a screen reader needs.
 *
 * No confirmation, deliberately. Archiving is reversible and takes nothing
 * away; confirming it is how people learn to click through the dialog that
 * guards something irreversible.
 */
export function ArchiveButton({
  label,
  archived,
  onClick,
}: {
  label: string;
  archived?: boolean;
  onClick: () => void;
}) {
  const Icon = archived ? ArchiveRestore : Archive;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm" icon
            onClick={onClick}
            aria-label={label}
            className="text-muted-foreground transition-colors hover:text-foreground"
          />
        }
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{archived ? 'Restore' : 'Archive'}</TooltipContent>
    </Tooltip>
  );
}
