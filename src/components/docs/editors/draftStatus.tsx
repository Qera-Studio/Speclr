'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUnsavedGuard } from './useUnsavedGuard';
import type { DraftAutosave } from './useDraftAutosave';

/**
 * The UI half of `useDraftAutosave` — the two pieces every editor needs once it
 * has no Save button. Kept together because they answer the same question from
 * opposite ends: "has my work landed?" and "am I about to lose it?".
 */

/**
 * What the Save button used to say, as a status region rather than a control.
 *
 * The recipient line is the honest part. `createDraft` refuses without a client
 * (or an employee, for HR documents), so until one is picked there is genuinely
 * nothing to save — and an editor that silently swallowed the first minute of
 * typing would be worse than the button it replaced. Only shown once there is
 * something waiting, so a blank form is not nagged at.
 *
 * **The region is always mounted, and only its text comes and goes.** A live
 * region is watched from the moment it exists; one that mounts *carrying* its
 * message has nothing to announce, because from the browser's point of view
 * nothing changed. This used to `return null` when idle, which meant the first
 * save of every session, the one that proves the editor is writing at all, was
 * the one nobody heard.
 */
export function AutosaveStatus({
  autosave,
  /**
   * What has to be picked before saving can start: "client" or "employee".
   * `null` for the one document type with nothing to pick — the Service
   * Quotation, which saves as soon as it is touched — so this line never
   * claims a recipient is being waited on when none is required.
   */
  recipient = 'client',
}: {
  autosave: DraftAutosave;
  recipient?: string | null;
}) {
  const { saveState, savedAt, dirty, docId } = autosave;

  let message: string | null = null;
  if (!docId && dirty && recipient) message = `Pick a ${recipient} to start saving.`;
  else if (saveState === 'saving') message = 'Saving…';
  else if (saveState !== 'idle') message = `Saved ${formatClockTime(savedAt)}`;

  return (
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
      {/*
        The time, not just the word. "Saved" is true of a write that landed two
        seconds ago and of one that landed before the connection dropped twenty
        minutes ago, and those are very different situations to be in with an
        unfinished invoice on screen. A clock time answers "is that *this*
        sitting's work?" without anybody having to trust the word.

        Local time and no seconds: this is read to place the save against your
        own memory of the last few minutes, not to reconcile a log.
      */}
      {message}
    </p>
  );
}

/** 'Saved 14:32'. 24-hour, local, no seconds. */
function formatClockTime(at: number | null) {
  return new Date(at ?? Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * A refused write, with the way to try it again.
 *
 * One component rather than the same four-line `Alert` re-typed in each of the
 * four editors, for the reason `DateCell` exists: they had already drifted to
 * three different shapes of the same thing, and none of them offered a retry.
 *
 * The retry matters more here than the wording does. This region carries two
 * kinds of refusal. A **finalize** refusal is the operator's to fix (a GST
 * document with no place of supply), and retrying without changing anything
 * will fail again identically, which is fine and costs a second. An **autosave**
 * refusal is usually not theirs at all: a dropped connection, a cold Neon
 * branch, a deploy mid-keystroke. Without a retry the only way to make the
 * editor write again is to type another character into a form that has just
 * said it cannot save, which is precisely the moment nobody wants to gamble.
 */
export function SaveError({ autosave }: { autosave: DraftAutosave }) {
  const { serverError, setServerError, flush, saveState } = autosave;
  if (!serverError) return null;

  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{serverError}</span>
        <Button
          type="button"
          variant="outline"
          pending={saveState === 'saving'}
          onClick={async () => {
            setServerError(null);
            await flush();
          }}
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Holds back a click that would leave unsaved work, and asks.
 *
 * Autosave narrows the window to about a second, but it does not close it: the
 * debounce is exactly the interval in which a click can still cost an edit.
 */
export function UnsavedChangesDialog({
  autosave,
  /** Names the document in the prompt: "This invoice has edits…". */
  label,
}: {
  autosave: DraftAutosave;
  label: string;
}) {
  const guard = useUnsavedGuard(autosave.dirty);

  return (
    <AlertDialog open={guard.pending !== null} onOpenChange={(open) => open || guard.dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave with unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This {label} has edits that are not in the draft yet. Leaving now loses them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              if (await autosave.flush()) guard.leave();
            }}
          >
            Save and leave
          </Button>
          <AlertDialogAction onClick={guard.leave}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
