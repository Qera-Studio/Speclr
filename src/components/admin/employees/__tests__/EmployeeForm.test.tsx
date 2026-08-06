import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeForm from '../EmployeeForm';

const createEmployee = jest.fn();
const updateEmployee = jest.fn();
jest.mock('@/server/actions/employees', () => ({
  createEmployee: (...a: unknown[]) => createEmployee(...a),
  updateEmployee: (...a: unknown[]) => updateEmployee(...a),
  deleteEmployeeAction: jest.fn(),
}));

async function fillEmployee(user: ReturnType<typeof userEvent.setup>, { phone = '9876543210' } = {}) {
  await user.type(screen.getByLabelText('Name'), 'Riya');
  await user.type(screen.getByLabelText(/^email$/i), 'r@b.com');
  await user.type(screen.getByLabelText(/^phone$/i), phone);
  await user.type(screen.getByLabelText(/role/i), 'Designer');
  await user.type(screen.getByLabelText(/^pay$/i), '20000');
  await user.type(screen.getByLabelText(/building \/ flat/i), 'C-204');
  await user.type(screen.getByLabelText(/pincode/i), '201017');
  await user.type(screen.getByLabelText(/^city$/i), 'Ghaziabad');
  await user.type(screen.getByLabelText(/bank name/i), 'Kotak');
  await user.type(screen.getByLabelText(/account number/i), '123');
  await user.type(screen.getByLabelText(/ifsc/i), 'kkbk0000677');
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
});

