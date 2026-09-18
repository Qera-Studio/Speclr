'use client';

import Link from 'next/link';
import { Archive, ArchiveRestore, Pencil, Users } from 'lucide-react';
import { completedSteps, onboardingStepsFor, resumeStep } from './onboarding/steps';
import { Button } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { DateCell } from '../Page';
import RecordTable, { type RecordTableProps } from '../RecordTable';
import { CopyCell } from '../CopyCell';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { countryName } from '@/lib/domain/countries';
import { formatPhoneForDisplay } from '@/lib/domain/phone';
import type { ClientRecord } from '@/lib/domain/types';
import type { ClientSortColumn, ClientSortState } from './clientQuery';

/** `circle-dot-dashed` from Lucide, minus its centre dot. */
const DASHED_RING = [
  'M10.1 2.18a9.93 9.93 0 0 1 3.8 0',
  'M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7',
  'M21.82 10.1a9.93 9.93 0 0 1 0 3.8',
  'M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69',
  'M13.9 21.82a9.94 9.94 0 0 1-3.8 0',
  'M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7',
  'M2.18 13.9a9.93 9.93 0 0 1 0-3.8',
  'M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69',
];

/**
 * How far through onboarding a client is, as a ring.
 *
 * A ring rather than "3 of 7" because this column is scanned, not read: the
 * question at a glance is "which of these are unfinished", and an arc answers
 * it without the eye stopping to parse two numbers per row. The figures are
 * still there, in the tooltip and in the accessible name, for the moment the
 * question becomes "how much is left".
 *
 * Nothing started draws as a dashed track and no arc at all. A zero-length arc
 * is indistinguishable from a rendering failure, and a dashed ring reads as
 * "not begun" rather than "begun and empty".
 *
 * The denominator moves — a client who is one person has six steps, not seven,
 * because they *are* the contact (`CONTEXT.md` §5d-i) — which is why the
 * tooltip prints the total rather than just the count done.
 */
function OnboardingRing({ done, total }: { done: number; total: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const swept = total > 0 ? (done / total) * circumference : 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex" role="img" aria-label={`Onboarding: ${done} of ${total}`}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {done === 0 ? (
                // Lucide's `circle-dot-dashed`, without the centre dot: the dot
                // is that icon's "something is here", and nothing is.
                DASHED_RING.map((d) => (
                  <path key={d} d={d} className="stroke-muted-foreground/50" />
                ))
              ) : (
                <>
                  <circle cx="12" cy="12" r={radius} className="stroke-border" />
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    className="stroke-primary"
                    strokeDasharray={`${swept} ${circumference}`}
                    transform="rotate(-90 12 12)"
                  />
                </>
              )}
            </svg>
          </span>
        }
      />
      <TooltipContent>
        Onboarding: {done} of {total}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The sortable columns, in the order they are drawn. The onboarding ring and
 * the actions cell are headed by an `sr-only` span instead: a ring has no
 * heading worth reading, and neither is a column you order the list by.
 */
const COLUMNS: { column: ClientSortColumn; label: string }[] = [
  { column: 'name', label: 'Name' },
  { column: 'email', label: 'Email' },
  { column: 'phone', label: 'Phone' },
  { column: 'country', label: 'Country' },
  { column: 'added', label: 'Added' },
];

