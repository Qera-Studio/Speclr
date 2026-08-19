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
    createdAt: 0,
    updatedAt: 0,
  },
] as ClientRecord[];

describe('ClientsTable', () => {
  it('renders a row per client', () => {
    render(<ClientsTable clients={clients} onDelete={onDelete} />);
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
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
    render(<ClientsTable clients={clients} onDelete={onDelete} />);
    expect(screen.getByText('0 of 7')).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    render(<ClientsTable clients={[]} onDelete={onDelete} />);
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
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
