import { render, screen, within } from "@testing-library/react";
import { contractBlocks, contractPageProps } from "../ContractSheet";
import { contractDoc } from "@/lib/domain/contract/__tests__/fixture";
import type { ContractDocument } from "@/lib/domain/types";

/**
 * The contract has no single sheet component: it is a flat list of atomic
 * blocks that the preview and the print renderer pack into pages. These render
 * the list itself — pagination is a browser concern and jsdom cannot see it.
 */
const renderContract = (doc: ContractDocument) =>
  render(<>{contractBlocks(doc)}</>);

describe("contractBlocks", () => {
  it("renders the cover with the agreement title and the client", () => {
    renderContract(contractDoc());
    expect(screen.getByText("Master Service Agreement")).toBeInTheDocument();
    expect(
      screen.getAllByText("Clayora Private Limited").length,
    ).toBeGreaterThan(0);
  });

  /** The legal name, not the short reference used in lists (CONTEXT.md §5a). */
  it("prints the legal entity name rather than the short one", () => {
    renderContract(contractDoc());
    expect(screen.queryByText("Clayora")).not.toBeInTheDocument();
  });

  it("renders the Master Agreement clauses", () => {
    renderContract(contractDoc());
    expect(
      screen.getByText("1. Definitions and Interpretation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("27. Governing Law and Jurisdiction"),
    ).toBeInTheDocument();
  });

  it("renders a Schedule cover listing what is appended to it", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    const schedule = screen.getByLabelText("Schedule A");
    expect(within(schedule).getByText("Schedule A")).toBeInTheDocument();
    expect(
      within(schedule).getByText("Shopify storefront"),
    ).toBeInTheDocument();
  });

  it("renders no Schedule at all when nothing is ticked", () => {
    renderContract(contractDoc({ codes: [] }));
    expect(screen.queryByLabelText("Schedule A")).not.toBeInTheDocument();
  });

  it("letters Schedule clauses with the letter this contract assigned", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    expect(screen.getByText("A2. Fees and Payment")).toBeInTheDocument();
  });

  it("renders a Part with its own sections", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    expect(screen.getByLabelText("Shopify storefront")).toBeInTheDocument();
    expect(screen.getByText("What is included")).toBeInTheDocument();
    expect(screen.getByText("Limits")).toBeInTheDocument();
    expect(screen.getByText("What is not included")).toBeInTheDocument();
    expect(screen.getByText("What the Client provides")).toBeInTheDocument();
  });

  /**
   * The document works its own numbering out from what it contains, and it
   * moves as Parts are added and removed. Nobody reads a contract by looking
   * up "Part A-1", so it is not printed.
   */
  it("names a Part rather than lettering it", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    expect(screen.queryByText(/Part A-1/)).not.toBeInTheDocument();
  });

  /**
   * The exclusion text comes from the contract's own frozen copy. Printing the
   * bare id would mean the live library had moved on underneath an issued
   * agreement.
   */
  it("prints exclusion lines as text, never as ids", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    expect(screen.getByText("Copywriting of any kind")).toBeInTheDocument();
    expect(screen.queryByText("E01")).not.toBeInTheDocument();
  });

  it("prints a drafted default where a blank has not been touched", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    // Part 05's Limits table: 'Products uploaded' is drafted [50].
    expect(screen.getAllByText("50").length).toBeGreaterThan(0);
  });

  it("prints a filled blank as ordinary text", () => {
    renderContract(
      contractDoc({ codes: ["05"], blanks: { "part.05.limits#1": "120" } }),
    );
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  /**
   * The failure content §1 exists to prevent: a blank must never print as empty
   * space, which reads as finished text.
   */
  it("marks an unfilled blank rather than printing nothing", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    // Part 05's Fee row is drafted '[ ]' — nothing to fall back on.
    expect(screen.getAllByText("fill this in").length).toBeGreaterThan(0);
  });

  /**
   * A Retainer Part is delivered per cycle rather than finished once, so
   * "Completion criteria" above "not applicable" would be a heading that lies.
   */
  it("heads a Retainer Part by cycle rather than by completion", () => {
    renderContract(contractDoc({ codes: ["18"] }));
    expect(screen.getByText("What is included each cycle")).toBeInTheDocument();
    expect(screen.getByText("How delivery is measured")).toBeInTheDocument();
    expect(screen.getByText("Fee and cycle")).toBeInTheDocument();
    expect(screen.queryByText("Completion criteria")).not.toBeInTheDocument();
  });

  it("heads a Build Part by completion and timeline", () => {
    renderContract(contractDoc({ codes: ["05"] }));
    expect(screen.getByText("Completion criteria")).toBeInTheDocument();
    expect(screen.getByText("Fee and timeline")).toBeInTheDocument();
  });

  /** Four Schedules, lettered in canonical order with the Parts under each. */
  it("assembles a contract spanning every Schedule", () => {
    renderContract(contractDoc({ codes: ["21", "17", "01", "11"] }));
    expect(screen.getByLabelText("Schedule A")).toBeInTheDocument();
    expect(screen.getByLabelText("Schedule D")).toBeInTheDocument();
    // Each Schedule's clauses carry its own letter — A is Setup, B is Build.
    expect(screen.getByText("A2. Fee and Payment")).toBeInTheDocument();
    expect(screen.getByText("B2. Fees and Payment")).toBeInTheDocument();
  });

  /**
   * The client's half of the execution block printed two blank rules until the
   * client record had anywhere to say who signs. Filling it completes the block
   * rather than redesigning it — and a contract signed before the field existed
   * still prints the rules, which is what the second case here guards.
   */
  it("prints the client’s signing authority from the snapshot", () => {
    const doc = contractDoc();
    renderContract({
      ...doc,
      clientSnapshot: {
        ...doc.clientSnapshot,
        signatory: { name: "Ananya Rao", designation: "Director" },
      },
    } as ContractDocument);

    const execution = screen.getByLabelText("Execution");
    expect(within(execution).getByText("Name: Ananya Rao")).toBeInTheDocument();
    expect(
      within(execution).getByText("Designation: Director"),
    ).toBeInTheDocument();
  });

  it("still prints blank rules for a contract frozen before signatories existed", () => {
    renderContract(contractDoc());
    const execution = screen.getByLabelText("Execution");
    // Two blanks: the client's name and designation. The studio's half is
    // filled from the document's own content.
    expect(within(execution).getAllByText(/________________/)).toHaveLength(2);
  });

  it("renders both execution blocks from the record", () => {
    renderContract(contractDoc());
    const execution = screen.getByLabelText("Execution");
    expect(
      within(execution).getByText("Qera Private Limited"),
    ).toBeInTheDocument();
    expect(
      within(execution).getByText("Clayora Private Limited"),
    ).toBeInTheDocument();
  });

  /** A Schedule is what the Parties negotiate, so it is signed where it ends. */
  it("signs the end of every Schedule as well as the Agreement", () => {
    renderContract(contractDoc({ codes: ["01", "11"] }));
    expect(screen.getByLabelText("Execution — Schedule A")).toBeInTheDocument();
    expect(screen.getByLabelText("Execution — Schedule B")).toBeInTheDocument();
    expect(screen.getByLabelText("Execution")).toBeInTheDocument();
  });

  /**
   * The Agreement is signed where the Agreement ends, not behind every
   * Schedule's own signatures at the back of the document.
   */
  it("signs the Agreement before the first Schedule, not after the last", () => {
    renderContract(contractDoc({ codes: ["01", "11"] }));
    const execution = screen.getByLabelText("Execution");
    const schedule = screen.getByLabelText("Schedule A");
    expect(
      execution.compareDocumentPosition(schedule) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  /**
   * Clause 3 runs to twenty paragraphs — as one block it was taller than a page
   * and spilled past the frame. Its heading now spans the measure on its own
   * and every point is a block the packer can break before, set in a column.
   */
  it("breaks a long clause between its points", () => {
    renderContract(contractDoc());
    const section = screen
      .getByText("3. Mutual Obligations")
      .closest("section")!;
    expect(section).toHaveAttribute("data-keep-next");
    expect(
      within(section).queryByText(/imposes obligations upon both Parties/),
    ).not.toBeInTheDocument();

    // Still in the document — just no longer inside the heading's block, and
    // measured as a column rather than across the page.
    const point = screen.getByText(/imposes obligations upon both Parties/);
    expect(point.closest('[data-span="column"]')).not.toBeNull();
    expect(
      screen.getByText(/perform the Services with reasonable skill/),
    ).toBeInTheDocument();
  });

  /**
   * A section with one point keeps it with its heading: two columns of one
   * paragraph is not two columns, and a heading that cannot be separated from
   * its content cannot be stranded at the foot of a page either.
   */
  it("keeps a single-point section whole and full width", () => {
    // The Domain and DNS Part's overview is one paragraph.
    renderContract(contractDoc());
    const section = screen
      .getByRole("heading", { name: "Domain and DNS" })
      .closest("section")!;
    expect(section).not.toHaveAttribute("data-keep-next");
    expect(
      within(section).getByText(/Purchase and configuration of a domain/),
    ).toBeInTheDocument();
    expect(section.querySelector('[data-span="column"]')).toBeNull();
  });

  /**
   * The number sits in a column of its own, so the second line of a point
   * starts under the first character of its text rather than under the number.
   */
  it("prints a clause number as its own muted marker", () => {
    renderContract(contractDoc());
    const marker = screen.getAllByText("3.1")[0];
    // Muted, so the prose reads first, but still printed: the clauses cite
    // each other by number and a reader sent to 11.2 has to find 11.2.
    expect(marker).toHaveClass("text-black");
    expect(marker).not.toHaveClass("font-semibold");
    // Not repeated inside the text it labels.
    expect(marker.parentElement?.textContent).toBe(
      "3.1This Agreement imposes obligations upon both Parties. Each Party shall" +
        " perform its obligations in good faith and shall not unreasonably" +
        " withhold or delay any approval, consent or cooperation required of it.",
    );
  });

  it("letters a sub-item and steps it in from its parent", () => {
    renderContract(contractDoc());
    const marker = screen.getAllByText("(a)")[0];
    expect(marker.parentElement).toHaveClass("pl-[18px]");
  });

  describe("pages of its own", () => {
    it("gives the cover and the parties a black page each", () => {
      const { container } = renderContract(contractDoc());
      const dark = container.querySelectorAll('[data-page-frame="dark"]');
      expect(dark).toHaveLength(2);
      dark.forEach((el) => expect(el.getAttribute("data-page")).toBe("own"));
    });

    it("opens each Schedule on a page of its own", () => {
      renderContract(contractDoc({ codes: ["01", "11"] }));
      expect(screen.getByLabelText("Schedule A")).toHaveAttribute(
        "data-page",
        "own",
      );
      expect(screen.getByLabelText("Schedule B")).toHaveAttribute(
        "data-page",
        "own",
      );
    });

    /** A Schedule cover is black-on-white; only the front matter is inverted. */
    it("keeps the Schedule covers white", () => {
      renderContract(contractDoc({ codes: ["01"] }));
      expect(screen.getByLabelText("Schedule A")).not.toHaveAttribute(
        "data-page-frame",
      );
    });

    /** Two parties side by side need the sheet's full width, not a column. */
    it("gives every signature block a page of its own", () => {
      renderContract(contractDoc({ codes: ["01"] }));
      expect(screen.getByLabelText("Execution")).toHaveAttribute(
        "data-page",
        "own",
      );
      expect(screen.getByLabelText("Execution — Schedule A")).toHaveAttribute(
        "data-page",
        "own",
      );
    });
  });
});

describe("contractPageProps", () => {
  it("draws the studio and the date into every page header", () => {
    const { pageHeader } = contractPageProps(contractDoc());
    render(<>{pageHeader(3, false)}</>);
    expect(screen.getByText("10 Jun 2026")).toBeInTheDocument();
    expect(screen.getByText("qera studio")).toBeInTheDocument();
  });

  /** The number alone — a total is a promise about a document still being edited. */
  it("numbers the page in the footer without a total", () => {
    const { pageFooter } = contractPageProps(contractDoc());
    render(<>{pageFooter(3, false)}</>);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
    expect(screen.getByText("Confidential & Proprietary")).toBeInTheDocument();
  });

  /**
   * Pagination reserves `chromeHeight` before packing. If it under-states what
   * the header and footer actually occupy, content is packed underneath the
   * footer and the foot of the page is clipped.
   */
  it("reserves the height its furniture occupies", () => {
    expect(contractPageProps(contractDoc()).chromeHeight).toBe(88);
  });
});