export default function ClientsTable({
  clients,
  onDelete,
  onArchive,
  archived = false,
  sort,
  onSortChange,
  paging,
  onBulkDelete,
}: {
  clients: ClientRecord[];
  onDelete: (client: ClientRecord) => void;
  onArchive?: (client: ClientRecord, archived: boolean) => void;
  /** Showing the offboarded list, which changes the empty copy and the action. */
  archived?: boolean;
  /**
   * Sorting and paging are the manager's, because the manager is what filters
   * the list, and `sortClients` knows things the rendered text does not (a
   * blank country reads as India). The ten-row rule is unchanged; what moves
   * is who slices.
   */
  sort?: ClientSortState | null;
  onSortChange?: (column: ClientSortColumn) => void;
  paging?: RecordTableProps<ClientRecord>['paging'];
  /** Bulk delete, opt-in. Offering it is what shows the checkbox column. */
  onBulkDelete?: (clients: ClientRecord[]) => Promise<void>;
}) {
  return (
    <RecordTable
      rows={clients}
      id={(client) => client.id}
      noun="client"
      /* Not "newest first" any more: the list can be sorted and filtered by the
         page around it, and a caption naming an order the table no longer has
         is worse than one naming none. */
      caption="Saved clients"
      /* The whole row opens the client, via one stretched anchor rather than a
         row `onClick`, so middle-click, cmd-click and "copy link" all work. A
         list where one row is clickable and the next is not is a list nobody
         trusts to be clickable. */
      open={(client) => ({
        href: `/client/clients/${client.id}?step=${resumeStep(client)}`,
      })}
      sort={sort}
      onSortChange={onSortChange as ((column: string) => void) | undefined}
      // The manager sorts, whether or not the controls are on screen: the
      // `SortToggle` eye hides the arrows and keeps the order.
      externalSort
      paging={paging}
      columns={[
        { key: 'name', label: 'Name', cell: (client) => client.name },
        {
          key: 'email',
          label: 'Email',
          ownCell: true,
          sortValue: (client) => client.email,
          cell: (client) => <CopyCell value={client.email} label="Copy email" width="16rem" />,
        },
        {
          /*
            Stored E.164, shown grouped. `formatPhoneForDisplay` had existed
            and been tested since phones were added and nothing called it, so
            every list printed +919876543210.
          */
          key: 'phone',
          label: 'Phone',
          ownCell: true,
          sortValue: (client) => client.phone,
          cell: (client) => (
            <CopyCell
              value={client.phone}
              label="Copy phone number"
              className="tabular-nums"
              display={formatPhoneForDisplay(client.phone)}
            />
          ),
        },
        {
          /*
            Country, not GSTIN. A GSTIN is fifteen characters nobody reads off
            a list, and most rows have none. Where a client is decides which
            registrations, legal forms and documents the record even asks for
            (`CONTEXT.md` §5d-ii), so it is the fact worth scanning. Blank
            reads as India, as everywhere else.
          */
          key: 'country',
          label: 'Country',
          cell: (client) => countryName(client.addressParts?.country || 'IN'),
        },
        {
          /*
            When the record was created, which is also what the list is sorted
            by: a table ordered by a fact it does not show reads as unordered.
            `DateCell` so it is the same date the documents list prints, in the
            same weight.
          */
          key: 'added',
          label: 'Added',
          ownCell: true,
          sortValue: (client) => client.createdAt,
          cell: (client) => <DateCell value={client.createdAt} />,
        },
        {
          /* A glyph that carries its own figures in a tooltip, so its heading
             is for screen readers only (§2.3). */
          key: 'onboarding',
          label: 'Onboarding',
          headingHidden: true,
          cell: (client) => (
            <OnboardingRing
              done={completedSteps(client)}
              // Out of *this* client's steps: an individual has six, not seven.
              total={onboardingStepsFor(client).length}
            />
          ),
        },
      ]}
      onBulkDelete={onBulkDelete}
      bulkConsequence="This permanently removes these clients and any files uploaded for them. A client that has been on a document can't be deleted. This cannot be undone."
      actions={(client) => (
        <>
          {/*
            Archiving asks nothing first: it takes nothing away, and the button
            beside it puts it straight back. Confirming a reversible action
            teaches people to click through the dialog that guards the
            irreversible one.
          */}
          {onArchive ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${archived ? 'Restore' : 'Archive'} ${client.name}`}
                    onClick={() => onArchive(client, !archived)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  />
                }
              >
                {archived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>{archived ? 'Restore' : 'Archive'}</TooltipContent>
            </Tooltip>
          ) : null}
          {/* Edit is a `Link` rather than the shared `EditButton`, because
              onboarding is a real URL worth opening in a new tab. */}
          <Link
            href={`/client/clients/${client.id}?step=${resumeStep(client)}`}
            aria-label={`Edit ${client.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Link>
          {/* Delete is offered on every row and refused server-side for any
              client that has a document: the check cannot live here, since the
              list has no idea what has been issued. Confirming and then being
              told no is the honest shape, since the alternative is a button
              that is missing for reasons the row cannot explain. */}
          <RemoveButton
            label={`Delete ${client.name}`}
            tooltip="Delete"
            confirmTitle="Delete client"
            confirmDescription={`This permanently removes ${client.name} and any files uploaded for them. A client that has been on a document can't be deleted.`}
            onConfirm={() => onDelete(client)}
          />
        </>
      )}
      empty={{
        icon: archived ? <Archive /> : <Users />,
        title: archived ? 'Nothing archived' : 'No clients yet',
        description: archived
          ? 'Archive a client when the engagement is over and they leave this list.'
          : 'Add your first client to start issuing documents.',
      }}
    />
  );
}
