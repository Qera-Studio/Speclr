import {
  computeTotals,
  discountPaiseOf,
  formatINR,
  groupRupeeInput,
  lineAmountPaise,
  normalizeRupeeInput,
  paiseToRupees,
  rupeesToPaise,
  slipTotals,
  splitGST,
} from "../money";
import type { LineItem } from "../types";

const item = (ratePaise: number, qty: number): LineItem => ({
  description: "x",
  ratePaise,
  qty,
});

describe("lineAmountPaise", () => {
  it("multiplies rate by quantity", () => {
    expect(lineAmountPaise(item(150000, 2))).toBe(300000);
  });

  it("rounds half-up on fractional quantities", () => {
    // 100.005 rupees → 10000.5 paise → 10001
    expect(lineAmountPaise(item(6667, 1.5))).toBe(10001);
  });
});

describe("computeTotals", () => {
  it("computes subtotal, GST, and total (₹1,500 × 2 + 18% = ₹3,540)", () => {
    expect(computeTotals([item(150000, 2)], 18)).toEqual({
      subtotalPaise: 300000,
      discountPaise: 0,
      taxablePaise: 300000,
      gstPaise: 54000,
      totalPaise: 354000,
    });
  });

  it("handles zero GST", () => {
    expect(
      computeTotals([item(2500000, 1), item(2000000, 1), item(136786, 2)], 0),
    ).toEqual({
      subtotalPaise: 4773572,
      discountPaise: 0,
      taxablePaise: 4773572,
      gstPaise: 0,
      totalPaise: 4773572,
    });
  });

  it("sums multiple line items", () => {
    const totals = computeTotals([item(100000, 1), item(50000, 3)], 18);
    expect(totals.subtotalPaise).toBe(250000);
    expect(totals.totalPaise).toBe(295000);
  });

  it("rounds GST half-up to integer paise", () => {
    // 333 paise × 18% = 59.94 → 60
    expect(computeTotals([item(333, 1)], 18).gstPaise).toBe(60);
  });

  it("returns zeros for no line items", () => {
    expect(computeTotals([], 18)).toEqual({
      subtotalPaise: 0,
      discountPaise: 0,
      taxablePaise: 0,
      gstPaise: 0,
      totalPaise: 0,
    });
  });
});

/**
 * The discount comes off *before* GST, and every assertion here is that one
 * fact seen from a different angle.
 *
 * CGST s.15(3)(a) deducts a discount from the value of supply, so the tax is
 * charged on what is left. Taking it off the gross instead would have the
 * studio remit tax it never collected and the recipient claim credit for tax on
 * a price they were never charged, which is why no such option exists to test.
 */
describe("computeTotals with a discount", () => {
  it("reduces the tax as well as the total (10% off ₹20,000 at 18%)", () => {
    const totals = computeTotals([item(2000000, 1)], 18, {
      discountPercent: 10,
    });
    expect(totals).toEqual({
      subtotalPaise: 2000000,
      discountPaise: 200000,
      taxablePaise: 1800000,
      // 18% of 18,000, not of 20,000. The whole point.
      gstPaise: 324000,
      totalPaise: 2124000,
    });
  });

  it("reads an amount the same way it reads a percentage", () => {
    const byPercent = computeTotals([item(2000000, 1)], 18, {
      discountPercent: 10,
    });
    const byAmount = computeTotals([item(2000000, 1)], 18, {
      discountPaise: 200000,
    });
    expect(byAmount).toEqual(byPercent);
  });

  it("rounds a fractional percentage half-up to integer paise", () => {
    // 12.5% of 3,333 paise = 416.625 → 417
    expect(discountPaiseOf(3333, { discountPercent: 12.5 })).toBe(417);
  });

  it("never discounts more than the bill", () => {
    // A discount larger than the subtotal is a typo, and the honest reading is
    // "the whole bill". A negative taxable value would charge tax on less than
    // nothing and print a tax invoice nobody can file.
    const totals = computeTotals([item(100000, 1)], 18, {
      discountPaise: 500000,
    });
    expect(totals.discountPaise).toBe(100000);
    expect(totals.taxablePaise).toBe(0);
    expect(totals.gstPaise).toBe(0);
    expect(totals.totalPaise).toBe(0);
  });

  it("prefers the percentage when both somehow arrive, and the schema refuses that document", () => {
    // Belt and braces: `oneDiscount` in the registry is the enforcement. This
    // pins the arithmetic to one of the two so a stored row written before that
    // guard existed cannot compute differently on two different screens.
    expect(
      discountPaiseOf(1000000, { discountPercent: 10, discountPaise: 999 }),
    ).toBe(100000);
  });

  it("is absent, not zero-shaped, when nothing is passed", () => {
    expect(computeTotals([item(100000, 1)], 18).discountPaise).toBe(0);
  });
});

describe("splitGST", () => {
  it("splits an even GST amount into equal halves", () => {
    expect(splitGST(54000)).toEqual({ cgstPaise: 27000, sgstPaise: 27000 });
  });

  it("gives SGST the extra paisa on odd amounts so the sum stays exact", () => {
    expect(splitGST(101)).toEqual({ cgstPaise: 50, sgstPaise: 51 });
  });

  it("handles zero", () => {
    expect(splitGST(0)).toEqual({ cgstPaise: 0, sgstPaise: 0 });
  });

  it("throws on negative or non-integer input", () => {
    expect(() => splitGST(-1)).toThrow();
    expect(() => splitGST(10.5)).toThrow();
  });
});

