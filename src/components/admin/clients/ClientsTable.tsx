'use client';

import { BadgeIndianRupee, Building2, Mail, Phone, Users } from 'lucide-react';
import ColumnLabel from '../ColumnLabel';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { EditButton, RowActions } from '../RowActions';
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
}: {
  clients: ClientRecord[];
  onEdit: (client: ClientRecord) => void;
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
          <TableHead className="w-0 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id} className="group/row">
            <TableCell>{client.name}</TableCell>
            <TableCell>{client.email}</TableCell>
            <TableCell>{client.phone}</TableCell>
            <TableCell>{client.gstin || '—'}</TableCell>
            <TableCell className="py-0 text-right">
              {/*
                Edit is the only action a client has — clients are never
                deleted, since issued documents reference them.
              */}
              <RowActions>
                <EditButton label={`Edit ${client.name}`} onClick={() => onEdit(client)} />
              </RowActions>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
