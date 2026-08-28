import { render, screen, within } from '@testing-library/react';
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

  /**
   * The bell opens a drawer rather than being decoration. Nothing produces a
   * notification yet, so what it opens says so in those words — an invented
   * list would be a fabricated record in an app whose point is records that
   * are not.
   */
  it('opens the notifications drawer from the bell', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('Nothing to report')).toBeInTheDocument();
  });

  /**
   * The clock is a reading and the bell is a control, so a hairline sits
   * between them. It is decoration: the two names already separate them for a
   * reader who cannot see it, which is why it is `aria-hidden` and does not
   * announce as a separator.
   */
  it('separates the clock from the bell without announcing it', () => {
    const { container } = renderPanel();
    const end = container.querySelector('[data-slot="top-panel-end"]') as HTMLElement;
    const rule = end.querySelector('[data-slot="separator"]');
    expect(rule).toBeInTheDocument();
    expect(rule).toHaveAttribute('aria-hidden', 'true');

    // The bell is last, after the date and time. `compareDocumentPosition` is
    // the ordering the reader tabs in as well as the one they see.
    const bell = within(end).getByRole('button', { name: /notifications/i });
    expect(
      rule!.compareDocumentPosition(bell) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
