import { amountInWords } from "@/lib/domain/amountInWords";
import {
  formatDisplayDate,
  formatDisplayMonth,
  isISODate,
} from "@/lib/domain/dates";
import {
  computeTotals,
  formatMoney,
  lineAmountPaise,
} from "@/lib/domain/money";
import { contentOf, splitTerms } from "@/lib/domain/docContent";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf } from "@/lib/domain/studio";
import type { StipendDocument } from "@/lib/domain/types";
import { A4_PADDING } from "./frame";

/** Qera mark from public/assets/landing/navbarLogo.svg, inlined in full black. */
function QeraMark() {
  return (
    <svg
      viewBox="0 0 171 173"
      className="w-[16px] h-[16px] shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.863281 166.353C-0.286575 167.52 -0.286499 169.395 0.863281 170.562L1.88281 171.598C3.05795 172.791 4.98206 172.791 6.15723 171.598L7.24414 170.494H5.37891C3.72235 170.494 2.37904 169.151 2.37891 167.494V164.813L0.863281 166.353ZM5.37988 25.5391C3.72302 25.5391 2.37891 26.8822 2.37891 28.5391V164.813L34.2188 132.481C35.394 131.288 37.3181 131.289 38.4932 132.482L39.5137 133.518C40.6635 134.685 40.6634 136.56 39.5137 137.728L7.24414 170.494H142.513C144.169 170.494 145.513 169.151 145.513 167.494V145.518C145.513 145.408 145.422 145.32 145.312 145.325C145.207 145.33 145.125 145.421 145.13 145.526L145.138 145.709L145.12 145.346C145.12 145.34 145.114 145.335 145.108 145.335C145.1 145.335 145.087 145.336 145.071 145.337C145.039 145.338 144.99 145.34 144.927 145.343C144.798 145.348 144.607 145.356 144.356 145.364C143.855 145.381 143.114 145.403 142.163 145.421C140.26 145.456 137.509 145.477 134.125 145.416C127.355 145.294 118.049 144.848 107.909 143.551C97.7678 142.254 86.7989 140.106 76.6982 136.586C66.5946 133.064 57.382 128.176 50.7295 121.412C44.0762 114.647 39.2658 105.311 35.7988 95.083C32.3329 84.8586 30.2172 73.7672 28.9375 63.5176C27.658 53.2694 27.2153 43.8701 27.0928 37.0332C27.0315 33.6155 27.05 30.8378 27.084 28.916C27.101 27.9557 27.1221 27.2085 27.1387 26.7021C27.1469 26.4493 27.1541 26.2555 27.1592 26.126C27.1617 26.0616 27.1636 26.0121 27.165 25.9795C27.1657 25.9638 27.1666 25.9514 27.167 25.9434C27.1671 25.9419 27.1671 25.9404 27.1671 25.9389C27.167 25.9367 27.1674 25.9345 27.1681 25.9323C27.1687 25.9306 27.169 25.9287 27.1691 25.9269L27.1709 25.8848C27.1791 25.6962 27.0276 25.5391 26.8389 25.5391H5.37988ZM30.8516 0C28.9878 0.00026386 27.4766 1.51121 27.4766 3.375V21.6992C27.4766 23.4305 28.7874 24.8809 30.5098 25.0566L129.54 35.1483C132.366 35.4363 134.603 37.6664 134.899 40.4914L145.541 141.933C145.721 143.65 147.171 144.955 148.898 144.955H166.865C168.729 144.955 170.24 143.444 170.24 141.58V72.9375C170.24 72.0637 169.901 71.2238 169.295 70.5947L135.002 35.0391L134.995 35.0332L134.989 35.0273L98.873 0.920898C98.2467 0.329739 97.4179 9.72251e-05 96.5566 0H30.8516Z"
        fill="#000000"
      />
    </svg>
  );
}

/**
 * The period covered, e.g. '01 Jun 2026 – 30 Jun 2026'.
 *
 * Prefers the ISO start/end pair; falls back to the legacy free-text
 * `stipendPeriod` so slips finalized before the date pickers existed keep
 * printing exactly what they were issued with.
 */
function stipendPeriodLabel(doc: StipendDocument): string {
  const { stipendPeriodStart: start, stipendPeriodEnd: end } = doc;
  if (start && end && isISODate(start) && isISODate(end)) {
    return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
  }
  return doc.stipendPeriod ?? "";
}

/** One fixed term in the slip's TERMS block: a bold lead-in, then the body. */
function Term({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <p className="text-black/70 text-[8px] font-normal leading-[1.4] mb-[2px] [break-inside:avoid]">
      <strong className="text-black font-semibold">{title}</strong> {children}
    </p>
  );
}

