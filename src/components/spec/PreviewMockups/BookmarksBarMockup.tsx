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
 * First-pass HTML/Tailwind illustration (theme-aware, background-less). Intended
 * to be replaced by an accurate SVG later, same as the browser-tab mockup.
 */
export default function BookmarksBarMockup({ imageUrl, alt, brandName }: BookmarksBarMockupProps) {
  const label = brandName?.trim() || 'Sample Brand';

  return (
    <div className="w-full max-w-md text-foreground">
      {/* Bookmarks bar strip */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5">
        {/* The uploaded favicon's bookmark (active/highlighted) */}
        <div className="flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={alt} width={16} height={16} className="h-4 w-4 object-contain" />
          ) : (
            <span className="h-4 w-4 rounded-[3px] bg-muted-foreground/20" aria-hidden="true" />
          )}
          <span className="max-w-[9rem] truncate text-xs font-medium">{label}</span>
        </div>

        {/* Neighbouring bookmarks — favicon-only, for realistic context */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-sm px-2 py-1">
            <span className="h-4 w-4 rounded-[3px] bg-muted-foreground/15" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}
