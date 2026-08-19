import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientManager from '../ClientManager';
import type { ClientRecord } from '@/lib/domain/types';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const deleteClientAction = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  deleteClientAction: (...args: unknown[]) => deleteClientAction(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  deleteClientAction.mockResolvedValue({ success: true });
});

/**
 * The clients list, after onboarding moved to its own route.
 *
 * The rail is gone here: adding and editing both navigate to
 * `/client/clients/[id]`. The rail's own regressions (the discard guard, the
 * remount on switching records) moved to `EmployeeManager.test.tsx`, which is
 * where `useRecordPanel` still lives.
 */

const clients: ClientRecord[] = [
  {
    id: 'c1',
    name: 'Acme Co.',
    address: '1 Acme Way',
    email: 'a@acme.test',
    phone: '+91 90000 00001',
  },
  {
    id: 'c2',
    name: 'Beta Ltd',
    address: '2 Beta Road',
    email: 'b@beta.test',
    phone: '+91 90000 00002',
  },
] as ClientRecord[];

describe('ClientManager', () => {
  it('sends Add client to the onboarding route', () => {
    render(<ClientManager clients={clients} />);
    expect(screen.getByRole('link', { name: /add client/i })).toHaveAttribute(
      'href',
      '/client/clients/new',
    );
  });

  /**
   * The CTA used to live in the empty state when the list was empty and in the
   * header otherwise, so it moved the moment you added your first client. One
   * fixed home, both states.
   */
  it('keeps the create link in the header when there are no clients', () => {
    render(<ClientManager clients={[]} />);
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /add client/i })).toHaveLength(1);
  });

  /**
   * No form mounts on this page any more. A second surface writing the same row
   * is how a section silently goes missing — a quick edit that doesn't know
   * about tax registration saves the record without it.
   */
  it('mounts no editing form', () => {
    render(<ClientManager clients={clients} />);
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });

  it('links each row to that client', () => {
    render(<ClientManager clients={clients} />);
    expect(screen.getByRole('link', { name: /edit beta ltd/i })).toHaveAttribute(
      'href',
      '/client/clients/c2?step=identity',
    );
  });

  async function deleteFirstClient(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /delete acme co\./i }));
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
  }

  it('refreshes the list once a client is gone', async () => {
    const user = userEvent.setup();
    render(<ClientManager clients={clients} />);

    await deleteFirstClient(user);
    expect(deleteClientAction).toHaveBeenCalledWith('c1');
    expect(refresh).toHaveBeenCalled();
  });

  /**
   * The half that matters. A client that has been on a document is refused
   * server-side — the list cannot know that, so the answer arrives after the
   * confirmation and has to be shown rather than swallowed.
   */
  it('shows the server’s refusal instead of pretending it worked', async () => {
    const user = userEvent.setup();
    deleteClientAction.mockResolvedValue({
      success: false,
      error: 'Acme Co. has documents and cannot be deleted.',
    });
    render(<ClientManager clients={clients} />);

    await deleteFirstClient(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/has documents and cannot be deleted/i);
    expect(refresh).not.toHaveBeenCalled();
  });
});
