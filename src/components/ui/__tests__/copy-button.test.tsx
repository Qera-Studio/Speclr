import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from '../copy-button';

describe('CopyButton', () => {
  it('renders a copy button labelled for its value', () => {
    render(<CopyButton value="favicon.ico" label="Copy filename" />);
    expect(screen.getByRole('button', { name: /copy filename/i })).toBeInTheDocument();
  });

  it('writes the value to the clipboard on click', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="favicon.ico" label="Copy filename" />);
    await user.click(screen.getByRole('button', { name: /copy filename/i }));
    // userEvent installs a real clipboard stub — read it back.
    await expect(navigator.clipboard.readText()).resolves.toBe('favicon.ico');
  });

  it('swaps to a "copied" state after copying, then reverts', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<CopyButton value="favicon.ico" label="Copy filename" revertAfterMs={1500} />);

    await user.click(screen.getByRole('button'));
    // Accessible name flips to the copied state (after the async clipboard write).
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button')).toHaveAccessibleName(/copied/i);

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.getByRole('button')).toHaveAccessibleName(/copy filename/i);
    jest.useRealTimers();
  });
});
