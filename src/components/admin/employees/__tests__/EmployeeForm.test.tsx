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
  await user.type(screen.getByLabelText(/ifsc/i), 'KKBK0');
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
        address: 'C-204,\nGhaziabad - 201017',
        bank: expect.objectContaining({ bankName: 'Kotak', accountNo: '123', ifsc: 'KKBK0' }),
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
