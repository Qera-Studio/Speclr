import { clearDraft, draftKey } from '../draft';

/**
 * The draft store.
 *
 * The hooks are exercised through a real step in
 * `onboarding/__tests__/StepDraft.test.tsx`, where "type, remount, still there"
 * is the behaviour that actually matters. This file covers the two pieces the
 * hooks depend on and the one property that is a rule rather than a
 * convenience: the store must never be `localStorage`.
 */
describe('draftKey', () => {
  it('separates one client from another', () => {
    expect(draftKey('a', 'tax')).not.toBe(draftKey('b', 'tax'));
  });

  /**
   * Commercial and Services both write the `commercial` section, so the key is
   * the *step*, not the section. Keyed on the section they would share a draft,
   * and saving either would wipe the other's unsaved work.
   */
  it('separates one step from another', () => {
    expect(draftKey('a', 'commercial')).not.toBe(draftKey('a', 'services'));
  });

  /**
   * The identity step runs before there is a record, which is the case that
   * needed a draft most: every other step can fall back on the saved row.
   */
  it('has a key for a client that does not exist yet', () => {
    expect(draftKey(undefined, 'identity')).toContain('new');
  });
});

describe('the store itself', () => {
  it('is sessionStorage, and never localStorage', () => {
    const key = draftKey('c1', 'tax');
    sessionStorage.setItem(key, '{"gstin":"09AABCQ2864Q1ZQ"}');
    localStorage.setItem(key, 'should never be touched');

    clearDraft(key);

    // A client's PAN, GSTIN and staff contact details must not be left on disk
    // after the tab closes, after sign-out, or after the client is deleted.
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(key)).toBe('should never be touched');
    localStorage.removeItem(key);
  });

  it('survives storage being unavailable', () => {
    const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    // Safari in private mode throws. A convenience that can break a form is not
    // a convenience.
    expect(() => clearDraft(draftKey('c1', 'tax'))).not.toThrow();
    spy.mockRestore();
  });
});
