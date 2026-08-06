import { render, screen } from '@testing-library/react';
import SlipSheet from '../SlipSheet';
import type { SlipDocument } from '@/lib/domain/types';

/**
 * The pay slip half of `SlipSheet` — a statutory wage record, not a stipend
 * slip with different words.
 *
 * What is checked here is what the Code on Wages 2019 / Payment of Wages Act
 * s.13A actually require of a wage slip: itemised deductions, a gross figure
 * distinct from the net, the designation and statutory identifiers, and the
 * days the wage period covers. The arithmetic is the part a silent bug would
 * quietly get wrong, so it is asserted on the figures, not the labels.
 */

const basePay = {
  type: 'PAY',
  status: 'finalized',
  number: 'QS-PAY-2627-001',
  issueDate: '2026-06-30',
  gstRatePercent: 0,
  lineItems: [
    { description: 'Basic', ratePaise: 4000000, qty: 1 },
    { description: 'House rent allowance', ratePaise: 1600000, qty: 1 },
    { description: 'Special allowance', ratePaise: 400000, qty: 1 },
  ],
  deductions: [{ description: 'TDS under section 192', ratePaise: 250000, qty: 1 }],
  employeeId: 'emp-2',
  employeeSnapshot: {
    name: 'Ananya Rao',
    address: 'Sector 12, Ghaziabad',
    email: 'ananya@example.com',
    phone: '+91 90000 00000',
    role: 'Senior Designer',
    engagementType: 'employee',
    pronoun: 'she',
    joiningDate: '2025-04-01',
    bank: { bankName: 'HDFC Bank', accountNo: '1234567890', ifsc: 'HDFC0001234' },
    payroll: {
      employeeCode: 'QS-004',
      pan: 'ABCPR1234F',
      uan: '101234567890',
    },
  },
  stipendMonth: '2026-06',
  stipendPeriodStart: '2026-06-01',
  stipendPeriodEnd: '2026-06-30',
  daysInPeriod: 30,
  daysPaid: 30,
  paymentMethod: 'Bank Transfer',
  deductionsNote: '',
} as unknown as SlipDocument;

function payDoc(overrides: Partial<SlipDocument> = {}): SlipDocument {
  return { ...basePay, ...overrides } as SlipDocument;
}

