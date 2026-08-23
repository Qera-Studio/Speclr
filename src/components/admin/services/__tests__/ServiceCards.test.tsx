import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceCards from '../ServiceCards';
import { SERVICES } from '@/lib/domain/contract/seed/services';
import { SCHEDULES } from '@/lib/domain/contract/schedules';
import { createService, updateServiceDetails } from '@/server/actions/services';

// The dialog reaches for the Server Actions, which pull `next/cache` into
// jsdom. Mocked here rather than in the dialog's own test alone, because the
// import lands as soon as the board renders.
jest.mock('@/server/actions/services', () => ({
  updateServiceDetails: jest.fn(async () => ({ success: true })),
  createService: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe('ServiceCards', () => {
  /**
   * Every Schedule is a column and every Service is on screen. This replaced a
   * scrolling row where three of the four groups started off-screen behind a
   * tab strip, a scroll-spy and a settle timer.
   */
  it('gives every schedule a column', () => {
    render(<ServiceCards services={SERVICES} />);

    for (const schedule of SCHEDULES) {
      expect(screen.getByRole('region', { name: schedule.name })).toBeInTheDocument();
    }
    expect(screen.getByText('Domain and DNS')).toBeInTheDocument();
  });

  /**
   * The edit affordance is revealed on hover, which jsdom cannot simulate and
   * which is not what is worth pinning anyway: `opacity-0` keeps the button in
   * the tree and in the tab order the whole time, so what matters is that it is
   * reachable, named, and opens the dialog on the Service it belongs to.
   *
   * The rate goes in as rupees and must leave as paise. That conversion is the
   * one thing in this dialog that can be wrong without looking wrong.
   */
  it('edits a service, and posts the rate in paise', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={SERVICES} />);

    await user.click(screen.getByRole('button', { name: 'Edit Shopify storefront' }));

    const sac = screen.getByLabelText('SAC');
    await user.clear(sac);
    await user.type(sac, '998314');
    await user.type(screen.getByLabelText('Rate'), '45000.50');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateServiceDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        code: '05',
        name: 'Shopify storefront',
        scheduleKey: 'build',
        sacCode: '998314',
        ratePaise: 4500050,
      }),
    );
  });

  /**
   * The column *is* the answer to "which Schedule", so the add card carries it
   * into the dialog. Posting the wrong one would file the new Part under terms
   * it was not written for, and no code is sent at all: the server assigns it.
   */
  it('adds a service into the column its card was clicked in', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={SERVICES} />);

    const retainer = screen.getByRole('region', { name: 'Retainer' });
    await user.click(within(retainer).getByRole('button', { name: /Add to Retainer/ }));
    await user.type(screen.getByLabelText('Title'), 'Newsletter operation');
    await user.click(screen.getByRole('button', { name: 'Add service' }));

    expect(createService).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Newsletter operation', scheduleKey: 'retainer' }),
    );
    expect(createService).toHaveBeenCalledWith(
      expect.not.objectContaining({ code: expect.anything() }),
    );
  });

  it('says so when the library is empty', () => {
    render(<ServiceCards services={[]} />);
    expect(screen.getByText('No services yet')).toBeInTheDocument();
  });
});
