import { render, screen } from '@testing-library/react';
import AdminHeader from '../AdminHeader';

jest.mock('next/navigation', () => ({ usePathname: () => '/spec' }));

describe('AdminHeader', () => {
  it('renders a labelled search field', () => {
    render(<AdminHeader />);
    expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
  });

  it('renders a breadcrumb trail for the current route', () => {
    render(<AdminHeader />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    // /spec → Dashboard > Icon spec
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Icon spec')).toHaveAttribute('aria-current', 'page');
  });

  it('no longer renders the sidebar toggle or the speclr wordmark', () => {
    render(<AdminHeader />);
    expect(screen.queryByRole('button', { name: /toggle sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'speclr' })).not.toBeInTheDocument();
  });
});
