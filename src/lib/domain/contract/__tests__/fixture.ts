/**
 * A contract document, built the way the editor builds one — a Part copied off
 * the seeded services library, with the text of every library line it names
 * carried alongside.
 *
 * Not a `.test.ts` file, so Jest treats it as a helper rather than a suite.
 */

import type { ClientSnapshot, ContractDocument } from '../../types';
import { EXCLUSIONS, CLIENT_INPUTS } from '../seed/libraries';
import { SERVICES } from '../seed/services';
import type { ContractService } from '../../service';
import type { BlankValues } from '../blanks';

export const testClientSnapshot: ClientSnapshot = {
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'Sector 62, Noida',
  email: 'hello@clayora.example',
  phone: '+919876500000',
};

/** Every library line a set of Parts refers to, id → text. */
export function libraryFor(parts: ContractService[]): Record<string, string> {
  const wanted = new Set(parts.flatMap((p) => [...p.exclusionIds, ...p.clientInputIds]));
  return Object.fromEntries(
    [...EXCLUSIONS, ...CLIENT_INPUTS].filter((l) => wanted.has(l.id)).map((l) => [l.id, l.text]),
  );
}

export function serviceByCode(code: string): ContractService {
  const service = SERVICES.find((s) => s.code === code);
  if (!service) throw new Error(`No seeded service ${code}`);
  return { ...service };
}

export function contractDoc({
  codes = ['01'],
  blanks = {},
  status = 'draft',
}: { codes?: string[]; blanks?: BlankValues; status?: 'draft' | 'finalized' } = {}): ContractDocument {
  const parts = codes.map(serviceByCode);
  return {
    id: 'con-1',
    type: 'CON',
    status,
    issueDate: '2026-06-10',
    clientId: 'client-1',
    clientSnapshot: testClientSnapshot,
    lineItems: [],
    gstRatePercent: 0,
    contract: { parts, blanks, library: libraryFor(parts) },
    createdAt: 0,
    updatedAt: 0,
  } as ContractDocument;
}
