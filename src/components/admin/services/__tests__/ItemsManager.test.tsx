import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemsManager from '../ItemsManager';
import { EditorPanelProvider } from '../../EditorPanel';
import type { ContractService } from '@/lib/domain/service';
import { archiveServiceItem, saveServiceItem } from '@/server/actions/services';

jest.mock('@/server/actions/services', () => ({
  saveServiceItem: jest.fn(async () => ({ success: true })),
  archiveServiceItem: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

/**
 * The items table and the panel that edits one.
 *
 * Two properties carry the design and are what these pin. A row is **read-only
 * until it is opened**, which is what lets fifty rates be scanned at once; and
 * a save posts **one item**, not the list, so two people editing different
 * items under one Service cannot overwrite each other.
 */

const service = {
  code: 'WEB',
  name: 'Custom Website',
  scheduleKey: 'build',
  sortOrder: 1,
  archived: false,
  sacCode: '998314',
  itemSeq: 55,
  items: [
    {
      id: 'I4',
      name: 'Core website setup (5 pages)',
      ratePaise: 25_00_000,
      unit: 'fixed',
      group: 'Foundation system',
      archived: false,
    },
    {
      id: 'I5',
      name: 'Additional standard page',
      ratePaise: 4_00_000,
      unit: 'perUnit',
      unitLabel: 'per page',
      group: 'Foundation system',
      archived: false,
    },
    {
      id: 'I9',
      name: 'Retired line',
      ratePaise: 1_00_000,
      unit: 'fixed',
      archived: true,
    },
  ],
} as unknown as ContractService;

const show = () =>
  render(
    <EditorPanelProvider>
      <ItemsManager service={service} />
    </EditorPanelProvider>,
  );

beforeEach(() => jest.clearAllMocks());

describe('the items table', () => {
  it('lists every live item with its rate and unit', () => {
    show();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Core website setup (5 pages)')).toBeInTheDocument();
    expect(within(table).getByText('₹ 25,000.00')).toBeInTheDocument();
    expect(within(table).getByText('per page')).toBeInTheDocument();
  });

  /** An archived item keeps its id and stays readable, but leaves the list. */
  it('hides archived items until they are asked for', async () => {
    const user = userEvent.setup();
    show();
    expect(screen.queryByText('Retired line')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show 1 archived/ }));
    expect(screen.getByText('Retired line')).toBeInTheDocument();
  });

  it('counts what is on screen, not what is stored', () => {
    show();
    // Two live of the three stored: the archived one is not on screen, so it
    // is not in the count either.
    expect(screen.getByLabelText('Item count')).toHaveTextContent('2 items');
  });

  /**
   * Absent is "quoted per engagement", a real answer rather than a missing
   * one, so the cell says so instead of printing a dash.
   */
  it('says Quoted for an item with no rate', () => {
    render(
      <EditorPanelProvider>
        <ItemsManager
          service={
            {
              ...service,
              items: [{ id: 'I1', name: 'Domain transfer', unit: 'fixed', archived: false }],
            } as unknown as ContractService
          }
        />
      </EditorPanelProvider>,
    );
    expect(screen.getByText('Quoted')).toBeInTheDocument();
  });
});

describe('editing one item', () => {
  const openItem = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
    user.click(screen.getByRole('button', { name: `Open ${name}` }));

  it('opens the panel on the item that was clicked', async () => {
    const user = userEvent.setup();
    show();
    await openItem(user, 'Core website setup (5 pages)');

    expect(screen.getByLabelText('Name')).toHaveValue('Core website setup (5 pages)');
    expect(screen.getByLabelText('Rate (₹)')).toHaveValue('25000.00');
  });

  /**
   * The rule this whole action exists for. Posting the list back would let two
   * people editing different items each save their own copy of it.
   */
  it('posts one item, carrying its id', async () => {
    const user = userEvent.setup();
    show();
    await openItem(user, 'Core website setup (5 pages)');

    await user.clear(screen.getByLabelText('Rate (₹)'));
    await user.type(screen.getByLabelText('Rate (₹)'), '28000');
    await user.click(screen.getByRole('button', { name: 'Save item' }));

    expect(saveServiceItem).toHaveBeenCalledWith(
      'WEB',
      expect.objectContaining({ id: 'I4', ratePaise: 28_00_000 }),
    );
    // One item, not an array: the action's signature is the guard.
    expect(Array.isArray((saveServiceItem as jest.Mock).mock.calls[0][1])).toBe(false);
  });

  /** A new item carries a blank id, and the server assigns one. */
  it('posts a blank id for a new item', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: 'Add item' }));

    await user.type(screen.getByLabelText('Name'), 'Three.js scene');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(saveServiceItem).toHaveBeenCalledWith(
      'WEB',
      expect.objectContaining({ id: '', name: 'Three.js scene' }),
    );
  });

  /** A unit label means nothing on a fixed item, so it is not offered. */
  it('asks for a unit label only on a per-unit item', async () => {
    const user = userEvent.setup();
    show();
    await openItem(user, 'Core website setup (5 pages)');
    expect(screen.queryByLabelText('Unit label')).not.toBeInTheDocument();

    await openItem(user, 'Additional standard page');
    expect(screen.getByLabelText('Unit label')).toHaveValue('per page');
  });

  /** Zero is a real rate; blank is "quoted". They must not collapse. */
  it('leaves the rate out when it is cleared, rather than posting zero', async () => {
    const user = userEvent.setup();
    show();
    await openItem(user, 'Core website setup (5 pages)');

    await user.clear(screen.getByLabelText('Rate (₹)'));
    await user.click(screen.getByRole('button', { name: 'Save item' }));

    const posted = (saveServiceItem as jest.Mock).mock.calls[0][1];
    expect('ratePaise' in posted).toBe(false);
  });

  it('refuses a band whose top is below its rate', async () => {
    const user = userEvent.setup();
    show();
    await openItem(user, 'Core website setup (5 pages)');

    await user.type(screen.getByLabelText('Up to (₹)'), '8000');
    await user.click(screen.getByRole('button', { name: 'Save item' }));

    expect(saveServiceItem).not.toHaveBeenCalled();
    expect(
      await screen.findByText('The top of the range cannot be below the rate.'),
    ).toBeInTheDocument();
  });

  /**
   * An edit must never silently restore something somebody retired, so the
   * archived flag comes from the record rather than from the form.
   */
  it('keeps an archived item archived through an edit', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: /show 1 archived/ }));
    await openItem(user, 'Retired line');

    await user.click(screen.getByRole('button', { name: 'Save item' }));
    expect(saveServiceItem).toHaveBeenCalledWith(
      'WEB',
      expect.objectContaining({ id: 'I9', archived: true }),
    );
  });
});

describe('archiving an item', () => {
  it('archives from the row, without opening the panel', async () => {
    const user = userEvent.setup();
    show();

    await user.click(
      screen.getByRole('button', { name: 'Archive Core website setup (5 pages)' }),
    );
    expect(archiveServiceItem).toHaveBeenCalledWith('WEB', 'I4', true);
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('offers to restore an archived one', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: /show 1 archived/ }));

    await user.click(screen.getByRole('button', { name: 'Restore Retired line' }));
    expect(archiveServiceItem).toHaveBeenCalledWith('WEB', 'I9', false);
  });
});
