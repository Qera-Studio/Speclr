import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaxStep from '../TaxStep';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Tax & registration.
 *
 * The case that matters most is the GSTIN state cross-check. A GSTIN's first
 * two digits *are* the place of supply, so agreeing them with the address once,
 * here, is what makes deriving place of supply per document trustworthy — and
 * a place of supply typed from memory is what produced a wrong invoice.
 */

const saveClientSection = jest.fn();

jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...a: unknown[]) => saveClientSection(...a),
}));

const onSaved = jest.fn();

const indianClient = {
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

const foreignClient = {
  ...indianClient,
  id: 'c2',
  addressParts: { ...indianClient.addressParts!, state: 'Dubai', country: 'AE' },
  entityType: 'free_zone',
} as ClientRecord;

beforeEach(() => {
  jest.clearAllMocks();
  saveClientSection.mockResolvedValue({ success: true, id: 'c1' });
});

describe('the India branch', () => {
  it('accepts a GSTIN whose state matches the address', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(saveClientSection).toHaveBeenCalledWith(
      'c1',
      'tax',
      expect.objectContaining({ gstin: '09AABCQ2864Q1ZQ' }),
    );
  });

  it('refuses a GSTIN registered in a different state from the address', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    // A valid Tamil Nadu GSTIN on a client whose address says Uttar Pradesh.
    await user.type(screen.getByLabelText('GSTIN'), '33AABCQ2864Q1ZZ');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(
      await screen.findByText(/registered in Tamil Nadu, but the address says Uttar Pradesh/i),
    ).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('catches a mistyped character the shape alone would accept', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AACBQ2864Q1ZQ');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/check character/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('refuses an individual’s PAN on a Private Limited', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^pan$/i), 'AABPQ2864Q');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/an individual, not a company/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('asks for the section, rate and TAN once TDS is switched on', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.click(screen.getByRole('switch', { name: /they deduct tds/i }));
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/which section do they deduct under/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('drops the empty fields rather than storing blank strings', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    const payload = saveClientSection.mock.calls[0][2];
    expect(payload).not.toHaveProperty('pan');
    expect(payload).not.toHaveProperty('cin');
    expect(payload).not.toHaveProperty('tan');
  });

  it('shows no foreign registration fields', () => {
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);
    expect(screen.queryByLabelText(/registration type/i)).not.toBeInTheDocument();
  });
});

describe('the foreign branch', () => {
  it('offers a typed registration instead of a GSTIN', () => {
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);

    expect(screen.queryByLabelText(/gstin/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/registration type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^number$/i)).toBeInTheDocument();
  });

  it('states plainly that nothing is computed from it', () => {
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);
    expect(screen.getByText(/zero-rated export of services under an LUT/i)).toBeInTheDocument();
  });

  it('rejects a TRN that fails its own format', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^number$/i), '12345');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/Expected TRN/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('accepts a valid TRN', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^number$/i), '100123456700003');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(saveClientSection).toHaveBeenCalledWith(
      'c2',
      'tax',
      expect.objectContaining({ taxIdType: 'AE_TRN', taxId: '100123456700003' }),
    );
  });
});

/**
 * Validation on the way through, rather than one page of red at submit.
 *
 * This step is where the app knows more than the operator: a GSTIN carries a
 * mod-36 check character and its state prefix is cross-checked against the
 * address. Holding that back until submit wastes it.
 */
describe('checking as you go', () => {
  it('reports a bad GSTIN when the field is left, without submitting', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    // A well-formed Tamil Nadu GSTIN, so the only thing wrong with it is the
    // state — the cross-check, caught before the button rather than at it.
    await user.type(screen.getByLabelText('GSTIN'), '33AABCQ2864Q1ZZ');
    await user.tab();

    expect(
      await screen.findByText(/registered in Tamil Nadu, but the address says Uttar Pradesh/i),
    ).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('ticks a GSTIN that passes, and only once the field is left', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />,
    );

    // Mid-typing there is no tick: one that appeared on the last keystroke
    // would have flickered through every wrong prefix on the way.
    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');
    expect(container.querySelector('.lucide-check')).toBeNull();

    await user.tab();
    await screen.findByLabelText('GSTIN');
    expect(container.querySelector('.lucide-check')).not.toBeNull();
  });

  it('does not tick a GSTIN that fails', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />,
    );

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZX');
    await user.tab();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(container.querySelector('.lucide-check')).toBeNull();
  });
});
