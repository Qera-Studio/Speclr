import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractEditor from '../ContractEditor';
import type { ClientRecord } from '@/lib/domain/types';
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';

const push = jest.fn();
const createDraft = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }) }));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: jest.fn(),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

const clients = [
  { id: 'c1', name: 'Acme Co.', address: 'x', email: 'a@b.com', phone: '9', gstin: '', createdAt: 0, updatedAt: 0 },
] as ClientRecord[];

const services = [
  {
    id: 's1', name: 'Branding', overview: 'ov', scopeItems: ['Logo'], exclusionItems: [], priceNote: '',
    milestones: [], revisionsNote: '', disclaimerNote: '', supportNote: '', createdAt: 0, updatedAt: 0,
  },
] as ServiceTemplate[];

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('ContractEditor (new)', () => {
  it('renders the client picker and service-schedule control', () => {
    render(<ContractEditor clients={clients} services={services} />);
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/add schedule from service/i)).toBeInTheDocument();
  });

  it('adds a schedule and creates a draft with it', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-con' });
    const u = userEvent.setup();
    render(<ContractEditor clients={clients} services={services} />);

    await u.selectOptions(screen.getByLabelText(/client/i), 'c1');
    await u.selectOptions(screen.getByLabelText(/add schedule from service/i), 's1');
    await u.click(screen.getByRole('button', { name: /^add schedule$/i }));
    // schedule card now visible (its "Schedule title" field appears)
    expect(screen.getByLabelText(/schedule title/i)).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /save draft/i }));
    expect(createDraft).toHaveBeenCalledWith(
      'CON',
      'c1',
      expect.objectContaining({ schedules: expect.arrayContaining([expect.objectContaining({ title: expect.any(String) })]) }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-con');
  });
});
