import { render, screen } from '@testing-library/react';
import { MSA_CLAUSES } from '@/lib/domain/contract/msa';
import { SERVICES } from '@/lib/domain/contract/seed/services';

const requireAuthorizedUser = jest.fn();
const listServices = jest.fn(() => Promise.resolve(SERVICES));
const listClauses = jest.fn(() => Promise.resolve([] as typeof MSA_CLAUSES));
const redirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: (...a: unknown[]) => requireAuthorizedUser(...a),
}));
jest.mock('@/db/store', () => ({
  listServices: () => listServices(),
  listClauses: () => listClauses(),
}));
jest.mock('next/navigation', () => ({
  redirect: (u: string) => redirect(u),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock('@/server/actions/services', () => ({
  updateServiceDetails: jest.fn(),
}));
jest.mock('@/server/actions/clauses', () => ({
  updateClause: jest.fn(),
  addClause: jest.fn(),
  removeClause: jest.fn(),
}));

import ServiceCataloguePage from '../services/page';
import ClauseLibraryPage from '../clauses/page';

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue({});
  listServices.mockResolvedValue(SERVICES);
  listClauses.mockResolvedValue([]);
});

/**
 * Both libraries sit on the client side rather than among the admin tools:
 * they are contract source material, so they belong beside the contracts they
 * feed rather than beside the CTC calculator.
 */
describe('Service catalogue page', () => {
  it('lists the services library', async () => {
    render(await ServiceCataloguePage());

    expect(screen.getByRole('heading', { level: 1, name: 'Services' })).toBeInTheDocument();
    expect(screen.getByText('Domain and DNS')).toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    await expect(ServiceCataloguePage()).rejects.toThrow('REDIRECT:/sign-in');
  });

  it('sends a signed-in but non-allowlisted visitor to /no-access', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));

    await expect(ServiceCataloguePage()).rejects.toThrow('REDIRECT:/no-access');
  });
});

describe('Clause library page', () => {
  it('shows the stored clauses when the table has been seeded', async () => {
    listClauses.mockResolvedValue([
      { number: 1, heading: 'Something else entirely', body: ['Stored text.'] },
    ]);

    render(await ClauseLibraryPage());

    expect(
      screen.getByRole('button', { name: /1\. Something else entirely/ }),
    ).toBeInTheDocument();
  });

  /**
   * Falls back to the code copy before `scripts/seed-contract.ts` has been run
   * — the same seeding strategy `getStudioSettings` uses. An empty screen here
   * would read as data loss rather than as an unseeded table, and what it shows
   * is exactly what a contract would print today.
   */
  it('falls back to the code copy when the table is empty', async () => {
    render(await ClauseLibraryPage());

    expect(
      screen.getByRole('button', { name: new RegExp(`1\\. ${MSA_CLAUSES[0].heading}`) }),
    ).toBeInTheDocument();
  });

  it('sends a non-allowlisted visitor to /no-access', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));

    await expect(ClauseLibraryPage()).rejects.toThrow('REDIRECT:/no-access');
  });
});
