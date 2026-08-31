import { formatDisplayDate, isISODate } from "@/lib/domain/dates";
import { lineAmountPaise } from "@/lib/domain/money";
import {
  computeQuotationTotals,
  formatQuote,
  formatQuoteRange,
  paymentPhases,
  QUOTATION_COVER_BLURB,
  QUOTATION_OFFER_LINE,
  QUOTATION_TAX_NOTE,
  QUOTATION_TERMS,
  type QuotationService,
  type RecurringLine,
} from "@/lib/domain/quotation";
import { contentOf } from "@/lib/domain/docContent";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf } from "@/lib/domain/studio";
import type { LineItem, QuotationDocument } from "@/lib/domain/types";
import { QUOTATION_PADDING, QUOTATION_PADDING_Y } from "./frame";
import QeraMark from "./QeraMark";

/**
 * The Service Quotation — a **fixed-page** document, dark on every page.
 *
 * Unlike the contract and the letters, nothing here flows. Every block carries
 * `data-page="own"`, so `packBlocks` gives each exactly one page and packs
 * nothing else onto it:
 *
 *   cover → service 1 → [service 1 add-ons] → service 2 → … →
 *   recurring + summary → details → contact
 *
 * That is the document's own structure, not a rendering convenience: a service
 * *is* a page, which is why `QuotationService` is a record carrying its own
 * add-on list rather than a `section` string on a flat line array.
 *
 * The four corners (mark + date above, confidentiality note + page number
 * below) are chrome in `quotationPageProps`, identical on every page, so no
 * block draws them itself.
 *
 * **There is a ceiling, and it is a hard one.** Nothing here flows onto a
 * second page, so a service with too many deliverables does not paginate, it
 * spills off the paper. Measured at **8 deliverables** on a service page that
 * also carries a blurb; 9 fails. That number moves whenever the type sizes or
 * `QUOTATION_PADDING` move, so it is measured rather than reasoned about.
 * `e2e/quotation.spec.ts` asserts no page is
 * marked `overflows` for exactly that reason, and that assertion was confirmed
 * to go red before it was trusted. If a service ever genuinely needs more,
 * split it in two or flow the table through the `Paginator` the way the
 * contract does — do not quietly raise the limit. jsdom measures every box as
 * zero, so verify any change to this sheet in a real browser.
 */

/**
 * What the running header and footer cost a page. Reserved by pagination.
 *
 * Each band's height **includes its own gap**, and that is the fix for a bug
 * rather than a stylistic choice. Both boxes are `box-border`, so a height
 * smaller than the padding inside it is not a shorter box: the used height
 * floors at the padding and the content is drawn outside its own frame.
 * `h-[28px] pt-[36px]` on the footer made a 36px box whose text rendered 8px
 * *below* its floor, which on a fixed-height page is 8px into the bottom
 * margin. The header did the same thing upwards against the top margin.
 *
 * So the gap is part of the height, and these two numbers are the ones on the
 * boxes in `quotationPageProps`. Keep them in step: what the packer holds back
 * has to be what the page actually spends, or a service page packs 76px it
 * does not have and clips at the foot.
 */
const SQ_HEADER_HEIGHT = 92; // 28px of mark and date, then a 64px gap
const SQ_FOOTER_HEIGHT = 64; // a 36px gap, then 28px of note and page number
export const SQ_CHROME_HEIGHT = SQ_HEADER_HEIGHT + SQ_FOOTER_HEIGHT;

/** Every page block: filling the frame's height, so `mt-auto` has something to
 * resolve against. */
const PAGE = "relative flex flex-1 flex-col";

/** A small label over a value — "Prepared for:", "Subject:", "Reference:". */
function Caption({ children }: { children: React.ReactNode }) {
  return <p className="text-[16px] leading-none text-white/50">{children}</p>;
}

// ── Tables ────────────────────────────────────────────────────────────────

