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

  it('calls onEdit when the row Edit action is chosen', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();
    render(<EmployeesTable employees={employees} onEdit={onEdit} onDelete={() => {}} />);
    await user.click(screen.getByRole('button', { name: /actions for riya sharma/i }));
    await user.click(await screen.findByRole('menuitem', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(employees[0]);
  });

  it('calls onDelete when the row Delete action is chosen', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(<EmployeesTable employees={employees} onEdit={() => {}} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /actions for riya sharma/i }));
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(employees[0]);
  });

  it('renders an empty state', () => {
    render(<EmployeesTable employees={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/no employees yet/i)).toBeInTheDocument();
  });
});
