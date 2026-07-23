import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientsTable from '../ClientsTable';
import type { ClientRecord } from '@/lib/domain/types';

const clients = [{ id: 'c1', name: 'Acme Co.', address: 'x', email: 'a@b.com', phone: '999', gstin: '', createdAt: 0, updatedAt: 0 }] as ClientRecord[];

describe('ClientsTable', () => {
  it('renders a row per client', () => {
    render(<ClientsTable clients={clients} onEdit={() => {}} />);
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });
  it('calls onEdit when the row Edit action is chosen', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();
    render(<ClientsTable clients={clients} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: /actions for acme co\./i }));
    await user.click(await screen.findByRole('menuitem', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(clients[0]);
  });
  it('renders an empty state', () => {
    render(<ClientsTable clients={[]} onEdit={() => {}} />);
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
  });
});
