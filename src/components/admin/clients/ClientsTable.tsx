'use client';

import { Pencil, Users } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { AddButton } from '@/components/ui/add-button';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  onEdit,
  onAdd,
}: {
  clients: ClientRecord[];
  onEdit: (client: ClientRecord) => void;
  onAdd?: () => void;
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
        <EmptyContent>
          <AddButton onClick={onAdd}>Add client</AddButton>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Saved clients, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>GSTIN</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell>{client.name}</TableCell>
            <TableCell>{client.email}</TableCell>
            <TableCell>{client.phone}</TableCell>
            <TableCell>{client.gstin || '—'}</TableCell>
            <TableCell>
              {/*
                Edit is the only action a client has — clients are never
                deleted, since issued documents reference them. A menu holding
                one item just hides that behind an extra click, so the action
                is the button.
              */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(client)}
                      aria-label={`Edit ${client.name}`}
                    />
                  }
                >
                  <Pencil />
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
