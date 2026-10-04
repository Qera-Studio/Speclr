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

/**
 * The seam between a sold Service and its legal frame.
 *
 * `docs/service-catalogue.md` §2 splits the two: a Service is what is sold and
 * carries priced items, a Part is the frame with the fee blanks, scope, limits,
 * completion criteria and handover, and a Service names its frames through
 * `partCodes` rather than restating them.
 *
 * **Nothing read `partCodes`.** It was on the type, in the Zod schema and
 * asserted by two seed tests, while `copyPart` put the Service itself on the
 * contract as though it were the Part. All sixteen sales Services carry every
 * legal section empty, so a contract for one had no fee and no scope,
 * `contractScopes` found nothing to fill, three phases were vacuously complete,
 * and `contractComplete` returned zero unfilled — which let a contract with no
 * terms in it reach finalize and become immutable.
 *
 * Confirmed red before it was trusted: without `frameOf`, the first test here
 * reports 0 fee rows and 0 scope lines.
 */
describe('copyPart resolving partCodes', () => {
  /** A sold Service naming three frames, which is what `SOC` does. */
  const sold = () => ({
    ...serviceByCode('15'),
    code: 'SOC',
    name: 'Social Media',
    partCodes: ['15', '16', '17'],
    items: [{ id: 'I1', name: 'Profile optimisation', unit: 'fixed' as const, archived: false }],
    // The empty sections every sales Service actually carries.
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
  });

  const frames = ['15', '16', '17'].map(serviceByCode);

  it('takes the legal sections from the Parts it names', () => {
    const { part } = copyPart(sold(), EXCLUSIONS, CLIENT_INPUTS, undefined, frames);

    expect(part.fee.length).toBeGreaterThan(0);
    expect(part.included.length).toBeGreaterThan(0);
    expect(part.completion.length).toBeGreaterThan(0);
    expect(part.receives.length).toBeGreaterThan(0);
  });

  it('concatenates every frame it names, in partCodes order', () => {
    const { part } = copyPart(sold(), EXCLUSIONS, CLIENT_INPUTS, undefined, frames);
    const total = frames.reduce((sum, frame) => sum + frame.included.length, 0);

    expect(part.included).toHaveLength(total);
    expect(part.included.slice(0, frames[0].included.length)).toEqual(frames[0].included);
  });

  it('keeps the sold Service’s own identity and items', () => {
    const { part } = copyPart(sold(), EXCLUSIONS, CLIENT_INPUTS, undefined, frames);

    // The frame supplies the law; the Service stays what the client bought.
    expect(part.code).toBe('SOC');
    expect(part.name).toBe('Social Media');
    expect(part.items).toHaveLength(1);
  });

  it('carries the library text of exclusions the frame named', () => {
    const { part, library } = copyPart(sold(), EXCLUSIONS, CLIENT_INPUTS, undefined, frames);

    expect(part.exclusionIds.length).toBeGreaterThan(0);
    for (const id of [...part.exclusionIds, ...part.clientInputIds]) {
      expect(library[id]).toEqual(expect.any(String));
    }
  });

  it('de-duplicates an exclusion two frames both name', () => {
    const { part } = copyPart(sold(), EXCLUSIONS, CLIENT_INPUTS, undefined, frames);

    expect(new Set(part.exclusionIds).size).toBe(part.exclusionIds.length);
    expect(new Set(part.clientInputIds).size).toBe(part.clientInputIds.length);
  });

  it('leaves a Part that names no frame exactly as it was', () => {
    // The 22 legacy Parts carry their own sections and name nobody.
    const legacy = serviceByCode('15');
    const { part } = copyPart(legacy, EXCLUSIONS, CLIENT_INPUTS, undefined, frames);

    expect(part.included).toEqual(legacy.included);
    expect(part.fee).toEqual(legacy.fee);
  });

  it('skips a named frame that is not in the catalogue', () => {
    const orphan = { ...sold(), partCodes: ['99'] };
    const { part } = copyPart(orphan, EXCLUSIONS, CLIENT_INPUTS, undefined, frames);

    // Skipped rather than thrown: a Part renamed since the catalogue was
    // written should not make the Service unusable.
    expect(part.fee).toEqual([]);
  });
});

/**
 * The fee, derived from what onboarding already recorded.
 *
 * The invoice and the quotation have read `commercial.services[].ratePaise`
 * since `CONTEXT.md` §5i; the contract was the last document still asking for
 * the same figure a second time (`PRINCIPLES.md` rule 3).
 */
describe('seedFromClient filling the fee', () => {
  const frames = ['15', '16', '17'].map(serviceByCode);
  const sold = {
    ...serviceByCode('15'),
    code: 'SOC',
    name: 'Social Media',
    partCodes: ['15', '16', '17'],
    fee: [],
    included: [],
  };

  it('writes the agreed rate into the Part’s first fee blank', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: 'SOC', ratePaise: 4_500_000 }] }),
      [sold],
      EXCLUSIONS,
      CLIENT_INPUTS,
      frames,
    );

    // Formatted as `sanitiseBlank` would store it, so a seeded contract and a
    // hand-filled one are byte-identical.
    expect(seeded.blanks['part.SOC.fee#0']).toBe('₹45,000');
  });

  it('writes nothing when the client record names no rate', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: 'SOC' }] }),
      [sold],
      EXCLUSIONS,
      CLIENT_INPUTS,
      frames,
    );

    // Absent, never zero: a blank rate means the list price or "quoted per
    // engagement", and zero is a real rate meaning the work is given away.
    expect(seeded.blanks).toEqual({});
  });

  it('leaves the rest of the fee section for the terms phase', () => {
    const seeded = seedFromClient(
      client({ services: [{ code: 'SOC', ratePaise: 4_500_000 }] }),
      [sold],
      EXCLUSIONS,
      CLIENT_INPUTS,
      frames,
    );

    // Only the first fee row is the money the record knows. The payment split,
    // the timeline and the support window stay questions.
    expect(Object.keys(seeded.blanks)).toEqual(['part.SOC.fee#0']);
  });
});
