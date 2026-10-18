import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A price field with ₹ inside on the left, so what is typed is only ever the
 * number. Shared by the service dialog and the item panel, so the two price
 * fields cannot drift apart. A unit, where one matters, goes in the label.
 */
export default function RupeeInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-tab-label"
      >
        ₹
      </span>
      <Input size="form" className={cn('pl-8 tabular-nums', className)} {...props} />
    </div>
  );
}
