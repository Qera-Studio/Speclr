'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { breadcrumbForPath } from './breadcrumb';
import SearchCommand from './SearchCommand';

/**
 * The sticky site header, pinned to the top of the inset content panel. The
 * breadcrumb trail for the current route sits on the left; a search field on
 * the right.
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const crumbs = breadcrumbForPath(pathname);

  return (
    <header data-print-hidden className="z-30 flex h-14 shrink-0 items-center gap-3 rounded-t-md border-b border-border bg-background/95 px-9 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />}
                {isLast ? (
                  <span className="truncate font-medium text-foreground" aria-current="page">
                    {crumb.label}
                  </span>
                ) : crumb.href ? (
                  <Link href={crumb.href} className="truncate transition-colors hover:text-foreground">
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

      <SearchCommand />
    </header>
  );
}
