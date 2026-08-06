'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Client-side pagination for the admin tables.
 *
 * Not shadcn's `pagination` primitive: that one is built from `<a href>` links
 * for URL-driven paging, and these lists page in memory over data the page has
 * already fetched — the same reasoning as the in-memory filtering in
 * `DocumentsBrowser`. The control mirrors the document preview's pager
 * (`DocumentWorkspaceBar`) so paging looks the same wherever it appears.
 */

/** Rows per page. Ten keeps a long list from burying whatever follows it. */
export const PAGE_SIZE = 10;

/**
 * Slice `rows` into pages, holding the current page.
 *
 * The page is **clamped during render** rather than corrected in an effect:
 * filtering or deleting can shrink the list under the page you are on, and a
 * clamp means that never shows an empty table for a page that no longer exists.
 */
export function usePagedRows<T>(rows: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * pageSize;

  return {
    page: safePage,
    pageCount,
    visible: rows.slice(start, start + pageSize),
    setPage,
    /** Index of the first row shown, for a "1–10 of 24" style summary. */
    start,
  };
}

/**
 * Prev / next with a page counter. Renders nothing at a single page — a pager
 * whose every control is disabled is noise under a short table.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Names what is being paged, for screen readers ("contracts", "services"). */
  label: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      className="flex items-center justify-end gap-1"
      aria-label={`${label} pagination`}
      data-slot="pagination"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 0}
        aria-label={`Previous page of ${label}`}
      >
        <ChevronLeft />
      </Button>
      <span
        className="min-w-[76px] text-center text-xs text-muted-foreground [font-variant-numeric:tabular-nums]"
        aria-live="polite"
      >
        Page {page + 1} / {pageCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount - 1}
        aria-label={`Next page of ${label}`}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
