import { formatDisplayDate, isISODate } from "@/lib/domain/dates";
import { formatINR, lineAmountPaise } from "@/lib/domain/money";
import {
  computeQuotationTotals,
  QUOTATION_GST_ESTIMATE_PERCENT,
} from "@/lib/domain/quotationTotals";
import { studioOf } from "@/lib/domain/studio";
import type { QuotationDocument } from "@/lib/domain/types";
import { A4_PADDING, A4_PADDING_Y } from "./frame";
import QeraMark from "./QeraMark";

/**
 * The Service Quotation — the one sheet that is dark on every page, not just
 * a cover. A fixed, never-changing cover page and closing page bookend the
 * per-document content: masthead + brand copy on the way in, "let's
 * collaborate" + links + legal lines on the way out. Neither carries any
 * per-document data — that lives in the `details` block, the first thing in
 * the flowing content.
 *
 * A flat list of atomic blocks, exactly like `contractBlocks`/`letterBlocks` —
 * `DocumentPreview`/`PrintPages` measure and pack them into A4 pages, with
 * `quotationPageProps().forceDark` painting every flowing page black and
 * `data-page="own"` + `data-page-frame="dark"` giving the cover and close a
 * dedicated black page each (`packBlocks` only reads an `own` block's own
 * `dark` flag — `forceDark` does not reach it).
 */

/** What the running footer costs a page — reserved by pagination. No running
 * header: the wordmark only appears on the cover and closing pages, as their
 * own content, not as chrome repeated on every page. */
export const QTN_CHROME_HEIGHT = 28 + 12;

const money = (paise: number) => formatINR(paise);

