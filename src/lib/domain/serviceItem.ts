/**
 * A Service Item: one priced line under a Service, and the unit every document
 * reads a slice of.
 *
 * `docs/service-catalogue.md` is the spec this implements, and §4 there is the
 * decision that shapes this file: **an item's name is its scope.** There is no
 * `inclusion` or `exclusion` field, and adding one later is a change to that
 * document first. Three reasons, shortest first: the names are already precise
 * ("Payment gateway integration" says what it is), twenty ticked items would
 * add forty sentences to a contract, and a new user would have to author six
 * hundred sentences before issuing anything. Exclusions stay at *service* level,
 * attached from the shared library and rendered opt-out, which is what bounds
 * them (`contract-system.md` §6).
 *
 * This replaces `MenuLine` on `service.ts`, which carried the same job under a
 * name that suggested a restaurant menu and reached no document: it was read by
 * the services admin screen and nothing else. The id rule below is `MenuLine`'s,
 * ported unchanged, because it was right.
 *
 * Pure TypeScript: no framework, no database. The zod rules run on both sides of
 * the wire, which is why they live beside the types rather than in a form.
 */

import { z } from 'zod';
import { codeSchema, textSchema } from './text';

/**
 * What an item's rate is *per*.
 *
 * On the item rather than derived from its Service's Schedule, and that is the
 * one place this deliberately differs from `rateUnitOf`. A Service's own list
 * price follows its Schedule, but the items under one Service do not share a
 * unit: under Custom Website, "Core website setup" is a fixed fee while
 * "Additional standard page" is per page. Under Social Media, "Script writing"
 * is per video and "Posting and scheduling" is monthly.
 */
export type ItemUnit = 'fixed' | 'monthly' | 'perUnit';

export interface ServiceItem {
  /**
   * 'I1', 'I2'… assigned server-side and **never reissued**. See
   * `assignItemIds` for why, and `ClientEngagedService.itemIds` for who cites
   * them.
   */
  id: string;
  /**
   * What this is. Prints as an invoice line's description and as a quotation
   * deliverable, and it is the item's scope on a contract.
   */
  name: string;
  /**
   * One client-facing sentence, printed under the name on a quotation only.
   *
   * Sales copy, not scope: "Getting the technical foundation of your site ready
   * before any design work starts." An invoice prints the name alone, and a
   * contract prints the name alone, because a deliverables list is a list.
   */
  blurb?: string;
  /**
   * Integer paise, never a float (`money.ts`). Absent means **quoted per
   * engagement**, which is a real answer and not a missing one: the document
   * asks for a figure when the item is ticked.
   */
  ratePaise?: number;
  unit: ItemUnit;
  /** 'per page', 'per screen', 'per video'. Meaningful for `perUnit` only. */
  unitLabel?: string;
  /**
   * The rate-card heading this line came from, e.g. 'Foundation system'.
   *
   * **A label, never a scope.** 18 of the 46 headings on the five rate cards
   * span more than one service ('Foundation system' covers work under both the
   * website and the domain service), so a group cannot own an item and nothing
   * may key off it. It groups rows in the editor and heads a table on a
   * quotation. That is all.
   */
  group?: string;
  /**
   * Overrides the Service's SAC where this item is classified differently.
   *
   * Rare and real: a 3D scene under a web build is specialty design (998391)
   * rather than IT development (998314). Absent means the Service's code, which
   * is the ordinary case.
   */
  sacCode?: string;
  /**
   * The top of a range, for a retainer quoted as a band ('8,000 to 25,000 a
   * month'). Absent means `ratePaise` is exact.
   */
  rateMaxPaise?: number;
  /** Archived items stay readable and keep their id, but leave every picker. */
  archived: boolean;
}

/** 'I12' → 12; anything else → 0, so a foreign id never raises the counter. */
const itemIdNumber = (id: string): number => {
  const match = id.match(/^I(\d+)$/i);
  return match ? Number(match[1]) : 0;
};

/**
 * Gives every new item an id, counting past every id ever used.
 *
 * A client record cites these ids (`ClientEngagedService.itemIds`) and so does
 * a quotation line. If a deleted item's id were handed to a new one, a client
 * who agreed "I5, the analytics set-up" would be seeded "I5, the booking
 * system" onto their next document, at the rate they agreed for the other
 * thing. So the counter is a **high-water mark, not a count**: it runs past
 * `itemSeq`, past every id in the stored list (an item dropped in *this* save is
 * still there), and past every id arriving. The same rule a clause number
 * follows, counting past archived clauses.
 *
 * A gap is therefore normal and is not a bug to tidy. `docs/service-catalogue.md`
 * ships `WEB` with 52 items and `itemSeq: 55`, because three moved to another
 * service; closing that gap is exactly the mistake this prevents.
 *
 * An item arrives with `id: ''` to mean "new". An id already set is kept, and
 * the incoming order is the order stored: the list is one the operator
 * arranges, not a set.
 */
