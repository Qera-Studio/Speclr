"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { breadcrumbForPath, isPrimaryPath } from "./breadcrumb";

/**
 * The breadcrumb trail for the current route, sitting at the top of the inset
 * content panel. Deliberately not a bar: no border, no background, no blur. It
 * is one line of text saying where you are, and a section of its own around it
 * only added a second horizontal rule under the one `TopPanel` already draws.
 * The search field lives in `TopPanel`, above the inset.
 *
 * On a page the sidebar links to directly it renders *nothing at all* — not an
 * empty band, which would leave the 36px gap the trail used to sit in and push
 * every primary page down by a row it no longer uses. The nav is already saying
 * where you are on those pages; see `isPrimaryPath`.
 */
export default function AdminHeader() {
  const pathname = usePathname();
  if (isPrimaryPath(pathname)) return null;
  const crumbs = breadcrumbForPath(pathname);

  return (
    <header
      data-print-hidden
      className="z-30 flex h-9 shrink-0 items-center gap-3 px-4"
    >
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li
                key={`${crumb.label}-${i}`}
                className="flex items-center gap-1.5"
              >
                {i > 0 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 opacity-60"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span
                    className="truncate font-medium text-foreground"
                    aria-current="page"
                  >
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
    </header>
  );
}
