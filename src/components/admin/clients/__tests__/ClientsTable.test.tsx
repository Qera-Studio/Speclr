import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientsTable from '../ClientsTable';
import type { ClientRecord } from '@/lib/domain/types';

const onDelete = jest.fn();
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

describe('ClientsTable', () => {
  it('renders a row per client', () => {
    render(<ClientsTable clients={clients} onDelete={onDelete} />);
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    // Through the domain helper, so the list reads the same way documents do,
    // and it is what the list is sorted by.
    expect(screen.getByText('21 Jul 2026')).toBeInTheDocument();
  });

  it('links each row to that client’s onboarding page', () => {
    render(<ClientsTable clients={clients} onDelete={onDelete} />);
    // A link, not a button: editing a client is now a real URL that survives a
    // refresh and can be shared.
    //
    // It names the step the record has nothing for, so the row's "0 of 7" and
    // the page it opens agree. This client is a legacy row with no sections at
    // all, so that is the first one.
    expect(screen.getByRole('link', { name: /edit acme co\./i })).toHaveAttribute(
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
    };
    render(<ClientsTable clients={[partway]} onDelete={onDelete} />);
    expect(screen.getByRole('link', { name: /edit acme co\./i })).toHaveAttribute(
      'href',
      '/client/clients/c1?step=commercial',
    );
  });

  it('shows how much onboarding is done', () => {
    // A legacy client carries no entity type or sections, so only the address
    // half of identity is there — nothing counts as complete.
    // Drawn as a ring, so the figures are in the accessible name: the column
    // is scanned rather than read, and a screen reader still gets the count.
    render(<ClientsTable clients={clients} onDelete={onDelete} />);
    expect(
      screen.getByRole('img', { name: 'Onboarding: 0 of 7' }),
    ).toBeInTheDocument();
  });

  /**
   * Offboarding, both ways, and without a dialog: it takes nothing away and the
   * button beside it puts the row straight back.
   */
  it('archives a client, and restores one from the archived list', async () => {
    const user = userEvent.setup();
    const onArchive = jest.fn();
    const { rerender } = render(
      <ClientsTable clients={clients} onDelete={onDelete} onArchive={onArchive} />,
    );

    await user.click(screen.getByRole('button', { name: /archive acme co\./i }));
    expect(onArchive).toHaveBeenCalledWith(clients[0], true);

    rerender(
      <ClientsTable clients={clients} onDelete={onDelete} onArchive={onArchive} archived />,
    );
    await user.click(screen.getByRole('button', { name: /restore acme co\./i }));
    expect(onArchive).toHaveBeenLastCalledWith(clients[0], false);
  });

  it('renders an empty state', () => {
    render(<ClientsTable clients={[]} onDelete={onDelete} />);
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
  });

  // An empty archive is not an app with no clients in it, and saying so would
  // read as data loss on the one screen you go to looking for a missing row.
  it('says something different when the archive is what is empty', () => {
    render(<ClientsTable clients={[]} onDelete={onDelete} archived />);
    expect(screen.getByText(/nothing archived/i)).toBeInTheDocument();
  });

  /**
   * Deleting names the row, and asks first. Whether it is *allowed* is the
   * server's call — the list has no idea what has been issued — so the button
   * is offered on every row and the refusal comes back as a message.
   */
  it('asks before deleting, then reports the row', async () => {
    const user = userEvent.setup();
    render(<ClientsTable clients={clients} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete acme co\./i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(onDelete).toHaveBeenCalledWith(clients[0]);
  });
});
