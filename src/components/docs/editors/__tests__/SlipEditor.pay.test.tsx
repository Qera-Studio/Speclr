import { render, screen } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
import userEvent from '@testing-library/user-event';
import SlipEditor from '../SlipEditor';
import type { EmployeeRecord } from '@/lib/domain/employee';

/**
 * The pay slip mode of `SlipEditor` — the controls a statutory wage record
 * needs, and the guard that stops one being written for an intern.
 */

const push = jest.fn();
const createDraft = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }),
}));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: jest.fn(),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

const employees = [
  {
    id: 'e1', name: 'Ananya', address: 'x', email: 'a@b.com', phone: '9', role: 'Senior Designer',
    engagementType: 'employee', pronoun: 'she', joiningDate: '2025-04-01',
    payAmountPaise: 6000000,
    bank: { bankName: 'HDFC', accountNo: '1', ifsc: 'HDFC' }, createdAt: 0, updatedAt: 0,
  },
  {
    id: 'e2', name: 'Riya', address: 'x', email: 'r@b.com', phone: '9', role: 'Design Intern',
    engagementType: 'intern', pronoun: 'she', joiningDate: '2026-01-01',
    payAmountPaise: 2000000,
    bank: { bankName: 'Kotak', accountNo: '1', ifsc: 'KKBK' }, createdAt: 0, updatedAt: 0,
  },
] as EmployeeRecord[];

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

function renderPaySlip() {
  render(<SlipEditor type="PAY" employees={employees} title="New pay slip" />);
}

describe('SlipEditor — pay slip', () => {
  it('offers a deductions list beside the earnings', () => {
    renderPaySlip();
    expect(screen.getByRole('group', { name: 'Earnings' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Deductions' })).toBeInTheDocument();
  });

  it('starts with no deductions — nothing withheld is an ordinary month', () => {
    renderPaySlip();
    expect(
      screen.queryByRole('button', { name: /Remove deduction/ }),
    ).not.toBeInTheDocument();
  });

  /** A deduction is a flat amount; "TDS × 3" is not a thing. */
  it('takes a deduction as an amount, with no quantity to get wrong', async () => {
    const u = userEvent.setup();
    renderPaySlip();

    await u.click(screen.getByRole('button', { name: 'Add deduction' }));

    expect(screen.getByLabelText(/^amount/i)).toBeInTheDocument();
    // The earnings row still has a Rate + Qty pair; the deduction has neither.
    expect(screen.queryByLabelText(/^qty$/i)).not.toBeInTheDocument();
  });

  it('offers the wage-period day counts', () => {
    renderPaySlip();
    expect(screen.getByLabelText('Days paid')).toBeInTheDocument();
    expect(screen.getByLabelText('Days in period')).toBeInTheDocument();
    expect(screen.getByLabelText('Loss of pay')).toBeInTheDocument();
  });

  /**
   * Asserting "no statutory deductions apply" is a claim about the employee's
   * tax position that stops being true the moment TDS u/s 192 does. The stipend
   * slip opens with it; the pay slip must not.
   */
  it('does not default to asserting that no deductions apply', () => {
    renderPaySlip();
    expect(screen.getByLabelText('Deductions note')).toHaveValue('');
  });

  it('exposes the deductions note, which the stipend slip also needs', () => {
    render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);
    expect(screen.getByLabelText('Deductions / terms note')).toHaveValue(
      'No statutory deductions (PF, ESI, TDS) are applicable.',
    );
  });

  it('labels the period as a salary period', () => {
    renderPaySlip();
    expect(screen.getByLabelText('Salary month')).toBeInTheDocument();
    expect(screen.queryByLabelText('Stipend month')).not.toBeInTheDocument();
  });

  /**
   * A pay slip records wages under a contract of employment, so an intern is
   * simply not one of the people it can name. Offering them and then refusing
   * at finalize wastes the drafter's time; not offering them is the fix.
   */
  describe('who the pay slip can name', () => {
    it('offers employees only', async () => {
      const u = userEvent.setup();
      renderPaySlip();

      await u.click(screen.getByLabelText(/employee/i));

      expect(screen.getByRole('option', { name: /Ananya/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Riya/ })).not.toBeInTheDocument();
    });

    it('stays quiet when an employee is picked', async () => {
      const u = userEvent.setup();
      renderPaySlip();

      await selectComboboxOption(u, /employee/i, /Ananya/);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    /**
     * Filtering is the convenience, not the guarantee. Convert an employee to
     * an intern and the pay-slip draft already naming them still exists — the
     * warning is what surfaces that, and finalize is what refuses it.
     */
    it('still warns on a draft whose named employee became an intern', () => {
      render(
        <SlipEditor
          type="PAY"
          employees={employees}
          title="Edit pay slip"
          doc={
            {
              id: 'd1',
              type: 'PAY',
              status: 'draft',
              employeeId: 'e2',
              employeeSnapshot: employees[1],
              issueDate: '2026-06-30',
              lineItems: [],
              gstRatePercent: 0,
              stipendMonth: '2026-06',
              paymentMethod: 'Bank Transfer',
              deductionsNote: '',
              createdAt: 0,
              updatedAt: 0,
            } as never
          }
        />,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Riya/);
      expect(alert).toHaveTextContent(/intern/i);
      expect(alert).toHaveTextContent(/stipend slip/i);
    });
  });

  describe('who the stipend slip can name', () => {
    it('offers interns only', async () => {
      const u = userEvent.setup();
      render(<SlipEditor type="STP" employees={employees} title="New stipend slip" />);

      await u.click(screen.getByLabelText(/employee/i));

      expect(screen.getByRole('option', { name: /Riya/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Ananya/ })).not.toBeInTheDocument();
    });
  });
});

/**
 * The day counts a wage slip is required to state. They default to the whole
 * month rather than blank: a full month worked is the ordinary case, so the
 * slip arrives correct and gets corrected downward, instead of starting empty
 * on a figure that must not be empty.
 */
describe('SlipEditor — pay slip day counts', () => {
  it('defaults to the whole month, with no loss of pay', () => {
    renderPaySlip();

    const month = new Date().toISOString().slice(0, 7);
    const daysThisMonth = String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate());

    expect(screen.getByLabelText('Days paid')).toHaveValue(daysThisMonth);
    expect(screen.getByLabelText('Days in period')).toHaveValue(daysThisMonth);
    expect(screen.getByLabelText('Loss of pay')).toHaveValue('0');
  });

  it('accepts only digits', async () => {
    const u = userEvent.setup();
    renderPaySlip();

    const field = screen.getByLabelText('Loss of pay');
    await u.clear(field);
    await u.type(field, '2 days');

    expect(field).toHaveValue('2');
  });
});
