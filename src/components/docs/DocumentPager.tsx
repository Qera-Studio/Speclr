"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The page control: previous, the counter, next, and a box to type a page into.
 *
 * Split out of `DocumentWorkspaceBar` when the workspace bar was merged into
 * the app header — the pager is the only part of that bar that survived, and it
 * now renders a long way from the component that owns the page state, so it is
 * its own file rather than a fragment of a header that knows nothing about
 * documents.
 *
 * **The box is the pager's own state until it is committed.** Typing "1" on the
 * way to "12" must not jump the preview to page 1 and then to 12, so the value
 * is local and applied on Enter or on blur. It re-syncs from `currentPage`
 * whenever that changes underneath — scrolling the preview moves the page too,
 * and a box still holding what was typed three pages ago is a box lying about
 * where you are.
 */
export default function DocumentPager({
  currentPage,
  pageCount,
  onPrev,
  onNext,
  onGoToPage,
}: {
  currentPage: number;
  pageCount: number;
  onPrev?: () => void;
  onNext?: () => void;
  /** Zero-based, like `currentPage`. The caller clamps. */
  onGoToPage?: (index: number) => void;
}) {
  const atFirst = currentPage <= 0;
  const atLast = currentPage >= pageCount - 1;

  const [typed, setTyped] = useState(String(currentPage + 1));
  // The preview reports the page as it scrolls, and the arrows move it too, so
  // the box follows whatever the document is actually showing.
  useEffect(() => setTyped(String(currentPage + 1)), [currentPage]);

  const commit = () => {
    const page = Number(typed);
    // An empty or out-of-range box is not a page, so it goes back to saying
    // where the reader is rather than silently jumping them somewhere else.
    if (!typed || !Number.isFinite(page) || page < 1 || page > pageCount) {
      setTyped(String(currentPage + 1));
      return;
    }
    onGoToPage?.(page - 1);
  };

  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onPrev}
        disabled={atFirst}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Button>

      <span
        className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]"
        aria-live="polite"
      >
        Page {currentPage + 1} / {pageCount}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onNext}
        disabled={atLast}
        aria-label="Next page"
      >
        <ChevronRight />
      </Button>

      {/*
        Deliberately not the shadcn `Input`: that primitive is a full-height
        bordered form field, and this is a two-character box sitting inside a
        36px header row beside two ghost buttons. It carries no border and no
        fill until it is hovered or focused, so it reads as part of the counter
        rather than as a form landing in the chrome.

        Digits only, sanitised on the way in rather than rejected afterwards
        (`AGENTS.md`, input rules). It is not registered with react-hook-form,
        so `numericField` does not apply.
      */}
      <input
        type="text"
        inputMode="numeric"
        value={typed}
        onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          // The workspace pages on the arrow keys, and a caret inside this box
          // is the one place they mean "move within the value".
          e.stopPropagation();
        }}
        aria-label="Go to page"
        className="ml-1 h-6 w-9 rounded-md border border-transparent bg-transparent text-center text-xs text-muted-foreground transition-colors [font-variant-numeric:tabular-nums] hover:border-border focus:border-border focus:text-foreground focus:outline-none"
      />
    </div>
  );
}
