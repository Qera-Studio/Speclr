import { render, screen } from '@testing-library/react';
import { NAV_BY_PROFILE } from '@/components/admin/nav';

const requireAuthorizedUser = jest.fn();
const redirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: (...a: unknown[]) => requireAuthorizedUser(...a),
}));
jest.mock('next/navigation', () => ({
  redirect: (u: string) => redirect(u),
}));

import NavIndexRoute from '../NavIndexRoute';

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue({});
});

/**
 * The index page behind a flattened rail row — where a section's destinations
 * went when the rail stopped listing them inline.
 *
 * It reads `nav.ts` and nothing else, which is the point: the row, this page and
 * the ⌘D palette cannot come to list different things, because there is only one
 * list. Hence no `@/db/store` mock here — a section index that queried the
 * database would be a different page wearing this one's name.
 */
describe('NavIndexRoute', () => {
  it('lists every document type on its profile’s side', async () => {
    render(await NavIndexRoute({ profile: 'admin', section: 'documents' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Documents' })).toBeInTheDocument();
    for (const link of NAV_BY_PROFILE.admin.documents) {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    }
    // Sealed, the same way the rail is.
    expect(screen.queryByRole('link', { name: 'Invoice' })).not.toBeInTheDocument();
  });

  /**
   * Icon spec and UI Kit are listed here but live at `/admin/spec` and
   * `/admin/kit`. That mismatch is exactly why the rail row carries `covers`.
   */
  it('lists a group’s links, including the ones outside its own path', async () => {
    render(await NavIndexRoute({ profile: 'admin', section: 'Tools' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Icon spec' })).toHaveAttribute('href', '/admin/spec');
    expect(screen.getByRole('link', { name: 'CTC calculator' })).toHaveAttribute(
      'href',
      '/admin/tools/ctc',
    );
  });

  /**
   * A wrapper naming a group its profile does not have is a bug in this repo,
   * not a bad URL. An empty grid would read as "this group has nothing in it".
   */
  it('throws rather than rendering an empty page for an unknown section', async () => {
    await expect(NavIndexRoute({ profile: 'client', section: 'Tools' })).rejects.toThrow(
      /No "Tools" group/,
    );
  });

  it('sends a signed-out visitor to sign in', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    await expect(NavIndexRoute({ profile: 'admin', section: 'documents' })).rejects.toThrow(
      'REDIRECT:/sign-in',
    );
  });

  it('sends a signed-in but non-allowlisted visitor to /no-access', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));

    await expect(NavIndexRoute({ profile: 'admin', section: 'documents' })).rejects.toThrow(
      'REDIRECT:/no-access',
    );
  });
});
