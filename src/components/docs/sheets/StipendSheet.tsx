import { amountInWords } from '@/lib/domain/amountInWords';
import { formatDisplayDate, isISODate } from '@/lib/domain/dates';
import { computeTotals, formatINR, lineAmountPaise } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import { STUDIO_INFO } from '@/lib/domain/studio';
import type { StipendDocument } from '@/lib/domain/types';

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
 * The stipend slip print artifact — financial-shaped but paid to an employee.
 * Pure props → markup; server-renderable. Mirrors DocumentSheet's paper
 * conventions: every text class sets an explicit colour so global element
 * styles never bleed into the paper.
 */
export default function StipendSheet({ doc }: { doc: StipendDocument }) {
  const spec = DOC_TYPES[doc.type];
  const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
  const displayDate = isISODate(doc.issueDate) ? formatDisplayDate(doc.issueDate) : '—';
  const numberLabel = doc.status === 'finalized' && doc.number ? `#${doc.number}` : 'DRAFT';

  const emp = doc.employeeSnapshot;
  const accountHeading = emp.engagementType === 'intern' ? 'INTERN ACCOUNT' : 'EMPLOYEE ACCOUNT';
  const hasGst = doc.gstRatePercent > 0;

  return (
    <article
      className="print-sheet relative bg-white text-black font-sans text-[12px] leading-[1.5] p-[12px] box-border w-[794px] h-[1123px] flex flex-col overflow-hidden"
      aria-label={`${spec.label} ${doc.number ?? 'draft'}`}
    >
      <header className="flex justify-between items-start gap-[24px] mb-[8px]">
        <h2 className="text-[96px] font-bold tracking-[-0.03em] leading-[0.9] uppercase text-black">
          {spec.masthead}
        </h2>
        <div className="text-right shrink-0 pt-[4px]">
          <p className="flex items-center justify-end gap-[6px] text-black">
            <QeraMark />
            <span className="font-semibold text-[16px] text-black">{STUDIO_INFO.brandMark}</span>
          </p>
          <p className="font-semibold text-[12px] text-black mt-[4px]">{displayDate}</p>
          <p className="text-black/70 text-[10px] font-normal mt-[4px]">
            Stipend for {doc.stipendMonth}
          </p>
          <p className="font-bold text-[12px] text-black mt-[4px]">{numberLabel}</p>
        </div>
      </header>

      <section
        className="grid grid-cols-2 gap-[32px] pt-[16px] pb-[24px] border-t border-[#d9d9d9]"
        aria-label="Paid to and from"
      >
        <div>
          <h3 className="text-black/70 text-[10px] font-normal mb-[4px]">paid to:</h3>
          <p className="text-black font-semibold text-[14px]">{emp.name || '—'}</p>
          <p className="text-black/70 text-[10px] font-normal whitespace-pre-line">{emp.role}</p>
          <p className="text-black/70 text-[10px] font-normal whitespace-pre-line">
            {emp.address}
          </p>
          <p className="text-black/70 text-[10px] font-normal whitespace-pre-line">{emp.phone}</p>
          <p className="text-black/70 text-[10px] font-normal whitespace-pre-line">{emp.email}</p>
        </div>
        <div>
          <h3 className="text-black/70 text-[10px] font-normal mb-[4px]">from:</h3>
          <p className="text-black font-semibold text-[14px]">Qera Studio</p>
          <p className="text-black/70 text-[10px] font-normal whitespace-pre-line">
            {STUDIO_INFO.address}
          </p>
          <p className="text-black/70 text-[10px] font-normal whitespace-pre-line">
            {STUDIO_INFO.phone}
          </p>
          <p className="text-black/70 text-[10px] font-normal whitespace-pre-line">
            {STUDIO_INFO.email}
          </p>
        </div>
      </section>

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
              className="text-left text-black text-[11px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black overflow-hidden [overflow-wrap:anywhere] break-words"
            >
              Description
            </th>
            <th
              scope="col"
              className="text-left text-black text-[11px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black [font-variant-numeric:tabular-nums] whitespace-nowrap"
            >
              Rate
            </th>
            <th
              scope="col"
              className="text-left text-black text-[11px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black [font-variant-numeric:tabular-nums] whitespace-nowrap"
            >
              Qty.
            </th>
            <th
              scope="col"
              className="text-left text-black text-[11px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black [font-variant-numeric:tabular-nums] whitespace-nowrap"
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {doc.lineItems.map((item, index) => (
            <tr key={index}>
              <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top overflow-hidden [overflow-wrap:anywhere] break-words">
                <span className="block text-black font-medium text-[12px] [overflow-wrap:anywhere]">
                  {item.description || '—'}
                </span>
                {item.detail ? (
                  <span className="block text-black/70 text-[8px] font-normal mt-[2px] [overflow-wrap:anywhere]">
                    {item.detail}
                  </span>
                ) : null}
              </td>
              <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[11px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                {formatINR(item.ratePaise)}
              </td>
              <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[11px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                {item.qty}
              </td>
              <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[11px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                {formatINR(lineAmountPaise(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-[60%] mb-[24px]">
        <div className="flex justify-between gap-[16px] py-[3px]">
          <span className="text-black/70 text-[10px] font-normal">subtotal</span>
          <span className="text-black/70 text-[10px] font-normal [font-variant-numeric:tabular-nums] text-right">
            {formatINR(totals.subtotalPaise)}
          </span>
        </div>
        {hasGst ? (
          <div className="flex justify-between gap-[16px] py-[3px]">
            <span className="text-black/70 text-[10px] font-normal">
              GST ({doc.gstRatePercent}%)
            </span>
            <span className="text-black/70 text-[10px] font-normal [font-variant-numeric:tabular-nums] text-right">
              {formatINR(totals.gstPaise)}
            </span>
          </div>
        ) : (
          <div className="flex justify-between gap-[16px] py-[3px]">
            <span className="text-black/70 text-[10px] font-normal">GST</span>
            <span className="text-black/70 text-[10px] font-normal text-right">
              {doc.gstLabel ?? 'not applicable'}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-[16px] py-[3px] border-t border-black mt-[3px] pt-[6px]">
          <span className="text-black text-[12px] font-medium">NET STIPEND PAID</span>
          <span className="text-black text-[12px] font-medium [font-variant-numeric:tabular-nums] text-right">
            {formatINR(totals.totalPaise)}
          </span>
        </div>
        <p className="text-right text-black/70 text-[10px] font-normal">
          {amountInWords(totals.totalPaise)}
        </p>
      </div>

      <div className="mt-auto">
        {spec.badge ? (
          <div className="bg-[#eef7e6] border border-[#a9d489] rounded-[6px] px-[14px] py-[10px] mb-[8px] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
            <p className="text-[#4ca014] font-bold text-[14px]">• {spec.badge.text}</p>
            <p className="text-black/70 text-[10px] font-normal mt-[2px]">{spec.badge.note}</p>
          </div>
        ) : null}

        {/*
          minmax(0,…) pins the tracks to their share of the width. Bare `fr`
          floors at the content width, so the QR added to the first column
          would widen it and pull the other two in — a couple of pixels of
          drift on an artifact that is meant to be pixel-faithful.
        */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-[24px] items-start border-t border-[#d9d9d9] pt-[16px] mb-[24px]">
          <section aria-label="Recipient bank account">
            <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
              {accountHeading}
            </h3>
            {/*
              Stacked, not side by side: the account column is ~212px wide and
              a 28mm QR beside the details overflowed into the DETAILS column
              next to it. Verified in a browser — the numeric width checks
              didn't catch it because the block's own width stayed correct.
            */}
            <div className="flex flex-col gap-[8px]">
              <dl className="m-0">
                <div className="flex gap-[16px]">
                  <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">Bank</dt>
                  <dd className="m-0 text-black text-[11px] font-medium">{emp.bank.bankName}</dd>
                </div>
                <div className="flex gap-[16px]">
                  <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                    Account No.
                  </dt>
                  <dd className="m-0 text-black text-[11px] font-medium">{emp.bank.accountNo}</dd>
                </div>
                <div className="flex gap-[16px]">
                  <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">IFSC code</dt>
                  <dd className="m-0 text-black text-[11px] font-medium">{emp.bank.ifsc}</dd>
                </div>
                {emp.bank.upiId ? (
                  <div className="flex gap-[16px]">
                    <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">UPI ID</dt>
                    <dd className="m-0 text-black text-[11px] font-medium">{emp.bank.upiId}</dd>
                  </div>
                ) : null}
              </dl>

              {/*
                The recipient's UPI QR, read from the frozen snapshot — an
                issued slip keeps showing the QR that was current when it was
                issued, even if they later change bank. Slips issued before
                QRs existed simply have none, and this collapses away.
                print-color-adjust keeps it from being dropped when printing.
              */}
              {emp.bank.upiQrDataUrl ? (
                <figure className="m-0 w-[24mm] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={emp.bank.upiQrDataUrl}
                    alt={`UPI QR code for ${emp.name || 'the recipient'}`}
                    className="w-[24mm] h-[24mm] object-contain bg-white"
                  />
                  <figcaption className="text-black/70 text-[9px] font-normal mt-[2px]">
                    scan to pay
                  </figcaption>
                </figure>
              ) : null}
            </div>
          </section>

          <section aria-label="Stipend and payment details">
            <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
              DETAILS
            </h3>
            <dl className="m-0">
              <div className="flex gap-[16px]">
                <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                  Stipend month
                </dt>
                <dd className="m-0 text-black text-[11px] font-medium">{doc.stipendMonth}</dd>
              </div>
              <div className="flex gap-[16px]">
                <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">Period</dt>
                <dd className="m-0 text-black text-[11px] font-medium">{doc.stipendPeriod}</dd>
              </div>
              <div className="flex gap-[16px]">
                <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">Issued</dt>
                <dd className="m-0 text-black text-[11px] font-medium">{displayDate}</dd>
              </div>
              <div className="flex gap-[16px]">
                <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">Method</dt>
                <dd className="m-0 text-black text-[11px] font-medium">{doc.paymentMethod}</dd>
              </div>
              {doc.paymentReference ? (
                <div className="flex gap-[16px]">
                  <dt className="text-black/70 text-[10px] font-normal min-w-[90px]">
                    Reference
                  </dt>
                  <dd className="m-0 text-black text-[11px] font-medium">
                    {doc.paymentReference}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section aria-label="Terms">
            <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
              TERMS
            </h3>
            <p className="text-black/70 text-[10px] font-normal whitespace-pre-line mt-[6px]">
              {doc.deductionsNote}
            </p>
            <div className="text-black/70">
              <p className="text-black/70 text-[8px] font-normal leading-[1.4] mb-[4px] whitespace-pre-line">
                <strong className="text-black font-semibold">Nature of engagement.</strong> This
                stipend is paid for the engagement stated above and does not constitute salaried
                employment.
              </p>
              <p className="text-black/70 text-[8px] font-normal leading-[1.4] mb-[4px] whitespace-pre-line">
                <strong className="text-black font-semibold">Confidentiality & IP.</strong> All
                work produced during the engagement remains the property of Qera Studio.
              </p>
              <p className="text-black/70 text-[8px] font-normal leading-[1.4] mb-[4px] whitespace-pre-line">
                <strong className="text-black font-semibold">Jurisdiction.</strong> Subject to the
                exclusive jurisdiction of the courts of Ghaziabad, Uttar Pradesh.
              </p>
            </div>
          </section>
        </div>

        <footer className="flex justify-between gap-[16px] flex-wrap border-t border-[#d9d9d9] pt-[10px] text-black/70 text-[10px] font-normal">
          <span>{STUDIO_INFO.thanksLine}</span>
          <span>Queries: {STUDIO_INFO.queryEmailHr}</span>
          <span>CIN: {STUDIO_INFO.cin}</span>
          <span>{displayDate}</span>
          <span>{numberLabel}</span>
        </footer>
      </div>
    </article>
  );
}
