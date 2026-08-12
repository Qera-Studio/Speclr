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
 */
export function AutosaveStatus({
  autosave,
  /** What has to be picked before saving can start: "client" or "employee". */
  recipient = 'client',
}: {
  autosave: DraftAutosave;
  recipient?: string;
}) {
  const { saveState, dirty, docId } = autosave;

  if (!docId && dirty) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Pick a {recipient} to start saving.
      </p>
    );
  }
  if (saveState === 'idle') return null;
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {saveState === 'saving' ? 'Saving…' : 'Saved'}
    </p>
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
