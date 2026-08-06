import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeesTable from '../EmployeesTable';
import type { EmployeeRecord } from '@/lib/domain/employee';

const employees = [
  {
    id: 'e1',
    name: 'Riya Sharma',
    address: 'addr',
    email: 'riya@b.com',
    phone: '999',
    role: 'Designer',
    engagementType: 'intern',
    pronoun: 'she',
    joiningDate: '2026-01-01',
    payAmountPaise: 2000000,
    bank: { bankName: 'Kotak', accountNo: '123', ifsc: 'KKBK0' },
    createdAt: 0,
    updatedAt: 0,
  },
] as EmployeeRecord[];

describe('EmployeesTable', () => {
  it('renders a row per employee', () => {
    render(<EmployeesTable employees={employees} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText('riya@b.com')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByText('intern')).toBeInTheDocument();
  });

  it('calls onEdit from the row Edit action', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();
    render(<EmployeesTable employees={employees} onEdit={onEdit} onDelete={() => {}} />);
    await user.click(screen.getByRole('button', { name: /edit riya sharma/i }));
    expect(onEdit).toHaveBeenCalledWith(employees[0]);
  });

  it('confirms before deleting', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(<EmployeesTable employees={employees} onEdit={() => {}} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete riya sharma/i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: /^remove$/i }));
    expect(onDelete).toHaveBeenCalledWith(employees[0]);
  });

  it('renders an empty state', () => {
    render(<EmployeesTable employees={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/no employees yet/i)).toBeInTheDocument();
  });
});
