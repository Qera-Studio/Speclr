import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentEditor from '../DocumentEditor';
import { selectComboboxOption } from '@/test-utils/combobox';
import type { ClientRecord, InvoiceOption } from '@/lib/domain/types';

const push = jest.fn();
const createDraft = jest.fn();
const updateDraft = jest.fn();
const listInvoicesForClient = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }) }));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: (...a: unknown[]) => updateDraft(...a),
  listInvoicesForClient: (...a: unknown[]) => listInvoicesForClient(...a),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

const clients = [
  { id: 'c1', name: 'Acme Co.', address: 'Road', email: 'a@b.com', phone: '9', gstin: '', createdAt: 0, updatedAt: 0 },
  { id: 'c2', name: 'Beta Ltd.', address: 'Lane', email: 'b@b.com', phone: '9', gstin: '', createdAt: 0, updatedAt: 0 },
] as ClientRecord[];

const invoice: InvoiceOption = {
  id: 'inv-1',
  number: 'QS-INV-2627-001',
  issueDate: '2026-06-10',
  totalPaise: 177000,
  lineItems: [{ description: 'Brand system', ratePaise: 150000, qty: 1 }],
  gstRatePercent: 18,
  placeOfSupplyStateCode: '09',
};

beforeEach(() => {
  jest.clearAllMocks();
  listInvoicesForClient.mockResolvedValue([]);
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('DocumentEditor (new invoice)', () => {
  it('renders the client picker, a line item, and GST fields', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gst rate/i)).toBeInTheDocument();
  });

  it('states the place-of-supply requirement without crowding the label', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    expect(screen.getByLabelText('Place of supply')).toBeInTheDocument();
    expect(screen.getByText('Required when GST applies.')).toBeInTheDocument();
  });

  it('creates a draft with rupees converted to paise on save', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-doc' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await u.type(screen.getByLabelText(/^description$/i), 'Design');
    await u.type(screen.getByLabelText(/rate \(₹\)/i), '1500');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'INV',
      'c1',
      expect.objectContaining({
        lineItems: expect.arrayContaining([expect.objectContaining({ ratePaise: 150000 })]),
      }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-doc');
  });

  it('filters a long client list by typing', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await u.click(screen.getByLabelText(/^client$/i));
    await u.type(screen.getByLabelText(/^client$/i), 'Beta');

    expect(await screen.findByRole('option', { name: 'Beta Ltd.' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Acme Co.' })).not.toBeInTheDocument();
  });

  it('has no invoice picker — that belongs to receipts', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);
    expect(screen.queryByLabelText(/against invoice/i)).not.toBeInTheDocument();
  });
});

describe('DocumentEditor (new receipt)', () => {
  it('waits for a client before offering invoices', () => {
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    expect(screen.getByLabelText('Against invoice')).toBeDisabled();
    expect(listInvoicesForClient).not.toHaveBeenCalled();
  });

  it('lists that client’s finalized invoices once one is chosen', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');

    expect(listInvoicesForClient).toHaveBeenCalledWith('c1');
    await u.click(await screen.findByLabelText('Against invoice'));
    expect(await screen.findByRole('option', { name: /QS-INV-2627-001/ })).toBeInTheDocument();
  });

  it('fills the receipt from the invoice it settles', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: 'rec-1' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await selectComboboxOption(u, 'Against invoice', /QS-INV-2627-001/);

    // Line items, GST and place of supply come across, and stay editable.
    expect(screen.getByLabelText(/^description$/i)).toHaveValue('Brand system');
    expect(screen.getByLabelText(/rate \(₹\)/i)).toHaveValue('1500.00');
    expect(screen.getByLabelText(/gst rate/i)).toHaveValue('18');
    expect(screen.getByLabelText('Invoice number')).toHaveValue('QS-INV-2627-001');
  });

  it('stores both the invoice id and the number it prints', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: 'rec-1' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await selectComboboxOption(u, 'Against invoice', /QS-INV-2627-001/);
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'REC',
      'c1',
      expect.objectContaining({
        payment: expect.objectContaining({
          againstInvoiceId: 'inv-1',
          againstInvoiceNumber: 'QS-INV-2627-001',
        }),
      }),
    );
  });

  it('drops the stored id when the number is edited by hand', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: 'rec-1' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await selectComboboxOption(u, 'Against invoice', /QS-INV-2627-001/);
    await u.type(screen.getByLabelText('Invoice number'), '-AMENDED');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    // A stored id that disagrees with the printed number is worse than no id:
    // once the number is retyped, the link can no longer be vouched for.
    const payload = createDraft.mock.calls[0][2] as { payment: Record<string, unknown> };
    expect(payload.payment.againstInvoiceNumber).toBe('QS-INV-2627-001-AMENDED');
    expect(payload.payment.againstInvoiceId).toBeUndefined();
  });
});
