'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';

/**
 * Clears the entire checklist — uploaded files, validation, reviewed state, and
 * notes — for a fresh start. Destructive, so it's gated behind a confirmation.
 */
export default function ResetProgressButton({ onReset }: { onReset: () => void }) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="secondary"
          className="h-10 gap-2 px-4 text-sm text-muted-foreground hover:text-muted-foreground hover:bg-[unset] dark:hover:bg-input/30"
        >
          <RotateCcw aria-hidden="true" />
          Reset all
        </Button>
      }
      title="Reset the checklist"
      consequence="This clears every uploaded file, validation result, reviewed mark and note across all slots, and empties the saved progress. It cannot be undone. Export first if you want a copy."
      confirmLabel="Reset everything"
      destructive
      onConfirm={onReset}
    />
  );
}
