'use server';

import { searchEverything } from '@/db/store';
import { DOC_TYPES } from '@/lib/domain/registry';
import { partyName } from '@/lib/domain/party';
import { authorized } from './authGate';

/**
 * One flat, already-labelled hit. The palette renders these verbatim, so it
 * never has to know how a document differs from a client.
 */
export interface SearchHit {
  id: string;
  group: 'Documents' | 'Clients' | 'Employees' | 'Services';
  /** The primary line, e.g. an invoice number or a client's name. */
  label: string;
  /** The secondary line, e.g. "Invoice · Acme Co." */
  hint?: string;
  href: string;
}

const EMPTY: SearchHit[] = [];

/**
 * The header search. Returns an empty list rather than an error for an
 * unauthorized caller — the palette is a convenience, and a signed-out session
 * has nothing to show it anyway. Every destination it links to enforces access
 * on its own; this only ever surfaces what the caller may already read.
 */
export async function searchAll(query: unknown): Promise<SearchHit[]> {
  if (!(await authorized())) return EMPTY;
  if (typeof query !== 'string') return EMPTY;

  const { documents, clients, employees, services } = await searchEverything(query);

  return [
    ...documents.map((doc) => ({
      id: doc.id,
      group: 'Documents' as const,
      label: doc.number ?? `${DOC_TYPES[doc.type].label} draft`,
      hint: [DOC_TYPES[doc.type].label, partyName(doc)].filter(Boolean).join(' · '),
      href: `/docs/${doc.id}`,
    })),
    ...clients.map((client) => ({
      id: client.id,
      group: 'Clients' as const,
      label: client.name,
      hint: client.companyName ?? client.email,
      href: '/clients',
    })),
    ...employees.map((employee) => ({
      id: employee.id,
      group: 'Employees' as const,
      label: employee.name,
      hint: employee.role,
      href: '/employees',
    })),
    ...services.map((service) => ({
      id: service.id,
      group: 'Services' as const,
      label: service.name,
      href: '/docs/contract',
    })),
  ];
}
