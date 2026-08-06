import type { AdminDocument } from './types';

/**
 * The party a document concerns: the employee for HR documents, the client for
 * everything else.
 *
 * Always read from the document's own snapshot, never resolved live — an issued
 * document names the party as they were at issue time.
 */
export function partyName(doc: AdminDocument): string {
  if (doc.type === 'STP' || doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT') {
    return doc.employeeSnapshot?.name ?? '';
  }
  return doc.clientSnapshot?.name ?? '';
}
