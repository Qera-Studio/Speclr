import { render, renderHook, screen } from '@testing-library/react';
import { PROFILE_COOKIE } from '@/lib/profile';
import { rememberProfile } from '@/lib/useProfile';
import { SidebarProvider } from '@/components/ui/sidebar';
import ProfileSwitcher, { otherProfile, useStepProfile } from '../ProfileSwitcher';

const push = jest.fn();
const prefetch = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, prefetch }) }));

beforeEach(() => {
  jest.clearAllMocks();
  document.cookie = `${PROFILE_COOKIE}=; path=/; max-age=0`;
});

/** The switcher reads the rail's open state, so it needs the provider. */
const renderIn = (ui: React.ReactNode, open = true) =>
  render(<SidebarProvider open={open}>{ui}</SidebarProvider>);

describe('ProfileSwitcher, expanded', () => {
  /**
   * Links, not a tablist. `ui/tabs.tsx` is the closer visual match, but
   * `role="tablist"` promises a screen reader that activating a tab swaps a
   * panel in place — these navigate to another page.
   */
  it('renders two links inside a named nav landmark', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    expect(screen.getByRole('navigation', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Client' })).toHaveAttribute('href', '/client');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('marks only the current profile', () => {
    renderIn(<ProfileSwitcher profile="admin" />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Client' })).not.toHaveAttribute('aria-current');
  });
});

/**
 * Collapsed, the pair becomes one square.
 *
 * Two rows stacked into the icon rail made a tall oval that lined up with
 * nothing — the nav rows below are 32px squares, and a two-row control cannot
 * be one. So the rail shows the *current* profile and links to the other, the
 * same affordance `ThemeToggle` uses one group down.
 */
describe('ProfileSwitcher, collapsed', () => {
  it('shows one control that leads to the other profile', () => {
    renderIn(<ProfileSwitcher profile="client" />, false);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/admin');
  });

  it('names where you are and where the control goes', () => {
    renderIn(<ProfileSwitcher profile="admin" />, false);

    expect(
      screen.getByRole('link', { name: 'Profile: Admin. Switch to Client' }),
    ).toBeInTheDocument();
  });
});

describe('otherProfile', () => {
  it('is total — with two profiles there is no fallback to reason about', () => {
    expect(otherProfile('client')).toBe('admin');
    expect(otherProfile('admin')).toBe('client');
  });
});

/**
 * Remembering lives in `AdminShell`, off wherever you *landed* — not on this
 * component's click. Several routes move you between profiles (the switcher,
 * the swipe, the Settings link in the account menu, a pasted URL), and hanging
 * the memory off one of them left the others disagreeing with what `/` reopens.
 */
describe('rememberProfile', () => {
  it('writes a cookie the layout can read on the next full load', () => {
    rememberProfile('admin');
    expect(document.cookie).toContain(`${PROFILE_COOKIE}=admin`);
    rememberProfile('client');
    expect(document.cookie).toContain(`${PROFILE_COOKIE}=client`);
  });
});

describe('useStepProfile', () => {
  it('steps to the next profile and lands on its home', () => {
    const { result } = renderHook(() => useStepProfile('client'));
    result.current(1);
    expect(push).toHaveBeenCalledWith('/admin');
  });

  it('steps back the other way', () => {
    const { result } = renderHook(() => useStepProfile('admin'));
    result.current(-1);
    expect(push).toHaveBeenCalledWith('/client');
  });

  /**
   * No wrapping. With two profiles a wrapping step would make every swipe
   * switch regardless of direction, which turns the gesture into a toggle and
   * loses the spatial sense — Client is on the left, so swiping further left
   * from it should do nothing at all.
   */
  it('does nothing when the step falls off either end', () => {
    const { result: fromClient } = renderHook(() => useStepProfile('client'));
    fromClient.current(-1);
    const { result: fromAdmin } = renderHook(() => useStepProfile('admin'));
    fromAdmin.current(1);
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * With two profiles and a gesture that reaches the other one at any moment,
   * this is a prefetch with an unusually good hit rate. It is what stops the
   * swipe paying for a Clerk round trip and a Neon query in front of you — the
   * visible switcher is a `<Link>` and prefetches itself, but only in
   * production, and the gesture can fire without the pointer ever touching it.
   */
  it('warms the other profile before it is asked for', () => {
    renderHook(() => useStepProfile('client'));
    expect(prefetch).toHaveBeenCalledWith('/admin');
    expect(prefetch).not.toHaveBeenCalledWith('/client');
  });
});
