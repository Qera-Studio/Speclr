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

function renderPanel(
  panelContent?: React.ReactNode,
  /** The inset card, when the test is about the notification drawer landing in it. */
  inset?: React.RefObject<HTMLElement | null>,
) {
  return render(
    <EditorPanelProvider>
      <SidebarProvider>
        <TopPanel inset={inset} />
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
  /**
   * The wordmark moved to the nav rail's header, above the navigation it
   * names. Asserted here as an absence because it was here for a long time and
   * a second copy directly below the first is the failure this prevents — see
   * `AdminSidebar.test.tsx` for the one that checks it renders.
   */
  it('holds no wordmark', () => {
    renderPanel();
    expect(screen.queryByText('speclr')).not.toBeInTheDocument();
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

  /**
   * The switcher moved to the nav rail's footer, above the account card: it
   * chooses which *navigation* is on screen, so it belongs on that column. An
   * absence here, a presence there — see `AdminSidebar.test.tsx` — for the same
   * reason the wordmark is asserted both ways: the failure worth preventing is
   * two copies, one in each place.
   */
  it('holds no profile switcher', () => {
    renderPanel();
    expect(screen.queryByRole('navigation', { name: 'Profile' })).not.toBeInTheDocument();
  });

  it('renders the search field', () => {
    renderPanel();
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
   * The drawer opens *inside* the inset card, and both halves of that are
   * asserted because either one alone does nothing.
   *
   * Portalling it into the card moves only the DOM: a sheet positions itself
   * `fixed`, which resolves to the viewport from wherever it is rendered, so the
   * panel and its scrim would still have covered the whole window while sitting
   * in the right parent. The scrim is the point — a drawer reporting something
   * about the app has no business dimming the nav beside it — so `contained`
   * swaps both to `absolute`, and the card is the positioned box they resolve
   * against.
   */
  it('opens the drawer inside the inset, and positions it against it', async () => {
    const user = userEvent.setup();
    const inset = { current: document.createElement('div') };
    document.body.append(inset.current);
    renderPanel(undefined, inset);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const drawer = await screen.findByRole('dialog');

    expect(inset.current.contains(drawer)).toBe(true);
    expect(drawer).toHaveClass('absolute');
    expect(drawer).not.toHaveClass('fixed');

    // The scrim, which is what actually darkens the card. It is a sibling of
    // the panel rather than an ancestor, so it has to be found on its own.
    const scrim = inset.current.querySelector('[data-slot="sheet-overlay"]');
    expect(scrim).toHaveClass('absolute');
    expect(scrim).not.toHaveClass('fixed');
  });

  /**
   * And with no card it still opens, over the window. `AdminShell` always
   * passes one; this is the degradation for a component rendered on its own,
   * the same one `PageHeaderSlot` makes, because a missing shell must not cost
   * the app its notifications.
   */
  it('falls back to the window with no inset', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(await screen.findByRole('dialog')).toHaveClass('fixed');
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

  /**
   * The editor rail's collapse toggle is gone entirely, not moved here. It was
   * the only control anywhere that could reopen the rail, so a bar offering to
   * shut it would be offering a one-way trip. See `EditorSidebar.test.tsx`.
   */
  it('offers no way to collapse the editor rail', () => {
    renderPanel(
      <EditorPanelContent>
        <p>Form</p>
      </EditorPanelContent>,
    );
    expect(screen.queryByRole('button', { name: /edit panel/i })).not.toBeInTheDocument();
  });

  it('names its parts for inspection', () => {
    const { container } = renderPanel();
    expect(container.querySelector('[data-slot="top-panel"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="top-panel-start"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="top-panel-end"]')).toBeInTheDocument();
  });
});
