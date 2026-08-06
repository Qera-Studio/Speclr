import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Download, CheckCheck } from 'lucide-react';
import { ConfirmButton } from '../confirm-button';

// Motion animates the idle icon on hover; behaviour/accessibility must not depend
// on its animation lifecycle. Mock it to plain elements so tests assert the
// component's real state changes without waiting on animation timing.
jest.mock('motion/react', () => {
  const React = require('react');
  const passthrough = (tag: string) =>
    React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const { whileHover, whileTap, initial, animate, exit, transition, variants, ...rest } = props;
      void whileHover;
      void whileTap;
      void initial;
      void animate;
      void exit;
      void transition;
      void variants;
      return React.createElement(tag, { ...rest, ref });
    });
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
  };
});

const baseProps = {
  idleIcon: Download,
  idleLabel: 'Export progress',
  confirmIcon: CheckCheck,
  confirmLabel: 'Downloaded',
};

describe('ConfirmButton (confirmSwap)', () => {
  it('exposes the idle label as the accessible name by default', () => {
    render(<ConfirmButton {...baseProps} onAction={() => {}} />);
    expect(screen.getByRole('button', { name: /export progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toHaveAccessibleName(/downloaded/i);
  });

  it('runs the action immediately on click', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();
    render(<ConfirmButton {...baseProps} onAction={onAction} />);
    await user.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('swaps to the confirm state only after the confirm delay', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ConfirmButton {...baseProps} onAction={() => {}} confirmDelayMs={500} revertAfterMs={1500} />);

    await user.click(screen.getByRole('button'));
    // Still idle right after click — the swap is delayed.
    expect(screen.getByRole('button')).toHaveAccessibleName(/export progress/i);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByRole('button')).toHaveAccessibleName(/downloaded/i);
    jest.useRealTimers();
  });

  it('reverts to idle after the revert delay', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ConfirmButton {...baseProps} onAction={() => {}} confirmDelayMs={500} revertAfterMs={1500} />);

    await user.click(screen.getByRole('button'));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByRole('button')).toHaveAccessibleName(/downloaded/i);

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.getByRole('button')).toHaveAccessibleName(/export progress/i);
    jest.useRealTimers();
  });
});
