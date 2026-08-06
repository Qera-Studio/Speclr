import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CtcCalculator from '../CtcCalculator';

/**
 * The arithmetic is tested in `lib/domain/salaryStructure`. What is checked here
 * is what the screen actually says — including the two things a calculator can
 * most easily mislead about: that it does not compute tax, and that it does not
 * write anything anywhere.
 */

async function enterCtc(user: ReturnType<typeof userEvent.setup>, amount: string) {
  await user.type(screen.getByLabelText(/annual ctc/i), amount);
}

describe('CtcCalculator', () => {
  it('says nothing until a CTC is entered', () => {
    render(<CtcCalculator />);
    expect(screen.getByText(/enter an annual ctc/i)).toBeInTheDocument();
    expect(screen.queryByText(/monthly earnings/i)).not.toBeInTheDocument();
  });

  /**
   * ₹8.5 lakh, 50% basic, non-metro, CTC inclusive of employer PF and gratuity.
   * Gross backs out to ₹66,946/month; basic is half of it and HRA 40% of that.
   */
  it('breaks a CTC into basic, HRA and the balancing allowance', async () => {
    const user = userEvent.setup();
    render(<CtcCalculator />);

    await enterCtc(user, '850000');

    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('House rent allowance')).toBeInTheDocument();
    expect(screen.getByText('Special allowance')).toBeInTheDocument();
    expect(screen.getByText('the balance')).toBeInTheDocument();
    expect(screen.getByText('40% of basic')).toBeInTheDocument();
  });

  it('follows the metro switch for the HRA rate', async () => {
    const user = userEvent.setup();
    render(<CtcCalculator />);

    await enterCtc(user, '850000');
    expect(screen.getByText('40% of basic')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /metro city/i }));
    expect(screen.getByText('50% of basic')).toBeInTheDocument();
  });

  /** The ₹1,800 on almost every Indian pay slip, and where it comes from. */
  it('shows the capped provident fund and names the ceiling', async () => {
    const user = userEvent.setup();
    render(<CtcCalculator />);

    await enterCtc(user, '850000');

    expect(screen.getByText('Provident fund (employee)')).toBeInTheDocument();
    expect(screen.getByText('12% of the ₹15,000 ceiling')).toBeInTheDocument();
    expect(screen.getByText('₹ 1,800.00')).toBeInTheDocument();
  });

  it('follows full basic when the cap is turned off', async () => {
    const user = userEvent.setup();
    render(<CtcCalculator />);

    await enterCtc(user, '850000');
    await user.click(screen.getByRole('switch', { name: /cap pf/i }));

    expect(screen.getByText('12% of basic')).toBeInTheDocument();
    expect(screen.queryByText('₹ 1,800.00')).not.toBeInTheDocument();
  });

  /**
   * A calculator that quietly omitted tax would read as if the in-hand figure
   * were the take-home. TDS depends on the regime, declarations and proofs, and
   * guessing would put a wrong figure on a wage slip — so it says so, twice, and
   * only drops the caveat once a real figure has been given to it.
   */
  describe('tax', () => {
    it('labels the in-hand figure pre-tax until a TDS figure is given', async () => {
      const user = userEvent.setup();
      render(<CtcCalculator />);

      await enterCtc(user, '850000');

      expect(screen.getAllByText('In hand, before tax').length).toBeGreaterThan(0);
      expect(screen.getByText(/not computed/i)).toBeInTheDocument();
    });

    it('takes a TDS figure and calls the result in hand', async () => {
      const user = userEvent.setup();
      render(<CtcCalculator />);

      await enterCtc(user, '850000');
      await user.type(screen.getByLabelText(/monthly tds/i), '7500');

      expect(screen.queryByText('In hand, before tax')).not.toBeInTheDocument();
      expect(screen.getAllByText('In hand').length).toBeGreaterThan(0);
      expect(screen.queryByText(/not computed/i)).not.toBeInTheDocument();
    });
  });

  /**
   * The whole point of the reshaped layout: the total first, then what it is
   * made of, then what comes out of it — each list summing to the total it
   * claims to break down.
   */
  describe('the breakdown', () => {
    it('leads with the total and the take-home', async () => {
      const user = userEvent.setup();
      render(<CtcCalculator />);

      await enterCtc(user, '850000');

      expect(screen.getAllByText('Cost to company').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/in hand/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/of CTC/)).toBeInTheDocument();
    });

    it('breaks the total down twice over, CTC then gross', async () => {
      const user = userEvent.setup();
      render(<CtcCalculator />);

      await enterCtc(user, '850000');

      expect(screen.getByText('What the CTC is made of')).toBeInTheDocument();
      expect(screen.getByText('What the gross salary is made of')).toBeInTheDocument();
      expect(screen.getByText('What comes out of it')).toBeInTheDocument();
    });

    it('states what share of gross is deducted', async () => {
      const user = userEvent.setup();
      render(<CtcCalculator />);

      await enterCtc(user, '850000');

      expect(screen.getByText(/^Total deductions — [\d.]+% of gross$/)).toBeInTheDocument();
    });

    /** Every figure has an annual equivalent, because offers are quoted yearly. */
    it('shows the annual equivalent of the headline figures', async () => {
      const user = userEvent.setup();
      render(<CtcCalculator />);

      await enterCtc(user, '850000');

      expect(screen.getByText('₹ 8,50,000.00 a year')).toBeInTheDocument();
    });
  });

  it('drops the employer rows when the CTC excludes them', async () => {
    const user = userEvent.setup();
    render(<CtcCalculator />);

    await enterCtc(user, '850000');
    expect(screen.getByText('Provident fund (employer)')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /ctc includes employer pf/i }));
    await user.click(screen.getByRole('switch', { name: /ctc includes gratuity/i }));

    expect(screen.queryByText('Provident fund (employer)')).not.toBeInTheDocument();
    expect(screen.queryByText('Gratuity provision')).not.toBeInTheDocument();
  });

  it('takes only digits in the amount', async () => {
    const user = userEvent.setup();
    render(<CtcCalculator />);

    await user.type(screen.getByLabelText(/annual ctc/i), '₹8,50,000');

    expect(screen.getByLabelText(/annual ctc/i)).toHaveValue('850000');
  });

  it('has no submit button, because there is nothing to save', () => {
    render(<CtcCalculator />);
    expect(screen.queryByRole('button', { name: /save|calculate|submit/i })).not.toBeInTheDocument();
  });
});
