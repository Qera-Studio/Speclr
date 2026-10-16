import { render, screen, within } from '@testing-library/react';

let pathname = '/admin/docs/some-document-id';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import Breadcrumbs from '@/components/shell/Breadcrumbs';

beforeEach(() => {
  pathname = '/admin/docs/some-document-id';
});

/**
 * The trail, tested where it now lives.
 *
 * These claims were `AdminHeader`'s until 18 September 2026, when the trail
 * moved out of the card's header row and into the band above it. They are
 * carried over rather than rewritten: what the trail says and when it declines
 * to render are properties of the trail, not of whichever surface hosts it, and
 * that is the whole reason it became its own component.
 */
describe('Breadcrumbs', () => {
  it('renders a trail on a page the nav cannot reach', () => {
    render(<Breadcrumbs />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    // Dashboard / Documents / the id, rooted at the admin profile's home.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
    expect(screen.getByText('some-document-id')).toHaveAttribute('aria-current', 'page');
  });

  /**
   * A page the sidebar links to needs no trail: the rail is already showing
   * where you are, with this page highlighted in it, so "Dashboard / Icon spec"
   * is one hop restated as two a few centimetres away.
   *
   * **It must render nothing, not an empty `<nav>`.** The band it sits in is
   * shared with the clock and the bell, so an empty labelled landmark would be
   * announced on every primary page as a navigation region containing nothing.
   */
  it('renders nothing at all on a page the sidebar links to', () => {
    pathname = '/admin/spec';
    const { container } = render(<Breadcrumbs />);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * A slash, not a chevron. The band and the row below it carry arrow glyphs of
   * their own (back, and the pager's two), and a fourth pointing the same way as
   * the trail read as a control rather than as punctuation.
   */
  it('separates the crumbs with a slash', () => {
    render(<Breadcrumbs />);
    const trail = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(trail).getAllByText('/').length).toBeGreaterThan(0);
    expect(trail.querySelector('svg')).toBeNull();
  });
});
