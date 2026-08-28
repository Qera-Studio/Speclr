"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The top edge of the document card: title on the left, view controls on the
 * right. Deliberately *not* a separate floating panel — it shares the card's
 * background and sits above the scrolling preview as one surface (the same
 * relationship `AdminHeader` has to the admin inset).
 *
 * Purely presentational: page state lives in `DocumentWorkspace`.
 */
export default function DocumentWorkspaceBar({
  title,
  currentPage = 0,
  pageCount,
  onPrev,
  onNext,
  status,
}: {
  title: string;
  /**
   * The autosave line, on the bar's right edge rather than at the foot of the
   * form. It was below the last field of a rail that scrolls, which is the one
   * place it could be while the document is being typed *and* out of sight. The
   * bar is the only part of this page that never moves.
   */
  status?: React.ReactNode;
  /**
   * Absent where the card is showing something other than the document — the
   * contract's service picker, say. A page counter over a page that is not on
   * screen is a lie, so it goes rather than reading "Page 1 / 11".
   */
  pageCount?: number;
  currentPage?: number;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const atFirst = currentPage <= 0;
  const atLast = pageCount === undefined || currentPage >= pageCount - 1;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
      <h1 className="truncate text-sm font-medium">{title}</h1>

      <div className="flex shrink-0 items-center gap-4">
        {status}

        {/* Nothing to page through on a one-page document, and "Page 1 / 1" with
          both arrows greyed out is a control that exists only to say so. Every
          invoice, receipt, credit note and slip is one page. */}
        {pageCount === undefined || pageCount <= 1 ? null : (
          <div className="flex items-center gap-1">
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
              className="min-w-[76px] text-center text-xs text-muted-foreground [font-variant-numeric:tabular-nums]"
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
          </div>
        )}
      </div>
    </div>
  );
}
