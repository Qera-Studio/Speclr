import { amountInWords } from "@/lib/domain/amountInWords";
import {
  formatDisplayDate,
  formatDisplayMonth,
  isISODate,
} from "@/lib/domain/dates";
import { formatMoney, lineAmountPaise, slipTotals } from "@/lib/domain/money";
import { contentOf, splitTerms } from "@/lib/domain/docContent";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf } from "@/lib/domain/studio";
import type { LineItem, SlipDocument } from "@/lib/domain/types";
import { A4_PADDING } from "./frame";
import QeraMark from "./QeraMark";

/**
 * The period covered, e.g. '01 Jun 2026 – 30 Jun 2026'.
 *
 * Prefers the ISO start/end pair; falls back to the legacy free-text
 * `stipendPeriod` so slips finalized before the date pickers existed keep
 * printing exactly what they were issued with.
 */
function stipendPeriodLabel(doc: SlipDocument): string {
  const { stipendPeriodStart: start, stipendPeriodEnd: end } = doc;
  if (start && end && isISODate(start) && isISODate(end)) {
    return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
  }
  return doc.stipendPeriod ?? "";
}

const TH =
  "text-black text-[13px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black";
const TD = "py-[6px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top";
/** Money cells: right-aligned, so every figure ends on the column's edge. */
const NUM =
  "text-right text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap";

/**
 * A slip's items and their amounts — Description | Amount, and nothing else.
 *
 * One shape for all three tables (the stipend slip's items, and the pay slip's
 * earnings and deductions) so they cannot drift apart. Rate and quantity have
 * no columns of their own: a slip line is a fixed monthly amount nearly every
 * time, so two columns reading "₹15,000" and "1" were mostly noise, and
 * dropping them is what lets the pay slip stand its earnings and deductions
 * side by side on a page that clips.
 *
 * A line prints its description and nothing else. The free-text detail an
 * invoice line carries is not printed here — on a slip it only ever restated
 * the period and the deductions note, both of which the DETAILS block and TERMS
 * already say, in the places a reader looks for them. The one exception is a
 * line billed by quantity, where the rate × qty working is not a restatement of
 * anything: without it the amount cannot be checked.
 *
 * ponytail: side by side this fits roughly 6 earnings against 5 deductions.
 * Beyond that a row is silently cut, which is exactly the failure the
 * itemisation requirement exists to prevent. The real fix is to flow the slip
 * through the Paginator, as the contract and the letters already do; do that
 * when a slip ever needs a second page.
 */
