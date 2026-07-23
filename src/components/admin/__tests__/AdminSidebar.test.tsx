import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '../AdminSidebar';

jest.mock('next/navigation', () => ({ usePathname: () => '/clients' }));
jest.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const user = { name: 'Shivanshu Pareek', email: 'ops@qera.studio', imageUrl: undefined };

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AdminSidebar user={user} />
    </SidebarProvider>,
  );
}

describe('AdminSidebar', () => {
  it('renders the top-level single links', () => {
    renderSidebar();
    for (const label of ['Dashboard', 'Clients', 'Employees', 'Services', 'Icon spec']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('renders the collapsible document sections as triggers', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /^client/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^admin/i })).toBeInTheDocument();
  });

  it('reveals a section’s document links when it is expanded', async () => {
    const u = userEvent.setup();
    renderSidebar();
    await u.click(screen.getByRole('button', { name: /^client/i }));
    expect(await screen.findByRole('link', { name: 'Invoice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contract' })).toHaveAttribute('href', '/docs/new/contract');
  });

  it('marks the active route with aria-current', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('renders the account card with name, email, and a menu trigger', () => {
    renderSidebar();
    // The card shows the user's name and email...
    expect(screen.getByText('Shivanshu Pareek')).toBeInTheDocument();
    expect(screen.getByText('ops@qera.studio')).toBeInTheDocument();
    // ...and is a menu trigger (the dropdown open + Sign out is verified in-browser —
    // Base UI's menu-on-pointer-click doesn't open in jsdom when the trigger holds an Avatar).
    const trigger = screen.getByRole('button', { name: /shivanshu pareek/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });
});
