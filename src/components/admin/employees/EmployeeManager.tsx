'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRecord | null>(null);
  const [deleting, setDeleting] = useState<EmployeeRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDone = () => {
    setOpen(false);
    router.refresh();
  };

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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add employee
        </Button>
      </div>

      <EmployeesTable
        employees={employees}
        onEdit={(employee) => {
          setEditing(employee);
          setOpen(true);
        }}
        onDelete={(employee) => setDeleting(employee)}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit employee' : 'Add employee'}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <EmployeeForm key={editing?.id ?? 'new'} employee={editing} onDone={onDone} />
          </div>
        </SheetContent>
      </Sheet>

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
