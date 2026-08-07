/**
 * Integrity of the transcribed contract text.
 *
 * Four thousand lines of legal content were copied out of `docs/` by hand, and
 * the failure mode of that job is silent: a service pointing at an exclusion id
 * that does not exist prints one fewer "not included" line than it should, and
 * nothing complains. These tests are the proof-read.
 */

import { parseScope } from '../blanks';
import { MSA_CLAUSES } from '../msa';
import { SCHEDULES, SCHEDULE_BY_KEY } from '../schedules';
import { serviceInputSchema } from '../service';
import { CLIENT_INPUTS, EXCLUSIONS } from '../seed/libraries';
import { SERVICES } from '../seed/services';

describe('the Master Service Agreement', () => {
  it('carries 28 clauses numbered 1 to 28', () => {
    expect(MSA_CLAUSES.map((c) => c.number)).toEqual(
      Array.from({ length: 28 }, (_, i) => i + 1),
    );
  });

  it('gives every clause a heading and at least one paragraph', () => {
    for (const clause of MSA_CLAUSES) {
      expect(clause.heading.trim()).not.toBe('');
      expect(clause.body.length).toBeGreaterThan(0);
      expect(clause.body.every((p) => p.trim() !== '')).toBe(true);
    }
  });

  /**
   * `{L}` is a Schedule's rendered letter. The Agreement has no letter, so a
   * stray one here would print literally in a signed contract.
   */
  it('contains no schedule-letter placeholder', () => {
    for (const clause of MSA_CLAUSES) {
      expect(clause.body.join(' ')).not.toContain('{L}');
    }
  });

  /** The six gaps content §1 required the new Agreement to close. */
  it.each([
    ['client indemnity', 20, /Client shall indemnify Qera/],
    ['late payment interest', 8, /Interest shall accrue/],
    ['non-solicitation', 23, /shall directly solicit/],
    ['data protection', 14, /Digital Personal Data Protection Act, 2023/],
    ['credential return on termination', 25, /transfer or release every account/],
  ])('closes the %s gap at clause %i', (_name, number, pattern) => {
    const clause = MSA_CLAUSES.find((c) => c.number === number);
    expect(clause?.body.join(' ')).toMatch(pattern);
  });

  /** Content §1: the entity is Qera Private Limited; Qera Studio is a trading name. */
  it('never names Qera Studio as a party', () => {
    const prose = MSA_CLAUSES.flatMap((c) => c.body).join(' ');
    // The attribution credit at clause 12.2 is the one permitted mention.
    const mentions = prose.match(/Qera Studio/g) ?? [];
    expect(mentions).toHaveLength(1);
    expect(MSA_CLAUSES.find((c) => c.number === 12)?.body.join(' ')).toContain(
      'Made by Qera Studio',
    );
  });
});

describe('the Schedules', () => {
  it('are exactly the four, in canonical order', () => {
    expect(SCHEDULES.map((s) => s.key)).toEqual(['build', 'monthly', 'setup', 'advice']);
    expect(SCHEDULES.map((s) => s.number)).toEqual([1, 2, 3, 4]);
  });

  it('are reachable by key', () => {
    expect(SCHEDULE_BY_KEY.build.name).toBe('Build');
    expect(SCHEDULE_BY_KEY.advice.number).toBe(4);
  });

  it('number every clause sequentially from 1', () => {
    for (const schedule of SCHEDULES) {
      expect(schedule.clauses.map((c) => c.number)).toEqual(
        schedule.clauses.map((_, i) => i + 1),
      );
    }
  });

  /**
   * Content §3b–§3d numbered these `[letter]0.1`. Schedule 1's style won, so
   * no `0.` survives the transcription.
   */
  it('carries no clause numbered zero', () => {
    for (const schedule of SCHEDULES) {
      for (const clause of schedule.clauses) {
        expect(clause.body.join(' ')).not.toMatch(/\{L\}0\./);
      }
    }
  });

  /**
   * Every clause paragraph opens with its own `{L}`-prefixed number, so the
   * rendered document is navigable and cross-references resolve. Bullets are
   * the exception: they continue the paragraph above them.
   */
  it('prefixes every non-bullet paragraph with its clause number', () => {
    for (const schedule of SCHEDULES) {
      for (const clause of schedule.clauses) {
        for (const paragraph of clause.body) {
          if (paragraph.startsWith('- ')) continue;
          expect(paragraph).toMatch(new RegExp(`^\\{L\\}${clause.number}\\.\\d+ `));
        }
      }
    }
  });
});

