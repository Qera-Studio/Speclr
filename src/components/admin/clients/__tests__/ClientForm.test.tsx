import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientForm from '../ClientForm';

const createClient = jest.fn();
const updateClient = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  createClient: (...a: unknown[]) => createClient(...a),
  updateClient: (...a: unknown[]) => updateClient(...a),
}));

describe('ClientForm', () => {
  beforeEach(() => jest.clearAllMocks());
  it('renders the client fields', () => {
    render(<ClientForm onDone={() => {}} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });
  it('calls createClient with entered values on submit', async () => {
    createClient.mockResolvedValue({ success: true, id: 'c1' });
    const onDone = jest.fn();
    const user = userEvent.setup();
    render(<ClientForm onDone={onDone} />);
    await user.type(screen.getByLabelText(/name/i), 'Acme Co.');
    await user.type(screen.getByLabelText(/address/i), '1 Road');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/phone/i), '999');
    await user.click(screen.getByRole('button', { name: /add client/i }));
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acme Co.', email: 'a@b.com', phone: '999' }));
    expect(onDone).toHaveBeenCalled();
  });
  it('shows a server error when the action fails', async () => {
    createClient.mockResolvedValue({ success: false, error: 'Failed to save client.' });
    const user = userEvent.setup();
    render(<ClientForm onDone={() => {}} />);
    await user.type(screen.getByLabelText(/name/i), 'X');
    await user.type(screen.getByLabelText(/address/i), 'Y');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/phone/i), '1');
    await user.click(screen.getByRole('button', { name: /add client/i }));
    expect(await screen.findByText('Failed to save client.')).toBeInTheDocument();
  });
});
