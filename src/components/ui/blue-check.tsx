import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A filled blue circle with a white tick — the app's "passed / done" marker.
 * Shared so validation rows, the card verdict, and the reviewed state all read
 * as the same affirmative signal. Pass an `aria-label` for standalone use.
 */
export function BlueCheck({ className, 'aria-label': ariaLabel }: { className?: string; 'aria-label'?: string }) {
  return (
    <span
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn(
        'inline-flex size-5 items-center justify-center rounded-md bg-blue-500 text-white',
        className,
      )}
    >
      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}
