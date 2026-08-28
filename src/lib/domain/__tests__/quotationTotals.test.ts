import { computeQuotationTotals } from "../quotationTotals";
import type { LineItem } from "../types";

const item = (
  ratePaise: number,
  qty: number,
  extra?: Partial<LineItem>,
): LineItem => ({
  description: "x",
  ratePaise,
  qty,
  ...extra,
});

describe("computeQuotationTotals", () => {
  it("groups consecutive same-section lines into one subtotal", () => {
    const lines = [
      item(1500000, 2, { section: "Website(s)" }), // 30,00,000
      item(750000, 1, { section: "Website(s)" }), // 7,50,000
      item(2140000, 1, { section: "Social Media" }), // 21,40,000
    ];
    const totals = computeQuotationTotals(lines, "INTL");
    expect(totals.sections).toHaveLength(2);
    expect(totals.sections[0]).toMatchObject({
      name: "Website(s)",
      subtotalPaise: 3750000,
    });
    expect(totals.sections[1]).toMatchObject({
      name: "Social Media",
      subtotalPaise: 2140000,
    });
    expect(totals.subtotalPaise).toBe(5890000);
  });

  it("starts a new section run when the same name recurs non-consecutively", () => {
    const lines = [
      item(100, 1, { section: "A" }),
      item(100, 1, { section: "B" }),
      item(100, 1, { section: "A" }),
    ];
    const totals = computeQuotationTotals(lines, "INTL");
    expect(totals.sections).toHaveLength(3);
  });

  it("excludes recurring lines from every subtotal and lists them separately", () => {
    const lines = [
      item(500000, 1, { section: "Website(s)" }),
      item(287000, 1, { section: "Website(s)", recurring: true }),
    ];
    const totals = computeQuotationTotals(lines, "INTL");
    expect(totals.sections[0].subtotalPaise).toBe(500000);
    expect(totals.recurringLines).toHaveLength(1);
    expect(totals.subtotalPaise).toBe(500000);
    expect(totals.totalPaise).toBe(500000);
  });

  it("applies no GST for an international recipient", () => {
    const totals = computeQuotationTotals([item(1000000, 1)], "INTL");
    expect(totals.gstPaise).toBe(0);
    expect(totals.totalPaise).toBe(1000000);
  });

  it("applies a flat 18% estimate for an Indian recipient", () => {
    const totals = computeQuotationTotals([item(1000000, 1)], "IN");
    expect(totals.gstPaise).toBe(180000);
    expect(totals.totalPaise).toBe(1180000);
  });

  it("rounds the GST estimate half-up", () => {
    // subtotal 100005 paise * 18% = 18000.9 -> 18001
    const totals = computeQuotationTotals([item(100005, 1)], "IN");
    expect(totals.gstPaise).toBe(18001);
  });

  it("handles an empty line list", () => {
    const totals = computeQuotationTotals([], "IN");
    expect(totals.sections).toHaveLength(0);
    expect(totals.subtotalPaise).toBe(0);
    expect(totals.totalPaise).toBe(0);
  });
});
