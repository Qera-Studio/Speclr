import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The busy indicator for a field that is filling itself in.
 *
 * `aria-hidden` on purpose: the fields that use this already announce through a
 * `role="status"` live region ("Looking up city and state…"), and a second
 * announcement for the same event is noise. This is the visual half only.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn('size-4 shrink-0 animate-spin text-muted-foreground', className)}
    />
  );
}

/**
 * A spinner positioned inside a field's trailing edge.
 *
 * Wrap the input in `<div className="relative">` and drop this in beside it.
 * `pointer-events-none` so it never eats a click meant for the input.
 */
export function FieldSpinner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
      <Spinner />
    </span>
  );
}
