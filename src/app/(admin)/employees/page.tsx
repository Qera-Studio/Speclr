import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listEmployees } from '@/db/store';
import EmployeeManager from '@/components/admin/employees/EmployeeManager';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; employee list is live data.
export const dynamic = 'force-dynamic';

/**
 * Employees dashboard. Enforces authorization AT THE RESOURCE (not in
 * middleware): a valid Clerk session AND an allowlisted email. Anyone else
 * is redirected to sign-in / no-access.
 */
export default async function EmployeesPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const employees = await listEmployees();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Employees</h1>
      <EmployeeManager employees={employees} />
    </div>
  );
}
