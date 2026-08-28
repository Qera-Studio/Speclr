import {
  clientInputSchema,
  contractDraftSchema,
  contractFinalizeSchema,
  DOC_TYPE_BY_SLUG,
  DOC_TYPE_LIST,
  DOC_TYPES,
  invoiceDraftSchema,
  invoiceFinalizeSchema,
  letterFinalizeSchema,
  quotationDraftSchema,
  quotationFinalizeSchema,
  receiptDraftSchema,
  receiptFinalizeSchema,
  stipendFinalizeSchema,
} from "../registry";
import { contractComplete } from "../contract/completeness";
import { SERVICES } from "../contract/seed/services";

const validLineItem = {
  description: "Shopify website final (50%)",
  ratePaise: 2500000,
  qty: 1,
};

const validInvoiceFields = {
  issueDate: "2026-07-21",
  lineItems: [validLineItem],
  gstRatePercent: 0,
  gstLabel: "not applicable - registration in process",
};

describe("DOC_TYPES registry", () => {
  it("contains the Phase 1 + Phase 2 + Phase 3 types", () => {
    expect(Object.keys(DOC_TYPES).sort()).toEqual([
      "CON",
      "CRN",
      "EXIT",
      "EXP",
      "INV",
      "OFR",
      "PAY",
      "QTN",
      "REC",
      "STP",
    ]);
  });

  it("has unique slugs mapped in DOC_TYPE_BY_SLUG", () => {
    const slugs = DOC_TYPE_LIST.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(DOC_TYPE_BY_SLUG["invoice"].code).toBe("INV");
    expect(DOC_TYPE_BY_SLUG["receipt"].code).toBe("REC");
    expect(DOC_TYPE_BY_SLUG["credit-note"].code).toBe("CRN");
  });

  /**
   * CGST s.34 is the only lawful way to reduce an invoice that has already been
   * issued, and speclr's finalized documents are immutable, so without this
   * type there is no way to correct one at all.
   *
   * Three things about it are load-bearing rather than incidental.
   */
  describe("the credit note", () => {
    /**
     * Its own consecutive series. s.34 wants a credit note to carry a serial
     * number of its own; sharing the invoice series would break both, because
     * the invoice series must be consecutive too (Rule 46(b)).
     */
    it("numbers in its own series", () => {
      expect(DOC_TYPES.CRN.slug).toBe("credit-note");
      expect(DOC_TYPES.CRN.code).toBe("CRN");
      expect(DOC_TYPES.CRN.kind).toBe("financial");
    });

    /**
     * A credit note reverses tax that was *actually charged* on a named
     * invoice. Defaulting to the studio's usual 18% would put a plausible
     * figure on a document whose whole job is to match another one.
     */
    it("starts at no GST, unlike an invoice", () => {
      expect(DOC_TYPES.CRN.defaultFields("2026-08-24").gstRatePercent).toBe(0);
      expect(DOC_TYPES.INV.defaultFields("2026-08-24").gstRatePercent).toBe(18);
    });

    /** Rule 53(1A)(f): the invoice's number *and* date, or it reduces nothing. */
    it("refuses to finalize without the invoice it credits", () => {
      const fields = {
        issueDate: "2026-08-24",
        lineItems: [{ description: "Credit", ratePaise: 1000, qty: 1 }],
        gstRatePercent: 18,
        placeOfSupplyStateCode: "07",
      };

      expect(DOC_TYPES.CRN.finalizeSchema.safeParse(fields).success).toBe(
        false,
      );
      expect(
        DOC_TYPES.CRN.finalizeSchema.safeParse({
          ...fields,
          againstInvoiceNumber: "QS-INV-2627-001",
          againstInvoiceDate: "2026-07-01",
        }).success,
      ).toBe(true);
      // A draft may be half-written, like every other draft here.
      expect(DOC_TYPES.CRN.draftSchema.safeParse(fields).success).toBe(true);
    });

    /** It is not a demand, so it carries no due date. */
    it("has no due date and no payment block", () => {
      expect(DOC_TYPES.CRN.hasDueDate).toBe(false);
      expect(DOC_TYPES.CRN.hasPayment).toBe(false);
      expect(DOC_TYPES.CRN.creditsInvoice).toBe(true);
    });
  });

  it("every entry has a non-empty masthead and label", () => {
    for (const spec of DOC_TYPE_LIST) {
      expect(spec.masthead.length).toBeGreaterThan(0);
      expect(spec.label.length).toBeGreaterThan(0);
    }
  });

  it("every financial entry has fixed terms clauses with titles and bodies", () => {
    for (const spec of DOC_TYPE_LIST.filter((s) => s.kind === "financial")) {
      expect(spec.fixedTerms.length).toBeGreaterThan(0);
      for (const term of spec.fixedTerms) {
        expect(term.title.length).toBeGreaterThan(0);
      }
    }
  });

  it("the invoice carries the 6-clause terms set, the receipt the 4-clause set", () => {
    expect(DOC_TYPES.INV.fixedTerms).toHaveLength(6);
    expect(DOC_TYPES.REC.fixedTerms).toHaveLength(4);
  });

  /**
   * CGST Rule 46(q). It is a clause with no body rather than a line of its own
   * on the sheet, so it is editable and frozen by the same route as every other
   * printed word, and the whole sentence prints bold because the title does.
   */
  it("both tax documents close on the computer-generated statement", () => {
    for (const spec of [DOC_TYPES.INV, DOC_TYPES.REC]) {
      const last = spec.fixedTerms[spec.fixedTerms.length - 1];
      expect(last.title).toMatch(/does not require a physical signature/);
      expect(last.body).toBe("");
    }
  });

  it("only the receipt carries a payment block, only the invoice a due date", () => {
    expect(DOC_TYPES.REC.hasPayment).toBe(true);
    expect(DOC_TYPES.INV.hasPayment).toBe(false);
    expect(DOC_TYPES.INV.hasDueDate).toBe(true);
    expect(DOC_TYPES.REC.hasDueDate).toBe(false);
  });
});

