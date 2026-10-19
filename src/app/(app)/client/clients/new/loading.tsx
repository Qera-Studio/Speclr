import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton, PageBody } from '@/components/patterns/Page';

/** A form is what arrives here, so the skeleton is a form (see `(app)/loading.tsx` for the delay). */
export default function Loading() {
  return (
    <PageBody aria-busy>
      <span className="sr-only" role="status">
        Loading
      </span>
      <div
        aria-hidden="true"
        className="flex flex-col gap-6 animate-in fade-in fill-mode-backwards delay-150 duration-100"
      >
        <Skeleton className="h-8 w-48" />
        <FormSkeleton />
      </div>
    </PageBody>
  );
}
