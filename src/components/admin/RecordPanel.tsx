'use client';

import { EditorPanelContent } from './EditorPanel';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';

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

      <ConfirmDialog
        open={pendingDiscard}
        onOpenChange={(o) => (o ? null : onCancelDiscard())}
        title="Discard changes"
        consequence="You have unsaved changes in this form. Leaving now discards them."
        confirmLabel="Discard changes"
        destructive
        onConfirm={onConfirmDiscard}
      />
    </>
  );
}
