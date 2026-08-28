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
  // The wordmark, sidebar toggle and ProfileSwitcher moved to `TopPanel` —
  // see `TopPanel.test.tsx` and `ProfileSwitcher.test.tsx` for their coverage.

  describe('client profile', () => {
    /**
     * Five rows, no headings: Dashboard, the records page (named for the
     * section, like admin's rail row), then the three library pages.
     */
    it('shows five rows and nothing else', () => {
      renderSidebar({ profile: 'client' });
      const labels = within(liveNav('client'))
        .getAllByRole('link')
        .map((link) => link.textContent);
      expect(labels).toEqual([
        'Dashboard',
        'Clients',
        'Service catalogue',
        'Clause library',
        'Checklist',
      ]);
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
      expect(within(nav).queryByText('Documents')).not.toBeInTheDocument();
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

  it('no longer lists Settings in the nav — it moved into the account menu', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('marks the active route with aria-current', () => {
    renderSidebar({ profile: 'client', at: '/client/clients' });
    expect(
      within(liveNav('client')).getByRole('link', { name: 'Clients' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
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

  it('renders the account card with name, email, and a menu trigger', () => {
    renderSidebar();
    // The card shows the user's name and email...
    expect(screen.getByText('Shivanshu Pareek')).toBeInTheDocument();
    expect(screen.getByText('ops@qera.studio')).toBeInTheDocument();
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
