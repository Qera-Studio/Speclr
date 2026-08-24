import Image from "next/image";
import { amountInWords } from "@/lib/domain/amountInWords";
import { formatDisplayDate, isISODate } from "@/lib/domain/dates";
import { gstStateName } from "@/lib/domain/gstStates";
import { PLACE_OF_SUPPLY_EXPORT } from "@/lib/domain/placeOfSupply";
import { taxIdType } from "@/lib/domain/taxIds/foreign";
import {
  computeTotals,
  formatINR,
  lineAmountPaise,
  splitGST,
} from "@/lib/domain/money";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf } from "@/lib/domain/studio";
import { contentOf } from "@/lib/domain/docContent";
import type {
  CreditNoteDocument,
  InvoiceDocument,
  ReceiptDocument,
} from "@/lib/domain/types";
import { NIL } from "@/lib/utils";
import { A4_PADDING } from "./frame";
import QeraMark from "./QeraMark";

/**
 * THE print artifact — the single source of markup for both the editor's live
 * preview and the print route. Pure props → markup; server-renderable.
 * Every text class sets an explicit colour — global element styles must never
 * bleed into the paper.
 */
/**
 * One row of the PAYMENT block. A row with nothing in it does not print: the
 * wire fields are optional on the studio record, and a labelled blank on a tax
 * invoice reads as a detail that failed to render rather than one nobody has.
 */
function PayRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex">
      <dt className="text-black/70 text-[12px] font-normal min-w-[100px]">
        {label}
      </dt>
      <dd className="m-0 text-black text-[13px] font-medium whitespace-pre-line">
        {value}
      </dd>
    </div>
  );
}

