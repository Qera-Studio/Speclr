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
export const A4_PADDING = "p-[12px]";

/** Total vertical padding `A4_PADDING` costs a page, in px (top + bottom). */
export const A4_PADDING_Y = 24;

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
