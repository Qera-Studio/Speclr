'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlueCheck } from '@/components/ui/blue-check';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ValidationResult } from '@/lib/spec/types';
import type { ApplicableCriteria } from '@/lib/spec/applicableCriteria';
import { outcomeCounts, summarize } from '@/lib/spec/outcomeCounts';
import ValidationResultBadge from './ValidationResultBadge';

interface ReviewedItemProps {
  result: ValidationResult;
  criteria: ApplicableCriteria;
  /** Optional preview mockup rendered inside the expanded body, below the checks. */
  preview?: ReactNode;
}

/**
 * The post-upload verdict row, shown as a shadcn Item-style card after any file
 * is validated: an outline verdict tick, a "Reviewed" title with a
 * passed/failed/warning summary, and a chevron that expands to reveal the
 * individual check rows (and preview) tucked inside. Clean pass → blue; any
 * failure or advisory warning → amber, so the outcome reads at a glance.
 */
export default function ReviewedItem({ result, criteria, preview }: ReviewedItemProps) {
  const [open, setOpen] = useState(false);
  const counts = outcomeCounts(result, criteria);
  const attention = counts.failed > 0 || counts.warnings > 0;
  const summary = summarize(counts);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'rounded-md border transition-colors',
          attention ? 'border-warning/30 bg-warning/5' : 'border-primary/30 bg-primary/5',
        )}
      >
        <CollapsibleTrigger
          className="flex w-full items-center gap-3 p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Reviewed — show checks"
        >
          <BlueCheck
            aria-label={attention ? 'Needs attention' : 'Passed'}
            variant="outline"
            icon={attention ? TriangleAlert : undefined}
            className={cn('size-5 shrink-0 rounded-sm', attention ? 'text-warning' : 'text-primary')}
          />
          <span className="text-sm font-medium text-foreground">Reviewed</span>
          <span className="ml-auto text-xs text-muted-foreground">{summary}</span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-3 border-t border-border/60 p-2">
            <ValidationResultBadge result={result} criteria={criteria} />
            {preview}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
