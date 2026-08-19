import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdentityStep from '../IdentityStep';
import { StepActionsSlot } from '../stepKit';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * The step that creates the record.
 *
 * Every case here was inherited from `ClientForm.test.tsx`, deleted when the
 * rail form was replaced: address composition, E.164 phone, the legacy client
 * with no company name, and the server error. They still describe real
 * behaviour, so they moved rather than went.
 *
 * New to this step: entity type, which is required here and optional on the
 * record.
 */

const createClient = jest.fn();
const updateClient = jest.fn();
const saveClientSection = jest.fn();

jest.mock('@/server/actions/clients', () => ({
  createClient: (...a: unknown[]) => createClient(...a),
  updateClient: (...a: unknown[]) => updateClient(...a),
  saveClientSection: (...a: unknown[]) => saveClientSection(...a),
}));

const onSaved = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // A step that is not saved leaves its draft behind, and the next test's form
  // restores it and types on top of the values. Real behaviour (see
  // `lib/draft.ts`), so the fix belongs here rather than in the component.
  sessionStorage.clear();
  createClient.mockResolvedValue({ success: true, id: 'new-id' });
  updateClient.mockResolvedValue({ success: true, id: 'c1' });
  saveClientSection.mockResolvedValue({ success: true });
  // `AddressFields` looks a pincode up on type; without this it throws.
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
});

/**
 * Exact label strings where a regex would be ambiguous: the phone field
 * contributes both "Phone" and "Phone country", and `AddressFields` a "Country"
 * of its own.
 */
async function fillIdentity(
  user: ReturnType<typeof userEvent.setup>,
  { entityType = true } = {},
) {
  await user.type(screen.getByLabelText(/^name$/i), 'Clayora');
  await user.type(screen.getByLabelText(/legal entity name/i), 'Clayora Private Limited');
  await user.type(screen.getByLabelText(/^email$/i), 'accounts@clayora.test');
  await user.type(screen.getByLabelText('Phone'), '9876543210');
  await user.type(screen.getByLabelText(/building/i), 'C-204');
  await user.type(screen.getByLabelText('Pincode'), '201017');
  await user.type(screen.getByLabelText('City'), 'Ghaziabad');
  await user.type(screen.getByLabelText('State'), 'Uttar Pradesh');
  if (entityType) {
    await pickEntityType(user, /^private limited company$/i);
  }
}

/** The entity type is a combobox: open it, then choose the row. */
async function pickEntityType(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByLabelText('Entity type'));
  await user.click(await screen.findByRole('option', { name }));
}

