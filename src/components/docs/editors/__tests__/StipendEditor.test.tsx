import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StipendEditor from '../StipendEditor';
import type { EmployeeRecord } from '@/lib/domain/employee';

const push = jest.fn();
const createDraft = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }) }));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: jest.fn(),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

const employees = [
  {
    id: 'e1', name: 'Riya', address: 'x', email: 'r@b.com', phone: '9', role: 'Designer',
    engagementType: 'intern', pronoun: 'she', joiningDate: '2026-01-01', payAmountPaise: 2000000,
    bank: { bankName: 'Kotak', accountNo: '1', ifsc: 'KKBK' }, createdAt: 0, updatedAt: 0,
  },
] as EmployeeRecord[];

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('StipendEditor (new)', () => {
  it('renders the employee picker and amount field', () => {
    render(<StipendEditor employees={employees} title="New stipend slip" />);
    expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stipend amount/i)).toBeInTheDocument();
  });

  it('creates a draft with the amount in paise on save', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<StipendEditor employees={employees} title="New stipend slip" />);

    await u.selectOptions(screen.getByLabelText(/employee/i), 'e1');
    // selecting an employee pre-fills amount from payAmountPaise (2000000 → "20000")
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({
        lineItems: expect.arrayContaining([expect.objectContaining({ ratePaise: 2000000 })]),
      }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-stp');
  });
});
