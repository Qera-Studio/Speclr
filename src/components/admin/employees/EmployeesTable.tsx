'use client';

import { Briefcase, Handshake, IdCard, Mail, User } from 'lucide-react';
import ColumnLabel from '../ColumnLabel';
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
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IdCard />
          </EmptyMedia>
          <EmptyTitle>No employees yet</EmptyTitle>
          <EmptyDescription>Add your first employee to issue offer letters, stipends, and more.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Saved employees, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>
            <ColumnLabel icon={User}>Name</ColumnLabel>
          </TableHead>
          <TableHead>
            <ColumnLabel icon={Mail}>Email</ColumnLabel>
          </TableHead>
          <TableHead>
            <ColumnLabel icon={Briefcase}>Role</ColumnLabel>
          </TableHead>
          <TableHead>
            <ColumnLabel icon={Handshake}>Engagement</ColumnLabel>
          </TableHead>
          <TableHead className="w-0 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id} className="group/row">
            <TableCell>{employee.name}</TableCell>
            <TableCell>{employee.email}</TableCell>
            <TableCell>{employee.role}</TableCell>
            <TableCell>{employee.engagementType}</TableCell>
            <TableCell className="py-0 text-right">
              <RowActions>
                <EditButton label={`Edit ${employee.name}`} onClick={() => onEdit(employee)} />
                <RemoveButton
                  label={`Delete ${employee.name}`}
                  tooltip="Delete"
                  confirmTitle="Delete employee"
                  confirmDescription={`This will permanently remove ${employee.name}. This action cannot be undone.`}
                  onConfirm={() => onDelete(employee)}
                />
              </RowActions>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
