import { act, render, screen } from '@testing-library/react';
import { useMinimumDuration, usePulse } from '../useMinimumDuration';

function Held({ active }: { active: boolean }) {
  return <span>{useMinimumDuration(active, 500) ? 'busy' : 'idle'}</span>;
}

function Pulsed() {
  const [on, pulse] = usePulse(500);
  return (
    <button type="button" onClick={pulse}>
      {on ? 'busy' : 'idle'}
    </button>
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useMinimumDuration', () => {
  /**
   * A cached pincode lookup returns in under a frame or two. Without the hold,
   * the spinner flickers and the fields appear to fill themselves in.
   */
  it('holds busy for the full window after a fast finish', () => {
    const { rerender } = render(<Held active />);
    expect(screen.getByText('busy')).toBeInTheDocument();

    rerender(<Held active={false} />);
    expect(screen.getByText('busy')).toBeInTheDocument();

    act(() => void jest.advanceTimersByTime(500));
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  /** It delays the flag going *false*, never the work going true. */
  it('goes busy immediately', () => {
    const { rerender } = render(<Held active={false} />);
    rerender(<Held active />);
    expect(screen.getByText('busy')).toBeInTheDocument();
  });
});

describe('usePulse', () => {
  it('turns on for the window, then off', () => {
    render(<Pulsed />);
    const button = screen.getByRole('button');

    act(() => button.click());
    expect(button).toHaveTextContent('busy');

    act(() => void jest.advanceTimersByTime(499));
    expect(button).toHaveTextContent('busy');

    act(() => void jest.advanceTimersByTime(1));
    expect(button).toHaveTextContent('idle');
  });

  /** A second pick restarts the window rather than ending it early. */
  it('restarts on a repeat pulse', () => {
    render(<Pulsed />);
    const button = screen.getByRole('button');

    act(() => button.click());
    act(() => void jest.advanceTimersByTime(400));
    act(() => button.click());
    act(() => void jest.advanceTimersByTime(400));

    expect(button).toHaveTextContent('busy');
  });
});
