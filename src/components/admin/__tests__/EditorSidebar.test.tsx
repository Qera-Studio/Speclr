import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import { EditorPanelProvider, EditorPanelContent } from '../EditorPanel';
import EditorSidebar from '../EditorSidebar';
import TopPanel from '../TopPanel';
import WordingDrawer from '@/components/docs/editors/WordingDrawer';

const push = jest.fn();
let pathname = '/admin/docs/new/exit-letter';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));
// `TopPanel` renders `SearchCommand`, which calls a Server Action that imports
// the Neon client — stub it so this file doesn't drag a DB connection in.
jest.mock('@/server/actions/search', () => ({ searchAll: jest.fn(async () => []) }));

beforeEach(() => {
  push.mockClear();
  pathname = '/admin/docs/new/exit-letter';
});

/**
 * `TopPanel` is rendered beside the rail exactly as `AdminShell` does, so this
 * file would notice if the two ever started answering to the same name.
 */
function renderRail(panel?: React.ReactNode) {
  return render(
    <EditorPanelProvider>
      <SidebarProvider>
        <TopPanel />
        <EditorSidebar />
        {panel}
      </SidebarProvider>
    </EditorPanelProvider>,
  );
}

const rail = () => document.querySelector('[data-side="right"][data-slot="sidebar"]');

describe('EditorSidebar', () => {
  /**
   * The rail is not there at all on a page with nothing editable, rather than
   * present and empty. A permanently collapsed strip beside every list was
   * chrome that named a capability the page did not have.
   */
  it('renders nothing when the page has nothing editable', () => {
    renderRail();
    expect(rail()).toBeNull();
  });

  /**
   * The collapse toggle is gone, and this is the test that has to hold.
   *
   * It was the only control in the app that set the rail back to open, so
   * leaving a way to shut it would have made collapsing a one-way trip: the
   * form for the document you are editing would be gone until a reload. The
   * rail is simply always open now, and the back arrow that shared its header
   * moved to `AdminHeader`.
   */
  it('offers no collapse control and no way back of its own', () => {
    renderRail(
      <EditorPanelContent title="New contract" autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );

    expect(screen.queryByRole('button', { name: /edit panel/i })).toBeNull();
    // "Go back" belongs to the app header now, and the rail must not carry a
    // second one: two controls with one name is the ambiguity this removes.
    expect(screen.queryByRole('button', { name: /^go back$/i })).toBeNull();
  });

  /**
   * The header row itself stayed, and what it holds is the title of whatever
   * the form is editing. That is `panel.title`, which `EditorPanelContent`
   * has always set and nothing read for a while: the title travelled to the
   * app header by portal instead, which put the name of the form in a
   * different column from the form.
   */
  it('titles itself from the panel it is showing', () => {
    renderRail(
      <EditorPanelContent title="New contract" autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );
    const title = screen.getByText('New contract');
    expect(rail()!.contains(title)).toBe(true);
  });

  /**
   * A panel with no title gets no band. The record managers open this rail for
   * an add/edit form that the page above already names, and an empty 48px row
   * over it is a header announcing nothing — the same judgement `AdminHeader`
   * makes when it renders nothing at all on a primary path.
   */
  it('draws no header row for a panel that does not name itself', () => {
    renderRail(
      <EditorPanelContent autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );
    // The scrolling form area is the first thing in the pane: nothing sits
    // above it, which is what "no header row" means here.
    const content = rail()!.querySelector('[data-slot="sidebar-content"]')!;
    expect(content.previousElementSibling).toBeNull();
  });

  /** The form is the point of the page, so the rail arrives open. */
  it('is expanded once a panel asks for it', () => {
    renderRail(
      <EditorPanelContent title="New contract" autoOpen>
        <p>Form</p>
      </EditorPanelContent>,
    );
    expect(rail()).toHaveAttribute('data-state', 'expanded');
    expect(screen.getByText('Form')).toBeInTheDocument();
  });

  /**
   * The record managers still drive the rail programmatically — Clients,
   * Employees and Services open it on "Add" and close it on save — so the open
   * state had to survive the toggle's removal. A panel that has not asked for
   * the rail leaves it shut.
   */
  it('stays shut for a panel that does not ask to open', () => {
    renderRail(
      <EditorPanelContent>
        <p>Form</p>
      </EditorPanelContent>,
    );
    expect(rail()).toHaveAttribute('data-state', 'collapsed');
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
 * The wording drawer: a second pane over the rail rather than a dialog over the
 * document. Every field in it changes a word printed a few centimetres to the
 * left, so a sheet drawn on top of the preview hides the only thing that says
 * whether the edit was right.
 */
describe('EditorSidebar drawer', () => {
  function renderWithDrawer() {
    return renderRail(
      <EditorPanelContent autoOpen>
        <p>Form field</p>
        <WordingDrawer label="Wording" description="Terms, footer">
          <p>Masthead field</p>
        </WordingDrawer>
      </EditorPanelContent>,
    );
  }

  it('opens the drawer over the rail and names it beside a back arrow', async () => {
    const user = userEvent.setup();
    renderWithDrawer();

    expect(screen.queryByText('Masthead field')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /wording/i }));

    expect(screen.getByText('Masthead field')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to the form/i })).toBeInTheDocument();
  });

  /** The form is still there, one step behind, which is what "back" means. */
  it('leaves the form mounted underneath and comes back to it', async () => {
    const user = userEvent.setup();
    renderWithDrawer();

    await user.click(screen.getByRole('button', { name: /wording/i }));
    expect(screen.getByText('Form field')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to the form/i }));
    expect(screen.queryByText('Masthead field')).not.toBeInTheDocument();
  });

  /**
   * The drawer covers the form pane whole. Its own back arrow is the only one
   * in the rail, and it is a different control from the header's "Back": this
   * one returns to the form, that one leaves the page.
   */
  it('covers the form pane and offers exactly one way back', async () => {
    const user = userEvent.setup();
    renderWithDrawer();

    await user.click(screen.getByRole('button', { name: /wording/i }));

    expect(screen.getAllByRole('button', { name: /back to the form/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^go back$/i })).not.toBeInTheDocument();
  });
});
