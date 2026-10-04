import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientsTable from '../ClientsTable';
import { EMPTY_PART_CONTENT, type ContractService } from '@/lib/domain/service';
import type { ClientRecord } from '@/lib/domain/types';
import type { StudioMember } from '@/lib/profile';
import { NIL } from '@/lib/utils';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const onDelete = jest.fn();
const onArchive = jest.fn();
beforeEach(() => jest.clearAllMocks());

const clients = [
  {
    id: 'c1',
    name: 'Acme Co.',
    address: 'x',
    email: 'a@b.com',
    phone: '999',
    gstin: '',
    createdAt: new Date(2026, 6, 21).getTime(),
    updatedAt: 0,
  },
] as ClientRecord[];

const people: StudioMember[] = [
  { id: 'e1', name: 'Ria Pareek', role: 'Designer', engagementType: 'employee', departed: false },
  { id: 'e2', name: 'Kabir', role: 'Developer', engagementType: 'employee', departed: false },
  { id: 'e3', name: 'Meera', role: 'Founder', engagementType: 'employee', departed: true },
];

const catalogue: ContractService[] = [
  {
    ...EMPTY_PART_CONTENT,
    code: 'SOC',
    name: 'Social Media',
    scheduleKey: 'retainer',
    sortOrder: 3,
    archived: false,
    items: [
      { id: 'I10', name: 'Reels', unit: 'fixed', archived: false, ratePaise: 45_00_000 },
      { id: 'I21', name: 'Posting', unit: 'fixed', archived: false, ratePaise: 10_00_000 },
    ],
    itemSeq: 21,
  },
];

/** One item at its agreed rate, one at the catalogue's: ₹53,000 in all. */
const engaged: ClientRecord['commercial'] = {
  services: [{ code: 'SOC', items: [{ id: 'I10' }, { id: 'I21', ratePaise: 8_00_000 }] }],
};

const rates = { asOf: '2026-09-21', rates: { GBP: 0.0093 }, source: 'Fixed rates for the test' };

function renderTable(props: Partial<React.ComponentProps<typeof ClientsTable>> = {}) {
  return render(
    <ClientsTable clients={clients} onDelete={onDelete} onArchive={onArchive} {...props} />,
  );
}

/** The row's three actions sit behind one button, named for the row. */
async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /more actions for acme co\./i }));
}

