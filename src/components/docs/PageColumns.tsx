import type { ReactNode } from 'react';
import type { PackedPage } from './pagination';

/**
 * A section rule marks the join between two sections. At the top of a page
 * there is nothing above to join to, so the rule — and the gap it hangs under —
 * are suppressed on whatever block lands first.
 *
 * It has to be CSS: the packer decides what lands first, and the block was
 * written long before anyone knew where it would end up.
 */
const FLOW =
  'flex min-h-0 flex-1 flex-col [&>*]:shrink-0 [&>*:first-child]:border-t-0 [&>*:first-child]:mt-0';

const COLUMN = 'flex flex-col [&>*]:shrink-0';

/**
 * The content of one packed page, laid out in its bands.
 *
 * A band is either one block across the full measure — a section heading, a
 * table, a list — or a run of sub-points flowing through the page's columns.
 * Shared by the preview and the print renderer so paper and screen cannot
 * disagree about where a page breaks. A single-column document renders its
 * blocks as direct children of the page frame — no wrapper — because those
 * sheets pin trailing content to the foot of the page with `mt-auto`, which
 * only resolves against the frame itself.
 */
export default function PageColumns({
  page,
  blocks,
  columnWidth,
  columnGap,
}: {
  page: PackedPage;
  /** The full block list; the page holds indices into it. */
  blocks: ReactNode[];
  /** Unset for a single-column document, where there is nothing to divide. */
  columnWidth?: number;
  columnGap?: number;
}) {
  // A cover, a parties page or a signature block takes the whole page.
  if (columnWidth === undefined || page.full) {
    return <>{page.blocks.map((i) => blocks[i])}</>;
  }

  return (
    <div className={FLOW}>
      {page.bands.map((band, i) =>
        band.full ? (
          blocks[band.columns[0][0]]
        ) : (
          <div key={i} className="flex" style={{ gap: columnGap }}>
            {band.columns.map((column, c) => (
              <div key={c} className={COLUMN} style={{ width: columnWidth }}>
                {column.map((block) => blocks[block])}
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
