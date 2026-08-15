import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorPanelProvider, EditorPanelContent } from '../../EditorPanel';
import EmployeeManager from '../EmployeeManager';
import type { EmployeeRecord } from '@/lib/domain/employee';

/**
 * The editor rail's behaviour, tested through its remaining consumer.
 *
 * These regressions were guarded on `ClientManager` until clients moved to the
 * seven-step onboarding route and stopped using the rail. `useRecordPanel` is
 * still shared, so the coverage moved here rather than being deleted with the
 * form it happened to be written against — the bugs it catches are the rail's,
 * not the client form's.
 */

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/employees',
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/server/actions/employees', () => ({
  createEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  deleteEmployeeAction: jest.fn(),
}));

const employees: EmployeeRecord[] = [
  {
    id: 'e1',
    name: 'Acme Person',
    address: '1 Acme Way',
    email: 'a@acme.test',
    phone: '+919000000001',
    role: 'Designer',
    engagementType: 'employee',
    pronoun: 'they',
    joiningDate: '2025-04-01',
    payAmountPaise: 5_000_000,
    bank: { bankName: 'HDFC', accountNo: '1', ifsc: 'HDFC0000001' },
  },
  {
    id: 'e2',
    name: 'Beta Person',
    address: '2 Beta Road',
    email: 'b@beta.test',
    phone: '+919000000002',
    role: 'Developer',
    engagementType: 'employee',
    pronoun: 'they',
    joiningDate: '2025-05-01',
    payAmountPaise: 6_000_000,
    bank: { bankName: 'HDFC', accountNo: '2', ifsc: 'HDFC0000001' },
  },
] as EmployeeRecord[];

function setup(list = employees) {
  return render(
    <EditorPanelProvider>
      <EmployeeManager employees={list} />
    </EditorPanelProvider>,
  );
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
});

describe('EmployeeManager', () => {
  it('opens an empty form from Add employee', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add employee/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('');
  });

  /**
   * The CTA used to live in the empty state when the list was empty and in the
   * header otherwise, so it moved the moment you added your first record. One
   * fixed home, both states.
   */
  it('keeps the create button in the header when the list is empty', () => {
    setup([]);
    expect(screen.getAllByRole('button', { name: /add employee/i })).toHaveLength(1);
  });

  /**
   * Regression: the rail's open state is shared app-wide, so deriving a
   * manager's visibility straight from it made the form appear whenever
   * anything else expanded the rail — landing on the page popped an empty form
   * nobody asked for. Only an explicit action opens it.
   */
  it('stays closed when the rail is opened by something else', () => {
    render(
      <EditorPanelProvider>
        {/* Another page's panel holds the rail open. */}
        <EditorPanelContent autoOpen>
          <p>Someone else&rsquo;s form</p>
        </EditorPanelContent>
        <EmployeeManager employees={employees} />
      </EditorPanelProvider>,
    );
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /add employee/i })).toHaveLength(1);
  });

  /**
   * Regression guard for the `key={editing?.id ?? 'new'}` remount.
   *
   * react-hook-form reads `defaultValues` only on mount, so without the key the
   * form keeps the first record's values when you switch to a second one — you
   * would be editing Beta while looking at Acme's details. The rail is
   * non-blocking, so switching straight from one row to another is a normal
   * gesture rather than an edge case, which makes this the likeliest way to
   * write wrong data into a real record.
   */
  it('reloads field values when switching from one record to another', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /edit acme person/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Acme Person');

    await user.click(screen.getByRole('button', { name: /edit beta person/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Beta Person');
  });

  it('warns before discarding unsaved edits when switching records', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /edit acme person/i }));
    await user.type(screen.getByLabelText(/^name$/i), ' edited');

    await user.click(screen.getByRole('button', { name: /edit beta person/i }));

    // The switch is held back until the user decides.
    expect(
      screen.getByRole('alertdialog', { name: /discard unsaved changes/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Acme Person edited');

    await user.click(screen.getByRole('button', { name: /discard changes/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Beta Person');
  });

  it('keeps the current record when the discard is cancelled', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /edit acme person/i }));
    await user.type(screen.getByLabelText(/^name$/i), ' edited');

    await user.click(screen.getByRole('button', { name: /edit beta person/i }));
    await user.click(screen.getByRole('button', { name: /keep editing/i }));

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Acme Person edited');
  });
});
