import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceCards from '../ServiceCards';
import { PARTS } from '@/lib/domain/seed/parts';
import { SCHEDULES } from '@/lib/domain/contract/schedules';
import { createService, removeService, updateServiceDetails } from '@/server/actions/services';

// The dialog reaches for the Server Actions, which pull `next/cache` into
// jsdom. Mocked here rather than in the dialog's own test alone, because the
// import lands as soon as the board renders.
jest.mock('@/server/actions/services', () => ({
  updateServiceDetails: jest.fn(async () => ({ success: true })),
  createService: jest.fn(async () => ({ success: true })),
  removeService: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe('ServiceCards', () => {
  beforeEach(() => jest.clearAllMocks());

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
   * "Quick edit" is the dialog, reached through the card's menu. It is named
   * rather than drawn as a pencil because the card has two destinations and a
   * glyph said "edit" for both: the title opens the Service's own page, where
   * the items, the wording and the libraries are, and this is the five-field
   * pass over the name, the rate and the SAC.
   *
   * The rate goes in as rupees and must leave as paise. That conversion is the
   * one thing in this dialog that can be wrong without looking wrong.
   */
  it('edits a service, and posts the rate in paise', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={PARTS} />);

    await user.click(
      screen.getByRole('button', { name: 'Actions for Shopify storefront' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Quick edit' }));

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
   * A card says how many priced items the Service carries, so the board reads
   * which services carry any yet and which are still a frame with nothing
   * under it. The chip prints the number and an icon; the word is `sr-only`,
   * because "items" spends four characters saying what the icon says and a
   * screen reader cannot see the icon.
   *
   * A Service with none shows no chip at all. A count of 0 is a number that
   * reads as a failure to load rather than as an empty frame.
   */
  it('says how many items a service has', () => {
    const withItems = PARTS.map((s) =>
      s.code === '06'
        ? {
            ...s,
            items: [
              {
                id: 'I1',
                name: 'GSAP motion system',
                ratePaise: 20_000_00,
                unit: 'fixed' as const,
                archived: false,
              },
              {
                id: 'I2',
                name: 'Dark/Light theme',
                ratePaise: 12_000_00,
                unit: 'fixed' as const,
                archived: false,
              },
            ],
          }
        : s,
    );
    render(<ServiceCards services={withItems} />);

    // The number and the word are separate elements (the word is `sr-only`),
    // so this matches the chip itself rather than a text node inside it.
    const countChip = (_content: string, el: Element | null) =>
      el?.getAttribute('data-slot') === 'badge' && /^\d+items?$/.test(el.textContent ?? '');

    const web = screen.getByRole('link', { name: 'Custom web build' }).closest('li');
    expect(web).not.toBeNull();
    expect(within(web as HTMLElement).getByText(countChip)).toHaveTextContent('2items');

    // A Service with no items carries no chip, so there is exactly one on the
    // whole board.
    expect(screen.getAllByText(countChip)).toHaveLength(1);
  });

  it('offers nothing to start from when editing', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={PARTS} />);

    await user.click(
      screen.getByRole('button', { name: 'Actions for Shopify storefront' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Quick edit' }));
    expect(screen.queryByRole('combobox', { name: 'Start from' })).not.toBeInTheDocument();
  });

  /**
   * The two destinations are named in words, because the card now has one
   * clickable title and one menu rather than a title and an unlabelled pencil.
   * "Open page" is the title's own destination written down, for anyone who
   * does not think to click a heading.
   */
  it('names both destinations in the menu', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={PARTS} />);

    await user.click(
      screen.getByRole('button', { name: 'Actions for Custom web build' }),
    );

    expect(await screen.findByRole('menuitem', { name: 'Open page' })).toHaveAttribute(
      'href',
      '/client/services/06',
    );

    // Quick edit first: it is the action this board is for, and the page is
    // already one click away on the title. Order is asserted rather than left
    // to whichever item happens to be written first.
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Quick edit',
      'Open page',
      'Archive',
    ]);
  });

  /**
   * Archiving confirms before it fires. It is reversible, and still confirms,
   * because it takes a Service off every new contract and the way back is a
   * route this board does not offer.
   */
  it('confirms before archiving a service', async () => {
    const user = userEvent.setup();
    render(<ServiceCards services={PARTS} />);

    await user.click(
      screen.getByRole('button', { name: 'Actions for Custom web build' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Archive' }));

    expect(removeService).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(removeService).toHaveBeenCalledWith('06');
  });
});
