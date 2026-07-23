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
import type { EmployeeRecord } from '@/lib/domain/employee';

export default function EmployeesTable({
  employees,
  onEdit,
  onDelete,
}: {
  employees: EmployeeRecord[];
  onEdit: (employee: EmployeeRecord) => void;
  onDelete: (employee: EmployeeRecord) => void;
}) {
  if (employees.length === 0) {
    return (
      <Card className="items-center px-6 py-10 text-center">
        <p className="text-muted-foreground">No employees yet — add your first one.</p>
      </Card>
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