describe('EmployeeForm', () => {
  it('renders core fields', () => {
    render(<EmployeeForm onDone={() => {}} />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^pay$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument();
  });

  it('offers a currency for pay, defaulting to rupees', () => {
    render(<EmployeeForm onDone={() => {}} />);
    expect(screen.getByLabelText(/currency/i)).toHaveTextContent('INR');
  });

  it('offers a QR upload alongside the UPI ID', () => {
    render(<EmployeeForm onDone={() => {}} />);
    expect(screen.getByRole('button', { name: /upload qr image/i })).toBeInTheDocument();
  });

  it('maps rupees to paise, composes the address, and nests bank on submit', async () => {
    createEmployee.mockResolvedValue({ success: true, id: 'e1' });
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);

    await fillEmployee(user);
    await user.click(screen.getByRole('button', { name: /add employee/i }));

    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Riya',
        payAmountPaise: 2000000,
        payCurrency: 'INR',
        phone: '+919876543210',
        address: 'C-204,\nGhaziabad - 201017\nIndia',
        bank: expect.objectContaining({ bankName: 'Kotak', accountNo: '123', ifsc: 'KKBK0000677' }),
      }),
    );
  });

  it('refuses an invalid phone number', async () => {
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);

    await fillEmployee(user, { phone: '12345' });
    await user.click(screen.getByRole('button', { name: /add employee/i }));

    expect(await screen.findByText(/10-digit mobile/i)).toBeInTheDocument();
    expect(createEmployee).not.toHaveBeenCalled();
  });

  it('picks the joining date from a calendar', async () => {
    createEmployee.mockResolvedValue({ success: true, id: 'e1' });
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);

    await fillEmployee(user);
    await user.click(screen.getByLabelText(/joining date/i));

    // Pick the 15th of whichever month the calendar opened on (today's), so
    // this doesn't depend on the date the suite happens to run.
    const grid = await screen.findByRole('grid');
    await user.click(within(grid).getByRole('button', { name: /\b15th\b/ }));
    await user.click(screen.getByRole('button', { name: /add employee/i }));

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`;
    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ joiningDate: expected }),
    );
  });

  it('loads an existing employee, including their engagement type', () => {
    render(
      <EmployeeForm
        onDone={() => {}}
        employee={{
          id: 'e1',
          name: 'Existing',
          address: 'Hand typed',
          email: 'e@x.com',
          phone: '+919876543210',
          role: 'Intern',
          engagementType: 'intern',
          pronoun: 'they',
          joiningDate: '2026-06-01',
          payAmountPaise: 2000000,
          bank: { bankName: 'Kotak', accountNo: '1', ifsc: 'K' },
          createdAt: 0,
          updatedAt: 0,
        }}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Existing');
    expect(screen.getByLabelText(/engagement type/i)).toHaveTextContent(/intern/i);
    expect(screen.getByLabelText(/joining date/i)).toHaveTextContent('1 Jun 2026');
  });
});

/**
 * The identifiers a pay slip prints. Everything here is written once and read
 * years later off a wage record, so the form's job is to make the canonical
 * form the only one that can be stored.
 */
describe('EmployeeForm — payroll identifiers', () => {
  const employee = {
    id: 'e1',
    name: 'Ananya Rao',
    address: 'Sector 12',
    email: 'a@x.com',
    phone: '+919876543210',
    role: 'Senior Designer',
    engagementType: 'employee' as const,
    pronoun: 'she' as const,
    joiningDate: '2025-04-01',
    payAmountPaise: 6000000,
    bank: { bankName: 'HDFC', accountNo: '1', ifsc: 'HDFC0001234' },
    payroll: { employeeCode: 'QS-EMP-004' },
    createdAt: 0,
    updatedAt: 0,
  };

  /**
   * Assigned from a counter, never typed. Two employees in the live database
   * both held "000001" before this — typed by hand, months apart.
   */
  describe('the employee code', () => {
    it('is read-only', () => {
      render(<EmployeeForm onDone={() => {}} employee={employee} />);

      const field = screen.getByLabelText(/employee code/i);
      expect(field).toHaveValue('QS-EMP-004');
      expect(field).toHaveAttribute('readonly');
    });

    /**
     * The form opens on "intern", who gets no code — so promising one would be
     * a promise the server does not keep.
     */
    it('says an intern gets none', () => {
      render(<EmployeeForm onDone={() => {}} />);
      expect(screen.getByLabelText(/employee code/i)).toHaveAttribute(
        'placeholder',
        'Employees only',
      );
    });

    it('says where it will come from once the engagement is employment', async () => {
      const user = userEvent.setup();
      render(<EmployeeForm onDone={() => {}} />);

      await user.click(screen.getByLabelText(/engagement type/i));
      await user.click(await screen.findByRole('option', { name: /^employee$/i }));

      expect(screen.getByLabelText(/employee code/i)).toHaveAttribute(
        'placeholder',
        'Assigned on save',
      );
    });

    it('cannot be typed into', async () => {
      const user = userEvent.setup();
      render(<EmployeeForm onDone={() => {}} />);

      await user.type(screen.getByLabelText(/employee code/i), 'QS-EMP-999');

      expect(screen.getByLabelText(/employee code/i)).toHaveValue('');
    });
  });

  /** One canonical written form. Lower case is a typo, not a variant. */
  it('upper-cases the PAN and the PF number as they are typed', async () => {
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);

    await user.type(screen.getByLabelText(/^pan$/i), 'abcpr1234f');
    await user.type(screen.getByLabelText(/pf number/i), 'pybom172264');

    expect(screen.getByLabelText(/^pan$/i)).toHaveValue('ABCPR1234F');
    expect(screen.getByLabelText(/pf number/i)).toHaveValue('PYBOM172264');
  });

  /**
   * The explanations live behind info icons rather than as standing text under
   * the fields: a description that is always there pushes the row heights
   * around and shouts at someone who has done nothing wrong.
   */
  it('puts its explanations behind info buttons, reachable by keyboard', () => {
    render(<EmployeeForm onDone={() => {}} />);

    expect(
      screen.getByRole('button', { name: /about payroll identifiers/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /about the pan check/i })).toBeInTheDocument();
  });

  /**
   * A tooltip is never announced, so the surname hint — which appears as a
   * consequence of what was just typed — also needs a live region. The check
   * only ever hints: real PANs mismatch honestly.
   */
  it('announces a surname mismatch as well as showing it', async () => {
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Ananya Rao');
    await user.type(screen.getByLabelText(/^pan$/i), 'abcps1234f');

    expect(
      await screen.findByRole('status', { name: 'PAN check' }),
    ).toHaveTextContent(/does not match the surname/i);
  });

  it('stays quiet when the PAN agrees with the surname', async () => {
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Ananya Rao');
    await user.type(screen.getByLabelText(/^pan$/i), 'abcpr1234f');

    expect(screen.getByRole('status', { name: 'PAN check' })).toHaveTextContent('');
  });
});