export default function DocumentSheet({
  doc,
}: {
  doc: InvoiceDocument | ReceiptDocument | CreditNoteDocument;
}) {
  const spec = DOC_TYPES[doc.type];
  const studio = studioOf(doc);
  // Every printed word that is editable: masthead, TERMS, the PAID note, the
  // thanks line. Defaults when the document has never been edited; its own
  // frozen copy once finalized.
  const text = contentOf(doc, spec);
  const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
  /* Joined rather than rendered as two spans: either may be cleared, and a
     stray separator on a line with one sentence left is the tell. */
  const declarations = [text.reverseChargeLine, text.currencyLine]
    .filter(Boolean)
    .join(" ");
  /*
    CGST Rule 48(1): a services invoice is made in duplicate and each copy says
    which it is. This is the recipient's; the duplicate is the copy retained
    under s.36, which is this document reprinted.

    It prints as the last TERMS clause rather than under the number in the
    header, for the same reason Rule 46(q)'s statement does: it is a standing
    declaration about the document, and the header is where a reader looks for
    what this invoice *is* (whose, when, which number), not for how it was
    made. Still `content`, so it is still editable per document, still frozen at
    finalize, and still prints nothing when cleared. Title with no body, which
    is what prints a clause bold and unindented.
  */
  const terms = text.copyMarking
    ? [...text.terms, { title: text.copyMarking, body: "" }]
    : text.terms;
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";

  const hasGst = doc.gstRatePercent > 0;
  const intraState = doc.placeOfSupplyStateCode === studio.stateCode;
  const supplyStateName = gstStateName(doc.placeOfSupplyStateCode);
  /**
   * Whether the recipient is outside India, which decides how they can pay.
   *
   * Read from the document's own place of supply rather than from the client,
   * for the reason every other read here does: a finalized document prints what
   * it was issued with, and the client may have moved since.
   */
  const overseas = doc.placeOfSupplyStateCode === PLACE_OF_SUPPLY_EXPORT;

  /**
   * The TDS memo, when the frozen snapshot says the recipient deducts.
   *
   * Deducted on the **taxable value**, not on the GST — s.194J applies to the
   * sum payable for professional services, and CBDT Circular 23/2017 excludes
   * the GST component where it is shown separately. Rounded half-up to whole
   * paise like every other amount here; the result is only ever displayed, so
   * it can never drift into a stored total.
   */
  const tds =
    doc.clientSnapshot.tds?.section && doc.clientSnapshot.tds.ratePercent
      ? doc.clientSnapshot.tds
      : null;
  const tdsPaise = tds
    ? Math.floor((totals.subtotalPaise * (tds.ratePercent ?? 0)) / 100 + 0.5)
    : 0;
  const netOfTds = totals.totalPaise - tdsPaise;
  const { cgstPaise, sgstPaise } = splitGST(totals.gstPaise);

  return (
    <article
      className={`print-sheet relative bg-white text-black font-sans text-[12px] leading-[1.5] ${A4_PADDING} box-border w-[794px] h-[1123px] flex flex-col overflow-hidden`}
      aria-label={`${spec.label} ${doc.number ?? "draft"}`}
    >
      <header className="flex justify-between items-start gap-[24px] border-b border-[#d9d9d9] pb-[8px]">
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
          {/*
            Rule 53(1A)(f): the credit note names the tax invoice it reduces, by
            serial number *and* date. It sits where the receipt's "against
            invoice" line does, because it is the same fact doing the same job.
          */}
          {doc.type === "CRN" && doc.against.invoiceNumber ? (
            <p className="text-black/70 text-[10px] font-normal mt-[4px]">
              Credit against Invoice
              <br />#{doc.against.invoiceNumber}
              {doc.against.invoiceDate && isISODate(doc.against.invoiceDate)
                ? ` dated ${formatDisplayDate(doc.against.invoiceDate)}`
                : ""}
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
          {/*
            The recipient's other registrations. Each renders only when the
            snapshot carries it, so every document frozen before these fields
            existed prints exactly what it always did — that is the whole
            condition on which they were added (see ClientSnapshot in types.ts).

            The label is the registration's own name, because a TRN is not a
            "Tax ID" to the person reading their own invoice.
          */}
          {/*
            Only when there is no GSTIN. A GSTIN carries the holder's PAN
            verbatim at characters 3 to 12, so printing both states the same
            number twice and invites the reader to reconcile two lines that
            cannot disagree. Rule 46(e) asks for the GSTIN; the PAN earns its
            place on an unregistered recipient's invoice, where it is what the
            TDS memo is deducted against.
          */}
          {!doc.clientSnapshot.gstin && doc.clientSnapshot.pan ? (
            <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
              PAN: {doc.clientSnapshot.pan}
            </p>
          ) : null}
          {/*
            Rule 46's proviso for an **unregistered** recipient: the invoice
            carries their State and its code once the taxable value reaches
            ₹50,000. It prints on every unregistered domestic invoice rather
            than above that threshold, because a rule that fires on an amount is
            a rule somebody has to remember on the one invoice it matters for,
            and there is no harm in a correct line on a smaller one.

            No new snapshot field: the code the document already carries *is*
            the recipient's, derived from their record when the client was
            picked. A registered recipient needs none, because a GSTIN opens
            with its own state code, and a foreign one is excluded by `96`.
          */}
          {!doc.clientSnapshot.gstin && !overseas && supplyStateName ? (
            <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
              State: {supplyStateName} ({doc.placeOfSupplyStateCode})
            </p>
          ) : null}
          {doc.clientSnapshot.cin ? (
            <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
              CIN: {doc.clientSnapshot.cin}
            </p>
          ) : null}
          {doc.clientSnapshot.taxId ? (
            <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
              {taxIdType(doc.clientSnapshot.taxIdType)?.label ?? "Registration"}
              : {doc.clientSnapshot.taxId}
            </p>
          ) : null}
          {/*
            CIN's counterpart abroad, and it prints for the same reason: the
            line above is what the recipient is registered for *tax*, this is
            the register saying the entity exists. Labelled generically because
            the register's own name is not on the record, and "Company no." is
            read correctly in every country that issues one.
          */}
          {doc.clientSnapshot.registrationNumber ? (
            <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
              Company no.: {doc.clientSnapshot.registrationNumber}
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
          {/* SAC is its own column, not a line inside the description. CGST
              Rule 46(g) wants the code against the line, and a code buried in
              prose is a code an auditor has to go hunting for. */}
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[12%]" />
            <col className="w-[20%]" />
            <col className="w-[7%]" />
            <col className="w-[19%]" />
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
                SAC
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
                {/*
                  A line prints its description and nothing else, which is now
                  true of every document here rather than of the slips alone
                  (`SlipSheet`'s `ItemsTable` says the same).

                  Rule 46(g) asks for the description of the service; the
                  quantity, the rate and the SAC are the columns beside it. The
                  sub-line under it was a second, longer restatement of the
                  first, seeded from the catalogue Service's overview, and
                  nothing in the rules asks for it domestic or export. Two
                  descriptions of one supply is one more thing that can
                  disagree with the other on a document retained 72 months.
                */}
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top overflow-hidden [overflow-wrap:anywhere] break-words">
                  <span className="block text-black font-medium text-[14px] [overflow-wrap:anywhere]">
                    {item.description || "—"}
                  </span>
                </td>
                {/* `NIL` rather than blank: a missing classification is a gap
                    somebody has to close, and an empty cell reads as a column
                    that failed to render. */}
                <td className="py-[10px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top text-left text-black text-[13px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {item.sacCode || NIL}
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

      {/*
        The declarations and the sums share one band, and it is pinned to the
        foot of the page above PAYMENT.

        They used to run the full width *under* the totals: the uppercase
        endorsement read as a heading for the payment block below it, and the
        reverse-charge sentence sat right-aligned under a column of figures,
        where it read as more arithmetic and pulled the eye back to a sum that
        had already finished. They are statements about the whole document, so
        they take the empty left half beside the sums instead, and they sit at
        the two ends of it: the endorsement level with `subtotal`, where it
        reads as the heading of this block, and the declarations on the floor of
        the band, level with the amount in words. The `mt-auto` is what pins the
        second one down, and it does so whether or not the first is there, which
        is the domestic case.
      */}
      <div className="mt-auto flex items-stretch gap-[84px] mb-[8px]">
        <div className="min-w-0 flex-1 flex flex-col max-w-[300px]">
          {/*
            Rule 46's third proviso prescribes these exact words in capitals,
            and it is what a refund claim under IGST s.16(3) is read against.
            `gstLabel` explains the position in the totals column; this states
            it. Blank on a taxed supply, and it prints nothing when blank.
          */}
          {text.exportEndorsement ? (
            <p className="text-black text-[10px] pt-[8px] font-semibold tracking-[0.04em] pb-[6px]">
              {text.exportEndorsement}
            </p>
          ) : null}
          {/*
            The statements Rule 46 wants in words rather than figures: (p)
            whether tax is payable on reverse charge, and the currency the
            amounts are in. Joined rather than rendered as two spans: either may
            be cleared, and a stray separator on a line with one sentence left
            is the tell.
          */}
          {declarations ? (
            <p className="mt-auto mb-2 text-black/70 text-[11px] font-normal leading-[1.3]">
              {declarations}
            </p>
          ) : null}
        </div>
        <div className="w-[50%] shrink-0">
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
          {/*
            Not gated on GST being charged. Rule 46(m) wants the place of supply
            on every inter-State supply, and an export is inter-State under IGST
            s.7(5), so a zero-rated invoice states it exactly as a taxed one
            does. Gating it on the rate hid it on every export and on every
            zero-rated SEZ supply, which are the two invoices where a reader
            most needs to be told where the supply landed. An export reads
            'Other Country', which is the GST portal's own name for code 96.
          */}
          {supplyStateName ? (
            <p className="text-black/70 text-[12px] font-normal text-right py-[2px]">
              Place of supply: {supplyStateName}
            </p>
          ) : null}
          <div className="flex justify-between gap-[16px] py-[3px] border-t border-black mt-[3px] pt-[6px]">
            {/*
            "TOTAL CREDITED", not "TOTAL DUE". A credit note is not a demand,
            and the figures on it are stated positive — the document's nature is
            what makes them a reduction, which is how s.34 describes it and how
            a return reads it. Labelling it "due" would read as a second bill.
          */}
            <span className="text-black text-[14px] font-medium">
              {doc.type === "CRN" ? "TOTAL CREDITED" : "TOTAL DUE"}
            </span>
            <span className="text-black text-[14px] font-medium [font-variant-numeric:tabular-nums] text-right">
              {formatINR(totals.totalPaise)}
            </span>
          </div>
          <p className="text-right text-black/70 text-[12px] font-normal">
            {amountInWords(totals.totalPaise)}
          </p>
          {/*
          A memo, and only a memo. TDS is the *payer's* deduction under Chapter
          XVII-B: the invoice still bills the gross, and the taxable value on a
          GST document must be the full consideration. Netting it off here would
          understate that and put the wrong figure in the GST return. So this
          sits below TOTAL DUE, touches neither `computeTotals` nor the amount in
          words, and exists so the smaller payment that arrives reconciles
          against this invoice instead of looking short.
        */}
          {tds ? (
            <p className="text-right text-black/70 text-[12px] font-normal pt-[4px]">
              TDS @{tds.ratePercent}% u/s {tds.section} deductible by recipient
              — net payable {formatINR(netOfTds)}
            </p>
          ) : null}
        </div>
      </div>

      {/*
        The receipt used to open this block with a green "PAID" banner. The
        divider on the grid below already separates the totals from the payment
        details, and the PAYMENT block states the same thing more precisely.
      */}
      <div>
        <div
          className={
            doc.type === "INV"
              ? "grid grid-cols-[1fr_auto_1.5fr] gap-[24px] items-start border-t border-[#d9d9d9] pt-[8px] mb-[8px]"
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
                  <PayRow label="Bank" value={studio.bank.bankName} />
                  {/* The account name is a wire-only row: a domestic transfer
                      resolves on the account number, and a correspondent bank
                      rejects on a beneficiary name that does not match. */}
                  {overseas ? (
                    <PayRow
                      label="Account name"
                      value={studio.bank.accountName}
                    />
                  ) : null}
                  <PayRow label="Account No." value={studio.bank.accountNo} />
                  {overseas ? (
                    <>
                      <PayRow label="SWIFT / BIC" value={studio.bank.swift} />
                      {/*
                        The IFSC prints abroad too. SWIFT routes the remittance
                        to the bank; the IFSC is what identifies the *branch*
                        the account is held at, and it is a required field on
                        every low-cost INR rail a foreign payer actually uses
                        (Wise, Revolut, Airwallex) as well as on the bank's own
                        inward-remittance form. Omitting it made the payer ask
                        for it by email on every invoice.

                        What stays domestic-only is the UPI handle and its QR:
                        those cannot receive an inward remittance at all.
                      */}
                      <PayRow label="IFSC code" value={studio.bank.ifsc} />
                      <PayRow label="IBAN" value={studio.bank.iban} />
                      <PayRow
                        label="Bank address"
                        value={studio.bank.bankAddress}
                      />
                    </>
                  ) : (
                    <>
                      <PayRow label="IFSC code" value={studio.bank.ifsc} />
                      <PayRow label="UPI ID" value={studio.bank.upiId} />
                    </>
                  )}
                </dl>
              </section>
              {/*
                The QR is a UPI intent, so it is worth exactly nothing to a
                payer outside India: no foreign banking app reads it, and the
                handle beside it cannot receive an inward remittance. Printing
                it there would be an instruction that cannot be followed.
              */}
              {overseas ? (
                <div />
              ) : (
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
              )}
            </>
          ) : doc.type === "CRN" ? (
            /*
              Where the receipt prints how it was paid, the credit note prints
              why it was issued. Not one of Rule 53's mandatory particulars, but
              it is what makes the note reconcilable against the invoice a year
              later, and a credit note with no stated reason is the one nobody
              can account for.
            */
            <section aria-label="Reason for credit">
              <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
                REASON
              </h3>
              <p className="text-black text-[13px] font-medium whitespace-pre-line">
                {doc.reason || NIL}
              </p>
            </section>
          ) : (
            <section aria-label="Payment details">
              <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[8px]">
                PAYMENT
              </h3>
              <dl className="m-0">
                <div className="flex">
                  <dt className="text-black/70 text-[12px] font-normal min-w-[100px]">
                    Payment date
                  </dt>
                  <dd className="m-0 text-black text-[13px] font-medium">
                    {doc.payment.date && isISODate(doc.payment.date)
                      ? formatDisplayDate(doc.payment.date)
                      : "—"}
                  </dd>
                </div>
                {doc.payment.reference ? (
                  <div className="flex">
                    <dt className="text-black/70 text-[12px] font-normal min-w-[100px]">
                      Payment reference
                    </dt>
                    <dd className="m-0 text-black text-[13px] font-medium">
                      {doc.payment.reference}
                    </dd>
                  </div>
                ) : null}
                <div className="flex">
                  <dt className="text-black/70 text-[12px] font-normal min-w-[100px]">
                    Payment method
                  </dt>
                  <dd className="m-0 text-black text-[13px] font-medium">
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
              {terms.map((term, i) => (
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
