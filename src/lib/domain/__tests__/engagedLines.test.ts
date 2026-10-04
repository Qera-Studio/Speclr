import { allEngagedLines, engagedLines, engagedTotalPaise } from '../engagedLines';
import { EMPTY_PART_CONTENT, type ContractService } from '../service';
import type { ServiceItem } from '../serviceItem';

/**
 * What a client's engagement becomes on a document.
 *
 * The rate cascade is what these mostly pin: the rate agreed for the item, then
 * the item's list price, then nothing. Getting that order wrong puts the wrong
 * figure on a tax invoice, which is the failure this whole record exists to
 * prevent, so each step is tested on its own rather than only in combination.
 */

const item = (id: string, name: string, ratePaise?: number, extra: Partial<ServiceItem> = {}):
  ServiceItem => ({ id, name, unit: 'fixed', archived: false, ratePaise, ...extra });

const service = (over: Partial<ContractService> = {}): ContractService => ({
  ...EMPTY_PART_CONTENT,
  code: 'SOC',
  name: 'Social Media',
  scheduleKey: 'retainer',
  sortOrder: 3,
  archived: false,
  sacCode: '998361',
  items: [
    item('I10', 'Bundle: 10 reels a month', 45_00_000),
    item('I21', 'Posting + scheduling', 10_00_000),
    item('I32', 'Monthly performance report', 10_00_000),
  ],
  itemSeq: 32,
  ...over,
});

describe('engagedLines', () => {
  /**
   * A record written before items existed, or a Service genuinely billed as one
   * figure. Collapsing it into every item the Service carries would invent
   * detail nobody agreed to.
   */
  it('produces one line for a service engaged without items', () => {
    const lines = engagedLines({ code: 'SOC', ratePaise: 45_00_000 }, service());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      name: 'Social Media',
      ratePaise: 45_00_000,
      sacCode: '998361',
    });
  });

  it('produces one line per agreed item, in the order the record names them', () => {
    const lines = engagedLines(
      { code: 'SOC', items: [{ id: 'I10' }, { id: 'I32' }] },
      service(),
    );
    expect(lines.map((l) => l.name)).toEqual([
      'Bundle: 10 reels a month',
      'Monthly performance report',
    ]);
  });

  /** Step 1 of the cascade: what this client agreed beats the list price. */
  it("prefers the client's agreed rate over the catalogue's", () => {
    const lines = engagedLines(
      { code: 'SOC', items: [{ id: 'I10', ratePaise: 38_00_000 }] },
      service(),
    );
    expect(lines[0].ratePaise).toBe(38_00_000);
  });

  /** Step 2: no agreed rate means the catalogue's, which is the ordinary case. */
  it("falls back to the item's list price", () => {
    const lines = engagedLines({ code: 'SOC', items: [{ id: 'I10' }] }, service());
    expect(lines[0].ratePaise).toBe(45_00_000);
  });

  /**
   * Step 3, and the one worth stating: absent is absent. Zero is a real rate
   * meaning the work is given away, so resolving "not priced" to it would put a
   * free line on an invoice.
   */
  it('leaves the rate absent where neither the record nor the catalogue has one', () => {
    const lines = engagedLines(
      { code: 'DNS', items: [{ id: 'I3' }] },
      service({ code: 'DNS', items: [item('I3', 'Domain transfer or migration')] }),
    );
    expect(lines[0].ratePaise).toBeUndefined();
  });

  /**
   * A client who agreed to free work agreed to it. Zero must survive the
   * cascade rather than being read as "nothing agreed" and replaced by the
   * list price.
   */
  it('keeps an agreed rate of zero, which means given away', () => {
    const lines = engagedLines(
      { code: 'SOC', items: [{ id: 'I10', ratePaise: 0 }] },
      service(),
    );
    expect(lines[0].ratePaise).toBe(0);
  });

  /** CGST Rule 46(g). The Service's code is the ordinary answer. */
  it("carries the Service's SAC onto every line", () => {
    const lines = engagedLines({ code: 'SOC', items: [{ id: 'I10' }] }, service());
    expect(lines[0].sacCode).toBe('998361');
  });

  /** Rare and real: a 3D scene under a web build is specialty design. */
  it("lets an item's own SAC override the Service's", () => {
    const lines = engagedLines(
      { code: 'WEB', items: [{ id: 'I1' }] },
      service({
        code: 'WEB',
        sacCode: '998314',
        items: [item('I1', '3D / Three.js scene', 80_00_000, { sacCode: '998391' })],
      }),
    );
    expect(lines[0].sacCode).toBe('998391');
  });

  /**
   * A catalogue changes. An id naming nothing is an ordinary consequence of
   * that, and a line with no name and no rate reads as an app failure rather
   * than as a retired item.
   */
  it('skips an id the catalogue no longer carries', () => {
    const lines = engagedLines(
      { code: 'SOC', items: [{ id: 'I10' }, { id: 'I99' }] },
      service(),
    );
    expect(lines.map((l) => l.name)).toEqual(['Bundle: 10 reels a month']);
  });

  it('skips an archived item, which has left every picker', () => {
    const lines = engagedLines(
      { code: 'SOC', items: [{ id: 'I10' }, { id: 'I21' }] },
      service({
        items: [
          item('I10', 'Bundle: 10 reels a month', 45_00_000),
          item('I21', 'Posting + scheduling', 10_00_000, { archived: true }),
        ],
      }),
    );
    expect(lines.map((l) => l.name)).toEqual(['Bundle: 10 reels a month']);
  });

  /** An empty list is not "no items agreed": it is a service billed as one. */
  it('reads an empty item list as a service billed in one line', () => {
    const lines = engagedLines({ code: 'SOC', items: [], ratePaise: 45_00_000 }, service());
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe('Social Media');
  });
});

