import {
  assignItemIds,
  itemAmountPaise,
  itemRateUnit,
  serviceItemSchema,
  serviceItemsSchema,
  type ServiceItem,
} from '../serviceItem';

/**
 * Item ids are assigned once and never reissued.
 *
 * A client record cites them (`itemIds`) and so does a quotation line. If a
 * deleted item's id were handed to a new one, a client who agreed "I5, the
 * analytics set-up" would be seeded "I5, the booking system" onto their next
 * document, at the rate they agreed for the other thing. So the Service carries
 * the highest number it has ever given out, and assignment counts past that,
 * past every id in the stored list, and past every id in the incoming one,
 * exactly as a clause number counts past archived clauses.
 *
 * These cases are `menuIds.test.ts` ported: the rule is unchanged and the
 * coverage was right. Breaking `itemSeq` must turn them red.
 */

const stored = (ids: string[]): ServiceItem[] =>
  ids.map((id) => ({ id, name: `Item ${id}`, unit: 'fixed', archived: false }));

const fresh = (name: string): ServiceItem => ({
  id: '',
  name,
  unit: 'fixed',
  archived: false,
});

describe('assignItemIds', () => {
  it('gives a new item the next id and records it as the highest given', () => {
    const { items, itemSeq } = assignItemIds(
      { items: stored(['I1', 'I2']), itemSeq: 2 },
      [...stored(['I1', 'I2']), fresh('New')],
    );
    expect(items.map((i) => i.id)).toEqual(['I1', 'I2', 'I3']);
    expect(itemSeq).toBe(3);
  });

  /**
   * I3 was deleted in an earlier save, so it is in neither list. The counter is
   * what remembers it existed. This is the case that fails if `itemSeq` is
   * dropped from the floor.
   */
  it('never reissues an id a deleted item once held', () => {
    const { items, itemSeq } = assignItemIds(
      { items: stored(['I1', 'I2']), itemSeq: 3 },
      [...stored(['I1', 'I2']), fresh('New')],
    );
    expect(items.map((i) => i.id)).toEqual(['I1', 'I2', 'I4']);
    expect(itemSeq).toBe(4);
  });

  /** An item dropped in *this* save is still in the stored list, and counts. */
  it('counts past an item being removed in the same save', () => {
    const { items, itemSeq } = assignItemIds(
      { items: stored(['I1', 'I2', 'I3']), itemSeq: 3 },
      [...stored(['I1']), fresh('New')],
    );
    expect(items.map((i) => i.id)).toEqual(['I1', 'I4']);
    expect(itemSeq).toBe(4);
  });

  /**
   * A row written before the counter existed, or one whose list was loaded by
   * the import script: the highest id present is the floor.
   */
  it('starts from the highest id present when there is no counter', () => {
    const { items, itemSeq } = assignItemIds({ items: stored(['I1', 'I7']) }, [
      ...stored(['I1', 'I7']),
      fresh('New'),
    ]);
    expect(items.map((i) => i.id)).toEqual(['I1', 'I7', 'I8']);
    expect(itemSeq).toBe(8);
  });

  it('starts at I1 on a service with no items at all', () => {
    const { items, itemSeq } = assignItemIds({}, [fresh('First')]);
    expect(items.map((i) => i.id)).toEqual(['I1']);
    expect(itemSeq).toBe(1);
  });

  /** `Math.max()` over two empty spreads answers -Infinity without the `?? 0`. */
  it('answers a sane counter for an empty save on an empty service', () => {
    expect(assignItemIds({}, [])).toEqual({ items: [], itemSeq: 0 });
  });

  it('leaves an existing id alone and keeps the incoming order', () => {
    const { items } = assignItemIds({ items: stored(['I1', 'I2']), itemSeq: 2 }, [
      fresh('Inserted first'),
      ...stored(['I2', 'I1']),
    ]);
    expect(items.map((i) => i.id)).toEqual(['I3', 'I2', 'I1']);
  });

  it('gives several new items distinct ids in order', () => {
    const { items, itemSeq } = assignItemIds({ items: stored(['I1']), itemSeq: 1 }, [
      ...stored(['I1']),
      fresh('A'),
      fresh('B'),
    ]);
    expect(items.map((i) => i.id)).toEqual(['I1', 'I2', 'I3']);
    expect(itemSeq).toBe(3);
  });

  /**
   * The gap `docs/service-catalogue.md` ships with: `WEB` carries 52 items and
   * `itemSeq: 55`, because three moved to `ANLY`. Closing it is the bug.
   */
  it('keeps a high-water mark above the number of live items', () => {
    const { itemSeq } = assignItemIds(
      { items: stored(['I1', 'I2']), itemSeq: 55 },
      stored(['I1', 'I2']),
    );
    expect(itemSeq).toBe(55);
  });

  /** An id from somewhere else must not raise the counter into nonsense. */
  it('ignores an id that is not in the I<n> shape', () => {
    const { items, itemSeq } = assignItemIds(
      { items: [{ id: 'M9', name: 'Foreign', unit: 'fixed', archived: false }] },
      [{ id: 'M9', name: 'Foreign', unit: 'fixed', archived: false }, fresh('New')],
    );
    expect(items.map((i) => i.id)).toEqual(['M9', 'I1']);
    expect(itemSeq).toBe(1);
  });
});

