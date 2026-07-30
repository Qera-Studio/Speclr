'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddButton } from '@/components/ui/add-button';
import RecordPanel from '../RecordPanel';
import { useRecordPanel } from '../useRecordPanel';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
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
  const [deleting, setDeleting] = useState<EmployeeRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    await deleteEmployeeAction(deleting.id);
    setIsDeleting(false);
    setDeleting(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Employees</h1>
        {employees.length > 0 ? (
          <AddButton onClick={() => guardedSelect(null)}>Add employee</AddButton>
        ) : null}
      </div>

      <EmployeesTable
        employees={employees}
        onEdit={(employee) => guardedSelect(employee)}
        onAdd={() => guardedSelect(null)}
        onDelete={(employee) => setDeleting(employee)}
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

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleting?.name ?? 'this employee'}. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
