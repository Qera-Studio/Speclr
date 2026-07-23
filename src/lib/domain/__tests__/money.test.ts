import {
  computeTotals,
  formatINR,
  lineAmountPaise,
  paiseToRupees,
  rupeesToPaise,
  splitGST,
} from '../money';
import type { LineItem } from '../types';

const item = (ratePaise: number, qty: number): LineItem => ({ description: 'x', ratePaise, qty });

describe('lineAmountPaise', () => {
  it('multiplies rate by quantity', () => {
    expect(lineAmountPaise(item(150000, 2))).toBe(300000);
  });

  it('rounds half-up on fractional quantities', () => {
    // 100.005 rupees → 10000.5 paise → 10001
    expect(lineAmountPaise(item(6667, 1.5))).toBe(10001);
  });
});

describe('computeTotals', () => {
  it('computes subtotal, GST, and total (₹1,500 × 2 + 18% = ₹3,540)', () => {
    expect(computeTotals([item(150000, 2)], 18)).toEqual({
      subtotalPaise: 300000,
      gstPaise: 54000,
      totalPaise: 354000,
    });
  });

  it('handles zero GST', () => {
    expect(computeTotals([item(2500000, 1), item(2000000, 1), item(136786, 2)], 0)).toEqual({
      subtotalPaise: 4773572,
      gstPaise: 0,
      totalPaise: 4773572,
    });
  });

  it('sums multiple line items', () => {
    const totals = computeTotals([item(100000, 1), item(50000, 3)], 18);
    expect(totals.subtotalPaise).toBe(250000);
    expect(totals.totalPaise).toBe(295000);
  });

  it('rounds GST half-up to integer paise', () => {
    // 333 paise × 18% = 59.94 → 60
    expect(computeTotals([item(333, 1)], 18).gstPaise).toBe(60);
  });

  it('returns zeros for no line items', () => {
    expect(computeTotals([], 18)).toEqual({ subtotalPaise: 0, gstPaise: 0, totalPaise: 0 });
  });
});

describe('splitGST', () => {
  it('splits an even GST amount into equal halves', () => {
    expect(splitGST(54000)).toEqual({ cgstPaise: 27000, sgstPaise: 27000 });
  });

  it('gives SGST the extra paisa on odd amounts so the sum stays exact', () => {
    expect(splitGST(101)).toEqual({ cgstPaise: 50, sgstPaise: 51 });
  });

  it('handles zero', () => {
    expect(splitGST(0)).toEqual({ cgstPaise: 0, sgstPaise: 0 });
  });

  it('throws on negative or non-integer input', () => {
    expect(() => splitGST(-1)).toThrow();
    expect(() => splitGST(10.5)).toThrow();
  });
});

describe('formatINR', () => {
  it('formats with Indian digit grouping', () => {
    expect(formatINR(12345678)).toBe('₹ 1,23,456.78');
  });

  it('always shows two decimals', () => {
    expect(formatINR(2500000)).toBe('₹ 25,000.00');
  });

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹ 0.00');
  });

  it('throws on non-integer input', () => {
    expect(() => formatINR(10.5)).toThrow();
  });
});

describe('rupeesToPaise', () => {
  it('parses whole rupees', () => {
    expect(rupeesToPaise('1500')).toBe(150000);
  });

  it('parses one and two decimal places', () => {
    expect(rupeesToPaise('1500.5')).toBe(150050);
    expect(rupeesToPaise('1367.86')).toBe(136786);
  });

  it('rejects more than two decimals', () => {
    expect(rupeesToPaise('10.123')).toBeNull();
  });

  it('rejects negatives, empties, and non-numeric input', () => {
    expect(rupeesToPaise('-5')).toBeNull();
    expect(rupeesToPaise('')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNull();
    expect(rupeesToPaise('1,500')).toBeNull();
  });
});

describe('paiseToRupees', () => {
  it('renders a plain decimal string', () => {
    expect(paiseToRupees(150050)).toBe('1500.50');
  });

  it('round-trips with rupeesToPaise', () => {
    expect(rupeesToPaise(paiseToRupees(136786))).toBe(136786);
  });

  it('throws on non-integer input', () => {
    expect(() => paiseToRupees(1.5)).toThrow();
  });
});
