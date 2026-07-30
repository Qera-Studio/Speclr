import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorPanelProvider, EditorPanelContent } from '../../EditorPanel';
import ClientManager from '../ClientManager';
import type { ClientRecord } from '@/lib/domain/types';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/server/actions/clients', () => ({
  createClient: jest.fn(),
  updateClient: jest.fn(),
}));

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

function setup() {
  return render(
    <EditorPanelProvider>
      <ClientManager clients={clients} />
    </EditorPanelProvider>,
  );
}

describe('ClientManager', () => {
  it('opens an empty form from Add client', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add client/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('');
  });

  /**
   * Regression: the rail's open state is shared app-wide, so deriving this
   * manager's visibility straight from it made the form appear whenever
   * anything else expanded the rail — landing on Clients popped an empty "Add
   * client" form nobody asked for. Only an explicit action opens ours.
   */
  it('stays closed when the rail is opened by something else', () => {
    render(
      <EditorPanelProvider>
        {/* Another page's panel holds the rail open. */}
        <EditorPanelContent autoOpen>
          <p>Someone else&rsquo;s form</p>
        </EditorPanelContent>
        <ClientManager clients={clients} />
      </EditorPanelProvider>,
    );
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    // Exactly one "Add client" — the trigger. A second would be the form's
    // submit button, i.e. the form wrongly mounted.
    expect(screen.getAllByRole('button', { name: /add client/i })).toHaveLength(1);
  });

  /**
   * Regression guard for the `key={editing?.id ?? 'new'}` remount.
   *
   * react-hook-form reads `defaultValues` only on mount, so without the key the
   * form keeps the first record's values when you switch to a second one — you
   * would be editing Beta while looking at Acme's details. The rail is
   * non-blocking, so switching straight from one row to another is now a normal
   * gesture rather than an edge case, which makes this the likeliest way to
   * write wrong data into a real client record.
   */
  it('reloads field values when switching from one record to another', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /edit acme co\./i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Acme Co.');

    await user.click(screen.getByRole('button', { name: /edit beta ltd/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Beta Ltd');
  });

  it('warns before discarding unsaved edits when switching records', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /edit acme co\./i }));
    await user.type(screen.getByLabelText(/^name$/i), ' edited');

    await user.click(screen.getByRole('button', { name: /edit beta ltd/i }));

    // The switch is held back until the user decides.
    expect(screen.getByRole('alertdialog', { name: /discard unsaved changes/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Acme Co. edited');

    await user.click(screen.getByRole('button', { name: /discard changes/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Beta Ltd');
  });

  it('keeps the current record when the discard is cancelled', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /edit acme co\./i }));
    await user.type(screen.getByLabelText(/^name$/i), ' edited');

    await user.click(screen.getByRole('button', { name: /edit beta ltd/i }));
    await user.click(screen.getByRole('button', { name: /keep editing/i }));

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Acme Co. edited');
  });
});
