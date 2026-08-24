import { render, screen } from "@testing-library/react";
import DocumentSheet from "../DocumentSheet";
import { STUDIO_INFO } from "@/lib/domain/studio";
import type { InvoiceDocument } from "@/lib/domain/types";

const baseInvoice = {
  type: "INV",
  status: "finalized",
  number: "QS-INV-2627-001",
  issueDate: "2026-06-10",
  gstRatePercent: 18,
  placeOfSupplyStateCode: "09",
  clientSnapshot: {
    name: "Acme Co.",
    address: "Road",
    phone: "9",
    email: "a@b.com",
    gstin: "",
  },
  lineItems: [
    { description: "Design", detail: "logo", ratePaise: 100000, qty: 2 },
  ],
  gstLabel: null,
  notes: "",
} as unknown as InvoiceDocument;

describe("DocumentSheet", () => {
  it("renders the invoice masthead, client, and number", () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText("Acme Co.")).toBeInTheDocument();
    expect(screen.getByText(/billed to/i)).toBeInTheDocument();
    expect(screen.getAllByText("#QS-INV-2627-001").length).toBeGreaterThan(0);
  });

  /**
   * Rule 46(m) wants the place of supply on every inter-State supply, and an
   * export is inter-State under IGST s.7(5). It used to print only when GST was
   * being charged, which hid it on exactly the two invoices a reader most needs
   * it on: an export and a zero-rated SEZ supply.
   */
  it("prints the place of supply on a zero-rated export", () => {
    const doc = {
      ...baseInvoice,
      gstRatePercent: 0,
      placeOfSupplyStateCode: "96",
      gstLabel:
        "Export of services under LUT, IGST not charged (IGST Act s.16).",
    } as unknown as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);
    expect(
      screen.getByText(/place of supply: other country/i),
    ).toBeInTheDocument();
  });

  /**
   * Rule 46's proviso for an unregistered recipient: their State and its code.
   * Taken from the place of supply the document already carries, which for a
   * domestic supply is derived from the recipient's own record.
   */
  it("prints an unregistered Indian recipient's state and code", () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText("State: Uttar Pradesh (09)")).toBeInTheDocument();
  });

  /** A GSTIN opens with its own state code, so the line would be a second copy. */
  it("prints no state line for a registered recipient", () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        gstin: "09AABCQ2864Q1ZQ",
      },
    } as unknown as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);
    expect(screen.queryByText(/^State: /)).toBeNull();
  });

  /**
   * A line prints its description and nothing else. The free-text `detail` a
   * line used to carry was a second, longer account of the same supply, seeded
   * from the catalogue Service's overview; nothing in CGST Rule 46 asks for
   * one, domestic or export. Checked against a document that still carries one,
   * since the value stays in stored JSONB and nothing was migrated away.
   */
  it("never prints a line item detail", () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.queryByText("logo")).not.toBeInTheDocument();
  });

  /**
   * Notes were retired: the editor no longer offers the field, and the sheet no
   * longer prints it. Checked against a document that still carries one, since
   * the value stays in stored JSONB — nothing was migrated away.
   */
  it("does not print notes", () => {
    const doc = {
      ...baseInvoice,
      notes: "Internal reminder, not for the client",
    };
    render(<DocumentSheet doc={doc} />);
    expect(screen.queryByText(/internal reminder/i)).not.toBeInTheDocument();
  });

  it("shows CGST+SGST for an intra-state (state 09) GST invoice", () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText(/CGST \(9%\)/)).toBeInTheDocument();
    expect(screen.getByText(/SGST \(9%\)/)).toBeInTheDocument();
  });

  it("prints the client’s legal company name, not the short one", () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        companyName: "Acme Company Private Limited",
      },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    // The short name is for dropdowns; a tax invoice must carry the legal name.
    expect(
      screen.getByText("Acme Company Private Limited"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Acme Co.")).not.toBeInTheDocument();
  });

  it("falls back to the short name for a snapshot frozen before company names", () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText("Acme Co.")).toBeInTheDocument();
  });

  it("prints the studio details frozen onto the document", () => {
    const doc = {
      ...baseInvoice,
      studioSnapshot: {
        ...STUDIO_INFO,
        address: "Old office\nIndia",
        gstin: "09OLDGSTIN1Z0",
      },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    // Editing the studio settings must never rewrite an issued invoice: the
    // supplier address as at issue is what the record has to keep.
    expect(screen.getByText(/Old office/)).toBeInTheDocument();
    expect(screen.getByText(/09OLDGSTIN1Z0/)).toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(STUDIO_INFO.gstin)),
    ).not.toBeInTheDocument();
  });

  it("splits GST against the studio’s own state as at issue", () => {
    // The studio was registered in Delhi (07) when this was issued, so an
    // invoice with place of supply 07 is intra-state — even though the studio's
    // current registration (09) would make it inter-state.
    const doc = {
      ...baseInvoice,
      placeOfSupplyStateCode: "07",
      studioSnapshot: { ...STUDIO_INFO, stateCode: "07", stateName: "Delhi" },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    expect(screen.getByText(/CGST \(9%\)/)).toBeInTheDocument();
    expect(screen.queryByText(/IGST/)).not.toBeInTheDocument();
  });

  it("shows a single IGST row for an inter-state invoice", () => {
    render(
      <DocumentSheet
        doc={
          { ...baseInvoice, placeOfSupplyStateCode: "07" } as InvoiceDocument
        }
      />,
    );
    expect(screen.getByText(/IGST \(18%\)/)).toBeInTheDocument();
  });
});

