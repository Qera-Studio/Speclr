/**
 * Which Parts of a contract still have something to fill in, per Part.
 *
 * **This replaces a door guard, and that is the whole reason it exists.**
 * `ServiceDialog` used to disable its commit button until every blank of a Part
 * was filled, so a Part could not enter the contract incomplete — the
 * invariant was held at the door, and nothing downstream had to track it.
 *
 * Seeding Parts from the client record breaks that: a seeded Part never passes
 * through the button. So the guarantee moves from a door to a ledger, and the
 * ledger has to be *derived from the same enumeration finalize reads*, or it
 * becomes a second opinion about whether a contract is issuable.
 * `contractScopes` is that enumeration — the sheet renders from it, the editor
 * builds its fields from it, and `contractComplete` validates against it.
 *
 * Nothing here is stored. A count of what is missing is a fact about the
 * document, not a flag somebody sets (`PRINCIPLES.md` rule 3).
 */

import { blanksOf, isUnfilled, type BlankValues } from './blanks';
import { contractScopes } from './completeness';
import type { ContractPart } from './assembly';

interface ContractShape {
  parts: ContractPart[];
  blanks: BlankValues;
}

/**
 * The scope suffix a Part's fee sits under.
 *
 * Excluded from the scope phase's count and owned by the commercials phase:
 * the two phases ask different questions, and a phase reporting "4 to fill"
 * where one of the four is on a later screen sends the operator looking for a
 * field that is not there.
 */
export const FEE_SECTION = 'fee';

/**
 * How many blanks each Part still has nothing in, keyed by service code.
 *
 * A Part with nothing missing is present with a count of `0` rather than
 * absent, because the ledger's rows come from the contract's Parts and a
 * missing key would be indistinguishable from a Part that is not there.
 */
export function unfilledByPart(
  contract: ContractShape,
  { except }: { except?: string } = {},
): Map<string, number> {
  const counts = new Map<string, number>(
    contract.parts.map((part) => [part.code, 0]),
  );

  for (const scope of contractScopes(contract)) {
    // `part.<code>.<section>` — anything else is the MSA or a Schedule, which
    // belong to the terms phase.
    const [kind, code, section] = scope.scope.split('.');
    if (kind !== 'part' || code === undefined) continue;
    if (except !== undefined && section === except) continue;

    const missing = blanksOf(scope.parsed).filter((blank) =>
      isUnfilled(contract.blanks, blank),
    ).length;
    if (missing > 0) counts.set(code, (counts.get(code) ?? 0) + missing);
  }

  return counts;
}

/**
 * Whether every Part is filled in, ignoring the section the next phase owns.
 *
 * The scope phase's gate. It is deliberately *not* what makes a contract
 * issuable: `contractComplete` is still the only thing finalize reads, and it
 * counts the fee blanks this ignores.
 */
export function partsFilled(contract: ContractShape, except?: string): boolean {
  return [...unfilledByPart(contract, { except }).values()].every((n) => n === 0);
}

/**
 * Whether a Part has been looked at, which no amount of derivation can answer.
 *
 * A Part whose blanks arrive already filled by the seed, or which has no blanks
 * at all, reads as done without anybody having opened it. That is the one thing
 * the counts above cannot say, so it is recorded rather than derived.
 *
 * **Deliberately stored, and deliberately narrow.** It records an operator
 * action, which is not derivable from any other data, so rule 3 does not reach
 * it (the rule governs facts the system already knows from another source). It
 * lives on the document, so it cannot leak into a second contract. And it is
 * **not a completeness field**: it gates advancing a phase and nothing else. An
 * acknowledgement can never make an incomplete contract issuable, because
 * finalize does not read it.
 */
export function reviewedAll(reviewed: string[] | undefined, parts: ContractPart[]): boolean {
  const seen = new Set(reviewed ?? []);
  return parts.every((part) => seen.has(part.code));
}
