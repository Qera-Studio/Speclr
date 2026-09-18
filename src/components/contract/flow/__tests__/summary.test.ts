import { contractSummary, termPhrase } from '../summary';
import type { ContractDraft } from '../phases';

/**
 * The rail is derived per render, so what is tested is the derivation: nothing
 * here is stored and there is no state to drive.
 */

const draftOf = (over: Partial<ContractDraft> = {}): ContractDraft => ({
  clientId: 'c1',
  issueDate: '2026-06-10',
  contract: { parts: [], blanks: {}, library: {} },
  content: {},
  ...over,
});

describe('termPhrase', () => {
  it('reads as a duration when there is a term', () => {
    expect(termPhrase('2026-06-10', undefined, 12)).toBe(
      '10 Jun 2026 → 10 Jun 2027 (12 months)',
    );
  });

  it('says one month in the singular', () => {
    expect(termPhrase('2026-06-10', undefined, 1)).toBe(
      '10 Jun 2026 → 10 Jul 2026 (1 month)',
    );
  });

  /**
   * The effective date is what starts the term, not the agreement date. The
   * two differ whenever work began on a handshake and the paperwork caught up,
   * which is the case `effectiveDate` exists to record.
   */
  it('runs the term from the effective date when there is one', () => {
    expect(termPhrase('2026-06-10', '2026-07-01', 12)).toBe(
      '1 Jul 2026 → 1 Jul 2027 (12 months)',
    );
  });

  it('falls back to the agreement date when the effective one is unusable', () => {
    expect(termPhrase('2026-06-10', '', 12)).toContain('10 Jun 2026');
    expect(termPhrase('2026-06-10', 'nonsense', 12)).toContain('10 Jun 2026');
  });

  /** No term is no end date, rather than an invented duration. */
  it('prints the start alone when there is no term', () => {
    expect(termPhrase('2026-06-10')).toBe('10 Jun 2026');
    expect(termPhrase('2026-06-10', undefined, 0)).toBe('10 Jun 2026');
  });

  it('is empty when there is no usable start', () => {
    expect(termPhrase('')).toBe('');
    expect(termPhrase('2026-02-31')).toBe('');
  });
});

describe('contractSummary', () => {
  /**
   * The rail reports what is settled and nothing else, so a phase with nothing
   * decided contributes no group. On the first phase that leaves one heading
   * and the engagement's facts, which is item 6 of the brief: the rail grows
   * with the flow rather than standing as a checklist of what is missing.
   */
  it('returns only the groups that have something to say', () => {
    const groups = contractSummary(draftOf(), 'Clayora');
    expect(groups.map((g) => g.phase)).toEqual(['client']);
  });

  it('drops a group entirely rather than printing an empty state', () => {
    const values = contractSummary(draftOf(), 'Clayora').flatMap((g) =>
      g.lines.map((l) => l.value),
    );
    for (const empty of ['None yet', 'No services', 'Not chosen', 'Not set']) {
      expect(values).not.toContain(empty);
    }
  });

  it('names the client once there is one', () => {
    const [engagement] = contractSummary(draftOf(), 'Clayora');
    expect(engagement.lines[0]).toMatchObject({ label: 'Client', value: 'Clayora' });
  });

  /** With no client and no usable date there is nothing to summarise at all. */
  it('is empty when nothing has been decided', () => {
    expect(contractSummary(draftOf({ clientId: '', issueDate: '' }))).toEqual([]);
  });

  it('says how many services are reviewed, out of how many there are', () => {
    const parts = [
      { code: '05', name: 'Shopify storefront' },
      { code: '17', name: 'Paid social' },
    ];
    const groups = contractSummary(
      draftOf({
        contract: {
          parts: parts as never,
          blanks: {},
          library: {},
          reviewed: ['05'],
        },
      }),
    );
    // One group since Scope merged into Services: the count sits with the list
    // it counts, after the services themselves.
    const services = groups.find((g) => g.phase === 'services')!;
    expect(services.lines).toContainEqual({ label: 'Reviewed', value: '1 of 2' });
  });

  /**
   * The wording is the point of this one. The scope ledger owns "N to fill",
   * and the rail sits beside it, so two counts must not share one phrase.
   * `contract-flow.spec.ts` asserts the ledger's phrase is absent when nothing
   * is missing, and went red when this borrowed it.
   */
  it('never borrows the ledger’s own "to fill" wording', () => {
    const groups = contractSummary(
      draftOf({
        contract: { parts: [{ code: '05', name: 'S' }] as never, blanks: {}, library: {} },
      }),
    );
    const values = groups.flatMap((g) => g.lines.map((l) => l.value));
    expect(values.some((v) => /to fill/.test(v))).toBe(false);
  });
});
