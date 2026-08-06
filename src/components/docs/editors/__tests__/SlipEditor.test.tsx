import { render, screen } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
import userEvent from '@testing-library/user-event';
import SlipEditor from '../SlipEditor';
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

/**
 * Line items render collapsed to a summary; the fields only exist once a row is
 * expanded.
 */
async function expandLineItem(
  u: ReturnType<typeof userEvent.setup>,
  name: RegExp,
) {
  await u.click(screen.getByRole('button', { name }));
}

describe('SlipEditor (new)', () => {
  it('renders the employee picker and a collapsed line item', () => {
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);
    expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Untitled item/ })).toBeInTheDocument();
  });

  /**
   * The slip is almost always "this month's stipend, as agreed", so it arrives
   * filled in.
   */
  it('prefills the stipend line item from the employee record', async () => {
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await expandLineItem(u, /Internship Stipend/);

    expect(screen.getByLabelText(/^description$/i)).toHaveValue('Internship Stipend');
    expect(screen.getByLabelText(/^rate/i)).toHaveValue('20000.00');
  });

  /**
   * Neither slip prints a line's detail, so collecting one would gather text
   * that goes nowhere. The period and the deductions note used to be seeded
   * into it; both are stated by DETAILS and TERMS instead, which is where a
   * reader looks for them.
   */
  it('offers no detail field on a slip line', async () => {
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await expandLineItem(u, /Internship Stipend/);

    expect(screen.getByLabelText(/^description$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^detail$/i)).not.toBeInTheDocument();
  });

  /**
   * Changing the month moves the period with it.
   *
   * This used to also re-seed the line item, because the seeded line named the
   * period and would otherwise disagree with the DETAILS block. It no longer
   * names it — one statement of the period cannot contradict itself — so the
   * line is now left alone on every month change, edited or not.
   */
  it('moves the period dates with the month, leaving the line item alone', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    const month = screen.getByLabelText(/stipend month/i);
    await u.clear(month);
    await u.type(month, '2026-06');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({
        stipendPeriodStart: '2026-06-01',
        stipendPeriodEnd: '2026-06-30',
        lineItems: [expect.objectContaining({ description: 'Internship Stipend' })],
      }),
    );
  });

  /** A hand-edited line must survive a month change untouched. */
  it('leaves an edited line item alone when the month changes', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await expandLineItem(u, /Internship Stipend/);
    const description = screen.getByLabelText(/^description$/i);
    await u.clear(description);
    await u.type(description, 'Bonus payment');

    const month = screen.getByLabelText(/stipend month/i);
    await u.clear(month);
    await u.type(month, '2026-06');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({
        lineItems: expect.arrayContaining([
          expect.objectContaining({ description: 'Bonus payment' }),
        ]),
      }),
    );
  });

  /**
   * Currency has no control on the panel — it is taken from the employee's own
   * record. It still has to reach the payload, because the slip prints in it.
   */
  it('sends the currency even though the panel has no currency control', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    expect(screen.queryByLabelText(/currency/i)).not.toBeInTheDocument();

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({ currency: 'INR' }),
    );
  });

  /**
   * Same for the deductions note: no control, but the slip prints the line and
   * it is legally load-bearing, so the default must still be saved.
   */
  it('sends the default deductions note with no control for it', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({
        deductionsNote: 'No statutory deductions (PF, ESI, TDS) are applicable.',
      }),
    );
  });

  it('creates a draft with the amount in paise on save', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    // Selecting an employee seeds line item 1 from payAmountPaise (2000000 → "20000").
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

  /**
   * Regression: `stipendDraftSchema` requires `employeeId`, but the editor used
   * to pass it only as the positional argument, so every save failed
   * `safeParse` and surfaced a bare "Invalid input."
   */
  it('includes employeeId in the payload, not just the positional argument', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({ employeeId: 'e1' }),
    );
  });

  /** A stipend is never taxed — the payload must never carry a rate. */
  it('always sends a zero GST rate', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({ gstRatePercent: 0 }),
    );
  });

  /** Reimbursed expenses ride along with the stipend as further line items. */
  it('adds a second line item for a reimbursement', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /add line item/i }));

    // The new row opens on append; the seeded one stays collapsed.
    const rates = screen.getAllByLabelText(/^rate/i);
    expect(rates).toHaveLength(1);
    await u.type(rates[0], '2500');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({
        lineItems: expect.arrayContaining([
          expect.objectContaining({ ratePaise: 2000000 }),
          expect.objectContaining({ ratePaise: 250000 }),
        ]),
      }),
    );
  });

  /** The period defaults to the whole selected month. */
  it('defaults the period to the bounds of the chosen month', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    const month = screen.getByLabelText(/stipend month/i);
    await u.clear(month);
    await u.type(month, '2026-06');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'STP',
      'e1',
      expect.objectContaining({
        stipendMonth: '2026-06',
        stipendPeriodStart: '2026-06-01',
        stipendPeriodEnd: '2026-06-30',
      }),
    );
  });
});
