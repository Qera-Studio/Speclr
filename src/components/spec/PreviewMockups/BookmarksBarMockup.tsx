/**
 * Placeholder label widths (px) for the bookmarks flanking the active one.
 * Mirrored so the two blocks are equal width — that puts the active bookmark at
 * the strip's exact midpoint, which is the point `origin-center` scales around.
 * Changing these unevenly will drift the active bookmark off-centre.
 */
const LEADING_NEIGHBOURS = [28, 26, 30];
const TRAILING_NEIGHBOURS = [30, 26, 28];

/** A greyed-out neighbouring bookmark — context only, never the real asset. */
function NeighbourBookmark({ width }: { width: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-[2px] px-1 py-0.5">
      <span className="h-4 w-4 rounded-[2px] bg-muted-foreground/15" aria-hidden="true" />
      <span
        className="h-[6px] rounded-[2px] bg-muted-foreground/15"
        style={{ width: `${width}px` }}
        aria-hidden="true"
      />
    </div>
  );
}

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
 * Drawn at a fixed natural width then transform-scaled up, so the favicon reads
 * at a useful size and the strip deliberately overflows the card — clipped and
 * faded by the card's preview area, matching how the browser-tab mockup meets
 * its edges. Scaling rather than sizing everything up keeps the bar's real
 * proportions: a 16px favicon in a 16px slot, magnified as a whole.
 *
 * First-pass HTML/Tailwind illustration (theme-aware, background-less). Intended
 * to be replaced by an accurate SVG later, same as the browser-tab mockup.
 */
export default function BookmarksBarMockup({ imageUrl, alt, brandName }: BookmarksBarMockupProps) {
  const label = brandName?.trim() || 'Sample Brand';

  return (
    // No clipping here: the card's preview area already has overflow-hidden and
    // the edge mask. Clipping at this level would cut the strip to its *unscaled*
    // box, hiding almost all of it.
    <div className="flex w-full justify-center text-foreground">
      {/* Drawn at a fixed natural width, then scaled up — the same way the
          browser-tab mockup overflows the card. A percentage width would just
          re-fit the container and the scale would push everything off-screen. */}
      <div data-testid="bookmarks-bar-scale" className="w-[540px] shrink-0 origin-center scale-[1.7]">
        {/* Bookmarks bar strip — wide enough that its ends stay outside the
            card, so it reads as a slice of a real bar. */}
        {/* justify-center + neighbours on BOTH sides put the active bookmark at
            the strip's midpoint, which is what origin-center scales around. With
            neighbours only trailing it, the active bookmark sits at the far left
            and the scale pushes it out of the card. */}
        <div className="flex items-center justify-center gap-2 rounded-[2px] border border-border bg-card px-2 py-1">
          {LEADING_NEIGHBOURS.map((width, i) => (
            <NeighbourBookmark key={`lead-${i}`} width={width} />
          ))}

          {/* The uploaded favicon's bookmark (active/highlighted). Asymmetric
              padding: tight on the left so the favicon sits close to the pill's
              edge, looser on the right so the label doesn't crowd it. */}
          <div className="flex shrink-0 items-center gap-1 rounded-[2px] bg-muted py-0.5 pl-0.5 pr-1.5">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={alt} width={16} height={16} className="h-4 w-4 object-contain" />
            ) : (
              <span className="h-4 w-4 rounded-[2px] bg-muted-foreground/20" aria-hidden="true" />
            )}
            <span className="max-w-[7rem] truncate text-[10px] font-medium leading-none">{label}</span>
          </div>

          {TRAILING_NEIGHBOURS.map((width, i) => (
            <NeighbourBookmark key={`trail-${i}`} width={width} />
          ))}
        </div>
      </div>
    </div>
  );
}
