import { render, screen } from '@testing-library/react';
import { MSA_CLAUSES, type ClauseInput } from '@/lib/domain/contract/msa';
import { PARTS } from '@/lib/domain/seed/parts';

const requireAuthorizedUser = jest.fn();
const listServices = jest.fn(() => Promise.resolve(PARTS));
const listClauses = jest.fn(() => Promise.resolve([] as ClauseInput[]));
const getService = jest.fn();
const listExclusions = jest.fn(() => Promise.resolve([]));
const listClientInputs = jest.fn(() => Promise.resolve([]));
const redirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const notFound = jest.fn(() => {
  throw new Error('NOT_FOUND');
});

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: (...a: unknown[]) => requireAuthorizedUser(...a),
}));
jest.mock('@/db/store', () => ({
  listServices: () => listServices(),
  listClauses: () => listClauses(),
  getService: (...a: unknown[]) => getService(...a),
  listExclusions: (...a: unknown[]) => listExclusions(...(a as [])),
  listClientInputs: (...a: unknown[]) => listClientInputs(...(a as [])),
}));
jest.mock('next/navigation', () => ({
  redirect: (u: string) => redirect(u),
  notFound: () => notFound(),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock('@/server/actions/services', () => ({
  updateServiceDetails: jest.fn(),
  createService: jest.fn(),
  saveServiceSection: jest.fn(),
  removeService: jest.fn(),
}));
jest.mock('@/server/actions/clauses', () => ({
  updateClause: jest.fn(),
  addClause: jest.fn(),
  removeClause: jest.fn(),
}));

import ServiceCataloguePage from '../services/page';
import ServiceDetailPage from '../services/[code]/page';
import ClauseLibraryPage from '../clauses/page';

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue({});
  listServices.mockResolvedValue(PARTS);
  listClauses.mockResolvedValue([]);
  getService.mockImplementation(async (code: string) =>
    PARTS.find((s) => s.code === code) ?? null,
  );
});

/**
 * One Service's own page. The same two locks as every other page, a 404 for
 * a code that names nothing, and the libraries loaded *with* their archived
 * rows so a line this Service still cites can be unticked.
 */
describe('Service page', () => {
  const params = Promise.resolve({ code: '06' });

  it('shows the service with its three sections', async () => {
    render(await ServiceDetailPage({ params }));

    expect(screen.getByRole('heading', { level: 1, name: 'Custom web build' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Menu' })).toBeInTheDocument();
    expect(listExclusions).toHaveBeenCalledWith(true);
    expect(listClientInputs).toHaveBeenCalledWith(true);
  });

  it('404s on a code that names nothing', async () => {
    await expect(ServiceDetailPage({ params: Promise.resolve({ code: '99' }) })).rejects.toThrow(
      'NOT_FOUND',
    );
  });

  it('sends a signed-out visitor to sign in', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHENTICATED'));
    await expect(ServiceDetailPage({ params })).rejects.toThrow('REDIRECT:/sign-in');
  });

  it('sends a signed-in but non-allowlisted visitor to /no-access', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(ServiceDetailPage({ params })).rejects.toThrow('REDIRECT:/no-access');
  });
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
      { number: 1, heading: 'Something else entirely', body: ['Stored text.'], archived: false },
    ]);

    render(await ClauseLibraryPage());

    expect(
      screen.getByRole('button', { name: 'Open Something else entirely' }),
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
      screen.getByRole('button', { name: `Open ${MSA_CLAUSES[0].heading}` }),
    ).toBeInTheDocument();
  });

  it('sends a non-allowlisted visitor to /no-access', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));

    await expect(ClauseLibraryPage()).rejects.toThrow('REDIRECT:/no-access');
  });
});
