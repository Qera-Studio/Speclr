'use client';

import { startTransition, useOptimistic, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, CircleAlert, Users } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AddLink } from '@/components/ui/add-button';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ClientsTable from './ClientsTable';
import { deleteClientAction, setClientArchivedAction } from '@/server/actions/clients';
import type { ClientRecord } from '@/lib/domain/types';
import { PageHeader } from '@/components/admin/Page';

/**
 * The clients list.
 *
 * Adding and editing both go to `/client/clients/[id]`, the seven-step
 * onboarding surface, rather than to a form in the editor rail. The rail form
 * was deleted with it — a 384px rail cannot hold tax registration, four
 * contacts, commercial terms and a file list, and keeping a short version
 * beside the long one means a quick edit silently ignores every section it
 * doesn't know about.
 *
 * A link rather than a button, because these are now real URLs: onboarding a
 * client is a task people get interrupted during, and a page you can bookmark
 * and come back to is the point.
 */
export default function ClientManager({ clients }: { clients: ClientRecord[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  /**
   * Which list you are looking at. Component state, not the URL: it is a
   * two-way toggle on one page rather than a place, and archived clients are
   * not a view anybody links to.
   */
  const [showArchived, setShowArchived] = useState(false);

  /**
   * The list as it will be once the write lands, shown at once.
   *
   * Archiving and deleting both take a row out of the list you are looking at,
   * and the round trip to Neon is long enough that the row sits there looking
   * ignored. React reverts this by itself the moment the transition ends, so a
   * refusal needs no rollback code: the row simply comes back, and the reason
   * is in the alert above it.
   */
  const [rows, applyOptimistic] = useOptimistic(
    clients,
    (state: ClientRecord[], change: { id: string; archived?: boolean; deleted?: boolean }) =>
      change.deleted
        ? state.filter((c) => c.id !== change.id)
        : state.map((c) => (c.id === change.id ? { ...c, archived: change.archived } : c)),
  );

  // Derived, not a second fetch. The page loads every client anyway, and one
  // query with a filter applied here cannot disagree with itself about the
  // count in the button.
  const archived = rows.filter((c) => c.archived);
  const shown = showArchived ? archived : rows.filter((c) => !c.archived);

  /**
   * The row's `RemoveButton` has already confirmed by the time this runs — but
   * confirming is not the same as being allowed. A client that has ever been on
   * a document is refused server-side, so the refusal has to land somewhere the
   * operator can read it rather than disappearing into a resolved promise.
   *
   * No toast on success: the row leaving the list *is* the confirmation, and a
   * toast repeating it would be one more thing to dismiss. No undo either:
   * deleting erases the attachments as well as the row (DPDP Act 2023), so
   * there is nothing to put back.
   */
  const onDelete = (client: ClientRecord) =>
    startTransition(async () => {
      setError(null);
      applyOptimistic({ id: client.id, deleted: true });
      const result = await deleteClientAction(client.id);
      if (!result.success) {
        setError(result.error ?? 'Failed to delete client.');
        return;
      }
      router.refresh();
    });

  /**
   * Offboarding, and the way back. Reversible and refused by nothing, so unlike
   * deleting there is no state to check first — the only failure it can report
   * is the server saying no.
   *
   * This one does toast, and the toast is the undo. The row vanishes out of the
   * list you were reading, so the confirmation has to carry the way back with
   * it; the alternative is finding the archive toggle and hunting for the row.
   */
  const onArchive = (client: ClientRecord, next: boolean) =>
    startTransition(async () => {
      setError(null);
      applyOptimistic({ id: client.id, archived: next });
      const result = await setClientArchivedAction(client.id, next);
      if (!result.success) {
        setError(result.error ?? 'Failed to update client.');
        return;
      }
      router.refresh();
      toast(`${client.name} ${next ? 'archived' : 'restored'}`, {
        action: {
          label: 'Undo',
          onClick: () => onArchive(client, !next),
        },
      });
    });

  return (
    <div className="flex flex-col gap-4">
      {/* The create CTA lives here whether or not the list is empty — a control
          that moves depending on state is a control you have to look for. */}
      <PageHeader title="Clients">
        {/*
          Outline, not filled. The rail's "New document" is the app's one blue
          and it is on screen on every page; a second filled blue here would
          make the viewport argue with itself about which action matters.
        */}
        <AddLink href="/client/clients/new" variant="outline">
          Add client
        </AddLink>
        {/*
          The way back to the offboarded. Icon only and to the right of the
          create action, because it is somewhere you go rarely and it must not
          read as a second thing to do.
        */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-pressed={showArchived}
                aria-label={showArchived ? 'Show active clients' : 'Show archived clients'}
                onClick={() => setShowArchived((v) => !v)}
              />
            }
          >
            {showArchived ? <Users className="size-4" /> : <Archive className="size-4" />}
          </TooltipTrigger>
          <TooltipContent>
            {showArchived ? 'Active clients' : `Archived (${archived.length})`}
          </TooltipContent>
        </Tooltip>
      </PageHeader>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}

      <ClientsTable
        clients={shown}
        onDelete={onDelete}
        onArchive={onArchive}
        archived={showArchived}
      />
    </div>
  );
}
