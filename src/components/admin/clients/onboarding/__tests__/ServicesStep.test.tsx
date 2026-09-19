import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServicesStep from '../ServicesStep';
import type { ClientRecord } from '@/lib/domain/types';
import type { ContractService } from '@/lib/domain/service';

/**
 * One Schedule is on screen at a time, so the two things worth pinning are
 * that the tabs really do hide the rest, and that what is added under a hidden
 * one survives anyway — both in the list below the cards and in the payload.
 *
 * The third is that typing a rate adds the service. Nobody prices something
 * they have not engaged, and making them press the button afterwards is how
 * the number they just typed gets lost.
 */

const saveClientSection = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...args: unknown[]) => saveClientSection(...args),
}));

const onSaved = jest.fn();

const client = {
  id: 'c1',
  name: 'Clayora',
  address: 'C-204, Ghaziabad',
  email: 'a@clayora.test',
  phone: '+919876543210',
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

const service = (code: string, name: string, scheduleKey: string) =>
  ({ code, name, scheduleKey, sortOrder: 0, archived: false }) as ContractService;

/** A service carrying items, which is what the whole sales catalogue looks like. */
const withItems = {
  code: 'SOC',
  name: 'Social Media',
  scheduleKey: 'retainer',
  sortOrder: 0,
  archived: false,
  sacCode: '998361',
  itemSeq: 32,
  items: [
    { id: 'I10', name: 'Bundle: 10 reels a month', ratePaise: 45_00_000, unit: 'fixed', archived: false },
    { id: 'I21', name: 'Posting + scheduling', ratePaise: 10_00_000, unit: 'fixed', archived: false },
    { id: 'I99', name: 'Retired line', ratePaise: 100, unit: 'fixed', archived: true },
  ],
} as ContractService;

// Setup is the first tab, so 01 is on screen and 05 is behind Build.
const services = [
  service('01', 'Domain and email setup', 'setup'),
  service('05', 'Shopify build', 'build'),
];

beforeEach(() => {
  jest.clearAllMocks();
  saveClientSection.mockResolvedValue({ success: true });
});

const show = () =>
  render(
    <ServicesStep client={client} onSaved={onSaved} submitLabel="Attachments" services={services} />,
  );

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /attachments/i }));

const openTab = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('tab', { name }));

const payload = () => saveClientSection.mock.calls[0][2];

