import { render, screen, within } from "@testing-library/react";
import { quotationBlocks, quotationSubject } from "../QuotationSheet";
import { QUOTATION_TERMS } from "@/lib/domain/quotation";
import type { QuotationDocument } from "@/lib/domain/types";

const line = (description: string, ratePaise: number, detail?: string) => ({
  description,
  detail,
  ratePaise,
  qty: 1,
});

const baseDoc: QuotationDocument = {
  id: "sq-1",
  type: "SQ",
  status: "draft",
  issueDate: "2026-08-30",
  lineItems: [],
  gstRatePercent: 0,
  salutation: "Miss",
  recipientName: "Mehak",
  companyName: "The Colorist",
  city: "Coimbatore",
  services: [
    {
      name: "Custom Website",
      blurb: "Designed as an experience to explore.",
      lines: [
        line("Infrastructure Set-up", 2000000, "The technical foundation."),
        line("Web design", 1500000),
      ],
      addOns: [line("Custom booking section", 2000000)],
    },
    {
      name: "Social Media",
      lines: [line("Content Creation", 1535000)],
      addOns: [],
    },
  ],
  recurring: [
    { description: "Hosting", frequency: "Monthly", amountPaise: 287000 },
    {
      description: "WhatsApp BSP platform",
      frequency: "Monthly",
      amountPaise: 150000,
      amountMaxPaise: 500000,
    },
    {
      description: "Razorpay transaction fee",
      frequency: "Per transaction",
      amountNote: "2% + GST",
    },
  ],
  createdAt: 0,
  updatedAt: 0,
};

const page = (label: string) => screen.getByLabelText(label);

describe("quotationSubject", () => {
  it("derives the subject from the services, the company and the city", () => {
    expect(quotationSubject(baseDoc)).toBe(
      "Quote for Custom Website, Social Media at The Colorist, Coimbatore",
    );
  });

  it("drops the trailing clause when neither company nor city is known", () => {
    expect(
      quotationSubject({ ...baseDoc, companyName: undefined, city: undefined }),
    ).toBe("Quote for Custom Website, Social Media");
  });

  it("stands in for an unnamed service rather than printing 'Quote for  at …'", () => {
    expect(quotationSubject({ ...baseDoc, services: [] })).toBe(
      "Quote for services at The Colorist, Coimbatore",
    );
  });
});

describe("quotationBlocks page structure", () => {
  it("gives every block a page of its own, painted dark", () => {
    const { container } = render(<>{quotationBlocks(baseDoc)}</>);
    const blocks = container.querySelectorAll('[data-page="own"]');
    // cover + 2 services + 1 add-on page + recurring + details + close
    expect(blocks).toHaveLength(7);
    for (const block of blocks) {
      expect(block).toHaveAttribute("data-page-frame", "dark");
    }
  });

  it("adds an add-on page only for the services that have add-ons", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    expect(screen.getByLabelText("Custom Website add-ons")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Social Media add-ons"),
    ).not.toBeInTheDocument();
  });

  it("drops every service page when there are no services", () => {
    const { container } = render(
      <>{quotationBlocks({ ...baseDoc, services: [] })}</>,
    );
    // Cover, recurring, details, close — the four fixed pages, always present.
    expect(container.querySelectorAll('[data-page="own"]')).toHaveLength(4);
  });
});

describe("the cover", () => {
  it("addresses the person, with the salutation and the fixed offer line", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const cover = page("Cover");
    expect(within(cover).getByText("Miss Mehak,")).toBeInTheDocument();
    expect(
      within(cover).getByText(/pleased to submit our offer/i),
    ).toBeInTheDocument();
    expect(within(cover).getByText(/tailored scope and pricing/i)).toBeInTheDocument();
  });

  it("prints the derived subject, never a typed one", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    expect(
      within(page("Cover")).getByText(
        "Quote for Custom Website, Social Media at The Colorist, Coimbatore",
      ),
    ).toBeInTheDocument();
  });

  it("carries no per-document figure — pricing starts on the next page", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    expect(within(page("Cover")).queryByText(/One-time Total/)).toBeNull();
  });
});

describe("a service page", () => {
  it("heads its table with the service name and totals its lines", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const service = page("Custom Website");
    expect(
      within(service).getByText("Deliverables [Custom Website]"),
    ).toBeInTheDocument();
    expect(within(service).getByText("Designed as an experience to explore.")).toBeInTheDocument();
    expect(within(service).getByText("The technical foundation.")).toBeInTheDocument();
    // 20,000 + 15,000, printed without the paise a quotation never states.
    expect(within(service).getByText("₹ 35,000")).toBeInTheDocument();
    expect(
      within(service).getByText("Inclusive of Tax (GST 18%)"),
    ).toBeInTheDocument();
  });

  it("totals the add-on page separately from the service's own", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const addOns = page("Custom Website add-ons");
    expect(
      within(addOns).getByText("Deliverables [Custom Add-ons]"),
    ).toBeInTheDocument();
    const total = within(addOns)
      .getAllByRole("row")
      .find((r) => r.textContent?.startsWith("One-time Total"));
    expect(total?.textContent).toContain("₹ 20,000");
  });
});

