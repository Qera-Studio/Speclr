'use client';

import { MoreHorizontal, IdCard } from 'lucide-react';
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
import type { EmployeeRecord } from '@/lib/domain/employee';

export default function EmployeesTable({
  employees,
  onEdit,
  onDelete,
  onAdd,
}: {
  employees: EmployeeRecord[];
  onEdit: (employee: EmployeeRecord) => void;
  onDelete: (employee: EmployeeRecord) => void;
  onAdd?: () => void;
}) {
  if (employees.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IdCard />
          </EmptyMedia>
          <EmptyTitle>No employees yet</EmptyTitle>
          <EmptyDescription>Add your first employee to issue offer letters, stipends, and more.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <AddButton onClick={onAdd}>Add employee</AddButton>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Saved employees, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Engagement</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell>{employee.name}</TableCell>
            <TableCell>{employee.email}</TableCell>
            <TableCell>{employee.role}</TableCell>
            <TableCell>{employee.engagementType}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${employee.name}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEdit(employee)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(employee)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
