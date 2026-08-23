import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button pending', () => {
  it('keeps its label, so the button does not resize under the cursor', () => {
    const { rerender } = render(<Button>Save settings</Button>);
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeInTheDocument();

    rerender(<Button pending>Save settings</Button>);
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeInTheDocument();
  });

  it('marks itself busy and refuses the second click', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button pending onClick={onClick}>
        Save settings
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save settings' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('says nothing about being busy when it is not', () => {
    render(<Button>Save settings</Button>);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('button')).toBeEnabled();
  });
});
