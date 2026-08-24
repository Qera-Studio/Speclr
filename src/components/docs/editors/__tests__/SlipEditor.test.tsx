import { render, screen, waitFor } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
import userEvent from '@testing-library/user-event';
import SlipEditor from '../SlipEditor';
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
 * Opens a line item's fields, if it has a lock at all.
 *
 * Only a row seeded from a Service is locked, and a slip has no catalogue
 * behind it: "Basic" is a label the operator owns, so its rows are open from
 * the start. The helper stays because the same tests run against rows that do
 * lock, and a slip that ever grows a Service-backed line should not need them
 * rewritten. Addressed by position rather than by description, because the lock
 * button is what carries the name and the summary is plain text.
 */
async function expandLineItem(
  u: ReturnType<typeof userEvent.setup>,
  label = 'line item',
  n = 1,
) {
  const lock = screen.queryByRole('button', { name: `Unlock ${label} ${n}` });
  if (lock) await u.click(lock);
}

/**
 * There is no Save button — the slip writes itself a second after the typing
 * stops (`AUTOSAVE_MS`). Waiting on the assertion rather than on "a call
 * happened" is deliberate: autosave may bank an intermediate version first, and
 * what these tests are about is what finally lands.
 */
async function autosavedWith(payload: object, type = 'STP', recipient = 'e1') {
  await waitFor(() => expect(createDraft).toHaveBeenCalledWith(type, recipient, payload), {
    timeout: 3000,
  });
}

describe('SlipEditor (new)', () => {
  it('renders the employee picker and a collapsed line item', () => {
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);
    expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
    expect(screen.getByText('Untitled item')).toBeInTheDocument();
  });

  /**
   * The slip is almost always "this month's stipend, as agreed", so it arrives
   * filled in.
   */
  it('prefills the stipend line item from the employee record', async () => {
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await expandLineItem(u);

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
    await expandLineItem(u);

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

    await autosavedWith(
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
    await expandLineItem(u);
    const description = screen.getByLabelText(/^description$/i);
    await u.clear(description);
    await u.type(description, 'Bonus payment');

    const month = screen.getByLabelText(/stipend month/i);
    await u.clear(month);
    await u.type(month, '2026-06');

    await autosavedWith(
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

    await autosavedWith(expect.objectContaining({ currency: 'INR' }));
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

    await autosavedWith(
      expect.objectContaining({
        deductionsNote: 'No statutory deductions (PF, ESI, TDS) are applicable.',
      }),
    );
  });

  it('creates a draft with the amount in paise, with no save button pressed', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const replaceState = jest.spyOn(window.history, 'replaceState');
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();

    // Selecting an employee seeds line item 1 from payAmountPaise (2000000 → "20000").
    await selectComboboxOption(u, /employee/i, /Riya/);

    await autosavedWith(
      expect.objectContaining({
        lineItems: expect.arrayContaining([expect.objectContaining({ ratePaise: 2000000 })]),
      }),
    );
    // The URL becomes the draft's own without a navigation, so the half-filled
    // slip is not remounted out from under the user.
    expect(replaceState).toHaveBeenCalledWith(null, '', '/admin/docs/new-stp');
    expect(push).not.toHaveBeenCalled();
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

    await autosavedWith(expect.objectContaining({ employeeId: 'e1' }));
  });

  /** A stipend is never taxed — the payload must never carry a rate. */
  it('always sends a zero GST rate', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);

    await autosavedWith(expect.objectContaining({ gstRatePercent: 0 }));
  });

  /** Reimbursed expenses ride along with the stipend as further line items. */
  it('adds a second line item for a reimbursement', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-stp' });
    const u = userEvent.setup();
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

    await selectComboboxOption(u, /employee/i, /Riya/);
    await u.click(screen.getByRole('button', { name: /add line item/i }));

    // Both rows are open: neither came from a Service, so neither locks.
    const rates = screen.getAllByLabelText(/^rate/i);
    expect(rates).toHaveLength(2);
    await u.type(rates[1], '2500');

    await autosavedWith(
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

    await autosavedWith(
      expect.objectContaining({
        stipendMonth: '2026-06',
        stipendPeriodStart: '2026-06-01',
        stipendPeriodEnd: '2026-06-30',
      }),
    );
  });
});
