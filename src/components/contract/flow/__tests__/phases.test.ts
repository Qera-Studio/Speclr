import { CONTRACT_PHASES, type ContractDraft } from '../phases';
import { blanksOf } from '@/lib/domain/contract/blanks';
import { contractScopes } from '@/lib/domain/contract/completeness';
import { contractDoc, serviceByCode } from '@/lib/domain/contract/__tests__/fixture';

/**
 * What each phase demands before it will let the operator on.
 *
 * The interesting one is Scope. It is what replaced `ServiceDialog`'s commit
 * gate: a Part used to be unable to enter the contract incomplete, and seeded
 * Parts do not pass through that door, so the phase is where the guarantee now
 * lives. It spent part of 18 September 2026 merged into Services and was split
 * back out the same day; the gate did not change either time.
 */

const draftWith = (over: Partial<ContractDraft> = {}): ContractDraft => ({
  clientId: '',
  issueDate: '2026-06-10',
  contract: { parts: [], blanks: {}, library: {} },
  content: {},
  ...over,
});

const phase = (key: string) => CONTRACT_PHASES.find((p) => p.key === key)!;

/** Fill every blank a contract has, the way a finished contract would. */
function allFilled(contract: ContractDraft['contract']): ContractDraft['contract'] {
  const keys = contractScopes(contract)
    .flatMap((s) => blanksOf(s.parsed))
    .map((b) => b.key);
  return { ...contract, blanks: Object.fromEntries(keys.map((k) => [k, 'x'])) };
}

describe('the phases', () => {
  it('runs client, services, scope, terms, preview', () => {
    expect(CONTRACT_PHASES.map((p) => p.key)).toEqual([
      'client',
      'services',
      'scope',
      'terms',
      'preview',
    ]);
  });

  /**
   * Only the first phase works without a saved draft — it is the one that
   * creates it, exactly as onboarding's identity step creates the client row.
   */
  it('needs a record for every phase after the first', () => {
    expect(phase('client').needsRecord).toBe(false);
    for (const key of ['services', 'scope', 'terms', 'preview']) {
      expect(phase(key).needsRecord).toBe(true);
    }
  });
});

describe('phase 1, the client', () => {
  it('wants a client and a date', () => {
    expect(phase('client').isComplete(draftWith())).toBe(false);
    expect(phase('client').isComplete(draftWith({ clientId: 'c1' }))).toBe(true);
  });

  it('refuses a date that is not one', () => {
    expect(
      phase('client').isComplete(draftWith({ clientId: 'c1', issueDate: 'soon' })),
    ).toBe(false);
  });
});

/**
 * Scope was merged into Services on 18 September 2026 and split back out the
 * same day, and this block is the reason neither move was risky: every
 * assertion here is about the *gate*, so it followed the gate from one key to
 * the other without a line of it changing. What they pin is the one thing the
 * ledger exists for, a Part seeded from the client record arriving filled and
 * still having to be looked at.
 */
describe('phase 3, the scope', () => {
  const { contract: base } = contractDoc({ codes: ['01'] });

  it('wants at least one Part', () => {
    expect(phase('scope').isComplete(draftWith({ clientId: 'c1' }))).toBe(false);
  });

  /** Services asks only that something was chosen; the filling is asked here. */
  it('leaves Services asking only that something was chosen', () => {
    expect(phase('services').isComplete(draftWith({ clientId: 'c1' }))).toBe(false);
    expect(phase('services').isComplete(draftWith({ contract: base }))).toBe(true);
  });

  it('refuses while a Part still has a blank', () => {
    expect(phase('scope').isComplete(draftWith({ contract: base }))).toBe(false);
  });

  /**
   * The half no derivation can supply. A Part whose blanks are all filled reads
   * as done without anybody having opened it, which is exactly what a seeded
   * Part looks like.
   */
  it('still refuses a filled Part that has not been looked at', () => {
    const filled = allFilled(base);

    expect(phase('scope').isComplete(draftWith({ contract: filled }))).toBe(false);
  });

  it('passes once it is both filled and confirmed', () => {
    const filled = { ...allFilled(base), reviewed: ['01'] };

    expect(phase('scope').isComplete(draftWith({ contract: filled }))).toBe(true);
  });

  /** An acknowledgement for a Part that is not on the contract counts for nothing. */
  it('is not satisfied by a confirmation for another Part', () => {
    const two = contractDoc({ codes: ['01', '02'] }).contract;
    const filled = { ...allFilled(two), reviewed: ['01'] };

    expect(phase('scope').isComplete(draftWith({ contract: filled }))).toBe(false);
  });

  /**
   * The fee is the next phase's. A Part filled everywhere but its fee still
   * passes here, or the phase would report a count for a field on another
   * screen.
   */
  it('lets a Part through with its fee still empty', () => {
    const keys = contractScopes(base)
      .filter((s) => s.scope.startsWith('part.01.') && !s.scope.endsWith('.fee'))
      .flatMap((s) => blanksOf(s.parsed))
      .map((b) => b.key);
    const exceptFee = {
      ...base,
      blanks: Object.fromEntries(keys.map((k) => [k, 'x'])),
      reviewed: ['01'],
    };

    expect(phase('scope').isComplete(draftWith({ contract: exceptFee }))).toBe(true);
    // And the next phase is the one that notices.
    expect(phase('terms').isComplete(draftWith({ contract: exceptFee }))).toBe(false);
  });

  /** An empty contract is not scoped, however few blanks that leaves. */
  it('refuses a contract with no Parts', () => {
    expect(phase('scope').isComplete(draftWith({ clientId: 'c1' }))).toBe(false);
  });
});

