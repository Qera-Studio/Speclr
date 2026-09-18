'use client';

import { IdCard } from 'lucide-react';
import { RemoveButton } from '@/components/ui/remove-button';
import { EditButton } from '../RowActions';
import RecordTable from '../RecordTable';
import { CopyCell } from '../CopyCell';
import type { EmployeeRecord } from '@/lib/domain/employee';

/**
 * The employees list.
 *
 * A `RecordTable`, like every list of records (`docs/design.md` §2.3), so the
 * paging, the caption, the sortable headings, the reserved actions column and
 * the selection behaviour are the house ones rather than this file's opinion.
 * What is left here is what is actually particular to an employee: which
 * columns, and what the two row actions do.
 */
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
   * Bulk delete. Opt-in: omit it and the checkbox column never appears.
   *
   * Every row gets a checkbox when it is offered, because an employee who has
   * been on a slip or a letter is refused server-side and nothing in this list
   * knows what has been issued. Same shape as the per-row `RemoveButton`.
   */
  onBulkDelete?: (employees: EmployeeRecord[]) => Promise<void>;
}) {
  return (
    <RecordTable
      rows={employees}
      id={(employee) => employee.id}
      noun="employee"
      caption="Saved employees, newest first"
      columns={[
        { key: 'name', label: 'Name', cell: (e) => e.name },
        {
          key: 'email',
          label: 'Email',
          ownCell: true,
          sortValue: (e) => e.email,
          cell: (e) => <CopyCell value={e.email} label="Copy email" width="16rem" />,
        },
        { key: 'role', label: 'Role', trunc: '12rem', cell: (e) => e.role },
        { key: 'engagement', label: 'Engagement', cell: (e) => e.engagementType },
      ]}
      actions={(employee) => (
        <>
          <EditButton label={`Edit ${employee.name}`} onClick={() => onEdit(employee)} />
          <RemoveButton
            label={`Delete ${employee.name}`}
            tooltip="Delete"
            confirmTitle="Delete employee"
            confirmDescription={`This removes ${employee.name} and everything recorded about them. An employee who has been on a slip or a letter can’t be deleted.`}
            onConfirm={() => onDelete(employee)}
          />
        </>
      )}
      onBulkDelete={onBulkDelete}
      bulkConsequence="This removes these employees and everything recorded about them. An employee who has been on a slip or a letter can’t be deleted. This cannot be undone."
      empty={{
        icon: <IdCard />,
        title: 'No employees yet',
        description: 'Add your first employee to issue offer letters, stipends, and more.',
      }}
    />
  );
}
