import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientForm from '../ClientForm';

const createClient = jest.fn();
const updateClient = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  createClient: (...a: unknown[]) => createClient(...a),
  updateClient: (...a: unknown[]) => updateClient(...a),
}));

/** Fills the minimum a client needs. Phone must be a real Indian mobile now. */
async function fillClient(
  user: ReturnType<typeof userEvent.setup>,
  { name = 'Acme Co.', email = 'a@b.com', phone = '9876543210' } = {},
) {
  await user.type(screen.getByLabelText(/^name$/i), name);
  await user.type(screen.getByLabelText(/^email$/i), email);
  await user.type(screen.getByLabelText(/^phone$/i), phone);
  await user.type(screen.getByLabelText(/building \/ flat/i), 'C-204');
  await user.type(screen.getByLabelText(/pincode/i), '201017');
  await user.type(screen.getByLabelText(/^city$/i), 'Ghaziabad');
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
});

describe('ClientForm', () => {
  it('renders the client fields', () => {
    render(<ClientForm onDone={() => {}} />);

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gstin/i)).toBeInTheDocument();
  });

  it('breaks the address into its parts', () => {
    render(<ClientForm onDone={() => {}} />);

    for (const label of [/building \/ flat/i, /street \/ area/i, /pincode/i, /^city$/i, /^state$/i]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    // /country/i alone is ambiguous — the phone field has one too.
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('composes the printable address from the parts on submit', async () => {
    createClient.mockResolvedValue({ success: true, id: 'c1' });
    const onDone = jest.fn();
    const user = userEvent.setup();
    render(<ClientForm onDone={onDone} />);

    await fillClient(user);
    await user.click(screen.getByRole('button', { name: /add client/i }));

    // The flat address is what documents print; nobody types it directly.
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Co.',
        email: 'a@b.com',
        phone: '+919876543210',
        address: 'C-204,\nGhaziabad - 201017\nIndia',
        addressParts: expect.objectContaining({ city: 'Ghaziabad', pincode: '201017' }),
      }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('stores the phone in international form', async () => {
    createClient.mockResolvedValue({ success: true, id: 'c1' });
    const user = userEvent.setup();
    render(<ClientForm onDone={jest.fn()} />);

    await fillClient(user, { phone: '9876543210' });
    await user.click(screen.getByRole('button', { name: /add client/i }));

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+919876543210' }),
    );
  });

  it('refuses a phone number that is not a valid Indian mobile', async () => {
    const user = userEvent.setup();
    render(<ClientForm onDone={jest.fn()} />);

    await fillClient(user, { phone: '12345' });
    await user.click(screen.getByRole('button', { name: /add client/i }));

    expect(await screen.findByText(/10-digit mobile/i)).toBeInTheDocument();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('loads an existing client for editing', () => {
    render(
      <ClientForm
        onDone={() => {}}
        client={{
          id: 'c1',
          name: 'Existing Co',
          address: 'Hand typed address',
          email: 'e@x.com',
          phone: '+919876543210',
          createdAt: 0,
          updatedAt: 0,
        }}
      />,
    );

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Existing Co');
    // A client saved before structured addresses simply starts with blank
    // parts — it must still load and be editable.
    expect(screen.getByLabelText(/building \/ flat/i)).toHaveValue('');
    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('9876543210');
  });

  it('shows a server error when the action fails', async () => {
    createClient.mockResolvedValue({ success: false, error: 'Failed to save client.' });
    const user = userEvent.setup();
    render(<ClientForm onDone={() => {}} />);

    await fillClient(user);
    await user.click(screen.getByRole('button', { name: /add client/i }));

    expect(await screen.findByText('Failed to save client.')).toBeInTheDocument();
  });
});
