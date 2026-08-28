import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { EditorPanelProvider, EditorPanelContent } from '../EditorPanel';
import EditorSidebar from '../EditorSidebar';
import TopPanel from '../TopPanel';

jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));
// `SearchCommand` calls a Server Action that imports the Neon client — stub it
// so this file doesn't drag a DB connection in.
jest.mock('@/server/actions/search', () => ({ searchAll: jest.fn(async () => []) }));

const navEl = () => document.querySelector('[data-side="left"][data-slot="sidebar"]');
const railEl = () => document.querySelector('[data-side="right"][data-slot="sidebar"]');

function renderPanel(panelContent?: React.ReactNode) {
  return render(
    <EditorPanelProvider>
      <SidebarProvider>
        <TopPanel profile="client" />
        {/* A bare rail, standing in for `AdminSidebar`, so the toggle button
            has a real `data-state` to flip. */}
        <Sidebar collapsible="icon" />
        <EditorSidebar />
        {panelContent}
      </SidebarProvider>
    </EditorPanelProvider>,
  );
}

describe('TopPanel', () => {
  it('renders the wordmark', () => {
    renderPanel();
    expect(screen.getByText('speclr')).toBeInTheDocument();
  });

  /**
   * Neither rail's toggle is in this bar any more: a control that opens a
   * column belongs on the column. The nav's lives in `AdminSidebar`, the
   * editor rail's in `EditorSidebar` — each tested in its own file.
   */
  it('holds no rail toggles', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: /toggle sidebar/i })).not.toBeInTheDocument();
  });

  it('renders the profile switcher and the search field', () => {
    renderPanel();
    expect(screen.getByRole('navigation', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Client' })).toHaveAttribute('href', '/client');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('combobox', { name: /search/i })).toBeInTheDocument();
  });

  it('renders a labelled, inert notifications button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('disables the editor-rail toggle when the page has nothing editable', () => {
    renderPanel();
    const button = screen.getByRole('button', { name: /edit panel/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'No editable content on this page');
  });

  it('expands and collapses the editor rail from its own toggle', async () => {
    const user = userEvent.setup();
    renderPanel(
      <EditorPanelContent>
        <p>Form</p>
      </EditorPanelContent>,
    );

    expect(railEl()).toHaveAttribute('data-state', 'collapsed');
    await user.click(screen.getByRole('button', { name: /expand edit panel/i }));
    expect(railEl()).toHaveAttribute('data-state', 'expanded');

    await user.click(screen.getByRole('button', { name: /collapse edit panel/i }));
    expect(railEl()).toHaveAttribute('data-state', 'collapsed');
  });

  it('names its parts for inspection', () => {
    const { container } = renderPanel();
    expect(container.querySelector('[data-slot="top-panel"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="top-panel-start"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="top-panel-end"]')).toBeInTheDocument();
  });
});
