'use client';

import { useRouter } from 'next/navigation';
import { AddButton } from '@/components/ui/add-button';
import RecordPanel from '../RecordPanel';
import { useRecordPanel } from '../useRecordPanel';
import EmployeeForm from './EmployeeForm';
import EmployeesTable from './EmployeesTable';
import { deleteEmployeeAction } from '@/server/actions/employees';
import type { EmployeeRecord } from '@/lib/domain/employee';

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

  return (
    <div className="flex flex-col gap-4">
      {/* The create CTA lives here whether or not the list is empty — a control
          that moves depending on state is a control you have to look for. */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <AddButton onClick={() => guardedSelect(null)}>Add employee</AddButton>
      </div>

      <EmployeesTable
        employees={employees}
        onEdit={(employee) => guardedSelect(employee)}
        onDelete={onDelete}
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
