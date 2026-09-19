/**
 * What a client's engaged services become on a document.
 *
 * One function, because the invoice and the quotation both ask the same
 * question and would otherwise answer it twice: *which lines does this client's
 * engagement produce, at which rates, under which SAC?* Two copies of that is
 * two places for a rate to be resolved differently, which is the shape
 * `PRINCIPLES.md` rule 1 exists to stop. The invoice is the first caller; the
 * quotation is the second.
 *
 * **The rate cascade is the load-bearing part.** Three sources, most specific
 * first, and each step is a real answer rather than a fallback for a missing
 * one:
 *
 * 1. the rate agreed for **this item**, on the client record;
 * 2. the item's **list price**, from the catalogue;
 * 3. nothing, which means quoted per engagement and leaves the figure to be
 *    typed.
 *
 * A blank rate is deliberately **not zero** at any step. Zero is a real rate
 * and means the work is given away, so storing it for "not yet priced" would
 * put a free line on an invoice nobody meant to give away (`ServicesStep` makes
 * the same distinction).
 */

import type { ClientEngagedService } from './client';
import type { ContractService } from './service';
import type { ServiceItem } from './serviceItem';

/** One line a client's engagement produces, before it becomes a document row. */
export interface EngagedLine {
  /** What prints as the line's description. */
  name: string;
  /** Integer paise, or undefined for "quoted per engagement". */
  ratePaise?: number;
  /** CGST Rule 46(g): the item's own code where it has one, else the Service's. */
  sacCode?: string;
  /** The Service this came from, for grouping and for the Add-line menu. */
  service: ContractService;
  /** The item, where this line is one. Absent on a Service billed as one line. */
  item?: ServiceItem;
}

/**
 * The lines one engaged service produces.
 *
 * **Itemised where the record says so, one line where it does not.** A record
 * naming `items` was written by somebody choosing which work this client buys,
 * so the invoice states each; a record with none predates items or describes a
 * Service genuinely billed as a single figure, and collapsing that into
 * thirty-two lines would invent detail nobody agreed to.
 *
 * An id citing an item that no longer exists is **skipped rather than printed
 * blank**, the same call `DocumentEditor` already makes for a service code with
 * no catalogue row. The alternative is a line with no name and no rate, which
 * reads as an app failure rather than as a retired item.
 */
export function engagedLines(
  engaged: ClientEngagedService,
  service: ContractService,
): EngagedLine[] {
  if (!engaged.items?.length) {
    return [
      {
        name: service.name,
        ratePaise: engaged.ratePaise ?? service.ratePaise,
        sacCode: service.sacCode,
        service,
      },
    ];
  }

  const byId = new Map((service.items ?? []).map((item) => [item.id, item]));

  return engaged.items.flatMap((agreed) => {
    const item = byId.get(agreed.id);
    if (!item || item.archived) return [];
    return [
      {
        name: item.name,
        ratePaise: agreed.ratePaise ?? item.ratePaise,
        // The item's own code only where it overrides, which is rare and real:
        // a 3D scene under a web build is specialty design, not development.
        sacCode: item.sacCode ?? service.sacCode,
        service,
        item,
      },
    ];
  });
}

/**
 * Every line a client's whole engagement produces, in catalogue order.
 *
 * A stored code with no catalogue row is skipped, for the same reason a retired
 * item id is: a blank line reads as a bug, and the record naming something that
 * no longer exists is an ordinary consequence of a catalogue that changes.
 */
export function allEngagedLines(
  engagedServices: ClientEngagedService[] | undefined,
  catalogue: ContractService[] | undefined,
): EngagedLine[] {
  if (!engagedServices?.length || !catalogue?.length) return [];
  const byCode = new Map(catalogue.map((service) => [service.code, service]));

  return engagedServices.flatMap((engaged) => {
    const service = byCode.get(engaged.code);
    return service ? engagedLines(engaged, service) : [];
  });
}
