import { blanksOf } from '../blanks';
import { contractComplete, contractScopes } from '../completeness';
import { FEE_SECTION, partsFilled, reviewedAll, unfilledByPart } from '../ledger';
import { contractDoc, serviceByCode } from './fixture';

/**
 * The completeness ledger, which replaces a door guard.
 *
 * `ServiceDialog` used to refuse to commit a Part until every blank on it was
 * filled, so an incomplete Part could not reach the contract at all. Parts
 * seeded from the client record never pass through that button, so the
 * guarantee has to move — and the thing that makes the replacement trustworthy
 * is that it reads `contractScopes`, the same enumeration the sheet renders
 * from and `contractComplete` validates against.
 *
 * The first test below is the one that matters: it asserts the agreement rather
 * than a hard-coded number, so the two cannot drift apart without a failure.
 */

/** Every blank key a Part owns, from the shared enumeration. */
function partBlankKeys(code: string, contract: { parts: ReturnType<typeof serviceByCode>[]; blanks: Record<string, string> }) {
  return contractScopes(contract)
    .filter((s) => s.scope.startsWith(`part.${code}.`))
    .flatMap((s) => blanksOf(s.parsed))
    .map((b) => b.key);
}

describe('unfilledByPart', () => {
  /**
   * The load-bearing property. A count that disagrees with `contractComplete`
   * is a ledger that says a contract is ready when finalize will refuse it, or
   * the reverse — both of which are worse than no ledger.
   */
  it('agrees with the enumeration finalize reads', () => {
    const { contract } = contractDoc({ codes: ['01'] });

    // `contractComplete`'s own filter, applied to this Part's scopes. Not the
    // *number of blanks*, which is a different question: a blank drafted with a
    // default is not unfilled, and only a genuinely empty `[ ]` counts. The
    // ledger must agree with the guard, not with the enumeration's length.
    const fromGuard = contractComplete(contract).filter(({ scope }) =>
      scope.scope.startsWith('part.01.'),
    ).length;

    expect(unfilledByPart(contract).get('01')).toBe(fromGuard);
  });

  /**
   * And the same agreement once things are partly filled, which is the state a
   * real contract spends its life in. A ledger that matches the guard only when
   * everything is empty is a ledger that agrees by accident.
   */
  it('still agrees once some blanks are filled', () => {
    const empty = contractDoc({ codes: ['01', '02'] }).contract;
    const keys = partBlankKeys('01', empty);
    const contract = {
      ...empty,
      blanks: Object.fromEntries(keys.slice(0, 2).map((key) => [key, 'x'])),
    };

    for (const code of ['01', '02']) {
      const fromGuard = contractComplete(contract).filter(({ scope }) =>
        scope.scope.startsWith(`part.${code}.`),
      ).length;
      expect(unfilledByPart(contract).get(code)).toBe(fromGuard);
    }
  });

  it('counts each Part separately', () => {
    const { contract } = contractDoc({ codes: ['01', '02'] });
    const counts = unfilledByPart(contract);

    expect(counts.size).toBe(2);
    expect(counts.get('01')).toBeGreaterThan(0);
    expect(counts.get('02')).toBeGreaterThan(0);
  });

  it('falls to zero as blanks are filled', () => {
    const empty = contractDoc({ codes: ['01'] }).contract;
    const keys = partBlankKeys('01', empty);
    const filled = {
      ...empty,
      blanks: Object.fromEntries(keys.map((key) => [key, 'x'])),
    };

    expect(unfilledByPart(filled).get('01')).toBe(0);
  });

  /**
   * A Part with nothing missing is present at zero rather than absent, or the
   * ledger could not tell "this Part is done" from "this Part is not on the
   * contract".
   */
  it('keeps a finished Part in the ledger', () => {
    const empty = contractDoc({ codes: ['01'] }).contract;
    const filled = {
      ...empty,
      blanks: Object.fromEntries(partBlankKeys('01', empty).map((k) => [k, 'x'])),
    };

    expect(filled.parts).toHaveLength(1);
    expect(unfilledByPart(filled).has('01')).toBe(true);
  });

  /**
   * The fee belongs to the commercials phase. A scope phase reporting a count
   * that includes a field on a later screen sends the operator hunting for a
   * blank that is not in front of them.
   */
  it('can leave out the section a later phase owns', () => {
    const { contract } = contractDoc({ codes: ['01'] });

    const all = unfilledByPart(contract).get('01')!;
    const withoutFee = unfilledByPart(contract, { except: FEE_SECTION }).get('01')!;

    expect(withoutFee).toBeLessThan(all);
  });

  /** The MSA and the Schedules are the terms phase's, never a Part's. */
  it('ignores the standing terms', () => {
    const { contract } = contractDoc({ codes: ['01'] });
    const counts = unfilledByPart(contract);

    expect([...counts.keys()]).toEqual(['01']);
  });

  it('is empty for a contract with no Parts', () => {
    expect(unfilledByPart({ parts: [], blanks: {} }).size).toBe(0);
  });
});

describe('partsFilled', () => {
  it('is false while any Part has a blank', () => {
    const { contract } = contractDoc({ codes: ['01'] });

    expect(partsFilled(contract)).toBe(false);
  });

  it('is true once every Part is filled', () => {
    const empty = contractDoc({ codes: ['01'] }).contract;
    const filled = {
      ...empty,
      blanks: Object.fromEntries(partBlankKeys('01', empty).map((k) => [k, 'x'])),
    };

    expect(partsFilled(filled)).toBe(true);
  });

  /**
   * Vacuously true with no Parts, which is correct and is why the phase gates
   * on `parts.length > 0` separately: "nothing is unfilled" and "there is
   * something here" are two different questions.
   */
  it('is true for a contract with no Parts at all', () => {
    expect(partsFilled({ parts: [], blanks: {} })).toBe(true);
  });
});

describe('reviewedAll', () => {
  const parts = [serviceByCode('01'), serviceByCode('02')];

  it('is false until every Part has been confirmed', () => {
    expect(reviewedAll(undefined, parts)).toBe(false);
    expect(reviewedAll(['01'], parts)).toBe(false);
  });

  it('is true once all of them have', () => {
    expect(reviewedAll(['01', '02'], parts)).toBe(true);
  });

  /** A code left over from a Part since removed must not count for a new one. */
  it('ignores a confirmation for a Part no longer on the contract', () => {
    expect(reviewedAll(['01', '99'], parts)).toBe(false);
  });

  it('is true for a contract with no Parts', () => {
    expect(reviewedAll([], [])).toBe(true);
  });
});
