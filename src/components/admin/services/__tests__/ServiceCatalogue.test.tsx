import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceCatalogue from '../ServiceCatalogue';
import { PARTS } from '@/lib/domain/seed/parts';
import { SCHEDULES } from '@/lib/domain/contract/schedules';
import {
  createService,
  removeService,
  restoreService,
  updateServiceDetails,
} from '@/server/actions/services';

// The dialog reaches for the Server Actions, which pull `next/cache` into
// jsdom, so they are mocked as soon as the catalogue renders.
jest.mock('@/server/actions/services', () => ({
  updateServiceDetails: jest.fn(async () => ({ success: true })),
  createService: jest.fn(async () => ({ success: true })),
  removeService: jest.fn(async () => ({ success: true })),
  restoreService: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

/** The seed, with the last Part archived so the Archived tab has a row. */
const SERVICES = PARTS.map((s, i) => (i === PARTS.length - 1 ? { ...s, archived: true } : s));
const ARCHIVED = SERVICES[SERVICES.length - 1];

describe('ServiceCatalogue', () => {
  beforeEach(() => jest.clearAllMocks());

  it('gives every schedule a section', () => {
    render(<ServiceCatalogue services={SERVICES} />);
    for (const schedule of SCHEDULES) {
      expect(screen.getByRole('region', { name: schedule.name })).toBeInTheDocument();
    }
  });

  /**
   * The card is the way into the Service's own page: the name is the link and
   * it fills the card.
   */
  it('links each card to its own page', () => {
    render(<ServiceCatalogue services={SERVICES} />);
    expect(screen.getByRole('link', { name: 'Custom web build' })).toHaveAttribute(
      'href',
      '/client/services/06',
    );
  });

  /** The rate goes in as rupees and must leave as paise. */
  it('edits a service, and posts the rate in paise', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.click(screen.getByRole('button', { name: 'Actions for Shopify storefront' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Quick edit' }));
    const sac = screen.getByLabelText('SAC');
    await user.clear(sac);
    await user.type(sac, '998314');
    await user.type(screen.getByLabelText('Rate'), '45000.50');
    await user.click(screen.getByRole('button', { name: 'Save service' }));

    expect(updateServiceDetails).toHaveBeenCalledWith(
      expect.objectContaining({ code: '05', sacCode: '998314', ratePaise: 4500050 }),
    );
  });

  /**
   * A section's add files the new Service under that Schedule, and no code is
   * sent at all: the server assigns it.
   */
  it('adds a service into the section it was asked from', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    const retainer = screen.getByRole('region', { name: 'Retainer' });
    await user.click(within(retainer).getByRole('button', { name: 'Add to Retainer' }));
    await user.type(screen.getByLabelText('Title'), 'Newsletter operation');
    await user.click(screen.getByRole('button', { name: 'Add service' }));

    expect(createService).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Newsletter operation', scheduleKey: 'retainer' }),
    );
    expect(createService).toHaveBeenCalledWith(
      expect.not.objectContaining({ code: expect.anything() }),
    );
  });

  /** A new kind of work is usually a near copy of one that exists. */
  it('offers a service to start from when adding, and posts it', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.click(screen.getByRole('button', { name: 'Add service' }));
    await user.click(screen.getByRole('combobox', { name: 'Start from' }));
    await user.click(await screen.findByRole('option', { name: /Custom web build/ }));
    await user.type(screen.getByLabelText('Title'), 'Three.js experience');
    await user.click(screen.getByRole('button', { name: 'Add service' }));

    expect(createService).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Three.js experience', cloneFrom: '06' }),
    );
  });

  it('offers nothing to start from when editing', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.click(screen.getByRole('button', { name: 'Actions for Shopify storefront' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Quick edit' }));
    expect(screen.queryByRole('combobox', { name: 'Start from' })).not.toBeInTheDocument();
  });

  it('names both destinations in the menu, in order', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.click(screen.getByRole('button', { name: 'Actions for Custom web build' }));
    expect(await screen.findByRole('menuitem', { name: 'Open page' })).toHaveAttribute(
      'href',
      '/client/services/06',
    );
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Quick edit',
      'Open page',
      'Archive',
    ]);
  });

  /** Archiving takes a Service off every new contract, so it confirms first. */
  it('confirms before archiving a service', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.click(screen.getByRole('button', { name: 'Actions for Custom web build' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Archive' }));
    expect(removeService).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Archive service' }));
    expect(removeService).toHaveBeenCalledWith('06');
  });

  /**
   * Archived Services are out of the default list and under their own tab,
   * where the way back is offered and nothing else that would edit them.
   */
  it('keeps archived services under their own tab, and restores one', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);
    expect(screen.queryByRole('link', { name: ARCHIVED.name })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Archived' }));
    expect(screen.getByRole('link', { name: ARCHIVED.name })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Custom web build' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Actions for ${ARCHIVED.name}` }));
    expect((await screen.findAllByRole('menuitem')).map((i) => i.textContent)).toEqual([
      'Open page',
      'Restore',
    ]);
    await user.click(screen.getByRole('menuitem', { name: 'Restore' }));
    expect(restoreService).toHaveBeenCalledWith(ARCHIVED.code);
  });

  it('searches by name, and says so when nothing matches', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search services' }), 'shopify');
    expect(screen.getByRole('link', { name: 'Shopify storefront' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Custom web build' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search services' }), 'zzz');
    expect(screen.getByText('No services match these filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(screen.getByRole('link', { name: 'Custom web build' })).toBeInTheDocument();
  });

  it('filters to the schedules ticked', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Audit' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('region', { name: 'Audit' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Build' })).not.toBeInTheDocument();
  });

  /** The board is the same list by column: every Schedule a column, even empty. */
  it('lays the same list out as a board', async () => {
    const user = userEvent.setup();
    render(<ServiceCatalogue services={SERVICES} />);

    await user.click(screen.getByRole('tab', { name: 'Board' }));
    for (const schedule of SCHEDULES) {
      expect(screen.getByRole('region', { name: schedule.name })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Custom web build' })).toBeInTheDocument();
  });

  it('says so when the library is empty', () => {
    render(<ServiceCatalogue services={[]} />);
    expect(screen.getByText('No services yet')).toBeInTheDocument();
  });
});
