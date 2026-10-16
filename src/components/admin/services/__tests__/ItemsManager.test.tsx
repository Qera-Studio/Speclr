import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemsManager from '../ItemsManager';
import type { ContractService } from '@/lib/domain/service';
import {
  archiveServiceItem,
  removeServiceGroup,
  saveServiceItem,
} from '@/server/actions/services';

jest.mock('@/server/actions/services', () => ({
  saveServiceItem: jest.fn(async () => ({ success: true })),
  archiveServiceItem: jest.fn(async () => ({ success: true })),
  removeServiceGroup: jest.fn(async () => ({ success: true, cleared: 2 })),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

/**
 * The items table and the sheet that edits one.
 *
 * Two properties carry the design and are what these pin. A row is **read-only
 * until it is opened**, which is what lets fifty rates be scanned at once; and
 * a save posts **one item**, not the list, so two people editing different
 * items under one Service cannot overwrite each other.
 *
 * No `EditorPanelProvider`: the editor rail was retired here for the drawer on
 * 20 September 2026, so this component stands on its own, and a test that still
 * wrapped it would be asserting a dependency it no longer has.
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

/** The page owns which item is open; this stands in for it. */
function Harness({ service }: { service: ContractService }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <>
      {/* The page header's button, which opens the same panel. */}
      <button type="button" onClick={() => setEditingId('')}>
        Add item
      </button>
      <ItemsManager service={service} editingId={editingId} onEditingChange={setEditingId} />
    </>
  );
}

const show = (s: ContractService = service) => render(<Harness service={s} />);

beforeEach(() => jest.clearAllMocks());

describe('the price list', () => {
  /** Every live item, by name, with its price as the row prints it. */
  it('lists every live item with its price and unit', () => {
    show();
    expect(screen.getByRole('button', { name: 'Core website setup (5 pages)'})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Change the price of Core website setup \(5 pages\), now ₹ 25,000$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Change the price of Additional standard page, now ₹ 4,000 per page$/ })).toBeInTheDocument();
  });

  /**
   * Grouped under the rate card's headings and never paginated: the old table
   * cut fifty-two items into pages of ten and split the groups across them.
   */
  it('groups items under their heading, with no pager', () => {
    show();
    expect(screen.getByRole('heading', { name: /Foundation system/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /pag/i })).not.toBeInTheDocument();
  });

  /** An archived item keeps its id and stays readable, but leaves the list. */
  it('hides archived items until they are asked for', async () => {
    const user = userEvent.setup();
    show();
    expect(screen.queryByText('Retired line')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Archived 1/ }));
    expect(screen.getByText('Retired line')).toBeInTheDocument();
  });

  /** The count beside the heading is the live items, not what is stored. */
  it('counts the live items', () => {
    show();
    const heading = screen.getByRole('heading', { name: 'Price list' });
    expect(heading.parentElement).toHaveTextContent(/^Price list2/);
  });

  it('finds items by name', async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByRole('searchbox', { name: 'Search the price list' }), 'additional');
    expect(screen.getByRole('button', { name: 'Additional standard page'})).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Core website setup (5 pages)'})).not.toBeInTheDocument();
  });

  /** Absent is "quoted per engagement", a real answer, not a missing one. */
  it('says Quoted for an item with no rate', () => {
    show({
      ...service,
      items: [{ id: 'I1', name: 'Domain transfer', unit: 'fixed', archived: false }],
    } as unknown as ContractService);
    expect(screen.getByText('Quoted')).toBeInTheDocument();
  });

  /** A new service has nothing to list, and says what an item is. */
  it('explains what an item is when there are none', () => {
    show({ ...service, items: [] } as unknown as ContractService);
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });
});

/**
 * The price is edited where it is read. The most frequent edit on the page,
 * so it takes no panel; and it still posts one item, never the list.
 */
