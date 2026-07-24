'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// A4 at 96dpi. Width is fixed; single-page sheets are ~one A4 tall, but height
// is measured (a sheet may run slightly over) so the footprint stays correct.
const SHEET_WIDTH = 794;
const SHEET_HEIGHT = 1123;

/**
 * Universal zoom wrapper for any printable sheet (invoice, receipt, contract,
 * letter, stipend). "Fit" scales the sheet down so one A4 page's *width* fills
 * the pane — multi-page docs then scroll vertically, exactly like a PDF viewer.
 * "100%" shows true A4 size and scrolls both ways. The measured content height
 * keeps the scaled footprint correct no matter how many pages the sheet has.
 *
 * The sheet itself owns its A4 sizing; this component never changes it, so the
 * print route can keep rendering the same sheet unscaled.
 */
export default function SheetPreview({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [zoom, setZoom] = useState<'fit' | 'full'>('fit');

  // Fit the whole A4 page inside the A4-shaped viewport — bounded by both width
  // and height so a single-page sheet is fully visible, never cropped. Never
  // upscale past 100%.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () =>
      setScale(
        Math.min(1, viewport.clientWidth / SHEET_WIDTH, viewport.clientHeight / SHEET_HEIGHT)
      );
    update();

    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Measure the sheet's true (unscaled) height so the sizer reserves the right
  // on-screen footprint for the transform-scaled holder.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => setContentHeight(content.offsetHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [children]);

  const fitting = zoom === 'fit';
  const effectiveScale = fitting ? scale : 1;
  const height = contentHeight ?? 1123;

  return (
    <div className="w-fit max-w-full bg-[#1A1917] border border-[rgba(178,190,214,0.08)] rounded-[8px] p-[16px]">
      <div className="flex gap-[8px] mb-[16px]" role="group" aria-label="Preview zoom">
        <button
          type="button"
          className="bg-transparent border border-[rgba(178,190,214,0.16)] text-[#B2BED6] font-inherit text-xs py-[4px] px-[8px] rounded-[4px] cursor-pointer aria-pressed:bg-[#252422] aria-pressed:text-white hover:bg-[#252422] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none"
          aria-pressed={fitting}
          onClick={() => setZoom('fit')}
        >
          Fit
        </button>
        <button
          type="button"
          className="bg-transparent border border-[rgba(178,190,214,0.16)] text-[#B2BED6] font-inherit text-xs py-[4px] px-[8px] rounded-[4px] cursor-pointer aria-pressed:bg-[#252422] aria-pressed:text-white hover:bg-[#252422] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none"
          aria-pressed={!fitting}
          onClick={() => setZoom('full')}
        >
          100%
        </button>
      </div>
      <div
        ref={viewportRef}
        className={
          fitting
            ? 'h-[82vh] [aspect-ratio:794/1123] max-w-full flex items-start justify-center overflow-y-auto'
            : 'overflow-auto max-h-[82vh]'
        }
      >
        <div
          className="relative overflow-hidden"
          style={{ width: SHEET_WIDTH * effectiveScale, height: height * effectiveScale }}
        >
          <div
            className="absolute top-0 left-0 [transform-origin:top_left]"
            style={{ transform: `scale(${effectiveScale})` }}
          >
            <div ref={contentRef} className="w-[794px] shadow-[0_8px_32px_rgba(20,42,87,0.32),0_4px_8px_rgba(20,42,87,0.16)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
