import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactsStep from '../ContactsStep';
import { clientSnapshotOf, type ClientRecord } from '@/lib/domain/types';
import { resolveContact } from '@/lib/domain/client';

/**
 * "Same as primary" — a mirror, not a copy.
 *
 * The point of these tests is the *shape of what gets stored*. At most clients
 * one person is the day-to-day contact, the one who signs, and the one accounts
 * payable chases; copying their details into three groups means correcting a
 * changed email in three places and finding the third next year printed on a
 * contract. So the flag is stored and the resolution happens on read
 * (`PRINCIPLES.md` rule 3) — and the contract's signatory has to follow, or the
 * signature block prints the blank rule this record exists to fix.
 */

const saveClientSection = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...args: unknown[]) => saveClientSection(...args),
}));

const onSaved = jest.fn();

const client = {
  id: 'c1',
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'C-204, Ghaziabad',
  addressParts: {
    line1: 'C-204',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201017',
    country: 'IN',
  },
  email: 'a@clayora.test',
  phone: '+919876543210',
  entityType: 'pvt_ltd',
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

beforeEach(() => {
  jest.clearAllMocks();
  saveClientSection.mockResolvedValue({ success: true });
});

async function fillPrimary(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name', { selector: '#primary-name' }), 'Anaya Rao');
  await user.type(
    screen.getByLabelText('Designation', { selector: '#primary-designation' }),
    'Director',
  );
  await user.type(
    screen.getByLabelText('Email', { selector: '#primary-email' }),
    'anaya@clayora.test',
  );
}

describe('same as primary', () => {
  it('stores the flag rather than a second copy of the details', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    await fillPrimary(user);
    // Three boxes share the label, one per role; the fieldset legend is what
    // tells them apart on screen. Index 0 is billing.
    await user.click(screen.getAllByRole('checkbox', { name: /same as primary/i })[0]);
    await user.click(screen.getByRole('button', { name: /commercial/i }));

    const [, , payload] = saveClientSection.mock.calls[0];
    expect(payload.sameAsPrimary).toEqual(['billing']);
    // The whole point: no duplicated details under the mirrored role.
    expect(payload.billing).toBeUndefined();
    expect(payload.primary).toEqual(
      expect.objectContaining({ name: 'Anaya Rao', email: 'anaya@clayora.test' }),
    );
  });

  it('shows the primary contact in the mirrored fields, read-only', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    await fillPrimary(user);
    await user.click(screen.getAllByRole('checkbox', { name: /same as primary/i })[1]);

    const signingName = screen.getByLabelText('Name', { selector: '#signing-name' });
    expect(signingName).toHaveValue('Anaya Rao');
    // Read-only rather than disabled: a disabled input is skipped by screen
    // readers, and who signs the contract is worth being able to read.
    expect(signingName).toHaveAttribute('readonly');
  });

  it('drops the flag again when unticked', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    await fillPrimary(user);
    const box = screen.getAllByRole('checkbox', { name: /same as primary/i })[0];
    await user.click(box);
    await user.click(box);
    await user.click(screen.getByRole('button', { name: /commercial/i }));

    const [, , payload] = saveClientSection.mock.calls[0];
    expect(payload.sameAsPrimary).toBeUndefined();
  });
});

describe('resolveContact', () => {
  it('returns the primary contact for a mirrored role', () => {
    const contacts = {
      primary: { name: 'Anaya Rao', designation: 'Director' },
      sameAsPrimary: ['signing' as const],
    };
    expect(resolveContact(contacts, 'signing')).toEqual(contacts.primary);
    // Not mirrored, nothing stored — still nothing.
    expect(resolveContact(contacts, 'billing')).toBeUndefined();
  });

  it('leaves a role with its own details alone', () => {
    const contacts = {
      primary: { name: 'Anaya Rao' },
      billing: { name: 'Rahul Menon' },
      sameAsPrimary: ['signing' as const],
    };
    expect(resolveContact(contacts, 'billing')).toEqual({ name: 'Rahul Menon' });
  });
});

describe('the snapshot', () => {
  /**
   * The regression that makes the mirror load-bearing rather than cosmetic:
   * `clientSnapshotOf` used to read `contacts.signing` directly, which is empty
   * for a mirrored client, and the contract would freeze a blank signatory.
   */
  it('freezes the primary contact as the signatory when signing is mirrored', () => {
    const snapshot = clientSnapshotOf({
      ...client,
      contacts: {
        primary: { name: 'Anaya Rao', designation: 'Director' },
        sameAsPrimary: ['signing'],
      },
    });

    expect(snapshot.signatory).toEqual({ name: 'Anaya Rao', designation: 'Director' });
  });

  it('still says nothing about a client who recorded no contacts at all', () => {
    expect(clientSnapshotOf(client).signatory).toBeUndefined();
  });
});
