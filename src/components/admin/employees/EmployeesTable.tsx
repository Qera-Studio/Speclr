'use client';

import { useCallback } from 'react';
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
import { BulkBar, useBulkSelect } from '../BulkSelect';
import { CopyCell } from '../CopyCell';
import type { EmployeeRecord } from '@/lib/domain/employee';

export default function EmployeesTable({
  employees,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  employees: EmployeeRecord[];
  onEdit: (employee: EmployeeRecord) => void;
  onDelete: (employee: EmployeeRecord) => void;
  /**
   * Bulk delete. Opt-in like everything else: omit it and the checkbox column
   * never appears. The selection lives here rather than in the manager because
   * this table owns its own paging, and select-all means the rows on screen.
   */
  onBulkDelete?: (employees: EmployeeRecord[]) => Promise<void>;
}) {
  const { page, pageCount, visible, setPage, start } = usePagedRows(employees);
  /*
    Every row gets a checkbox: an employee who has been on a slip or a letter is
    refused server-side and nothing in this list knows what has been issued.
    Same shape as the per-row `RemoveButton` beside it.
  */
  const employeeId = useCallback((employee: EmployeeRecord) => employee.id, []);
  const selection = useBulkSelect({ rows: visible, id: employeeId });

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
    <div className="flex flex-col gap-2">
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
            {onBulkDelete ? selection.head : null}
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
              {onBulkDelete ? selection.cell(employee) : null}
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

    {/* Under the card and right-aligned, in normal flow: a bar floating over
        the last rows hides the very things about to be deleted. */}
    {onBulkDelete ? (
      <BulkBar
        count={selection.count}
        noun="employee"
        onClear={selection.clear}
        onDelete={async () => {
          await onBulkDelete(selection.chosen);
          selection.clear();
        }}
        consequence="This removes these employees and everything recorded about them. An employee who has been on a slip or a letter can’t be deleted. This cannot be undone."
      />
    ) : null}
    </div>
  );
}