describe('the libraries', () => {
  it('seed 91 exclusions and 65 client inputs', () => {
    expect(EXCLUSIONS).toHaveLength(91);
    expect(CLIENT_INPUTS).toHaveLength(65);
  });

  it('number them E01–E91 and I01–I65 with no gaps or repeats', () => {
    expect(EXCLUSIONS.map((e) => e.id)).toEqual(
      Array.from({ length: 91 }, (_, i) => `E${String(i + 1).padStart(2, '0')}`),
    );
    expect(CLIENT_INPUTS.map((c) => c.id)).toEqual(
      Array.from({ length: 65 }, (_, i) => `I${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('give every line a category and non-empty text', () => {
    for (const line of [...EXCLUSIONS, ...CLIENT_INPUTS]) {
      expect(line.text.trim()).not.toBe('');
      expect(line.category.trim()).not.toBe('');
      expect(line.archived).toBe(false);
    }
  });
});

describe('the seeded Services', () => {
  const exclusionIds = new Set(EXCLUSIONS.map((e) => e.id));
  const inputIds = new Set(CLIENT_INPUTS.map((c) => c.id));

  it('loads Parts 01, 02 and 05 to prove the schema holds', () => {
    expect(SERVICES.map((s) => s.code)).toEqual(['01', '02', '05']);
  });

  it('validates against the schema the Server Action uses', () => {
    for (const service of SERVICES) {
      expect(serviceInputSchema.safeParse(service).success).toBe(true);
    }
  });

  /** The silent failure this whole file exists to catch. */
  it('attaches only exclusions that exist in the library', () => {
    for (const service of SERVICES) {
      for (const id of service.exclusionIds) {
        expect(exclusionIds.has(id)).toBe(true);
      }
    }
  });

  it('attaches only client inputs that exist in the library', () => {
    for (const service of SERVICES) {
      for (const id of service.clientInputIds) {
        expect(inputIds.has(id)).toBe(true);
      }
    }
  });

  it('attaches no id twice', () => {
    for (const service of SERVICES) {
      expect(new Set(service.exclusionIds).size).toBe(service.exclusionIds.length);
      expect(new Set(service.clientInputIds).size).toBe(service.clientInputIds.length);
    }
  });

  it('points every dependency and pairing at a real service code', () => {
    for (const service of SERVICES) {
      for (const code of [...service.dependencies, ...service.pairings]) {
        expect(code).toMatch(/^\d{2}$/);
        expect(Number(code)).toBeGreaterThanOrEqual(1);
        expect(Number(code)).toBeLessThanOrEqual(22);
      }
    }
  });

  it('belongs to exactly one Schedule each', () => {
    for (const service of SERVICES) {
      expect(SCHEDULE_BY_KEY[service.scheduleKey]).toBeDefined();
    }
  });

  /** A Part with no fee cannot be quoted, and Fee is the blank that blocks export. */
  it('gives every Part a Fee row drafted empty', () => {
    for (const service of SERVICES) {
      const fee = service.fee.find((row) => row.label === 'Fee');
      expect(fee?.value).toBe('[ ]');
    }
  });

  /** Every bracket must be parseable, or a blank silently prints as literal text. */
  it('parses every blank in every Part', () => {
    for (const service of SERVICES) {
      const texts = [
        ...service.included,
        ...service.accountTerms,
        ...service.limits.map((r) => r.value),
        ...service.fee.map((r) => r.value),
      ];
      const parsed = parseScope(`part.${service.code}`, texts);
      // Round-tripping the defaults reproduces the source minus its brackets.
      parsed.forEach((p, i) => {
        expect(p.segments.length).toBe(p.blanks.length + 1);
        expect(p.blanks.every((b) => !b.fallback.includes('['))).toBe(true);
        expect(texts[i]).toBeDefined();
      });
    }
  });
});
