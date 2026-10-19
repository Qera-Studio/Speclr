import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty';
import { PageBody } from '@/components/patterns/Page';

/**
 * Inside the shell, so a dead link lands on a page that still has the nav
 * and the way back, rather than on Next's bare 404 (`docs/design.md` §2.5).
 */
export default function AppNotFound() {
  return (
    <PageBody>
      <EmptyState
        preset="not-found"
        className="border"
        description="The link may be old, or the record it pointed at was deleted."
        action={
          <Link href="/" className={buttonVariants({ variant: 'primary' })}>
            Go to the dashboard
          </Link>
        }
      />
    </PageBody>
  );
}
