"use client";

import { Pagination } from "@/components/ui/pagination";

/**
 * The document preview's page control: the pages as a tab group, with arrows
 * and a go-to box once there are enough of them to hide some.
 *
 * It is `ui/pagination.tsx`'s `Pagination` with the document's vocabulary on
 * it. This file used to hold its own copy of that control, which is how the box
 * came to exist here and nowhere else; the copy is gone and the rule is in
 * `docs/design.md` §2.10: **a pager is `Pagination`**.
 *
 * It used to pass `onPrev`/`onNext` as well, on the grounds that the preview
 * scrolls a continuous strip where a table swaps a slice, so its arrows had to
 * animate rather than set an index. **That distinction was never real.** The
 * box already went through `onGoToPage`, and every caller pointed all three
 * props at the same `goToPage`, so typing a page scrolled and clicking the
 * arrow beside it also scrolled — through two different props doing one thing.
 * Clicking a number scrolls for the same reason, and the extra props are gone.
 *
 * `label` is empty on purpose. Every other pager sits beside a list it has to
 * name ("Previous page of clients"); this one is the only pager on the screen
 * and it is the document's, so "Previous page of documents" would be naming a
 * list of one. The trailing space the template would leave is trimmed by the
 * accessible-name calculation.
 */
export default function DocumentPager({
  currentPage,
  pageCount,
  onGoToPage,
}: {
  currentPage: number;
  pageCount: number;
  /** Zero-based, like `currentPage`. The caller clamps, and scrolls. */
  onGoToPage?: (index: number) => void;
}) {
  return (
    <Pagination
      page={currentPage}
      pageCount={pageCount}
      onPageChange={(page) => onGoToPage?.(page)}
      label=""
    />
  );
}
