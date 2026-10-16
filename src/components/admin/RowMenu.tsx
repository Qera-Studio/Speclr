'use client';

import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * A row's actions behind one button.
 *
 * Three icons in a row is three targets 2px apart where the difference between
 * "archive" and "delete" is a glyph at 16px, and `RowActions`' own note records
 * why those targets grow vertically and never sideways: a mis-hit there does not
 * mean "nothing happened", it means the wrong row got deleted. One trigger and a
 * menu of named items replaces a guess with a word.
 *
 * What it costs, stated: every action is now two clicks instead of one, and the
 * icons no longer tell you at a glance which actions a row even has. That is the
 * trade, and it is the right way round on a table wide enough to scroll, where
 * the actions column is frozen and narrow.
 *
 * The menu opens below the trigger and aligned to its right edge, which is the
 * ordinary place a menu opens and the one this column can afford now that it is
 * frozen at the *right* rather than the left. `end` rather than `start` so the
 * menu grows inward from the edge instead of off the card.
 *
 * The items are the caller's, and so is any confirm dialog: an `AlertDialog`
 * rendered *within* a menu item unmounts with the menu the instant the item is
 * chosen, so it never gets to open. Callers hoist it to their own state and
 * render it as a sibling of this menu.
 */
export function RowMenu({
  label,
  children,
}: {
  /**
   * Names the row, not just the action ("More actions for Acme Co."): a screen
   * reader reaches this button out of the table's visual context, where "More"
   * could be about anything on the page.
   */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm" icon
            aria-label={label}
            className="text-muted-foreground transition-colors hover:text-foreground"
          />
        }
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-40">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
