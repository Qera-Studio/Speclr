'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';

/** Print-view toolbar — hidden in the printed output via @media print (data-print-hidden). */
export default function PrintToolbar({
  backHref,
  fileName,
}: {
  backHref: string;
  fileName: string;
}) {
  // The browser's "Save as PDF" filename comes from document.title. We keep the
  // tab title deliberately bland to hide the tool, so swap in the document's
  // number just for the print, then restore it immediately after.
  const handlePrint = useCallback(() => {
    const previousTitle = document.title;
    document.title = fileName;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
    // Fallback for browsers that don't fire afterprint reliably.
    window.setTimeout(restore, 1000);
  }, [fileName]);

  // `?auto=1` — arrived here from the list's Print icon, which means "print
  // this", not "show me this". Open the dialog straight away. The ref guards
  // against strict mode's double mount firing it twice.
  const auto = useSearchParams().get('auto') === '1';
  const printed = useRef(false);
  useEffect(() => {
    if (!auto || printed.current) return;
    printed.current = true;
    handlePrint();
  }, [auto, handlePrint]);

  return (
    <div
      data-print-hidden
      className="flex items-center gap-[16px] p-[16px]"
    >
      <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
        Back
      </Link>
      <p className="text-xs text-muted-foreground">
        Tip: turn off &ldquo;Headers and footers&rdquo; in the print dialog — the page margins are
        built in.
      </p>
      <Button type="button" onClick={handlePrint} className="ml-auto">
        Print / Save as PDF
      </Button>
    </div>
  );
}