/** One section's table: heading, rows, subtotal. */
function SectionBlock({
  section,
}: {
  section: ReturnType<typeof computeQuotationTotals>["sections"][number];
}) {
  return (
    <div className="mb-[28px] [break-inside:avoid]" data-keep-next>
      {section.name ? (
        <h3 className="mb-[10px] text-[15px] font-semibold text-white">
          {section.name}
        </h3>
      ) : null}
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-white/20 text-white/50">
            <th className="py-[6px] text-left font-normal">Deliverable</th>
            <th className="py-[6px] text-right font-normal">Qty.</th>
            <th className="py-[6px] text-right font-normal">Price</th>
            <th className="py-[6px] text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {section.lines.map((line, i) => (
            <tr key={i} className="border-b border-white/10">
              <td className="py-[8px] pr-[12px] text-white">
                {line.description || "—"}
              </td>
              <td className="py-[8px] text-right text-white/80">{line.qty}</td>
              <td className="py-[8px] text-right text-white/80">
                {money(line.ratePaise)}
              </td>
              <td className="py-[8px] text-right text-white">
                {money(lineAmountPaise(line))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-[8px] flex justify-end text-[13px] font-semibold text-white">
        {money(section.subtotalPaise)}
      </div>
    </div>
  );
}

function RecurringNote({
  lines,
}: {
  lines: ReturnType<typeof computeQuotationTotals>["recurringLines"];
}) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-[28px] [break-inside:avoid]">
      <h3 className="mb-[10px] text-[15px] font-semibold text-white">
        Recurring
      </h3>
      <p className="mb-[8px] text-[11px] text-white/50">
        Billed monthly, from the month deliverables go live — not included in
        the totals below.
      </p>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-b border-white/10">
              <td className="py-[8px] pr-[12px] text-white">
                {line.description || "—"}
              </td>
              <td className="py-[8px] text-right text-white">
                {money(lineAmountPaise(line))}/m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MilestonesBlock({
  milestones,
}: {
  milestones: QuotationDocument["milestones"];
}) {
  if (!milestones || milestones.length === 0) return null;
  return (
    <div className="mb-[28px] [break-inside:avoid]" data-keep-next>
      <h3 className="mb-[10px] text-[15px] font-semibold text-white">
        Payment schedule
      </h3>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {milestones.map((m, i) => (
            <tr key={i} className="border-b border-white/10">
              <td className="py-[6px] text-white/80">{m.label || "—"}</td>
              <td className="py-[6px] text-right text-white">{m.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The full-width A4 flow, used for both preview and print. */
export function quotationBlocks(doc: QuotationDocument): React.ReactNode[] {
  const studio = studioOf(doc);
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";
  const validUntil =
    doc.validUntil && isISODate(doc.validUntil)
      ? formatDisplayDate(doc.validUntil)
      : null;
  const totals = computeQuotationTotals(doc.lineItems, doc.gstCountry);

  // Fixed, never-changing — no per-document data. See `PRINCIPLES.md` rule 4:
  // this is studio copy, not a snapshot, so nothing here is frozen at finalize.
  const cover = (
    <div
      key="cover"
      data-page="own"
      data-page-frame="dark"
      aria-label="Cover"
      className="relative flex flex-1 flex-col justify-center"
    >
      <span className="absolute top-0 right-0 flex items-center gap-[6px]">
        <QeraMark size={6.4} />
        <span className="text-[15px] font-semibold text-white">
          {studio.brandMark}
        </span>
      </span>
      <h1 className="text-[52px] font-bold uppercase leading-[0.95] tracking-[-0.02em] text-white">
        Service
        <br />
        Quotation
      </h1>
      <p className="mt-[16px] max-w-[420px] text-[13px] leading-[1.5] text-white/70">
        A tailored scope and pricing for the work discussed, prepared by Qera
        Studio.
      </p>
    </div>
  );

  const details = (
    <div key="details" className="mb-[36px] [break-inside:avoid]">
      {/* No doc.number here — the running footer already carries it on every
       * page (or "DRAFT" before finalize), and printing it twice on the same
       * page is redundant, not reassuring. */}
      <div className="text-[11px] text-white/60">
        <span>{displayDate}</span>
      </div>
      {doc.subjectLine ? (
        <p className="mt-[16px] max-w-[520px] text-[13px] leading-[1.5] text-white/70">
          {doc.subjectLine}
        </p>
      ) : null}
      <div className="mt-[24px] flex justify-between gap-[24px] text-[12px]">
        <div>
          <p className="text-white/50">Prepared for</p>
          <p className="mt-[2px] text-[16px] font-medium text-white">
            {doc.recipientName || "—"}
          </p>
          {doc.attentionName ? (
            <p className="mt-[2px] text-white/70">
              Kind Attention: {doc.attentionName}
            </p>
          ) : null}
          {doc.offerLine ? (
            <p className="mt-[6px] max-w-[420px] text-white/70">
              {doc.offerLine}
            </p>
          ) : null}
        </div>
        {validUntil ? (
          <div className="text-right">
            <p className="text-white/50">Valid until</p>
            <p className="mt-[2px] font-medium text-white">{validUntil}</p>
          </div>
        ) : null}
      </div>
    </div>
  );

  const pricing = (
    <div key="pricing" className="mb-[8px]">
      <h2 className="mb-[20px] text-[13px] font-semibold uppercase tracking-[0.04em] text-white/60">
        Pricing
      </h2>
      {totals.sections.map((section, i) => (
        <SectionBlock key={i} section={section} />
      ))}
      <RecurringNote lines={totals.recurringLines} />
      <MilestonesBlock milestones={doc.milestones} />
    </div>
  );

  const terms = doc.termsNote?.trim() ? (
    <div key="terms" className="mb-[28px] [break-inside:avoid]">
      <h2 className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.04em] text-white/60">
        Terms
      </h2>
      <p className="whitespace-pre-line text-[12px] leading-[1.6] text-white/80">
        {doc.termsNote}
      </p>
    </div>
  ) : null;

  // Last in the flow, and it stays last: `mt-auto` resolves to the free space
  // on whichever page it lands on (the same mechanism the letters' closing
  // block uses — see `usePagination.ts`'s note on the last block's margin),
  // then `pb-[48px]` holds it a fixed distance off that page's bottom rather
  // than flush against it.
  const totalsBlock = (
    <div
      key="totals"
      className="mt-auto flex flex-col items-end gap-[4px] border-t border-white/20 pt-[16px] pb-[48px] text-[13px] [break-inside:avoid]"
    >
      <div className="flex w-[280px] justify-between text-white/70">
        <span>Subtotal</span>
        <span>{money(totals.subtotalPaise)}</span>
      </div>
      {doc.gstCountry === "IN" ? (
        <div className="flex w-[280px] justify-between text-white/70">
          <span>Est. GST ({QUOTATION_GST_ESTIMATE_PERCENT}%)</span>
          <span>{money(totals.gstPaise)}</span>
        </div>
      ) : null}
      <div className="flex w-[280px] justify-between text-[16px] font-semibold text-white">
        <span>Total</span>
        <span>{money(totals.totalPaise)}</span>
      </div>
      {doc.gstCountry === "IN" ? (
        <p className="mt-[6px] w-[280px] text-right text-[10px] text-white/40">
          GST shown as an estimate only — not a tax invoice.
        </p>
      ) : null}
    </div>
  );

  // Fixed, never-changing — the same rule as `cover`. `hello@qera.studio` and
  // the Instagram handle are marketing contact points printed on this one
  // page, deliberately distinct from `studioOf(doc).email` (the invoice
  // identity, `sales@qera.studio`) — this page is never per-document.
  const close = (
    <div
      key="close"
      data-page="own"
      data-page-frame="dark"
      aria-label="Let's collaborate"
      className="relative flex flex-1 flex-col"
    >
      <span className="absolute top-0 right-0 flex items-center gap-[6px]">
        <QeraMark size={6.4} />
        <span className="text-[15px] font-semibold text-white">
          {studio.brandMark}
        </span>
      </span>
      <div className="mt-[64px]">
        <h2 className="max-w-[420px] text-[32px] font-bold leading-[1.1] tracking-[-0.01em] text-white">
          Let&rsquo;s collaborate on what matters to you.
        </h2>
        <p className="mt-[12px] max-w-[420px] text-[13px] leading-[1.5] text-white/70">
          Thank you for considering Qera Studio as your digital
          infrastructure and growth partner.
        </p>
      </div>
      <div className="mt-auto flex gap-[32px] pb-[64px] text-[12px] text-white/70">
        <span>
          Visit us:{" "}
          <a
            href="https://www.qera.studio"
            className="text-white underline underline-offset-4"
          >
            www.qera.studio
          </a>
        </span>
        <span>
          Mail us:{" "}
          <a
            href="mailto:hello@qera.studio"
            className="text-white underline underline-offset-4"
          >
            hello@qera.studio
          </a>
        </span>
        <span>
          Join us:{" "}
          <a
            href="https://www.instagram.com/qera.studio"
            className="text-white underline underline-offset-4"
          >
            @qera.studio
          </a>
        </span>
      </div>
      <div className="flex flex-col gap-[4px] text-[10px] text-white/50">
        <p>© Qera Studio. All rights reserved</p>
        <p>Owned by {studio.legalName}, company registered in India</p>
        <p>CIN: {studio.cin}</p>
      </div>
    </div>
  );

  return [cover, details, pricing, ...(terms ? [terms] : []), totalsBlock, close];
}

/** Shared props for both the workspace preview and `PrintPages` — the pairing
 * that must never disagree, per `ContractPages.tsx`'s note on the same shape. */
export function quotationPageProps(doc: QuotationDocument) {
  return {
    pagePadding: A4_PADDING,
    pagePaddingY: A4_PADDING_Y,
    selfPaddedSheet: false,
    darkPageClassName: "bg-black text-white",
    forceDark: true,
    chromeHeight: QTN_CHROME_HEIGHT,
    pageFooter: (page: number) => (
      <div className="mt-auto flex h-[28px] shrink-0 items-center justify-between gap-[16px] pt-[12px] text-[10px] text-white/50">
        <span>Confidential &amp; Proprietary</span>
        <span>{studioOf(doc).email}</span>
        {/* The number alone, no total — a total is a promise about a document
         * still being edited (see `ContractSheet.tsx`'s `contractPageProps`
         * for the same reasoning), and a quotation prints "DRAFT" here right
         * up until it is. */}
        <span>{doc.number ?? "DRAFT"}</span>
        <span className="tabular-nums">Page {page + 1}</span>
      </div>
    ),
  };
}
