'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/**
 * Clears the entire checklist — uploaded files, validation, reviewed state, and
 * notes — for a fresh start. Destructive, so it's gated behind a confirmation.
 */
export default function ResetProgressButton({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-10 gap-2 px-4 text-sm text-muted-foreground hover:text-muted-foreground hover:bg-[unset] dark:hover:bg-input/30"
          >
            <RotateCcw
              aria-hidden="true"
              className="transition-transform duration-500 ease-in-out group-hover/button:-rotate-[360deg]"
            />
            Reset all
          </Button>
        }
      />
      <AlertDialogContent className="gap-6 [&_[data-slot=alert-dialog-header]]:place-items-center [&_[data-slot=alert-dialog-header]]:text-center">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Reset the whole checklist?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm/snug text-muted-foreground/60">
            This clears every uploaded file, validation result, reviewed mark, and note across all slots, and empties the
            saved progress. This can’t be undone. Export first if you want a copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center sm:justify-center">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            Reset everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
