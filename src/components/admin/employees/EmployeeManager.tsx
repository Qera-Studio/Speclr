'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AddButton } from '@/components/ui/add-button';
import RecordPanel from '../RecordPanel';
import { useRecordPanel } from '../useRecordPanel';
import EmployeeForm from './EmployeeForm';
import EmployeesTable from './EmployeesTable';
import { deleteEmployeeAction } from '@/server/actions/employees';
import type { EmployeeRecord } from '@/lib/domain/employee';
import { PageHeader } from '@/components/admin/Page';

export default function EmployeeManager({ employees }: { employees: EmployeeRecord[] }) {
  const router = useRouter();
  const {
    editing,
    open,
    guardedSelect,
    onDone,
    dirtyProps,
    pendingDiscard,
    confirmDiscard,
    cancelDiscard,
  } = useRecordPanel<EmployeeRecord>();
  // The row's `RemoveButton` has already confirmed by the time this runs.
  const onDelete = async (employee: EmployeeRecord) => {
    await deleteEmployeeAction(employee.id);
    router.refresh();
  };

  /*
    One call per employee rather than a batch action: the refusal is per
    employee (one who has been on a slip or a letter is refused server-side)
    and `deleteEmployeeAction` is where that is decided. Refusals are counted
    and reported rather than swallowed — the list refreshes either way, so
    whatever survived is visible in the rows themselves.
  */
  const onBulkDelete = async (chosen: EmployeeRecord[]) => {
    const results = await Promise.all(
      chosen.map((employee) => deleteEmployeeAction(employee.id)),
    );
    const refused = results.filter((r) => !r.success).length;
    router.refresh();
    if (refused > 0) {
      toast.error(
        `${refused} of ${chosen.length} could not be deleted. They are still in the list.`,
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The create CTA lives here whether or not the list is empty — a control
          that moves depending on state is a control you have to look for. */}
      <PageHeader title="Employees">
        <AddButton variant="outline" onClick={() => guardedSelect(null)}>
          Add employee
        </AddButton>
      </PageHeader>

      <EmployeesTable
        employees={employees}
        onEdit={(employee) => guardedSelect(employee)}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
      />

      <RecordPanel
        title={editing ? 'Edit employee' : 'Add employee'}
        open={open}
        dirtyProps={dirtyProps}
        pendingDiscard={pendingDiscard}
        onConfirmDiscard={confirmDiscard}
        onCancelDiscard={cancelDiscard}
      >
        {/* `key` remounts the form so react-hook-form re-reads defaultValues —
            without it, switching records would show the previous one's values. */}
        <EmployeeForm key={editing?.id ?? 'new'} employee={editing} onDone={onDone} />
      </RecordPanel>
    </div>
  );
}
