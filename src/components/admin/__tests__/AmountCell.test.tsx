import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AmountCell } from '../AmountCell';

/**
 * A figure in its own currency, and the same figure read in another at a
 * day's rate. The conversion is display arithmetic for the clients list and
 * the toggle is what keeps the stored figure one click away.
 */
const local = { currency: 'GBP' as const, rate: 0.0093, asOf: '2026-09-21', source: 'Fixed rates' };

describe('AmountCell', () => {
  it('prints the figure in its own currency, spoken with its name', () => {
    render(<AmountCell minor={1_37_000_00} currency="INR" />);
    expect(screen.getByText('1,37,000.00')).toBeInTheDocument();
    expect(screen.getByText('Indian Rupee')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /**
   * One constant name and `aria-pressed`, the toggle-button pattern: the
   * reader hears which currency the chip offers and whether it is on.
   */
  it('opens in the local currency at the day’s rate, and toggles back to the figure’s own', async () => {
    const user = userEvent.setup();
    render(<AmountCell minor={53_000_00} currency="INR" local={local} />);

    const toggle = screen.getByRole('button', { name: 'Show in Pound Sterling', pressed: true });
    expect(screen.getByText('492.90')).toBeInTheDocument();
    expect(screen.getByText('Pound Sterling')).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('53,000.00')).toBeInTheDocument();
    expect(screen.getByText('Indian Rupee')).toBeInTheDocument();
  });

  it('is not a toggle when the local currency is the figure’s own', () => {
    render(<AmountCell minor={100} currency="INR" local={{ ...local, currency: 'INR' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('1.00')).toBeInTheDocument();
  });

  /**
   * A converted figure with no rate beside it reads as a fact. The rate, the
   * day and the attribution the upstream asks for are all on hover.
   */
  it('names the rate, the day and the source on hover', async () => {
    const user = userEvent.setup();
    render(<AmountCell minor={53_000_00} currency="INR" local={local} />);

    await user.hover(screen.getByRole('button', { name: /show in pound sterling/i }));
    // By slot rather than role, as `confirm-action-button.test.tsx` records:
    // Base UI's tooltip popup carries no `role="tooltip"`.
    expect(
      await screen.findByText(/1 INR = 0\.0093 GBP on 21 Sep 2026\. Rates by Fixed rates\./),
    ).toHaveAttribute('data-slot', 'tooltip-content');
  });
});
