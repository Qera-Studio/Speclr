'use client';

import { MoreHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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
      <Card className="items-center px-6 py-10 text-center">
        <p className="text-muted-foreground">No services yet — add your first one.</p>
      </Card>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Saved services, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Overview</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.id}>
            <TableCell>{service.name}</TableCell>
            <TableCell>{truncate(service.overview)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${service.name}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEdit(service)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(service)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
