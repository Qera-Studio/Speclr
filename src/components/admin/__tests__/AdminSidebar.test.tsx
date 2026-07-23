import { render, screen } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '../AdminSidebar';

jest.mock('next/navigation', () => ({ usePathname: () => '/clients' }));
jest.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AdminSidebar email="ops@qera.studio" />
    </SidebarProvider>,
  );
}

describe('AdminSidebar', () => {
  it('renders all main nav links', () => {
    renderSidebar();
    for (const label of ['Dashboard', 'Clients', 'Employees', 'Services', 'Invoice', 'Icon spec']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the active route with aria-current', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('shows the signed-in email and a sign-out control', () => {
    renderSidebar();
    expect(screen.getByText('ops@qera.studio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});
