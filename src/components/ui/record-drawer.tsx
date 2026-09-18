'use client';

import { useState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DrawerSheet } from '@/components/ui/drawer-sheet';
import type { DrawerPaging } from '@/components/ui/drawer-toolbar';
import { DrawerToolbar } from '@/components/ui/drawer-toolbar';

/**
 * A drawer that edits one record: the draft, the error slot, the toolbar and
 * the frame, with only the fields left to the caller.
 *
 * What it owns is the part that was identical in both editing drawers: hold a
 * local draft seeded from the record, hand it to the fields with a setter,
 * show the server's last refusal above them, and keep the whole thing inside
 * the frame `DrawerSheet` draws. The draft is local and dies with the drawer,
 * which is what makes closing it the cancel.
 *
 * ## Saving is a strategy, not an assumption
 *
 * This is the one place the two real callers genuinely disagree, and the
 * disagreement is not cosmetic. The clause drawer **autosaves** on a debounce
 * with no button, because a clause is the source text for every contract
 * drafted afterwards and a half-typed legal sentence must not reach the
 * library mid-word (`useClauseAutosave`). `ServiceSheet` saves on an explicit
 * button, because its commit does more than write a row.
 *
 * So `save` is a discriminated union rather than a boolean. A preset that
 * picked one and made the other bolt something on would be the copy-paste this
 * component exists to remove, wearing an abstraction.
 *
 * Anything that is not "edit one record" should use `DrawerSheet` directly.
 * `Notifications` is the standing example: a feed has no draft, no dirty state
 * and nothing to save.
 */
export type RecordSave =
  | {
      /** A Save button in the footer, enabled only while there is a change. */
      kind: 'explicit';
      onSave: () => void;
      onCancel: () => void;
      dirty: boolean;
      pending?: boolean;
      saveLabel?: string;
      /** Shown at the start of the footer row, e.g. "3 fields still empty". */
      note?: ReactNode;
    }
  | {
      /** No button. The caller's own hook writes; this only reports. */
      kind: 'auto';
      /** A status line for the footer, e.g. "Saved". Omit for no footer. */
      status?: ReactNode;
    };

export function RecordDrawer<T>({
  record,
  open = true,
  onClose,
  title,
  description,
  titleAside,
  save,
  error,
  paging,
  actions,
  expanded,
  onExpandedChange,
  expandLabel,
  backLabel,
  size,
  float,
  overlayClassName,
  bodyClassName,
  children,
}: {
  /** The record as the server last sent it. Seeds the draft. */
  record: T;
  open?: boolean;
  onClose: () => void;
  /** Titled from the *draft*, so the header tracks the field being edited. */
  title: (draft: T) => ReactNode;
  description?: ReactNode;
  titleAside?: (draft: T) => ReactNode;
  save: RecordSave;
  /** The server's last refusal. Rendered above the fields.  */
  error?: string | null;
  paging?: DrawerPaging;
  actions?: ReactNode;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandLabel?: string;
  backLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  float?: boolean;
  overlayClassName?: string;
  bodyClassName?: string;
  children: (draft: T, setDraft: (next: T) => void) => ReactNode;
}) {
  /*
    Seeded once, deliberately. A caller that pages between records keys this
    component by the record's id so it remounts with the next one's own draft,
    which is what the clause drawer already does. Syncing from the prop instead
    would overwrite what somebody is typing the moment the route refreshes.
  */
  const [draft, setDraft] = useState(record);

  return (
    <DrawerSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title(draft)}
      description={description}
      titleAside={titleAside?.(draft)}
      size={size}
      float={float}
      overlayClassName={overlayClassName}
      bodyClassName={bodyClassName}
      toolbar={
        <DrawerToolbar
          onBack={onClose}
          backLabel={backLabel}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
          expandLabel={expandLabel}
          paging={paging}
          actions={actions}
        />
      }
      footer={footerFor(save)}
    >
      {/*
        The error sits above the fields rather than beside the control that
        failed, because what fails here is the write of the whole record and
        there is no one field to blame.
      */}
      {error ? (
        <Alert variant="destructive" role="alert" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {children(draft, setDraft)}
    </DrawerSheet>
  );
}

function footerFor(save: RecordSave): ReactNode {
  if (save.kind === 'auto') {
    if (!save.status) return undefined;
    // `role="status"`, because a save nobody pressed a button for is news: it
    // is the only signal that the write happened.
    return (
      <span role="status" className="text-xs text-muted-foreground">
        {save.status}
      </span>
    );
  }

  return (
    <>
      {save.note ? (
        <p className="mr-auto text-xs text-muted-foreground" role="status">
          {save.note}
        </p>
      ) : null}
      <Button type="button" variant="outline" onClick={save.onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={save.onSave} disabled={save.pending || !save.dirty}>
        {save.pending ? 'Saving…' : save.saveLabel ?? 'Save'}
      </Button>
    </>
  );
}
