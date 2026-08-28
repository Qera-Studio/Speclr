import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuotationEditor from '../QuotationEditor';
import type { ClientRecord } from '@/lib/domain/types';

const push = jest.fn();
const createDraft = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }),
}));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: jest.fn(),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

const clients = [
  {
    id: 'c1',
    name: 'Clayora',
    companyName: 'Clayora Private Limited',
    address: 'x',
    addressParts: { line1: 'x', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', country: 'IN' },
    email: 'a@clayora.test',
    phone: '+919876543210',
    contacts: { primary: { name: 'Priya Shah', email: 'priya@clayora.test', phone: '+919876543211' } },
    createdAt: 0,
    updatedAt: 0,
  },
] as ClientRecord[];

beforeEach(() => {
  jest.clearAllMocks();
  createDraft.mockResolvedValue({ success: true, id: 'qtn-1' });
});

/** No party is required, so this must fire from the very first edit. */
async function autosavedWith(payload: object) {
  await waitFor(() => expect(createDraft).toHaveBeenCalledWith('QTN', '', payload), {
    timeout: 3000,
  });
}

describe('QuotationEditor (new)', () => {
  it('renders with no client picker at all — this document has no recipient record', () => {
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    expect(screen.queryByRole('combobox', { name: /^client$/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/prepared for/i)).toBeInTheDocument();
  });

  it('starts with no pre-seeded line item — only an "Add item" control', () => {
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    expect(screen.queryByText('Untitled item')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('has no SAC input anywhere in the form', () => {
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    expect(screen.queryByLabelText(/sac/i)).not.toBeInTheDocument();
  });

  it('defaults to India, showing an estimated GST line in the totals panel', () => {
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    const totals = screen.getByRole('region', { name: 'Totals' });
    expect(totals).toHaveTextContent(/est\. gst \(18%\)/i);
  });

  it('hides the GST line once International is chosen', async () => {
    const u = userEvent.setup();
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    await u.click(screen.getByRole('radio', { name: /international/i }));
    const totals = screen.getByRole('region', { name: 'Totals' });
    expect(totals).not.toHaveTextContent(/est\. gst/i);
  });

  it('autosaves with no recipient id, as soon as a field is touched', async () => {
    const u = userEvent.setup();
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    await u.type(screen.getByLabelText(/prepared for/i), 'Clayora');
    await waitFor(() => expect(createDraft).toHaveBeenCalled(), { timeout: 3000 });
    expect(createDraft.mock.calls[0][0]).toBe('QTN');
    expect(createDraft.mock.calls[0][1]).toBe('');
  });

  it('copies a client’s name and primary contact in when picked from the fill-from-client combobox, without adding a client field', async () => {
    const u = userEvent.setup();
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    await u.click(screen.getByLabelText(/fill from an existing client/i));
    await u.click(await screen.findByText('Clayora Private Limited'));
    expect(screen.getByLabelText(/prepared for/i)).toHaveValue('Clayora Private Limited');
    expect(screen.getByLabelText('Kind Attention')).toHaveValue('Priya Shah');
  });

  it('recomputes the total as line items change', async () => {
    const u = userEvent.setup();
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    await u.click(screen.getByRole('button', { name: /add item/i }));
    await u.type(screen.getByLabelText(/^description$/i), 'Web design');
    await u.clear(screen.getByLabelText(/^rate/i));
    await u.type(screen.getByLabelText(/^rate/i), '10000');

    await waitFor(() => {
      const totals = screen.getByRole('region', { name: 'Totals' });
      expect(totals).toHaveTextContent('10,000.00');
    });
  });

  it('opens the payment schedule & terms drawer and shows its fields', async () => {
    const u = userEvent.setup();
    render(<QuotationEditor clients={clients} services={[]} studio={undefined as never} title="New quotation" />);
    await u.click(screen.getByRole('button', { name: /payment schedule & terms/i }));
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/terms & notes/i)).toBeInTheDocument();
  });
});
