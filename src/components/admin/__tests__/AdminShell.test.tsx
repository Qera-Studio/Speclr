import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  // `RememberLocation` reads them to record the exact page, step included.
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));
jest.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// See AdminHeader.test.tsx — the search field pulls in a Server Action.
jest.mock('@/server/actions/search', () => ({ searchAll: jest.fn(async () => []) }));

import AdminShell from '../AdminShell';
import { EditorPanelContent } from '../EditorPanel';
import { NAV_WIDTH } from '../AdminShell';

const user = { name: 'Shivanshu', email: 'shivanshu@qera.studio' } as never;

const renderShell = (children: React.ReactNode = <p>Page body</p>) =>
  render(<AdminShell user={user}>{children}</AdminShell>);

const railEl = () => document.querySelector('[data-side="right"][data-slot="sidebar"]');
const navEl = () => document.querySelector('[data-side="left"][data-slot="sidebar"]');

describe('AdminShell', () => {
  it('renders the nav and the content card', () => {
    renderShell();
    expect(navEl()).toBeInTheDocument();
    expect(screen.getByText('Page body')).toBeInTheDocument();
  });

  /**
   * The rail follows the page, not the shell: it is absent until something on
   * the page registers a panel, and back once one does. The seam between the
   * inset and the rail goes with it, since a border drawn against nothing is a
   * stroke down the right edge of the window.
   */
  it('has no editor rail until a page registers a panel', () => {
    const { rerender } = renderShell();
    expect(railEl()).not.toBeInTheDocument();

    rerender(
      <AdminShell user={user}>
        <EditorPanelContent title="Edit">
          <p>Fields</p>
        </EditorPanelContent>
      </AdminShell>,
    );
    expect(railEl()).toBeInTheDocument();
  });

  // Two widths, toggled: this one and `--sidebar-width-icon`. Deliberately a
  // constant rather than measured from the nav's content — see `NAV_WIDTH`.
  it('fixes the nav at one width', () => {
    const { container } = renderShell();
    const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe(`${NAV_WIDTH}px`);
    // 3rem, not 2.5: a collapsed menu button is `size-8` inside `SidebarGroup`'s
    // `px-2`, so 8 + 32 + 8 is the width at which a row has equal air on both
    // sides. At 2.5rem the right-hand 8px had nowhere to go.
    expect(wrapper.style.getPropertyValue('--sidebar-width-icon')).toBe('3rem');
  });

  it('offers no drag-resize control while resizing is parked', () => {
    renderShell();
    expect(screen.queryByRole('separator', { name: /resize sidebar/i })).not.toBeInTheDocument();
  });

  it('hosts page content portalled into the rail', () => {
    renderShell(
      <EditorPanelContent title="New invoice" autoOpen>
        <label>
          Client
          <input />
        </label>
      </EditorPanelContent>,
    );
    const field = screen.getByLabelText('Client');
    expect(railEl()).toContainElement(field);
  });

  /**
   * Both rails share one `SidebarProvider`. Cmd+B belongs to the nav; if it also
   * moved the editor rail, the open form would collapse out from under the user.
   */
  it('toggles only the nav with Meta+B', async () => {
    const u = userEvent.setup();
    renderShell(
      <EditorPanelContent autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );
    expect(navEl()).toHaveAttribute('data-state', 'expanded');
    expect(railEl()).toHaveAttribute('data-state', 'expanded');

    await u.keyboard('{Meta>}b{/Meta}');
    expect(navEl()).toHaveAttribute('data-state', 'collapsed');
    expect(railEl()).toHaveAttribute('data-state', 'expanded');
  });

});
