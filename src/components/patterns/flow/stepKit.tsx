'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { FieldGroup } from '@/components/ui/field';

/**
 * The parts of a step that are the same in every flow: where the submit button
 * goes, what Enter does, where the caret lands, and the frame around the
 * fields.
 *
 * Lifted out of `onboarding/stepKit.tsx` when the contract builder needed the
 * same frame. What stayed behind there is the one thing that is not generic:
 * which action a step saves through. See `useStepSave` in that file.
 */

/**
 * Where the submit button is rendered, when a flow shell is around.
 *
 * The button belongs to the wizard: it is in the same place on every step and
 * is pressed once per step in a row, so it must not travel with the step that
 * slides in and out beneath it. But `submitting` and `submitLabel` belong to
 * the *step*, and lifting the button into the shell would mean a second copy of
 * that state kept in step with the first.
 *
 * A portal takes the button out of the sliding subtree without taking its state
 * anywhere. The shell puts its footer node in here; `StepForm` renders into it
 * if there is one and in place if there is not.
 */
export const StepActionsSlot = createContext<HTMLElement | null>(null);

/**
 * One step form is mounted at a time, so one id is enough.
 *
 * Exported because a shell's own footer submits it too: the submit button is
 * portalled out of the form (see `StepActionsSlot`) and "Save and close" is
 * rendered by the shell and never enters the form at all.
 */
export const STEP_FORM_ID = 'client-onboarding-step';

/**
 * Stops Enter in a text field from advancing the wizard.
 *
 * A browser submits a form when Enter is pressed in a single-line input, which
 * on a seven-step wizard means a rate typed into a field moves the operator to
 * the next step before they have looked at the rest of it. Advancing is a
 * deliberate act: it is the button, or nothing.
 *
 * Only single-line inputs, so a textarea keeps its newline and Enter on a
 * focused button still activates it. Anything that has already handled the key
 * (a combobox choosing an option) is left alone.
 */
export function blockImplicitSubmit(event: React.KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter' || event.defaultPrevented) return;
  const target = event.target as HTMLElement;
  if (target instanceof HTMLInputElement && target.type !== 'submit') {
    event.preventDefault();
  }
}

/**
 * Puts the caret in the first field that has nothing in it.
 *
 * Every step remounts on arrival (`key` on the step in `FlowShell`), so this
 * runs once per step, which is exactly the moment the operator's hands are on
 * the keyboard and the cursor is nowhere. Without it, arriving at a step meant
 * a click before typing on all seven of them.
 *
 * **Nothing is focused when every field is already filled**, which is what
 * going *back* to a finished step looks like. Focus is a claim that something
 * needs attention; taking it to re-present a completed form would scroll the
 * step and put a caret in a value the operator came to read, not edit.
 *
 * Inputs and textareas only. A combobox is a button, and focusing a button
 * whose value is empty offers nothing to type into; readonly and disabled
 * fields are skipped for the same reason, and `type=hidden` and the file input
 * behind `UploadDropzone` are not fields anybody types into at all.
 */
export function useFocusFirstEmpty(form: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const fields = form.current?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >('input:not([type=hidden]):not([type=file]), textarea');
    for (const field of fields ?? []) {
      if (field.readOnly || field.disabled || field.value) continue;
      field.focus();
      return;
    }
  }, [form]);
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
  allOptional,
  children,
}: {
  onSubmit: (event: React.FormEvent) => void;
  serverError: string | null;
  submitting: boolean;
  /** Where the button goes, supplied by the shell. */
  submitLabel: string;
  /**
   * Every field on this step is optional, so say it once here instead of
   * marking thirty labels.
   *
   * Which is not a shortcut: `domain/client.ts` states that the four groups are
   * optional by design, because a step saves against a row that already exists
   * and a half-filled client is a normal state. An operator cannot see that
   * from the form, and the tax step in particular reads as a wall of
   * identifiers they are being told to produce. One line up front is the
   * difference between a step that can be skipped and a step that looks like a
   * blocker. See `FieldInfo`'s `optional` for the other half of the rule.
   */
  allOptional?: boolean;
  children: ReactNode;
}) {
  const slot = useContext(StepActionsSlot);
  const form = useRef<HTMLFormElement>(null);
  useFocusFirstEmpty(form);

  // `hover:bg-primary` cancels the button's own tint: the arrow is the whole
  // hover response, and a colour shift under it answers the same event twice.
  const submit = (
    <Button variant="primary"
      type="submit"
      size="md"
      pending={submitting}
      form={STEP_FORM_ID}
      className="group/tray hover:bg-primary"
    >
      {submitLabel}
      {submitting ? null : <ArrowRight aria-hidden="true" />}
    </Button>
  );

  return (
    <form
      ref={form}
      id={STEP_FORM_ID}
      onSubmit={onSubmit}
      onKeyDown={blockImplicitSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {allOptional ? (
        <p className="text-body text-muted-foreground">
          Nothing here is required. Fill in what you have and carry on; the rest
          can wait.
        </p>
      ) : null}

      <FieldGroup size="form">
        {children}
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {/* In place when nothing has offered a slot — which is a step rendered on
          its own, as the tests do, not a failure mode to guard against. `form`
          is what lets the portalled copy submit this form from outside it. */}
      {slot ? createPortal(submit, slot) : submit}
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
