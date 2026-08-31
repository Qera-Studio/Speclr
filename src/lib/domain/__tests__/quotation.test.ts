import {
  computeQuotationTotals,
  paymentPhases,
  type QuotationService,
  type RecurringLine,
} from "../quotation";
import type { LineItem } from "../types";

const line = (ratePaise: number, qty = 1): LineItem => ({
  description: "x",
  ratePaise,
  qty,
});

const service = (
  name: string,
  lines: LineItem[],
  addOns: LineItem[] = [],
): QuotationService => ({ name, lines, addOns });

const monthly = (
  amountPaise: number,
  amountMaxPaise?: number,
): RecurringLine => ({
  description: "x",
  frequency: "Monthly",
  amountPaise,
  amountMaxPaise,
});

describe("computeQuotationTotals", () => {
  it("splits each service into base, add-ons and their sum", () => {
    const totals = computeQuotationTotals(
      [
        service("Custom Website", [line(2000000), line(1500000)], [line(500000)]),
        service("Social Media", [line(2140000)]),
      ],
      [],
    );

    expect(totals.services[0]).toEqual({
      name: "Custom Website",
      basePaise: 3500000,
      addOnPaise: 500000,
      totalPaise: 4000000,
    });
    expect(totals.services[1]).toEqual({
      name: "Social Media",
      basePaise: 2140000,
      addOnPaise: 0,
      totalPaise: 2140000,
    });
    expect(totals.oneTimePaise).toBe(6140000);
  });

  it("multiplies rate by quantity on every line", () => {
    const totals = computeQuotationTotals(
      [service("A", [line(1500000, 2)], [line(500000, 3)])],
      [],
    );
    expect(totals.services[0]).toMatchObject({
      basePaise: 3000000,
      addOnPaise: 1500000,
    });
  });

  it("sums monthly rows into the fixed portion, carrying a range through", () => {
    const totals = computeQuotationTotals([], [
      monthly(20000),
      monthly(287000),
      monthly(150000, 500000),
    ]);
    expect(totals.recurringFixed).toEqual({
      minPaise: 457000,
      maxPaise: 807000,
    });
  });

  it("reports an exact fixed portion as a range whose ends are equal", () => {
    const totals = computeQuotationTotals([], [monthly(20000), monthly(287000)]);
    expect(totals.recurringFixed).toEqual({
      minPaise: 307000,
      maxPaise: 307000,
    });
  });

  it("excludes a row whose amount is a note rather than money", () => {
    const totals = computeQuotationTotals([], [
      monthly(287000),
      {
        description: "Razorpay transaction fee",
        frequency: "Monthly",
        amountNote: "2% + GST",
      },
    ]);
    expect(totals.recurringFixed.minPaise).toBe(287000);
  });

  it("excludes a row billed per transaction or per message, money or not", () => {
    const totals = computeQuotationTotals([], [
      monthly(287000),
      {
        description: "Razorpay transaction fee",
        frequency: "Per transaction",
        amountNote: "2% + GST",
      },
      {
        description: "WhatsApp business-initiated messages",
        frequency: "Per message",
        amountPaise: 15,
        amountMaxPaise: 20,
      },
    ]);
    expect(totals.recurringFixed).toEqual({
      minPaise: 287000,
      maxPaise: 287000,
    });
  });

  it("adds only the low end of the recurring estimate to the grand total", () => {
    const totals = computeQuotationTotals(
      [service("A", [line(6000000)])],
      [monthly(150000, 500000)],
    );
    expect(totals.totalPaise).toBe(6150000);
  });

  it("handles a document with no services and no recurring rows", () => {
    const totals = computeQuotationTotals([], []);
    expect(totals).toEqual({
      services: [],
      oneTimePaise: 0,
      recurringFixed: { minPaise: 0, maxPaise: 0 },
      totalPaise: 0,
    });
  });
});

describe("paymentPhases", () => {
  const percents = (paise: number) => paymentPhases(paise).map((p) => p.percent);

  // The boundaries, from below and on the nose. An off-by-one in either
  // comparison moves a real quotation into the wrong schedule.
  it("gives two phases below ₹1 lakh", () => {
    expect(percents(0)).toEqual([50, 50]);
    expect(percents(99_99_999)).toEqual([50, 50]);
  });

  it("gives three phases from ₹1 lakh up to ₹3 lakh", () => {
    expect(percents(100_00_000)).toEqual([35, 35, 30]);
    expect(percents(299_99_999)).toEqual([35, 35, 30]);
  });

  it("gives four phases from ₹3 lakh up", () => {
    expect(percents(300_00_000)).toEqual([30, 25, 25, 20]);
    expect(percents(1000_00_000)).toEqual([30, 25, 25, 20]);
  });

  it("always allocates exactly 100%", () => {
    for (const paise of [0, 99_99_999, 100_00_000, 299_99_999, 300_00_000]) {
      const total = paymentPhases(paise).reduce((n, p) => n + p.percent, 0);
      expect(total).toBe(100);
    }
  });

  it("opens every schedule with the advance and closes it with the balance", () => {
    for (const paise of [50_00_000, 200_00_000, 500_00_000]) {
      const phases = paymentPhases(paise);
      expect(phases[0].label).toBe("Advance on signing contract");
      expect(phases[phases.length - 1].label).toBe("Balance prior launch");
    }
  });
});
