"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * "Show sorting" — the eye that reveals the column headers' sort controls.
 *
 * Off by default: sorting is an occasional need, and an arrow on every header
 * competes with the column names for anyone who never sorts. Whoever does sort
 * turns it on once.
 *
 * The preference is one key for every list, not one per table. It is a habit
 * ("I sort things") rather than a fact about documents, and a person who turns
 * it on for one list and finds it off on the next has been told the control did
 * not stick.
 *
 * Hiding the controls keeps whatever order they applied. The eye shows and
 * hides the *controls*, not the sort — clearing the order on hide meant the
 * only way to read a list sorted by total was to leave the arrows on every
 * header. Turning the eye back on reveals the current sort, and a third click
 * on that column clears it.
 */
const SHOW_SORT_KEY = "speclr:show-sort";

export function useShowSort(): [boolean, () => void] {
  const [showSort, setShowSort] = useState(false);

  // Read on mount, not in a lazy initializer: these lists server-render, and
  // reading localStorage during the first render would mismatch hydration.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(SHOW_SORT_KEY) === "1") setShowSort(true);
    } catch {
      // Private browsing / storage disabled — the default holds for the session.
    }
  }, []);

  const toggle = () => {
    const next = !showSort;
    setShowSort(next);
    try {
      localStorage.setItem(SHOW_SORT_KEY, next ? "1" : "0");
    } catch {
      // As above — the toggle still works, it just won't survive a reload.
    }
  };

  return [showSort, toggle];
}

/**
 * An eye, open or shut: this shows and hides a control, it does not sort
 * anything itself — an ArrowUpDown here would read as "sort by this".
 *
 * The word carries the meaning and the eye carries the state, so the button's
 * accessible name is just "Sort" and `aria-pressed` says which way it is set.
 * An aria-label restating the state would fight the visible text (WCAG 2.5.3,
 * Label in Name) and leave voice control with nothing to say.
 */
export default function SortToggle({
  showSort,
  onToggle,
}: {
  showSort: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            onClick={onToggle}
            aria-pressed={showSort}
            className={cn(
              "shrink-0 whitespace-nowrap transition-colors",
              showSort ? "text-foreground" : "text-muted-foreground",
            )}
          />
        }
      >
        Sort
        {showSort ? (
          <Eye className="size-3.5" aria-hidden="true" />
        ) : (
          <EyeOff className="size-3.5" aria-hidden="true" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        {showSort ? "Hide sorting" : "Show sorting"}
      </TooltipContent>
    </Tooltip>
  );
}
