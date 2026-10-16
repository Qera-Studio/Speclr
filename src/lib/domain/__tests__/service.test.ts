import {
  hasOwnTerms,
  serviceContentSchema,
  servicePageData,
  termsOf,
  termsUsers,
  type ContractService,
} from '../service';
import { SERVICES } from '../seed/services';
import { PARTS } from '../seed/parts';

/**
 * A Service's items, as the **content schema** sees them.
 *
 * The item rules themselves (the rate band, the duplicate id, the units) are
 * `serviceItem.test.ts`'s. What is tested here is the seam: that a row written
 * before items existed still parses, that items survive the round trip, and
 * that a stored item is held to having an id where a posted one is not.
 *
 * Items are a **new array**, deliberately not `included[]`. `included[]` is
 * parsed for `[blanks]` and every one of those has hand-authored editor copy in
 * `blankMeta.ts`, which its test holds to an exact key set both ways; a form
 * writing into it would shift ordinals and move a client's stored figure onto
 * a different sentence. An item is never parsed for blanks, so nothing here can
 * reach that machinery. `blankMeta.test.ts` staying green with this file
 * present is the proof.
 */

/** A Service written before items existed: every list empty, no `items` key. */
const bare = {
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

describe("a service's items", () => {
  it('parses a row written before items existed', () => {
    const parsed = serviceContentSchema.safeParse(bare);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.items).toBeUndefined();
  });

  it('parses a list of priced items and keeps it', () => {
    const parsed = serviceContentSchema.safeParse({
      ...bare,
      items: [
        {
          id: 'I1',
          name: 'Dark/Light theme system',
          ratePaise: 12_000_00,
          unit: 'fixed',
          archived: false,
        },
        {
          id: 'I2',
          name: 'Mobile app UI',
          ratePaise: 5_000_00,
          unit: 'perUnit',
          unitLabel: 'per screen',
          group: 'Product & App',
          archived: false,
        },
        // Quoted per engagement: no rate at all is a legitimate item.
        { id: 'I3', name: 'Custom API integration', unit: 'fixed', archived: false },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(3);
      expect(parsed.data.items?.[1].unitLabel).toBe('per screen');
      expect(parsed.data.items?.[2].ratePaise).toBeUndefined();
    }
  });

  /**
   * `serviceItemsSchema` lets an id be blank, because that is how a form says
   * "new". By the time a list is stored the server has assigned one, so the
   * content schema is where the blank stops being acceptable.
   */
  it('refuses a stored item with no id', () => {
    const parsed = serviceContentSchema.safeParse({
      ...bare,
      items: [{ id: '', name: 'Unassigned', unit: 'fixed', archived: false }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe('An item needs an id.');
    }
  });

  /**
   * An id is what a client record and a quotation line cite, so two items
   * sharing one would make "the item the client chose" ambiguous.
   */
  it('refuses two items with one id', () => {
    const parsed = serviceContentSchema.safeParse({
      ...bare,
      items: [
        { id: 'I1', name: 'One', unit: 'fixed', archived: false },
        { id: 'I1', name: 'Two', unit: 'fixed', archived: false },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  /** The counter is a high-water mark and outlives the items it counted. */
  it('keeps an itemSeq above the number of items', () => {
    const parsed = serviceContentSchema.safeParse({ ...bare, items: [], itemSeq: 55 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.itemSeq).toBe(55);
  });
});

/**
 * The two fields that carry the other half of `docs/service-catalogue.md` §2:
 * a Service is sold and carries items, and it *names* the legal frames rather
 * than restating them.
 */
describe("a service's blurb and part codes", () => {
  it('parses a service that names the Parts a contract pulls', () => {
    const parsed = serviceContentSchema.safeParse({
      ...bare,
      blurb: 'A website built in code rather than on a visual builder.',
      partCodes: ['06'],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.partCodes).toEqual(['06']);
  });

  /** A Part names none, which is how the twenty-two rows still parse. */
  it('leaves both absent on a row that carries neither', () => {
    const parsed = serviceContentSchema.safeParse(bare);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.blurb).toBeUndefined();
      expect(parsed.data.partCodes).toBeUndefined();
    }
  });
});

describe('the service page data', () => {
  const all: ContractService[] = [...SERVICES, ...PARTS];

  it('finds the terms a service names, in its own order', () => {
    expect(termsOf(SERVICES.find((s) => s.code === 'SOC')!, all).map((t) => t.code)).toEqual([
      '15',
      '16',
      '17',
    ]);
  });

  it('finds the services that use a set of terms', () => {
    expect(termsUsers('10', all).map((s) => s.code)).toEqual(['DSGN', 'APP']);
    expect(termsUsers('WEB', all)).toEqual([]);
  });

  /** Every sold service carries none of its own; every Part carries some. */
  it('tells a row with terms of its own from one without', () => {
    expect(SERVICES.some(hasOwnTerms)).toBe(false);
    expect(PARTS.every(hasOwnTerms)).toBe(true);
  });

  it('names, for each set of terms, the other services sharing it', () => {
    const data = servicePageData('DSGN', all)!;
    expect(data.terms.map((t) => t.code)).toEqual(['10']);
    expect(data.sharedWith['10'].map((s) => s.code)).toEqual(['APP']);
    expect(servicePageData('NOPE', all)).toBeNull();
  });
});
