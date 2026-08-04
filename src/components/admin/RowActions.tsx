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
 */
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
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
