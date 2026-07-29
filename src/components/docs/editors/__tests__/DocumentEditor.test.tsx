import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentEditor from '../DocumentEditor';
import type { ClientRecord } from '@/lib/domain/types';

const push = jest.fn();
const createDraft = jest.fn();
const updateDraft = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }) }));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: (...a: unknown[]) => updateDraft(...a),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

const clients = [
  { id: 'c1', name: 'Acme Co.', address: 'Road', email: 'a@b.com', phone: '9', gstin: '', createdAt: 0, updatedAt: 0 },
] as ClientRecord[];

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('DocumentEditor (new invoice)', () => {
  it('renders the client select, a line item, and GST fields', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gst rate/i)).toBeInTheDocument();
  });

  it('creates a draft with rupees converted to paise on save', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-doc' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await u.selectOptions(screen.getByLabelText(/client/i), 'c1');
    await u.type(screen.getByLabelText(/description/i), 'Design');
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
});
