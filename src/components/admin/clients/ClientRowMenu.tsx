'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { RowMenu } from '../RowMenu';
import type { ClientRecord } from '@/lib/domain/types';
import { resumeStep } from './onboarding/steps';

/**
 * A client row's three actions, behind the shared `RowMenu`.
 *
 * **Delete keeps its confirm, and archive still does not.** Archiving takes
 * nothing away and the menu offers the way back on the next open; confirming a
 * reversible action is how people learn to click through the dialog that guards
 * the irreversible one. The dialog is a sibling of the menu rather than inside
 * it, for the reason `RowMenu` gives: rendered within an item it unmounts with
 * the menu the instant the item is chosen, so it never gets to open.
 */
export function ClientRowMenu({
  client,
  archived,
  onArchive,
  onDelete,
}: {
  client: ClientRecord;
  archived: boolean;
  onArchive: (client: ClientRecord, archived: boolean) => void;
  onDelete: (client: ClientRecord) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <RowMenu label={`More actions for ${client.name}`}>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/client/clients/${client.id}?step=${resumeStep(client)}`)
          }
        >
          <Pencil aria-hidden />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onArchive(client, !archived)}>
          {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          {archived ? 'Restore' : 'Archive'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* `variant="destructive"` rather than a red class: the primitive
            already carries the token, the focus tint and the icon colour, and
            it is the one place the destructive read is defined. */}
        <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden />
          Delete
        </DropdownMenuItem>
      </RowMenu>

      {/* `AlertDialog`, not `Dialog`: this is a destructive confirmation, which
          is the house rule (AGENTS.md) and also what puts focus on the cancel
          and traps it until a choice is made. */}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete client"
        consequence={
          <>
            This permanently removes {client.name} and any files uploaded for them. A
            client that has been on a document can&apos;t be deleted.
          </>
        }
        confirmLabel="Delete client"
        destructive
        onConfirm={() => onDelete(client)}
      />
    </>
  );
}
