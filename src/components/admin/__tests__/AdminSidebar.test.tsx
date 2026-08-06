import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '../AdminSidebar';
import { NewDocumentProvider } from '../NewDocumentCommand';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/clients',
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const user = { name: 'Shivanshu Pareek', email: 'ops@qera.studio', imageUrl: undefined };

function renderSidebar() {
  return render(
    <NewDocumentProvider>
      <SidebarProvider>
        <AdminSidebar user={user} />
      </SidebarProvider>
    </NewDocumentProvider>,
  );
}

describe('AdminSidebar', () => {
  it('renders the top-level single links', () => {
    renderSidebar();
    for (const label of ['Dashboard', 'Clients', 'Employees', 'Icon spec']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  /** Services moved into the contract list — see the note on `RECORD_LINKS`. */
  it('no longer lists Services under Records', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument();
  });

  it('no longer lists Settings in the nav — it moved into the account menu', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Contract' })).toHaveAttribute('href', '/docs/contract');
  });

  it('marks the active route with aria-current', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
  });

  /** Records is the shorter, more-often-scanned list — it reads first. */
  it('lists Records above Documents', () => {
    renderSidebar();
    const groups = screen.getAllByText(/^(Records|Documents|Tools)$/).map((el) => el.textContent);
    expect(groups).toEqual(['Records', 'Documents', 'Tools']);
  });

  it('offers a create button that opens the document palette', async () => {
    const u = userEvent.setup();
    renderSidebar();
    const create = screen.getByRole('button', { name: /new document/i });
    expect(create).toHaveAttribute('aria-haspopup', 'dialog');
    await u.click(create);
    expect(await screen.findByRole('dialog', { name: /new document/i })).toBeInTheDocument();
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
