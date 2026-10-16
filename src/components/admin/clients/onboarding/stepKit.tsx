'use client';

import { useCallback, useState } from 'react';
import { clearDraft, draftKey } from '@/lib/draft';
import { saveClientSection } from '@/server/actions/clients';
import type { ClientSection } from '@/lib/domain/client';
import type { ClientKind } from '@/lib/domain/entityType';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Onboarding's half of the step kit.
 *
 * Everything generic — the submit portal, the form frame, the Enter guard, the
 * focus rule, `asOptionalNumber`, `pruneEmpty` — moved to
 * `components/flow/stepKit.tsx` when the contract builder needed the same
 * frame. They are re-exported here rather than having every step file change
 * its import: the steps are onboarding's, and where the frame happens to live
 * is not something twelve step files should have an opinion about.
 *
 * What stays is `useStepSave`, which is the one part that is not generic: it
 * names `saveClientSection`, merges into a `ClientRecord`, and keys its draft
 * on a client id.
 */
export {
  StepActionsSlot,
  STEP_FORM_ID,
  StepForm,
  asOptionalNumber,
  pruneEmpty,
} from '@/components/patterns/flow/stepKit';

/**
 * What every onboarding step is handed, and what it hands back.
 *
 * The record flows down and the *updated* record flows up, rather than the step
 * re-fetching: `router.refresh()` on save would re-render the server component
 * and drop the operator back to the first step.
 */
export interface StepProps {
  client: ClientRecord | null;
  /**
   * This step is done. **The shell takes it as "move on"**, so it belongs to
   * the submit button and nothing else. A step that writes to the row before
   * then wants `onRecordChanged`, which only Attachments needs so far and so
   * only Attachments declares.
   */
  onSaved: (client: ClientRecord) => void;
  /**
   * What the submit button says — the next step's name, computed by the shell.
   * It lives up there because only the shell knows what comes next, and a step
   * hard-coding its successor is a step that lies the day the order changes.
   */
  submitLabel: string;
  /**
   * Which of the two flows this is, so a step can drop what does not apply.
   *
   * Handed down rather than each step deriving it, because the first step is
   * the one that *sets* the entity type it would be derived from: before that
   * save there is no record and nothing to read. The shell holds the one answer
   * both sides of that moment agree on.
   *
   * Optional, defaulting to `'company'` in each step that reads it: that is
   * what a record with no entity type is, which is every client written before
   * onboarding existed and every step rendered on its own in a test.
   */
  kind?: ClientKind;
  /**
   * The country chosen before step 1, as an ISO-2 code.
   *
   * Only ever set while there is no record: it seeds `addressParts.country` on
   * the identity form and then the row holds it, so a step that reads a saved
   * client must read the client. Absent everywhere else, which is every step
   * but the first and every step rendered on its own in a test.
   */
  country?: string;
}

/**
 * The save half of a step: call the action, surface the failure, hand the
 * updated record up.
 *
 * Shared because all six section steps do exactly this and only this. The
 * optimistic local merge is safe — the action has already validated the payload
 * server-side by the time it returns success, so the record built here matches
 * the row that was written.
 */
export function useStepSave<T>(
  client: ClientRecord | null,
  section: ClientSection,
  onSaved: (client: ClientRecord) => void,
  /** What lands on the record. Defaults to the submitted values. */
  toPayload: (values: T) => unknown = (v) => v,
  /**
   * Which step's draft this save retires. Separate from `section` because the
   * two are not one-to-one: Commercial and Services both write `commercial`,
   * and keying the draft on the section would have them share one, so saving
   * either would wipe the other's unsaved work.
   */
  step: string = section,
) {
  const [serverError, setServerError] = useState<string | null>(null);

  const save = useCallback(
    async (values: T) => {
      setServerError(null);
      if (!client) {
        setServerError('Fill in the identity step first — it creates the record.');
        return;
      }

      const payload = toPayload(values);
      const result = await saveClientSection(client.id, section, payload);
      if (!result.success) {
        setServerError(result.error ?? 'Something went wrong.');
        return;
      }

      // The record is now the truth for this section. A surviving draft would
      // restore itself over the top of it next time the step is opened, which
      // is worse than having no draft at all.
      clearDraft(draftKey(client.id, step));
      onSaved({ ...client, [section]: payload, updatedAt: Date.now() } as ClientRecord);
    },
    [client, onSaved, section, step, toPayload],
  );

  return { serverError, setServerError, save };
}
