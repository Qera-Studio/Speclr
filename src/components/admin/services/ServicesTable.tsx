'use client';

import { Package } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { RemoveButton } from '@/components/ui/remove-button';
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
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';

function truncate(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export default function ServicesTable({
  services,
  onEdit,
  onDelete,
}: {
  services: ServiceTemplate[];
  onEdit: (service: ServiceTemplate) => void;
  onDelete: (service: ServiceTemplate) => void;
}) {
  if (services.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package />
          </EmptyMedia>
          <EmptyTitle>No services yet</EmptyTitle>
          <EmptyDescription>Create a service template to reuse across contracts and invoices.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Saved services, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Overview</TableHead>
          <TableHead className="w-0 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.id} className="group/row">
            <TableCell>{service.name}</TableCell>
            <TableCell>{truncate(service.overview)}</TableCell>
            <TableCell className="py-0 text-right">
              <RowActions>
                <EditButton label={`Edit ${service.name}`} onClick={() => onEdit(service)} />
                <RemoveButton
                  label={`Delete ${service.name}`}
                  confirmTitle="Delete service"
                  confirmDescription={`This will permanently remove ${service.name}. This action cannot be undone.`}
                  onConfirm={() => onDelete(service)}
                />
              </RowActions>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
