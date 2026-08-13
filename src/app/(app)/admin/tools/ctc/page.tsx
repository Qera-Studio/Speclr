import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import CtcCalculator from '@/components/tools/CtcCalculator';

export const metadata: Metadata = {
  title: 'CTC calculator — speclr',
  robots: { index: false, follow: false },
};

// The session cookie must be read on every request. Nothing else here is
// dynamic — the calculator holds no state on the server and touches no table.
export const dynamic = 'force-dynamic';

/**
 * Annual CTC → the monthly salary structure a pay slip's earnings should read.
 *
 * Authorization is enforced AT THE RESOURCE, like every other page here. It
 * reads nothing and writes nothing, but salary structure is not something to
 * leave open to a signed-out visitor.
 */
export default async function CtcPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">CTC calculator</h1>
        <p className="text-sm text-muted-foreground">
          What an annual CTC works out to as monthly basic, HRA and allowance —
          the figures a pay slip&rsquo;s earnings should carry. Nothing is saved;
          copy the numbers onto the slip.
        </p>
      </div>
      <CtcCalculator />
    </div>
  );
}
