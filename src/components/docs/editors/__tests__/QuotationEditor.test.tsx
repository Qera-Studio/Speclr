import { render, screen, waitFor, within } from '@testing-library/react';
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
    addressParts: {
      line1: 'x',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      country: 'IN',
    },
    email: 'a@clayora.test',
    phone: '+919876543210',
    contacts: {
      primary: {
        name: 'Priya Shah',
        email: 'priya@clayora.test',
        phone: '+919876543211',
      },
    },
    createdAt: 0,
    updatedAt: 0,
  },
] as ClientRecord[];

const editor = () =>
  render(
    <QuotationEditor
      clients={clients}
      services={[]}
      studio={undefined as never}
      title="New quotation"
    />,
  );

/** The fieldset for service N, named by its legend. */
const service = (n: number) =>
  screen.getByRole('group', { name: `Service ${n}` });

beforeEach(() => {
  jest.clearAllMocks();
  createDraft.mockResolvedValue({ success: true, id: 'sq-1' });
});

describe('QuotationEditor (new)', () => {
  it('renders no client picker at all — this document has no recipient record', () => {
    editor();
    expect(
      screen.queryByRole('combobox', { name: /^client$/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/prepared for/i)).toBeInTheDocument();
  });

  it('opens on exactly one service, with one deliverable ready to fill', () => {
    editor();
    expect(service(1)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Service 2' })).toBeNull();
    // One deliverable already on the page, ready to fill.
    expect(within(service(1)).getByLabelText(/^description$/i)).toBeInTheDocument();
  });

  it('has no SAC input anywhere — a quotation classifies nothing', () => {
    editor();
    expect(screen.queryByLabelText(/sac/i)).not.toBeInTheDocument();
  });

  it('offers no field for the subject, the terms or the payment schedule', () => {
    editor();
    // All four are derived or fixed copy. An input for any of them would be a
    // second place for the document to disagree with itself.
    expect(screen.queryByLabelText(/terms & notes/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add milestone/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /subject/i })).toBeNull();
  });

  it('autosaves with no recipient id, as soon as a field is touched', async () => {
    const u = userEvent.setup();
    editor();
    await u.type(screen.getByLabelText(/^company$/i), 'The Colorist');
    await waitFor(() => expect(createDraft).toHaveBeenCalled(), {
      timeout: 3000,
    });
    expect(createDraft.mock.calls[0][0]).toBe('SQ');
    expect(createDraft.mock.calls[0][1]).toBe('');
  });

  it('shows the derived subject line updating as the company and services change', async () => {
    const u = userEvent.setup();
    editor();
    await u.type(within(service(1)).getByLabelText('Name'), 'Custom Website');
    await u.type(screen.getByLabelText(/^company$/i), 'The Colorist');
    await u.type(screen.getByLabelText(/^city$/i), 'Coimbatore');
    // Twice over, and that is the point: the rail shows the derived line and
    // the live preview prints it, both off the same `quotationSubject` call.
    await waitFor(() =>
      expect(
        screen.getAllByText(
          'Quote for Custom Website at The Colorist, Coimbatore',
        ),
      ).toHaveLength(2),
    );
  });

  it('copies the company, the city and the primary contact from a picked client', async () => {
    const u = userEvent.setup();
    editor();
    await u.click(screen.getByLabelText(/fill from an existing client/i));
    await u.click(await screen.findByText('Clayora Private Limited'));
    expect(screen.getByLabelText(/^company$/i)).toHaveValue(
      'Clayora Private Limited',
    );
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Noida');
    expect(screen.getByLabelText(/prepared for/i)).toHaveValue('Priya Shah');
  });

  it('keeps each service’s deliverables to itself when a second is added', async () => {
    const u = userEvent.setup();
    editor();
    await u.click(screen.getByRole('button', { name: /add service/i }));

    // Two independent nested field arrays. Typing into the second must not
    // reach the first — the register paths would collide if they were shared.
    await u.type(
      within(service(2)).getByLabelText(/^description$/i),
      'Content Creation',
    );
    expect(
      within(service(1)).queryByDisplayValue('Content Creation'),
    ).toBeNull();
  });

  it('totals a deliverable into the derived totals panel', async () => {
    const u = userEvent.setup();
    editor();
    await u.type(within(service(1)).getByLabelText('Name'), 'Custom Website');
    await u.type(within(service(1)).getByLabelText(/^description$/i), 'Web design');
    await u.type(screen.getByLabelText(/^rate/i), '20000');

    await waitFor(() => {
      const totals = screen.getByRole('region', { name: 'Totals' });
      // Whole rupees, the way a quotation prints them.
      expect(totals).toHaveTextContent('₹ 20,000');
    });
  });

  it('shows the two-phase schedule under ₹1 lakh and the three-phase one above it', async () => {
    const u = userEvent.setup();
    editor();
    const totals = () => screen.getByRole('region', { name: 'Totals' });

    await u.type(within(service(1)).getByLabelText(/^description$/i), 'Web design');
    await u.type(screen.getByLabelText(/^rate/i), '50000');
    await waitFor(() => expect(totals()).toHaveTextContent('Balance prior launch'));
    expect(totals()).not.toHaveTextContent('Design delivery');

    await u.clear(screen.getByLabelText(/^rate/i));
    await u.type(screen.getByLabelText(/^rate/i), '200000');
    await waitFor(() => expect(totals()).toHaveTextContent('Design delivery'));
  });

  it('collects a recurring row with a note instead of an amount', async () => {
    const u = userEvent.setup();
    editor();
    await u.click(screen.getByRole('button', { name: /add recurring row/i }));
    await u.type(screen.getByLabelText(/what it is/i), 'Razorpay fee');
    await u.type(screen.getByLabelText(/not money/i), '2% + GST');

    // A note is not summable, so the fixed portion stays at nothing.
    await waitFor(() => {
      const totals = screen.getByRole('region', { name: 'Totals' });
      expect(totals).toHaveTextContent('Recurring (fixed portion)');
      expect(totals).toHaveTextContent('₹ 0');
    });
  });

  it('sums a monthly recurring row into the fixed portion as a range', async () => {
    const u = userEvent.setup();
    editor();
    await u.click(screen.getByRole('button', { name: /add recurring row/i }));
    await u.type(screen.getByLabelText(/what it is/i), 'WhatsApp BSP');
    await u.type(screen.getByLabelText(/^amount/i), '1500');
    await u.type(screen.getByLabelText(/up to/i), '5000');

    await waitFor(() => {
      const totals = screen.getByRole('region', { name: 'Totals' });
      expect(totals).toHaveTextContent('₹ 1,500 - ₹ 5,000');
    });
  });
});
