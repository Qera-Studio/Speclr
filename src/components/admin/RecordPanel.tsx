'use client';

import { EditorPanelContent } from './EditorPanel';
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

/**
 * The record add/edit form, rendered into the app's editor rail, plus the
 * discard confirmation that protects unsaved input.
 *
 * Shared by the clients, employees and services managers so the guard behaves
 * identically in all three — the rail is non-blocking, so a click on another
 * row while typing must not silently throw the input away.
 */
export default function RecordPanel({
  title,
  open,
  dirtyProps,
  pendingDiscard,
  onConfirmDiscard,
  onCancelDiscard,
  children,
}: {
  title: string;
  open: boolean;
  dirtyProps: { onInput: () => void };
  pendingDiscard: boolean;
  onConfirmDiscard: () => void;
  onCancelDiscard: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Mounted only while open: the form's `key` remount is what resets its
          fields between records, and an unmounted panel also deregisters so the
          rail's expand button correctly greys out. */}
      {open ? (
        <EditorPanelContent title={title}>
          <div {...dirtyProps}>{children}</div>
        </EditorPanelContent>
      ) : null}

      <AlertDialog open={pendingDiscard} onOpenChange={(o) => (o ? null : onCancelDiscard())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this form. Leaving now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelDiscard}>Keep editing</AlertDialogCancel>
            {/* Destructive: this throws away work you typed. */}
            <AlertDialogAction variant="destructive" onClick={onConfirmDiscard}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
