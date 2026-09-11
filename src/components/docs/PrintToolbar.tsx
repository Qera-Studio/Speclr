'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PageHeaderSlot } from '@/components/admin/PageHeaderSlot';
import { useDownloadPdf } from '@/lib/useDownloadPdf';
import FinalizedActions from './FinalizedActions';

/**
 * The print view's controls — hidden in the printed output (`data-print-hidden`).
 *
 * **There is no Back here.** The app header one row up already carries one, and
 * two Back buttons a centimetre apart, pointing at the same place, is one
 * control too many: the reader has to work out whether they differ. The header's
 * is the one that stays, because every other secondary route in the app goes
 * back from exactly there.
 *
 * The actions go **up onto that same header row**, through `PageHeaderSlot` —
 * the mechanism the editor workspace already uses for its pager. So an issued
 * document's row reads: back, where you are, then what you can do with it and
 * which page you are on. What is left down here is the sealed card, which is a
 * statement about the document rather than a control, and belongs against the
 * top of the document it is about.
 *
 * `FinalizedActions` is the same component the editor rail uses, split in two by
 * `actionsOnly` / `sealedCard` rather than rewritten, so the two surfaces cannot
 * say different things about one document.
 *
 * A draft can reach this page too (the preview's print link), and it has nothing
 * to seal, duplicate or download: `finalized` is what gates all of it.
 */
export default function PrintToolbar({
  fileName,
  docId,
  finalized = false,
  isSlip = false,
}: {
  fileName: string;
  /** Needed only for the finalized actions; a draft's toolbar is Print alone. */
  docId?: string;
  finalized?: boolean;
  isSlip?: boolean;
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

  const { download, downloading } = useDownloadPdf(docId ?? '', fileName);

  if (!finalized || !docId) {
    // A draft has no stored PDF and nothing to duplicate from. Print is the one
    // thing this page can still do for it, and it goes on the header row with
    // everything else rather than opening a band of its own for one button.
    return (
      <PageHeaderSlot>
        <div data-print-hidden className="ml-auto flex shrink-0 items-center gap-2">
          <Button type="button" variant="neutral" onClick={handlePrint}>
            <Printer aria-hidden="true" />
            Print / Save as PDF
          </Button>
        </div>
      </PageHeaderSlot>
    );
  }

  return (
    <>
      <PageHeaderSlot>
        {/*
          `ml-auto` pushes the group to the right of the breadcrumbs, as the
          workspace's pager does. The pager itself is portalled separately by
          `PrintPages`, which is the component that knows the page count, and
          lands to the right of this because it renders later into the same host.
        */}
        <div data-print-hidden className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          <FinalizedActions
            docId={docId}
            isSlip={isSlip}
            onPrint={handlePrint}
            onDownload={download}
            downloading={downloading}
            actionsOnly
          />
        </div>
      </PageHeaderSlot>

      {/* One card, full width, directly under the header and above the pages. */}
      <div data-print-hidden className="mx-auto max-w-[794px] px-4 pb-3">
        <FinalizedActions docId={docId} sealedCard />
      </div>
    </>
  );
}