describe('editing a price in place', () => {
  const price = (name: string) => screen.getByRole('button', { name: new RegExp(`^Change the price of ${name.replace(/[()]/g, '\\$&')}`) });

  it('saves the new price, in paise, on Enter', async () => {
    const user = userEvent.setup();
    show();
    await user.click(price('Core website setup (5 pages)'));
    const input = screen.getByRole('textbox', { name: 'Price of Core website setup (5 pages), in rupees' });
    await user.clear(input);
    await user.type(input, '28000{Enter}');

    expect(saveServiceItem).toHaveBeenCalledTimes(1);
    expect(saveServiceItem).toHaveBeenCalledWith(
      'WEB',
      expect.objectContaining({ id: 'I4', name: 'Core website setup (5 pages)', ratePaise: 28_00_000 }),
    );
  });

  it('refuses letters as they are typed', async () => {
    const user = userEvent.setup();
    show();
    await user.click(price('Core website setup (5 pages)'));
    const input = screen.getByRole('textbox', { name: /^Price of Core website setup/ });
    await user.clear(input);
    await user.type(input, '2a8b0');
    expect(input).toHaveValue('280');
  });

  it('cancels on Escape without saving', async () => {
    const user = userEvent.setup();
    show();
    await user.click(price('Core website setup (5 pages)'));
    const input = screen.getByRole('textbox', { name: /^Price of Core website setup/ });
    await user.clear(input);
    await user.type(input, '1{Escape}');

    expect(saveServiceItem).not.toHaveBeenCalled();
    expect(price('Core website setup (5 pages)')).toHaveAccessibleName(/now ₹ 25,000$/);
  });

  /** Blank is "quoted", which posts no rate rather than zero. */
  it('posts no rate when the price is cleared', async () => {
    const user = userEvent.setup();
    show();
    await user.click(price('Core website setup (5 pages)'));
    await user.clear(screen.getByRole('textbox', { name: /^Price of Core website setup/ }));
    await user.keyboard('{Enter}');

    expect(saveServiceItem).toHaveBeenCalledWith('WEB', expect.objectContaining({ id: 'I4', ratePaise: undefined }));
  });

  /** Shown at once, and put back if the server refuses it. */
  it('puts the old price back when the save is refused', async () => {
    (saveServiceItem as jest.Mock).mockResolvedValueOnce({ success: false, error: 'Nope.' });
    const user = userEvent.setup();
    show();
    await user.click(price('Core website setup (5 pages)'));
    const input = screen.getByRole('textbox', { name: /^Price of Core website setup/ });
    await user.clear(input);
    await user.type(input, '28000{Enter}');

    await waitFor(() =>
      expect(price('Core website setup (5 pages)')).toHaveAccessibleName(/now ₹ 25,000$/),
    );
  });
});

describe('editing one item', () => {
  const openItem = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
    user.click(screen.getByRole('button', { name}));

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

  /**
   * A unit label means nothing on a fixed item, so it is not offered.
   *
   * The two items are reached by **paging**, not by clicking the second row:
   * the sheet is modal, so the table underneath it is not reachable while one
   * item is open. That is also what makes the pager worth having rather than a
   * convenience, and it is the one thing the rail did that this does not.
   */
  it('asks for a unit label only on a per-unit item', async () => {
    const user = userEvent.setup();
    show();
    await openItem(user, 'Core website setup (5 pages)');
    expect(screen.queryByLabelText('Unit label')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText('Unit label')).toHaveValue('per page');
  });

  /**
   * By position, never by arithmetic on the id: ids are never reissued, so the
   * list has gaps (`I4`, `I5`, `I9`) and `id + 1` pages into nothing.
   */
  it('pages from the first item to the last', async () => {
    const user = userEvent.setup();
    show();
    await openItem(user, 'Core website setup (5 pages)');

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText('Name')).toHaveValue('Additional standard page');
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
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
    await user.click(screen.getByRole('button', { name: /^Archived 1/ }));
    await openItem(user, 'Retired line');

    await user.click(screen.getByRole('button', { name: 'Save item' }));
    expect(saveServiceItem).toHaveBeenCalledWith(
      'WEB',
      expect.objectContaining({ id: 'I9', archived: true }),
    );
  });
});