/**
 * One deliverable, as two rows.
 *
 * The second row carries only the `detail`, under the description and in the
 * description's own column — never spanning the figures, which is what keeps
 * the explanation reading as a note on the line above rather than as a row of
 * its own. It renders even when empty, so the rhythm does not change between a
 * line that carries an explanation and one that does not.
 */
function DeliverableRows({ line }: { line: LineItem }) {
  return (
    <>
      <tr className="align-baseline">
        <td className="pt-[14px] pr-[16px] text-[16px] text-white">
          {line.description}
        </td>
        <td className="pt-[14px] text-right text-[16px] text-white">
          {line.qty}
        </td>
        <td className="pt-[14px] text-right text-[16px] text-white">
          {formatQuote(line.ratePaise)}
        </td>
        <td className="pt-[14px] text-right text-[16px] text-white">
          {formatQuote(lineAmountPaise(line))}
        </td>
      </tr>
      <tr>
        <td className="border-b border-white/15 max-w-[400px] pr-[16px] pb-[12px] text-[12px] leading-[1.3] text-white/50">
          {line.detail}
        </td>
        <td className="border-b border-white/15" colSpan={3} />
      </tr>
    </>
  );
}

/**
 * A deliverables table: the four-column header, the lines, and the One-time
 * Total with the tax note under it.
 *
 * Shared by a service's page and its add-on page, because the add-on page *is*
 * the same table under a different heading. The heading is a prop rather than
 * derived here for exactly that reason.
 */
function DeliverablesTable({
  heading,
  lines,
}: {
  heading: string;
  lines: LineItem[];
}) {
  const totalPaise = lines.reduce(
    (sum, line) => sum + lineAmountPaise(line),
    0,
  );
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-[13px] text-white">
          <th className="border-b border-white/40 pb-[10px] text-left font-medium text-[18px]">
            {heading}
          </th>
          <th className="w-[64px] border-b border-white/40 pb-[10px] text-right font-medium text-[18px]">
            Qty
          </th>
          <th className="w-[132px] border-b border-white/40 pb-[10px] text-right font-medium text-[18px]">
            Amount
          </th>
          <th className="w-[132px] border-b border-white/40 pb-[10px] text-right font-medium text-[18px]">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, i) => (
          <DeliverableRows key={i} line={line} />
        ))}
      </tbody>
      <tfoot>
        <tr className="align-baseline">
          <td className="pt-[14px] text-[16px] text-white">One-time Total</td>
          <td colSpan={2} />
          <td className="pt-[14px] text-right text-[16px] text-white">
            {formatQuote(totalPaise)}
          </td>
        </tr>
        <tr>
          <td className="pt-[3px] text-[12px] text-white/50">
            {QUOTATION_TAX_NOTE}
          </td>
          <td colSpan={3} />
        </tr>
      </tfoot>
    </table>
  );
}

/** The amount column of a recurring row: a figure, a range, or a plain note. */
function recurringAmount(row: RecurringLine): string {
  if (row.amountNote) return row.amountNote;
  if (row.amountPaise === undefined) return "";
  return formatQuoteRange(
    row.amountPaise,
    row.amountMaxPaise ?? row.amountPaise,
  );
}

