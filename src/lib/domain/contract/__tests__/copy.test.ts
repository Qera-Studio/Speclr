import { copyPart, seedable, seedFromClient, withPart } from '../copy';
import { EXCLUSIONS, CLIENT_INPUTS } from '../seed/libraries';
import { serviceByCode } from './fixture';
import type { ClientRecord } from '../../types';

/**
 * The copy, and the seed that is its second caller.
 *
 * `copyPart` came out of `ContractEditor.commitPart` unchanged. The property
 * worth pinning is the one that is a compliance rule rather than a convenience:
 * a contract owns its words from the moment a Service is picked, so editing the
 * catalogue afterwards cannot reach an open draft (`CONTEXT.md` §5c).
 */

const client = (over: Partial<ClientRecord['commercial']> = {}): ClientRecord =>
  ({
    id: 'c1',
    name: 'Clayora',
    address: 'Noida',
    commercial: { ...over },
  }) as ClientRecord;

const catalogue = [serviceByCode('01'), serviceByCode('02')];

describe('copyPart', () => {
  it('carries the text of every library line the Part names', () => {
    const service = serviceByCode('01');
    const { part, library } = copyPart(service, EXCLUSIONS, CLIENT_INPUTS);

    for (const id of [...part.exclusionIds, ...part.clientInputIds]) {
      expect(library[id]).toEqual(expect.any(String));
    }
  });

  it('takes nothing for a line the Part does not name', () => {
    const service = serviceByCode('01');
    const { part, library } = copyPart(service, EXCLUSIONS, CLIENT_INPUTS);
    const named = new Set([...part.exclusionIds, ...part.clientInputIds]);

    for (const id of Object.keys(library)) expect(named.has(id)).toBe(true);
  });

  /**
   * The compliance half. The copy must not alias the catalogue row, or an edit
   * to the library would reach every draft holding it.
   */
  it('copies rather than referencing the catalogue row', () => {
    const service = serviceByCode('01');
    const { part } = copyPart(service, EXCLUSIONS, CLIENT_INPUTS);

    expect(part).not.toBe(service);
    part.name = 'Renamed on the contract';
    expect(serviceByCode('01').name).not.toBe('Renamed on the contract');
  });
});

describe('withPart', () => {
  const empty = { parts: [], blanks: {}, library: {} };

  it('adds a Part that is not there', () => {
    const next = withPart(empty, serviceByCode('01'), { E1: 'text' });

    expect(next.parts.map((p) => p.code)).toEqual(['01']);
    expect(next.library.E1).toBe('text');
  });

  it('replaces a Part that is, rather than adding a second', () => {
    const once = withPart(empty, serviceByCode('01'), {});
    const edited = { ...serviceByCode('01'), name: 'Edited' };
    const twice = withPart(once, edited, {});

    expect(twice.parts).toHaveLength(1);
    expect(twice.parts[0].name).toBe('Edited');
  });

  it('merges blanks rather than replacing them', () => {
    const first = withPart(empty, serviceByCode('01'), {}, { 'part.01.limits#1': '3' });
    const second = withPart(first, serviceByCode('02'), {}, { 'part.02.limits#1': '5' });

    expect(second.blanks).toEqual({
      'part.01.limits#1': '3',
      'part.02.limits#1': '5',
    });
  });
});

describe('seedFromClient', () => {
  it('takes a Part for every service the client is engaged for', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: '01' }, { code: '02' }] }),
      catalogue,
      EXCLUSIONS,
      CLIENT_INPUTS,
    );

    expect(seeded.parts.map((p) => p.code)).toEqual(['01', '02']);
  });

  /**
   * Deliberately unlike the invoice, which seeds retainers alone. An invoice
   * bills what recurs; a contract scopes the whole engagement, including the
   * one-off build.
   */
  it('does not filter to retainers the way the invoice does', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: '01' }], engagementType: 'project' }),
      catalogue,
      EXCLUSIONS,
      CLIENT_INPUTS,
    );

    expect(seeded.parts).toHaveLength(1);
  });

  /** A service archived since onboarding must not make the client unusable. */
  it('skips a code the catalogue no longer has', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: '01' }, { code: 'gone' }] }),
      catalogue,
      EXCLUSIONS,
      CLIENT_INPUTS,
    );

    expect(seeded.parts.map((p) => p.code)).toEqual(['01']);
  });

  it('brings the term and the start date with it', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: '01' }], termMonths: 12, startDate: '2026-07-01' }),
      catalogue,
      EXCLUSIONS,
      CLIENT_INPUTS,
    );

    expect(seeded.termMonths).toBe(12);
    expect(seeded.effectiveDate).toBe('2026-07-01');
  });

  /** An empty start date is absent, not an empty string on the document. */
  it('reads a blank start date as no date at all', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: '01' }], startDate: '' }),
      catalogue,
      EXCLUSIONS,
      CLIENT_INPUTS,
    );

    expect(seeded.effectiveDate).toBeUndefined();
  });

  it('seeds nothing for a client with no services', () => {
    const seeded = seedFromClient(client(), catalogue, EXCLUSIONS, CLIENT_INPUTS);

    expect(seeded.parts).toEqual([]);
    expect(seeded.library).toEqual({});
  });
});

describe('seedable', () => {
  it('is true for an untouched contract', () => {
    expect(seedable({ parts: [], blanks: {}, library: {} })).toBe(true);
  });

  /**
   * The guard that stops changing the client on a written contract from
   * throwing the writing away.
   */
  it('is false once there is a Part', () => {
    expect(
      seedable({ parts: [serviceByCode('01')], blanks: {}, library: {} }),
    ).toBe(false);
  });

  it('is false once a blank has been typed, even with no Parts', () => {
    expect(seedable({ parts: [], blanks: { 'msa.8#1': '30' }, library: {} })).toBe(false);
  });
});
