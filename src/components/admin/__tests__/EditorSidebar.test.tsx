import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import { EditorPanelProvider, EditorPanelContent } from '../EditorPanel';
import EditorSidebar from '../EditorSidebar';

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
