import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { Profile } from '@/lib/profile';
import AdminSidebar from '../AdminSidebar';
import { NewDocumentProvider } from '../NewDocumentCommand';

const mockPush = jest.fn();
let pathname = '/client/clients';
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
}));
jest.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// The rail holds `SearchCommand` since 18 September 2026, and it calls a Server
// Action that imports the Neon client. Unstubbed, this suite fails to run at
// all (`TextDecoder is not defined`) rather than failing an assertion. Same
// stub, same reason, as `TopPanel.test.tsx` used while search lived there.
jest.mock('@/server/actions/search', () => ({ searchAll: jest.fn(async () => []) }));

const user = { name: 'Shivanshu Pareek', email: 'ops@qera.studio', imageUrl: undefined };

/** The exposed half of the track. The other is rendered but `aria-hidden`. */
const liveNav = (profile: Profile) =>
  screen.getByRole('navigation', {
    name: profile === 'client' ? 'Client navigation' : 'Admin navigation',
  });

function renderSidebar({
  open = true,
  profile = 'client' as Profile,
  at,
}: { open?: boolean; profile?: Profile; at?: string } = {}) {
  pathname = at ?? (profile === 'client' ? '/client/clients' : '/admin/employees');
  return render(
    <NewDocumentProvider profile={profile}>
      <SidebarProvider defaultOpen={open}>
        <AdminSidebar user={user} profile={profile} />
      </SidebarProvider>
    </NewDocumentProvider>,
  );
}

