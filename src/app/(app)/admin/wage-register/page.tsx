import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listDocumentsByType } from '@/db/store';
import { PageBody } from '@/components/patterns/Page';
import WageRegister from '@/components/admin/payroll/WageRegister';
import { registerMonths, wageRegisterRows } from '@/lib/domain/wageRegister';
import type { SlipDocument } from '@/lib/domain/types';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie and live documents, read on every request.
export const dynamic = 'force-dynamic';

export default async function WageRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const slips = (await listDocumentsByType('PAY')) as SlipDocument[];
  const months = registerMonths(slips);
  const asked = (await searchParams).month;
  // Only a month the register has; anything else opens on the latest.
  const month = typeof asked === 'string' && months.includes(asked) ? asked : (months[0] ?? null);

  return (
    <PageBody>
      <WageRegister months={months} month={month} rows={month ? wageRegisterRows(slips, month) : []} />
    </PageBody>
  );
}
