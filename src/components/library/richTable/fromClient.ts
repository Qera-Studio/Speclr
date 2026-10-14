import { clientContact } from '@/lib/domain/client';
import { currencyForCountry } from '@/lib/domain/currency';
import { localDateToISO } from '@/lib/domain/dates';
import { allEngagedLines, engagedTotalPaise } from '@/lib/domain/engagedLines';
import type { ContractService } from '@/lib/domain/service';
import type { ClientRecord } from '@/lib/domain/types';
import type { RichClientRow } from './rows';

/**
 * A real client, as the rich table's row.
 *
 * Every value is read from the record or derived by the helpers the current
 * clients table already uses, so the two tables cannot disagree about a
 * client: the same `engagedTotalPaise` for the value, the same
 * `currencyForCountry` for the toggle, the same employee lookup for the lead
 * and team, and `clientContact` for the contact (which is what makes a person
 * their own contact rather than a gap).
 */
export function richRowOf(
  client: ClientRecord,
  {
    catalogue,
    nameOf,
    href,
  }: {
    catalogue: ContractService[];
    /** Employee id to name. An id nobody answers to is dropped, as today. */
    nameOf: Map<string, string>;
    href: string;
  },
): RichClientRow {
  const country = client.addressParts?.country || 'IN';
  // A legal name that is just the short name again says nothing on line two.
  const legalName =
    client.companyName && client.companyName !== client.name ? client.companyName : undefined;

  return {
    id: client.id,
    name: client.name,
    legalName,
    entityType: client.entityType ?? '',
    industry: client.industry ?? undefined,
    city: client.addressParts?.city || undefined,
    country,
    email: client.email || undefined,
    phone: client.phone || undefined,
    contactName: clientContact(client, 'primary')?.name || undefined,
    valuePaise: engagedTotalPaise(allEngagedLines(client.commercial?.services, catalogue)),
    monthly: client.commercial?.engagementType === 'retainer',
    currency: currencyForCountry(country),
    addedAt: localDateToISO(new Date(client.createdAt)),
    lead: client.leadEmployeeId ? nameOf.get(client.leadEmployeeId) : undefined,
    team: (client.teamEmployeeIds ?? []).flatMap((id) => nameOf.get(id) ?? []),
    href,
  };
}
