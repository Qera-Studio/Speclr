import { isSlip } from "@/lib/domain/registry";
import type { AdminDocument, LetterDocument } from "@/lib/domain/types";
import DocumentSheet from "./sheets/DocumentSheet";
import LetterSheet from "./sheets/LetterSheet";
import SlipSheet from "./sheets/SlipSheet";
import { CONTRACT_DARK_PAGE, contractBlocks } from "./sheets/ContractSheet";
import { quotationBlocks } from "./sheets/QuotationSheet";
import {
  A4_PADDING,
  CONTRACT_PADDING,
  SHEET_HEIGHT,
  SHEET_WIDTH,
} from "./sheets/frame";

/**
 * A document's first page, small enough to recognise at a glance.
 *
 * The real sheet, rendered from a specimen document (`samples.ts`) at full A4
 * and then scaled down as one box. Not a picture and not a mock-up: a sheet is
 * pure `data → markup`, so the cheapest faithful thumbnail is the sheet itself,
 * and it cannot drift from the document it is advertising because it *is* the
 * document.
 *
 * Everything past the first page falls outside the frame and is clipped, which
 * is the whole trick — no pagination runs here. `PrintPages` measures boxes on
 * the client to decide where pages break, and none of that is needed to show
 * the top of page one.
 *
 * It is inert: `aria-hidden`, no pointer events, and the card around it carries
 * the accessible name. A screen reader offered the full text of a specimen
 * invoice would be read the wrong document.
 */

/** How much of full size. 794px of paper lands at ~140px, a legible card. */
const SCALE = 0.176;

/** As in `PrintRoute`: a predicate, because a `||` chain does not narrow here. */
const isLetter = (doc: AdminDocument): doc is LetterDocument =>
  doc.type === "OFR" || doc.type === "EXP" || doc.type === "EXIT";

function firstPage(doc: AdminDocument) {
  if (doc.type === "CON") {
    // The contract's cover is a black page, and it is a `data-page="own"` block
    // that the paginator would give a page to by itself. Rendering that one
    // block on its own frame is the same page, minus the measuring.
    return (
      <div
        className={`flex h-full w-full flex-col ${CONTRACT_PADDING} ${CONTRACT_DARK_PAGE} box-border`}
      >
        {contractBlocks(doc)[0]}
      </div>
    );
  }
  if (doc.type === "QTN") {
    // Every page of a quotation is dark, not just a cover — same trick as the
    // contract's cover above: paint the frame black and drop in the first
    // (header) block, which is all that lands in the thumbnail's crop anyway.
    return (
      <div className={`flex h-full w-full flex-col ${A4_PADDING} bg-black text-white box-border`}>
        {quotationBlocks(doc)[0]}
      </div>
    );
  }
  if (isSlip(doc)) return <SlipSheet doc={doc} />;
  if (isLetter(doc)) return <LetterSheet doc={doc} />;
  return <DocumentSheet doc={doc} />;
}

export default function SheetThumbnail({ doc }: { doc: AdminDocument }) {
  return (
    <div
      aria-hidden
      // `text-left` is not decoration. A sheet never sets `text-align` on its
      // own root, so it inherits the caller's, and the palette card is
      // `text-center` — which centred every table cell and address line on the
      // paper. The frame states the page's alignment so no caller can.
      className="pointer-events-none overflow-hidden border border-border bg-white text-left font-normal select-none"
      style={{ width: SHEET_WIDTH * SCALE, height: SHEET_HEIGHT * SCALE }}
    >
      <div
        className="origin-top-left"
        style={{
          width: SHEET_WIDTH,
          height: SHEET_HEIGHT,
          transform: `scale(${SCALE})`,
        }}
      >
        {firstPage(doc)}
      </div>
    </div>
  );
}
