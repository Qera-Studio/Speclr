import { render, screen } from '@testing-library/react';

const pathname = '/client/docs/7505ad80-0ad2-4bba-8301-f7e281988b93';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));
jest.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// See AdminHeader.test.tsx — the search field pulls in a Server Action.
jest.mock('@/server/actions/search', () => ({ searchAll: jest.fn(async () => []) }));

import AdminShell from '../AdminShell';
import { DocumentCrumbLabel } from '../DocumentCrumb';

const user = { name: 'Shivanshu', email: 'shivanshu@qera.studio' } as never;

const trail = () =>
  document.querySelector('nav[aria-label="Breadcrumb"]')?.textContent ?? '';

/**
 * The seam between a page and the trail above it.
 *
 * `breadcrumb.test.ts` owns what the trail *is* for a given path and type; this
 * owns the one thing a pure function cannot show — that a label declared four
 * levels inside the page actually reaches the header. The unit tests passed
 * throughout while the wiring was still missing, which is the gap this closes.
 */
describe('the document crumb', () => {
  it('reaches the trail from inside the page', () => {
    render(
      <AdminShell user={user}>
        <DocumentCrumbLabel label="Contract" />
      </AdminShell>,
    );
    expect(trail()).toContain('Contract');
  });

  /**
   * The bug the whole change exists for: the client profile's home is already
   * "Documents", so the grouping crumb printed the word a second time.
   */
  it('never prints Documents twice', () => {
    render(
      <AdminShell user={user}>
        <DocumentCrumbLabel label="Contract" />
      </AdminShell>,
    );
    expect(trail().match(/Documents/g)).toHaveLength(1);
  });

  /** No label is the derived trail, unchanged. A page need not participate. */
  it('leaves a page that declares nothing alone', () => {
    render(
      <AdminShell user={user}>
        <p>Page body</p>
      </AdminShell>,
    );
    expect(screen.getByText('Page body')).toBeInTheDocument();
    expect(trail()).not.toContain('Contract');
  });

  /**
   * The same value prints twice on the row: once inside the trail, and once as
   * the title centred on the inset. One source, so the two cannot come to
   * disagree about what is open.
   */
  it('also titles the row, outside the trail', () => {
    render(
      <AdminShell user={user}>
        <DocumentCrumbLabel label="Contract" />
      </AdminShell>,
    );
    const title = screen
      .getAllByText('Contract')
      .find((el) => !el.closest('nav[aria-label="Breadcrumb"]'));
    expect(title).toBeDefined();
  });

  /** A page with no type has no title to print, rather than an empty strip. */
  it('prints no title on a page that declares nothing', () => {
    render(
      <AdminShell user={user}>
        <p>Page body</p>
      </AdminShell>,
    );
    expect(screen.queryByText('Contract')).not.toBeInTheDocument();
  });
});
