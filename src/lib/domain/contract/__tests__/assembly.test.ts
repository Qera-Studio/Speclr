import { assemble, withLetter, type ContractPart } from '../assembly';
import type { ScheduleKey } from '../schedules';

function part(code: string, scheduleKey: ScheduleKey, sortOrder: number): ContractPart {
  return {
    code,
    name: `Service ${code}`,
    scheduleKey,
    sortOrder,
    archived: false,
    dependencies: [],
    pairings: [],
    overview: [],
    included: [],
    accountTerms: [],
    limits: [],
    limitsNotes: [],
    completion: [],
    receives: [],
    receivesNotes: [],
    thirdPartyCosts: '',
    exclusionIds: [],
    clientInputIds: [],
    fee: [],
  };
}

describe('assemble', () => {
  it('renders no Schedule at all when nothing is ticked', () => {
    expect(assemble([])).toEqual([]);
  });

  it('renders only the Schedules that have a Part', () => {
    const assembled = assemble([part('14', 'monthly', 14)]);
    expect(assembled).toHaveLength(1);
    expect(assembled[0].schedule.key).toBe('monthly');
    expect(assembled[0].parts.map((p) => p.label)).toEqual(['A-1']);
  });

  /**
   * The rule that catches people out (contract-system.md §4). Monthly is
   * Schedule 2 and Setup is Schedule 3, but a contract holding only those two
   * letters them A and B. Lettering has no gaps.
   */
  it('letters from A with no gaps when earlier Schedules are absent', () => {
    const assembled = assemble([part('14', 'monthly', 14), part('17', 'setup', 17)]);
    expect(assembled.map((s) => [s.schedule.key, s.letter])).toEqual([
      ['monthly', 'A'],
      ['setup', 'B'],
    ]);
  });

  it('orders Schedules canonically regardless of tick order', () => {
    const assembled = assemble([
      part('21', 'advice', 21),
      part('17', 'setup', 17),
      part('01', 'build', 1),
      part('11', 'monthly', 11),
    ]);
    expect(assembled.map((s) => s.schedule.key)).toEqual([
      'build',
      'monthly',
      'setup',
      'advice',
    ]);
    expect(assembled.map((s) => s.letter)).toEqual(['A', 'B', 'C', 'D']);
  });

  /** Ticking Brand identity first still yields Part A-1 Shopify. */
  it('orders Parts canonically regardless of tick order', () => {
    const assembled = assemble([part('05', 'build', 5), part('01', 'build', 1)]);
    expect(assembled[0].parts.map((p) => [p.part.code, p.label])).toEqual([
      ['01', 'A-1'],
      ['05', 'A-2'],
    ]);
  });

  it('numbers Parts within their own Schedule, not across the contract', () => {
    const assembled = assemble([
      part('01', 'build', 1),
      part('05', 'build', 5),
      part('11', 'monthly', 11),
    ]);
    expect(assembled[0].parts.map((p) => p.label)).toEqual(['A-1', 'A-2']);
    expect(assembled[1].parts.map((p) => p.label)).toEqual(['B-1']);
  });

  /** The worked example from contract-system.md §4. */
  it('assembles the worked example from the spec', () => {
    const assembled = assemble([
      part('01', 'build', 1),
      part('05', 'build', 5),
      part('12', 'monthly', 12),
      part('17', 'setup', 17),
    ]);
    expect(
      assembled.map((s) => [s.letter, s.parts.map((p) => `${p.label} ${p.part.code}`)]),
    ).toEqual([
      ['A', ['A-1 01', 'A-2 05']],
      ['B', ['B-1 12']],
      ['C', ['C-1 17']],
    ]);
  });
});

describe('withLetter', () => {
  it('substitutes the rendered letter into clause numbers and cross-references', () => {
    expect(withLetter('{L}9.3 Any period … under clause {L}9.2.', 'B')).toBe(
      'B9.3 Any period … under clause B9.2.',
    );
  });

  /**
   * The same clause reads differently in two contracts, which is exactly why
   * the letter is derived and never stored.
   */
  it('renders the same clause under whichever letter the contract assigns', () => {
    const clause = '{L}1.1 The Parts appended to this Schedule…';
    expect(withLetter(clause, 'A')).toContain('A1.1');
    expect(withLetter(clause, 'C')).toContain('C1.1');
  });
});