describe('ClientsTable', () => {
  it('renders a row per client', () => {
    renderTable();
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    // Through the domain helper, so the list reads the same way documents do,
    // and it is what the list is sorted by.
    expect(screen.getByText('21 Jul 2026')).toBeInTheDocument();
  });

  it('links each row to that client’s onboarding page', () => {
    renderTable();
    // A link, not a button: editing a client is a real URL that survives a
    // refresh and can be shared.
    //
    // It names the step the record has nothing for, so the row's "0 of 8" and
    // the page it opens agree. This client is a legacy row with no sections at
    // all, so that is the first one.
    expect(screen.getByRole('link', { name: 'Acme Co.' })).toHaveAttribute(
      'href',
      '/client/clients/c1?step=identity',
    );
  });

  it('opens an onboarding in progress at its gap, not at the top', () => {
    const partway: ClientRecord = {
      ...clients[0],
      entityType: 'pvt_ltd',
      companyName: 'Acme Co.',
      tax: { gstin: '09AAACT2727Q1ZW' },
      contacts: { roles: { signing: 'primary' } },
      // Identity, Tax and Contacts are filled and Team is not, so Team is the
      // gap. The lead is what completes it.
    };
    renderTable({ clients: [partway] });
    expect(screen.getByRole('link', { name: 'Acme Co.' })).toHaveAttribute(
      'href',
      '/client/clients/c1?step=team',
    );
  });

  it('offers Edit on the menu, to the same place the row opens', async () => {
    const user = userEvent.setup();
    renderTable();

    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /edit/i }));
    expect(push).toHaveBeenCalledWith('/client/clients/c1?step=identity');
  });

  it('shows how much onboarding is done', () => {
    // A legacy client carries no entity type or sections, so only the address
    // half of identity is there: nothing counts as complete.
    // Drawn as a ring, so the figures are in the accessible name: the column
    // is scanned rather than read, and a screen reader still gets the count.
    renderTable();
    expect(screen.getByRole('img', { name: 'Onboarding: 0 of 8' })).toBeInTheDocument();
  });

  /**
   * The four columns that read the record. The lead is somebody who has left,
   * because a client they worked on is history rather than a list to tidy; the
   * team carries an id nobody answers to, which is dropped rather than printed
   * blank; and the amount is one item at its agreed rate plus one at the
   * catalogue's list price, through the cascade the invoice uses.
   */
  it('shows the industry, the price, the lead and the team from the record', () => {
    const wired: ClientRecord = {
      ...clients[0],
      industry: 'saas',
      leadEmployeeId: 'e3',
      teamEmployeeIds: ['e1', 'e2', 'gone'],
      commercial: engaged,
    };
    const { container } = renderTable({ clients: [wired], people, catalogue });

    expect(screen.getByText('SaaS')).toBeInTheDocument();
    expect(screen.getByText('Meera')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Team: Ria Pareek, Kabir' })).toBeInTheDocument();
    // ₹45,000 list price + ₹8,000 agreed, in paise, printed as rupees.
    expect(container.querySelector('td[data-col="amount"]')).toHaveTextContent('53,000.00');
  });

  /**
   * A foreign client's price reads in their own currency at the day's rate,
   * and the chip is a toggle back to INR. The INR figure is the stored answer,
   * so it is the one that must survive the click.
   */
  it('shows a foreign client’s price in their currency, and the chip toggles it to INR', async () => {
    const user = userEvent.setup();
    const abroad: ClientRecord = {
      ...clients[0],
      commercial: engaged,
      addressParts: { country: 'GB' } as ClientRecord['addressParts'],
    };
    const { container } = renderTable({ clients: [abroad], catalogue, rates });
    const amount = container.querySelector('td[data-col="amount"]');

    // ₹53,000 at 0.0093 is £492.90, in the pound's own grouping.
    expect(amount).toHaveTextContent('£');
    expect(amount).toHaveTextContent('492.90');

    await user.click(screen.getByRole('button', { name: /show in pound sterling/i, pressed: true }));
    expect(amount).toHaveTextContent('₹');
    expect(amount).toHaveTextContent('53,000.00');
  });

  /**
   * INR is the figure's own currency, so an Indian client has nothing to
   * toggle to; and a day the rates could not be fetched costs the toggle,
   * never the figure.
   */
  it('gives an Indian client no toggle, and nobody one on a day without rates', () => {
    const abroad: ClientRecord = {
      ...clients[0],
      commercial: engaged,
      addressParts: { country: 'GB' } as ClientRecord['addressParts'],
    };
    const { container, rerender } = renderTable({
      clients: [{ ...clients[0], commercial: engaged }],
      catalogue,
      rates,
    });
    expect(screen.queryByRole('button', { name: /show in/i })).not.toBeInTheDocument();
    expect(container.querySelector('td[data-col="amount"]')).toHaveTextContent('53,000.00');

    rerender(
      <ClientsTable clients={[abroad]} catalogue={catalogue} rates={null} onDelete={onDelete} onArchive={onArchive} />,
    );
    expect(screen.queryByRole('button', { name: /show in/i })).not.toBeInTheDocument();
    expect(container.querySelector('td[data-col="amount"]')).toHaveTextContent('53,000.00');
  });

  /**
   * A record with none of the four prints the house "no value" in each, never
   * an invented one and never ₹0: zero is a real rate, and a fabricated figure
   * beside a real client name invites a decision.
   */
  it('prints nothing invented where the record has nothing', () => {
    const { container } = renderTable({ people, catalogue });
    for (const key of ['amount', 'industry', 'lead', 'team']) {
      expect(container.querySelector(`td[data-col="${key}"]`)).toHaveTextContent(NIL);
    }
  });

  /**
   * Offboarding, both ways, and without a dialog: it takes nothing away and
   * the menu offers the way back on the next open.
   */
  it('archives a client, and restores one from the archived list', async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable();

    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /archive/i }));
    expect(onArchive).toHaveBeenCalledWith(clients[0], true);

    rerender(<ClientsTable clients={clients} onDelete={onDelete} onArchive={onArchive} archived />);
    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /restore/i }));
    expect(onArchive).toHaveBeenLastCalledWith(clients[0], false);
  });

  it('renders an empty state', () => {
    renderTable({ clients: [] });
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
  });

  // An empty archive is not an app with no clients in it, and saying so would
  // read as data loss on the one screen you go to looking for a missing row.
  it('says something different when the archive is what is empty', () => {
    renderTable({ clients: [], archived: true });
    expect(screen.getByText(/nothing archived/i)).toBeInTheDocument();
  });

  /**
   * Deleting names the row, and asks first. Whether it is *allowed* is the
   * server's call, since the list has no idea what has been issued, so the
   * action is offered on every row and the refusal comes back as a message.
   */
  it('asks before deleting, then reports the row', async () => {
    const user = userEvent.setup();
    renderTable();

    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    expect(onDelete).toHaveBeenCalledWith(clients[0]);
  });
});
