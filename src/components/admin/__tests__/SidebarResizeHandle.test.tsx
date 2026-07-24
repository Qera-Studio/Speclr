import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarResizeHandle, {
  clampWidth,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
} from '../SidebarResizeHandle';

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

describe('SidebarResizeHandle', () => {
  it('exposes an accessible resize separator with the current value', () => {
    render(<SidebarResizeHandle width={SIDEBAR_DEFAULT_WIDTH} onWidthChange={() => {}} />);
    const handle = screen.getByRole('separator', { name: /resize sidebar/i });
    expect(handle).toHaveAttribute('aria-valuenow', String(SIDEBAR_DEFAULT_WIDTH));
    expect(handle).toHaveAttribute('aria-valuemin', String(SIDEBAR_MIN_WIDTH));
    expect(handle).toHaveAttribute('aria-valuemax', String(SIDEBAR_MAX_WIDTH));
  });

  it('nudges width right/left with arrow keys, clamped', async () => {
    const onWidthChange = jest.fn();
    const user = userEvent.setup();
    render(<SidebarResizeHandle width={SIDEBAR_DEFAULT_WIDTH} onWidthChange={onWidthChange} />);
    const handle = screen.getByRole('separator', { name: /resize sidebar/i });

    handle.focus();
    await user.keyboard('{ArrowRight}');
    expect(onWidthChange).toHaveBeenCalledWith(SIDEBAR_DEFAULT_WIDTH + 16);

    await user.keyboard('{ArrowLeft}');
    expect(onWidthChange).toHaveBeenCalledWith(SIDEBAR_DEFAULT_WIDTH - 16);
  });

  it('does not exceed the max when nudging right near the limit', async () => {
    const onWidthChange = jest.fn();
    const user = userEvent.setup();
    render(<SidebarResizeHandle width={SIDEBAR_MAX_WIDTH} onWidthChange={onWidthChange} />);
    screen.getByRole('separator', { name: /resize sidebar/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onWidthChange).toHaveBeenCalledWith(SIDEBAR_MAX_WIDTH);
  });
});
