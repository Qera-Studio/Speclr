/**
 * The contract builder's five phases, as data.
 *
 * Same shape as onboarding's steps and built on the same `FlowStep`, so the
 * step row, the locking and the completeness ticks are the shell's rather than
 * this flow's (`docs/design.md` §2.12).
 *
 * **Scope was merged into Services and split back out again**, both on 18
 * September 2026, which is worth recording so the seam is not moved a third
 * time without knowing it has been moved twice. The merge's argument was that
 * choosing a service and saying what it covers are one job on one list. What
 * that missed is that they are one job with two *shapes*: the picker is a
 * catalogue, four tiles over a browse list, and scope is a checklist of what
 * has already been picked. Sharing a screen, each was in the other's way, and
 * the tiles moved under the pointer as rows landed beneath them.
 *
 * **The gate stayed whole through both moves**, which is the part that
 * matters. It is two questions, and they are asked where each is answerable:
 * `services` requires that something was chosen, and `scope` requires both
 * halves of the ledger, so a Part seeded from the client record must be opened
 * or acknowledged before the flow moves on.
 */

import { isISODate } from '@/lib/domain/dates';
import { FEE_SECTION, partsFilled, reviewedAll } from '@/lib/domain/contract/ledger';
import { blanksOf, isUnfilled } from '@/lib/domain/contract/blanks';
import { contractScopes } from '@/lib/domain/contract/completeness';
import type { FlowStep } from '@/components/patterns/flow/steps';
import type { ContractData } from '@/lib/domain/types';
import type { DocContent } from '@/lib/domain/docContent';

/**
 * Everything the five phases write between them.
 *
 * One object rather than the six `useState` calls the rail editor had: the
 * phases are one document being built, and a value set on phase 1 has to be
 * readable on phase 5.
 */
export interface ContractDraft {
  clientId: string;
  issueDate: string;
  contract: ContractData;
  content: DocContent;
}

export type ContractPhase = FlowStep<ContractDraft>;

/** The standing terms: the Contract Agreement and each Schedule in play. */
function termsUnfilled(draft: ContractDraft): number {
  return contractScopes(draft.contract)
    .filter((scope) => !scope.scope.startsWith('part.'))
    .flatMap((scope) => blanksOf(scope.parsed))
    .filter((blank) => isUnfilled(draft.contract.blanks, blank)).length;
}

export const CONTRACT_PHASES: readonly ContractPhase[] = [
  {
    key: 'client',
    short: 'Client',
    title: 'Who it is for',
    description: 'The client, the dates and how long it runs.',
    // The phase that mints the draft, exactly as onboarding's identity step
    // creates the client row.
    needsRecord: false,
    isComplete: (d) => Boolean(d.clientId) && isISODate(d.issueDate),
  },
  {
    key: 'services',
    short: 'Services',
    title: 'What is in it',
    description: 'Seeded from the client record, and editable here.',
    needsRecord: true,
    // Only that something was chosen. Whether each choice has been filled in
    // is the next phase's question, asked on the screen that shows it.
    isComplete: (d) => d.contract.parts.length > 0,
  },
  {
    key: 'scope',
    short: 'Scope',
    title: 'What each one covers',
    description: 'Open each service, or confirm the ones with nothing to change.',
    needsRecord: true,
    /*
      Both halves of the ledger, because they answer different questions. The
      counts say nothing is missing; the acknowledgement says somebody looked.
      A Part seeded from the client record arrives with its blanks filled and
      never passes through the sheet, so it reads as done before the operator
      has seen it, which is exactly what `reviewedAll` is for
      (`contract/ledger.ts`).

      The fee is left out and owned by the next phase: a count here that
      included it would send the reader hunting for a field on another screen.
    */
    isComplete: (d) =>
      d.contract.parts.length > 0 &&
      partsFilled(d.contract, FEE_SECTION) &&
      reviewedAll(d.contract.reviewed, d.contract.parts),
  },
  {
    key: 'terms',
    short: 'Terms',
    title: 'Fees and standing terms',
    description: 'What each service costs, and the Agreement’s own figures.',
    needsRecord: true,
    isComplete: (d) =>
      d.contract.parts.length > 0 && partsFilled(d.contract) && termsUnfilled(d) === 0,
  },
  {
    key: 'preview',
    short: 'Preview',
    title: 'The contract',
    description: 'Read it through, then issue it.',
    needsRecord: true,
    // Never "complete": it is where the document is read and issued, not a
    // form with something to fill in. Onboarding's last step has an end state
    // because the record is the product; here the product is the document.
    isComplete: () => false,
  },
] as const;

export const FIRST_PHASE = CONTRACT_PHASES[0].key;
