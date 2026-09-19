import { SERVICES } from '../services';
import { PARTS } from '../parts';
import { serviceInputSchema } from '../../service';
import { SCHEDULE_BY_KEY } from '../../contract/schedules';

/**
 * The sales catalogue: 16 Services, 293 items, seeded from
 * `docs/service-catalogue.md` §5.
 *
 * This file is generated *from* that document, so what is worth testing is not
 * the transcription (a generator does not mistype a rate) but the rules the
 * document asserts about itself and the seams it has to satisfy: that every
 * `partCode` names a Part that exists, that no id is ever reissued, that money
 * is integer paise, and that the counts still match the spec. A rate changed by
 * hand in this file without the document changing is what these catch.
 */

describe('the sales catalogue', () => {
  it('carries the 16 services and 293 items the catalogue specifies', () => {
    expect(SERVICES).toHaveLength(16);
    expect(SERVICES.reduce((n, s) => n + (s.items?.length ?? 0), 0)).toBe(293);
  });

  it('gives every service a distinct code', () => {
    const codes = SERVICES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  /**
   * A Service and a Part share one table, so a sales code colliding with a
   * Part's would overwrite contract prose on the seed's insert.
   */
  it('never reuses a Part code', () => {
    const parts = new Set(PARTS.map((p) => p.code));
    for (const service of SERVICES) {
      expect(parts.has(service.code)).toBe(false);
    }
  });

  it('validates against the schema the Server Action uses', () => {
    for (const service of SERVICES) {
      const parsed = serviceInputSchema.safeParse(service);
      if (!parsed.success) {
        throw new Error(`${service.code}: ${JSON.stringify(parsed.error.issues)}`);
      }
      expect(parsed.success).toBe(true);
    }
  });

  it('belongs to exactly one Schedule each', () => {
    for (const service of SERVICES) {
      expect(SCHEDULE_BY_KEY[service.scheduleKey]).toBeDefined();
    }
  });

  /** `sortOrder` fixes position within a Schedule, so it must be unique there. */
  it('orders each Schedule without a tie', () => {
    for (const key of ['build', 'setup', 'retainer', 'audit'] as const) {
      const orders = SERVICES.filter((s) => s.scheduleKey === key).map((s) => s.sortOrder);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  /**
   * The seam between the two layers. A `partCode` naming nothing means a
   * contract built from this Service would pull an empty frame: no limits, no
   * completion criteria, no exclusions, and nobody would see it happen.
   */
  it('points every partCode at a Part that exists', () => {
    const parts = new Set(PARTS.map((p) => p.code));
    for (const service of SERVICES) {
      expect(service.partCodes?.length).toBeGreaterThan(0);
      for (const code of service.partCodes ?? []) {
        expect(parts.has(code)).toBe(true);
      }
    }
  });

  it('gives every service a SAC in the 9983 group', () => {
    for (const service of SERVICES) {
      expect(service.sacCode).toMatch(/^9983\d{2}$/);
    }
  });

  it('gives every service a blurb, which is what a quotation prints', () => {
    for (const service of SERVICES) {
      expect(service.blurb?.trim()).toBeTruthy();
      // A blurb is a paragraph, not the contract's scope list wearing a hat.
      expect(service.blurb!.length).toBeLessThanOrEqual(500);
    }
  });

  /**
   * A Service carries none of the Part's prose. If one ever does, the two
   * concepts have started to merge again, which is the thing this whole
   * exercise separated.
   */
  it('carries no contract prose, because that lives on the Part', () => {
    for (const service of SERVICES) {
      expect(service.included).toEqual([]);
      expect(service.limits).toEqual([]);
      expect(service.completion).toEqual([]);
      expect(service.receives).toEqual([]);
      expect(service.fee).toEqual([]);
      expect(service.exclusionIds).toEqual([]);
      expect(service.thirdPartyCosts).toBe('');
    }
  });
});

describe('the items under each service', () => {
  it('gives every item a distinct id within its service', () => {
    for (const service of SERVICES) {
      const ids = (service.items ?? []).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('shapes every id as I<n>', () => {
    for (const service of SERVICES) {
      for (const item of service.items ?? []) {
        expect(item.id).toMatch(/^I\d+$/);
      }
    }
  });

  /**
   * **The rule the whole id scheme exists for.** `itemSeq` is a high-water
   * mark: it must be at or above the highest id present, or the next item added
   * through the app would be handed an id a retired one already held, and a
   * client who agreed to that item would be seeded a different one at the rate
   * they agreed for the first.
   */
  it('keeps itemSeq at or above the highest id, so none is ever reissued', () => {
    for (const service of SERVICES) {
      const highest = Math.max(0, ...(service.items ?? []).map((i) => Number(i.id.slice(1))));
      expect(service.itemSeq).toBeGreaterThanOrEqual(highest);
    }
  });

  /**
   * The two deliberate gaps, pinned by name. `WEB` moved I35, I36 and I38 to
   * `ANLY`; `MNT` moved four items out. Closing either gap is the bug.
   */
  it('keeps the gaps the catalogue documents', () => {
    const web = SERVICES.find((s) => s.code === 'WEB')!;
    expect(web.items).toHaveLength(52);
    expect(web.itemSeq).toBe(55);
    for (const retired of ['I35', 'I36', 'I38']) {
      expect(web.items!.some((i) => i.id === retired)).toBe(false);
    }

    const mnt = SERVICES.find((s) => s.code === 'MNT')!;
    expect(mnt.items).toHaveLength(7);
    expect(mnt.itemSeq).toBe(11);
  });

  it('gives every item a name', () => {
    for (const service of SERVICES) {
      for (const item of service.items ?? []) {
        expect(item.name.trim()).toBeTruthy();
      }
    }
  });

  /** Money is integer paise. A float here is a rounding bug on every document. */
  it('prices every item in whole paise', () => {
    for (const service of SERVICES) {
      for (const item of service.items ?? []) {
        if (item.ratePaise !== undefined) {
          expect(Number.isInteger(item.ratePaise)).toBe(true);
          expect(item.ratePaise).toBeGreaterThan(0);
        }
      }
    }
  });

  /** Every rate came from a card in whole rupees, so none carries stray paise. */
  it('prices every item in whole rupees', () => {
    for (const service of SERVICES) {
      for (const item of service.items ?? []) {
        if (item.ratePaise !== undefined) expect(item.ratePaise % 100).toBe(0);
      }
    }
  });

  /**
   * The three unpriced items are `docs/service-catalogue.md` §8's open
   * questions, and an absent rate is a real answer ("quoted per engagement")
   * rather than a missing one: the document asks for a figure when the item is
   * ticked. Pinned so a fourth cannot appear unnoticed.
   *
   * `MAIL I2` is deliberately **not** here. §8's table still lists it as
   * unpriced, but §5 carries the ₹5,000 the Colorist quotation charged, and §5
   * is the table this file is generated from.
   */
  it('leaves exactly the three documented items unpriced', () => {
    const unpriced = SERVICES.flatMap((s) =>
      (s.items ?? []).filter((i) => i.ratePaise === undefined).map((i) => `${s.code} ${i.id}`),
    );
    expect(unpriced.sort()).toEqual(['ANLY I5', 'DNS I3', 'HOST I4']);
  });

  it('never tops a band below the rate it starts from', () => {
    for (const service of SERVICES) {
      for (const item of service.items ?? []) {
        if (item.rateMaxPaise !== undefined) {
          expect(item.ratePaise).toBeDefined();
          expect(item.rateMaxPaise).toBeGreaterThan(item.ratePaise!);
        }
      }
    }
  });

  /** A unit label is meaningful on a per-unit item and nowhere else. */
  it('labels every perUnit item and no other', () => {
    for (const service of SERVICES) {
      for (const item of service.items ?? []) {
        if (item.unit === 'perUnit') {
          expect(item.unitLabel).toBeTruthy();
        } else {
          expect(item.unitLabel).toBeUndefined();
        }
      }
    }
  });

  it('starts every item unarchived', () => {
    for (const service of SERVICES) {
      for (const item of service.items ?? []) {
        expect(item.archived).toBe(false);
      }
    }
  });
});
