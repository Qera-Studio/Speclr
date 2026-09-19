import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceCards from '../ServiceCards';
import { PARTS } from '@/lib/domain/seed/parts';
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
    render(<ServiceCards services={PARTS} />);

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
    render(<ServiceCards services={PARTS} />);

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
    render(<ServiceCards services={PARTS} />);

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

  /**
   * The card is the way into the Service's own page, where the menu, the
   * wording and the libraries live. The pencil stays for the five-field pass.
   */
  it('links each card to its own page', () => {
    render(<ServiceCards services={PARTS} />);
    expect(screen.getByRole('link', { name: 'Custom web build' })).toHaveAttribute(
      'href',
      '/client/services/06',
    );
  });

  /**
   * "Start from…": a new kind of work is usually a near copy of one that
   * exists, and naming the source is what turns adding it into a two-minute
   * form. Offered only when adding; an existing Service has nothing to start
   * from.
   */
  it('offers a service to start from when adding, and posts it', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={PARTS} />);

    const build = screen.getByRole('region', { name: 'Build' });
    await user.click(within(build).getByRole('button', { name: /Add to Build/ }));
    await user.click(screen.getByRole('combobox', { name: 'Start from' }));
    await user.click(await screen.findByRole('option', { name: /Custom web build/ }));
    await user.type(screen.getByLabelText('Title'), 'Three.js experience');
    await user.click(screen.getByRole('button', { name: 'Add service' }));

    expect(createService).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Three.js experience', cloneFrom: '06' }),
    );
  });

  /**
   * A card says how many priced lines the Service carries, so the board reads
   * which services have a menu yet and which are still a frame with nothing
   * under it. One number; the lines themselves are on the Service's page.
   */
  it('says how many menu lines a service has', () => {
    const withMenu = PARTS.map((s) =>
      s.code === '06'
        ? {
            ...s,
            menu: [
              { id: 'M1', text: 'GSAP motion system', ratePaise: 20_000_00, unit: 'fixed' as const },
              { id: 'M2', text: 'Dark/Light theme', ratePaise: 12_000_00, unit: 'fixed' as const },
            ],
          }
        : s,
    );
    render(<ServiceCards services={withMenu} />);

    expect(screen.getByText('2 lines')).toBeInTheDocument();
    expect(screen.queryByText('0 lines')).not.toBeInTheDocument();
  });

  it('offers nothing to start from when editing', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={PARTS} />);

    await user.click(screen.getByRole('button', { name: 'Edit Shopify storefront' }));
    expect(screen.queryByRole('combobox', { name: 'Start from' })).not.toBeInTheDocument();
  });
});