describe("formatINR", () => {
  it("formats with Indian digit grouping", () => {
    expect(formatINR(12345678)).toBe("₹ 1,23,456.78");
  });

  it("always shows two decimals", () => {
    expect(formatINR(2500000)).toBe("₹ 25,000.00");
  });

  it("formats zero", () => {
    expect(formatINR(0)).toBe("₹ 0.00");
  });

  it("throws on non-integer input", () => {
    expect(() => formatINR(10.5)).toThrow();
  });
});

describe("rupeesToPaise", () => {
  it("parses whole rupees", () => {
    expect(rupeesToPaise("1500")).toBe(150000);
  });

  it("parses one and two decimal places", () => {
    expect(rupeesToPaise("1500.5")).toBe(150050);
    expect(rupeesToPaise("1367.86")).toBe(136786);
  });

  it("rejects more than two decimals", () => {
    expect(rupeesToPaise("10.123")).toBeNull();
  });

  it("rejects negatives, empties, and non-numeric input", () => {
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
    expect(rupeesToPaise("1,500")).toBeNull();
  });
});

describe("paiseToRupees", () => {
  it("renders a plain decimal string", () => {
    expect(paiseToRupees(150050)).toBe("1500.50");
  });

  it("round-trips with rupeesToPaise", () => {
    expect(rupeesToPaise(paiseToRupees(136786))).toBe(136786);
  });

  it("throws on non-integer input", () => {
    expect(() => paiseToRupees(1.5)).toThrow();
  });
});

describe("normalizeRupeeInput", () => {
  it("drops everything the parser would reject", () => {
    expect(normalizeRupeeInput("werwerwe")).toBe("");
    expect(normalizeRupeeInput("1a2b3")).toBe("123");
    expect(normalizeRupeeInput("₹1,500")).toBe("1500");
    expect(normalizeRupeeInput("-500")).toBe("500");
  });

  it("keeps one decimal point and at most two places", () => {
    expect(normalizeRupeeInput("15.5")).toBe("15.5");
    expect(normalizeRupeeInput("15.567")).toBe("15.56");
    expect(normalizeRupeeInput("1.2.3")).toBe("1.23");
  });

  /** A decimal point has to survive being typed, before its digits exist. */
  it("leaves a half-typed decimal alone", () => {
    expect(normalizeRupeeInput("12.")).toBe("12.");
  });

  it("always produces something rupeesToPaise accepts", () => {
    expect(rupeesToPaise(normalizeRupeeInput("₹1,367.86x"))).toBe(136786);
  });
});

describe("groupRupeeInput", () => {
  /** Indian grouping, matching formatINR — the same amount must not be
      punctuated one way in a filter and another in the table beside it. */
  it("groups in the Indian system", () => {
    expect(groupRupeeInput("1000")).toBe("1,000");
    expect(groupRupeeInput("100000")).toBe("1,00,000");
    expect(groupRupeeInput("1234567")).toBe("12,34,567");
  });

  it("leaves short numbers and empty input alone", () => {
    expect(groupRupeeInput("")).toBe("");
    expect(groupRupeeInput("999")).toBe("999");
  });

  it("groups only the whole part, and keeps a trailing point", () => {
    expect(groupRupeeInput("123456.78")).toBe("1,23,456.78");
    expect(groupRupeeInput("12.")).toBe("12.");
  });
});

/**
 * A pay slip is `gross − deductions = net`, and that arithmetic is the part of
 * a wage record a silent bug gets quietly wrong. Integer paise throughout.
 */
describe("slipTotals", () => {
  it("sums a stipend slip to itself when there are no deductions", () => {
    expect(slipTotals([item(1500000, 1)])).toEqual({
      grossPaise: 1500000,
      deductionsPaise: 0,
      netPaise: 1500000,
    });
  });

  it("subtracts deductions from gross", () => {
    const earnings = [item(4000000, 1), item(1600000, 1), item(400000, 1)];
    expect(slipTotals(earnings, [item(250000, 1)])).toEqual({
      grossPaise: 6000000,
      deductionsPaise: 250000,
      netPaise: 5750000,
    });
  });

  it("sums several deductions", () => {
    expect(
      slipTotals([item(6000000, 1)], [item(250000, 1), item(72000, 1)]),
    ).toMatchObject({
      deductionsPaise: 322000,
      netPaise: 5678000,
    });
  });

  it("reaches exactly zero for a fully-recovered month", () => {
    expect(slipTotals([item(100000, 1)], [item(100000, 1)]).netPaise).toBe(0);
  });

  /**
   * No lawful set of deductions leaves an employee owing wages back, so a
   * negative net is a data-entry error. It is surfaced rather than clamped —
   * clamping would print a plausible ₹0 and hide the mistake.
   */
  it("reports a negative net rather than clamping it away", () => {
    expect(slipTotals([item(100000, 1)], [item(150000, 1)]).netPaise).toBe(
      -50000,
    );
  });

  it("treats absent deductions as none", () => {
    expect(slipTotals([item(100000, 1)], undefined).netPaise).toBe(100000);
  });
});
