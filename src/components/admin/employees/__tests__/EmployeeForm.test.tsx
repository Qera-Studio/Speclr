import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeForm from '../EmployeeForm';

const createEmployee = jest.fn();
const updateEmployee = jest.fn();
jest.mock('@/server/actions/employees', () => ({
  createEmployee: (...a: unknown[]) => createEmployee(...a),
  updateEmployee: (...a: unknown[]) => updateEmployee(...a),
  deleteEmployeeAction: jest.fn(),
}));

describe('EmployeeForm', () => {
  beforeEach(() => jest.clearAllMocks());
  it('renders core fields', () => {
    render(<EmployeeForm onDone={() => {}} />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^pay/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument();
  });
  it('maps rupees to paise and nests bank on submit', async () => {
    createEmployee.mockResolvedValue({ success: true, id: 'e1' });
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);
    await user.type(screen.getByLabelText('Name'), 'Riya');
    await user.type(screen.getByLabelText(/address/i), 'addr');
    await user.type(screen.getByLabelText(/email/i), 'r@b.com');
    await user.type(screen.getByLabelText(/phone/i), '999');
    await user.type(screen.getByLabelText(/role/i), 'Designer');
    await user.type(screen.getByLabelText(/^pay/i), '20000');
    await user.type(screen.getByLabelText(/bank name/i), 'Kotak');
    await user.type(screen.getByLabelText(/account number/i), '123');
    await user.type(screen.getByLabelText(/ifsc/i), 'KKBK0');
    await user.clear(screen.getByLabelText(/joining date/i));
    await user.type(screen.getByLabelText(/joining date/i), '2026-06-01');
    await user.click(screen.getByRole('button', { name: /add employee/i }));
    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Riya',
        payAmountPaise: 2000000,
        bank: expect.objectContaining({ bankName: 'Kotak', accountNo: '123', ifsc: 'KKBK0' }),
      }),
    );
  });
});
