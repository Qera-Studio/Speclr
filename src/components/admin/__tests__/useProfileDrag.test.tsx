import { act, render, screen } from '@testing-library/react';
import { useProfileDrag } from '../useProfileDrag';

/**
 * The gesture that moves between profiles.
 *
 * Two bugs are pinned down here, both of which shipped and both of which jsdom
 * could see once asked. The first is the snap-back: the hook used to zero its
 * offset on release and *then* navigate, so the rail sprang home, waited out the
 * round trip and slid across a second time. The second is the browser answering
 * instead of the rail — macOS turns an uncancelled horizontal wheel into history
 * back/forward, and it claims the gesture on the opening event.
 *
 * jsdom has no trackpad, so these are synthesised events. What it cannot show
 * is whether the movement *feels* right — that is a browser check.
 */

/** Travel a full profile's width, per `SPAN` in the hook. */
const SPAN = 220;

function Harness({
  onCommit,
  settleKey = 'client',
}: {
  onCommit: (d: -1 | 1) => void;
  settleKey?: string;
}) {
  const { offset, dragging } = useProfileDrag(onCommit, () => true, settleKey);
  return (
    <div data-slot="sidebar">
      <span data-testid="offset">{offset.toFixed(3)}</span>
      <span data-testid="dragging">{String(dragging)}</span>
    </div>
  );
}

const rail = () => screen.getByTestId('offset').parentElement!;

/** Returns the event, so the test can ask whether it was cancelled. */
function wheel(deltaX: number, deltaY = 0) {
  const event = new WheelEvent('wheel', {
    deltaX,
    deltaY,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    rail().dispatchEvent(event);
  });
  return event;
}

const offset = () => Number(screen.getByTestId('offset').textContent);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Wheel gestures have no end event; the hook infers one from a pause. */
const settle = () => act(() => void jest.advanceTimersByTime(200));

describe('useProfileDrag', () => {
  it('cancels a horizontal wheel so the browser does not navigate back', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    expect(wheel(40).defaultPrevented).toBe(true);
  });

  /**
   * The reason the browser gesture survived the first fix. A trackpad swipe
   * opens with near-zero deltas and carries vertical noise the whole way, so
   * per-event axis tests let the opening event through uncancelled — and macOS
   * claims the gesture on that event. Nothing cancelled afterwards can take it
   * back, which is why this asserts the *first* event, not the total.
   */
  it('cancels the opening event of a noisy horizontal swipe', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    // Barely horizontal, exactly as a real swipe begins.
    expect(wheel(1.2, 0.8).defaultPrevented).toBe(true);
    // And a later event that reads vertical on its own stays in the stream,
    // rather than handing the rest of the gesture back to the browser.
    expect(wheel(6, 9).defaultPrevented).toBe(true);
  });

  it('lets pure noise decide nothing until a real delta arrives', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    expect(wheel(0, 0).defaultPrevented).toBe(false);
    expect(wheel(40, 2).defaultPrevented).toBe(true);
  });

  it('leaves a vertical wheel alone so the rail still scrolls', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    const event = wheel(5, 60);
    expect(event.defaultPrevented).toBe(false);
    expect(offset()).toBe(0);

    settle();
    expect(commit).not.toHaveBeenCalled();
  });

  it('reports an offset while the gesture is still running', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    wheel(SPAN / 2);
    expect(offset()).toBeCloseTo(0.5, 2);
    expect(screen.getByTestId('dragging')).toHaveTextContent('true');
    expect(commit).not.toHaveBeenCalled();
  });

  it('accumulates a stream of wheel events into one gesture', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    wheel(SPAN / 4);
    wheel(SPAN / 4);
    expect(offset()).toBeCloseTo(0.5, 2);
  });

  /**
   * The snap-back bug, asserted directly. The old version zeroed here, so the
   * rail sat back down on the profile you had just left, waited for the RSC
   * navigation, and then slid across — one gesture, two movements and a network
   * request between them. Holding at the full width means the track is already
   * where the navigation is about to put it.
   */
  it('holds at the committed position instead of springing back', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    wheel(SPAN * 0.6);
    settle();

    expect(commit).toHaveBeenCalledWith(1);
    expect(offset()).toBe(1);
    // Not dragging, so the caller's transition is on and the hold animates.
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');
  });

  /**
   * And releases it when the navigation lands. The caller's transform is
   * `(-index - offset)`, so index+1 with offset 0 is the same position as index
   * with offset 1 — the swap is arithmetically invisible, which is the whole
   * trick. It has to happen during render: a frame with the new index and the
   * old offset still applied would be two rails wide.
   */
  it('lets go once the profile it was waiting for arrives', () => {
    const commit = jest.fn();
    const { rerender } = render(<Harness onCommit={commit} settleKey="client" />);

    wheel(SPAN * 0.6);
    settle();
    expect(offset()).toBe(1);

    act(() => rerender(<Harness onCommit={commit} settleKey="admin" />));
    expect(offset()).toBe(0);
  });

  /**
   * A push that never lands must not leave the rail showing a profile the page
   * is not on. That is worse than the snap-back it replaced — silently wrong
   * rather than merely ugly.
   */
  it('gives up on a navigation that never arrives', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    wheel(SPAN * 0.6);
    settle();
    expect(offset()).toBe(1);

    act(() => void jest.advanceTimersByTime(2500));
    expect(offset()).toBe(0);
  });

  it('starts a fresh gesture from rest while a commit is still pending', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    wheel(SPAN * 0.6);
    settle();
    expect(offset()).toBe(1);

    wheel(SPAN * 0.25);
    expect(offset()).toBeCloseTo(0.25, 2);
  });

  it('springs back when released short of the threshold', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    wheel(SPAN * 0.2);
    settle();

    expect(commit).not.toHaveBeenCalled();
    expect(offset()).toBe(0);
  });

  it('commits the other way for a negative drag', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    wheel(-SPAN * 0.6);
    settle();

    expect(commit).toHaveBeenCalledWith(-1);
  });

  it('ignores a gesture that did not start on the rail', () => {
    const commit = jest.fn();
    render(<Harness onCommit={commit} />);

    const event = new WheelEvent('wheel', { deltaX: SPAN, bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(event);
    });
    settle();

    expect(event.defaultPrevented).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });
});

/**
 * Clamping, not wrapping. Client sits on the left, so pulling further left from
 * it must feel like a wall — a wrapping step would make every gesture switch
 * regardless of direction, which is a toggle wearing a swipe's clothes.
 */
describe('useProfileDrag at the end of the row', () => {
  function Clamped({ onCommit }: { onCommit: (d: -1 | 1) => void }) {
    // Only forward steps exist, as for the leftmost profile.
    const { offset } = useProfileDrag(onCommit, (direction) => direction === 1);
    return (
      <div data-slot="sidebar">
        <span data-testid="offset">{offset.toFixed(3)}</span>
        <span data-testid="dragging">false</span>
      </div>
    );
  }

  it('does not move or commit in a direction that leads nowhere', () => {
    const commit = jest.fn();
    render(<Clamped onCommit={commit} />);

    wheel(-SPAN);
    expect(offset()).toBe(0);

    settle();
    expect(commit).not.toHaveBeenCalled();
  });
});
