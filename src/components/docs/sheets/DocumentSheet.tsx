import Image from "next/image";
import { amountInWords } from "@/lib/domain/amountInWords";
import { formatDisplayDate, isISODate } from "@/lib/domain/dates";
import { gstStateName } from "@/lib/domain/gstStates";
import {
  computeTotals,
  formatINR,
  lineAmountPaise,
  splitGST,
} from "@/lib/domain/money";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf } from "@/lib/domain/studio";
import { contentOf } from "@/lib/domain/docContent";
import type { InvoiceDocument, ReceiptDocument } from "@/lib/domain/types";
import { A4_PADDING } from "./frame";
import QeraMark from "./QeraMark";

/**
 * THE print artifact — the single source of markup for both the editor's live
 * preview and the print route. Pure props → markup; server-renderable.
 * Every text class sets an explicit colour — global element styles must never
 * bleed into the paper.
 */
export default function DocumentSheet({
  doc,
}: {
  doc: InvoiceDocument | ReceiptDocument;
}) {
  const spec = DOC_TYPES[doc.type];
  const studio = studioOf(doc);
  // Every printed word that is editable: masthead, TERMS, the PAID note, the
  // thanks line. Defaults when the document has never been edited; its own
  // frozen copy once finalized.
  const text = contentOf(doc, spec);
  const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";

  const hasGst = doc.gstRatePercent > 0;
  const intraState = doc.placeOfSupplyStateCode === studio.stateCode;
  const supplyStateName = gstStateName(doc.placeOfSupplyStateCode);
  const { cgstPaise, sgstPaise } = splitGST(totals.gstPaise);

  return (
    <article
      className={`print-sheet relative bg-white text-black font-sans text-[12px] leading-[1.5] ${A4_PADDING} box-border w-[794px] h-[1123px] flex flex-col overflow-hidden`}
      aria-label={`${spec.label} ${doc.number ?? "draft"}`}
    >
      <header className="flex justify-between items-start gap-[24px] mb-[8px] border-b border-[#d9d9d9] pb-[16px]">
        <h2 className="text-[96px] font-bold tracking-[-0.03em] leading-[0.9] uppercase text-black">
          {text.masthead}
        </h2>
        <div className="text-right shrink-0 pt-[4px]">
          <p className="flex items-center justify-end gap-[6px] text-black">
            <QeraMark />
            <span className="font-semibold text-[16px] text-black">
              {studio.brandMark}
            </span>
          </p>
          <p className="font-semibold text-[12px] text-black mt-[4px]">
            {displayDate}
          </p>
          {doc.type === "REC" && doc.payment.againstInvoiceNumber ? (
            <p className="text-black/70 text-[10px] font-normal mt-[4px]">
              Payment Receipt against Invoice
              <br />#{doc.payment.againstInvoiceNumber}
            </p>
          ) : null}
          {doc.type === "INV" && doc.dueDate && isISODate(doc.dueDate) ? (
            <p className="text-black/70 text-[10px] font-normal mt-[4px]">
              Due {formatDisplayDate(doc.dueDate)}
            </p>
          ) : null}
          <p className="font-bold text-[12px] text-black mt-[4px]">
            {doc.number ? `#${doc.number}` : "DRAFT"}
          </p>
        </div>
      </header>

      {/*
        Same treatment as the stipend slip's parties block: the divider sits on
        the header, the two columns are held to a readable measure instead of a
        fixed gap, and the address is separated from the contact lines rather
        than run together with them.
      */}
      <section
        className="grid grid-cols-2 pt-[16px] pb-[24px] max-w-[600px]"
        aria-label="Billed to and from"
      >
        <div>
          <h3 className="text-black/80 text-[12px] font-normal mb-[4px]">
            billed to:
          </h3>
          {/* The legal name, not the short reference name. Snapshots frozen
              before companyName existed fall back to `name`. */}
          <p className="text-black font-semibold text-[16px]">
            {doc.clientSnapshot.companyName || doc.clientSnapshot.name || "—"}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line mb-[6px]">
            {doc.clientSnapshot.address}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
            {doc.clientSnapshot.phone}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
            {doc.clientSnapshot.email}
          </p>
          {doc.clientSnapshot.gstin ? (
            <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
              GSTIN: {doc.clientSnapshot.gstin}
            </p>
          ) : null}
        </div>
        <div>
          <h3 className="text-black/80 text-[12px] font-normal mb-[4px]">
            from:
          </h3>
          <p className="text-black font-semibold text-[16px]">
            {studio.legalName}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line mb-[6px]">
            {studio.address}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
            {studio.phone}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
            {studio.email}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
            GSTIN: {studio.gstin}
          </p>
        </div>
      </section>

      {/*
        The line-items region is the one flexible band on the page.
        `min-h-0` + `flex-1` lets it give up space as items are added, so the
        totals and the footer below stay on the paper instead of being pushed
        past the fixed A4 height and silently clipped by the frame's
        overflow-hidden. Long item lists lose room here, never the money.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <table className="w-full border-collapse table-fixed mb-[24px]">
          <caption className="absolute w-px h-px p-0 -m-px overflow-hidden [clip:rect(0,0,0,0)] whitespace-nowrap">
            Line items
          </caption>
          <colgroup>
            <col className="w-[50%]" />
            <col className="w-[22%]" />
            <col className="w-[8%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left text-black text-[13px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black overflow-hidden [overflow-wrap:anywhere] break-words"
              >
                Description
              </th>
              <th
                scope="col"
                className="text-left text-black text-[13px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black [font-variant-numeric:tabular-nums] whitespace-nowrap"
              >
                Rate
              </th>
              <th
                scope="col"
                className="text-left text-black text-[13px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black [font-variant-numeric:tabular-nums] whitespace-nowrap"
              >
                Qty.
              </th>
              <th
                scope="col"
                className="text-left text-black text-[13px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black [font-variant-numeric:tabular-nums] whitespace-nowrap"
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((item, index) => (
              <tr key={index}>
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top overflow-hidden [overflow-wrap:anywhere] break-words">
                  <span className="block text-black font-medium text-[14px] [overflow-wrap:anywhere]">
                    {item.description || "—"}
                  </span>
                  {item.detail ? (
                    <span className="block text-black/70 text-[10px] font-normal mt-[2px] [overflow-wrap:anywhere]">
                      {item.detail}
                    </span>
                  ) : null}
                </td>
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {formatINR(item.ratePaise)}
                </td>
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {item.qty}
                </td>
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {formatINR(lineAmountPaise(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-[50%] mb-[24px]">
        <div className="flex justify-between gap-[16px] py-[3px]">
          <span className="text-black/70 text-[12px] font-normal">
            subtotal
          </span>
          <span className="text-black/70 text-[12px] font-normal [font-variant-numeric:tabular-nums] text-right">
            {formatINR(totals.subtotalPaise)}
          </span>
        </div>
        {hasGst ? (
          intraState ? (
            <>
              <div className="flex justify-between gap-[16px] py-[3px]">
                <span className="text-black/70 text-[12px] font-normal">
                  CGST ({doc.gstRatePercent / 2}%)
                </span>
                <span className="text-black/70 text-[12px] font-normal [font-variant-numeric:tabular-nums] text-right">
                  {formatINR(cgstPaise)}
                </span>
              </div>
              <div className="flex justify-between gap-[16px] py-[3px]">
                <span className="text-black/70 text-[12px] font-normal">
                  SGST ({doc.gstRatePercent / 2}%)
                </span>
                <span className="text-black/70 text-[12px] font-normal [font-variant-numeric:tabular-nums] text-right">
                  {formatINR(sgstPaise)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-[16px] py-[3px]">
              <span className="text-black/70 text-[12px] font-normal">
                IGST ({doc.gstRatePercent}%)
              </span>
              <span className="text-black/70 text-[12px] font-normal [font-variant-numeric:tabular-nums] text-right">
                {formatINR(totals.gstPaise)}
              </span>
            </div>
          )
        ) : (
          <div className="flex justify-between gap-[16px] py-[3px]">
            <span className="text-black/70 text-[12px] font-normal">GST</span>
            <span className="text-black/70 text-[12px] font-normal text-right">
              {doc.gstLabel ?? "not applicable"}
            </span>
          </div>
        )}
        {hasGst && supplyStateName ? (
          <p className="text-black/70 text-[12px] font-normal text-right py-[2px]">
            Place of supply: {supplyStateName}
          </p>
        ) : null}
        <div className="flex justify-between gap-[16px] py-[3px] border-t border-black mt-[3px] pt-[6px]">
          <span className="text-black text-[14px] font-medium">TOTAL DUE</span>
          <span className="text-black text-[14px] font-medium [font-variant-numeric:tabular-nums] text-right">
            {formatINR(totals.totalPaise)}
          </span>
        </div>
        <p className="text-right text-black/70 text-[12px] font-normal">
          {amountInWords(totals.totalPaise)}
        </p>
      </div>

      {/*
        The receipt used to open this block with a green "PAID" banner. The
        divider on the grid below already separates the totals from the payment
        details, and the PAYMENT block states the same thing more precisely.
      */}
      <div className="mt-auto">
        <div
          className={
            doc.type === "INV"
              ? "grid grid-cols-[1fr_auto_1.5fr] gap-[24px] items-start border-t border-[#d9d9d9] pt-[16px] mb-[8px]"
              : "grid grid-cols-[1fr_1.3fr] gap-[8px] items-start border-t border-[#d9d9d9] pt-[8px] mb-[8px]"
          }
        >
          {doc.type === "INV" ? (
            <>
              <section aria-label="Payment details">
                <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
                  PAYMENT
                </h3>
                <dl className="m-0">
                  <div className="flex">
                    <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                      Bank
                    </dt>
                    <dd className="m-0 text-black text-[11px] font-medium">
                      {studio.bank.bankName}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                      Account No.
                    </dt>
                    <dd className="m-0 text-black text-[11px] font-medium">
                      {studio.bank.accountNo}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                      IFSC code
                    </dt>
                    <dd className="m-0 text-black text-[11px] font-medium">
                      {studio.bank.ifsc}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                      UPI ID
                    </dt>
                    <dd className="m-0 text-black text-[11px] font-medium">
                      {studio.bank.upiId}
                    </dd>
                  </div>
                </dl>
              </section>
              <div className="flex flex-col items-center gap-[4px] pt-[44px]">
                <Image
                  src="/assets/admin/scanToPay.png"
                  alt="UPI payment QR code"
                  width={75}
                  height={75}
                  className="w-[75px] h-[75px]"
                />
                <p className="text-black/70 text-[10px] font-normal uppercase tracking-[0.04em]">
                  {text.qrCaption}
                </p>
              </div>
            </>
          ) : (
            <section aria-label="Payment details">
              <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
                PAYMENT
              </h3>
              <dl className="m-0">
                <div className="flex">
                  <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                    Payment date
                  </dt>
                  <dd className="m-0 text-black text-[11px] font-medium">
                    {doc.payment.date && isISODate(doc.payment.date)
                      ? formatDisplayDate(doc.payment.date)
                      : "—"}
                  </dd>
                </div>
                {doc.payment.reference ? (
                  <div className="flex">
                    <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                      Payment reference
                    </dt>
                    <dd className="m-0 text-black text-[11px] font-medium">
                      {doc.payment.reference}
                    </dd>
                  </div>
                ) : null}
                <div className="flex">
                  <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                    Payment method
                  </dt>
                  <dd className="m-0 text-black text-[11px] font-medium">
                    {doc.payment.method}
                  </dd>
                </div>
              </dl>
            </section>
          )}
          <section aria-label="Terms">
            <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
              TERMS
            </h3>
            <div className="[column-count:2] [column-gap:24px]">
              {/* Keyed by position, not title: titles are editable now, so two
                  can be identical or blank while being typed. */}
              {text.terms.map((term, i) => (
                <p
                  key={i}
                  className="text-black/70 text-[8px] font-normal [break-inside:avoid] leading-[1.4]"
                >
                  <strong className="text-black font-semibold">
                    {term.title}
                  </strong>{" "}
                  {term.body}
                </p>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex justify-between gap-[16px] flex-wrap border-t border-[#d9d9d9] pt-[8px] text-black/70 text-[10px] font-normal">
          <span>{text.thanksLine}</span>
          <span>Queries: {studio.email}</span>
          <span>{displayDate}</span>
          <span>{doc.number ? `#${doc.number}` : "DRAFT"}</span>
        </footer>
      </div>
    </article>
  );
}
