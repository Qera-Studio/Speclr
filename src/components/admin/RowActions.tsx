'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 [&_button]:relative [&_button]:before:absolute [&_button]:before:inset-x-0 [&_button]:before:-inset-y-1.5 [&_button]:before:content-['']">
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
            size="icon"
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
