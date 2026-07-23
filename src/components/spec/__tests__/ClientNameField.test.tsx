import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientNameField from '../ClientNameField';

describe('ClientNameField', () => {
  it('renders a labelled text input with the current value', () => {
    render(<ClientNameField value="Acme Co." onChange={() => {}} />);
    const input = screen.getByLabelText(/client \/ project name/i);
    expect(input).toHaveValue('Acme Co.');
  });

  it('calls onChange as the user types', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<ClientNameField value="" onChange={onChange} />);
    await user.type(screen.getByLabelText(/client \/ project name/i), 'Z');
    expect(onChange).toHaveBeenCalledWith('Z');
  });
});
