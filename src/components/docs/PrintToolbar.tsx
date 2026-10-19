'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PageHeaderSlot } from '@/components/shell/PageHeaderSlot';
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
  supplierCopy = false,
}: {
  fileName: string;
  /** Needed only for the finalized actions; a draft's toolbar is Print alone. */
  docId?: string;
  finalized?: boolean;
  isSlip?: boolean;
  /** An issued invoice, which also offers the supplier's copy (Rule 48(1)). */
  supplierCopy?: boolean;
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
  const supplier = useDownloadPdf(docId ?? '', fileName, 'supplier');

  /**
   * How tall the locked band is, published to the page it sits on.
   *
   * The page rail sticks below this card rather than under it, and the two are
   * siblings a flex row apart, so CSS alone cannot carry the number across —
   * `sticky` offsets take a length, not "whatever that other box measured".
   *
   * `.doc-print-page` is the host rather than `:root`: the value describes this
   * one page and dies with it, and a variable on the document would outlive a
   * navigation to a page that has no band at all.
   *
   * Measured, because the sentence wraps to two lines on a narrow inset and a
   * written-down height would be right at one width and wrong at the next.
   * `useLayoutEffect` so the rail is never painted at the wrong offset first.
   *
   * The band pins at `top-0` and paints over the page's own padding, so its
   * height *is* everything it occupies and the rail's offset is that number
   * with nothing added to it.
   */
  const band = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = band.current;
    const host = el?.closest<HTMLElement>('.doc-print-page');
    if (!el || !host) return;

    const publish = () => {
      host.style.setProperty('--doc-locked-band', `${el.offsetHeight}px`);
    };
    publish();
    // The flag the stylesheet keys on, so the body's own top padding stands
    // down: the card carries that air itself now, and taken twice the second
    // one is the distance the rail travels before it catches.
    host.dataset.lockedBand = '';

    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      host.style.removeProperty('--doc-locked-band');
      delete host.dataset.lockedBand;
    };
  }, [finalized, docId]);

  if (!finalized || !docId) {
    // A draft has no stored PDF and nothing to duplicate from. Print is the one
    // thing this page can still do for it, and it goes on the header row with
    // everything else rather than opening a band of its own for one button.
    return (
      <PageHeaderSlot>
        <div data-print-hidden className="ml-auto flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" onClick={handlePrint}>
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
            onDownloadSupplierCopy={supplierCopy ? supplier.download : undefined}
            downloadingSupplierCopy={supplier.downloading}
            actionsOnly
          />
        </div>
      </PageHeaderSlot>

      {/*
        The card runs the full width of the content area, starting at its left
        edge under the Back button rather than centred over the page column.

        It was `mx-auto max-w-[794px]`, which centred it on the paper and left
        its sentence wrapping onto a second line with one word on it. It is a
        statement about the document, not a part of the document, so it belongs
        to the page's own column rather than to the sheet's, and given the whole
        width it reads as one line.

        **It is locked to the top and does not scroll away.** It says the
        document cannot be edited, which is the one thing a reader needs on
        screen at the moment they go looking for an edit button — and they go
        looking after scrolling, not before. Scrolled off, it was a sentence
        that had already been read by everybody except the person it was
        written for.

        `sticky` rather than `fixed`: the scroll box here is `#main-content`
        inside the inset card, not the window, so a fixed box would resolve
        against the viewport and sit over the nav. It needs its own ground
        (`bg-background`) because the pages pass underneath it.

        `--doc-locked-band` is the height it occupies, published on the scroll
        box so the page rail beside it can stick *below* it rather than through
        it. Measured rather than written down: the sentence wraps to two lines
        on a narrow inset, so a constant would be right at one width and wrong
        at the next. Without it the rail scrolled 86px before catching, which is
        exactly the "the rail must not move" this locking exists to give.

        **The band spans the scroll box, not the card's own box**, and that is
        the fix for the document leaking past it. `.doc-print-page` pads itself
        by 8px on every side, so a card pinned at `top-2` left an 8px strip of
        the scroll box above it that it did not paint — and a black quotation
        page slid up through that strip. The negative margins pull the band's
        own ground back out over that padding on three sides, so what pins is a
        full-width opaque bar with the card inset inside it, and there is no
        uncovered pixel left for a page to show through.
      */}
      <div
        ref={band}
        data-print-hidden
        data-slot="doc-locked-band"
        // `-mx-2 -mt-2` cancels the page's padding; `px-2 pt-2` puts it back as
        // the card's own inset, so the card does not move and the ground under
        // it reaches the edges of the box that scrolls.
        //
        // `z-10`, and the ceiling is the nav rather than a free choice. This
        // only has to beat the pages sliding under it, which are unlayered, so
        // 10 does the whole job. At `z-20` it tied with the collapsed nav's
        // peek (`ui/sidebar.tsx`), which is in the same root stacking context,
        // and a tie is broken by document order, which this band wins, so it
        // painted over a flyout whose entire purpose is to cover content.
        className="sticky top-0 z-10 -mx-2 -mt-2 bg-background px-2 pt-2 pb-6"
      >
        <FinalizedActions docId={docId} sealedCard />
      </div>
    </>
  );
}