describe("the recurring and summary page", () => {
  it("prints a range where one was given and a note where the value is not money", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const sheet = page("Recurring infrastructure");
    expect(within(sheet).getByText("₹ 1,500 - ₹ 5,000")).toBeInTheDocument();
    expect(within(sheet).getByText("2% + GST")).toBeInTheDocument();
    // 2,870 + 1,500 .. 2,870 + 5,000. The per-transaction row is excluded.
    expect(within(sheet).getByText("₹ 4,370 - ₹ 7,870")).toBeInTheDocument();
  });

  it("builds the summary from the services, base and add-on apart", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const sheet = page("Recurring infrastructure");
    const rows = within(sheet).getAllByRole("row");
    const website = rows.find((r) => r.textContent?.startsWith("Custom Website"));
    // base 35,000 | add-on 20,000 | total 55,000
    expect(website?.textContent).toContain("₹ 35,000");
    expect(website?.textContent).toContain("₹ 20,000");
    expect(website?.textContent).toContain("₹ 55,000");

    const social = rows.find((r) => r.textContent?.startsWith("Social Media"));
    // No add-ons, so the column reads as nothing rather than as zero.
    expect(social?.textContent).toContain("₹ 15,350");
    expect(social?.textContent).toContain("—");
  });

  it("marks the recurring row variable and adds only its low end to the total", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const sheet = page("Recurring infrastructure");
    const recurringRow = within(sheet)
      .getAllByRole("row")
      .find((r) => r.textContent?.startsWith("Recurring Infrastructure"));
    expect(recurringRow?.textContent).toContain("₹ 4,370");
    expect(recurringRow?.textContent).toContain("[variable]");
    // 55,000 + 15,350 + 4,370
    expect(within(sheet).getByText("₹ 74,720")).toBeInTheDocument();
  });
});

describe("the details page", () => {
  it("prints the reference with a hash, and DRAFT before finalize", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    expect(within(page("Reference and payment structure")).getByText("#DRAFT"))
      .toBeInTheDocument();
  });

  it("prints the assigned number once finalized", () => {
    render(
      <>{quotationBlocks({ ...baseDoc, number: "QS-SQ-2627-001" })}</>,
    );
    expect(
      within(page("Reference and payment structure")).getByText(
        "#QS-SQ-2627-001",
      ),
    ).toBeInTheDocument();
  });

  it("cuts two phases from a one-time total under ₹1 lakh", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const details = page("Reference and payment structure");
    expect(within(details).getByText("Phase 1")).toBeInTheDocument();
    expect(within(details).getByText("Phase 2")).toBeInTheDocument();
    expect(within(details).queryByText("Phase 3")).toBeNull();
  });

  it("cuts four phases once the one-time total passes ₹3 lakh", () => {
    const big = {
      ...baseDoc,
      services: [
        {
          name: "Custom Website",
          lines: [line("Everything", 40000000)],
          addOns: [],
        },
      ],
    };
    render(<>{quotationBlocks(big)}</>);
    const details = page("Reference and payment structure");
    expect(within(details).getByText("Phase 4")).toBeInTheDocument();
    expect(within(details).getByText("Build handover (staging)")).toBeInTheDocument();
  });

  it("prints all four fixed terms, and no editable ones", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const details = page("Reference and payment structure");
    for (const term of QUOTATION_TERMS) {
      expect(within(details).getByText(term)).toBeInTheDocument();
    }
  });
});

describe("the closing page", () => {
  it("renders the three links and the legal lines, with no per-document data", () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const close = page("Let's collaborate");
    expect(
      within(close).getByRole("link", { name: "www.qera.studio" }),
    ).toHaveAttribute("href", "https://www.qera.studio");
    expect(
      within(close).getByRole("link", { name: "hello@qera.studio" }),
    ).toHaveAttribute("href", "mailto:hello@qera.studio");
    expect(
      within(close).getByRole("link", { name: "@qera.studio" }),
    ).toHaveAttribute("href", "https://www.instagram.com/qera.studio");
    expect(
      within(close).getByText("© Qera Studio. All rights reserved"),
    ).toBeInTheDocument();
    expect(within(close).getByText(/CIN:/)).toBeInTheDocument();
    expect(within(close).queryByText(/The Colorist/)).toBeNull();
  });
});
