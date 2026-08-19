/**
 * The onboarding steps, as data.
 *
 * One array drives the progress bar, the step nav, the URL slug and the
 * completeness dots, so a step cannot exist in the nav and not in the
 * progress count — the failure every hand-wired wizard eventually has.
 *
 * **Step 1 differs from the original brief, deliberately.** The brief had no
 * address page, but `address` is `NOT NULL`, every sheet prints it, and CGST
 * Rule 46 requires the recipient's address on a tax invoice. It belongs with
 * identity, and it brings the country with it — which is why there is no
 * separate country field anywhere in this flow (`PRINCIPLES.md` rule 3: two
 * places to say where a client is means two places for them to disagree).
 *
 * **Seven steps for a company, six for an individual.** A person is their own
 * contact — the one they discuss the work with, the one who signs and, unless
 * they say otherwise, the one an invoice goes to — so Contacts collapses into
 * a designation and one optional billing person on the identity step. Which
 * kind a client is comes from `entityType` and is never stored separately.
 */

import { clientKindOf, type ClientKind } from '@/lib/domain/entityType';
import type { ClientRecord } from '@/lib/domain/types';

export type { ClientKind };

export interface OnboardingStep {
  /** The `?step=` slug. Part of a URL people paste, so it does not change. */
  key: string;
  /**
   * The one-word label in the step row, and the name of the button that walks
   * to it — "Save and continue" told you nothing about where continuing goes.
   * Separate from `title` because the row has to stay on one line while the
   * page heading can say more.
   */
  short: string;
  title: string;
  description: string;
  /**
   * Whether this step needs a saved record first. Only identity does not — it
   * is what creates the row every other step then updates.
   */
  needsRecord: boolean;
  /** Whether the client carries anything for this step yet. */
  isComplete: (client: ClientRecord) => boolean;
  /**
   * Which flow this step belongs to. Absent means both.
   *
   * The one exception is Contacts: an individual's contact details are their
   * own, already on the record, and asking for them a second time would store
   * a copy that goes stale the first time identity is edited.
   */
  only?: ClientKind;
}

const ALL_STEPS: readonly OnboardingStep[] = [
  {
    key: 'identity',
    short: 'Identity',
    title: 'Identity',
    description: 'Who they legally are, and where they are registered.',
    needsRecord: false,
    isComplete: (c) => Boolean(c.companyName && c.entityType && c.address),
  },
  {
    key: 'tax',
    short: 'Tax',
    title: 'Tax & registration',
    description: 'What they are registered for, and what they deduct.',
    needsRecord: true,
    isComplete: (c) => Boolean(c.tax && Object.keys(c.tax).length > 0),
  },
  {
    key: 'contacts',
    short: 'Contacts',
    title: 'Contacts',
    description: 'The people — and which inbox an invoice goes to.',
    needsRecord: true,
    isComplete: (c) => Boolean(c.contacts && Object.keys(c.contacts).length > 0),
    only: 'company',
  },
  {
    key: 'commercial',
    short: 'Commercial',
    title: 'Commercial terms',
    description: 'Payment terms, billing cycle, and what they need on an invoice.',
    needsRecord: true,
    isComplete: (c) => c.commercial?.paymentTermsDays !== undefined,
  },
  {
    key: 'services',
    short: 'Services',
    title: 'Services & contract term',
    description: 'What was engaged, at what rate, and for how long.',
    needsRecord: true,
    isComplete: (c) => Boolean(c.commercial?.services?.length),
  },
  {
    key: 'attachments',
    short: 'Documents',
    title: 'Attachments',
    description: 'Certificates, the signed contract, and proof of export.',
    needsRecord: true,
    isComplete: (c) => Boolean(c.attachments?.length),
  },
  {
    key: 'access',
    short: 'Access',
    title: 'Delivery & access',
    description: 'Where each account lives. Never the credential itself.',
    needsRecord: true,
    isComplete: (c) => Boolean(c.access?.length),
  },
] as const;

export const FIRST_STEP = ALL_STEPS[0].key;

/** The steps a client of this kind walks through. */
export function onboardingSteps(kind: ClientKind): readonly OnboardingStep[] {
  return ALL_STEPS.filter((s) => !s.only || s.only === kind);
}

/**
 * The steps a *saved* client walks through, from its own entity type.
 *
 * A client with no entity type reads as a company, which is both what an
 * unfinished record means and what every row written before onboarding existed
 * is.
 */
export function onboardingStepsFor(client: ClientRecord): readonly OnboardingStep[] {
  return onboardingSteps(clientKindOf(client.entityType));
}

/**
 * Where a `?step=` slug sits in a list. An unknown slug is the first step,
 * which is also how a step this client does not have resolves: an individual
 * sent `?step=contacts` lands on Identity rather than on nothing.
 */
export function stepIndex(steps: readonly OnboardingStep[], key: string | null | undefined): number {
  const found = steps.findIndex((s) => s.key === key);
  return found === -1 ? 0 : found;
}

/**
 * How much of the record is filled in, as a fraction.
 *
 * Derived rather than stored (`PRINCIPLES.md` rule 3): a column recording which
 * step someone stopped on would disagree with the record the first time a step
 * was revisited and left empty. Counted against *this* client's steps, so an
 * individual is never 6 of 7 with a seventh they were never shown.
 */
export function completedSteps(client: ClientRecord): number {
  return onboardingStepsFor(client).filter((s) => s.isComplete(client)).length;
}

/**
 * The step to open a saved client on: the first one it carries nothing for.
 *
 * Not "the step after the count", because the count is how many steps are
 * complete and not how far along the record is — a client can have Documents
 * filled and Contacts empty. The first gap is the one worth landing on, and a
 * client with no gaps opens on its last step rather than on nothing.
 */
export function resumeStep(client: ClientRecord): string {
  const steps = onboardingStepsFor(client);
  const next = steps.find((s) => !s.isComplete(client));
  return (next ?? steps[steps.length - 1]).key;
}
