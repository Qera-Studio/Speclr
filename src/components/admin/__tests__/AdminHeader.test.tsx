import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/spec',
  useRouter: () => ({ push: jest.fn() }),
}));
// The search field calls a Server Action, which imports the Neon client — stub
// the module so importing the header doesn't drag a DB connection in.
jest.mock('@/server/actions/search', () => ({ searchAll: jest.fn(async () => []) }));

import AdminHeader from '../AdminHeader';

describe('AdminHeader', () => {
  it('renders a labelled search field', () => {
    render(<AdminHeader />);
    // A combobox, not a plain searchbox — it opens a result list.
    expect(screen.getByRole('combobox', { name: /search/i })).toBeInTheDocument();
  });

  it('renders a breadcrumb trail for the current route', () => {
    render(<AdminHeader />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    // /admin/spec → Dashboard > Icon spec, rooted at the admin profile's home
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
    expect(screen.getByText('Icon spec')).toHaveAttribute('aria-current', 'page');
  });

  it('no longer renders the sidebar toggle or the speclr wordmark', () => {
    render(<AdminHeader />);
    expect(screen.queryByRole('button', { name: /toggle sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'speclr' })).not.toBeInTheDocument();
  });
});
