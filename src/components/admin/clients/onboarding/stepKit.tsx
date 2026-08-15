'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { clearDraft, draftKey } from '@/lib/draft';
import { saveClientSection } from '@/server/actions/clients';
import type { ClientSection } from '@/lib/domain/client';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * What every onboarding step is handed, and what it hands back.
 *
 * The record flows down and the *updated* record flows up, rather than the step
 * re-fetching: `router.refresh()` on save would re-render the server component
 * and drop the operator back to the first step.
 */
export interface StepProps {
  client: ClientRecord | null;
  onSaved: (client: ClientRecord) => void;
  /**
   * What the submit button says — the next step's name, computed by the shell.
   * It lives up there because only the shell knows what comes next, and a step
   * hard-coding its successor is a step that lies the day the order changes.
   */
  submitLabel: string;
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

/**
 * The frame every step shares: the fields, one error region, one submit.
 *
 * `noValidate` throughout, as everywhere else in this codebase — the browser's
 * own bubbles are not announced consistently and would compete with
 * `FieldError`, which is a real `role="alert"`.
 */
export function StepForm({
  onSubmit,
  serverError,
  submitting,
  submitLabel,
  children,
}: {
  onSubmit: (event: React.FormEvent) => void;
  serverError: string | null;
  submitting: boolean;
  /** Where the button goes, supplied by the shell. See `StepProps`. */
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FieldGroup size="form">{children}</FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Bottom right, where a "next" lives: the eye leaves a form at the end
          of the last field, not back at the left margin. */}
      <Button type="submit" size="lg" disabled={submitting} className="self-end">
        {submitting ? 'Saving…' : submitLabel}
        {submitting ? null : <ArrowRight aria-hidden />}
      </Button>
    </form>
  );
}

/**
 * Turns a text input's value into a number or `undefined` for RHF.
 *
 * An empty numeric field must reach zod as `undefined`, not `NaN` and not `0`:
 * "no payment terms recorded" and "due immediately" are different facts, and
 * `Number('')` is 0, which would quietly assert the second.
 */
export const asOptionalNumber = {
  setValueAs: (value: unknown) => {
    const text = String(value ?? '').trim();
    if (text === '') return undefined;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  },
};

/**
 * Strips the empty strings a blank optional text input leaves behind.
 *
 * An untouched field arrives as `''`, and storing that is not the same as
 * leaving it out: `contacts.escalation.name === ''` makes the contacts section
 * look filled to `isComplete`, and puts an empty key in a column that is meant
 * to say what is known. Recurses one level so a wholly untouched contact group
 * disappears rather than becoming `{}`.
 *
 * Typed loosely on purpose — it runs over five unrelated section shapes, and a
 * generic constrained to `Record<string, unknown>` rejects every interface that
 * lacks an index signature, which is all of them.
 */
export function pruneEmpty<T extends object>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === '' || value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = pruneEmpty(value as object);
      if (Object.keys(nested).length > 0) out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out as Partial<T>;
}
