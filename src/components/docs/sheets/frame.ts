/**
 * Shared A4 page geometry for the document sheets.
 *
 * One padding value so the sheets cannot drift apart — invoice, receipt,
 * stipend, contract and the HR letters all print the same margin. Previously
 * the slip sheets used 12px while the prose sheets used 64/48px, which is why
 * a contract and an invoice never looked like the same stationery.
 *
 * NOTE: 12px ≈ 3mm. That is inside the unprintable margin of most desktop
 * printers, and `@page { margin: 0 }` (src/styles/print.css) leaves no printer
 * margin to fall back on. If physical output clips at the edges, raise this
 * one constant — every sheet follows it.
 */
/** A4 at 96dpi — the paper every sheet and every preview page is cut to. */
export const SHEET_WIDTH = 794;
export const SHEET_HEIGHT = 1123;

/**
 * Held back from every page's packing budget, on top of its margins and
 * chrome.
 *
 * `usePagination` measures the un-paginated flow and packs to the px; a
 * multi-page document (the contract) then re-renders those same blocks split
 * across real page frames, where sub-pixel line-wrap rounding can land a
 * fraction of a line differently than it did in the single continuous flow
 * that was measured. On a document run long enough, one page eventually lands
 * exactly on that edge and clips. This is the margin against it — cheaper than
 * chasing a rounding difference measured in single px, and it costs nothing
 * that matters against an A4 page's own height.
 */
export const PAGE_SAFETY_MARGIN = 16;

export const A4_PADDING = "p-[12px]";

/** Total vertical padding `A4_PADDING` costs a page, in px (top + bottom). */
export const A4_PADDING_Y = 24;

/**
 * The contract's page margin. Wider than the shared value because a contract is
 * read as prose across twenty-odd pages and carries a running header and footer
 * inside this margin, where the slips are dense single-page forms.
 */
export const CONTRACT_PADDING = "p-[24px]";

/** Total vertical padding `CONTRACT_PADDING` costs a page, in px (24 + 24). */
export const CONTRACT_PADDING_Y = 48;

/**
 * The contract sets its points in two columns.
 *
 * Not the whole page — a section's heading, its tables and its lists run the
 * full measure, and the numbered points beneath the heading flow in these two
 * columns. Not for density alone: a 14px line across the full 746px measure
 * runs to ~105 characters, half again past the point where the eye reliably
 * finds the next line. Two columns put it at ~50, which is the measure a
 * printed agreement has always used.
 *
 * Width is derived here so the three numbers cannot drift: 794 − 48 of margin −
 * 24 of gutter, halved.
 */
export const CONTRACT_COLUMNS = 2;
export const CONTRACT_COLUMN_GAP = 24;
export const CONTRACT_COLUMN_WIDTH =
  (SHEET_WIDTH - CONTRACT_PADDING_Y - CONTRACT_COLUMN_GAP * (CONTRACT_COLUMNS - 1)) /
  CONTRACT_COLUMNS;

/** The offer letter's cover page — roomier margins than the slip sheets. */
export const OFFER_COVER_PADDING = "p-[36px]";

/**
 * Every HR letter's body pages (offer, experience, exit): 36px on three sides,
 * 12px at the foot, so the bottom-pinned signature and footer sit close to the
 * page edge. One value so the three letters print as the same stationery.
 */
export const LETTER_PADDING = "pt-[36px] px-[36px] pb-[12px]";

/** Total vertical padding `LETTER_PADDING` costs a page, in px (36 + 12). */
export const LETTER_PADDING_Y = 48;
