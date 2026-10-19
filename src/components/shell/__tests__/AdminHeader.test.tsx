import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = jest.fn();
let pathname = '/admin/docs/some-document-id';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

import AdminHeader from '@/components/shell/AdminHeader';
import { PageHeaderSlot, PageHeaderSlotProvider } from '@/components/shell/PageHeaderSlot';

beforeEach(() => {
  push.mockClear();
  pathname = '/admin/docs/some-document-id';
});

describe('AdminHeader', () => {
  /**
   * A page the sidebar links to needs no header row at all: the rail is
   * already showing where you are, and there is nowhere above it to go back to.
   *
   * It must render *nothing*, not an empty `<header>`. An empty band keeps the
   * row it sat in, which pushes every primary page down by a row it has stopped
   * using.
   */
  it('renders nothing at all on a page the sidebar links to', () => {
    pathname = '/admin/spec';
    const { container } = render(<AdminHeader />);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * **The trail is not here any more**, and neither is search.
   *
   * The trail moved to `TopPanel`, the band above the card, on 18 September
   * 2026; search moved into the nav rail in the same pass. Asserting their
   * absence is what stops a future edit quietly reinstating a second copy of
   * either: two trails on one screen would be the same fact stated twice, and
   * the failure would look like a layout quirk rather than a duplication.
   *
   * `Breadcrumbs.test.tsx` owns what the trail says; this owns that it is not
   * said here.
   */
  it('holds no trail, toggle, wordmark or search', () => {
    render(<AdminHeader />);
    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'speclr' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /search/i })).not.toBeInTheDocument();
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
   * It is an icon alone, and it names **where it goes**.
   *
   * **This test asserted the opposite until 18 September 2026.** The button
   * carried the word "Back" because the row also holds the pager, whose own
   * arrows move between pages, and two unlabelled arrows meaning different
   * kinds of "back" is a real confusion. The word was dropped on instruction,
   * and the destination answers that argument better than the word did: a
   * document page has two back controls, this one leaving for the list and the
   * editor's own stepping through the flow, and what separates them is not
   * that one is a button but that they go to different places.
   *
   * What is asserted is the part that got *more* fragile by losing the text.
   * An icon-only control with no accessible name is invisible in review and
   * total for a screen reader, and it is the one button rule
   * `design-system.test.ts` fails the build over.
   */
  it('names where it goes, having no visible label', () => {
    render(<AdminHeader />);

    const back = screen.getByRole('button', { name: /^Back to / });
    // The name comes from `aria-label`, not from text: nothing is rendered.
    expect(back).toHaveTextContent('');
    /*
      "Dashboard", not "Documents", and that is the derivation working.

      The admin trail is Dashboard / Documents / <id>, but its "Documents" is a
      *grouping* crumb with no page of its own, so back skips it and lands on
      the profile home. The client side, where Documents is a real list, names
      it: `breadcrumb.test.ts` pins both. A label written by hand here would
      have said "Documents" on a page that does not go there.
    */
    expect(back).toHaveAccessibleName('Back to Dashboard');
  });

  /**
   * **The separator is gone, and its absence is the assertion.**
   *
   * It was added a few hours before the trail moved, to draw the edge between
   * the ghost arrow and the breadcrumb text beside it. With the trail in the
   * band above, the arrow has nothing next to it, and a rule with nothing on
   * its far side is a stray mark rather than a boundary.
   *
   * Worth stating rather than silently deleting the old test, because the
   * argument that put it there is still sound and will recur the moment
   * anything else lands in this row.
   */
  it('draws no separator, having nothing beside the arrow to separate', () => {
    const { container } = render(<AdminHeader />);
    expect(container.querySelector('[data-slot="separator"]')).toBeNull();
  });

  it('asks before leaving, and does not navigate on the click alone', async () => {
    const user = userEvent.setup();
    await clickBack(user);

    expect(screen.getByRole('alertdialog', { name: 'Leave page' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('goes to the parent once confirmed', async () => {
    const user = userEvent.setup();
    pathname = '/admin/docs/new/exit-letter';
    await clickBack(user);
    await user.click(screen.getByRole('button', { name: 'Leave page' }));

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
    await user.click(screen.getByRole('button', { name: 'Leave page' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('stays put when the user cancels', async () => {
    const user = userEvent.setup();
    await clickBack(user);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(push).not.toHaveBeenCalled();
  });
});

/**
 * The row is one row. What used to be a second bar inside the page — the
 * document's title and its pager — arrives here by portal, so the order a
 * reader sees is back, then title, then pager.
 *
 * The trail was between the first two until 18 September 2026 and is now in the
 * band above the card, which is why these two assert around it rather than on
 * it.
 */
describe('the page header slot', () => {
  it('puts a page’s own content on the header row', () => {
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
  });

  /** Back first, then what this is. */
  it('orders back, then the page’s content', () => {
    render(
      <PageHeaderSlotProvider>
        <AdminHeader />
        <PageHeaderSlot>
          <h1>New invoice</h1>
        </PageHeaderSlot>
      </PageHeaderSlotProvider>,
    );

    const back = screen.getByRole('button', { name: /back/i });
    const title = screen.getByRole('heading', { name: 'New invoice' });

    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