export function assignItemIds(
  existing: { items?: ServiceItem[]; itemSeq?: number },
  incoming: ServiceItem[],
): { items: ServiceItem[]; itemSeq: number } {
  // `itemSeq ?? 0` is what keeps this safe on a service with no items at all:
  // `Math.max()` over two empty spreads alone would answer -Infinity.
  let seq = Math.max(
    existing.itemSeq ?? 0,
    ...(existing.items ?? []).map((item) => itemIdNumber(item.id)),
    ...incoming.map((item) => itemIdNumber(item.id)),
  );
  const items = incoming.map((item) =>
    item.id ? item : { ...item, id: `I${++seq}` },
  );
  return { items, itemSeq: seq };
}

/**
 * What an item costs for a given quantity.
 *
 * `qty` applies to `perUnit` only. A fixed fee is the fee whether the operator
 * typed 1 or 3 in the box, and a monthly rate is one month's: multiplying
 * either would put a figure on an invoice that the rate does not support.
 * Integer paise throughout, so the result is exact.
 */
export function itemAmountPaise(item: ServiceItem, qty = 1): number {
  const rate = item.ratePaise ?? 0;
  return item.unit === 'perUnit' ? rate * Math.max(0, Math.trunc(qty)) : rate;
}

/** How an item's rate reads beside it: '₹4,000 per page', '₹8,000 a month'. */
export function itemRateUnit(item: ServiceItem): string {
  if (item.unit === 'monthly') return 'a month';
  if (item.unit === 'perUnit') return item.unitLabel ?? 'per unit';
  return 'fixed';
}

// The same ceiling `service.ts` uses for a rate: a bound, not a business rule.
const paise = z.number().int().min(0).max(10_000_000_000);

/** Every field but the id, which is the only thing the two schemas differ on. */
const itemShape = {
  name: textSchema(300, { required: 'An item needs a name.' }),
  blurb: textSchema(500).optional(),
  ratePaise: paise.optional(),
  unit: z.enum(['fixed', 'monthly', 'perUnit']),
  unitLabel: textSchema(40).optional(),
  group: textSchema(80).optional(),
  sacCode: textSchema(6).optional(),
  rateMaxPaise: paise.optional(),
  archived: z.boolean(),
};

/**
 * The rate rules, applied by both schemas below.
 *
 * Written once rather than per schema: two copies of a money check are two
 * places for one to be relaxed without the other (`CONTEXT.md` §5f, the pair
 * rule, applied to a refinement instead of a field).
 */
function checkRate(
  item: { ratePaise?: number; rateMaxPaise?: number },
  ctx: z.RefinementCtx,
): void {
  // A band whose top is below its bottom is a typo that would print backwards
  // on a quotation, and it is cheaper to refuse than to sort.
  if (
    item.rateMaxPaise !== undefined &&
    item.ratePaise !== undefined &&
    item.rateMaxPaise < item.ratePaise
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['rateMaxPaise'],
      message: 'The top of the range cannot be below the rate.',
    });
  }
  // A top with no bottom is not a range, it is one figure in the wrong box.
  if (item.rateMaxPaise !== undefined && item.ratePaise === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['ratePaise'],
      message: 'A range needs a rate to start from.',
    });
  }
}

/** A **stored** item: it has an id, because the server assigned one. */
export const serviceItemSchema = z
  .object({ id: codeSchema(12, { required: 'An item needs an id.' }), ...itemShape })
  .superRefine(checkRate);

/**
 * A list of items **as a form posts it**: every field validated, except that an
 * id may be blank to mean "new".
 *
 * That blank is the only difference from `serviceItemSchema`. A stored item
 * always has an id, but a row the operator has just added has none until
 * `assignItemIds` runs on the server. Relaxing it *here* rather than at each
 * call site is deliberate: the shape this replaces made every caller remember
 * to `.extend({ id: codeSchema(12) })`, and a caller that forgot would refuse
 * every new line with "An item needs an id."
 *
 * Ids that are present must still be distinct, or `assignItemIds` would keep
 * both and whichever was looked up second would silently win. 400 bounds one
 * service's list: `WEB` carries 52 and the largest rate card is 88 lines.
 */
export const serviceItemsSchema = z
  .array(z.object({ id: codeSchema(12), ...itemShape }).superRefine(checkRate))
  .max(400)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    for (const [i, item] of items.entries()) {
      if (!item.id) continue;
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'id'],
          message: `Item ${item.id} appears twice.`,
        });
      }
      seen.add(item.id);
    }
  });
