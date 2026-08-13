const getDocument = jest.fn();
jest.mock('@/db/store', () => ({ getDocument: (...a: unknown[]) => getDocument(...a) }));

import { legacyDocProfile } from '../legacyDocs';

/**
 * Pre-split `/docs/…` URLs. This app issues legal documents, and a link to one
 * may sit in a client's inbox or a browser bookmark for years — reorganising
 * the nav must not kill it.
 *
 * The static legacy paths are declared in `next.config.ts`; only these three
 * need a lookup, because `<id>` is either a slug the registry knows or a UUID
 * only the database does.
 */
beforeEach(() => jest.clearAllMocks());

describe('legacyDocProfile', () => {
  it('answers a doc-type slug from the registry, without touching the database', async () => {
    await expect(legacyDocProfile('invoice')).resolves.toBe('client');
    await expect(legacyDocProfile('contract')).resolves.toBe('client');
    await expect(legacyDocProfile('pay-slip')).resolves.toBe('admin');
    await expect(legacyDocProfile('exit-letter')).resolves.toBe('admin');
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('looks a document id up and answers from its type', async () => {
    getDocument.mockResolvedValue({ id: 'doc-1', type: 'REC' });
    await expect(legacyDocProfile('doc-1')).resolves.toBe('client');

    getDocument.mockResolvedValue({ id: 'doc-2', type: 'STP' });
    await expect(legacyDocProfile('doc-2')).resolves.toBe('admin');
  });

  /** Neither a slug nor a real document — the caller 404s on this. */
  it('returns null for an id that names nothing', async () => {
    getDocument.mockResolvedValue(null);
    await expect(legacyDocProfile('nonsense')).resolves.toBeNull();
  });
});
