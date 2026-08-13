import { render, screen, waitFor } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
import userEvent from '@testing-library/user-event';
import LetterEditor from '../LetterEditor';
import type { EmployeeRecord } from '@/lib/domain/employee';

const push = jest.fn();
const createDraft = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin', useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }) }));
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

/**
 * There is no Save button — the letter writes itself a second after the typing
 * stops (`AUTOSAVE_MS`). Waiting on the assertion rather than on "a call
 * happened": autosave may bank an intermediate version first, and what these
 * tests are about is what finally lands.
 */
async function autosavedWith(payload: object, type = 'OFR', recipient = 'e1') {
  await waitFor(() => expect(createDraft).toHaveBeenCalledWith(type, recipient, payload), {
    timeout: 3000,
  });
}

describe('LetterEditor (offer letter)', () => {
  it('renders the employee picker', () => {
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);
    expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
  });

  it('seeds the body on employee select and creates a draft, with no save button', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-ofr' });
    const replaceState = jest.spyOn(window.history, 'replaceState');
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();

    await selectComboboxOption(u, /employee/i, /Riya/);
    // Seeding fills the single body pane, paragraphs separated by blank lines.
    const body = screen.getByLabelText(/letter body/i) as HTMLTextAreaElement;
    expect(body.value).toContain('\n\n');

    await autosavedWith(expect.objectContaining({ bodyParagraphs: expect.any(Array) }));
    // Swapped in place — a navigation would remount and lose the letter.
    expect(replaceState).toHaveBeenCalledWith(null, '', '/admin/docs/new-ofr');
    expect(push).not.toHaveBeenCalled();
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

    await autosavedWith(expect.objectContaining({ employeeId: 'e1' }));
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

    await autosavedWith(
      expect.objectContaining({ bodyParagraphs: ['First para.', 'Second para.'] }),
    );
  });
});

/**
 * The subject was the first body paragraph, which meant editing it meant
 * editing prose around it and the sheet had to sniff for `Subject:` to set it
 * apart. It is its own stored field now.
 */
describe('LetterEditor subject', () => {
  it('lifts the subject out of the seeded body into its own field', async () => {
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    await selectComboboxOption(u, /employee/i, /Riya/);

    expect(screen.getByLabelText(/^subject$/i)).toHaveValue(
      'Subject: Offer of Internship — Designer',
    );
    const body = screen.getByLabelText(/letter body/i) as HTMLTextAreaElement;
    expect(body.value).not.toContain('Subject:');
  });

  it('saves an edited subject as a content override', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-ofr' });
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    const subject = screen.getByLabelText(/^subject$/i);
    await u.clear(subject);
    await u.type(subject, 'Subject: Internship');

    await autosavedWith(
      expect.objectContaining({
        content: expect.objectContaining({ subject: 'Subject: Internship' }),
      }),
    );
  });
});

describe('LetterEditor rail sections', () => {
  /**
   * The rail is 352px wide and now has an input for every printed word. The
   * sections you touch on every letter are open; the rest stay shut.
   */
  it('opens the letter itself and leaves the boilerplate collapsed', () => {
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    expect(screen.getByLabelText(/letter body/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^masthead$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^signatory$/i)).not.toBeInTheDocument();
  });

  it('reveals the signatory fields when the section is opened', async () => {
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    await u.click(screen.getByRole('button', { name: /signature/i }));

    // Seeded with what the sheet prints, not left blank.
    expect(screen.getByLabelText(/^signatory$/i)).toHaveValue('Shivanshu Pareek');
    expect(screen.getByLabelText(/^qualifier$/i)).toHaveValue('(Authorised Signatory)');
  });

  it('stores an edited signatory as a content override', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-ofr' });
    const u = userEvent.setup();
    render(<LetterEditor type="OFR" employees={employees} title="New offer letter" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /signature/i }));
    const designation = screen.getByLabelText(/^designation$/i);
    await u.clear(designation);
    await u.type(designation, 'Director');

    await autosavedWith(
      expect.objectContaining({
        content: expect.objectContaining({ signatoryTitle: 'Director' }),
      }),
    );
  });
});
