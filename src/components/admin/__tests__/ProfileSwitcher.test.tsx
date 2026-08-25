import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { PROFILE_COOKIE } from '@/lib/profile';
import { rememberProfile } from '@/lib/useProfile';
import { SidebarProvider } from '@/components/ui/sidebar';
import ProfileSwitcher, { otherProfile, useStepProfile } from '../ProfileSwitcher';

const push = jest.fn();
const prefetch = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, prefetch }),
}));

/** Where the switcher believes it is. `useProfileEntries` re-reads on a move. */
let pathname = '/client';

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
 * The pill can be picked up and dragged across, which is an accelerator on top
 * of two real links and never the only way to reach anything.
 *
 * jsdom measures the control as zero wide, so the drag is fed the span it would
 * have had: `beginDrag` falls back to 1, meaning one CSS pixel is one whole
 * profile here and the numbers below read as fractions of the way across.
 */
describe('ProfileSwitcher, dragging the pill', () => {
  const dragBy = (dx: number) => {
    const rail = screen.getByRole('navigation', { name: 'Profile' });
    fireEvent.pointerDown(rail, { button: 0, pointerId: 1, clientX: 0 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: dx });
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: dx });
    return rail;
  };

  it('moves to the other profile when released past the halfway point', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    dragBy(0.8);
    expect(push).toHaveBeenCalledWith('/admin');
  });

  it('springs back when released short of it', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    dragBy(0.2);
    expect(push).not.toHaveBeenCalled();
  });

  /** Client is on the left; pulling further left leads nowhere. */
  it('is inert in a direction with no profile in it', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    dragBy(-0.9);
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * The mouse comes up over one of the two links, and that link must not also
   * navigate — frequently it is the half being dragged away from.
   */
  it('suppresses the click the release lands on', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    dragBy(0.8);
    const click = fireEvent.click(screen.getByRole('link', { name: 'Client' }));
    expect(click).toBe(false);
  });

  it('leaves an ordinary click alone', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    dragBy(0);
    const click = fireEvent.click(screen.getByRole('link', { name: 'Admin' }));
    expect(click).toBe(true);
  });

  /** Touch already reaches the rail swipe; two handlers on one finger fight. */
  it('ignores touch', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    const rail = screen.getByRole('navigation', { name: 'Profile' });
    fireEvent.pointerDown(rail, { button: 0, pointerId: 1, clientX: 0, pointerType: 'touch' });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 0.8 });
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 0.8 });
    expect(push).not.toHaveBeenCalled();
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

/**
 * Coming back to a profile means coming back to the page, not the dashboard.
 *
 * A profile is somewhere you are in the middle of something, and the middle of
 * something is a specific record on a specific step. Resetting to the home on
 * every switch made crossing the seam expensive enough to avoid, which defeats
 * having two sides.
 */
describe('reopening where you left off', () => {
  const remember = (profile: string, path: string) => {
    document.cookie = `speclr_last_${profile}=${encodeURIComponent(path)}; path=/`;
  };
  const forget = (profile: string) => {
    document.cookie = `speclr_last_${profile}=; path=/; max-age=0`;
  };

  beforeEach(() => {
    forget('client');
    forget('admin');
  });

  it('sends the other profile to its last page', () => {
    remember('admin', '/admin/employees');
    renderIn(<ProfileSwitcher profile="client" />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute(
      'href',
      '/admin/employees',
    );
  });

  it('keeps the search string, which is where the onboarding step lives', () => {
    remember('admin', '/admin/employees?step=tax');
    renderIn(<ProfileSwitcher profile="client" />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute(
      'href',
      '/admin/employees?step=tax',
    );
  });

  it('falls back to the home when nothing was recorded', () => {
    renderIn(<ProfileSwitcher profile="client" />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  /**
   * The side you are already on is the ordinary "back to the top" affordance.
   * Only the side you are not on resumes.
   */
  it('leaves the current profile pointing at its own home', () => {
    remember('client', '/client/clients/abc?step=tax');
    renderIn(<ProfileSwitcher profile="client" />);
    expect(screen.getByRole('link', { name: 'Client' })).toHaveAttribute('href', '/client');
  });

  it('resumes from the swipe too, so both controls agree', () => {
    remember('admin', '/admin/docs');
    const { result } = renderHook(() => useStepProfile('client'), {
      wrapper: ({ children }) => <SidebarProvider open>{children}</SidebarProvider>,
    });
    result.current(1);
    expect(push).toHaveBeenCalledWith('/admin/docs');
  });

  /**
   * The cookie is client-writable and its value ends up in `redirect()` on `/`,
   * so a path that escapes the profile is refused rather than followed.
   */
  it('refuses a path that is not inside the profile', () => {
    remember('admin', 'https://evil.test/admin');
    renderIn(<ProfileSwitcher profile="client" />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('refuses a path that merely starts with the profile name', () => {
    remember('admin', '/administrator-evil');
    renderIn(<ProfileSwitcher profile="client" />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });
});