describe('itemAmountPaise', () => {
  const at = (unit: ServiceItem['unit'], ratePaise: number): ServiceItem => ({
    id: 'I1',
    name: 'Line',
    unit,
    ratePaise,
    archived: false,
  });

  it('multiplies a perUnit rate by the quantity', () => {
    expect(itemAmountPaise(at('perUnit', 400_000), 3)).toBe(1_200_000);
  });

  /**
   * A fixed fee is the fee whatever is typed in the quantity box, and a monthly
   * rate is one month's. Multiplying either would put a figure on an invoice
   * that the agreed rate does not support.
   */
  it('ignores the quantity on a fixed fee and a monthly rate', () => {
    expect(itemAmountPaise(at('fixed', 2_500_000), 4)).toBe(2_500_000);
    expect(itemAmountPaise(at('monthly', 800_000), 4)).toBe(800_000);
  });

  it('reads an absent rate as zero rather than throwing', () => {
    const quoted: ServiceItem = { id: 'I1', name: 'Quoted', unit: 'fixed', archived: false };
    expect(itemAmountPaise(quoted)).toBe(0);
  });

  /** Money is integer paise. A fractional quantity must not produce one. */
  it('never returns a fraction of a paisa', () => {
    expect(itemAmountPaise(at('perUnit', 333_333), 2.7)).toBe(666_666);
  });

  it('floors a negative quantity at zero', () => {
    expect(itemAmountPaise(at('perUnit', 400_000), -2)).toBe(0);
  });
});

describe('itemRateUnit', () => {
  const unit = (u: ServiceItem['unit'], unitLabel?: string): string =>
    itemRateUnit({ id: 'I1', name: 'x', unit: u, unitLabel, archived: false });

  it('names each unit the way it reads beside a rate', () => {
    expect(unit('fixed')).toBe('fixed');
    expect(unit('monthly')).toBe('a month');
    expect(unit('perUnit', 'per page')).toBe('per page');
  });

  it('falls back when a perUnit item never got a label', () => {
    expect(unit('perUnit')).toBe('per unit');
  });
});

describe('serviceItemSchema', () => {
  const valid = {
    id: 'I1',
    name: 'Core website setup',
    unit: 'fixed' as const,
    ratePaise: 2_500_000,
    archived: false,
  };

  it('accepts an ordinary item', () => {
    expect(serviceItemSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an item with no rate, which means quoted per engagement', () => {
    const { ratePaise, ...quoted } = valid;
    expect(serviceItemSchema.safeParse(quoted).success).toBe(true);
  });

  it('refuses an item with no name', () => {
    const result = serviceItemSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('An item needs a name.');
    }
  });

  /** A band printing backwards on a quotation is cheaper to refuse than sort. */
  it('refuses a range whose top is below its rate', () => {
    const result = serviceItemSchema.safeParse({
      ...valid,
      ratePaise: 2_500_000,
      rateMaxPaise: 800_000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'The top of the range cannot be below the rate.',
      );
    }
  });

  it('refuses a top with no rate to start from', () => {
    const { ratePaise, ...noRate } = valid;
    const result = serviceItemSchema.safeParse({ ...noRate, rateMaxPaise: 800_000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('A range needs a rate to start from.');
    }
  });

  it('accepts a band whose ends agree', () => {
    const result = serviceItemSchema.safeParse({
      ...valid,
      ratePaise: 800_000,
      rateMaxPaise: 800_000,
    });
    expect(result.success).toBe(true);
  });

  it('refuses a fractional rate, because money is integer paise', () => {
    expect(serviceItemSchema.safeParse({ ...valid, ratePaise: 100.5 }).success).toBe(false);
  });
});

describe('serviceItemsSchema', () => {
  const item = (id: string): ServiceItem => ({
    id,
    name: `Item ${id}`,
    unit: 'fixed',
    archived: false,
  });

  it('accepts a list of distinct items', () => {
    expect(serviceItemsSchema.safeParse([item('I1'), item('I2')]).success).toBe(true);
  });

  /**
   * Two rows under one id: `assignItemIds` would keep both and whichever is
   * looked up second would silently win.
   */
  it('refuses a duplicate id, naming it', () => {
    const result = serviceItemsSchema.safeParse([item('I1'), item('I2'), item('I1')]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Item I1 appears twice.');
    }
  });

  /** Several new items all arrive as `id: ''` and are not duplicates yet. */
  it('allows more than one blank id, because blank means new', () => {
    const blank: ServiceItem = { id: '', name: 'New', unit: 'fixed', archived: false };
    expect(serviceItemsSchema.safeParse([blank, { ...blank, name: 'Other' }]).success).toBe(
      true,
    );
  });

  it('accepts an empty list', () => {
    expect(serviceItemsSchema.safeParse([]).success).toBe(true);
  });
});
