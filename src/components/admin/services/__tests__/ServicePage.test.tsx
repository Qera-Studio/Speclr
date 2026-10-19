import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServicePage from '../ServicePage';
import { PARTS } from '@/lib/domain/seed/parts';
import { SERVICES } from '@/lib/domain/seed/services';
import { CLIENT_INPUTS, EXCLUSIONS } from '@/lib/domain/contract/seed/libraries';
import { servicePageData, type ContractService } from '@/lib/domain/service';
import { removeService, saveServiceSection } from '@/server/actions/services';

const push = jest.fn();
jest.mock('@/server/actions/services', () => ({
  saveServiceSection: jest.fn(async () => ({ success: true })),
  saveServiceItem: jest.fn(async () => ({ success: true })),
  archiveServiceItem: jest.fn(async () => ({ success: true })),
  removeService: jest.fn(async () => ({ success: true })),
  restoreService: jest.fn(async () => ({ success: true })),
  updateServiceDetails: jest.fn(async () => ({ success: true })),
  createService: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: jest.fn() }) }));

/**
 * One Service on its own page: the price list, the description, and the
 * contract terms it links to. Terms are not part of a service (decided
 * 16 October 2026), so they are read here and edited on their own page.
 */

const NEW: ContractService = {
  ...SERVICES.find((s) => s.code === 'STR')!,
  code: 'NEW',
  name: 'Newsletter design',
  blurb: undefined,
  items: [],
  partCodes: [],
};
const ALL = [...SERVICES, ...PARTS, NEW];

const show = (code: string) =>
  render(
    <ServicePage {...servicePageData(code, ALL)!} exclusions={EXCLUSIONS} clientInputs={CLIENT_INPUTS} />,
  );

beforeEach(() => jest.clearAllMocks());

describe('a sold service', () => {
  /** The count lives on the price list; the range was dropped (16 October 2026). */
  it('is titled by the service, with its code and schedule', () => {
    show('WEB');
    expect(screen.getByRole('heading', { level: 1, name: 'Custom Website' })).toBeInTheDocument();
    expect(screen.getByText('WEB')).toBeInTheDocument();
    expect(screen.queryByText('₹ 4,000 to ₹ 2,00,000')).not.toBeInTheDocument();
    expect(screen.queryByText('52 items')).not.toBeInTheDocument();
  });

  /**
   * The regression this redesign exists for: a sold service's own wording and
   * libraries are replaced by its terms when a contract is drafted, so a form
   * for them here edits something no document reads.
   */
  it('carries no wording or library forms of its own', () => {
    show('WEB');
    expect(screen.queryByRole('button', { name: 'Save wording' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('links to the terms it uses, and reads them in a sheet', async () => {
    const user = userEvent.setup();
    show('WEB');
    const terms = screen.getByRole('region', { name: 'Contract terms' });
    await user.click(within(terms).getByRole('button', { name: 'Custom web build' }));

    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('heading', { name: 'What is included' })).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: 'Open terms page' })).toHaveAttribute(
      'href',
      '/client/services/06',
    );
    // Read, not edited: the editors live on the terms page.
    expect(within(sheet).queryByRole('textbox')).not.toBeInTheDocument();
  });

  /** A change to shared terms reaches every service using them; say who. */
  it('names the other services sharing its terms', () => {
    show('DSGN');
    expect(screen.getByText('Shared with Product & App Design')).toBeInTheDocument();
  });

  it('lists each of several sets of terms', () => {
    show('SOC');
    const terms = screen.getByRole('region', { name: 'Contract terms' });
    expect(within(terms).getAllByRole('listitem')).toHaveLength(3);
  });

  /** The sentence the catalogue and the quotation print, edited where read. */
  it('edits the description in place', async () => {
    const user = userEvent.setup();
    show('WEB');
    await user.click(screen.getByRole('button', { name: /^Edit the description/ }));
    const box = screen.getByRole('textbox', { name: 'Description' });
    await user.clear(box);
    await user.type(box, 'A website, built in code.{Enter}');

    expect(saveServiceSection).toHaveBeenCalledTimes(1);
    expect(saveServiceSection).toHaveBeenCalledWith('WEB', 'description', {
      blurb: 'A website, built in code.',
    });
  });

  it('leaves the description alone on Escape', async () => {
    const user = userEvent.setup();
    show('WEB');
    await user.click(screen.getByRole('button', { name: /^Edit the description/ }));
    await user.type(screen.getByRole('textbox', { name: 'Description' }), ' more{Escape}');
    expect(saveServiceSection).not.toHaveBeenCalled();
  });

  it('archives from its menu after asking, then returns to the catalogue', async () => {
    const user = userEvent.setup();
    show('WEB');
    await user.click(screen.getByRole('button', { name: 'Actions for Custom Website' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Archive' }));
    expect(removeService).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Archive service' }));
    expect(removeService).toHaveBeenCalledWith('WEB');
    await screen.findByRole('heading', { level: 1 });
    expect(push).toHaveBeenCalledWith('/client/services');
  });
});

describe('a new service', () => {
  /** One next step, never a checklist; the description comes first. */
  it('names the first thing missing', () => {
    show('NEW');
    expect(
      screen.getByRole('button', { name: 'Add a description, so quotations can introduce this service.' }),
    ).toBeInTheDocument();
  });

  it('says it has no items and no terms yet', () => {
    show('NEW');
    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.getByText(/No contract terms yet/)).toBeInTheDocument();
  });

  /** A service naming no terms carries its own, which a contract then uses. */
  it('edits its own terms in a sheet', async () => {
    const user = userEvent.setup();
    show('NEW');
    await user.click(screen.getByRole('button', { name: 'Add terms' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('button', { name: 'Save wording' })).toBeInTheDocument();
  });
});

describe('a set of terms', () => {
  /** A row other services use as terms opens as the terms' own page. */
  it('says who uses it, and holds the editors', () => {
    show('06');
    expect(screen.getByText(/Used as the contract terms for/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Custom Website' })).toHaveAttribute('href', '/client/services/WEB');
    expect(screen.getByRole('button', { name: 'Save wording' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Price list' })).not.toBeInTheDocument();
  });
});
