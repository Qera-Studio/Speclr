interface BookmarksBarMockupProps {
  /** Uploaded favicon; when absent an empty placeholder slot is shown. */
  imageUrl?: string;
  alt: string;
  /** Bookmark label — the client/project name, falling back to a placeholder. */
  brandName?: string;
}

/**
 * A browser bookmarks bar showing the uploaded favicon as one saved bookmark —
 * the .ico's real context (bookmarks bar, history, Windows shortcuts), distinct
 * from the modern 32×32 PNG's browser-tab role.
 *
 * Drawn at natural size then transform-scaled 3×, so the favicon reads at a
 * useful size and the strip deliberately overflows the card. The overflow is
 * clipped here and faded by the card's left/right mask, matching how the
 * browser-tab mockup meets its edges. Scaling rather than sizing everything up
 * keeps the bar's real proportions — a 16px favicon in a 16px slot.
 *
 * First-pass HTML/Tailwind illustration (theme-aware, background-less). Intended
 * to be replaced by an accurate SVG later, same as the browser-tab mockup.
 */
export default function BookmarksBarMockup({ imageUrl, alt, brandName }: BookmarksBarMockupProps) {
  const label = brandName?.trim() || 'Sample Brand';

  return (
    // Clip the scaled-up strip; the card's mask fades whatever reaches the edge.
    <div className="w-full overflow-hidden text-foreground">
      <div data-testid="bookmarks-bar-scale" className="origin-center scale-[3]">
        {/* Bookmarks bar strip. Over-wide so the 3x scale never reveals its ends
            inside the card — it should read as a slice of a real bar. */}
        <div className="flex w-[150%] -translate-x-[16.67%] items-center gap-1 rounded-[3px] border border-border bg-card px-1.5 py-1">
          {/* The uploaded favicon's bookmark (active/highlighted) */}
          <div className="flex shrink-0 items-center gap-1 rounded-[2px] bg-muted px-1.5 py-0.5">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={alt} width={8} height={8} className="h-2 w-2 object-contain" />
            ) : (
              <span className="h-2 w-2 rounded-[1px] bg-muted-foreground/20" aria-hidden="true" />
            )}
            <span className="max-w-[4rem] truncate text-[6px] font-medium leading-none">{label}</span>
          </div>

          {/* Neighbouring bookmarks — favicon + label, for realistic context */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex shrink-0 items-center gap-1 rounded-[2px] px-1.5 py-0.5">
              <span className="h-2 w-2 rounded-[1px] bg-muted-foreground/15" aria-hidden="true" />
              <span
                className="h-[4px] rounded-[1px] bg-muted-foreground/15"
                style={{ width: `${[18, 12, 22, 14, 20][i]}px` }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
