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
 * (`PRINCIPLES.md` rule 3), and the contract's signatory has to follow, or the
 * signature block prints the blank rule this record exists to fix.
 *
 * The escalation contact and the standalone invoice-delivery inbox that used to
 * sit in this step are gone: nothing read either, and speclr sends no mail.
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

/** Both selects share a label, so the id is what tells them apart. */
async function choose(
  user: ReturnType<typeof userEvent.setup>,
  role: 'billing' | 'signing',
  option: RegExp,
) {
  await user.click(screen.getByLabelText('Address it to', { selector: `#${role}-source` }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('who a role points at', () => {
  it('starts on the company for billing and the primary contact for signing', async () => {
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    // An invoice is addressed to the entity, so naming nobody is the ordinary
    // case; a contract is signed by a person, so signing points at one.
    expect(screen.getByLabelText('Address it to', { selector: '#billing-source' })).toHaveTextContent(
      // The legal entity name, not a generic "the company": it is the name the
      // invoice would carry, so the choice states a fact about this client.
      /Clayora Private Limited/i,
    );
    expect(screen.getByLabelText('Address it to', { selector: '#signing-source' })).toHaveTextContent(
      /same as primary/i,
    );
    // Neither names its own person, so neither shows fields.
    expect(screen.queryByLabelText('Name', { selector: '#billing-name' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Name', { selector: '#signing-name' })).not.toBeInTheDocument();
  });

  it('stores the choice rather than a second copy of the details', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    await fillPrimary(user);
    await choose(user, 'billing', /same as primary/i);
    await user.click(screen.getByRole('button', { name: /commercial/i }));

    const [, , payload] = saveClientSection.mock.calls[0];
    expect(payload.roles).toEqual({ billing: 'primary', signing: 'primary' });
    // The whole point: no duplicated details under a role that points elsewhere.
    expect(payload.billing).toBeUndefined();
    expect(payload.signing).toBeUndefined();
    expect(payload.primary).toEqual(
      expect.objectContaining({ name: 'Anaya Rao', email: 'anaya@clayora.test' }),
    );
  });

  it('opens the fields for "someone else" and stores what they hold', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    await fillPrimary(user);
    await choose(user, 'billing', /someone else/i);
    await user.type(screen.getByLabelText('Name', { selector: '#billing-name' }), 'Rahul Menon');
    await user.click(screen.getByRole('button', { name: /commercial/i }));

    const [, , payload] = saveClientSection.mock.calls[0];
    // Absent from `roles` is how the record says "this role names its own
    // person", so only signing is left in the map.
    expect(payload.roles).toEqual({ signing: 'primary' });
    expect(payload.billing).toEqual({ name: 'Rahul Menon' });
  });

  it('collapses a pointing role to a live line naming who it points at', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    await choose(user, 'signing', /someone else/i);
    expect(screen.getByLabelText('Name', { selector: '#signing-name' })).toBeInTheDocument();

    await fillPrimary(user);
    await choose(user, 'signing', /same as primary/i);

    expect(screen.queryByLabelText('Name', { selector: '#signing-name' })).not.toBeInTheDocument();
    // Live, not a leap of faith: the line names whoever the primary contact is
    // as it is typed, so the choice is never a guess about whose name ends up
    // in the signature block.
    expect(screen.getByText(/Anaya Rao · Director · anaya@clayora\.test/)).toBeInTheDocument();
  });

  it('says what the invoice will say, for each billing choice', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    // Addressed to the company: the select already names it, so nothing else
    // is said.
    expect(screen.queryByText(/marked for the attention/i)).not.toBeInTheDocument();

    await fillPrimary(user);
    await choose(user, 'billing', /same as primary/i);

    // Naming a person does not change who is billed, only that the invoice is
    // marked for their attention. Printing that line is still to come.
    expect(screen.getByText(/marked for the attention of anaya rao/i)).toBeInTheDocument();
  });

  it('takes a contact phone with its country code', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    // A client's staff are not all in India, so the country is picked rather
    // than remembered, and what is stored is E.164 rather than bare digits.
    await user.type(screen.getByLabelText('Phone', { selector: '#primary-phone' }), '9876543210');
    await user.click(screen.getByRole('button', { name: /commercial/i }));

    const [, , payload] = saveClientSection.mock.calls[0];
    expect(payload.primary.phone).toBe('+919876543210');
  });

  it('leaves a saved section alone rather than reapplying the defaults', async () => {
    const saved = {
      ...client,
      contacts: { primary: { name: 'Anaya Rao' }, billing: { name: 'Rahul Menon' } },
    } as ClientRecord;
    render(<ContactsStep client={saved} onSaved={onSaved} submitLabel="Commercial" />);

    // No `roles` on a saved section means both roles name their own person.
    expect(screen.getByLabelText('Name', { selector: '#billing-name' })).toHaveValue('Rahul Menon');
    expect(screen.getByLabelText('Name', { selector: '#signing-name' })).toBeInTheDocument();
  });

  it('does not let a half-typed field under a collapsed section block the save', async () => {
    const user = userEvent.setup();
    render(<ContactsStep client={client} onSaved={onSaved} submitLabel="Commercial" />);

    await fillPrimary(user);
    await choose(user, 'billing', /someone else/i);
    await user.type(screen.getByLabelText('Email', { selector: '#billing-email' }), 'not-an-email');
    await choose(user, 'billing', /Clayora Private Limited/i);

    await user.click(screen.getByRole('button', { name: /commercial/i }));
    expect(saveClientSection).toHaveBeenCalled();
  });
});

describe('resolveContact', () => {
  it('returns the primary contact for a role that points at it', () => {
    const contacts = {
      primary: { name: 'Anaya Rao', designation: 'Director' },
      roles: { signing: 'primary' as const },
    };
    expect(resolveContact(contacts, 'signing')).toEqual(contacts.primary);
    // No choice recorded and nothing stored: still nothing.
    expect(resolveContact(contacts, 'billing')).toBeUndefined();
  });

  it('returns nobody for a billing role that is the company', () => {
    const contacts = {
      primary: { name: 'Anaya Rao' },
      roles: { billing: 'company' as const },
    };
    // Not a missing answer: the invoice is addressed to the entity, and there
    // is no person to mark it for the attention of.
    expect(resolveContact(contacts, 'billing')).toBeUndefined();
  });

  it('leaves a role with its own details alone', () => {
    const contacts = {
      primary: { name: 'Anaya Rao' },
      billing: { name: 'Rahul Menon' },
      roles: { signing: 'primary' as const },
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
        roles: { signing: 'primary' },
      },
    });

    expect(snapshot.signatory).toEqual({ name: 'Anaya Rao', designation: 'Director' });
  });

  it('still says nothing about a client who recorded no contacts at all', () => {
    expect(clientSnapshotOf(client).signatory).toBeUndefined();
  });
});
