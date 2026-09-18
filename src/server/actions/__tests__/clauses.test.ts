/**
 * The clause library's two removals, and the gate in front of both.
 *
 * Archiving hides a clause and keeps its row; deleting removes the row and
 * retires its number in `counters` (see `deleteClause` in the store). Both are
 * refused to anyone not signed in and allowlisted, because these are the words
 * of an agreement and the library is where the next contract reads them from.
 */

const authorized = jest.fn();
const archiveClause = jest.fn((_n: number) => Promise.resolve());
const deleteClause = jest.fn((_n: number) => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  archiveClause: (...a: unknown[]) => archiveClause(a[0] as number),
  deleteClause: (...a: unknown[]) => deleteClause(a[0] as number),
  nextClauseNumber: jest.fn(() => Promise.resolve(29)),
  saveClause: jest.fn(() => Promise.resolve()),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { destroyClause, removeClause } from '../clauses';

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue({ id: 'u1', email: 'shivanshu@qera.studio' });
});

describe('removeClause', () => {
  it('archives the clause, leaving its row and its number in place', async () => {
    expect(await removeClause(7)).toEqual({ success: true });
    expect(archiveClause).toHaveBeenCalledWith(7);
    expect(deleteClause).not.toHaveBeenCalled();
  });
});

describe('destroyClause', () => {
  it('deletes the clause', async () => {
    expect(await destroyClause(7)).toEqual({ success: true });
    expect(deleteClause).toHaveBeenCalledWith(7);
    expect(archiveClause).not.toHaveBeenCalled();
  });

  it('refuses anyone not signed in and allowlisted', async () => {
    authorized.mockResolvedValue(null);

    expect(await destroyClause(7)).toEqual({ success: false, error: 'Unauthorized.' });
    expect(deleteClause).not.toHaveBeenCalled();
  });

  /**
   * The number names the row and arrives from the browser, so it is checked
   * rather than trusted. A non-integer would reach Postgres as a comparison
   * against a column that only holds integers.
   */
  it('refuses a number that is not one', async () => {
    expect((await destroyClause('7')).success).toBe(false);
    expect((await destroyClause(7.5)).success).toBe(false);
    expect(deleteClause).not.toHaveBeenCalled();
  });

  it('reports a failure rather than claiming success', async () => {
    deleteClause.mockRejectedValueOnce(new Error('down'));

    expect(await destroyClause(7)).toEqual({
      success: false,
      error: 'Failed to delete the clause.',
    });
  });
});
