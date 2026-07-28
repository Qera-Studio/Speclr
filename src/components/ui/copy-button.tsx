'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * An icon button that copies `value` to the clipboard. On success the copy icon
 * swaps to a double-tick and the tooltip reads "Copied", reverting after
 * `revertAfterMs`. Reusable anywhere a value is worth copying (filenames,
 * invoice numbers, GSTINs).
 */
export interface CopyButtonProps {
  value: string;
  /** Accessible label / tooltip text for the idle state (e.g. "Copy file name"). */
  label?: string;
  copiedLabel?: string;
  revertAfterMs?: number;
  className?: string;
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  revertAfterMs = 1500,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), revertAfterMs);
    } catch {
      // Clipboard unavailable (insecure context / denied) — no state change.
    }
  };

  const current = copied ? copiedLabel : label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={handleCopy}
              aria-label={current}
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className,
              )}
            >
              {copied ? (
                <CheckCheck className="size-3.5 text-blue-500" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
            </button>
          }
        />
        <TooltipContent>{current}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