describe('phase 4, the terms', () => {
  it('wants the fees and the standing figures', () => {
    const { contract } = contractDoc({ codes: ['01'] });

    expect(phase('terms').isComplete(draftWith({ contract }))).toBe(false);
    expect(
      phase('terms').isComplete(draftWith({ contract: allFilled(contract) })),
    ).toBe(true);
  });
});

describe('phase 5, the preview', () => {
  /**
   * Never complete: it is where the document is read and issued, not a form.
   * Onboarding's last step has an end state because the record is the product;
   * here the product is the document.
   */
  it('is never marked done', () => {
    const { contract } = contractDoc({ codes: ['01'] });
    const full = { ...allFilled(contract), reviewed: ['01'] };

    expect(phase('preview').isComplete(draftWith({ clientId: 'c1', contract: full }))).toBe(
      false,
    );
  });
});

describe('a Part removed after being confirmed', () => {
  /**
   * The acknowledgement list can outlive the Part it named, the same way blank
   * values do. What matters is that a stale entry never stands in for a Part
   * that *is* there.
   */
  it('does not let a stale confirmation cover a new Part', () => {
    const { contract } = contractDoc({ codes: ['02'] });
    const filled = { ...allFilled(contract), reviewed: ['01'] };

    expect(phase('scope').isComplete(draftWith({ contract: filled }))).toBe(false);

    const both = { ...filled, reviewed: ['01', '02'], parts: [serviceByCode('02')] };
    expect(phase('scope').isComplete(draftWith({ contract: both }))).toBe(true);
  });
});

/**
 * Every figure a gate demands must have a screen that can type it.
 *
 * **This is the shape of a bug that actually shipped**, and it is why the test
 * is written as a rule rather than as a case. The fee was excluded by four
 * files in a row, each handing it to a neighbour: `ServiceSheet` ("it belongs
 * to the phase that decides what things cost"), `ScopePhase` ("stays with the
 * terms phase"), `summary.ts`, and `ContractFlow`'s `part.` filter on the
 * terms form. Every deferral was locally reasonable; between them the field
 * had no home, while `terms.isComplete` went on requiring it. The Terms button
 * could never enable and nothing on screen said why.
 *
 * What is asserted is the invariant the four files broke: the terms gate is
 * satisfiable. If a future change drops a blank from every form again, this
 * goes red at the gate rather than in somebody's browser.
 */
describe('the gates are satisfiable', () => {
  const { contract } = contractDoc({ codes: ['01', '05'] });

  it('passes terms once every blank a Part has is filled, fee included', () => {
    const full = { ...allFilled(contract), reviewed: ['01', '05'] };

    expect(phase('terms').isComplete(draftWith({ contract: full }))).toBe(true);
  });

  /**
   * And the fee is the specific one, named so the regression is legible: with
   * everything else filled, an empty fee is what holds the phase.
   */
  it('is held by the fee alone when nothing else is missing', () => {
    const full = allFilled(contract);
    const noFee = {
      ...full,
      blanks: Object.fromEntries(
        Object.entries(full.blanks).filter(([k]) => !k.includes('.fee#')),
      ),
      reviewed: ['01', '05'],
    };

    // The scope phase does not care: the fee is deliberately not its question.
    expect(phase('scope').isComplete(draftWith({ contract: noFee }))).toBe(true);
    // Terms is the one that does.
    expect(phase('terms').isComplete(draftWith({ contract: noFee }))).toBe(false);
  });
});
