import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceForm from '../ServiceForm';

const createService = jest.fn();
const updateService = jest.fn();
jest.mock('@/server/actions/services', () => ({
  createService: (...a: unknown[]) => createService(...a),
  updateService: (...a: unknown[]) => updateService(...a),
  deleteServiceAction: jest.fn(),
}));

describe('ServiceForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders name and overview fields', () => {
    render(<ServiceForm onDone={() => {}} />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText(/overview/i)).toBeInTheDocument();
  });

  it('adds a scope item and includes it as a string on submit', async () => {
    createService.mockResolvedValue({ success: true, id: 's1' });
    const user = userEvent.setup();
    render(<ServiceForm onDone={() => {}} />);
    await user.type(screen.getByLabelText('Name'), 'Branding');
    await user.click(screen.getByRole('button', { name: /add scope item/i }));
    const scopeInputs = screen.getAllByLabelText(/scope item/i);
    await user.type(scopeInputs[scopeInputs.length - 1], 'Logo design');
    await user.click(screen.getByRole('button', { name: /add service/i }));
    expect(createService).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Branding', scopeItems: expect.arrayContaining(['Logo design']) }),
    );
  });
});