/**
 * The stipend slip print artifact — financial-shaped but paid to an employee.
 * Pure props → markup; server-renderable. Mirrors DocumentSheet's paper
 * conventions: every text class sets an explicit colour so global element
 * styles never bleed into the paper.
 */
export default function StipendSheet({ doc }: { doc: StipendDocument }) {
  const spec = DOC_TYPES[doc.type];
  const studio = studioOf(doc);
  const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";
  const numberLabel =
    doc.status === "finalized" && doc.number ? `#${doc.number}` : "DRAFT";

  const emp = doc.employeeSnapshot;
  const accountHeading =
    emp.engagementType === "intern" ? "INTERN ACCOUNT" : "EMPLOYEE ACCOUNT";

  // A stipend is paid in one currency and prints in it. Slips issued before
  // currencies existed carry none and fall back to rupees — never re-label an
  // issued amount.
  const currency = doc.currency ?? "INR";
  const money = (paise: number) => formatMoney(paise, currency);

  // Masthead, PAID note, TERMS and the thanks line all come through the
  // content layer: defaults while the slip is untouched, its own frozen copy
  // once finalized. The terms still branch on engagement type — that default
  // lives in `hrContent` and is resolved by `contentOf`.
  const text = contentOf(doc, spec);
  const terms = splitTerms(text.terms);

  const monthLabel = formatDisplayMonth(doc.stipendMonth);
  const periodLabel = stipendPeriodLabel(doc);

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
          <p className="font-bold text-[12px] text-black mt-[4px]">
            {numberLabel}
          </p>
        </div>
      </header>

      <section
        className="grid grid-cols-2 pt-[16px] pb-[24px] max-w-[600px]"
        aria-label="Paid to and from"
      >
        <div>
          <h3 className="text-black/80 text-[12px] font-normal mb-[4px]">
            paid to:
          </h3>
          <p className="text-black font-semibold text-[16px]">
            {emp.name || "—"}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line mb-[6px]">
            {emp.address}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
            {emp.phone}
          </p>
          <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
            {emp.email}
          </p>
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
        </div>
      </section>

      {/* Flexible line-items band — see the note in DocumentSheet. */}
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
                    <span className="block text-black/70 text-[10px] font-normal mt-[2px] [overflow-wrap:anywhere] max-w-[325px]">
                      {item.detail}
                    </span>
                  ) : null}
                </td>
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {money(item.ratePaise)}
                </td>
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {item.qty}
                </td>
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {money(lineAmountPaise(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-[60%] mb-[24px]">
        <div className="flex justify-between gap-[16px] py-[3px]">
          <span className="text-black/70 text-[12px] font-normal">
            subtotal
          </span>
          <span className="text-black/70 text-[12px] font-normal [font-variant-numeric:tabular-nums] text-right">
            {money(totals.subtotalPaise)}
          </span>
        </div>
        {/*
          No GST line, deliberately and permanently. A stipend is not
          consideration for a supply by the studio, so it stays outside GST even
          once the studio is registered — a "GST: not applicable" row would
          imply the question was open. See the note on StipendDocument.
        */}
        <div className="flex justify-between gap-[16px] py-[3px] border-t border-black mt-[3px] pt-[6px]">
          <span className="text-black text-[14px] font-medium">
            NET STIPEND PAID
          </span>
          <span className="text-black text-[14px] font-medium [font-variant-numeric:tabular-nums] text-right">
            {money(totals.totalPaise)}
          </span>
        </div>
        <p className="text-right text-black/70 text-[12px] font-normal">
          {amountInWords(totals.totalPaise, currency)}
        </p>
      </div>

      <div className="mt-auto">
        {spec.badge ? (
          <div className="bg-[#eef7e6] border border-[#a9d489] rounded-[6px] px-[14px] py-[10px] mb-[8px] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
            <p className="text-[#4ca014] font-bold text-[14px]">
              • {text.badgeText}
            </p>
            <p className="text-black/70 text-[10px] font-normal mt-[2px]">
              {text.badgeNote}
            </p>
          </div>
        ) : null}

        {/*
          Payment + period sit above the divider, directly under the PAID
          banner: they qualify the payment that banner asserts, so they belong
          with it rather than down among the account and terms boilerplate.
        */}
        <div className="flex justify-between gap-[32px] items-start mb-[2px]">
          <section aria-label="Payment method">
            <h3 className="text-black text-[14px] font-bold tracking-[-0.01em] mb-[4px]">
              PAYMENT VIA
            </h3>
            <dl className="m-0">
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px]">
                  Method
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium">
                  {doc.paymentMethod}
                </dd>
              </div>
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px]">
                  Date
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium">
                  {displayDate}
                </dd>
              </div>
              {doc.paymentReference ? (
                <div className="flex">
                  <dt className="text-black/70 text-[12px] font-normal min-w-[90px]">
                    Reference
                  </dt>
                  <dd className="m-0 text-black text-[12px] font-medium">
                    {doc.paymentReference}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section aria-label="Stipend details" className="text-left">
            <h3 className="text-black text-[14px] font-bold tracking-[-0.01em] mb-[4px]">
              DETAILS
            </h3>
            {/*
              `justify-between` per row, not `justify-start` with a min-width on
              the value: each row then spans the whole list, so labels hug the
              left and values hug the right and every value ends on the same
              edge. Sizing each row to its own content left the three values
              ragged, because both the labels and the values differ in width.
            */}
            <dl className="m-0">
              <div className="flex justify-between gap-[16px]">
                <dt className="text-black/70 text-[12px] font-normal">
                  Stipend month
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium text-right">
                  {monthLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-[16px]">
                <dt className="text-black/70 text-[12px] font-normal">
                  Period
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium text-right">
                  {periodLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-[16px]">
                <dt className="text-black/70 text-[12px] font-normal">
                  Issued
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium text-right">
                  {displayDate}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {/*
          Three tracks, copying the invoice's footer: account details, the QR in
          its own `auto` column, then terms. `auto` keeps the QR at its natural
          width so it cannot squeeze the columns either side — the stipend used
          to stack it under the account block for exactly that reason.
        */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)] gap-[24px] items-start border-t border-[#d9d9d9] pt-[16px] mb-[2px]">
          <section aria-label="Recipient bank account">
            <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
              {accountHeading}
            </h3>
            {/* Row shape matches the invoice's PAYMENT block: plain flex, no gap. */}
            <dl className="m-0">
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] mb-[2px]">
                  Bank
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium">
                  {emp.bank.bankName}
                </dd>
              </div>
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] mb-[2px]">
                  Account No.
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium">
                  {emp.bank.accountNo}
                </dd>
              </div>
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] mb-[2px]">
                  IFSC code
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium">
                  {emp.bank.ifsc}
                </dd>
              </div>
              {emp.bank.upiId ? (
                <div className="flex">
                  <dt className="text-black/70 text-[12px] font-normal min-w-[90px] mb-[2px]">
                    UPI ID
                  </dt>
                  <dd className="m-0 text-black text-[12px] font-medium">
                    {emp.bank.upiId}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/*
            The recipient's UPI QR, in its own grid track — the invoice's layout
            (75×75, centred, `pt-[34px]` to sit level with the `dl` beside it,
            caption in small caps).

            Unlike the invoice, the image is a per-employee data URL read from
            the frozen snapshot, not a static studio asset: an issued slip must
            keep showing the QR that was current when it was issued, even if the
            recipient later changes bank. Slips issued before QRs existed have
            none and this track collapses. print-color-adjust stops the printer
            dropping it.
          */}
          {emp.bank.upiQrDataUrl ? (
            <div className="flex flex-col items-center gap-[4px] pt-[34px] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emp.bank.upiQrDataUrl}
                alt={`UPI QR code for ${emp.name || "the recipient"}`}
                width={75}
                height={75}
                className="w-[75px] h-[75px] object-contain bg-white"
              />
              <p className="text-black/70 text-[12px] font-normal uppercase tracking-[0.04em]">
                {text.qrCaption}
              </p>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}

          <section aria-label="Terms">
            <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[2px]">
              TERMS
            </h3>
            {/*
              Two explicit columns rather than `column-count: 2`. Balanced
              columns would re-flow whenever a term's length changes — and the
              editable deductions note makes that length variable. The split is
              fixed so the slip stays a pixel-faithful artifact.

              The wording branches on engagement type and lives in `hrContent`
              beside the letters' engagement-dependent text — the intern variant
              denies an employer–employee relationship, which is correct for an
              intern and wrong for an employee. `deductionsNote` is a legal
              assertion whose truth depends on the engagement, so it stays
              editable rather than becoming fixed boilerplate (CONTEXT.md); it
              is folded into the pay term, which is where it prints.
            */}
            <div className="grid grid-cols-2 gap-x-[16px] items-start">
              <div>
                {terms.left.map((term, i) => (
                  <Term key={i} title={term.title}>
                    {term.body}
                  </Term>
                ))}
              </div>
              <div>
                {terms.right.map((term, i) => (
                  <Term key={i} title={term.title}>
                    {term.body}
                  </Term>
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer className="flex justify-between gap-[12px] flex-wrap border-t border-[#d9d9d9] pt-[10px] text-black/70 text-[10px] font-normal">
          <span>{text.thanksLine}</span>
          <span>Queries: {studio.queryEmailHr}</span>
          <span>CIN: {studio.cin}</span>
          <span>{displayDate}</span>
          <span>{numberLabel}</span>
        </footer>
      </div>
    </article>
  );
}
