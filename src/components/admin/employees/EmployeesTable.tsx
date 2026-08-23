'use client';

import { IdCard } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Pagination, rowCountLabel, usePagedRows } from '@/components/ui/pagination';
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
import { TableCard, TruncCell } from '../Page';
import { CopyCell } from '../CopyCell';
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
  const { page, pageCount, visible, setPage, start } = usePagedRows(employees);

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
    <TableCard
      count={rowCountLabel(employees.length, 'employee', start, visible.length)}
      pagination={
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          label="employees"
        />
      }
    >
      <Table>
        <TableCaption className="sr-only">Saved employees, newest first</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>
              Name
            </TableHead>
            <TableHead>
              Email
            </TableHead>
            <TableHead>
              Role
            </TableHead>
            <TableHead>
              Engagement
            </TableHead>
            <TableHead className="w-0 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((employee) => (
            <TableRow key={employee.id} className="group/row">
              <TruncCell value={employee.name} />
              <CopyCell value={employee.email} label="Copy email" width="16rem" />
              <TruncCell value={employee.role} width="12rem" />
              <TableCell>{employee.engagementType}</TableCell>
              <TableCell className="relative py-0 text-right">
                <RowActions>
                  <EditButton label={`Edit ${employee.name}`} onClick={() => onEdit(employee)} />
                  <RemoveButton
                    label={`Delete ${employee.name}`}
                    tooltip="Delete"
                    confirmTitle="Delete employee"
                    confirmDescription={`This removes ${employee.name} and everything recorded about them. An employee who has been on a slip or a letter can’t be deleted.`}
                    onConfirm={() => onDelete(employee)}
                  />
                </RowActions>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}
