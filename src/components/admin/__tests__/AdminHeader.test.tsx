import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = jest.fn();
let pathname = '/admin/docs/some-document-id';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

import AdminHeader from '../AdminHeader';
import { PageHeaderSlot, PageHeaderSlotProvider } from '../PageHeaderSlot';

beforeEach(() => {
  push.mockClear();
  pathname = '/admin/docs/some-document-id';
});

describe('AdminHeader', () => {
  it('renders a breadcrumb trail on a page the nav cannot reach', () => {
    render(<AdminHeader />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    // Dashboard / Documents / the id, rooted at the admin profile's home.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
    expect(screen.getByText('some-document-id')).toHaveAttribute('aria-current', 'page');
  });

  /**
   * A page the sidebar links to needs no trail: the rail is already showing
   * where you are, with this page highlighted in it, so "Dashboard / Icon spec"
   * is one hop restated as two directly above the hop itself.
   *
   * It must render *nothing*, not an empty `<header>`. An empty band keeps the
   * 36px row the trail sat in, which pushes every primary page down by a row it
   * has stopped using.
   */
  it('renders nothing at all on a page the sidebar links to', () => {
    pathname = '/admin/spec';
    const { container } = render(<AdminHeader />);
    expect(container).toBeEmptyDOMElement();
  });

  it('holds no toggle, wordmark or search — those are TopPanel’s', () => {
    render(<AdminHeader />);
    expect(screen.queryByRole('button', { name: /toggle sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'speclr' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /search/i })).not.toBeInTheDocument();
  });

  /**
   * A slash, not a chevron. The row carries three arrow glyphs of its own now
   * (back, and the pager's two), and a fourth pointing the same way as the
   * trail read as a control rather than as punctuation.
   */
  it('separates the crumbs with a slash', () => {
    render(<AdminHeader />);
    const trail = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(trail).getAllByText('/').length).toBeGreaterThan(0);
    expect(trail.querySelector('svg')).toBeNull();
  });
});

/**
 * Back moved here from the editor rail's own header, which is gone. It leaves
 * the page, and a draft's unsaved edits live in the form rather than on the
 * server, so it asks first rather than navigating on the click.
 */
describe('the back button', () => {
  const clickBack = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<AdminHeader />);
    await user.click(screen.getByRole('button', { name: /back/i }));
  };

  /**
   * It reads "Back", not a bare arrow. The row also holds the pager, whose own
   * arrows move between pages, and two unlabelled arrows a few centimetres
   * apart meaning different kinds of "back" is the confusion the word removes.
   */
  it('carries its label as text', () => {
    render(<AdminHeader />);
    expect(screen.getByRole('button', { name: /back/i })).toHaveTextContent('Back');
  });

  it('asks before leaving, and does not navigate on the click alone', async () => {
    const user = userEvent.setup();
    await clickBack(user);

    expect(screen.getByText('Leave this page?')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('goes to the parent once confirmed', async () => {
    const user = userEvent.setup();
    pathname = '/admin/docs/new/exit-letter';
    await clickBack(user);
    await user.click(screen.getByRole('button', { name: 'Leave' }));

    expect(push).toHaveBeenCalledWith('/admin/docs/exit-letter');
  });

  /**
   * The header lives in the admin layout, which navigation does not unmount —
   * so unlike every other confirmation in the app, nothing else takes this
   * dialog off screen. It stayed up over the newly loaded page.
   */
  it('dismisses itself on leaving, not relying on the page unmounting it', async () => {
    const user = userEvent.setup();
    await clickBack(user);
    await user.click(screen.getByRole('button', { name: 'Leave' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('stays put when the user cancels', async () => {
    const user = userEvent.setup();
    await clickBack(user);
    await user.click(screen.getByRole('button', { name: 'Stay' }));

    expect(push).not.toHaveBeenCalled();
  });
});

/**
 * The row is one row. What used to be a second bar inside the page — the
 * document's title and its pager — arrives here by portal, so the order a
 * reader sees is back, trail, title, pager.
 */
describe('the page header slot', () => {
  it('puts a page’s own content on the same row as the breadcrumbs', () => {
    render(
      <PageHeaderSlotProvider>
        <AdminHeader />
        <PageHeaderSlot>
          <h1>New invoice</h1>
        </PageHeaderSlot>
      </PageHeaderSlotProvider>,
    );

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('heading', { name: 'New invoice' })).toBeInTheDocument();
    expect(within(header).getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  /** Back first, then where you are, then what this is. */
  it('orders back, breadcrumbs, then the page’s content', () => {
    render(
      <PageHeaderSlotProvider>
        <AdminHeader />
        <PageHeaderSlot>
          <h1>New invoice</h1>
        </PageHeaderSlot>
      </PageHeaderSlotProvider>,
    );

    const back = screen.getByRole('button', { name: /back/i });
    const trail = screen.getByRole('navigation', { name: /breadcrumb/i });
    const title = screen.getByRole('heading', { name: 'New invoice' });

    expect(back.compareDocumentPosition(trail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(trail.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  /**
   * With no host the content renders in place rather than disappearing. What
   * travels through the slot includes the autosave line, and an autosave
   * indicator that silently vanishes is worse than one in the wrong place.
   */
  it('renders in place when there is no header to portal into', () => {
    render(
      <PageHeaderSlot>
        <p>Saved 14:32</p>
      </PageHeaderSlot>,
    );
    expect(screen.getByText('Saved 14:32')).toBeInTheDocument();
  });
});
