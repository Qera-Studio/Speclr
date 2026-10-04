/**
 * The Schedules a document runs under: Setup, Build, Retainer, Audit, each
 * once, in canonical order, up to all four.
 *
 * A contract says it directly: every Part is a copy of a Service and carries
 * its `scheduleKey`. An invoice, receipt, credit note or quotation says it
 * through its lines, each of which names the Service it bills by code
 * (`LineItem.serviceCode`, copied at seed like the SAC), and the catalogue
 * turns a code into a Schedule. A typed line names no Service and counts for
 * nothing; a document whose lines are all typed shows none, which is the true
 * answer rather than a guess from its descriptions.
 *
 * The catalogue is read for the Schedule only, never for the words: a
 * finalized document's lines are its own, and a Service renamed or archived
 * since changes nothing here but the lookup. A code the catalogue no longer
 * carries is skipped, the same call `engagedLines` makes for a retired item.
 */

import { SCHEDULE_BY_KEY, type Schedule, type ScheduleKey } from './contract/schedules';
import type { ContractService } from './service';
import type { AdminDocument, LineItem } from './types';

export function documentSchedules(
  doc: AdminDocument,
  catalogue: ContractService[] = [],
): Schedule[] {
  const keys = new Set<ScheduleKey>();
  if (doc.type === 'CON') {
    for (const part of doc.contract?.parts ?? []) keys.add(part.scheduleKey);
  } else {
    const byCode = new Map(catalogue.map((service) => [service.code, service.scheduleKey]));
    for (const line of linesOf(doc)) {
      const key = line.serviceCode ? byCode.get(line.serviceCode) : undefined;
      if (key) keys.add(key);
    }
  }
  return [...keys].map((key) => SCHEDULE_BY_KEY[key]).sort((a, b) => a.number - b.number);
}

/** Every priced line on the document, wherever its type keeps them. */
function linesOf(doc: AdminDocument): LineItem[] {
  if (doc.type === 'SQ') {
    return (doc.services ?? []).flatMap((service) => [...service.lines, ...service.addOns]);
  }
  return doc.lineItems ?? [];
}
