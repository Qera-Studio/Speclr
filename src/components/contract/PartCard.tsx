'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PartCardProps {
  /** 'Part A-1', or absent on the Agreement card. */
  label?: string;
  title: string;
  subtitle: string;
  /** Blanks this Part still has nothing in. Shown only when there are some. */
  unfilled?: number;
  onOpen?: () => void;
  onRemove?: () => void;
}

/**
 * What the contract holds so far, one card per thing.
 *
 * The Agreement gets a card of its own even though it is never chosen and never
 * removed. It is the answer to "what is in this contract before I add
 * anything" — without it the first screen opens on an empty list, which reads
 * as though the contract is empty when in fact it is twenty-eight clauses of
 * standing terms.
 */
export default function PartCard({
  label,
  title,
  subtitle,
  unfilled = 0,
  onOpen,
  onRemove,
}: PartCardProps) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="flex items-center gap-2">
          {label ? (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {label}
            </span>
          ) : null}
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
        </span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {unfilled > 0 ? (
        <Badge variant="outline" className="shrink-0">
          {unfilled} to fill
        </Badge>
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2.5',
        onOpen ? 'bg-card' : 'border-dashed bg-muted/40',
      )}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-2">{body}</span>
      )}

      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onRemove}
        >
          <X />
          <span className="sr-only">Remove {title}</span>
        </Button>
      ) : null}
    </div>
  );
}