/**
 * The document's own words win over the shipped defaults, and a finalized
 * document carries them — so revising `fixedTerms` in code cannot rewrite an
 * invoice already filed.
 */
describe("DocumentSheet editable content", () => {
  it("prints the defaults when nothing has been edited", () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText("INVOICE")).toBeInTheDocument();
    expect(screen.getByText(/Payment\./)).toBeInTheDocument();
  });

  it("prints the document’s own masthead and terms when it has them", () => {
    const doc = {
      ...baseInvoice,
      content: {
        masthead: "TAX INVOICE",
        terms: [{ title: "Settlement.", body: "Payable on presentation." }],
        thanksLine: "Thanks for the work",
      },
    } as InvoiceDocument;

    render(<DocumentSheet doc={doc} />);

    expect(screen.getByText("TAX INVOICE")).toBeInTheDocument();
    expect(screen.getByText(/Payable on presentation\./)).toBeInTheDocument();
    expect(screen.getByText("Thanks for the work")).toBeInTheDocument();
    // The shipped clause it replaced is gone, not merged alongside.
    expect(
      screen.queryByText(/Overdue balances accrue interest/),
    ).not.toBeInTheDocument();
  });
});

/**
 * The onboarding fields, and the condition they were added on.
 *
 * `ClientSnapshot` was widened with six optional fields so a client's PAN, CIN,
 * overseas registration and TDS position could print. The condition was that
 * nothing already issued changes: every one of them is optional, so a snapshot
 * frozen before they existed must render exactly what it always did.
 *
 * The negative test is the important one. `baseInvoice` is a pre-onboarding
 * snapshot, and it is what every document in the database currently looks like.
 */
describe("the client fields onboarding added", () => {
  it("prints nothing new for a snapshot frozen before they existed", () => {
    render(<DocumentSheet doc={baseInvoice} />);

    expect(screen.queryByText(/^PAN:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^CIN:/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/TRN|VAT number|EIN|ABN/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/deductible by recipient/i),
    ).not.toBeInTheDocument();
  });

  it("prints the recipient’s PAN and CIN when the snapshot carries them", () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        pan: "AABCQ2864Q",
        cin: "U62099UP2026PTC254312",
      },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    expect(screen.getByText("PAN: AABCQ2864Q")).toBeInTheDocument();
    expect(screen.getByText("CIN: U62099UP2026PTC254312")).toBeInTheDocument();
  });

  it("names an overseas registration by what it actually is", () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        taxIdType: "AE_TRN",
        taxId: "100123456700003",
      },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    // "TRN (UAE)", not a generic "Tax ID" — it is their document too.
    expect(
      screen.getByText(/TRN \(UAE\): 100123456700003/),
    ).toBeInTheDocument();
  });

  // A company number is not a tax registration, and printing only the second
  // leaves a foreign company identified by less than an Indian one, which gets
  // its CIN on the same block.
  it("prints a foreign company number alongside its tax registration", () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        taxIdType: "GB_VAT",
        taxId: "GB123456789",
        registrationNumber: "09876543",
      },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    expect(
      screen.getByText(/VAT number \(UK\): GB123456789/),
    ).toBeInTheDocument();
    expect(screen.getByText("Company no.: 09876543")).toBeInTheDocument();
  });

  /**
   * The load-bearing assertion about TDS: it is a memo. The invoice still bills
   * the gross, because the taxable value on a GST document is the full
   * consideration and netting it off would understate the GST return.
   */
  it("states TDS without changing the amount billed", () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        tds: { section: "194J", ratePercent: 10 },
      },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    // Subtotal ₹2,000 + 18% = ₹2,360 due. TDS is 10% of the taxable value
    // (₹200, not 10% of the GST-inclusive total), so ₹2,160 lands in the bank.
    expect(screen.getByText("₹ 2,360.00")).toBeInTheDocument();
    expect(
      screen.getByText(
        /TDS @10% u\/s 194J deductible by recipient — net payable ₹ 2,160\.00/,
      ),
    ).toBeInTheDocument();
  });

  it("says nothing about TDS when only half the position is recorded", () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        tds: { section: "194J" },
      },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    expect(
      screen.queryByText(/deductible by recipient/i),
    ).not.toBeInTheDocument();
  });
});
