import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LetterEditor from '../LetterEditor';
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

describe('LetterEditor (offer letter)', () => {
  it('renders the employee picker', () => {
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);
    expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
  });

  it('seeds the body on employee select and creates a draft', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-ofr' });
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    await u.selectOptions(screen.getByLabelText(/employee/i), 'e1');
    // seeding fills in editable paragraphs (add-paragraph control is present)
    expect(screen.getByRole('button', { name: /add paragraph/i })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /save draft/i }));
    expect(createDraft).toHaveBeenCalledWith(
      'OFR',
      'e1',
      expect.objectContaining({ bodyParagraphs: expect.any(Array) }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-ofr');
  });
});
