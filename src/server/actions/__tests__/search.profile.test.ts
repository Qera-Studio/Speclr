const authorized = jest.fn();
const searchEverything = jest.fn();

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  searchEverything: (...a: unknown[]) => searchEverything(...a),
}));

import { searchAll } from '../search';

/**
 * ⌘K is scoped to the current profile, like ⌘D: the two halves of the app are
 * otherwise sealed, and a search that spanned both would be the one place a
 * pay slip turned up while you were invoicing.
 */

const EMPTY = { documents: [], clients: [], employees: [], services: [] };

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
  searchEverything.mockResolvedValue(EMPTY);
});

describe('searchAll', () => {
  it('passes the profile down to the query rather than filtering afterwards', async () => {
    await searchAll('acme', 'admin');
    expect(searchEverything).toHaveBeenCalledWith('acme', 'admin');
  });

  /**
   * Fail-closed, the same shape as the authorization check beside it: a
   * malformed argument must never *widen* the search. The profile arrives from
   * the client, so it is validated here rather than trusted.
   */
  it('returns nothing for an unrecognised profile, without querying', async () => {
    for (const bad of ['everything', '', null, undefined, { profile: 'admin' }]) {
      await expect(searchAll('acme', bad)).resolves.toEqual([]);
    }
    expect(searchEverything).not.toHaveBeenCalled();
  });

  it('returns nothing for an unauthorized caller', async () => {
    authorized.mockResolvedValue(false);
    await expect(searchAll('acme', 'client')).resolves.toEqual([]);
    expect(searchEverything).not.toHaveBeenCalled();
  });

  it('prefixes every hit with the profile that owns it', async () => {
    searchEverything.mockResolvedValue({
      documents: [
        { id: 'd1', type: 'INV', number: 'QS-INV-2627-001', clientSnapshot: { name: 'Acme' } },
      ],
      clients: [{ id: 'c1', name: 'Acme', companyName: 'Acme Pvt Ltd' }],
      employees: [],
      services: [{ code: 'BRAND', name: 'Branding' }],
    });

    const hits = await searchAll('acme', 'client');
    expect(hits.map((h) => h.href)).toEqual([
      '/client/docs/d1',
      '/client/clients',
      '/client/docs/contract',
    ]);
  });

  it('prefixes an HR hit with the admin profile', async () => {
    searchEverything.mockResolvedValue({
      documents: [
        { id: 's1', type: 'PAY', number: 'QS-PAY-2627-002', employeeSnapshot: { name: 'Riya' } },
      ],
      clients: [],
      employees: [{ id: 'e1', name: 'Riya', role: 'Designer' }],
      services: [],
    });

    const hits = await searchAll('riya', 'admin');
    expect(hits.map((h) => h.href)).toEqual(['/admin/docs/s1', '/admin/employees']);
  });
});
