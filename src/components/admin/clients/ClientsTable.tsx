'use client';

import Link from 'next/link';
import { BadgeIndianRupee, Building2, ListChecks, Mail, Pencil, Phone, Users } from 'lucide-react';
import ColumnLabel from '../ColumnLabel';
import { completedSteps, onboardingStepsFor, resumeStep } from './onboarding/steps';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { RemoveButton } from '@/components/ui/remove-button';
import { RowActions } from '../RowActions';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ClientRecord } from '@/lib/domain/types';

export default function ClientsTable({
  clients,
  onDelete,
}: {
  clients: ClientRecord[];
  onDelete: (client: ClientRecord) => void;
}) {
  if (clients.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>No clients yet</EmptyTitle>
          <EmptyDescription>Add your first client to start issuing documents.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Saved clients, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>
            <ColumnLabel icon={Building2}>Name</ColumnLabel>
          </TableHead>
          <TableHead>
            <ColumnLabel icon={Mail}>Email</ColumnLabel>
          </TableHead>
          <TableHead>
            <ColumnLabel icon={Phone}>Phone</ColumnLabel>
          </TableHead>
          <TableHead>
            <ColumnLabel icon={BadgeIndianRupee}>GSTIN</ColumnLabel>
          </TableHead>
          <TableHead>
            <ColumnLabel icon={ListChecks}>Onboarding</ColumnLabel>
          </TableHead>
          <TableHead className="w-0 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          // Out of *this* client's steps: an individual has six, not seven.
          const done = completedSteps(client);
          const total = onboardingStepsFor(client).length;
          return (
            <TableRow key={client.id} className="group/row">
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell>{client.gstin || '—'}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {done} of {total}
              </TableCell>
              <TableCell className="py-0 text-right">
                {/*
                  Edit is a `Link` rather than the shared `EditButton`, because
                  onboarding is a real URL worth opening in a new tab.

                  Delete is offered on every row and refused server-side for any
                  client that has a document — the check cannot live here, since
                  the list has no idea what has been issued. Confirming and then
                  being told no is the honest shape: the alternative is a button
                  that is missing for reasons the row cannot explain.
                */}
                <RowActions>
                  <Link
                    href={`/client/clients/${client.id}?step=${resumeStep(client)}`}
                    aria-label={`Edit ${client.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/row:opacity-100"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Link>
                  <RemoveButton
                    label={`Delete ${client.name}`}
                    tooltip="Delete"
                    confirmTitle="Delete client"
                    confirmDescription={`This permanently removes ${client.name} and any files uploaded for them. A client that has been on a document can't be deleted.`}
                    onConfirm={() => onDelete(client)}
                  />
                </RowActions>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
