import { isHrDocument } from './registry';
import type { AdminDocument } from './types';

/**
 * The party a document concerns: the employee for HR documents, the client for
 * everything else.
 *
 * Always read from the document's own snapshot, never resolved live — an issued
 * document names the party as they were at issue time.
 */
export function partyName(doc: AdminDocument): string {
  if (isHrDocument(doc)) return doc.employeeSnapshot?.name ?? '';
  return doc.clientSnapshot?.name ?? '';
}