describe('SlipSheet — pay slip', () => {
  it('prints the pay slip masthead and its own number series', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByText('PAY SLIP')).toBeInTheDocument();
    expect(screen.getAllByText('#QS-PAY-2627-001').length).toBeGreaterThan(0);
  });

  it('states net pay, not a bare total', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByText('NET PAY')).toBeInTheDocument();
    expect(screen.queryByText('NET STIPEND PAID')).not.toBeInTheDocument();
  });

  /** ₹60,000 gross − ₹2,500 TDS = ₹57,500 net. */
  it('shows gross, total deductions and net as three distinct figures', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByText('₹ 60,000.00')).toBeInTheDocument();
    expect(screen.getByText('−₹ 2,500.00')).toBeInTheDocument();
    expect(screen.getByText('₹ 57,500.00')).toBeInTheDocument();
  });

  it('spells the net in words, never the gross', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByText(/Fifty[- ]?Seven Thousand Five Hundred/i)).toBeInTheDocument();
  });

  it('itemises each deduction', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByRole('table', { name: 'Deductions' })).toBeInTheDocument();
    expect(screen.getByText('TDS under section 192')).toBeInTheDocument();
  });

  /**
   * Earnings and deductions are two tables side by side — the conventional
   * Indian wage-slip form, and the only one that fits the fixed A4 frame.
   * Stacked, the deductions header printed while its rows were clipped away,
   * leaving a "total deductions" figure the reader could not check.
   *
   * jsdom cannot measure the clipping; a real browser was used for that. What
   * this pins is the markup that made it fit: two tables, and every line
   * present in the DOM even on a heavy wage run.
   */
  it('lays earnings and deductions out as two tables', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByRole('table', { name: 'Earnings' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Deductions' })).toBeInTheDocument();
  });

  it('drops no line from a heavy wage run', () => {
    const heavy = payDoc({
      lineItems: [
        { description: 'Basic salary', ratePaise: 3000000, qty: 1 },
        { description: 'House rent allowance', ratePaise: 1200000, qty: 1 },
        { description: 'Conveyance allowance', ratePaise: 160000, qty: 1 },
        { description: 'Special allowance', ratePaise: 1440000, qty: 1 },
        { description: 'Overtime', ratePaise: 100000, qty: 2 },
      ],
      deductions: [
        { description: 'TDS under section 192', ratePaise: 250000, qty: 1 },
        { description: 'Provident fund (employee)', ratePaise: 360000, qty: 1 },
        { description: 'Professional tax', ratePaise: 20000, qty: 1 },
        { description: 'Salary advance recovery', ratePaise: 100000, qty: 1 },
      ],
    });
    render(<SlipSheet doc={heavy} />);

    for (const label of [
      'Basic salary',
      'House rent allowance',
      'Conveyance allowance',
      'Special allowance',
      'Overtime',
      'TDS under section 192',
      'Provident fund (employee)',
      'Professional tax',
      'Salary advance recovery',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // ₹60,000 gross − ₹7,300 = ₹52,700.
    expect(screen.getByText('₹ 52,700.00')).toBeInTheDocument();
  });

  /**
   * The compact columns have no Rate or Qty. cell, so a line billed by quantity
   * has to keep showing its working somewhere or the amount looks unexplained.
   * This is the one thing that still prints under a description — it is
   * arithmetic the reader needs, not a restatement of something said elsewhere.
   */
  it('keeps the rate × quantity working on a line billed by quantity', () => {
    render(
      <SlipSheet
        doc={payDoc({
          lineItems: [
            { description: 'Overtime', detail: 'Approved hours', ratePaise: 100000, qty: 2 },
          ],
          deductions: [],
        })}
      />,
    );
    expect(screen.getByText('₹ 1,000.00 × 2')).toBeInTheDocument();
  });

  it('leaves the working off an ordinary single-quantity line', () => {
    const { container } = render(
      <SlipSheet
        doc={payDoc({
          lineItems: [{ description: 'Basic', ratePaise: 100000, qty: 1 }],
          deductions: [],
        })}
      />,
    );
    expect(container.textContent).not.toMatch(/×/);
  });

  /**
   * A line's free-text detail is not printed. On a slip it only ever restated
   * the wage period and the deductions note, which the DETAILS block and TERMS
   * already carry — a second copy is one more thing that can disagree with the
   * first. Drafts written while it was collected still hold one; it stays out
   * of the paper.
   */
  it('never prints a line item detail', () => {
    render(
      <SlipSheet
        doc={payDoc({
          lineItems: [
            { description: 'Basic', detail: 'Period 01 – 30 June', ratePaise: 100000, qty: 1 },
          ],
          deductions: [],
        })}
      />,
    );
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.queryByText(/Period 01 – 30 June/)).not.toBeInTheDocument();
  });

  /**
   * Deductions exceeding gross is always a mistyped figure, and it is reachable
   * while typing — the editor renders this sheet live on every keystroke.
   * `formatMoney` refuses negatives for every other amount on every other
   * document, so the net needs its own signed path: throwing would blank the
   * preview mid-edit and hide the typo behind a crash.
   */
  describe('a mistyped deduction larger than gross', () => {
    const overdrawn = payDoc({
      lineItems: [{ description: 'Basic', ratePaise: 100000, qty: 1 }],
      deductions: [{ description: 'Advance recovery', ratePaise: 150000, qty: 1 }],
    });

    it('renders rather than throwing', () => {
      expect(() => render(<SlipSheet doc={overdrawn} />)).not.toThrow();
    });

    it('shows the negative net so the mistake is visible', () => {
      render(<SlipSheet doc={overdrawn} />);
      expect(screen.getByText('−₹ 500.00')).toBeInTheDocument();
    });

    /** "Minus five hundred rupees only" is not a phrase a wage slip should print. */
    it('spells no amount in words for a figure that cannot be paid', () => {
      render(<SlipSheet doc={overdrawn} />);
      expect(screen.queryByText(/rupees only/i)).not.toBeInTheDocument();
    });
  });

  /**
   * The deductions block always prints, with an explicit "Nil". A wage slip is
   * required to itemise what was withheld, and an absent table leaves the reader
   * to infer that nothing was — where "Nil" states it.
   */
  it('prints a Nil deductions row when nothing was withheld', () => {
    render(<SlipSheet doc={payDoc({ deductions: [] })} />);
    expect(screen.getByRole('table', { name: 'Deductions' })).toBeInTheDocument();
    expect(screen.getByText('Nil')).toBeInTheDocument();
    expect(screen.getByText('total deductions')).toBeInTheDocument();
    expect(screen.getByText('−₹ 0.00')).toBeInTheDocument();
    expect(screen.getByText('NET PAY')).toBeInTheDocument();
    // Gross and net agree, which is the point.
    expect(screen.getAllByText('₹ 60,000.00').length).toBe(2);
  });

  it('prints the designation and the statutory identifiers it holds', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByText('Senior Designer')).toBeInTheDocument();
    expect(screen.getByText('QS-004')).toBeInTheDocument();
    expect(screen.getByText('ABCPR1234F')).toBeInTheDocument();
    expect(screen.getByText('101234567890')).toBeInTheDocument();
  });

  /** A row reading '—' would imply the number exists and is simply unknown. */
  it('omits an identifier that was never recorded rather than printing a dash', () => {
    render(<SlipSheet doc={basePay} />);
    // PAN and UAN are on the snapshot; PF and ESIC are not.
    expect(screen.getByText('PAN')).toBeInTheDocument();
    expect(screen.queryByText('PF No.')).not.toBeInTheDocument();
    expect(screen.queryByText('ESIC No.')).not.toBeInTheDocument();
  });

  it('reports days paid against the wage period', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByText('Days paid')).toBeInTheDocument();
    expect(screen.getByText('30 / 30')).toBeInTheDocument();
  });

  /**
   * Both day rows always print. A blank where a prescribed figure belongs reads
   * as an omission; "0 days" is a statement that nobody was docked.
   */
  it('always reports loss of pay, including none', () => {
    const { unmount } = render(<SlipSheet doc={payDoc({ lopDays: 0 })} />);
    expect(screen.getByText('Loss of pay')).toBeInTheDocument();
    expect(screen.getByText('0 days')).toBeInTheDocument();
    unmount();

    render(<SlipSheet doc={payDoc({ lopDays: 2 })} />);
    expect(screen.getByText('2 days')).toBeInTheDocument();
  });

  /** A count that was never recorded is a dash, never a fabricated figure. */
  it('dashes a day count that was never recorded', () => {
    render(
      <SlipSheet
        doc={payDoc({ daysPaid: undefined, daysInPeriod: undefined, lopDays: undefined })}
      />,
    );
    expect(screen.getByText('Days paid')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('labels the period as a salary period, not a stipend month', () => {
    render(<SlipSheet doc={basePay} />);
    expect(screen.getByText('Salary month')).toBeInTheDocument();
    expect(screen.getByText('Salary period')).toBeInTheDocument();
    expect(screen.queryByText('Stipend month')).not.toBeInTheDocument();
  });

  /**
   * The wording is legally load-bearing: a pay slip is issued under a contract
   * of employment, so it must not carry the stipend slip's denial of one, and
   * the word "internship" must never appear on it.
   */
  it('carries employment wording and never internship wording', () => {
    const { container } = render(<SlipSheet doc={basePay} />);
    const printed = container.textContent ?? '';
    expect(printed).not.toMatch(/internship/i);
    expect(printed).not.toMatch(/creates no employer/i);
    expect(printed).toMatch(/deductions authorised by law/i);
    expect(printed).toMatch(/wage register/i);
  });
});