function ItemsTable({
  caption,
  heading,
  items,
  money,
  emptyLabel,
  className,
}: {
  caption: string;
  heading: string;
  items: LineItem[];
  money: (paise: number) => string;
  /** Printed as a single row when there are no items. Omit to render none. */
  emptyLabel?: string;
  /** Width comes from the caller: one table fills the band, two share it. */
  className: string;
}) {
  return (
    <table
      className={`border-collapse table-fixed mb-[24px] self-start ${className}`}
    >
      <caption className="absolute w-px h-px p-0 -m-px overflow-hidden [clip:rect(0,0,0,0)] whitespace-nowrap">
        {caption}
      </caption>
      <colgroup>
        <col className="w-[62%]" />
        <col className="w-[38%]" />
      </colgroup>
      <thead>
        <tr>
          <th
            scope="col"
            className={`${TH} text-left overflow-hidden [overflow-wrap:anywhere] break-words`}
          >
            {heading}
          </th>
          <th
            scope="col"
            className={`${TH} text-right [font-variant-numeric:tabular-nums] whitespace-nowrap`}
          >
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && emptyLabel ? (
          <tr>
            <td className={`${TD} text-black font-medium text-[14px]`}>
              {emptyLabel}
            </td>
            <td className={`${TD} ${NUM}`}>{money(0)}</td>
          </tr>
        ) : null}
        {items.map((item, index) => {
          // Only worth printing when it is not simply "one of these".
          const working =
            item.qty !== 1 ? `${money(item.ratePaise)} × ${item.qty}` : "";

          return (
            <tr key={index}>
              <td
                className={`${TD} overflow-hidden [overflow-wrap:anywhere] break-words`}
              >
                <span className="block text-black font-medium text-[14px] [overflow-wrap:anywhere]">
                  {item.description || "—"}
                </span>
                {working ? (
                  <span className="block text-black/70 text-[10px] font-normal mt-[2px] [overflow-wrap:anywhere]">
                    {working}
                  </span>
                ) : null}
              </td>
              <td className={`${TD} ${NUM}`}>{money(lineAmountPaise(item))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
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
 * The slip print artifact — financial-shaped but paid to an employee. Serves
 * both slips: the **stipend slip** (`STP`, a voluntary record for an intern)
 * and the **pay slip** (`PAY`, a statutory wage record under the Code on Wages
 * 2019). One component because the header, parties block, QR, footer and terms
 * are identical; two forked sheets would drift.
 *
 * What the pay slip adds is a different arithmetic — `gross − deductions = net`
 * rather than a single total — plus the designation and statutory identifiers a
 * wage slip must carry. Everything guarded by `isPay` below is that difference.
 *
 * Pure props → markup; server-renderable. Mirrors DocumentSheet's paper
 * conventions: every text class sets an explicit colour so global element
 * styles never bleed into the paper.
 */
export default function SlipSheet({ doc }: { doc: SlipDocument }) {
  const spec = DOC_TYPES[doc.type];
  const isPay = doc.type === "PAY";
  const studio = studioOf(doc);
  // Neither slip is taxed, so this is gross → net with nothing in between on a
  // stipend slip, and gross → deductions → net on a pay slip.
  const totals = slipTotals(doc.lineItems, doc.deductions);
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";
  const numberLabel =
    doc.status === "finalized" && doc.number ? `#${doc.number}` : "DRAFT";

  const emp = doc.employeeSnapshot;
  // Keyed on the slip, not the snapshot's engagement type: a pay slip is only
  // ever issued to an employee and a stipend slip only to an intern, and the
  // finalize guard is what enforces it.
  const accountHeading = isPay ? "EMPLOYEE ACCOUNT" : "INTERN ACCOUNT";

  /**
   * Statutory identifiers, pay slip only. An identifier that does not exist is
   * omitted rather than dashed — PF and ESIC numbers only exist once the studio
   * is registered for those schemes, and a row reading "—" implies the number
   * exists and was simply not looked up.
   */
  const payrollIds: { label: string; value: string }[] = isPay
    ? [
        { label: "Employee code", value: emp.payroll?.employeeCode },
        { label: "PAN", value: emp.payroll?.pan },
        { label: "UAN", value: emp.payroll?.uan },
        { label: "PF No.", value: emp.payroll?.pfNumber },
        { label: "ESIC No.", value: emp.payroll?.esicNumber },
      ].filter((id): id is { label: string; value: string } =>
        Boolean(id.value),
      )
    : [];

  // A slip is paid in one currency and prints in it. Slips issued before
  // currencies existed carry none and fall back to rupees — never re-label an
  // issued amount.
  const currency = doc.currency ?? "INR";
  const money = (paise: number) => formatMoney(paise, currency);

  /**
   * The net, which is the one figure on a slip that can legitimately be signed.
   *
   * `formatMoney` refuses negatives on purpose — no other amount on any
   * document may be one — but deductions exceeding gross is reachable by
   * mistyping a figure, and the editor renders this sheet live on every
   * keystroke. Throwing there would blank the preview mid-edit and hide the
   * typo behind a crash. It prints as a signed amount instead, so the mistake
   * is visible; `payslipFinalizeSchema` is what stops it being issued.
   */
  const signedMoney = (paise: number) =>
    paise < 0 ? `−${money(-paise)}` : money(paise);

  // Masthead, PAID note, TERMS and the thanks line all come through the
  // content layer: defaults while the slip is untouched, its own frozen copy
  // once finalized. The terms still branch on engagement type — that default
  // lives in `hrContent` and is resolved by `contentOf`.
  const text = contentOf(doc, spec);
  const terms = splitTerms(text.terms);

  const monthLabel = formatDisplayMonth(doc.stipendMonth);
  const periodLabel = stipendPeriodLabel(doc);

  /**
   * The day counts, which always print on a pay slip.
   *
   * A slip issued before they existed, or one whose counts were cleared, shows
   * "—" rather than a fabricated "30 / 30". The editor defaults them to the
   * month's length, so the dash means "not recorded", never "zero".
   */
  const daysPaidLabel =
    doc.daysPaid === undefined
      ? "—"
      : doc.daysInPeriod === undefined
        ? String(doc.daysPaid)
        : `${doc.daysPaid} / ${doc.daysInPeriod}`;
  const lopLabel =
    doc.lopDays === undefined
      ? "—"
      : doc.lopDays === 1
        ? "1 day"
        : `${doc.lopDays} days`;

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
          {/* Designation is a prescribed wage-slip field, so it prints here on a
              pay slip. The stipend slip's issued layout does not carry it. */}
          {isPay && emp.role ? (
            <p className="text-black/80 text-[12px] font-normal mb-[6px]">
              {emp.role}
            </p>
          ) : null}
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
          {/* The studio's counterpart to the employee's designation, and the
              same rule: pay slip only. "Employer" is the statutory role — the
              Code on Wages 2019 and Payment of Wages Act s.13A put the duty to
              issue a wage slip on the employer. On a stipend slip it would
              assert the very employment relationship the slip's first clause
              exists to deny (CONTEXT.md §6a), so nothing prints there. */}
          {isPay ? (
            <p className="text-black/80 text-[12px] font-normal mb-[6px]">
              Employer
            </p>
          ) : null}
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

      {/*
        Flexible line-items band — see the note in DocumentSheet.

        The pay slip lays earnings and deductions side by side, which is both
        the conventional Indian wage-slip form and the only one that fits: the
        A4 frame clips, and stacked they overflowed it — the deductions header
        printed while its rows were cut, leaving a "total deductions" figure the
        reader could not check. Halving the vertical cost is what makes the
        itemisation the Payment of Wages Act asks for actually visible.
      */}
      <div
        className={`flex min-h-0 flex-1 overflow-hidden ${
          isPay ? "gap-[24px]" : "flex-col"
        }`}
      >
        <ItemsTable
          caption={isPay ? "Earnings" : "Line items"}
          heading={isPay ? "Earnings" : "Description"}
          items={doc.lineItems}
          money={money}
          className={isPay ? "flex-1 min-w-0" : "w-full"}
        />

        {/*
          Deductions, pay slip only, and always printed — with a `Nil` row when
          nothing was withheld. A wage slip has to itemise what was deducted
          (Payment of Wages Act s.7 permits only prescribed deductions, s.13A
          requires them recorded), and "Nil" states that positively where an
          absent table leaves the reader to infer it.
        */}
        {isPay ? (
          <ItemsTable
            caption="Deductions"
            heading="Deductions"
            items={doc.deductions ?? []}
            money={money}
            emptyLabel="Nil"
            className="flex-1 min-w-0"
          />
        ) : null}
      </div>

      <div className="ml-auto w-[50%] mb-[24px]">
        <div className="flex justify-between gap-[16px] py-[3px]">
          <span className="text-black/70 text-[12px] font-normal">
            {isPay ? "gross earnings" : "subtotal"}
          </span>
          <span className="text-black/70 text-[12px] font-normal [font-variant-numeric:tabular-nums] text-right">
            {money(totals.grossPaise)}
          </span>
        </div>
        {/*
          No GST line, deliberately and permanently. Neither slip is
          consideration for a supply by the studio, so both stay outside GST
          even once the studio is registered — a "GST: not applicable" row would
          imply the question was open. See the note on SlipDocument.
        */}
        {isPay ? (
          <div className="flex justify-between gap-[16px] py-[3px]">
            <span className="text-black/70 text-[12px] font-normal">
              total deductions
            </span>
            <span className="text-black/70 text-[12px] font-normal [font-variant-numeric:tabular-nums] text-right">
              −{money(totals.deductionsPaise)}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-[16px] py-[3px] border-t border-black mt-[3px] pt-[6px]">
          <span className="text-black text-[14px] font-medium">
            {isPay ? "NET PAY" : "NET STIPEND PAID"}
          </span>
          <span className="text-black text-[14px] font-medium [font-variant-numeric:tabular-nums] text-right">
            {signedMoney(totals.netPaise)}
          </span>
        </div>
        <p className="text-right text-black/70 text-[12px] font-normal">
          {totals.netPaise >= 0 ? amountInWords(totals.netPaise, currency) : ""}
        </p>
      </div>

      <div className="mt-auto">
        {/*
          Payment + period sit directly under the totals, separated by a rule:
          they qualify the amount above them, so they belong with it rather than
          down among the account and terms boilerplate. The rule replaces a
          green "PAID" banner — it asserted nothing the PAYMENT VIA block below
          does not say more precisely, and it said it in a colour that cost a
          print run of ink.
        */}
        <div
          className={`grid gap-[32px] items-start mb-[2px] border-t border-[#d9d9d9] pt-[16px] ${
            isPay
              ? "grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]"
              : "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          }`}
        >
          <section aria-label="Payment method" className="min-w-0">
            <h3 className="text-black text-[14px] font-bold tracking-[-0.01em] mb-[4px]">
              PAYMENT VIA
            </h3>
            <dl className="m-0">
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] shrink-0">
                  Method
                </dt>
                <dd className="m-0 min-w-0 text-black text-[12px] font-medium [overflow-wrap:anywhere]">
                  {doc.paymentMethod}
                </dd>
              </div>
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] shrink-0">
                  Date
                </dt>
                <dd className="m-0 min-w-0 text-black text-[12px] font-medium [overflow-wrap:anywhere]">
                  {displayDate}
                </dd>
              </div>
              {doc.paymentReference ? (
                <div className="flex">
                  <dt className="text-black/70 text-[12px] font-normal min-w-[90px] shrink-0">
                    Reference
                  </dt>
                  <dd className="m-0 min-w-0 text-black text-[12px] font-medium [overflow-wrap:anywhere]">
                    {doc.paymentReference}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section
            aria-label={isPay ? "Pay details" : "Stipend details"}
            className="text-left"
          >
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
                  {isPay ? "Salary month" : "Stipend month"}
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium text-right">
                  {monthLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-[16px]">
                <dt className="text-black/70 text-[12px] font-normal">
                  {isPay ? "Salary period" : "Period"}
                </dt>
                <dd className="m-0 text-black text-[12px] font-medium text-right">
                  {periodLabel}
                </dd>
              </div>
              {/*
                Days worked and paid are prescribed wage-slip contents, so they
                always print on a pay slip — including a nil loss of pay. A
                blank where a prescribed figure belongs reads as an omission;
                "0 days" is a statement.
              */}
              {isPay ? (
                <>
                  <div className="flex justify-between gap-[16px]">
                    <dt className="text-black/70 text-[12px] font-normal">
                      Days paid
                    </dt>
                    <dd className="m-0 text-black text-[12px] font-medium text-right [font-variant-numeric:tabular-nums]">
                      {daysPaidLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-[16px]">
                    <dt className="text-black/70 text-[12px] font-normal">
                      Loss of pay
                    </dt>
                    <dd className="m-0 text-black text-[12px] font-medium text-right [font-variant-numeric:tabular-nums]">
                      {lopLabel}
                    </dd>
                  </div>
                </>
              ) : null}
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

          {/*
            The statutory identifiers, in their own column rather than tucked
            under the recipient's address. They are wage-slip contents in their
            own right, and the pay slip's DETAILS list is long enough that a
            third column is what keeps all three readable.
          */}
          {isPay ? (
            <section aria-label="Statutory identifiers" className="text-left">
              <h3 className="text-black text-[14px] font-bold tracking-[-0.01em] mb-[4px]">
                EMPLOYEE
              </h3>
              <dl className="m-0">
                {payrollIds.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-[16px]">
                    <dt className="text-black/70 text-[12px] font-normal">
                      {label}
                    </dt>
                    <dd className="m-0 text-black text-[12px] font-medium text-right [font-variant-numeric:tabular-nums]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
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
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] shrink-0 mb-[2px]">
                  Bank
                </dt>
                <dd className="m-0 min-w-0 text-black text-[12px] font-medium [overflow-wrap:anywhere]">
                  {emp.bank.bankName}
                </dd>
              </div>
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] shrink-0 mb-[2px]">
                  Account No.
                </dt>
                <dd className="m-0 min-w-0 text-black text-[12px] font-medium [overflow-wrap:anywhere]">
                  {emp.bank.accountNo}
                </dd>
              </div>
              <div className="flex">
                <dt className="text-black/70 text-[12px] font-normal min-w-[90px] shrink-0 mb-[2px]">
                  IFSC code
                </dt>
                <dd className="m-0 min-w-0 text-black text-[12px] font-medium [overflow-wrap:anywhere]">
                  {emp.bank.ifsc}
                </dd>
              </div>
              {emp.bank.upiId ? (
                <div className="flex">
                  <dt className="text-black/70 text-[12px] font-normal min-w-[90px] shrink-0 mb-[2px]">
                    UPI ID
                  </dt>
                  <dd className="m-0 min-w-0 text-black text-[12px] font-medium [overflow-wrap:anywhere]">
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