describe('ServicesStep', () => {
  it('shows one Schedule at a time', async () => {
    const user = userEvent.setup();
    show();

    expect(screen.getByText('Domain and email setup')).toBeInTheDocument();
    expect(screen.queryByText('Shopify build')).not.toBeInTheDocument();

    await openTab(user, 'Build');
    expect(screen.getByText('Shopify build')).toBeInTheDocument();
    expect(screen.queryByText('Domain and email setup')).not.toBeInTheDocument();
  });

  it('adds a service with the card button, at the catalogue rate', async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole('button', { name: 'Add Domain and email setup' }));
    await submit(user);

    expect(payload().services).toEqual([{ code: '01' }]);
  });

  it('adds a service by pricing it, and keeps the rate in paise', async () => {
    const user = userEvent.setup();
    show();

    await user.type(screen.getByLabelText('Agreed rate for Domain and email setup'), '2500');
    await submit(user);

    expect(payload().services).toEqual([{ code: '01', ratePaise: 250000 }]);
  });

  it('keeps what was added under a Schedule that is no longer on screen', async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole('button', { name: 'Add Domain and email setup' }));
    await openTab(user, 'Build');
    await user.click(screen.getByRole('button', { name: 'Add Shopify build' }));

    // The card is gone with its tab; the list below carries both.
    expect(
      screen.queryByRole('button', { name: 'Add Domain and email setup' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Domain and email setup' })).toBeInTheDocument();

    await submit(user);
    expect(payload().services).toEqual([{ code: '01' }, { code: '05' }]);
  });

  it('does not advance when Enter is pressed in a field', async () => {
    const user = userEvent.setup();
    show();

    await user.type(screen.getByLabelText('Agreed rate for Domain and email setup'), '2500{Enter}');

    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('removes a service from the list, and its rate with it', async () => {
    const user = userEvent.setup();
    show();

    await user.type(screen.getByLabelText('Agreed rate for Domain and email setup'), '2500');
    await user.click(screen.getByRole('button', { name: 'Remove Domain and email setup' }));
    await submit(user);

    expect(payload().services).toEqual([]);
  });

  /**
   * The point of items on the record: a Service is a container, and naming it
   * alone said "Social Media, 45,000" and left which work that covered to
   * memory. What is ticked here is what an invoice itemises.
   */
  describe('choosing items under a service', () => {
    const showItems = () =>
      render(
        <ServicesStep
          client={client}
          onSaved={onSaved}
          submitLabel="Attachments"
          services={[...services, withItems]}
        />,
      );

    const openService = async (user: ReturnType<typeof userEvent.setup>) => {
      await openTab(user, 'Retainer');
      await user.click(screen.getByRole('button', { name: 'Add Social Media' }));
      await user.click(screen.getByRole('button', { name: /Whole service/ }));
    };

    it('records the items that were ticked, and no others', async () => {
      const user = userEvent.setup();
      showItems();
      await openService(user);

      await user.click(screen.getByRole('checkbox', { name: 'Bundle: 10 reels a month' }));
      await submit(user);

      expect(payload().services).toEqual([
        { code: 'SOC', items: [{ id: 'I10' }] },
      ]);
    });

    /**
     * Absent, not empty. A service with no items is billed as one line, and
     * `items: []` would be a third state that reads the same to `engagedLines`.
     */
    it('leaves items absent on a service billed as one line', async () => {
      const user = userEvent.setup();
      showItems();
      await openTab(user, 'Retainer');
      await user.click(screen.getByRole('button', { name: 'Add Social Media' }));
      await submit(user);

      expect(payload().services).toEqual([{ code: 'SOC' }]);
    });

    /** Unticking the last item is how a service goes back to one line. */
    it('returns to a whole-service engagement when the last item is unticked', async () => {
      const user = userEvent.setup();
      showItems();
      await openService(user);

      const box = screen.getByRole('checkbox', { name: 'Bundle: 10 reels a month' });
      await user.click(box);
      await user.click(box);
      await submit(user);

      expect(payload().services).toEqual([{ code: 'SOC' }]);
    });

    it('records an agreed rate against the item that was priced', async () => {
      const user = userEvent.setup();
      showItems();
      await openService(user);

      await user.click(screen.getByRole('checkbox', { name: 'Posting + scheduling' }));
      await user.type(screen.getByLabelText('Agreed rate for Posting + scheduling'), '8000');
      await submit(user);

      expect(payload().services).toEqual([
        { code: 'SOC', items: [{ id: 'I21', ratePaise: 8_00_000 }] },
      ]);
    });

    /** Archived items have left every picker, and this is one. */
    it('never offers an archived item', async () => {
      const user = userEvent.setup();
      showItems();
      await openService(user);

      expect(screen.getByRole('checkbox', { name: 'Bundle: 10 reels a month' })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: 'Retired line' })).not.toBeInTheDocument();
    });

    /** Removing the service must not leave its items behind to return later. */
    it('drops the items when the service is removed', async () => {
      const user = userEvent.setup();
      showItems();
      await openService(user);

      await user.click(screen.getByRole('checkbox', { name: 'Bundle: 10 reels a month' }));
      await user.click(screen.getByRole('button', { name: 'Remove Social Media' }));
      await user.click(screen.getByRole('button', { name: 'Add Social Media' }));
      await submit(user);

      expect(payload().services).toEqual([{ code: 'SOC' }]);
    });

    /** A Part carries no items, so there is nothing to open and nothing shown. */
    it('offers no item list on a service that carries none', async () => {
      const user = userEvent.setup();
      showItems();
      await user.click(screen.getByRole('button', { name: 'Add Domain and email setup' }));

      expect(screen.queryByRole('button', { name: /Whole service/ })).not.toBeInTheDocument();
    });
  });
});