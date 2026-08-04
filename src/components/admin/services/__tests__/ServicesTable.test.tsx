import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServicesTable from '../ServicesTable';
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';

const services = [
  {
    id: 's1',
    name: 'Branding',
    overview: 'A full brand identity package.',
    scopeItems: ['Logo design'],
    exclusionItems: [],
    priceNote: '',
    milestones: [],
    revisionsNote: '',
    disclaimerNote: '',
    supportNote: '',
    createdAt: 0,
    updatedAt: 0,
  },
] as ServiceTemplate[];

describe('ServicesTable', () => {
  it('renders a row per service', () => {
    render(<ServicesTable services={services} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Branding')).toBeInTheDocument();
    expect(screen.getByText(/full brand identity package/i)).toBeInTheDocument();
  });

  it('calls onEdit from the row Edit action', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();
    render(<ServicesTable services={services} onEdit={onEdit} onDelete={() => {}} />);
    await user.click(screen.getByRole('button', { name: /edit branding/i }));
    expect(onEdit).toHaveBeenCalledWith(services[0]);
  });

  it('confirms before deleting', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(<ServicesTable services={services} onEdit={() => {}} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete branding/i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: /^remove$/i }));
    expect(onDelete).toHaveBeenCalledWith(services[0]);
  });

  it('renders an empty state', () => {
    render(<ServicesTable services={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/no services yet/i)).toBeInTheDocument();
  });
});
