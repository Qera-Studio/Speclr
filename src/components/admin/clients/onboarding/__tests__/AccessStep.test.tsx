import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessStep from '../AccessStep';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Delivery & access.
 *
 * Two things are worth pinning here. The rule the step exists to enforce is in
 * its warning and in the shape of the data: a row says *where* a credential
 * lives and never what it is. The rest is legibility — a stack of cards headed
 * "Access 1, Access 2, Access 3" is a list nobody can read, so a card names
 * itself from the account typed into it.
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
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  saveClientSection.mockResolvedValue({ success: true, id: 'c1' });
});

const renderStep = (record: ClientRecord = client) =>
  render(<AccessStep client={record} onSaved={onSaved} submitLabel="Finish" />);

it('says on the page that a credential itself is never recorded', () => {
  renderStep();
  expect(screen.getByText(/never the credential itself/i)).toBeInTheDocument();
});

it('names a card after the account, falling back to its kind', async () => {
  const user = userEvent.setup();
  renderStep();

  await user.click(screen.getByRole('button', { name: /add access/i }));
  // Nothing typed yet, so the kind names it. "Access 1" would be a heading
  // that says only how many came before.
  expect(screen.getByText('Other')).toBeInTheDocument();

  await user.type(screen.getByLabelText(/^what it is$/i), 'clayora.com');
  expect(screen.getByText('clayora.com')).toBeInTheDocument();
  // Renaming is editing that field — there is no second title to keep in step.
  expect(screen.getByRole('button', { name: /remove clayora\.com/i })).toBeInTheDocument();
});

it('keeps the note out of the way until it is asked for', async () => {
  const user = userEvent.setup();
  renderStep();

  await user.click(screen.getByRole('button', { name: /add access/i }));
  expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /add note/i }));
  expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
});

it('opens a saved note already showing', () => {
  renderStep({
    ...client,
    access: [
      {
        id: 'x1',
        kind: 'domain_registrar',
        label: 'clayora.com',
        location: '1Password',
        notes: 'Transfer lock until June.',
      },
    ],
  } as ClientRecord);

  expect(screen.getByLabelText(/notes/i)).toHaveValue('Transfer lock until June.');
});
