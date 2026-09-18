/**
 * Copying a Service onto a contract, and seeding a contract from a client.
 *
 * **The copy is the rule this file exists to hold.** A contract takes its own
 * copy of a Service the moment it is picked, with the text of every library
 * line it names, and from then on the contract owns its words: editing the
 * catalogue afterwards cannot change an open draft, and because blank keys are
 * derived from the text, cannot move its fields either (`CONTEXT.md` §5c).
 *
 * Lifted out of `ContractEditor.commitPart` when a second caller appeared. The
 * seed is that caller: picking a client fills the contract from what onboarding
 * already recorded, instead of asking the operator to pick the same services a
 * second time (`PRINCIPLES.md` rule 3, the invoice's precedent at §5i).
 */

import type { BlankValues } from './blanks';
import type { ContractService, LibraryLine } from '../service';
import type { ClientRecord, ContractData } from '../types';

/**
 * A Service copied onto a contract, plus the library text it drags along.
 *
 * A Part carries ids; the words live in the shared libraries, which are meant
 * to grow and be reworded. Without the map an issued contract would resolve its
 * "not included" list against a table that has moved on, which is the same
 * compliance bug as reading live studio details (`CONTEXT.md` §5).
 */
export function copyPart(
  service: ContractService,
  exclusions: LibraryLine[],
  clientInputs: LibraryLine[],
): { part: ContractService; library: Record<string, string> } {
  const part = { ...service };
  const library: Record<string, string> = {};
  for (const line of [...exclusions, ...clientInputs]) {
    if (part.exclusionIds.includes(line.id) || part.clientInputIds.includes(line.id)) {
      library[line.id] = line.text;
    }
  }
  return { part, library };
}

/**
 * Add or replace a Part on a contract, keeping its blanks and library.
 *
 * Replacing rather than appending when the code is already there is what makes
 * editing a Part the same operation as adding one.
 */
export function withPart(
  contract: ContractData,
  part: ContractService,
  library: Record<string, string>,
  blanks: BlankValues = {},
): ContractData {
  return {
    ...contract,
    parts: contract.parts.some((p) => p.code === part.code)
      ? contract.parts.map((p) => (p.code === part.code ? part : p))
      : [...contract.parts, part],
    blanks: { ...contract.blanks, ...blanks },
    library: { ...contract.library, ...library },
  };
}

/**
 * The Parts a client's record implies, copied and ready to configure.
 *
 * **Every engaged service, not only the retainers.** That is the one place this
 * deliberately differs from the invoice, which seeds retainers alone
 * (`CONTEXT.md` §5i): an invoice bills what recurs every month, and a contract
 * scopes the whole engagement including the one-off build. A service the client
 * is engaged for and the contract does not mention is the gap this seed exists
 * to close.
 *
 * An unknown code is skipped rather than failing, the same rule
 * `DocumentEditor` follows: a service archived since onboarding should not make
 * the client unusable.
 *
 * **The source is a client today and will be a lead tomorrow.** Nothing here
 * reads anything but `commercial`, so the day leads arrive this takes a lead
 * instead and nothing else in the flow changes.
 */
export function seedFromClient(
  client: ClientRecord,
  services: ContractService[],
  exclusions: LibraryLine[],
  clientInputs: LibraryLine[],
): Pick<ContractData, 'parts' | 'library'> & { termMonths?: number; effectiveDate?: string } {
  const byCode = new Map(services.map((s) => [s.code, s]));
  const parts: ContractService[] = [];
  const library: Record<string, string> = {};

  for (const engaged of client.commercial?.services ?? []) {
    const service = byCode.get(engaged.code);
    if (!service) continue;
    const copied = copyPart(service, exclusions, clientInputs);
    parts.push(copied.part);
    Object.assign(library, copied.library);
  }

  return {
    parts,
    library,
    termMonths: client.commercial?.termMonths,
    effectiveDate: client.commercial?.startDate || undefined,
  };
}

/**
 * Whether a contract is untouched enough to be seeded over.
 *
 * The `DocumentEditor.tsx` guard, copied rather than the live data flow: a
 * contract that already has Parts or typed blanks is somebody's work, and
 * changing the client on it must not throw that away.
 */
export function seedable(contract: ContractData): boolean {
  return contract.parts.length === 0 && Object.keys(contract.blanks).length === 0;
}
