import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import SidebarResizeHandle, {
  clampWidth,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SNAP_DISTANCE,
} from '@/components/shell/SidebarResizeHandle';

describe('clampWidth', () => {
  it('keeps a width within range unchanged', () => {
    expect(clampWidth(SIDEBAR_DEFAULT_WIDTH)).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it('clamps below the minimum up to the minimum', () => {
    expect(clampWidth(SIDEBAR_MIN_WIDTH - 100)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it('clamps above the maximum down to the maximum', () => {
    expect(clampWidth(SIDEBAR_MAX_WIDTH + 100)).toBe(SIDEBAR_MAX_WIDTH);
  });
});

/** Reads the provider's state the way `Sidebar` would, without the rail. */
function StateProbe() {
  return <output data-testid="rail-state">{useSidebar().state}</output>;
}

/**
 * The handle reads the rail's open state to snap it, so it lives under a
 * `SidebarProvider`, and the probe beside it is how a test sees the snap.
 */
function renderHandle({
  width = SIDEBAR_DEFAULT_WIDTH,
  open = true,
  onWidthChange = () => {},
}: { width?: number; open?: boolean; onWidthChange?: (next: number) => void } = {}) {
  return render(
    <SidebarProvider defaultOpen={open}>
      <SidebarResizeHandle width={width} onWidthChange={onWidthChange} />
      <StateProbe />
    </SidebarProvider>,
  );
}

const handle = () => screen.getByRole('separator', { name: /resize sidebar/i });
const railState = () => screen.getByTestId('rail-state').textContent;

/** A press on the handle followed by a horizontal move of `dx`, then release. */
async function drag(dx: number) {
  const user = userEvent.setup();
  await user.pointer({ keys: '[MouseLeft>]', target: handle(), coords: { clientX: 300, clientY: 100 } });
  await user.pointer({ coords: { clientX: 300 + dx, clientY: 100 } });
  await user.pointer({ keys: '[/MouseLeft]' });
}

describe('SidebarResizeHandle', () => {
  it('exposes an accessible resize separator with the current value', () => {
    renderHandle();
    expect(handle()).toHaveAttribute('aria-valuenow', String(SIDEBAR_DEFAULT_WIDTH));
    expect(handle()).toHaveAttribute('aria-valuemin', String(SIDEBAR_MIN_WIDTH));
    expect(handle()).toHaveAttribute('aria-valuemax', String(SIDEBAR_MAX_WIDTH));
  });

  it('nudges width right/left with arrow keys, clamped', async () => {
    const onWidthChange = jest.fn();
    const user = userEvent.setup();
    renderHandle({ onWidthChange });

    handle().focus();
    await user.keyboard('{ArrowRight}');
    expect(onWidthChange).toHaveBeenCalledWith(SIDEBAR_DEFAULT_WIDTH + 16);

    await user.keyboard('{ArrowLeft}');
    expect(onWidthChange).toHaveBeenCalledWith(SIDEBAR_DEFAULT_WIDTH - 16);
  });

  it('does not exceed the max when nudging right near the limit', async () => {
    const onWidthChange = jest.fn();
    const user = userEvent.setup();
    renderHandle({ width: SIDEBAR_MAX_WIDTH, onWidthChange });
    handle().focus();
    await user.keyboard('{ArrowRight}');
    expect(onWidthChange).toHaveBeenCalledWith(SIDEBAR_MAX_WIDTH);
  });

  it('follows a drag within the range', async () => {
    const onWidthChange = jest.fn();
    renderHandle({ onWidthChange });
    await drag(40);
    expect(onWidthChange).toHaveBeenLastCalledWith(SIDEBAR_DEFAULT_WIDTH + 40);
    expect(railState()).toBe('expanded');
  });

  /**
   * The minimum is a floor for the width, not for the gesture. Stopping at
   * `min` leaves the rail there; pushing `SNAP_DISTANCE` past it collapses the
   * rail, which is the only way to make "keep dragging it smaller" mean
   * anything.
   */
  it('holds at the minimum, then snaps closed when pushed past it', async () => {
    const onWidthChange = jest.fn();
    renderHandle({ width: SIDEBAR_MIN_WIDTH, onWidthChange });

    await drag(-(SNAP_DISTANCE - 1));
    expect(railState()).toBe('expanded');
    expect(onWidthChange).toHaveBeenLastCalledWith(SIDEBAR_MIN_WIDTH);
    expect(onWidthChange.mock.calls.every(([w]) => w >= SIDEBAR_MIN_WIDTH)).toBe(true);

    await drag(-(SNAP_DISTANCE + 1));
    expect(railState()).toBe('collapsed');
  });

  /**
   * The mirror: pulling the collapsed rail `SNAP_DISTANCE` opens it at `min`,
   * and the same drag keeps widening it from there.
   */
  it('snaps open from collapsed when pulled far enough, and keeps following', async () => {
    const onWidthChange = jest.fn();
    renderHandle({ width: SIDEBAR_MIN_WIDTH, open: false, onWidthChange });
    expect(handle()).toHaveAttribute('aria-valuenow', String(SIDEBAR_MIN_WIDTH));

    await drag(SNAP_DISTANCE - 1);
    expect(railState()).toBe('collapsed');
    expect(onWidthChange).not.toHaveBeenCalled();

    await drag(SNAP_DISTANCE + 20);
    expect(railState()).toBe('expanded');
    expect(onWidthChange).toHaveBeenLastCalledWith(SIDEBAR_MIN_WIDTH + 20);
  });

  it('collapses on a left arrow at the minimum, and opens on a right arrow when collapsed', async () => {
    const onWidthChange = jest.fn();
    const user = userEvent.setup();
    renderHandle({ width: SIDEBAR_MIN_WIDTH, onWidthChange });
    handle().focus();

    await user.keyboard('{ArrowLeft}');
    expect(railState()).toBe('collapsed');

    await user.keyboard('{ArrowRight}');
    expect(railState()).toBe('expanded');
    expect(onWidthChange).toHaveBeenLastCalledWith(SIDEBAR_MIN_WIDTH);
  });

  /**
   * The glow is local to the hand: the handle publishes the pointer's height
   * as `--y` and the gradient centres on it. jsdom lays the handle out at
   * y = 0, so the value is the clientY itself. Tracked on hover and through a
   * drag, since the pointer leaves the strip the moment the rail moves.
   */
  it('tracks the pointer height for the glow, hovering and dragging', async () => {
    const user = userEvent.setup();
    renderHandle();

    await user.pointer({ target: handle(), coords: { clientX: 300, clientY: 120 } });
    expect(handle().style.getPropertyValue('--y')).toBe('120px');

    await user.pointer({ keys: '[MouseLeft>]', target: handle(), coords: { clientX: 300, clientY: 120 } });
    await user.pointer({ coords: { clientX: 340, clientY: 480 } });
    expect(handle().style.getPropertyValue('--y')).toBe('480px');
    await user.pointer({ keys: '[/MouseLeft]' });
  });

  /**
   * The rail's width transition is switched off by this mark for exactly the
   * drag's duration. Without it the rail eased towards every pointer event and
   * trailed the hand by most of the travel; left behind after the drag, every
   * later collapse would snap instead of animating.
   */
  it('marks the body for the duration of a drag, and clears it on release', async () => {
    const user = userEvent.setup();
    renderHandle();

    await user.pointer({ keys: '[MouseLeft>]', target: handle() });
    expect(document.body.dataset.resizing).toBe('');

    await user.pointer({ keys: '[/MouseLeft]' });
    expect(document.body.dataset.resizing).toBeUndefined();
  });
});