describe('AdminSidebar', () => {
  // The wordmark and this rail's own toggle are here, in its header. The
  // profile switcher is here too, at the foot — its own behaviour is covered
  // in `ProfileSwitcher.test.tsx`; what this file pins is the placement.

  it('carries the wordmark above the navigation', () => {
    renderSidebar({ profile: 'client' });
    expect(screen.getByText('speclr')).toBeInTheDocument();
  });

  /**
   * The switcher moved out of `TopPanel` and into this rail's footer, above the
   * account card. It chooses which navigation is on screen, so it belongs on
   * the column that navigation is in.
   *
   * Asserted as *order within the footer* rather than mere presence: "above the
   * account card" is the whole of what was asked for, and a switcher rendered
   * below it would pass a presence check.
   */
  it('carries the profile switcher above the account card', () => {
    renderSidebar({ profile: 'client' });
    const footer = document.querySelector('[data-slot="sidebar-footer"]');
    expect(footer).not.toBeNull();

    const switcher = within(footer as HTMLElement).getByRole('navigation', { name: 'Profile' });
    const account = within(footer as HTMLElement).getByRole('button', { name: /shivanshu pareek/i });

    expect(
      switcher.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  /**
   * A rule between the two, because they are different kinds of thing: one
   * chooses a navigation, the other is the person using it. Asserted as
   * *between*, not merely present, since a separator above the switcher or
   * below the card would satisfy a presence check and fix nothing.
   */
  it('rules off the switcher from the account card', () => {
    renderSidebar({ profile: 'client' });
    const footer = document.querySelector('[data-slot="sidebar-footer"]') as HTMLElement;

    const switcher = within(footer).getByRole('navigation', { name: 'Profile' });
    const rule = footer.querySelector('[data-slot="separator"]');
    const account = within(footer).getByRole('button', { name: /shivanshu pareek/i });
    expect(rule).not.toBeNull();

    expect(switcher.compareDocumentPosition(rule!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rule!.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  /**
   * The collapsed strip says which profile is showing.
   *
   * It said nothing before: the pill hides at 3rem, so the one thing the rail
   * could not tell you was which of two applications you were in. The row that
   * replaces it is the active profile's icon, and it switches, so the name it
   * announces has to carry both halves — where you are and where the click
   * goes. Both widths render it; CSS decides which is seen, which jsdom cannot,
   * so what is pinned here is the name rather than the visibility.
   */
  it('names the active profile in a row that switches away from it', () => {
    renderSidebar({ profile: 'client' });
    const footer = document.querySelector('[data-slot="sidebar-footer"]') as HTMLElement;

    const row = within(footer).getByRole('link', { name: /Client, switch to Admin/i });
    expect(row).toHaveAttribute('href', '/admin');
  });

  describe('client profile', () => {
    /**
     * Seven rows, no headings, and the *order* is the assertion: Dashboard,
     * Documents (the home), Clients, the create row, then the three library
     * pages.
     *
     * Dashboard leads because it is the summary of what Documents lists. It was
     * a tab over that page, which had one page answering to two names; it is a
     * destination of its own now, so it is a row like every other.
     *
     * Clients sits above the create row rather than below it because the
     * client record is what every document derives from (`CONTEXT.md` §5d).
     * Read on links alone this order was unpinned — "New document" is a button,
     * so an earlier version of this test passed either way round, which is why
     * it queries both roles together.
     */
    it('shows eight rows, in order, and nothing else', () => {
      renderSidebar({ profile: 'client' });
      const labels = Array.from(
        liveNav('client').querySelectorAll('[data-slot="sidebar-menu-item"]'),
      ).map((el) => el.textContent);
      expect(labels).toEqual([
        'Dashboard',
        'Documents',
        'Clients',
        // The create row carries its own ⌘D hint.
        'New documentCtrlD',
        'Service catalogue',
        'Clause library',
        'Checklist',
        'Components',
      ]);
    });

    it('sends Dashboard to its own page', () => {
      renderSidebar({ profile: 'client' });
      expect(within(liveNav('client')).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'href',
        '/client/dashboard',
      );
    });

    it('sends Records to the clients page', () => {
      renderSidebar({ profile: 'client' });
      expect(within(liveNav('client')).getByRole('link', { name: 'Clients' })).toHaveAttribute(
        'href',
        '/client/clients',
      );
    });

    /**
     * The document types are still in `nav.ts` — the ⌘D palette and the ⌥
     * shortcuts read them — just not in the rail. The create button stays,
     * which is what the client rail has that admin's does not.
     */
    it('does not list the document types itself', () => {
      renderSidebar({ profile: 'client' });
      for (const label of ['Contract', 'Invoice', 'Receipt']) {
        expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
      }
      expect(
        within(liveNav('client')).getByRole('button', { name: /new document/i }),
      ).toBeInTheDocument();
    });

    /** The two halves are sealed: nothing admin-side is reachable from here. */
    it('shows nothing from the admin profile', () => {
      renderSidebar({ profile: 'client' });
      for (const label of ['Employees', 'Pay slip', 'Stipend', 'Icon spec', 'CTC calculator']) {
        expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
      }
    });

    /**
     * Every tool is the studio's own instrument, so Client has none of admin's.
     * What it has instead is the contract source material: the Services a
     * contract pulls in as Parts, and the clauses it is built from.
     */
    it('links the library pages and names no section', () => {
      renderSidebar({ profile: 'client' });
      const nav = liveNav('client');
      expect(within(nav).queryByText('Library')).not.toBeInTheDocument();
      // As a *heading*, like Records below. The home row is a link named
      // Documents, which is the page it goes to rather than a section.
      expect(within(nav).queryByText('Documents', { selector: 'div' })).not.toBeInTheDocument();
      expect(within(nav).queryByText('Records', { selector: 'div' })).not.toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: 'Service catalogue' })).toHaveAttribute(
        'href',
        '/client/services',
      );
      expect(within(nav).getByRole('link', { name: 'Clause library' })).toHaveAttribute(
        'href',
        '/client/clauses',
      );
      expect(within(nav).getByRole('link', { name: 'Checklist' })).toHaveAttribute(
        'href',
        '/client/checklist',
      );
    });
  });

  /**
   * Admin is trialling a flattened rail (August 2026): four rows, no section
   * headings, no create button, each row leading to an index page. It is
   * switched on by the `rail` field in `nav.ts` and switched off by deleting it
   * — which is why the client block above asserts the grouped shape and this
   * one asserts the flat one, from the same component.
   */
  describe('admin profile, flat rail', () => {
    it('shows four rows and nothing else', () => {
      renderSidebar({ profile: 'admin' });
      const nav = liveNav('admin');
      const labels = within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent);
      expect(labels).toEqual(['Dashboard', 'Records', 'Documents', 'Tools']);
    });

    it('sends Records straight to the one record page it stands for', () => {
      renderSidebar({ profile: 'admin' });
      expect(screen.getByRole('link', { name: 'Records' })).toHaveAttribute(
        'href',
        '/admin/employees',
      );
    });

    it('names no section, because there are no sections left', () => {
      renderSidebar({ profile: 'admin' });
      const nav = liveNav('admin');
      expect(within(nav).queryByText('Records', { selector: 'div' })).not.toBeInTheDocument();
      expect(within(nav).queryByText('Tools', { selector: 'div' })).not.toBeInTheDocument();
    });

    /**
     * The document types moved onto `/admin/docs`. They are still in `nav.ts`
     * — the ⌘D palette and the ⌥ shortcuts read them — just not in the rail.
     */
    it('does not list the document types itself', () => {
      renderSidebar({ profile: 'admin' });
      for (const label of ['Offer letter', 'Stipend', 'Pay slip', 'Exit letter']) {
        expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
      }
      expect(screen.getByRole('link', { name: 'Documents' })).toHaveAttribute(
        'href',
        '/admin/docs',
      );
    });

    it('drops the create button — ⌘D is the way in now', () => {
      renderSidebar({ profile: 'admin' });
      expect(
        within(liveNav('admin')).queryByRole('button', { name: /new document/i }),
      ).not.toBeInTheDocument();
    });

    it('shows nothing from the client profile', () => {
      renderSidebar({ profile: 'admin' });
      for (const label of ['Clients', 'Invoice', 'Receipt', 'Contract']) {
        expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
      }
    });

    /**
     * Icon spec and UI Kit live at `/admin/spec` and `/admin/kit`, not under
     * `/admin/tools` — so href matching alone would send the row dark on two of
     * the four pages it had just offered. `covers` is what stops that.
     */
    it('keeps Tools lit on a page that its index links to but does not contain', () => {
      renderSidebar({ profile: 'admin', at: '/admin/spec' });
      expect(screen.getByRole('link', { name: 'Tools' })).toHaveAttribute('aria-current', 'page');
    });

    it('lights Documents on one document, not just on the type list', () => {
      renderSidebar({ profile: 'admin', at: '/admin/docs/some-uuid' });
      expect(screen.getByRole('link', { name: 'Documents' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    /**
     * Every admin URL starts with `/admin`, so the prefix rule the other rows
     * use would leave Dashboard permanently lit and "where am I?" unanswered.
     */
    it('lights Dashboard only on the home itself', () => {
      renderSidebar({ profile: 'admin', at: '/admin/employees' });
      expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.getByRole('link', { name: 'Records' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  });

  it('keeps the links reachable when the rail is collapsed', () => {
    renderSidebar({ open: false, profile: 'client' });
    expect(screen.getByRole('link', { name: 'Clause library' })).toHaveAttribute(
      'href',
      '/client/clauses',
    );
  });

  /**
   * The collapse toggle moved here out of `TopPanel`, which is one unbroken
   * band now with nothing to do with either column. It sits outside
   * `SidebarContent`, so it neither rides the profile track nor disappears
   * with the collapse it performs — a toggle you cannot reach once you have
   * used it is a one-way door.
   */
  it('carries its own collapse toggle, still reachable once collapsed', async () => {
    const clicker = userEvent.setup();
    const { container } = renderSidebar();
    const rail = () => container.querySelector('[data-slot="sidebar"]');
    expect(rail()).toHaveAttribute('data-state', 'expanded');

    await clicker.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(rail()).toHaveAttribute('data-state', 'collapsed');
    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();
  });

  /**
   * Collapsing docks the rail as a plain icon strip: `data-collapsible="icon"`
   * drives every label-hiding rule in `ui/sidebar.tsx`, and no `data-float`,
   * because the floating variant is parked (15 September 2026). Hovering the
   * strip must not grow it: the peek belongs to the float, and a strip that
   * opened on hover would be the float with the position change missing.
   */
  it('docks as a plain icon strip when collapsed, and stays put on hover', async () => {
    const clicker = userEvent.setup();
    const { container } = renderSidebar();
    const rail = () => container.querySelector('[data-slot="sidebar"]')!;
    const strip = () => container.querySelector('[data-slot="sidebar-container"]')!;

    await clicker.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(rail()).toHaveAttribute('data-collapsible', 'icon');
    expect(rail()).not.toHaveAttribute('data-float');

    await clicker.unhover(strip());
    await clicker.hover(strip());
    expect(rail()).not.toHaveAttribute('data-peek');
    expect(rail()).toHaveAttribute('data-collapsible', 'icon');
  });
});

/**
 * Parked with the floating collapse in `AdminSidebar`, 15 September 2026.
 * Skipped rather than deleted: these pin the float's attribute contract and
 * come back with it. Unskip when `collapsible="float"` is restored.
 */
describe.skip('AdminSidebar, floating collapse (parked)', () => {
  /**
   * Collapsing detaches the rail: it leaves its panel and becomes a floating
   * pill rather than a thin column welded to the window's edge.
   *
   * `data-float` is the attribute the position, radius and shadow key off,
   * while `data-collapsible="icon"` keeps every existing icon-rail rule (the
   * label hiding, the `size-8` buttons) matching unchanged. Both matter: the
   * float is a *position* change layered on the collapse, not a replacement
   * for it, and asserting only one would let the other quietly regress.
   *
   * The geometry itself, that it travels rather than snaps, and that the pill
   * never overlaps the content card, is browser work. jsdom measures every
   * box as zero.
   */
  it('detaches into a floating pill when collapsed', async () => {
    const clicker = userEvent.setup();
    const { container } = renderSidebar();
    const rail = () => container.querySelector('[data-slot="sidebar"]')!;
    expect(rail()).not.toHaveAttribute('data-float');

    await clicker.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(rail()).toHaveAttribute('data-float');
    expect(rail()).toHaveAttribute('data-collapsible', 'icon');
  });

  /**
   * Hovering the pill grows it back to full width *without* re-docking it, so
   * `data-float` survives while `data-collapsible` is cleared. Clearing that
   * one attribute is the whole mechanism: every label-hiding rule in
   * `ui/sidebar.tsx` reads it, so the labels come back without a second copy
   * of a dozen selectors.
   *
   * `data-state` deliberately stays `collapsed` throughout: the peek is a
   * third *visual* state, not a fourth open state, and only the toggle docks.
   */
  it('grows on hover without re-docking, and shrinks again on leave', async () => {
    const clicker = userEvent.setup();
    const { container } = renderSidebar();
    const rail = () => container.querySelector('[data-slot="sidebar"]')!;
    const pill = () => container.querySelector('[data-slot="sidebar-container"]')!;
    await clicker.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    // The pointer is still on the rail after that click, and the suppression
    // above holds until it leaves. This is a hover arriving fresh.
    await clicker.unhover(pill());

    await clicker.hover(pill());
    expect(rail()).toHaveAttribute('data-peek');
    expect(rail()).toHaveAttribute('data-float');
    expect(rail()).toHaveAttribute('data-collapsible', '');
    expect(rail()).toHaveAttribute('data-state', 'collapsed');

    await clicker.unhover(pill());
    expect(rail()).not.toHaveAttribute('data-peek');
    expect(rail()).toHaveAttribute('data-collapsible', 'icon');
  });

  /**
   * Hover is a mouse affordance, so focus must do the same or the app's
   * primary navigation is behind a pointer (WCAG 2.1.1). Tabbing *between*
   * rows inside the rail must not read as leaving it, which is what the
   * containment check on `onBlurCapture` is for.
   */
  it('grows on focus too, and holds while focus moves between its rows', async () => {
    const clicker = userEvent.setup();
    const { container } = renderSidebar({ profile: 'client' });
    const rail = () => container.querySelector('[data-slot="sidebar"]')!;
    const pill = () => container.querySelector('[data-slot="sidebar-container"]')!;
    await clicker.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    await clicker.unhover(pill());

    await act(async () => {
      screen.getByRole('link', { name: 'Documents' }).focus();
    });
    expect(rail()).toHaveAttribute('data-peek');

    // Moving *between* rows must not read as leaving the rail.
    await act(async () => {
      screen.getByRole('link', { name: 'Clause library' }).focus();
    });
    expect(rail()).toHaveAttribute('data-peek');
  });

  /**
   * An expanded rail is already its full width in its own panel, so hovering
   * it has nothing to reveal. Without this guard the peek would fire on every
   * pass of the mouse and leave a stale `peeking` set for the next collapse.
   */
  it('ignores hover while docked', async () => {
    const clicker = userEvent.setup();
    const { container } = renderSidebar();
    const rail = () => container.querySelector('[data-slot="sidebar"]')!;
    const pill = () => container.querySelector('[data-slot="sidebar-container"]')!;

    await clicker.hover(pill());
    expect(rail()).not.toHaveAttribute('data-peek');
    expect(rail()).toHaveAttribute('data-state', 'expanded');
  });
});

describe('AdminSidebar, the rest', () => {
  it('no longer lists Settings in the nav — it moved into the account menu', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('marks the active route with aria-current', () => {
    renderSidebar({ profile: 'client', at: '/client/clients' });
    expect(
      within(liveNav('client')).getByRole('link', { name: 'Clients' }),
    ).toHaveAttribute('aria-current', 'page');
    // Scoped to the live nav: the admin nav is rendered too, and its own
    // Documents row would otherwise make this ambiguous.
    expect(
      within(liveNav('client')).getByRole('link', { name: 'Documents' }),
    ).not.toHaveAttribute('aria-current', 'page');
  });

  /**
   * Both profiles' navs are rendered — the drag gesture slides a track between
   * them — but only the current one is exposed. Without `aria-hidden` on the
   * other, a screen reader would be offered two Dashboards and two of every
   * document link.
   */
  it('hides the off-screen profile from assistive tech', () => {
    renderSidebar({ profile: 'client' });
    expect(screen.getByRole('navigation', { name: 'Client navigation' })).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Admin navigation' }),
    ).not.toBeInTheDocument();
  });

  /**
   * jsdom computes no layout, so this asserts the class rather than the pixels
   * — which is the only thing it can see, and this is worth seeing: with the
   * bodies at `w-full` of a `w-[200%]` track each was two rails wide, the
   * track only ever slides one, and the admin nav rendered off-screen. The
   * whole sidebar came up empty and every other test here still passed.
   */
  it('gives each profile half the track, so the second one is on-screen', () => {
    renderSidebar({ profile: 'admin' });
    const nav = liveNav('admin');
    expect(nav).toHaveClass('w-1/2');
    expect(nav.parentElement).toHaveClass('w-[200%]');
  });

  it('offers a create button that opens the document palette', async () => {
    const u = userEvent.setup();
    renderSidebar();
    const create = screen.getByRole('button', { name: /new document/i });
    expect(create).toHaveAttribute('aria-haspopup', 'dialog');
    await u.click(create);
    expect(await screen.findByRole('dialog', { name: /new document/i })).toBeInTheDocument();
  });

  it('renders the account card as one row: name and a menu trigger, no email', () => {
    renderSidebar();
    // The card shows the user's name; the email lives in the menu's header.
    expect(screen.getByText('Shivanshu Pareek')).toBeInTheDocument();
    expect(screen.queryByText('ops@qera.studio')).not.toBeInTheDocument();
    // ...and is a menu trigger (the dropdown open + Sign out is verified in-browser —
    // Base UI's menu-on-pointer-click doesn't open in jsdom when the trigger holds an Avatar).
    const trigger = screen.getByRole('button', { name: /shivanshu pareek/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  /**
   * Theme moved into that menu. Asserted as an absence from the footer because
   * the menu's contents are only in the DOM once it opens, and Base UI's
   * menu-on-pointer-click does not open in jsdom behind an Avatar — the items
   * themselves are checked in `ThemeToggle`'s own test.
   */
  it('no longer shows the theme control in the rail', () => {
    renderSidebar();
    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });
});

/**
 * What happens in the second between committing a swipe and the route arriving.
 *
 * The track slides at once, so the profile you are looking at is no longer the
 * one the `profile` prop names — and `live` decides `inert`. Derived from the
 * prop, as it was at first, the nav you were staring at was removed from the
 * tab order, the accessibility tree and hit-testing for the whole of that
 * second: visibly there, completely dead. That is a worse bug than the
 * snap-back it came in with, because it looks like it works.
 */
describe('AdminSidebar mid-swipe, before the route lands', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  /** Past `COMMIT_AT` of the hook's `SPAN`, then past its idle timeout. */
  function swipeToTheNextProfile() {
    const rail = document.querySelector('[data-slot="sidebar"]')!;
    act(() => {
      rail.dispatchEvent(
        new WheelEvent('wheel', { deltaX: 200, deltaY: 0, bubbles: true, cancelable: true }),
      );
    });
    act(() => void jest.advanceTimersByTime(200));
  }

  it('hands over to the profile now on screen rather than the one being loaded', () => {
    renderSidebar({ profile: 'client' });
    expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).not.toBeInTheDocument();

    swipeToTheNextProfile();

    // Exposed — so it is focusable and clickable — even though `profile` is
    // still 'client' and will be until the navigation completes.
    const admin = screen.getByRole('navigation', { name: 'Admin navigation' });
    expect(admin).not.toHaveAttribute('aria-hidden');
    expect(screen.getByRole('link', { name: 'Records' })).toHaveAttribute(
      'href',
      '/admin/employees',
    );
  });

  it('hides the profile that has scrolled away', () => {
    renderSidebar({ profile: 'client' });
    swipeToTheNextProfile();

    expect(
      screen.queryByRole('navigation', { name: 'Client navigation' }),
    ).not.toBeInTheDocument();
  });
});