function RecurringTable({
  rows,
  fixed,
}: {
  rows: RecurringLine[];
  fixed: { minPaise: number; maxPaise: number };
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-[13px] text-white">
          <th className="border-b border-white/40 pb-[10px] text-left font-medium text-[18px]">
            Deliverables [Recurring Infrastructure]
          </th>
          <th className="w-[180px] border-b border-white/40 pb-[10px] text-left font-medium text-[18px]">
            Frequency
          </th>
          <th className="w-[170px] border-b border-white/40 pb-[10px] text-right font-medium text-[18px]">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="align-baseline">
            <td className="pt-[14px] pr-[16px] text-[16px] text-white">
              {row.description}
              <span className="mt-[3px] block pb-[12px] text-[14px] leading-[1.35] text-white/50">
                {row.detail}
              </span>
            </td>
            <td className="border-b border-white/15 pt-[14px] text-left text-[16px] text-white">
              {row.frequency}
            </td>
            <td className="border-b border-white/15 pt-[14px] text-right text-[16px] text-white">
              {recurringAmount(row)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="align-baseline">
          <td colSpan={2} className="pt-[14px] text-[16px] text-white">
            Recurring Total (Fixed Portion)
          </td>
          <td className="pt-[14px] text-right text-[16px] text-white">
            {formatQuoteRange(fixed.minPaise, fixed.maxPaise)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/**
 * The summary, built entirely from the services and the recurring rows.
 *
 * Nothing writes into this: it is the one table on the document that is pure
 * arithmetic over what the pages before it already said (`PRINCIPLES.md`
 * rule 3). The recurring row carries a total and no base or add-on, because it
 * has neither, and it prints '[variable]' when the figure beside it is the
 * bottom of a range rather than a price.
 */
function SummaryTable({
  totals,
}: {
  totals: ReturnType<typeof computeQuotationTotals>;
}) {
  const { minPaise, maxPaise } = totals.recurringFixed;
  const cell = "border-b border-white/15 py-[11px] text-[16px] text-white";
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-[13px] text-white">
          <th className="border-b border-white/40 pb-[10px] text-left font-medium text-[18px]">
            Item
          </th>
          <th className="w-[132px] border-b border-white/40 pb-[10px] text-right font-medium text-[18px]">
            Base
          </th>
          <th className="w-[132px] border-b border-white/40 pb-[10px] text-right font-medium text-[18px]">
            Add-on
          </th>
          <th className="w-[132px] border-b border-white/40 pb-[10px] text-right font-medium text-[18px] ">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {totals.services.map((service, i) => (
          <tr key={i} className="align-baseline">
            <td className={`${cell} pr-[16px]`}>{service.name}</td>
            <td className={`${cell} text-right`}>
              {formatQuote(service.basePaise)}
            </td>
            <td className={`${cell} text-right`}>
              {service.addOnPaise > 0 ? formatQuote(service.addOnPaise) : "—"}
            </td>
            <td className={`${cell} text-right`}>
              {formatQuote(service.totalPaise)}
            </td>
          </tr>
        ))}
        <tr className="align-baseline">
          <td className={`${cell} pr-[16px]`}>Recurring Infrastructure</td>
          <td className={`${cell} text-right`}>—</td>
          <td className={`${cell} text-right`}>—</td>
          <td className={`${cell} text-right`}>
            {formatQuote(minPaise)}
            {maxPaise > minPaise ? (
              <span className="text-white/50"> [variable]</span>
            ) : null}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr className="align-baseline">
          <td className="pt-[14px] text-[15px] text-white">Total</td>
          <td colSpan={2} />
          <td className="pt-[14px] text-right text-[15px] text-white">
            {formatQuote(totals.totalPaise)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────

/**
 * The subject line, derived rather than typed: the services are already on the
 * document and the company is already on the cover, so asking an operator to
 * restate them is asking for the two to disagree (`PRINCIPLES.md` rule 3).
 */
export function quotationSubject(doc: QuotationDocument): string {
  const names = doc.services.map((s) => s.name).filter(Boolean);
  const where = [doc.companyName, doc.city].filter(Boolean).join(", ");
  const what = names.length > 0 ? names.join(", ") : "services";
  return where ? `Quote for ${what} at ${where}` : `Quote for ${what}`;
}

/** "Miss Mehak," — the salutation and the person, never the company. */
function addressee(doc: QuotationDocument): string {
  const named = [doc.salutation, doc.recipientName].filter(Boolean).join(" ");
  return named ? `${named},` : "—";
}

/** The full-width A4 flow, used for both preview and print. */
export function quotationBlocks(doc: QuotationDocument): React.ReactNode[] {
  const studio = studioOf(doc);
  const content = contentOf(doc, DOC_TYPES.SQ);
  const totals = computeQuotationTotals(doc.services, doc.recurring);
  const phases = paymentPhases(totals.oneTimePaise);

  const cover = (
    <div
      key="cover"
      data-page="own"
      data-page-frame="dark"
      aria-label="Cover"
      className={`${PAGE} justify-center`}
    >
      {/* `w-min` is what puts SERVICE over QUOTATION: the box shrinks to its
       * longest word, so the mast wraps at every space however many words the
       * masthead carries, instead of at whatever width the paper happens to
       * leave. A hard-coded line break would only be right for this one
       * string, and `masthead` is editable content (`CONTEXT.md` §5b). */}
      <h1 className="w-min text-[72px] leading-[0.95] font-bold tracking-[-0.02em] text-white uppercase">
        {content.masthead}
      </h1>
      <p className="mt-[16px] max-w-[470px] text-[16px] leading-[1] text-white">
        {QUOTATION_COVER_BLURB}
      </p>

      <div className="mt-[96px]">
        <Caption>Prepared for:</Caption>
        <p className="mt-[8px] text-[16px] text-white">{addressee(doc)}</p>
        <p className="mt-[4px] text-[16px] text-white">
          {QUOTATION_OFFER_LINE}
        </p>
      </div>

      <div className="mt-[24px]">
        <Caption>Subject:</Caption>
        <p className="mt-[8px] text-[16px] text-white">
          {quotationSubject(doc)}
        </p>
      </div>
    </div>
  );

  // One page per service, plus an add-on page wherever there are add-ons. The
  // service name is the table's heading too — a separate short label would be
  // one more field for one string, and one more thing to leave stale.
  const servicePages = doc.services.flatMap(
    (service: QuotationService, i: number) => {
      const label = service.name || `Service ${i + 1}`;
      const page = (
        <div
          key={`service-${i}`}
          data-page="own"
          data-page-frame="dark"
          aria-label={label}
          className={PAGE}
        >
          <h2 className="text-[52px] leading-[0.95] font-bold tracking-[-0.02em] text-white uppercase">
            {service.name}
          </h2>
          {service.blurb ? (
            <p className="mt-[8px] text-[14px] leading-[1.3] text-white">
              {service.blurb}
            </p>
          ) : null}
          <div className="mt-auto pb-[24px]">
            <DeliverablesTable
              heading={`Deliverables [${service.name}]`}
              lines={service.lines}
            />
          </div>
        </div>
      );
      if (service.addOns.length === 0) return [page];
      return [
        page,
        <div
          key={`add-ons-${i}`}
          data-page="own"
          data-page-frame="dark"
          aria-label={`${label} add-ons`}
          className={PAGE}
        >
          <DeliverablesTable
            heading="Deliverables [Custom Add-ons]"
            lines={service.addOns}
          />
        </div>,
      ];
    },
  );

  // The recurring table at the top, the summary pinned to the foot by
  // `mt-auto` — the same mechanism the letters' closing block uses.
  const recurring = (
    <div
      key="recurring"
      data-page="own"
      data-page-frame="dark"
      aria-label="Recurring infrastructure"
      className={PAGE}
    >
      {doc.recurring.length > 0 ? (
        <RecurringTable rows={doc.recurring} fixed={totals.recurringFixed} />
      ) : null}
      <div className="mt-auto pb-[16px]">
        <SummaryTable totals={totals} />
      </div>
    </div>
  );

  const details = (
    <div
      key="details"
      data-page="own"
      data-page-frame="dark"
      aria-label="Reference and payment structure"
      className={PAGE}
    >
      <div>
        <Caption>Reference:</Caption>
        {/* '#' is presentation. The stored number is the house
         * `QS-SQ-<fy>-<serial>`, claimed atomically like every other series. */}
        <p className="mt-[8px] text-[14px] text-white">
          #{doc.number ?? "DRAFT"}
        </p>
      </div>

      <div className="my-auto">
        <h2 className="mb-[16px] text-[18px] text-white">
          Payment structure shall be as follows:
        </h2>
        <table className="w-full border-collapse">
          <tbody>
            {phases.map((phase, i) => (
              <tr key={i}>
                <td className="w-[150px] border-b border-white/15 py-[11px] text-[16px] text-white">
                  Phase {i + 1}
                </td>
                <td className="border-b border-white/15 py-[11px] text-[16px] text-white">
                  {phase.label}
                </td>
                <td className="w-[80px] border-b border-white/15 py-[11px] text-right text-[16px] text-white">
                  {phase.percent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <Caption>Terms &amp; Conditions:</Caption>
        {/* Fixed studio copy in a fixed 2×2 grid, numbered so a reader can cite
         * one. Nothing on this document edits them. */}
        <ol className="mt-[10px] grid grid-cols-2 gap-x-[36px] gap-y-[12px] text-[14px] leading-[1.25] text-white/70">
          {QUOTATION_TERMS.map((term, i) => (
            <li key={i} className="flex gap-[6px]">
              <span className="shrink-0">{i + 1}.</span>
              <span>{term}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  // Fixed, never-changing studio copy. `hello@qera.studio` and the Instagram
  // handle are marketing contact points, deliberately distinct from
  // `studioOf(doc).email` (the invoice identity) — this page is never
  // per-document.
  const close = (
    <div
      key="close"
      data-page="own"
      data-page-frame="dark"
      aria-label="Let's collaborate"
      className={PAGE}
    >
      <div className="mt-[128px]">
        <h2 className="max-w-[560px] text-[44px] leading-[1.1] font-bold tracking-[-0.01em] text-white">
          Let&rsquo;s collaborate on what matters to you.
        </h2>
        <p className="mt-[8px] max-w-[440px] text-[14px] leading-[1.25] text-white/70">
          Thank you for considering Qera Studio as your digital infrastructure
          and growth partner.
        </p>
      </div>
      <div className="mt-auto flex justify-between pb-[256px] text-[18px] text-white/70">
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
      <div className="flex flex-col text-[14px] text-white/70 mb-[24px]">
        <p>© Qera Studio. All rights reserved</p>
        <p>Owned by {studio.legalName}, company registered in India</p>
        <p>CIN: {studio.cin}</p>
      </div>
    </div>
  );

  return [cover, ...servicePages, recurring, details, close];
}

/** Shared props for both the workspace preview and `PrintPages` — the pairing
 * that must never disagree, per `ContractPages.tsx`'s note on the same shape. */
export function quotationPageProps(doc: QuotationDocument) {
  const date = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";
  const brandMark = studioOf(doc).brandMark;
  return {
    pagePadding: QUOTATION_PADDING,
    pagePaddingY: QUOTATION_PADDING_Y,
    selfPaddedSheet: false,
    darkPageClassName: "bg-black text-white",
    // Every page is dark. `own` pages read the block's own `data-page-frame`,
    // which each one sets; this covers any page the packer fills itself.
    forceDark: true,
    chromeHeight: SQ_CHROME_HEIGHT,
    // The mark and the date above, the confidentiality note and the page
    // number below, identical on all six-plus pages. Chrome rather than block
    // content, so no page can draw them differently from its neighbour.
    pageHeader: () => (
      // h-[92px] is SQ_HEADER_HEIGHT: the 28px band plus the 64px gap it
      // holds below itself. See that constant for why the padding cannot be
      // outside the height.
      <div className="flex h-[92px] shrink-0 items-center justify-between pb-[64px]">
        <span className="flex items-center gap-[8px]">
          <QeraMark size={12.8} />
          <span className="text-[15px] font-semibold text-white">
            {brandMark}
          </span>
        </span>
        <span className="text-[13px] font-semibold text-white">{date}</span>
      </div>
    ),
    pageFooter: (page: number) => (
      // h-[64px] is SQ_FOOTER_HEIGHT: the 36px gap above the 28px band. It
      // was h-[28px], which floored at the 36px of padding and printed the
      // note and the page number below the page's own margin.
      <div className="mt-auto flex h-[64px] shrink-0 items-center justify-between pt-[36px] text-[12px] text-white/70">
        <span>Confidential &amp; Proprietary</span>
        <span className="tabular-nums">
          Page {String(page + 1).padStart(2, "0")}
        </span>
      </div>
    ),
  };
}
