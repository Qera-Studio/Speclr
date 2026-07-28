import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlueCheckProps {
  className?: string;
  'aria-label'?: string;
  /**
   * `filled` (default) — a solid blue circle with a white tick, the app's
   * affirmative marker on validation rows and card verdicts.
   * `outline` — no background, a stroke ring with a matching tick (inherits
   * `currentColor`), for use on dark/coloured surfaces where a filled chip is
   * too heavy.
   */
  variant?: 'filled' | 'outline';
  /**
   * The glyph inside the ring. Defaults to a checkmark. Pass another Lucide icon
   * (e.g. `TriangleAlert`) to reuse the exact same ring/outline container for a
   * different verdict — the amber "needs attention" state is a check-ring with
   * an alert glyph instead of a tick.
   */
  icon?: LucideIcon;
}

/**
 * The app's "passed / done" marker. Shared so validation rows, the card
 * verdict, and the reviewed state all read as the same affirmative signal.
 * Pass an `aria-label` for standalone use.
 */
export function BlueCheck({ className, 'aria-label': ariaLabel, variant = 'filled', icon: Icon = Check }: BlueCheckProps) {
  const outline = variant === 'outline';
  return (
    <span
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn(
        'inline-flex size-4 items-center justify-center rounded-md',
        // Both variants are now stroke-only (no fill). `filled` uses the muted
        // theme `primary` blue so it matches the Reviewed verdict tick; `outline`
        // inherits currentColor for use on coloured surfaces.
        outline ? 'border border-current text-current' : 'border border-primary text-primary',
        className,
      )}
    >
      <Icon className="size-2.5" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}
