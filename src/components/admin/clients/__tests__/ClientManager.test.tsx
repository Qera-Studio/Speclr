import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientManager from '../ClientManager';
import type { ClientRecord } from '@/lib/domain/types';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const toast = jest.fn();
jest.mock('sonner', () => ({ toast: (...args: unknown[]) => toast(...args) }));

const deleteClientAction = jest.fn();
const setClientArchivedAction = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  deleteClientAction: (...args: unknown[]) => deleteClientAction(...args),
  setClientArchivedAction: (...args: unknown[]) => setClientArchivedAction(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  deleteClientAction.mockResolvedValue({ success: true });
  setClientArchivedAction.mockResolvedValue({ success: true });
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
    createdAt: new Date(2026, 6, 21).getTime(),
  },
  {
    id: 'c2',
    name: 'Beta Ltd',
    address: '2 Beta Road',
    email: 'b@beta.test',
    phone: '+91 90000 00002',
    createdAt: new Date(2026, 6, 20).getTime(),
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

  /**
   * Offboarding. The archived rows leave the default list and are reachable
   * behind the toggle, which is the whole point: a client that has been on a
   * document can never be deleted, so without this the list only ever grows.
   */
  it('keeps archived clients out of the list, and behind the toggle', async () => {
    const user = userEvent.setup();
    const withArchived = [clients[0], { ...clients[1], archived: true }];
    render(<ClientManager clients={withArchived} />);

    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.queryByText('Beta Ltd')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show archived clients/i }));
    expect(screen.getByText('Beta Ltd')).toBeInTheDocument();
    expect(screen.queryByText('Acme Co.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /restore beta ltd/i }));
    expect(setClientArchivedAction).toHaveBeenCalledWith('c2', false);
    expect(refresh).toHaveBeenCalled();
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

  /**
   * Archiving takes the row out of the list you are reading, so the way back
   * has to travel with the confirmation. Without the undo the only route is
   * finding the archive toggle and hunting for the row again.
   */
  it('offers an undo on the toast when a client is archived', async () => {
    const user = userEvent.setup();
    render(<ClientManager clients={clients} />);

    await user.click(screen.getByRole('button', { name: /archive acme co\./i }));

    expect(setClientArchivedAction).toHaveBeenCalledWith('c1', true);
    const [message, options] = toast.mock.calls[0] as [string, { action: { label: string; onClick: () => void } }];
    expect(message).toBe('Acme Co. archived');
    expect(options.action.label).toBe('Undo');

    // The undo is a real inverse, not a dismiss.
    setClientArchivedAction.mockClear();
    await act(async () => options.action.onClick());
    expect(setClientArchivedAction).toHaveBeenCalledWith('c1', false);
  });

  it('says nothing on the toast when the archive is refused', async () => {
    const user = userEvent.setup();
    setClientArchivedAction.mockResolvedValue({ success: false, error: 'Nope.' });
    render(<ClientManager clients={clients} />);

    await user.click(screen.getByRole('button', { name: /archive acme co\./i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nope.');
    expect(toast).not.toHaveBeenCalled();
  });
});
