import { contractDoc } from '../../contract/__tests__/fixture';
import { assemble } from '../../contract/assembly';
import { PARTS } from '../parts';
import { SERVICES } from '../services';

/**
 * What archiving the 22 Parts does, and what it must not do.
 *
 * Step 5 of `docs/service-catalogue.md` seeds 16 sales Services and retires the
 * 22 Parts from the catalogue picker, because 38 rows in one catalogue would
 * offer the reader both "Custom web build" and "Custom Website". The Parts are
 * **archived, never deleted**: they still carry the contract prose, and a
 * Service names the frames it pulls through `partCodes`.
 *
 * The case worth proving is the open draft. A finalized contract is safe by
 * construction (it froze everything at finalize, `CONTEXT.md` §5c), but a draft
 * is the one that could plausibly resolve something live and come back empty.
 * It does not: a draft carries its own `contract.parts`, copied when the
 * service was ticked.
 */

describe('retiring the Parts', () => {
  /**
   * The whole reason the archive is safe. If a draft resolved its Parts from
   * the live table, this is the test that would go red the day one is archived,
   * and a contract in progress would lose its scope.
   */
  it('leaves an open draft holding its own copy of every Part', () => {
    const draft = contractDoc({ codes: ['01', '06', '15'], status: 'draft' });

    expect(draft.contract.parts).toHaveLength(3);
    expect(draft.contract.parts.map((p) => p.code)).toEqual(['01', '06', '15']);

    // Archiving the source rows is a change to the *table*, and a draft's copy
    // is a plain value on the document that nothing in the table can reach.
    const archived = PARTS.map((p) => ({ ...p, archived: true }));
    expect(archived.every((p) => p.archived)).toBe(true);
    expect(draft.contract.parts.every((p) => p.archived)).toBe(false);
  });

  it('still assembles a draft into its Schedules after the source is retired', () => {
    const draft = contractDoc({ codes: ['01', '06', '15'], status: 'draft' });
    const schedules = assemble(draft.contract.parts);

    // Three Parts across three Schedules: Setup, Build, Retainer.
    expect(schedules).toHaveLength(3);
    expect(schedules.flatMap((s) => s.parts)).toHaveLength(3);
    for (const schedule of schedules) {
      expect(schedule.parts.length).toBeGreaterThan(0);
    }
  });

  /**
   * The seam that has to hold once the Parts leave the picker: every frame a
   * Service names must still be reachable, or a contract built from the new
   * catalogue would pull nothing. Archiving hides a row from a list; it does
   * not remove it from `PARTS`.
   */
  it('keeps every frame a Service names reachable after the retirement', () => {
    const byCode = new Map(PARTS.map((p) => [p.code, p]));
    for (const service of SERVICES) {
      for (const code of service.partCodes ?? []) {
        const part = byCode.get(code);
        expect(part).toBeDefined();
        // The frame still carries what a contract needs from it.
        expect(part!.included.length).toBeGreaterThan(0);
        expect(part!.limits.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Between them the 16 Services reach most of the 22 Parts, and the ones they
   * do not reach are worth naming rather than discovering later: a Part nothing
   * points at is scope no sales route can sell.
   */
  it('names which Parts no Service currently reaches', () => {
    const named = new Set(SERVICES.flatMap((s) => s.partCodes ?? []));
    const orphans = PARTS.filter((p) => !named.has(p.code)).map((p) => p.code);

    // 04, 05, 07, 08, 11, 14: social account setup, the three other build
    // frames, e-commerce and the two remaining retainers. Each is real work
    // with no sales Service pointing at it yet, which is a catalogue gap and
    // not a bug. Pinned so closing one is a deliberate edit.
    expect(orphans).toEqual(['04', '05', '07', '08', '11', '14']);
  });
});
