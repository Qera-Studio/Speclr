/**
 * The seven onboarding steps, as data.
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
 */

import type { ClientRecord } from '@/lib/domain/types';

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
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
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

export const FIRST_STEP = ONBOARDING_STEPS[0].key;

export function stepIndex(key: string | null | undefined): number {
  const found = ONBOARDING_STEPS.findIndex((s) => s.key === key);
  return found === -1 ? 0 : found;
}

/**
 * How much of the record is filled in, as a fraction.
 *
 * Derived rather than stored (`PRINCIPLES.md` rule 3): a column recording which
 * step someone stopped on would disagree with the record the first time a step
 * was revisited and left empty.
 */
export function completedSteps(client: ClientRecord): number {
  return ONBOARDING_STEPS.filter((s) => s.isComplete(client)).length;
}
