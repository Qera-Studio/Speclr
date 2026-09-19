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

/** A catalogue Service carrying items, which is what all 16 sales rows are. */
const withItems = () => ({
  ...serviceByCode('01'),
  code: 'WEB',
  name: 'Custom Website',
  itemSeq: 55,
  items: [
    { id: 'I4', name: 'Core website setup (5 pages)', unit: 'fixed' as const, archived: false },
    { id: 'I11', name: 'GSAP motion system', unit: 'fixed' as const, archived: false },
    { id: 'I47', name: 'Custom CMS development', unit: 'fixed' as const, archived: false },
    { id: 'I99', name: 'Retired line', unit: 'fixed' as const, archived: true },
  ],
});

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

  /**
   * A Service is a container, and the contract prints its items as the
   * Deliverables. Copying all 52 of `WEB` onto a contract would promise work
   * nobody agreed to and nobody is paying for, which is a scope commitment
   * rather than a cosmetic excess.
   */
  describe('narrowing the items to what was agreed', () => {
    it('keeps only the items named, in catalogue order', () => {
      const { part } = copyPart(withItems(), EXCLUSIONS, CLIENT_INPUTS, [
        { id: 'I47' },
        { id: 'I4' },
      ]);
      expect(part.items?.map((i) => i.id)).toEqual(['I4', 'I47']);
    });

    it('never carries an archived item, even when the record names it', () => {
      const { part } = copyPart(withItems(), EXCLUSIONS, CLIENT_INPUTS, [
        { id: 'I4' },
        { id: 'I99' },
      ]);
      expect(part.items?.map((i) => i.id)).toEqual(['I4']);
    });

    it('skips an id the catalogue no longer carries', () => {
      const { part } = copyPart(withItems(), EXCLUSIONS, CLIENT_INPUTS, [
        { id: 'I4' },
        { id: 'I404' },
      ]);
      expect(part.items?.map((i) => i.id)).toEqual(['I4']);
    });

    /**
     * `undefined` and `[]` are different answers. No list at all means the
     * Service was picked by hand in the services phase, where choosing the
     * Service is the act and the scope phase narrows it afterwards.
     */
    it('copies the Service whole when no list is given', () => {
      const { part } = copyPart(withItems(), EXCLUSIONS, CLIENT_INPUTS);
      expect(part.items).toHaveLength(4);
    });

    /** An empty list is a client engaged on the Service as one line. */
    it('carries no items for an engagement that named none', () => {
      const { part } = copyPart(withItems(), EXCLUSIONS, CLIENT_INPUTS, []);
      expect(part.items).toEqual([]);
    });

    /** The narrowing must not write back onto the catalogue row. */
    it('leaves the catalogue row holding all of its items', () => {
      const service = withItems();
      copyPart(service, EXCLUSIONS, CLIENT_INPUTS, [{ id: 'I4' }]);
      expect(service.items).toHaveLength(4);
    });
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
   * The seam this step exists for: what onboarding recorded the client buying
   * becomes the contract's Deliverables list.
   */
  it("narrows each Part to the items the client's record names", () => {
    const seeded = seedFromClient(
      client({ services: [{ code: 'WEB', items: [{ id: 'I4' }, { id: 'I47' }] }] }),
      [withItems()],
      EXCLUSIONS,
      CLIENT_INPUTS,
    );

    expect(seeded.parts[0].items?.map((i) => i.name)).toEqual([
      'Core website setup (5 pages)',
      'Custom CMS development',
    ]);
  });

  it('carries every item for a client engaged on the service as one line', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: 'WEB' }] }),
      [withItems()],
      EXCLUSIONS,
      CLIENT_INPUTS,
    );

    // No list on the record means nothing to narrow to, so the Part keeps the
    // catalogue's items and the scope phase is where they get chosen.
    expect(seeded.parts[0].items).toHaveLength(4);
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
