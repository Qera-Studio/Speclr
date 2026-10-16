'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * One control in a panel's top row.
 *
 * Icon-only, so `label` is what names it for assistive tech:
 * `design-system.test.ts` fails an icon-sized button with nothing to announce.
 * 24px, because the row is chrome rather than a form.
 *
 * **`tooltip` is separate from `label`, and defaults to it.** The two answer
 * different questions. A tooltip is read beside four others by somebody who
 * can see which icon they are pointing at, so one word is the whole of what it
 * has to add. A screen reader reaches the button out of that context, in a
 * list where "Expand" and "Archive" could be about anything on the page, so
 * the label keeps its object. Where one string serves both, passing `label`
 * alone still does.
 *
 * Lifted out of `ClauseLibrary` when the contract's service sheet took the same
 * control row, which is `PRINCIPLES.md` rule 1: two callers, so it gets its own
 * home rather than being copied into the second one.
 */
export default function IconAction({
  icon: Icon,
  label,
  tooltip,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  /** Names the button for assistive tech. Says what it acts on. */
  label: string;
  /** Shown on hover. Defaults to `label`. Usually one word. */
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{tooltip ?? label}</TooltipContent>
    </Tooltip>
  );
}