describe("invoice schemas", () => {
  it("finalize accepts a complete invoice", () => {
    expect(invoiceFinalizeSchema.safeParse(validInvoiceFields).success).toBe(
      true,
    );
  });

  it("finalize rejects an empty line-item list", () => {
    expect(
      invoiceFinalizeSchema.safeParse({ ...validInvoiceFields, lineItems: [] })
        .success,
    ).toBe(false);
  });

  it("finalize rejects a line item without a description", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        lineItems: [{ ...validLineItem, description: "" }],
      }).success,
    ).toBe(false);
  });

  it("draft accepts incomplete line items", () => {
    expect(
      invoiceDraftSchema.safeParse({
        ...validInvoiceFields,
        lineItems: [{ description: "", ratePaise: 0, qty: 0 }],
      }).success,
    ).toBe(true);
  });

  /**
   * One discount, not two. `computeTotals` would silently prefer the
   * percentage, so a document carrying both would tell the reader one figure
   * and charge them another.
   */
  it("refuses a discount typed as a percentage and an amount at once", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        discountPercent: 10,
        discountPaise: 5000,
      }).success,
    ).toBe(false);
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        discountPercent: 10,
      }).success,
    ).toBe(true);
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        discountPaise: 5000,
      }).success,
    ).toBe(true);
  });

  it("refuses a discount above 100% or below nothing", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        discountPercent: 101,
      }).success,
    ).toBe(false);
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        discountPaise: -1,
      }).success,
    ).toBe(false);
  });

  it("rejects GST rates outside 0–28", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: 29,
      }).success,
    ).toBe(false);
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: -1,
      }).success,
    ).toBe(false);
  });

  it("rejects quantities with more than 2 decimal places", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        lineItems: [{ ...validLineItem, qty: 1.125 }],
      }).success,
    ).toBe(false);
  });

  it("rejects malformed issue dates", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        issueDate: "21/07/2026",
      }).success,
    ).toBe(false);
  });

  it("finalize requires a place of supply when GST applies", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: 18,
      }).success,
    ).toBe(false);
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: 18,
        placeOfSupplyStateCode: "07",
      }).success,
    ).toBe(true);
  });

  it("draft never requires a place of supply", () => {
    expect(
      invoiceDraftSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: 18,
      }).success,
    ).toBe(true);
  });

  it("rejects malformed state codes", () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: 18,
        placeOfSupplyStateCode: "UP",
      }).success,
    ).toBe(false);
  });
});