describe('allEngagedLines', () => {
  const catalogue = [
    service(),
    service({
      code: 'MNT',
      name: 'Website Maintenance',
      sacCode: '998316',
      items: [item('I1', 'Website maintenance', 8_00_000)],
      itemSeq: 11,
    }),
  ];

  it('flattens every engaged service into its lines', () => {
    const lines = allEngagedLines(
      [
        { code: 'SOC', items: [{ id: 'I10' }, { id: 'I21' }] },
        { code: 'MNT', items: [{ id: 'I1' }] },
      ],
      catalogue,
    );
    expect(lines.map((l) => l.name)).toEqual([
      'Bundle: 10 reels a month',
      'Posting + scheduling',
      'Website maintenance',
    ]);
  });

  it('skips a code the catalogue no longer carries', () => {
    const lines = allEngagedLines(
      [{ code: 'GONE', ratePaise: 100 }, { code: 'MNT', items: [{ id: 'I1' }] }],
      catalogue,
    );
    expect(lines.map((l) => l.name)).toEqual(['Website maintenance']);
  });

  it('answers nothing for a client engaged on nothing', () => {
    expect(allEngagedLines([], catalogue)).toEqual([]);
    expect(allEngagedLines(undefined, catalogue)).toEqual([]);
  });

  /** The catalogue not having loaded is not the same as the client having none. */
  it('answers nothing rather than throwing when the catalogue is absent', () => {
    expect(allEngagedLines([{ code: 'SOC' }], undefined)).toEqual([]);
  });

  /** Every line knows its Service, which is what the Add-line menu groups on. */
  it('carries the Service onto every line', () => {
    const lines = allEngagedLines([{ code: 'SOC', items: [{ id: 'I10' }] }], catalogue);
    expect(lines[0].service.code).toBe('SOC');
    expect(lines[0].item?.id).toBe('I10');
  });
});

describe('engagedTotalPaise', () => {
  /**
   * The clients list's Amount column. An item with no agreed rate falls to
   * its list price, exactly as it would on the invoice, so the two figures
   * cannot disagree.
   */
  it('adds every line through the same cascade the invoice uses', () => {
    const lines = allEngagedLines(
      [{ code: 'SOC', items: [{ id: 'I10' }, { id: 'I21', ratePaise: 8_00_000 }] }],
      [service()],
    );
    // I10 at its list price, I21 at what was agreed.
    expect(engagedTotalPaise(lines)).toBe(45_00_000 + 8_00_000);
  });

  it('leaves a line quoted per engagement out, and is nothing when none is priced', () => {
    const catalogue = [service({ items: [item('I10', 'Reels', 45_00_000), item('I32', 'Report')] })];
    const both = allEngagedLines([{ code: 'SOC', items: [{ id: 'I10' }, { id: 'I32' }] }], catalogue);
    expect(engagedTotalPaise(both)).toBe(45_00_000);

    // Not zero: zero is a real rate and means the work is given away.
    const unpriced = allEngagedLines([{ code: 'SOC', items: [{ id: 'I32' }] }], catalogue);
    expect(engagedTotalPaise(unpriced)).toBeUndefined();
    expect(engagedTotalPaise([])).toBeUndefined();
  });
});