/**
 * The row's actions sit behind one menu (`ItemRowMenu`), which is the clients
 * table's arrangement: the actions column is frozen and narrow, so icons side
 * by side would be targets a few pixels apart distinguished by a 16px glyph.
 *
 * **No delete, and that is the rule rather than an omission.** An item's id is
 * cited by a client record and by a quotation line and is never reissued, so
 * archiving is the only removal.
 */
/**
 * Archiving, which moved into the sheet on 20 September 2026.
 *
 * **The row offers Edit alone**, on request, so the only archive control is in
 * the open item's toolbar. That is the safer place for it: the row's actions
 * are a hover-revealed target beside forty-nine others, and the item happened
 * to get archived by a stray click while the menu was there. In the sheet the
 * item is already open and named in the header.
 */
describe('archiving an item', () => {
  const openItem = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
    user.click(screen.getByRole('button', { name}));

  it('archives the open item from the sheet', async () => {
    const user = userEvent.setup();
    show();

    await openItem(user, 'Core website setup (5 pages)');
    await user.click(
      screen.getByRole('button', { name: 'Archive Core website setup (5 pages)' }),
    );

    expect(archiveServiceItem).toHaveBeenCalledWith('WEB', 'I4', true);
  });

  /** One button, both directions: a row retired with no way back is a bug. */
  it('offers to restore an archived one', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: /^Archived 1/ }));

    await openItem(user, 'Retired line');
    await user.click(screen.getByRole('button', { name: 'Restore Retired line' }));

    expect(archiveServiceItem).toHaveBeenCalledWith('WEB', 'I9', false);
  });

  /**
   * The row itself carries Edit and nothing else. This is the regression that
   * actually bit: an archive control on the row is one mis-click from retiring
   * a line somebody was only reading.
   */
  it('puts no archive control on the row', () => {
    show();
    expect(
      screen.getByRole('button', { name: 'Core website setup (5 pages)'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Archive Core website setup (5 pages)' }),
    ).not.toBeInTheDocument();
  });
});

/**
 * Removing a group heading.
 *
 * **A group is not a record**, so this is a bulk edit rather than a delete: the
 * headings are derived by reading `group` off the items, and the only way one
 * stops existing is for nothing to carry it. The confirmation therefore has to
 * say how many items it is about to change, which is the whole reason the
 * counts travel with the list.
 */
describe('removing a group', () => {
  const openGroups = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Core website setup (5 pages)'}));
    await user.click(screen.getByLabelText('Group'));
  };

  /**
   * The count belongs to the confirmation and nowhere else.
   *
   * It was on the dropdown row too, as a trailing figure, and that was the
   * wrong place for it: the list is there to pick a heading, and a column of
   * counts beside the names reads as data about the groups rather than as a
   * warning about an action most readers will never take. The number only
   * matters at the moment it is about to change something.
   */
  it('names the item count in the confirmation, not on the row', async () => {
    const user = userEvent.setup();
    show();
    await openGroups(user);

    const option = await screen.findByRole('option', { name: /Foundation system/ });
    expect(option).toHaveTextContent('Foundation system');
    // The heading alone: no count riding along beside it.
    expect(option).not.toHaveTextContent(/\d/);

    // Two live items carry 'Foundation system' in the fixture.
    await user.click(
      screen.getByRole('button', { name: 'Remove the group Foundation system' }),
    );

    expect(
      await screen.findByText(/clears the group from 2 items on this service/i),
    ).toBeInTheDocument();
    // Said before it fires, not after.
    expect(removeServiceGroup).not.toHaveBeenCalled();
  });

  it('clears it only once confirmed', async () => {
    const user = userEvent.setup();
    show();
    await openGroups(user);

    await user.click(
      await screen.findByRole('button', { name: 'Remove the group Foundation system' }),
    );
    // The dialog's own action, found inside it, not the trigger that opened it:
    // `/remove/i` matches both, and matching the trigger would pass without the
    // confirmation ever being agreed to.
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(removeServiceGroup).toHaveBeenCalledWith('WEB', 'Foundation system');
  });
});
