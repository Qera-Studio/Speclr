import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientDetailsFields from '../ClientDetailsFields';

const noop = () => {};

describe('ClientDetailsFields', () => {
  it('renders a labelled client name input with the current value', () => {
    render(
      <ClientDetailsFields clientName="Acme Co." domain="" onClientNameChange={noop} onDomainChange={noop} />,
    );
    expect(screen.getByLabelText(/client \/ project name/i)).toHaveValue('Acme Co.');
  });

  it('renders a labelled domain input with the current value', () => {
    render(
      <ClientDetailsFields
        clientName=""
        domain="qera.studio"
        onClientNameChange={noop}
        onDomainChange={noop}
      />,
    );
    expect(screen.getByLabelText(/website.*domain/i)).toHaveValue('qera.studio');
  });

  it('calls onClientNameChange as the user types', async () => {
    const onClientNameChange = jest.fn();
    const user = userEvent.setup();
    render(
      <ClientDetailsFields
        clientName=""
        domain=""
        onClientNameChange={onClientNameChange}
        onDomainChange={noop}
      />,
    );
    await user.type(screen.getByLabelText(/client \/ project name/i), 'Z');
    expect(onClientNameChange).toHaveBeenCalledWith('Z');
  });

  it('calls onDomainChange as the user types', async () => {
    const onDomainChange = jest.fn();
    const user = userEvent.setup();
    render(
      <ClientDetailsFields
        clientName=""
        domain=""
        onClientNameChange={noop}
        onDomainChange={onDomainChange}
      />,
    );
    await user.type(screen.getByLabelText(/website.*domain/i), 'q');
    expect(onDomainChange).toHaveBeenCalledWith('q');
  });

  it('hints that the domain drives the preview mockups', () => {
    render(<ClientDetailsFields clientName="" domain="" onClientNameChange={noop} onDomainChange={noop} />);
    expect(screen.getByText(/shown in the previews/i)).toBeInTheDocument();
  });
});
