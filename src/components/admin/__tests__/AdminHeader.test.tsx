import { render, screen } from '@testing-library/react';

let pathname = '/admin/docs/some-document-id';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: jest.fn() }),
}));

import AdminHeader from '../AdminHeader';

describe('AdminHeader', () => {
  it('renders a breadcrumb trail on a page the nav cannot reach', () => {
    pathname = '/admin/docs/some-document-id';
    render(<AdminHeader />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    // Dashboard > Documents > the id, rooted at the admin profile's home.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
    expect(screen.getByText('some-document-id')).toHaveAttribute('aria-current', 'page');
  });

  /**
   * A page the sidebar links to needs no trail: the rail is already showing
   * where you are, with this page highlighted in it, so "Dashboard > Icon spec"
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

  it('renders nothing but the breadcrumbs — the toggle, wordmark and search moved to TopPanel', () => {
    pathname = '/admin/docs/some-document-id';
    render(<AdminHeader />);
    expect(screen.queryByRole('button', { name: /toggle sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'speclr' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /search/i })).not.toBeInTheDocument();
  });
});
