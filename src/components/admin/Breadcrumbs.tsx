"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbForPath, isPrimaryPath } from "./breadcrumb";
import { useDocumentCrumb } from "./DocumentCrumb";

/**
 * The trail: where you are, and the way back up.
 *
 * Its own component since 18 September 2026, when it moved out of the card's
 * header row and into the band above it (`TopPanel`). It is one component
 * rather than markup in `TopPanel` because the decision of *whether to render
 * at all* travels with it: a page the nav links to directly has no trail, and
 * that rule belongs next to the trail rather than in whichever surface happens
 * to host it this month.
 *
 * **It renders nothing on a primary page**, exactly as it did inside the card.
 * The rail is already showing where you are, with the row highlighted, so
 * "Dashboard / Clients" is one hop restated as two directly beside the hop
 * itself.
 */
export default function Breadcrumbs() {
  const pathname = usePathname();
  // The document type, when the page below is showing one. The path cannot say
  // so on its own; see `DocumentCrumb.tsx`.
  const typeLabel = useDocumentCrumb();

  if (isPrimaryPath(pathname)) return null;

  const crumbs = breadcrumbForPath(pathname, typeLabel);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 shrink">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {/* A slash, not a chevron. The row holds the pager's two arrow
                  glyphs, and a third pointing the same way as the trail read
                  as another control rather than as punctuation between two
                  words. */}
              {i > 0 && (
                <span className="shrink-0 opacity-40" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span className="truncate font-medium text-foreground" aria-current="page">
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
