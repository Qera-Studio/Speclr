import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import { EditorPanelProvider, EditorPanelContent } from '../EditorPanel';
import EditorSidebar from '../EditorSidebar';

const push = jest.fn();
let pathname = '/admin/docs/new/exit-letter';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

beforeEach(() => {
  push.mockClear();
  pathname = '/admin/docs/new/exit-letter';
});

function renderRail(panel?: React.ReactNode) {
  return render(
    <EditorPanelProvider>
      <SidebarProvider>
        <EditorSidebar />
        {panel}
      </SidebarProvider>
    </EditorPanelProvider>,
  );
}

const expandButton = () => screen.getByRole('button', { name: /edit panel/i });

describe('EditorSidebar', () => {
  it('disables the expand button when the page has nothing editable', () => {
    renderRail();
    const button = expandButton();
    expect(button).toBeDisabled();
    // A disabled control must say why it is disabled.
    expect(button).toHaveAttribute('title', 'No editable content on this page');
  });

  it('enables the expand button once a panel registers', () => {
    renderRail(
      <EditorPanelContent>
        <p>Form</p>
      </EditorPanelContent>,
    );
    expect(expandButton()).toBeEnabled();
  });

  it('expands and collapses on click', async () => {
    const user = userEvent.setup();
    renderRail(
      <EditorPanelContent>
        <p>Form</p>
      </EditorPanelContent>,
    );
    const rail = () => document.querySelector('[data-side="right"][data-slot="sidebar"]');

    expect(rail()).toHaveAttribute('data-state', 'collapsed');
    await user.click(screen.getByRole('button', { name: /expand edit panel/i }));
    expect(rail()).toHaveAttribute('data-state', 'expanded');

    await user.click(screen.getByRole('button', { name: /collapse edit panel/i }));
    expect(rail()).toHaveAttribute('data-state', 'collapsed');
  });

  it('shows the panel title when one is published', () => {
    renderRail(
      <EditorPanelContent title="New contract" autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );
    expect(screen.getByText('New contract')).toBeInTheDocument();
  });

  /**
   * The rail shares one `SidebarProvider` with the nav, so it must not collapse
   * when the nav does — that independence is the whole point of the `state`
   * override on `Sidebar`.
   */
  it('stays expanded when the nav is toggled with Meta+B', async () => {
    const user = userEvent.setup();
    renderRail(
      <EditorPanelContent autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );
    const rail = () => document.querySelector('[data-side="right"][data-slot="sidebar"]');
    expect(rail()).toHaveAttribute('data-state', 'expanded');

    await user.keyboard('{Meta>}b{/Meta}');
    expect(rail()).toHaveAttribute('data-state', 'expanded');
  });
});

/**
 * People reach for a back arrow before a collapse icon, so the rail header has
 * one. It leaves the page — where a draft's unsaved edits live — so it asks
 * first rather than navigating on the click.
 */
describe('the back arrow', () => {
  const openRail = async (user: ReturnType<typeof userEvent.setup>) => {
    renderRail(
      <EditorPanelContent title="Nirmit Agarwal's exit letter" autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );
    await user.click(screen.getByRole('button', { name: 'Go back' }));
  };

  it('asks before leaving, and does not navigate on the click alone', async () => {
    const user = userEvent.setup();
    await openRail(user);

    expect(screen.getByText('Leave this page?')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('goes to the document type list once confirmed', async () => {
    const user = userEvent.setup();
    await openRail(user);
    await user.click(screen.getByRole('button', { name: 'Leave' }));

    expect(push).toHaveBeenCalledWith('/admin/docs/exit-letter');
  });

  /**
   * The rail lives in the admin layout, which navigation does not unmount — so
   * unlike every other confirmation in the app, nothing else takes this dialog
   * off screen. It stayed up over the newly loaded page.
   */
  it('dismisses itself on leaving, not relying on the page unmounting it', async () => {
    const user = userEvent.setup();
    await openRail(user);
    await user.click(screen.getByRole('button', { name: 'Leave' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('stays put when the user cancels', async () => {
    const user = userEvent.setup();
    await openRail(user);
    await user.click(screen.getByRole('button', { name: 'Stay' }));

    expect(push).not.toHaveBeenCalled();
  });
});