describe('IdentityStep', () => {
  it('composes the printable address from the parts and stores E.164', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Clayora Private Limited',
        phone: '+919876543210',
        entityType: 'pvt_ltd',
        address: expect.stringContaining('Ghaziabad'),
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('refuses a phone that is not a valid Indian mobile', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user);
    await user.clear(screen.getByLabelText('Phone'));
    await user.type(screen.getByLabelText('Phone'), '1234567890');
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(await screen.findByText(/10-digit mobile/i)).toBeInTheDocument();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('will not create a client without an entity type', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user, { entityType: false });
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(await screen.findByText(/choose the entity type/i)).toBeInTheDocument();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('offers overseas legal forms when the address is outside India', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    // Named on a form only India has: 'private limited' is not decisive, since
    // Singapore's is spelled out too now that the acronyms are gone.
    await user.click(screen.getByLabelText('Entity type'));
    expect(
      await screen.findByRole('option', { name: /hindu undivided family/i }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');

    // `/country/i` alone is ambiguous — the phone field has one too.
    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /united arab emirates/i }));

    await user.click(screen.getByLabelText('Entity type'));
    expect(await screen.findByRole('option', { name: /free zone entity/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /hindu undivided family/i }),
    ).not.toBeInTheDocument();
  });

  it('refuses an Indian legal form once the address has moved abroad', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user);
    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /united arab emirates/i }));
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    // The field looks empty — the chosen form is not in the list any more — but
    // the value is still on the form, and saving it would file a UAE client as
    // a company under the Companies Act.
    expect(await screen.findByText(/choose the entity type/i)).toBeInTheDocument();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('loads a client written before entity types and company names existed', () => {
    const legacy = {
      id: 'c1',
      name: 'Old Client',
      address: '5 Old Road\nDelhi',
      email: 'old@example.test',
      phone: '9876543210',
      createdAt: 0,
      updatedAt: 0,
    } as ClientRecord;

    render(<IdentityStep client={legacy} onSaved={onSaved} submitLabel="Tax" />);

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Old Client');
    // Blank and required, so saving forces it to be filled in.
    expect(screen.getByLabelText(/legal entity name/i)).toHaveValue('');
    expect(screen.getByLabelText('Entity type')).toHaveValue('');
  });

  /**
   * Country decides what the three fields after it mean: "Pincode" is India's
   * word for a postal code and the lookup behind it is India Post, so both are
   * a branch off the country rather than a default it gets appended to.
   */
  it('asks for the country before the pincode', () => {
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    const country = screen.getByLabelText('Country');
    const pincode = screen.getByLabelText('Pincode');
    expect(country.compareDocumentPosition(pincode)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  /**
   * The submit button is portalled into the wizard's pinned footer, so it does
   * not slide with the step. Outside the `<form>`, only its `form` attribute
   * connects the two — drop that and every step silently stops submitting.
   */
  it('still submits when the button is rendered outside the form', async () => {
    const slot = document.createElement('div');
    document.body.append(slot);
    const user = userEvent.setup();

    render(
      <StepActionsSlot.Provider value={slot}>
        <IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />
      </StepActionsSlot.Provider>,
    );

    const submit = screen.getByRole('button', { name: /^tax$/i });
    expect(submit.closest('form')).toBeNull();

    await fillIdentity(user);
    await user.click(submit);

    expect(createClient).toHaveBeenCalled();
  });

  it('surfaces a server failure instead of pretending it saved', async () => {
    createClient.mockResolvedValue({ success: false, error: 'Failed to save client.' });
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(await screen.findByText('Failed to save client.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

/**
 * The billing address: where invoices are addressed when that is not the
 * registered office.
 *
 * Absent is the ordinary case and means the registered address, so the whole
 * block is off until someone says otherwise. The rule that matters most is not
 * tested here because it is a rule about what this value must *never* reach:
 * GST place of supply follows the client's registration, and `placeOfSupplyOf`
 * reads `gstin` and `addressParts`, never this.
 */
describe('a separate billing address', () => {
  const toggle = () => screen.getByRole('checkbox', { name: /different from the registered address/i });

  it('is off, and stores nothing, until it is asked for', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    expect(toggle()).not.toBeChecked();
    expect(screen.queryByLabelText('Pincode', { selector: '#client-billing-pincode' })).toBeNull();

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    const [values] = createClient.mock.calls[0];
    expect(values.billingAddressParts).toBeUndefined();
  });

  it('starts from the registered country and saves what is typed', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user);
    await user.click(toggle());

    await user.type(
      screen.getByLabelText('Building / flat', { selector: '#client-billing-line1' }),
      'Level 8, Nariman Point',
    );
    await user.type(
      screen.getByLabelText('Pincode', { selector: '#client-billing-pincode' }),
      '400021',
    );
    await user.type(screen.getByLabelText('City', { selector: '#client-billing-city' }), 'Mumbai');
    await user.type(
      screen.getByLabelText('State', { selector: '#client-billing-state' }),
      'Maharashtra',
    );
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    const [values] = createClient.mock.calls[0];
    expect(values.billingAddressParts).toEqual(
      expect.objectContaining({
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400021',
        // Carried over when the block was opened, rather than left blank for
        // someone to pick again.
        country: 'IN',
      }),
    );
    // The registered address is untouched, and it is still the one the tax
    // treatment follows.
    expect(values.addressParts).toEqual(expect.objectContaining({ state: 'Uttar Pradesh' }));
  });

  it('refuses half of one rather than printing an address that goes nowhere', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user);
    await user.click(toggle());
    await user.type(
      screen.getByLabelText('Building / flat', { selector: '#client-billing-line1' }),
      'Level 8, Nariman Point',
    );
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(createClient).not.toHaveBeenCalled();
    expect(screen.getAllByText(/needed for a separate billing address/i).length).toBeGreaterThan(0);
  });

  it('removes the address again when it is turned off', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" />);

    await fillIdentity(user);
    await user.click(toggle());
    await user.type(
      screen.getByLabelText('City', { selector: '#client-billing-city' }),
      'Mumbai',
    );
    await user.click(toggle());
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    // Absent, not blanked: absent is what "same as the registered address"
    // means on the record.
    const [values] = createClient.mock.calls[0];
    expect(values.billingAddressParts).toBeUndefined();
  });
});

/**
 * The individual flow. Six steps rather than seven, because a person is their
 * own contact — so this step carries the two things the Contacts step would
 * have asked that the identity fields do not already answer.
 */
describe('IdentityStep, for an individual', () => {
  /** Everything except the second name column, which an individual may not have. */
  async function fillPerson(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^full name$/i), 'Rahul Menon');
    await user.type(screen.getByLabelText(/^email$/i), 'rahul@example.test');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText(/building/i), 'C-204');
    await user.type(screen.getByLabelText('Pincode'), '201017');
    await user.type(screen.getByLabelText('City'), 'Ghaziabad');
    await user.type(screen.getByLabelText('State'), 'Uttar Pradesh');
  }

  it('offers only the forms that are one person, and no legal entity name', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" kind="individual" />);

    expect(screen.queryByLabelText(/legal entity name/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Entity type'));
    expect(await screen.findByRole('option', { name: /^individual$/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /private limited/i })).not.toBeInTheDocument();
  });

  // `companyName` is required and is what every sheet prints. The field is not
  // rendered for a person, so a form that could not derive it could never save.
  it('prints their own name, deriving the required legal name from it', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" kind="individual" />);

    await fillPerson(user);
    await pickEntityType(user, /^individual$/i);
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rahul Menon', companyName: 'Rahul Menon' }),
    );
  });

  it('takes a trading name from a proprietorship and prints that instead', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" kind="individual" />);

    await fillPerson(user);
    await pickEntityType(user, /^sole proprietorship$/i);
    await user.type(screen.getByLabelText(/business \/ trading name/i), 'Studio Kalpa');
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rahul Menon', companyName: 'Studio Kalpa' }),
    );
  });

  /**
   * The designation and the billing role are stored; the name, email and phone
   * are not. A copy of those would go stale the first time this step was
   * edited, and `clientContact` derives them on read instead.
   */
  it('saves the designation and points both roles at the person', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" kind="individual" />);

    await fillPerson(user);
    await pickEntityType(user, /^individual$/i);
    await user.type(screen.getByLabelText(/^designation$/i), 'Consultant');
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    expect(saveClientSection).toHaveBeenCalledWith('new-id', 'contacts', {
      primary: { designation: 'Consultant' },
      roles: { signing: 'primary', billing: 'primary' },
    });
  });

  it('records a separate billing contact when there is one', async () => {
    const user = userEvent.setup();
    render(<IdentityStep client={null} onSaved={onSaved} submitLabel="Tax" kind="individual" />);

    await fillPerson(user);
    await pickEntityType(user, /^individual$/i);
    await user.click(
      screen.getByRole('checkbox', { name: /someone else handles invoices/i }),
    );
    await user.type(
      screen.getByLabelText('Name', { selector: '#client-billing-contact-name' }),
      'Asha Rao',
    );
    await user.click(screen.getByRole('button', { name: /^tax$/i }));

    const [, , contacts] = saveClientSection.mock.calls[0];
    expect(contacts.billing).toEqual({ name: 'Asha Rao' });
    // Billing names its own person, so it is absent from `roles` — that is how
    // the record says "this role does not point anywhere".
    expect(contacts.roles).toEqual({ signing: 'primary' });
  });
});
