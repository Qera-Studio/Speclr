import { render, screen } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
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

    await selectComboboxOption(u, /employee/i, /Riya/);
    // Seeding fills the single body pane, paragraphs separated by blank lines.
    const body = screen.getByLabelText(/letter body/i) as HTMLTextAreaElement;
    expect(body.value).toContain('\n\n');

    await u.click(screen.getByRole('button', { name: /save draft/i }));
    expect(createDraft).toHaveBeenCalledWith(
      'OFR',
      'e1',
      expect.objectContaining({ bodyParagraphs: expect.any(Array) }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-ofr');
  });

  /**
   * Regression: `letterDraftSchema` requires `employeeId`, but the editor used
   * to pass it only as the positional argument. Every save therefore failed
   * `safeParse` and surfaced a bare "Invalid input." — with no clue which field
   * was at fault.
   */
  it('includes employeeId in the payload, not just the positional argument', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-ofr' });
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'OFR',
      'e1',
      expect.objectContaining({ employeeId: 'e1' }),
    );
  });

  /** A blank line is the paragraph separator; runs of blank lines collapse. */
  it('splits the body pane into paragraphs on blank lines', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-ofr' });
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    const body = screen.getByLabelText(/letter body/i);
    await u.clear(body);
    await u.type(body, 'First para.{Enter}{Enter}Second para.');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'OFR',
      'e1',
      expect.objectContaining({ bodyParagraphs: ['First para.', 'Second para.'] }),
    );
  });
});