describe("receipt schemas", () => {
  const validReceiptFields = {
    ...validInvoiceFields,
    payment: { date: "2026-06-21", method: "UPI", reference: "126634570908" },
  };

  it("finalize accepts a complete receipt", () => {
    expect(receiptFinalizeSchema.safeParse(validReceiptFields).success).toBe(
      true,
    );
  });

  it("finalize requires a payment date", () => {
    expect(
      receiptFinalizeSchema.safeParse({
        ...validReceiptFields,
        payment: { ...validReceiptFields.payment, date: "" },
      }).success,
    ).toBe(false);
  });

  it("draft allows an empty payment date", () => {
    expect(
      receiptDraftSchema.safeParse({
        ...validReceiptFields,
        payment: { ...validReceiptFields.payment, date: "" },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown payment methods", () => {
    expect(
      receiptFinalizeSchema.safeParse({
        ...validReceiptFields,
        payment: { ...validReceiptFields.payment, method: "Cheque" },
      }).success,
    ).toBe(false);
  });
});

describe("clientInputSchema", () => {
  const validClient = {
    name: "ZaibQ Studioh",
    companyName: "ZaibQ Studioh Private Limited",
    address: "F 581 basement, Lado Sarai, New Delhi, Delhi - 110030",
    email: "client@example.com",
    phone: "+91 98730 10678",
  };

  it("accepts a valid client", () => {
    expect(clientInputSchema.safeParse(validClient).success).toBe(true);
  });

  it("requires name, company name, address, email, and phone", () => {
    // The company name is what prints on the document, so it is as required as
    // the address — an invoice addressed to a pet name is not a tax document.
    for (const key of [
      "name",
      "companyName",
      "address",
      "email",
      "phone",
    ] as const) {
      expect(
        clientInputSchema.safeParse({ ...validClient, [key]: "" }).success,
      ).toBe(false);
    }
  });

  it("rejects invalid email formats", () => {
    expect(
      clientInputSchema.safeParse({ ...validClient, email: "not-an-email" })
        .success,
    ).toBe(false);
  });

  it("does not take a gstin from the identity form at all", () => {
    // The identity step used to submit this alongside the name and address,
    // which made it a second writer of a fact the Tax step owns. Worse: since
    // it submitted an empty string, it blanked it. The GSTIN is typed once,
    // on the Tax step, and `db/mappers.ts` reconciles it with the column.
    const parsed = clientInputSchema.safeParse({
      ...validClient,
      gstin: "09AAACQ1234A1Z2",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "gstin" in parsed.data).toBe(false);
  });

  describe("clientInputSchema — content rules, not just length", () => {
    const no = (patch: object) =>
      expect(
        clientInputSchema.safeParse({ ...validClient, ...patch }).success,
      ).toBe(false);

    it("refuses markup in the legal name that documents print", () => {
      no({ companyName: "Acme <b>Ltd</b>" });
    });

    it("refuses a phone that is not a real number", () => {
      no({ phone: "call me" });
    });

    it("strips a bidi override rather than storing it", () => {
      // Trojan Source: this reorders how the rest of the line renders, so a
      // printed invoice can show a different payee than the one recorded.
      const parsed = clientInputSchema.safeParse({
        ...validClient,
        companyName: "Clayora\u202E Private Limited",
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data?.companyName).toBe("Clayora Private Limited");
    });
  });
});

describe("QTN registry entry", () => {
  it("is its own kind, not 'financial' — no clientId/place-of-supply assumptions", () => {
    expect(DOC_TYPES.QTN.kind).toBe("quotation");
    expect(DOC_TYPES.QTN.hasPayment).toBe(false);
    expect(DOC_TYPES.QTN.hasDueDate).toBe(false);
    expect(DOC_TYPES.QTN.fixedTerms).toHaveLength(0);
  });

  it("draft accepts a minimal payload with just gstCountry", () => {
    expect(
      quotationDraftSchema.safeParse({
        issueDate: "2026-08-27",
        lineItems: [],
        gstCountry: "IN",
      }).success,
    ).toBe(true);
  });

  it("finalize refuses an empty line-item list", () => {
    expect(
      quotationFinalizeSchema.safeParse({
        issueDate: "2026-08-27",
        lineItems: [],
        gstCountry: "IN",
      }).success,
    ).toBe(false);
  });

  it("finalize accepts a complete quotation with sections, a recurring line, and milestones", () => {
    expect(
      quotationFinalizeSchema.safeParse({
        issueDate: "2026-08-27",
        recipientName: "Clayora",
        attentionName: "Priya Shah",
        subjectLine: "Website + social media retainer",
        validUntil: "2026-09-27",
        gstCountry: "IN",
        lineItems: [
          {
            description: "Web design",
            ratePaise: 1500000,
            qty: 1,
            section: "Website(s)",
          },
          {
            description: "Hosting",
            ratePaise: 287000,
            qty: 1,
            section: "Website(s)",
            recurring: true,
          },
        ],
        milestones: [
          { label: "Advance", percent: 50 },
          { label: "On delivery", percent: 50 },
        ],
        termsNote: "Valid for 10 days from the date above.",
      }).success,
    ).toBe(true);
  });

  it("finalize does not require milestone percentages to sum to 100", () => {
    expect(
      quotationFinalizeSchema.safeParse({
        issueDate: "2026-08-27",
        gstCountry: "IN",
        lineItems: [validLineItem],
        milestones: [{ label: "Advance", percent: 40 }],
      }).success,
    ).toBe(true);
  });
});

describe("CON registry entry", () => {
  it("is registered with the contract kind", () => {
    expect(DOC_TYPES.CON.kind).toBe("contract");
    expect(DOC_TYPES.CON.slug).toBe("contract");
    // What the cover prints, and what the editor's Masthead field defaults to.
    expect(DOC_TYPES.CON.masthead).toBe("Master Service Agreement");
    expect(DOC_TYPE_BY_SLUG["contract"].code).toBe("CON");
  });
  it("marks invoice and receipt as financial", () => {
    expect(DOC_TYPES.INV.kind).toBe("financial");
    expect(DOC_TYPES.REC.kind).toBe("financial");
  });
  /**
   * Two separate finalize guards, and both matter. A contract with no Part
   * commits Qera to nothing; a contract with an unfilled blank is the "ZaibQ
   * Stuioh" failure content §1 exists to prevent.
   */
  it("contract finalize requires at least one Part", () => {
    const part = SERVICES.find((s) => s.code === "01")!;
    const filled = Object.fromEntries(
      contractComplete({ parts: [part], blanks: {} }).map(({ blank }) => [
        blank.key,
        "1",
      ]),
    );
    const doc = {
      issueDate: "2026-07-21",
      contract: { parts: [part], blanks: filled, library: {} },
    };
    expect(contractFinalizeSchema.safeParse(doc).success).toBe(true);
    expect(
      contractFinalizeSchema.safeParse({
        ...doc,
        contract: { parts: [], blanks: {}, library: {} },
      }).success,
    ).toBe(false);
  });

  it("contract finalize refuses an unfilled blank", () => {
    const part = SERVICES.find((s) => s.code === "01")!;
    // Untouched: Part 01's Fee row is drafted '[ ]' and resolves to nothing.
    const doc = {
      issueDate: "2026-07-21",
      contract: { parts: [part], blanks: {}, library: {} },
    };
    expect(contractFinalizeSchema.safeParse(doc).success).toBe(false);
    expect(contractDraftSchema.safeParse(doc).success).toBe(true);
  });
});

describe("HR registry entries", () => {
  it("registers STP as hr-slip, OFR/EXP/EXIT as hr-letter", () => {
    expect(DOC_TYPES.STP.kind).toBe("hr-slip");
    expect(DOC_TYPES.OFR.kind).toBe("hr-letter");
    expect(DOC_TYPES.EXP.kind).toBe("hr-letter");
    expect(DOC_TYPES.EXIT.kind).toBe("hr-letter");
  });
  it("maps HR slugs", () => {
    expect(DOC_TYPE_BY_SLUG["stipend"].code).toBe("STP");
    expect(DOC_TYPE_BY_SLUG["offer-letter"].code).toBe("OFR");
    expect(DOC_TYPE_BY_SLUG["experience-letter"].code).toBe("EXP");
    expect(DOC_TYPE_BY_SLUG["exit-letter"].code).toBe("EXIT");
  });
  it("stipend finalize requires at least one line item + employeeId", () => {
    const base = {
      issueDate: "2026-07-21",
      gstRatePercent: 0,
      employeeId: "emp-1",
      stipendPeriod: "12-31 May",
      stipendMonth: "May 2026",
      paymentMethod: "Bank transfer",
      deductionsNote: "x",
      lineItems: [{ description: "Stipend", ratePaise: 250000, qty: 1 }],
    };
    expect(stipendFinalizeSchema.safeParse(base).success).toBe(true);
    expect(
      stipendFinalizeSchema.safeParse({ ...base, lineItems: [] }).success,
    ).toBe(false);
    expect(
      stipendFinalizeSchema.safeParse({ ...base, employeeId: "" }).success,
    ).toBe(false);
  });
  it("letter finalize requires a non-empty body + employeeId", () => {
    const base = {
      issueDate: "2026-07-21",
      employeeId: "emp-1",
      bodyParagraphs: ["This certifies…"],
      bulletSections: [],
    };
    expect(letterFinalizeSchema.safeParse(base).success).toBe(true);
    expect(
      letterFinalizeSchema.safeParse({ ...base, bodyParagraphs: [] }).success,
    ).toBe(false);
    expect(
      letterFinalizeSchema.safeParse({ ...base, employeeId: "" }).success,
    ).toBe(false);
  });
});
